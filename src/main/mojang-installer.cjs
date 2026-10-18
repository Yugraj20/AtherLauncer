const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const PISTON_META_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const MOJANG_RESOURCE_URL = 'https://resources.download.minecraft.net';

function verifyFileSha1(filePath, expectedSha1) {
  if (!fs.existsSync(filePath)) return false;
  if (!expectedSha1) return true;
  try {
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    return hash.toLowerCase() === expectedSha1.toLowerCase();
  } catch (e) {
    return false;
  }
}

async function downloadFileWithRetry(url, destPath, expectedSha1 = null, maxRetries = 3) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (expectedSha1 && verifyFileSha1(destPath, expectedSha1)) {
    return true;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            file.close();
            fs.unlink(destPath, () => {});
            return downloadFileWithRetry(res.headers.location, destPath, expectedSha1, maxRetries - 1)
              .then(resolve)
              .catch(reject);
          }

          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(destPath, () => {});
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }

          res.pipe(file);
          file.on('finish', () => {
            file.close(() => {
              if (expectedSha1 && !verifyFileSha1(destPath, expectedSha1)) {
                fs.unlink(destPath, () => {});
                return reject(new Error(`SHA-1 mismatch on ${destPath}`));
              }
              resolve(true);
            });
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
      return true;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

async function fetchVersionManifest() {
  const res = await fetch(PISTON_META_URL);
  if (!res.ok) throw new Error('Failed to fetch Mojang version manifest');
  return await res.json();
}

async function resolveVersion(versionId, versionsDir) {
  const versionFolder = path.join(versionsDir, versionId);
  const versionJsonPath = path.join(versionFolder, `${versionId}.json`);

  if (fs.existsSync(versionJsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    } catch (e) {}
  }

  const manifest = await fetchVersionManifest();
  const entry = manifest.versions.find(v => v.id === versionId);
  if (!entry) {
    throw new Error(`Version '${versionId}' not found in Mojang manifest.`);
  }

  const res = await fetch(entry.url);
  if (!res.ok) throw new Error(`Failed to download version data for ${versionId}`);
  const versionData = await res.json();

  if (!fs.existsSync(versionFolder)) fs.mkdirSync(versionFolder, { recursive: true });
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));

  return versionData;
}

async function downloadClientJar(versionData, versionDir, onProgress = null) {
  const clientInfo = versionData.downloads?.client;
  if (!clientInfo) throw new Error('Missing client.jar download info in version JSON');

  const clientJarPath = path.join(versionDir, `${versionData.id}.jar`);
  if (onProgress) onProgress({ phase: 'client', status: `Downloading ${versionData.id}.jar...`, percent: 0 });

  await downloadFileWithRetry(clientInfo.url, clientJarPath, clientInfo.sha1);
  if (onProgress) onProgress({ phase: 'client', status: 'Client JAR ready', percent: 100 });

  return clientJarPath;
}

function shouldIncludeLibrary(library) {
  if (library.name) {
    const lower = library.name.toLowerCase();
    // Exclude foreign operating systems
    if (lower.includes(':natives-linux') || lower.includes(':natives-osx') || lower.includes(':natives-macos')) {
      return false;
    }
    // On Windows 64-bit, exclude ARM and 32-bit x86 DLLs/jars
    if (lower.includes(':natives-windows-arm') || lower.includes(':natives-windows-x86') || lower.includes(':natives-windows-arm32') || lower.includes(':natives-windows-arm64')) {
      return false;
    }
  }

  if (!library.rules || library.rules.length === 0) return true;
  let allowed = false;
  for (const rule of library.rules) {
    let matchesOs = true;
    if (rule.os) {
      if (rule.os.name && rule.os.name !== 'windows') {
        matchesOs = false;
      }
      if (rule.os.arch && rule.os.arch !== 'x64' && rule.os.arch !== 'x86_64') {
        matchesOs = false;
      }
    }
    if (matchesOs) {
      allowed = rule.action === 'allow';
    }
  }
  return allowed;
}

async function downloadLibraries(versionData, librariesDir, nativesDir, onProgress = null) {
  const libraries = versionData.libraries || [];
  const classpathList = [];
  const validLibraries = libraries.filter(shouldIncludeLibrary);

  if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });

  let doneCount = 0;
  const total = validLibraries.length;

  for (const lib of validLibraries) {
    // 1. Standard Artifact Jar
    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact;
      const libPath = path.join(librariesDir, art.path);

      await downloadFileWithRetry(art.url, libPath, art.sha1);
      classpathList.push(libPath);

      // Extract DLLs for modern LWJGL native artifacts (1.19+)
      if (lib.name && lib.name.includes(':natives-windows')) {
        try {
          const zip = new AdmZip(libPath);
          for (const entry of zip.getEntries()) {
            if (!entry.isDirectory && (entry.entryName.endsWith('.dll') || entry.entryName.endsWith('.so'))) {
              const fileName = path.basename(entry.entryName);
              const destFile = path.join(nativesDir, fileName);
              if (!fs.existsSync(destFile)) {
                fs.writeFileSync(destFile, entry.getData());
              }
            }
          }
        } catch (e) {}
      }
    }

    // 2. Natives Classifiers (for legacy Minecraft on Windows)
    if (lib.downloads?.classifiers) {
      const classifiers = lib.downloads.classifiers;
      const nativeKey = lib.natives?.windows ? lib.natives.windows.replace('${arch}', '64') : 
                        classifiers['natives-windows'] ? 'natives-windows' :
                        classifiers['natives-windows-64'] ? 'natives-windows-64' : null;

      if (nativeKey && classifiers[nativeKey]) {
        const nativeInfo = classifiers[nativeKey];
        const nativeJarPath = path.join(librariesDir, nativeInfo.path);

        await downloadFileWithRetry(nativeInfo.url, nativeJarPath, nativeInfo.sha1);

        // Extract DLLs into nativesDir
        try {
          const zip = new AdmZip(nativeJarPath);
          const zipEntries = zip.getEntries();
          for (const entry of zipEntries) {
            if (!entry.isDirectory && (entry.entryName.endsWith('.dll') || entry.entryName.endsWith('.so'))) {
              const fileName = path.basename(entry.entryName);
              const destFile = path.join(nativesDir, fileName);
              if (!fs.existsSync(destFile)) {
                fs.writeFileSync(destFile, entry.getData());
              }
            }
          }
        } catch (zipErr) {
          console.error(`Failed to extract native jar ${nativeJarPath}:`, zipErr);
        }
      }
    }

    doneCount++;
    if (onProgress && total > 0) {
      onProgress({
        phase: 'libraries',
        status: `Verifying libraries (${doneCount}/${total})...`,
        percent: Math.round((doneCount / total) * 100)
      });
    }
  }

  return classpathList;
}

async function downloadAssets(versionData, assetsDir, onProgress = null) {
  const assetIndexInfo = versionData.assetIndex;
  if (!assetIndexInfo) return;

  const indexesDir = path.join(assetsDir, 'indexes');
  const objectsDir = path.join(assetsDir, 'objects');
  if (!fs.existsSync(indexesDir)) fs.mkdirSync(indexesDir, { recursive: true });
  if (!fs.existsSync(objectsDir)) fs.mkdirSync(objectsDir, { recursive: true });

  const indexFilePath = path.join(indexesDir, `${assetIndexInfo.id}.json`);
  let indexData = null;

  if (fs.existsSync(indexFilePath)) {
    try {
      indexData = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
    } catch (e) {}
  }

  if (!indexData) {
    if (onProgress) onProgress({ phase: 'assets', status: 'Downloading asset index...', percent: 0 });
    const res = await fetch(assetIndexInfo.url);
    if (!res.ok) throw new Error('Failed to download asset index');
    indexData = await res.json();
    fs.writeFileSync(indexFilePath, JSON.stringify(indexData, null, 2));
  }

  const objects = indexData.objects || {};
  const entries = Object.entries(objects);
  const total = entries.length;
  let done = 0;

  // Filter missing assets
  const missingAssets = [];
  for (const [name, meta] of entries) {
    const sub = meta.hash.substring(0, 2);
    const dest = path.join(objectsDir, sub, meta.hash);
    if (!fs.existsSync(dest)) {
      missingAssets.push({ hash: meta.hash, sub, dest });
    } else {
      done++;
    }
  }

  if (missingAssets.length === 0) {
    if (onProgress) onProgress({ phase: 'assets', status: 'All game assets verified.', percent: 100 });
    return;
  }

  // Parallel download with concurrency pool
  const CONCURRENCY = 20;
  let index = 0;

  async function worker() {
    while (index < missingAssets.length) {
      const i = index++;
      const item = missingAssets[i];
      const url = `${MOJANG_RESOURCE_URL}/${item.sub}/${item.hash}`;
      try {
        await downloadFileWithRetry(url, item.dest, item.hash);
      } catch (err) {
        // Soft fail non-critical asset
      }
      done++;
      if (onProgress && done % 50 === 0) {
        onProgress({
          phase: 'assets',
          status: `Downloading game assets (${done}/${total})...`,
          percent: Math.round((done / total) * 100)
        });
      }
    }
  }

  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  if (onProgress) onProgress({ phase: 'assets', status: 'Asset catalog ready.', percent: 100 });
}

module.exports = {
  fetchVersionManifest,
  resolveVersion,
  downloadClientJar,
  downloadLibraries,
  downloadAssets
};

const fs = require('fs');
const path = require('path');
const https = require('https');

const FABRIC_META_URL = 'https://meta.fabricmc.net/v2';

function parseMavenCoordinate(coord) {
  const parts = coord.split(':');
  const group = parts[0].replace(/\./g, '/');
  const artifact = parts[1];
  const version = parts[2];
  const classifier = parts[3] ? `-${parts[3]}` : '';
  const jarName = `${artifact}-${version}${classifier}.jar`;
  const relativePath = path.join(group, artifact, version, jarName);
  return { group, artifact, version, jarName, relativePath };
}

async function downloadHttpFile(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(destPath)) return true;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        return downloadHttpFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(true));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function resolveFabricProfile(gameVersion, preferredLoaderVersion = null) {
  const loadersRes = await fetch(`${FABRIC_META_URL}/versions/loader/${gameVersion}`);
  if (!loadersRes.ok) {
    throw new Error(`Fabric not supported for game version: ${gameVersion}`);
  }
  const loaders = await loadersRes.json();
  if (!loaders || loaders.length === 0) {
    throw new Error(`No Fabric loaders found for ${gameVersion}`);
  }

  const chosenLoader = preferredLoaderVersion 
    ? loaders.find(l => l.loader.version === preferredLoaderVersion) || loaders[0]
    : loaders[0];

  const loaderVersion = chosenLoader.loader.version;
  const profileUrl = `${FABRIC_META_URL}/versions/loader/${gameVersion}/${loaderVersion}/profile/json`;
  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) {
    throw new Error(`Failed to download Fabric profile for ${gameVersion} (${loaderVersion})`);
  }

  return await profileRes.json();
}

async function installFabricLibraries(fabricProfile, librariesDir, onProgress = null) {
  const fabricLibraries = fabricProfile.libraries || [];
  const classpathList = [];

  let idx = 0;
  for (const lib of fabricLibraries) {
    const maven = parseMavenCoordinate(lib.name);
    const destPath = path.join(librariesDir, maven.relativePath);
    const baseUrl = lib.url ? lib.url.replace(/\/$/, '') : 'https://maven.fabricmc.net';
    const downloadUrl = `${baseUrl}/${maven.relativePath.replace(/\\/g, '/')}`;

    if (onProgress) {
      onProgress({
        phase: 'fabric',
        status: `Fetching Fabric library: ${maven.artifact}...`,
        percent: Math.round(((idx + 1) / fabricLibraries.length) * 100)
      });
    }

    try {
      await downloadHttpFile(downloadUrl, destPath);
      classpathList.push(destPath);
    } catch (e) {
      console.warn(`Failed downloading Fabric lib ${downloadUrl}: ${e.message}`);
    }
    idx++;
  }

  return {
    mainClass: fabricProfile.mainClass || 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    libraries: classpathList
  };
}

module.exports = {
  resolveFabricProfile,
  installFabricLibraries
};

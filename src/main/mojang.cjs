const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PISTON_META_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

async function fetchVersionManifest() {
  const response = await fetch(PISTON_META_URL);
  if (!response.ok) throw new Error(`Failed to fetch version manifest: ${response.statusText}`);
  return await response.json();
}

async function fetchVersionDetails(versionJsonUrl) {
  const response = await fetch(versionJsonUrl);
  if (!response.ok) throw new Error(`Failed to fetch version JSON: ${response.statusText}`);
  return await response.json();
}

function verifySha1(filePath, expectedSha1) {
  if (!fs.existsSync(filePath)) return false;
  if (!expectedSha1) return true;
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha1').update(buffer).digest('hex');
  return hash.toLowerCase() === expectedSha1.toLowerCase();
}

async function downloadFile(url, destPath, expectedSha1 = null, onProgress = null) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // If already exists and SHA1 matches, skip download
  if (expectedSha1 && verifySha1(destPath, expectedSha1)) {
    return true;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath, expectedSha1, onProgress)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Download failed with HTTP ${response.statusCode}: ${url}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes > 0) {
          onProgress({ downloaded: downloadedBytes, total: totalBytes, percent: (downloadedBytes / totalBytes) * 100 });
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          if (expectedSha1 && !verifySha1(destPath, expectedSha1)) {
            return reject(new Error(`SHA-1 mismatch for downloaded file: ${destPath}`));
          }
          resolve(true);
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function parseLibraryRules(rules) {
  if (!rules || rules.length === 0) return true;
  let allowed = false;
  for (const rule of rules) {
    let actionApplies = true;
    if (rule.os) {
      if (rule.os.name && rule.os.name !== 'windows') {
        actionApplies = false;
      }
    }
    if (actionApplies) {
      allowed = rule.action === 'allow';
    }
  }
  return allowed;
}

module.exports = {
  fetchVersionManifest,
  fetchVersionDetails,
  downloadFile,
  verifySha1,
  parseLibraryRules
};

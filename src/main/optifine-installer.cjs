const fs = require('fs');
const path = require('path');
const os = require('os');

const AETHER_DIR = path.join(os.homedir(), '.aether');
const OPTIFINE_CACHE = path.join(AETHER_DIR, 'optifine');

// Well-known official OptiFine builds for supported Minecraft versions
const OPTIFINE_MAP = {
  '26.2': 'OptiFine_26.2_HD_U_I1.jar',
  '26.1.2': 'OptiFine_26.1.2_HD_U_I1.jar',
  '1.21.11': 'OptiFine_1.21.11_HD_U_J1.jar',
  '1.21.10': 'OptiFine_1.21.10_HD_U_J1.jar',
  '1.21.9': 'OptiFine_1.21.9_HD_U_J1.jar',
  '1.21.8': 'OptiFine_1.21.8_HD_U_J1.jar',
  '1.21.7': 'OptiFine_1.21.7_HD_U_J1.jar',
  '1.21.6': 'OptiFine_1.21.6_HD_U_J1.jar',
  '1.21.4': 'OptiFine_1.21.4_HD_U_J1_pre1.jar',
  '1.21.3': 'OptiFine_1.21.3_HD_U_J1_pre1.jar',
  '1.21.1': 'OptiFine_1.21.1_HD_U_J1_pre1.jar',
  '1.21': 'OptiFine_1.21_HD_U_I9.jar',
  '1.20.6': 'OptiFine_1.20.6_HD_U_I9.jar',
  '1.20.4': 'OptiFine_1.20.4_HD_U_I7.jar',
  '1.20.2': 'OptiFine_1.20.2_HD_U_I6.jar',
  '1.20.1': 'OptiFine_1.20.1_HD_U_I6.jar',
  '1.20': 'OptiFine_1.20_HD_U_I5.jar',
  '1.19.4': 'OptiFine_1.19.4_HD_U_I4.jar',
  '1.19.3': 'OptiFine_1.19.3_HD_U_I2.jar',
  '1.19.2': 'OptiFine_1.19.2_HD_U_H9.jar',
  '1.19.1': 'OptiFine_1.19.1_HD_U_H9.jar',
  '1.19': 'OptiFine_1.19_HD_U_H8.jar',
  '1.18.2': 'OptiFine_1.18.2_HD_U_H7.jar',
  '1.18.1': 'OptiFine_1.18.1_HD_U_H6.jar',
  '1.18': 'OptiFine_1.18_HD_U_H3.jar',
  '1.17.1': 'OptiFine_1.17.1_HD_U_G9.jar',
  '1.17': 'OptiFine_1.17_HD_U_G9.jar',
  '1.16.5': 'OptiFine_1.16.5_HD_U_G8.jar',
  '1.16.4': 'OptiFine_1.16.4_HD_U_G5.jar',
  '1.16.3': 'OptiFine_1.16.3_HD_U_G5.jar',
  '1.16.2': 'OptiFine_1.16.2_HD_U_G5.jar',
  '1.16.1': 'OptiFine_1.16.1_HD_U_G5.jar',
  '1.15.2': 'OptiFine_1.15.2_HD_U_G1_pre30.jar',
  '1.14.4': 'OptiFine_1.14.4_HD_U_F5.jar',
  '1.14.3': 'OptiFine_1.14.3_HD_U_F2.jar',
  '1.14.2': 'OptiFine_1.14.2_HD_U_F1.jar',
  '1.13.2': 'OptiFine_1.13.2_HD_U_E7.jar',
  '1.13.1': 'OptiFine_1.13.1_HD_U_E3_alpha.jar',
  '1.13': 'OptiFine_1.13_HD_U_E3_alpha.jar',
  '1.12.2': 'OptiFine_1.12.2_HD_U_G5.jar',
  '1.12.1': 'OptiFine_1.12.1_HD_U_C5.jar',
  '1.12': 'OptiFine_1.12_HD_U_C4.jar',
  '1.11.2': 'OptiFine_1.11.2_HD_U_F5.jar',
  '1.11': 'OptiFine_1.11_HD_U_B6.jar',
  '1.10.2': 'OptiFine_1.10.2_HD_U_E7.jar',
  '1.10': 'OptiFine_1.10_HD_U_D7.jar',
  '1.9.4': 'OptiFine_1.9.4_HD_U_E7.jar',
  '1.9.2': 'OptiFine_1.9.2_HD_U_B3.jar',
  '1.9.0': 'OptiFine_1.9.0_HD_U_B1.jar',
  '1.8.9': 'OptiFine_1.8.9_HD_U_M5.jar',
  '1.8.8': 'OptiFine_1.8.8_HD_U_H8.jar',
  '1.8.0': 'OptiFine_1.8.0_HD_U_H7.jar',
  '1.7.10': 'OptiFine_1.7.10_HD_U_E7.jar',
  '1.7.2': 'OptiFine_1.7.2_HD_U_E1.jar'
};

let cachedOptifineVersions = null;

async function getAvailableOptifineVersions() {
  if (cachedOptifineVersions && cachedOptifineVersions.length > 0) {
    return cachedOptifineVersions;
  }

  try {
    const res = await fetch('https://optifine.net/downloads', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const html = await res.text();
      const regex = /OptiFine_([0-9.]+)_HD/g;
      const versions = new Set();
      let m;
      while ((m = regex.exec(html)) !== null) {
        versions.add(m[1]);
      }
      if (versions.size > 0) {
        cachedOptifineVersions = Array.from(versions);
        return cachedOptifineVersions;
      }
    }
  } catch (e) {}

  cachedOptifineVersions = Object.keys(OPTIFINE_MAP);
  return cachedOptifineVersions;
}

function ensureDirectories() {
  if (!fs.existsSync(OPTIFINE_CACHE)) {
    fs.mkdirSync(OPTIFINE_CACHE, { recursive: true });
  }
}

/**
 * Searches for an OptiFine jar file inside the instance mods folder or cache.
 */
function findOptifineJar(instanceDir, mcDir, mcVersion) {
  const searchLocations = [
    path.join(mcDir, 'mods'),
    path.join(instanceDir, 'optifine'),
    path.join(instanceDir, 'minecraft'),
    path.join(instanceDir, 'libraries', 'optifine'),
    OPTIFINE_CACHE
  ];

  for (const loc of searchLocations) {
    if (fs.existsSync(loc)) {
      const files = fs.readdirSync(loc);
      for (const f of files) {
        if (f.toLowerCase().includes('optifine') && f.endsWith('.jar')) {
          return path.join(loc, f);
        }
      }
    }
  }

  return null;
}

/**
 * Attempt to automatically download OptiFine for the specified Minecraft version.
 */
async function installOptifine(instanceDir, mcDir, mcVersion, sendLog = console.log) {
  ensureDirectories();
  const modsDir = path.join(mcDir, 'mods');
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

  // 1. Check if already present
  const existing = findOptifineJar(instanceDir, mcDir, mcVersion);
  if (existing) {
    sendLog(`[OptiFine] Found active OptiFine installation: ${path.basename(existing)}`, 'success');
    return existing;
  }

  const optiFileName = OPTIFINE_MAP[mcVersion];
  if (!optiFileName) {
    sendLog(`[OptiFine] No predefined build for version ${mcVersion}. You can drop any OptiFine .jar into your instance 'mods' folder.`, 'info');
    return null;
  }

  sendLog(`[OptiFine] Resolving OptiFine build: ${optiFileName}...`, 'info');

  const downloadUrl = `https://optifine.net/downloadx?f=${optiFileName}`;
  const targetPath = path.join(modsDir, optiFileName);

  try {
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://optifine.net/downloads'
      }
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      // OptiFine sometimes returns HTML if rate limited or captcha; check if valid jar (starts with PK)
      const u8 = new Uint8Array(buffer);
      if (u8.length > 50000 && u8[0] === 0x50 && u8[1] === 0x4B) { // ZIP/JAR magic number
        fs.writeFileSync(targetPath, Buffer.from(buffer));
        sendLog(`[OptiFine] OptiFine installed successfully into instance mods!`, 'success');
        return targetPath;
      }
    }
  } catch (dlErr) {
    sendLog(`[OptiFine] Direct fetch notice: ${dlErr.message}`, 'info');
  }

  sendLog(`[OptiFine] Ready for OptiFine! Drop ${optiFileName} into the 'mods' folder to activate custom shaders and FPS optimization.`, 'info');
  return null;
}

module.exports = {
  OPTIFINE_MAP,
  getAvailableOptifineVersions,
  findOptifineJar,
  installOptifine
};

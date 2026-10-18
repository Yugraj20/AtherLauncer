const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const AdmZip = require('adm-zip');

const AETHER_DIR = path.join(os.homedir(), '.aether');
const RUNTIMES_DIR = path.join(AETHER_DIR, 'runtimes');

function ensureDirectories() {
  if (!fs.existsSync(RUNTIMES_DIR)) {
    fs.mkdirSync(RUNTIMES_DIR, { recursive: true });
  }
}

/**
 * Determine the required Java major version for a given Minecraft version.
 * @param {object} versionData Mojang version JSON metadata
 * @param {string} mcVersion Minecraft version string (e.g. '1.21.4', '1.16.5', '1.8.9')
 * @returns {number} 8, 17, 21, or 25
 */
function getRequiredJavaVersion(versionData, mcVersion = '1.21.4') {
  if (versionData && versionData.javaVersion && versionData.javaVersion.majorVersion) {
    const declared = versionData.javaVersion.majorVersion;
    if (declared >= 25) return 25;
    if (declared >= 21) return 21;
    if (declared >= 16) return 17; // Java 17 runs 1.16/1.17 flawlessly
    return 8;
  }

  // Parse semantic version string
  const clean = (mcVersion || '').replace(/[^0-9.]/g, '');
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  // Minecraft 26.x+ uses year/cycle-based versioning and runs on Java 25
  if (major >= 26) {
    return 25;
  }

  // 1.20.5+ and 1.21+ require Java 21
  if (minor > 20 || (minor === 20 && patch >= 5)) {
    return 21;
  }
  // 1.18 to 1.20.4 require Java 17
  if (minor >= 18) {
    return 17;
  }
  // 1.17 requires Java 16/17
  if (minor === 17) {
    return 17;
  }
  // 1.16.5 and all older versions (1.12.2, 1.8.9, 1.7.10, beta, alpha) require Java 8
  return 8;
}

/**
 * Recursively find javaw.exe or java.exe inside a directory.
 */
function findJavaExecutableInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return null;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Priority: check for bin/javaw.exe or bin/java.exe in current dir
  const binDir = path.join(dirPath, 'bin');
  if (fs.existsSync(binDir)) {
    const javaw = path.join(binDir, 'javaw.exe');
    if (fs.existsSync(javaw)) return javaw;
    const java = path.join(binDir, 'java.exe');
    if (fs.existsSync(java)) return java;
  }

  // Check subdirectories (e.g. extracted jdk-21.0.12+1-jre)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = path.join(dirPath, entry.name);
      const found = findJavaExecutableInDir(subPath);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Check if a managed Java runtime of the requested major version exists.
 */
function getManagedJavaExecutable(majorVersion) {
  ensureDirectories();
  const targetDir = path.join(RUNTIMES_DIR, `java-${majorVersion}`);
  return findJavaExecutableInDir(targetDir);
}

/**
 * Automatically ensure the required Java runtime is installed.
 * If missing, downloads official Eclipse Temurin OpenJDK JRE, unzips it, and returns the executable path.
 * @param {number} majorVersion 8, 17, or 21
 * @param {function} sendLog Log callback function
 * @returns {Promise<string>} Path to javaw.exe / java.exe
 */
async function ensureJavaRuntime(majorVersion = 21, sendLog = console.log) {
  ensureDirectories();

  // 1. Check if already installed
  const existingExe = getManagedJavaExecutable(majorVersion);
  if (existingExe) {
    sendLog(`[Java Runtime] Found managed Java ${majorVersion}: ${existingExe}`, 'info');
    return existingExe;
  }

  sendLog(`[Java Runtime] Java ${majorVersion} not detected locally. Automatically installing Eclipse Temurin JRE ${majorVersion}...`, 'info');

  const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`;
  const tempZipPath = path.join(RUNTIMES_DIR, `temp_java_${majorVersion}.zip`);
  const targetExtractDir = path.join(RUNTIMES_DIR, `java-${majorVersion}`);

  // 2. Fetch the portable JRE zip with redirect following
  const response = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'Aether-Minecraft-Launcher/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to download Java ${majorVersion} from Adoptium (HTTP ${response.status})`);
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;
  let lastLoggedPercent = -1;

  const fileStream = fs.createWriteStream(tempZipPath);

  // Stream with progress reporting
  const reader = response.body.getReader();
  const readableStream = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          downloadedBytes += value.length;
          if (contentLength > 0) {
            const percent = Math.floor((downloadedBytes / contentLength) * 100);
            if (percent !== lastLoggedPercent && percent % 10 === 0) {
              lastLoggedPercent = percent;
              sendLog(`[Java Runtime] Downloading Java ${majorVersion} (Temurin OpenJDK): ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB / ${(contentLength / 1024 / 1024).toFixed(1)} MB)`, 'info');
            }
          }
          this.push(value);
        }
      } catch (err) {
        this.destroy(err);
      }
    }
  });

  await pipeline(readableStream, fileStream);

  sendLog(`[Java Runtime] Download complete. Extracting Java ${majorVersion} binaries...`, 'info');

  // 3. Extract the downloaded zip
  if (!fs.existsSync(targetExtractDir)) {
    fs.mkdirSync(targetExtractDir, { recursive: true });
  }

  const zip = new AdmZip(tempZipPath);
  zip.extractAllTo(targetExtractDir, true);

  // 4. Remove temp zip
  try {
    if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
  } catch (e) {}

  // 5. Locate newly extracted executable
  const newExe = findJavaExecutableInDir(targetExtractDir);
  if (!newExe) {
    throw new Error(`Java ${majorVersion} was extracted, but bin/javaw.exe could not be found in ${targetExtractDir}`);
  }

  sendLog(`[Java Runtime] Java ${majorVersion} installation verified: ${newExe}`, 'success');
  return newExe;
}

module.exports = {
  getRequiredJavaVersion,
  getManagedJavaExecutable,
  ensureJavaRuntime
};

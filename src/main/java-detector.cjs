const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function getJavaDetails(javaExePath) {
  try {
    const result = spawnSync(javaExePath, ['-version'], { encoding: 'utf8' });
    const output = (result.stderr || '') + (result.stdout || '');
    
    // Parse version from string like 'openjdk version "21.0.4"' or 'java version "1.8.0_381"'
    const versionMatch = output.match(/version "(.*?)"/i);
    const versionStr = versionMatch ? versionMatch[1] : 'Unknown';
    
    let major = 8;
    if (versionStr.startsWith('1.')) {
      major = parseInt(versionStr.split('.')[1], 10) || 8;
    } else {
      major = parseInt(versionStr.split('.')[0], 10) || 21;
    }

    const is64 = output.includes('64-Bit') || output.includes('x86_64') || output.includes('amd64');
    const vendor = output.includes('Adoptium') ? 'Eclipse Adoptium' :
                   output.includes('Zulu') ? 'Azul Zulu' :
                   output.includes('Microsoft') ? 'Microsoft OpenJDK' :
                   output.includes('Java(TM)') ? 'Oracle' : 'OpenJDK';

    return {
      path: javaExePath,
      version: versionStr,
      majorVersion: major,
      is64Bit: is64,
      vendor: vendor
    };
  } catch (e) {
    return null;
  }
}

function detectJavaInstallations() {
  const detected = [];
  const checkedPaths = new Set();

  function checkAndAdd(p) {
    if (!p || checkedPaths.has(p)) return;
    checkedPaths.add(p);
    if (fs.existsSync(p)) {
      const details = getJavaDetails(p);
      if (details) {
        detected.push(details);
      }
    }
  }

  // 1. Check JAVA_HOME
  if (process.env.JAVA_HOME) {
    checkAndAdd(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'));
  }

  // 2. Check PATH java
  try {
    const whereResult = execSync('where java.exe', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = whereResult.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      checkAndAdd(line);
    }
  } catch (err) {}

  // 3. Scan common Program Files directories
  const searchRoots = [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Amazon Corretto',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Common', 'Oracle', 'Java')
  ];

  for (const root of searchRoots) {
    if (fs.existsSync(root)) {
      try {
        const subdirs = fs.readdirSync(root, { withFileTypes: true });
        for (const dir of subdirs) {
          if (dir.isDirectory()) {
            checkAndAdd(path.join(root, dir.name, 'bin', 'java.exe'));
          }
        }
      } catch (e) {}
    }
  }

  return detected;
}

module.exports = {
  detectJavaInstallations,
  getJavaDetails
};

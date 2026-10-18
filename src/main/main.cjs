const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { detectJavaInstallations } = require('./java-detector.cjs');
const { searchProjects, installProjectToInstance } = require('./modrinth.cjs');
const { 
  getAthersChoiceInstances,
  getInstances, 
  createInstance, 
  updateInstance, 
  deleteInstance, 
  getInstanceAddons,
  toggleInstanceAddon,
  deleteInstanceAddon,
  getInstanceSubdir,
  getInstalledMods, 
  toggleMod, 
  deleteMod, 
  launchInstance, 
  killCurrentInstance, 
  isInstanceRunning, 
  INSTANCES_DIR 
} = require('./launcher.cjs');
const { fetchVersionManifest } = require('./mojang-installer.cjs');
const { getAvailableOptifineVersions } = require('./optifine-installer.cjs');
const { 
  loadProfiles, 
  getActiveProfile, 
  logout, 
  loginWithMicrosoftPopup 
} = require('./auth-manager.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#07090e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Instance APIs
ipcMain.handle('get-athers-choice', async () => {
  return getAthersChoiceInstances();
});

ipcMain.handle('get-instances', async () => {
  return getInstances();
});

ipcMain.handle('create-instance', async (event, data) => {
  return createInstance(data);
});

ipcMain.handle('update-instance', async (event, { instanceId, updates }) => {
  return updateInstance(instanceId, updates);
});

ipcMain.handle('delete-instance', async (event, instanceId) => {
  return deleteInstance(instanceId);
});

ipcMain.handle('get-instance-mods', async (event, instanceId) => {
  return getInstalledMods(instanceId);
});

ipcMain.handle('toggle-instance-mod', async (event, { instanceId, filename }) => {
  return toggleMod(instanceId, filename);
});

ipcMain.handle('delete-instance-mod', async (event, { instanceId, filename }) => {
  return deleteMod(instanceId, filename);
});

// Generic Addon Handlers (Mods, Resourcepacks, Shaderpacks)
ipcMain.handle('get-instance-addons', async (event, { instanceId, type }) => {
  return getInstanceAddons(instanceId, type);
});

ipcMain.handle('toggle-instance-addon', async (event, { instanceId, type, filename }) => {
  return toggleInstanceAddon(instanceId, type, filename);
});

ipcMain.handle('delete-instance-addon', async (event, { instanceId, type, filename }) => {
  return deleteInstanceAddon(instanceId, type, filename);
});

ipcMain.handle('open-instance-subdir', async (event, { instanceId, subfolder }) => {
  const dir = getInstanceSubdir(instanceId, subfolder);
  await shell.openPath(dir);
  return true;
});

ipcMain.handle('get-mojang-versions', async () => {
  try {
    const manifest = await fetchVersionManifest();
    return {
      latest: manifest.latest,
      versions: manifest.versions.map(v => ({
        id: v.id,
        type: v.type,
        releaseTime: v.releaseTime
      }))
    };
  } catch (e) {
    return {
      latest: { release: '1.21.4', snapshot: '25w07a' },
      versions: [
        { id: '1.21.4', type: 'release' },
        { id: '1.21.3', type: 'release' },
        { id: '1.21.1', type: 'release' },
        { id: '1.20.4', type: 'release' },
        { id: '1.20.1', type: 'release' },
        { id: '1.19.4', type: 'release' },
        { id: '1.18.2', type: 'release' },
        { id: '1.16.5', type: 'release' },
        { id: '1.12.2', type: 'release' },
        { id: '1.8.9', type: 'release' },
        { id: '1.7.10', type: 'release' }
      ]
    };
  }
});

// Java & System
ipcMain.handle('get-java-installations', async () => {
  return detectJavaInstallations();
});

// Modrinth
ipcMain.handle('search-modrinth', async (event, { query, type, version, loader }) => {
  return await searchProjects(query, type, version, loader);
});

ipcMain.handle('install-mod', async (event, { projectId, instanceId, version, loader }) => {
  const instanceDir = path.join(INSTANCES_DIR, instanceId);
  return await installProjectToInstance(projectId, instanceDir, version, loader);
});

// Launcher
ipcMain.handle('launch-instance', async (event, { instance, javaPath, ramGb, directServer }) => {
  return await launchInstance(instance, javaPath, ramGb, mainWindow, directServer);
});

ipcMain.handle('kill-current-instance', async () => {
  return killCurrentInstance();
});

ipcMain.handle('is-instance-running', async () => {
  return isInstanceRunning();
});

// OptiFine Versions
ipcMain.handle('get-optifine-versions', async () => {
  return await getAvailableOptifineVersions();
});

// Auth & Profiles (Secured - Never leak raw access tokens or refresh tokens to renderer process)
ipcMain.handle('get-active-profile', async () => {
  const profile = getActiveProfile();
  if (!profile) return null;
  const { accessToken, refreshToken, ...safeProfile } = profile;
  return safeProfile;
});

ipcMain.handle('logout', async () => {
  return logout();
});

ipcMain.handle('login-microsoft-popup', async () => {
  const profile = await loginWithMicrosoftPopup(mainWindow);
  if (!profile) return null;
  const { accessToken, refreshToken, ...safeProfile } = profile;
  return safeProfile;
});

// OS Utilities - Secured Against Protocol and Path Traversal Injection
ipcMain.handle('open-folder', async (event, folderPath) => {
  const safeBase = INSTANCES_DIR;
  const target = folderPath ? path.resolve(folderPath) : safeBase;
  if (target.startsWith(path.dirname(safeBase))) {
    await shell.openPath(target);
    return true;
  }
  await shell.openPath(safeBase);
  return true;
});

ipcMain.handle('open-url', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Secret Version Update Checker
ipcMain.handle('check-for-updates', async () => {
  try {
    const https = require('https');
    const currentVersion = app.getVersion();
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/Yugraj20/AtherLauncer/releases/latest',
        headers: {
          'User-Agent': 'Ather-Launcher-Secret-Update-Checker'
        }
      };
      const req = https.get(options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return resolve({ hasUpdate: false, currentVersion });
            }
            const data = JSON.parse(raw);
            const latestTag = (data.tag_name || '').replace(/^v/, '');
            
            // Compare semver
            const p1 = latestTag.split('.').map(Number);
            const p2 = currentVersion.split('.').map(Number);
            let hasUpdate = false;
            for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
              const n1 = p1[i] || 0;
              const n2 = p2[i] || 0;
              if (n1 > n2) { hasUpdate = true; break; }
              if (n1 < n2) { hasUpdate = false; break; }
            }

            const setupAsset = data.assets?.find(a => a.name.endsWith('.exe'))?.browser_download_url;
            const zipAsset = data.assets?.find(a => a.name.endsWith('.zip'))?.browser_download_url;

            resolve({
              hasUpdate,
              currentVersion,
              latestVersion: latestTag,
              tagName: data.tag_name,
              releaseName: data.name || `Ather Launcher v${latestTag}`,
              releaseNotes: data.body || '',
              htmlUrl: data.html_url,
              setupUrl: setupAsset || data.html_url,
              zipUrl: zipAsset || data.html_url
            });
          } catch (e) {
            resolve({ hasUpdate: false, currentVersion, error: e.message });
          }
        });
      });
      req.on('error', (err) => {
        resolve({ hasUpdate: false, currentVersion, error: err.message });
      });
      req.setTimeout(6000, () => {
        req.destroy();
        resolve({ hasUpdate: false, currentVersion, error: 'Timeout' });
      });
    });
  } catch (err) {
    return { hasUpdate: false, currentVersion: app.getVersion(), error: err.message };
  }
});

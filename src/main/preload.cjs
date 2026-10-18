const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aether', {
  // Instances
  getAthersChoice: () => ipcRenderer.invoke('get-athers-choice'),
  getInstances: () => ipcRenderer.invoke('get-instances'),
  createInstance: (data) => ipcRenderer.invoke('create-instance', data),
  updateInstance: (instanceId, updates) => ipcRenderer.invoke('update-instance', { instanceId, updates }),
  deleteInstance: (instanceId) => ipcRenderer.invoke('delete-instance', instanceId),
  getInstanceMods: (instanceId) => ipcRenderer.invoke('get-instance-mods', instanceId),
  toggleInstanceMod: (instanceId, filename) => ipcRenderer.invoke('toggle-instance-mod', { instanceId, filename }),
  deleteInstanceMod: (instanceId, filename) => ipcRenderer.invoke('delete-instance-mod', { instanceId, filename }),
  getInstanceAddons: (instanceId, type) => ipcRenderer.invoke('get-instance-addons', { instanceId, type }),
  toggleInstanceAddon: (instanceId, type, filename) => ipcRenderer.invoke('toggle-instance-addon', { instanceId, type, filename }),
  deleteInstanceAddon: (instanceId, type, filename) => ipcRenderer.invoke('delete-instance-addon', { instanceId, type, filename }),
  openInstanceSubdir: (instanceId, subfolder) => ipcRenderer.invoke('open-instance-subdir', { instanceId, subfolder }),
  getMojangVersions: () => ipcRenderer.invoke('get-mojang-versions'),
  getOptifineVersions: () => ipcRenderer.invoke('get-optifine-versions'),

  // Java & System
  getJavaInstallations: () => ipcRenderer.invoke('get-java-installations'),

  // Modrinth
  searchModrinth: (query, type, version, loader) => ipcRenderer.invoke('search-modrinth', { query, type, version, loader }),
  installMod: (projectId, instanceId, version, loader) => ipcRenderer.invoke('install-mod', { projectId, instanceId, version, loader }),

  // Launcher
  launchInstance: (instance, javaPath, ramGb, directServer = null) => ipcRenderer.invoke('launch-instance', { instance, javaPath, ramGb, directServer }),
  killCurrentInstance: () => ipcRenderer.invoke('kill-current-instance'),
  isInstanceRunning: () => ipcRenderer.invoke('is-instance-running'),

  // Auth & Profiles (Official Microsoft IdP Only)
  getActiveProfile: () => ipcRenderer.invoke('get-active-profile'),
  logout: () => ipcRenderer.invoke('logout'),
  loginMicrosoftPopup: () => ipcRenderer.invoke('login-microsoft-popup'),

  // OS utilities
  openFolder: (dirPath) => ipcRenderer.invoke('open-folder', dirPath),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Live Streams
  onLog: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('launcher-log', subscription);
    return () => ipcRenderer.removeListener('launcher-log', subscription);
  },
  onStatus: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('launcher-status', subscription);
    return () => ipcRenderer.removeListener('launcher-status', subscription);
  }
});

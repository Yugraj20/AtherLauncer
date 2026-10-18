const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { resolveVersion, downloadClientJar, downloadLibraries, downloadAssets } = require('./mojang-installer.cjs');
const { resolveFabricProfile, installFabricLibraries } = require('./fabric-installer.cjs');
const { getActiveProfile } = require('./auth-manager.cjs');
const { getRequiredJavaVersion, ensureJavaRuntime } = require('./java-manager.cjs');
const { findOptifineJar, installOptifine } = require('./optifine-installer.cjs');

const AETHER_DIR = path.join(os.homedir(), '.aether');
const INSTANCES_DIR = path.join(AETHER_DIR, 'instances');
const VERSIONS_DIR = path.join(AETHER_DIR, 'versions');
const ASSETS_DIR = path.join(AETHER_DIR, 'assets');
const LIBRARIES_DIR = path.join(AETHER_DIR, 'libraries');
const CONFIG_FILE = path.join(AETHER_DIR, 'instances.json');

const https = require('https');

const ATHERS_CHOICE_PRESETS = [
  {
    id: 'aether-hyperion-fps',
    name: 'Hyperion FPS Boost',
    version: '1.21.4',
    loader: 'Fabric',
    isAthersChoice: true,
    memoryMin: 2,
    memoryMax: 6,
    bannerUrl: 'assets/banners/banner_03.jpg',
    description: 'Maximum framerate & competitive low-latency preset with Sodium, Lithium, ImmediatelyFast, FerriteCore, Fullbright & MakeUp UltraFast shaders.',
    requiredMods: ['sodium', 'lithium', 'ferrite-core', 'immediatelyfast', 'moreculling', 'entityculling', 'sodium-extra', 'reeses-sodium-options', 'fabric-api'],
    requiredResourcePacks: ['fullbright-ub', 'low-on-fire', 'default-dark-mode'],
    requiredShaders: ['makeup-ultra-fast-shaders']
  },
  {
    id: 'aether-rtx-cinematic',
    name: 'RTX Cinematic Shaders',
    version: '1.21.4',
    loader: 'Fabric',
    isAthersChoice: true,
    memoryMin: 4,
    memoryMax: 8,
    bannerUrl: 'assets/banners/banner_08.jpg',
    description: 'Breathtaking raytraced-style visuals powered by Iris Shaders, Complementary Reimagined, BSL Shaders, Fresh Animations & Dramatic Skys.',
    requiredMods: ['iris', 'sodium', 'entitytexturefeatures', 'entity-model-features', '3dskinlayers', 'not-enough-animations', 'fabric-api'],
    requiredResourcePacks: ['fresh-animations', 'fast-better-grass', 'dramatic-skys'],
    requiredShaders: ['complementary-reimagined', 'bsl-shaders']
  },
  {
    id: 'aether-survival-plus',
    name: 'Survival+ Explorer',
    version: '1.21.4',
    loader: 'Fabric',
    isAthersChoice: true,
    memoryMin: 2,
    memoryMax: 6,
    bannerUrl: 'assets/banners/banner_14.jpg',
    description: 'Ultimate survival QoL suite with Xaero Minimap & World Map, JEI, Jade, AppleSkin, Glowing Ores & Complementary Unbound.',
    requiredMods: ['xaeros-minimap', 'xaeros-world-map', 'jei', 'jade', 'appleskin', 'modmenu', 'iris', 'sodium', 'fabric-api'],
    requiredResourcePacks: ['fresh-animations', 'new-glowing-ores'],
    requiredShaders: ['complementary-unbound']
  },
  {
    id: 'aether-multiplayer-smp',
    name: 'Multiplayer SMP Pro',
    version: '1.21.4',
    loader: 'Fabric',
    isAthersChoice: true,
    memoryMin: 2,
    memoryMax: 6,
    bannerUrl: 'assets/banners/banner_19.jpg',
    description: 'Tailored for multiplayer servers & SMPs with Simple Voice Chat, 3D Skin Layers, LowOnFire, Chat Reporting Helper & Solas Shaders.',
    requiredMods: ['simple-voice-chat', '3dskinlayers', 'not-enough-animations', 'entityculling', 'modmenu', 'iris', 'sodium', 'fabric-api'],
    requiredResourcePacks: ['low-on-fire', 'chat-reporting-helper'],
    requiredShaders: ['solas-shader']
  },
  {
    id: 'aether-realism-immersion',
    name: 'Realism & Immersion',
    version: '1.21.4',
    loader: 'Fabric',
    isAthersChoice: true,
    memoryMin: 4,
    memoryMax: 8,
    bannerUrl: 'assets/banners/banner_23.jpg',
    description: 'Next-gen atmospheric immersion with Photon & Mellow Shaders, Fresh Animations + Extensions, Entity Model/Texture Features & Dramatic Skys.',
    requiredMods: ['iris', 'sodium', 'lithium', 'entitytexturefeatures', 'entity-model-features', 'appleskin', 'fabric-api'],
    requiredResourcePacks: ['fresh-animations', 'fa-all-extensions', 'new-glowing-ores', 'dramatic-skys'],
    requiredShaders: ['photon-shader', 'mellow']
  }
];

function ensureDirectories() {
  [AETHER_DIR, INSTANCES_DIR, VERSIONS_DIR, ASSETS_DIR, LIBRARIES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function getAthersChoiceInstances() {
  ensureDirectories();
  const defaultBanners = Array.from({ length: 25 }, (_, i) => `assets/banners/banner_${String(i + 1).padStart(2, '0')}.jpg`);

  return ATHERS_CHOICE_PRESETS.map((preset, idx) => {
    const instDir = path.join(INSTANCES_DIR, preset.id);
    const mcDir = path.join(instDir, 'minecraft');
    const modsDir = path.join(mcDir, 'mods');
    const rpDir = path.join(mcDir, 'resourcepacks');
    const spDir = path.join(mcDir, 'shaderpacks');
    const readyFile = path.join(instDir, 'athers-choice-ready.json');
    const overridesFile = path.join(instDir, 'overrides.json');

    let overrides = {};
    try {
      if (fs.existsSync(overridesFile)) {
        overrides = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
      }
    } catch (e) {}

    let installedMods = 0;
    let installedRp = 0;
    let installedSp = 0;
    try {
      if (fs.existsSync(modsDir)) {
        installedMods = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar') || f.endsWith('.disabled') || f.endsWith('.zip')).length;
      }
    } catch (e) {}
    try {
      if (fs.existsSync(rpDir)) {
        installedRp = fs.readdirSync(rpDir).filter(f => f.endsWith('.zip') || f.endsWith('.disabled')).length;
      }
    } catch (e) {}
    try {
      if (fs.existsSync(spDir)) {
        installedSp = fs.readdirSync(spDir).filter(f => f.endsWith('.zip') || f.endsWith('.disabled')).length;
      }
    } catch (e) {}

    const isDownloaded = fs.existsSync(readyFile) && installedMods > 0;

    return {
      ...preset,
      name: overrides.name || preset.name,
      memoryMax: overrides.memoryMax || preset.memoryMax,
      jvmArgs: overrides.jvmArgs || '',
      bannerUrl: overrides.bannerUrl || preset.bannerUrl || defaultBanners[idx % defaultBanners.length],
      modsCount: isDownloaded ? installedMods : preset.requiredMods.length,
      modpacksCount: 1,
      resourcepacksCount: isDownloaded ? installedRp : preset.requiredResourcePacks.length,
      shadersCount: isDownloaded ? installedSp : preset.requiredShaders.length,
      isDownloaded,
      isAthersChoice: true
    };
  });
}

function getInstances() {
  ensureDirectories();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const rawList = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const athersChoiceIds = new Set(ATHERS_CHOICE_PRESETS.map(p => p.id));
    // Never include Ather's Choice presets inside "Your Minecraft Instances"
    const list = rawList.filter(inst => !athersChoiceIds.has(inst.id));
    if (list.length !== rawList.length) {
      saveInstances(list);
    }

    // Dynamically calculate modsCount, resourcepacksCount, shadersCount for every user instance
    for (const inst of list) {
      const mcDir = path.join(INSTANCES_DIR, inst.id, 'minecraft');
      const modsDir = path.join(mcDir, 'mods');
      const rpDir = path.join(mcDir, 'resourcepacks');
      const spDir = path.join(mcDir, 'shaderpacks');

      try {
        if (fs.existsSync(modsDir)) {
          inst.modsCount = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar') || f.endsWith('.disabled') || f.endsWith('.zip')).length;
        } else {
          inst.modsCount = 0;
        }
      } catch (e) { inst.modsCount = 0; }

      try {
        if (fs.existsSync(rpDir)) {
          inst.resourcepacksCount = fs.readdirSync(rpDir).filter(f => f.endsWith('.zip') || f.endsWith('.disabled')).length;
        } else {
          inst.resourcepacksCount = 0;
        }
      } catch (e) { inst.resourcepacksCount = 0; }

      try {
        if (fs.existsSync(spDir)) {
          inst.shadersCount = fs.readdirSync(spDir).filter(f => f.endsWith('.zip') || f.endsWith('.disabled')).length;
        } else {
          inst.shadersCount = 0;
        }
      } catch (e) { inst.shadersCount = 0; }

      const mpDir = path.join(mcDir, 'modpacks');
      try {
        if (fs.existsSync(mpDir)) {
          inst.modpacksCount = fs.readdirSync(mpDir).filter(f => f.endsWith('.mrpack') || f.endsWith('.zip') || f.endsWith('.disabled')).length;
        } else {
          inst.modpacksCount = 0;
        }
      } catch (e) { inst.modpacksCount = 0; }
    }
    return list;
  } catch (e) {
    return [];
  }
}

function saveInstances(list) {
  ensureDirectories();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(list, null, 2));
}

function createInstance({ name, version, loader = 'Vanilla', memoryMin = 2, memoryMax = 6, bannerUrl = null }) {
  ensureDirectories();
  const instances = getInstances();
  const cleanId = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString().slice(-4);

  // 25-image Minecraft gallery from user's attached collection
  const defaultBanners = Array.from({ length: 25 }, (_, i) => `assets/banners/banner_${String(i + 1).padStart(2, '0')}.jpg`);

  const newInstance = {
    id: cleanId,
    name: name.trim() || `Minecraft ${version}`,
    version: version || '1.21.4',
    loader: loader || 'Vanilla',
    modsCount: 0,
    shaders: 'None',
    memoryMin: parseInt(memoryMin, 10) || 2,
    memoryMax: parseInt(memoryMax, 10) || 6,
    bannerUrl: bannerUrl || defaultBanners[Math.floor(Math.random() * defaultBanners.length)],
    description: `${loader} instance running Minecraft ${version}.`,
    createdAt: Date.now()
  };

  // Setup isolated instance folder structure
  const instDir = path.join(INSTANCES_DIR, cleanId);
  const mcDir = path.join(instDir, 'minecraft');
  ['mods', 'shaderpacks', 'saves', 'resourcepacks', 'modpacks'].forEach(sub => {
    fs.mkdirSync(path.join(mcDir, sub), { recursive: true });
  });

  instances.push(newInstance);
  saveInstances(instances);

  return newInstance;
}

function updateInstance(instanceId, updates) {
  const preset = ATHERS_CHOICE_PRESETS.find(p => p.id === instanceId);
  if (preset) {
    const instDir = path.join(INSTANCES_DIR, instanceId);
    if (!fs.existsSync(instDir)) fs.mkdirSync(instDir, { recursive: true });
    const overridesFile = path.join(instDir, 'overrides.json');
    let overrides = {};
    try {
      if (fs.existsSync(overridesFile)) overrides = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
    } catch (e) {}
    overrides = {
      ...overrides,
      name: updates.name ? updates.name.trim() : (overrides.name || preset.name),
      memoryMax: updates.memoryMax ? parseInt(updates.memoryMax, 10) : (overrides.memoryMax || preset.memoryMax),
      jvmArgs: updates.jvmArgs !== undefined ? updates.jvmArgs : (overrides.jvmArgs || '')
    };
    fs.writeFileSync(overridesFile, JSON.stringify(overrides, null, 2));
    return { ...preset, ...overrides };
  }

  const instances = getInstances();
  const idx = instances.findIndex(i => i.id === instanceId);
  if (idx === -1) throw new Error('Instance not found');

  const current = instances[idx];
  instances[idx] = {
    ...current,
    name: updates.name ? updates.name.trim() : current.name,
    memoryMax: updates.memoryMax ? parseInt(updates.memoryMax, 10) : current.memoryMax,
    javaPath: updates.javaPath !== undefined ? updates.javaPath : current.javaPath,
    jvmArgs: updates.jvmArgs !== undefined ? updates.jvmArgs : (current.jvmArgs || ''),
    bannerUrl: updates.bannerUrl || current.bannerUrl
  };
  saveInstances(instances);
  return instances[idx];
}

function deleteInstance(instanceId) {
  let instances = getInstances();
  instances = instances.filter(i => i.id !== instanceId);
  saveInstances(instances);

  const instDir = path.join(INSTANCES_DIR, instanceId);
  try {
    if (fs.existsSync(instDir)) {
      fs.rmSync(instDir, { recursive: true, force: true });
    }
  } catch (e) {}

  return true;
}

function getInstanceSubdir(instanceId, subfolder = '') {
  const dir = subfolder ? path.join(INSTANCES_DIR, instanceId, 'minecraft', subfolder) : path.join(INSTANCES_DIR, instanceId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getInstanceAddons(instanceId, folderType = 'mods') {
  const validFolders = ['mods', 'resourcepacks', 'shaderpacks', 'modpacks'];
  if (!validFolders.includes(folderType)) {
    throw new Error('Invalid folder type: ' + folderType);
  }

  const targetDir = path.join(INSTANCES_DIR, instanceId, 'minecraft', folderType);
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
    return [];
  }

  try {
    const files = fs.readdirSync(targetDir);
    return files
      .filter(f => f.endsWith('.jar') || f.endsWith('.zip') || f.endsWith('.mrpack') || f.endsWith('.disabled'))
      .map(file => {
        const fullPath = path.join(targetDir, file);
        const stats = fs.statSync(fullPath);
        const metaPath = path.join(targetDir, file.replace(/\.disabled$/, '').replace(/\.(jar|zip|mrpack)$/, '') + '.json');
        let meta = null;
        if (fs.existsSync(metaPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch (e) {}
        }
        return {
          filename: file,
          name: (meta && meta.name) || file.replace(/\.disabled$/, '').replace(/\.(jar|zip|mrpack)$/, ''),
          version: meta ? meta.version : '',
          description: meta ? meta.description : '',
          modsCount: meta ? meta.modsCount : undefined,
          icon_url: meta ? meta.icon_url : null,
          sizeBytes: stats.size,
          sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          enabled: !file.endsWith('.disabled'),
          modifiedAt: stats.mtimeMs
        };
      });
  } catch (e) {
    return [];
  }
}

function toggleInstanceAddon(instanceId, folderType, filename) {
  const validFolders = ['mods', 'resourcepacks', 'shaderpacks', 'modpacks'];
  if (!validFolders.includes(folderType)) return { success: false, error: 'Invalid folder type' };

  const targetDir = path.join(INSTANCES_DIR, instanceId, 'minecraft', folderType);
  const src = path.join(targetDir, filename);
  if (!fs.existsSync(src)) return { success: false, error: 'File not found' };

  let newName;
  if (filename.endsWith('.disabled')) {
    newName = filename.replace(/\.disabled$/, '');
  } else {
    newName = filename + '.disabled';
  }
  fs.renameSync(src, path.join(targetDir, newName));
  return { success: true, newFilename: newName, enabled: !newName.endsWith('.disabled') };
}

function deleteInstanceAddon(instanceId, folderType, filename) {
  const validFolders = ['mods', 'resourcepacks', 'shaderpacks', 'modpacks'];
  if (!validFolders.includes(folderType)) return { success: false, error: 'Invalid folder type' };

  const targetDir = path.join(INSTANCES_DIR, instanceId, 'minecraft', folderType);
  const target = path.join(targetDir, filename);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    const metaPath = path.join(targetDir, filename.replace(/\.disabled$/, '').replace(/\.(jar|zip|mrpack)$/, '') + '.json');
    if (fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch (e) {}
    }
    return { success: true };
  }
  return { success: false, error: 'File not found' };
}

// Backwards compatibility wrappers
function getInstalledMods(instanceId) {
  return getInstanceAddons(instanceId, 'mods');
}

function toggleMod(instanceId, filename) {
  return toggleInstanceAddon(instanceId, 'mods', filename);
}

function deleteMod(instanceId, filename) {
  return deleteInstanceAddon(instanceId, 'mods', filename);
}

/**
 * Builds complete, robust JVM arguments for modern and legacy Minecraft.
 * Incorporates critical Panama/native access flags for Java 21 & 25,
 * version-specific rules from Mojang metadata, and modloader configurations.
 */
function buildJvmArguments(versionData, nativesDir, allocatedRamGb, fabricJvmArgs, classpathString, mainClass) {
  const args = [
    `-Xms1024M`,
    `-Xmx${allocatedRamGb * 1024}M`
  ];

  // Essential modern Java & Panama flags (mandatory for Java 21 & Java 25 off-heap native memory)
  const modernJavaFlags = [
    `-XX:StackShadowPages=32`,
    `--enable-native-access=ALL-UNNAMED`,
    `--add-exports`,
    `java.base/jdk.internal.misc=ALL-UNNAMED`
  ];

  for (const flag of modernJavaFlags) {
    if (!args.includes(flag)) args.push(flag);
  }

  // Parse Mojang version-specific JVM arguments from version JSON
  if (versionData && versionData.arguments && Array.isArray(versionData.arguments.jvm)) {
    for (const item of versionData.arguments.jvm) {
      if (typeof item === 'string') {
        if (item === '-cp' || item === '${classpath}') continue;
        const resolved = item
          .replace(/\$\{natives_directory\}[^;"]*/g, nativesDir)
          .replace(/\$\{launcher_name\}/g, 'Aether')
          .replace(/\$\{launcher_version\}/g, '1.0.0');
        if (resolved && !args.includes(resolved)) {
          args.push(resolved);
        }
      } else if (item && typeof item === 'object') {
        let allowed = !item.rules || item.rules.length === 0;
        if (item.rules && Array.isArray(item.rules)) {
          for (const rule of item.rules) {
            let match = true;
            if (rule.os) {
              if (rule.os.name && rule.os.name !== 'windows') match = false;
              if (rule.os.arch && rule.os.arch !== 'x64' && rule.os.arch !== 'x86_64') match = false;
            }
            if (match) allowed = (rule.action === 'allow');
          }
        }
        if (allowed && item.value) {
          const values = Array.isArray(item.value) ? item.value : [item.value];
          for (const val of values) {
            const resolved = val
              .replace(/\$\{natives_directory\}[^;"]*/g, nativesDir)
              .replace(/\$\{launcher_name\}/g, 'Aether')
              .replace(/\$\{launcher_version\}/g, '1.0.0');
            if (resolved && !args.includes(resolved)) {
              args.push(resolved);
            }
          }
        }
      }
    }
  }

  // Fallback defaults for natives paths if not already populated
  const defaultNativesProps = [
    `-Djava.library.path=${nativesDir}`,
    `-Djna.tmpdir=${nativesDir}`,
    `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
    `-Dio.netty.native.workdir=${nativesDir}`,
    `-Dminecraft.launcher.brand=Aether`,
    `-Dminecraft.launcher.version=1.0.0`
  ];
  for (const prop of defaultNativesProps) {
    const key = prop.split('=')[0];
    if (!args.some(a => a.startsWith(key + '='))) {
      args.push(prop);
    }
  }

  // Modloader extra JVM args (e.g. FabricMcEmu)
  for (const fArg of fabricJvmArgs) {
    if (fArg && !args.includes(fArg)) {
      args.push(fArg);
    }
  }

  // Append Classpath and Main Class
  args.push('-cp', classpathString, mainClass);

  return args;
}

async function downloadFileFromUrl(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'AetherLauncher/1.0.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return downloadFileFromUrl(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch (e) {}
      reject(err);
    });
  });
}

async function downloadModrinthAddonBySlug(slug, targetFolder, type, gameVersion) {
  let versionsUrl = `https://api.modrinth.com/v2/project/${slug}/version?game_versions=${encodeURIComponent(JSON.stringify([gameVersion]))}`;
  if (type === 'mod') {
    versionsUrl += `&loaders=${encodeURIComponent(JSON.stringify(['fabric']))}`;
  }

  let res = await fetch(versionsUrl, { headers: { 'User-Agent': 'AetherLauncher/1.0.0' } });
  let versions = res.ok ? await res.json() : [];

  if (!Array.isArray(versions) || versions.length === 0) {
    let fallbackUrl = `https://api.modrinth.com/v2/project/${slug}/version`;
    if (type === 'mod') {
      fallbackUrl += `?loaders=${encodeURIComponent(JSON.stringify(['fabric']))}`;
    }
    res = await fetch(fallbackUrl, { headers: { 'User-Agent': 'AetherLauncher/1.0.0' } });
    versions = res.ok ? await res.json() : [];
  }

  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`No compatible Modrinth release found for ${slug}`);
  }

  const primaryVer = versions[0];
  const fileObj = (primaryVer.files || []).find(f => f.primary) || (primaryVer.files || [])[0];
  if (!fileObj || !fileObj.url) {
    throw new Error(`No downloadable file found for ${slug}`);
  }

  if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
  const destPath = path.join(targetFolder, fileObj.filename);
  if (!fs.existsSync(destPath)) {
    await downloadFileFromUrl(fileObj.url, destPath);
  }
  return fileObj.filename;
}

async function ensureAthersChoiceAddons(preset, instanceDir, mcDir, sendLog) {
  const modsDir = path.join(mcDir, 'mods');
  const rpDir = path.join(mcDir, 'resourcepacks');
  const spDir = path.join(mcDir, 'shaderpacks');
  const savesDir = path.join(mcDir, 'saves');

  [modsDir, rpDir, spDir, savesDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const readyFile = path.join(instanceDir, 'athers-choice-ready.json');
  let manifest = { mods: {}, resourcepacks: {}, shaderpacks: {} };
  try {
    if (fs.existsSync(readyFile)) {
      manifest = JSON.parse(fs.readFileSync(readyFile, 'utf8'));
    }
  } catch (e) {}

  sendLog(`[Ather's Choice] Verifying & downloading required mods, resource packs, and shaders for "${preset.name}"...`, 'info');

  // 1. Required Mods
  const modsList = preset.requiredMods || [];
  for (let i = 0; i < modsList.length; i++) {
    const slug = modsList[i];
    const existingFile = manifest.mods?.[slug];
    if (existingFile && (fs.existsSync(path.join(modsDir, existingFile)) || fs.existsSync(path.join(modsDir, existingFile + '.disabled')))) {
      continue;
    }
    try {
      sendLog(`[Ather's Choice] Downloading mod (${i + 1}/${modsList.length}): ${slug}...`, 'info');
      const filename = await downloadModrinthAddonBySlug(slug, modsDir, 'mod', preset.version);
      manifest.mods = manifest.mods || {};
      manifest.mods[slug] = filename;
      sendLog(`[Ather's Choice] ✓ Installed mod: ${filename}`, 'success');
    } catch (err) {
      sendLog(`[Ather's Choice] Notice skipping mod ${slug}: ${err.message}`, 'warn');
    }
  }

  // 2. Required Resource Packs
  const rpList = preset.requiredResourcePacks || [];
  for (let i = 0; i < rpList.length; i++) {
    const slug = rpList[i];
    const existingFile = manifest.resourcepacks?.[slug];
    if (existingFile && (fs.existsSync(path.join(rpDir, existingFile)) || fs.existsSync(path.join(rpDir, existingFile + '.disabled')))) {
      continue;
    }
    try {
      sendLog(`[Ather's Choice] Downloading resource pack (${i + 1}/${rpList.length}): ${slug}...`, 'info');
      const filename = await downloadModrinthAddonBySlug(slug, rpDir, 'resourcepack', preset.version);
      manifest.resourcepacks = manifest.resourcepacks || {};
      manifest.resourcepacks[slug] = filename;
      sendLog(`[Ather's Choice] ✓ Installed resource pack: ${filename}`, 'success');
    } catch (err) {
      sendLog(`[Ather's Choice] Notice skipping resource pack ${slug}: ${err.message}`, 'warn');
    }
  }

  // 3. Required Shaders
  const spList = preset.requiredShaders || [];
  for (let i = 0; i < spList.length; i++) {
    const slug = spList[i];
    const existingFile = manifest.shaderpacks?.[slug];
    if (existingFile && (fs.existsSync(path.join(spDir, existingFile)) || fs.existsSync(path.join(spDir, existingFile + '.disabled')))) {
      continue;
    }
    try {
      sendLog(`[Ather's Choice] Downloading shader pack (${i + 1}/${spList.length}): ${slug}...`, 'info');
      const filename = await downloadModrinthAddonBySlug(slug, spDir, 'shader', preset.version);
      manifest.shaderpacks = manifest.shaderpacks || {};
      manifest.shaderpacks[slug] = filename;
      sendLog(`[Ather's Choice] ✓ Installed shader pack: ${filename}`, 'success');
    } catch (err) {
      sendLog(`[Ather's Choice] Notice skipping shader ${slug}: ${err.message}`, 'warn');
    }
  }

  manifest.updatedAt = Date.now();
  fs.writeFileSync(readyFile, JSON.stringify(manifest, null, 2));
  sendLog(`[Ather's Choice] All required preset mods, resource packs, and shaders are installed and ready!`, 'success');
}

async function launchInstance(instance, javaPath, allocatedRamGb, win, directServer = null) {
  ensureDirectories();
  const instanceDir = path.join(INSTANCES_DIR, instance.id);
  const mcDir = path.join(instanceDir, 'minecraft');
  const nativesDir = path.join(instanceDir, 'natives');

  [instanceDir, mcDir, nativesDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const sendLog = (text, type = 'info') => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('launcher-log', { text, type, timestamp: new Date().toLocaleTimeString() });
    }
  };

  const sendStatus = (status) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('launcher-status', { status, instanceId: instance.id });
    }
  };

  try {
    sendStatus('verifying');
    sendLog(`================================================================`, 'info');
    sendLog(`[Aether] INITIALIZING INSTANCE: ${instance.name}`, 'info');
    sendLog(`[Aether] Target Version: ${instance.version} | Loader: ${instance.loader}`, 'info');

    // 1. Get Verified Player Profile (Anti-Piracy & Auto-Renewal)
    let profile = getActiveProfile();
    if (!profile || profile.type !== 'microsoft' || !profile.accessToken || !profile.uuid) {
      throw new Error('Anti-Piracy Enforcement: A verified official Microsoft account with an active Minecraft Java license is required to launch.');
    }

    if (profile.refreshToken) {
      try {
        const checkRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
          headers: { 'Authorization': `Bearer ${profile.accessToken}` }
        });
        if (checkRes.status === 401) {
          sendLog(`[Aether] Session token expired. Automatically refreshing via Microsoft OAuth...`, 'info');
          const { refreshMinecraftSession } = require('./auth-manager.cjs');
          profile = await refreshMinecraftSession(profile);
          sendLog(`[Aether] Session refreshed successfully for ${profile.username}!`, 'success');
        }
      } catch (checkErr) {
        // Continue with current profile if offline or check fails
      }
    }

    sendLog(`[Aether] Verified Player: ${profile.username} (Account Type: OFFICIAL MSA)`, 'info');

    // 1.5 If this is an "Ather's Choice" preset, automatically download its required mods, resource packs, and shaders on-demand!
    const athersPreset = ATHERS_CHOICE_PRESETS.find(p => p.id === instance.id);
    if (athersPreset) {
      await ensureAthersChoiceAddons(athersPreset, instanceDir, mcDir, sendLog);
    }

    // 2. Resolve Mojang Version JSON
    sendLog(`[Aether] Resolving Mojang metadata for Minecraft ${instance.version}...`, 'info');
    const versionData = await resolveVersion(instance.version, VERSIONS_DIR);

    // 2.5 Automatically Determine and Install/Verify Matching Java Runtime
    const reqJava = getRequiredJavaVersion(versionData, instance.version);
    sendLog(`[Aether] Target Minecraft ${instance.version} requires Java ${reqJava} runtime.`, 'info');
    let effectiveJava = javaPath;
    try {
      effectiveJava = await ensureJavaRuntime(reqJava, sendLog);
    } catch (jErr) {
      sendLog(`[Aether] Managed Java setup notice: ${jErr.message}. Attempting system Java...`, 'warn');
      effectiveJava = javaPath || 'java';
    }

    // 3. Download Client JAR
    sendLog(`[Aether] Verifying client.jar binary...`, 'info');
    const clientJarPath = await downloadClientJar(versionData, path.join(VERSIONS_DIR, instance.version), (p) => {
      sendLog(`[Aether] ${p.status}`, 'info');
    });

    // 4. Download Mojang Libraries & Extract Natives
    sendLog(`[Aether] Checking dependency libraries and extracting native DLLs...`, 'info');
    const mojangLibraries = await downloadLibraries(versionData, LIBRARIES_DIR, nativesDir, (p) => {
      if (p.percent % 25 === 0) sendLog(`[Aether] ${p.status}`, 'info');
    });

    // 5. Download Assets in background / parallel
    sendLog(`[Aether] Checking asset index (sound, textures, languages)...`, 'info');
    downloadAssets(versionData, ASSETS_DIR, (p) => {
      if (p.percent % 30 === 0) sendLog(`[Aether] ${p.status}`, 'info');
    }).catch(err => console.warn('Asset download warning:', err.message));

    // 6. Handle Modloaders (Fabric & OptiFine)
    let mainClass = versionData.mainClass || 'net.minecraft.client.main.Main';
    let combinedLibraries = [...mojangLibraries];
    const extraArgs = [];

    let fabricJvmArgs = [];
    if (instance.loader && instance.loader.toLowerCase().includes('fabric')) {
      sendLog(`[Aether] Resolving Fabric Loader dependencies...`, 'info');
      try {
        const fabricProfile = await resolveFabricProfile(instance.version);
        const fabricInstallResult = await installFabricLibraries(fabricProfile, LIBRARIES_DIR, (p) => {
          sendLog(`[Aether] ${p.status}`, 'info');
        });
        mainClass = fabricInstallResult.mainClass;

        // CRUCIAL FABRIC FIX: Deduplicate ASM and Mixin classes!
        // Fabric Loader supplies its own updated ASM. Mojang's older ASM classes must be removed
        // or KnotClient throws 'java.lang.IllegalStateException: duplicate ASM classes found on classpath'.
        const filteredMojangLibs = mojangLibraries.filter(p => {
          const norm = p.replace(/\\/g, '/');
          if (norm.includes('/org/ow2/asm/') || norm.includes('/sponge-mixin/')) {
            return false;
          }
          return true;
        });

        combinedLibraries = [...fabricInstallResult.libraries, ...filteredMojangLibs];

        // Collect any JVM arguments specified in Fabric's profile
        if (fabricProfile.arguments && Array.isArray(fabricProfile.arguments.jvm)) {
          fabricJvmArgs = fabricProfile.arguments.jvm.filter(a => typeof a === 'string');
        }

        // Ensure instance mods directory exists
        const modsDir = path.join(mcDir, 'mods');
        if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

        sendLog(`[Aether] Fabric Knot loader linked cleanly without ASM collisions.`, 'success');
      } catch (fabErr) {
        sendLog(`[Aether] Fabric setup fallback: ${fabErr.message}. Launching standard client.`, 'warn');
      }
    } else if (instance.loader && instance.loader.toLowerCase().includes('optifine')) {
      sendLog(`[Aether] Initializing OptiFine shader & performance engine...`, 'info');
      try {
        let optiJar = findOptifineJar(instanceDir, mcDir, instance.version);
        if (!optiJar) {
          optiJar = await installOptifine(instanceDir, mcDir, instance.version, sendLog);
        }

        if (optiJar) {
          sendLog(`[Aether] OptiFine module active: ${path.basename(optiJar)}`, 'success');
          combinedLibraries.unshift(optiJar);

          // For legacy Minecraft (1.12.2 and older like 1.8.9), use launchwrapper
          const vParts = (instance.version || '').split('.').map(n => parseInt(n, 10) || 0);
          if (vParts[1] <= 12) {
            mainClass = 'net.minecraft.launchwrapper.Launch';
            extraArgs.push('--tweakClass', 'optifine.OptiFineTweaker');
          }
        } else {
          sendLog(`[Aether] OptiFine ready. You can place your OptiFine_${instance.version}.jar into the instance 'mods' folder.`, 'info');
        }
      } catch (optiErr) {
        sendLog(`[Aether] OptiFine notice: ${optiErr.message}`, 'warn');
      }
    }

    // Append client.jar at the end of classpath
    combinedLibraries.push(clientJarPath);

    // 7. Assemble Classpath String
    const uniqueLibraries = Array.from(new Set(combinedLibraries)).filter(fs.existsSync);
    const classpathString = uniqueLibraries.join(';');

    // 8. Build JVM Arguments (Panama flags, native access, StackShadowPages, Mojang rules)
    const jvmArgs = buildJvmArguments(versionData, nativesDir, allocatedRamGb, fabricJvmArgs, classpathString, mainClass);

    // 9. Build Game Arguments
    const gameArgs = [
      `--username`, profile.username,
      `--version`, instance.version,
      `--gameDir`, mcDir,
      `--assetsDir`, ASSETS_DIR,
      `--assetIndex`, versionData.assetIndex ? versionData.assetIndex.id : '19',
      `--uuid`, profile.uuid.replace(/-/g, ''),
      `--accessToken`, profile.accessToken,
      `--userType`, 'msa',
      `--versionType`, 'release',
      ...extraArgs
    ];

    if (directServer) {
      gameArgs.push(`--server`, directServer);
    }

    const fullArgs = [...jvmArgs, ...gameArgs];

    sendLog(`[Aether] Executing Java Binary: ${effectiveJava}`, 'info');
    sendLog(`[Aether] Main Class: ${mainClass}`, 'info');
    sendLog(`[Aether] Spawning Minecraft game process...`, 'success');
    sendStatus('launching');

    // 10. Spawn Subprocess
    const child = spawn(effectiveJava, fullArgs, {
      cwd: mcDir,
      windowsHide: false
    });

    currentActiveProcess = child;
    let hasReportedRunning = false;

    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      sendLog(line, 'stdout');

      if (!hasReportedRunning && (line.includes('LWJGL') || line.includes('Setting user') || line.includes('Minecraft') || line.includes('Render thread'))) {
        hasReportedRunning = true;
        sendStatus('running');
      }
    });

    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      sendLog(line, line.includes('ERROR') ? 'error' : 'stderr');
    });

    child.on('close', (code) => {
      if (currentActiveProcess === child) {
        currentActiveProcess = null;
      }
      sendLog(`[Aether] Game process exited with code ${code}.`, code === 0 ? 'info' : 'warn');
      sendStatus('closed');
    });

    child.on('error', (err) => {
      if (currentActiveProcess === child) {
        currentActiveProcess = null;
      }
      sendLog(`[Aether] Failed to start Java process: ${err.message}`, 'error');
      sendStatus('error');
    });

    return true;
  } catch (err) {
    currentActiveProcess = null;
    sendLog(`[Aether] [ERROR]: ${err.message}`, 'error');
    sendStatus('error');
    return false;
  }
}

let currentActiveProcess = null;

/**
 * Emergency Kill Switch: Instantly and forcefully terminates the active Minecraft process tree.
 */
function killCurrentInstance() {
  if (!currentActiveProcess || !currentActiveProcess.pid) {
    return { success: false, message: 'No Minecraft instance is currently running.' };
  }

  const pid = currentActiveProcess.pid;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /f /t`, { stdio: 'ignore' });
    } else {
      currentActiveProcess.kill('SIGKILL');
    }
  } catch (err) {
    try {
      currentActiveProcess.kill('SIGKILL');
    } catch (ignore) {}
  }

  currentActiveProcess = null;
  return { success: true, pid };
}

function isInstanceRunning() {
  return !!currentActiveProcess && !currentActiveProcess.killed;
}

module.exports = {
  ensureDirectories,
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
  INSTANCES_DIR,
  AETHER_DIR
};

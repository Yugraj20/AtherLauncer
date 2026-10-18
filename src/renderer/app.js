let currentInstances = [];
let athersChoiceInstances = [];
let selectedSource = 'athers-choice'; // 'user' or 'athers-choice'
let selectedInstanceIndex = 0;
let detectedJavas = [];
let selectedJavaPath = 'java';
let currentRamGb = 6;
let isLaunching = false;

function getActiveInstance() {
  if (selectedSource === 'user' && currentInstances.length > 0) {
    return currentInstances[selectedInstanceIndex] || currentInstances[0];
  }
  if (athersChoiceInstances.length > 0) {
    return athersChoiceInstances[selectedInstanceIndex] || athersChoiceInstances[0];
  }
  return currentInstances[0] || null;
}

function openExternalLink(url) {
  if (window.aether && window.aether.openUrl) {
    window.aether.openUrl(url);
  }
}

// ================= CUSTOM OBSIDIAN DIALOG & TOAST SYSTEM =================
let customDialogResolver = null;

function showConfirmDialog({
  title = 'CONFIRM ACTION',
  message = 'Are you sure you want to proceed?',
  subtext = '',
  badge = 'CONFIRM',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
} = {}) {
  return new Promise((resolve) => {
    customDialogResolver = resolve;

    const modal = document.getElementById('modal-custom-dialog');
    const titleEl = document.getElementById('custom-dialog-title');
    const badgeEl = document.getElementById('custom-dialog-badge');
    const messageEl = document.getElementById('custom-dialog-message');
    const subtextEl = document.getElementById('custom-dialog-subtext');
    const iconWrapperEl = document.getElementById('custom-dialog-icon-wrapper');
    const iconEl = document.getElementById('custom-dialog-icon');
    const cancelBtn = document.getElementById('custom-dialog-btn-cancel');
    const confirmBtn = document.getElementById('custom-dialog-btn-confirm');
    const confirmTextEl = document.getElementById('custom-dialog-btn-confirm-text');

    if (titleEl) titleEl.innerText = title;
    if (messageEl) messageEl.innerText = message;
    if (subtextEl) {
      subtextEl.innerText = subtext;
      subtextEl.style.display = subtext ? 'block' : 'none';
    }
    if (confirmTextEl) confirmTextEl.innerText = confirmText;
    if (cancelBtn) {
      cancelBtn.innerText = cancelText;
      cancelBtn.classList.remove('hidden');
    }

    if (type === 'danger') {
      badge = badge || 'DELETE';
      if (badgeEl) {
        badgeEl.innerText = badge;
        badgeEl.className = 'px-2 py-0.5 rounded font-mono text-[9px] font-black tracking-widest uppercase bg-red-950/80 text-red-400 border border-red-700/50';
      }
      if (iconWrapperEl) iconWrapperEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-red-500/20 border border-red-500/40 text-red-400';
      if (iconEl) iconEl.innerText = '🗑️';
      if (confirmBtn) confirmBtn.className = 'px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950';
    } else if (type === 'warning') {
      badge = badge || 'WARNING';
      if (badgeEl) {
        badgeEl.innerText = badge;
        badgeEl.className = 'px-2 py-0.5 rounded font-mono text-[9px] font-black tracking-widest uppercase bg-amber-950/80 text-amber-400 border border-amber-700/50';
      }
      if (iconWrapperEl) iconWrapperEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-amber-500/20 border border-amber-500/40 text-amber-400';
      if (iconEl) iconEl.innerText = '⚠️';
      if (confirmBtn) confirmBtn.className = 'px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950';
    } else {
      badge = badge || 'INFO';
      if (badgeEl) {
        badgeEl.innerText = badge;
        badgeEl.className = 'px-2 py-0.5 rounded font-mono text-[9px] font-black tracking-widest uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-700/50';
      }
      if (iconWrapperEl) iconWrapperEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400';
      if (iconEl) iconEl.innerText = type === 'success' ? '✅' : 'ℹ️';
      if (confirmBtn) confirmBtn.className = 'px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20';
    }

    modal?.classList.remove('hidden');
  });
}

function showAlertDialog({
  title = 'ALERT',
  message = '',
  subtext = '',
  badge = 'NOTICE',
  okText = 'Dismiss',
  type = 'info'
} = {}) {
  return new Promise((resolve) => {
    customDialogResolver = resolve;

    const modal = document.getElementById('modal-custom-dialog');
    const titleEl = document.getElementById('custom-dialog-title');
    const badgeEl = document.getElementById('custom-dialog-badge');
    const messageEl = document.getElementById('custom-dialog-message');
    const subtextEl = document.getElementById('custom-dialog-subtext');
    const iconWrapperEl = document.getElementById('custom-dialog-icon-wrapper');
    const iconEl = document.getElementById('custom-dialog-icon');
    const cancelBtn = document.getElementById('custom-dialog-btn-cancel');
    const confirmBtn = document.getElementById('custom-dialog-btn-confirm');
    const confirmTextEl = document.getElementById('custom-dialog-btn-confirm-text');

    if (titleEl) titleEl.innerText = title;
    if (messageEl) messageEl.innerText = message;
    if (subtextEl) {
      subtextEl.innerText = subtext;
      subtextEl.style.display = subtext ? 'block' : 'none';
    }
    if (confirmTextEl) confirmTextEl.innerText = okText;
    if (cancelBtn) cancelBtn.classList.add('hidden');

    if (type === 'danger') {
      badge = badge || 'ERROR';
      if (badgeEl) {
        badgeEl.innerText = badge;
        badgeEl.className = 'px-2 py-0.5 rounded font-mono text-[9px] font-black tracking-widest uppercase bg-red-950/80 text-red-400 border border-red-700/50';
      }
      if (iconWrapperEl) iconWrapperEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-red-500/20 border border-red-500/40 text-red-400';
      if (iconEl) iconEl.innerText = '🚨';
      if (confirmBtn) confirmBtn.className = 'px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950';
    } else {
      if (badgeEl) {
        badgeEl.innerText = badge;
        badgeEl.className = 'px-2 py-0.5 rounded font-mono text-[9px] font-black tracking-widest uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-700/50';
      }
      if (iconWrapperEl) iconWrapperEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400';
      if (iconEl) iconEl.innerText = '🛡️';
      if (confirmBtn) confirmBtn.className = 'px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20';
    }

    modal?.classList.remove('hidden');
  });
}

function resolveCustomDialog(result) {
  const modal = document.getElementById('modal-custom-dialog');
  modal?.classList.add('hidden');
  if (customDialogResolver) {
    customDialogResolver(result);
    customDialogResolver = null;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const typeClass = type === 'danger' ? 'toast-danger' : (type === 'success' ? 'toast-success' : (type === 'warning' ? 'toast-warning' : ''));
  const icon = type === 'danger' ? '⚠️' : (type === 'success' ? '✅' : (type === 'warning' ? '🔔' : 'ℹ️'));

  toast.className = `toast-message ${typeClass}`;
  toast.innerHTML = `
    <span class="text-base">${icon}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Initialize when DOM loads
window.addEventListener('DOMContentLoaded', async () => {
  setupWindowControls();
  setupRamSliders();
  preloadMojangVersions();

  // Trigger animated splash screen fade-out after initial logo reveal
  setTimeout(() => {
    const splash = document.getElementById('aether-splash-screen');
    if (splash) {
      splash.classList.add('splash-fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 750);
    }
  }, 1750);

  await checkAuthentication();
  await loadInstances();
  await loadJavaRuntimes();
  setupLauncherListeners();
  setupModrinthSearch();
  try {
    const isRunning = await window.aether?.isInstanceRunning?.();
    if (isRunning) {
      document.getElementById('btn-kill-switch')?.classList.remove('hidden');
    }
  } catch (e) {}

  // Secret Version Update Checker (runs quietly in background on launch)
  checkSecretUpdates(false);
});

// ================= SECRET VERSION UPDATE CHECKER =================
let latestUpdateInfo = null;
let secretLogoClickCount = 0;
let secretLogoTimer = null;

async function checkSecretUpdates(isManual = false) {
  try {
    if (!window.aether || !window.aether.checkForUpdates) return;
    if (isManual) {
      showToast('🔍 Secret checker scanning GitHub for latest Ather release...', 'info');
    }
    
    const info = await window.aether.checkForUpdates();
    latestUpdateInfo = info;

    if (info && info.hasUpdate) {
      console.log(`[Secret Update Checker] New release found: v${info.latestVersion} (currently on v${info.currentVersion})`);
      const badge = document.getElementById('secret-update-badge');
      const text = document.getElementById('secret-update-text');
      if (badge && text) {
        text.innerText = `✨ v${info.latestVersion} Available`;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      }
      if (isManual) {
        showToast(`✨ Secret check: New version v${info.latestVersion} is available!`, 'success');
        openUpdateModal();
      }
    } else {
      console.log(`[Secret Update Checker] Running latest version: v${info?.currentVersion || '1.0.1'}`);
      if (isManual) {
        showToast(`✓ Secret check: You are on the newest build (v${info?.currentVersion || '1.0.1'})!`, 'success');
      }
    }
  } catch (err) {
    console.warn('[Secret Update Checker] Error checking for updates:', err);
    if (isManual) {
      showToast('Could not reach GitHub Releases: ' + err.message, 'warning');
    }
  }
}

function triggerSecretUpdateEasterEgg() {
  secretLogoClickCount++;
  clearTimeout(secretLogoTimer);
  secretLogoTimer = setTimeout(() => { secretLogoClickCount = 0; }, 2500);

  if (secretLogoClickCount >= 5) {
    secretLogoClickCount = 0;
    checkSecretUpdates(true);
  }
}

function openUpdateModal() {
  if (!latestUpdateInfo) return;
  const curVer = document.getElementById('update-current-ver');
  const latVer = document.getElementById('update-latest-ver');
  const title = document.getElementById('update-modal-title');
  const notes = document.getElementById('update-changelog-text');
  
  if (curVer) curVer.innerText = `v${latestUpdateInfo.currentVersion}`;
  if (latVer) latVer.innerText = `v${latestUpdateInfo.latestVersion}`;
  if (title) title.innerText = latestUpdateInfo.releaseName || `Ather Launcher v${latestUpdateInfo.latestVersion}`;
  if (notes) notes.innerText = latestUpdateInfo.releaseNotes || 'Includes new features, modpack support, and performance optimizations.';

  const modal = document.getElementById('modal-update-available');
  if (modal) modal.classList.remove('hidden');
}

function closeUpdateModal() {
  document.getElementById('modal-update-available')?.classList.add('hidden');
}

function downloadUpdatePackage(type) {
  if (!latestUpdateInfo) return;
  const url = type === 'zip'
    ? (latestUpdateInfo.zipUrl || latestUpdateInfo.htmlUrl)
    : (latestUpdateInfo.setupUrl || latestUpdateInfo.htmlUrl);
  openExternalLink(url);
  closeUpdateModal();
}

// Window controls
function setupWindowControls() {
  document.getElementById('btn-win-min').addEventListener('click', () => window.aether?.minimize());
  document.getElementById('btn-win-max').addEventListener('click', () => window.aether?.maximize());
  document.getElementById('btn-win-close').addEventListener('click', () => window.aether?.close());

  document.getElementById('btn-open-folder').addEventListener('click', () => {
    window.aether?.openFolder();
  });
}

// ================= AUTHENTICATION LOGIC (OFFICIAL IDP ONLY) =================

async function checkAuthentication() {
  try {
    const profile = await window.aether.getActiveProfile();
    if (!profile || profile.type !== 'microsoft' || !profile.uuid || !profile.username) {
      showLoginModal();
    } else {
      hideLoginModal();
      updateHeaderProfile(profile);
    }
  } catch (err) {
    showLoginModal();
  }
}

function showLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.remove('hidden');
}

function hideLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.add('hidden');
}

function updateHeaderProfile(profile) {
  document.getElementById('header-username').innerText = profile.username;
  document.getElementById('header-avatar').src = profile.avatarUrl || `https://api.mineatar.io/face/${profile.uuid.replace(/-/g, '')}`;
  document.getElementById('header-account-type').innerText = 'OFFICIAL MINECRAFT';
  document.getElementById('header-tag').innerText = '★ MSA';
}

function toggleAccountMenu() {
  const menu = document.getElementById('account-dropdown');
  menu.classList.toggle('hidden');
}

async function handleLogout() {
  toggleAccountMenu();
  await window.aether.logout();
  showLoginModal();
}

function promptSwitchAccount() {
  toggleAccountMenu();
  showLoginModal();
}

// Microsoft Direct IdP Popup Login (Official Minecraft OAuth)
async function startMicrosoftPopupAuth() {
  const btn = document.getElementById('btn-login-ms');
  const btnText = document.getElementById('btn-login-text');
  const loading = document.getElementById('login-loading-state');

  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'CONNECTING TO MICROSOFT...';
    if (loading) loading.classList.remove('hidden');

    const profile = await window.aether.loginMicrosoftPopup();
    if (profile && profile.type === 'microsoft') {
      hideLoginModal();
      updateHeaderProfile(profile);
      console.log('[Aether] Verified Minecraft user logged in:', profile.username);
    }
  } catch (err) {
    if (!err.message?.includes('closed')) {
      await showAlertDialog({
        title: 'MICROSOFT SIGN-IN FAILED',
        message: err.message || 'Unable to authenticate with Microsoft Xbox Live.',
        subtext: 'Please check your internet connection or Microsoft account credentials.',
        type: 'danger'
      });
    }
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerText = 'CONTINUE WITH MICROSOFT ACCOUNT';
    if (loading) loading.classList.add('hidden');
  }
}

// ================= INSTANCES MANAGEMENT =================

async function loadInstances() {
  try {
    currentInstances = await window.aether.getInstances();
  } catch (err) {
    currentInstances = [];
  }

  try {
    athersChoiceInstances = await window.aether.getAthersChoice();
  } catch (err) {
    athersChoiceInstances = [];
  }

  const grid = document.getElementById('instances-grid');
  const athersGrid = document.getElementById('athers-choice-grid');
  const countBadge = document.getElementById('instances-count-badge');
  const athersCountBadge = document.getElementById('athers-choice-count-badge');
  const heroWrapper = document.getElementById('instances-hero-wrapper');

  if (grid) grid.innerHTML = '';
  if (athersGrid) athersGrid.innerHTML = '';
  if (countBadge) countBadge.innerText = `${currentInstances.length} Instances`;
  if (athersCountBadge) athersCountBadge.innerText = `${athersChoiceInstances.length} Curated Presets`;

  // Always show hero wrapper (since Ather's Choice presets are always available)
  if (heroWrapper) heroWrapper.classList.remove('hidden');

  // 1. Render "Your Minecraft Instances"
  if (currentInstances.length === 0) {
    grid.className = "col-span-full";
    grid.innerHTML = `
      <div class="glass-card rounded-2xl p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800/90 bg-slate-900/40">
        <div class="flex items-center space-x-3.5 text-left">
          <div class="voxel-icon w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-700 p-1 flex items-center justify-center border border-emerald-300/40 shadow-lg shadow-emerald-500/15 flex-shrink-0">
            <span class="text-xl">🟩</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">No Custom Instances Yet</h3>
            <p class="text-xs text-slate-400 mt-0.5">Create your own custom instance, or click <strong class="text-emerald-400">PLAY</strong> on any <strong class="text-cyan-300">Ather's Choice</strong> preset below!</p>
          </div>
        </div>
        <button onclick="openCreateInstanceModal()" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex-shrink-0 cursor-pointer">
          + Create Custom Instance
        </button>
      </div>
    `;
  } else {
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";
    currentInstances.forEach((inst, idx) => {
      const isSelected = selectedSource === 'user' && idx === selectedInstanceIndex;
      const card = document.createElement('div');
      card.id = `inst-card-user-${idx}`;
      card.className = isSelected
        ? "glass-card cursor-pointer group relative rounded-2xl p-3 border-2 border-emerald-400 shadow-lg shadow-emerald-500/10 hover:border-emerald-300 transition-all duration-300"
        : "glass-card cursor-pointer group relative rounded-2xl p-3 border border-slate-800/80 hover:border-slate-600 transition-all duration-300";

      card.innerHTML = `
        <div class="h-32 sm:h-36 rounded-xl overflow-hidden relative mb-2.5 bg-slate-950">
          <img src="${inst.bannerUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>

          <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm font-mono text-[9px] text-emerald-300 font-bold border border-emerald-500/40">
            ${inst.version}
          </span>
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm font-mono text-[9px] text-cyan-300 font-bold border border-cyan-500/40">
            ${(inst.loader || 'Vanilla').split(' ')[0]}
          </span>

          <!-- ANIMATED HOVER ACTION BAR (20:80 RATIO) -->
          <div class="instance-card-actions absolute inset-x-2 bottom-2 flex items-center gap-1.5 z-20">
            <button onclick="event.stopPropagation(); openEditInstancePage('${inst.id}')" title="Instance Settings & Mods" class="instance-gear-btn w-[20%] h-9 flex items-center justify-center rounded-xl text-slate-200 hover:text-white transition shadow-lg text-sm cursor-pointer">
              ⚙️
            </button>
            <button onclick="event.stopPropagation(); quickLaunchInstance(${idx})" title="Launch ${inst.name}" class="instance-quick-play-btn w-[80%] h-9 flex items-center justify-center space-x-1.5 rounded-xl text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition cursor-pointer">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>PLAY</span>
            </button>
          </div>
        </div>

        <div class="px-0.5">
          <div class="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition truncate">${inst.name}</div>
          <div class="flex justify-between items-center text-[10px] text-slate-400 mt-1">
            <span class="flex items-center space-x-1.5 truncate">
              <span>🧩 ${inst.modsCount || 0}</span>
              ${inst.modpacksCount ? `<span>•</span><span>📦 ${inst.modpacksCount}</span>` : ''}
              <span>•</span>
              <span>🎨 ${inst.resourcepacksCount || 0}</span>
              <span>•</span>
              <span>✨ ${inst.shadersCount || 0}</span>
            </span>
            <span class="${isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'} font-mono flex-shrink-0">${isSelected ? 'ACTIVE' : 'Ready'}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => selectInstance(idx));
      grid.appendChild(card);
    });
  }

  // 2. Render "Ather's Choice" Section
  if (athersGrid) {
    athersChoiceInstances.forEach((inst, idx) => {
      const isSelected = selectedSource === 'athers-choice' && idx === selectedInstanceIndex;
      const card = document.createElement('div');
      card.id = `inst-card-athers-${idx}`;
      card.className = isSelected
        ? "glass-card cursor-pointer group relative rounded-2xl p-3 border-2 border-cyan-400 shadow-lg shadow-cyan-500/15 hover:border-cyan-300 transition-all duration-300"
        : "glass-card cursor-pointer group relative rounded-2xl p-3 border border-cyan-500/25 hover:border-cyan-400/60 transition-all duration-300";

      const statusLabel = isSelected
        ? 'ACTIVE'
        : (inst.isDownloaded ? '✓ READY' : '☁️ AUTO-DL');
      const statusClass = isSelected
        ? 'text-cyan-300 font-bold'
        : (inst.isDownloaded ? 'text-emerald-400 font-bold' : 'text-amber-300/90');

      card.innerHTML = `
        <div class="h-32 sm:h-36 rounded-xl overflow-hidden relative mb-2.5 bg-slate-950">
          <img src="${inst.bannerUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>

          <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-sm font-mono text-[9px] text-cyan-300 font-bold border border-cyan-500/50 flex items-center space-x-1">
            <span>✨</span>
            <span>${inst.version}</span>
          </span>
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-sm font-mono text-[9px] text-emerald-300 font-bold border border-emerald-500/40">
            ${(inst.loader || 'Fabric').split(' ')[0]}
          </span>

          <!-- ANIMATED HOVER ACTION BAR (20:80 RATIO) -->
          <div class="instance-card-actions absolute inset-x-2 bottom-2 flex items-center gap-1.5 z-20">
            <button onclick="event.stopPropagation(); openEditInstancePage('${inst.id}')" title="View Preset Mods & Settings" class="instance-gear-btn w-[20%] h-9 flex items-center justify-center rounded-xl text-slate-200 hover:text-white transition shadow-lg text-sm cursor-pointer">
              ⚙️
            </button>
            <button onclick="event.stopPropagation(); quickLaunchAthersChoice(${idx})" title="Download Required Mods & Play ${inst.name}" class="instance-quick-play-btn w-[80%] h-9 flex items-center justify-center space-x-1.5 rounded-xl text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition cursor-pointer">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>${inst.isDownloaded ? 'PLAY' : 'PLAY & DL'}</span>
            </button>
          </div>
        </div>

        <div class="px-0.5">
          <div class="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition truncate">${inst.name}</div>
          <div class="flex justify-between items-center text-[10px] text-slate-400 mt-1">
            <span class="flex items-center space-x-1.5 truncate">
              <span>🧩 ${inst.modsCount || 0}</span>
              ${inst.modpacksCount ? `<span>•</span><span>📦 ${inst.modpacksCount}</span>` : ''}
              <span>•</span>
              <span>🎨 ${inst.resourcepacksCount || 0}</span>
              <span>•</span>
              <span>✨ ${inst.shadersCount || 0}</span>
            </span>
            <span class="${statusClass} font-mono flex-shrink-0 text-[9px]">${statusLabel}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => selectAthersChoice(idx));
      athersGrid.appendChild(card);
    });
  }

  // Ensure valid selection
  if (selectedSource === 'user' && currentInstances.length > 0) {
    if (selectedInstanceIndex >= currentInstances.length) selectedInstanceIndex = 0;
    selectInstance(selectedInstanceIndex);
  } else if (athersChoiceInstances.length > 0) {
    selectedSource = 'athers-choice';
    if (selectedInstanceIndex >= athersChoiceInstances.length) selectedInstanceIndex = 0;
    selectAthersChoice(selectedInstanceIndex);
  }
}

function selectInstance(idx) {
  if (isLaunching || currentInstances.length === 0) return;
  selectedSource = 'user';
  selectedInstanceIndex = idx;
  updateHeroBanner(currentInstances[idx]);
  refreshCardHighlights();
}

function selectAthersChoice(idx) {
  if (isLaunching || athersChoiceInstances.length === 0) return;
  selectedSource = 'athers-choice';
  selectedInstanceIndex = idx;
  updateHeroBanner(athersChoiceInstances[idx]);
  refreshCardHighlights();
}

function refreshCardHighlights() {
  currentInstances.forEach((_, i) => {
    const card = document.getElementById(`inst-card-user-${i}`);
    if (card) {
      const isSel = selectedSource === 'user' && i === selectedInstanceIndex;
      card.className = isSel
        ? "glass-card cursor-pointer group relative rounded-2xl p-3 border-2 border-emerald-400 shadow-lg shadow-emerald-500/10 hover:border-emerald-300 transition-all duration-300"
        : "glass-card cursor-pointer group relative rounded-2xl p-3 border border-slate-800/80 hover:border-slate-600 transition-all duration-300";
    }
  });

  athersChoiceInstances.forEach((inst, i) => {
    const card = document.getElementById(`inst-card-athers-${i}`);
    if (card) {
      const isSel = selectedSource === 'athers-choice' && i === selectedInstanceIndex;
      card.className = isSel
        ? "glass-card cursor-pointer group relative rounded-2xl p-3 border-2 border-cyan-400 shadow-lg shadow-cyan-500/15 hover:border-cyan-300 transition-all duration-300"
        : "glass-card cursor-pointer group relative rounded-2xl p-3 border border-cyan-500/25 hover:border-cyan-400/60 transition-all duration-300";
    }
  });
}

function updateHeroBanner(inst) {
  if (!inst) return;
  document.getElementById('hero-title').innerText = inst.name;
  document.getElementById('hero-loader-badge').innerText = inst.isAthersChoice
    ? `✨ ATHER'S CHOICE • ${inst.loader} ${inst.version}`.toUpperCase()
    : `${inst.loader} ${inst.version}`.toUpperCase();
  const packParts = [
    `${inst.modsCount || 0} MODS`,
    (inst.modpacksCount || 0) > 0 ? `${inst.modpacksCount} MODPACKS` : null,
    `${inst.resourcepacksCount || 0} PACKS`
  ].filter(Boolean);
  document.getElementById('hero-mods-badge').innerText = packParts.join(' • ');

  const shaderBadge = document.getElementById('hero-shaders-badge');
  if ((inst.shadersCount || 0) > 0) {
    shaderBadge.innerText = `${inst.shadersCount} SHADERS ${inst.isAthersChoice && !inst.isDownloaded ? '(AUTO-DL)' : 'INSTALLED'}`;
    shaderBadge.className = "px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-300 font-mono text-[10px] font-bold";
  } else if (inst.loader.toLowerCase().includes('optifine')) {
    shaderBadge.innerText = 'OPTIFINE SHADERS';
    shaderBadge.className = "px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold";
  } else if (inst.loader.toLowerCase().includes('fabric')) {
    shaderBadge.innerText = 'FABRIC PIPELINE';
    shaderBadge.className = "px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-300 font-mono text-[10px] font-bold";
  } else {
    shaderBadge.innerText = 'VANILLA PIPELINE';
    shaderBadge.className = "px-2 py-0.5 rounded bg-slate-500/20 border border-slate-400/40 text-slate-300 font-mono text-[10px] font-bold";
  }

  document.getElementById('hero-desc').innerText = inst.description;
  document.getElementById('hero-bg').style.backgroundImage = `url('${inst.bannerUrl}')`;

  // Hide delete button if this is a built-in Ather's Choice preset
  const delBtn = document.getElementById('btn-delete-inst');
  if (delBtn) {
    if (inst.isAthersChoice) {
      delBtn.classList.add('hidden');
    } else {
      delBtn.classList.remove('hidden');
    }
  }

  if (!isLaunching) {
    const btnText = document.getElementById('launch-button-text');
    if (btnText) {
      btnText.innerText = (inst.isAthersChoice && !inst.isDownloaded)
        ? 'DOWNLOAD MODS & PLAY'
        : 'PLAY MINECRAFT';
    }
  }
}

// Create Instance Modal (All Versions & Loaders)
let allMojangVersions = [];
let optifineVersions = [];
let latestReleaseVersion = '1.21.4';
let latestSnapshotVersion = '1.21.5-pre1';

async function preloadMojangVersions() {
  try {
    const data = await window.aether.getMojangVersions();
    if (data) {
      if (Array.isArray(data)) {
        allMojangVersions = data;
      } else if (data.versions) {
        allMojangVersions = data.versions;
        if (data.latest) {
          if (data.latest.release) latestReleaseVersion = data.latest.release;
          if (data.latest.snapshot) latestSnapshotVersion = data.latest.snapshot;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to pre-fetch versions:', e);
  }

  try {
    const opti = await window.aether.getOptifineVersions();
    if (Array.isArray(opti)) {
      optifineVersions = opti;
    }
  } catch (e) {
    console.warn('Failed to pre-fetch OptiFine versions:', e);
  }
}

async function openCreateInstanceModal() {
  const modal = document.getElementById('modal-create-instance');
  modal.classList.remove('hidden');

  if (allMojangVersions.length === 0 || optifineVersions.length === 0) {
    await preloadMojangVersions();
  }

  updateLoaderHint();
}

function filterVersionList() {
  const loader = document.getElementById('select-inst-loader')?.value || 'Vanilla';
  const isOptifine = loader.toLowerCase().includes('optifine');
  const categorySelect = document.getElementById('select-version-category');
  const category = categorySelect?.value || 'release';
  const query = (document.getElementById('input-version-search')?.value || '').trim().toLowerCase();
  const select = document.getElementById('select-inst-version');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  const filtered = allMojangVersions.filter(v => {
    // If OptiFine is chosen, strictly filter to versions that have verified OptiFine builds!
    if (isOptifine) {
      if (!optifineVersions.includes(v.id)) return false;
    } else {
      // Category check for standard loaders
      if (category === 'release' && v.type !== 'release') return false;
      if (category === 'snapshot' && v.type !== 'snapshot') return false;
      if (category === 'beta-alpha' && v.type !== 'old_beta' && v.type !== 'old_alpha') return false;
    }

    // Search query check
    if (query && !v.id.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filtered.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.innerText = isOptifine ? 'No OptiFine build available for this search' : 'No matching versions found';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  filtered.forEach((v, idx) => {
    const opt = document.createElement('option');
    opt.value = v.id;
    let label = v.id;
    if (isOptifine) {
      label += ' (OptiFine Available)';
    } else {
      if (v.id === latestReleaseVersion) label += ' ★ (Latest Release)';
      else if (v.id === latestSnapshotVersion) label += ' ⚡ (Latest Snapshot)';
      else if (v.type === 'snapshot') label += ' [Snapshot]';
      else if (v.type === 'old_beta') label += ' [Beta]';
      else if (v.type === 'old_alpha') label += ' [Alpha]';
    }
    opt.innerText = label;

    if (currentVal && filtered.some(f => f.id === currentVal)) {
      if (v.id === currentVal) opt.selected = true;
    } else if (idx === 0) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function updateLoaderHint() {
  const loader = document.getElementById('select-inst-loader')?.value || 'Vanilla';
  const hint = document.getElementById('loader-hint-text');
  const catSelect = document.getElementById('select-version-category');

  if (loader === 'OptiFine') {
    if (hint) hint.innerText = `OptiFine HD shaders, dynamic lights & FPS boost engine. (${optifineVersions.length || 54} verified builds available)`;
    if (catSelect) {
      catSelect.disabled = true;
      catSelect.classList.add('opacity-40');
    }
  } else if (loader === 'Fabric') {
    if (hint) hint.innerText = 'Fast modern modloader for Iris shaders & Sodium optimization.';
    if (catSelect) {
      catSelect.disabled = false;
      catSelect.classList.remove('opacity-40');
    }
  } else if (loader === 'Forge') {
    if (hint) hint.innerText = 'Classic heavy modloader for complex community mods.';
    if (catSelect) {
      catSelect.disabled = false;
      catSelect.classList.remove('opacity-40');
    }
  } else {
    if (hint) hint.innerText = 'Pure official Mojang vanilla client.';
    if (catSelect) {
      catSelect.disabled = false;
      catSelect.classList.remove('opacity-40');
    }
  }

  // Instantly re-filter version dropdown
  filterVersionList();
}

function closeCreateInstanceModal() {
  document.getElementById('modal-create-instance').classList.add('hidden');
}

async function submitCreateInstance() {
  const nameInput = document.getElementById('input-inst-name');
  const versionSelect = document.getElementById('select-inst-version');
  const loaderSelect = document.getElementById('select-inst-loader');
  const ramInput = document.getElementById('input-inst-ram');

  const name = nameInput.value.trim() || `Minecraft ${versionSelect.value}`;
  const version = versionSelect.value;
  const loader = loaderSelect.value;
  const ram = parseInt(ramInput.value, 10) || 6;

  // Pick random banner from the 25-image gallery
  const randNum = Math.floor(Math.random() * 25) + 1;
  const bannerUrl = `assets/banners/banner_${String(randNum).padStart(2, '0')}.jpg`;

  const newInst = await window.aether.createInstance({
    name,
    version,
    loader,
    memoryMax: ram,
    bannerUrl
  });

  closeCreateInstanceModal();
  nameInput.value = '';
  await loadInstances();
  selectInstance(currentInstances.length - 1);
}

async function handleDeleteCurrentInstance() {
  if (currentInstances.length === 0) return;
  const inst = currentInstances[selectedInstanceIndex];
  if (!inst) return;

  const confirmed = await showConfirmDialog({
    title: 'DELETE INSTANCE',
    message: `Are you sure you want to delete instance "${inst.name}"?`,
    subtext: 'All installed mods, worlds, and configs in this instance will be permanently removed.',
    confirmText: 'Delete Instance',
    type: 'danger'
  });

  if (confirmed) {
    await window.aether.deleteInstance(inst.id);
    showToast(`Instance "${inst.name}" deleted.`, 'info');
    selectedInstanceIndex = 0;
    await loadInstances();
  }
}

// Tab Switching
function switchTab(tabName) {
  // Always hide edit instance page when switching main tabs
  document.getElementById('view-edit-instance')?.classList.add('hidden');

  const tabs = ['instances', 'radar', 'settings'];
  tabs.forEach(t => {
    const el = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`nav-btn-${t}`);
    if (el) el.classList.add('hidden');
    if (btn) {
      btn.className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-medium text-xs transition";
    }
  });

  const activeView = document.getElementById(`view-${tabName}`);
  const activeBtn = document.getElementById(`nav-btn-${tabName}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-emerald-500/15 border-l-2 border-emerald-400 text-emerald-300 font-bold text-xs transition";
  }
}

// RAM Sliders synchronization
function setupRamSliders() {
  const sidebarSlider = document.getElementById('sidebar-ram-slider');
  const sidebarDisplay = document.getElementById('sidebar-ram-display');
  const settingsSlider = document.getElementById('settings-ram-slider');
  const settingsVal = document.getElementById('settings-ram-val');

  const updateRam = (val) => {
    currentRamGb = parseInt(val, 10);
    sidebarSlider.value = currentRamGb;
    settingsSlider.value = currentRamGb;
    sidebarDisplay.innerText = `${currentRamGb}.0 GB`;
    settingsVal.innerText = `${currentRamGb}.0 GB`;
  };

  sidebarSlider.addEventListener('input', (e) => updateRam(e.target.value));
  settingsSlider.addEventListener('input', (e) => updateRam(e.target.value));
}

// Java Environments
async function loadJavaRuntimes() {
  try {
    detectedJavas = await window.aether.getJavaInstallations();
  } catch (e) {
    detectedJavas = [];
  }

  const javaList = document.getElementById('java-list');
  javaList.innerHTML = '';

  if (detectedJavas.length === 0) {
    javaList.innerHTML = `
      <div class="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
        Using system default <code class="text-emerald-400">java.exe</code> from PATH
      </div>
    `;
    selectedJavaPath = 'java';
    return;
  }

  detectedJavas.forEach((j, idx) => {
    const item = document.createElement('div');
    item.className = "p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs";
    item.innerHTML = `
      <div>
        <div class="font-bold text-slate-200 flex items-center space-x-2">
          <span>${j.vendor} Java ${j.majorVersion}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono">${j.version}</span>
        </div>
        <div class="text-[10px] text-slate-500 font-mono truncate max-w-sm mt-0.5">${j.path}</div>
      </div>
      <input type="radio" name="java-select" value="${j.path}" ${idx === 0 ? 'checked' : ''} class="accent-emerald-400">
    `;

    item.querySelector('input').addEventListener('change', (e) => {
      selectedJavaPath = e.target.value;
      document.getElementById('sidebar-java-vendor').innerText = `${j.vendor.split(' ')[0]} ${j.majorVersion}`;
    });

    javaList.appendChild(item);
  });

  if (detectedJavas.length > 0) {
    selectedJavaPath = detectedJavas[0].path;
    document.getElementById('sidebar-java-vendor').innerText = `${detectedJavas[0].vendor.split(' ')[0]} ${detectedJavas[0].majorVersion}`;
  }
}

// Launch Minecraft & Live Stream
function setupLauncherListeners() {
  const btn = document.getElementById('btn-launch-game');
  const btnText = document.getElementById('launch-button-text');
  const killBtn = document.getElementById('btn-kill-switch');
  const drawer = document.getElementById('terminal-drawer');
  const output = document.getElementById('terminal-output');
  const termStatus = document.getElementById('terminal-status');

  btn.addEventListener('click', async () => {
    if (isLaunching) return;
    const activeInst = getActiveInstance();
    if (!activeInst) {
      openCreateInstanceModal();
      return;
    }
    startLaunch(null);
  });

  window.aether?.onLog((log) => {
    const div = document.createElement('div');
    const colorClass = log.type === 'error' ? 'text-red-400 font-bold' :
                       log.type === 'success' ? 'text-emerald-400 font-bold' :
                       log.type === 'warn' ? 'text-amber-300' :
                       log.text.includes('INFO') ? 'text-slate-300' : 'text-cyan-300';
    div.className = colorClass;
    div.innerText = log.text;
    output.appendChild(div);
    drawer.scrollTop = drawer.scrollHeight;
  });

  window.aether?.onStatus(async (status) => {
    if (status.status === 'verifying') {
      const activeInst = getActiveInstance();
      btnText.innerText = (activeInst && activeInst.isAthersChoice && !activeInst.isDownloaded)
        ? "DOWNLOADING REQUIRED MODS & FILES..."
        : "VERIFYING GAME ASSETS...";
      termStatus.innerText = "DOWNLOADING / VERIFYING";
      if (killBtn) killBtn.classList.remove('hidden');
    } else if (status.status === 'launching') {
      btnText.innerText = "STARTING JVM PROCESS...";
      termStatus.innerText = "LAUNCHING";
      if (killBtn) killBtn.classList.remove('hidden');
      await loadInstances();
    } else if (status.status === 'running') {
      btnText.innerText = "MINECRAFT IS RUNNING";
      btn.className = "flex items-center space-x-3 px-8 py-3.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider";
      termStatus.innerText = "ACTIVE RUNTIME";
      if (killBtn) killBtn.classList.remove('hidden');
    } else if (status.status === 'closed') {
      isLaunching = false;
      btnText.innerText = "PLAY MINECRAFT";
      btn.className = "minecraft-play-btn flex items-center space-x-3 px-8 py-3.5 rounded-xl text-slate-950 font-black text-sm uppercase tracking-wider";
      termStatus.innerText = "GAME CLOSED";
      if (killBtn) killBtn.classList.add('hidden');
      await loadInstances();
    } else if (status.status === 'error') {
      isLaunching = false;
      btnText.innerText = "LAUNCH FAILED (SEE LOGS)";
      btn.className = "flex items-center space-x-3 px-8 py-3.5 rounded-xl bg-red-500 text-white font-black text-sm uppercase tracking-wider";
      termStatus.innerText = "ERROR DETECTED";
      if (killBtn) killBtn.classList.add('hidden');
      setTimeout(() => {
        btnText.innerText = "PLAY MINECRAFT";
        btn.className = "minecraft-play-btn flex items-center space-x-3 px-8 py-3.5 rounded-xl text-slate-950 font-black text-sm uppercase tracking-wider";
      }, 5000);
    }
  });
}

async function startLaunch(directServer = null) {
  const inst = getActiveInstance();
  if (!inst) {
    openCreateInstanceModal();
    return;
  }

  isLaunching = true;
  const btn = document.getElementById('btn-launch-game');
  const btnText = document.getElementById('launch-button-text');
  const killBtn = document.getElementById('btn-kill-switch');
  const drawer = document.getElementById('terminal-drawer');
  const output = document.getElementById('terminal-output');
  const termStatus = document.getElementById('terminal-status');

  btn.className = "flex items-center space-x-3 px-8 py-3.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider";
  btnText.innerText = (inst.isAthersChoice && !inst.isDownloaded)
    ? "DOWNLOADING REQUIRED MODS & FILES..."
    : "PREPARING...";
  drawer.classList.remove('hidden');
  output.innerHTML = '';
  termStatus.innerText = (inst.isAthersChoice && !inst.isDownloaded)
    ? 'DOWNLOADING MODS & FILES'
    : 'INITIALIZING';
  if (killBtn) killBtn.classList.remove('hidden');

  if (inst.isAthersChoice && !inst.isDownloaded) {
    showToast(`Downloading required mods, resource packs, shaders & game files for ${inst.name}...`, 'info');
  }

  await window.aether.launchInstance(inst, selectedJavaPath, currentRamGb, directServer);
}

// ================= EMERGENCY KILL SWITCH (UNSAFE WARNING POPUP) =================
function openKillSwitchModal() {
  const modal = document.getElementById('modal-kill-switch');
  if (modal) modal.classList.remove('hidden');
}

function closeKillSwitchModal() {
  const modal = document.getElementById('modal-kill-switch');
  if (modal) modal.classList.add('hidden');
}

async function confirmKillCurrentInstance() {
  const confirmBtn = document.getElementById('btn-confirm-kill');
  const termStatus = document.getElementById('terminal-status');
  const killBtn = document.getElementById('btn-kill-switch');
  const btn = document.getElementById('btn-launch-game');
  const btnText = document.getElementById('launch-button-text');

  try {
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>⏳</span><span>KILLING PROCESS...</span>`;
    }
    if (termStatus) termStatus.innerText = 'TERMINATING (KILL SWITCH)';

    const result = await window.aether.killCurrentInstance();
    console.log('[Aether] Emergency kill switch result:', result);

    closeKillSwitchModal();
    showToast('Minecraft process terminated by emergency kill switch.', 'danger');

    isLaunching = false;
    if (killBtn) killBtn.classList.add('hidden');
    if (btnText) btnText.innerText = "PLAY MINECRAFT";
    if (btn) btn.className = "minecraft-play-btn flex items-center space-x-3 px-8 py-3.5 rounded-xl text-slate-950 font-black text-sm uppercase tracking-wider";
    if (termStatus) termStatus.innerText = "TERMINATED BY USER";

    setTimeout(() => {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>⚡</span><span>FORCE TERMINATE NOW</span>`;
      }
    }, 1000);
  } catch (err) {
    closeKillSwitchModal();
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<span>⚡</span><span>FORCE TERMINATE NOW</span>`;
    }
    await showAlertDialog({
      title: 'TERMINATION ERROR',
      message: 'Failed to terminate Minecraft process: ' + err.message,
      type: 'danger'
    });
  }
}

// ================= QUICK LAUNCH INSTANCE (FROM HOVER 80% BUTTON) =================
async function quickLaunchInstance(idx) {
  selectInstance(idx);
  if (isLaunching) return;
  startLaunch(null);
}

async function quickLaunchAthersChoice(idx) {
  selectAthersChoice(idx);
  if (isLaunching) return;
  startLaunch(null);
}

function openCurrentInstanceEditPage() {
  const inst = getActiveInstance();
  if (inst) openEditInstancePage(inst.id);
}

// ================= INSTANCE EDIT, MODS, RESOURCE PACKS & SHADERS =================
let currentEditInstanceId = null;
let currentEditInstance = null;
let currentInstalledAddons = {
  mods: [],
  modpacks: [],
  resourcepacks: [],
  shaderpacks: []
};

async function openEditInstancePage(instanceId) {
  currentEditInstanceId = instanceId;
  currentEditInstance = currentInstances.find(i => i.id === instanceId) || athersChoiceInstances.find(i => i.id === instanceId);
  if (!currentEditInstance) return;

  // Hide other views
  document.getElementById('view-instances')?.classList.add('hidden');
  document.getElementById('view-radar')?.classList.add('hidden');
  document.getElementById('view-settings')?.classList.add('hidden');

  // Deactivate all sidebar nav buttons
  ['instances', 'radar', 'settings'].forEach(t => {
    const btn = document.getElementById(`nav-btn-${t}`);
    if (btn) btn.className = "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-medium text-xs transition";
  });

  // Show edit instance view
  const editView = document.getElementById('view-edit-instance');
  if (editView) editView.classList.remove('hidden');

  // Populate header details
  document.getElementById('edit-page-title').innerText = currentEditInstance.name;
  document.getElementById('edit-page-badge').innerText = currentEditInstance.isAthersChoice
    ? `✨ ATHER'S CHOICE • ${currentEditInstance.loader} ${currentEditInstance.version}`.toUpperCase()
    : `${currentEditInstance.loader} ${currentEditInstance.version}`.toUpperCase();
  document.getElementById('edit-page-subtitle').innerText = currentEditInstance.isAthersChoice
    ? `Curated Ather's Choice Preset • Required mods, resource packs & shaders auto-download when you click PLAY`
    : `Instance ID: ${currentEditInstance.id} • ${currentEditInstance.loader} running Minecraft ${currentEditInstance.version}`;

  // Populate Settings tab inputs
  document.getElementById('edit-input-inst-name').value = currentEditInstance.name;
  const ram = currentEditInstance.memoryMax || 6;
  document.getElementById('edit-ram-slider').value = ram;
  document.getElementById('edit-ram-display').innerText = `${ram} GB`;
  document.getElementById('edit-input-jvm-args').value = currentEditInstance.jvmArgs || '';

  // Default to Installed Mods tab
  switchEditTab('mods');

  // Load all 4 addon lists in parallel to update counts immediately
  await Promise.all([
    refreshInstalledAddonsList('mods'),
    refreshInstalledAddonsList('modpacks'),
    refreshInstalledAddonsList('resourcepacks'),
    refreshInstalledAddonsList('shaderpacks')
  ]);
}

function closeEditInstancePage() {
  const editView = document.getElementById('view-edit-instance');
  if (editView) editView.classList.add('hidden');
  switchTab('instances');
  loadInstances();
}

function switchEditTab(tabName) {
  const tabs = ['mods', 'modpacks', 'resourcepacks', 'shaders', 'browse', 'settings'];
  tabs.forEach(t => {
    const content = document.getElementById(`edit-tab-content-${t}`);
    const btn = document.getElementById(`edit-tab-btn-${t}`);
    if (content) content.classList.add('hidden');
    if (btn) {
      btn.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-medium text-xs transition cursor-pointer flex-shrink-0";
    }
  });

  const activeContent = document.getElementById(`edit-tab-content-${tabName}`);
  const activeBtn = document.getElementById(`edit-tab-btn-${tabName}`);
  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.className = "flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition cursor-pointer flex-shrink-0";
  }

  if (tabName === 'browse') {
    executeEditModrinthSearch();
  }
}

function browseModrinthCategory(category) {
  switchEditTab('browse');
  const typeSelect = document.getElementById('edit-modrinth-type-select');
  if (typeSelect) {
    typeSelect.value = category;
    executeEditModrinthSearch();
  }
}

async function refreshInstalledAddonsList(folderType) {
  if (!currentEditInstanceId) return;
  const containerId = folderType === 'mods' ? 'installed-mods-container' :
                      folderType === 'modpacks' ? 'installed-modpacks-container' :
                      folderType === 'resourcepacks' ? 'installed-resourcepacks-container' :
                      'installed-shaders-container';
  const countBadgeId = folderType === 'mods' ? 'edit-installed-mods-count' :
                       folderType === 'modpacks' ? 'edit-installed-modpacks-count' :
                       folderType === 'resourcepacks' ? 'edit-installed-resourcepacks-count' :
                       'edit-installed-shaders-count';

  const container = document.getElementById(containerId);
  const countBadge = document.getElementById(countBadgeId);

  try {
    const items = await window.aether.getInstanceAddons(currentEditInstanceId, folderType);
    currentInstalledAddons[folderType] = items;
    if (countBadge) countBadge.innerText = items.length;
    renderInstalledAddons(folderType, items);
  } catch (err) {
    if (container) container.innerHTML = `<div class="py-6 text-center text-xs text-red-400">Failed to load ${folderType}: ${err.message}</div>`;
  }
}

function filterInstalledAddonsList(folderType) {
  const inputId = folderType === 'mods' ? 'input-filter-installed-mods' :
                  folderType === 'modpacks' ? 'input-filter-installed-modpacks' :
                  folderType === 'resourcepacks' ? 'input-filter-installed-resourcepacks' :
                  'input-filter-installed-shaders';
  const query = document.getElementById(inputId)?.value.toLowerCase().trim() || '';
  const allItems = currentInstalledAddons[folderType] || [];
  if (!query) {
    renderInstalledAddons(folderType, allItems);
    return;
  }
  const filtered = allItems.filter(item => item.name.toLowerCase().includes(query) || item.filename.toLowerCase().includes(query));
  renderInstalledAddons(folderType, filtered);
}

function renderInstalledAddons(folderType, items) {
  const containerId = folderType === 'mods' ? 'installed-mods-container' :
                      folderType === 'modpacks' ? 'installed-modpacks-container' :
                      folderType === 'resourcepacks' ? 'installed-resourcepacks-container' :
                      'installed-shaders-container';
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const label = folderType === 'mods' ? 'Mods' :
                folderType === 'modpacks' ? 'Modpacks' :
                folderType === 'resourcepacks' ? 'Resource Packs' : 'Shaders';
  const icon = folderType === 'mods' ? '🧩' :
               folderType === 'modpacks' ? '📦' :
               folderType === 'resourcepacks' ? '🎨' : '✨';
  const modrinthCat = folderType === 'mods' ? 'mod' :
                      folderType === 'modpacks' ? 'modpack' :
                      folderType === 'resourcepacks' ? 'resourcepack' : 'shader';

  if (!items || items.length === 0) {
    if (currentEditInstance && currentEditInstance.isAthersChoice) {
      const reqList = folderType === 'mods'
        ? (currentEditInstance.requiredMods || [])
        : folderType === 'modpacks'
        ? (currentEditInstance.requiredModpacks || [])
        : folderType === 'resourcepacks'
        ? (currentEditInstance.requiredResourcePacks || [])
        : (currentEditInstance.requiredShaders || []);
      if (reqList && reqList.length > 0) {
        container.innerHTML = `
          <div class="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 max-w-lg mx-auto my-4 border border-cyan-500/30">
            <span class="text-3xl">${icon}</span>
            <div>
              <h4 class="text-sm font-bold text-white">${reqList.length} Required ${label} Ready to Auto-Download</h4>
              <p class="text-xs text-slate-400 mt-1">Click <strong class="text-emerald-400">PLAY</strong> to automatically download these ${reqList.length} ${label.toLowerCase()} for <strong class="text-cyan-300">${currentEditInstance.name}</strong>:</p>
            </div>
            <div class="flex flex-wrap justify-center gap-1.5 pt-1 max-w-md">
              ${reqList.map(slug => `<span class="px-2 py-0.5 rounded-md bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-[10px]">${slug}</span>`).join('')}
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button onclick="openEditInstanceFolder('${folderType}')" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold text-xs transition cursor-pointer">
                📂 Open ${label} Folder
              </button>
              <button onclick="launchFromEditPage()" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer">
                ▶ Download &amp; Play Now
              </button>
            </div>
          </div>
        `;
        return;
      }
    }

    container.innerHTML = `
      <div class="glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto my-4 border border-slate-800">
        <span class="text-3xl">${icon}</span>
        <div>
          <h4 class="text-sm font-bold text-slate-200">No ${label} Installed</h4>
          <p class="text-xs text-slate-400 mt-1">Download and 1-click install official community ${label.toLowerCase()} for this instance.</p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button onclick="openEditInstanceFolder('${folderType}')" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold text-xs transition cursor-pointer">
            📂 Open ${label} Folder
          </button>
          <button onclick="browseModrinthCategory('${modrinthCat}')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer">
            + Discover & Install ${label}
          </button>
        </div>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `p-3 rounded-xl border flex items-center justify-between transition ${
      item.enabled 
        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
        : 'bg-slate-950/60 border-slate-900 opacity-60'
    }`;

    row.innerHTML = `
      <div class="flex items-center space-x-3 min-w-0 flex-1 mr-3">
        <div class="w-8 h-8 rounded-lg ${item.enabled ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-500'} flex items-center justify-center text-base flex-shrink-0">
          ${icon}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-slate-200 truncate ${!item.enabled ? 'line-through text-slate-500' : ''}">
            ${item.name}
          </div>
          <div class="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
            <span>${item.sizeFormatted}</span>
            <span>•</span>
            <span class="${item.enabled ? 'text-emerald-400' : 'text-amber-400'}">${item.enabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-2 flex-shrink-0">
        <button onclick="handleToggleAddon('${folderType}', '${item.filename}')" class="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
          item.enabled 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
        }">
          ${item.enabled ? 'Enabled' : 'Disabled'}
        </button>
        <button onclick="handleDeleteAddon('${folderType}', '${item.filename}')" title="Delete file" class="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-400 hover:text-red-300 transition cursor-pointer">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}

async function handleToggleAddon(folderType, filename) {
  if (!currentEditInstanceId) return;
  await window.aether.toggleInstanceAddon(currentEditInstanceId, folderType, filename);
  showToast(`Updated "${filename}"`, 'info');
  await refreshInstalledAddonsList(folderType);
  await loadInstances();
}

async function handleDeleteAddon(folderType, filename) {
  if (!currentEditInstanceId) return;
  const label = folderType === 'mods' ? 'Mod' : folderType === 'resourcepacks' ? 'Resource Pack' : 'Shader Pack';
  const confirmed = await showConfirmDialog({
    title: `DELETE ${label.toUpperCase()}`,
    message: `Are you sure you want to delete ${label.toLowerCase()} "${filename}"?`,
    subtext: 'This file will be permanently removed from your instance folder.',
    confirmText: 'Delete File',
    type: 'danger'
  });
  if (confirmed) {
    await window.aether.deleteInstanceAddon(currentEditInstanceId, folderType, filename);
    showToast(`${label} "${filename}" deleted.`, 'info');
    await refreshInstalledAddonsList(folderType);
    await loadInstances();
  }
}

async function openEditInstanceGameFolder() {
  if (!currentEditInstanceId) return;
  await window.aether.openInstanceSubdir(currentEditInstanceId, '');
}

async function openEditInstanceFolder(subfolder) {
  if (!currentEditInstanceId) return;
  await window.aether.openInstanceSubdir(currentEditInstanceId, subfolder);
}

async function launchFromEditPage() {
  if (!currentEditInstanceId) return;
  const userIdx = currentInstances.findIndex(i => i.id === currentEditInstanceId);
  if (userIdx !== -1) {
    closeEditInstancePage();
    selectInstance(userIdx);
    startLaunch(null);
    return;
  }
  const athersIdx = athersChoiceInstances.findIndex(i => i.id === currentEditInstanceId);
  if (athersIdx !== -1) {
    closeEditInstancePage();
    selectAthersChoice(athersIdx);
    startLaunch(null);
  }
}

async function executeEditModrinthSearch() {
  if (!currentEditInstance) return;
  const query = document.getElementById('edit-modrinth-search-input')?.value.trim() || '';
  const type = document.getElementById('edit-modrinth-type-select')?.value || 'mod';
  const grid = document.getElementById('edit-modrinth-results-grid');

  grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-400 animate-pulse">Querying Modrinth for compatible items...</div>';

  try {
    const loaderType = (currentEditInstance.loader || '').toLowerCase().includes('forge') ? 'forge' : 'fabric';
    const results = await window.aether.searchModrinth(query, type, currentEditInstance.version, loaderType);
    grid.innerHTML = '';

    if (!results || results.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-500">No compatible ${type}s found for ${currentEditInstance.version} (${currentEditInstance.loader}).</div>`;
      return;
    }

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = "glass-card p-3.5 rounded-xl flex flex-col justify-between";
      card.innerHTML = `
        <div>
          <div class="flex items-center space-x-3 mb-2">
            <img src="${item.icon_url || 'https://api.mineatar.io/face/c06f89064c8a49119c29ea1dbd1aab82'}" class="w-9 h-9 rounded-lg border border-slate-700 object-cover">
            <div>
              <div class="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>${item.title}</span>
              </div>
              <div class="text-[10px] text-emerald-400 font-mono">${(item.downloads).toLocaleString()} downloads</div>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 line-clamp-2 mb-2">${item.description}</p>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <div class="flex flex-wrap gap-1">
            ${(item.categories || []).slice(0, 2).map(c => `<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">${c}</span>`).join('')}
          </div>
          <button id="btn-edit-install-${item.id}" class="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition cursor-pointer">+ Install</button>
        </div>
      `;

      card.querySelector(`#btn-edit-install-${item.id}`).addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerText = 'Installing...';
        btn.disabled = true;

        const res = await window.aether.installMod(item.id, currentEditInstance.id, currentEditInstance.version, loaderType);
        if (res.success) {
          btn.innerText = '✓ Installed';
          btn.className = 'px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500 font-bold text-[10px]';
          showToast(`Successfully installed ${item.title}!`, 'success');
          await Promise.all([
            refreshInstalledAddonsList('mods'),
            refreshInstalledAddonsList('modpacks'),
            refreshInstalledAddonsList('resourcepacks'),
            refreshInstalledAddonsList('shaderpacks')
          ]);
          await loadInstances();
        } else {
          btn.innerText = 'Failed';
          btn.title = res.error;
          btn.className = 'px-2.5 py-1 rounded bg-red-950 text-red-400 border border-red-500 font-bold text-[10px]';
          showToast(`Failed to install ${item.title}: ${res.error}`, 'danger');
        }
      });

      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-red-400">Failed to load Modrinth items: ${err.message}</div>`;
  }
}

async function saveInstanceSettings() {
  if (!currentEditInstanceId) return;
  const newName = document.getElementById('edit-input-inst-name').value.trim();
  const newRam = parseInt(document.getElementById('edit-ram-slider').value, 10);
  const newJvmArgs = document.getElementById('edit-input-jvm-args').value.trim();

  if (!newName) {
    showToast('Instance name cannot be empty', 'warning');
    return;
  }

  await window.aether.updateInstance(currentEditInstanceId, {
    name: newName,
    memoryMax: newRam,
    jvmArgs: newJvmArgs
  });

  currentEditInstance.name = newName;
  currentEditInstance.memoryMax = newRam;
  currentEditInstance.jvmArgs = newJvmArgs;

  document.getElementById('edit-page-title').innerText = newName;
  showToast('Instance configuration saved successfully!', 'success');
  await loadInstances();
}

async function handleDeleteEditInstance() {
  if (!currentEditInstanceId || !currentEditInstance) return;
  if (currentEditInstance.isAthersChoice) {
    showToast("Ather's Choice presets are built into the launcher and cannot be deleted.", 'info');
    return;
  }
  const instName = currentEditInstance.name;
  const confirmed = await showConfirmDialog({
    title: 'DELETE INSTANCE',
    message: `Are you sure you want to permanently delete instance "${instName}"?`,
    subtext: 'All installed mods, worlds, and configs in this instance will be permanently removed.',
    confirmText: 'Delete Instance',
    type: 'danger'
  });
  if (confirmed) {
    await window.aether.deleteInstance(currentEditInstanceId);
    showToast(`Instance "${instName}" deleted.`, 'info');
    closeEditInstancePage();
  }
}

function setupModrinthSearch() {
  const searchInput = document.getElementById('edit-modrinth-search-input');
  const typeSelect = document.getElementById('edit-modrinth-type-select');

  typeSelect?.addEventListener('change', executeEditModrinthSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeEditModrinthSearch();
  });
}

let pendingRadarServerIp = '';

async function copyAndSelectInstanceForServer(serverAddress, serverName = 'Server') {
  pendingRadarServerIp = serverAddress;

  // Copy server IP to clipboard
  try {
    await navigator.clipboard.writeText(serverAddress);
    showToast(`Copied ${serverAddress} to clipboard!`, 'success');
  } catch (e) {
    showToast(`Server IP: ${serverAddress}`, 'info');
  }

  if (currentInstances.length === 0 && athersChoiceInstances.length === 0) {
    openCreateInstanceModal();
    return;
  }

  const ipEl = document.getElementById('radar-modal-server-ip');
  const nameEl = document.getElementById('radar-modal-server-name');
  const listEl = document.getElementById('radar-modal-instances-list');

  if (ipEl) ipEl.innerText = serverAddress;
  if (nameEl) nameEl.innerText = serverName;

  if (listEl) {
    listEl.innerHTML = '';

    const createRow = (inst, idx, sourceType) => {
      const thumbUrl = inst.bannerUrl || 'assets/banners/banner_01.jpg';
      const isFabric = (inst.loader || '').toLowerCase().includes('fabric');
      const loaderBadge = isFabric ? `FABRIC ${inst.version}` : `VANILLA ${inst.version}`;
      const badgeColor = isFabric
        ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/40'
        : 'bg-cyan-950/90 text-cyan-400 border-cyan-500/40';

      const modsCount = inst.modsCount || 0;
      const rpCount = inst.resourcepacksCount || 0;
      const shCount = inst.shadersCount || 0;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer group';
      row.onclick = () => confirmRadarInstanceLaunch(idx, sourceType);
      row.innerHTML = `
        <div class="flex items-center space-x-3.5 min-w-0">
          <div class="w-16 h-11 rounded-lg bg-cover bg-center border border-white/10 flex-shrink-0 shadow-md" style="background-image: url('${thumbUrl}');"></div>
          <div class="min-w-0">
            <div class="flex items-center space-x-2">
              <span class="font-bold text-xs text-white truncate">${inst.name}</span>
              ${inst.isAthersChoice ? `<span class="px-1.5 py-0.5 rounded font-mono text-[8px] font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">✨ ATHER'S CHOICE</span>` : ''}
              <span class="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ${badgeColor}">${loaderBadge}</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
              <span>🧩 ${modsCount} Mods</span>
              ${inst.modpacksCount ? `<span>•</span><span>📦 ${inst.modpacksCount} Modpacks</span>` : ''}
              <span>•</span>
              <span>🎨 ${rpCount} Packs</span>
              <span>•</span>
              <span>✨ ${shCount} Shaders</span>
            </div>
          </div>
        </div>
        <button class="px-3.5 py-2 rounded-lg bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center space-x-1.5 transition shadow-md shadow-emerald-500/10 flex-shrink-0 cursor-pointer">
          <span>▶</span>
          <span>${inst.isAthersChoice && !inst.isDownloaded ? 'DL & LAUNCH' : 'LAUNCH'}</span>
        </button>
      `;
      return row;
    };

    if (currentInstances.length > 0) {
      const hdr = document.createElement('div');
      hdr.className = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1';
      hdr.innerText = 'Your Minecraft Instances';
      listEl.appendChild(hdr);
      currentInstances.forEach((inst, idx) => listEl.appendChild(createRow(inst, idx, 'user')));
    }

    if (athersChoiceInstances.length > 0) {
      const hdr = document.createElement('div');
      hdr.className = 'text-[10px] font-bold uppercase tracking-wider text-cyan-300 px-1 pt-2';
      hdr.innerText = "✨ Ather's Choice Presets";
      listEl.appendChild(hdr);
      athersChoiceInstances.forEach((inst, idx) => listEl.appendChild(createRow(inst, idx, 'athers-choice')));
    }
  }

  document.getElementById('modal-select-instance-radar')?.classList.remove('hidden');
}

function closeRadarInstanceModal() {
  document.getElementById('modal-select-instance-radar')?.classList.add('hidden');
}

function confirmRadarInstanceLaunch(instanceIndex, sourceType = 'user') {
  closeRadarInstanceModal();
  if (sourceType === 'athers-choice') {
    selectAthersChoice(instanceIndex);
  } else {
    selectInstance(instanceIndex);
  }
  switchTab('instances');
  startLaunch(pendingRadarServerIp);
}

function launchWithDirectConnect(serverAddress) {
  copyAndSelectInstanceForServer(serverAddress, serverAddress);
}



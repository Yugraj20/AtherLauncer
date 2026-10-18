const fs = require('fs');
const path = require('path');
const os = require('os');
const { BrowserWindow, safeStorage } = require('electron');

const AETHER_DIR = path.join(os.homedir(), '.aether');
const PROFILES_FILE = path.join(AETHER_DIR, 'profiles.json');

// Official Minecraft Java Live Client ID (official Minecraft / Xbox IdP authorization)
const LIVE_CLIENT_ID = '00000000402b5328';
const LIVE_REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const LIVE_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL offline_access';

function ensureAetherDir() {
  if (!fs.existsSync(AETHER_DIR)) {
    fs.mkdirSync(AETHER_DIR, { recursive: true });
  }
}

// DPAPI / SafeStorage Encryption for sensitive credentials at rest
function encryptSecret(val) {
  if (!val) return '';
  if (typeof val !== 'string') return val;
  if (val.startsWith('dpapi:') || val.startsWith('b64:')) return val;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return 'dpapi:' + safeStorage.encryptString(val).toString('base64');
    }
  } catch (e) {}
  return 'b64:' + Buffer.from(val, 'utf8').toString('base64');
}

function decryptSecret(val) {
  if (!val || typeof val !== 'string') return val || '';
  if (val.startsWith('dpapi:') && safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      const buf = Buffer.from(val.slice(6), 'base64');
      return safeStorage.decryptString(buf);
    } catch (e) {}
  }
  if (val.startsWith('b64:')) {
    try {
      return Buffer.from(val.slice(4), 'base64').toString('utf8');
    } catch (e) {}
  }
  return val;
}

function loadProfiles() {
  ensureAetherDir();
  if (!fs.existsSync(PROFILES_FILE)) {
    return { activeProfileId: null, profiles: {} };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    const decryptedProfiles = {};
    if (raw.profiles && typeof raw.profiles === 'object') {
      for (const [id, p] of Object.entries(raw.profiles)) {
        decryptedProfiles[id] = {
          ...p,
          accessToken: decryptSecret(p.accessToken),
          refreshToken: decryptSecret(p.refreshToken)
        };
      }
    }
    return {
      activeProfileId: raw.activeProfileId || null,
      profiles: decryptedProfiles
    };
  } catch (e) {
    return { activeProfileId: null, profiles: {} };
  }
}

function saveProfiles(data) {
  ensureAetherDir();
  const encryptedProfiles = {};
  if (data.profiles && typeof data.profiles === 'object') {
    for (const [id, p] of Object.entries(data.profiles)) {
      encryptedProfiles[id] = {
        ...p,
        accessToken: encryptSecret(p.accessToken),
        refreshToken: encryptSecret(p.refreshToken)
      };
    }
  }
  const payload = {
    activeProfileId: data.activeProfileId,
    profiles: encryptedProfiles
  };
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
}

function getActiveProfile() {
  const data = loadProfiles();
  if (data.activeProfileId && data.profiles[data.activeProfileId]) {
    const profile = data.profiles[data.activeProfileId];
    // Anti-piracy enforcement: Only verified Microsoft profiles allowed
    if (profile.type === 'microsoft' && profile.accessToken && profile.uuid) {
      return profile;
    }
  }
  return null;
}

function setActiveProfile(profileId) {
  const data = loadProfiles();
  if (data.profiles[profileId] && data.profiles[profileId].type === 'microsoft') {
    data.activeProfileId = profileId;
    saveProfiles(data);
    return data.profiles[profileId];
  }
  return null;
}

function logout() {
  const data = loadProfiles();
  data.activeProfileId = null;
  saveProfiles(data);
  return true;
}

// ================= OFFICIAL MICROSOFT IDP INTERACTIVE LOGIN =================

async function loginWithMicrosoftPopup(parentWindow) {
  return new Promise((resolve, reject) => {
    const authUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${LIVE_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(LIVE_SCOPE)}&redirect_uri=${encodeURIComponent(LIVE_REDIRECT_URI)}`;

    const authWin = new BrowserWindow({
      width: 520,
      height: 680,
      parent: parentWindow,
      modal: true,
      title: 'Sign In with Microsoft - Minecraft Java Edition',
      backgroundColor: '#090d15',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Account Security: Prevent popup-based clickjacking
    authWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    authWin.loadURL(authUrl);

    let resolved = false;

    const handleUrl = async (url) => {
      if (resolved || !url) return;

      if (url.startsWith(LIVE_REDIRECT_URI)) {
        resolved = true;
        try { authWin.close(); } catch (e) {}

        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');

          if (error) {
            return reject(new Error(`Microsoft login error: ${error}`));
          }

          if (code) {
            console.log('[Auth] Exchanging Live authorization code for token with offline_access...');
            const tokenParams = new URLSearchParams({
              client_id: LIVE_CLIENT_ID,
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: LIVE_REDIRECT_URI,
              scope: LIVE_SCOPE
            });

            const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenParams.toString()
            });

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
              throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain Microsoft token');
            }

            console.log('[Auth] Live token obtained successfully. Exchanging for Minecraft profile...');
            const profile = await exchangeForMinecraftProfile(tokenData.access_token, tokenData.refresh_token);
            resolve(profile);
          }
        } catch (exchangeErr) {
          reject(exchangeErr);
        }
      }
    };

    authWin.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith(LIVE_REDIRECT_URI)) {
        event.preventDefault();
        handleUrl(url);
      }
    });

    authWin.webContents.on('will-redirect', (event, url) => {
      if (url.startsWith(LIVE_REDIRECT_URI)) {
        event.preventDefault();
        handleUrl(url);
      }
    });

    authWin.webContents.on('did-navigate', (event, url) => {
      handleUrl(url);
    });

    authWin.on('closed', () => {
      if (!resolved) {
        reject(new Error('Login window was closed before completing sign-in.'));
      }
    });
  });
}

// ================= TOKEN EXCHANGE & OWNERSHIP VERIFICATION =================

async function exchangeForMinecraftProfile(msAccessToken, msRefreshToken = null) {
  console.log('[Auth] Step 1: Authenticating with Xbox Live (contract v1)...');
  
  // Try both ticket formats (prefixed with 'd=' vs raw token) for maximum server compatibility
  const ticketVariants = [
    msAccessToken.startsWith('d=') ? msAccessToken : `d=${msAccessToken}`,
    msAccessToken.startsWith('d=') ? msAccessToken.slice(2) : msAccessToken
  ];

  let xblData = null;
  let lastXblError = null;

  for (const rpsTicket of ticketVariants) {
    try {
      const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-xbl-contract-version': '1'
        },
        body: JSON.stringify({
          Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: rpsTicket
          },
          RelyingParty: 'http://auth.xboxlive.com',
          TokenType: 'JWT'
        })
      });

      if (xblRes.ok) {
        xblData = await xblRes.json();
        break;
      } else {
        const errText = await xblRes.text();
        lastXblError = `HTTP ${xblRes.status}: ${errText}`;
        console.warn(`[Auth] Xbox Live attempt failed (${lastXblError})`);
      }
    } catch (variantErr) {
      lastXblError = variantErr.message;
    }
  }

  if (!xblData) {
    throw new Error(`Xbox Live authentication failed (${lastXblError || 'Unknown error'})`);
  }

  const xblToken = xblData.Token;
  const userHash = xblData.DisplayClaims?.xui?.[0]?.uhs;
  const gamertag = xblData.DisplayClaims?.xui?.[0]?.gtg || 'Player';

  if (!xblToken || !userHash) {
    throw new Error('Invalid Xbox Live claims received');
  }

  console.log(`[Auth] Step 2: Requesting XSTS token for gamer: ${gamertag}...`);
  const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-xbl-contract-version': '1'
    },
    body: JSON.stringify({
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xblToken]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  });

  if (!xstsRes.ok) {
    const xstsErr = await xstsRes.json().catch(() => ({}));
    console.error('[Auth] XSTS error:', xstsErr);
    if (xstsErr.XErr === 2148916233) {
      throw new Error('This Microsoft account has no Xbox profile. Please visit https://www.xbox.com to set up a free Xbox gamer tag first.');
    }
    if (xstsErr.XErr === 2148916238) {
      throw new Error('Child account requires adult/Family Safety authorization.');
    }
    throw new Error(`XSTS authorization failed (code: ${xstsErr.XErr || xstsRes.status})`);
  }

  const xstsData = await xstsRes.json();
  const xstsToken = xstsData.Token;

  console.log('[Auth] Step 3: Exchanging token with Minecraft Services...');
  const mcRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`
    })
  });

  if (!mcRes.ok) {
    const mcErr = await mcRes.text();
    console.error('[Auth] Minecraft Services error:', mcErr);
    throw new Error('Failed to exchange token with Minecraft Services');
  }
  const mcData = await mcRes.json();
  const mcAccessToken = mcData.access_token;

  console.log('[Auth] Step 4: Verifying official Minecraft Java license & fetching profile...');
  const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { 'Authorization': `Bearer ${mcAccessToken}` }
  });

  if (!profileRes.ok) {
    throw new Error('This Microsoft account does not own Minecraft Java Edition. Please purchase Minecraft Java Edition on minecraft.net or sign in with an account that owns the game.');
  }

  const profileData = await profileRes.json();

  const profileId = `ms-${profileData.id}`;
  const profile = {
    id: profileId,
    username: profileData.name,
    uuid: profileData.id,
    type: 'microsoft',
    avatarUrl: `https://api.mineatar.io/face/${profileData.id}`,
    accessToken: mcAccessToken,
    refreshToken: msRefreshToken || null,
    skins: profileData.skins || [],
    createdAt: Date.now()
  };

  const stored = loadProfiles();
  // Preserve existing refresh token if new one wasn't provided
  if (!profile.refreshToken && stored.profiles[profileId]?.refreshToken) {
    profile.refreshToken = stored.profiles[profileId].refreshToken;
  }
  stored.profiles[profileId] = profile;
  stored.activeProfileId = profileId;
  saveProfiles(stored);

  console.log(`[Auth] SUCCESS: Verified Minecraft Java owner: ${profile.username}`);
  return profile;
}

/**
 * Silently refresh Minecraft session using stored Microsoft refresh token
 */
async function refreshMinecraftSession(profile) {
  if (!profile || !profile.refreshToken) {
    throw new Error('No refresh token available to renew session.');
  }

  console.log(`[Auth] Refreshing session for ${profile.username}...`);
  const tokenParams = new URLSearchParams({
    client_id: LIVE_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: profile.refreshToken,
    redirect_uri: LIVE_REDIRECT_URI,
    scope: LIVE_SCOPE
  });

  const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });

  if (!tokenRes.ok) {
    throw new Error('Failed to refresh Microsoft token.');
  }

  const tokenData = await tokenRes.json();
  return await exchangeForMinecraftProfile(tokenData.access_token, tokenData.refresh_token || profile.refreshToken);
}

module.exports = {
  loadProfiles,
  saveProfiles,
  getActiveProfile,
  setActiveProfile,
  logout,
  loginWithMicrosoftPopup,
  exchangeForMinecraftProfile,
  refreshMinecraftSession
};

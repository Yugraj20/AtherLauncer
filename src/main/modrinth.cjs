const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const MODRINTH_API = 'https://api.modrinth.com/v2';

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        out.close();
        fs.unlink(destPath, () => {});
        https.get(res.headers.location, (redRes) => {
          redRes.pipe(out);
          out.on('finish', () => out.close(resolve));
        }).on('error', reject);
        return;
      }
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
    }).on('error', reject);
  });
}

async function searchProjects(query = '', projectType = 'mod', gameVersion = '1.21.4', loader = 'fabric', limit = 15) {
  try {
    const facets = [];
    if (projectType) facets.push([`project_type:${projectType}`]);
    if (gameVersion) facets.push([`versions:${gameVersion}`]);
    if (loader && projectType === 'mod') facets.push([`categories:${loader}`]);

    const url = new URL(`${MODRINTH_API}/search`);
    if (query) url.searchParams.append('query', query);
    url.searchParams.append('limit', limit.toString());
    if (facets.length > 0) {
      url.searchParams.append('facets', JSON.stringify(facets));
    }

    let response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'AtherLauncher/1.0.0 (contact@atherlauncher.local)'
      }
    });

    // Fallback: If no results with version facet for modpack, try without version facet
    if (response.ok) {
      let data = await response.json();
      if ((!data.hits || data.hits.length === 0) && projectType === 'modpack') {
        const fallbackUrl = new URL(`${MODRINTH_API}/search`);
        if (query) fallbackUrl.searchParams.append('query', query);
        fallbackUrl.searchParams.append('limit', limit.toString());
        fallbackUrl.searchParams.append('facets', JSON.stringify([['project_type:modpack']]));
        const fbRes = await fetch(fallbackUrl.toString(), {
          headers: { 'User-Agent': 'AtherLauncher/1.0.0' }
        });
        if (fbRes.ok) data = await fbRes.json();
      }

      return data.hits.map(hit => ({
        id: hit.project_id,
        slug: hit.slug,
        title: hit.title,
        description: hit.description,
        categories: hit.categories,
        client_side: hit.client_side,
        server_side: hit.server_side,
        icon_url: hit.icon_url,
        downloads: hit.downloads,
        follows: hit.follows,
        author: hit.author,
        project_type: hit.project_type
      }));
    }

    return [];
  } catch (err) {
    console.error('Failed to search Modrinth:', err);
    return [];
  }
}

async function installProjectToInstance(projectId, instanceDir, gameVersion = '1.21.4', loader = 'fabric') {
  try {
    // 1. Get project info to determine folder type
    const projectRes = await fetch(`${MODRINTH_API}/project/${projectId}`, {
      headers: { 'User-Agent': 'AtherLauncher/1.0.0' }
    });
    if (!projectRes.ok) throw new Error('Project not found on Modrinth');
    const projectInfo = await projectRes.json();
    const projectType = projectInfo.project_type || 'mod';

    // 2. Get compatible version files
    const url = new URL(`${MODRINTH_API}/project/${projectId}/version`);
    url.searchParams.append('game_versions', JSON.stringify([gameVersion]));
    if (loader && projectType === 'mod') {
      url.searchParams.append('loaders', JSON.stringify([loader]));
    }

    let verRes = await fetch(url.toString(), {
      headers: { 'User-Agent': 'AtherLauncher/1.0.0' }
    });
    let versions = verRes.ok ? await verRes.json() : [];

    // Fallback if no exact game_version match (common for modpacks)
    if (!versions || versions.length === 0) {
      const fallbackUrl = `${MODRINTH_API}/project/${projectId}/version`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'AtherLauncher/1.0.0' }
      });
      if (fallbackRes.ok) versions = await fallbackRes.json();
    }

    if (!versions || versions.length === 0) {
      throw new Error(`No compatible version found for ${gameVersion} (${loader})`);
    }

    const targetVersion = versions[0];
    const file = targetVersion.files.find(f => f.primary) || targetVersion.files[0];
    if (!file) throw new Error('Version has no downloadable files');

    // 3. Resolve destination folder
    let subfolder = 'mods';
    if (projectType === 'shader') subfolder = 'shaderpacks';
    if (projectType === 'resourcepack') subfolder = 'resourcepacks';
    if (projectType === 'modpack') subfolder = 'modpacks';

    const targetDir = path.join(instanceDir, 'minecraft', subfolder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const destPath = path.join(targetDir, file.filename);

    // Download file
    await downloadFile(file.url, destPath);

    // 4. If modpack (.mrpack), extract overrides and download declared mods
    let installedModsCount = 0;
    if (projectType === 'modpack' || file.filename.endsWith('.mrpack')) {
      try {
        const zip = new AdmZip(destPath);
        const indexEntry = zip.getEntry('modrinth.index.json');

        if (indexEntry) {
          const indexJson = JSON.parse(zip.readAsText(indexEntry));

          // A. Extract overrides into instance minecraft directory
          const zipEntries = zip.getEntries();
          for (const entry of zipEntries) {
            if (entry.entryName.startsWith('overrides/') && !entry.isDirectory) {
              const relPath = entry.entryName.replace(/^overrides\//, '');
              const targetFilePath = path.join(instanceDir, 'minecraft', relPath);
              const parentDir = path.dirname(targetFilePath);
              if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
              fs.writeFileSync(targetFilePath, entry.getData());
            }
          }

          // B. Download mods and files declared in modrinth.index.json
          if (Array.isArray(indexJson.files)) {
            for (const f of indexJson.files) {
              if (f.env && f.env.client === 'unsupported') continue;
              const downloadUrl = (f.downloads && f.downloads[0]) || null;
              if (downloadUrl) {
                const targetFilePath = path.join(instanceDir, 'minecraft', f.path);
                const parentDir = path.dirname(targetFilePath);
                if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
                try {
                  await downloadFile(downloadUrl, targetFilePath);
                  installedModsCount++;
                } catch (e) {
                  console.error('Failed to download modpack file:', f.path, e.message);
                }
              }
            }
          }

          // C. Save companion metadata json
          const metaPath = path.join(targetDir, file.filename.replace(/\.mrpack$/, '.json'));
          fs.writeFileSync(metaPath, JSON.stringify({
            name: projectInfo.title,
            slug: projectInfo.slug,
            version: targetVersion.name || targetVersion.version_number,
            description: projectInfo.description,
            icon_url: projectInfo.icon_url,
            mrpackFile: file.filename,
            modsCount: installedModsCount,
            gameVersion: gameVersion,
            loader: loader,
            installedAt: Date.now()
          }, null, 2));
        }
      } catch (packErr) {
        console.error('Error extracting .mrpack archive:', packErr);
      }
    }

    return {
      success: true,
      fileName: file.filename,
      type: projectType,
      targetDir,
      modsCount: installedModsCount
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  searchProjects,
  installProjectToInstance
};

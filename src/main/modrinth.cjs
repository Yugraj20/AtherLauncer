const fs = require('fs');
const path = require('path');
const https = require('https');

const MODRINTH_API = 'https://api.modrinth.com/v2';

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

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'AetherLauncher/1.0.0 (contact@aetherlauncher.local)'
      }
    });

    if (!response.ok) {
      throw new Error(`Modrinth API error: ${response.statusText}`);
    }

    const data = await response.json();
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
  } catch (err) {
    console.error('Failed to search Modrinth:', err);
    return [];
  }
}

async function installProjectToInstance(projectId, instanceDir, gameVersion = '1.21.4', loader = 'fabric') {
  try {
    // 1. Get project info to determine folder type
    const projectRes = await fetch(`${MODRINTH_API}/project/${projectId}`);
    if (!projectRes.ok) throw new Error('Project not found on Modrinth');
    const projectInfo = await projectRes.json();
    const projectType = projectInfo.project_type || 'mod';

    // 2. Get compatible version files
    const url = new URL(`${MODRINTH_API}/project/${projectId}/version`);
    url.searchParams.append('game_versions', JSON.stringify([gameVersion]));
    if (loader && projectType === 'mod') {
      url.searchParams.append('loaders', JSON.stringify([loader]));
    }

    const verRes = await fetch(url.toString());
    if (!verRes.ok) throw new Error('Failed to fetch project versions');
    const versions = await verRes.json();
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

    const targetDir = path.join(instanceDir, 'minecraft', subfolder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const destPath = path.join(targetDir, file.filename);

    // Download file
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(destPath);
      https.get(file.url, (res) => {
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

    return {
      success: true,
      fileName: file.filename,
      type: projectType,
      targetDir
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

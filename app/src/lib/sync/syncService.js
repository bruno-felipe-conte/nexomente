import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';

let watcher = null;

export function startSyncWatcher(cofrePath, onChange) {
  if (watcher) {
    watcher.close();
  }

  console.log(`[Sync] Watching: ${cofrePath}`);
  
  watcher = chokidar.watch(cofrePath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', (filePath) => {
      console.log(`[Sync] File added: ${filePath}`);
      onChange({ type: 'add', filePath, content: readMarkdown(filePath) });
    })
    .on('change', (filePath) => {
      console.log(`[Sync] File changed: ${filePath}`);
      onChange({ type: 'change', filePath, content: readMarkdown(filePath) });
    })
    .on('unlink', (filePath) => {
      console.log(`[Sync] File removed: ${filePath}`);
      onChange({ type: 'unlink', filePath });
    })
    .on('error', (error) => {
      console.error(`[Sync] Error: ${error}`);
    });

  return watcher;
}

export function stopSyncWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[Sync] Watcher stopped');
  }
}

function readMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');
    return { filename, content, path: filePath };
  } catch (error) {
    console.error(`[Sync] Error reading file: ${error}`);
    return null;
  }
}

export function syncNotaToCofre(nota, cofrePath) {
  const pastaPath = path.join(cofrePath, nota.pasta_id || 'notas');
  
  if (!fs.existsSync(pastaPath)) {
    fs.mkdirSync(pastaPath, { recursive: true });
  }
  
  const filePath = path.join(pastaPath, `${nota.titulo}.md`);
  fs.writeFileSync(filePath, nota.conteudo || '');
  
  return filePath;
}

export function importFromCofre(cofrePath, pastaId) {
  const importPath = path.join(cofrePath, pastaId || 'notas');
  
  if (!fs.existsSync(importPath)) {
    return [];
  }
  
  const files = fs.readdirSync(importPath)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const filePath = path.join(importPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        titulo: filename.replace('.md', ''),
        conteudo: content,
        pasta_id: pastaId,
        tipo: 'nota',
      };
    });
  
  return files;
}
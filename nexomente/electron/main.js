import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path, { join, dirname } from 'path';
import fs, { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
      },
    });
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0F0E17',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Database initialization
let db;

// Initialize database when main process starts
async function initDB() {
  try {
    const Database = await import('better-sqlite3');
    const dbPath = join(app.getPath('userData'), 'nexomente.db');
    db = new Database.default(dbPath);
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS pastas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        parent_id TEXT,
        cor TEXT DEFAULT '#6C63FF',
        icone TEXT DEFAULT 'folder',
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS notas (
        id TEXT PRIMARY KEY,
        pasta_id TEXT NOT NULL,
        tipo TEXT DEFAULT 'nota',
        titulo TEXT NOT NULL,
        conteudo TEXT,
        tags TEXT, -- JSON string
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ativo',
        FOREIGN KEY (pasta_id) REFERENCES pastas (id)
      );
      
      CREATE TABLE IF NOT EXISTS materias (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cor TEXT DEFAULT '#6C63FF',
        icone TEXT DEFAULT 'book',
        meta_horas INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sessoes_estudo (
        id TEXT PRIMARY KEY,
        materia_id TEXT,
        tipo TEXT DEFAULT 'pomodoro',
        duracao_minutos INTEGER DEFAULT 25,
        concluida BOOLEAN DEFAULT 0,
        started_at TEXT,
        ended_at TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (materia_id) REFERENCES materias (id)
      );
      
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        nota_id TEXT,
        materia_id TEXT,
        frente TEXT NOT NULL,
        verso TEXT NOT NULL,
        intervalo INTEGER DEFAULT 1,
        repeticoes INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        next_review TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nota_id) REFERENCES notas (id),
        FOREIGN KEY (materia_id) REFERENCES materias (id)
      );
      
      CREATE TABLE IF NOT EXISTS transacoes_xp (
        id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL,
        motivo TEXT,
        source_type TEXT,
        source_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert root pasta if it doesn't exist
    const rootPasta = db.prepare('SELECT * FROM pastas WHERE id = ?').get('pasta_raiz');
    if (!rootPasta) {
      db.prepare(`
        INSERT INTO pastas (id, nome, cor, icone) 
        VALUES (?, ?, ?, ?)
      `).run('pasta_raiz', 'Minha Biblioteca', '#6C63FF', 'library');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Initialize database on startup
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  app.quit();
});

// Window controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() || false;
});

// Config
ipcMain.handle('config:get', async (event, key) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return key ? config[key] : config;
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return null;
});

ipcMain.handle('config:set', async (event, key, value) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    config[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Error writing config:', e);
    return false;
  }
});

// Folder picker
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecionar Pasta do Cofre',
  });
  return result.canceled ? null : result.filePaths[0];
});

// Database path
ipcMain.handle('db:getPath', () => {
  return path.join(app.getPath('userData'), 'nexomente.db');
});

// App path
ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

// Database Handlers - Notas
ipcMain.handle('db-notas:getAll', () => {
  try {
    const rows = db.prepare(`
      SELECT n.*, p.nome as pasta_nome, p.cor as pasta_cor, p.icone as pasta_icone
      FROM notas n
      LEFT JOIN pastas p ON n.pasta_id = p.id
      WHERE n.status != 'deletado'
      ORDER BY n.atualizado_em DESC
    `).all();
    
    // Parse tags from JSON string
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  } catch (error) {
    console.error('Error getting notas:', error);
    throw error;
  }
});

ipcMain.handle('db-notas:getById', (event, id) => {
  try {
    const row = db.prepare(`
      SELECT n.*, p.nome as pasta_nome, p.cor as pasta_cor, p.icone as pasta_icone
      FROM notas n
      LEFT JOIN pastas p ON n.pasta_id = p.id
      WHERE n.id = ?
    `).get(id);
    
    if (!row) return null;
    
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  } catch (error) {
    console.error('Error getting nota by id:', error);
    throw error;
  }
});

ipcMain.handle('db-notas:create', (event, nota) => {
  try {
    const id = nota.id || `nota_${Date.now()}`;
    const tagsJson = JSON.stringify(nota.tags || []);
    
    const info = db.prepare(`
      INSERT INTO notas (id, pasta_id, tipo, titulo, conteudo, tags, criado_em, atualizado_em, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nota.pasta_id || 'pasta_raiz',
      nota.tipo || 'nota',
      nota.titulo || 'Nova Nota',
      nota.conteudo || '',
      tagsJson,
      new Date().toISOString(),
      new Date().toISOString(),
      'ativo'
    );
    
    return id;
  } catch (error) {
    console.error('Error creating nota:', error);
    throw error;
  }
});

ipcMain.handle('db-notas:update', (event, { id, updates }) => {
  try {
    // Prepare the SET clause dynamically
    const setClauses = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'tags') {
        setClauses.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    setClauses.push('atualizado_em = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const sql = `UPDATE notas SET ${setClauses.join(', ')} WHERE id = ?`;
    const info = db.prepare(sql).run(...values);
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error updating nota:', error);
    throw error;
  }
});

ipcMain.handle('db-notas:delete', (event, id) => {
  try {
    const info = db.prepare(`
      UPDATE notas SET status = 'deletado', atualizado_em = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error deleting nota:', error);
    throw error;
  }
});

// Database Handlers - Pastas
ipcMain.handle('db-pastas:getAll', () => {
  try {
    return db.prepare('SELECT * FROM pastas ORDER BY nome').all();
  } catch (error) {
    console.error('Error getting pastas:', error);
    throw error;
  }
});

ipcMain.handle('db-pastas:create', (event, pasta) => {
  try {
    const id = pasta.id || `pasta_${Date.now()}`;
    
    const info = db.prepare(`
      INSERT INTO pastas (id, nome, parent_id, cor, icone, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pasta.nome,
      pasta.parent_id || null,
      pasta.cor || '#6C63FF',
      pasta.icone || 'folder',
      new Date().toISOString(),
      new Date().toISOString()
    );
    
    return id;
  } catch (error) {
    console.error('Error creating pasta:', error);
    throw error;
  }
});

// Database Handlers - Materias
ipcMain.handle('db-materias:getAll', () => {
  try {
    return db.prepare('SELECT * FROM materias ORDER BY nome').all();
  } catch (error) {
    console.error('Error getting materias:', error);
    throw error;
  }
});

ipcMain.handle('db-materias:create', (event, materia) => {
  try {
    const id = materia.id || `materia_${Date.now()}`;
    
    const info = db.prepare(`
      INSERT INTO materias (id, nome, cor, icone, meta_horas, criado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      materia.nome,
      materia.cor || '#6C63FF',
      materia.icone || 'book',
      materia.meta_horas || 0,
      new Date().toISOString()
    );
    
    return id;
  } catch (error) {
    console.error('Error creating materia:', error);
    throw error;
  }
});

// Database Handlers - Sessoes
ipcMain.handle('db-sessoes:getAll', () => {
  try {
    return db.prepare(`
      SELECT s.*, m.nome as materia_nome, m.cor as materia_cor
      FROM sessoes_estudo s
      LEFT JOIN materias m ON s.materia_id = m.id
      ORDER BY s.started_at DESC
      LIMIT 50
    `).all();
  } catch (error) {
    console.error('Error getting sessoes:', error);
    throw error;
  }
});

ipcMain.handle('db-sessoes:create', (event, sessao) => {
  try {
    const id = sessao.id || `sessao_${Date.now()}`;
    
    const info = db.prepare(`
      INSERT INTO sessoes_estudo (id, materia_id, tipo, duracao_minutos, concluida, started_at, ended_at, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sessao.materia_id,
      sessao.tipo || 'pomodoro',
      sessao.duracao_minutos || 25,
      sessao.concluida ? 1 : 0,
      sessao.started_at || new Date().toISOString(),
      sessao.ended_at || null,
      new Date().toISOString()
    );
    
    return id;
  } catch (error) {
    console.error('Error creating sessao:', error);
    throw error;
  }
});

ipcMain.handle('db-sessoes:completar', (event, id) => {
  try {
    const info = db.prepare(`
      UPDATE sessoes_estudo SET concluida = 1, ended_at = ? WHERE id = ?
    `).run(new Date().toISOString(), id);
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error completing sessao:', error);
    throw error;
  }
});

// Database Handlers - Flashcards
ipcMain.handle('db-flashcards:getAll', () => {
  try {
    const rows = db.prepare(`
      SELECT f.*, 
             n.titulo as nota_titulo,
             m.nome as materia_nome
      FROM flashcards f
      LEFT JOIN notas n ON f.nota_id = n.id
      LEFT JOIN materias m ON f.materia_id = m.id
      ORDER BY f.next_review ASC
    `).all();
    
    return rows;
  } catch (error) {
    console.error('Error getting flashcards:', error);
    throw error;
  }
});

ipcMain.handle('db-flashcards:getParaRevisao', () => {
  try {
    const now = new Date().toISOString();
    const rows = db.prepare(`
      SELECT f.*, 
             n.titulo as nota_titulo,
             m.nome as materia_nome
      FROM flashcards f
      LEFT JOIN notas n ON f.nota_id = n.id
      LEFT JOIN materias m ON f.materia_id = m.id
      WHERE (f.next_review IS NULL OR f.next_review <= ?)
      ORDER BY f.next_review ASC
    `).all(now);
    
    return rows;
  } catch (error) {
    console.error('Error getting flashcards for review:', error);
    throw error;
  }
});

ipcMain.handle('db-flashcards:create', (event, card) => {
  try {
    const id = card.id || `fc_${Date.now()}`;
    
    const info = db.prepare(`
      INSERT INTO flashcards (id, nota_id, materia_id, frente, verso, intervalo, repeticoes, ease_factor, next_review, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      card.nota_id,
      card.materia_id,
      card.frente,
      card.verso,
      card.intervalo || 1,
      card.repeticoes || 0,
      card.ease_factor || 2.5,
      card.next_review || null,
      new Date().toISOString()
    );
    
    return id;
  } catch (error) {
    console.error('Error creating flashcard:', error);
    throw error;
  }
});

ipcMain.handle('db-flashcards:revisar', (event, { id, qualidade }) => {
  try {
    const row = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!row) return false;
    
    let { intervalo, repeticoes, ease_factor } = row;
    
    if (qualidade >= 3) {
      if (repeticoes === 0) intervalo = 1;
      else if (repeticoes === 1) intervalo = 6;
      else intervalo = Math.round(intervalo * ease_factor);
      repeticoes = (repeticoes || 0) + 1;
    } else {
      repeticoes = 0;
      intervalo = 1;
    }
    
    ease_factor = ease_factor + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalo);
    
    const info = db.prepare(`
      UPDATE flashcards SET 
        intervalo = ?, 
        repeticoes = ?, 
        ease_factor = ?, 
        next_review = ?
      WHERE id = ?
    `).run(intervalo, repeticoes, ease_factor, nextDate.toISOString(), id);
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    throw error;
  }
});

ipcMain.handle('db-flashcards:update', (event, { id, updates }) => {
  try {
    const campos = [];
    const valores = [];
    
    if (updates.frente !== undefined) { campos.push('frente = ?'); valores.push(updates.frente); }
    if (updates.verso !== undefined) { campos.push('verso = ?'); valores.push(updates.verso); }
    if (updates.materia_id !== undefined) { campos.push('materia_id = ?'); valores.push(updates.materia_id); }
    if (updates.nota_id !== undefined) { campos.push('nota_id = ?'); valores.push(updates.nota_id); }
    if (updates.intervalo !== undefined) { campos.push('intervalo = ?'); valores.push(updates.intervalo); }
    if (updates.repeticoes !== undefined) { campos.push('repeticoes = ?'); valores.push(updates.repeticoes); }
    if (updates.ease_factor !== undefined) { campos.push('ease_factor = ?'); valores.push(updates.ease_factor); }
    if (updates.next_review !== undefined) { campos.push('next_review = ?'); valores.push(updates.next_review); }
    
    if (campos.length === 0) return false;
    
    valores.push(id);
    const info = db.prepare(`UPDATE flashcards SET ${campos.join(', ')} WHERE id = ?`).run(...valores);
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error updating flashcard:', error);
    throw error;
  }
});

ipcMain.handle('db-flashcards:delete', (event, id) => {
  try {
    const info = db.prepare('DELETE FROM flashcards WHERE id = ?').run(id);
    return info.changes > 0;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
});

// Database Handlers - XP
ipcMain.handle('db-xp:getTotal', () => {
  try {
    const row = db.prepare('SELECT SUM(xp) as total FROM transacoes_xp').get();
    return row.total || 0;
  } catch (error) {
    console.error('Error getting XP total:', error);
    throw error;
  }
});

ipcMain.handle('db-xp:add', (event, { xp, motivo, source_type, source_id }) => {
  try {
    const info = db.prepare(`
      INSERT INTO transacoes_xp (id, xp, motivo, source_type, source_id, criado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `xp_${Date.now()}`,
      xp,
      motivo,
      source_type,
      source_id,
      new Date().toISOString()
    );
    
    return info.changes > 0;
  } catch (error) {
    console.error('Error adding XP:', error);
    throw error;
  }
});
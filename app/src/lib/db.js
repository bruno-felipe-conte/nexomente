// Database service using sql.js
import { config, execSql } from '../sql.js';

// ipcRenderer está disponível no processo renderer do Electron
// via contextBridge (preload) ou require direto (nodeIntegration: true)
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

// Initialize SQL.js database
export function initDB() {
  try {
    // Configure sql.js to locate the wasm binary
    config({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    // Initialize database
    return execSql();
  } catch (error) {
    console.error('Database initialization error:', error);
    return null;
  }
}

// Database service wrapper for renderer process
export const dbService = {
  // Notas methods
  notas: {
    getAll: () => {
      // In renderer, send IPC message to main process
      return ipcRenderer.sendSync('db-notas-getAll');
    },
    getById: (id) => {
      return ipcRenderer.sendSync('db-notas-getById', id);
    },
    create: (nota) => {
      return ipcRenderer.sendSync('db-notas-create', nota);
    },
    update: (id, updates) => {
      return ipcRenderer.sendSync('db-notas-update', { id, updates });
    },
    delete: (id) => {
      return ipcRenderer.sendSync('db-notas-delete', id);
    }
  },
  
  // Pastas methods
  pastas: {
    getAll: () => {
      return ipcRenderer.sendSync('db-pastas-getAll');
    },
    create: (pasta) => {
      return ipcRenderer.sendSync('db-pastas-create', pasta);
    }
  },
  
  // Materias methods
  materias: {
    getAll: () => {
      return ipcRenderer.sendSync('db-materias-getAll');
    },
    create: (materia) => {
      return ipcRenderer.sendSync('db-materias-create', materia);
    }
  },
  
  // Sessoes methods
  sessoes: {
    getAll: () => {
      return ipcRenderer.sendSync('db-sessoes-getAll');
    },
    create: (sessao) => {
      return ipcRenderer.sendSync('db-sessoes-create', sessao);
    },
    completar: (id) => {
      return ipcRenderer.sendSync('db-sessoes-completar', id);
    }
  },
  
  // Flashcards methods
  flashcards: {
    getAll: () => {
      return ipcRenderer.sendSync('db-flashcards-getAll');
    },
    getParaRevisao: () => {
      return ipcRenderer.sendSync('db-flashcards-getParaRevisao');
    },
    create: (card) => {
      return ipcRenderer.sendSync('db-flashcards-create', card);
    },
    revisar: (id, qualidade) => {
      return ipcRenderer.sendSync('db-flashcards-revisar', { id, qualidade });
    }
  },
  
  // XP methods
  xp: {
    getTotal: () => {
      return ipcRenderer.sendSync('db-xp-getTotal');
    },
    add: (xp, motivo, source_type, source_id) => {
      return ipcRenderer.sendSync('db-xp-add', { xp, motivo, source_type, source_id });
    }
  }
};

// Initialize database when module loads
initDB();

export default dbService;
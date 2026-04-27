const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  // Config
  getConfig: (key) => ipcRenderer.invoke('config:get', key),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
  
  // Dialogs
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  
  // Database - Notas
  dbNotasGetAll: () => ipcRenderer.invoke('db-notas:getAll'),
  dbNotasGetById: (id) => ipcRenderer.invoke('db-notas:getById', id),
  dbNotasCreate: (nota) => ipcRenderer.invoke('db-notas:create', nota),
  dbNotasUpdate: (id, updates) => ipcRenderer.invoke('db-notas:update', { id, updates }),
  dbNotasDelete: (id) => ipcRenderer.invoke('db-notas:delete', id),
  
  // Database - Pastas
  dbPastasGetAll: () => ipcRenderer.invoke('db-pastas:getAll'),
  dbPastasCreate: (pasta) => ipcRenderer.invoke('db-pastas:create', pasta),
  
  // Database - Materias
  dbMateriasGetAll: () => ipcRenderer.invoke('db-materias:getAll'),
  dbMateriasCreate: (materia) => ipcRenderer.invoke('db-materias:create', materia),
  
  // Database - Sessoes
  dbSessoesGetAll: () => ipcRenderer.invoke('db-sessoes:getAll'),
  dbSessoesCreate: (sessao) => ipcRenderer.invoke('db-sessoes:create', sessao),
  dbSessoesCompletar: (id) => ipcRenderer.invoke('db-sessoes:completar', id),
  
  // Database - Flashcards
  dbFlashcardsGetAll: () => ipcRenderer.invoke('db-flashcards:getAll'),
  dbFlashcardsGetParaRevisao: () => ipcRenderer.invoke('db-flashcards:getParaRevisao'),
  dbFlashcardsCreate: (card) => ipcRenderer.invoke('db-flashcards:create', card),
  dbFlashcardsRevisar: (id, qualidade) => ipcRenderer.invoke('db-flashcards:revisar', { id, qualidade }),
  dbFlashcardsUpdate: (id, updates) => ipcRenderer.invoke('db-flashcards:update', { id, updates }),
  dbFlashcardsDelete: (id) => ipcRenderer.invoke('db-flashcards:delete', id),
  
  // Database - XP
  dbXpGetTotal: () => ipcRenderer.invoke('db-xp:getTotal'),
  dbXpAdd: (xp, motivo, source_type, source_id) => ipcRenderer.invoke('db-xp:add', { xp, motivo, source_type, source_id }),
  
  // App
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  
  // AI Bridge
  geminiChat: (payload) => ipcRenderer.invoke('ai:geminiChat', payload),
  embeddedChat: (payload) => ipcRenderer.invoke('ai:embeddedChat', payload),
});
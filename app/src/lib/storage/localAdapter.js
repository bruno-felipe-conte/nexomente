/**
 * LocalStorageAdapter unificado (Strategy Pattern)
 * Elimina duplicação de persistência/fallback em múltiplos hooks (useNotes, usePastas, useMaterias).
 */

export class LocalStorageAdapter {
  constructor(storageKey, defaultData = []) {
    this.key = `nexomente_${storageKey}`;
    this.defaultData = defaultData;
  }

  getAll() {
    if (typeof window === 'undefined') return this.defaultData;
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        this.saveAll(this.defaultData);
        return this.defaultData;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[STORAGE ADAPTER] Erro ao ler ${this.key}:`, e);
      return this.defaultData;
    }
  }

  getById(id) {
    const list = this.getAll();
    return list.find(item => item.id === id) || null;
  }

  saveAll(items) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch (e) {
      console.error(`[STORAGE ADAPTER] Erro ao salvar ${this.key}:`, e);
    }
  }

  insert(item) {
    const list = this.getAll();
    const updated = [item, ...list];
    this.saveAll(updated);
    return item;
  }

  update(id, updates) {
    const list = this.getAll();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return null;

    list[index] = { ...list[index], ...updates, atualizado_em: new Date().toISOString() };
    this.saveAll(list);
    return list[index];
  }

  delete(id) {
    const list = this.getAll();
    const filtered = list.filter(i => i.id !== id);
    this.saveAll(filtered);
    return filtered.length !== list.length;
  }
}

import { useState, useCallback } from 'react';
import { useDBStore } from '../store/useDBStore';

const STORAGE_KEY = 'nexomente_notas';
const PASTAS_KEY = 'nexomente_pastas';

function generateId() {
  return `nota_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useNotes() {
  const { Notas, loading: dbLoading, db } = useDBStore();
  const [localNotas, setLocalNotas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const isDBReady = Boolean(Notas && !dbLoading && db && typeof Notas.getAll === 'function');
  const notas = isDBReady ? (Notas.getAll() || []) : localNotas;
  const loading = isDBReady ? dbLoading : false;

  const persistLocal = useCallback((updater) => {
    setLocalNotas(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const create = useCallback((data = {}) => {
    if (isDBReady) {
      return Notas.create({
        titulo: data.titulo || 'Nova Nota',
        tipo: data.tipo || 'nota',
        conteudo: data.conteudo || '',
        tags: data.tags || [],
        pasta_id: data.pasta_id || 'pasta_raiz',
        status: data.status || 'ativo'
      });
    }
    const id = generateId();
    const now = new Date().toISOString();
    const nova = {
      id,
      titulo: data.titulo || 'Nova Nota',
      tipo: data.tipo || 'nota',
      conteudo: data.conteudo || '',
      tags: data.tags || [],
      pasta_id: data.pasta_id || 'pasta_raiz',
      status: data.status || 'ativo',
      criado_em: now,
      atualizado_em: now
    };
    persistLocal(prev => [nova, ...prev]);
    return id;
  }, [isDBReady, Notas, persistLocal]);

  const update = useCallback((id, updates) => {
    if (isDBReady) {
      return Notas.update(id, updates);
    }
    persistLocal(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, atualizado_em: new Date().toISOString() } : n
    ));
    return true;
  }, [isDBReady, Notas, persistLocal]);

  const remove = useCallback((id) => {
    if (isDBReady) {
      return Notas.delete(id);
    }
    persistLocal(prev => prev.filter(n => n.id !== id));
    return true;
  }, [isDBReady, Notas, persistLocal]);

  const getById = useCallback((id) => {
    if (isDBReady) {
      return Notas.getById(id);
    }
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return current.find(n => n.id === id) || null;
  }, [isDBReady, Notas]);

  const search = useCallback((query) => {
    const list = isDBReady ? (Notas.getAll() || []) : JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(n =>
      (n.titulo || '').toLowerCase().includes(q) ||
      (n.conteudo || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [isDBReady, Notas]);

  const addTag = useCallback((id, tag) => {
    const nota = getById(id);
    if (!nota) return;
    const tags = nota.tags || [];
    if (tags.includes(tag)) return;
    update(id, { tags: [...tags, tag] });
  }, [getById, update]);

  const removeTag = useCallback((id, tag) => {
    const nota = getById(id);
    if (!nota) return;
    const tags = (nota.tags || []).filter(t => t !== tag);
    update(id, { tags });
  }, [getById, update]);

  return {
    notas,
    loading,
    create,
    update,
    remove,
    getById,
    search,
    addTag,
    removeTag,
    count: notas.length
  };
}

export function usePastas() {
  const { Pastas, loading: dbLoading, db } = useDBStore();
  const [localPastas, setLocalPastas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PASTAS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const isDBReady = Boolean(Pastas && !dbLoading && db && typeof Pastas.getAll === 'function');
  const pastas = isDBReady ? (Pastas.getAll() || []) : localPastas;

  const create = useCallback((data = {}) => {
    if (isDBReady) {
      return Pastas.create({
        nome: data.nome || 'Nova Pasta',
        cor: data.cor || '#6C63FF',
        icone: data.icone || 'folder'
      });
    }
    const id = data.id || `pasta_${Date.now()}`;
    const nova = {
      id,
      nome: data.nome || 'Nova Pasta',
      tipo: data.tipo || 'pasta_raiz',
      cor: data.cor || '#6C63FF',
      icone: data.icone || 'folder'
    };
    setLocalPastas(prev => {
      const updated = [...prev, nova];
      localStorage.setItem(PASTAS_KEY, JSON.stringify(updated));
      return updated;
    });
    return id;
  }, [isDBReady, Pastas]);

  return {
    pastas,
    create
  };
}
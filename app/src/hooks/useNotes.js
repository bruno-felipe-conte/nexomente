import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'nexomente_notas';
const PASTAS_KEY = 'nexomente_pastas';

function generateId() {
  return `nota_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useNotes() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setNotas(JSON.parse(stored));
      } catch {
        setNotas([]);
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((lista) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    setNotas(lista);
  }, []);

  const create = useCallback((data = {}) => {
    const id = generateId();
    const now = new Date().toISOString();
    const nova = {
      id,
      titulo: data.titulo || 'Nova Nota',
      tipo: data.tipo || 'nota',
      conteudo: data.conteudo || '',
      tags: data.tags || [],
      pasta_id: data.pasta_id || 'inbox',
      status: data.status || 'inbox',
      autor: data.autor || '',
      pagina_atual: data.pagina_atual || 0,
      total_paginas: data.total_paginas || 0,
      avaliacao: data.avaliacao || 0,
      criado_em: now,
      atualizado_em: now,
      resumo_ia: '',
    };
    setNotas(prev => {
      const updated = [nova, ...prev];
      persist(updated);
      return updated;
    });
    return id;
  }, [persist]);

  const update = useCallback((id, data) => {
    setNotas(prev => {
      const updated = prev.map(n =>
        n.id === id
          ? { ...n, ...data, atualizado_em: new Date().toISOString() }
          : n
      );
      persist(updated);
      return updated;
    });
  }, [persist]);

  const remove = useCallback((id) => {
    setNotas(prev => {
      const updated = prev.filter(n => n.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const search = useCallback((query) => {
    if (!query) return notas;
    const q = query.toLowerCase();
    return notas.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      n.conteudo?.toLowerCase().includes(q) ||
      n.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [notas]);

  const getById = useCallback((id) => {
    return notas.find(n => n.id === id) || null;
  }, [notas]);

  const addTag = useCallback((id, tag) => {
    setNotas(prev => {
      const updated = prev.map(n => {
        if (n.id !== id) return n;
        const tags = n.tags || [];
        if (tags.includes(tag)) return n;
        return { ...n, tags: [...tags, tag], atualizado_em: new Date().toISOString() };
      });
      persist(updated);
      return updated;
    });
  }, [persist]);

  const removeTag = useCallback((id, tag) => {
    setNotas(prev => {
      const updated = prev.map(n => {
        if (n.id !== id) return n;
        return { ...n, tags: (n.tags || []).filter(t => t !== tag), atualizado_em: new Date().toISOString() };
      });
      persist(updated);
      return updated;
    });
  }, [persist]);

  return {
    notas,
    loading,
    create,
    update,
    remove,
    search,
    getById,
    addTag,
    removeTag,
    count: notas.length,
  };
}

export function usePastas() {
  const [pastaspersonalizadas, setPastaspersonalizadas] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(PASTAS_KEY);
    if (stored) {
      try {
        setPastaspersonalizadas(JSON.parse(stored));
      } catch {
        setPastaspersonalizadas([]);
      }
    }
  }, []);

  const create = useCallback((data = {}) => {
    const id = data.id || `pasta_${Date.now()}`;
    const nova = { id, nome: data.nome || 'Nova Pasta', tipo: data.tipo || 'pasta_raiz' };
    setPastaspersonalizadas(prev => {
      const updated = [...prev, nova];
      localStorage.setItem(PASTAS_KEY, JSON.stringify(updated));
      return updated;
    });
    return id;
  }, []);

  return {
    pastas: pastaspersonalizadas,
    create,
  };
}
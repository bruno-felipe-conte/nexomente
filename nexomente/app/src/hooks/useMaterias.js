import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'nexomente_materias';

function generateId() {
  return `materia_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_MATERIAS = [
  { id: 'materia_default_1', nome: 'Português', cor: '#8B5CF6', icono: 'BookOpen', meta_horas: 10 },
  { id: 'materia_default_2', nome: 'Inglês', cor: '#3B82F6', icono: 'Globe', meta_horas: 8 },
  { id: 'materia_default_3', nome: 'Italiano', cor: '#10B981', icono: 'Globe', meta_horas: 5 },
  { id: 'materia_default_4', nome: 'Filosofia', cor: '#F59E0B', icono: 'Brain', meta_horas: 6 },
];

export function useMaterias() {
  const [materias, setMaterias] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_MATERIAS;
      }
    }
    return DEFAULT_MATERIAS;
  });

  // Sincronização entre abas/componentes
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try { setMaterias(JSON.parse(stored)); } catch (e) { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const persist = useCallback((lista) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    window.dispatchEvent(new Event('storage'));
  }, []);

  const create = useCallback((data = {}) => {
    const id = generateId();
    const nova = {
      id,
      nome: data.nome || 'Nova Matéria',
      cor: data.cor || '#6C63FF',
      icono: data.icono || 'BookOpen',
      meta_horas: data.meta_horas || 10,
      criado_em: new Date().toISOString(),
    };
    setMaterias(prev => {
      const updated = [...prev, nova];
      persist(updated);
      return updated;
    });
    return id;
  }, [persist]);

  const update = useCallback((id, data) => {
    setMaterias(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...data } : m);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const remove = useCallback((id) => {
    setMaterias(prev => {
      const updated = prev.filter(m => m.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getById = useCallback((id) => {
    return materias.find(m => m.id === id) || null;
  }, [materias]);

  return { materias, create, update, remove, getById };
}

const POEMAS_KEY = 'nexomente_poemas';

export function usePoemas() {
  const [poemas, setPoemas] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(POEMAS_KEY);
    if (stored) {
      try {
        setPoemas(JSON.parse(stored));
      } catch {
        setPoemas([]);
      }
    }
  }, []);

  const persist = useCallback((lista) => {
    localStorage.setItem(POEMAS_KEY, JSON.stringify(lista));
    setPoemas(lista);
  }, []);

  const create = useCallback((data = {}) => {
    const id = `poema_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const novo = {
      id,
      titulo: data.titulo || 'Novo Poema',
      autor: data.autor || '',
      ano: data.ano || '',
      corpo: data.corpo || '',
      formato: data.formato || 'verso', // 'verso' | 'prosa'
      tags: data.tags || [],
      data_cadastro: new Date().toISOString(),
      ultima_recitacao: null,
      streak_recitacao: 0,
      total_recitacoes: 0,
    };
    setPoemas(prev => {
      const updated = [...prev, novo];
      persist(updated);
      return updated;
    });
    return id;
  }, [persist]);

  const update = useCallback((id, data) => {
    setPoemas(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...data } : p);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const remove = useCallback((id) => {
    setPoemas(prev => {
      const updated = prev.filter(p => p.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const registrarRecitacao = useCallback((id) => {
    setPoemas(prev => {
      const updated = prev.map(p => {
        if (p.id !== id) return p;
        const hoje = new Date().toISOString().split('T')[0];
        const ultima = p.ultima_recitacao;
        const streak = ultima === hoje ? p.streak_recitacao : p.streak_recitacao + 1;
        return {
          ...p,
          ultima_recitacao: hoje,
          streak_recitacao: streak,
          total_recitacoes: p.total_recitacoes + 1,
        };
      });
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getById = useCallback((id) => poemas.find(p => p.id === id) || null, [poemas]);
  const proximoPoema = useCallback((atualId) => {
    const idx = poemas.findIndex(p => p.id === atualId);
    return idx < poemas.length - 1 ? poemas[idx + 1] : poemas[0];
  }, [poemas]);
  const poemaAnterior = useCallback((atualId) => {
    const idx = poemas.findIndex(p => p.id === atualId);
    return idx > 0 ? poemas[idx - 1] : poemas[poemas.length - 1];
  }, [poemas]);

  return { poemas, create, update, remove, registrarRecitacao, getById, proximoPoema, poemaAnterior };
}
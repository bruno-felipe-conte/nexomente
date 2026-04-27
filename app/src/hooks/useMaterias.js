import { useCallback } from 'react';
import { useDBStore } from '../store/useDBStore';

export function useMaterias() {
  const { Materias, loading } = useDBStore();
  const materias = Materias?.getAll() || [];

  const create = useCallback((data = {}) => {
    return Materias.create({
      nome: data.nome || 'Nova Matéria',
      cor: data.cor || '#6C63FF',
      icone: data.icone || 'BookOpen',
      meta_horas: data.meta_horas || 10
    });
  }, [Materias]);

  const update = useCallback((id, data) => {
    return Materias.update(id, data);
  }, [Materias]);

  const remove = useCallback((id) => {
    return Materias.delete(id);
  }, [Materias]);

  const getById = useCallback((id) => {
    return Materias.getById(id);
  }, [Materias]);

  return { materias, loading, create, update, remove, getById };
}

// TODO: Migrate Poemas to SQLite. For now, we'll keep them in a safe wrapper.
const POEMAS_KEY = 'nexomente_poemas';

export function usePoemas() {
  const getStored = () => {
    try {
      const stored = localStorage.getItem(POEMAS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const poemas = getStored();

  const persist = (lista) => {
    localStorage.setItem(POEMAS_KEY, JSON.stringify(lista));
  };

  const create = useCallback((data = {}) => {
    const id = `poema_${Date.now()}`;
    const novo = {
      id,
      titulo: data.titulo || 'Novo Poema',
      autor: data.autor || '',
      corpo: data.corpo || '',
      tags: data.tags || [],
      data_cadastro: new Date().toISOString(),
    };
    persist([...getStored(), novo]);
    return id;
  }, []);

  const remove = useCallback((id) => {
    persist(getStored().filter(p => p.id !== id));
  }, []);

  return { poemas, create, remove };
}
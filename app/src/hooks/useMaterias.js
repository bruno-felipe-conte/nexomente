import { useCallback, useMemo } from 'react';
import { useDBStore } from '../store/useDBStore';

export function useMaterias() {
  const { Materias, loading, version } = useDBStore();
  const materias = useMemo(() => Materias?.getAll() || [], [Materias, version]);

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

export function usePoemas() {
  const { Poemas, loading, version } = useDBStore();
  const poemas = useMemo(() => Poemas?.getAll() || [], [Poemas, version]);

  const create = useCallback((data = {}) => {
    return Poemas.create(data);
  }, [Poemas]);

  const createMany = useCallback((list = []) => {
    return Poemas.createMany(list);
  }, [Poemas]);

  const update = useCallback((id, data) => {
    return Poemas.update(id, data);
  }, [Poemas]);

  const remove = useCallback((id) => {
    return Poemas.delete(id);
  }, [Poemas]);

  const getById = useCallback((id) => {
    return Poemas.getById(id);
  }, [Poemas]);

  const registrarRecitacao = useCallback((id) => {
    return Poemas.registrarRecitacao(id);
  }, [Poemas]);

  const proximoPoema = useCallback((id) => {
    const idx = poemas.findIndex(p => p.id === id);
    if (idx === -1 || idx === poemas.length - 1) return poemas[0];
    return poemas[idx + 1];
  }, [poemas]);

  const poemaAnterior = useCallback((id) => {
    const idx = poemas.findIndex(p => p.id === id);
    if (idx === -1 || idx === 0) return poemas[poemas.length - 1];
    return poemas[idx - 1];
  }, [poemas]);

  return { poemas, loading, create, createMany, update, remove, getById, registrarRecitacao, proximoPoema, poemaAnterior };
}
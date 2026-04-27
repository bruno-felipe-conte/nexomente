import { useCallback } from 'react';
import { useDBStore } from '../store/useDBStore';

export function useNotes() {
  const { Notas, loading } = useDBStore();

  const notas = Notas?.getAll() || [];

  const create = useCallback((data = {}) => {
    return Notas.create({
      titulo: data.titulo || 'Nova Nota',
      tipo: data.tipo || 'nota',
      conteudo: data.conteudo || '',
      tags: data.tags || [],
      pasta_id: data.pasta_id || 'pasta_raiz',
      status: data.status || 'ativo'
    });
  }, [Notas]);

  const update = useCallback((id, updates) => {
    return Notas.update(id, updates);
  }, [Notas]);

  const remove = useCallback((id) => {
    return Notas.delete(id);
  }, [Notas]);

  const getById = useCallback((id) => {
    return Notas.getById(id);
  }, [Notas]);

  const search = useCallback((query) => {
    if (!query) return notas;
    const q = query.toLowerCase();
    return notas.filter(n => 
      (n.titulo || '').toLowerCase().includes(q) || 
      (n.conteudo || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [notas]);

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
  const { Pastas } = useDBStore();
  const pastas = Pastas?.getAll() || [];

  const create = useCallback((data = {}) => {
    return Pastas.create({
      nome: data.nome || 'Nova Pasta',
      cor: data.cor || '#6C63FF',
      icone: data.icone || 'folder'
    });
  }, [Pastas]);

  return {
    pastas,
    create
  };
}
import { describe, it, expect, beforeEach } from 'vitest';
import { useDBStore } from '../store/useDBStore';

describe('useDBStore & Repositories (WASM SQLite Integration)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await useDBStore.getState().init();
    const db = useDBStore.getState().db;
    if (db) {
      db.run('DELETE FROM notas');
      db.run("DELETE FROM pastas WHERE id != 'pasta_raiz'");
      db.run('DELETE FROM materias');
      db.run('DELETE FROM sessoes_estudo');
      db.run('DELETE FROM flashcards');
      db.run('DELETE FROM transacoes_xp');
      db.run("DELETE FROM poemas WHERE id NOT IN ('p1', 'p2')");
    }
    useDBStore.setState({ totalXP: 0, version: 0 });
  });

  it('inicializa o banco SQL.js WASM com pasta_raiz e poemas iniciais', () => {
    const state = useDBStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.db).toBeDefined();

    const pastas = state.Pastas.getAll();
    expect(pastas.some(p => p.id === 'pasta_raiz')).toBe(true);

    const poemas = state.Poemas.getAll();
    expect(poemas.length).toBeGreaterThanOrEqual(2);
  });

  it('Notas repository: create, getById, search, update, delete e reatividade version', async () => {
    const { Notas } = useDBStore.getState();
    const initialVersion = useDBStore.getState().version;

    const id = Notas.create({
      titulo: 'Nota WASM Teste',
      tipo: 'nota',
      conteudo: 'Conteúdo de arquitetura modular',
      tags: ['arquitetura', 'wasm']
    });
    expect(id).toBeDefined();

    // Aguarda callback assíncrono do saveDB incrementar version
    await new Promise(r => setTimeout(r, 10));
    expect(useDBStore.getState().version).toBeGreaterThan(initialVersion);

    const criada = Notas.getById(id);
    expect(criada.titulo).toBe('Nota WASM Teste');
    expect(criada.tags).toEqual(['arquitetura', 'wasm']);

    const busca = Notas.search('modular');
    expect(busca).toHaveLength(1);
    expect(busca[0].id).toBe(id);

    Notas.update(id, { titulo: 'Nota WASM Atualizada', tags: ['atualizada'] });
    expect(Notas.getById(id).titulo).toBe('Nota WASM Atualizada');
    expect(Notas.getById(id).tags).toEqual(['atualizada']);

    Notas.delete(id);
    expect(Notas.getAll().some(n => n.id === id)).toBe(false);
  });

  it('Pastas repository: create e getAll', () => {
    const { Pastas } = useDBStore.getState();
    const id = Pastas.create({ nome: 'Estudos Avançados', cor: '#10B981', icone: 'book' });
    const todas = Pastas.getAll();
    expect(todas.some(p => p.id === id && p.nome === 'Estudos Avançados')).toBe(true);
  });

  it('Materias repository: create, getAll, getById, update e delete', () => {
    const { Materias } = useDBStore.getState();
    const id = Materias.create({ nome: 'Algoritmos', cor: '#3B82F6', icone: 'code', meta_horas: 20 });
    expect(Materias.getAll()).toHaveLength(1);

    const mat = Materias.getById(id);
    expect(mat.nome).toBe('Algoritmos');
    expect(mat.meta_horas).toBe(20);

    Materias.update(id, { nome: 'Algoritmos e Estruturas', meta_horas: 30 });
    expect(Materias.getById(id).nome).toBe('Algoritmos e Estruturas');
    expect(Materias.getById(id).meta_horas).toBe(30);

    Materias.delete(id);
    expect(Materias.getAll()).toHaveLength(0);
  });

  it('SessoesEstudo repository: create, getAll e completar', () => {
    const { Materias, SessoesEstudo } = useDBStore.getState();
    const matId = Materias.create({ nome: 'Física', cor: '#F59E0B' });
    const sessaoId = SessoesEstudo.create({ materia_id: matId, tipo: 'pomodoro', duracao_minutos: 25 });

    let sessoes = SessoesEstudo.getAll();
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0].concluida).toBe(false);

    SessoesEstudo.completar(sessaoId);
    sessoes = SessoesEstudo.getAll();
    expect(sessoes[0].concluida).toBe(true);
    expect(sessoes[0].ended_at).toBeTruthy();
  });

  it('Flashcards repository: create, getParaRevisao, revisar, update e delete', () => {
    const { Flashcards } = useDBStore.getState();
    const id = Flashcards.create({
      nota_id: null,
      materia_id: null,
      frente: 'O que é SM-2?',
      verso: 'Algoritmo de repetição espaçada'
    });

    expect(Flashcards.getAll()).toHaveLength(1);
    expect(Flashcards.getParaRevisao()).toHaveLength(1);

    Flashcards.update(id, { frente: 'O que significa SM-2?' });
    expect(Flashcards.getAll()[0].frente).toBe('O que significa SM-2?');

    Flashcards.revisar(id, 4);
    const revisado = Flashcards.getAll()[0];
    expect(revisado.repeticoes).toBe(1);
    expect(revisado.intervalo).toBe(4);

    Flashcards.delete(id);
    expect(Flashcards.getAll()).toHaveLength(0);
  });

  it('XP repository: add, getTotal e sincronização de totalXP na store', () => {
    const { XP } = useDBStore.getState();
    expect(XP.getTotal()).toBe(0);

    XP.add(50, 'Sessão concluída', 'study', 'sessao_1');
    expect(XP.getTotal()).toBe(50);
    expect(useDBStore.getState().totalXP).toBe(50);
  });

  it('Poemas repository: create, getById, update, registrarRecitacao, createMany e delete', () => {
    const { Poemas } = useDBStore.getState();
    const id = Poemas.create({
      titulo: 'Soneto de Fidelidade',
      autor: 'Vinicius de Moraes',
      corpo: 'De tudo, ao meu amor serei atento',
      epoca: 'Modernismo',
      tema: ['amor'],
      tags: ['soneto']
    });

    const poema = Poemas.getById(id);
    expect(poema.titulo).toBe('Soneto de Fidelidade');
    expect(poema.tema).toEqual(['amor']);

    Poemas.update(id, { ano: '1939', tags: ['soneto', 'classico'] });
    expect(Poemas.getById(id).ano).toBe('1939');
    expect(Poemas.getById(id).tags).toEqual(['soneto', 'classico']);

    const streak = Poemas.registrarRecitacao(id);
    expect(streak).toBe(1);

    Poemas.createMany([
      { titulo: 'Lote 1', autor: 'Autor 1', corpo: 'Verso 1' },
      { titulo: 'Lote 2', autor: 'Autor 2', corpo: 'Verso 2' }
    ]);
    expect(Poemas.getAll().some(p => p.titulo === 'Lote 1')).toBe(true);

    Poemas.delete(id);
    expect(Poemas.getById(id)).toBeNull();
  });
});

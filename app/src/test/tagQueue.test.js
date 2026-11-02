import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import toast from 'react-hot-toast';
import { useDBStore } from '../store/useDBStore.js';
import { useAIStore } from '../store/useAIStore.js';
import * as aiProvider from '../lib/ai/aiProvider.js';
import { httpProvider } from '../lib/ai/httpProvider.js';
import {
  tagQueueService,
  isLocalhost,
  isOnlineProviderActive,
  normalizeTag,
  parseTagsFromResponse,
  buildTagPrompt,
  enqueueNote,
  drainQueue,
} from '../lib/ai/tagQueueService.js';

describe('Intelligent Tag Queue (Milestone 1 - R1)', () => {
  let db;

  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Inicializa banco WASM limpo
    await useDBStore.getState().init();
    db = useDBStore.getState().db;
    if (db) {
      db.run('DELETE FROM notas');
      db.run('DELETE FROM tags_queue');
    }
    useDBStore.getState().TagsQueue?.clear();
    useDBStore.setState({ version: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. TagsQueue Repository Unit Tests', () => {
    it('deve enfileirar nota com status pending e registrar id', () => {
      const { TagsQueue } = useDBStore.getState();
      const queueId = TagsQueue.enqueue('nota-123');

      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^tq_/);
      expect(TagsQueue.countPending()).toBe(1);

      const items = TagsQueue.peek(5);
      expect(items).toHaveLength(1);
      expect(items[0].nota_id).toBe('nota-123');
      expect(items[0].status).toBe('pending');
      expect(items[0].attempts).toBe(0);
      expect(items[0].created_at).toBeGreaterThan(0);
    });

    it('deve ser idempotente no enqueue se a nota já estiver pendente', () => {
      const { TagsQueue } = useDBStore.getState();
      const id1 = TagsQueue.enqueue('nota-abc');
      const id2 = TagsQueue.enqueue('nota-abc');

      expect(id1).toBe(id2);
      expect(TagsQueue.countPending()).toBe(1);
    });

    it('deve respeitar a ordem FIFO e o limit no peek()', async () => {
      const { TagsQueue } = useDBStore.getState();
      TagsQueue.enqueue('nota-1');
      await new Promise((r) => setTimeout(r, 5));
      TagsQueue.enqueue('nota-2');
      await new Promise((r) => setTimeout(r, 5));
      TagsQueue.enqueue('nota-3');

      expect(TagsQueue.countPending()).toBe(3);

      const peek2 = TagsQueue.peek(2);
      expect(peek2).toHaveLength(2);
      expect(peek2[0].nota_id).toBe('nota-1');
      expect(peek2[1].nota_id).toBe('nota-2');
    });

    it('deve remover nota da fila com dequeue()', () => {
      const { TagsQueue } = useDBStore.getState();
      TagsQueue.enqueue('nota-del');
      expect(TagsQueue.countPending()).toBe(1);

      const success = TagsQueue.dequeue('nota-del');
      expect(success).toBe(true);
      expect(TagsQueue.countPending()).toBe(0);
    });

    it('deve marcar nota com falha em markFailed() e retirá-la da contagem de pendentes', () => {
      const { TagsQueue } = useDBStore.getState();
      TagsQueue.enqueue('nota-fail');
      expect(TagsQueue.countPending()).toBe(1);

      TagsQueue.markFailed('nota-fail');
      expect(TagsQueue.countPending()).toBe(0);

      const db = useDBStore.getState().db;
      const res = db.exec("SELECT attempts, status FROM tags_queue WHERE nota_id = 'nota-fail'");
      expect(res[0].values[0][0]).toBe(1); // attempts
      expect(res[0].values[0][1]).toBe('failed'); // status
    });

    it('deve limpar todas as entradas com clear()', () => {
      const { TagsQueue } = useDBStore.getState();
      TagsQueue.enqueue('nota-a');
      TagsQueue.enqueue('nota-b');
      expect(TagsQueue.countPending()).toBe(2);

      TagsQueue.clear();
      expect(TagsQueue.countPending()).toBe(0);
    });
  });

  describe('2. Utilitários e Parser de Tags', () => {
    it('isLocalhost identifica corretamente URLs locais vs. serviços em nuvem', () => {
      expect(isLocalhost('http://localhost:1234/v1')).toBe(true);
      expect(isLocalhost('http://127.0.0.1:11434')).toBe(true);
      expect(isLocalhost('http://0.0.0.0:8000')).toBe(true);
      expect(isLocalhost('http://servidor.local:1234')).toBe(true);

      expect(isLocalhost('https://generativelanguage.googleapis.com/v1beta/openai')).toBe(false);
      expect(isLocalhost('https://api.groq.com/openai/v1')).toBe(false);
      expect(isLocalhost('https://openrouter.ai/api/v1')).toBe(false);
    });

    it('normalizeTag sanitiza, remove acentos e formata tags', () => {
      expect(normalizeTag('Inteligência Artificial')).toBe('inteligencia-artificial');
      expect(normalizeTag('  Física Quântica!  ')).toBe('fisica-quantica');
      expect(normalizeTag('Machine_Learning')).toBe('machinelearning');
      expect(normalizeTag('História do Brasil')).toBe('historia-do-brasil');
    });

    it('parseTagsFromResponse lida com JSON válido e formatos com ruído', () => {
      const jsonClean = '{"tags": ["react", "vite", "sqlite"]}';
      expect(parseTagsFromResponse(jsonClean)).toEqual(['react', 'vite', 'sqlite']);

      const jsonWithMarkdown = 'Aqui estão as tags sugeridas:\n```json\n{"tags": ["filosofia", "etica"]}\n```';
      expect(parseTagsFromResponse(jsonWithMarkdown)).toEqual(['filosofia', 'etica']);

      const rawQuotes = 'As tags recomendadas são: "quimica", "termodinamica", "entalpia"';
      expect(parseTagsFromResponse(rawQuotes)).toEqual(['quimica', 'termodinamica', 'entalpia']);
    });

    it('buildTagPrompt estrutura o prompt pedagógico com limite seguro', () => {
      const prompt = buildTagPrompt('Teorema de Pitágoras', '<p>Em qualquer triângulo retângulo, a soma dos quadrados...</p>');
      expect(prompt).toContain('Teorema de Pitágoras');
      expect(prompt).toContain('triângulo retângulo');
      expect(prompt).toContain('até 6 tags semânticas');
    });
  });

  describe('3. Enfileiramento Offline / Local (0 CPU/GPU)', () => {
    it('enfileira nota na tags_queue quando provedor for embedded (motor local)', async () => {
      localStorage.setItem('nexomente_ai_provider', 'embedded');
      const { Notas, TagsQueue } = useDBStore.getState();

      const notaId = Notas.create({
        titulo: 'Fórmula de Bhaskara',
        conteudo: 'Resolução de equações do segundo grau passo a passo.',
      });

      const chatSpy = vi.spyOn(httpProvider, 'chat');
      const toastSpy = vi.spyOn(toast, 'success');

      await enqueueNote(notaId, {
        titulo: 'Fórmula de Bhaskara',
        conteudo: 'Resolução de equações do segundo grau passo a passo.',
      });

      // Deve estar enfileirado na tags_queue
      expect(TagsQueue.countPending()).toBe(1);
      const pending = TagsQueue.peek(5);
      expect(pending[0].nota_id).toBe(notaId);

      // Não deve ter executado inferência pesada nem disparado toast
      expect(chatSpy).not.toHaveBeenCalled();
      expect(toastSpy).not.toHaveBeenCalled();
    });

    it('enfileira nota quando provedor HTTP apontar para localhost', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'http://localhost:11434/v1');
      const { Notas, TagsQueue } = useDBStore.getState();

      const notaId = Notas.create({
        titulo: 'Mitocôndrias e ATP',
        conteudo: 'A respiração celular e a cadeia transportadora de elétrons.',
      });

      const chatSpy = vi.spyOn(httpProvider, 'chat');

      await enqueueNote(notaId, {
        titulo: 'Mitocôndrias e ATP',
        conteudo: 'A respiração celular e a cadeia transportadora de elétrons.',
      });

      expect(TagsQueue.countPending()).toBe(1);
      expect(chatSpy).not.toHaveBeenCalled();
    });

    it('ignora notas vazias ou triviais para evitar alucinações de tags', async () => {
      localStorage.setItem('nexomente_ai_provider', 'embedded');
      const { Notas, TagsQueue } = useDBStore.getState();

      const emptyId = Notas.create({
        titulo: 'Nova Nota',
        conteudo: '',
      });

      await enqueueNote(emptyId, {
        titulo: 'Nova Nota',
        conteudo: '',
      });

      expect(TagsQueue.countPending()).toBe(0);
    });
  });

  describe('4. Auto-Tagging Online Imediato', () => {
    it('gera e aplica tags imediatamente quando provedor online estiver ativo', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'https://api.groq.com/openai/v1');
      const { Notas, TagsQueue } = useDBStore.getState();

      const notaId = Notas.create({
        titulo: 'Revolução Francesa',
        conteudo: 'A queda da Bastilha em 1789 e a declaração dos direitos do homem.',
        tags: ['historia'],
      });

      // Mock da resposta bem-sucedida da IA online
      vi.spyOn(httpProvider, 'chat').mockResolvedValue({
        success: true,
        response: '{"tags": ["revolucao-francesa", "bastilha", "seculo-18"]}',
        content: '{"tags": ["revolucao-francesa", "bastilha", "seculo-18"]}',
      });

      await enqueueNote(notaId, {
        titulo: 'Revolução Francesa',
        conteudo: 'A queda da Bastilha em 1789 e a declaração dos direitos do homem.',
      });

      // A nota deve ter recebido as novas tags mescladas
      const notaAtualizada = Notas.getById(notaId);
      expect(notaAtualizada.tags).toContain('historia');
      expect(notaAtualizada.tags).toContain('revolucao-francesa');
      expect(notaAtualizada.tags).toContain('bastilha');
      expect(notaAtualizada.tags).toContain('seculo-18');

      // Não deve ficar na fila
      expect(TagsQueue.countPending()).toBe(0);
    });

    it('enfileira nota para retry se a chamada online falhar (ex: rate limit 429)', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'https://api.groq.com/openai/v1');
      const { Notas, TagsQueue } = useDBStore.getState();

      const notaId = Notas.create({
        titulo: 'Leis de Newton',
        conteudo: 'Princípio da inércia, princípio fundamental da dinâmica e ação e reação.',
      });

      // Mock de falha remota na API
      vi.spyOn(httpProvider, 'chat').mockResolvedValue({
        success: false,
        error: 'HTTP 429: Rate limit exceeded',
      });

      await enqueueNote(notaId, {
        titulo: 'Leis de Newton',
        conteudo: 'Princípio da inércia, princípio fundamental da dinâmica e ação e reação.',
      });

      // Deve ter enfileirado para dreno posterior
      expect(TagsQueue.countPending()).toBe(1);
      expect(TagsQueue.peek(1)[0].nota_id).toBe(notaId);
    });
  });

  describe('5. Dreno Automático da Fila ao Retornar Online', () => {
    it('processa itens pendentes em lote ao alternar para provedor online e limpa a fila', async () => {
      const { Notas, TagsQueue } = useDBStore.getState();

      // Cria 2 notas offline e enfileira
      const nota1 = Notas.create({
        titulo: 'Cinemática Escalar',
        conteudo: 'Velocidade média, aceleração e movimento retilíneo uniforme.',
      });
      const nota2 = Notas.create({
        titulo: 'Genética Mendeliana',
        conteudo: 'Primeira e segunda lei de Mendel, cruzamentos e hereditariedade.',
      });

      TagsQueue.enqueue(nota1);
      TagsQueue.enqueue(nota2);
      expect(TagsQueue.countPending()).toBe(2);

      // Comuta para provedor online
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'https://api.groq.com/openai/v1');

      // Mock de respostas da IA para o lote
      vi.spyOn(httpProvider, 'chat')
        .mockResolvedValueOnce({
          success: true,
          content: '{"tags": ["fisica", "cinematica", "mru"]}',
        })
        .mockResolvedValueOnce({
          success: true,
          content: '{"tags": ["biologia", "genetica", "mendel"]}',
        });

      // Executa dreno da fila
      await drainQueue();

      // Fila deve ter sido drenada
      expect(TagsQueue.countPending()).toBe(0);

      // Ambas as notas devem ter recebido as tags geradas
      const atualizada1 = Notas.getById(nota1);
      expect(atualizada1.tags).toEqual(['fisica', 'cinematica', 'mru']);

      const atualizada2 = Notas.getById(nota2);
      expect(atualizada2.tags).toEqual(['biologia', 'genetica', 'mendel']);
    });

    it('remove da fila notas que foram excluídas antes do dreno', async () => {
      const { Notas, TagsQueue } = useDBStore.getState();

      const notaExcluida = Notas.create({
        titulo: 'Nota Temporária',
        conteudo: 'Conteúdo efêmero',
      });
      TagsQueue.enqueue(notaExcluida);
      expect(TagsQueue.countPending()).toBe(1);

      // Usuário exclui a nota
      Notas.delete(notaExcluida);

      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'https://api.groq.com/openai/v1');

      const chatSpy = vi.spyOn(httpProvider, 'chat');

      await drainQueue();

      // Deve ter retirado da fila sem chamar a IA
      expect(TagsQueue.countPending()).toBe(0);
      expect(chatSpy).not.toHaveBeenCalled();
    });
  });
});

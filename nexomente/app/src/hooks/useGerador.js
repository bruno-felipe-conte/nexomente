import { useState, useCallback, useEffect } from 'react';
import { useFlashcards } from './useFlashcards';
import { parseArquivo, gerarQuestoesComIA } from '../lib/parser';

const QUESTOES_KEY = 'nexomente_questoes';
const BANCAS_KEY = 'nexomente_bancas';

const DEFAULT_BANCAS = [
  { key: 'fcc', nome: 'FCC' },
  { key: 'cespe', nome: 'CESPE/Cebraspe' },
  { key: 'fgv', nome: 'FGV' },
  { key: 'ibfc', nome: 'IBFC' },
  { key: 'vunesp', nome: 'VUNESP' },
  { key: 'outras', nome: 'Outras' },
];

function generateId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useGerador() {
  const { create: createFlashcard } = useFlashcards();
  
  const [questoes, setQuestoes] = useState(() => {
    const stored = localStorage.getItem(QUESTOES_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Listener para sincronização em tempo real entre abas/componentes
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem(QUESTOES_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setQuestoes(parsed);
        } catch (e) {
          console.error('Erro ao sincronizar questões:', e);
        }
      }
    };

    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const [bancas, setBancas] = useState(() => {
    const stored = localStorage.getItem(BANCAS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_BANCAS;
      }
    }
    return DEFAULT_BANCAS;
  });
  
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState(null);
  
  const persist = useCallback((lista) => {
    localStorage.setItem(QUESTOES_KEY, JSON.stringify(lista));
    setQuestoes(lista);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const persistBancas = useCallback((lista) => {
    localStorage.setItem(BANCAS_KEY, JSON.stringify(lista));
    setBancas(lista);
  }, []);

  const addBanca = useCallback((nome) => {
    const key = nome.toLowerCase().replace(/\s+/g, '_');
    if (bancas.find(b => b.key === key)) return;
    const novas = [...bancas, { key, nome }];
    persistBancas(novas);
  }, [bancas, persistBancas]);

  const removeBanca = useCallback((key) => {
    const novas = bancas.filter(b => b.key !== key);
    persistBancas(novas);
  }, [bancas, persistBancas]);
  
  const processarTexto = useCallback(async (texto, tipoArquivo = 'txt') => {
    setCarregando(true);
    setErro(null);
    setProgresso(20);
    
    try {
      const resultado = await parseArquivo(texto, tipoArquivo);
      setProgresso(80);
      
      const novasQuestoes = resultado.questoes.map(q => ({
        ...q,
        id: generateId(),
        materia: resultado.materia,
        banca: resultado.banca,
        ano: resultado.ano,
      }));
      
      setQuestoes(prev => {
        const atualizadas = [...novasQuestoes, ...prev];
        persist(atualizadas);
        return atualizadas;
      });
      
      setProgresso(100);
      return { success: true, total: novasQuestoes.length };
    } catch (e) {
      setErro(e.message);
      return { success: false, erro: e.message };
    } finally {
      setCarregando(false);
    }
  }, [persist]);
  
  const gerarComIA = useCallback(async (texto, config = {}) => {
    setCarregando(true);
    setErro(null);
    setProgresso(10);
    
    try {
      const resultado = await gerarQuestoesComIA(texto, config);
      
      if (!resultado.success) {
        setErro(resultado.erro || 'Falha na geração');
        return resultado;
      }

      setProgresso(90);
      
      const novasQuestoes = resultado.questoes.map(q => ({
        ...q,
        id: generateId(),
      }));
      
      setQuestoes(prev => {
        const atualizadas = [...novasQuestoes, ...prev];
        persist(atualizadas);
        return atualizadas;
      });
      
      setProgresso(100);
      return { success: true, total: novasQuestoes.length };
    } catch (e) {
      console.error('[GERADOR] Erro fatal:', e);
      setErro(`Erro inesperado: ${e.message}`);
      return { success: false, erro: e.message };
    } finally {
      setCarregando(false);
    }
  }, [persist]);
  
  const atualizarQuestao = useCallback((id, dados) => {
    setQuestoes(prev => {
      const atualizadas = prev.map(q => q.id === id ? { ...q, ...dados } : q);
      persist(atualizadas);
      return atualizadas;
    });
  }, [persist]);
  
  const deletarQuestao = useCallback((id) => {
    setQuestoes(prev => {
      const atualizadas = prev.filter(q => q.id !== id);
      persist(atualizadas);
      return atualizadas;
    });
  }, [persist]);
  
  const criarFlashcards = useCallback((questaoId) => {
    const questao = questoes.find(q => q.id === questaoId);
    if (!questao) return null;
    
    const cardId = createFlashcard({
      frente: `${questao.pergunta}\n\n${questao.opcoes.map(o => `${o.letra}) ${o.texto}`).join('\n')}`,
      verso: `Gabarito: ${questao.resposta_correta}\n\n${questao.opcoes.find(o => o.correta)?.justificativa_correta || ''}`,
      materia: questao.materia,
    });
    
    return cardId;
  }, [questoes, createFlashcard]);
  
  const criarTodosFlashcards = useCallback((materia = null, topico = null) => {
    let filtered = questoes;
    
    if (materia) {
      filtered = filtered.filter(q => q.materia === materia);
    }
    if (topico) {
      filtered = filtered.filter(q => q.topico === topico);
    }
    
    const criados = [];
    for (const q of filtered) {
      const cardId = createFlashcard({
        frente: `${q.pergunta}\n\n${q.opcoes.map(o => `${o.letra}) ${o.texto}`).join('\n')}`,
        verso: `Gabarito: ${q.resposta_correta}\n\n${q.opcoes.find(o => o.correta)?.justificativa_correta || ''}`,
        materia: q.materia,
      });
      if (cardId) criados.push(cardId);
    }
    
    return criados.length;
  }, [questoes, createFlashcard]);
  
  const getEstatisticas = useCallback(() => {
    const porMateria = {};
    const porBanca = {};
    const porNivel = {};
    
    for (const q of questoes) {
      porMateria[q.materia] = (porMateria[q.materia] || 0) + 1;
      porBanca[q.banca] = (porBanca[q.banca] || 0) + 1;
      porNivel[q.nivel] = (porNivel[q.nivel] || 0) + 1;
    }
    
    return {
      total: questoes.length,
      porMateria,
      porBanca,
      porNivel,
    };
  }, [questoes]);
  
  const getQuestoesFiltradas = useCallback((filtros = {}) => {
    let resultado = [...questoes];
    
    if (filtros.materia) {
      resultado = resultado.filter(q => q.materia === filtros.materia);
    }
    if (filtros.banca) {
      resultado = resultado.filter(q => q.banca === filtros.banca);
    }
    if (filtros.topico) {
      resultado = resultado.filter(q => q.topico === filtros.topico);
    }
    if (filtros.tipo) {
      resultado = resultado.filter(q => q.tipo === filtros.tipo);
    }
    
    return resultado;
  }, [questoes]);
  
  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);
  
  return {
    questoes,
    carregando,
    progresso,
    erro,
    bancas,
    addBanca,
    removeBanca,
    processarTexto,
    gerarComIA,
    atualizarQuestao,
    deletarQuestao,
    criarFlashcards,
    criarTodosFlashcards,
    getEstatisticas,
    getQuestoesFiltradas,
    clearAll,
  };
}
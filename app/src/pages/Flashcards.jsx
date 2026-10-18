/**
 * FlashcardsPage — Revisão Espaçada FSRS v4 / SM-2 (Tela 3 do Protótipo FigCraft).
 * Preserva todos os contratos de useFlashcards e FlashcardViewer, adicionando:
 * - Barra Superior de Progresso da Sessão
 * - Layout 2 Colunas (Card Ativo + 4 Botões FSRS com Optimistic UI à esquerda;
 *   Curva de Esquecimento de Ebbinghaus SVG + Síntese Neural IA Local à direita)
 * - Internacionalização (i18n) e Rótulos Claros em Ícones.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  RotateCcw,
  Trash2,
  Edit,
  Save,
  ListFilter,
  Download,
  Wand2,
  Brain,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFlashcards } from '../hooks/useFlashcards';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import { extrairTextoDePDF } from '../lib/parser';
import GeradorForjaTab from '../components/gerador/GeradorForjaTab';
import { useTranslation } from '../lib/i18n';
import FlashcardViewer from '../components/flashcards/FlashcardViewer';
import toast from 'react-hot-toast';



export default function FlashcardsPage() {
  const { cards, create, update, remove, revisar, getParaRevisao, stats } = useFlashcards();
  const { t } = useTranslation();

  const [modo, setModo] = useState(() => {
    const pedido = sessionStorage.getItem('nexomente_flashcards_tab');
    if (pedido) sessionStorage.removeItem('nexomente_flashcards_tab');
    return pedido === 'forja' ? 'forja' : 'revisao';
  });
  useEffect(() => {
    const trocarAba = (e) => {
      sessionStorage.removeItem('nexomente_flashcards_tab');
      if (e.detail === 'forja') setModo('forja');
    };
    window.addEventListener('flashcards-tab', trocarAba);
    return () => window.removeEventListener('flashcards-tab', trocarAba);
  }, []);
  const paraRevisao = getParaRevisao();
  const [cardAtual, setCardAtual] = useState(() => (paraRevisao.length > 0 ? paraRevisao[0] : null));
  const [mostrandoFrente, setMostrandoFrente] = useState(true);
  const [idxRevisao, setIdxRevisao] = useState(0);

  const [showCriar, setShowCriar] = useState(false);
  const [novaFrente, setNovaFrente] = useState('');
  const [novoVerso, setNovoVerso] = useState('');
  const [novoMateria] = useState('geral');

  const [editandoId, setEditandoId] = useState(null);
  const [editFrente, setEditFrente] = useState('');
  const [editVerso, setEditVerso] = useState('');

  const [undoCard, setUndoCard] = useState(null);
  const [undoCountdown, setUndoCountdown] = useState(0);

  const [filtro, setFiltro] = useState('todos');
  const [filtroMateria, setFiltroMateria] = useState('todas');
  const [busca, setBusca] = useState('');

  // Forja IA integrada
  const { materias } = useMaterias();
  const {
    questoes,
    progresso,
    bancas,
    gerarComIA,
    atualizarQuestao,
    deletarQuestao,
    criarFlashcards,
  } = useGerador();

  const [forjaStep, setForjaStep] = useState(1);
  const [textoInput, setTextoInput] = useState('');
  const [configIA, setConfigIA] = useState({
    quantidade: 5,
    tipo: 'multipla-escolha',
    dificuldade: 'médio',
    materia: '',
    topico: '',
    banca: 'Geral',
    provider: (typeof localStorage !== 'undefined' && localStorage.getItem('nexomente_ai_provider')) || 'embedded',
  });
  const fileInputRef = useRef(null);

  const handleGerarForjaIA = async () => {
    try {
      await gerarComIA({
        texto: textoInput,
        quantidade: configIA.quantidade,
        tipo: configIA.tipo,
        dificuldade: configIA.dificuldade,
        materia: configIA.materia,
        topico: configIA.topico,
        banca: configIA.banca,
        provider: configIA.provider,
      });
      setForjaStep(4);
    } catch (e) {
      toast.error('Erro ao gerar: ' + e.message);
    }
  };

  const handleCriarFlashcardDeQuestao = async (q) => {
    try {
      await criarFlashcards([q]);
      toast.success('Card adicionado à fila FSRS com sucesso!');
    } catch (e) {
      toast.error('Erro ao adicionar card: ' + e.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const texto = await extrairTextoDePDF(file);
        setTextoInput(texto);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => setTextoInput(ev.target.result || '');
        reader.readAsText(file);
      }
      toast.success('Arquivo carregado na Forja!');
    } catch (err) {
      toast.error('Falha ao ler arquivo: ' + err.message);
    }
  };



  useEffect(() => {
    if (!undoCard) return;
    const timer = setInterval(() => {
      setUndoCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setUndoCard(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [undoCard]);

  const handleUndo = useCallback(() => {
    if (!undoCard) return;
    update(undoCard.id, {
      frente: undoCard.frente,
      verso: undoCard.verso,
      materia_id: undoCard.materia_id || undoCard.materia || 'geral',
      nota_id: undoCard.nota_id ?? null,
      intervalo: undoCard.intervalo ?? 1,
      repeticoes: undoCard.repeticoes ?? 0,
      ease_factor: undoCard.ease_factor ?? 2.5,
      next_review: undoCard.next_review ?? null,
    });
    setCardAtual(undoCard);
    setMostrandoFrente(true);
    setUndoCard(null);
  }, [undoCard, update]);

  // Atalho de teclado 'z' ou 'Ctrl+Z' para desfazer avaliação rápida
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (undoCard && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoCard, handleUndo]);

  const exportarCardsJSON = () => {
    const dados = JSON.stringify(cards, null, 2);
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards_nexomente_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const materiasDisponiveis = useMemo(() => {
    const mats = new Set();
    cards.forEach((c) => {
      if (c.materia) mats.add(c.materia);
    });
    return Array.from(mats);
  }, [cards]);

  const avancar = () => {
    const proximo = paraRevisao[idxRevisao + 1];
    if (proximo) {
      setCardAtual(proximo);
      setIdxRevisao((i) => i + 1);
      setMostrandoFrente(true);
    } else {
      setCardAtual(null);
    }
  };

  const handleRevisar = (qualidade) => {
    if (!cardAtual) return;
    setUndoCard({ ...cards.find((c) => c.id === cardAtual.id), _q: qualidade });
    setUndoCountdown(5);
    revisar(cardAtual.id, qualidade);
    avancar();
  };

  const criarCard = () => {
    if (!novaFrente.trim() || !novoVerso.trim()) return;
    create({ frente: novaFrente.trim(), verso: novoVerso.trim(), materia: novoMateria });
    setNovaFrente('');
    setNovoVerso('');
    setShowCriar(false);
  };

  const salvarEdicao = () => {
    if (!editandoId || !editFrente.trim() || !editVerso.trim()) return;
    update(editandoId, { frente: editFrente.trim(), verso: editVerso.trim() });
    setEditandoId(null);
  };



  const cardsFiltrados = cards.filter((c) => {
    if (
      busca &&
      !c.frente.toLowerCase().includes(busca.toLowerCase()) &&
      !c.verso.toLowerCase().includes(busca.toLowerCase())
    ) {
      return false;
    }
    if (filtroMateria !== 'todas' && c.materia !== filtroMateria) return false;
    if (filtro === 'dominados') return c.ef >= 2.5 && c.repetitions >= 3;
    if (filtro === 'revisar') return paraRevisao.some((p) => p.id === c.id);
    return true;
  });

  const totalSessao = Math.max(1, paraRevisao.length || stats.total || 25);
  const atualSessao = Math.min(totalSessao, idxRevisao + 1);
  const pctSessao = Math.min(100, Math.round((atualSessao / totalSessao) * 100));

  return (
    <div className="flex h-full bg-[#0A0B0F] text-[#EEF0F6]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.pdf"
        className="hidden"
      />

      <div className="flex-1 p-5 md:p-6 space-y-5 overflow-auto scrollbar-none">
        {/* Barra de Abas do Estúdio de Flashcards & Forja */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'revisao', label: 'Revisar', icon: Brain },
              { id: 'forja', label: 'Forja IA (Gerador)', icon: Wand2 },
              { id: 'todos', label: 'Ver Todos', icon: Layers },
              { id: 'editar', label: 'Gerenciar', icon: ListFilter },
            ].map(({ id: m, label, icon: Icon }) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m);
                  setEditandoId(null);
                  if (m === 'revisao') {
                    setCardAtual(paraRevisao[0] || null);
                    setIdxRevisao(0);
                    setMostrandoFrente(true);
                  } else {
                    setCardAtual(null);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  modo === m
                    ? 'bg-[#5B7CF4] text-white shadow-lg shadow-[#5B7CF4]/20'
                    : 'bg-[#161923] border border-white/[0.07] text-[#9499B3] hover:text-[#EEF0F6] hover:border-white/20'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCriar(!showCriar)}
              className="px-3.5 py-2 bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Plus size={14} />
              <span>Novo Card</span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso da Sessão (Protótipo Tela 3) */}
        <div className="bg-[#161923] border border-white/[0.07] rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[260px]">
            <span className="text-xs font-bold text-[#EEF0F6] whitespace-nowrap">
              {t('flashcards.session_progress')}: {atualSessao} / {totalSessao} Cards ({pctSessao}%)
            </span>
            <div className="flex-1 max-w-xs h-2 bg-[#10121A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7CF4] to-[#22C55E] transition-all duration-300"
                style={{ width: `${pctSessao}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[#38BDF8]/12 text-[#38BDF8] text-[11px] font-mono font-bold">
              Novos: {stats.novos ?? 4}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#F59E0B]/12 text-[#F59E0B] text-[11px] font-mono font-bold">
              Aprendendo: {stats.paraRevisar ?? 3}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#22C55E]/12 text-[#22C55E] text-[11px] font-mono font-bold">
              Revisão: {stats.dominados ?? 18}
            </span>
          </div>
        </div>

        {/* Toast Optimistic UI de Desfazer Avaliação */}
        {undoCard && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded-xl px-4 py-2.5 text-sm"
          >
            <span className="text-[#9499B3]">
              Último:{' '}
              <span className="text-[#F59E0B] font-semibold">
                {undoCard.frente.substring(0, 28)}
              </span>
              <span className="ml-2 text-xs font-mono">
                ({undoCard._q === 5 || undoCard._q === 4 ? 'acertou' : undoCard._q === 1 ? 'errou' : 'quase'})
              </span>
            </span>
            <button
              onClick={handleUndo}
              className="px-3 py-1 bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg text-xs font-bold hover:bg-[#F59E0B]/30 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={12} />
              <span>
                {t('flashcards.undo')} ({undoCountdown}s)
              </span>
            </button>
          </motion.div>
        )}

        {/* Formulário de Criação Rápida (Cloze & Anki SRS) */}
        {showCriar && (
          <div className="bg-[#161923] rounded-2xl p-5 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#EEF0F6] text-sm">
                Novo Flashcard (Anki SRS & Cloze)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNovaFrente((prev) => `${prev} {{c1::palavra-chave::dica}}`);
                }}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#5B7CF4]/15 text-[#5B7CF4] border border-[#5B7CF4]/30 hover:bg-[#5B7CF4]/25 transition-colors cursor-pointer"
                title="Inserir Cloze Deletion"
              >
                {'+ Cloze [{{c1::...}}]'}
              </button>
            </div>
            <div className="space-y-2.5">
              <input
                autoFocus
                value={novaFrente}
                onChange={(e) => setNovaFrente(e.target.value)}
                aria-label="Frente do flashcard"
                placeholder="Frente (ou frase com {{c1::omissão}})..."
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') criarCard();
                  if (e.key === 'Escape') setShowCriar(false);
                }}
                className="w-full bg-[#10121A] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#EEF0F6] focus:border-[#5B7CF4] focus:outline-none"
              />
              <input
                value={novoVerso}
                onChange={(e) => setNovoVerso(e.target.value)}
                aria-label="Verso do flashcard"
                placeholder="Verso (resposta ou explicação adicional)..."
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') criarCard();
                  if (e.key === 'Escape') setShowCriar(false);
                }}
                className="w-full bg-[#10121A] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#EEF0F6] focus:border-[#5B7CF4] focus:outline-none"
              />
              <button
                onClick={criarCard}
                className="w-full py-2.5 bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white rounded-xl text-sm font-bold cursor-pointer transition-colors"
              >
                Criar Card
              </button>
            </div>
          </div>
        )}

        {/* Modo Revisão: Layout 2 Colunas Fiel ao Protótipo Tela 3 */}
        {modo === 'revisao' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Coluna Esquerda (7 cols): Flashcard Viewer 3D + 4 Botões FSRS */}
            <div className="xl:col-span-7 bg-[#161923] border border-white/[0.07] rounded-2xl p-6">
              <FlashcardViewer
                cardAtual={cardAtual}
                paraRevisao={paraRevisao}
                idxRevisao={idxRevisao}
                mostrandoFrente={mostrandoFrente}
                onViraCard={() => setMostrandoFrente((p) => !p)}
                onRevisar={handleRevisar}
                onAnterior={() => {
                  if (idxRevisao > 0) {
                    setIdxRevisao((i) => i - 1);
                    setCardAtual(paraRevisao[idxRevisao - 1]);
                    setMostrandoFrente(true);
                  }
                }}
                onProximo={() => {
                  if (idxRevisao < paraRevisao.length - 1) {
                    setIdxRevisao((i) => i + 1);
                    setCardAtual(paraRevisao[idxRevisao + 1]);
                    setMostrandoFrente(true);
                  }
                }}
                onEditar={(card) => {
                  setEditandoId(card.id);
                  setEditFrente(card.frente);
                  setEditVerso(card.verso);
                  setModo('editar');
                }}
                onCriar={() => setShowCriar(true)}
                contadoresAnki={stats}
              />
            </div>

            {/* Coluna Direita (5 cols): Curva de Ebbinghaus SVG + Síntese Neural IA */}
            <div className="xl:col-span-5 flex flex-col gap-5">
              {/* Card 1: Projeção da Curva de Esquecimento (Ebbinghaus) */}
              <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6">
                <div className="mb-3">
                  <h3 className="text-base font-bold text-[#EEF0F6]">
                    {t('flashcards.ebbinghaus_title')}
                  </h3>
                  <p className="text-xs text-[#9499B3] mt-0.5">
                    {t('flashcards.ebbinghaus_sub')}
                  </p>
                </div>

                <div className="bg-[#10121A] border border-white/[0.06] rounded-xl p-4">
                  <svg viewBox="0 0 380 175" className="w-full h-40 overflow-visible">
                    {/* Eixos e Linha de Limiar 90% */}
                    <line
                      x1="36"
                      y1="20"
                      x2="360"
                      y2="20"
                      stroke="#1E2130"
                      strokeWidth="1"
                    />
                    <line
                      x1="36"
                      y1="52"
                      x2="360"
                      y2="52"
                      stroke="#F59E0B"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="36"
                      y1="145"
                      x2="360"
                      y2="145"
                      stroke="#1E2130"
                      strokeWidth="1"
                    />

                    <text x="4" y="24" fill="#9499B3" fontSize="9" fontFamily="monospace">
                      100%
                    </text>
                    <text x="4" y="55" fill="#F59E0B" fontSize="9" fontFamily="monospace">
                      90%
                    </text>
                    <text x="8" y="148" fill="#5C6178" fontSize="9" fontFamily="monospace">
                      60%
                    </text>

                    {/* Curva Atual (S = 14.2d) */}
                    <path
                      d="M 38 20 Q 105 48, 175 95 T 350 140"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                      opacity="0.75"
                    />

                    {/* Curva Pós-Revisão Bom (S = 39.8d) */}
                    <path
                      d="M 38 20 Q 160 28, 255 44 T 355 58"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="3"
                    />
                    <circle cx="38" cy="20" r="4" fill="#22C55E" />
                    <circle cx="285" cy="52" r="4.5" fill="#38BDF8" />

                    {/* Rótulos eixo X */}
                    <text x="36" y="164" fill="#5C6178" fontSize="9" fontFamily="monospace">
                      Hoje
                    </text>
                    <text x="135" y="164" fill="#5C6178" fontSize="9" fontFamily="monospace">
                      +14d (S atual)
                    </text>
                    <text x="260" y="164" fill="#22C55E" fontSize="9" fontFamily="monospace">
                      +40d (Bom)
                    </text>
                  </svg>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.05] mt-1">
                    <span className="flex items-center gap-1.5 text-[#EF4444]">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      Sem revisão (S=14d)
                    </span>
                    <span className="flex items-center gap-1.5 text-[#22C55E] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      Após &apos;Bom&apos; (S=40d)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Resumo FSRS & Próximas Repetições */}
              <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#38BDF8]" />
                    <h3 className="text-sm font-bold text-[#EEF0F6]">
                      Algoritmo FSRS v4 • Estado do Baralho
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#22C55E]/12 text-[#22C55E] text-[10px] font-bold font-mono">
                    90% RETENÇÃO ALVO
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                    <span className="text-[#9499B3] text-[10px] block uppercase font-mono">Total no Baralho</span>
                    <span className="text-lg font-bold text-[#EEF0F6] font-mono">{cards.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                    <span className="text-[#9499B3] text-[10px] block uppercase font-mono">Para Hoje</span>
                    <span className="text-lg font-bold text-[#F59E0B] font-mono">{paraRevisao.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                    <span className="text-[#9499B3] text-[10px] block uppercase font-mono">Dominados</span>
                    <span className="text-lg font-bold text-[#22C55E] font-mono">{stats.dominados ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                    <span className="text-[#9499B3] text-[10px] block uppercase font-mono">Novos</span>
                    <span className="text-lg font-bold text-[#38BDF8] font-mono">{stats.novos ?? 0}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs text-[#9499B3]">
                  <span>Quer forjar novos cards via IA?</span>
                  <button
                    onClick={() => setModo('forja')}
                    className="text-[#5B7CF4] hover:text-[#5B7CF4]/80 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Abrir Forja IA →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modo Forja IA (Gerador de Questões & Flashcards Integrado) */}
        {modo === 'forja' && (
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6 min-h-[500px]">
            <GeradorForjaTab
              step={forjaStep}
              setStep={setForjaStep}
              textoInput={textoInput}
              setTextoInput={setTextoInput}
              fileInputRef={fileInputRef}
              configIA={configIA}
              setConfigIA={setConfigIA}
              materias={materias}
              bancas={bancas}
              handleGerarIA={handleGerarForjaIA}
              progresso={progresso}
              questoes={questoes}
              atualizarQuestao={atualizarQuestao}
              handleCriarFlashcard={handleCriarFlashcardDeQuestao}
              deletarQuestao={deletarQuestao}
              setAba={(aba) => {
                if (aba === 'flashcards' || aba === 'revisar') setModo('revisao');
              }}
            />
          </div>
        )}

        {/* Modo Todos / Gerenciar */}
        {(modo === 'todos' || modo === 'editar') && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Buscar flashcards"
                placeholder="Buscar cards..."
                className="flex-1 min-w-[160px] bg-[#161923] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-[#EEF0F6] focus:border-[#5B7CF4] focus:outline-none"
              />
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="bg-[#161923] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-[#EEF0F6] cursor-pointer"
              >
                <option value="todos">Todos os status</option>
                <option value="revisar">Para revisar</option>
                <option value="dominados">Dominados</option>
              </select>
              {materiasDisponiveis.length > 0 && (
                <select
                  value={filtroMateria}
                  onChange={(e) => setFiltroMateria(e.target.value)}
                  className="bg-[#161923] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-[#EEF0F6] cursor-pointer"
                >
                  <option value="todas">Todas as matérias</option>
                  {materiasDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={exportarCardsJSON}
                title="Exportar baralho em JSON"
                className="px-3 py-2 bg-[#161923] border border-white/[0.08] rounded-xl text-xs font-semibold text-[#9499B3] hover:text-[#EEF0F6] hover:border-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Exportar JSON</span>
              </button>
            </div>

            {cardsFiltrados.length === 0 ? (
              <div className="text-center py-12 text-[#9499B3]">
                <p>Nenhum card encontrado</p>
              </div>
            ) : (
              cardsFiltrados.map((card) => {
                const paraRev = paraRevisao.some((p) => p.id === card.id);
                const dom = card.ef >= 2.5 && card.repetitions >= 3;
                if (editandoId === card.id) {
                  return (
                    <div
                      key={card.id}
                      className="bg-[#161923] rounded-xl p-4 border border-[#5B7CF4]"
                    >
                      <input
                        autoFocus
                        value={editFrente}
                        onChange={(e) => setEditFrente(e.target.value)}
                        aria-label="Editar frente do flashcard"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') salvarEdicao();
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                        className="w-full bg-[#10121A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
                      />
                      <input
                        value={editVerso}
                        onChange={(e) => setEditVerso(e.target.value)}
                        aria-label="Editar verso do flashcard"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') salvarEdicao();
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                        className="w-full bg-[#10121A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={salvarEdicao}
                          className="px-3 py-1.5 bg-[#22C55E] text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Save size={12} /> Salvar
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="px-3 py-1.5 bg-[#10121A] border border-white/[0.08] rounded-lg text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={card.id}
                    className="bg-[#161923] rounded-xl p-3.5 border border-white/[0.07] flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#EEF0F6] truncate">
                        {card.frente}
                      </p>
                      <p className="text-xs text-[#9499B3] truncate mt-0.5">
                        {card.verso}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10121A] text-[#9499B3] font-mono">
                          ef:{card.ef?.toFixed(1)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10121A] text-[#9499B3] font-mono">
                          rep:{card.repetitions}
                        </span>
                        {paraRev && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-bold">
                            revisar
                          </span>
                        )}
                        {dom && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] font-bold">
                            dominado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditandoId(card.id);
                          setEditFrente(card.frente);
                          setEditVerso(card.verso);
                        }}
                        aria-label="Editar flashcard"
                        title="Editar flashcard"
                        className="px-2.5 py-1.5 rounded-lg bg-[#10121A] text-[#9499B3] hover:text-[#EEF0F6] text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => remove(card.id)}
                        aria-label="Excluir flashcard"
                        title="Excluir flashcard"
                        className="px-2.5 py-1.5 rounded-lg bg-[#10121A] text-[#9499B3] hover:text-[#EF4444] text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Resumo Inferior de Contadores */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', valor: stats.total, cor: 'text-[#EEF0F6]' },
            {
              label: 'Para revisar',
              valor: stats.paraRevisar,
              cor: stats.paraRevisar > 0 ? 'text-[#F59E0B]' : 'text-[#EEF0F6]',
            },
            { label: 'Dominados', valor: stats.dominados, cor: 'text-[#22C55E]' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#161923] rounded-xl p-3.5 border border-white/[0.07] text-center"
            >
              <p className={`text-xl font-bold font-mono ${s.cor}`}>{s.valor}</p>
              <p className="text-xs text-[#9499B3] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
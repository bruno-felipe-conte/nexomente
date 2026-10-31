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
  UploadCloud,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFlashcards } from '../hooks/useFlashcards';
import { useNotes } from '../hooks/useNotes';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import { extrairTextoDePDF } from '../lib/parser';
import GeradorForjaTab from '../components/gerador/GeradorForjaTab';
import { useTranslation } from '../lib/i18n';
import FlashcardViewer from '../components/flashcards/FlashcardViewer';
import ImporterModal from '../components/common/ImporterModal';
import ankiSRS from '../features/flashcards/domain/ankiSrsEngine';
import { useFSRSConfigStore } from '../store/useFSRSConfigStore';
import toast from 'react-hot-toast';
import EmptyState from '../components/ui/EmptyState';



export default function FlashcardsPage() {
  const { cards, create, update, remove, revisar, getParaRevisao, stats } = useFlashcards();
  const { create: createNote } = useNotes();
  const { t } = useTranslation();
  const desiredRetention = useFSRSConfigStore((s) => s.desiredRetention) || 0.90;
  const [showImporter, setShowImporter] = useState(false);

  const [modo, setModo] = useState(() => {
    const pedido = sessionStorage.getItem('nexomente_flashcards_tab');
    if (pedido) sessionStorage.removeItem('nexomente_flashcards_tab');
    return pedido === 'forja' ? 'forja' : 'revisao';
  });
  useEffect(() => {
    const checkTab = () => {
      const pedido = sessionStorage.getItem('nexomente_flashcards_tab');
      if (pedido === 'forja') {
        sessionStorage.removeItem('nexomente_flashcards_tab');
        setModo('forja');
      }
      const texto = sessionStorage.getItem('nexomente_forja_texto');
      if (texto) {
        setTextoInput(texto);
        sessionStorage.removeItem('nexomente_forja_texto');
      }
    };
    checkTab();
    const trocarAba = (e) => {
      sessionStorage.removeItem('nexomente_flashcards_tab');
      if (e.detail === 'forja') setModo('forja');
      const texto = sessionStorage.getItem('nexomente_forja_texto');
      if (texto) {
        setTextoInput(texto);
        sessionStorage.removeItem('nexomente_forja_texto');
      }
    };
    window.addEventListener('flashcards-tab', trocarAba);
    return () => window.removeEventListener('flashcards-tab', trocarAba);
  }, []);
  const paraRevisao = getParaRevisao();
  const [cardAtual, setCardAtual] = useState(() => (paraRevisao.length > 0 ? paraRevisao[0] : null));
  const [mostrandoFrente, setMostrandoFrente] = useState(true);
  const [idxRevisao, setIdxRevisao] = useState(0);
  const [revisadosSessao, setRevisadosSessao] = useState(0);

  // Sincroniza cardAtual quando novos cards são criados ou a fila muda
  useEffect(() => {
    if (modo !== 'revisao') return;
    if (!cardAtual && paraRevisao.length > 0) {
      setCardAtual(paraRevisao[0]);
      setIdxRevisao(0);
      setMostrandoFrente(true);
    } else if (cardAtual && !cards.some((c) => c.id === cardAtual.id)) {
      setCardAtual(paraRevisao[0] || null);
    }
  }, [cards, paraRevisao, cardAtual, modo]);

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
  const [textoInput, setTextoInput] = useState(() => sessionStorage.getItem('nexomente_forja_texto') || '');
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
    setRevisadosSessao((r) => r + 1);
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

  const totalSessao = revisadosSessao + paraRevisao.length;
  const atualSessao = revisadosSessao;
  const pctSessao = totalSessao > 0 ? Math.min(100, Math.round((atualSessao / totalSessao) * 100)) : 0;

  // Cálculo matemático 100% real da Curva de Esquecimento de Ebbinghaus / FSRS
  const ebbinghausData = useMemo(() => {
    const retentionTarget = Math.max(0.70, Math.min(0.98, Number(desiredRetention) || 0.90));
    const targetPct = Math.round(retentionTarget * 100);
    const yFromRetention = (r) => {
      const clamped = Math.max(0.58, Math.min(1.0, r));
      return Number((20 + ((1.0 - clamped) / 0.40) * 125).toFixed(1));
    };
    const targetY = yFromRetention(retentionTarget);

    if (cards.length === 0) {
      return {
        hasData: false,
        targetPct,
        targetY,
        sAtual: 0,
        sBom: 0,
        pathAtual: '',
        pathBom: '',
        pointAtual: null,
        pointBom: null,
        sourceLabel: 'Sem cards cadastrados',
      };
    }

    let sAtual;
    let sBom;
    let sourceLabel = 'Média do baralho';

    if (cardAtual) {
      sAtual = Number(cardAtual.intervalo) > 0 ? Number(cardAtual.intervalo) : 1;
      const simBom = ankiSRS(cardAtual, 3);
      const ef = Number(cardAtual.ease_factor ?? cardAtual.ef ?? 2.5);
      sBom = Number(simBom.intervalo) > sAtual
        ? Number(simBom.intervalo)
        : Number(Math.max(sAtual + 1, sAtual * ef).toFixed(1));
      sourceLabel = 'Card em foco';
    } else {
      const sumS = cards.reduce((acc, c) => acc + (Number(c.intervalo) > 0 ? Number(c.intervalo) : 1), 0);
      const sumEf = cards.reduce((acc, c) => acc + Number(c.ease_factor ?? c.ef ?? 2.5), 0);
      sAtual = Number((sumS / cards.length).toFixed(1));
      const avgEf = sumEf / cards.length;
      sBom = Number(Math.max(sAtual + 1, sAtual * avgEf).toFixed(1));
    }

    const tMax = Math.max(5, sBom * 1.22);
    const xStart = 38;
    const xEnd = 355;
    const xSpan = xEnd - xStart;
    const xFromT = (t) => Number((xStart + Math.min(1, t / tMax) * xSpan).toFixed(1));

    // Decaimento exponencial calibrado para R(S, S) = retentionTarget
    const retentionAt = (t, s) => Math.pow(retentionTarget, t / Math.max(0.2, s));

    const steps = 28;
    const buildPath = (s) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = (tMax * i) / steps;
        const x = xFromT(t);
        const y = yFromRetention(retentionAt(t, s));
        pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
      }
      return pts.join(' ');
    };

    const formatDays = (d) => (Number.isInteger(d) ? `${d}d` : `${d.toFixed(1)}d`);

    return {
      hasData: true,
      targetPct,
      targetY,
      sAtual,
      sBom,
      sAtualLabel: formatDays(sAtual),
      sBomLabel: formatDays(sBom),
      pathAtual: buildPath(sAtual),
      pathBom: buildPath(sBom),
      pointAtual: { x: xFromT(sAtual), y: targetY },
      pointBom: { x: xFromT(sBom), y: targetY },
      sourceLabel,
    };
  }, [cards, cardAtual, desiredRetention]);

  return (
    <div className="flex h-full bg-nx-void text-nx-bright">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.pdf"
        className="hidden"
      />

      <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-5 overflow-auto scrollbar-none pb-24 lg:pb-6">
        {/* Barra de Abas do Estúdio de Flashcards & Forja */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nx-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'revisao', label: t('flashcards.tab.review', 'Revisar'), icon: Brain },
              { id: 'forja', label: t('flashcards.tab.forge', 'Forja IA'), icon: Wand2 },
              { id: 'todos', label: t('flashcards.deck.all', 'Ver Todos'), icon: Layers },
              { id: 'editar', label: t('flashcards.tab.manage', 'Gerenciar'), icon: ListFilter },
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
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  modo === m
                    ? 'nx-btn-primary shadow-sm'
                    : 'bg-nx-surface border border-nx-border text-nx-dim hover:text-nx-bright hover:bg-nx-depth'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImporter(true)}
              className="nx-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
              title="Importar Flashcards (frente;verso) ou Notas (.md)"
            >
              <UploadCloud size={14} className="text-[var(--nx-accent)]" />
              <span>{t('flashcards.btn.import', 'Importar em Lote')}</span>
            </button>
            <button
              onClick={() => setShowCriar(!showCriar)}
              className="nx-btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>{t('flashcards.btn.new', 'Novo Card')}</span>
            </button>
          </div>
        </div>

        <ImporterModal
          isOpen={showImporter}
          onClose={() => setShowImporter(false)}
          initialTab="flashcards"
          onImportCards={(validCards) => {
            validCards.forEach((c) => {
              create({
                frente: c.front,
                verso: c.back,
                materia_id: (c.deck || 'geral').toLowerCase(),
              });
            });
            toast.success(`${validCards.length} flashcard(s) importado(s) com sucesso!`);
            setShowImporter(false);
          }}
          onImportNotes={(parsedNotes) => {
            parsedNotes.forEach((n) => {
              createNote({
                titulo: n.title,
                conteudo: n.htmlContent || n.content,
                tipo: 'nota',
                pasta_id: 'pasta_raiz',
              });
            });
            toast.success(`${parsedNotes.length} nota(s) Markdown importada(s)!`);
            setShowImporter(false);
          }}
        />

        {/* Barra de Progresso da Sessão */}
        <div className="nx-sheet rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[260px]">
            <span className="text-xs font-bold text-nx-bright whitespace-nowrap">
              {t('flashcards.session_progress')}: {atualSessao} / {totalSessao} Cards ({pctSessao}%)
            </span>
            <div className="flex-1 max-w-xs h-2 bg-nx-depth rounded-full overflow-hidden border border-nx-border/50">
              <div
                className="h-full rounded-full bg-[var(--nx-accent)] transition-all duration-300"
                style={{ width: `${pctSessao}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[var(--nx-accent)]/15 text-[var(--nx-accent)] border border-[var(--nx-accent)]/25 text-[11px] font-mono font-bold">
              Novos: {stats.novos ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--nx-warning)]/15 text-[var(--nx-warning)] border border-[var(--nx-warning)]/25 text-[11px] font-mono font-bold">
              Aprendendo: {stats.aprendendo ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--nx-secondary)]/15 text-[var(--nx-secondary)] border border-[var(--nx-secondary)]/25 text-[11px] font-mono font-bold">
              Revisão: {stats.devidos ?? 0}
            </span>
          </div>
        </div>

        {/* Toast Optimistic UI de Desfazer Avaliação (Zero-CLS Fixed Floating Bar) */}
        {undoCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-nx-surface/95 backdrop-blur-md border border-[var(--nx-warning)]/40 rounded-2xl px-5 py-3 text-sm shadow-2xl select-none"
          >
            <span className="text-nx-dim whitespace-nowrap">
              Último:{' '}
              <span className="text-[var(--nx-warning)] font-semibold">
                {undoCard.frente.substring(0, 28)}
              </span>
              <span className="ml-2 text-xs font-mono">
                ({undoCard._q === 5 || undoCard._q === 4 ? 'acertou' : undoCard._q === 1 ? 'errou' : 'quase'})
              </span>
            </span>
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 bg-[var(--nx-warning)]/20 text-[var(--nx-warning)] rounded-lg text-xs font-bold hover:bg-[var(--nx-warning)]/30 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={12} />
              <span>
                {t('flashcards.undo')} ({undoCountdown}s)
              </span>
            </button>
          </motion.div>
        )}

        {/* Formulário de Criação Rápida */}
        {showCriar && (
          <div className="nx-sheet rounded-2xl p-5 border border-nx-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-nx-bright text-sm font-display">
                Novo Flashcard (Repetição Espaçada & Cloze)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNovaFrente((prev) => `${prev} {{c1::palavra-chave::dica}}`);
                }}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[var(--nx-accent)]/15 text-[var(--nx-accent)] border border-[var(--nx-accent)]/30 hover:bg-[var(--nx-accent)]/25 transition-colors cursor-pointer"
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
                className="w-full bg-nx-depth border border-nx-border rounded-xl px-3.5 py-2.5 text-sm text-nx-bright focus:border-[var(--nx-accent)] focus:outline-none"
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
                className="w-full bg-nx-depth border border-nx-border rounded-xl px-3.5 py-2.5 text-sm text-nx-bright focus:border-[var(--nx-accent)] focus:outline-none"
              />
              <button
                onClick={criarCard}
                className="w-full py-2.5 nx-btn-primary rounded-xl text-sm font-bold cursor-pointer"
              >
                Criar Card
              </button>
            </div>
          </div>
        )}

        {/* Modo Revisão: Layout 2 Colunas ou Empty State Acolhedor */}
        {modo === 'revisao' && (
          paraRevisao.length === 0 ? (
            <div className="nx-sheet rounded-2xl p-10 max-w-2xl mx-auto shadow-sm">
              <EmptyState
                icon={<span className="text-4xl select-none">🎉</span>}
                title="Baralho em dia! 🎉"
                description="Você revisou todos os cartões agendados para hoje."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setModo('forja')}
                      className="px-5 py-2.5 bg-nx-primary hover:bg-nx-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      Forjar Novos Cards
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))}
                      className="px-5 py-2.5 bg-nx-surface border border-nx-border hover:bg-nx-depth text-nx-bright rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      Ir para o Dashboard
                    </button>
                  </div>
                }
              />
            </div>
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Coluna Esquerda (7 cols): Flashcard Viewer Editorial + Botões */}
            <div className="xl:col-span-7 nx-sheet rounded-2xl p-6">
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
                onForjar={() => setModo('forja')}
                contadoresAnki={stats}
              />
            </div>

            {/* Coluna Direita (5 cols): Curva de Ebbinghaus SVG + Resumo FSRS */}
            <div className="xl:col-span-5 flex flex-col gap-5">
              {/* Card 1: Projeção da Curva de Esquecimento (Ebbinghaus) */}
              <div className="nx-sheet rounded-2xl p-6">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-nx-bright font-display">
                      {t('flashcards.ebbinghaus_title')}
                    </h3>
                    <p className="text-xs text-nx-dim mt-0.5">
                      {t('flashcards.ebbinghaus_sub')}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-nx-depth border border-nx-border text-[10px] font-mono text-nx-dim">
                    {ebbinghausData.sourceLabel}
                  </span>
                </div>

                <div className="bg-nx-depth border border-nx-border rounded-xl p-4">
                  <svg viewBox="0 0 380 175" className="w-full h-40 overflow-visible">
                    {/* Eixos e Linha de Limiar de Retenção Configurada */}
                    <line
                      x1="36"
                      y1="20"
                      x2="360"
                      y2="20"
                      stroke="var(--nx-border)"
                      strokeWidth="1"
                    />
                    <line
                      x1="36"
                      y1={ebbinghausData.targetY}
                      x2="360"
                      y2={ebbinghausData.targetY}
                      stroke="var(--nx-warning)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="36"
                      y1="145"
                      x2="360"
                      y2="145"
                      stroke="var(--nx-border)"
                      strokeWidth="1"
                    />

                    <text x="4" y="24" fill="var(--nx-dim)" fontSize="9" fontFamily="monospace">
                      100%
                    </text>
                    <text x="4" y={ebbinghausData.targetY + 3} fill="var(--nx-warning)" fontSize="9" fontFamily="monospace">
                      {ebbinghausData.targetPct}%
                    </text>
                    <text x="8" y="148" fill="var(--nx-dim)" fontSize="9" fontFamily="monospace">
                      60%
                    </text>

                    {ebbinghausData.hasData ? (
                      <>
                        {/* Curva Atual (S = sAtual) */}
                        <path
                          d={ebbinghausData.pathAtual}
                          fill="none"
                          stroke="var(--nx-error)"
                          strokeWidth="2"
                          opacity="0.85"
                        />

                        {/* Curva Pós-Revisão Bom (S = sBom) */}
                        <path
                          d={ebbinghausData.pathBom}
                          fill="none"
                          stroke="var(--nx-secondary)"
                          strokeWidth="3"
                        />
                        <circle cx="38" cy="20" r="4" fill="var(--nx-secondary)" />
                        {ebbinghausData.pointAtual && (
                          <circle
                            cx={ebbinghausData.pointAtual.x}
                            cy={ebbinghausData.pointAtual.y}
                            r="3.5"
                            fill="var(--nx-error)"
                          />
                        )}
                        {ebbinghausData.pointBom && (
                          <circle
                            cx={ebbinghausData.pointBom.x}
                            cy={ebbinghausData.pointBom.y}
                            r="4.5"
                            fill="var(--nx-accent)"
                          />
                        )}

                        {/* Rótulos eixo X dinâmicos */}
                        <text x="36" y="164" fill="var(--nx-dim)" fontSize="9" fontFamily="monospace">
                          Hoje
                        </text>
                        <text
                          x={Math.max(75, Math.min(200, (ebbinghausData.pointAtual?.x || 135) - 24))}
                          y="164"
                          fill="var(--nx-dim)"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          +{ebbinghausData.sAtualLabel} (S atual)
                        </text>
                        <text
                          x={Math.max(205, Math.min(285, (ebbinghausData.pointBom?.x || 260) - 25))}
                          y="164"
                          fill="var(--nx-secondary)"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          +{ebbinghausData.sBomLabel} (Bom)
                        </text>
                      </>
                    ) : (
                      <text
                        x="198"
                        y="92"
                        textAnchor="middle"
                        fill="var(--nx-dim)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        Crie seu 1º card para calcular a curva real
                      </text>
                    )}
                  </svg>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-nx-border mt-1">
                    <span className="flex items-center gap-1.5 text-[var(--nx-error)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--nx-error)]" />
                      {ebbinghausData.hasData
                        ? `Sem revisão (S=${ebbinghausData.sAtualLabel})`
                        : 'Sem revisão (S=0d)'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--nx-secondary)] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[var(--nx-secondary)]" />
                      {ebbinghausData.hasData
                        ? `Após 'Bom' (S=${ebbinghausData.sBomLabel})`
                        : "Após 'Bom' (S=0d)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Resumo FSRS & Próximas Repetições */}
              <div className="nx-sheet rounded-2xl p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--nx-accent)]" />
                    <h3 className="text-sm font-bold text-nx-bright font-display">
                      Repetição Espaçada • Estado do Baralho
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--nx-secondary)]/15 text-[var(--nx-secondary)] border border-[var(--nx-secondary)]/30 text-[10px] font-bold font-mono">
                    {ebbinghausData.targetPct}% RETENÇÃO ALVO
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                    <span className="text-nx-dim text-[10px] block uppercase font-mono">Total no Baralho</span>
                    <span className="text-lg font-bold text-nx-bright font-mono">{cards.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                    <span className="text-nx-dim text-[10px] block uppercase font-mono">Para Hoje</span>
                    <span className="text-lg font-bold text-[var(--nx-warning)] font-mono">{paraRevisao.length}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                    <span className="text-nx-dim text-[10px] block uppercase font-mono">Dominados</span>
                    <span className="text-lg font-bold text-[var(--nx-secondary)] font-mono">{stats.dominados ?? 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                    <span className="text-nx-dim text-[10px] block uppercase font-mono">Novos</span>
                    <span className="text-lg font-bold text-[var(--nx-accent)] font-mono">{stats.novos ?? 0}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-nx-border flex items-center justify-between text-xs text-nx-dim">
                  <span>Quer forjar novos cards via IA?</span>
                  <button
                    onClick={() => setModo('forja')}
                    className="text-[var(--nx-accent)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Abrir Forja IA →
                  </button>
                </div>
              </div>
            </div>
          </div>
          )
        )}

        {/* Modo Forja IA */}
        {modo === 'forja' && (
          <div className="nx-sheet rounded-2xl p-6 min-h-[500px]">
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
                className="flex-1 min-w-[160px] bg-nx-surface border border-nx-border rounded-xl px-3.5 py-2 text-sm text-nx-bright focus:border-[var(--nx-accent)] focus:outline-none"
              />
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="bg-nx-surface border border-nx-border rounded-xl px-3 py-2 text-sm text-nx-bright cursor-pointer"
              >
                <option value="todos">Todos os status</option>
                <option value="revisar">Para revisar</option>
                <option value="dominados">Dominados</option>
              </select>
              {materiasDisponiveis.length > 0 && (
                <select
                  value={filtroMateria}
                  onChange={(e) => setFiltroMateria(e.target.value)}
                  className="bg-nx-surface border border-nx-border rounded-xl px-3 py-2 text-sm text-nx-bright cursor-pointer"
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
                className="px-3 py-2 nx-btn-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Exportar JSON</span>
              </button>
            </div>

            {cardsFiltrados.length === 0 ? (
              <div className="text-center py-12 text-nx-dim">
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
                      className="nx-sheet rounded-xl p-4 border border-[var(--nx-accent)]"
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
                        className="w-full bg-nx-depth border border-nx-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
                      />
                      <input
                        value={editVerso}
                        onChange={(e) => setEditVerso(e.target.value)}
                        aria-label="Editar verso do flashcard"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') salvarEdicao();
                          if (e.key === 'Escape') setEditandoId(null);
                        }}
                        className="w-full bg-nx-depth border border-nx-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={salvarEdicao}
                          className="px-3 py-1.5 nx-btn-primary rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Save size={12} /> Salvar
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="px-3 py-1.5 bg-nx-depth border border-nx-border rounded-lg text-xs cursor-pointer text-nx-dim hover:text-nx-bright"
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
                    className="nx-sheet rounded-xl p-3.5 border border-nx-border flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-nx-bright truncate font-display">
                        {card.frente}
                      </p>
                      <p className="text-xs text-nx-dim truncate mt-0.5">
                        {card.verso}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-nx-depth text-nx-dim font-mono border border-nx-border/50">
                          ef:{card.ef?.toFixed(1)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-nx-depth text-nx-dim font-mono border border-nx-border/50">
                          rep:{card.repetitions}
                        </span>
                        {paraRev && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--nx-warning)]/15 text-[var(--nx-warning)] font-bold border border-[var(--nx-warning)]/30">
                            revisar
                          </span>
                        )}
                        {dom && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--nx-secondary)]/15 text-[var(--nx-secondary)] font-bold border border-[var(--nx-secondary)]/30">
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
                        className="px-2.5 py-1.5 rounded-lg bg-nx-depth text-nx-dim hover:text-nx-bright text-xs flex items-center gap-1 cursor-pointer border border-nx-border/50"
                      >
                        <Edit size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => remove(card.id)}
                        aria-label="Excluir flashcard"
                        title="Excluir flashcard"
                        className="px-2.5 py-1.5 rounded-lg bg-nx-depth text-nx-dim hover:text-[var(--nx-error)] text-xs flex items-center gap-1 cursor-pointer border border-nx-border/50"
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
      </div>
    </div>
  );
}
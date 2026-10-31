/**
 * @module Dashboard
 * @description Central Editorial do NexoMente — Estética Vanilla-Reader ("Papel & Café"):
 * Estruturado em 3 passos claros para eliminar sobrecarga visual e diferenciar
 * botões interativos (Nível 1), folhas de análise/dados (Nível 2) e notas editoriais (Nível 3):
 * 1. Passo 1 — Sumário do Dia ("Por onde começar"): Foco de Revisão FSRS + Notas Recentes do Caderno.
 * 2. Passo 2 — Panorama de Retenção: Ritmo de Estudo (7 Dias) + Estabilidade da Memória (Donut FSRS).
 * 3. Passo 3 — Leitura & Consistência: Canto Literário (Dojo) + Resumo Geral e Consistência Anual sob demanda.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Edit,
  Brain,
  Target,
  Trophy,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { usePoemas } from '../hooks/useMaterias';
import { useFlashcards } from '../hooks/useFlashcards';
import { useDBStore } from '../store/useDBStore';
import { useUIStore } from '../store/useUIStore';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useTranslation } from '../lib/i18n';
import ActivityHeatmap from '../components/gamification/ActivityHeatmap';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const { notas } = useNotes();
  const { poemas, registrarRecitacao } = usePoemas();
  const { cards, getParaRevisao, getDominados } = useFlashcards();
  const { SessoesEstudo } = useDBStore();
  const { setActiveTab, setPendingNoteAction } = useUIStore();
  const { t } = useTranslation();
  const tamagotchiStreak = useTamagotchiStore((s) => s.player?.streak || 0);

  const [showAnual, setShowAnual] = useState(() => {
    const pedido = sessionStorage.getItem('nexomente_dashboard_anual') === '1';
    if (pedido) sessionStorage.removeItem('nexomente_dashboard_anual');
    return pedido;
  });

  useEffect(() => {
    const abrir = () => {
      sessionStorage.removeItem('nexomente_dashboard_anual');
      setShowAnual(true);
    };
    window.addEventListener('dashboard-anual', abrir);
    return () => window.removeEventListener('dashboard-anual', abrir);
  }, []);

  const sessoes = useMemo(() => SessoesEstudo?.getAll() || [], [SessoesEstudo]);

  const sessoesEsteMes = useMemo(
    () =>
      sessoes.filter((s) => {
        if (!s.started_at) return false;
        const data = new Date(s.started_at);
        const agora = new Date();
        return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
      }),
    [sessoes]
  );

  const minutosEsteMes = sessoesEsteMes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);

  const notasEstaSemana = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return (notas || []).filter((n) => {
      const criado = n.criado_em ? new Date(n.criado_em) : null;
      return criado && criado >= seteDiasAtras;
    }).length;
  }, [notas]);

  const dominadosCount = useMemo(() => (getDominados ? getDominados().length : 0), [getDominados]);

  const { streakAtual, recordeStreak } = useMemo(() => {
    const datas = Array.from(
      new Set(sessoes.filter((s) => s.concluida && s.started_at).map((s) => s.started_at.split('T')[0]))
    )
      .sort()
      .reverse();

    let sessoesAtual = 0;
    const dHoje = new Date();
    const hoje = dHoje.toISOString().split('T')[0];
    const dOntem = new Date(dHoje.getTime() - 86400000);
    const ontem = dOntem.toISOString().split('T')[0];

    if (datas.length > 0 && (datas[0] === hoje || datas[0] === ontem)) {
      sessoesAtual = 1;
      for (let i = 1; i < datas.length; i++) {
        const diff = (new Date(datas[i - 1]) - new Date(datas[i])) / 86400000;
        if (Math.round(diff) === 1) sessoesAtual++;
        else break;
      }
    }

    let max = 0;
    let temp = 1;
    const datasCrescentes = [...datas].reverse();
    for (let i = 1; i < datasCrescentes.length; i++) {
      const diff = (new Date(datasCrescentes[i]) - new Date(datasCrescentes[i - 1])) / 86400000;
      if (Math.round(diff) === 1) temp++;
      else {
        max = Math.max(max, temp);
        temp = 1;
      }
    }
    const finalAtual = Math.max(tamagotchiStreak, sessoesAtual);
    max = Math.max(max, temp, finalAtual);

    return { streakAtual: finalAtual, recordeStreak: max };
  }, [sessoes, tamagotchiStreak]);

  const [currentPoemIndex, setCurrentPoemIndex] = useState(() => {
    const saved = localStorage.getItem('nexomente_dashboard_poem_idx');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [showDojo, setShowDojo] = useState(false);

  const poemasValidos = poemas || [];
  const safeIndex = poemasValidos.length > 0 ? currentPoemIndex % poemasValidos.length : 0;
  const poemaVigente = poemasValidos[safeIndex] || null;

  const nextPoem = (e) => {
    e?.stopPropagation();
    if (poemasValidos.length === 0) return;
    const next = (safeIndex + 1) % poemasValidos.length;
    setCurrentPoemIndex(next);
    localStorage.setItem('nexomente_dashboard_poem_idx', String(next));
  };

  const prevPoem = (e) => {
    e?.stopPropagation();
    if (poemasValidos.length === 0) return;
    const prev = (safeIndex - 1 + poemasValidos.length) % poemasValidos.length;
    setCurrentPoemIndex(prev);
    localStorage.setItem('nexomente_dashboard_poem_idx', String(prev));
  };

  const handleOpenNote = (id) => {
    setPendingNoteAction({ noteId: id });
    setActiveTab('notes');
  };

  const handleQuickCreateNote = () => {
    setPendingNoteAction({ action: 'create' });
    setActiveTab('notes');
  };

  // Métricas 100% reais do banco de dados
  const dueCards = (getParaRevisao?.() || []).length;
  const totalCards = (cards || []).length;
  const reviewedToday = Math.max(0, totalCards - dueCards);

  // Distribuição de maturidade FSRS real + geometria SVG dinâmica do Donut em paleta terrosa
  const maturity = useMemo(() => {
    const circumference = 2 * Math.PI * 54; // ~339.292
    if (!cards || cards.length === 0) {
      return {
        mature: 0,
        young: 0,
        learning: 0,
        newCards: 0,
        total: 0,
        retention: '0%',
        segments: [],
      };
    }
    let mature = 0;
    let young = 0;
    let learning = 0;
    let newCards = 0;
    let retentionSum = 0;
    let reviewedCount = 0;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();

    cards.forEach((c) => {
      const ivl = Number(c.intervalo || 0);
      const reps = Number(c.repeticoes || 0);
      if (reps === 0) {
        newCards++;
      } else {
        reviewedCount++;
        const s = Math.max(1, ivl);
        const lastRev = c.updated_at ? new Date(c.updated_at).getTime() : now;
        const elapsedDays = Math.max(0, (now - lastRev) / 86400000);
        const r = Math.pow(0.9, elapsedDays / s);
        retentionSum += r;

        if (ivl > 21) mature++;
        else if (ivl >= 4) young++;
        else learning++;
      }
    });

    const tot = cards.length;
    const avgRet = reviewedCount > 0 ? ((retentionSum / reviewedCount) * 100).toFixed(1) : '0.0';

    const rawParts = [
      { key: 'mature', val: mature, color: 'var(--nx-secondary)' },
      { key: 'young', val: young, color: 'var(--nx-primary)' },
      { key: 'learning', val: learning, color: 'var(--nx-accent)' },
      { key: 'new', val: newCards, color: 'var(--nx-info)' },
    ];

    let offsetAcc = 0;
    const segments = rawParts
      .filter((p) => p.val > 0)
      .map((p) => {
        const len = (p.val / tot) * circumference;
        const seg = {
          key: p.key,
          color: p.color,
          strokeDasharray: `${len.toFixed(2)} ${circumference.toFixed(2)}`,
          strokeDashoffset: (-offsetAcc).toFixed(2),
        };
        offsetAcc += len;
        return seg;
      });

    return {
      mature,
      young,
      learning,
      newCards,
      total: tot,
      retention: reviewedCount > 0 ? `${avgRet}%` : '0%',
      segments,
    };
  }, [cards]);

  // Agregação real dos últimos 7 dias para o gráfico de barras
  const { weeklyBars, maxWeeklyVal } = useMemo(() => {
    const diasKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const hoje = new Date();
    const bars = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = t(`common.days.${diasKeys[d.getDay()]}`);

      const cardsDia = (cards || []).filter((c) => {
        const dt = (c.updated_at || c.created_at || '').slice(0, 10);
        return dt === dateStr && Number(c.repeticoes || 0) > 0;
      }).length;

      const sessoesDia = (sessoes || []).filter((s) => (s.started_at || '').slice(0, 10) === dateStr);

      const recitacoesDia = poemasValidos.filter(
        (p) => (p.ultima_recitacao || '').slice(0, 10) === dateStr
      ).length;

      const notasDia = (notas || []).filter((n) => {
        const dt = (n.atualizado_em || n.criado_em || '').slice(0, 10);
        return dt === dateStr;
      }).length;

      bars.push({
        day: dayLabel,
        dateStr,
        fsrs: cardsDia + sessoesDia.length,
        dojo: recitacoesDia + notasDia,
      });
    }

    const maxVal = Math.max(8, ...bars.flatMap((b) => [b.fsrs, b.dojo]));
    const roundedMax = Math.ceil(maxVal / 4) * 4;
    return {
      weeklyBars: bars,
      maxWeeklyVal: roundedMax,
    };
  }, [cards, sessoes, poemasValidos, notas]);

  const sinapsesReais = useMemo(() => {
    if (!notas || notas.length === 0) return 0;
    let links = 0;
    notas.forEach((n) => {
      const matches = (n.conteudo || '').match(/\[\[([^\]]+)\]\]/g);
      if (matches) links += matches.length;
    });
    return links;
  }, [notas]);

  return (
    <div className="h-full overflow-y-auto scrollbar-none px-4 sm:px-6 md:px-8 py-6 flex flex-col gap-6 max-w-[1320px] mx-auto w-full pb-24 lg:pb-10">
      {showDojo && poemaVigente && (
        <PoemaRecitacao
          poema={poemaVigente}
          onFinish={() => {
            registrarRecitacao?.(poemaVigente.id);
            setShowDojo(false);
            toast.success('Sessão de leitura concluída!');
          }}
          onClose={() => setShowDojo(false)}
        />
      )}

      {/* ── PASSO 1: SUMÁRIO DO DIA ("POR ONDE COMEÇAR AGORA") ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card Principal: Revisão do Dia (7 colunas) */}
        <div className="lg:col-span-7 nx-sheet p-6 md:p-7 flex flex-col justify-between gap-5">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-nx-secondary">
              {t('dash.step1.tag')}
            </span>
            <h2 className="text-xl md:text-2xl font-display font-bold text-nx-bright mt-1">
              {dueCards > 0
                ? (dueCards === 1
                    ? t('dash.step1.dueCards_one', { count: dueCards })
                    : t('dash.step1.dueCards_other', { count: dueCards }))
                : totalCards > 0
                  ? t('dash.step1.allDone')
                  : t('dash.step1.emptyDeck')}
            </h2>
            <p className="text-sm text-nx-dim mt-1.5 leading-relaxed">
              {totalCards > 0
                ? t('dash.step1.progress', { reviewed: reviewedToday, total: totalCards })
                : t('dash.step1.createCardsDesc')}
            </p>
          </div>

          {/* Nota informativa em estilo citação de livro (Nível 3 — encarte rebaixado) */}
          <div className="nx-callout text-xs leading-relaxed">
            <strong className="font-semibold text-nx-bright">{t('dash.acervo.title')}</strong>{' '}
            <span>{totalCards} {t('dash.acervo.cards')}</span>
            <span className="mx-2 text-nx-muted">•</span>
            <span>{notas.length} {t('dash.acervo.notes')}</span>
            <span className="mx-2 text-nx-muted">•</span>
            <span>{sinapsesReais} {t('dash.acervo.synapses')}</span>
            <span className="mx-2 text-nx-muted">•</span>
            <span>{minutosEsteMes} {t('dash.acervo.focusMin')}</span>
          </div>

          {/* Ações Táteis Claras (Nível 1) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => setActiveTab('flashcards')}
              className="nx-btn-primary px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Brain size={15} />
              <span>{dueCards > 0 ? t('dash.step1.reviewNow', { count: dueCards }) : t('dash.step1.openDeck')}</span>
            </button>

            <button
              onClick={handleQuickCreateNote}
              className="nx-btn-secondary px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Edit size={14} className="text-nx-primary" />
              <span>{t('dash.step1.newNote')}</span>
            </button>
          </div>
        </div>

        {/* Coluna Direita: Caderno de Notas Recentes (5 colunas) */}
        <div className="lg:col-span-5 nx-sheet p-6 md:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-nx-dim">
                  {t('dash.notes.tag')}
                </span>
                <h2 className="text-lg font-display font-bold text-nx-bright mt-0.5">
                  {t('dash.notes.title')}
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('graph')}
                className="text-xs font-semibold text-nx-primary hover:underline cursor-pointer"
              >
                {t('dash.notes.viewGraph')} →
              </button>
            </div>

            {notas.length === 0 ? (
              <div className="py-8 text-center border-t border-b border-dashed border-nx-border my-2">
                <FileText size={22} className="mx-auto mb-2 text-nx-subtle" />
                <p className="text-xs text-nx-dim">{t('dash.notes.empty')}</p>
                <button
                  onClick={handleQuickCreateNote}
                  className="mt-2.5 text-xs font-semibold text-nx-primary hover:underline cursor-pointer"
                >
                  {t('dash.notes.createFirst')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-nx-border/70 border-t border-b border-nx-border/70">
                {notas.slice(0, 3).map((nota) => {
                  const cardsDaNota = (cards || []).filter((c) => c.nota_id === nota.id).length;
                  return (
                    <button
                      key={nota.id}
                      onClick={() => handleOpenNote(nota.id)}
                      className="w-full py-3 px-2 flex items-center justify-between gap-3 text-left hover:bg-nx-overlay/50 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-display font-semibold text-nx-bright group-hover:text-nx-primary transition-colors truncate">
                          {nota.titulo || t('dash.notes.noTitle')}
                        </div>
                        <div className="text-[11px] text-nx-dim truncate mt-0.5">
                          #{nota.tipo || 'nota'}
                          {cardsDaNota > 0 ? ` • ${t('dash.notes.linkedCards', { count: cardsDaNota })}` : ''}
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className="text-nx-subtle group-hover:text-nx-primary transition-transform group-hover:translate-x-0.5 shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-between text-xs text-nx-dim">
            <span>{t('dash.notes.thisWeek', { count: notasEstaSemana })}</span>
            <button
              onClick={() => setActiveTab('notes')}
              className="font-semibold text-nx-text hover:text-nx-primary cursor-pointer"
            >
              {t('dash.notes.openAll')}
            </button>
          </div>
        </div>
      </section>

      {/* ── PASSO 2: PANORAMA DE ESTUDO & ESTABILIDADE DA MEMÓRIA (DADOS REAIS) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Barras 7 Dias (7 colunas) */}
        <div className="lg:col-span-7 nx-sheet p-6 md:p-7 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-nx-dim">
                {t('dash.step2.tag')}
              </span>
              <h2 className="text-lg font-display font-bold text-nx-bright mt-0.5">
                {t('dash.chart.title')}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-nx-primary" />
                <span className="text-nx-dim">{t('dash.chart.leg.fsrs')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-nx-secondary" />
                <span className="text-nx-dim">{t('dash.chart.leg.dojo')}</span>
              </div>
            </div>
          </div>

          <div className="relative h-[180px] flex items-end justify-between pt-3 pb-6 px-4 border-b border-nx-border">
            {[
              maxWeeklyVal,
              Math.round(maxWeeklyVal * 0.75),
              Math.round(maxWeeklyVal * 0.5),
              Math.round(maxWeeklyVal * 0.25),
            ].map((lvl, idx) => (
              <div
                key={`${lvl}-${idx}`}
                className="absolute left-0 right-0 border-t border-nx-border/50 flex items-center pointer-events-none"
                style={{ top: `${idx * 25}%` }}
              >
                <span className="text-[10px] font-mono text-nx-subtle -mt-4">{lvl}</span>
              </div>
            ))}

            {weeklyBars.map((d) => {
              const hFsrs = d.fsrs > 0 ? Math.max(6, Math.round((d.fsrs / maxWeeklyVal) * 130)) : 2;
              const hDojo = d.dojo > 0 ? Math.max(6, Math.round((d.dojo / maxWeeklyVal) * 130)) : 2;
              return (
                <div key={d.dateStr} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                  <div className="flex items-end gap-1.5 h-[135px]">
                    <div
                      className="w-4 sm:w-5 rounded-t-[4px] transition-all duration-300"
                      style={{
                        height: `${hFsrs}px`,
                        opacity: d.fsrs > 0 ? 0.92 : 0.25,
                        backgroundColor: 'var(--nx-primary)',
                      }}
                      title={`${d.day} (${d.dateStr}): ${d.fsrs} revisões/sessões`}
                    />
                    <div
                      className="w-4 sm:w-5 rounded-t-[4px] transition-all duration-300"
                      style={{
                        height: `${hDojo}px`,
                        opacity: d.dojo > 0 ? 0.92 : 0.25,
                        backgroundColor: 'var(--nx-secondary)',
                      }}
                      title={`${d.day} (${d.dateStr}): ${d.dojo} notas/leituras`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-nx-dim -mb-5">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estabilidade da Memória FSRS (5 colunas) */}
        <div className="lg:col-span-5 nx-sheet p-6 md:p-7 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-nx-dim">
              Distribuição do Baralho
            </span>
            <h2 className="text-lg font-display font-bold text-nx-bright mt-0.5">
              {t('dash.donut.title')}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-5 my-4">
            <div className="relative w-[136px] h-[136px] flex items-center justify-center shrink-0">
              <svg width="136" height="136" viewBox="0 0 144 144" className="-rotate-90">
                <circle cx="72" cy="72" r="54" fill="none" stroke="var(--nx-overlay)" strokeWidth="16" />
                {maturity.segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="72"
                    cy="72"
                    r="54"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-display font-bold text-nx-bright leading-none">
                  {maturity.retention}
                </span>
                <span className="text-[10.5px] text-nx-dim mt-1">{t('dash.donut.retention')}</span>
              </div>
            </div>

            <div className="flex-1 divide-y divide-nx-border/60 text-xs">
              {[
                { label: t('dash.donut.mature'), val: maturity.mature, color: 'var(--nx-secondary)' },
                { label: t('dash.donut.young'), val: maturity.young, color: 'var(--nx-primary)' },
                { label: t('dash.donut.learning'), val: maturity.learning, color: 'var(--nx-accent)' },
                { label: t('dash.donut.new'), val: maturity.newCards, color: 'var(--nx-info)' },
              ].map((item) => (
                <div key={item.label} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-nx-text truncate">{item.label}</span>
                  </div>
                  <span className="font-mono font-semibold text-nx-bright">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-nx-border/60 flex items-center justify-between text-xs text-nx-dim">
            <span>{t('dash.donut.total')}: {maturity.total}</span>
            <button
              onClick={() => setActiveTab('flashcards')}
              className="font-semibold text-nx-primary hover:underline cursor-pointer"
            >
              {t('dash.donut.btn')}
            </button>
          </div>
        </div>
      </section>

      {/* ── PASSO 3: LEITURA POÉTICA (DOJO) & CONSISTÊNCIA ANUAL SOB DEMANDA ── */}
      <section className="nx-sheet p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen size={14} className="text-nx-secondary" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-nx-secondary">
              {t('dash.step3.tag')} ({t('dash.dojo.tag')})
            </span>
            {poemasValidos.length > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={prevPoem}
                  className="p-1 rounded hover:bg-nx-overlay text-nx-dim hover:text-nx-bright cursor-pointer"
                  title="Poema anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] font-mono text-nx-dim">
                  {safeIndex + 1}/{poemasValidos.length}
                </span>
                <button
                  onClick={nextPoem}
                  className="p-1 rounded hover:bg-nx-overlay text-nx-dim hover:text-nx-bright cursor-pointer"
                  title="Próximo poema"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          <h3 className="text-lg font-display font-bold text-nx-bright">
            {poemaVigente ? poemaVigente.titulo : t('dash.step3.emptyPoems')}
          </h3>
          <blockquote className="mt-2 pl-3.5 border-l-2 border-nx-secondary/60 text-sm font-display italic text-nx-dim line-clamp-2">
            {poemaVigente
              ? `“${poemaVigente.corpo.split('\n').slice(0, 2).join(' / ')}”`
              : 'Cadastre seus poemas, citações ou discursos favoritos para leitura contemplativa e treino de dicção.'}
          </blockquote>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAnual((v) => !v)}
            aria-expanded={showAnual}
            className="nx-btn-secondary px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp size={14} className="text-nx-secondary" />
            <span>{showAnual ? 'Ocultar Consistência Anual' : t('dash.annual.toggleOpen')}</span>
          </button>

          <button
            onClick={() => (poemaVigente ? setShowDojo(true) : setActiveTab('poemas'))}
            className="nx-btn-primary px-5 py-2.5 text-xs cursor-pointer"
          >
            {poemaVigente ? t('dash.dojo.cta') : 'Abrir Antologia'}
          </button>
        </div>
      </section>

      {/* ── SEÇÃO COLAPSÁVEL: CONSISTÊNCIA ANUAL & METAS ── */}
      {showAnual && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 nx-sheet p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-nx-secondary" />
                <h3 className="text-base font-display font-bold text-nx-bright">
                  {t('dash.annual.toggleOpen')}
                </h3>
              </div>
              <span className="text-xs font-mono text-nx-dim">
                {t('dash.annual.streakActive')}: <strong className="text-nx-accent">{streakAtual} {t('header.streak.days')}</strong> • {t('dash.annual.streakRecord')}:{' '}
                {recordeStreak}
              </span>
            </div>
            <ActivityHeatmap sessoes={sessoes} />
          </div>

          <div className="lg:col-span-4 nx-sheet p-6 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-nx-primary" />
                <h3 className="text-base font-display font-bold text-nx-bright">{t('dash.annual.monthlyFocus')}</h3>
              </div>
              <div className="space-y-4">
                <DashboardGoalProgress
                  label="Tempo de Foco"
                  current={minutosEsteMes}
                  target={500}
                  unit="min"
                  color="var(--nx-secondary)"
                />
                <DashboardGoalProgress
                  label="Notas na Semana"
                  current={notasEstaSemana}
                  target={10}
                  unit="notas"
                  color="var(--nx-primary)"
                />
                <DashboardGoalProgress
                  label={t('dash.annual.masteredCards')}
                  current={dominadosCount}
                  target={Math.max(totalCards, 10)}
                  unit="cards"
                  color="var(--nx-accent)"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-nx-border/70">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={15} className="text-nx-accent" />
                <span className="text-xs font-display font-bold text-nx-bright">Próximos Marcos</span>
              </div>
              <p className="text-xs text-nx-dim">
                Maratonista: <strong className="font-mono text-nx-text">{streakAtual}/7 dias</strong> •
                Polímata: <strong className="font-mono text-nx-text">{notas.length}/50 notas</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardGoalProgress({ label, current, target, unit, color }) {
  const percent = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-nx-dim">{label}</span>
        <span className="text-nx-bright font-mono">
          {current} / {target} {unit}
        </span>
      </div>
      <div className="h-2 w-full bg-nx-overlay rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

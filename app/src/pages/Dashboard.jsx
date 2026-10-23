/**
 * @module Dashboard
 * @description Tela 1 do Protótipo Oficial FigCraft ("Dashboard — Visão Geral"):
 * - Linha 1: 4 Cards de KPI com Sparklines vetoriais SVG (Flashcards FSRS, Precisão Fonética, Sinapses no Grafo, Evolução Cognitiva XP)
 * - Linha 2: Gráfico de Barras Agrupadas (Ritmo de Estudo & Retenção Neural - 7 Dias) + Gráfico Donut Multi-Segmento (Estabilidade da Memória FSRS)
 * - Linha 3: Notas Recentes & Conexões Geradas por IA + Card Spotlight do Dojo de Recitação com Mini Waveform e modal PoemaRecitacao
 */
import { useState, useMemo, useEffect } from 'react';
import {
  FileText, ChevronRight, ChevronLeft, Edit, Brain, Target, Trophy, TrendingUp
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { usePoemas } from '../hooks/useMaterias';
import { useFlashcards } from '../hooks/useFlashcards';
import { useDBStore } from '../store/useDBStore';
import { useUIStore } from '../store/useUIStore';
import { useTranslation } from '../lib/i18n';
import ActivityHeatmap from '../components/gamification/ActivityHeatmap';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import { toast } from 'react-hot-toast';

function SparklineSVG({ values, color, id }) {
  const w = 96;
  const h = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-5, max - min);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 5 - ((v - min) / span) * (h - 10);
    return [x, y];
  });
  const polyline = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${polyline} ${w},${h} 0,${h}`;
  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${id})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}

export default function Dashboard() {
  const { notas } = useNotes();
  const { poemas, registrarRecitacao } = usePoemas();
  const { cards, getParaRevisao, getDominados } = useFlashcards();
  const { SessoesEstudo } = useDBStore();
  const { setActiveTab, setPendingNoteAction } = useUIStore();
  const { t } = useTranslation();

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

  // Telemetria de longo prazo fundida de Statistics
  const sessoesEsteMes = useMemo(() => sessoes.filter(s => {
    if (!s.started_at) return false;
    const data = new Date(s.started_at);
    const agora = new Date();
    return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
  }), [sessoes]);

  const minutosEsteMes = sessoesEsteMes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);

  const notasEstaSemana = useMemo(() => {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return (notas || []).filter(n => {
      const criado = n.criado_em ? new Date(n.criado_em) : null;
      return criado && criado >= seteDiasAtras;
    }).length;
  }, [notas]);

  const dominadosCount = useMemo(() => (getDominados ? getDominados().length : 0), [getDominados]);

  const { streakAtual, recordeStreak } = useMemo(() => {
    const datas = Array.from(new Set(
      sessoes
        .filter(s => s.concluida && s.started_at)
        .map(s => s.started_at.split('T')[0])
    )).sort().reverse();

    if (datas.length === 0) return { streakAtual: 0, recordeStreak: 0 };

    let atual = 0;
    const dHoje = new Date();
    const hoje = dHoje.toISOString().split('T')[0];
    const dOntem = new Date(dHoje.getTime() - 86400000);
    const ontem = dOntem.toISOString().split('T')[0];

    if (datas[0] === hoje || datas[0] === ontem) {
      atual = 1;
      for (let i = 1; i < datas.length; i++) {
        const diff = (new Date(datas[i-1]) - new Date(datas[i])) / 86400000;
        if (Math.round(diff) === 1) atual++;
        else break;
      }
    }

    let max = 0;
    let temp = 1;
    const datasCrescentes = [...datas].reverse();
    for (let i = 1; i < datasCrescentes.length; i++) {
      const diff = (new Date(datasCrescentes[i]) - new Date(datasCrescentes[i-1])) / 86400000;
      if (Math.round(diff) === 1) temp++;
      else {
        max = Math.max(max, temp);
        temp = 1;
      }
    }
    max = Math.max(max, temp, atual);

    return { streakAtual: atual, recordeStreak: max };
  }, [sessoes]);

  const [currentPoemIndex, setCurrentPoemIndex] = useState(() => {
    const saved = localStorage.getItem('nexomente_dashboard_poem_idx');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [showDojo, setShowDojo] = useState(false);

  const poemasValidos = poemas || [];
  const safeIndex = poemasValidos.length > 0 ? (currentPoemIndex % poemasValidos.length) : 0;
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

  // Métricas 100% reais do banco de dados (sem valores fictícios)
  const dueCards = (getParaRevisao?.() || []).length;
  const totalCards = (cards || []).length;
  const reviewedToday = Math.max(0, totalCards - dueCards);

  // Distribuição de maturidade FSRS real + geometria SVG dinâmica do Donut
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
      { key: 'mature', val: mature, color: '#22C55E' },
      { key: 'young', val: young, color: '#5B7CF4' },
      { key: 'learning', val: learning, color: '#F59E0B' },
      { key: 'new', val: newCards, color: '#38BDF8' },
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

  // Agregação real dos últimos 7 dias para o gráfico de barras e sparklines
  const { weeklyBars, maxWeeklyVal, focusSeries7d, notesSeries7d } = useMemo(() => {
    const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();
    const bars = [];
    const focus7d = [];
    const notes7d = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = diasNomes[d.getDay()];

      const cardsDia = (cards || []).filter((c) => {
        const dt = (c.updated_at || c.created_at || '').slice(0, 10);
        return dt === dateStr && Number(c.repeticoes || 0) > 0;
      }).length;

      const sessoesDia = (sessoes || []).filter(
        (s) => (s.started_at || '').slice(0, 10) === dateStr
      );
      const minutosDia = sessoesDia.reduce((acc, s) => acc + Number(s.duracao_minutos || 0), 0);

      const recitacoesDia = poemasValidos.filter(
        (p) => (p.ultima_recitacao || '').slice(0, 10) === dateStr
      ).length;

      const notasDia = (notas || []).filter((n) => {
        const dt = (n.atualizado_em || n.criado_em || '').slice(0, 10);
        return dt === dateStr;
      }).length;

      const notasAteDia = (notas || []).filter((n) => {
        const dt = (n.criado_em || n.atualizado_em || '').slice(0, 10);
        return !dt || dt <= dateStr;
      }).length;

      bars.push({
        day: dayLabel,
        dateStr,
        fsrs: cardsDia + sessoesDia.length,
        dojo: recitacoesDia + notasDia,
      });
      focus7d.push(minutosDia);
      notes7d.push(notasAteDia);
    }

    const maxVal = Math.max(8, ...bars.flatMap((b) => [b.fsrs, b.dojo]));
    const roundedMax = Math.ceil(maxVal / 4) * 4;
    return {
      weeklyBars: bars,
      maxWeeklyVal: roundedMax,
      focusSeries7d: focus7d,
      notesSeries7d: notes7d,
    };
  }, [cards, sessoes, poemasValidos, notas]);

  // Sinapses reais no Grafo (conexões [[wikilinks]] + tags compartilhadas)
  const sinapsesReais = useMemo(() => {
    if (!notas || notas.length === 0) return 0;
    let links = 0;
    notas.forEach((n) => {
      const matches = (n.conteudo || '').match(/\[\[([^\]]+)\]\]/g);
      if (matches) links += matches.length;
    });
    return links;
  }, [notas]);

  // Telemetria real do Dojo de Oratória
  const dojoMetrics = useMemo(() => {
    const totalStreaks = poemasValidos.reduce((acc, p) => acc + Number(p.streak_recitacao || 0), 0);
    const savedAcc = Number(localStorage.getItem('nexomente_last_whisper_acc') || 0);
    if (totalStreaks === 0 && savedAcc === 0) {
      return {
        value: '0%',
        delta: 'Nenhuma recitação realizada',
        series: [0, 0, 0, 0, 0, 0, 0],
      };
    }
    const displayAcc = savedAcc > 0 ? `${savedAcc.toFixed(1)}%` : `${totalStreaks} recitações`;
    return {
      value: displayAcc,
      delta: `${poemasValidos.length} ${poemasValidos.length === 1 ? 'poema no Dojo' : 'poemas no Dojo'}`,
      series: weeklyBars.map((b) => b.dojo),
    };
  }, [poemasValidos, weeklyBars]);

  const kpiCards = [
    {
      id: 'fsrs',
      label: t('dash.kpi.fsrs'),
      value: `${reviewedToday} / ${totalCards}`,
      delta: totalCards > 0 ? `${dueCards} pendente(s) hoje` : 'Nenhum card cadastrado',
      color: '#5B7CF4',
      series: weeklyBars.map((b) => b.fsrs),
      onClick: () => setActiveTab('flashcards'),
    },
    {
      id: 'whisper',
      label: t('dash.kpi.whisper'),
      value: dojoMetrics.value,
      delta: dojoMetrics.delta,
      color: '#22C55E',
      series: dojoMetrics.series,
      onClick: () => setActiveTab('poemas'),
    },
    {
      id: 'graph',
      label: t('dash.kpi.graph'),
      value: String(notas.length),
      delta: `${sinapsesReais} sinapse(s) • +${notasEstaSemana} na semana`,
      color: '#38BDF8',
      series: notesSeries7d,
      onClick: () => setActiveTab('graph'),
    },
    {
      id: 'focus',
      label: 'Tempo de Foco (Mês)',
      value: `${minutosEsteMes} min`,
      delta: `Meta: 500 min (${Math.min(100, Math.round((minutosEsteMes / 500) * 100))}%)`,
      color: '#F59E0B',
      series: focusSeries7d,
      onClick: () => setShowAnual(true),
    },
  ];

  const waveformHeights = [14, 22, 36, 48, 30, 54, 42, 26, 40, 58, 46, 32, 50, 38, 24, 18, 34, 48, 28, 16];

  return (
    <div className="h-full overflow-y-auto scrollbar-none px-4 md:px-7 py-4 md:py-5 flex flex-col gap-3.5 md:gap-4 max-w-[1440px] mx-auto w-full pb-8 lg:pb-4">
      {showDojo && poemaVigente && (
        <PoemaRecitacao
          poema={poemaVigente}
          onFinish={() => {
            registrarRecitacao?.(poemaVigente.id);
            setShowDojo(false);
            toast.success('Dojo concluído!');
          }}
          onClose={() => setShowDojo(false)}
        />
      )}

      {/* Barra de ferramentas da seção: único gatilho de criação + alternador analítico */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="text-xs text-nx-dim font-medium truncate">
          Visão geral do seu Segundo Cérebro • Retenção FSRS e Sinapses Ativas
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleQuickCreateNote}
            className="px-3 py-1.5 rounded-[8px] bg-nx-surface border border-nx-border hover:border-nx-primary text-[11px] font-semibold text-nx-text hover:text-nx-bright flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Edit size={12} className="text-nx-primary" />
            <span>+ Nova Nota</span>
          </button>
          <button
            onClick={() => setShowAnual((v) => !v)}
            aria-expanded={showAnual}
            className="px-3 py-1.5 rounded-[8px] bg-nx-surface border border-nx-border hover:border-nx-secondary text-[11px] font-semibold text-nx-text hover:text-nx-bright flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <TrendingUp size={12} className="text-nx-secondary" />
            <span className="hidden sm:inline">{showAnual ? 'Ocultar Consistência Anual' : 'Consistência Anual & Metas'}</span>
            <span className="sm:hidden">Metas</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 4 KPI CARDS WITH SPARKLINES (Responsivo 2x2 em telas médias e 4x1 em desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.id}
            onClick={kpi.onClick}
            className="relative rounded-[16px] bg-nx-surface border border-nx-border hover:border-nx-primary/60 p-4 md:p-5 transition-all cursor-pointer shadow-sm group overflow-hidden"
          >
            {/* Top accent strip */}
            <div
              className="absolute top-0 left-4 md:left-5 w-10 md:w-12 h-[3px] rounded-b"
              style={{ backgroundColor: kpi.color }}
            />
            <div className="text-[11px] md:text-[12px] font-medium text-nx-dim mb-1.5 truncate">
              {kpi.label}
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[22px] md:text-[26px] font-display font-bold text-nx-bright tracking-tight leading-none mb-1.5 md:mb-2 truncate">
                  {kpi.value}
                </div>
                <div className="text-[10px] md:text-[11px] font-semibold truncate" style={{ color: kpi.color }}>
                  {kpi.delta}
                </div>
              </div>
              <div className="shrink-0 hidden xs:block">
                <SparklineSVG values={kpi.series} color={kpi.color} id={kpi.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: RITMO DE ESTUDO (7 DIAS) + ESTABILIDADE DA MEMÓRIA DONUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-4.5">
        {/* Left: Grouped Bar Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-[16px] bg-nx-surface border border-nx-border p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] md:text-[16px] font-display font-bold text-nx-bright">
                {t('dash.chart.title')}
              </h2>
              <p className="text-[11.5px] md:text-[12px] text-nx-dim mt-0.5">
                {t('dash.chart.sub')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] md:text-[11.5px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-nx-primary" />
                <span className="text-nx-text font-medium">{t('dash.chart.leg.fsrs')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-nx-secondary" />
                <span className="text-nx-text font-medium">{t('dash.chart.leg.dojo')}</span>
              </div>
            </div>
          </div>

          {/* Bars Plot */}
          <div className="relative h-[180px] flex items-end justify-between pt-3 pb-5 px-3 md:px-4 border-b border-nx-border">
            {/* Horizontal grid lines */}
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
              const hFsrs = d.fsrs > 0 ? Math.max(6, Math.round((d.fsrs / maxWeeklyVal) * 135)) : 2;
              const hDojo = d.dojo > 0 ? Math.max(6, Math.round((d.dojo / maxWeeklyVal) * 135)) : 2;
              return (
                <div key={d.dateStr} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                  <div className="flex items-end gap-1.5 h-[140px]">
                    <div
                      className="w-3.5 sm:w-5 rounded-t-[5px] transition-all duration-300 hover:brightness-110"
                      style={{
                        height: `${hFsrs}px`,
                        opacity: d.fsrs > 0 ? 1 : 0.25,
                        background: 'linear-gradient(180deg, var(--nx-primary) 0%, #3B53B8 100%)',
                      }}
                      title={`${d.day} (${d.dateStr}): ${d.fsrs} revisões/sessões`}
                    />
                    <div
                      className="w-3.5 sm:w-5 rounded-t-[5px] transition-all duration-300 hover:brightness-110"
                      style={{
                        height: `${hDojo}px`,
                        opacity: d.dojo > 0 ? 1 : 0.25,
                        background: 'linear-gradient(180deg, var(--nx-secondary) 0%, #1D7FA8 100%)',
                      }}
                      title={`${d.day} (${d.dateStr}): ${d.dojo} notas/recitações`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-nx-dim -mb-4">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: FSRS Memory Stability Donut Card (4 cols) */}
        <div className="lg:col-span-4 rounded-[16px] bg-nx-surface border border-nx-border p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="text-[16px] font-display font-bold text-nx-bright">
              {t('dash.donut.title')}
            </h2>
            <p className="text-[12px] text-nx-dim mt-0.5">
              {t('dash.donut.sub')}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 my-4">
            {/* SVG Multi-Segment Donut Dinâmico */}
            <div className="relative w-[144px] h-[144px] flex items-center justify-center shrink-0">
              <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                <circle cx="72" cy="72" r="54" fill="none" stroke="var(--nx-overlay)" strokeWidth="18" />
                {maturity.segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="72"
                    cy="72"
                    r="54"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[21px] font-display font-bold text-nx-bright leading-none">
                  {maturity.retention}
                </span>
                <span className="text-[11px] text-nx-dim font-medium mt-1">
                  {t('dash.donut.retention')}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="flex-1 space-y-2.5 text-[11.5px]">
              {[
                { label: t('dash.donut.mature'), val: maturity.mature, color: '#22C55E' },
                { label: t('dash.donut.young'), val: maturity.young, color: '#5B7CF4' },
                { label: t('dash.donut.learning'), val: maturity.learning, color: '#F59E0B' },
                { label: t('dash.donut.new'), val: maturity.newCards, color: '#38BDF8' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-nx-text truncate">{item.label}</span>
                  </div>
                  <span className="font-bold text-nx-bright font-mono">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('flashcards')}
            className="w-full h-[42px] rounded-[10px] bg-nx-overlay border border-nx-primary text-[12.5px] font-semibold text-nx-primary hover:bg-nx-primary hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Brain size={14} />
            <span>{t('dash.donut.btn')}</span>
          </button>
        </div>
      </div>

      {/* ── ROW 3: NOTAS RECENTES DO VAULT + DOJO DE RECITAÇÃO SPOTLIGHT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-4.5">
        {/* Left: Recent Notes & AI Connections (8 cols) */}
        <div className="lg:col-span-8 rounded-[16px] bg-nx-surface border border-nx-border p-5 md:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-display font-bold text-nx-bright">
              {t('dash.notes.title')}
            </h2>
            <button
              onClick={() => setActiveTab('graph')}
              className="text-[12px] font-semibold text-nx-primary hover:underline cursor-pointer"
            >
              {t('dash.notes.viewGraph')}
            </button>
          </div>

          {notas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-nx-border rounded-[12px]">
              <FileText size={24} className="mb-2 text-nx-primary/60" />
              <p className="text-xs font-medium text-nx-dim">{t('dash.notes.empty')}</p>
              <button
                onClick={handleQuickCreateNote}
                className="mt-2 text-xs font-mono font-bold text-nx-primary hover:underline cursor-pointer"
              >
                {t('dash.notes.createFirst')}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notas.slice(0, 3).map((nota, idx) => {
                const colors = ['#5B7CF4', '#22C55E', '#38BDF8'];
                const barColor = colors[idx % colors.length];
                const cardsDaNota = (cards || []).filter((c) => c.nota_id === nota.id).length;
                return (
                  <button
                    key={nota.id}
                    onClick={() => handleOpenNote(nota.id)}
                    className="w-full rounded-[12px] bg-nx-overlay border border-nx-border hover:border-nx-primary/60 px-4 py-3.5 flex items-center justify-between gap-4 text-left transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <span
                      className="absolute left-0 top-3 bottom-3 w-[4px] rounded-r"
                      style={{ backgroundColor: barColor }}
                    />
                    <div className="min-w-0 flex-1 pl-2">
                      <div className="text-[13.5px] font-semibold text-nx-bright group-hover:text-nx-primary transition-colors truncate">
                        {nota.titulo || 'Sem título'}
                      </div>
                      <div className="text-[11.5px] text-nx-dim truncate mt-0.5">
                        #{nota.tipo || 'nota'} • Vault Markdown Local
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <span
                        className="px-2.5 py-1 rounded-[7px] bg-nx-surface text-[11px] font-semibold"
                        style={{ color: barColor }}
                      >
                        {cardsDaNota > 0 ? 'FSRS Ativo' : 'Markdown'}
                      </span>
                      <span className="px-2.5 py-1 rounded-[7px] bg-nx-surface text-[11px] font-medium text-nx-text">
                        {cardsDaNota} {cardsDaNota === 1 ? 'card' : 'cards'}
                      </span>
                      <ChevronRight size={14} className="text-nx-dim group-hover:text-nx-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Dojo de Recitação Spotlight Card (4 cols) */}
        <div
          className="lg:col-span-4 rounded-[16px] border border-nx-primary p-6 flex flex-col justify-between shadow-glow-primary relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #181D36 0%, var(--nx-surface) 100%)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-[6px] bg-nx-overlay border border-nx-secondary text-[10px] font-mono font-bold text-nx-secondary uppercase tracking-wider">
                {t('dash.dojo.tag')}
              </span>
              {poemasValidos.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevPoem}
                    className="p-1 rounded bg-nx-overlay text-nx-dim hover:text-nx-bright cursor-pointer"
                    title="Poema anterior"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-[10px] font-mono text-nx-dim px-1">
                    {safeIndex + 1}/{poemasValidos.length}
                  </span>
                  <button
                    onClick={nextPoem}
                    className="p-1 rounded bg-nx-overlay text-nx-dim hover:text-nx-bright cursor-pointer"
                    title="Próximo poema"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-[20px] font-display font-bold text-nx-bright leading-tight">
              {poemaVigente ? poemaVigente.titulo : 'Nenhum poema cadastrado'}
            </h2>
            <p className="text-[12.5px] text-nx-text italic line-clamp-2 mt-2 leading-relaxed">
              {poemaVigente
                ? `“${poemaVigente.corpo.split('\n').slice(0, 2).join(' / ')}”`
                : 'Cadastre seu primeiro poema ou discurso no Dojo de Oratória para treinar recitação e dicção.'}
            </p>
          </div>

          {/* Mini Audio Waveform Box */}
          <div className="my-4 h-[74px] rounded-[12px] bg-nx-void border border-nx-border px-4 flex items-center justify-between gap-1">
            {waveformHeights.map((bh, idx) => (
              <span
                key={idx}
                className="w-1.5 rounded-full transition-all duration-300"
                style={{
                  height: poemaVigente ? `${bh}px` : '6px',
                  backgroundColor: poemaVigente && idx < 13 ? 'var(--nx-secondary)' : 'var(--nx-muted)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (poemaVigente ? setShowDojo(true) : setActiveTab('poemas'))}
              className="flex-1 h-[42px] rounded-[10px] text-[12.5px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(90deg, var(--nx-primary) 0%, var(--nx-secondary) 100%)',
              }}
            >
              {poemaVigente ? t('dash.dojo.cta') : 'Adicionar Poema no Dojo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 4 (colapsável): CONSISTÊNCIA ANUAL & METAS — fusão da antiga tela de Estatísticas ── */}
      {showAnual && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-[16px] bg-nx-surface border border-nx-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-nx-secondary" />
              <h3 className="text-sm font-display font-bold text-nx-bright">
                Frequência de Estudo & Ofensiva Anual
              </h3>
            </div>
            <span className="text-xs font-mono text-nx-dim">
              Ofensiva: <strong className="text-nx-accent">{streakAtual} dias</strong> • Recorde: {recordeStreak}
            </span>
          </div>
          <ActivityHeatmap sessoes={sessoes} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-[16px] bg-nx-surface border border-nx-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-nx-primary" />
              <h3 className="text-sm font-display font-bold text-nx-bright">Metas Mensais</h3>
            </div>
            <div className="space-y-3.5">
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
                label="Cards Dominados"
                current={dominadosCount}
                target={Math.max(totalCards, 10)}
                unit="cards"
                color="#A78BFA"
              />
            </div>
          </div>

          <div className="rounded-[16px] bg-nx-surface border border-nx-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-400" />
              <h3 className="text-sm font-display font-bold text-nx-bright">Próximos Marcos</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-nx-void/50 border border-nx-border/50">
                <span className="text-lg">🔥</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-nx-bright truncate">Maratonista</span>
                    <span className="text-nx-dim text-[11px] font-mono">{streakAtual}/7 dias</span>
                  </div>
                  <div className="h-1.5 w-full bg-nx-muted rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (streakAtual / 7) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-nx-void/50 border border-nx-border/50">
                <span className="text-lg">📚</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-nx-bright truncate">Polímata</span>
                    <span className="text-nx-dim text-[11px] font-mono">{notas.length}/50 notas</span>
                  </div>
                  <div className="h-1.5 w-full bg-nx-muted rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-nx-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (notas.length / 50) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
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
      <div className="flex justify-between text-[11px] font-medium">
        <span className="text-nx-dim">{label}</span>
        <span className="text-nx-bright font-mono">
          {current} / {target} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full bg-nx-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
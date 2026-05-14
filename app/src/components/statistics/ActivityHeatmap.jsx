import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import {
  format, subMonths, startOfMonth, addMonths,
  addDays, isToday, getDay, getDaysInMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
/* ─── Constantes visuais ─────────────────────────────────────── */
const CELL      = 13;
const GAP       = 2;
const MONTH_GAP = CELL + GAP;
const VISIBLE   = 9;                      // meses visíveis simultâneos
const CENTER    = Math. floor(VISIBLE / 2); // índice central = 4
const COLORS = [
  'rgba(255,255,255,0.05)',
  'rgba(34,211,238,0.20)',
  'rgba(34,211,238,0.45)',
  'rgba(34,211,238,0.72)',
  '#22D3EE',
];
const GLOWS = [
  null, null, null,
  '0 0 5px rgba(34,211,238,0.45)',
  '0 0 9px rgba(34,211,238,0.7)',
];
function lvl(n) { return n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4; }
function weekdayMon(date) {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}
function buildMonthColumns(mStart) {
  const daysInMonth = getDaysInMonth(mStart);
  const startOffset = weekdayMon(mStart);
  const totalCols   = Math.ceil((startOffset + daysInMonth) / 7);
  const columns     = [];
  for (let c = 0; c < totalCols; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const dayIdx = c * 7 + r - startOffset;
      col.push(dayIdx >= 0 && dayIdx < daysInMonth ? addDays(mStart, dayIdx) : null);
    }
    columns.push(col);
  }
  return columns;
}
const DAY_ LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
/* ─── DayCell ─────────────���──────────────────────────────────── */
function DayCell({ day, todayStart, countMap, isTodayCol }) {
  const key   = format(day, 'yyyy-MM-dd');
  const count = countMap[key] || 0;
  const lv_   = lvl(count);
  const dayStart = new Date(day. getFullYear(), day. getMonth(), day. getDate());
  const future   = dayStart > todayStart;
  const today_   = isToday(day);
  return (
    <div
      title={
        format(day, 'dd/MM/yyyy', { locale: ptBR }) +
        (count ? ` — ${count} sessão(ões)` : '')
      }
      style={{
        width: CELL, height: CELL,
        borderRadius: 2, flexShrink: 0,
        background: COLORS[future ? 0 : lv_],
        boxShadow: !future && GLOWS[lv_] ? GLOWS[lv_] : undefined,
        border: today_
          ? '1px solid rgba(34,211,238,0.9)'
          : future
            ? '1px solid rgba(255,255,255,0.10)'
            : isTodayCol
              ? '1px solid rgba(255,255,255,0.10)'
              : '1px solid rgba(255,255,255,0.04)',
        opacity: future ? 0.45 : 1,
        transition: 'transform 80ms',
        cursor: count > 0 ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        if (!future) {
          e.currentTarget.style.transform = 'scale(1.5)';
          e.currentTarget.style.position  = 'relative';
          e.currentTarget.style.zIndex    = '20';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.position  = '';
        e.currentTarget.style.zIndex    = '';
      }}
    />
  );
}
/* ─── MonthView ──────────────────────────────────────────────── */
function MonthView({ monthDate, todayStart, countMap }) {
  const columns   = buildMonthColumns(startOfMonth(monthDate));
  const cellWidth = CELL + GAP;
  const todayColIdx = useMemo(() => {
    for (let c = 0; c < columns.length; c++)
      for (let r = 0; r < columns[c].length; r++)
        if (columns[c][r] && isToday(columns[c][r])) return c;
    return null;
  }, [columns]);
  return (
    <div className="flex flex-col" style={{ marginRight: MONTH_ GAP, flexShrink: 0 }}>
      {/* Label do mês */}
      <div style={{ height: 16, width: columns.length * cellWidth, marginBottom: 4 }}>
        <span style={{
          fontSize: 9, fontFamily: 'var(--nx-font-mono)',
          color: 'rgba(125,134,158,0.85)', textTransform: 'capitalize',
        }}>
          {format(monthDate, "MMM ''yy", { locale: ptBR })}
        </span>
      </div>
      {/* Grade de dias */}
      <div className="flex" style={{ gap: GAP }}>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
            {col.map((day, ri) =>
              !day ? (
                <div key={ri} style={{
                  width: CELL, height: CELL,
                  borderRadius: 2, flexShrink: 0,
                  background: 'transparent',
                }} />
              ) : (
                <DayCell
                  key={ri}
                  day={day}
                  todayStart={todayStart}
                  countMap={countMap}
                  isTodayCol={todayColIdx === ci}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
/* ─── ActivityHeatmap ────────────────────────────────────────── */
export default function ActivityHeatmap({ sessoes }) {
  const today      = new Date();
  const todayStart = new Date(today. getFullYear(), today. getMonth(), today. getDate());
  const [offset, setOffset] = useState(0);
  const countMap = useMemo(() => {
    const m = {};
    sessoes.forEach(s => {
      if (s. started_at) {
        const k = s. started_at. slice(0, 10);
        m[k] = (m[k] || 0) + 1;
      }
    });
    return m;
  }, [sessoes]);
  /* Gera exatamente VISIBLE meses centrados no mês atual + offset */
  const months = useMemo(() => {
    const windowStart = addMonths(startOfMonth(today), -CENTER + offset);
    return Array.from({ length: VISIBLE }, (_, i) => addMonths(windowStart, i));
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => {
    const mStart     = subMonths(today, 12);
    const activeDays = Object.keys(countMap).filter(k => {
      const d = new Date(k + 'T00:00:00');
      return d >= mStart && d <= today;
    }).length;
    return { totalSessions: sessoes.length, activeDays };
  }, [sessoes, countMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const labelLeft  = format(months[0],           "MMM ''yy", { locale: ptBR });
  const labelRight = format(months[VISIBLE - 1], "MMM ''yy", { locale: ptBR });
  return (
    <div
      className="p-5 rounded- nx-lg border border-nx-border"
      style={{ background: 'rgba(8,11,24,0.95)' }}
    >
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-display font-bold text-nx-bright">
            Frequencia de Estudo
          </h3>
          <p className="text-[10px] font-mono text-nx-dim mt-0.5">
            {stats.totalSessions} sessoes em {stats.activeDays} dias
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-nx-dim">Menos</span>
          {COLORS.map((c, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 2,
              background: c, border: '1px solid rgba(255,255,255,0.06)',
            }} />
          ))}
          <span className="text-[9px] font-mono text-nx-dim">Mais</span>
        </div>
      </div>
      {/* ── Corpo ── */}
      <div className="flex items-start gap-2">
        {/* Seta ← (recua 1 mês) */}
        <button
          onClick={() => setOffset(o => o - 1)}
          className="w-6 h-6 flex items-center justify-center rounded text-nx-dim hover:text-nx-bright transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            marginTop: 20, flexShrink: 0,
          }}
        >
          ‹
        </button>
        {/* Labels S T Q Q S S D — FIXOS, fora da grade */}
        <div className="flex flex-col shrink-0" style={{ marginTop: 20, marginRight: 4 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{
              height: CELL, marginBottom: GAP,
              width: 10, lineHeight: CELL + 'px',
              fontSize: 9, textAlign: 'center',
              color: 'rgba(125,134,158,0.7)',
              fontFamily: 'var(--nx-font-mono)',
            }}>
              {d}
            </div>
          ))}
        </div>
        {/* Grade — sem overflow, exatamente 9 meses */}
        <div className="flex" style={{ overflow: 'hidden', flex: 1 }}>
          {months.map(m => (
            <MonthView
              key={format(m, 'yyyy-MM')}
              monthDate={m}
              todayStart={todayStart}
              countMap={countMap}
            />
          ))}
        </div>
        {/* Seta → (avança 1 mês) */}
        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-6 h-6 flex items-center justify-center rounded text-nx-dim hover:text-nx-bright transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            marginTop: 20, flexShrink: 0,
          }}
        >
          ›
        </button>
      </div>
      {/* ── Rodapé: range dos meses visíveis ── */}
      <div className="flex justify-between mt-2" style={{ paddingLeft: 44 }}>
        <span style={{
          fontSize: 9, color: 'rgba(125,134,158,0.5)',
          fontFamily: 'var(--nx-font-mono)', textTransform: 'capitalize',
        }}>
          {labelLeft}
        </span>
        <span style={{
          fontSize: 9, color: 'rgba(125,134,158,0.5)',
          fontFamily: 'var(--nx-font-mono)', textTransform: 'capitalize',
        }}>
          {labelRight}
        </span>
      </div>
    </div>
  );
}
ActivityHeatmap.propTypes = {
  sessoes: PropTypes.arrayOf(
    PropTypes.shape({ started_at: PropTypes.string })
  ).isRequired,
};
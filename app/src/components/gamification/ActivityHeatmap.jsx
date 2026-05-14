import PropTypes from 'prop-types';
import { useMemo, useRef, useEffect, forwardRef } from 'react';
import {
  format, subMonths, startOfMonth, addMonths,
  addDays, isToday, getDay, getDaysInMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CELL = 13;
const GAP = 2;
const MONTH_GAP = CELL + GAP;

const COLORS = [
  'rgba(255,255,255,0.05)',
  'rgba(34,211,238,0.20)',
  'rgba(34,211,238,0.45)',
  'rgba(34,211,238,0.72)',
  '#22D3EE',
];
const GLOWS = [null, null, null, '0 0 5px rgba(34,211,238,0.45)', '0 0 9px rgba(34,211,238,0.7)'];

function lvl(n) { return n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4; }

function weekdayMon(date) {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

function buildMonthColumns(mStart) {
  const daysInMonth = getDaysInMonth(mStart);
  const startOffset = weekdayMon(mStart);
  const totalCols = Math.ceil((startOffset + daysInMonth) / 7);
  const columns = [];

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

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function DayCell({ day, today, countMap, isTodayCol }) {
  const key = format(day, 'yyyy-MM-dd');
  const count = countMap[key] || 0;
  const lv_ = lvl(count);

  // ✅ FIX 1: Comparar apenas a data (sem horas) para evitar falso positivo em "future"
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const future = dayStart > todayStart;

  const today_ = isToday(day);

  return (
    <div
      title={
        format(day, 'dd/MM/yyyy', { locale: ptBR }) +
        (count ? ' - ' + count + ' sessao(es)' : '')
      }
      style={{
        width: CELL,
        height: CELL,
        borderRadius: 2,
        flexShrink: 0,
        // ✅ FIX 2: Células futuras agora têm fundo visível (mesmo nível 0 do passado)
        // Antes: rgba(255,255,255,0.02) — quase invisível
        // Agora: mesmo COLORS[0] do passado, garantindo que a grade apareça
        background: COLORS[future ? 0 : lv_],
        boxShadow: !future && GLOWS[lv_] ? GLOWS[lv_] : undefined,
        border: today_
          ? '1px solid rgba(34,211,238,0.9)'          // dia atual: borda ciano
          : future
            ? '1px solid rgba(255,255,255,0.10)'       // futuro: borda levemente mais clara
            : isTodayCol
              ? '1px solid rgba(255,255,255,0.10)'
              : '1px solid rgba(255,255,255,0.04)',
        // ✅ FIX 3: Removido opacity:0.2 para células futuras — eram invisíveis no tema escuro
        // Agora usamos apenas a diferença de cor/borda para distinguir passado × futuro
        opacity: future ? 0.45 : 1,
        transition: 'transform 80ms',
        cursor: count > 0 ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        if (!future) {
          e.currentTarget.style.transform = 'scale(1.5)';
          e.currentTarget.style.position = 'relative';
          e.currentTarget.style.zIndex = '20';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.position = '';
        e.currentTarget.style.zIndex = '';
      }}
    />
  );
}

// ✅ FIX 4: forwardRef para expor o elemento DOM do mês atual ao pai (usado no scroll)
const MonthView = forwardRef(function MonthView({ monthDate, today, countMap }, ref) {
  const columns = buildMonthColumns(startOfMonth(monthDate));
  const cellWidth = CELL + GAP;

  const todayColIdx = useMemo(() => {
    for (let c = 0; c < columns.length; c++) {
      for (let r = 0; r < columns[c].length; r++) {
        if (columns[c][r] && isToday(columns[c][r])) return c;
      }
    }
    return null;
  }, [columns]);

  return (
    <div ref={ref} className="flex flex-col" style={{ marginRight: MONTH_GAP }}>
      <div style={{ height: 16, width: columns.length * cellWidth, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--nx-font-mono)',
            color: 'rgba(125,134,158,0.85)',
            textTransform: 'capitalize',
          }}
        >
          {format(monthDate, "MMM ''yy", { locale: ptBR })}
        </span>
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
            {col.map((day, ri) => {
              if (!day) {
                return (
                  <div
                    key={ri}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: 'transparent',
                    }}
                  />
                );
              }
              return (
                <DayCell
                  key={ri}
                  day={day}
                  today={today}
                  countMap={countMap}
                  isTodayCol={todayColIdx === ci}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export default function ActivityHeatmap({ sessoes }) {
  const today = new Date();
  const scrollRef = useRef(null);

  // ✅ FIX 5: Ref que aponta para o elemento DOM do mês atual
  const currentMonthRef = useRef(null);

  const countMap = useMemo(() => {
    const m = {};
    sessoes.forEach(s => {
      if (s.started_at) {
        const k = s.started_at.slice(0, 10);
        m[k] = (m[k] || 0) + 1;
      }
    });
    return m;
  }, [sessoes]);

  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 12; i++) {
      arr.push(subMonths(today, i));
    }
    for (let i = 1; i <= 5; i++) {
      arr.push(addMonths(today, i));
    }
    // Ordem final após reverse: [+5, +4, +3, +2, +1, hoje, -1, ..., -12]
    // Renderizado da esquerda para a direita no scroll
    return arr.reverse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ FIX 6: Centralizar scroll no mês atual ao montar o componente
  useEffect(() => {
    if (!scrollRef.current || !currentMonthRef.current) return;

    const container = scrollRef.current;
    const monthEl = currentMonthRef.current;

    // Calcula o centro do mês atual em relação ao container
    const containerWidth = container.offsetWidth;
    const monthLeft = monthEl.offsetLeft;
    const monthWidth = monthEl.offsetWidth;

    container.scrollLeft = monthLeft - containerWidth / 2 + monthWidth / 2;
  }, []); // roda uma única vez após a montagem

  const stats = useMemo(() => {
    const mStart = subMonths(today, 12);
    const activeDays = Object.keys(countMap).filter(k => {
      const d = new Date(k + 'T00:00:00'); // evita problema de fuso ao comparar datas
      return d >= mStart && d <= today;
    }).length;
    return {
      totalSessions: sessoes.length,
      activeDays,
    };
  }, [sessoes, countMap, today]);

  const scroll = dir => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
    }
  };

  // Identifica qual índice do array é o mês atual
  const currentMonthKey = format(today, 'yyyy-MM');

  return (
    <div
      className="p-5 rounded-nx-lg border border-nx-border"
      style={{ background: 'rgba(8,11,24,0.95)' }}
    >
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
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: c,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          ))}
          <span className="text-[9px] font-mono text-nx-dim">Mais</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => scroll(-1)}
          className="w-6 h-6 flex items-center justify-center rounded text-nx-dim hover:text-nx-bright transition-colors"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ‹
        </button>

        <div ref={scrollRef} className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex" style={{ width: 'max-content' }}>
            {/* Labels de dia da semana */}
            <div className="flex flex-col shrink-0" style={{ marginTop: 20, marginRight: 6 }}>
              {DAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL,
                    marginBottom: GAP,
                    width: 10,
                    lineHeight: CELL + 'px',
                    fontSize: 9,
                    textAlign: 'center',
                    color: 'rgba(125,134,158,0.7)',
                    fontFamily: 'var(--nx-font-mono)',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* ✅ FIX 7: Passa ref apenas para o MonthView do mês atual */}
            {months.map((m, i) => {
              const isCurrentMonth = format(m, 'yyyy-MM') === currentMonthKey;
              return (
                <MonthView
                  key={i}
                  ref={isCurrentMonth ? currentMonthRef : null}
                  monthDate={m}
                  today={today}
                  countMap={countMap}
                />
              );
            })}
          </div>
        </div>

        <button
          onClick={() => scroll(1)}
          className="w-6 h-6 flex items-center justify-center rounded text-nx-dim hover:text-nx-bright transition-colors"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ›
        </button>
      </div>

      <div className="flex justify-between mt-2">
        <span
          style={{
            fontSize: 9,
            color: 'rgba(125,134,158,0.5)',
            fontFamily: 'var(--nx-font-mono)',
            textTransform: 'capitalize',
          }}
        >
          {format(subMonths(today, 12), "MMM ''yy", { locale: ptBR })}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'rgba(125,134,158,0.5)',
            fontFamily: 'var(--nx-font-mono)',
            textTransform: 'capitalize',
          }}
        >
          {format(addMonths(today, 5), "MMM ''yy", { locale: ptBR })}
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
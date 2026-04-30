import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, addDays, isToday, startOfWeek, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MONTHS_BACK = 9;
const CELL = 13;   // px — cell width & height
const GAP  = 2;    // px — gap between cells
const MONTH_GAP = CELL + GAP; // one full cell gap between months

const COLORS = [
  'rgba(255,255,255,0.05)',
  'rgba(34,211,238,0.20)',
  'rgba(34,211,238,0.45)',
  'rgba(34,211,238,0.72)',
  '#22D3EE',
];
const GLOWS = [null, null, null, '0 0 5px rgba(34,211,238,0.45)', '0 0 9px rgba(34,211,238,0.7)'];

function lvl(n) { return n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4; }

// Build an array of weeks (each week = array of 7 Date) that cover [start, end]
function buildWeeks(start, end) {
  const firstMonday = startOfWeek(start, { weekStartsOn: 1 });
  return eachWeekOfInterval({ start: firstMonday, end }, { weekStartsOn: 1 })
    .map(monday => Array.from({ length: 7 }, (_, d) => addDays(monday, d)));
}

export default function ActivityHeatmap({ sessoes }) {
  const today = useMemo(() => new Date(), []);

  // Group weeks by month — each entry: { label, weeks[] }
  const monthGroups = useMemo(() => {
    const groups = [];
    for (let m = MONTHS_BACK; m >= 0; m--) {
      const mDate  = subMonths(today, m);
      const mStart = startOfMonth(mDate);
      const mEnd   = m === 0 ? today : endOfMonth(mDate);
      const weeks  = buildWeeks(mStart, mEnd);
      const label  = format(mDate, "MMM ''yy", { locale: ptBR });
      groups.push({ label, weeks, mStart });
    }
    return groups;
  }, [today]);

  const countMap = useMemo(() => {
    const m = {};
    sessoes.forEach(s => {
      if (s.started_at) { const k = s.started_at.slice(0, 10); m[k] = (m[k] || 0) + 1; }
    });
    return m;
  }, [sessoes]);

  const totalSessions = sessoes.length;
  const activeDays    = Object.keys(countMap).length;
  const DAY_LABELS    = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div className="p-5 rounded-nx-lg border border-nx-border" style={{ background: 'rgba(8,11,24,0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-display font-bold text-nx-bright">Frequencia de Estudo</h3>
          <p className="text-[10px] font-mono text-nx-dim mt-0.5">{totalSessions} sessoes em {activeDays} dias</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-nx-dim">Menos</span>
          {COLORS.map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span className="text-[9px] font-mono text-nx-dim">Mais</span>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(33,38,61,0.8) transparent' }}>
        <div className="flex" style={{ width: 'max-content' }}>

          {/* Day-of-week label column */}
          <div className="flex flex-col shrink-0" style={{ marginTop: 20, marginRight: 6 }}>
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

          {/* Month groups */}
          {monthGroups.map((group, gi) => {
            const groupWidth = group.weeks.length * (CELL + GAP) - GAP;
            return (
              <div key={gi} className="flex flex-col" style={{ marginRight: gi < monthGroups.length - 1 ? MONTH_GAP : 0 }}>
                {/* Month label */}
                <div style={{ height: 16, width: groupWidth, position: 'relative', marginBottom: 4 }}>
                  <span style={{
                    position: 'absolute', left: 0, top: 0,
                    fontSize: 9, fontFamily: 'var(--nx-font-mono)',
                    color: 'rgba(125,134,158,0.85)',
                    whiteSpace: 'nowrap', textTransform: 'capitalize',
                  }}>
                    {group.label}
                  </span>
                </div>

                {/* Week columns for this month */}
                <div className="flex" style={{ gap: GAP }}>
                  {group.weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                      {week.map((day, di) => {
                        const key    = format(day, 'yyyy-MM-dd');
                        const count  = countMap[key] || 0;
                        const lv_    = lvl(count);
                        const future = day > today;
                        const today_ = isToday(day);
                        const currentWeek = week.some(d => isToday(d));
                        return (
                          <div
                            key={di}
                            title={format(day, 'dd/MM/yyyy', { locale: ptBR }) + (count ? ' - ' + count + ' sessao(es)' : '')}
                            style={{
                              width: CELL, height: CELL,
                              borderRadius: 2, flexShrink: 0,
                              background: future ? 'rgba(255,255,255,0.02)' : COLORS[lv_],
                              boxShadow: !future && GLOWS[lv_] ? GLOWS[lv_] : undefined,
                              border: today_
                                ? '1px solid rgba(34,211,238,0.9)'
                                : currentWeek
                                  ? '1px solid rgba(255,255,255,0.10)'
                                  : '1px solid rgba(255,255,255,0.04)',
                              opacity: future ? 0.2 : 1,
                              transition: 'transform 80ms',
                              cursor: count > 0 ? 'pointer' : 'default',
                            }}
                            onMouseEnter={e => { if (!future) { e.currentTarget.style.transform = 'scale(1.5)'; e.currentTarget.style.position = 'relative'; e.currentTarget.style.zIndex = '20'; }}}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.position = ''; e.currentTarget.style.zIndex = ''; }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom range */}
      <div className="flex justify-between mt-2">
        <span style={{ fontSize: 9, color: 'rgba(125,134,158,0.5)', fontFamily: 'var(--nx-font-mono)', textTransform: 'capitalize' }}>
          {format(subMonths(today, MONTHS_BACK), "MMM ''yy", { locale: ptBR })}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(125,134,158,0.5)', fontFamily: 'var(--nx-font-mono)' }}>Hoje</span>
      </div>
    </div>
  );
}

ActivityHeatmap.propTypes = {
  sessoes: PropTypes.arrayOf(PropTypes.shape({ started_at: PropTypes.string })).isRequired,
};
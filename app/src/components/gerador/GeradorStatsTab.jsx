export default function GeradorStatsTab({ stats }) {
  const cards = [
    { label: 'Por Matéria', stats: stats.porMateria, color: 'var(--color-notas, #A78BFA)' },
    { label: 'Por Banca', stats: stats.porBanca, color: 'var(--color-gerador, #FBBF24)' },
    { label: 'Por Nível', stats: stats.porNivel, color: 'var(--color-success, #34D399)' }
  ];

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {cards.map((card, i) => (
          <div key={i} className="p-8 bg-surface-card border border-surface-border rounded-[2.5rem] shadow-xl h-fit">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-lo mb-8">{card.label}</h3>
            <div className="space-y-6">
              {Object.entries(card.stats).map(([key, val]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-text-hi capitalize">{key || 'Geral'}</span>
                    <span style={{ color: card.color }}>{val}</span>
                  </div>
                  <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.total ? (val / stats.total) * 100 : 0}%`,
                        backgroundColor: card.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

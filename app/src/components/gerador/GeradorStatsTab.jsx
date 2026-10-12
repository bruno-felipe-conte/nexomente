export default function GeradorStatsTab({ stats }) {
  const cards = [
    { label: 'Por Matéria', stats: stats.porMateria, color: 'color-notas' },
    { label: 'Por Banca', stats: stats.porBanca, color: 'color-gerador' },
    { label: 'Por Nível', stats: stats.porNivel, color: 'color-success' }
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
                    <span className="text-text-hi capitalize">{key}</span>
                    <span className={`text-var(--${card.color})`}>{val}</span>
                  </div>
                  <div className="h-1 bg-surface-base rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-var(--${card.color}) opacity-40`}
                      style={{ width: `${stats.total ? (val / stats.total) * 100 : 0}%` }}
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

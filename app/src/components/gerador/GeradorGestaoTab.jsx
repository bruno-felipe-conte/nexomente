import { Trash2 } from 'lucide-react';

export default function GeradorGestaoTab({
  novaMateriaNome,
  setNovaMateriaNome,
  handleAddMateria,
  materias,
  removeMateria,
  novaBancaNome,
  setNovaBancaNome,
  handleAddBanca,
  bancas,
  removeBanca
}) {
  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="p-8 bg-surface-card border border-surface-border rounded-[2.5rem] space-y-8 h-fit">
          <h3 className="font-display text-xl font-black text-text-hi uppercase tracking-tighter">Matérias</h3>
          <div className="flex gap-3">
            <input
              value={novaMateriaNome}
              onChange={(e) => setNovaMateriaNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMateria()}
              placeholder="Add matéria..."
              className="flex-1 px-5 py-3 bg-surface-base border border-surface-border rounded-xl text-xs text-text-hi outline-none focus:border-color-notas/50"
            />
            <button
              onClick={handleAddMateria}
              className="px-6 py-3 bg-color-notas text-surface-base rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {materias.map(m => (
              <div key={m.id} className="flex justify-between items-center p-4 bg-surface-base/50 border border-surface-border rounded-xl group">
                <span className="text-xs font-bold text-text-hi">{m.nome}</span>
                <button onClick={() => removeMateria(m.id)} className="p-2 text-text-lo hover:text-color-error">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-surface-card border border-surface-border rounded-[2.5rem] space-y-8 h-fit">
          <h3 className="font-display text-xl font-black text-text-hi uppercase tracking-tighter">Bancas</h3>
          <div className="flex gap-3">
            <input
              value={novaBancaNome}
              onChange={(e) => setNovaBancaNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBanca()}
              placeholder="Add banca..."
              className="flex-1 px-5 py-3 bg-surface-base border border-surface-border rounded-xl text-xs text-text-hi outline-none focus:border-color-gerador/50"
            />
            <button
              onClick={handleAddBanca}
              className="px-6 py-3 bg-color-gerador text-surface-base rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {bancas.map(b => (
              <div key={b.key} className="flex justify-between items-center p-4 bg-surface-base/50 border border-surface-border rounded-xl group">
                <span className="text-xs font-bold text-text-hi">{b.nome}</span>
                <button onClick={() => removeBanca(b.key)} className="p-2 text-text-lo hover:text-color-error">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

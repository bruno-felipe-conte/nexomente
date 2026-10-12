import { FileText, Search, FileDown } from 'lucide-react';
import QuestaoCard from './QuestaoCard';

export default function GeradorBancoTab({
  busca,
  setBusca,
  filtroMateria,
  setFiltroMateria,
  materias,
  handleExportar,
  questoesExibir,
  atualizarQuestao,
  handleCriarFlashcard,
  deletarQuestao
}) {
  return (
    <div className="h-full max-w-6xl mx-auto flex flex-col space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between shrink-0">
        <div className="flex-1 w-full relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-lo group-focus-within:text-color-gerador transition-colors" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar questões..."
            className="w-full pl-12 pr-4 py-4 bg-surface-card border border-surface-border rounded-2xl text-sm text-text-hi outline-none focus:border-color-gerador/40"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={filtroMateria}
            onChange={(e) => setFiltroMateria(e.target.value)}
            className="px-6 py-4 bg-surface-card border border-surface-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-hi outline-none focus:border-color-gerador/40"
          >
            <option value="">Matérias</option>
            {materias.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
          </select>
          <button
            onClick={() => handleExportar('doc')}
            className="p-4 bg-surface-card border border-surface-border rounded-2xl text-text-lo hover:text-text-hi transition-all"
          >
            <FileDown size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent space-y-6">
        {questoesExibir.length > 0 ? (
          questoesExibir.map((q) => (
            <QuestaoCard
              key={q.id}
              questao={q}
              onEditar={atualizarQuestao}
              onCriarFlashcard={handleCriarFlashcard}
              onDeletar={deletarQuestao}
            />
          ))
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-surface-card/20 rounded-[3rem] border-2 border-dashed border-surface-border">
            <FileText size={32} className="text-text-lo" />
            <p className="text-xs text-text-lo font-bold uppercase tracking-widest">Nenhuma questão encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}

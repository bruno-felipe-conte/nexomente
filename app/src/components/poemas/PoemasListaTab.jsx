import { Book, Edit3, ExternalLink, Trash, Download, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PoemasListaTab({
  modoSelecao,
  selecionados,
  exportarSelecionados,
  excluirSelecionados,
  poemasFiltrados,
  toggleSelecao,
  iniciarEdicao,
  onSelectPoema
}) {
  return (
    <motion.div
      key="list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto w-full h-full flex flex-col"
    >
      {modoSelecao && selecionados.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 bg-nx-primary p-4 rounded-nx-md flex items-center justify-between shadow-2xl"
        >
          <span className="text-xs font-black text-white ml-2">{selecionados.length} ITENS SELECIONADOS</span>
          <div className="flex gap-2">
            <button onClick={() => exportarSelecionados('json')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-2">
              <Download size={14} /> JSON
            </button>
            <button onClick={() => exportarSelecionados('md')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-2">
              <Download size={14} /> MD
            </button>
            <button onClick={excluirSelecionados} className="px-3 py-1.5 bg-nx-error/20 hover:bg-nx-error/40 rounded-nx-sm text-[10px] font-bold text-white flex items-center gap-2">
              <Trash size={14} /> EXCLUIR
            </button>
          </div>
        </motion.div>
      )}

      {poemasFiltrados.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center opacity-40">
          <Book size={48} className="mb-4" />
          <h3 className="text-xl font-bold">Nenhum poema encontrado</h3>
          <p className="text-sm">Tente mudar sua busca ou adicione novos poemas.</p>
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {/* Cabeçalho da Lista */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-lo/30">
            <div className="col-span-1 flex items-center justify-center">#</div>
            <div className="col-span-4">Título</div>
            <div className="col-span-3">Autor</div>
            <div className="col-span-2 text-center">Forma / Época</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {poemasFiltrados.map((p, idx) => (
            <motion.div
              key={p.id}
              onClick={() => modoSelecao && toggleSelecao(p.id)}
              className={`grid grid-cols-12 gap-4 items-center px-6 py-4 bg-nx-surface/40 border rounded-nx-md transition-all cursor-pointer group ${selecionados.includes(p.id) ? 'border-nx-primary bg-nx-primary/5' : 'border-nx-border hover:border-nx-primary/20 hover:bg-nx-surface'}`}
            >
              <div className="col-span-1 flex items-center justify-center">
                {modoSelecao ? (
                  selecionados.includes(p.id) ? <CheckSquare size={16} className="text-nx-primary" /> : <Square size={16} className="text-nx-dim/20" />
                ) : (
                  <span className="text-xs font-mono text-nx-dim/20">{idx + 1}</span>
                )}
              </div>

              <div className="col-span-4 min-w-0">
                <h4 className="text-sm font-bold text-nx-bright truncate">{p.titulo}</h4>
                <div className="flex gap-1 mt-1">
                  {p.tema?.slice(0, 2).map(t => (
                    <span key={t} className="text-[9px] text-nx-dim/40">#{t}</span>
                  ))}
                </div>
              </div>

              <div className="col-span-3 text-xs text-text-lo font-medium truncate">
                {p.autor || '—'}
              </div>

              <div className="col-span-2 flex flex-col items-center gap-1">
                <span className="px-2 py-0.5 bg-accent-main/10 text-accent-main rounded text-[9px] font-black uppercase">{p.forma || 'N/A'}</span>
                <span className="text-[9px] text-text-lo/30 font-medium truncate">{p.epoca || '—'}</span>
              </div>

              <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); iniciarEdicao(p); }}
                  className="p-2 hover:bg-accent-main/10 rounded-lg text-text-lo hover:text-accent-main transition-all"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectPoema(p); }}
                  className="p-2 hover:bg-success/10 rounded-lg text-text-lo hover:text-success transition-all"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

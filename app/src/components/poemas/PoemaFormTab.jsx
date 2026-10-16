import { Wand2, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PoemaFormTab({
  editForm,
  setEditForm,
  setAbaAtiva,
  reformatarComIA,
  processando,
  salvarEdicao
}) {
  return (
    <motion.div
      key="edit"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="max-w-4xl mx-auto w-full pb-32"
    >
      <div className="bg-bg-secondary border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-text-hi">{editForm.id ? 'Editar Poema' : 'Novo Poema'}</h2>
          <button onClick={() => setAbaAtiva('gerenciador')} className="p-2 hover:bg-white/5 rounded-full text-text-lo">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="space-y-1 pr-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-nx-dim/40 ml-1">Título</label>
            <input
              value={editForm.titulo}
              onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
              placeholder="Ex: Mar Português"
              className="w-full bg-nx-depth border border-nx-border rounded-nx-md py-3 px-4 text-nx-bright focus:ring-1 focus:ring-nx-primary outline-none"
            />
          </div>
          <div className="space-y-1 pr-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-nx-dim/40 ml-1">Autor</label>
            <input
              value={editForm.autor}
              onChange={e => setEditForm({ ...editForm, autor: e.target.value })}
              placeholder="Ex: Fernando Pessoa"
              className="w-full bg-nx-depth border border-nx-border rounded-nx-md py-3 px-4 text-nx-bright focus:ring-1 focus:ring-nx-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-nx-dim/40 ml-1">Época / Movimento</label>
            <input
              value={editForm.epoca || ''}
              onChange={e => setEditForm({ ...editForm, epoca: e.target.value })}
              placeholder="Ex: Modernismo"
              className="w-full bg-nx-depth border border-nx-border rounded-nx-md py-2.5 px-4 text-xs text-nx-bright focus:ring-1 focus:ring-nx-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-nx-dim/40 ml-1">Forma Poética</label>
            <input
              value={editForm.forma || ''}
              onChange={e => setEditForm({ ...editForm, forma: e.target.value })}
              placeholder="Ex: Soneto, Livre"
              className="w-full bg-nx-depth border border-nx-border rounded-nx-md py-2.5 px-4 text-xs text-nx-bright focus:ring-1 focus:ring-nx-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-nx-dim/40 ml-1">Ano</label>
            <input
              value={editForm.ano || ''}
              onChange={e => setEditForm({ ...editForm, ano: e.target.value })}
              placeholder="Ex: 1934"
              className="w-full bg-nx-depth border border-nx-border rounded-nx-md py-2.5 px-4 text-xs text-nx-bright focus:ring-1 focus:ring-nx-primary outline-none"
            />
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40">Corpo do Poema</label>
            <button onClick={reformatarComIA} disabled={processando} className="text-[9px] font-bold text-accent-main flex items-center gap-1 hover:underline">
              <Wand2 size={10} /> RE-FORMATAR COM IA
            </button>
          </div>
          <textarea
            value={editForm.corpo}
            onChange={e => setEditForm({ ...editForm, corpo: e.target.value })}
            className="w-full h-80 bg-bg-tertiary border border-white/5 rounded-3xl p-8 text-lg font-serif leading-loose text-text-hi focus:ring-2 focus:ring-accent-main outline-none resize-none"
          />
        </div>

        <div className="space-y-2 mb-10">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40 ml-1">Notas de Estudo</label>
          <textarea
            value={editForm.notas_usuario}
            onChange={e => setEditForm({ ...editForm, notas_usuario: e.target.value })}
            className="w-full h-24 bg-bg-tertiary border border-white/5 rounded-2xl p-6 text-sm text-text-hi focus:ring-2 focus:ring-accent-main outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setAbaAtiva('gerenciador')} className="px-8 py-4 bg-bg-tertiary rounded-2xl font-bold text-text-lo">
            Cancelar
          </button>
          <button onClick={salvarEdicao} className="px-10 py-4 bg-accent-main rounded-2xl font-bold text-white shadow-lg shadow-accent-main/20">
            Salvar Poema
          </button>
        </div>
      </div>
    </motion.div>
  );
}

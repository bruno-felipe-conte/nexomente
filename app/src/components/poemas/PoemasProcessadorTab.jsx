import { Sparkles, Check, Save, Wand2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PoemasProcessadorTab({
  setAbaAtiva,
  processarComIA,
  processando,
  textoParaProcessar,
  setTextoParaProcessar,
  poemasDetectados,
  salvarPoemasIA
}) {
  return (
    <motion.div
      key="processor"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="h-full flex flex-col gap-6 max-w-5xl mx-auto w-full"
    >
      <div className="flex-none bg-bg-secondary border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-main/10 flex items-center justify-center text-accent-main">
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-hi">Extração de Poemas</h2>
              <p className="text-xs text-text-lo/40">O motor de IA irá separar o texto em obras individuais e extrair metadados.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAbaAtiva('gerenciador')}
              className="px-6 py-3 bg-bg-tertiary rounded-xl text-xs font-bold text-text-hi hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={processarComIA}
              disabled={processando || !textoParaProcessar.trim()}
              className="flex items-center gap-2 px-8 py-3 bg-accent-main rounded-xl font-bold text-white shadow-lg shadow-accent-main/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-xs"
            >
              {processando ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Analisando Texto...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Iniciar Processamento IA
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          value={textoParaProcessar}
          onChange={e => setTextoParaProcessar(e.target.value)}
          placeholder="Cole aqui poemas soltos, antologias ou páginas de livros..."
          className="w-full h-56 bg-nx-depth/50 border border-nx-border rounded-nx-md p-6 text-sm text-nx-bright placeholder-nx-dim/20 focus:ring-1 focus:ring-nx-primary outline-none resize-none font-ui leading-relaxed"
        />
      </div>

      {poemasDetectados.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="font-bold text-text-hi text-sm flex items-center gap-2">
              <Check size={18} className="text-success" />
              Análise concluída: {poemasDetectados.length} poemas identificados
            </h3>
            <button
              onClick={salvarPoemasIA}
              className="px-8 py-3 bg-success rounded-xl text-white font-bold text-xs shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save size={16} /> Confirmar e Salvar Tudo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-2">
            {poemasDetectados.map((p, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className="bg-bg-secondary/40 border border-white/5 rounded-2xl p-6 flex gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-text-hi">{p.titulo}</h4>
                    <span className="text-[9px] bg-accent-main/10 text-accent-main px-2 py-0.5 rounded uppercase font-black">{p.forma}</span>
                  </div>
                  <p className="text-[10px] text-text-lo/40 mb-4">{p.autor} · {p.epoca}</p>
                  <pre className="text-[11px] text-text-lo/60 line-clamp-3 font-serif leading-relaxed italic opacity-80 border-l border-white/10 pl-4">
                    {p.corpo}
                  </pre>
                </div>
                <div className="flex flex-wrap content-start gap-1 w-32">
                  {p.tema?.map(t => <span key={t} className="text-[8px] bg-white/5 px-2 py-1 rounded-full text-text-lo/60">#{t}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

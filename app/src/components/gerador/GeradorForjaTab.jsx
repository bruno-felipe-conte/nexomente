import { useEffect } from 'react';
import { Sparkles, Upload, Wand2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import QuestaoCard from './QuestaoCard';

export default function GeradorForjaTab({
  step,
  setStep,
  textoInput,
  setTextoInput,
  fileInputRef,
  configIA,
  setConfigIA,
  materias = [],
  bancas = [],
  handleGerarIA,
  progresso,
  questoes,
  atualizarQuestao,
  handleCriarFlashcard,
  deletarQuestao,
  setAba
}) {
  useEffect(() => {
    const textoSalvo = sessionStorage.getItem('nexomente_forja_texto');
    if (textoSalvo && setTextoInput) {
      setTextoInput(textoSalvo);
      sessionStorage.removeItem('nexomente_forja_texto');
    }
  }, [setTextoInput]);

  return (
    <div className="h-full max-w-6xl mx-auto flex flex-col">
      {/* STEP 1: ENTRADA */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col space-y-6"
        >
          <div className="flex-1 flex flex-col min-h-0 bg-[#1A1A1A] border border-[#333] rounded-[1.5rem] overflow-hidden group focus-within:border-color-gerador/30 transition-all shadow-2xl">
            <textarea
              value={textoInput}
              onChange={(e) => setTextoInput(e.target.value)}
              placeholder="Deposite aqui seu material de estudo para que a inteligência forje questões personalizadas..."
              className="flex-1 w-full p-10 bg-transparent resize-none text-text-hi focus:outline-none text-lg leading-relaxed scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent placeholder:text-text-lo/20"
            />

            {/* Toolbar de Utilidades */}
            <div className="px-8 py-4 bg-[#0D0D0D] border-t border-[#333] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-text-lo hover:text-color-gerador transition-colors"
                >
                  <Upload size={14} /> Importar Arquivo
                </button>
                <div className="h-3 w-[1px] bg-surface-border" />
                <span className="text-[9px] text-text-lo/40 font-bold uppercase tracking-[0.2em]">.txt, .md, .pdf</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-base/50 rounded-lg border border-surface-border">
                  <span className="text-[10px] font-black tabular-nums text-text-hi">{textoInput.length.toLocaleString()}</span>
                  <span className="text-[9px] font-bold text-text-lo/60 uppercase tracking-tight">Caracteres</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pb-4">
            <button
              onClick={() => setStep(2)}
              disabled={!textoInput.trim()}
              className="group flex items-center gap-3 px-12 py-5 bg-color-gerador text-surface-base rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] hover:shadow-xl hover:shadow-color-gerador/20 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              Configurar Forja
              <Wand2 size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: CONFIGURAR */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full flex flex-col justify-center space-y-8 pb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Volume */}
            <div className="p-6 bg-surface-card/40 border border-surface-border rounded-[2.5rem] space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo text-center block">Volume</span>
              <div className="flex flex-col gap-2">
                {[5, 10, 15, 20].map(v => (
                  <button
                    key={v}
                    onClick={() => setConfigIA(prev => ({ ...prev, quantidade: v }))}
                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border
                      ${configIA.quantidade === v ? 'bg-color-gerador/20 border-color-gerador text-color-gerador shadow-lg shadow-color-gerador/10' : 'bg-surface-elevated border-transparent text-text-lo hover:text-text-mid'}`}
                  >
                    {v} Questões
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo */}
            <div className="p-6 bg-surface-card/40 border border-surface-border rounded-[2.5rem] space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo text-center block">Formato</span>
              <div className="flex flex-col gap-2">
                {['multipla-escolha', 'v-f', 'discursiva'].map(t => (
                  <button
                    key={t}
                    onClick={() => setConfigIA(prev => ({ ...prev, tipo: t }))}
                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border
                      ${configIA.tipo === t ? 'bg-color-gerador/20 border-color-gerador text-color-gerador shadow-lg shadow-color-gerador/10' : 'bg-surface-elevated border-transparent text-text-lo hover:text-text-mid'}`}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Rigor */}
            <div className="p-6 bg-surface-card/40 border border-surface-border rounded-[2.5rem] space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo text-center block">Rigor</span>
              <div className="flex flex-col gap-2">
                {['fácil', 'médio', 'difícil'].map(d => (
                  <button
                    key={d}
                    onClick={() => setConfigIA(prev => ({ ...prev, dificuldade: d }))}
                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border
                      ${configIA.dificuldade === d ? 'bg-color-gerador/20 border-color-gerador text-color-gerador shadow-lg shadow-color-gerador/10' : 'bg-surface-elevated border-transparent text-text-lo hover:text-text-mid'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Cérebro (Motor Local) */}
            <div className="p-6 bg-surface-card/40 border border-surface-border rounded-[2.5rem] space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo text-center block">Cérebro da Forja</span>
              <div className="flex flex-col gap-2">
                <div className="w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-color-gerador/20 border border-color-gerador text-color-gerador shadow-lg shadow-color-gerador/10">
                  <Sparkles size={14} />
                  Motor Interno GGUF
                </div>
              </div>
            </div>
          </div>

          {/* Seletores de Matéria, Banca e Filtro BM25 de Tópico */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-surface-card/40 border border-surface-border rounded-3xl flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo shrink-0">Matéria</span>
              <select
                value={configIA.materia || ''}
                onChange={(e) => setConfigIA(prev => ({ ...prev, materia: e.target.value }))}
                className="flex-1 bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-hi outline-none focus:border-color-gerador/50 cursor-pointer"
              >
                <option value="">Geral / Automática</option>
                {materias.map(m => (
                  <option key={m.id || m.nome} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="p-5 bg-surface-card/40 border border-surface-border rounded-3xl flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo shrink-0">Banca</span>
              <select
                value={configIA.banca || 'Geral'}
                onChange={(e) => setConfigIA(prev => ({ ...prev, banca: e.target.value }))}
                className="flex-1 bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-hi outline-none focus:border-color-gerador/50 cursor-pointer"
              >
                <option value="Geral">Geral</option>
                {bancas.map(b => (
                  <option key={b.key || b.nome} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>
            <div className="p-5 bg-surface-card/40 border border-surface-border rounded-3xl flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-text-lo shrink-0">Foco BM25</span>
              <input
                type="text"
                value={configIA.topico || ''}
                onChange={(e) => setConfigIA(prev => ({ ...prev, topico: e.target.value }))}
                placeholder="Todo o documento ou tópico..."
                className="flex-1 bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-hi outline-none focus:border-color-gerador/50 placeholder:text-text-lo/40"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-10 py-5 bg-surface-elevated text-text-mid rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-text-hi transition-all">Voltar</button>
              <button onClick={handleGerarIA} className="px-16 py-5 bg-color-gerador text-surface-base rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-color-gerador/30 hover:scale-105 active:scale-95 transition-all">Forjar Agora</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: GERAR */}
      {step === 3 && (
        <div className="h-full flex flex-col items-center justify-center space-y-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-surface-border border-t-color-gerador animate-spin" />
            <Wand2 size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-color-gerador animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl font-black text-text-hi uppercase tracking-tighter">Forjando Conhecimento...</h2>
            <div className="w-64 h-1.5 bg-surface-card rounded-full overflow-hidden mx-auto">
              <motion.div className="h-full bg-color-gerador" animate={{ width: `${progresso}%` }} />
            </div>
            <span className="text-[10px] font-black text-color-gerador uppercase tracking-widest tabular-nums">{progresso}%</span>
          </div>
        </div>
      )}

      {/* STEP 4: REVISAR */}
      {step === 4 && (
        <div className="h-full flex flex-col space-y-6 overflow-hidden">
          <div className="flex items-center justify-between shrink-0 flex-wrap gap-4">
            <div>
              <h2 className="font-display text-2xl font-black text-text-hi uppercase tracking-tighter">Revisão do Lote</h2>
              <p className="text-[10px] text-text-lo/60 font-mono uppercase tracking-wider mt-0.5">
                {Math.min(questoes.length, configIA.quantidade)} questões forjadas prontas para uso
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const lote = questoes.slice(0, configIA.quantidade);
                  let criados = 0;
                  lote.forEach(q => {
                    if (handleCriarFlashcard(q.id, true)) criados++;
                  });
                  toast.success(`${criados} flashcards adicionados ao baralho!`);
                }}
                className="px-6 py-4 bg-surface-card border border-white/10 hover:border-accent-main/30 text-text-hi rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-white/5 transition-all cursor-pointer"
              >
                <BookOpen size={14} className="text-accent-main" />
                Converter Todas em Cards
              </button>
              <button
                onClick={() => {
                  toast.success('Flashcards forjados com sucesso!');
                  setAba('revisar');
                  setStep(1);
                }}
                className="px-8 py-4 bg-color-gerador text-surface-base rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-color-gerador/20"
              >
                Concluir e Salvar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent space-y-6">
            {questoes.slice(0, configIA.quantidade).map((q) => (
              <QuestaoCard key={q.id} questao={q} onEditar={atualizarQuestao} onCriarFlashcard={handleCriarFlashcard} onDeletar={deletarQuestao} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

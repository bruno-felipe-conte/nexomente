import { useState, useRef, useMemo, useCallback } from 'react';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import { 
  FileText, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Brain, 
  ChevronRight, 
  Plus, 
  Trash2, 
  RefreshCw,
  Clock,
  Settings,
  Cloud,
  ChevronLeft,
  LayoutGrid,
  Library,
  Upload,
  Search,
  Wand2,
  Loader2,
  FileDown,
  ClipboardList
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportarParaTexto, exportarDOC, exportarParaJSON } from '../services/exportService';
import GerarIAModal from '../components/gerador/GerarIAModal';
import QuestaoCard from '../components/gerador/QuestaoCard';
import Tooltip from '../components/ui/Tooltip';

export default function GeradorPage() {
  const { questoes, carregando, progresso, erro, bancas, addBanca, removeBanca,
    processarTexto, gerarComIA, atualizarQuestao, deletarQuestao,
    criarFlashcards, getEstatisticas, getQuestoesFiltradas,
  } = useGerador();
  
  const { materias, create: createMateria, update: updateMateria, remove: removeMateria } = useMaterias();
  
  const [aba, setAba] = useState('upload');
  const [step, setStep] = useState(1); // 1: Entrada, 2: Configurar, 3: Gerar, 4: Revisar
  const [textoInput, setTextoInput] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  
  // Configurações da IA (Movidas do Modal para Inline)
  const [configIA, setConfigIA] = useState({
    quantidade: 5,
    tipo: 'multipla-escolha',
    dificuldade: 'médio',
    materia: '',
    banca: 'Geral',
    provider: 'embedded'
  });

  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroBanca, setFiltroBanca] = useState('');
  const [busca, setBusca] = useState('');
  const [showCriar, setShowCriar] = useState(false);
  const [novaBancaNome, setNovaBancaNome] = useState('');
  const [novaMateriaNome, setNovaMateriaNome] = useState('');
  const [erroCode, setErroCode] = useState(null);
  const fileInputRef = useRef(null);
  
  const stats = useMemo(() => getEstatisticas(), [questoes]);
  const questoesFiltradas = useMemo(
    () => getQuestoesFiltradas({ materia: filtroMateria, banca: filtroBanca }),
    [questoes, filtroMateria, filtroBanca]
  );
  const questoesExibir = useMemo(() => {
    if (!busca) return questoesFiltradas;
    const b = busca.toLowerCase();
    return questoesFiltradas.filter(q =>
      q.pergunta.toLowerCase().includes(b) ||
      (q.materia || '').toLowerCase().includes(b) ||
      (q.topico || '').toLowerCase().includes(b)
    );
  }, [questoesFiltradas, busca]);
  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTextoInput(event.target.result);
      setArquivoSelecionado(file);
      setStep(2); // Avança automaticamente ao carregar arquivo
    };
    reader.readAsText(file);
  };
  
  const handleProcessar = async () => {
    setErroCode(null);
    if (!textoInput.trim()) {
      toast.error('Cole um texto ou faça upload de um arquivo');
      return;
    }
    
    const tipo = arquivoSelecionado?.name?.endsWith('.md') ? 'md' : 'txt';
    const resultado = await processarTexto(textoInput, tipo);
    
    if (resultado.success) {
      toast.success(`${resultado.total} questões processadas!`);
      setTextoInput('');
      setArquivoSelecionado(null);
      setAba('banco');
    } else {
      setErroCode(resultado.code || 'ERR-PRC-001');
      toast.error(resultado.erro);
    }
  };
  
  const handleGerarIA = async () => {
    setErroCode(null);
    if (!textoInput.trim()) {
      toast.error('Cole um texto para gerar questões');
      return;
    }
    
    setStep(3); // Inicia animação de geração
    const resultado = await gerarComIA(textoInput, configIA);
    
    if (resultado.success) {
      if (resultado.total > 0) {
        toast.success(`${resultado.total} questões geradas com IA!`);
        setTextoInput('');
        setStep(4); // Vai para revisão
      } else {
        setErroCode('ERR-GEN-003');
        toast.error('Não conseguimos extrair questões válidas da resposta.');
        setStep(2);
      }
    } else {
      setErroCode(resultado.code || 'ERR-GEN-UNK');
      toast.error(resultado.erro || 'Erro na geração por IA.');
      setStep(2);
    }
  };

  const handleAddBanca = () => {
    if (!novaBancaNome.trim()) return;
    addBanca(novaBancaNome.trim());
    setNovaBancaNome('');
    toast.success('Banca adicionada!');
  };

  const handleAddMateria = () => {
    if (!novaMateriaNome.trim()) return;
    createMateria({ nome: novaMateriaNome.trim() });
    setNovaMateriaNome('');
    toast.success('Matéria adicionada!');
  };

  const handleCriarFlashcard = (questaoId) => {
    const cardId = criarFlashcards(questaoId);
    if (cardId) toast.success('Flashcard criado!');
  };

  const handleExportar = (tipo) => {
    const questoesParaExportar = filtroMateria
      ? getQuestoesFiltradas({ materia: filtroMateria })
      : questoes;
    if (tipo === 'doc') {
      exportarDOC(questoesParaExportar, { titulo: 'Banco de Questões' });
      toast.success('DOC exportado!');
    } else if (tipo === 'txt') {
      const texto = exportarParaTexto(questoesParaExportar, { titulo: 'Banco de Questões' });
      const blob = new Blob([texto], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('TXT exportado!');
    } else if (tipo === 'json') {
      const json = exportarParaJSON(questoesParaExportar);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado!');
    }
  };

  const STEPS = [
    { id: 1, label: 'Entrada', icon: Upload },
    { id: 2, label: 'Configurar', icon: Settings },
    { id: 3, label: 'Gerar', icon: Wand2 },
    { id: 4, label: 'Revisar', icon: ClipboardList }
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-surface-base p-8">
      {/* Header Premium (E7) — Shrink-0 para não ser comprimido */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-color-gerador/10 text-color-gerador text-[10px] font-black uppercase tracking-widest rounded-md border border-color-gerador/20">
              Módulo Inteligente
            </span>
          </div>
          <h1 className="font-display text-4xl font-black text-text-hi tracking-tight leading-none">
            Gerador de Questões
          </h1>
          <div className="flex items-center gap-6">
            <p className="text-xs text-text-lo font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-color-gerador shadow-[0_0_8px_var(--color-gerador)]" />
              {stats.total} questões no banco
            </p>
            <div className="h-4 w-[1px] bg-surface-border" />
            <p className="text-xs text-text-lo font-medium">
              {Object.keys(stats.porMateria).length} matérias ativas
            </p>
          </div>
        </div>

        {/* Indicador de Steps (E7.1) */}
        <div className="flex items-center gap-3 bg-surface-card/50 p-1.5 rounded-2xl border border-surface-border/50 backdrop-blur-sm">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                ${step === s.id ? 'bg-color-gerador text-surface-base shadow-lg shadow-color-gerador/20' : 'text-text-lo'}
              `}>
                <s.icon size={14} className={step === s.id ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="w-2 h-[1px] bg-surface-border opacity-50" />}
            </div>
          ))}
        </div>
      </div>
      
      {/* Navegação de Abas — Shrink-0 */}
      <div className="flex border-b border-surface-border mb-8 shrink-0">
        {[
          { id: 'upload', label: 'Criação' },
          { id: 'banco', label: `Banco (${questoes.length})` },
          { id: 'stats', label: 'Desempenho' },
          { id: 'gestao', label: 'Organização' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`px-6 py-3 transition-all text-[10px] font-black uppercase tracking-[0.2em] border-b-2 relative
              ${aba === t.id ? 'border-color-gerador text-color-gerador' : 'border-transparent text-text-lo hover:text-text-mid'}`}
          >
            {t.label}
            {aba === t.id && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-color-gerador" />
            )}
          </button>
        ))}
      </div>
      
      {/* Área de Conteúdo — Flex-1 com scroll interno controlado */}
      <div className="flex-1 min-h-0">
        {aba === 'upload' && (
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
                    
                    {/* Toolbar de Utilidades (Mais escura que a caixa) */}
                    <div className="px-8 py-4 bg-[#0D0D0D] border-t border-[#333] flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-text-lo hover:text-color-gerador transition-colors"
                        >
                          <Upload size={14} /> Importar Arquivo
                        </button>
                        <div className="h-3 w-[1px] bg-surface-border" />
                        <span className="text-[9px] text-text-lo/40 font-bold uppercase tracking-[0.2em]">.txt, .md</span>
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

            {/* STEP 2: CONFIGURAR — Mais compacto para evitar scroll */}
            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full flex flex-col justify-center space-y-8 pb-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Volume (Presets para consistência) */}
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

                  {/* CÉREBRO (Provider) */}
                  <div className="p-6 bg-surface-card/40 border border-surface-border rounded-[2.5rem] space-y-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-text-lo text-center block">Cérebro da Forja</span>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'embedded', label: 'Interno', icon: Sparkles },
                        { id: 'cloud',    label: 'Nuvem',   icon: Cloud },
                        { id: 'local',    label: 'Local',    icon: Settings }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setConfigIA(prev => ({ ...prev, provider: p.id }))}
                          className={`w-full py-2.5 px-3 flex items-center justify-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border
                            ${configIA.provider === p.id ? 'bg-color-gerador/20 border-color-gerador text-color-gerador shadow-lg shadow-color-gerador/10' : 'bg-surface-elevated border-transparent text-text-lo hover:text-text-mid'}`}
                        >
                          <p.icon size={13} />
                          {p.label}
                        </button>
                      ))}
                    </div>
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

            {step === 4 && (
              <div className="h-full flex flex-col space-y-6 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="font-display text-2xl font-black text-text-hi uppercase tracking-tighter">Revisão do Lote</h2>
                  <button onClick={() => { setAba('banco'); setStep(1); }} className="px-8 py-4 bg-color-gerador text-surface-base rounded-2xl font-black uppercase tracking-widest text-[10px]">Concluir e Salvar</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent space-y-6">
                  {questoes.slice(0, configIA.quantidade).map((q) => (
                    <QuestaoCard key={q.id} questao={q} onEditar={atualizarQuestao} onCriarFlashcard={handleCriarFlashcard} onDeletar={deletarQuestao} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {aba === 'banco' && (
          <div className="h-full max-w-6xl mx-auto flex flex-col space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between shrink-0">
              <div className="flex-1 w-full relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-lo group-focus-within:text-color-gerador transition-colors" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar questões..." className="w-full pl-12 pr-4 py-4 bg-surface-card border border-surface-border rounded-2xl text-sm text-text-hi outline-none focus:border-color-gerador/40" />
              </div>
              <div className="flex gap-3">
                <select value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)} className="px-6 py-4 bg-surface-card border border-surface-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-hi outline-none focus:border-color-gerador/40">
                  <option value="">Matérias</option>
                  {materias.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                </select>
                <button onClick={() => handleExportar('doc')} className="p-4 bg-surface-card border border-surface-border rounded-2xl text-text-lo hover:text-text-hi transition-all"><FileDown size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent space-y-6">
              {questoesExibir.length > 0 ? (
                questoesExibir.map((q) => (
                  <QuestaoCard key={q.id} questao={q} onEditar={atualizarQuestao} onCriarFlashcard={handleCriarFlashcard} onDeletar={deletarQuestao} />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-surface-card/20 rounded-[3rem] border-2 border-dashed border-surface-border">
                  <FileText size={32} className="text-text-lo" />
                  <p className="text-xs text-text-lo font-bold uppercase tracking-widest">Nenhuma questão encontrada</p>
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'stats' && (
          <div className="h-full overflow-y-auto pr-4 scrollbar-none pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { label: 'Por Matéria', stats: stats.porMateria, color: 'color-notas' },
                { label: 'Por Banca', stats: stats.porBanca, color: 'color-gerador' },
                { label: 'Por Nível', stats: stats.porNivel, color: 'color-success' }
              ].map((card, i) => (
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
                          <div className={`h-full bg-var(--${card.color}) opacity-40`} style={{ width: `${(val / stats.total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'gestao' && (
          <div className="h-full overflow-y-auto pr-4 scrollbar-none pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="p-8 bg-surface-card border border-surface-border rounded-[2.5rem] space-y-8 h-fit">
                <h3 className="font-display text-xl font-black text-text-hi uppercase tracking-tighter">Matérias</h3>
                <div className="flex gap-3">
                  <input value={novaMateriaNome} onChange={(e) => setNovaMateriaNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMateria()} placeholder="Add matéria..." className="flex-1 px-5 py-3 bg-surface-base border border-surface-border rounded-xl text-xs text-text-hi outline-none focus:border-color-notas/50" />
                  <button onClick={handleAddMateria} className="px-6 py-3 bg-color-notas text-surface-base rounded-xl text-[10px] font-black uppercase tracking-widest">Add</button>
                </div>
                <div className="space-y-2">
                  {materias.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-4 bg-surface-base/50 border border-surface-border rounded-xl group">
                      <span className="text-xs font-bold text-text-hi">{m.nome}</span>
                      <button onClick={() => removeMateria(m.id)} className="p-2 text-text-lo hover:text-color-error"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-surface-card border border-surface-border rounded-[2.5rem] space-y-8 h-fit">
                <h3 className="font-display text-xl font-black text-text-hi uppercase tracking-tighter">Bancas</h3>
                <div className="flex gap-3">
                  <input value={novaBancaNome} onChange={(e) => setNovaBancaNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddBanca()} placeholder="Add banca..." className="flex-1 px-5 py-3 bg-surface-base border border-surface-border rounded-xl text-xs text-text-hi outline-none focus:border-color-gerador/50" />
                  <button onClick={handleAddBanca} className="px-6 py-3 bg-color-gerador text-surface-base rounded-xl text-[10px] font-black uppercase tracking-widest">Add</button>
                </div>
                <div className="space-y-2">
                  {bancas.map(b => (
                    <div key={b.key} className="flex justify-between items-center p-4 bg-surface-base/50 border border-surface-border rounded-xl group">
                      <span className="text-xs font-bold text-text-hi">{b.nome}</span>
                      <button onClick={() => removeBanca(b.key)} className="p-2 text-text-lo hover:text-color-error"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
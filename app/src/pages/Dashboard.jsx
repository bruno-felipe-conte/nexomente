import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Brain, BookOpen, 
  ArrowRight, Sparkles, Play, Plus,
  ChevronRight, ChevronLeft, Calendar, Edit, Star,
  ChevronDown, ChevronUp, Mic, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useDBStore } from '../store/useDBStore';
import { usePoemas } from '../hooks/useMaterias';
import toast from 'react-hot-toast';
import { useUIStore } from '../store/useUIStore';
import { useWhisper } from '../hooks/useWhisper';
import { useRecitacaoSettings } from '../components/settings/RecitacaoSettings';
import { compareVerses } from '../utils/textUtils';

export default function Dashboard() {
  const { player } = useTamagotchiStore();
  const { Notas, Flashcards, SessoesEstudo } = useDBStore();
  const { poemas, registrarRecitacao } = usePoemas();
  const { userName } = useUIStore();
  const [isPoemExpanded, setIsPoemExpanded] = useState(false);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [recitationFeedback, setRecitationFeedback] = useState(null);
  
  const poemaVigente = poemas?.[currentPoemIndex];

  const { settings } = useRecitacaoSettings();
  const activeLanguage = (settings.usePoemLanguage ?? true)
    ? poemaVigente?.idioma || 'portuguese' : (settings.defaultLanguage ?? 'portuguese');

  const { 
    status, startRecording, stopRecording, downloadProgress 
  } = useWhisper({
    language: activeLanguage,
    onResult: (text) => {
      if (!poemaVigente) return;
      const feedback = compareVerses(poemaVigente.corpo, text);
      setRecitationFeedback(feedback);
      
      if (feedback.accuracy >= (settings.threshold || 85)) {
        registrarRecitacao(poemaVigente.id);
        toast.success(`Recitação Impecável! Precisão: ${Math.round(feedback.accuracy)}%. XP Liberado!`);
      } else {
        toast.error(`Recitação Incompleta (${Math.round(feedback.accuracy)}%). Tente ler com clareza.`);
      }
    }
  });

  const isRecording = status === 'recording';
  const isTranscribing = status === 'processing';

  
  useEffect(() => {
    if (poemas && poemas.length > 0) {
      const favIndex = poemas.findIndex(p => p.favorito);
      setCurrentPoemIndex(favIndex !== -1 ? favIndex : 0);
    }
  }, [poemas]);



  const nextPoem = () => {
    if (!poemas || poemas.length === 0) return;
    setRecitationFeedback(null);
    setCurrentPoemIndex((prev) => (prev + 1) % poemas.length);
  };

  const prevPoem = () => {
    if (!poemas || poemas.length === 0) return;
    setRecitationFeedback(null);
    setCurrentPoemIndex((prev) => (prev - 1 + poemas.length) % poemas.length);
  };
  
  const notas = Notas?.getAll() || [];
  const flashcards = Flashcards?.getAll() || [];
  const studySessions = SessoesEstudo?.getAll() || [];
  
  // Cálculo de estatísticas reais
  const hoje = new Date().toISOString().split('T')[0];
  const minutosHoje = studySessions
    ?.filter(s => s.started_at && s.started_at.startsWith(hoje))
    .reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) || 0;
  
  // Mock ou cálculo para cards de revisão (SRS)
  const cardsParaRevisao = flashcards?.filter(c => c.next_review && new Date(c.next_review) <= new Date()) || [];

  return (
    <div className="main-content min-h-screen p-4 md:p-8 lg:p-10 space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-text-hi tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-hi to-text-mid">
            Bem-vindo, {userName}
          </h1>
          <p className="text-text-mid text-base md:text-lg font-medium opacity-80">Seu ecossistema de conhecimento está evoluindo.</p>
        </div>
        
        {/* Status Rápido no Header */}
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
           <div className="px-4 py-2 text-center border-r border-white/10">
              <p className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Nível</p>
              <p className="text-xl font-black text-accent-main">{player.level}</p>
           </div>
           <div className="px-4 py-2 text-center">
              <p className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Ofensiva</p>
              <p className="text-xl font-black text-color-warning flex items-center gap-1">
                {player.streak}<span className="text-sm">d</span>
              </p>
           </div>
        </div>
      </div>

      {/* FAIXA 1: CONTEÚDO (Mascote + Notas | Poema) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        
        {/* Lado Esquerdo: Identidade & Notas (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
           {/* Mascote */}
           <TamagotchiWidget className="glass-panel border-white/10 shadow-2xl h-fit py-10 w-full rounded-[2.5rem]" />
           
           {/* Notas Recentes */}
           <div className="flex-1 flex flex-col space-y-6">
             <div className="flex items-center justify-between px-4">
               <h3 className="text-xl font-bold text-text-hi font-display">Notas Recentes</h3>
               <button 
                 onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
                 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-main hover:text-white transition-colors"
               >
                 Ver Todas
               </button>
             </div>

             <div className="flex-1 grid grid-cols-1 gap-4 h-full">
               {notas.slice(0, 3).map((nota) => (
                 <Card 
                   key={nota.id} 
                   interactive 
                   className="glass-panel border-white/5 p-6 group hover:border-accent-main/30 transition-all rounded-[2rem] flex flex-col justify-center min-h-[140px]"
                   onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
                 >
                   <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-main/10 flex items-center justify-center text-accent-main group-hover:bg-accent-main group-hover:text-white transition-all">
                         <FileText size={18} />
                      </div>
                      <span className="text-[9px] font-bold text-text-lo/40 uppercase tracking-widest">{new Date(nota.atualizado_em).toLocaleDateString()}</span>
                   </div>
                   <h4 className="text-base font-bold text-text-hi mb-1 group-hover:text-accent-main transition-colors line-clamp-1">{nota.titulo}</h4>
                   <p className="text-xs text-text-mid line-clamp-2 opacity-60 leading-relaxed">
                     {nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 80) || 'Sem conteúdo adicional...'}
                   </p>
                 </Card>
               ))}
               {(notas.length === 0 || notas.length < 3) && (
                 <div className="flex-1 min-h-[200px] glass-panel border-dashed border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-all rounded-[2rem]"
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-text-lo/20 group-hover:scale-110 transition-transform">
                       <Plus size={24} />
                    </div>
                    <p className="text-text-lo text-xs font-bold uppercase tracking-[0.2em]">Sua Galeria de Notas</p>
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* Lado Direito: Poema Editorial (7/12) */}
        <div className="lg:col-span-7">
          {poemaVigente ? (
            <Card className={`glass-panel border-pink-500/10 relative overflow-hidden p-8 md:p-12 group hover-lift transition-all duration-700 flex flex-col rounded-[2.5rem] h-full ${isPoemExpanded ? 'max-h-none' : 'max-h-none min-h-[500px]'}`}>
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-pink-500/5 rounded-full blur-[100px] group-hover:bg-pink-500/10 transition-colors" />
              
              {/* Botões de Navegação Lateral */}
              <div className="absolute inset-y-0 left-4 z-20 flex items-center">
                <button 
                  onClick={prevPoem}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-hi opacity-20 group-hover:opacity-100 transition-all border border-white/10"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
              <div className="absolute inset-y-0 right-4 z-20 flex items-center">
                <button 
                  onClick={nextPoem}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-hi opacity-20 group-hover:opacity-100 transition-all border border-white/10"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <header className="flex items-center justify-between mb-8 md:mb-12">
                  <span className="px-4 py-1.5 bg-pink-500/10 text-pink-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-pink-500/20">
                    {poemaVigente.favorito ? 'Destaque Literário' : 'Poesia Selecionada'}
                  </span>
                  <span className="text-[10px] font-bold text-text-lo/40 uppercase tracking-widest">
                    {currentPoemIndex + 1} / {poemas.length}
                  </span>
                </header>

                <div className="flex-1 flex flex-col justify-center px-6 md:px-12">
                  <h2 className="text-3xl md:text-5xl font-display font-bold text-text-hi mb-6 md:mb-10 leading-tight max-w-2xl tracking-tight">
                    {poemaVigente.titulo}
                  </h2>
                  <div 
                    className={`text-text-mid italic font-serif text-lg md:text-xl leading-relaxed max-w-2xl opacity-90 whitespace-pre-wrap transition-all duration-700 ${isPoemExpanded ? '' : 'line-clamp-6 md:line-clamp-8'}`}
                    style={{ fontFamily: 'Georgia, serif' }}
                    dangerouslySetInnerHTML={{ __html: poemaVigente.corpo?.replace(/\n/g, '<br/>') || '' }}
                  />
                </div>

                <footer className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between px-6 md:px-12">
                    <button 
                      onClick={() => setIsPoemExpanded(!isPoemExpanded)}
                      className="px-8 py-4 bg-text-hi text-surface-base font-black text-[11px] uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-3"
                    >
                      {isPoemExpanded ? (
                        <>Recolher Obra <ChevronUp size={16} /></>
                      ) : (
                        <>Ler Obra Completa <ChevronDown size={16} /></>
                      )}
                    </button>
                    
                    {isPoemExpanded && (
                      <div className="flex items-center gap-4">
                        {recitationFeedback && (
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${recitationFeedback.accuracy >= 85 ? 'bg-success/10 text-success border-success/20' : 'bg-color-error/10 text-color-error border-color-error/20'}`}>
                            {recitationFeedback.accuracy >= 85 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {Math.round(recitationFeedback.accuracy)}% Precisão
                          </div>
                        )}

                        <button 
                          disabled={status !== 'ready' || isTranscribing}
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`p-4 rounded-2xl transition-all group relative ${
                            status === 'loading' ? 'bg-white/5 text-color-warning' :
                            isRecording ? 'bg-color-error text-white animate-pulse' : 
                            'bg-success/20 text-success hover:bg-success hover:text-white'
                          } ${status !== 'ready' && status !== 'recording' ? 'opacity-50 cursor-wait' : ''}`}
                          title={
                            status === 'loading' ? "Carregando Modelo IA..." :
                            isRecording ? "Parar e Analisar" : "Recitar Poema Inteiro para XP"
                          }
                        >
                          {status === 'loading' || isTranscribing ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Mic size={20} />
                          )}
                          {isRecording && (
                            <div className="absolute inset-0 rounded-2xl border-4 border-white/20 animate-ping" />
                          )}
                        </button>
                      </div>
                    )}
                </footer>
              </div>
            </Card>
          ) : (
            <Card className="glass-panel border-dashed border-white/10 flex flex-col items-center justify-center p-12 md:p-20 text-center group transition-all hover:bg-white/[0.02] rounded-[2.5rem] h-full min-h-[500px]">
              <div className="w-20 h-20 rounded-[2rem] bg-surface-raised flex items-center justify-center mb-8 inner-shadow group-hover:scale-110 transition-transform">
                 <BookOpen size={32} className="text-text-lo" />
              </div>
              <h3 className="text-2xl font-bold text-text-hi mb-4">Momento de Inspiração</h3>
              <p className="text-text-mid text-base max-w-xs mb-10">Nenhum poema foi selecionado para hoje.</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                className="px-10 py-4 bg-surface-raised text-text-hi text-xs font-bold uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:border-pink-500/40 transition-all"
              >
                Criar Poesia
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* FAIXA 2: OPERACIONAL (Comandos | Métricas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* Bloco de Comandos (5/12 - Alinhado com Notas) */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-xl font-bold text-text-hi font-display px-4">Comandos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {[
              { id: 'notes', label: 'Nova Nota', desc: 'Capture uma ideia', icon: Edit, color: 'bg-blue-500/20', glow: 'bg-blue-500/30', text: 'text-blue-400', border: 'hover:border-blue-500/40' },
              { id: 'study', label: 'Iniciar Estudo', desc: 'Focar no conhecimento', icon: Play, color: 'bg-teal-500/20', glow: 'bg-teal-500/30', text: 'text-teal-400', border: 'hover:border-teal-500/40' },
              { id: 'flashcards', label: 'Revisar Cards', desc: 'Fortalecer memória', icon: Brain, color: 'bg-purple-500/20', glow: 'bg-purple-500/30', text: 'text-purple-400', border: 'hover:border-purple-500/40' },
              { id: 'gerador', label: 'Gerar Conteúdo', desc: 'IA ao seu serviço', icon: Sparkles, color: 'bg-pink-500/20', glow: 'bg-pink-500/30', text: 'text-pink-400', border: 'hover:border-pink-500/40' },
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: action.id }))}
                className={`w-full flex items-center gap-6 p-5 rounded-[2.2rem] glass-panel border-white/5 ${action.border} hover:bg-white/[0.02] transition-all duration-500 group h-fit relative overflow-hidden`}
              >
                {/* Aura Radial de Fundo (Aura Neon) */}
                <div className={`absolute left-10 top-1/2 -translate-y-1/2 w-20 h-20 ${action.glow} rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                <div className="relative z-10 flex items-center gap-6 w-full">
                  {/* Container do Ícone com Glow Próprio */}
                  <div className="relative">
                    <div className={`absolute inset-0 ${action.glow} blur-xl rounded-full opacity-40 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700`} />
                    <div className={`relative w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center ${action.text} shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                      <action.icon size={22} className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                    </div>
                  </div>

                  <div className="flex-1 text-left">
                    <p className="text-base font-bold text-text-hi group-hover:text-glow transition-all duration-300">{action.label}</p>
                    <p className="text-[10px] font-black text-text-lo uppercase tracking-[0.2em] opacity-40 group-hover:opacity-80 transition-opacity">{action.desc}</p>
                  </div>

                  <ChevronRight size={16} className="text-text-lo opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bloco de Métricas (7/12 - Alinhado com Poema) */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xl font-bold text-text-hi font-display px-4">Métricas</h3>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Notas', value: notas.length, unit: '', icon: FileText, color: 'text-blue-400', glow: 'bg-blue-500/20', shadow: 'shadow-blue-500/40', border: 'hover:border-blue-500/40' },
              { label: 'Minutos', value: minutosHoje, unit: 'm', icon: Clock, color: 'text-teal-400', glow: 'bg-teal-500/20', shadow: 'shadow-teal-500/40', border: 'hover:border-teal-500/40' },
              { label: 'Revisar', value: cardsParaRevisao.length, unit: '', icon: Brain, color: 'text-amber-400', glow: 'bg-amber-500/20', shadow: 'shadow-amber-500/40', border: 'hover:border-amber-500/40' },
              { label: 'Cards', value: flashcards.length, unit: '', icon: BookOpen, color: 'text-purple-400', glow: 'bg-purple-500/20', shadow: 'shadow-purple-500/40', border: 'hover:border-purple-500/40' },
            ].map((stat, i) => (
              <Card key={i} interactive className={`glass-panel border-white/5 ${stat.border} p-6 flex flex-col relative overflow-hidden group rounded-[2.5rem] min-h-[220px] h-full transition-all duration-700`}>
                
                {/* LUZ AMBIENTAL DE FUNDO */}
                <div className={`absolute -right-4 -bottom-4 w-40 h-40 ${stat.glow} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${stat.glow} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                   {/* Cabeçalho do Card: Ícone em cápsula */}
                   <div className="flex justify-between items-start">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${stat.color} backdrop-blur-md shadow-inner group-hover:scale-110 group-hover:border-white/20 transition-all duration-500`}>
                         <stat.icon size={22} className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-text-lo opacity-40 group-hover:opacity-100 transition-opacity">Live Data</span>
                      </div>
                   </div>

                   {/* Valor Central Dominante */}
                   <div className="flex flex-col items-center py-4">
                      <div className="relative flex items-baseline gap-2">
                         <span className="text-6xl md:text-7xl font-sans font-black text-text-hi tracking-tighter filter drop-shadow-2xl group-hover:scale-105 transition-transform duration-700">
                           {stat.value}
                         </span>
                         {stat.unit && <span className="text-lg font-bold text-text-lo opacity-20 uppercase">{stat.unit}</span>}
                      </div>
                   </div>

                   {/* Rodapé: Label */}
                   <div className="flex justify-center border-t border-white/5 pt-4">
                      <span className="text-[11px] font-black uppercase tracking-[0.4em] text-text-lo opacity-40 group-hover:text-text-hi group-hover:opacity-100 transition-all duration-500">
                        {stat.label}
                      </span>
                   </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
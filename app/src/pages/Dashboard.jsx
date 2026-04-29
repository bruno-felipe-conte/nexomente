import { useState, useEffect } from 'react';
import { 
  FileText, Clock, Brain, BookOpen, Star, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Edit, Play, Sparkles, Plus, Mic, Loader2, 
  CheckCircle2, XCircle
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import { usePoemas } from '../hooks/useMaterias';
import { useDBStore } from '../store/useDBStore';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useWhisper } from '../hooks/useWhisper';
import Card from '../components/ui/Card';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const { notas } = useNotes();
  const { cards: flashcards } = useFlashcards();
  const { poemas } = usePoemas();
  const { player } = useTamagotchiStore();
  const userName = "Bruno";

  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [isPoemExpanded, setIsPoemExpanded] = useState(false);
  const [showDojo, setShowDojo] = useState(false);
  
  const poemaVigente = poemas?.[currentPoemIndex] || null;

  const nextPoem = () => {
    setCurrentPoemIndex((prev) => (prev + 1) % (poemas?.length || 1));
    setIsPoemExpanded(false);
  };

  const prevPoem = () => {
    setCurrentPoemIndex((prev) => (prev - 1 + (poemas?.length || 1)) % (poemas?.length || 1));
    setIsPoemExpanded(false);
  };

  const minutosHoje = 42; 
  const cardsParaRevisao = flashcards?.filter(c => c.next_review && new Date(c.next_review) <= new Date()) || [];

  return (
    <div className="p-6 md:p-10 space-y-12 transition-all duration-300 max-w-[1440px] mx-auto w-full">
      
      {showDojo && poemaVigente && (
        <PoemaRecitacao 
          poema={poemaVigente} 
          onFinish={() => { setShowDojo(false); toast.success("Dojo concluído!"); }}
          onCancel={() => setShowDojo(false)}
        />
      )}
      
      {/* ── HEADER v1.0 ── */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-nx-border pb-8">
        <div>
          <div className="text-nx-primary font-mono text-[10px] tracking-[0.3em] uppercase mb-2">Cognitive Environment v1.0</div>
          <h1 className="text-4xl md:text-nx-3xl font-display font-extrabold text-nx-bright tracking-tighter">
            Nexo<span className="text-nx-primary">Mente</span>
          </h1>
          <p className="text-nx-dim text-nx-md mt-2 font-ui font-medium">Bem-vindo, {userName}. Sua rede neural está pronta.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="nx-panel px-6 py-4 flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase tracking-widest">Nível</span>
              <span className="text-nx-2xl font-display font-black text-nx-primary">{player?.level || 1}</span>
           </div>
           <div className="nx-panel px-6 py-4 flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase tracking-widest">Streak</span>
              <span className="text-nx-2xl font-display font-black text-nx-accent">{player?.streak || 0}d</span>
           </div>
        </div>
      </header>

      {/* ── FAIXA PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        
        {/* Lado Esquerdo: Identidade & Notas (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="nx-panel p-1 flex items-center justify-center">
              <TamagotchiWidget className="py-10 w-full" />
            </div>
           
           <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
               <h3 className="text-nx-xs font-mono font-black text-nx-bright uppercase tracking-[0.3em]">Notas Recentes</h3>
               <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))} className="text-[10px] font-mono font-bold text-nx-primary hover:text-nx-bright transition-colors">Explorer →</button>
             </div>
             <div className="space-y-3">
               {notas.slice(0, 3).map(nota => (
                 <button key={nota.id} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))} className="w-full nx-card p-5 flex items-center gap-4 hover:border-nx-primary/40 transition-all group text-left">
                    <div className="w-10 h-10 rounded-nx-sm bg-nx-depth flex items-center justify-center text-nx-dim group-hover:text-nx-primary transition-colors">
                       <FileText size={18} />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-nx-base font-ui font-bold text-nx-bright truncate">{nota.titulo}</p>
                      <p className="text-nx-xs text-nx-subtle font-mono">{new Date(nota.atualizado_em).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight size={14} className="text-nx-muted group-hover:text-nx-bright" />
                 </button>
               ))}
             </div>
           </div>
        </div>

        {/* Lado Direito: Poema Editorial (7/12) */}
        <div className="lg:col-span-7">
          {poemaVigente ? (
            <div className="nx-panel p-10 md:p-14 h-full flex flex-col relative overflow-hidden group bg-gradient-to-br from-nx-surface to-nx-depth">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-nx-primary/5 rounded-full blur-[120px]" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-10">
                  <span className="text-nx-xs font-mono font-black text-nx-primary uppercase tracking-[0.4em]">Curadoria Semântica</span>
                  <div className="flex gap-4">
                    <button onClick={prevPoem} className="text-nx-dim hover:text-nx-primary transition-colors"><ChevronLeft size={24}/></button>
                    <button onClick={nextPoem} className="text-nx-dim hover:text-nx-primary transition-colors"><ChevronRight size={24}/></button>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-nx-2xl md:text-nx-3xl font-display font-extrabold text-nx-bright mb-8 leading-[1.1] tracking-tighter">
                    {poemaVigente.titulo}
                  </h2>
                  <div className={`text-nx-text italic text-nx-md md:text-nx-lg leading-relaxed whitespace-pre-wrap font-ui font-light ${isPoemExpanded ? '' : 'line-clamp-8'}`} dangerouslySetInnerHTML={{ __html: poemaVigente.corpo?.replace(/\n/g, '<br/>') || '' }} />
                </div>

                <div className="mt-12 pt-8 border-t border-nx-border flex items-center justify-between">
                  <button onClick={() => setIsPoemExpanded(!isPoemExpanded)} className="text-nx-xs font-mono font-bold uppercase tracking-widest text-nx-subtle hover:text-nx-bright transition-colors">
                    {isPoemExpanded ? 'Fechar Dimensão' : 'Explorar Obra'}
                  </button>
                  <button 
                    onClick={() => setShowDojo(true)} 
                    className="px-10 py-3 bg-nx-primary hover:bg-nx-primary-hover active:bg-nx-primary-active text-white text-nx-xs font-mono font-black uppercase tracking-[0.2em] rounded-nx-sm transition-all"
                  >
                    Recitar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="nx-panel p-10 h-full flex flex-col items-center justify-center text-center space-y-4 border-dashed opacity-60">
              <BookOpen size={48} className="text-nx-muted opacity-20" />
              <h3 className="text-nx-bright font-display font-bold">Nenhuma obra em destaque</h3>
              <p className="text-nx-dim text-nx-xs font-mono uppercase tracking-widest">Adicione poemas na aba "Dojo" para ver sua curadoria aqui</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                className="text-nx-primary hover:text-nx-bright text-nx-xs font-mono font-bold uppercase tracking-widest mt-4"
              >
                Ir para Biblioteca →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FAIXA DE MÉTRICAS & COMANDOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Comandos (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-nx-xs font-mono font-black text-nx-bright uppercase tracking-[0.3em] px-2">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'notes', label: 'Nota', icon: Edit, color: 'text-nx-primary' },
              { id: 'study', label: 'Estudo', icon: Play, color: 'text-nx-secondary' },
              { id: 'flashcards', label: 'Cards', icon: Brain, color: 'text-nx-accent' },
              { id: 'gerador', label: 'IA', icon: Sparkles, color: 'text-nx-secondary' },
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: action.id }))}
                className="nx-card p-6 flex flex-col items-center gap-3 hover:border-nx-primary/40 transition-all group active:scale-95"
              >
                <div className={`w-12 h-12 rounded-nx-md bg-nx-depth flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon size={22} />
                </div>
                <span className="text-nx-xs font-mono font-bold text-nx-bright uppercase tracking-widest">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Estatísticas (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-nx-xs font-mono font-black text-nx-bright uppercase tracking-[0.3em] px-2">Monitoramento</h3>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Notas', value: notas.length, color: 'text-nx-primary' },
              { label: 'Foco (min)', value: minutosHoje, color: 'text-nx-secondary' },
              { label: 'Revisões', value: cardsParaRevisao.length, color: 'text-nx-accent' },
              { label: 'Conexões', value: flashcards.length, color: 'text-nx-primary' },
            ].map((stat, i) => (
              <div key={i} className="nx-card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="relative z-10 flex flex-col items-center">
                  <span className={`text-nx-3xl md:text-display font-display font-extrabold ${stat.color} tracking-tighter opacity-90 group-hover:opacity-100 transition-opacity`}>
                    {stat.value}
                  </span>
                  <span className="text-nx-xs font-mono font-black uppercase tracking-[0.3em] text-nx-subtle mt-2">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
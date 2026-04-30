import { useState } from 'react';
import {
  FileText, Brain, Play, Sparkles,
  ChevronRight, ChevronLeft, Edit, BookOpen
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { usePoemas } from '../hooks/useMaterias';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const { notas } = useNotes();
  const { poemas } = usePoemas();
  const { player } = useTamagotchiStore();
  const userName = "Bruno";

  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [showDojo, setShowDojo] = useState(false);
  
  const poemaVigente = poemas?.[currentPoemIndex] || null;

  const nextPoem = () => setCurrentPoemIndex((prev) => (prev + 1) % (poemas?.length || 1));
  const prevPoem = () => setCurrentPoemIndex((prev) => (prev - 1 + (poemas?.length || 1)) % (poemas?.length || 1));

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-3 max-w-[1440px] mx-auto w-full pb-20 lg:pb-4" style={{ scrollbarWidth: 'thin' }}>
      
      {showDojo && poemaVigente && (
        <PoemaRecitacao 
          poema={poemaVigente} 
          onFinish={() => { setShowDojo(false); toast.success("Dojo concluído!"); }}
          onCancel={() => setShowDojo(false)}
        />
      )}

      {/* TOPO COMPACTO — apenas saudação + stats */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-nx-dim text-xs font-ui">
          Olá, <span className="text-nx-bright font-bold">{player?.name || userName}</span> — sua rede neural está pronta.
        </p>
        <div className="flex gap-2">
          <div className="nx-panel px-4 py-2 flex flex-col items-center min-w-[72px]">
            <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase">Nível</span>
            <span className="text-xl font-display font-black text-nx-primary leading-none">{player?.level || 1}</span>
          </div>
          <div className="nx-panel px-4 py-2 flex flex-col items-center min-w-[72px]">
            <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase">Streak</span>
            <span className="text-xl font-display font-black text-nx-accent leading-none">{player?.streak || 0}d</span>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-5 flex flex-col gap-3">

          {/* Tamagotchi */}
          <div className="nx-panel overflow-hidden">
            <TamagotchiWidget className="w-full" />
          </div>

          {/* Ações rápidas */}
          <div className="grid grid-cols-4 gap-2 shrink-0">
            {[
              { id: 'notes', icon: <Edit size={16} />, label: 'NOTA' },
              { id: 'study', icon: <Play size={16} />, label: 'ESTUDO' },
              { id: 'flashcards', icon: <Brain size={16} />, label: 'CARDS' },
              { id: 'gerador', icon: <Sparkles size={16} />, label: 'IA' },
            ].map((action) => (
              <button 
                key={action.id} 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: action.id }))}
                className="nx-panel flex flex-col items-center gap-1.5 py-3 hover:border-nx-primary/50 transition-colors group active:scale-95"
              >
                <span className="text-nx-primary group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-[9px] font-mono font-bold tracking-widest text-nx-subtle">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Notas recentes */}
          <div className="flex flex-col flex-1 min-h-0 nx-panel p-3">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-nx-subtle">
                Notas Recentes
              </h3>
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))} className="text-[9px] font-mono font-bold text-nx-primary hover:underline">VER TODAS</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 compact-scroll">
              {notas.slice(0, 5).map(nota => (
                <button key={nota.id} onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))} className="w-full bg-nx-depth/40 hover:bg-nx-depth/60 border border-nx-border rounded-nx-sm p-3 flex items-center gap-3 transition-all group text-left">
                  <div className="w-8 h-8 rounded bg-nx-void flex items-center justify-center text-nx-dim group-hover:text-nx-primary">
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-nx-bright truncate">{nota.titulo}</p>
                    <p className="text-[9px] text-nx-dim font-mono">{new Date(nota.atualizado_em).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight size={12} className="text-nx-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-7 min-h-0">
          {poemaVigente ? (
            <div className="nx-panel p-5 h-full flex flex-col bg-gradient-to-br from-nx-surface to-nx-depth relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-nx-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-3 shrink-0 relative z-10">
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-nx-primary">
                  Curadoria Semântica
                </span>
                <div className="flex gap-1">
                  <button onClick={prevPoem} className="p-1 hover:text-nx-primary transition-colors text-nx-dim"><ChevronLeft size={14} /></button>
                  <button onClick={nextPoem} className="p-1 hover:text-nx-primary transition-colors text-nx-dim"><ChevronRight size={14} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto compact-scroll relative z-10">
                <h2 className="text-lg md:text-xl font-display font-extrabold text-nx-bright mb-3 leading-tight tracking-tighter">
                  {poemaVigente.titulo}
                </h2>
                <div 
                  className="text-nx-dim italic text-sm md:text-base leading-relaxed whitespace-pre-wrap font-ui font-light" 
                  dangerouslySetInnerHTML={{ __html: poemaVigente.corpo?.replace(/\n/g, '<br/>') || '' }} 
                />
              </div>

              <div className="flex items-center gap-4 pt-3 mt-1 border-t border-nx-border shrink-0 relative z-10">
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))} className="text-[10px] text-nx-dim hover:text-nx-bright transition-colors font-mono uppercase tracking-widest">Biblioteca</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }))} className="text-[10px] text-nx-dim hover:text-nx-bright transition-colors font-mono uppercase tracking-widest">Revisões</button>
                <div className="ml-auto flex gap-3 items-center text-[10px] text-nx-dim font-mono">
                  <span className="opacity-40">CONEXÕES</span>
                  <button 
                    onClick={() => setShowDojo(true)} 
                    className="nx-btn-primary px-4 py-1 text-xs rounded-nx-sm font-black uppercase tracking-widest"
                  >
                    Recitar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="nx-panel p-10 h-full flex flex-col items-center justify-center text-center space-y-4 border-dashed opacity-40">
              <BookOpen size={32} className="text-nx-muted" />
              <h3 className="text-nx-bright font-display font-bold text-sm">Biblioteca Vazia</h3>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                className="text-nx-primary hover:text-nx-bright text-[10px] font-mono font-bold uppercase tracking-widest"
              >
                Adicionar Poemas →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
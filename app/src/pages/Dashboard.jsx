import { useState } from 'react';
import {
  FileText, Brain, Play, Sparkles,
  ChevronRight, ChevronLeft, Edit, BookOpen, Check
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { usePoemas } from '../hooks/useMaterias';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useUIStore } from '../store/useUIStore';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import { toast } from 'react-hot-toast';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'agora há pouco';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

export default function Dashboard() {
  const { notas } = useNotes();
  const { poemas, registrarRecitacao } = usePoemas();
  const { player } = useTamagotchiStore();
  const { userName, setUserName, setActiveTab, setPendingNoteAction } = useUIStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const displayName = (userName && userName !== 'Visitante') ? userName : (player?.name || 'Bruno');

  const startEditName = () => {
    setTempName(displayName);
    setIsEditingName(true);
  };

  const saveEditName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      toast.success('Nome atualizado!');
    }
    setIsEditingName(false);
  };

  // Persistência do índice do poema na curadoria
  const [currentPoemIndex, setCurrentPoemIndex] = useState(() => {
    const saved = localStorage.getItem('nexomente_dashboard_poem_idx');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [showDojo, setShowDojo] = useState(false);
  
  const poemasValidos = poemas || [];
  const safeIndex = poemasValidos.length > 0 ? (currentPoemIndex % poemasValidos.length) : 0;
  const poemaVigente = poemasValidos[safeIndex] || null;

  const nextPoem = () => {
    if (poemasValidos.length === 0) return;
    const next = (safeIndex + 1) % poemasValidos.length;
    setCurrentPoemIndex(next);
    localStorage.setItem('nexomente_dashboard_poem_idx', String(next));
  };

  const prevPoem = () => {
    if (poemasValidos.length === 0) return;
    const prev = (safeIndex - 1 + poemasValidos.length) % poemasValidos.length;
    setCurrentPoemIndex(prev);
    localStorage.setItem('nexomente_dashboard_poem_idx', String(prev));
  };

  const handleOpenNote = (id) => {
    setPendingNoteAction({ noteId: id });
    setActiveTab('notes');
  };

  const handleQuickCreateNote = () => {
    setPendingNoteAction({ action: 'create' });
    setActiveTab('notes');
  };

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-3 max-w-[1440px] mx-auto w-full pb-20 lg:pb-4" style={{ scrollbarWidth: 'thin' }}>
      
      {showDojo && poemaVigente && (
        <PoemaRecitacao 
          poema={poemaVigente} 
          onFinish={() => {
            registrarRecitacao?.(poemaVigente.id);
            setShowDojo(false);
            toast.success("Dojo concluído!");
          }}
          onClose={() => setShowDojo(false)}
        />
      )}

      {/* TOPO COMPACTO — saudação contextual com edição inline + stats */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-nx-dim text-xs font-ui">
          <span>{getGreeting()},</span>
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveEditName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="bg-nx-depth border border-nx-primary px-2 py-0.5 rounded text-xs text-nx-bright font-bold outline-none"
              />
              <button onClick={saveEditName} className="p-0.5 text-nx-primary hover:text-white" title="Salvar">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditName}
              data-testid="edit-user-name"
              className="text-nx-bright font-bold hover:text-nx-primary transition-colors flex items-center gap-1 group cursor-pointer"
              title="Clique para editar seu nome"
            >
              <span>{displayName}</span>
              <Edit size={10} className="opacity-0 group-hover:opacity-70 transition-opacity text-nx-primary" />
            </button>
          )}
          <span>— sua rede neural está pronta.</span>
        </div>

        <div className="flex gap-2">
          <div className="nx-panel px-4 py-2 flex flex-col items-center min-w-[72px]" title="Nível atual do seu perfil">
            <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase">Nível</span>
            <span className="text-xl font-display font-black text-nx-primary leading-none">{player?.level || 1}</span>
          </div>
          <div className="nx-panel px-4 py-2 flex flex-col items-center min-w-[72px]" title="Dias consecutivos de estudo">
            <span className="text-[9px] font-mono font-bold text-nx-subtle uppercase">Streak</span>
            <span className="text-xl font-display font-black text-nx-accent leading-none">🔥 {player?.streak || 0}d</span>
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
              { id: 'notes', icon: <Edit size={16} />, label: 'NOTA', shortcut: 'Ctrl+Shift+N', onClick: handleQuickCreateNote, title: 'Criar nova nota imediatamente' },
              { id: 'study', icon: <Play size={16} />, label: 'ESTUDO', shortcut: 'Ctrl+3', onClick: () => setActiveTab('study'), title: 'Abrir Sala de Estudos' },
              { id: 'flashcards', icon: <Brain size={16} />, label: 'CARDS', shortcut: 'Ctrl+4', onClick: () => setActiveTab('flashcards'), title: 'Revisar Flashcards' },
              { id: 'gerador', icon: <Sparkles size={16} />, label: 'IA', shortcut: 'Ctrl+5', onClick: () => setActiveTab('gerador'), title: 'Forja e Simulado IA' },
            ].map((action) => (
              <button 
                key={action.id} 
                onClick={action.onClick}
                className="nx-panel flex flex-col items-center gap-1 py-2.5 hover:border-nx-primary/50 transition-colors group active:scale-95 relative cursor-pointer"
                title={action.title}
              >
                <span className="text-nx-primary group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-[9px] font-mono font-bold tracking-widest text-nx-subtle">{action.label}</span>
                <span className="text-[7px] font-mono text-nx-dim/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.shortcut}
                </span>
              </button>
            ))}
          </div>

          {/* Notas recentes */}
          <div className="flex flex-col flex-1 min-h-0 nx-panel p-3">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-nx-subtle">
                Notas Recentes
              </h3>
              <button onClick={() => setActiveTab('notes')} className="text-[9px] font-mono font-bold text-nx-primary hover:underline cursor-pointer">VER TODAS</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 compact-scroll">
              {notas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-nx-dim/50 border border-dashed border-nx-border/50 rounded-nx-sm my-auto">
                  <FileText size={20} className="mb-2 opacity-40 text-nx-primary" />
                  <p className="text-xs font-medium text-nx-dim">Nenhuma nota criada ainda</p>
                  <button
                    onClick={handleQuickCreateNote}
                    className="mt-2 text-[10px] font-mono font-bold text-nx-primary hover:underline cursor-pointer"
                  >
                    + Criar primeira nota
                  </button>
                </div>
              ) : (
                notas.slice(0, 5).map(nota => (
                  <button
                    key={nota.id}
                    onClick={() => handleOpenNote(nota.id)}
                    className="w-full bg-nx-depth/40 hover:bg-nx-depth/70 border border-nx-border rounded-nx-sm p-2.5 flex items-center gap-3 transition-all group text-left cursor-pointer hover:border-nx-primary/30"
                    title={`Abrir nota "${nota.titulo}" no editor`}
                  >
                    <div className="w-8 h-8 rounded bg-nx-void flex items-center justify-center text-nx-dim group-hover:text-nx-primary shrink-0 transition-colors">
                      <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-nx-bright truncate group-hover:text-nx-primary transition-colors">{nota.titulo || 'Sem título'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 bg-white/5 rounded text-nx-primary/80">
                          {nota.tipo || 'nota'}
                        </span>
                        <span className="text-[9px] text-nx-dim font-mono">{formatRelativeTime(nota.atualizado_em)}</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-nx-muted group-hover:text-nx-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-7 min-h-0">
          {poemaVigente ? (
            <div className="nx-panel p-5 h-full flex flex-col bg-gradient-to-br from-nx-surface to-nx-depth relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-nx-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-3 shrink-0 relative z-10">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-nx-primary">
                    Curadoria Semântica
                  </span>
                  <p className="text-[10px] text-nx-dim font-mono mt-0.5">
                    {poemaVigente.autor || 'Clássico'}{poemaVigente.epoca ? ` · ${poemaVigente.epoca}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {poemasValidos.length > 1 && (
                    <span className="text-[9px] font-mono text-nx-subtle">
                      {safeIndex + 1} / {poemasValidos.length}
                    </span>
                  )}
                  <div className="flex gap-1">
                    <button onClick={prevPoem} className="p-1 hover:text-nx-primary transition-colors text-nx-dim cursor-pointer" title="Poema anterior">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={nextPoem} className="p-1 hover:text-nx-primary transition-colors text-nx-dim cursor-pointer" title="Próximo poema">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto compact-scroll relative z-10 my-1 pr-1">
                <h2 className="text-lg md:text-xl font-display font-extrabold text-nx-bright mb-3 leading-tight tracking-tighter">
                  {poemaVigente.titulo}
                </h2>
                <p className="text-nx-dim italic text-sm md:text-base leading-relaxed whitespace-pre-line font-ui font-light">
                  {poemaVigente.corpo}
                </p>
              </div>

              <div className="flex items-center gap-4 pt-3 mt-1 border-t border-nx-border shrink-0 relative z-10">
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))} className="text-[10px] text-nx-dim hover:text-nx-bright transition-colors font-mono uppercase tracking-widest cursor-pointer">Biblioteca</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }))} className="text-[10px] text-nx-dim hover:text-nx-bright transition-colors font-mono uppercase tracking-widest cursor-pointer">Revisões</button>
                <div className="ml-auto flex gap-3 items-center text-[10px] text-nx-dim font-mono">
                  <span className="opacity-40">DOJO</span>
                  <button 
                    onClick={() => setShowDojo(true)} 
                    className="nx-btn-primary px-4 py-1.5 text-xs rounded-nx-sm font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-glow-primary"
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
                className="text-nx-primary hover:text-nx-bright text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer"
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
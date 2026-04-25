/**
 * @module Dashboard
 * @description Tela inicial (Home) do NexoMente. Exibe um resumo geral das notas, 
 * sessões de estudo, flashcards e o sistema de gamificação (Níveis e XP).
 * Construído utilizando os componentes de UI padronizados para garantir contraste.
 */
import { useUIStore } from '../store/useUIStore';
import { BookOpen, FileText, Brain, Clock, Zap, Target, ArrowRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';

/**
 * Componente principal do Dashboard.
 * 
 * @returns {JSX.Element} Dashboard UI renderizada.
 */
export default function Dashboard() {
  // 1. Coleta os dados em memória usando o Zustand (useUIStore)
  const Notas = useUIStore.getState().Notas;
  const Sessoes = useUIStore.getState().Sessoes;
  const Flashcards = useUIStore.getState().Flashcards;
  const XP = useUIStore.getState().XP;
  
  const notas = Notas.getAll();
  const sessoes = Sessoes.getAll();
  const flashcards = Flashcards.getAll();
  const xp = XP.getTotal();
  
  const poemas = notas.filter(n => n.tipo === 'poema');
  // Pega um poema aleatório todo dia ou o último atualizado
  const poemaVigente = poemas.length > 0 ? poemas[0] : null;
  
  // 2. Filtra sessões de estudo cujo carimbo de tempo seja de hoje
  const sessoesHoje = sessoes.filter(s => {
    if (!s.started_at) return false;
    const hoje = new Date().toDateString();
    return new Date(s.started_at).toDateString() === hoje;
  });
  
  // 3. Calcula o total de minutos estudados hoje
  const minutosHoje = sessoesHoje.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  
  // 4. Determina quais flashcards estão pendentes de revisão hoje (baseado no algoritmo SM-2)
  const cardsParaRevisao = Flashcards.getParaRevisao();
  
  // 5. Sistema de Níveis e XP (Roadmap E10 Gamification)
  // Define 500 XP como teto para cada nível. 
  // O progresso barra a barra anima visualmente do 0 ao 100%.
  const XP_POR_NIVEL = 500;
  const level = Math.floor(xp / XP_POR_NIVEL) + 1; // Nunca é nível 0
  const xpCurrentLevel = xp % XP_POR_NIVEL; // Sobra para o nível atual
  const progress = (xpCurrentLevel / XP_POR_NIVEL) * 100; // Porcentagem para o CSS width

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-text-hi mb-2 tracking-tight">Dashboard</h1>
          <p className="text-text-mid text-lg">Resumo do seu progresso e conhecimento.</p>
        </div>
      </div>
      
      {/* Hero Section: Tamagotchi & Poema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch min-h-[300px]">
        <div className="flex justify-center items-center w-full">
          <div className="w-full max-w-sm h-full">
            <TamagotchiWidget className="h-full w-full" />
          </div>
        </div>
        
        <div className="flex flex-col">
          {poemaVigente ? (
            <Card className="flex-1 relative overflow-hidden border-accent-main/20 bg-gradient-to-b from-surface-card to-surface-base p-6 flex flex-col shadow-lg">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-main/50 to-transparent"></div>
              
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-main mb-3 text-center">
                Poema Vigente
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col items-center justify-center">
                <h2 className="text-xl font-display font-bold text-text-hi mb-4 text-center">
                  {poemaVigente.titulo}
                </h2>
                
                <div 
                  className="text-text-mid italic text-center font-serif text-sm leading-relaxed max-w-sm mx-auto"
                  dangerouslySetInnerHTML={{ __html: poemaVigente.conteudo?.replace(/<p><\/p>/g, '<br/>') || '' }}
                />
              </div>
              
              {/* Botões pequenos */}
              <div className="flex justify-center gap-3 mt-5 pt-4 border-t border-border-subtle/50">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                  className="px-3 py-1.5 text-xs font-semibold bg-surface-raised hover:bg-surface-elevated text-text-mid hover:text-text-hi rounded-md transition-colors border border-border-subtle"
                >
                  Gerenciar
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent-main/10 hover:bg-accent-main/20 text-accent-main rounded-md transition-colors border border-accent-main/20"
                >
                  Ler Completo
                </button>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-8 border-dashed border-border-subtle/50 bg-surface-base/50">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-mid mb-3">Poema Vigente</h3>
              <p className="text-text-lo text-center mb-5 text-sm">Nenhum poema para inspirar seu dia ainda.</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-surface-raised hover:bg-surface-elevated rounded-md text-text-hi transition-colors border border-border-subtle"
              >
                Escrever Poema
              </button>
            </Card>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card interactive className="flex flex-col items-center justify-center text-center p-6">
          <FileText className="text-color-notas mb-3" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi">{notas.length}</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider">Notas</p>
        </Card>
        
        <Card interactive className="flex flex-col items-center justify-center text-center p-6">
          <Clock className="text-color-estudo mb-3" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi">{minutosHoje}m</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider">Estudado Hoje</p>
        </Card>
        
        <Card interactive className="flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
          {cardsParaRevisao.length > 0 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-color-warning/10 rounded-bl-full -z-0" />
          )}
          <Brain className="text-color-warning mb-3 z-10" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi z-10">{cardsParaRevisao.length}</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider z-10">Para Revisar</p>
        </Card>
        
        <Card interactive className="flex flex-col items-center justify-center text-center p-6">
          <BookOpen className="text-color-flashcards mb-3" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi">{flashcards.length}</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider">Flashcards</p>
        </Card>
      </div>
      
      {/* Quick Actions (Cards Interativos) */}
      <div>
        <h3 className="text-lg font-bold text-text-hi mb-4 flex items-center gap-2">
          <Target size={18} className="text-accent-main" /> Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card 
            interactive 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
            className="group flex flex-col items-start"
          >
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-notas)_15%,transparent)] rounded-lg mb-4 text-color-notas">
              <FileText size={24} />
            </div>
            <p className="font-display font-bold text-lg text-text-hi mb-1 group-hover:text-color-notas transition-colors">Criar Nota</p>
            <p className="text-sm text-text-mid">Capture uma ideia ou rascunho</p>
          </Card>
          
          <Card 
            interactive 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'study' }))}
            className="group flex flex-col items-start"
          >
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-estudo)_15%,transparent)] rounded-lg mb-4 text-color-estudo">
              <Clock size={24} />
            </div>
            <p className="font-display font-bold text-lg text-text-hi mb-1 group-hover:text-color-estudo transition-colors">Iniciar Sessão</p>
            <p className="text-sm text-text-mid">Estude com timer Pomodoro</p>
          </Card>
          
          <Card 
            interactive 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }))}
            className="group flex flex-col items-start"
          >
            <div className="p-2 bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] rounded-lg mb-4 text-color-warning">
              <Brain size={24} />
            </div>
            <p className="font-display font-bold text-lg text-text-hi mb-1 group-hover:text-color-warning transition-colors">Revisar Flashcards</p>
            <p className="text-sm text-text-mid">Repetição espaçada ativa</p>
          </Card>
        </div>
      </div>
      
      {/* Recent Notes */}
      {notas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-hi">Notas Recentes</h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
              className="text-sm font-medium text-accent-main hover:text-accent-light flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {notas.slice(0, 5).map(nota => (
                <div 
                  key={nota.id} 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
                  className="p-4 hover:bg-surface-raised cursor-pointer transition-colors group flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-base flex items-center justify-center flex-shrink-0 border border-border-subtle group-hover:border-accent-main/30">
                    <FileText size={18} className="text-text-mid group-hover:text-accent-main transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-hi truncate group-hover:text-accent-main transition-colors">{nota.titulo}</p>
                    <p className="text-sm text-text-mid truncate">{nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Sem conteúdo...'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
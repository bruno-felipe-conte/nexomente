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
      
      {/* Hero Card: Nível e XP */}
      <Card className="relative overflow-hidden border-accent-main/30 bg-gradient-to-br from-bg-tertiary to-bg-secondary">
        <div className="absolute top-0 left-0 w-full h-1 bg-surface-border">
          <div 
            className="h-full bg-accent-main transition-all duration-1000 ease-out shadow-glow-violet"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-main/10 border border-accent-main/20 flex items-center justify-center shadow-glow-violet">
            <Zap className="text-accent-main" size={32} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-2xl font-display font-bold text-text-hi">Nível {level}</h2>
              <Badge variant="brand" type="pill">Estudante Dedicado</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-text-mid font-medium">{xpCurrentLevel} XP ganhos</span>
              <span className="text-text-lo">Faltam {XP_POR_NIVEL - xpCurrentLevel} XP para o nível {level + 1}</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex flex-col items-center justify-center text-center p-6">
          <FileText className="text-color-notas mb-3" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi">{notas.length}</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider">Notas</p>
        </Card>
        
        <Card className="flex flex-col items-center justify-center text-center p-6">
          <Clock className="text-color-estudo mb-3" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi">{minutosHoje}m</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider">Estudado Hoje</p>
        </Card>
        
        <Card className="flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
          {cardsParaRevisao.length > 0 && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-color-warning/10 rounded-bl-full -z-0" />
          )}
          <Brain className="text-color-warning mb-3 z-10" size={28} />
          <p className="text-3xl font-display font-bold text-text-hi z-10">{cardsParaRevisao.length}</p>
          <p className="text-sm font-medium text-text-mid mt-1 uppercase tracking-wider z-10">Para Revisar</p>
        </Card>
        
        <Card className="flex flex-col items-center justify-center text-center p-6">
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
import { useUIStore } from '../store/useUIStore';
import { BookOpen, FileText, Brain, Clock, Zap } from 'lucide-react';

export default function Dashboard() {
  const Notas = useUIStore.getState().Notas;
  const Sessoes = useUIStore.getState().Sessoes;
  const Flashcards = useUIStore.getState().Flashcards;
  const XP = useUIStore.getState().XP;
  
  const notas = Notas.getAll();
  const sessoes = Sessoes.getAll();
  const flashcards = Flashcards.getAll();
  const xp = XP.getTotal();
  
  const sessoesHoje = sessoes.filter(s => {
    if (!s.started_at) return false;
    const hoje = new Date().toDateString();
    return new Date(s.started_at).toDateString() === hoje;
  });
  
  const minutosHoje = sessoesHoje.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  
  const cardsParaRevisao = Flashcards.getParaRevisao();
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Bem-vindo de volta!</p>
      </div>
      
      {/* XP */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent-main/20 flex items-center justify-center">
            <Zap className="text-xp" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-xp">{xp} XP</p>
            <p className="text-sm text-text-muted">Pontos de Experiência</p>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <FileText className="text-accent-main mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{notas.length}</p>
          <p className="text-sm text-text-muted">Notas</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <Clock className="text-success mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{minutosHoje}m</p>
          <p className="text-sm text-text-muted">Estudado hoje</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <Brain className="text-warning mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{cardsParaRevisao.length}</p>
          <p className="text-sm text-text-muted">Para revisar</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <BookOpen className="text-node-book mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{flashcards.length}</p>
          <p className="text-sm text-text-muted">Flashcards</p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
          className="p-4 bg-bg-secondary rounded-xl border border-border-subtle hover:border-accent-main transition-colors text-left"
        >
          <FileText className="text-accent-main mb-2" size={24} />
          <p className="font-medium text-text-primary">Criar Nota</p>
          <p className="text-sm text-text-muted">Capture uma ideia</p>
        </button>
        
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'study' }))}
          className="p-4 bg-bg-secondary rounded-xl border border-border-subtle hover:border-accent-main transition-colors text-left"
        >
          <Clock className="text-success mb-2" size={24} />
          <p className="font-medium text-text-primary">Iniciar Sessão</p>
          <p className="text-sm text-text-muted">Estude com Pomodoro</p>
        </button>
        
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }))}
          className="p-4 bg-bg-secondary rounded-xl border border-border-subtle hover:border-accent-main transition-colors text-left"
        >
          <Brain className="text-warning mb-2" size={24} />
          <p className="font-medium text-text-primary">Revisar Flashcards</p>
          <p className="text-sm text-text-muted">Memória espaçada</p>
        </button>
      </div>
      
      {/* Recent Notes */}
      {notas.length > 0 && (
        <div className="bg-bg-secondary rounded-xl border border-border-subtle">
          <div className="p-4 border-b border-border-subtle">
            <h2 className="font-semibold text-text-primary">Notas Recentes</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {notas.slice(0, 5).map(nota => (
              <div key={nota.id} className="p-4 hover:bg-bg-tertiary transition-colors">
                <p className="font-medium text-text-primary">{nota.titulo}</p>
                <p className="text-sm text-text-muted truncate">{nota.conteudo?.substring(0, 100)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
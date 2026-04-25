import { useUIStore } from '../store/useUIStore';
import { BarChart3, TrendingUp, Clock, BookOpen, Zap } from 'lucide-react';

export default function Statistics() {
  const Notas = useUIStore.getState().Notas;
  const Sessoes = useUIStore.getState().Sessoes;
  const Flashcards = useUIStore.getState().Flashcards;
  const XP = useUIStore.getState().XP;
  
  const notas = Notas.getAll();
  const sessoes = Sessoes.getAll();
  const flashcards = Flashcards.getAll();
  const xp = XP.getTotal();
  
  const porTipo = notas.reduce((acc, n) => {
    acc[n.tipo] = (acc[n.tipo] || 0) + 1;
    return acc;
  }, {});
  
  const sessoesEsteMes = sessoes.filter(s => {
    if (!s.started_at) return false;
    const data = new Date(s.started_at);
    const agora = new Date();
    return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
  });
  
  const minutosEsteMes = sessoesEsteMes.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  
  const diasComEstudo = new Set(sessoesEsteMes.map(s => s.started_at?.split('T')[0])).size;
  
  const streak = calcularStreak(sessoes);
  
  function calcularStreak(sessoes) {
    const datas = sessoes
      .filter(s => s.concluida && s.started_at)
      .map(s => s.started_at.split('T')[0])
      .sort()
      .reverse();
    
    if (datas.length === 0) return 0;
    
    let atual = 0;
    const hoje = new Date().toISOString().split('T')[0];
    
    if (datas[0] === hoje) atual = 1;
    
    for (let i = 1; i < datas.length; i++) {
      const diff = new Date(datas[i-1]) - new Date(datas[i]);
      if (diff / (1000 * 60 * 60 * 24) === 1) atual++;
      else break;
    }
    
    return atual;
  }
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Estatísticas</h1>
        <p className="text-text-secondary">Seu progresso ao longo do tempo</p>
      </div>
      
      {/* XP Total */}
      <div className="bg-bg-secondary rounded-xl p-6 border border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-xp/20 flex items-center justify-center">
            <Zap className="text-xp" size={32} />
          </div>
          <div>
            <p className="text-4xl font-bold text-xp">{xp}</p>
            <p className="text-text-muted">XP Total</p>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <TrendingUp className="text-accent-main mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{streak}</p>
          <p className="text-sm text-text-muted">Dias em sequência</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <Clock className="text-success mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{minutosEsteMes}m</p>
          <p className="text-sm text-text-muted">Este mês</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <BookOpen className="text-node-book mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{notas.length}</p>
          <p className="text-sm text-text-muted">Notas criadas</p>
        </div>
        
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
          <BarChart3 className="text-warning mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{flashcards.length}</p>
          <p className="text-sm text-text-muted">Flashcards</p>
        </div>
      </div>
      
      {/* Por Tipo */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h2 className="font-semibold text-text-primary mb-4">Notas por Tipo</h2>
        <div className="space-y-2">
          {Object.entries(porTipo).map(([tipo, count]) => (
            <div key={tipo} className="flex items-center justify-between">
              <span className="text-text-secondary capitalize">{tipo}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-main rounded-full" 
                    style={{ width: `${(count / notas.length) * 100}%` }}
                  />
                </div>
                <span className="text-text-primary font-medium">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Histórico */}
      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h2 className="font-semibold text-text-primary mb-4">Esse Mês</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-text-primary">{diasComEstudo}</p>
            <p className="text-sm text-text-muted">Dias estudados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{sessoesEsteMes.filter(s => s.concluida).length}</p>
            <p className="text-sm text-text-muted">Sessões concluídas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
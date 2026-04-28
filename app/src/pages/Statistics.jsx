import React from 'react';
import PropTypes from 'prop-types';
import { useDBStore } from '../store/useDBStore';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { BarChart3, TrendingUp, Clock, BookOpen, Trophy, Target } from 'lucide-react';
import LevelCard from '../components/gamification/LevelCard';
import ActivityHeatmap from '../components/gamification/ActivityHeatmap';
import Card from '../components/ui/Card';

export default function Statistics() {
  const { SessoesEstudo } = useDBStore();
  const { player } = useTamagotchiStore();
  const { notas } = useNotes();
  const { cards: flashcards } = useFlashcards();
  
  const sessoes = SessoesEstudo?.getAll() || [];
  const xp = player.xp;
  
  const porTipo = (notas || []).reduce((acc, n) => {
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
    <div className="main-content p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-display font-bold text-text-hi mb-2">Seu Progresso</h1>
        <p className="text-text-mid text-sm">Métricas de aprendizagem e conquistas acumuladas.</p>
      </header>
      
      {/* Nível Premium */}
      <LevelCard xp={xp} />
      
      {/* Stats Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={TrendingUp} 
          value={streak} 
          label="Dias Seguidos" 
          sub="Recorde: 12 dias" 
          color="text-orange-400" 
          bg="bg-orange-500/10" 
        />
        <StatCard 
          icon={Clock} 
          value={`${minutosEsteMes}m`} 
          label="Tempo este Mês" 
          sub="Meta: 500m" 
          color="text-teal-400" 
          bg="bg-teal-500/10" 
        />
        <StatCard 
          icon={BookOpen} 
          value={notas.length} 
          label="Notas Criadas" 
          sub="+3 esta semana" 
          color="text-blue-400" 
          bg="bg-blue-500/10" 
        />
        <StatCard 
          icon={BarChart3} 
          value={flashcards.length} 
          label="Flashcards" 
          sub="85% dominados" 
          color="text-purple-400" 
          bg="bg-purple-500/10" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo: Heatmap */}
        <div className="lg:col-span-8 space-y-8">
          <ActivityHeatmap sessoes={sessoes} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card className="glass-panel p-6">
                <h3 className="text-sm font-bold text-text-hi font-display mb-6 flex items-center gap-2">
                   <Target size={16} className="text-accent-main" />
                   Metas Semanais
                </h3>
                <div className="space-y-4">
                   <GoalProgress label="Minutos de Estudo" current={minutosEsteMes} target={500} color="bg-teal-500" />
                   <GoalProgress label="Novas Notas" current={notas.length % 10} target={10} color="bg-blue-500" />
                   <GoalProgress label="Cards Revisados" current={12} target={50} color="bg-purple-500" />
                </div>
             </Card>

             <Card className="glass-panel p-6">
                <h3 className="text-sm font-bold text-text-hi font-display mb-6 flex items-center gap-2">
                   <Trophy size={16} className="text-yellow-400" />
                   Próximas Conquistas
                </h3>
                <div className="space-y-3">
                   <NextAchievement icon="🔥" label="Maratonista" desc="7 dias de streak" progress={streak/7*100} />
                   <NextAchievement icon="📚" label="Bibliotecário" desc="50 notas criadas" progress={notas.length/50*100} />
                </div>
             </Card>
          </div>
        </div>

        {/* Lado Direito: Distribuição */}
        <div className="lg:col-span-4">
           <Card className="glass-panel p-6 h-full">
              <h3 className="text-sm font-bold text-text-hi font-display mb-6">Foco do Conhecimento</h3>
              <div className="space-y-6">
                {Object.entries(porTipo).map(([tipo, count]) => (
                  <div key={tipo} className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <span className="text-text-hi font-bold capitalize">{tipo}</span>
                       <span className="text-text-lo">{count} notas</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-accent-main rounded-full" 
                         style={{ width: `${(count / notas.length) * 100}%` }}
                       />
                    </div>
                  </div>
                ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, sub, color, bg }) {
  return (
    <Card className="glass-panel p-5 border-white/5 hover:border-white/10 transition-all group">
      <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black text-text-hi tabular-nums">{value}</p>
      <p className="text-xs font-bold text-text-mid uppercase tracking-wider">{label}</p>
      <p className="text-[10px] text-text-lo mt-1">{sub}</p>
    </Card>
  );
}

function GoalProgress({ label, current, target, color }) {
  const percent = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
       <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="text-text-lo">{label}</span>
          <span className="text-text-hi">{current} / {target}</span>
       </div>
       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
       </div>
    </div>
  );
}

function NextAchievement({ icon, label, desc, progress }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
       <div className="text-xl">{icon}</div>
       <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-hi truncate">{label}</p>
          <p className="text-[10px] text-text-lo truncate">{desc}</p>
          <div className="h-1 w-full bg-white/5 rounded-full mt-1 overflow-hidden">
             <div className="h-full bg-accent-main rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
       </div>
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.any,
  value: PropTypes.any,
  label: PropTypes.string,
  sub: PropTypes.string,
  color: PropTypes.string,
  bg: PropTypes.string,
};

GoalProgress.propTypes = {
  label: PropTypes.string,
  current: PropTypes.number,
  target: PropTypes.number,
  color: PropTypes.string,
};

NextAchievement.propTypes = {
  icon: PropTypes.any,
  label: PropTypes.string,
  desc: PropTypes.string,
  progress: PropTypes.number,
};
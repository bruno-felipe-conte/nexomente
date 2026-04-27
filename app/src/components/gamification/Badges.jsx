import { useUIStore } from '../../store/useUIStore'

const BADGES = [
  { id: 'p50', emoji: '🔥', title: 'Fogo Fátuo', desc: 'Ative mais de 50 Pomodoros', level: 50, earned: false },
  { id: 'c10', emoji: '📚', title: 'Bibliotecário', desc: 'Crie mais de 10 cards', level: 10, earned: true, expCount: 10 },
  { id: 't5', emoji: '✌️', title: 'Férias Totais', desc: 'Complete 5 semanas completas', level: 5, earned: true, expCount: 5 },
]

export default function Badges() {
  const currentLevel = useUIStore.getState().currentLevel || { level: 1 }
  const nextLevel = useUIStore.getState().nextLevel || { level: 2 }
  const progressCurrentLevel = ((8 - currentLevel.level) / (nextLevel.level - currentLevel.level)) * 100 || 0
  
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Badges Ganhos</div>
        
        <div className="flex flex-wrap gap-2">
          {BADGES.map(badge => (
            <div
              key={badge.id}
              className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
                badge.earned || badge.level <= currentLevel.level
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                  : 'bg-gray-100 opacity-40'
              }`}
            >
              <div className="text-xl mb-1">{badge.earned ? badge.emoji : '🔒'}</div>
              <div className="text-xs font-semibold text-amber-800">{badge.title}</div>
              <div className="text-[10px] text-amber-600">{badge.desc}</div>
            </div>
          ))}
          
          {/* Progress badge */}
          <div
            className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
              progressCurrentLevel > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 opacity-40'
            }`}
          >
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xs font-semibold text-blue-800">
              Objetivo: {currentLevel.level} → {nextLevel.level}
            </div>
            <div className="text-[10px] text-blue-600 mt-1 h-4">
              {Math.min(progressCurrentLevel, 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-gray-600 font-medium">Progresso Nível</span>
          <span className="text-gray-500">{currentLevel.level} → {nextLevel.level}</span>
        </div>
        
        {/* Simple progress indicator */}
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all"
            style={{ 
              width: `${progressCurrentLevel}%`,
              opacity: 0.8,
              boxShadow: progressCurrentLevel > 70 ? '0 0 10px rgba(96,165,250,0.5)' : 'none'
            }}
          />
        </div>
      </div>
    </div>
  )
}

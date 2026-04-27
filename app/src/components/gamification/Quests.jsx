import { useState } from 'react'

const QUESTS = [
  { id: 1, title: 'Estudar 3 páginas', reward: 50, completed: false },
  { id: 2, title: 'Criar 5 flashcards', reward: 30, completed: false },
  { id: 3, title: 'Revisar no Pomodoro', reward: 40, completed: false },
]

export default function Quests() {
  const [completedQuests, setCompletedQuests] = useState(0)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 mb-2">Missões Diárias</div>
      
      <div className="space-y-2">
        {QUESTS.map((quest) => (
          <div
            key={quest.id}
            onClick={() => setCompletedQuests(prev => 
              quest.completed ? prev - 1 : prev + 1
            )}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              quest.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={quest.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}>
                {quest.title}
              </span>
              <span className={`text-sm px-2 py-1 rounded ${
                quest.completed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}>
                +{quest.reward} XP
              </span>
            </div>
          </div>
        ))}
      </div>

      {completedQuests > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          Missões concluídas: {completedQuests}/3
        </div>
      )}
    </div>
  )
}

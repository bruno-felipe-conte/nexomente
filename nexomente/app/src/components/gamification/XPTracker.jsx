import { useEffect, useState } from 'react'
import { getXP, useUIStore } from '../store/useDBStore'

export default function XPTracker() {
  const xp = getXP()
  const level = useUIStore.getState().currentLevel
  const nextLevel = useUIStore.getState().nextLevel
  const progress = ((xp - level.xp) / nextLevel.xp) * 100

  useEffect(() => {
    console.log('XP Tracker initialized:', xp, 'Level', level.level)
  }, [xp, level])

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 font-medium">Nível {level.level}</span>
        <span className="text-gray-500">{xp}/{nextLevel.xp} XP</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

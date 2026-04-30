import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTamagotchiStore, getLevelData } from '../../store/useTamagotchiStore';
import confetti from 'canvas-confetti';

export default function LevelUpOverlay() {
  const { animationsQueue, clearAnimation, player } = useTamagotchiStore();
  const [activeLevel, setActiveLevel] = useState(null);

  useEffect(() => {
    if (animationsQueue.length > 0 && !activeLevel) {
      const nextLevel = animationsQueue[0];
      setActiveLevel(nextLevel);
      
      // Gatilho de efeitos visuais especiais dependendo do nível
      triggerVisualEffects(nextLevel);

      // Auto-fechar após 6 segundos ou o usuário pode clicar
      const timer = setTimeout(() => {
        closeOverlay();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [animationsQueue, activeLevel]);

  const closeOverlay = () => {
    setActiveLevel(null);
    clearAnimation();
  };

  const triggerVisualEffects = (level) => {
    if (level === 2 || level === 3 || level === 13) {
      // Confete simples
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else if (level === 10 || level === 20 || level === 25) {
      // Fogos de artifício
      var duration = 3000;
      var end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7C6DFA', '#FFFFFF']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7C6DFA', '#FFFFFF']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  };

  if (!activeLevel) return null;

  const levelData = getLevelData(player.xp); // Nota: Isso usa o XP atual, se o level for exatamente o atual, pega certo.

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm"
        onClick={closeOverlay}
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-surface-card border border-accent-main/40 rounded-3xl p-10 max-w-sm w-full text-center shadow-glow-violet cursor-pointer"
        >
          <h2 className="text-accent-main font-bold tracking-widest uppercase text-sm mb-6">
            Nível Desbloqueado
          </h2>

          <motion.div 
            className="text-8xl mb-6 filter drop-shadow-2xl"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.6, duration: 1 }}
          >
            {levelData.form}
          </motion.div>

          <h1 className="text-3xl font-display font-bold text-text-hi mb-2">
            Nível {activeLevel}
          </h1>
          <p className="text-xl text-text-hi mb-4">{levelData.title}</p>
          
          <div className="bg-surface-raised p-4 rounded-xl border border-border-subtle mt-6">
            <p className="text-text-mid text-sm italic">
              &quot;Você estudou o suficiente para me fazer evoluir. Incrível!&quot;
            </p>
          </div>

          <p className="text-text-lo text-xs mt-6">
            Clique em qualquer lugar para continuar
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

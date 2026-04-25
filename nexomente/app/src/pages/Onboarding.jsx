import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { Brain, BookOpen, Calendar, Zap, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao NexoMente',
    description: 'Seu segundo cérebro offline. Notas, flashcards, estudo e gamificação em um só lugar.',
    icon: Brain,
    color: '#6C63FF'
  },
  {
    id: 'notes',
    title: 'Notas Conectadas',
    description: 'Crie notas com wiki-links [[like this]]. O grafo mostra como tudo se conecta.',
    icon: BookOpen,
    color: '#F28E2B'
  },
  {
    id: 'study',
    title: 'Estudo Espaçado',
    description: 'Flashcards com algoritmo SM-2. Estude menos, lembre mais.',
    icon: Calendar,
    color: '#59A14F'
  },
  {
    id: 'complete',
    title: 'Pronto!',
    description: 'Você ganhou 50 XP só por começar. Vamos lá?',
    icon: Zap,
    color: '#EDC948'
  }
];

export function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { completeOnboarding } = useUIStore();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    navigate('/dashboard');
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center"
        >
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: step.color + '20' }}
          >
            <Icon size={40} style={{ color: step.color }} />
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {step.title}
          </h1>

          <p className="text-[var(--text-secondary)] mb-8">
            {step.description}
          </p>

          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep 
                    ? 'bg-[var(--accent-main)]' 
                    : 'bg-[var(--border-subtle)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 px-4 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Pular
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent-main)] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              {isLast ? (
                <>
                  <Check size={20} />
                  Começar
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
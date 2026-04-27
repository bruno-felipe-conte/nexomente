import React from 'react';
import { Home, FileText, BookOpen, Layers, MessageSquare, Settings } from 'lucide-react';

export default function BottomNav({ currentPage, onNavigate }) {
  const items = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'notes', icon: FileText, label: 'Notas' },
    { id: 'study', icon: BookOpen, label: 'Estudo' },
    { id: 'flashcards', icon: Layers, label: 'Cards' },
    { id: 'ai', icon: MessageSquare, label: 'IA' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0C13]/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-[100]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'text-accent-main' : 'text-text-lo hover:text-text-mid'}`}
          >
            <div className={`p-1.5 rounded-xl ${isActive ? 'bg-accent-main/10 shadow-glow-violet' : ''}`}>
               <Icon size={20} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

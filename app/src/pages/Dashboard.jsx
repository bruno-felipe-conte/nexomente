import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Brain, BookOpen, 
  ArrowRight, Sparkles, Play, Plus,
  ChevronRight, Calendar, Edit, Star
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import TamagotchiWidget from '../components/gamification/TamagotchiWidget';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useDBStore } from '../store/useDBStore';
import { usePoemas } from '../hooks/useMaterias';

export default function Dashboard() {
  const { player } = useTamagotchiStore();
  const { Notas, Flashcards, SessoesEstudo } = useDBStore();
  const { poemas } = usePoemas();
  
  const notas = Notas?.getAll() || [];
  const flashcards = Flashcards?.getAll() || [];
  const studySessions = SessoesEstudo?.getAll() || [];
  
  // Cálculo de estatísticas reais
  const hoje = new Date().toISOString().split('T')[0];
  const minutosHoje = studySessions
    ?.filter(s => s.started_at && s.started_at.startsWith(hoje))
    .reduce((acc, s) => acc + (s.duracao_minutos || 0), 0) || 0;
  
  const poemaVigente = poemas?.find(p => p.favorito) || poemas?.[0];
  
  // Mock ou cálculo para cards de revisão (depende da sua lógica de SRS)
  const cardsParaRevisao = flashcards?.filter(c => c.next_review && new Date(c.next_review) <= new Date()) || [];

  return (
    <div className="main-content min-h-screen p-4 md:p-8 lg:p-10 space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-text-hi tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-hi to-text-mid">
            Bem-vindo, Bruno
          </h1>
          <p className="text-text-mid text-base md:text-lg font-medium opacity-80">Seu ecossistema de conhecimento está evoluindo.</p>
        </div>
        
        {/* Status Rápido no Header */}
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
           <div className="px-4 py-2 text-center border-r border-white/10">
              <p className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Nível</p>
              <p className="text-xl font-black text-accent-main">{player.level}</p>
           </div>
           <div className="px-4 py-2 text-center">
              <p className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Ofensiva</p>
              <p className="text-xl font-black text-color-warning flex items-center gap-1">
                {player.streak}<span className="text-sm">d</span>
              </p>
           </div>
        </div>
      </div>
      
      {/* Grid Principal (Hero Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Mascote (Grande Destaque) */}
        <div className="lg:col-span-5 xl:col-span-4 h-full">
           <TamagotchiWidget className="glass-panel border-white/10 shadow-2xl h-full min-h-[450px] py-10" />
        </div>

        {/* Status Cards & Poema */}
        <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 gap-6 h-full">
          
          {/* Poema com Design Editorial */}
          <div className="h-full">
            {poemaVigente ? (
              <Card className="glass-panel border-pink-500/10 h-full relative overflow-hidden p-6 md:p-8 group hover-lift">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl group-hover:bg-pink-500/10 transition-colors" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <header className="flex items-center justify-between mb-6 md:mb-8">
                    <span className="px-3 py-1 bg-pink-500/10 text-pink-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-pink-500/20">
                      Poesia do Dia
                    </span>
                  </header>

                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-text-hi mb-4 md:mb-6 leading-tight max-w-md">
                      {poemaVigente.titulo}
                    </h2>
                    <div 
                      className="text-text-mid italic font-serif text-base md:text-lg leading-relaxed max-w-xl opacity-90 line-clamp-3 md:line-clamp-4"
                      dangerouslySetInnerHTML={{ __html: poemaVigente.conteudo?.replace(/<p><\/p>/g, '<br/>') || '' }}
                    />
                  </div>

                  <footer className="mt-8 pt-6 border-t border-white/5">
                     <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                        className="w-full md:w-auto px-6 py-2 bg-text-hi text-surface-base font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                     >
                        Ler Obra Completa
                     </button>
                  </footer>
                </div>
              </Card>
            ) : (
              <Card className="glass-panel border-dashed border-white/10 flex flex-col items-center justify-center p-8 md:p-12 text-center group transition-all hover:bg-white/[0.02]">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-3xl bg-surface-raised flex items-center justify-center mb-6 inner-shadow group-hover:scale-110 transition-transform">
                   <BookOpen size={24} className="text-text-lo" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-text-hi mb-2">Momento de Inspiração</h3>
                <p className="text-text-mid text-sm max-w-xs mb-8">Nenhum poema foi selecionado para hoje.</p>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'poemas' }))}
                  className="w-full md:w-auto px-8 py-3 bg-surface-raised text-text-hi text-xs font-bold uppercase tracking-widest rounded-xl border border-white/10 hover:border-pink-500/40 transition-all"
                >
                  Criar Poesia
                </button>
              </Card>
            )}
          </div>

          {/* Mini Stats (Modernizados) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Notas', value: notas.length, unit: '', icon: FileText, color: 'text-color-notas', bg: 'bg-glow-blue' },
              { label: 'Minutos', value: minutosHoje, unit: 'm', icon: Clock, color: 'text-color-estudo', bg: 'bg-glow-teal' },
              { label: 'Revisar', value: cardsParaRevisao.length, unit: '', icon: Brain, color: 'text-color-warning', bg: 'bg-glow-amber' },
              { label: 'Cards', value: flashcards.length, unit: '', icon: BookOpen, color: 'text-color-flashcards', bg: 'bg-glow-purple' },
            ].map((stat, i) => (
              <Card key={i} interactive className={`glass-panel border-white/5 p-4 md:p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group ${stat.bg}`}>
                <stat.icon className={`${stat.color} mb-3 group-hover:scale-110 transition-transform mx-auto`} size={22} />
                <div className="flex flex-col gap-0.5">
                   <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-3xl md:text-4xl font-display font-bold text-text-hi text-glow leading-none">{stat.value}</span>
                      {stat.unit && <span className="text-sm font-bold text-text-lo opacity-50 uppercase">{stat.unit}</span>}
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-lo mt-1">{stat.label}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Seção Inferior: Notas Recentes & Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Notas Recentes (Editorial Style) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-text-hi font-display">Notas Recentes</h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
              className="text-xs font-bold uppercase tracking-widest text-accent-main hover:text-white transition-colors"
            >
              Ver Todas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notas.slice(0, 4).map((nota) => (
              <Card 
                key={nota.id} 
                interactive 
                className="glass-panel border-white/5 p-5 group hover:border-accent-main/30 transition-all"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }))}
              >
                <div className="flex items-start justify-between mb-3">
                   <div className="w-10 h-10 rounded-xl bg-accent-main/10 flex items-center justify-center text-accent-main group-hover:bg-accent-main group-hover:text-white transition-all">
                      <FileText size={18} />
                   </div>
                   <span className="text-[10px] font-bold text-text-lo/40 uppercase">{new Date(nota.atualizado_em).toLocaleDateString()}</span>
                </div>
                <h4 className="text-base font-bold text-text-hi mb-1 group-hover:text-accent-main transition-colors line-clamp-1">{nota.titulo}</h4>
                <p className="text-xs text-text-mid line-clamp-2 opacity-60 leading-relaxed">
                  {nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 100) || 'Sem conteúdo adicional...'}
                </p>
              </Card>
            ))}
            {notas.length === 0 && (
              <div className="md:col-span-2 py-12 glass-panel border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-text-lo/20">
                    <Edit size={24} />
                 </div>
                 <p className="text-text-lo text-sm font-medium">Nenhuma nota criada ainda.</p>
              </div>
            )}
          </div>
        </div>

        {/* Ações Rápidas & Atalhos */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-xl font-bold text-text-hi font-display px-2">Ações Rápidas</h3>
          <div className="space-y-3">
             {[
               { id: 'notes', label: 'Nova Nota', desc: 'Capture uma ideia', icon: Edit, color: 'from-blue-500/20 to-blue-600/20', text: 'text-blue-400' },
               { id: 'study', label: 'Iniciar Estudo', desc: 'Focar no conhecimento', icon: Play, color: 'from-teal-500/20 to-teal-600/20', text: 'text-teal-400' },
               { id: 'flashcards', label: 'Revisar Cards', desc: 'Fortalecer memória', icon: Brain, color: 'from-purple-500/20 to-purple-600/20', text: 'text-purple-400' },
               { id: 'gerador', label: 'Gerar Conteúdo', desc: 'IA ao seu serviço', icon: Sparkles, color: 'from-pink-500/20 to-pink-600/20', text: 'text-pink-400' },
             ].map((action) => (
               <button
                 key={action.id}
                 onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: action.id }))}
                 className="w-full flex items-center gap-4 p-4 rounded-2xl glass-panel border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all group"
               >
                 <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center ${action.text} group-hover:scale-110 transition-transform shadow-inner`}>
                    <action.icon size={20} />
                 </div>
                 <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-text-hi group-hover:text-glow transition-all">{action.label}</p>
                    <p className="text-[10px] font-medium text-text-lo uppercase tracking-wider">{action.desc}</p>
                 </div>
                 <div className="text-text-lo/20 group-hover:text-text-hi transition-colors">
                    <ArrowRight size={16} />
                 </div>
               </button>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}
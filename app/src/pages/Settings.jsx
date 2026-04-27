import React from 'react';
import AIPerformancePanel from '../components/ai/AIPerformancePanel';
import Card from '../components/ui/Card';
import { Settings as SettingsIcon, Bell, Shield, User, Database } from 'lucide-react';

export default function Settings() {
  return (
    <div className="main-content min-h-screen p-4 md:p-8 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-hi">
           <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-text-hi">Configurações</h1>
          <p className="text-text-mid text-sm">Personalize sua experiência no NexoMente.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar de Navegação Interna */}
        <div className="lg:col-span-3 space-y-2">
           {[
             { id: 'perf', label: 'Inteligência Artificial', icon: Database, active: true },
             { id: 'profile', label: 'Perfil do Usuário', icon: User },
             { id: 'notify', label: 'Notificações', icon: Bell },
             { id: 'privacy', label: 'Segurança', icon: Shield },
           ].map(item => (
             <button 
               key={item.id}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.active ? 'bg-accent-main text-white shadow-lg shadow-accent-main/20' : 'text-text-lo hover:bg-white/5 hover:text-text-hi'}`}
             >
               <item.icon size={18} />
               <span className="text-sm font-bold">{item.label}</span>
             </button>
           ))}
        </div>

        {/* Conteúdo Principal */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Painel de IA (TurboQuant) */}
          <AIPerformancePanel />

          {/* Outras Seções (Placeholders Premium) */}
          <section className="space-y-4">
             <h3 className="text-lg font-bold text-text-hi font-display px-2">Dados & Sincronização</h3>
             <Card className="glass-panel border-white/5 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Database size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-text-hi">Banco de Dados Local</p>
                      <p className="text-[10px] text-text-lo uppercase tracking-wider">Caminho: %AppData%/NexoMente/nexomente.db</p>
                   </div>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                   Fazer Backup
                </button>
             </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
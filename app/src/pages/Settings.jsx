import React, { useState } from 'react';
import PropTypes from 'prop-types';
import AIPerformancePanel from '../components/ai/AIPerformancePanel';
import Card from '../components/ui/Card';
import { 
  Settings as SettingsIcon, Bell, Shield, User, 
  Database, Trash2, Cpu, Globe, RefreshCcw, 
  AlertTriangle, Sparkles, Key, Save, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIModel } from '../hooks/useAIModel';
import toast from 'react-hot-toast';

export default function Settings() {
  const { provider, setProvider, apiKey, setApiKey } = useAIModel();
  const [activeTab, setActiveTab] = useState('perf');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);

  // Estados Locais de UI (Não globais)
  const [localApiKey, setLocalApiKey] = useState(() => apiKey || '');
  const [userName, setUserName] = useState(localStorage.getItem('nexomente_user_name') || 'bruno');
  const [notifStudy, setNotifStudy] = useState(localStorage.getItem('nexomente_notif_study') === 'true');

  const saveConfig = (key, value, setter) => {
    if (key === 'nexomente_gemini_key') {
      setApiKey(value);
    } else {
      localStorage.setItem(key, value);
    }
    toast.success('Configuração salva');
  };

  const handleBackup = async () => {
    try {
      const dbData = localStorage.getItem('nexomente_db');
      const blob = new Blob([dbData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexomente_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast.success('Backup gerado com sucesso');
    } catch (e) {
      toast.error('Erro ao gerar backup');
    }
  };

  const handleReset = (type) => {
    if (type === 'all') {
      localStorage.clear();
      window.location.reload();
    } else {
      // Limpar apenas chaves de dados, manter config
      const keysToKeep = ['nexomente_gemini_key', 'nexomente_user_name', 'nexomente_notif_study', 'nexomente_ai_provider'];
      const kept = keysToKeep.map(k => ({ k, v: localStorage.getItem(k) }));
      localStorage.clear();
      kept.forEach(item => { if(item.v) localStorage.setItem(item.k, item.v); });
      toast.success('Dados de estudo limpos');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const TABS = [
    { id: 'perf', label: 'Inteligência Artificial', icon: Cpu },
    { id: 'privacy', label: 'Dados & Segurança', icon: Shield },
    { id: 'profile', label: 'Perfil do Usuário', icon: User },
    { id: 'notify', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="main-content min-h-screen p-6 md:p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-bg-primary">
      
      {/* Header */}
      <header className="flex items-center gap-6 mb-12 max-w-5xl mx-auto w-full">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-text-hi shadow-2xl">
           <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-serif font-bold text-text-hi tracking-tight">Configurações</h1>
          <p className="text-text-lo/40 text-sm font-medium">Controle total sobre seu ambiente de estudo.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl mx-auto w-full">
        
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-2">
           {TABS.map(item => (
             <button 
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left border ${activeTab === item.id ? 'bg-white/5 text-text-hi border-white/10 shadow-lg' : 'text-text-lo/40 border-transparent hover:bg-white/[0.02] hover:text-text-hi'}`}
             >
               <item.icon size={18} className={activeTab === item.id ? 'text-accent-main' : ''} />
               <span className="text-sm font-bold tracking-tight">{item.label}</span>
             </button>
           ))}
        </div>

        {/* Conteúdo Dinâmico */}
        <div className="lg:col-span-9 space-y-12">
          
          {activeTab === 'perf' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <section className="space-y-6">
                <div className="flex flex-col gap-1 px-2">
                  <h3 className="text-lg font-serif font-bold text-text-hi">Provedor de Inteligência</h3>
                  <p className="text-xs text-text-lo/40">Escolha o motor de processamento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'cloud', label: 'Gemini Pro', icon: Globe, desc: 'API Cloud (Alta performance)', color: 'text-blue-400' },
                    { id: 'local', label: 'LM Studio', icon: Cpu, desc: 'Localhost (Privacidade)', color: 'text-accent-main' },
                    { id: 'embedded', label: 'Interno', icon: Sparkles, desc: 'Nativo NexoMente', color: 'text-purple-400' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setProvider(opt.id)}
                      className={`p-6 rounded-3xl border transition-all text-left flex flex-col gap-4 group relative ${provider === opt.id ? 'bg-white/5 border-accent-main/30' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${opt.color}`}>
                        <opt.icon size={20} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${provider === opt.id ? 'text-text-hi' : 'text-text-lo'}`}>{opt.label}</p>
                        <p className="text-[10px] text-text-lo/40 uppercase tracking-widest mt-1">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {provider === 'cloud' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-text-hi">
                      <Key size={16} className="text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">Gemini API Key</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        value={localApiKey}
                        onChange={e => setLocalApiKey(e.target.value)}
                        placeholder="Insira sua chave API do Google AI Studio..."
                        className="flex-1 bg-bg-secondary border border-white/5 rounded-xl px-4 py-3 text-sm text-text-hi placeholder-text-lo/20 focus:border-blue-400 focus:outline-none"
                      />
                      <button 
                        onClick={() => saveConfig('nexomente_gemini_key', localApiKey)}
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2"
                      >
                        <Save size={14} /> Salvar
                      </button>
                    </div>
                    <p className="text-[10px] text-text-lo/30">Sua chave é armazenada apenas localmente no seu dispositivo.</p>
                  </motion.div>
                )}
              </section>

              <AIPerformancePanel />
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <section className="space-y-6">
                <div className="flex flex-col gap-1 px-2">
                  <h3 className="text-lg font-serif font-bold text-text-hi">Backup & Sincronização</h3>
                  <p className="text-xs text-text-lo/40">Exporte ou limpe seus dados locais.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-transparent border-white/5 p-8 flex flex-col gap-4">
                    <Database size={24} className="text-blue-400" />
                    <div>
                      <p className="text-base font-bold text-text-hi">Exportar Backup</p>
                      <p className="text-xs text-text-lo/40 mt-1">Gera um arquivo JSON com todas as suas notas e flashcards.</p>
                    </div>
                    <button onClick={handleBackup} className="w-fit flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-text-hi transition-all">
                      <Download size={14} /> Baixar Backup
                    </button>
                  </Card>

                  <Card className="bg-transparent border-white/5 p-8 flex flex-col gap-4">
                    <Trash2 size={24} className="text-danger" />
                    <div>
                      <p className="text-base font-bold text-text-hi">Zona de Perigo</p>
                      <p className="text-xs text-text-lo/40 mt-1">Ações de exclusão permanente sobre o banco de dados.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setDeleteType('soft'); setShowDeleteModal(true); }} className="px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Limpar Dados
                      </button>
                      <button onClick={() => { setDeleteType('all'); setShowDeleteModal(true); }} className="px-4 py-2 border border-danger/30 text-danger hover:bg-danger/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Reset Total
                      </button>
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl">
              <section className="space-y-6">
                <div className="flex flex-col gap-1 px-2">
                  <h3 className="text-lg font-serif font-bold text-text-hi">Perfil do Usuário</h3>
                  <p className="text-xs text-text-lo/40">Como você quer ser chamado pelo NexoMente.</p>
                </div>

                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Seu Nome</label>
                    <input 
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="bg-bg-secondary border border-white/5 rounded-xl px-4 py-3 text-sm text-text-hi focus:border-accent-main focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => saveConfig('nexomente_user_name', userName)}
                    className="w-full py-4 bg-accent-main text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] transition-all"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'notify' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl">
              <section className="space-y-6">
                <div className="flex flex-col gap-1 px-2">
                  <h3 className="text-lg font-serif font-bold text-text-hi">Notificações</h3>
                  <p className="text-xs text-text-lo/40">Controle os alertas de estudo e sistema.</p>
                </div>

                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between p-4 bg-bg-secondary/30 rounded-2xl border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-text-hi">Lembretes de Revisão</span>
                      <span className="text-[10px] text-text-lo/40 uppercase tracking-widest">Notificar quando houver cards para estudar</span>
                    </div>
                    <button 
                      onClick={() => { const v = !notifStudy; setNotifStudy(v); saveConfig('nexomente_notif_study', String(v)); }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${notifStudy ? 'bg-accent-main' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifStudy ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Confirmação */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-secondary w-full max-w-md rounded-[2.5rem] border border-danger/20 shadow-2xl p-10 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-danger/10 rounded-3xl flex items-center justify-center mx-auto text-danger mb-4">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-text-hi">Ação Crítica</h2>
              <p className="text-sm text-text-lo/40">Esta ação irá apagar seus dados permanentemente. Continuar?</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => handleReset(deleteType)} className="w-full py-4 bg-danger text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-danger/80 transition-all">Sim, Confirmar</button>
                <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 bg-white/5 text-text-lo rounded-2xl font-black text-[11px] uppercase tracking-widest">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
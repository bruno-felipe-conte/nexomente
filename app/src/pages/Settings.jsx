import React, { useState, useRef } from 'react';
import AIPerformancePanel from '../components/ai/AIPerformancePanel';
import FSRSSettings from '../components/settings/FSRSSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import Card from '../components/ui/Card';
import {
  User, Database, Trash2, Cpu,
  AlertTriangle, Sparkles, Download, Upload,
  Layers, Globe, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/useUIStore';
import { purgeAllStorage } from '../infra/db/DatabaseAdapter';
import toast from 'react-hot-toast';

export default function Settings() {
  const { userName: globalUserName, setUserName: setGlobalUserName } = useUIStore();
  const [activeTab, setActiveTab] = useState('perf');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // Estados Locais de UI
  const [embeddedPath, setEmbeddedPath] = useState(
    () => localStorage.getItem('nexomente_embedded_path') || './electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf'
  );
  const [userName, setUserName] = useState(() => globalUserName);
  const [notifStudy, setNotifStudy] = useState(localStorage.getItem('nexomente_notif_study') === 'true');
  const fileInputRef = useRef(null);

  const saveConfig = (key, value) => {
    localStorage.setItem(key, value);
    toast.success('Configuração salva');
  };

  const handleBackup = async () => {
    try {
      const dbData = localStorage.getItem('nexomente_db');
      const blob = new Blob([dbData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexomente_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success('Backup gerado com sucesso');
    } catch {
      toast.error('Erro ao gerar backup');
    }
  };

  const handleRestaurarBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (!content || typeof content !== 'string') {
          throw new Error('Arquivo vazio ou inválido');
        }

        const cleanContent = content.trim().replace(/^"|"$/g, '');
        localStorage.setItem('nexomente_db', cleanContent);
        toast.success('Backup restaurado com sucesso! Recarregando sistema...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch {
        toast.error('Falha ao restaurar backup: arquivo corrompido');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async (type) => {
    if (confirmText !== 'CONFIRMAR') {
      toast.error('Digite CONFIRMAR para autorizar a exclusão');
      return;
    }

    if (type === 'all') {
      await purgeAllStorage();
      window.location.reload();
    } else {
      const keysToKeep = ['nexomente_gemini_key', 'nexomente_user_name', 'nexomente_notif_study', 'nexomente_ai_provider', 'nexomente_embedded_path', 'nexomente_locale', 'nexomente_fsrs_config'];
      const kept = keysToKeep.map(k => ({ k, v: localStorage.getItem(k) }));
      await purgeAllStorage();
      kept.forEach(item => { if (item.v) localStorage.setItem(item.k, item.v); });
      toast.success('Dados de estudo limpos');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const TABS = [
    { id: 'perf', label: 'Inteligência Artificial', icon: Cpu },
    { id: 'flashcards', label: 'Flashcards & FSRS', icon: Layers },
    { id: 'general', label: 'Geral & Idioma', icon: Globe },
    { id: 'privacy', label: 'Dados & Backup', icon: Database },
    { id: 'profile', label: 'Perfil & Alertas', icon: User },
  ];

  return (
    <div className="main-content h-full overflow-y-auto scrollbar-none p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-bg-primary">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto w-full pt-2">

        {/* Sidebar de Abas de Configuração */}
        <div className="lg:col-span-3 space-y-2">
          {TABS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-left border cursor-pointer ${
                  isActive
                    ? 'bg-white/5 text-text-hi border-white/10 shadow-lg'
                    : 'text-text-lo/40 border-transparent hover:bg-white/[0.02] hover:text-text-hi'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-accent-main' : ''} />
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo Dinâmico */}
        <div className="lg:col-span-9 space-y-8">

          {/* 1. Inteligência Artificial */}
          {activeTab === 'perf' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="glass-panel border-white/5 rounded-3xl overflow-hidden bg-white/[0.01]">
                <div className="p-7 space-y-6 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-serif font-bold text-text-hi flex items-center gap-2">
                      <Sparkles size={20} className="text-accent-main" />
                      Motor de Inteligência Interno (Offline)
                    </h3>
                    <p className="text-xs text-text-lo/40">
                      Inferência neural nativa e 100% privada com aceleração por GPU via GGUF (node-llama-cpp).
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border bg-white/[0.03] border-accent-main/30 ring-1 ring-accent-main/20 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-accent-main shrink-0">
                      <Cpu size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-hi">LLM Local Embutida (Gemma 4 / Llama 3.2)</p>
                      <p className="text-xs text-text-lo/60 mt-0.5">Execução direta em hardware local sem envio de dados para a nuvem.</p>
                    </div>
                  </div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-text-hi">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-accent-main" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Caminho do Modelo GGUF Interno</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={embeddedPath}
                        onChange={e => setEmbeddedPath(e.target.value)}
                        placeholder="Caminho da pasta ou arquivo .gguf..."
                        className="flex-1 bg-bg-secondary border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveConfig('nexomente_embedded_path', embeddedPath.trim())}
                        className="px-5 py-2 bg-accent-main text-white rounded-xl font-bold text-xs hover:bg-accent-main/80 transition-all cursor-pointer"
                      >
                        Salvar Caminho
                      </button>
                    </div>
                  </motion.div>
                </div>

                <div className="p-7 bg-black/20">
                  <AIPerformancePanel />
                </div>
              </div>
            </div>
          )}

          {/* 2. Flashcards & FSRS */}
          {activeTab === 'flashcards' && (
            <FSRSSettings />
          )}

          {/* 3. Geral & Idioma */}
          {activeTab === 'general' && (
            <GeneralSettings />
          )}

          {/* 4. Dados & Backup */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <h3 className="text-xl font-serif font-bold text-text-hi flex items-center gap-2.5">
                  <Database size={22} className="text-blue-400" />
                  Backup & Sincronização
                </h3>
                <p className="text-xs text-text-lo/40">Exporte ou limpe seus dados locais e configurações.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-transparent border-white/5 p-6 flex flex-col gap-4">
                  <Database size={24} className="text-blue-400" />
                  <div>
                    <p className="text-base font-bold text-text-hi">Exportar / Restaurar Backup</p>
                    <p className="text-xs text-text-lo/40 mt-1">Gera ou restaura um arquivo JSON com todas as suas notas e flashcards.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-text-hi transition-all cursor-pointer">
                      <Download size={14} /> Baixar Backup
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-text-hi transition-all cursor-pointer"
                    >
                      <Upload size={14} /> Restaurar Backup
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleRestaurarBackup}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </Card>

                <Card className="bg-transparent border-white/5 p-6 flex flex-col gap-4">
                  <Trash2 size={24} className="text-danger" />
                  <div>
                    <p className="text-base font-bold text-text-hi">Zona de Perigo</p>
                    <p className="text-xs text-text-lo/40 mt-1">Ações de exclusão permanente sobre o banco de dados.</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setDeleteType('soft'); setShowDeleteModal(true); }} className="px-4 py-2.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                      Limpar Dados
                    </button>
                    <button onClick={() => { setDeleteType('all'); setShowDeleteModal(true); }} className="px-4 py-2.5 border border-danger/30 text-danger hover:bg-danger/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                      Reset Total
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 5. Perfil & Alertas */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <h3 className="text-xl font-serif font-bold text-text-hi flex items-center gap-2.5">
                  <User size={22} className="text-accent-main" />
                  Perfil do Usuário & Alertas
                </h3>
                <p className="text-xs text-text-lo/40">Identidade no ecossistema e lembretes de revisão ativa.</p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Seu Nome / Apelido</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="bg-bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-hi focus:border-accent-main focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setGlobalUserName(userName);
                    toast.success('Perfil atualizado com sucesso');
                  }}
                  className="w-full py-3 bg-accent-main text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all cursor-pointer"
                >
                  Salvar Perfil
                </button>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between p-4 bg-bg-secondary/30 rounded-xl border border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-text-hi flex items-center gap-2">
                      <Bell size={14} className="text-amber-400" /> Lembretes de Revisão
                    </span>
                    <span className="text-[10px] text-text-lo/40">Notificar na barra quando houver flashcards pendentes</span>
                  </div>
                  <button
                    onClick={() => { const v = !notifStudy; setNotifStudy(v); saveConfig('nexomente_notif_study', String(v)); }}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${notifStudy ? 'bg-accent-main' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifStudy ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Confirmação Crítica */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-bg-secondary w-full max-w-md rounded-3xl border border-danger/20 shadow-2xl p-8 text-center space-y-5"
            >
              <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto text-danger mb-2">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-serif font-bold text-text-hi">Ação Crítica</h2>
              <p className="text-xs text-text-lo/40">
                Esta ação irá apagar seus dados permanentemente. Digite <strong className="text-danger font-mono font-black">CONFIRMAR</strong> para prosseguir.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Digite CONFIRMAR..."
                className="w-full bg-black/40 border border-danger/30 rounded-xl px-4 py-2.5 text-center text-xs font-mono text-danger font-bold uppercase tracking-widest focus:outline-none focus:border-danger"
              />
              <div className="flex flex-col gap-2 pt-2">
                <button
                  disabled={confirmText !== 'CONFIRMAR'}
                  onClick={() => handleReset(deleteType)}
                  className="w-full py-3 bg-danger text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-danger/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sim, Confirmar Exclusão
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="w-full py-3 bg-white/5 text-text-lo rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
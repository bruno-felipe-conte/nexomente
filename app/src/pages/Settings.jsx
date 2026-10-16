import React, { useState, useRef } from 'react';
import AIPerformancePanel from '../components/ai/AIPerformancePanel';
import Card from '../components/ui/Card';
import {
  Settings as SettingsIcon, Bell, Shield, User,
  Database, Trash2, Cpu, Globe,
  AlertTriangle, Sparkles, Key, Download, Upload, Mic,
  Eye, EyeOff, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIModel } from '../hooks/useAIModel';
import { useUIStore } from '../store/useUIStore';
import * as geminiService from '../lib/ai/geminiService';
import toast from 'react-hot-toast';
import RecitacaoSettings from '../components/settings/RecitacaoSettings';

export default function Settings() {
  const { provider, setProvider, apiKey, setApiKey } = useAIModel();
  const { userName: globalUserName, setUserName: setGlobalUserName } = useUIStore();
  const [activeTab, setActiveTab] = useState('perf');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // Estados Locais de UI (Não globais)
  const [localApiKey, setLocalApiKey] = useState(() => apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testandoKey, setTestandoKey] = useState(false);
  const [statusKey, setStatusKey] = useState(null);
  const [embeddedPath, setEmbeddedPath] = useState(
    () => localStorage.getItem('nexomente_embedded_path') || './electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf'
  );
  const [userName, setUserName] = useState(() => globalUserName);
  const [notifStudy, setNotifStudy] = useState(localStorage.getItem('nexomente_notif_study') === 'true');
  const fileInputRef = useRef(null);

  const saveConfig = (key, value) => {
    if (key === 'nexomente_gemini_key') {
      setApiKey(value);
    } else {
      localStorage.setItem(key, value);
    }
    toast.success('Configuração salva');
  };

  const handleTestarApiKey = async () => {
    if (!localApiKey.trim()) {
      toast.error('Insira uma chave API para testar');
      return;
    }
    setTestandoKey(true);
    setStatusKey(null);
    try {
      localStorage.setItem('nexomente_gemini_key', localApiKey.trim());
      const res = await geminiService.checkStatus();
      if (res.status === 'online') {
        setStatusKey({ ok: true, msg: 'Chave válida e conectada!' });
        toast.success('Conexão com Gemini estabelecida com sucesso!');
        setApiKey(localApiKey.trim());
      } else {
        setStatusKey({ ok: false, msg: res.error || 'Falha ao autenticar com a API.' });
        toast.error('Erro na chave API do Gemini');
      }
    } catch (err) {
      setStatusKey({ ok: false, msg: err.message || 'Erro de conexão' });
      toast.error('Erro ao conectar com a API');
    } finally {
      setTestandoKey(false);
    }
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

        // Tenta detectar se é o base64 do SQLite serializado
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

  const handleReset = (type) => {
    if (confirmText !== 'CONFIRMAR') {
      toast.error('Digite CONFIRMAR para autorizar a exclusão');
      return;
    }

    if (type === 'all') {
      localStorage.clear();
      window.location.reload();
    } else {
      // Limpar apenas chaves de dados, manter config
      const keysToKeep = ['nexomente_gemini_key', 'nexomente_user_name', 'nexomente_notif_study', 'nexomente_ai_provider', 'nexomente_embedded_path'];
      const kept = keysToKeep.map(k => ({ k, v: localStorage.getItem(k) }));
      localStorage.clear();
      kept.forEach(item => { if(item.v) localStorage.setItem(item.k, item.v); });
      toast.success('Dados de estudo limpos');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const TABS = [
    { id: 'perf', label: 'Inteligência Artificial', icon: Cpu },
    { id: 'recitacao', label: 'Recitação (Whisper)', icon: Mic },
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
              {/* Painel Unificado de IA */}
              <div className="glass-panel border-white/5 rounded-[2.5rem] overflow-hidden bg-white/[0.01]">
                {/* Seção Superior: Provedor */}
                <div className="p-8 space-y-8 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-serif font-bold text-text-hi flex items-center gap-2">
                      <Globe size={20} className="text-accent-main" />
                      Motor de Inteligência
                    </h3>
                    <p className="text-xs text-text-lo/40">Defina onde o processamento da sua rede neural acontece.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'cloud', label: 'Gemini Pro', icon: Globe, desc: 'Alta Performance (Cloud)', color: 'text-blue-400' },
                      { id: 'local', label: 'LM Studio', icon: Cpu, desc: 'Privacidade Total (Local)', color: 'text-accent-main' },
                      {
                        id: 'embedded',
                        label: 'Interno (Gemma 4)',
                        icon: Sparkles,
                        desc: 'Motor GGUF Embutido',
                        color: 'text-purple-400',
                        disabled: false
                      },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        disabled={opt.disabled}
                        onClick={() => setProvider(opt.id)}
                        className={`p-5 rounded-3xl border transition-all text-left flex flex-col gap-3 group relative cursor-pointer ${provider === opt.id ? 'bg-white/5 border-accent-main/30 ring-1 ring-accent-main/20' : 'bg-transparent border-white/5 hover:border-white/10'} ${opt.disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${opt.color}`}>
                          <opt.icon size={20} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${provider === opt.id ? 'text-text-hi' : 'text-text-lo'}`}>{opt.label}</p>
                          <p className="text-[9px] text-text-lo/40 uppercase tracking-widest mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {provider === 'embedded' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between text-text-hi">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-purple-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Caminho do Modelo GGUF Interno (node-llama-cpp)</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={embeddedPath}
                          onChange={e => setEmbeddedPath(e.target.value)}
                          placeholder="Caminho da pasta ou arquivo .gguf..."
                          className="flex-1 bg-bg-secondary border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-text-hi focus:border-purple-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveConfig('nexomente_embedded_path', embeddedPath.trim())}
                          className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-bold text-xs hover:bg-purple-600 transition-all cursor-pointer"
                        >
                          Salvar Caminho
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {provider === 'cloud' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between text-text-hi">
                        <div className="flex items-center gap-2">
                          <Key size={14} className="text-blue-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Configuração de Chave</span>
                        </div>
                        {statusKey && (
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusKey.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                            {statusKey.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            <span>{statusKey.msg}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={localApiKey}
                            onChange={e => setLocalApiKey(e.target.value)}
                            placeholder="Gemini API Key..."
                            className="w-full bg-bg-secondary border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-sm text-text-hi focus:border-blue-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-3 text-text-lo/40 hover:text-text-hi transition-colors cursor-pointer"
                            title={showApiKey ? 'Ocultar chave' : 'Exibir chave'}
                          >
                            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTestarApiKey}
                            disabled={testandoKey || !localApiKey.trim()}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-xs text-text-hi transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                          >
                            {testandoKey && <Loader2 size={13} className="animate-spin text-blue-400" />}
                            Testar Conexão
                          </button>
                          <button
                            type="button"
                            onClick={() => saveConfig('nexomente_gemini_key', localApiKey)}
                            className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Seção Inferior: Performance (Conectada) */}
                <div className="p-8 bg-black/20">
                  <AIPerformancePanel />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recitacao' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <RecitacaoSettings />
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={handleBackup} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-text-hi transition-all cursor-pointer">
                        <Download size={14} /> Baixar Backup
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-text-hi transition-all cursor-pointer"
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
                    onClick={() => {
                      setGlobalUserName(userName);
                      toast.success('Perfil atualizado com sucesso');
                    }}
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
              <p className="text-sm text-text-lo/40">
                Esta ação irá apagar seus dados permanentemente. Digite <strong className="text-danger font-mono font-black">CONFIRMAR</strong> para prosseguir.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Digite CONFIRMAR..."
                className="w-full bg-black/40 border border-danger/30 rounded-xl px-4 py-2.5 text-center text-sm font-mono text-danger font-bold uppercase tracking-widest focus:outline-none focus:border-danger"
              />
              <div className="flex flex-col gap-3">
                <button
                  disabled={confirmText !== 'CONFIRMAR'}
                  onClick={() => handleReset(deleteType)}
                  className="w-full py-4 bg-danger text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-danger/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sim, Confirmar Exclusão
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="w-full py-4 bg-white/5 text-text-lo rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer"
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
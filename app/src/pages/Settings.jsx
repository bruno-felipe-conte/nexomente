import React, { useState, useRef, useMemo } from 'react';
import AIPerformancePanel from '../components/ai/AIPerformancePanel';
import FSRSSettings from '../components/settings/FSRSSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import Card from '../components/ui/Card';
import {
  User, Database, Trash2, Cpu,
  AlertTriangle, Sparkles, Download, Upload,
  Layers, Globe, Bell, Eye, EyeOff, Cloud,
  CheckCircle2, XCircle, Loader2, Server, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/useUIStore';
import { purgeAllStorage, saveSnapshotToIndexedDB, loadSnapshotFromIndexedDB } from '../infra/db/DatabaseAdapter';
import { getDB, useDBStore } from '../store/useDBStore';
import { httpProvider } from '../lib/ai/httpProvider';
import { getActiveProvider, setActiveProvider } from '../lib/ai/aiProvider';
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
  const [aiProviderMode, setAiProviderMode] = useState(
    () => localStorage.getItem('nexomente_ai_provider') || 'embedded'
  );
  const [httpUrl, setHttpUrl] = useState(
    () => localStorage.getItem('nexomente_ai_http_url') || 'http://localhost:1234/v1'
  );
  const [httpApiKey, setHttpApiKey] = useState(
    () => localStorage.getItem('nexomente_ai_http_api_key') || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [httpModel, setHttpModel] = useState(
    () => localStorage.getItem('nexomente_ai_http_model') || ''
  );
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const [userName, setUserName] = useState(() => globalUserName);
  const [notifStudy, setNotifStudy] = useState(localStorage.getItem('nexomente_notif_study') === 'true');
  const fileInputRef = useRef(null);

  const handleProviderChange = (mode) => {
    setAiProviderMode(mode);
    setActiveProvider(mode);
    toast.success(`Provedor ativo alterado para ${mode === 'embedded' ? 'Motor Interno (GGUF)' : 'Provedores Externos / Nuvem (HTTP)'}`);
  };

  const handleSaveHttpConfig = () => {
    const cleanUrl = httpUrl.trim() || 'http://localhost:1234/v1';
    const cleanKey = httpApiKey.trim();
    const cleanModel = httpModel.trim();

    localStorage.setItem('nexomente_ai_http_url', cleanUrl);
    localStorage.setItem('nexomente_ai_http_api_key', cleanKey);
    localStorage.setItem('nexomente_ai_http_model', cleanModel);

    // Ativa automaticamente o modo HTTP no sistema
    setAiProviderMode('http');
    setActiveProvider('http');

    toast.success('Provedor Externo salvo e ativado como motor de IA principal!');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      localStorage.setItem('nexomente_ai_http_url', httpUrl.trim() || 'http://localhost:1234/v1');
      localStorage.setItem('nexomente_ai_http_api_key', httpApiKey.trim());
      if (httpModel.trim()) {
        localStorage.setItem('nexomente_ai_http_model', httpModel.trim());
      }

      const res = await httpProvider.checkStatus();
      setConnectionStatus(res);
      if (res.status === 'online') {
        toast.success(`Conexão estabelecida com sucesso! (${res.models?.length || 0} modelos detectados)`);
      } else {
        toast.error(`Falha ao conectar: ${res.error || 'Servidor inacessível'}`);
      }
    } catch (err) {
      const errObj = { status: 'offline', error: err.message || 'Erro desconhecido' };
      setConnectionStatus(errObj);
      toast.error(`Erro ao testar conexão: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const applyPreset = (preset) => {
    if (preset === 'gemini') {
      setHttpUrl('https://generativelanguage.googleapis.com/v1beta/openai');
      setHttpModel('gemini-2.5-flash');
      setAiProviderMode('http');
      setActiveProvider('http');
      toast('Preset Google Gemini selecionado e ativado! Cole sua chave e clique em Salvar.', { icon: '✨' });
    } else if (preset === 'openrouter') {
      setHttpUrl('https://openrouter.ai/api/v1');
      setHttpModel('google/gemini-2.5-flash');
      setAiProviderMode('http');
      setActiveProvider('http');
      toast('Preset OpenRouter aplicado e ativado!', { icon: '🚀' });
    } else if (preset === 'groq') {
      setHttpUrl('https://api.groq.com/openai/v1');
      setHttpModel('llama-3.3-70b-versatile');
      setAiProviderMode('http');
      setActiveProvider('http');
      toast('Preset Groq aplicado e ativado!', { icon: '⚡' });
    } else if (preset === 'ollama') {
      setHttpUrl('http://localhost:11434/v1');
      setHttpModel('llama3.2');
      setAiProviderMode('http');
      setActiveProvider('http');
      toast('Preset Ollama aplicado e ativado!', { icon: '🦙' });
    } else if (preset === 'lmstudio') {
      setHttpUrl('http://localhost:1234/v1');
      setHttpModel('local-model');
      setAiProviderMode('http');
      setActiveProvider('http');
      toast('Preset LM Studio aplicado e ativado!', { icon: '💻' });
    }
  };

  const keyMismatch = useMemo(() => {
    const trimmedKey = httpApiKey.trim();
    const trimmedUrl = httpUrl.trim().toLowerCase();
    if (!trimmedKey) return null;

    const isGeminiKey = trimmedKey.startsWith('AQ.') || trimmedKey.startsWith('AIza');
    const isGroqKey = trimmedKey.startsWith('gsk_');

    if (isGeminiKey && !trimmedUrl.includes('googleapis')) {
      return {
        type: 'gemini',
        message: 'A chave inserida (iniciada em AQ...) pertence ao Google Gemini, mas o endpoint atual não é do Gemini.',
        actionText: 'Trocar para Google Gemini',
        targetPreset: 'gemini'
      };
    }
    if (isGroqKey && !trimmedUrl.includes('groq')) {
      return {
        type: 'groq',
        message: 'A chave inserida (iniciada em gsk_...) pertence à Groq, mas o endpoint atual não é da Groq.',
        actionText: 'Trocar para Groq',
        targetPreset: 'groq'
      };
    }
    return null;
  }, [httpApiKey, httpUrl]);

  const saveConfig = (key, value) => {
    localStorage.setItem(key, value);
    toast.success('Configuração salva');
  };

  const handleBackup = async () => {
    try {
      let base64 = localStorage.getItem('nexomente_db') || '';

      // Tenta obter o snapshot binário do SQLite diretamente da instância ativa
      const db = getDB();
      if (db && typeof db.export === 'function') {
        const bytes = db.export();
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        base64 = btoa(binary);
      } else {
        const idbBytes = await loadSnapshotFromIndexedDB();
        if (idbBytes && idbBytes.byteLength > 0) {
          const chunkSize = 0x8000;
          let binary = '';
          for (let i = 0; i < idbBytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, idbBytes.subarray(i, i + chunkSize));
          }
          base64 = btoa(binary);
        }
      }

      // Dados estruturados para interoperabilidade
      const notas = useDBStore.getState().Notas?.getAll?.() || [];
      const flashcards = useDBStore.getState().Flashcards?.getAll?.() || [];
      const materias = useDBStore.getState().Materias?.getAll?.() || [];
      const pastas = useDBStore.getState().Pastas?.getAll?.() || [];

      const backupPayload = {
        app: 'NexoMente',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        sqliteBase64: base64,
        notas,
        flashcards,
        materias,
        pastas,
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexomente_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso!');
    } catch (err) {
      console.error('Erro no backup:', err);
      toast.error('Erro ao gerar backup');
    }
  };

  const handleRestaurarBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = event.target?.result;
        if (!rawContent || typeof rawContent !== 'string') {
          throw new Error('Arquivo vazio ou ilegível');
        }

        let parsed;
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          // Pode ser o base64 puro legado
          parsed = { sqliteBase64: rawContent.trim().replace(/^"|"$/g, '') };
        }

        if (parsed?.sqliteBase64) {
          const base64 = parsed.sqliteBase64;
          localStorage.setItem('nexomente_db', base64);
          localStorage.setItem('nexomente_db_updated_at', String(Date.now() + 5000));

          // Grava também no IndexedDB para manter paridade absoluta
          try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            await saveSnapshotToIndexedDB(bytes, { updatedAt: Date.now() + 5000 });
          } catch (idbErr) {
            console.warn('Aviso: falha ao espelhar restauração no IndexedDB:', idbErr);
          }
        } else if (Array.isArray(parsed?.notas)) {
          // Backup em JSON legível de notas
          localStorage.setItem('nexomente_notas', JSON.stringify(parsed.notas));
        }

        toast.success('Backup restaurado com sucesso! Reiniciando ecossistema...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error('Falha na restauração:', err);
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
              {/* Seletor de Provedor Ativo */}
              <div className="glass-panel border-white/5 rounded-3xl p-6 bg-white/[0.01] space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-accent-main uppercase tracking-widest">Hub de Inteligência Artificial Híbrido</span>
                  <h3 className="text-lg font-serif font-bold text-text-hi">Provedor Ativo do Sistema</h3>
                  <p className="text-xs text-text-lo/40">
                    Defina o motor primário para processar conversas no Copiloto, sugestão de tags e resumos cognitivos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('embedded')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      aiProviderMode === 'embedded'
                        ? 'bg-accent-main/10 border-accent-main ring-1 ring-accent-main/30'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-text-lo/60 hover:text-text-hi'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <Cpu size={18} className={aiProviderMode === 'embedded' ? 'text-accent-main' : 'text-text-lo/40'} />
                        <span className="text-xs font-bold text-text-hi">Motor Local Embutido</span>
                      </div>
                      {aiProviderMode === 'embedded' && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-main text-white text-[9px] font-black uppercase tracking-wider">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-lo/40">
                      Gemma 4 / Llama GGUF 100% offline, soberano e executado direto no seu hardware.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('http')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      aiProviderMode === 'http'
                        ? 'bg-accent-main/10 border-accent-main ring-1 ring-accent-main/30'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-text-lo/60 hover:text-text-hi'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <Cloud size={18} className={aiProviderMode === 'http' ? 'text-accent-main' : 'text-text-lo/40'} />
                        <span className="text-xs font-bold text-text-hi">Provedor Externo & Nuvem</span>
                      </div>
                      {aiProviderMode === 'http' && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-main text-white text-[9px] font-black uppercase tracking-wider">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-lo/40">
                      OpenRouter, Groq, OpenAI, Ollama ou LM Studio com fallback resiliente para o motor local.
                    </p>
                  </button>
                </div>
              </div>

              {/* DLC: Provedores Externos & Nuvem */}
              <div className="glass-panel border-white/5 rounded-3xl overflow-hidden bg-white/[0.01]">
                <div className="p-7 space-y-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-serif font-bold text-text-hi flex items-center gap-2">
                      <Cloud size={20} className="text-accent-main" />
                      DLC: Provedores Externos & Nuvem
                    </h3>
                    <p className="text-xs text-text-lo/40">
                      Conecte endpoints OpenAI-compatíveis (OpenRouter, Groq, OpenAI, Ollama, LM Studio). Em caso de indisponibilidade ou falha remota, o NexoMente ativa fallback automático para a LLM local offline sem travar a interface.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Presets Rápidos */}
                    <div className="space-y-2 pb-1">
                      <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} className="text-accent-main" /> Presets Rápidos de Provedores
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset('gemini')}
                          className="px-3 py-1.5 rounded-xl bg-accent-main/15 hover:bg-accent-main/25 border border-accent-main/40 text-xs font-bold text-accent-main flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          ✨ Google Gemini (Recomendado)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('openrouter')}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-text-hi flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          🚀 OpenRouter
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('groq')}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-text-hi flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          ⚡ Groq
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('ollama')}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-text-hi flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          🦙 Ollama
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('lmstudio')}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-text-hi flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          💻 LM Studio
                        </button>
                      </div>
                    </div>

                    {/* URL Base */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest flex items-center gap-1.5">
                        <Server size={12} className="text-accent-main" /> URL Base da API (Endpoint HTTP)
                      </label>
                      <input
                        type="text"
                        value={httpUrl}
                        onChange={e => setHttpUrl(e.target.value)}
                        placeholder="http://localhost:1234/v1"
                        className="w-full bg-bg-secondary border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
                      />
                      <p className="text-[10px] text-text-lo/40">
                        Google Gemini: <code>https://generativelanguage.googleapis.com/v1beta/openai</code> · OpenRouter: <code>https://openrouter.ai/api/v1</code> · LM Studio: <code>http://localhost:1234/v1</code>
                      </p>
                    </div>

                    {/* Chave de API (Bearer Token) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest">
                        Chave de API (Authorization: Bearer)
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={httpApiKey}
                          onChange={e => setHttpApiKey(e.target.value)}
                          placeholder="sk-or-v1-... (deixe em branco para servidores locais sem autenticação)"
                          className="w-full bg-bg-secondary border border-white/5 rounded-xl px-4 py-2.5 pr-10 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-lo/40 hover:text-text-hi transition-colors cursor-pointer"
                          title={showApiKey ? 'Ocultar chave de API' : 'Exibir chave de API'}
                        >
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Aviso de Incompatibilidade de Chave */}
                      {keyMismatch && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 text-amber-300">
                            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                            <span>{keyMismatch.message}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyPreset(keyMismatch.targetPreset)}
                            className="px-3 py-1 rounded-lg bg-amber-500 text-slate-900 font-bold text-[11px] shrink-0 hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>{keyMismatch.actionText}</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Identificador do Modelo */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-lo uppercase tracking-widest">
                        Identificador do Modelo (Model ID)
                      </label>
                      <input
                        type="text"
                        value={httpModel}
                        onChange={e => setHttpModel(e.target.value)}
                        placeholder="ex: anthropic/claude-3.5-sonnet, meta-llama/llama-3.3-70b-instruct, gpt-4o"
                        className="w-full bg-bg-secondary border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
                      />
                      <p className="text-[10px] text-text-lo/40">
                        Identificador enviado no payload <code>model</code> na rota <code>/chat/completions</code>.
                      </p>
                    </div>

                    {/* Ações e Status da Conexão */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={testingConnection}
                          onClick={handleTestConnection}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-text-hi transition-all cursor-pointer disabled:opacity-50"
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-accent-main" /> Testando...
                            </>
                          ) : (
                            <>
                              <Server size={14} /> Testar Conexão
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveHttpConfig}
                          className="px-5 py-2.5 bg-accent-main text-white rounded-xl font-bold text-xs hover:bg-accent-main/80 transition-all cursor-pointer"
                        >
                          Salvar Configurações
                        </button>
                      </div>

                      {/* Badge de Status */}
                      {connectionStatus && (
                        <div className="flex items-center">
                          {connectionStatus.status === 'online' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                              <CheckCircle2 size={14} />
                              <span>Online ({connectionStatus.models?.length || 0} modelos)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                              <XCircle size={14} />
                              <span>{connectionStatus.error || 'Offline'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Motor Interno GGUF */}
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
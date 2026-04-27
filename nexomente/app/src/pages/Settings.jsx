import { useState } from 'react';
import { useUIStore } from '../store/useUIStore';
import { Moon, Sun, Database, Trash2, Download, Upload, Info, Cpu, Globe, Bot, Zap } from 'lucide-react';
import ResetModal from '../components/ui/ResetModal';
import toast from 'react-hot-toast';

export default function Settings() {
  const { tema: temaStore, toggleTheme } = useUIStore.getState();
  const [tema, setTema] = useState(temaStore || 'dark');

  const toggleTema = () => {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(novo);
    localStorage.setItem('nexomente_tema', novo);
    window.dispatchEvent(new Event('storage'));
  };

  const exportarDados = () => {
    const dados = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('nexomente_')) {
        dados[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexomente-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Backup exportado com sucesso!');
  };

  const importarDados = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dados = JSON.parse(event.target.result);
        Object.entries(dados).forEach(([key, val]) => {
          localStorage.setItem(key, val);
        });
        toast.success('Dados importados! Reiniciando...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error('Arquivo de backup inválido');
      }
    };
    reader.readAsText(file);
  };

  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetConfirm = (apagarConfig) => {
    const configKeys = [
      'nexomente_gemini_key',
      'nexomente_ai_provider',
      'nexomente_tema',
      'nexomente_ai_temp',
      'nexomente_ai_max_tokens',
      'nexomente_ai_system_prompt',
      'nexomente_ai_language',
      'nexomente_embedded_path',
      'nexomente_bancas'
    ];

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexomente_')) {
        if (!apagarConfig && configKeys.includes(key)) {
          continue;
        }
        localStorage.removeItem(key);
      }
    }
    
    toast.success('Dados limpos com sucesso!');
    setShowResetModal(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  const [activeProvider, setActiveProvider] = useState(localStorage.getItem('nexomente_ai_provider') || 'embedded');

  const mudarProvedor = (p) => {
    localStorage.setItem('nexomente_ai_provider', p);
    setActiveProvider(p);
    window.dispatchEvent(new Event('storage'));
    toast.success(`Provedor alterado para: ${p.toUpperCase()}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 pb-20">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-black text-text-primary uppercase tracking-tighter">Configurações</h1>
          <p className="text-text-muted text-sm mt-1">Gerencie seu segundo cérebro e sua inteligência artificial.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportarDados} className="p-2 hover:bg-bg-tertiary rounded-xl transition-all" title="Exportar Backup">
            <Download size={20} className="text-text-secondary" />
          </button>
          <label className="p-2 hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer" title="Importar Backup">
            <Upload size={20} className="text-text-secondary" />
            <input type="file" onChange={importarDados} className="hidden" accept=".json" />
          </label>
        </div>
      </header>

      {/* Aparência */}
      <section className="bg-bg-secondary border border-border-subtle rounded-3xl p-8 shadow-xl">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center gap-2">
          <Sun size={14} /> Aparência do Sistema
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Tema Visual</h3>
            <p className="text-text-muted text-xs">Alternar entre modo claro e escuro para melhor conforto.</p>
          </div>
          <button
            onClick={toggleTema}
            className="flex items-center gap-2 px-6 py-3 bg-bg-tertiary border border-border-subtle rounded-2xl hover:border-accent-main transition-all font-bold text-sm"
          >
            {tema === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            {tema === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
          </button>
        </div>
      </section>

      {/* Inteligência Artificial */}
      <section className="bg-bg-secondary border border-border-subtle rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Cpu size={120} />
        </div>

        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center gap-2">
          <Database size={14} /> Motor de Inteligência Artificial
        </h2>

        <div className="space-y-8">
          {/* Provedor */}
          <div>
            <label className="text-[11px] font-bold text-text-muted mb-3 block uppercase tracking-widest">Provedor Ativo</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'local', label: 'Local (LM Studio)', icon: Cpu, desc: 'Requer servidor externo' },
                { id: 'cloud', label: 'Nuvem (Gemini)', icon: Globe, desc: 'Google AI Studio' },
                { id: 'embedded', label: 'Embutido (GGUF)', icon: Zap, desc: 'Direto no NexoMente' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => mudarProvedor(p.id)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    activeProvider === p.id 
                      ? 'bg-accent-main/10 border-accent-main shadow-lg shadow-accent-main/5' 
                      : 'bg-bg-tertiary/50 border-border-subtle hover:border-text-lo'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p.icon size={16} className={activeProvider === p.id ? 'text-accent-main' : 'text-text-muted'} />
                    <span className={`text-sm font-black ${activeProvider === p.id ? 'text-text-primary' : 'text-text-secondary'}`}>{p.label}</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Configurações Específicas */}
          <div className="animate-in fade-in slide-in-from-top-4">
            {activeProvider === 'cloud' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">Google Gemini API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      id="gemini_key_input"
                      defaultValue={localStorage.getItem('nexomente_gemini_key') || ''}
                      placeholder="Cole sua chave aqui..."
                      className="flex-1 bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:border-accent-main focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('nexomente_gemini_key', document.getElementById('gemini_key_input').value);
                        toast.success('Chave Gemini salva!');
                      }}
                      className="px-6 py-2.5 bg-accent-main text-white rounded-xl text-xs font-black uppercase hover:opacity-90 transition-all"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeProvider === 'embedded' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">Caminho do Modelo (.gguf)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="embedded_path_input"
                      defaultValue={localStorage.getItem('nexomente_embedded_path') || './electron/models/gemma-4b.gguf'}
                      placeholder="./electron/models/modelo.gguf"
                      className="flex-1 bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-2.5 text-sm focus:border-accent-main focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('nexomente_embedded_path', document.getElementById('embedded_path_input').value);
                        toast.success('Caminho do modelo salvo!');
                      }}
                      className="px-6 py-2.5 bg-accent-main text-white rounded-xl text-xs font-black uppercase hover:opacity-90 transition-all"
                    >
                      Salvar
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    <p className="text-[10px] text-success font-bold uppercase">Motor Incorporado Detectado</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personalização Avançada */}
          <div className="pt-8 border-t border-border-subtle/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-6 flex items-center gap-2">
              <Bot size={14} /> Personalidade e Criatividade
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-tight">Temperatura (Criatividade)</label>
                  <span className="text-[11px] font-black text-accent-main">{localStorage.getItem('nexomente_ai_temp') || '0.7'}</span>
                </div>
                <input
                  type="range" min="0.1" max="1.5" step="0.1"
                  defaultValue={localStorage.getItem('nexomente_ai_temp') || '0.7'}
                  onChange={(e) => {
                    localStorage.setItem('nexomente_ai_temp', e.target.value);
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none accent-accent-main"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-tight">Tamanho da Resposta</label>
                  <span className="text-[11px] font-black text-accent-main">{localStorage.getItem('nexomente_ai_max_tokens') || '512'} tokens</span>
                </div>
                <input
                  type="range" min="128" max="4096" step="128"
                  defaultValue={localStorage.getItem('nexomente_ai_max_tokens') || '512'}
                  onChange={(e) => {
                    localStorage.setItem('nexomente_ai_max_tokens', e.target.value);
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none accent-accent-main"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-tight">Idioma das Respostas</label>
                  <select
                    defaultValue={localStorage.getItem('nexomente_ai_language') || 'Português Brasileiro'}
                    onChange={(e) => {
                      localStorage.setItem('nexomente_ai_language', e.target.value);
                      toast.success('Idioma atualizado!');
                    }}
                    className="w-full bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent-main focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Português Brasileiro">🇧🇷 Português Brasileiro</option>
                    <option value="English">🇺🇸 Inglês (English)</option>
                    <option value="Mandarin Chinese">🇨🇳 Mandarim (中文)</option>
                    <option value="Hindi">🇮🇳 Hindi (हिन्दी)</option>
                    <option value="Spanish">🇪🇸 Espanhol (Español)</option>
                    <option value="French">🇫🇷 Francês (Français)</option>
                    <option value="Arabic">🇸🇦 Árabe (العربية)</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-tight">Instrução Base (System Prompt)</label>
                  <textarea
                    defaultValue={localStorage.getItem('nexomente_ai_system_prompt') || 'Você é um assistente de estudos prestativo e inteligente. Responda sempre de forma clara e estruturada.'}
                    onBlur={(e) => localStorage.setItem('nexomente_ai_system_prompt', e.target.value)}
                    className="w-full h-24 bg-bg-tertiary border border-border-subtle rounded-2xl p-4 text-xs text-text-primary focus:border-accent-main focus:outline-none transition-all resize-none"
                    placeholder="Defina como a IA deve se comportar..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perigo */}
      <section className="bg-danger/5 border border-danger/20 rounded-3xl p-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-danger mb-6 flex items-center gap-2">
          <Trash2 size={14} /> Zona de Perigo
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Resetar NexoMente</h3>
            <p className="text-text-muted text-xs">Apaga todos os seus dados permanentemente. Use com cautela.</p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-danger/10 border border-danger/30 text-danger rounded-2xl hover:bg-danger hover:text-white transition-all font-bold text-sm"
          >
            <Trash2 size={16} /> Apagar Tudo
          </button>
        </div>
      </section>

      <footer className="text-center pb-10">
        <p className="text-[10px] text-text-lo uppercase font-black tracking-widest">NexoMente v1.0.0 — Offline-First Brain</p>
      </footer>
      
      <ResetModal
        open={showResetModal}
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}
import { useState } from 'react';
import { useUIStore } from '../store/useUIStore';
import { Moon, Sun, Database, Trash2, Download, Upload, Info } from 'lucide-react';

export default function Settings() {
  const { tema: temaStore, toggleTheme } = useUIStore.getState();
  const [tema, setTema] = useState(temaStore || 'dark');
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const toggleTema = () => {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(novo);
    localStorage.setItem('nexomente_tema', novo);
  };

  const exportarDados = () => {
    const dados = localStorage.getItem('nexomente_db');
    if (!dados) return;
    
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexomente_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importarDados = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dados = JSON.parse(event.target.result);
        localStorage.setItem('nexomente_db', JSON.stringify(dados));
        setMostrarAviso(true);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        alert('Arquivo inválido');
      }
    };
    reader.readAsText(arquivo);
  };

  const limpaBase = () => {
    if (!confirm('Tem certeza? Isso vai apagar TODOS os dados.')) return;
    localStorage.removeItem('nexomente_db');
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Configurações</h1>
        <p className="text-text-secondary">Personalize o NexoMente</p>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          {tema === 'dark' ? <Moon size={20} /> : <Sun size={20} />} Aparência
        </h2>
        <div className="flex gap-2">
          <button onClick={() => { setTema('dark'); document.documentElement.classList.remove('light'); document.documentElement.classList.add('dark'); localStorage.setItem('nexomente_tema', 'dark'); }}
            className={`px-4 py-2 rounded-lg ${tema === 'dark' ? 'bg-accent-main' : 'bg-bg-tertiary border border-border-subtle'}`}>
            Escuro
          </button>
          <button onClick={() => { setTema('light'); document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); localStorage.setItem('nexomente_tema', 'light'); }}
            className={`px-4 py-2 rounded-lg ${tema === 'light' ? 'bg-accent-main' : 'bg-bg-tertiary border border-border-subtle'}`}>
            Claro
          </button>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Database size={20} /> Dados
        </h2>
        <div className="space-y-3">
          <button onClick={exportarDados} className="w-full flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-subtle rounded-lg hover:border-accent-main transition-colors">
            <Download size={18} /> Exportar Backup
          </button>
          <label className="w-full flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-subtle rounded-lg hover:border-accent-main transition-colors cursor-pointer">
            <Upload size={18} /> Importar Backup
            <input type="file" accept=".json" className="hidden" onChange={importarDados} />
          </label>
          <button onClick={limpaBase} className="w-full flex items-center gap-2 px-4 py-2 bg-danger/20 border border-danger rounded-lg hover:bg-danger/30 text-danger">
            <Trash2 size={18} /> Limpar Dados
          </button>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Info size={20} /> Sobre
        </h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p><strong className="text-text-primary">NexoMente</strong> v1.0.0</p>
          <p>Segundo cérebro offline com LLM local</p>
          <p className="text-text-muted">Desenvolvido com React + localStorage</p>
        </div>
      </div>

      {mostrarAviso && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-success rounded-lg">
          Dados importados! Recarregando...
        </div>
      )}
    </div>
  );
}
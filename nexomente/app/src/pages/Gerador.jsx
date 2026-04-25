import { useState, useRef, useMemo, useCallback } from 'react';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import {
  FileText, Upload, Search, Wand2, Loader2, FileDown
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportarParaTexto, exportarDOC, exportarParaJSON } from '../services/exportService';
import GerarIAModal from '../components/gerador/GerarIAModal';
import QuestaoCard from '../components/gerador/QuestaoCard';

export default function GeradorPage() {
  const { questoes, carregando, progresso, erro, bancas,
    processarTexto, gerarComIA, atualizarQuestao, deletarQuestao,
    criarFlashcards, getEstatisticas, getQuestoesFiltradas,
  } = useGerador();
  
  const { materias } = useMaterias();
  
  const [aba, setAba] = useState('upload');
  const [textoInput, setTextoInput] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroBanca, setFiltroBanca] = useState('');
  const [busca, setBusca] = useState('');
  const [showCriar, setShowCriar] = useState(false);
  const fileInputRef = useRef(null);
  
  const stats = useMemo(() => getEstatisticas(), [questoes]);
  const questoesFiltradas = useMemo(
    () => getQuestoesFiltradas({ materia: filtroMateria, banca: filtroBanca }),
    [questoes, filtroMateria, filtroBanca]
  );
  const questoesExibir = useMemo(() => {
    if (!busca) return questoesFiltradas;
    const b = busca.toLowerCase();
    return questoesFiltradas.filter(q =>
      q.pergunta.toLowerCase().includes(b) ||
      q.materia.toLowerCase().includes(b) ||
      (q.topico || '').toLowerCase().includes(b)
    );
  }, [questoesFiltradas, busca]);
  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTextoInput(event.target.result);
      setArquivoSelecionado(file);
    };
    reader.readAsText(file);
  };
  
  const handleProcessar = async () => {
    if (!textoInput.trim()) {
      toast.error('Cole um texto ou faça upload de um arquivo');
      return;
    }
    
    const tipo = arquivoSelecionado?.name?.endsWith('.md') ? 'md' : 'txt';
    const resultado = await processarTexto(textoInput, tipo);
    
    if (resultado.success) {
      toast.success(`${resultado.total} questões processadas!`);
      setTextoInput('');
      setArquivoSelecionado(null);
    } else {
      toast.error(resultado.erro);
    }
  };
  
  const handleGerarIA = async (config) => {
    if (!textoInput.trim()) {
      toast.error('Cole um texto para gerar questões');
      return;
    }
    
    const resultado = await gerarComIA(textoInput, config);
    
    if (resultado.success) {
      toast.success(`${resultado.total} questões geradas com IA!`);
      setTextoInput('');
    } else {
      toast.error(resultado.erro);
    }
  };

  const handleCriarFlashcard = (questaoId) => {
    const cardId = criarFlashcards(questaoId);
    if (cardId) toast.success('Flashcard criado!');
  };

  const handleExportar = (tipo) => {
    const questoesParaExportar = filtroMateria
      ? getQuestoesFiltradas({ materia: filtroMateria })
      : questoes;
    if (tipo === 'doc') {
      exportarDOC(questoesParaExportar, { titulo: 'Banco de Questões' });
      toast.success('DOC exportado!');
    } else if (tipo === 'txt') {
      const texto = exportarParaTexto(questoesParaExportar, { titulo: 'Banco de Questões' });
      const blob = new Blob([texto], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('TXT exportado!');
    } else if (tipo === 'json') {
      const json = exportarParaJSON(questoesParaExportar);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado!');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gerador de Questões</h1>
          <p className="text-sm text-text-muted">
            {stats.total} questões | {Object.keys(stats.porMateria).length} matérias | {Object.keys(stats.porBanca).length} bancas
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExportar('doc')}
            className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg hover:bg-bg-tertiary transition-colors flex items-center gap-2"
          >
            <FileDown size={18} /> DOC
          </button>
          <button 
            onClick={() => handleExportar('txt')}
            className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg hover:bg-bg-tertiary transition-colors flex items-center gap-2"
          >
            <FileText size={18} /> TXT
          </button>
        </div>
      </div>
      
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setAba('upload')}
          className={`px-4 py-2 ${aba === 'upload' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          Upload
        </button>
        <button
          onClick={() => setAba('banco')}
          className={`px-4 py-2 ${aba === 'banco' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          Banco ({questoes.length})
        </button>
        <button
          onClick={() => setAba('stats')}
          className={`px-4 py-2 ${aba === 'stats' ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
        >
          Estatísticas
        </button>
      </div>
      
      {aba === 'upload' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 p-8 border-2 border-dashed border-border-subtle rounded-xl hover:border-primary transition-colors flex flex-col items-center gap-2"
            >
              <Upload size={32} />
              <span>Arquivo (.txt, .md)</span>
              <span className="text-xs text-text-muted">Provas, apostilas, notas</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <button
              onClick={() => setShowCriar(true)}
              className="flex-1 p-8 border-2 border-dashed border-border-subtle rounded-xl hover:border-primary transition-colors flex flex-col items-center gap-2"
            >
              <Wand2 size={32} />
              <span>Gerar com IA</span>
              <span className="text-xs text-text-muted">Baseado em texto</span>
            </button>
          </div>
          
          <textarea
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            placeholder="Cole o conteúdo da prova ou texto aqui..."
            className="w-full h-64 p-4 bg-bg-secondary border border-border-subtle rounded-xl resize-none"
          />
          
          {carregando && (
            <div className="space-y-2">
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className="text-sm text-text-muted flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Processando... {progresso}%
              </p>
            </div>
          )}
          
          {erro && (
            <div className="p-4 bg-error/10 border border-error rounded-lg text-error">
              {erro}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleProcessar}
              disabled={carregando || !textoInput.trim()}
              className="px-6 py-3 bg-primary rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={20} /> Processar Texto
            </button>
          </div>
        </div>
      )}
      
      {aba === 'banco' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar questões..."
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg"
              />
            </div>
            <select
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="">Todas matérias</option>
              {Object.keys(stats.porMateria).map(m => (
                <option key={m} value={m}>{m} ({stats.porMateria[m]})</option>
              ))}
            </select>
            <select
              value={filtroBanca}
              onChange={(e) => setFiltroBanca(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="">Todas bancas</option>
              {Object.keys(stats.porBanca).map(b => (
                <option key={b} value={b}>{b} ({stats.porBanca[b]})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3">
            {questoesExibir.map((q) => (
              <QuestaoCard
                key={q.id}
                questao={q}
                onEditar={atualizarQuestao}
                onCriarFlashcard={handleCriarFlashcard}
                onDeletar={deletarQuestao}
              />
            ))}
            {questoesExibir.length === 0 && (
              <div className="text-center py-12 text-text-muted">Nenhuma questão encontrada</div>
            )}
          </div>
        </div>
      )}
      
      {aba === 'stats' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-bg-secondary border border-border-subtle rounded-xl">
            <h3 className="text-lg font-semibold mb-3">Por Matéria</h3>
            <div className="space-y-2">
              {Object.entries(stats.porMateria).map(([m, qtd]) => (
                <div key={m} className="flex justify-between">
                  <span>{m}</span>
                  <span className="font-medium">{qtd}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-bg-secondary border border-border-subtle rounded-xl">
            <h3 className="text-lg font-semibold mb-3">Por Banca</h3>
            <div className="space-y-2">
              {Object.entries(stats.porBanca).map(([b, qtd]) => (
                <div key={b} className="flex justify-between">
                  <span>{b}</span>
                  <span className="font-medium">{qtd}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-bg-secondary border border-border-subtle rounded-xl">
            <h3 className="text-lg font-semibold mb-3">Por Nível</h3>
            <div className="space-y-2">
              {Object.entries(stats.porNivel).map(([n, qtd]) => (
                <div key={n} className="flex justify-between">
                  <span className="capitalize">{n}</span>
                  <span className="font-medium">{qtd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {showCriar && (
          <GerarIAModal
            materias={materias}
            bancas={bancas}
            onClose={() => setShowCriar(false)}
            onGerar={handleGerarIA}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
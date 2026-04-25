import { useState, useCallback, useRef } from 'react';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import {
  FileText, Upload, Clipboard, Plus, Trash2, Download, Edit3, Save, X,
  BookOpen, Clock, Filter, Search, Wand2, Loader2, Check, Copy,
  ChevronDown, ChevronRight, File, Image, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportarParaTexto, exportarDOC, exportarParaJSON } from '../services/exportService';

export default function GeradorPage() {
  const {
    questoes,
    carregando,
    progresso,
    erro,
    bancas,
    processarTexto,
    gerarComIA,
    atualizarQuestao,
    deletarQuestao,
    criarFlashcards,
    criarTodosFlashcards,
    getEstatisticas,
    getQuestoesFiltradas,
    clearAll,
  } = useGerador();
  
  const { materias } = useMaterias();
  
  const [aba, setAba] = useState('upload');
  const [textoInput, setTextoInput] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroBanca, setFiltroBanca] = useState('');
  const [busca, setBusca] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editQuestao, setEditQuestao] = useState(null);
  const [showCriar, setShowCriar] = useState(false);
  const fileInputRef = useRef(null);
  
  const stats = getEstatisticas();
  const questoesFiltradas = getQuestoesFiltradas({
    materia: filtroMateria,
    banca: filtroBanca,
  });
  
  const questoesExibir = busca
    ? questoesFiltradas.filter(q => 
        q.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
        q.materia.toLowerCase().includes(busca.toLowerCase()) ||
        q.topico.toLowerCase().includes(busca.toLowerCase())
      )
    : questoesFiltradas;
  
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
  
  const handleEditar = (questao) => {
    setEditandoId(questao.id);
    setEditQuestao({ ...questao });
  };
  
  const handleSalvarEdicao = () => {
    if (!editQuestao) return;
    atualizarQuestao(editandoId, editQuestao);
    setEditandoId(null);
    setEditQuestao(null);
    toast.success('Questão atualizada!');
  };
  
  const handleCriarFlashcard = (questaoId) => {
    const cardId = criarFlashcards(questaoId);
    if (cardId) {
      toast.success('Flashcard criado!');
    }
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
  
  const handleExportarTodos = () => {
    if (!questoes.length) {
      toast.error('Nenhuma questão para exportar');
      return;
    }
    
    exportarDOC(questoes, { titulo: `Banco de Questões - ${questoes.length} questões` });
    toast.success('Banco completo exportado!');
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
            {questoesExibir.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-bg-secondary border border-border-subtle rounded-xl"
              >
                {editandoId === q.id ? (
                  <div className="space-y-3">
                    <input
                      value={editQuestao?.pergunta || ''}
                      onChange={(e) => setEditQuestao({ ...editQuestao, pergunta: e.target.value })}
                      className="w-full p-2 bg-bg-tertiary border border-border-subtle rounded-lg"
                    />
                    <div className="flex gap-2">
                      {editQuestao?.opcoes.map((o, i) => (
                        <div key={o.letra} className="flex-1 flex gap-2">
                          <span className="py-2">{o.letra})</span>
                          <input
                            value={o.texto}
                            onChange={(e) => {
                              const novascOpcoes = [...editQuestao.opcoes];
                              novascOpcoes[i] = { ...novascOpcoes[i], texto: e.target.value };
                              setEditQuestao({ ...editQuestao, opcoes: novascOpcoes });
                            }}
                            className="flex-1 p-2 bg-bg-tertiary border border-border-subtle rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSalvarEdicao}
                        className="px-4 py-2 bg-success rounded-lg flex items-center gap-2"
                      >
                        <Save size={16} /> Salvar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="px-4 py-2 bg-bg-tertiary rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-text-muted">{q.materia}</span>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{q.banca}</span>
                          <span className="text-xs text-text-muted">{q.ano}</span>
                        </div>
                        <p className="font-medium">{q.pergunta}</p>
                        <div className="mt-2 text-sm">
                          {q.opcoes.map(o => (
                            <span 
                              key={o.letra} 
                              className={`mr-3 ${o.correta ? 'text-success font-medium' : 'text-text-muted'}`}
                            >
                              {o.letra}) {o.texto.substring(0, 30)}...
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-sm text-success">
                          Gabarito: {q.resposta_correta}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditar(q)}
                          className="p-2 hover:bg-bg-tertiary rounded-lg"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleCriarFlashcard(q.id)}
                          className="p-2 hover:bg-bg-tertiary rounded-lg"
                          title="Criar flashcard"
                        >
                          <BookOpen size={16} />
                        </button>
                        <button
                          onClick={() => deletarQuestao(q.id)}
                          className="p-2 hover:bg-error/10 text-error rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            
            {questoesExibir.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                Nenhuma questão encontrada
              </div>
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

function GerarIAModal({ materias, bancas, onClose, onGerar }) {
  const [ texto, setTexto ] = useState('');
  const [ config, setConfig ] = useState({
    materia: '',
    topico: '',
    banca: 'FCC',
    quantidade: 5,
    nivel: 'medio',
  });
  
  const handleGerar = () => {
    onGerar(config);
    onClose();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-bg-primary p-6 rounded-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gerar com IA</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole o conteúdo para gerar questões..."
          className="w-full h-40 p-4 bg-bg-secondary border border-border-subtle rounded-lg resize-none mb-4"
        />
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Matéria</label>
            <select
              value={config.materia}
              onChange={(e) => setConfig({ ...config, materia: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="">Selecione...</option>
              {materias.map(m => (
                <option key={m.id} value={m.nome}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Banca</label>
            <select
              value={config.banca}
              onChange={(e) => setConfig({ ...config, banca: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              {bancas.map(b => (
                <option key={b.key} value={b.nome}>{b.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Quantidade</label>
            <input
              type="number"
              value={config.quantidade}
              onChange={(e) => setConfig({ ...config, quantidade: parseInt(e.target.value) || 5 })}
              min={1}
              max={20}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Nível</label>
            <select
              value={config.nivel}
              onChange={(e) => setConfig({ ...config, nivel: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="duas">Difícil</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleGerar}
            disabled={!texto.trim()}
            className="flex-1 px-4 py-3 bg-primary rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Wand2 size={20} /> Gerar Questões
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
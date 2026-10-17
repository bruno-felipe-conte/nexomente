import { useState, useRef, useMemo } from 'react';
import { useGerador } from '../hooks/useGerador';
import { useMaterias } from '../hooks/useMaterias';
import { extrairTextoDePDF } from '../lib/parser';
import { Settings, Upload, Wand2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportarParaTexto, exportarDOC, exportarParaJSON } from '../services/exportService';
import GeradorForjaTab from '../components/gerador/GeradorForjaTab';
import GeradorBancoTab from '../components/gerador/GeradorBancoTab';
import GeradorStatsTab from '../components/gerador/GeradorStatsTab';
import GeradorGestaoTab from '../components/gerador/GeradorGestaoTab';

const STEPS = [
  { id: 1, label: 'Entrada', icon: Upload },
  { id: 2, label: 'Configurar', icon: Settings },
  { id: 3, label: 'Gerar', icon: Wand2 },
  { id: 4, label: 'Revisar', icon: ClipboardList }
];

export default function GeradorPage() {
  const {
    questoes,
    progresso,
    bancas,
    addBanca,
    removeBanca,
    gerarComIA,
    atualizarQuestao,
    deletarQuestao,
    criarFlashcards,
    getEstatisticas,
    getQuestoesFiltradas,
  } = useGerador();

  const { materias, create: createMateria, remove: removeMateria } = useMaterias();

  const [aba, setAba] = useState('upload');
  const [step, setStep] = useState(1); // 1: Entrada, 2: Configurar, 3: Gerar, 4: Revisar
  const [textoInput, setTextoInput] = useState('');

  // Configurações da IA
  const [configIA, setConfigIA] = useState({
    quantidade: 5,
    tipo: 'multipla-escolha',
    dificuldade: 'médio',
    materia: '',
    topico: '',
    banca: 'Geral',
    provider: (typeof localStorage !== 'undefined' && localStorage.getItem('nexomente_ai_provider')) || 'embedded'
  });

  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroBanca, setFiltroBanca] = useState('');
  const [busca, setBusca] = useState('');
  const [novaBancaNome, setNovaBancaNome] = useState('');
  const [novaMateriaNome, setNovaMateriaNome] = useState('');
  const fileInputRef = useRef(null);

  const stats = useMemo(() => getEstatisticas(), [getEstatisticas]);
  const questoesFiltradas = useMemo(
    () => getQuestoesFiltradas({ materia: filtroMateria, banca: filtroBanca }),
    [getQuestoesFiltradas, filtroMateria, filtroBanca]
  );
  const questoesExibir = useMemo(() => {
    if (!busca) return questoesFiltradas;
    const b = busca.toLowerCase();
    return questoesFiltradas.filter(q =>
      q.pergunta.toLowerCase().includes(b) ||
      (q.materia || '').toLowerCase().includes(b) ||
      (q.topico || '').toLowerCase().includes(b)
    );
  }, [questoesFiltradas, busca]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (isPdf) {
      const loadingToast = toast.loading(`Extraindo texto de "${file.name}"...`);
      try {
        const buffer = await file.arrayBuffer();
        const textoPdf = await extrairTextoDePDF(buffer);
        toast.dismiss(loadingToast);
        if (!textoPdf || textoPdf.length < 30) {
          toast.error('Não foi possível extrair texto legível deste PDF (pode ser um PDF escaneado como imagem).');
          return;
        }
        setTextoInput(textoPdf);
        toast.success(`PDF carregado (${textoPdf.length.toLocaleString()} caracteres extraídos)!`);
        setStep(2);
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error(`Erro ao ler PDF: ${err.message}`);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setTextoInput(event.target.result);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleGerarIA = async () => {
    if (!textoInput.trim()) {
      toast.error('Cole um texto para gerar questões');
      return;
    }

    setStep(3);
    const resultado = await gerarComIA(textoInput, configIA);

    if (resultado.success) {
      if (resultado.total > 0) {
        toast.success(`${resultado.total} questões geradas com IA!`);
        setTextoInput('');
        setStep(4);
      } else {
        toast.error('Não conseguimos extrair questões válidas da resposta.');
        setStep(2);
      }
    } else {
      toast.error(resultado.erro || 'Erro na geração por IA.');
      setStep(2);
    }
  };

  const handleAddBanca = () => {
    if (!novaBancaNome.trim()) return;
    addBanca(novaBancaNome.trim());
    setNovaBancaNome('');
    toast.success('Banca adicionada!');
  };

  const handleAddMateria = () => {
    if (!novaMateriaNome.trim()) return;
    createMateria({ nome: novaMateriaNome.trim() });
    setNovaMateriaNome('');
    toast.success('Matéria adicionada!');
  };

  const handleCriarFlashcard = (questaoId, silent = false) => {
    const cardId = criarFlashcards(questaoId);
    if (cardId && !silent) toast.success('Flashcard criado!');
    return cardId;
  };

  const handleExportar = (tipo, incluirGabarito = true) => {
    const questoesParaExportar = questoesExibir.length > 0 ? questoesExibir : questoes;
    if (questoesParaExportar.length === 0) {
      toast.error('Nenhuma questão disponível para exportar.');
      return;
    }
    const sufixo = incluirGabarito ? 'com_gabarito' : 'caderno_aluno';

    if (tipo === 'doc') {
      exportarDOC(questoesParaExportar, {
        titulo: incluirGabarito ? 'Banco de Questões — Gabarito Comentado' : 'Caderno de Questões (Simulado)',
        incluirJustificativas: incluirGabarito
      });
      toast.success('DOC exportado!');
    } else if (tipo === 'txt') {
      const texto = exportarParaTexto(questoesParaExportar, {
        titulo: incluirGabarito ? 'Banco de Questões — Gabarito Comentado' : 'Caderno de Questões (Simulado)',
        incluirGabarito
      });
      const blob = new Blob([texto], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questoes_${sufixo}_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(incluirGabarito ? 'Gabarito exportado em TXT!' : 'Caderno do Aluno exportado em TXT!');
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
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-surface-base p-8">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-color-gerador/10 text-color-gerador text-[10px] font-black uppercase tracking-widest rounded-md border border-color-gerador/20">
              Módulo Inteligente
            </span>
          </div>
          <h1 className="font-display text-4xl font-black text-text-hi tracking-tight leading-none">
            Gerador de Questões
          </h1>
          <div className="flex items-center gap-6">
            <p className="text-xs text-text-lo font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-color-gerador shadow-[0_0_8px_var(--color-gerador)]" />
              {stats.total} questões no banco
            </p>
            <div className="h-4 w-[1px] bg-surface-border" />
            <p className="text-xs text-text-lo font-medium">
              {Object.keys(stats.porMateria).length} matérias ativas
            </p>
          </div>
        </div>

        {/* Indicador de Steps (Exibido apenas na aba Criação) */}
        {aba === 'upload' && (
          <div className="flex items-center gap-3 bg-surface-card/50 p-1.5 rounded-2xl border border-surface-border/50 backdrop-blur-sm">
            {STEPS.map((s, idx) => {
              const canNavigateBack = s.id < step && step !== 3;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canNavigateBack}
                    onClick={() => canNavigateBack && setStep(s.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                      ${step === s.id ? 'bg-color-gerador text-surface-base shadow-lg shadow-color-gerador/20' : canNavigateBack ? 'text-text-mid hover:text-text-hi cursor-pointer' : 'text-text-lo cursor-default'}
                    `}
                  >
                    <s.icon size={14} className={step === s.id ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <div className="w-2 h-[1px] bg-surface-border opacity-50" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-surface-border mb-8 shrink-0">
        {[
          { id: 'upload', label: 'Criação' },
          { id: 'banco', label: `Banco (${questoes.length})` },
          { id: 'stats', label: 'Desempenho' },
          { id: 'gestao', label: 'Organização' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`px-6 py-3 transition-all text-[10px] font-black uppercase tracking-[0.2em] border-b-2 relative
              ${aba === t.id ? 'border-color-gerador text-color-gerador' : 'border-transparent text-text-lo hover:text-text-mid'}`}
          >
            {t.label}
            {aba === t.id && (
              <motion.div layoutId="activeTabUnderline" transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-color-gerador" />
            )}
          </button>
        ))}
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 min-h-0">
        {aba === 'upload' && (
          <GeradorForjaTab
            step={step}
            setStep={setStep}
            textoInput={textoInput}
            setTextoInput={setTextoInput}
            fileInputRef={fileInputRef}
            configIA={configIA}
            setConfigIA={setConfigIA}
            materias={materias}
            bancas={bancas}
            handleGerarIA={handleGerarIA}
            progresso={progresso}
            questoes={questoes}
            atualizarQuestao={atualizarQuestao}
            handleCriarFlashcard={handleCriarFlashcard}
            deletarQuestao={deletarQuestao}
            setAba={setAba}
          />
        )}

        {aba === 'banco' && (
          <GeradorBancoTab
            busca={busca}
            setBusca={setBusca}
            filtroMateria={filtroMateria}
            setFiltroMateria={setFiltroMateria}
            filtroBanca={filtroBanca}
            setFiltroBanca={setFiltroBanca}
            materias={materias}
            bancas={bancas}
            handleExportar={handleExportar}
            questoesExibir={questoesExibir}
            atualizarQuestao={atualizarQuestao}
            handleCriarFlashcard={handleCriarFlashcard}
            deletarQuestao={deletarQuestao}
          />
        )}

        {aba === 'stats' && <GeradorStatsTab stats={stats} />}

        {aba === 'gestao' && (
          <GeradorGestaoTab
            novaMateriaNome={novaMateriaNome}
            setNovaMateriaNome={setNovaMateriaNome}
            handleAddMateria={handleAddMateria}
            materias={materias}
            removeMateria={removeMateria}
            novaBancaNome={novaBancaNome}
            setNovaBancaNome={setNovaBancaNome}
            handleAddBanca={handleAddBanca}
            bancas={bancas}
            removeBanca={removeBanca}
          />
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,application/pdf" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
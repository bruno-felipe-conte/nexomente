import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Tag, FileText, Layers, RefreshCw, Check, X, Zap } from 'lucide-react';
import { checkLMStudioStatus, generate, setModel, getModel, suggestTags, summarizeContent, generateFlashcards } from '../../lib/ai/lmStudioService';

export default function AIPanel({ nota, onTagsUpdate, onResumoUpdate, onFlashcardsCreate }) {
  const [status, setStatus] = useState('checking');
  const [loading, setLoading] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [modelo, setModelo] = useState(getModel());

  const verificarStatus = useCallback(async () => {
    setStatus('checking');
    const res = await checkLMStudioStatus();
    setStatus(res.status);
  }, []);

  const handleGerarTags = async () => {
    if (!nota) return;
    setLoading('tags');
    setError(null);
    const tags = await suggestTags(nota);
    if (tags.length > 0) {
      onTagsUpdate(tags);
      setResultado({ tipo: 'tags', valor: tags });
    } else {
      setError('Não foi possível gerar tags');
    }
    setLoading(null);
  };

  const handleResumir = async () => {
    if (!nota) return;
    setLoading('resumo');
    setError(null);
    const resumo = await summarizeContent(nota.conteudo || '');
    if (resumo) {
      onResumoUpdate(resumo);
      setResultado({ tipo: 'resumo', valor: resumo });
    } else {
      setError('Não foi possível gerar resumo');
    }
    setLoading(null);
  };

  const handleGerarCards = async () => {
    if (!nota) return;
    setLoading('cards');
    setError(null);
    const cards = await generateFlashcards(nota, 3);
    if (cards.length > 0) {
      onFlashcardsCreate(cards);
      setResultado({ tipo: 'cards', valor: cards });
    } else {
      setError('Não foi possível gerar flashcards');
    }
    setLoading(null);
  };

  const handleUsarModelo = async (modeloId) => {
    setModel(modeloId);
    setModelo(modeloId);
    await verificarStatus();
  };

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
      <div className="p-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent-light" />
          <span className="text-xs font-semibold text-text-primary">IA Local</span>
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'online' ? 'bg-success' : status === 'checking' ? 'bg-warning animate-pulse' : 'bg-text-muted/40'
            }`}
          />
          {status === 'online' && <span className="text-[10px] text-success">online</span>}
          {status === 'offline' && <span className="text-[10px] text-text-muted">offline</span>}
        </div>
        <button
          onClick={verificarStatus}
          className="p-1 text-text-muted hover:text-accent-main cursor-pointer"
          title="Verificar conexão"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {status === 'offline' && (
        <div className="p-3 text-xs text-text-muted">
          LM Studio não está rodando em{' '}
          <span className="text-accent-main">127.0.0.1:1234</span>. Inicie o app e selecione um modelo.
        </div>
      )}

      {status === 'online' && (
        <div className="p-3 space-y-2">
          <p className="text-[10px] text-text-muted truncate">
            Modelo: <span className="text-accent-light">{modelo}</span>
          </p>

          {error && (
            <div className="flex items-center gap-1 text-xs text-danger bg-danger/10 rounded px-2 py-1">
              <X size={10} /> {error}
            </div>
          )}

          {resultado && (
            <div className="text-xs text-success bg-success/10 rounded px-2 py-1 flex items-center gap-1">
              <Check size={10} />{' '}
              {resultado.tipo === 'tags' && `+${resultado.valor.length} tags`}
              {resultado.tipo === 'resumo' && 'Resumo gerado'}
              {resultado.tipo === 'cards' && `+${resultado.valor.length} flashcards`}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={handleGerarTags}
              disabled={!nota || loading}
              className="flex flex-col items-center gap-0.5 px-2 py-2 bg-bg-tertiary rounded text-xs hover:border-accent-main border border-border-subtle disabled:opacity-40 cursor-pointer"
            >
              {loading === 'tags' ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
              <span className="text-text-muted">Tags</span>
            </button>

            <button
              onClick={handleResumir}
              disabled={!nota || loading}
              className="flex flex-col items-center gap-0.5 px-2 py-2 bg-bg-tertiary rounded text-xs hover:border-accent-main border border-border-subtle disabled:opacity-40 cursor-pointer"
            >
              {loading === 'resumo' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              <span className="text-text-muted">Resumo</span>
            </button>

            <button
              onClick={handleGerarCards}
              disabled={!nota || loading}
              className="flex flex-col items-center gap-0.5 px-2 py-2 bg-bg-tertiary rounded text-xs hover:border-accent-main border border-border-subtle disabled:opacity-40 cursor-pointer"
            >
              {loading === 'cards' ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
              <span className="text-text-muted">Cards</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
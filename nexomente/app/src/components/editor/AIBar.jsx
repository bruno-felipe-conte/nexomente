import { useState } from 'react';
import { Tag, FileText, Layers, MoreHorizontal, Loader2, WifiOff } from 'lucide-react';
import { useAIModel } from '../../hooks/useAIModel';
import { checkLMStudioStatus, getModel } from '../../lib/ai/lmStudioService';

export default function AIBar({ nota, onTagsOpen, onResumoOpen, onCardsOpen, onChatOpen }) {
  const { status, modeloAtual } = useAIModel();
  const [showMore, setShowMore] = useState(false);

  if (!nota) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle bg-bg-secondary/40">
      <div className="flex items-center gap-1">
        <button
          onClick={onTagsOpen}
          disabled={status === 'offline'}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'LM Studio offline' : 'Gerar tags com IA'}
        >
          <Tag size={12} />
          Tag#
        </button>

        <button
          onClick={onResumoOpen}
          disabled={status === 'offline'}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'LM Studio offline' : 'Gerar resumo com IA'}
        >
          <FileText size={12} />
          Resumir
        </button>

        <button
          onClick={onCardsOpen}
          disabled={status === 'offline'}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'LM Studio offline' : 'Gerar flashcards com IA'}
        >
          <Layers size={12} />
          Cards
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main transition-colors cursor-pointer"
            title="Mais ações"
          >
            <MoreHorizontal size={12} />
          </button>

          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                <button
                  onClick={() => { onChatOpen?.(); setShowMore(false); }}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-bg-tertiary cursor-pointer"
                >
                  Chat sobre esta nota
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {status === 'offline' ? (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <WifiOff size={10} />
            <span>IA offline</span>
          </div>
        ) : status === 'checking' ? (
          <Loader2 size={10} className="animate-spin text-text-muted" />
        ) : (
          <div
            className="text-[10px] text-text-muted truncate max-w-[120px]"
            title={modeloAtual}
          >
            {modeloAtual}
          </div>
        )}
      </div>
    </div>
  );
}
import { Tag, FileText, Layers, MessageSquare, Loader2, WifiOff } from 'lucide-react';
import { useAIModel } from '../../hooks/useAIModel';
import PropTypes from 'prop-types';

export default function AIBar({
  nota,
  onTagsOpen,
  onResumoOpen,
  onCardsOpen,
  onChatOpen,
  loadingTags = false,
  loadingResumo = false,
  loadingCards = false,
}) {
  const { status, modeloAtual } = useAIModel();

  if (!nota) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle bg-bg-secondary/40">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onTagsOpen}
          disabled={status === 'offline' || loadingTags}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'IA offline' : 'Gerar tags com IA'}
        >
          {loadingTags ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
          Tag#
        </button>

        <button
          onClick={onResumoOpen}
          disabled={status === 'offline' || loadingResumo}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'IA offline' : 'Gerar resumo com IA'}
        >
          {loadingResumo ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
          Resumir
        </button>

        <button
          onClick={onCardsOpen}
          disabled={status === 'offline' || loadingCards}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={status === 'offline' ? 'IA offline' : 'Gerar flashcards com IA'}
        >
          {loadingCards ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
          Cards
        </button>

        <button
          onClick={() => onChatOpen?.()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main hover:text-accent-main transition-colors cursor-pointer"
          title="Abrir Chat Neural sobre esta nota"
        >
          <MessageSquare size={12} />
          Chat IA
        </button>
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
            className="text-[10px] text-text-muted truncate max-w-[160px]"
            title={modeloAtual}
          >
            {modeloAtual}
          </div>
        )}
      </div>
    </div>
  );
}
AIBar.propTypes = {
  nota: PropTypes.any,
  onTagsOpen: PropTypes.func,
  onResumoOpen: PropTypes.func,
  onCardsOpen: PropTypes.func,
  onChatOpen: PropTypes.func,
  loadingTags: PropTypes.bool,
  loadingResumo: PropTypes.bool,
  loadingCards: PropTypes.bool,
};

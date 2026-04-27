/**
 * ChatMessage — bubble individual de mensagem no chat IA.
 * Extraído de AIChat.jsx (Tarefa 4.1).
 * Memoizado (Tarefa 5.4+5.5): evita re-render de mensagens antigas quando nova chega.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Plus } from 'lucide-react';
import PropTypes from 'prop-types';

const ChatMessage = memo(function ChatMessage({ msg, idx, copiadoIdx, onCopiar, onInserir }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
        isUser
          ? 'bg-accent-main/20 border border-accent-main/30 text-text-primary'
          : 'bg-bg-secondary border border-border-subtle text-text-primary'
      }`}>
        {msg.isError ? (
          <div className="flex items-center gap-2 mt-1 py-1 px-3 bg-danger/10 border border-danger/20 rounded-lg">
            <span className="text-[9px] font-black bg-danger text-white px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">
              {msg.errorCode || 'ERR-SYS'}
            </span>
            <p className="text-[10px] text-danger/90 font-bold">
              {msg.texto}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
            {isUser && msg.ts && (
              <span className="text-[9px] text-text-muted mt-1 self-end opacity-70">
                {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
        {!isUser && !msg.isError && (
          <div className="flex gap-1 mt-2 pt-2 border-t border-border-subtle">
            <button
              onClick={() => onCopiar(msg.texto, idx)}
              className="px-2 py-1 bg-bg-tertiary rounded text-[10px] hover:border-accent-main cursor-pointer flex items-center gap-1"
            >
              <Copy size={10} />
              {copiadoIdx === idx ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={() => onInserir(msg.texto)}
              className="px-2 py-1 bg-bg-tertiary rounded text-[10px] hover:border-accent-main cursor-pointer flex items-center gap-1"
            >
              <Plus size={10} /> Inserir
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});


ChatMessage.propTypes = {
  msg: PropTypes.any,
  idx: PropTypes.any,
  copiadoIdx: PropTypes.any,
  onCopiar: PropTypes.func,
  onInserir: PropTypes.func,
};

export default ChatMessage;

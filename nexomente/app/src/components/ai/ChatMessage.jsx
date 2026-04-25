/**
 * ChatMessage — bubble individual de mensagem no chat IA.
 * Extraído de AIChat.jsx (Tarefa 4.1).
 * Memoizado (Tarefa 5.4+5.5): evita re-render de mensagens antigas quando nova chega.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Plus } from 'lucide-react';

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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
        {!isUser && (
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

export default ChatMessage;

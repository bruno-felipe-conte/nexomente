/**
 * ChatMessage — bubble individual de mensagem no chat IA.
 * Extraído de AIChat.jsx (Tarefa 4.1).
 * Memoizado (Tarefa 5.4+5.5): evita re-render de mensagens antigas quando nova chega.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Plus, Bot } from 'lucide-react';
import PropTypes from 'prop-types';

const ChatMessage = memo(function ChatMessage({ msg, idx, copiadoIdx, onCopiar, onInserir }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[92%] md:max-w-[85%] flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-lg bg-accent-main/10 flex items-center justify-center shrink-0 border border-accent-main/20 mt-1">
            <Bot size={14} className="text-accent-main" />
          </div>
        )}
        
        <div className={`px-3 md:px-5 py-3 md:py-4 ${
          isUser
            ? 'bg-white/5 text-text-hi rounded-2xl shadow-sm'
            : 'border border-white/5 text-text-primary rounded-2xl bg-bg-secondary/20'
        }`}>
          {msg.isError ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 py-2 px-3 bg-danger/10 border border-danger/20 rounded-xl">
              <span className="text-[9px] font-black bg-danger text-white px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
                {msg.errorCode || 'ERR-SYS'}
              </span>
              <p className="text-[11px] text-danger/90 font-bold leading-snug">
                {msg.texto}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">{msg.texto}</p>
              {isUser && msg.ts && (
                <span className="text-[9px] text-text-lo/20 mt-1 self-end font-mono">
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span >
              )}
            </div>
          )}
          
          {!isUser && !msg.isError && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
              <button
                onClick={() => onCopiar(msg.texto, idx)}
                className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-text-lo hover:text-text-hi transition-all cursor-pointer flex items-center gap-2"
              >
                <Copy size={12} />
                {copiadoIdx === idx ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => onInserir(msg.texto)}
                className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-text-lo hover:text-text-hi transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus size={12} /> Inserir
              </button>
            </div>
          )}
        </div>
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

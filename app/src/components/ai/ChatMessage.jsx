/**
 * ChatMessage — bubble individual de mensagem no chat IA.
 * Extraído de AIChat.jsx (Tarefa 4.1).
 * Memoizado (Tarefa 5.4+5.5): evita re-render de mensagens antigas quando nova chega.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Copy, Check, Plus, Bot, Terminal } from 'lucide-react';
import PropTypes from 'prop-types';

function CodeBlock({ code, language }) {
  const [copiado, setCopiado] = useState(false);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-black/40 font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5 text-[11px] text-text-lo/60">
        <div className="flex items-center gap-1.5 font-medium">
          <Terminal size={12} className="text-accent-main" />
          <span>{language || 'código'}</span>
        </div>
        <button
          onClick={copiarCodigo}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-text-lo hover:text-text-hi hover:bg-white/5 transition-all cursor-pointer"
        >
          {copiado ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-emerald-300 leading-relaxed custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}

CodeBlock.propTypes = {
  code: PropTypes.string.isRequired,
  language: PropTypes.string,
};

function renderMessageContent(texto) {
  if (!texto) return null;
  // Divide o texto por blocos de código ```linguagem\nconteúdo```
  const parts = texto.split(/(```[\w-]*\n[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/^```([\w-]*)\n([\s\S]*?)```$/);
      if (match) {
        const [, language, code] = match;
        return <CodeBlock key={index} language={language} code={code.replace(/\n$/, '')} />;
      }
    }
    return (
      <span key={index} className="whitespace-pre-wrap leading-relaxed">
        {part}
      </span>
    );
  });
}

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
              <div className="text-[13px] font-medium">
                {renderMessageContent(msg.texto)}
              </div>
              {isUser && msg.ts && (
                <span className="text-[9px] text-text-lo/20 mt-1 self-end font-mono">
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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

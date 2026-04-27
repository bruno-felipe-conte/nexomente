/**
 * Componente NotaLista — painel lateral com busca e lista de notas.
 * Reorganizado para o centro da hierarquia (Tarefa 5.2).
 */
import { useState, useCallback } from 'react';
import { FileText, Plus, Search, BookOpen, Lightbulb } from 'lucide-react';
import PropTypes from 'prop-types';
import Input from '../ui/Input';

export default function NotaLista({ notas, notaSelecionada, busca, onBuscaChange, onSelect, onCriar }) {
  const [focoIdx, setFocoIdx] = useState(-1);
  const [containerRef, setContainerRef] = useState(null);

  const notaBtns = containerRef?.querySelectorAll('[data-nota-btn]');

  const focusNota = useCallback((delta) => {
    if (!notaBtns || notaBtns.length === 0) return;
    let next = focoIdx + delta;
    if (next < 0) next = notaBtns.length - 1;
    if (next >= notaBtns.length) next = 0;
    setFocoIdx(next);
    notaBtns[next]?.focus();
  }, [focoIdx, notaBtns]);

  const handleNotaKeyDown = useCallback((e, nota) => {
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      focusNota(-1);
    } else if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      focusNota(1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(nota);
    }
  }, [focusNota, onSelect]);

  return (
    <div className="flex flex-col h-full bg-bg-primary/5" ref={setContainerRef}>
      {/* Cabeçalho: Busca + Nova Nota LowFi */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="bg-bg-secondary/30 !border-white/5 !rounded-lg"
            />
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onCriar('livro')}
              className="p-1.5 text-text-lo hover:text-accent-main transition-colors"
              title="Filtrar Livros"
            >
              <BookOpen size={14} />
            </button>
            <button 
              onClick={() => onCriar('ideia')}
              className="p-1.5 text-text-lo hover:text-accent-main transition-colors"
              title="Filtrar Ideias"
            >
              <Lightbulb size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={() => onCriar('nota')}
          className="w-full py-3 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-text-lo hover:text-accent-main hover:border-accent-main/50 transition-all group cursor-pointer"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform duration-500" />
          Nova Nota
        </button>
      </div>

      {/* Lista de Notas — Layout Minimalista (1px Dividers) */}
      <div className="flex-1 overflow-auto scrollbar-none">
        {notas.length === 0 ? (
          <div className="p-10 text-center opacity-20">
            <FileText size={32} className="mx-auto mb-3" />
            <p className="text-[10px] uppercase font-bold tracking-widest">Vazio</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {Object.entries(
              (notas || []).reduce((acc, nota) => {
                const date = nota?.criado_em ? new Date(nota.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem data';
                if (!acc[date]) acc[date] = [];
                acc[date].push(nota);
                return acc;
              }, {})
            ).map(([date, group]) => (
              <div key={date}>
                <div className="px-5 py-1.5 bg-bg-secondary/30 text-[9px] font-black text-text-lo/40 uppercase tracking-[0.2em] border-b border-white/5">
                  {date}
                </div>
                <div className="flex flex-col">
                  {group.map((nota) => {
                    const preview = nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 60);
                    const isSelected = notaSelecionada?.id === nota.id;
                    const time = nota.criado_em ? new Date(nota.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    return (
                      <button
                        key={nota.id}
                        data-nota-btn
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => onSelect(nota)}
                        onKeyDown={(e) => handleNotaKeyDown(e, nota)}
                        className={`w-full p-5 text-left border-b border-white/5 transition-all cursor-pointer group ${
                          isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`font-bold text-[13px] truncate ${isSelected ? 'text-accent-main' : 'text-text-hi'}`}>
                              {nota.titulo || 'Sem título'}
                            </p>
                            <span className="text-[9px] text-text-lo/30 font-mono flex-shrink-0">{time}</span>
                          </div>
                          {preview && (
                            <p className="text-[11px] text-text-lo/40 truncate leading-relaxed">
                              {preview}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

NotaLista.propTypes = {
  notas: PropTypes.array,
  notaSelecionada: PropTypes.object,
  busca: PropTypes.string,
  onBuscaChange: PropTypes.func,
  onSelect: PropTypes.func,
  onCriar: PropTypes.func,
};

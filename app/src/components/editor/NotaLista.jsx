/**
 * Componente NotaLista — painel lateral com busca e lista de notas.
 * Extraído de Notas.jsx (Tarefa 4.1) para respeitar SRP.
 * Suporta navegação por teclado (ArrowUp/ArrowDown).
 *
 * @param {object[]} notas - Lista de notas filtradas
 * @param {object|null} notaSelecionada - Nota atualmente selecionada
 * @param {string} busca - Texto de busca atual
 * @param {function} onBuscaChange - Callback ao alterar busca
 * @param {function} onSelect - Callback ao selecionar nota
 * @param {function} onCriar - Callback ao criar nota (recebe tipo)
 */
import { useState, useCallback, useRef } from 'react';
import { FileText, BookOpen, Lightbulb, Plus, Search } from 'lucide-react';
import PropTypes from 'prop-types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const tipoIcons = {
  nota: FileText,
  livro: BookOpen,
  ideia: Lightbulb,
};

const tipoCores = {
  nota: '#6C63FF',
  livro: '#8B5CF6',
  ideia: '#EC4899',
  diario: '#10B981',
  biblia: '#F59E0B',
  estudo: '#3B82F6',
  projeto: '#3B82F6',
  referencia: '#9CA3AF',
};

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
    <div className="flex flex-col h-full" ref={setContainerRef} onKeyDown={(e) => {
      if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); focusNota(-1); }
      else if (['ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); focusNota(1); }
    }}>
      {/* Busca + botões de criação */}
      <div className="p-4 border-b border-border-subtle bg-bg-primary/30">
        <div className="mb-4">
          <Input
            icon={Search}
            placeholder="Buscar notas..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            clearable={true}
            onClear={() => onBuscaChange('')}
            aria-label="Buscar notas"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onCriar('nota')}
            className="flex-1"
          >
            <Plus size={14} className="mr-1.5" aria-hidden="true" /> Nota
          </Button>
          <Button
            variant="secondary"
            size="icon-only"
            onClick={() => onCriar('livro')}
            title="Novo Livro"
          >
            <BookOpen size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon-only"
            onClick={() => onCriar('ideia')}
            title="Nova Ideia"
          >
            <Lightbulb size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Lista com navegação por setas */}
      <div
        className="flex-1 overflow-auto"
        role="listbox"
        aria-label="Lista de notas"
      >
        {notas.length === 0 ? (
          <div className="p-4 text-center text-text-muted">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nenhuma nota</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {Object.entries(
              notas.reduce((acc, nota) => {
                const date = nota.criado_em ? new Date(nota.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sem data';
                if (!acc[date]) acc[date] = [];
                acc[date].push(nota);
                return acc;
              }, {})
            ).map(([date, group]) => (
              <div key={date}>
                <div className="px-4 py-1.5 bg-bg-secondary text-[10px] font-bold text-text-lo uppercase tracking-wider sticky top-0 z-10 border-b border-border-subtle/50">
                  {date}
                </div>
                <div className="divide-y divide-border-subtle/30">
                  {group.map((nota) => {
                    const Icon = tipoIcons[nota.tipo] || FileText;
                    const cor = tipoCores[nota.tipo] || '#6C63FF';
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
                        role="option"
                        aria-selected={isSelected}
                        className={`w-full p-3 text-left hover:bg-bg-tertiary transition-colors cursor-pointer group ${
                          isSelected ? 'bg-bg-tertiary border-l-2' : ''
                        }`}
                        style={{ borderLeftColor: isSelected ? cor : 'transparent' }}
                      >
                        <div className="flex items-start gap-2">
                          <Icon size={14} style={{ color: cor }} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm text-text-primary truncate">{nota.titulo}</p>
                              <span className="text-[10px] text-text-lo font-mono flex-shrink-0">{time}</span>
                            </div>
                            {preview && (
                              <p className="text-xs text-text-muted truncate mt-0.5">{preview}...</p>
                            )}
                            {nota.tags?.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap" aria-label="Tags">
                                {nota.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="notas" type="pill">
                                    #{tag}
                                  </Badge>
                                ))}
                                {nota.tags.length > 3 && (
                                  <Badge variant="gray" type="pill">+{nota.tags.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </div>
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
  notas: PropTypes.any,
  notaSelecionada: PropTypes.any,
  busca: PropTypes.any,
  onBuscaChange: PropTypes.func,
  onSelect: PropTypes.func,
  onCriar: PropTypes.func,
};

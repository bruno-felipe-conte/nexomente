/**
 * Componente NotaLista — painel lateral em 2 colunas com busca, seletor de pastas estilo LLM e lista de notas.
 */
import { useState, useCallback } from 'react';
import { FileText, Plus, Search, UploadCloud } from 'lucide-react';
import PropTypes from 'prop-types';
import Input from '../ui/Input';
import CategoriaSelector, { CATEGORIAS_VAULT } from './CategoriaSelector';

export default function NotaLista({
  notas = [],
  todasNotas = [],
  notaSelecionada,
  busca,
  onBuscaChange,
  onSelect,
  onCriar,
  onImport,
  categoriaAtiva = 'pasta_raiz',
  onSelectCategoria
}) {
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

  const catAtualObj = CATEGORIAS_VAULT.find(c => c.id === categoriaAtiva) || CATEGORIAS_VAULT[0];

  return (
    <div className="flex flex-col h-full bg-bg-secondary/10" ref={setContainerRef}>
      {/* Cabeçalho da Lista: Busca + Ação de Criação + Seletor de Categoria Estilo LLM */}
      <div className="p-3.5 flex flex-col gap-2.5 border-b border-white/5 bg-bg-primary/20">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Buscar notas..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="bg-bg-secondary/50 !border-white/5 !rounded-xl text-xs py-2"
            />
          </div>
          {onImport && (
            <button
              onClick={onImport}
              title="Importar arquivos Markdown (.md) ou Flashcards"
              className="p-2.5 rounded-xl bg-bg-secondary/70 border border-white/10 text-text-hi hover:border-accent-main/60 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <UploadCloud size={16} />
            </button>
          )}
          <button
            onClick={() => onCriar(categoriaAtiva)}
            title={`Criar nova nota em "${catAtualObj.nome}"`}
            className="p-2.5 rounded-xl bg-accent-main text-white hover:bg-accent-main/80 transition-all shrink-0 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Seletor Dropdown de Categorias */}
        {onSelectCategoria && (
          <CategoriaSelector
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={onSelectCategoria}
            notas={notas}
            todasNotas={todasNotas}
          />
        )}
      </div>

      {/* Lista de Notas */}
      <div className="flex-1 overflow-auto scrollbar-none">
        {notas.length === 0 ? (
          <div className="p-10 text-center opacity-30 space-y-2">
            <FileText size={32} className="mx-auto opacity-50" />
            <p className="text-xs font-semibold">Nenhuma nota encontrada</p>
            <p className="text-[10px] text-text-lo/40">
              {categoriaAtiva !== 'pasta_raiz'
                ? `Crie uma nova nota em "${catAtualObj.nome}"`
                : 'Crie uma nova nota ou altere a busca'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {Object.entries(
              (notas || []).reduce((acc, nota) => {
                const date = nota?.criado_em
                  ? new Date(nota.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : 'Sem data';
                if (!acc[date]) acc[date] = [];
                acc[date].push(nota);
                return acc;
              }, {})
            ).map(([date, group]) => (
              <div key={date}>
                <div className="px-4 py-1.5 bg-bg-secondary/40 text-[9px] font-bold text-text-lo/40 uppercase tracking-[0.15em] border-b border-white/5">
                  {date}
                </div>
                <div className="flex flex-col">
                  {group.map((nota) => {
                    const preview = nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 75);
                    const isSelected = notaSelecionada?.id === nota.id;
                    const time = nota.criado_em
                      ? new Date(nota.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={nota.id}
                        data-nota-btn
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => onSelect(nota)}
                        onKeyDown={(e) => handleNotaKeyDown(e, nota)}
                        className={`w-full p-4 text-left border-b border-white/5 transition-all cursor-pointer group ${
                          isSelected ? 'bg-white/5 border-l-2 border-l-accent-main' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold truncate max-w-[200px] ${
                              isSelected ? 'text-accent-main' : 'text-text-hi group-hover:text-accent-main'
                            }`}
                          >
                            {nota.titulo || 'Sem título'}
                          </span>
                          <span className="text-[9px] font-mono text-text-lo/30 shrink-0">{time}</span>
                        </div>

                        {preview && (
                          <p className="text-[11px] text-text-lo/50 line-clamp-2 leading-relaxed mb-2">
                            {preview}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {nota.tipo && nota.tipo !== 'nota' && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-text-lo/60 border border-white/5">
                              {nota.tipo}
                            </span>
                          )}
                          {(nota.tags || []).slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-main/10 text-accent-main border border-accent-main/20">
                              #{tag}
                            </span>
                          ))}
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
  notas: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    titulo: PropTypes.string,
    conteudo: PropTypes.string,
    tipo: PropTypes.string,
    tags: PropTypes.array,
    atualizado_em: PropTypes.string,
  })),
  todasNotas: PropTypes.array,
  notaSelecionada: PropTypes.shape({
    id: PropTypes.string,
    titulo: PropTypes.string,
  }),
  busca: PropTypes.string,
  onBuscaChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onCriar: PropTypes.func.isRequired,
  categoriaAtiva: PropTypes.string,
  onSelectCategoria: PropTypes.func.isRequired,
};

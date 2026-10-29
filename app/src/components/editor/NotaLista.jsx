/**
 * Componente NotaLista — painel lateral do Vault em vidro com busca, seletor de pastas e cards de notas estruturados.
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
    <div className="flex flex-col h-full select-none" ref={setContainerRef}>
      {/* Cabeçalho da Lista: Busca + Ação de Criação + Seletor de Categoria */}
      <div className="p-3 pb-3.5 flex flex-col gap-2.5 border-b border-nx-border/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Buscar no Vault..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="bg-nx-surface/80 !border-nx-border !rounded-xl text-xs py-2 text-nx-bright placeholder:text-nx-subtle focus:bg-nx-surface"
            />
          </div>
          {onImport && (
            <button
              onClick={onImport}
              title="Importar arquivos Markdown (.md) ou Flashcards"
              className="p-2.5 rounded-xl bg-nx-surface/90 border border-nx-border text-nx-dim hover:text-nx-bright hover:border-nx-primary transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <UploadCloud size={15} />
            </button>
          )}
          <button
            onClick={() => onCriar(categoriaAtiva)}
            title={`Criar nova nota em "${catAtualObj.nome}" (Ctrl+Shift+N)`}
            className="p-2.5 rounded-xl nx-btn-primary text-white shrink-0 cursor-pointer shadow-xs"
          >
            <Plus size={15} />
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

      {/* Lista de Cards de Notas */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 pt-3.5 space-y-3">
        {notas.length === 0 ? (
          <div className="p-8 text-center opacity-40 space-y-2.5 my-auto">
            <FileText size={36} className="mx-auto text-nx-primary opacity-60" />
            <p className="text-xs font-semibold text-nx-bright">Nenhuma nota encontrada</p>
            <p className="text-[11px] text-nx-dim">
              {categoriaAtiva !== 'pasta_raiz'
                ? `Crie uma nova nota em "${catAtualObj.nome}" usando o botão + acima.`
                : 'Crie uma nova nota usando o botão + acima ou ajuste sua busca.'}
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
              <div key={date} className="mb-2">
                <div className="px-2 py-1 mb-1.5 text-[9.5px] font-mono font-bold text-nx-dim uppercase tracking-[0.14em]">
                  {date}
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.map((nota) => {
                    const preview = nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 95);
                    const isSelected = notaSelecionada?.id === nota.id;
                    const time = nota.criado_em
                      ? new Date(nota.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <button
                        key={nota.id}
                        data-nota-btn
                        tabIndex={isSelected ? 0 : -1}
                        aria-selected={isSelected}
                        onClick={() => onSelect(nota)}
                        onKeyDown={(e) => handleNotaKeyDown(e, nota)}
                        className={`nx-note-card ${isSelected ? 'is-active' : ''}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="nx-note-card__title truncate flex-1">
                            {nota.titulo || 'Sem título'}
                          </h4>
                          {time && (
                            <span className="nx-note-card__time shrink-0">
                              {time}
                            </span>
                          )}
                        </div>

                        {preview && (
                          <p className="nx-note-card__preview">
                            {preview}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {nota.tipo && nota.tipo !== 'nota' && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-nx-depth text-nx-dim border border-nx-border">
                              {nota.tipo}
                            </span>
                          )}
                          {(nota.tags || []).slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-nx-overlay text-nx-primary border border-nx-primary/30"
                            >
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
    criado_em: PropTypes.string,
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
  onImport: PropTypes.func,
  categoriaAtiva: PropTypes.string,
  onSelectCategoria: PropTypes.func,
};

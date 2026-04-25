/**
 * Componente NotaLista — painel lateral com busca e lista de notas.
 * Extraído de Notas.jsx (Tarefa 4.1) para respeitar SRP.
 *
 * @param {object[]} notas - Lista de notas filtradas
 * @param {object|null} notaSelecionada - Nota atualmente selecionada
 * @param {string} busca - Texto de busca atual
 * @param {function} onBuscaChange - Callback ao alterar busca
 * @param {function} onSelect - Callback ao selecionar nota
 * @param {function} onCriar - Callback ao criar nota (recebe tipo)
 */
import { FileText, BookOpen, Lightbulb, Search, Plus } from 'lucide-react';

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
  return (
    <div className="flex flex-col h-full">
      {/* Busca + botões de criação */}
      <div className="p-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-2 py-1 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onCriar('nota')}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent-main rounded text-xs font-medium hover:bg-accent-main/90 transition-colors cursor-pointer"
          >
            <Plus size={12} /> Nota
          </button>
          <button
            onClick={() => onCriar('livro')}
            className="px-2 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main transition-colors cursor-pointer"
            title="Novo Livro"
          >
            <BookOpen size={12} />
          </button>
          <button
            onClick={() => onCriar('ideia')}
            className="px-2 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main transition-colors cursor-pointer"
            title="Nova Ideia"
          >
            <Lightbulb size={12} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {notas.length === 0 ? (
          <div className="p-4 text-center text-text-muted">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nenhuma nota</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {notas.map(nota => {
              const Icon = tipoIcons[nota.tipo] || FileText;
              const cor = tipoCores[nota.tipo] || '#6C63FF';
              const preview = nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 60);
              return (
                <button
                  key={nota.id}
                  onClick={() => onSelect(nota)}
                  className={`w-full p-3 text-left hover:bg-bg-tertiary transition-colors cursor-pointer ${
                    notaSelecionada?.id === nota.id ? 'bg-bg-tertiary border-l-2' : ''
                  }`}
                  style={{ borderLeftColor: notaSelecionada?.id === nota.id ? cor : 'transparent' }}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={14} style={{ color: cor }} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">{nota.titulo}</p>
                      {preview && (
                        <p className="text-xs text-text-muted truncate mt-0.5">{preview}...</p>
                      )}
                      {nota.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {nota.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-bg-tertiary text-text-muted">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

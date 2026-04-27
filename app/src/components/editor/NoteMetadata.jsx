import { FileText, BookOpen, Lightbulb, Calendar, Bookmark, BookMarked, Clock, Star, Hash, User, X, Sigma } from 'lucide-react';
import PropTypes from 'prop-types';

const tipos = [
  { id: 'nota', label: 'Nota', icon: FileText, cor: '#6C63FF' },
  { id: 'livro', label: 'Livro', icon: BookOpen, cor: '#8B5CF6' },
  { id: 'projeto', label: 'Projeto', icon: BookMarked, cor: '#3B82F6' },
  { id: 'ideia', label: 'Ideia', icon: Lightbulb, cor: '#EC4899' },
  { id: 'diario', label: 'Diário', icon: Calendar, cor: '#10B981' },
  { id: 'estudo', label: 'Estudo', icon: BookMarked, cor: '#F59E0B' },
  { id: 'biblia', label: 'Bíblia', icon: Bookmark, cor: '#F59E0B' },
  { id: 'referencia', label: 'Referência', icon: Hash, cor: '#9CA3AF' },
];

const statusLista = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'processando', label: 'Processando' },
  { id: 'finalizado', label: 'Finalizado' },
  { id: 'arquivado', label: 'Arquivado' },
];

export default function NoteMetadata({ nota, onUpdate, onClose, editor }) {
  if (!nota) return null;

  const tipoAtual = tipos.find(t => t.id === nota.tipo) || tipos[0];
  const TipoIcon = tipoAtual.icon;

  return (
    <div className="w-64 border-l border-border-subtle flex flex-col bg-bg-secondary overflow-auto">
      <div className="p-3 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Metadados</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div>
          <label className="text-xs text-text-muted mb-1 block">Tipo</label>
          <div className="grid grid-cols-2 gap-1">
            {tipos.map(tipo => {
              const Icon = tipo.icon;
              const ativo = nota.tipo === tipo.id;
              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => onUpdate({ tipo: tipo.id })}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    ativo
                      ? 'bg-accent-main/20 text-accent-main border border-accent-main/40'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <Icon size={12} style={{ color: ativo ? tipo.cor : 'inherit' }} />
                  {tipo.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Status</label>
          <select
            value={nota.status || 'rascunho'}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="w-full bg-bg-tertiary border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary cursor-pointer"
          >
            {statusLista.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {(nota.tipo === 'livro' || nota.tipo === 'estudo') && (
          <>
            <div>
              <label className="text-xs text-text-muted mb-1 block">
                <User size={10} className="inline mr-1" />
                Autor
              </label>
              <input
                type="text"
                value={nota.autor || ''}
                onChange={(e) => onUpdate({ autor: e.target.value })}
                placeholder="Nome do autor..."
                className="w-full bg-bg-tertiary border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  <Clock size={10} className="inline mr-1" />
                  Pág. atual
                </label>
                <input
                  type="number"
                  min="0"
                  value={nota.pagina_atual || ''}
                  onChange={(e) => onUpdate({ pagina_atual: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-tertiary border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Total pág.</label>
                <input
                  type="number"
                  min="0"
                  value={nota.total_paginas || ''}
                  onChange={(e) => onUpdate({ total_paginas: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-tertiary border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {(nota.tipo === 'livro') && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              <Star size={10} className="inline mr-1" />
              Avaliação
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onUpdate({ avaliacao: n === nota.avaliacao ? 0 : n })}
                  className={`text-lg cursor-pointer transition-colors ${
                    n <= (nota.avaliacao || 0) ? 'text-xp-gold' : 'text-text-muted/30'
                  } hover:text-xp-gold`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => editor?.chain().focus().insertContent('$ ').run()}
            title="Fórmula inline ($)"
            className="p-2 bg-bg-tertiary rounded hover:bg-bg-active"
          >
            <Sigma size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().insertContent('$$\n\n$$').run()}
            title="Fórmula bloco ($$)"
            className="p-2 bg-bg-tertiary rounded hover:bg-bg-active"
          >
            <Sigma size={16} className="rotate-180" />
          </button>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">
            <Clock size={10} className="inline mr-1" />
            Criado em
          </label>
          <p className="text-xs text-text-secondary">
            {nota.criado_em
              ? new Date(nota.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">
            <Clock size={10} className="inline mr-1" />
            Atualizado
          </label>
          <p className="text-xs text-text-secondary">
            {nota.atualizado_em
              ? new Date(nota.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
        </div>

        {nota.resumo_ia && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">Resumo IA</label>
            <p className="text-xs text-text-secondary italic bg-bg-tertiary rounded p-2">
              {nota.resumo_ia}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
NoteMetadata.propTypes = {
  nota: PropTypes.any,
  onUpdate: PropTypes.func,
  onClose: PropTypes.func,
};

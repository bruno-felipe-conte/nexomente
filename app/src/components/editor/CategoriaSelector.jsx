import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronDown, Check, BookOpen, FileText,
  Lightbulb, BookMarked, Bookmark, Folder
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CATEGORIAS_VAULT = [
  { id: 'pasta_raiz', nome: 'Todas as Notas', icon: Folder, desc: 'Visão geral do Vault' },
  { id: 'inbox', nome: 'Inbox', icon: FileText, desc: 'Captura rápida sem pasta' },
  { id: 'livro', nome: 'Livros', icon: BookOpen, desc: 'Fichamentos e sínteses literárias' },
  { id: 'projeto', nome: 'Projetos', icon: FileText, desc: 'Planos de ação e documentações' },
  { id: 'ideia', nome: 'Ideias', icon: Lightbulb, desc: 'Insights e centelhas criativas' },
  { id: 'estudo', nome: 'Estudo', icon: BookMarked, desc: 'Material acadêmico e matérias' },
  { id: 'biblia', nome: 'Bíblia', icon: Bookmark, desc: 'Estudos e passagens bíblicas' },
];

export default function CategoriaSelector({
  categoriaAtiva = 'pasta_raiz',
  onSelectCategoria,
  notas = [],
  todasNotas = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Contagem de notas por categoria
  const getCount = (catId) => {
    const list = todasNotas.length > 0 ? todasNotas : notas;
    if (catId === 'pasta_raiz') return list.length;
    if (catId === 'inbox') return list.filter(n => !n.pasta_id || n.pasta_id === 'inbox').length;
    return list.filter(n => n.tipo === catId).length;
  };

  const categoriaAtualObj = CATEGORIAS_VAULT.find(c => c.id === categoriaAtiva) || CATEGORIAS_VAULT[0];
  const IconeAtual = categoriaAtualObj.icon;
  const countAtual = getCount(categoriaAtualObj.id);

  return (
    <div className="relative w-full select-none" ref={containerRef}>
      {/* Botão Gatilho Estilo Selector LLM */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-nx-overlay border-accent-main/40 text-text-hi shadow-md ring-1 ring-accent-main/30'
            : 'bg-bg-secondary/40 border-white/5 text-text-lo/80 hover:bg-white/[0.04] hover:text-text-hi hover:border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-accent-main/15 border border-accent-main/20 flex items-center justify-center text-accent-main shrink-0">
            <IconeAtual size={13} />
          </div>
          <span className="text-xs font-bold text-text-hi truncate">
            {categoriaAtualObj.nome}
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/5 text-text-lo/50 border border-white/5">
            {countAtual}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-text-lo/50 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-accent-main' : ''}`}
        />
      </button>

      {/* Popover Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-nx-overlay/95 backdrop-blur-xl border border-nx-border rounded-2xl shadow-2xl overflow-hidden p-1.5"
          >
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-widest text-text-lo/40">
              <span>Pastas & Categorias</span>
              <span>{todasNotas.length || notas.length} Notas</span>
            </div>

            <div className="max-h-[260px] overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
              {CATEGORIAS_VAULT.map((cat) => {
                const isSelected = categoriaAtiva === cat.id;
                const Icone = cat.icon;
                const count = getCount(cat.id);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategoria(cat.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-accent-main/15 text-text-hi border border-accent-main/30 shadow-sm'
                        : 'text-text-lo/70 hover:bg-white/[0.04] hover:text-text-hi border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icone
                        size={14}
                        className={isSelected ? 'text-accent-main shrink-0' : 'text-text-lo/40 group-hover:text-text-hi shrink-0'}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs ${isSelected ? 'font-bold text-text-hi' : 'font-medium'}`}>
                          {cat.nome}
                        </span>
                        <span className="text-[9px] text-text-lo/30 truncate">
                          {cat.desc}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-accent-main/20 text-accent-main font-bold' : 'bg-white/5 text-text-lo/40'
                      }`}>
                        {count}
                      </span>
                      {isSelected && (
                        <Check size={13} className="text-accent-main" strokeWidth={2.5} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

CategoriaSelector.propTypes = {
  categoriaAtiva: PropTypes.string,
  onSelectCategoria: PropTypes.func.isRequired,
  notas: PropTypes.array,
  todasNotas: PropTypes.array,
};

import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import TagChip from './TagChip';
import PropTypes from 'prop-types';

export default function TagInput({ tags, onAdd, onRemove }) {
  const [input, setInput] = useState('');
  const [sugeridas, setSugeridas] = useState([]);
  const [mostrandoSugestoes, setMostrandoSugestoes] = useState(false);
  const inputRef = useRef(null);

  const todasTags = ['produtividade', 'habitos', 'comportamento', 'estudo', 'biblico', 'filosofia', 'projeto', 'ideia', 'livro', 'ingles', 'italiano', 'logistica', 'financas'];

  const handleInput = (value) => {
    setInput(value);
    if (value.length > 0) {
      const filtradas = todasTags.filter(t =>
        t.toLowerCase().includes(value.toLowerCase()) &&
        !tags.includes(t)
      );
      setSugeridas(filtradas.slice(0, 5));
      setMostrandoSugestoes(true);
    } else {
      setSugeridas([]);
      setMostrandoSugestoes(false);
    }
  };

  const addTag = (tag) => {
    const tagLimpa = tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (tagLimpa && !tags.includes(tagLimpa)) {
      onAdd(tagLimpa);
    }
    setInput('');
    setSugeridas([]);
    setMostrandoSugestoes(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setMostrandoSugestoes(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex flex-wrap gap-1 p-2 bg-bg-tertiary border border-border-subtle rounded-lg min-h-[40px]">
          {tags.map(tag => (
            <TagChip
              key={tag}
              tag={tag}
              onRemove={onRemove ? () => onRemove(tag) : null}
            />
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? 'Adicionar tags...' : ''}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (input.trim()) addTag(input);
            }}
            className="text-text-muted hover:text-accent-main cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>

        {mostrandoSugestoes && sugeridas.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg z-50 overflow-hidden">
            {sugeridas.map(tag => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
                className="w-full px-3 py-1.5 text-sm text-left text-text-secondary hover:bg-bg-tertiary hover:text-text-primary cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
TagInput.propTypes = {
  tags: PropTypes.any,
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,
};

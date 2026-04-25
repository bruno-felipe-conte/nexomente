import { X } from 'lucide-react';

export default function TagChip({ tag, color, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: color ? `${color}20` : 'var(--bg-tertiary)',
        color: color || 'var(--text-secondary)',
        border: `1px solid ${color ? `${color}40` : 'var(--border-subtle)'}`,
      }}
    >
      #{tag}
      {onRemove && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onRemove(tag);
          }}
          className="hover:opacity-70 cursor-pointer"
          type="button"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
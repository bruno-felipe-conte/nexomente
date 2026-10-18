import PropTypes from 'prop-types';
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Minus, Highlighter, Sigma,
  Undo, Redo, Link
} from 'lucide-react';

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg text-xs transition-all ${
        active
          ? 'bg-accent-main text-white shadow-sm'
          : 'text-text-lo/60 hover:bg-white/5 hover:text-text-hi'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

ToolbarButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

function Divider() {
  return <div className="w-px h-3.5 bg-white/10 mx-1 self-center shrink-0" />;
}

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  return (
    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md max-w-full overflow-x-auto scrollbar-none shadow-sm">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Refazer (Ctrl+Y)"
      >
        <Redo size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrito (Ctrl+B)"
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Itálico (Ctrl+I)"
      >
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Sublinhado (Ctrl+U)"
      >
        <Underline size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Tachado"
      >
        <Strikethrough size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive('highlight')}
        title="Marcar texto"
      >
        <Highlighter size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Código inline"
      >
        <Code size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista com pontos"
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        title="Lista de tarefas"
      >
        <ListChecks size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Citação"
      >
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="Bloco de código"
      >
        <Code size={14} className="rotate-45" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const formula = window.prompt('Digite a fórmula matemática (LaTeX):', 'E = mc^2');
          if (formula && formula.trim()) {
            editor.chain().focus().insertContent(`$${formula.trim()}$ `).run();
          }
        }}
        title="Inserir Fórmula Matemática (LaTeX)"
      >
        <Sigma size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Linha divisória"
      >
        <Minus size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const previousUrl = editor.getAttributes('link').href || 'https://';
          const url = window.prompt('Informe a URL do link:', previousUrl);
          if (!url || !url.trim() || url.trim() === 'https://') return;
          const cleanUrl = url.trim();
          const { empty } = editor.state.selection;
          if (empty) {
            editor.chain().focus().insertContent(`<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a> `).run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: cleanUrl }).run();
          }
        }}
        active={editor.isActive('link')}
        title="Link (URL)"
      >
        <Link size={14} />
      </ToolbarButton>
    </div>
  );
}

EditorToolbar.propTypes = {
  editor: PropTypes.object,
};

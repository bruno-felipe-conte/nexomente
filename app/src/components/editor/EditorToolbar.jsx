import { Editor } from '@tiptap/react';
import PropTypes from 'prop-types';
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Minus, Highlighter, Link,
  Undo, Redo, Maximize2, Minimize2, Sigma
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
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? 'bg-accent-main text-white'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border-subtle mx-1 self-center" />;
}

export default function EditorToolbar({ editor, focusMode, onToggleFocus }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 p-2 border-b border-border-subtle flex-wrap bg-bg-secondary/50">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrito (Ctrl+B)"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Itálico (Ctrl+I)"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Sublinhado (Ctrl+U)"
      >
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Tachado"
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive('highlight')}
        title="Marcar texto"
      >
        <Highlighter size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Código inline"
      >
        <Code size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista com pontos"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        title="Lista de tarefas"
      >
        <ListChecks size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Citação"
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="Bloco de código"
      >
        <Code size={16} className="rotate-45" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().insertContent('$ ').run()}
        title="Fórmula inline ($)"
      >
        <Sigma size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().insertContent('$$\n\n$$').run()}
        title="Fórmula bloco ($$)"
      >
        <Sigma size={16} className="rotate-180" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Linha divisória"
      >
        <Minus size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().unsetLink().run()}
        active={editor.isActive('link')}
        title="Remover link"
        disabled={!editor.isActive('link')}
      >
        <Link size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Refazer (Ctrl+Shift+Z)"
      >
        <Redo size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={onToggleFocus}
        title={focusMode ? 'Sair do modo foco' : 'Modo foco'}
      >
        {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </ToolbarButton>
    </div>
  );
}
EditorToolbar.propTypes = {
  onClick: PropTypes.func,
  active: PropTypes.any,
  disabled: PropTypes.any,
  title: PropTypes.string,
  children: PropTypes.node,
  editor: PropTypes.any,
  focusMode: PropTypes.any,
  onToggleFocus: PropTypes.func,
};

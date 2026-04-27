import React from 'react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react';
import { 
  Bold, Italic, Underline, Highlighter, Link, 
  Heading1, Heading2, List, ListOrdered, Code, Quote, Sparkles
} from 'lucide-react';

export default function EditorContextMenus({ editor, onAIAction }) {
  if (!editor) return null;

  return (
    <>
      {/* Menu que aparece ao selecionar texto */}
      <BubbleMenu 
        editor={editor} 
        tippyOptions={{ duration: 100 }}
        className="flex items-center gap-1 p-1 bg-bg-secondary/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      >
        <ContextButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')}
        >
          <Bold size={14} />
        </ContextButton>
        <ContextButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')}
        >
          <Italic size={14} />
        </ContextButton>
        <ContextButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          active={editor.isActive('underline')}
        >
          <Underline size={14} />
        </ContextButton>
        <ContextButton 
          onClick={() => editor.chain().focus().toggleHighlight().run()} 
          active={editor.isActive('highlight')}
        >
          <Highlighter size={14} />
        </ContextButton>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ContextButton 
          onClick={() => onAIAction?.('summarize')}
          className="text-accent-light hover:bg-accent-main/20"
        >
          <Sparkles size={14} />
          <span className="text-[10px] font-bold uppercase ml-1">AI</span>
        </ContextButton>
      </BubbleMenu>

      {/* Menu que aparece em linhas vazias */}
      <FloatingMenu 
        editor={editor} 
        tippyOptions={{ duration: 100 }}
        className="flex items-center gap-1 p-1 bg-bg-secondary/80 backdrop-blur-sm border border-white/5 rounded-lg shadow-xl"
      >
        <ContextButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </ContextButton>
        <ContextButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ContextButton>
        <ContextButton onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ContextButton>
        <ContextButton onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ContextButton>
        <ContextButton onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code size={14} />
        </ContextButton>
        <ContextButton onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ContextButton>
      </FloatingMenu>
    </>
  );
}

function ContextButton({ onClick, active, children, className = '' }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
        active 
          ? 'bg-accent-main text-white' 
          : `text-text-lo hover:bg-white/5 hover:text-text-hi ${className}`
      }`}
    >
      {children}
    </button>
  );
}

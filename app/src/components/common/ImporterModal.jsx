import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, Layers, CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * Converte Markdown simples para HTML compatível com TipTap, preservando
 * títulos, listas, citações, blocos de código, negrito/itálico e [[WikiLinks]].
 */
export function markdownToTipTapHtml(md = '') {
  const raw = String(md || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';
  // Se já parecer HTML estruturado, retorna como está
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote|pre)\b/i.test(raw)) {
    return raw;
  }

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatInline = (text) =>
    escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = raw.split('\n');
  const htmlParts = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBuffer = [];

  const closeList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        htmlParts.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        inCodeBlock = false;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      htmlParts.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      closeList();
      htmlParts.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      closeList();
      htmlParts.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('> ')) {
      closeList();
      htmlParts.push(`<blockquote><p>${formatInline(trimmed.slice(2))}</p></blockquote>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li><p>${formatInline(trimmed.replace(/^[-*]\s+/, ''))}</p></li>`);
    } else {
      closeList();
      htmlParts.push(`<p>${formatInline(trimmed)}</p>`);
    }
  }

  closeList();
  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  }

  return htmlParts.join('');
}

export function ContentImporter({
  onImportNotes,
  onImportCards,
  initialTab = 'notes',
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'notes' | 'flashcards'

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Estados para Flashcards
  const [rawFlashcards, setRawFlashcards] = useState('');
  const [deckName, setDeckName] = useState('Geral');
  const [cardStats, setCardStats] = useState({ valid: 0, invalid: 0 });

  // Estados para Notas .md
  const [importedNotes, setImportedNotes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- PARSER DE FLASHCARDS ---
  const parseFlashcards = (text) => {
    const lines = text.split('\n');
    const validCards = [];
    let invalidCount = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return; // ignora linhas em branco

      // Divide pelo primeiro delimitador ';'
      const separatorIndex = trimmed.indexOf(';');
      if (separatorIndex === -1) {
        invalidCount++;
        return;
      }

      const front = trimmed.slice(0, separatorIndex).trim();
      const back = trimmed.slice(separatorIndex + 1).trim();

      if (front && back) {
        validCards.push({
          id: crypto.randomUUID(),
          front,
          back,
          deck: deckName.trim() || 'Geral',
          createdAt: new Date().toISOString(),
          // Campos prontos para repetição espaçada (ex: SM-2 / Anki)
          repetitions: 0,
          interval: 1,
          easeFactor: 2.5,
        });
      } else {
        invalidCount++;
      }
    });

    return { validCards, invalidCount };
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setRawFlashcards(text);
    const { validCards, invalidCount } = parseFlashcards(text);
    setCardStats({ valid: validCards.length, invalid: invalidCount });
  };

  const handleConfirmFlashcards = () => {
    const { validCards } = parseFlashcards(rawFlashcards);
    if (validCards.length === 0) return;

    if (onImportCards) {
      onImportCards(validCards);
    }
    setRawFlashcards('');
    setCardStats({ valid: 0, invalid: 0 });
  };

  // --- PARSER DE ARQUIVOS .MD ---
  const handleFileUpload = async (files) => {
    const mdFiles = Array.from(files).filter(
      (file) => file.name.endsWith('.md') || file.name.endsWith('.markdown')
    );

    const parsedNotes = await Promise.all(
      mdFiles.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target.result;
            // Remove a extensão .md para o título
            const title = file.name.replace(/\.(md|markdown)$/i, '');
            resolve({
              id: crypto.randomUUID(),
              title,
              content,
              htmlContent: markdownToTipTapHtml(content),
              size: file.size,
              updatedAt: new Date(file.lastModified || Date.now()).toISOString(),
            });
          };
          reader.readAsText(file);
        });
      })
    );

    setImportedNotes((prev) => [...prev, ...parsedNotes]);
  };

  const handleConfirmNotes = () => {
    if (importedNotes.length === 0) return;
    if (onImportNotes) {
      onImportNotes(importedNotes);
    }
    setImportedNotes([]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto nx-sheet rounded-2xl shadow-xl overflow-hidden text-nx-bright">
      {/* Abas */}
      <div className="flex items-center justify-between border-b border-nx-border bg-nx-surface/90 p-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'nx-btn-primary shadow-xs'
                : 'text-nx-dim hover:text-nx-bright hover:bg-nx-depth'
            }`}
          >
            <FileText size={16} />
            Importar Notas (.md)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'flashcards'
                ? 'nx-btn-primary shadow-xs'
                : 'text-nx-dim hover:text-nx-bright hover:bg-nx-depth'
            }`}
          >
            <Layers size={16} />
            Importar Flashcards (frente;verso)
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importador"
            className="p-2 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-depth transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-6">
        {/* ABA: FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-base font-semibold text-nx-bright font-display">Importação em Massa</h3>
                <p className="text-xs text-nx-dim">
                  Cole dezenas ou centenas de linhas no formato{' '}
                  <code className="text-[var(--nx-accent)] font-mono">frente;verso</code>
                </p>
              </div>
              <input
                type="text"
                placeholder="Baralho (ex: Italiano, Vocabulário)"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="bg-nx-depth border border-nx-border text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-[var(--nx-accent)] text-nx-bright"
              />
            </div>

            <textarea
              rows={10}
              value={rawFlashcards}
              onChange={handleTextChange}
              placeholder={'cane;cachorro\ngatto;gato\nmela;maçã\nlibro;livro'}
              className="w-full bg-nx-depth border border-nx-border rounded-xl p-3 font-mono text-sm text-nx-bright focus:outline-none focus:border-[var(--nx-accent)] placeholder-nx-dim/50 resize-y"
            />

            {/* Prévia e Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-[var(--nx-secondary)]">
                  <CheckCircle2 size={14} /> {cardStats.valid} cartões identificados
                </span>
                {cardStats.invalid > 0 && (
                  <span className="flex items-center gap-1.5 text-[var(--nx-warning)]">
                    <AlertCircle size={14} /> {cardStats.invalid} linhas ignoradas/inválidas
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleConfirmFlashcards}
                disabled={cardStats.valid === 0}
                className="px-4 py-2 nx-btn-primary disabled:opacity-40 text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                Inserir Flashcards ({cardStats.valid})
              </button>
            </div>
          </div>
        )}

        {/* ABA: NOTAS .MD */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-nx-bright font-display">Importar Arquivos Markdown</h3>
              <p className="text-xs text-nx-dim">
                Carregue arquivos <code className="text-[var(--nx-secondary)] font-mono">.md</code> para converter em
                notas do sistema
              </p>
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
                isDragging
                  ? 'border-[var(--nx-secondary)] bg-[var(--nx-secondary)]/10'
                  : 'border-nx-border hover:border-[var(--nx-accent)] bg-nx-depth'
              }`}
            >
              <UploadCloud className="text-nx-dim mb-2" size={32} />
              <p className="text-sm text-nx-bright font-medium">Arraste seus arquivos .md aqui</p>
              <p className="text-xs text-nx-dim mt-1">ou clique para selecionar do computador</p>
              <input
                type="file"
                accept=".md,.markdown"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </label>

            {importedNotes.length > 0 && (
              <div className="space-y-3">
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {importedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between bg-nx-depth border border-nx-border px-3 py-2 rounded-lg text-xs"
                    >
                      <span className="font-mono truncate max-w-xs text-nx-bright">
                        {note.title}.md
                      </span>
                      <span className="text-nx-dim">{(note.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmNotes}
                    className="px-4 py-2 nx-btn-primary rounded-lg font-medium text-sm transition-colors shadow-xs cursor-pointer"
                  >
                    Salvar {importedNotes.length} Nota(s)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImporterModal({
  isOpen = true,
  onClose,
  initialTab = 'notes',
  onImportNotes,
  onImportCards,
}) {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (!onClose) {
    return (
      <ContentImporter
        initialTab={initialTab}
        onImportNotes={onImportNotes}
        onImportCards={onImportCards}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ContentImporter
        initialTab={initialTab}
        onImportNotes={onImportNotes}
        onImportCards={onImportCards}
        onClose={onClose}
      />
    </div>
  );
}

/**
 * @module MermaidViewer
 * @description Renderizador reativo de diagramas conceituais e fluxogramas Mermaid.js
 * com suporte a:
 * - Carregamento dinâmico (import('mermaid')) para preservar o chunk budget do Vite
 * - Tema escuro integrado (#0f172a, fonte monospace, estilo consistente com NexoMente)
 * - Sanitização de SVG contra XSS via DOMPurify ({ USE_PROFILES: { svg: true } })
 * - Controles de Zoom (0.5x a 2.5x) e Pan suave (arrastar para mover)
 * - Alternância entre exibição visual do diagrama e código-fonte raw
 * - Botão de cópia de código Mermaid com feedback tátil
 * - Fallback gracioso com <CodeSnippet> formatado e badge não-bloqueante em erros de sintaxe
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code,
  Eye,
  Copy,
  Check,
  AlertTriangle,
  Terminal,
} from 'lucide-react';

let mermaidPromise = null;
let isInitialized = false;

/**
 * Reseta o estado global do Mermaid para testes unitários
 */
export function resetMermaidState() {
  mermaidPromise = null;
  isInitialized = false;
}

/**
 * Obtém ou inicializa a instância do Mermaid via dynamic import
 */
export async function getMermaidInstance() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default || mod;
      if (!isInitialized && typeof mermaid.initialize === 'function') {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            darkMode: true,
            background: '#0f172a',
            mainBkg: '#0f172a',
            nodeBorder: '#6366f1',
            clusterBkg: '#1e293b',
            clusterBorder: '#334155',
            defaultLinkColor: '#94a3b8',
            titleColor: '#f8fafc',
            primaryColor: '#1e293b',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#6366f1',
            secondaryColor: '#334155',
            secondaryTextColor: '#f8fafc',
            secondaryBorderColor: '#475569',
            tertiaryColor: '#0f172a',
            tertiaryTextColor: '#f8fafc',
            tertiaryBorderColor: '#334155',
            lineColor: '#94a3b8',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '13px',
          },
          securityLevel: 'strict',
          suppressErrorRendering: true,
        });
        isInitialized = true;
      }
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * Componente CodeSnippet para exibição do código raw e fallback de erro
 */
export function CodeSnippet({ code, language = 'mermaid', errorBadge = null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso se clipboard API falhar
      setCopied(false);
    }
  }, [code]);

  return (
    <div
      data-testid="mermaid-code-snippet"
      className="my-2.5 rounded-xl overflow-hidden border border-nx-border bg-nx-void/90 font-mono text-xs shadow-sm"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-nx-surface/70 border-b border-nx-border text-[11px] text-nx-dim">
        <div className="flex items-center gap-2 font-medium">
          <Terminal size={12} className="text-nx-primary" />
          <span>{language}</span>
          {errorBadge && (
            <span
              data-testid="mermaid-error-badge"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
            >
              <AlertTriangle size={11} className="text-amber-400" />
              {errorBadge}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="snippet-copy-btn"
          aria-label="Copiar código"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-nx-dim hover:text-nx-bright hover:bg-nx-overlay transition-all cursor-pointer"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-emerald-300 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

CodeSnippet.propTypes = {
  code: PropTypes.string.isRequired,
  language: PropTypes.string,
  errorBadge: PropTypes.string,
};

/**
 * Componente Principal MermaidViewer
 */
export default function MermaidViewer({ code }) {
  const [svgContent, setSvgContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const [showRawCode, setShowRawCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados de Zoom e Pan (escala de 0.5x a 2.5x)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const cleanCode = (code || '').trim();

  // Renderização assíncrona do diagrama
  useEffect(() => {
    let isMounted = true;

    if (!cleanCode) {
      setSvgContent('');
      setRenderError('Código Mermaid vazio.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRenderError(null);

    const renderDiagram = async () => {
      const renderId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const mermaid = await getMermaidInstance();
        const { svg } = await mermaid.render(renderId, cleanCode);

        if (!isMounted) return;

        // Sanitização estrita contra XSS preservando tags/atributos SVG
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true },
        });

        setSvgContent(sanitized);
        setRenderError(null);
      } catch (err) {
        if (!isMounted) return;

        // Limpeza de possíveis nós de erro injetados no document.body pelo Mermaid
        try {
          const dangling =
            document.getElementById('dmermaid') ||
            document.getElementById(`d${renderId}`) ||
            document.querySelector('[id^="dmermaid"]');
          if (dangling && dangling.parentNode) {
            dangling.parentNode.removeChild(dangling);
          }
        } catch {
          // Ignora se DOM indisponível
        }

        setRenderError(err?.message || 'Erro de sintaxe Mermaid');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [cleanCode]);

  // Controles de Zoom (0.5x até 2.5x)
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(2.5, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const isPanningRef = useRef(false);

  // Controles de Pan (Arrastar para navegar)
  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0 && e.buttons !== 1 && e.button !== undefined) return;
      isPanningRef.current = true;
      setIsPanning(true);
      const clientX = Number.isFinite(e.clientX) ? e.clientX : (Number.isFinite(e.pageX) ? e.pageX : 0);
      const clientY = Number.isFinite(e.clientY) ? e.clientY : (Number.isFinite(e.pageY) ? e.pageY : 0);
      dragStartRef.current = {
        x: clientX - (pan?.x || 0),
        y: clientY - (pan?.y || 0),
      };
      if (e.currentTarget?.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isPanningRef.current) return;
      const clientX = Number.isFinite(e.clientX) ? e.clientX : (Number.isFinite(e.pageX) ? e.pageX : 0);
      const clientY = Number.isFinite(e.clientY) ? e.clientY : (Number.isFinite(e.pageY) ? e.pageY : 0);
      setPan({
        x: clientX - (dragStartRef.current?.x || 0),
        y: clientY - (dragStartRef.current?.y || 0),
      });
    },
    []
  );

  const handlePointerUp = useCallback(
    (e) => {
      isPanningRef.current = false;
      setIsPanning(false);
      if (e.currentTarget?.releasePointerCapture) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }
    },
    []
  );

  // Copiar código para a área de transferência
  const handleCopyCode = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [cleanCode]);

  // Fallback gracioso quando há erro de renderização
  if (renderError) {
    return (
      <div data-testid="mermaid-fallback">
        <CodeSnippet
          code={cleanCode}
          language="mermaid"
          errorBadge="Erro de sintaxe Mermaid (visualização degradada para código)"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="mermaid-viewer"
      className="my-3 rounded-xl border border-slate-800 bg-[#0f172a] overflow-hidden shadow-md flex flex-col font-mono text-xs"
    >
      {/* Barra de Ferramentas Superior */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-300 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Diagrama Conceitual</span>
          <span className="text-[10px] text-slate-500 font-mono">Mermaid.js</span>
        </div>

        {/* Ações e Controles */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 mr-1">
            <button
              type="button"
              data-testid="zoom-out-btn"
              aria-label="Diminuir zoom"
              title="Diminuir zoom (mín 0.5x)"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ZoomOut size={13} />
            </button>
            <span
              data-testid="zoom-level-indicator"
              className="px-1.5 text-[10px] font-semibold text-indigo-300 min-w-[36px] text-center"
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              data-testid="zoom-in-btn"
              aria-label="Aumentar zoom"
              title="Aumentar zoom (máx 2.5x)"
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              data-testid="zoom-reset-btn"
              aria-label="Redefinir zoom"
              title="Redefinir zoom (100%)"
              onClick={handleResetZoom}
              className="p-1 ml-0.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Toggle Raw Code */}
          <button
            type="button"
            data-testid="toggle-code-btn"
            aria-label="Alternar código fonte"
            title={showRawCode ? 'Ver diagrama visual' : 'Ver código-fonte Mermaid'}
            onClick={() => setShowRawCode((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              showRawCode
                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {showRawCode ? <Eye size={12} /> : <Code size={12} />}
            <span>{showRawCode ? 'Diagrama' : 'Código'}</span>
          </button>

          {/* Copiar Código */}
          <button
            type="button"
            data-testid="copy-code-btn"
            aria-label="Copiar código Mermaid"
            title="Copiar código Mermaid"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Área de Visualização do Diagrama ou Código */}
      {showRawCode ? (
        <pre className="p-4 bg-slate-950 overflow-x-auto text-emerald-300 text-xs leading-relaxed font-mono select-text">
          <code data-testid="raw-code-block">{cleanCode}</code>
        </pre>
      ) : (
        <div
          ref={viewportRef}
          data-testid="mermaid-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onDoubleClick={handleResetZoom}
          className={`relative w-full h-[280px] bg-[#0f172a] overflow-hidden select-none flex items-center justify-center ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Renderizando fluxograma...</span>
            </div>
          ) : (
            <div
              data-testid="mermaid-svg-container"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              }}
              className="mermaid-svg-wrapper flex items-center justify-center p-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}

          {/* Dica de interação sutil */}
          <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-slate-900/70 border border-slate-800 text-[9px] text-slate-400 pointer-events-none">
            Arraste para mover · Duplo clique para resetar
          </div>
        </div>
      )}
    </div>
  );
}

MermaidViewer.propTypes = {
  code: PropTypes.string,
};

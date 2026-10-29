/**
 * @module CopilotMessageContent
 * @description Renderizador com suporte nativo a:
 * - Fórmulas Matemáticas KaTeX (Display mode $$...$$ e Inline mode $...$)
 * - Gráficos Matemáticos SVG Interativos (Curvas de Funções, Parábolas de Bhaskara, Raízes e Vértices)
 * - Gráficos de Dados Declarativos (Barras e Linhas em SVG)
 * - Blocos de Código com Sintaxe e Botão de Cópia
 * - Formatação Markdown (Negrito, Itálico, Listas e Destaques)
 */
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Terminal, TrendingUp, BarChart2 } from 'lucide-react';

// Renderizador seguro do KaTeX
function renderLatex(formula, displayMode = false) {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return displayMode ? `\n$$ ${formula} $$\n` : `$${formula}$`;
  }
}

// Plotter de Funções Matemáticas em SVG (Ex: Parábola de Bhaskara ax² + bx + c)
function MathPlotter({ spec }) {
  const {
    fn = 'f(x) = x^2 - 4x + 3',
    raizes = [1, 3],
    vertice = [2, -1],
    xMin = -1,
    xMax = 5,
    titulo = 'Gráfico da Função Quadrática',
  } = spec;

  const width = 360;
  const height = 180;
  const padding = 28;

  // Função avaliadora para polinômios quadráticos ax² + bx + c
  const evaluate = useMemo(() => {
    // Tenta extrair coeficientes a, b, c da string
    const match = fn.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x\^2\s*([+-]\s*\d*\.?\d*)\s*\*?\s*x\s*([+-]\s*\d*\.?\d*)/i);
    let a = 1, b = -4, c = 3;
    if (match) {
      const parseCoeff = (val, def) => {
        if (!val || val === '+') return 1;
        if (val === '-') return -1;
        const n = parseFloat(val.replace(/\s+/g, ''));
        return isNaN(n) ? def : n;
      };
      a = parseCoeff(match[1], 1);
      b = parseCoeff(match[2], 0);
      c = parseCoeff(match[3], 0);
    }
    return (x) => a * x * x + b * x + c;
  }, [fn]);

  // Calcula valores de y para determinar limites verticais
  const points = useMemo(() => {
    const pts = [];
    const steps = 60;
    const step = (xMax - xMin) / steps;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * step;
      const y = evaluate(x);
      pts.push({ x, y });
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    // Margem vertical
    const spanY = Math.max(2, maxY - minY);
    const padY = spanY * 0.15;
    const effectiveMinY = minY - padY;
    const effectiveMaxY = maxY + padY;

    // Converte para coordenadas de tela
    const toScreenX = (x) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    const toScreenY = (y) => height - padding - ((y - effectiveMinY) / (effectiveMaxY - effectiveMinY)) * (height - 2 * padding);

    const pathData = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toScreenX(p.x).toFixed(1)} ${toScreenY(p.y).toFixed(1)}`)
      .join(' ');

    const zeroY = toScreenY(0);
    const zeroX = toScreenX(0);

    return {
      pathData,
      toScreenX,
      toScreenY,
      zeroY: Math.max(padding, Math.min(height - padding, zeroY)),
      zeroX: Math.max(padding, Math.min(width - padding, zeroX)),
      hasZeroY: effectiveMinY <= 0 && effectiveMaxY >= 0,
      hasZeroX: xMin <= 0 && xMax >= 0,
    };
  }, [xMin, xMax, evaluate]);

  return (
    <div className="my-3 p-3 rounded-xl border border-nx-border/80 bg-nx-depth/80 shadow-md font-sans">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-nx-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-nx-bright">
          <TrendingUp size={13} className="text-nx-primary" />
          <span>{titulo}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nx-primary/10 text-nx-primary font-bold">
          {fn}
        </span>
      </div>

      <div className="relative flex justify-center overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[380px] h-auto overflow-visible select-none">
          {/* Grade de fundo */}
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" className="text-nx-border/40" strokeDasharray="3 3" />
          <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} stroke="currentColor" className="text-nx-border/40" strokeDasharray="3 3" />

          {/* Eixo X (y = 0) */}
          {points.hasZeroY && (
            <g>
              <line x1={padding} y1={points.zeroY} x2={width - padding} y2={points.zeroY} stroke="currentColor" className="text-nx-dim/70" strokeWidth="1.2" />
              <text x={width - padding + 4} y={points.zeroY + 3} fill="currentColor" className="text-[9px] fill-nx-dim font-mono">x</text>
            </g>
          )}

          {/* Eixo Y (x = 0) */}
          {points.hasZeroX && (
            <g>
              <line x1={points.zeroX} y1={padding} x2={points.zeroX} y2={height - padding} stroke="currentColor" className="text-nx-dim/70" strokeWidth="1.2" />
              <text x={points.zeroX - 3} y={padding - 5} fill="currentColor" className="text-[9px] fill-nx-dim font-mono" textAnchor="middle">y</text>
            </g>
          )}

          {/* Curva da Parábola */}
          <path d={points.pathData} fill="none" stroke="var(--nx-primary)" strokeWidth="2.5" strokeLinecap="round" className="drop-shadow-sm" />

          {/* Raízes Marcadas (x1, x2) */}
          {Array.isArray(raizes) && raizes.map((r, i) => {
            const rx = points.toScreenX(r);
            const ry = points.toScreenY(0);
            return (
              <g key={`raiz-${i}`}>
                <circle cx={rx} cy={ry} r="4" fill="var(--nx-secondary)" stroke="var(--nx-depth)" strokeWidth="1.5" />
                <text x={rx} y={ry - 7} fill="var(--nx-bright)" className="text-[9px] font-bold font-mono" textAnchor="middle">
                  x{i + 1}={r}
                </text>
              </g>
            );
          })}

          {/* Vértice Marcado */}
          {Array.isArray(vertice) && vertice.length === 2 && (
            <g>
              <circle cx={points.toScreenX(vertice[0])} cy={points.toScreenY(vertice[1])} r="3.5" fill="var(--nx-accent)" stroke="var(--nx-depth)" strokeWidth="1.5" />
              <text x={points.toScreenX(vertice[0])} y={points.toScreenY(vertice[1]) + 11} fill="var(--nx-accent)" className="text-[8.5px] font-mono font-bold" textAnchor="middle">
                V({vertice[0]}, {vertice[1]})
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-nx-border/40 text-[10px] text-nx-dim font-mono">
        {raizes?.length > 0 && <span>Raízes: x = {raizes.join(' e x = ')}</span>}
        {vertice?.length === 2 && <span>Vértice: ({vertice[0]}, {vertice[1]})</span>}
      </div>
    </div>
  );
}

MathPlotter.propTypes = {
  spec: PropTypes.object.isRequired,
};

// Gráfico de Barras Simples em SVG
function SimpleBarChart({ data, title = 'Gráfico Comparativo' }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;

  const maxVal = Math.max(...entries.map(([, v]) => Number(v) || 0), 1);

  return (
    <div className="my-3 p-3 rounded-xl border border-nx-border/80 bg-nx-depth/80 shadow-md">
      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-nx-border/60 text-xs font-semibold text-nx-bright">
        <BarChart2 size={13} className="text-nx-primary" />
        <span>{title}</span>
      </div>
      <div className="space-y-2">
        {entries.map(([label, val], idx) => {
          const num = Number(val) || 0;
          const pct = Math.min(100, Math.max(8, (num / maxVal) * 100));
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-nx-dim">
                <span className="font-semibold text-nx-bright">{label}</span>
                <span>{num}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-nx-surface overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: idx % 2 === 0 ? 'var(--nx-primary)' : 'var(--nx-secondary)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

SimpleBarChart.propTypes = {
  data: PropTypes.object.isRequired,
  title: PropTypes.string,
};

// Bloco de Código Estilizado com Botão de Cópia
function CodeSnippet({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-nx-border bg-nx-void/90 font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-nx-surface/70 border-b border-nx-border text-[11px] text-nx-dim">
        <div className="flex items-center gap-1.5 font-medium">
          <Terminal size={12} className="text-nx-primary" />
          <span>{language || 'código'}</span>
        </div>
        <button
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
};

// Parser de Linhas com Formatação Inline (LaTeX $...$, Negrito, Itálico, Código inline)
function InlineRichText({ text }) {
  if (!text) return null;

  // Divide por fórmulas inline $...$
  const latexParts = text.split(/(\$[^$\n]+\$)/g);

  return latexParts.map((lPart, lIdx) => {
    if (lPart.startsWith('$') && lPart.endsWith('$') && lPart.length > 2) {
      const formula = lPart.slice(1, -1).trim();
      const html = renderLatex(formula, false);
      return (
        <span
          key={`l-${lIdx}`}
          className="inline-math px-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // Processa negrito **...**, itálico *...* e código inline `...`
    const tokens = lPart.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

    return tokens.map((token, tIdx) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={tIdx} className="font-bold text-nx-bright">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={tIdx} className="italic text-nx-dim">{token.slice(1, -1)}</em>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={tIdx} className="px-1.5 py-0.5 mx-0.5 rounded bg-nx-overlay font-mono text-[11px] text-nx-secondary border border-nx-border/60">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  });
}

InlineRichText.propTypes = {
  text: PropTypes.string.isRequired,
};

/**
 * Componente Principal de Renderização da Mensagem do Copiloto
 */
export default function CopilotMessageContent({ content, isUser = false }) {
  if (!content) return null;

  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  // 1. Divide o conteúdo em blocos especiais: ```bloco``` e $$displayMath$$
  const blockRegex = /(```[\w:-]*\n[\s\S]*?```|\$\$[\s\S]*?\$\$)/g;
  const blocks = content.split(blockRegex);

  return (
    <div className="copilot-message-content space-y-2 text-xs leading-relaxed text-nx-text">
      {blocks.map((block, idx) => {
        if (!block) return null;

        // Bloco Matemático KaTeX em Destaque ($$...$$)
        if (block.startsWith('$$') && block.endsWith('$$')) {
          const formula = block.slice(2, -2).trim();
          const mathHtml = renderLatex(formula, true);
          return (
            <div
              key={idx}
              className="my-3 py-2 px-3 rounded-xl bg-nx-depth/60 border border-nx-border/70 overflow-x-auto text-center shadow-inner"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        }

        // Bloco de Código ou Gráfico (```linguagem\n...```)
        if (block.startsWith('```') && block.endsWith('```')) {
          const match = block.match(/^```([\w:-]*)\n([\s\S]*?)```$/);
          if (match) {
            const [, rawLang, codeBody] = match;
            const lang = (rawLang || '').trim().toLowerCase();
            const cleanCode = codeBody.trim();

            // Gráfico de Função / Plot Matemático
            if (lang === 'plot' || lang === 'math:plot' || lang === 'chart:plot') {
              try {
                // Suporta formato JSON ou texto declarativo linha a linha
                if (cleanCode.startsWith('{')) {
                  const spec = JSON.parse(cleanCode);
                  return <MathPlotter key={idx} spec={spec} />;
                }
                const lines = cleanCode.split('\n');
                const spec = {};
                lines.forEach((line) => {
                  const [k, v] = line.split(':');
                  if (k && v) {
                    const key = k.trim().toLowerCase();
                    const val = v.trim();
                    if (key.includes('raiz') || key.includes('raizes')) {
                      spec.raizes = val.replace(/[[\]]/g, '').split(',').map((n) => parseFloat(n.trim())).filter((n) => !isNaN(n));
                    } else if (key.includes('vertice')) {
                      spec.vertice = val.replace(/[[\]]/g, '').split(',').map((n) => parseFloat(n.trim())).filter((n) => !isNaN(n));
                    } else if (key.includes('titulo')) {
                      spec.titulo = val;
                    }
                  } else if (line.includes('f(x)') || line.includes('=')) {
                    spec.fn = line.trim();
                  }
                });
                return <MathPlotter key={idx} spec={spec} />;
              } catch {
                return <CodeSnippet key={idx} language="plot" code={cleanCode} />;
              }
            }

            // Gráfico de Barras / Comparativo
            if (lang === 'chart' || lang === 'chart:bar') {
              try {
                if (cleanCode.startsWith('{')) {
                  const data = JSON.parse(cleanCode);
                  return <SimpleBarChart key={idx} data={data} />;
                }
                const data = {};
                cleanCode.split('\n').forEach((l) => {
                  const [k, v] = l.split(':');
                  if (k && v) data[k.trim()] = parseFloat(v.trim()) || 0;
                });
                return <SimpleBarChart key={idx} data={data} />;
              } catch {
                return <CodeSnippet key={idx} language="chart" code={cleanCode} />;
              }
            }

            // Bloco de Código Convencional
            return <CodeSnippet key={idx} language={lang} code={cleanCode} />;
          }
        }

        // Bloco de Texto Convencional: processa parágrafos e listas
        const paragraphs = block.split(/\n\n+/);
        return (
          <div key={idx} className="space-y-2">
            {paragraphs.map((para, pIdx) => {
              const lines = para.split('\n');
              return (
                <div key={pIdx} className="space-y-1">
                  {lines.map((line, lIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;

                    // Lista com marcadores (* ou -)
                    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                      return (
                        <div key={lIdx} className="flex items-start gap-2 pl-2">
                          <span className="text-nx-primary text-xs select-none">•</span>
                          <span className="flex-1 min-w-0">
                            <InlineRichText text={trimmed.slice(2)} />
                          </span>
                        </div>
                      );
                    }

                    // Lista numerada (1. 2.)
                    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                    if (numMatch) {
                      return (
                        <div key={lIdx} className="flex items-start gap-2 pl-2">
                          <span className="font-mono text-[10px] font-bold text-nx-secondary select-none">
                            {numMatch[1]}.
                          </span>
                          <span className="flex-1 min-w-0">
                            <InlineRichText text={numMatch[2]} />
                          </span>
                        </div>
                      );
                    }

                    return (
                      <p key={lIdx} className="leading-relaxed">
                        <InlineRichText text={line} />
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

CopilotMessageContent.propTypes = {
  content: PropTypes.string,
  isUser: PropTypes.bool,
};

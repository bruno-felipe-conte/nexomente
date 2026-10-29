/**
 * speechFormatter.js
 * Sanitizador e tradutor fonético de textos, Markdown e fórmulas matemáticas (LaTeX)
 * para pronúncia natural em língua portuguesa (pt-BR).
 */

const GREEK_LETTERS = {
  '\\alpha': 'alfa',
  '\\beta': 'beta',
  '\\gamma': 'gama',
  '\\delta': 'delta',
  '\\Delta': 'delta',
  '\\epsilon': 'épsilon',
  '\\zeta': 'zeta',
  '\\eta': 'eta',
  '\\theta': 'teta',
  '\\Theta': 'teta',
  '\\lambda': 'lambda',
  '\\Lambda': 'lambda',
  '\\mu': 'mi',
  '\\nu': 'ni',
  '\\xi': 'csi',
  '\\pi': 'pi',
  '\\Pi': 'pi',
  '\\rho': 'rô',
  '\\sigma': 'sigma',
  '\\Sigma': 'sigma',
  '\\tau': 'tau',
  '\\phi': 'fi',
  '\\Phi': 'fi',
  '\\psi': 'psi',
  '\\omega': 'ômega',
  '\\Omega': 'ômega'
};

const MATH_OPERATORS = [
  { regex: /\\pm/g, replacement: ' mais ou menos ' },
  { regex: /\\mp/g, replacement: ' menos ou mais ' },
  { regex: /\\leq?/g, replacement: ' menor ou igual a ' },
  { regex: /\\geq?/g, replacement: ' maior ou igual a ' },
  { regex: /\\neq?/g, replacement: ' diferente de ' },
  { regex: /\\approx/g, replacement: ' aproximadamente igual a ' },
  { regex: /\\times/g, replacement: ' vezes ' },
  { regex: /\\cdot/g, replacement: ' vezes ' },
  { regex: /\\div/g, replacement: ' dividido por ' },
  { regex: /\\infty/g, replacement: ' infinito ' },
  { regex: /\\to/g, replacement: ' tende a ' },
  { regex: /\\rightarrow/g, replacement: ' resulta em ' },
  { regex: /\\sum/g, replacement: ' somatório ' },
  { regex: /\\prod/g, replacement: ' produtório ' },
  { regex: /\\int/g, replacement: ' integral ' },
  { regex: /\\log/g, replacement: ' logaritmo ' },
  { regex: /\\ln/g, replacement: ' logaritmo natural ' },
  { regex: /\\sin/g, replacement: ' seno ' },
  { regex: /\\cos/g, replacement: ' cosseno ' },
  { regex: /\\tan/g, replacement: ' tangente ' }
];

/**
 * Traduz expressões matemáticas em formato LaTeX para linguagem falada em português.
 */
export function formatLatexToSpeech(latex) {
  if (!latex) return '';

  let text = latex;

  // 1. Remover \text{...} ou \mathrm{...}
  text = text.replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/g, '$1');

  // 2. Notação assintótica O(log n), O(n^2), O(1)
  text = text.replace(/O\s*\(\s*\\log\s*([a-zA-Z0-9]+)\s*\)/g, 'ordem de log de $1');
  text = text.replace(/O\s*\(\s*([a-zA-Z0-9^]+)\s*\)/g, 'ordem de $1');

  // 3. Raízes: \sqrt[n]{x} ou \sqrt{x}
  text = text.replace(/\\sqrt\[3\]\{([^}]+)\}/g, 'raiz cúbica de $1');
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'raiz de ordem $1 de $2');
  text = text.replace(/\\sqrt\{([^}]+)\}/g, 'raiz quadrada de $1');

  // 4. Frações recursivas ou simples: \frac{numerador}{denominador}
  // Suporte a fórmulas clássicas como Bhaskara
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
    return `${num.trim()}, tudo sobre ${den.trim()}`;
  });

  // 5. Letras Gregas
  for (const [symbol, spoken] of Object.entries(GREEK_LETTERS)) {
    text = text.split(symbol).join(` ${spoken} `);
  }

  // 6. Operadores Matemáticos
  for (const op of MATH_OPERATORS) {
    text = text.replace(op.regex, op.replacement);
  }

  // 7. Potências: x^2, x^3, a^{n}
  text = text.replace(/([a-zA-Z0-9\(\)]+)\^2(?![0-9])/g, '$1 ao quadrado');
  text = text.replace(/([a-zA-Z0-9\(\)]+)\^3(?![0-9])/g, '$1 ao cubo');
  text = text.replace(/([a-zA-Z0-9\(\)]+)\^\{([^}]+)\}/g, '$1 elevado a $2');
  text = text.replace(/([a-zA-Z0-9\(\)]+)\^([a-zA-Z0-9]+)/g, '$1 elevado a $2');

  // 8. Subscritos: x_1, x_i, a_{min}
  text = text.replace(/([a-zA-Z]+)_\{([^}]+)\}/g, '$1 $2');
  text = text.replace(/([a-zA-Z]+)_([a-zA-Z0-9]+)/g, '$1 $2');

  // 9. Sinais e operadores aritméticos básicos
  // Menos unário antes de variável (ex: -b -> menos b)
  text = text.replace(/(^|[^a-zA-Z0-9])-\s*([a-zA-Z0-9])/g, '$1menos $2');
  // Menos binário (ex: a - b -> a menos b)
  text = text.replace(/([a-zA-Z0-9])\s*-\s*([a-zA-Z0-9])/g, '$1 menos $2');
  // Mais binário
  text = text.replace(/([a-zA-Z0-9])\s*\+\s*([a-zA-Z0-9])/g, '$1 mais $2');
  // Multiplicação implícita simples (ex: 2a -> 2 a, 4ac -> 4 a c)
  text = text.replace(/(\d+)([a-zA-Z])/g, '$1 $2');

  // 10. Símbolos de comparação e igualdade
  text = text.replace(/=/g, ' é igual a ');
  text = text.replace(/</g, ' menor que ');
  text = text.replace(/>/g, ' maior que ');

  // 11. Limpar chaves ou barras invertidas remanescentes
  text = text.replace(/[{}\\]/g, ' ');

  return text;
}

/**
 * Higieniza e formata o texto completo do Copiloto (Markdown + LaTeX + Códigos)
 * para leitura de áudio realista e fluida.
 */
export function formatTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  // 1. Remover blocos de código grandes (substituir por aviso breve de transição)
  result = result.replace(/```(?:[a-zA-Z0-9_-]+)?\s*[\s\S]*?```/g, ' . Bloco de código demonstrativo omitido. ');

  // 2. Extrair e traduzir blocos de fórmulas matemáticas em destaque ($$...$$)
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => {
    return ` . Expressão: ${formatLatexToSpeech(eq)} . `;
  });

  // 3. Extrair e traduzir fórmulas inline ($...$)
  result = result.replace(/\$([^$]+)\$/g, (_, eq) => {
    return ` ${formatLatexToSpeech(eq)} `;
  });

  // 4. Links em Markdown: [Título](url) -> Título
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Imagens ou mídias: ![alt](url) -> vazio
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // 6. Títulos de Markdown: ### Título -> Título.
  result = result.replace(/^#{1,6}\s*(.*)$/gm, '$1.');

  // 7. Citações: > Frase -> Frase.
  result = result.replace(/^>\s*(.*)$/gm, '$1.');

  // 8. Listas não ordenadas: - item ou * item -> item.
  result = result.replace(/^[\s]*[-*+]\s+(.*)$/gm, '$1.');

  // 9. Listas ordenadas: 1. item -> item.
  result = result.replace(/^[\s]*\d+\.\s+(.*)$/gm, '$1.');

  // 10. Negrito e Itálico: **texto**, __texto__, *texto*, _texto_
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2');
  result = result.replace(/(\*|_)(.*?)\1/g, '$2');

  // 11. Inline code: `variavel` -> variavel
  result = result.replace(/`([^`]+)`/g, '$1');

  // 12. Tags HTML remanescentes
  result = result.replace(/<[^>]*>/g, ' ');

  // 13. Caracteres decorativos ou pontuações duras que confundem o sintetizador
  result = result.replace(/[|~—_#]/g, ' ');

  // 14. Pontuação e Pausas: normalizar pontos múltiplos e espaçamento
  result = result.replace(/\.{2,}/g, '.');
  result = result.replace(/\s+([.,;:?!])/g, '$1');
  result = result.replace(/([.,;:?!])(?=[a-zA-ZÀ-ÿ])/g, '$1 ');

  // 15. Colapso de espaços múltiplos
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Divide o texto em sentenças naturais com limites de tamanho
 * para streaming ou síntese pausada fluida.
 */
export function splitIntoSentences(text, maxChars = 200) {
  if (!text) return [];

  const rawSentences = text
    .split(/(?<=[.?!;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sentences = [];
  let buffer = '';

  for (const s of rawSentences) {
    if ((buffer + ' ' + s).trim().length <= maxChars) {
      buffer = buffer ? `${buffer} ${s}` : s;
    } else {
      if (buffer) sentences.push(buffer);
      buffer = s;
    }
  }

  if (buffer) sentences.push(buffer);

  return sentences;
}

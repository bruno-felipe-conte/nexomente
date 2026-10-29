import { describe, it, expect } from 'vitest';
import {
  formatLatexToSpeech,
  formatTextForSpeech,
  splitIntoSentences
} from '../lib/audio/speechFormatter.js';

describe('speechFormatter - Tradução Fonética e Sanitização de Áudio', () => {
  it('converte fórmula de Bhaskara para linguagem falada fluida', () => {
    const bhaskara = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    const falada = formatLatexToSpeech(bhaskara);

    expect(falada).toContain('é igual a');
    expect(falada).toContain('menos b');
    expect(falada).toContain('mais ou menos');
    expect(falada).toContain('raiz quadrada de b ao quadrado menos 4 ac');
    expect(falada).toContain('tudo sobre 2 a');
  });

  it('converte letras gregas e raízes cúbicas corretamente', () => {
    const expr = '\\Delta = \\alpha + \\sqrt[3]{\\beta}';
    const falada = formatLatexToSpeech(expr);

    expect(falada).toContain('delta');
    expect(falada).toContain('alfa');
    expect(falada).toContain('raiz cúbica de');
    expect(falada).toContain('beta');
  });

  it('converte notação Big O para português falado', () => {
    const expr = 'O(\\log n)';
    const falada = formatLatexToSpeech(expr);

    expect(falada).toContain('ordem de log de n');
  });

  it('limpa markdown e preserva pontuação e pausas naturais', () => {
    const markdown = `
### Conceito Central
O resultado é **fundamental**:
- Item 1: \`calcular()\`
- Item 2: [Mais informações](https://link.com)

Considere a fórmula:
$$x^2 + y^2 = r^2$$

\`\`\`javascript
const code = true;
\`\`\`
    `.trim();

    const resultado = formatTextForSpeech(markdown);

    expect(resultado).not.toContain('###');
    expect(resultado).not.toContain('**');
    expect(resultado).not.toContain('https://');
    expect(resultado).not.toContain('const code = true');
    expect(resultado).toContain('ao quadrado');
    expect(resultado).toContain('Item 1: calcular().');
    expect(resultado).toContain('Item 2: Mais informações.');
  });

  it('divide textos longos em sentenças naturais', () => {
    const texto = 'Primeira sentença explicativa. Segunda sentença importante! Terceira sentença conclusiva? Quarta sentença final.';
    const sentencas = splitIntoSentences(texto, 60);

    expect(sentencas.length).toBeGreaterThan(1);
    expect(sentencas.join(' ')).toContain('Primeira sentença explicativa.');
    expect(sentencas.join(' ')).toContain('Quarta sentença final.');
  });
});

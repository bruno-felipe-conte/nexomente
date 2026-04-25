import { buildOutput } from '../lib/iaPrompts';

export function exportarParaTexto(questoes, opcoes = {}) {
  const {
    titulo = 'Banco de Questões',
    incluirGabarito = true,
    incluirJustificativas = true,
    formato = 'completo',
  } = opcoes;
  
  let conteudo = `═══════════════════════════════════════════════════════════════════
         ${titulo.toUpperCase()}
         Gerado em: ${new Date().toLocaleDateString('pt-BR')} | Questões: ${questoes.length}
═══════════════════════════════════════════════════════════════════
`;
  
  questoes.forEach((q, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    conteudo += '\n';
    conteudo += buildOutput(q, num, formato);
    conteudo += '\n═══════════════════════════════════════════════════════════════════';
  });
  
  if (incluirGabarito) {
    conteudo += '\n\n';
    conteudo += '───────────────────────────────────────────────────\n';
    conteudo += '                    GABARITO\n';
    conteudo += '───────────────────────────────────────────────────\n';
    
    questoes.forEach((q, idx) => {
      conteudo += `${String(idx + 1).padStart(3, '0')} - ${q.resposta_correta || '?'}  (${q.materia}) ${q.topico ? `| ${q.topico}` : ''}\n`;
    });
  }
  
  return conteudo;
}

export function exportarParaHTML(questoes, opcoes = {}) {
  const {
    titulo = 'Banco de Questões',
    estilo = 'prova',
  } = opcoes;
  
  const css = `
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
    h1 { text-align: center; font-size: 14pt; margin-bottom: 20px; }
    .questao { margin-bottom: 20px; page-break-inside: avoid; }
    .questao-num { font-weight: bold; }
    .enunciado { margin: 10px 0; }
    .alternativas { margin-left: 20px; }
    .alternativa { margin: 5px 0; }
    .gabarito { color: #006400; font-weight: bold; }
    .separador { border-top: 1px solid #000; margin: 20px 0; }
  `;
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>${css}</style>
</head>
<body>
  <h1>${titulo}</h1>
`;
  
  if (estilo === 'prova') {
    questoes.forEach((q, idx) => {
      const num = idx + 1;
      html += `
  <div class="questao">
    <div class="questao-num">[${num}] ${q.materia}${q.topico ? ` - ${q.topico}` : ''}</div>
    <div class="enunciado">${q.pergunta}</div>
    <div class="alternativas">
      ${q.opcoes.map(o => `<div class="alternativa">(${o.letra}) ${o.texto}</div>`).join('\n      ')}
    </div>
  </div>
  <div class="separador"></div>
`;
    });
  } else {
    questoes.forEach((q, idx) => {
      const num = idx + 1;
      const correta = q.opcoes.find(o => o.correta);
      
      html += `
  <div class="questao">
    <div class="questao-num">[${num}] ${q.pergunta}</div>
    <div class="alternativas">
      ${q.opcoes.map(o => `<div class="alternativa${o.correta ? ' gabarito' : ''}">(${o.letra}) ${o.texto}</div>`).join('\n      ')}
    </div>
    ${incluirJustificativas && correta ? `
    <div class="justificativa"><strong>Justificativa:</strong> ${correta.justificativa_correta || ''}</div>
    ` : ''}
  </div>
`;
    });
  }
  
  html += `
</body>
</html>`;
  
  return html;
}

export function exportarParaJSON(questoes, filename = 'questoes') {
  const data = {
    exportadoEm: new Date().toISOString(),
    total: questoes.length,
    questoes: questoes.map(q => ({
      id: q.id,
      materia: q.materia,
      topico: q.topico,
      banca: q.banca,
      ano: q.ano,
      nivel: q.nivel,
      tipo: q.tipo,
      pergunta: q.pergunta,
      resposta_correta: q.resposta_correta,
      opcoes: q.opcoes.map(o => ({
        letra: o.letra,
        texto: o.texto,
        correta: o.correta,
        justificativa_correta: o.justificativa_correta,
        justificativa_errada: o.justificativa_errada,
      })),
      fonte: q.fonte,
      dispositivo_legal: q.dispositivo_legal,
      tags: q.tags,
    })),
  };
  
  return JSON.stringify(data, null, 2);
}

export function baixarArquivo(conteudo, nome, tipo = 'text/plain') {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarDOC(questoes, opcoes = {}) {
  const html = exportarParaHTML(questoes, { ...opcoes, estilo: 'gabarito' });
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `questoes_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copiarGabarito(questoes) {
  const gabarito = questoes.map((q, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    return `${num} - ${q.resposta_correta || '?'}`;
  }).join('\n');
  
  navigator.clipboard.writeText(gabarito).then(() => {
    return true;
  }).catch(() => {
    return false;
  });
  
  return gabarito;
}
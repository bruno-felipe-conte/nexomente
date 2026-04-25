import { getModel, chat as lmChat } from './ai/lmStudioService';

const BANCAS_CONHECIDAS = {
  'fcc': { nome: 'FCC', desc: 'Fundação Carlos Chagas' },
  'cespe': { nome: 'CESPE', desc: 'Centro Brasileiro de Pesquisa' },
  'cebraspe': { nome: 'Cebraspe', desc: 'Novo nome do CESPE' },
  'fgv': { nome: 'FGV', desc: 'Fundação Getulio Vargas' },
  'ibfc': { nome: 'IBFC', desc: 'Instituto Brasileiro de Formação' },
  'vunesp': { nome: 'VUNESP', desc: 'Fundação Vunesp' },
  'copese': { nome: 'COPESE', desc: 'Coordenadoria de Processos Seletivos' },
  'makiyama': { nome: 'Makiyama', desc: 'Instituto Makiyama' },
  'quadrix': { nome: 'Quadrix', desc: 'Instituto Quadrix' },
  'idesp': { nome: 'IDESP', desc: 'Instituto de Desenvolvimento Educacional' },
};

function detectarBanca(texto) {
  const textoLower = texto.toLowerCase();
  for (const [key, val] of Object.entries(BANCAS_CONHECIDAS)) {
    if (textoLower.includes(key) || textoLower.includes(val.nome.toLowerCase()) || textoLower.includes(val.desc.toLowerCase())) {
      return { key, ...val };
    }
  }
  return null;
}

function detectarAno(texto) {
  const matches = texto.match(/\b(20\d{2}|19\d{2})\b/);
  if (matches) {
    const ano = parseInt(matches[0]);
    if (ano >= 2000 && ano <= new Date().getFullYear()) {
      return ano;
    }
  }
  return new Date().getFullYear();
}

function detectarMateria(texto) {
  const materiasComuns = [
    'direito constitucional', 'direito penal', 'direito administrativo',
    'direito civil', 'direito processual penal', 'direito processual civil',
    'português', 'matemática', 'raciocínio lógico', 'informática',
    'gestão de projetos', 'gestão de pessoas', 'administração pública',
    'contabilidade', 'finanças', 'economia', 'estatística',
    'história', 'geografia', 'atualidades', 'estatuto do servidor',
    'lei orgânica', 'constituição'
  ];
  const textoLower = texto.toLowerCase();
  for (const mat of materiasComuns) {
    if (textoLower.includes(mat)) {
      return mat.charAt(0).toUpperCase() + mat.slice(1);
    }
  }
  return 'Geral';
}

function parseTextoSimples(texto) {
  const perguntas = [];
  const lines = texto.split('\n').filter(l => l.trim());
  
  let perguntaAtual = null;
  let opcoesAtuais = [];
  let indiceOpcao = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    const matchPergunta = trimmed.match(/^(\d+)[.)]\s*(.+)/);
    if (matchPergunta) {
      if (perguntaAtual) {
        perguntas.push({
          pergunta: perguntaAtual,
          opcoes: opcoesAtuais,
          resposta_correta: null,
          tipo: 'multipla-escolha'
        });
      }
      perguntaAtual = matchPergunta[2].trim();
      opcoesAtuais = [];
      continue;
    }
    
    const matchOpcao = trimmed.match(/^([A-E])\)\s*(.+)/);
    if (matchOpcao && perguntaAtual) {
      opcoesAtuais.push({
        letra: matchOpcao[1],
        texto: matchOpcao[2].trim(),
        correta: false
      });
      continue;
    }
    
    const matchGabarito = trimmed.match(/^(?:gabarito|resposta)[\s:]*([A-E])/i);
    if (matchGabarito && perguntas.length > 0) {
      const gabarito = matchGabarito[1].toUpperCase();
      const ultima = perguntas[perguntas.length - 1];
      if (ultima) {
        ultima.opcoes.forEach(o => {
          o.correta = o.letra === gabarito;
        });
        ultima.resposta_correta = gabarito;
      }
      continue;
    }
    
    if (!perguntaAtual && trimmed.length > 20 && trimmed.length < 500) {
      perguntaAtual = trimmed;
    }
  }
  
  if (perguntaAtual) {
    perguntas.push({
      pergunta: perguntaAtual,
      opcoes: opcoesAtuais,
      resposta_correta: null,
      tipo: 'multipla-escolha'
    });
  }
  
  return perguntas;
}

function parseMarkdown(texto) {
  const perguntas = [];
  const blocos = texto.split(/#{1,3}\s+/).filter(b => b.trim());
  
  for (const bloco of blocos) {
    const linhas = bloco.split('\n').filter(l => l.trim());
    if (linhas.length === 0) continue;
    
    const primeiraLinha = linhas[0].trim();
    if (primeiraLinha.length < 10 || primeiraLinha.length > 300) continue;
    
    const opcoes = [];
    let respostaCorreta = null;
    let gabaritoEncontrado = null;
    
    for (const linha of linhas) {
      const match = linha.trim().match(/^([A-E])\)[\s*]*\*(.+?)\**\s*\(? correta\)?/i);
      if (match) {
        const letra = match[1].toUpperCase();
        const textoOp = match[2].replace(/\*+$/, '').trim();
        const correta = !!match[3] || linha.includes('✓') || linha.includes('✔') || linha.toLowerCase().includes('(correta)');
        
        opcoes.push({ letra, texto: textoOp, correta });
        if (correta) gabaritoEncontrado = letra;
      }
    }
    
    if (opcoes.length >= 2) {
      perguntas.push({
        pergunta: primeiraLinha,
        opcoes,
        resposta_correta: gabaritoEncontrado,
        tipo: 'multipla-escolha'
      });
    }
  }
  
  if (perguntas.length === 0) {
    return parseTextoSimples(texto);
  }
  
  return perguntas;
}

export async function parseArquivo(arquivo, tipoArquivo) {
  const texto = typeof arquivo === 'string' ? arquivo : '';
  
  const banca = detectarBanca(texto);
  const ano = detectarAno(texto);
  const materia = detectarMateria(texto);
  
  let preguntas;
  if (tipoArquivo === 'md') {
    preguntas = parseMarkdown(texto);
  } else {
    preguntas = parseTextoSimples(texto);
  }
  
  const perguntasProcessadas = preguntas.map((q, idx) => {
    return {
      id: `q_${Date.now()}_${idx}`,
      pergunta: q.pergunta,
      opcoes: q.opcoes.map(o => ({
        ...o,
        justificativa_correta: '',
        justificativa_errada: ''
      })),
      resposta_correta: q.resposta_correta,
      tipo: q.tipo,
      materia,
      topico: '',
      banca: banca?.nome || 'Desconhecida',
      ano,
      nivel: 'medio',
      fonte: '',
      dispositivo_legal: '',
      tags: [],
      created_at: new Date().toISOString()
    };
  });
  
  return {
    materia,
    banca: banca?.nome || 'Desconhecida',
    ano,
    total_questoes: perguntasProcessadas.length,
    questoes: preguntasProcessadas
  };
}

export async function gerarQuestoesComIA(texto, config = {}) {
  const {
    materia = 'Geral',
    topico = '',
    quantidade = 5,
    nivel = 'medio',
    banca = 'FCC',
    modelo = null
  } = config;
  
  const prompt = `
Você é um professor experiente em concursos públicos. Com base no conteúdo abaixo, gere ${quantidade} questões de múltipla escolha no estilo da banca ${banca}.

Cada questão deve ter:
- Uma pergunta clara e objetiva
- 5 alternativas (A, B, C, D, E)
- Apenas uma alternativa correta
- Justificativa para a resposta CORRETA (o "bizu" do professor)
- Justificativa para cada alternativa ERRADA (por que está errada)

Conteúdo:
${texto.slice(0, 3000)}

Responda em JSON válido com este formato:
{
  "questoes": [
    {
      "pergunta": "...",
      "resposta_correta": "A",
      "opcoes": [
        { "letra": "A", "texto": "...", "correta": false, "justificativa_correta": "", "justificativa_errada": "..." },
        { "letra": "B", "texto": "...", "correta": true, "justificativa_correta": "...", "justificativa_errada": "" },
        ...
      ]
    }
  ]
}
`.trim();
  
  try {
    const resposta = await lmChat([{ role: 'user', content: prompt }], { model: modelo });
    
    const jsonMatch = resposta.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const dados = JSON.parse(jsonMatch[0]);
      return dados.questoes.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}`,
        pergunta: q.pergunta,
        opcoes: q.opcoes,
        resposta_correta: q.resposta_correta,
        tipo: 'multipla-escolha',
        materia,
        topico,
        banca,
        nivel,
        fonte: '',
        dispositivo_legal: '',
        tags: [],
        created_at: new Date().toISOString()
      }));
    }
  } catch (e) {
    console.error('Erro ao gerar questões com IA:', e);
  }
  
  return [];
}

export { detectarBanca, detectarAno, detectarMateria };
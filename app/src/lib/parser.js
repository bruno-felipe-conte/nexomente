/**
 * parser.js — Lógica de extração de questões e integração com IA.
 * Reconstrução Total para máxima resiliência e tratamento de erros.
 */
import { aiChat } from './ai/aiProvider';

// --- UTILITÁRIOS ---

function detectarBanca(texto) {
  const bancas = ['FCC', 'FGV', 'CESPE', 'Cebraspe', 'VUNESP', 'IBFC', 'QUADRIX'];
  for (const b of bancas) {
    if (new RegExp(b, 'i').test(texto)) return b;
  }
  return 'Geral';
}

function detectarAno(texto) {
  const match = texto.match(/\b(20\d{2})\b/);
  return match ? match[1] : new Date().getFullYear().toString();
}

function detectarMateria(texto) {
  const materias = ['Direito', 'Português', 'Informática', 'Matemática', 'Raciocínio Lógico', 'Administração'];
  for (const m of materias) {
    if (new RegExp(m, 'i').test(texto)) return m;
  }
  return 'Geral';
}

/**
 * Extrai texto legível de arquivos PDF (suportando streams FlateDecode via DecompressionStream e blocos BT/ET).
 */
export async function extrairTextoDePDF(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const rawLatin1 = new TextDecoder('latin1').decode(bytes);
  const partesTexto = [];

  const extrairStringsDeOperadoresPDF = (conteudoStream) => {
    const blocos = [];
    // Captura strings literais entre parênteses (...) em blocos de texto PDF
    const regexParenteses = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")?/g;
    let m;
    while ((m = regexParenteses.exec(conteudoStream)) !== null) {
      const decodificado = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (/[a-zA-ZÀ-ÿ0-9]{2,}/.test(decodificado)) {
        blocos.push(decodificado);
      }
    }
    return blocos.join(' ');
  };

  // Tenta descomprimir streams FlateDecode se DecompressionStream estiver disponível
  if (typeof DecompressionStream !== 'undefined') {
    const regexStream = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    while ((match = regexStream.exec(rawLatin1)) !== null) {
      const streamBody = match[1];
      if (streamBody.length > 5_000_000) continue;
      const streamBytes = new Uint8Array(streamBody.length);
      for (let i = 0; i < streamBody.length; i++) {
        streamBytes[i] = streamBody.charCodeAt(i) & 0xff;
      }
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamBytes).catch(() => {});
        writer.close().catch(() => {});
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        const decompressedStr = new TextDecoder('latin1').decode(decompressedBuf);
        const extraido = extrairStringsDeOperadoresPDF(decompressedStr);
        if (extraido.trim().length > 10) partesTexto.push(extraido.trim());
      } catch {
        // Caso o stream não seja deflate puro, tenta extração direta
        const direto = extrairStringsDeOperadoresPDF(streamBody);
        if (direto.trim().length > 10) partesTexto.push(direto.trim());
      }
    }
  }

  if (partesTexto.length === 0) {
    const diretoGlobal = extrairStringsDeOperadoresPDF(rawLatin1);
    if (diretoGlobal.trim()) partesTexto.push(diretoGlobal.trim());
  }

  return partesTexto
    .join('\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// --- PARSERS DE TEXTO (FALLBACKS) ---

export function parseTextoSimples(texto) {
  if (!texto) return [];
  const linhas = texto.split('\n');
  const questoes = [];
  let atual = null;

  for (let linha of linhas) {
    const trimmed = linha.trim();
    if (!trimmed) continue;

    // Detectar pergunta (1. ou 01) ou Questão 1)
    const matchPergunta = trimmed.match(/^(\d+|Questão\s+\d+)[.)]\s*(.+)/i);
    if (matchPergunta) {
      if (atual) questoes.push(atual);
      atual = {
        pergunta: matchPergunta[2].trim(),
        opcoes: [],
        resposta_correta: ''
      };
      continue;
    }

    // Detectar opção (A) ou - A ou * A)
    const matchOpcao = trimmed.match(/^([A-Ea-e])[\s.)-]+\s*(.+)/);
    if (matchOpcao && atual) {
      const letra = matchOpcao[1].toUpperCase();
      const textoOp = matchOpcao[2].trim();

      // Checar se o texto já diz que é a correta
      const ehCorreta = /[\s(]correta[)\s]?$/i.test(textoOp);
      const textoLimpo = textoOp.replace(/[\s(]correta[)\s]?$/i, '').trim();

      atual.opcoes.push({
        letra,
        texto: textoLimpo,
        correta: ehCorreta,
        justificativa_correta: ehCorreta ? 'Identificada na fonte.' : '',
        justificativa_errada: ''
      });

      if (ehCorreta) atual.resposta_correta = letra;
      continue;
    }

    // Se não for nada e tivermos uma questão iniciada, anexa ao enunciado
    if (atual && atual.opcoes.length === 0) {
      atual.pergunta += ' ' + trimmed;
    }
  }

  if (atual) questoes.push(atual);
  return questoes;
}

// --- EXTRATOR RESILIENTE DE QUESTÕES (JSON E STREAM TRUNCADO) ---

export function extrairQuestoesDeResposta(raw) {
  if (!raw || typeof raw !== 'string') return [];

  // 1. Limpar blocos de código Markdown
  let limpo = raw.trim();
  limpo = limpo.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // 2. Tentar parse direto de JSON completo
  try {
    const parsed = JSON.parse(limpo);
    const lista = Array.isArray(parsed) ? parsed : (parsed.questoes || parsed.questions || parsed.itens || []);
    if (Array.isArray(lista) && lista.length > 0) return lista;
  } catch (err) {
    void err;
  }

  // 3. Tentar substring entre o primeiro { e o último }
  const firstBrace = limpo.indexOf('{');
  const lastBrace = limpo.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(limpo.substring(firstBrace, lastBrace + 1));
      const lista = Array.isArray(parsed) ? parsed : (parsed.questoes || parsed.questions || parsed.itens || []);
      if (Array.isArray(lista) && lista.length > 0) return lista;
    } catch (err) {
      void err;
    }
  }

  // 4. Tentar substring entre o primeiro [ e o último ]
  const firstBracket = limpo.indexOf('[');
  const lastBracket = limpo.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const parsed = JSON.parse(limpo.substring(firstBracket, lastBracket + 1));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (err) {
      void err;
    }
  }

  // 5. Recuperação de objetos individuais de JSON truncado (quando o modelo atinge o limite de tokens)
  const regexObjetos = /\{\s*"pergunta"\s*:\s*"[\s\S]*?"\s*,\s*"resposta_correta"[\s\S]*?"opcoes"\s*:\s*\[[\s\S]*?\]\s*\}/g;
  const encontrados = [];
  let matchObj;
  while ((matchObj = regexObjetos.exec(raw)) !== null) {
    try {
      const q = JSON.parse(matchObj[0]);
      if (q.pergunta && Array.isArray(q.opcoes)) {
        encontrados.push(q);
      }
    } catch (err) {
      void err;
    }
  }
  if (encontrados.length > 0) return encontrados;

  // 6. Fallback para parser de texto simples
  return parseTextoSimples(raw);
}

// --- CHUNKING INTELIGENTE + BM25 (ANTI-ALUCINAÇÃO PARA PDF/TEXTO GRANDE) ---

const STOPWORDS_PT = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'que', 'se', 'ao', 'aos', 'as', 'os',
  'como', 'mais', 'mas', 'ou', 'ser', 'sao', 'foi', 'foram', 'esta', 'este', 'isso', 'isto',
  'pelo', 'pela', 'pelos', 'pelas', 'seu', 'sua', 'seus', 'suas', 'nao', 'sim', 'tambem', 'muito'
]);

function tokenizarBM25(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS_PT.has(t));
}

/**
 * Divide documentos ou PDFs grandes em blocos semânticos limpos (~1800-2400 chars),
 * descartando sumários/ruído e ranqueando via BM25 (quando há tópico/matéria)
 * ou amostragem estratificada (para cobrir início, meio e fim do documento inteiro).
 */
export function selecionarChunksRelevantes(textoBruto, { numChunks = 1, query = '', chunkSize = 2200 } = {}) {
  const limpo = (textoBruto || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!limpo) return [];
  if (limpo.length <= chunkSize * 1.3) return [limpo];

  // Quebra respeitando parágrafos ou sentenças
  const paragrafos = limpo.split(/\n\n+/);
  const chunks = [];
  let buffer = '';

  for (const p of paragrafos) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Ignora linhas típicas de sumário pontilhado ("Capítulo 1 ....... 12")
    if (/\.{4,}\s*\d+$/.test(trimmed)) continue;

    if ((buffer + '\n\n' + trimmed).length <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    } else {
      if (buffer.length >= 200) chunks.push(buffer);
      // Se um único parágrafo for gigante, fatia por sentenças
      if (trimmed.length > chunkSize) {
        for (let i = 0; i < trimmed.length; i += chunkSize) {
          const fatia = trimmed.slice(i, i + chunkSize).trim();
          if (fatia.length >= 150) chunks.push(fatia);
        }
        buffer = '';
      } else {
        buffer = trimmed;
      }
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  if (chunks.length === 0) return [limpo.slice(0, chunkSize)];
  if (chunks.length <= numChunks) return chunks;

  const queryTerms = tokenizarBM25(query);

  // Se houver termos de busca (tópico/matéria específica), ranqueia por BM25 + densidade informacional
  if (queryTerms.length > 0) {
    const k1 = 1.5;
    const b = 0.75;
    const docTokens = chunks.map(tokenizarBM25);
    const avgDl = docTokens.reduce((s, d) => s + d.length, 0) / docTokens.length || 1;

    const df = {};
    for (const term of queryTerms) {
      df[term] = docTokens.filter(d => d.includes(term)).length;
    }

    const scored = chunks.map((chunk, idx) => {
      const tokens = docTokens[idx];
      const dl = tokens.length || 1;
      let score = 0;

      for (const term of queryTerms) {
        const tf = tokens.filter(t => t === term).length;
        if (tf > 0) {
          const idf = Math.log(1 + (chunks.length - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5));
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgDl))));
        }
      }

      // Bônus leve por densidade de conteúdo (evita blocos muito curtos ou só de títulos)
      const densityBonus = Math.min(1, chunk.length / 1200) * 0.25;
      return { chunk, idx, score: score + densityBonus };
    });

    const temMatch = scored.some(s => s.score > 0.3);
    if (temMatch) {
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, numChunks)
        .sort((a, b) => a.idx - b.idx) // preserva ordem cronológica do documento
        .map(s => s.chunk);
    }
  }

  // Amostragem Estratificada Uniforme: cobre início, meio e fim do PDF grande sem repetir
  const selecionados = [];
  const step = chunks.length / numChunks;
  for (let i = 0; i < numChunks; i++) {
    const targetIdx = Math.min(chunks.length - 1, Math.floor(i * step));
    selecionados.push(chunks[targetIdx]);
  }
  return selecionados;
}

// --- SCHEMA GRAMMAR ESTRITO PARA GERAÇÃO RÁPIDA E SEM ALUCINAÇÃO ---

export const QUESTOES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          citacao_base: { type: 'string' },
          pergunta: { type: 'string' },
          resposta_correta: { type: 'string', enum: ['A', 'B', 'C', 'D', 'V', 'F'] },
          explicacao: { type: 'string' },
          opcoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                letra: { type: 'string' },
                texto: { type: 'string' },
                correta: { type: 'boolean' }
              },
              required: ['letra', 'texto', 'correta']
            }
          }
        },
        required: ['citacao_base', 'pergunta', 'resposta_correta', 'explicacao', 'opcoes']
      }
    }
  },
  required: ['questoes']
};

// --- INTEGRAÇÃO COM IA (PIPELINE MICRO-LOTES + BM25 + JSON GRAMMAR) ---

export async function gerarQuestoesComIA(textoOuConfig, configOpt = {}) {
  // Suporte a chamada com (texto, config) ou (config)
  let texto = typeof textoOuConfig === 'string'
    ? textoOuConfig
    : (textoOuConfig?.texto || textoOuConfig?.conteudo || '');
  let config = typeof textoOuConfig === 'object' && !Array.isArray(textoOuConfig) && !configOpt.quantidade
    ? { ...textoOuConfig, ...configOpt }
    : configOpt;

  const {
    quantidade = 5,
    materia = 'Geral',
    topico = '',
    banca = 'Geral',
    tipo = 'multipla-escolha',
    provider = null,
    modelo = null,
    onProgress = null,
  } = config;

  const nivel = config.nivel || config.dificuldade || 'Médio';
  const textoBruto = (texto || '').trim();

  if (!textoBruto) {
    return { success: false, erro: 'Texto de entrada vazio para geração de questões.', code: 'ERR-GEN-000' };
  }

  const instrucaoTipo = tipo === 'v-f'
    ? 'questões de Verdadeiro ou Falso (onde cada questão possui duas opções: "V" e "F")'
    : tipo === 'discursiva'
    ? 'questões discursivas com resposta esperada na explicação'
    : 'questões objetivas de múltipla escolha com 4 opções (A, B, C, D)';

  // Divide em micro-lotes de até 5 questões para nunca estourar a janela de contexto nem alucinar
  const TAMANHO_MAX_LOTE = 5;
  const totalSolicitado = Math.max(1, Number(quantidade) || 5);
  const numLotes = Math.ceil(totalSolicitado / TAMANHO_MAX_LOTE);

  // Seleciona os melhores trechos do documento via BM25 ou amostragem estratificada do PDF
  const queryBM25 = [topico, materia !== 'Geral' ? materia : ''].filter(Boolean).join(' ');
  const chunks = selecionarChunksRelevantes(textoBruto, {
    numChunks: numLotes,
    query: queryBM25,
    chunkSize: 2800
  });

  try {
    console.log(`[GERADOR] Pipeline Micro-Lotes iniciado via ${provider || 'Global'}: ${totalSolicitado} questões em ${numLotes} lote(s)`);

    const todasExtraidas = [];
    const perguntasJaGeradas = new Set();
    let ultimoErro = null;

    for (let loteIdx = 0; loteIdx < numLotes; loteIdx++) {
      const restantes = totalSolicitado - todasExtraidas.length;
      if (restantes <= 0) break;

      const qtdLote = Math.min(TAMANHO_MAX_LOTE, restantes);
      const chunkTexto = chunks[loteIdx % chunks.length] || textoBruto.slice(0, 3500);

      const avisoNaoRepetir = perguntasJaGeradas.size > 0
        ? `\nNão repita perguntas já abordadas: ${Array.from(perguntasJaGeradas).slice(-5).join(' | ')}`
        : '';

      const prompt = `Gere exatamente ${qtdLote} ${instrucaoTipo} baseadas ESTRITAMENTE nos fatos presentes no Texto Base abaixo.
Banca: ${banca} | Nível: ${nivel} | Matéria: ${materia}${topico ? ` | Tópico: ${topico}` : ''}${avisoNaoRepetir}

REGRAS ANTI-ALUCINAÇÃO OBRIGATÓRIAS:
1. Antes de criar cada pergunta, preencha "citacao_base" com o fato ou trecho exato do Texto Base que comprova o gabarito.
2. NUNCA invente informações, datas ou conceitos que não estejam explícitos no Texto Base.
3. Responda EXCLUSIVAMENTE no seguinte formato JSON:
{
  "questoes": [
    {
      "citacao_base": "Trecho curto extraído do texto que fundamenta a resposta...",
      "pergunta": "Enunciado claro e objetivo da questão...",
      "resposta_correta": "A",
      "explicacao": "Justificativa concisa explicando por que a alternativa está correta segundo o texto...",
      "opcoes": [
        { "letra": "A", "texto": "Opção A", "correta": true },
        { "letra": "B", "texto": "Opção B", "correta": false },
        { "letra": "C", "texto": "Opção C", "correta": false },
        { "letra": "D", "texto": "Opção D", "correta": false }
      ]
    }
  ]
}

Texto Base (Trecho ${loteIdx + 1}/${numLotes}):
${chunkTexto}`;

      // Orçamento enxuto de tokens por micro-lote (2x mais rápido que o JSON verboso antigo)
      const tokensLote = Math.max(900, qtdLote * 260);

      const resposta = await aiChat([
        {
          role: 'system',
          content: 'Você é um examinador sênior de concursos e provas acadêmicas. Você só cria questões ancoradas nos fatos literais do texto fornecido e responde estritamente em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        provider,
        model: modelo,
        max_tokens: tokensLote,
        temperature: 0.2,
        jsonSchema: QUESTOES_JSON_SCHEMA
      });

      if (!resposta.success) {
        ultimoErro = resposta.error || 'Falha na conexão com a IA';
        continue;
      }

      const raw = (resposta.content || resposta.response || '').trim();
      if (!raw) {
        ultimoErro = 'IA retornou resposta vazia';
        continue;
      }

      const extraidasLote = extrairQuestoesDeResposta(raw);
      for (const q of extraidasLote) {
        const chavePergunta = (q.pergunta || q.enunciado || '').trim().toLowerCase();
        if (chavePergunta && !perguntasJaGeradas.has(chavePergunta)) {
          perguntasJaGeradas.add(chavePergunta);
          todasExtraidas.push(q);
        }
      }

      if (typeof onProgress === 'function') {
        const pct = Math.min(92, Math.round(((loteIdx + 1) / numLotes) * 85) + 10);
        onProgress(pct, todasExtraidas.length);
      }
    }

    if (todasExtraidas.length === 0) {
      if (ultimoErro === 'IA retornou resposta vazia') {
        return { success: false, erro: 'IA retornou resposta vazia', code: 'ERR-GEN-002' };
      }
      if (ultimoErro) {
        return { success: false, erro: ultimoErro, code: 'ERR-GEN-001' };
      }
      return { success: false, erro: 'Não foi possível identificar questões na resposta da IA.', code: 'ERR-GEN-003' };
    }

    // Processar e normalizar para o formato oficial do NexoMente
    const processadas = todasExtraidas.slice(0, totalSolicitado).map((q, idx) => {
      const explicacaoGeral = q.explicacao || q.justificativa || q.citacao_base || '';

      // Determina a letra correta primeiro
      let corretaDefinida = (q.resposta_correta || '').toUpperCase().trim();
      const opcoesBrutas = Array.isArray(q.opcoes) ? q.opcoes : [];
      if (!corretaDefinida && opcoesBrutas.length > 0) {
        const achada = opcoesBrutas.find(o => o.correta);
        corretaDefinida = achada ? (achada.letra || 'A').toUpperCase() : 'A';
      }

      const opcoesNormalizadas = opcoesBrutas.map((o, oIdx) => {
        const letraPadrao = ['A', 'B', 'C', 'D', 'E'][oIdx] || String.fromCharCode(65 + oIdx);
        const letra = (o.letra || letraPadrao).toUpperCase();
        const ehCorreta = Boolean(o.correta) || letra === corretaDefinida;
        return {
          letra,
          texto: o.texto || o.opcao || 'Opção sem texto',
          correta: ehCorreta,
          justificativa_correta: ehCorreta
            ? (o.justificativa_correta || explicacaoGeral || 'Fundamentado no texto base.')
            : (o.justificativa_correta || ''),
          justificativa_errada: !ehCorreta
            ? (o.justificativa_errada || (q.citacao_base ? `Incorreta segundo o trecho: "${q.citacao_base}"` : ''))
            : ''
        };
      });

      if (!corretaDefinida && opcoesNormalizadas.length > 0) {
        corretaDefinida = opcoesNormalizadas[0].letra;
      }

      return {
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        pergunta: q.pergunta || q.enunciado || 'Questão sem enunciado',
        opcoes: opcoesNormalizadas,
        resposta_correta: corretaDefinida || 'A',
        tipo,
        materia,
        topico,
        banca,
        nivel,
        fonte: 'Gerado por IA',
        dispositivo_legal: q.dispositivo_legal || q.citacao_base || '',
        tags: Array.isArray(q.tags) ? q.tags : [],
        created_at: new Date().toISOString()
      };
    });

    return { success: true, total: processadas.length, questoes: processadas };

  } catch (err) {
    return { success: false, erro: err.message, code: 'ERR-GEN-005' };
  }
}

// --- PARSER GERAL DE ARQUIVO ---

export async function parseArquivo(textoEntrada, _tipoArquivo = 'txt') {
  if (!textoEntrada) return { success: false, erro: 'Texto vazio' };

  const banca = detectarBanca(textoEntrada);
  const ano = detectarAno(textoEntrada);
  const materia = detectarMateria(textoEntrada);

  const puras = parseTextoSimples(textoEntrada);

  if (puras.length === 0) {
    return { success: false, erro: 'Nenhuma questão identificada no texto.', code: 'ERR-GEN-003' };
  }

  const formatadas = puras.map((q, idx) => ({
    id: `q_man_${Date.now()}_${idx}`,
    pergunta: q.pergunta,
    opcoes: q.opcoes,
    resposta_correta: q.resposta_correta,
    tipo: 'multipla-escolha',
    materia,
    topico: '',
    banca,
    ano,
    fonte: 'Processamento Manual',
    dispositivo_legal: '',
    tags: [],
    created_at: new Date().toISOString()
  }));

  return { success: true, total: formatadas.length, questoes: formatadas };
}
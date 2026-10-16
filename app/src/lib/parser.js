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

// --- INTEGRAÇÃO COM IA ---

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
    modelo = null
  } = config;

  const nivel = config.nivel || config.dificuldade || 'Médio';
  const textoLimpo = (texto || '').slice(0, 4500);

  if (!textoLimpo.trim()) {
    return { success: false, erro: 'Texto de entrada vazio para geração de questões.', code: 'ERR-GEN-000' };
  }

  const instrucaoTipo = tipo === 'v-f'
    ? 'questões de Verdadeiro ou Falso (onde cada questão possui duas opções: "V" e "F")'
    : tipo === 'discursiva'
    ? 'questões discursivas com critérios e resposta esperada na justificativa'
    : 'questões objetivas de múltipla escolha com 4 opções (A, B, C, D)';

  const prompt = `Gere exatamente ${quantidade} ${instrucaoTipo} baseadas estritamente no texto fornecido.
Banca: ${banca}
Nível de Dificuldade: ${nivel}
Matéria: ${materia}

Você DEVE responder exclusivamente no seguinte formato JSON estrito:
{
  "questoes": [
    {
      "pergunta": "Enunciado claro e contextualizado da questão...",
      "resposta_correta": "A",
      "opcoes": [
        { "letra": "A", "texto": "Opção A", "correta": true, "justificativa_correta": "Por que esta opção é a correta...", "justificativa_errada": "" },
        { "letra": "B", "texto": "Opção B", "correta": false, "justificativa_correta": "", "justificativa_errada": "Por que esta opção está incorreta..." },
        { "letra": "C", "texto": "Opção C", "correta": false, "justificativa_correta": "", "justificativa_errada": "Por que esta opção está incorreta..." },
        { "letra": "D", "texto": "Opção D", "correta": false, "justificativa_correta": "", "justificativa_errada": "Por que esta opção está incorreta..." }
      ]
    }
  ]
}

Texto Base:
${textoLimpo}`;

  try {
    console.log(`[GERADOR] Chamando IA via ${provider || 'Global'} (${quantidade} questões, tipo: ${tipo})`);
    
    // Aloca tokens suficientes para o número solicitado de questões em JSON
    const tokensNecessarios = Math.max(1600, Number(quantidade || 5) * 450);

    const resposta = await aiChat([
      {
        role: 'system',
        content: 'Você é um examinador e gerador sênior de questões de concursos e exames acadêmicos. Responda ESTRITAMENTE em formato JSON puro, sem comentários fora do JSON, sem saudações e sem explicações externas.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      provider,
      model: modelo,
      max_tokens: tokensNecessarios,
      temperature: 0.25
    });

    if (!resposta.success) {
      return { success: false, erro: resposta.error || 'Falha na conexão com a IA', code: 'ERR-GEN-001' };
    }

    const raw = (resposta.content || resposta.response || '').trim();
    if (!raw) return { success: false, erro: 'IA retornou resposta vazia', code: 'ERR-GEN-002' };

    const extraidas = extrairQuestoesDeResposta(raw);

    if (!extraidas || extraidas.length === 0) {
      console.warn('[GERADOR] Nenhuma questão extraída da resposta bruta:\n', raw);
      return { success: false, erro: 'Não foi possível identificar questões na resposta da IA.', code: 'ERR-GEN-003' };
    }

    // Processar e normalizar para o formato oficial do NexoMente
    const processadas = extraidas.map((q, idx) => {
      const opcoesNormalizadas = (q.opcoes || []).map((o, oIdx) => {
        const letraPadrao = ['A', 'B', 'C', 'D', 'E'][oIdx] || String.fromCharCode(65 + oIdx);
        return {
          letra: (o.letra || letraPadrao).toUpperCase(),
          texto: o.texto || o.opcao || 'Opção sem texto',
          correta: Boolean(o.correta),
          justificativa_correta: o.justificativa_correta || '',
          justificativa_errada: o.justificativa_errada || ''
        };
      });

      // Garante que a resposta correta corresponda a uma opção válida
      let corretaDefinida = (q.resposta_correta || '').toUpperCase();
      if (!corretaDefinida && opcoesNormalizadas.length > 0) {
        const achada = opcoesNormalizadas.find(o => o.correta);
        corretaDefinida = achada ? achada.letra : opcoesNormalizadas[0].letra;
      }

      // Garante flag correta: true na opção correspondente
      opcoesNormalizadas.forEach(o => {
        if (o.letra === corretaDefinida) o.correta = true;
      });

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
        dispositivo_legal: q.dispositivo_legal || '',
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
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

// --- INTEGRAÇÃO COM IA ---

export async function gerarQuestoesComIA(texto, config) {
  const { 
    quantidade = 5, 
    materia = 'Geral', 
    topico = '', 
    banca = 'Geral', 
    nivel = 'Médio',
    provider = null,
    modelo = null
  } = config;
  
  const prompt = `
[SISTEMA: RESPONDA APENAS EM JSON VÁLIDO. SEM TEXTO EXTRA.]
Gere ${quantidade} questões de múltipla escolha sobre o conteúdo abaixo.
Banca: ${banca}, Nível: ${nivel}, Matéria: ${materia}.

Formato JSON:
{
  "questoes": [
    {
      "pergunta": "...",
      "resposta_correta": "A",
      "opcoes": [
        { "letra": "A", "texto": "...", "correta": true, "justificativa_correta": "...", "justificativa_errada": "" },
        { "letra": "B", "texto": "...", "correta": false, "justificativa_correta": "", "justificativa_errada": "..." }
      ]
    }
  ]
}

Conteúdo:
${texto.slice(0, 4000)}
`.trim();

  try {
    console.log(`[GERADOR] Chamando IA via ${provider || 'Global'}`);
    const resposta = await aiChat([{ role: 'user', content: prompt }], { provider, model: modelo });
    
    if (!resposta.success) {
      return { success: false, erro: resposta.error || 'Falha na conexão com a IA', code: 'ERR-GEN-001' };
    }

    const raw = (resposta.content || '').trim();
    if (!raw) return { success: false, erro: 'IA retornou resposta vazia', code: 'ERR-GEN-002' };

    // Tentar extrair JSON
    let extraidas = [];
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questoes && Array.isArray(parsed.questoes)) {
          extraidas = parsed.questoes;
        }
      } catch (e) {
        console.warn('[GERADOR] JSON quebrado, tentando fallback...');
      }
    }

    // Se falhar o JSON, usa o motor de leitura de texto
    if (extraidas.length === 0) {
      extraidas = parseTextoSimples(raw);
    }

    if (extraidas.length === 0) {
      return { success: false, erro: 'Não foi possível identificar questões na resposta da IA.', code: 'ERR-GEN-003' };
    }

    // Processar para o formato do app
    const processadas = extraidas.map((q, idx) => ({
      id: `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2,5)}`,
      pergunta: q.pergunta || 'Questão sem enunciado',
      opcoes: (q.opcoes || []).map(o => ({
        letra: o.letra || '?',
        texto: o.texto || 'Opção vazia',
        correta: o.correta || false,
        justificativa_correta: o.justificativa_correta || '',
        justificativa_errada: o.justificativa_errada || ''
      })),
      resposta_correta: q.resposta_correta || (q.opcoes?.find(o => o.correta)?.letra) || 'A',
      tipo: 'multipla-escolha',
      materia,
      topico,
      banca,
      nivel,
      fonte: 'Gerado por IA',
      dispositivo_legal: '',
      tags: [],
      created_at: new Date().toISOString()
    }));

    return { success: true, total: processadas.length, questoes: processadas };

  } catch (err) {
    return { success: false, erro: err.message, code: 'ERR-GEN-005' };
  }
}

// --- PARSER GERAL DE ARQUIVO ---

export async function parseArquivo(textoEntrada, tipoArquivo = 'txt') {
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
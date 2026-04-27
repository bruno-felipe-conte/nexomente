export const PROMPTS_GERACAO = {
  multipla_escolha: `Você é um professor experiente em concursos públicos. Com base no conteúdo abaixo, gere {quantidade} questões de múltipla escolha no estilo da banca {banca}.

Cada questão deve ter:
- Uma pergunta clara e objetiva sobre o conceito principal
- 5 alternativas (A, B, C, D, E)
- Apenas uma alternativa correta
- Justificativa para a resposta CORRETA (explicação pedagógica)
- Justificativa para cada alternativa ERRADA (por que está errada)

Responda APENAS em JSON válido:`,

  verdade_sim_nao: `Você é um professor experiente em concursos públicos. Gere {quantidade} questões de verdadeiro ou falso baseadas no conteúdo abaixo.

Cada questão deve ter:
- Uma afirmação clara
- Indicar se é verdadeira ou falsa
- Justificativa para a resposta

Responda APENAS em JSON válido:`,

 lacunas: `Você é um professor experiente em concursos públicos. Gere {quantidade} questões de preenchamento de lacunas baseadas no conteúdo abaixo.

Cada questão deve ter:
- Uma frase com 1-2 lacunasindicated por ___
- A resposta correta para cada lacuna

Responda APENAS em JSON válido:`,
};

export const PROMPTS_ANALISE = {
  justificativa_correta: `Analise a questão abaixo e forneça uma justificativa pedagógica para a resposta correta. O "bizu" do professor.

Questão: {pergunta}
Alternativa correta: {resposta_correta}
Contexto: {contexto}

Forneça uma explicação clara e didática.`,
  
  justificativa_errada: `Analise por que a alternativa {letra} está errada nesta questão:

Questão: {pergunta}
Alternativa ({letra}): {texto_alternativa}

Forneça uma explicação breve e clara.`,
  
  dispositivo_legal: `Com base na questão abaixo, identifique o dispositivo legal applicable (artigo de lei, constitutional, etc).

Questão: {pergunta}`,
  
  topico: `Identifique o tópico/conceito principal desta questão de {materia}:

{pergunta}

Responda apenas com o nome do tópico.`,
};

export const TEMPLATES_OUTPUT = {
  simples: `{num}) {pergunta}

{opcoesFormatadas}

GABARITO: {gabarito}`,

  completo: `[{num}] MATÉRIA: {materia}
      TÓPICO: {topico}
      BANCA: {banca} - {ano}
      NÍVEL: {nivel}

      {pergunta}

      {opcoesFormatadas}

      ────────────────────────────────────────────────────
      GABARITO: {gabarito}
      JUSTIFICATIVA:
      {justificativa_correta}

      ANÁLISE DAS ALTERNATIVAS ERRADAS:
      {justificativas_erradas}
      ────────────────────────────────────────────────────
      DISPOSITIVO: {dispositivo}`,
};

export function buildPrompt(tipo, config) {
  const template = PROMPTS_GERACAO[tipo] || PROMPTS_GERACAO.multipla_escolha;
  return template
    .replace('{quantidade}', config.quantidade || 5)
    .replace('{banca}', config.banca || 'FCC')
    .replace('{materia}', config.materia || 'Geral');
}

export function buildOutput(questao, num, template = 'completo') {
  const t = TEMPLATES_OUTPUT[template] || TEMPLATES_OUTPUT.completo;
  
  const opcoesFormatadas = questao.opcoes
    .map(o => `(${o.letra}) ${o.texto}`)
    .join('\n      ');
  
  const justificativasErradas = questao.opcoes
    .filter(o => !o.correta && o.justificativa_errada)
    .map(o => `${o.letra}) ${o.justificativa_errada}`)
    .join('\n      ');
  
  const correta = questao.opcoes.find(o => o.correta);
  
  return t
    .replace(/{num}/g, num)
    .replace('{pergunta}', questao.pergunta)
    .replace('{opcoesFormatadas}', opcoesFormatadas)
    .replace('{gabarito}', questao.resposta_correta)
    .replace('{materia}', questao.materia)
    .replace('{topico}', questao.topico || 'Geral')
    .replace('{banca}', questao.banca)
    .replace('{ano}', questao.ano)
    .replace('{nivel}', questao.nivel)
    .replace('{justificativa_correta}', correta?.justificativa_correta || '')
    .replace('{justificativas_erradas}', justificativasErradas)
    .replace('{dispositivo}', questao.dispositivo_legal || '');
}
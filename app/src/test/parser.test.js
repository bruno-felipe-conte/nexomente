import { describe, it, expect, vi } from 'vitest';
import { extrairQuestoesDeResposta, parseTextoSimples, gerarQuestoesComIA, selecionarChunksRelevantes } from '../lib/parser';
import * as aiProvider from '../lib/ai/aiProvider';

describe('Parser de Questões e Extração Resiliente', () => {
  it('extrai questões de JSON limpo padrão', () => {
    const raw = JSON.stringify({
      questoes: [
        {
          pergunta: 'O que foi a Queda da Bastilha?',
          resposta_correta: 'A',
          opcoes: [
            { letra: 'A', texto: 'Marco inicial da Revolução Francesa', correta: true },
            { letra: 'B', texto: 'Fim do Império Romano', correta: false }
          ]
        }
      ]
    });

    const resultado = extrairQuestoesDeResposta(raw);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].pergunta).toBe('O que foi a Queda da Bastilha?');
    expect(resultado[0].resposta_correta).toBe('A');
  });

  it('extrai questões envolvidas em blocos Markdown ```json ... ```', () => {
    const raw = `Com certeza! Aqui estão as questões:
\`\`\`json
{
  "questoes": [
    {
      "pergunta": "Qual a velocidade da luz no vácuo?",
      "resposta_correta": "B",
      "opcoes": [
        { "letra": "A", "texto": "300 km/h", "correta": false },
        { "letra": "B", "texto": "Aproximadamente 300.000 km/s", "correta": true }
      ]
    }
  ]
}
\`\`\`
Espero ter ajudado!`;

    const resultado = extrairQuestoesDeResposta(raw);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].pergunta).toContain('velocidade da luz');
    expect(resultado[0].resposta_correta).toBe('B');
  });

  it('recupera questões completas mesmo se o stream JSON foi truncado no final', () => {
    // Simula resposta cortada mid-stream pelo limite de tokens
    const raw = `\`\`\`json
{
  "questoes": [
    {
      "pergunta": "Quem pintou a Mona Lisa?",
      "resposta_correta": "A",
      "opcoes": [
        { "letra": "A", "texto": "Leonardo da Vinci", "correta": true },
        { "letra": "B", "texto": "Michelangelo", "correta": false }
      ]
    },
    {
      "pergunta": "Qual a capital da França?",
      "resposta_correta": "C",
      "opcoes": [
        { "letra": "A", "texto": "Londres", "correta": false },
        { "letra": "B", "texto": "Berlim", "correta": false },
        { "letra": "C", "texto": "Paris", "correta": true }
      ]
    },
    {
      "pergunta": "Quem descobriu o Brasil?",
      "resposta_correta": "A",
      "opcoes": [
        { "letra": "A", "texto": "Pedro Álvares Cabral", "correta": true`;

    const resultado = extrairQuestoesDeResposta(raw);
    expect(resultado.length).toBeGreaterThanOrEqual(2);
    expect(resultado[0].pergunta).toContain('Mona Lisa');
    expect(resultado[1].pergunta).toContain('capital da França');
  });

  it('realiza fallback para texto simples estruturado quando não há JSON', () => {
    const texto = `1. Qual a capital do Brasil?
A) São Paulo
B) Brasília (correta)
C) Rio de Janeiro`;

    const resultado = parseTextoSimples(texto);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].pergunta).toBe('Qual a capital do Brasil?');
    expect(resultado[0].resposta_correta).toBe('B');
  });

  it('gerarQuestoesComIA lida com formato objeto unificado, JSON Schema e ancoragem anti-alucinação', async () => {
    const mockAiChat = vi.spyOn(aiProvider, 'aiChat').mockResolvedValueOnce({
      success: true,
      content: JSON.stringify({
        questoes: [
          {
            citacao_base: 'O Tratado de Tordesilhas foi assinado em 1494.',
            pergunta: 'Questão gerada via mock',
            resposta_correta: 'A',
            explicacao: 'Conforme o trecho literal do tratado.',
            opcoes: [
              { letra: 'A', texto: 'Opção 1', correta: true },
              { letra: 'B', texto: 'Opção 2', correta: false }
            ]
          }
        ]
      })
    });

    const res = await gerarQuestoesComIA({
      texto: 'Texto de teste para simulado',
      quantidade: 1,
      materia: 'História',
      dificuldade: 'difícil'
    });

    expect(res.success).toBe(true);
    expect(res.total).toBe(1);
    expect(res.questoes[0].materia).toBe('História');
    expect(res.questoes[0].nivel).toBe('difícil');
    expect(res.questoes[0].dispositivo_legal).toContain('1494');
    expect(res.questoes[0].opcoes[0].justificativa_correta).toContain('Conforme o trecho');
    expect(mockAiChat).toHaveBeenCalled();

    mockAiChat.mockRestore();
  });

  it('selecionarChunksRelevantes prioriza blocos com maior score BM25 para o tópico em documentos grandes', () => {
    const blocoIntro = 'A biologia celular estuda as células e suas organelas fundamentais. '.repeat(25);
    const blocoAlvo = 'O controle de constitucionalidade concentrado no Supremo Tribunal Federal ocorre via ADI e ADC. '.repeat(25);
    const blocoFinal = 'A termodinâmica analisa o calor, trabalho e entropia em sistemas físicos. '.repeat(25);

    const pdfGrande = `${blocoIntro}\n\n${blocoAlvo}\n\n${blocoFinal}`;
    const chunks = selecionarChunksRelevantes(pdfGrande, {
      numChunks: 1,
      query: 'controle constitucionalidade supremo tribunal',
      chunkSize: 1800
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('controle de constitucionalidade');
  });

  it('divide gerações grandes (ex: 10 questões) em micro-lotes de até 5 questões sem repetir enunciados', async () => {
    const mockAiChat = vi.spyOn(aiProvider, 'aiChat')
      .mockResolvedValueOnce({
        success: true,
        content: JSON.stringify({
          questoes: [
            { citacao_base: 'Fato 1', pergunta: 'Pergunta Lote 1A?', resposta_correta: 'A', explicacao: 'Exp 1', opcoes: [{ letra: 'A', texto: 'Certo', correta: true }] },
            { citacao_base: 'Fato 2', pergunta: 'Pergunta Lote 1B?', resposta_correta: 'A', explicacao: 'Exp 2', opcoes: [{ letra: 'A', texto: 'Certo', correta: true }] }
          ]
        })
      })
      .mockResolvedValueOnce({
        success: true,
        content: JSON.stringify({
          questoes: [
            { citacao_base: 'Fato 3', pergunta: 'Pergunta Lote 2A?', resposta_correta: 'B', explicacao: 'Exp 3', opcoes: [{ letra: 'B', texto: 'Certo', correta: true }] }
          ]
        })
      });

    const progressoValores = [];
    const res = await gerarQuestoesComIA({
      texto: 'Parágrafo um sobre história.\n\nParágrafo dois sobre geografia.',
      quantidade: 8,
      materia: 'Geral',
      onProgress: (pct) => progressoValores.push(pct)
    });

    expect(res.success).toBe(true);
    expect(mockAiChat).toHaveBeenCalledTimes(2);
    expect(res.questoes).toHaveLength(3);
    expect(progressoValores.length).toBeGreaterThan(0);

    mockAiChat.mockRestore();
  });
});

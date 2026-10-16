import { describe, it, expect, vi } from 'vitest';
import { extrairQuestoesDeResposta, parseTextoSimples, gerarQuestoesComIA } from '../lib/parser';
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

  it('gerarQuestoesComIA lida com formato objeto unificado e parâmetros de dificuldade', async () => {
    const mockAiChat = vi.spyOn(aiProvider, 'aiChat').mockResolvedValueOnce({
      success: true,
      content: JSON.stringify({
        questoes: [
          {
            pergunta: 'Questão gerada via mock',
            resposta_correta: 'A',
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
    expect(mockAiChat).toHaveBeenCalled();

    mockAiChat.mockRestore();
  });
});

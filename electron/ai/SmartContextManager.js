import { TurboQuantEngine } from './turboQuant/turboQuantEngine.js';

/**
 * Gerencia o contexto da conversa, comprimindo o histórico antigo 
 * usando TurboQuant quando o limite de tokens é atingido.
 */
export class SmartContextManager {
  constructor(llamaContext, hardware) {
    this.context = llamaContext;
    this.hardware = hardware;
    this.conversationHistory = [];
    
    // Configurações adaptativas baseadas no tier do hardware
    this.maxActiveTokens = hardware.ramGB >= 16 ? 6000 : 3000;
  }

  async addMessage(role, content) {
    const tokens = Math.ceil(content.length / 4); // Heurística simples de tokens
    this.conversationHistory.push({ role, content, tokens });

    const totalTokens = this.conversationHistory.reduce((sum, m) => sum + m.tokens, 0);
    if (totalTokens > this.maxActiveTokens) {
      await this.compressOldHistory();
    }
  }

  async compressOldHistory() {
    // Comprime as 40% mensagens mais antigas em um sumário
    const toCompressCount = Math.floor(this.conversationHistory.length * 0.4);
    if (toCompressCount < 2) return;

    const oldMessages = this.conversationHistory.splice(0, toCompressCount);
    
    // Aqui poderíamos usar o TurboQuant para comprimir vetores KV reais se tivéssemos 
    // acesso direto aos buffers do llama.cpp, mas como usamos a lib node-llama-cpp,
    // implementamos a compressão via Sumarização Inteligente (Fase 2.4 do Guia).
    
    const textToSummarize = oldMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    const summary = await this.generateSummary(textToSummarize);

    this.conversationHistory.unshift({
      role: 'system',
      content: `[RESUMO DO CONTEXTO ANTERIOR]: ${summary}`,
      tokens: Math.ceil(summary.length / 4),
      isCompressed: true
    });

    console.log(`[SmartContext] Histórico comprimido. Mensagens reduzidas de ${oldMessages.length} para 1 sumário.`);
  }

  async generateSummary(text) {
    try {
      const session = this.context.getSequence();
      const prompt = `Resuma de forma extremamente concisa os pontos principais desta conversa para preservar o contexto essencial:\n\n${text}\n\nRESUMO:`;
      
      let summary = '';
      await session.prompt(prompt, {
        maxTokens: 150,
        onTextChunk: (chunk) => { summary += chunk; }
      });
      
      return summary.trim() || "Histórico anterior processado.";
    } catch (e) {
      console.error("[SmartContext] Erro ao gerar sumário:", e);
      return "Erro na compressão do histórico.";
    }
  }

  buildOptimizedPrompt(newUserMessage) {
    const historyText = this.conversationHistory
      .map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content}`)
      .join('\n\n');
    
    return `${historyText}\n\nUsuário: ${newUserMessage}\nIA:`;
  }
}

/**
 * EventBus simples e desacoplado para comunicação de plugins e módulos do NexoMente.
 */
class PluginEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Inscreve um ouvinte para um evento específico.
   * @param {string} event 
   * @param {Function} handler 
   * @returns {Function} Função para desinscrever (unsubscribe)
   */
  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Desinscreve um ouvinte.
   * @param {string} event 
   * @param {Function} handler 
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Dispara um evento assíncrono para todos os ouvintes registrados.
   * @param {string} event 
   * @param {*} payload 
   */
  async emit(event, payload) {
    if (!this.listeners.has(event)) return;
    const handlers = Array.from(this.listeners.get(event));
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        // Log seguro de erro em plugin sem quebrar a execução central
        if (typeof console !== 'undefined' && console.error) {
          console.error(`[PluginEventBus] Erro ao processar evento "${event}":`, err);
        }
      }
    }
  }

  /**
   * Limpa todos os ouvintes.
   */
  clear() {
    this.listeners.clear();
  }
}

export const pluginEventBus = new PluginEventBus();

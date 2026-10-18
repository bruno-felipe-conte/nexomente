/**
 * DomainEventBus — Barramento central de eventos de domínio do NexoMente.
 *
 * Permite comunicação reativa e desacoplada entre Features (ex: Flashcards -> Gamificação -> Dashboard)
 * sem que um módulo precise importar stores ou componentes internos de outro módulo.
 */

export const DOMAIN_EVENTS = {
  FLASHCARD_REVIEWED: 'flashcards:reviewed',     // { cardId, rating, state, lapses, xpEarned, isLeech }
  STUDY_SESSION_COMPLETED: 'study:completed',    // { sessaoId, minutos, modo, xpEarned }
  DOJO_RECITATION_FINISHED: 'dojo:recited',      // { poemaId, accuracy, xpEarned }
  NOTE_CREATED: 'vault:note_created',            // { notaId, categoria }
  NOTE_UPDATED: 'vault:note_updated',            // { notaId, tags }
  FORJA_CARDS_GENERATED: 'forja:cards_created',  // { count, materiaId }
  LEVEL_UP: 'gamification:level_up',             // { newLevel, title }
};

class DomainEventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Inscreve um ouvinte para um evento de domínio.
   * @param {string} event Nome do evento (use DOMAIN_EVENTS)
   * @param {(payload: any) => void} callback Função executada quando o evento ocorre
   * @returns {() => void} Função de unsubscribe
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('[DomainEventBus] O callback deve ser uma função.');
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Remove um ouvinte específico de um evento.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emite um evento de domínio para todos os ouvintes registrados.
   * Erros em um ouvinte são isolados para não interromper os demais.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload = {}) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;

    const eventEnvelope = {
      ...payload,
      _meta: {
        event,
        timestamp: new Date().toISOString(),
      },
    };

    for (const cb of [...callbacks]) {
      try {
        cb(eventEnvelope);
      } catch (err) {
        console.error(`[DomainEventBus] Falha ao processar listener do evento "${event}":`, err);
      }
    }
  }

  /**
   * Limpa todos os ouvintes (útil para teardown em testes unitários).
   */
  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new DomainEventBus();
export default eventBus;

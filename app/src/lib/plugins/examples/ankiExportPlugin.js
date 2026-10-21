/**
 * Plugin Exemplo Oficial: Exportação para o formato Anki (.txt tab-separated / CSV).
 * Demonstra a integração via Plugin API e escuta de eventos do ciclo de vida.
 */
export const ankiExportPlugin = {
  id: 'nexomente-anki-export',
  name: 'Anki Flashcards Exporter',
  version: '1.0.0',

  /**
   * Inicializa o plugin e registra handlers no EventBus do NexoMente.
   * @param {Object} context Contexto injetado pelo PluginManager
   */
  async init(context) {
    const { eventBus } = context;

    // Registra listener para pedidos de exportação do Anki
    this.unsubscribe = eventBus.on('flashcards:export-anki', (payload) => {
      return this.exportToAnkiFormat(payload.cards, payload.tags);
    });
  },

  /**
   * Converte array de flashcards para o formato padrão do Anki (TSV / tab-delimited).
   * @param {Array<{ frente: string, verso: string }>} cards 
   * @param {Array<string>} [tags]
   * @returns {string} Texto formatado em linhas delimitadas por tab
   */
  exportToAnkiFormat(cards = [], tags = []) {
    if (!Array.isArray(cards)) return '';

    const tagString = tags && tags.length > 0 ? tags.join(' ') : 'nexomente';

    const lines = cards.map(card => {
      // Sanitiza quebras de linha internas e tabulações para o formato Anki
      const front = (card.frente || '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
      const back = (card.verso || '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
      return `${front}\t${back}\t${tagString}`;
    });

    return lines.join('\n');
  },

  /**
   * Limpeza de recursos ao desativar o plugin.
   */
  async destroy() {
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }
  },
};

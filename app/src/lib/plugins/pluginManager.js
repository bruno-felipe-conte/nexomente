import { pluginEventBus } from './eventBus.js';

/**
 * Gerenciador de ciclo de vida de extensões e plugins do NexoMente.
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.context = {
      eventBus: pluginEventBus,
      version: '1.0.0',
    };
  }

  /**
   * Registra um plugin user-land no sistema.
   * @param {Object} pluginDefinition 
   * @param {string} pluginDefinition.id Identificador único do plugin
   * @param {string} pluginDefinition.name Nome legível do plugin
   * @param {string} [pluginDefinition.version] Versão semântica
   * @param {Function} pluginDefinition.init Função assíncrona inicializadora
   * @param {Function} [pluginDefinition.destroy] Função de descarte/cleanup
   */
  async register(pluginDefinition) {
    if (!pluginDefinition || !pluginDefinition.id || typeof pluginDefinition.init !== 'function') {
      throw new Error('[PluginManager] Definição de plugin inválida. Deve conter "id" e "init()".');
    }

    if (this.plugins.has(pluginDefinition.id)) {
      throw new Error(`[PluginManager] Plugin com id "${pluginDefinition.id}" já está registrado.`);
    }

    const pluginRecord = {
      id: pluginDefinition.id,
      name: pluginDefinition.name || pluginDefinition.id,
      version: pluginDefinition.version || '0.1.0',
      active: false,
      raw: pluginDefinition,
    };

    this.plugins.set(pluginDefinition.id, pluginRecord);

    try {
      await pluginDefinition.init(this.context);
      pluginRecord.active = true;
      await pluginEventBus.emit('plugin:registered', { id: pluginDefinition.id });
    } catch (err) {
      this.plugins.delete(pluginDefinition.id);
      throw err;
    }

    return pluginRecord;
  }

  /**
   * Desativa e remove um plugin do ecossistema.
   * @param {string} pluginId 
   */
  async unregister(pluginId) {
    const pluginRecord = this.plugins.get(pluginId);
    if (!pluginRecord) return false;

    if (typeof pluginRecord.raw.destroy === 'function') {
      try {
        await pluginRecord.raw.destroy(this.context);
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error(`[PluginManager] Erro no destroy do plugin "${pluginId}":`, err);
        }
      }
    }

    this.plugins.delete(pluginId);
    await pluginEventBus.emit('plugin:unregistered', { id: pluginId });
    return true;
  }

  /**
   * Retorna lista de plugins ativos.
   */
  getPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      active: p.active,
    }));
  }
}

export const pluginManager = new PluginManager();

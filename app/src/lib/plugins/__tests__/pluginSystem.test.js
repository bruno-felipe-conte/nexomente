import { describe, it, expect, vi } from 'vitest';
import { pluginEventBus } from '../eventBus.js';
import { pluginManager } from '../pluginManager.js';
import { ankiExportPlugin } from '../examples/ankiExportPlugin.js';

describe('Plugin System (E3)', () => {
  it('deve registrar e emitir eventos via PluginEventBus', async () => {
    const handler = vi.fn();
    const unsub = pluginEventBus.on('test:event', handler);

    await pluginEventBus.emit('test:event', { foo: 'bar' });
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });

    unsub();
    await pluginEventBus.emit('test:event', { foo: 'baz' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('deve gerenciar ciclo de vida com PluginManager', async () => {
    let initialized = false;
    let destroyed = false;

    const samplePlugin = {
      id: 'sample-plugin',
      name: 'Sample Plugin',
      async init() {
        initialized = true;
      },
      async destroy() {
        destroyed = true;
      },
    };

    const record = await pluginManager.register(samplePlugin);
    expect(record.active).toBe(true);
    expect(initialized).toBe(true);
    expect(pluginManager.getPlugins()).toHaveLength(1);

    await pluginManager.unregister('sample-plugin');
    expect(destroyed).toBe(true);
    expect(pluginManager.getPlugins()).toHaveLength(0);
  });

  it('deve exportar flashcards no formato Anki através do ankiExportPlugin', () => {
    const cards = [
      { frente: 'Pergunta 1', verso: 'Resposta 1' },
      { frente: 'Pergunta 2\nSegunda Linha', verso: 'Resposta 2' },
    ];

    const result = ankiExportPlugin.exportToAnkiFormat(cards, ['medicina', 'anatomia']);
    expect(result).toBe(
      'Pergunta 1\tResposta 1\tmedicina anatomia\n' +
      'Pergunta 2<br>Segunda Linha\tResposta 2\tmedicina anatomia'
    );
  });
});

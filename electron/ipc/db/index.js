import { registerNotasHandlers } from './notasHandlers.js';
import { registerFlashcardsHandlers } from './flashcardsHandlers.js';
import { registerPoemasHandlers } from './poemasHandlers.js';
import { registerXpHandlers } from './xpHandlers.js';

export function registerAllDbHandlers() {
  registerNotasHandlers();
  registerFlashcardsHandlers();
  registerPoemasHandlers();
  registerXpHandlers();
}

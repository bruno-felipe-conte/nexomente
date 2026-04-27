/**
 * Mensagens de erro humanizadas para exibição ao usuário.
 * Nunca exiba mensagens técnicas (stack traces, códigos HTTP) diretamente.
 *
 * @module errorMessages
 */

export const ERROR_MESSAGES = {
  // ─── Rede e conectividade ────────────────────────────────────
  NETWORK_ERROR: 'Parece que você está sem conexão. Verifique sua rede.',
  LLM_OFFLINE: 'O modelo de IA não está acessível. Verifique se o LM Studio ou Ollama está rodando.',
  TIMEOUT: 'A operação demorou demais. Tente novamente.',

  // ─── Banco de dados / armazenamento ──────────────────────────
  SAVE_FAILED: 'Não conseguimos salvar. Tente novamente em instantes.',
  LOAD_FAILED: 'Não foi possível carregar os dados. Recarregue a página.',
  DELETE_FAILED: 'Não foi possível excluir o item. Tente novamente.',
  DB_INIT_FAILED: 'Erro ao inicializar o banco de dados. Verifique as permissões do app.',

  // ─── Arquivos ─────────────────────────────────────────────────
  FILE_READ_FAILED: 'Não foi possível ler o arquivo. Verifique se ele é válido.',
  FILE_WRITE_FAILED: 'Não foi possível salvar o arquivo. Verifique as permissões.',
  FILE_TOO_LARGE: 'O arquivo é muito grande. Tamanho máximo: 50MB.',
  INVALID_FORMAT: 'Formato de arquivo não suportado. Use Markdown (.md) ou texto puro.',

  // ─── Permissões ───────────────────────────────────────────────
  PERMISSION_DENIED: 'Você não tem permissão para fazer isso.',
  NOT_FOUND: 'Esse item não foi encontrado. Pode ter sido excluído.',

  // ─── Genérico ─────────────────────────────────────────────────
  UNKNOWN: 'Algo deu errado. Tente novamente ou recarregue a página.',
  UNEXPECTED: 'Ocorreu um erro inesperado. Se persistir, reinicie o aplicativo.',
};

/**
 * Mapeia um erro técnico para uma mensagem amigável.
 * @param {Error|string} error - O erro capturado
 * @returns {string} Mensagem humanizada
 */
export function getErrorMessage(error) {
  const msg = error?.message?.toLowerCase() ?? '';

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (msg.includes('timeout') || msg.includes('aborted')) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (msg.includes('permission') || msg.includes('403')) {
    return ERROR_MESSAGES.PERMISSION_DENIED;
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return ERROR_MESSAGES.NOT_FOUND;
  }

  return ERROR_MESSAGES.UNKNOWN;
}

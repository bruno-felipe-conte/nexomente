/**
 * Wrappers semânticos do react-hot-toast para o NexoMente.
 * Use estas funções em vez de chamar toast() diretamente para
 * manter consistência de mensagens em toda a aplicação.
 *
 * @module toast
 *
 * @example
 * import { toastSucesso, toastErro } from '../utils/toast';
 * toastSucesso('Nota salva!');
 * toastErro('Não foi possível salvar. Tente novamente.');
 */
import toast from 'react-hot-toast';

/** Feedback de operação bem-sucedida */
export function toastSucesso(mensagem, opcoes = {}) {
  return toast.success(mensagem, opcoes);
}

/** Feedback de erro — exibe por 5s por padrão */
export function toastErro(mensagem, opcoes = {}) {
  return toast.error(mensagem, { duration: 5000, ...opcoes });
}

/** Informação neutra */
export function toastInfo(mensagem, opcoes = {}) {
  return toast(mensagem, opcoes);
}

/**
 * Ação reversível — exibe toast com botão "Desfazer".
 * @param {string} mensagem - Ex: 'Nota excluída'
 * @param {function} onDesfazer - Callback ao clicar em Desfazer
 */
export function toastDesfazer(mensagem, onDesfazer) {
  return toast(mensagem, {
    duration: 5000,
    icon: '🗑️',
    action: {
      label: 'Desfazer',
      onClick: onDesfazer,
    },
  });
}

/**
 * Toast de operação assíncrona com estados loading/sucesso/erro.
 * @param {Promise} promise
 * @param {{ loading, success, error }} mensagens
 */
export function toastPromise(promise, mensagens) {
  return toast.promise(promise, {
    loading: mensagens.loading ?? 'Processando...',
    success: mensagens.success ?? 'Concluído!',
    error: mensagens.error ?? 'Algo deu errado.',
  });
}

export default toast;

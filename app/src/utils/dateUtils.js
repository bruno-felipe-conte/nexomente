/**
 * Utilitários de data para o NexoMente.
 * Usa date-fns internamente para compatibilidade com tree-shaking.
 *
 * @module dateUtils
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data para o padrão brasileiro DD/MM/AAAA.
 * @param {Date|string} data
 * @returns {string}
 */
export function formatarData(data) {
  const d = typeof data === 'string' ? parseISO(data) : data;
  return format(d, 'dd/MM/yyyy');
}

/**
 * Formata data com hora: DD/MM/AAAA HH:mm
 * @param {Date|string} data
 * @returns {string}
 */
export function formatarDataHora(data) {
  const d = typeof data === 'string' ? parseISO(data) : data;
  return format(d, 'dd/MM/yyyy HH:mm');
}

/**
 * Retorna tempo decorrido em texto legível (ex: "há 3 horas").
 * @param {Date|string} data
 * @returns {string}
 */
export function calcularTempoDecorrido(data) {
  const d = typeof data === 'string' ? parseISO(data) : data;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

/**
 * Formata duração em segundos para MM:SS.
 * @param {number} segundos
 * @returns {string} ex: "25:00"
 */
export function formatarTemporizador(segundos) {
  const mins = Math.floor(Math.abs(segundos) / 60);
  const secs = Math.abs(segundos) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

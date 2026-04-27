/**
 * Walsh-Hadamard Transform (WHT) — versão rápida O(n log n).
 * Utilizada para distribuir outliers uniformemente no vetor KV Cache.
 */

/**
 * Aplica WHT in-place num Float32Array.
 * O array DEVE ter tamanho potência de 2.
 */
export function walshHadamardTransform(arr) {
  const n = arr.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`WHT requer tamanho potência de 2. Recebeu: ${n}`);
  }

  let h = 1;
  while (h < n) {
    for (let i = 0; i < n; i += h * 2) {
      for (let j = i; j < i + h; j++) {
        const x = arr[j];
        const y = arr[j + h];
        arr[j]     = x + y;
        arr[j + h] = x - y;
      }
    }
    h *= 2;
  }

  // Normaliza por 1/sqrt(n) para preservar normas
  const scale = 1 / Math.sqrt(n);
  for (let i = 0; i < n; i++) {
    arr[i] *= scale;
  }

  return arr;
}

/**
 * WHT Inversa — idêntica à WHT após normalização.
 */
export function inverseWalshHadamardTransform(arr) {
  return walshHadamardTransform(arr);
}

/**
 * Randomized WHT — aplica sinais aleatórios antes da transformada.
 */
export function randomizedWHT(arr, signs) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= signs[i];
  }
  walshHadamardTransform(arr);
}

export function inverseRandomizedWHT(arr, signs) {
  inverseWalshHadamardTransform(arr);
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= signs[i];
  }
}

/**
 * Gera vetor de sinais aleatórios (±1).
 */
export function generateRandomSigns(dim) {
  const signs = new Int8Array(dim);
  for (let i = 0; i < dim; i++) {
    signs[i] = Math.random() < 0.5 ? 1 : -1;
  }
  return signs;
}

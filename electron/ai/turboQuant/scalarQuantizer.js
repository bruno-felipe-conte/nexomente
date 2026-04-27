/**
 * Quantizador Escalar Ótimo para TurboQuant.
 */

/**
 * Gera codebook ótimo para quantização de N bits baseado na distribuição Gaussiana.
 */
export function generateOptimalCodebook(numBits, sigma = 1.0) {
  const numCentroids = Math.pow(2, numBits);
  const codebook = new Float32Array(numCentroids);

  for (let i = 0; i < numCentroids; i++) {
    const p = (i + 0.5) / numCentroids;
    codebook[i] = gaussianInverseCDF(p) * sigma;
  }

  return codebook;
}

/**
 * Beasley-Springer-Moro approximation of the Gaussian Inverse CDF.
 */
function gaussianInverseCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511349,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187];

  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    const num = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]);
    const den = ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    return num / den;
  }

  const r = p < 0.5 ? Math.log(-Math.log(p)) : Math.log(-Math.log(1 - p));
  let x = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
  return p < 0.5 ? -x : x;
}

/**
 * Retorna o índice do codebook mais próximo do valor.
 */
export function quantizeScalar(value, codebook) {
  let bestIdx = 0;
  let bestDist = Math.abs(value - codebook[0]);

  for (let i = 1; i < codebook.length; i++) {
    const dist = Math.abs(value - codebook[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Converte índice de volta para float.
 */
export function dequantizeScalar(idx, codebook) {
  return codebook[idx];
}

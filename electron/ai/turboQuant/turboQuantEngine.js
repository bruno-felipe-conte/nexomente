import { randomizedWHT, inverseRandomizedWHT, generateRandomSigns } from './hadamard.js';
import { generateOptimalCodebook, quantizeScalar, dequantizeScalar } from './scalarQuantizer.js';

/**
 * TurboQuantEngine — Motor de compressão/descompressão de vetores KV.
 */
export class TurboQuantEngine {
  constructor({ dim, numBits = 4, sigma = 1.0 }) {
    this.originalDim = dim;
    this.dim = this.nextPowerOf2(dim);
    this.numBits = numBits;

    this.signs = generateRandomSigns(this.dim);
    this.codebook = generateOptimalCodebook(numBits, sigma);

    // Buffer reutilizável
    this._workBuffer = new Float32Array(this.dim);
  }

  nextPowerOf2(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  compress(vector) {
    const n = vector.length;
    this._workBuffer.fill(0);
    for (let i = 0; i < n; i++) this._workBuffer[i] = vector[i];

    // Calcular norma para reconstrução
    let normSq = 0;
    for (let i = 0; i < n; i++) normSq += this._workBuffer[i] ** 2;
    const norm = Math.sqrt(normSq);

    // Normalizar
    if (norm > 1e-8) {
      for (let i = 0; i < n; i++) this._workBuffer[i] /= norm;
    }

    // Rotação
    randomizedWHT(this._workBuffer, this.signs);

    // Quantização
    const indices = new Uint8Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      indices[i] = quantizeScalar(this._workBuffer[i], this.codebook);
    }

    return { indices, norm };
  }

  decompress({ indices, norm }) {
    const result = new Float32Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      result[i] = dequantizeScalar(indices[i], this.codebook);
    }

    inverseRandomizedWHT(result, this.signs);

    for (let i = 0; i < this.dim; i++) {
      result[i] *= norm;
    }

    return result.subarray(0, this.originalDim);
  }

  get stats() {
    const bytesOriginal = this.originalDim * 4;
    const bytesCompressed = this.dim * 1 + 4; // 1 byte per index + 4 bytes for float norm
    return {
      ratio: (bytesOriginal / bytesCompressed).toFixed(2),
      savings: ((1 - bytesCompressed / bytesOriginal) * 100).toFixed(1) + '%'
    };
  }
}

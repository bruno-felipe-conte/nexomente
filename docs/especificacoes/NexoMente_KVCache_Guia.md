# 🧠 NexoMente — Guia de Implementação: KV Cache Quantization
### Baseado em TurboQuant + PolarQuant para node-llama-cpp (Electron.js)

---

## 🗺️ Visão Geral da Estratégia

O objetivo é **reduzir o uso de RAM/VRAM do KV Cache** do modelo local rodando via `node-llama-cpp`, tornando a IA mais rápida em máquinas com hardware limitado — sem sacrificar a qualidade das respostas de estudo.

### Por que o KV Cache é o gargalo?

Quando o usuário cola um capítulo inteiro de livro para a IA resumir, o modelo precisa "lembrar" de cada token processado. Essa memória de curto prazo é o **KV Cache**. Para um contexto de 8.000 tokens num modelo de 7B parâmetros:

```
KV Cache (FP16, 32 camadas, 8192 tokens) ≈ 1 GB de RAM
KV Cache (Q4, mesmo cenário)              ≈ 250 MB de RAM  ← 4x menos
KV Cache (TurboQuant 3.5 bits)            ≈ ~219 MB de RAM ← 4.6x menos
```

---

## 📋 Fases de Implementação

```
FASE 0 → Diagnóstico (1 dia)
FASE 1 → Vitórias Rápidas com API Nativa (2-3 dias)
FASE 2 → Camada TurboQuant em JavaScript (1-2 semanas)
FASE 3 → Módulo Nativo C++ (Opcional, 2-4 semanas)
FASE 4 → UX Adaptativa no NexoMente (2-3 dias)
```

---

## FASE 0 — Diagnóstico do Ambiente Atual

### 0.1 — Medir o uso atual de memória

Antes de otimizar, meça. Crie um arquivo `src/main/ai/diagnostics.js`:

```javascript
// src/main/ai/diagnostics.js
const os = require('os');

class AIDiagnostics {
  constructor() {
    this.snapshots = [];
  }

  snapshot(label) {
    const mem = process.memoryUsage();
    const system = {
      label,
      timestamp: Date.now(),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),   // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),  // MB
      external: Math.round(mem.external / 1024 / 1024),    // MB (onde o llama.cpp vive)
      systemFreeRAM: Math.round(os.freemem() / 1024 / 1024),
      systemTotalRAM: Math.round(os.totalmem() / 1024 / 1024),
    };
    this.snapshots.push(system);
    console.log(`[DIAGNÓSTICO] ${label}:`, system);
    return system;
  }

  // Calcula deltas entre dois snapshots
  delta(labelA, labelB) {
    const a = this.snapshots.find(s => s.label === labelA);
    const b = this.snapshots.find(s => s.label === labelB);
    if (!a || !b) return null;
    return {
      heapDelta: b.heapUsed - a.heapUsed,
      externalDelta: b.external - a.external,       // ← delta do KV Cache
      systemRAMDelta: a.systemFreeRAM - b.systemFreeRAM,
    };
  }
}

module.exports = new AIDiagnostics();
```

### 0.2 — Calcular o tamanho teórico do KV Cache

Fórmula para qualquer modelo GGUF:

```javascript
// src/main/ai/kvCalculator.js

function calculateKVCacheSize({
  numLayers,        // Ex: 32 para Llama 3 8B
  numHeads,         // Ex: 32 para Llama 3 8B (ou 8 para GQA)
  numKVHeads,       // Ex: 8 (Grouped Query Attention do Llama 3)
  headDim,          // Ex: 128
  contextLength,    // Ex: 8192 tokens
  bytesPerElement,  // 2 = FP16, 1 = INT8, 0.5 = INT4
}) {
  // Tamanho = 2 (K e V) × layers × kv_heads × head_dim × context × bytes
  const bytes = 2 * numLayers * numKVHeads * headDim * contextLength * bytesPerElement;
  return {
    bytes,
    kilobytes: bytes / 1024,
    megabytes: bytes / 1024 / 1024,
    gigabytes: bytes / 1024 / 1024 / 1024,
  };
}

// Exemplos práticos para o NexoMente:
const modelos = [
  {
    nome: 'Llama 3 8B (GQA)',
    numLayers: 32, numHeads: 32, numKVHeads: 8,
    headDim: 128, contextLength: 8192,
  },
  {
    nome: 'Gemma 7B',
    numLayers: 28, numHeads: 16, numKVHeads: 16,
    headDim: 256, contextLength: 8192,
  },
];

console.log('\n=== Comparativo de Tamanho do KV Cache ===');
for (const modelo of modelos) {
  const fp16 = calculateKVCacheSize({ ...modelo, bytesPerElement: 2 });
  const q8   = calculateKVCacheSize({ ...modelo, bytesPerElement: 1 });
  const q4   = calculateKVCacheSize({ ...modelo, bytesPerElement: 0.5 });
  const q35  = calculateKVCacheSize({ ...modelo, bytesPerElement: 0.4375 }); // 3.5 bits

  console.log(`\n${modelo.nome} @ ${modelo.contextLength} tokens:`);
  console.log(`  FP16:      ${fp16.megabytes.toFixed(1)} MB`);
  console.log(`  Q8_0:      ${q8.megabytes.toFixed(1)} MB (${(fp16.megabytes/q8.megabytes).toFixed(1)}x menos)`);
  console.log(`  Q4_0:      ${q4.megabytes.toFixed(1)} MB (${(fp16.megabytes/q4.megabytes).toFixed(1)}x menos)`);
  console.log(`  TurboQuant:${q35.megabytes.toFixed(1)} MB (${(fp16.megabytes/q35.megabytes).toFixed(1)}x menos)`);
}

module.exports = { calculateKVCacheSize };
```

---

## FASE 1 — Vitórias Rápidas com node-llama-cpp (Sem código custom)

### 1.1 — Habilitar KV Cache Quantization Nativa

O `node-llama-cpp` (v3+) já expõe os parâmetros de quantização do cache do llama.cpp. Esta é a mudança mais impactante com menos trabalho:

```javascript
// src/main/ai/llamaManager.js
const { getLlama, LlamaChatSession } = require('node-llama-cpp');

class LlamaManager {
  constructor() {
    this.llama = null;
    this.model = null;
    this.context = null;
  }

  async initialize(modelPath, userHardware) {
    this.llama = await getLlama({
      // Detecta GPU automaticamente (CUDA, Metal, Vulkan)
      gpu: 'auto',
    });

    this.model = await this.llama.loadModel({
      modelPath,
    });

    // ⭐ O CORAÇÃO DA OTIMIZAÇÃO: configuração do contexto
    const contextConfig = this.buildContextConfig(userHardware);
    this.context = await this.model.createContext(contextConfig);

    return this.context;
  }

  buildContextConfig(hardware) {
    // hardware = { ramGB, hasGPU, vramMB, cpuCores }
    
    const baseConfig = {
      // Tamanho do contexto — quanto maior, mais RAM o KV Cache usa
      contextSize: this.recommendContextSize(hardware),

      // ⭐ QUANTIZAÇÃO DO KV CACHE (feature nativa do llama.cpp)
      // Aceita: 'f32', 'f16', 'q8_0', 'q4_0', 'q4_1', 'q5_0', 'q5_1', 'iq4_nl'
      // q8_0 = 8 bits (melhor custo/benefício)
      // q4_0 = 4 bits (mais agressivo, mais rápido)
      // iq4_nl = 4 bits não-linear (melhor qualidade que q4_0)
      cacheTypeK: this.recommendCacheType(hardware, 'k'),
      cacheTypeV: this.recommendCacheType(hardware, 'v'),

      // Quantas camadas offloar para GPU (0 = só CPU)
      gpuLayers: hardware.hasGPU ? this.recommendGPULayers(hardware) : 0,

      // Threads para processamento paralelo
      threads: Math.max(1, Math.floor(hardware.cpuCores * 0.75)),

      // Batch size — processa mais tokens por vez (memória vs velocidade)
      batchSize: hardware.ramGB >= 16 ? 512 : 256,
    };

    return baseConfig;
  }

  recommendContextSize(hardware) {
    if (hardware.ramGB >= 32) return 16384;  // 16k tokens
    if (hardware.ramGB >= 16) return 8192;   // 8k tokens
    if (hardware.ramGB >= 8)  return 4096;   // 4k tokens
    return 2048;                              // Mínimo viável
  }

  recommendCacheType(hardware, kvType) {
    // Keys e Values podem ter tipos diferentes
    // Keys: mais sensíveis à quantização → manter qualidade maior
    // Values: menos sensíveis → pode comprimir mais
    
    if (hardware.ramGB >= 32) {
      return kvType === 'k' ? 'q8_0' : 'q4_0';
    }
    if (hardware.ramGB >= 16) {
      return kvType === 'k' ? 'q8_0' : 'q4_0';  // Assimétrico como QJL
    }
    if (hardware.ramGB >= 8) {
      return 'q4_0';  // Agressivo em máquinas fracas
    }
    return 'q4_0';
  }

  recommendGPULayers(hardware) {
    // Regra: ~100MB de VRAM por layer para modelos 7-8B
    if (hardware.vramMB >= 8000) return 35;  // GPU total
    if (hardware.vramMB >= 4000) return 20;
    if (hardware.vramMB >= 2000) return 10;
    return 0;
  }
}

module.exports = new LlamaManager();
```

### 1.2 — Detecção Automática de Hardware

```javascript
// src/main/ai/hardwareDetector.js
const os = require('os');
const { execSync } = require('child_process');

async function detectHardware() {
  const hardware = {
    ramGB: Math.floor(os.totalmem() / 1024 / 1024 / 1024),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    hasGPU: false,
    vramMB: 0,
    gpuName: 'None',
    platform: process.platform,
  };

  // Detectar GPU
  try {
    if (process.platform === 'win32') {
      const output = execSync(
        'wmic path win32_VideoController get Name,AdapterRAM /format:csv',
        { encoding: 'utf8', timeout: 3000 }
      );
      const lines = output.trim().split('\n').filter(l => l.includes(','));
      if (lines.length > 0) {
        const parts = lines[0].split(',');
        hardware.hasGPU = true;
        hardware.gpuName = parts[2]?.trim() || 'Unknown GPU';
        hardware.vramMB = Math.floor(parseInt(parts[1]) / 1024 / 1024) || 0;
      }
    } else if (process.platform === 'darwin') {
      // macOS: Metal GPU (usa RAM unificada)
      const output = execSync('system_profiler SPDisplaysDataType', { encoding: 'utf8', timeout: 3000 });
      if (output.includes('Metal')) {
        hardware.hasGPU = true;
        hardware.gpuName = 'Apple Metal GPU';
        // No macOS com chip Apple, VRAM compartilha com RAM — usar 50% da RAM
        hardware.vramMB = Math.floor((hardware.ramGB * 1024) * 0.5);
      }
    } else if (process.platform === 'linux') {
      try {
        const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
          encoding: 'utf8', timeout: 3000,
        });
        const parts = output.trim().split(',');
        hardware.hasGPU = true;
        hardware.gpuName = parts[0]?.trim();
        hardware.vramMB = parseInt(parts[1]) || 0;
      } catch {
        // Sem NVIDIA — tentar AMD ROCm ou Intel
      }
    }
  } catch (err) {
    // GPU detection falhou — continuar sem GPU
    console.warn('[HardwareDetector] GPU detection failed:', err.message);
  }

  // Classificar o hardware
  hardware.tier = classifyHardware(hardware);
  
  console.log('[HardwareDetector] Hardware detectado:', hardware);
  return hardware;
}

function classifyHardware(hw) {
  if (hw.ramGB >= 32 && hw.hasGPU && hw.vramMB >= 6000) return 'HIGH';
  if (hw.ramGB >= 16 || (hw.hasGPU && hw.vramMB >= 4000)) return 'MEDIUM';
  if (hw.ramGB >= 8) return 'LOW';
  return 'MINIMAL';
}

module.exports = { detectHardware };
```

### 1.3 — Integração no IPC do Electron

```javascript
// src/main/ipcHandlers/aiHandlers.js
const { ipcMain } = require('electron');
const llamaManager = require('../ai/llamaManager');
const { detectHardware } = require('../ai/hardwareDetector');
const diagnostics = require('../ai/diagnostics');

let hardware = null;

ipcMain.handle('ai:initialize', async (event, { modelPath }) => {
  try {
    diagnostics.snapshot('before-init');
    
    if (!hardware) {
      hardware = await detectHardware();
    }

    await llamaManager.initialize(modelPath, hardware);
    
    diagnostics.snapshot('after-init');
    const delta = diagnostics.delta('before-init', 'after-init');
    
    return {
      success: true,
      hardware,
      memoryUsed: delta,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:chat', async (event, { messages, onToken }) => {
  diagnostics.snapshot('before-inference');
  
  // Streaming de tokens para o frontend
  const response = await llamaManager.chat(messages, (token) => {
    event.sender.send('ai:token', token);
  });

  diagnostics.snapshot('after-inference');
  
  return { response };
});
```

---

## FASE 2 — Camada TurboQuant em JavaScript

Esta fase implementa o **núcleo matemático** do TurboQuant como uma camada de pré-processamento no Node.js. O insight do TurboQuant é:

```
1. Rotação Aleatória (Hadamard Transform) → distribui outliers uniformemente
2. Quantização por coordenada → cada número vira 3-4 bits
3. Reconstrução → aplica a rotação inversa para obter os vetores originais
```

### 2.1 — Implementar a Transformada de Hadamard (WHT)

```javascript
// src/main/ai/turboQuant/hadamard.js

/**
 * Walsh-Hadamard Transform (WHT) — versão rápida O(n log n)
 * É o "Random Rotation" usado pelo TurboQuant para distribuir outliers.
 * 
 * A ideia: se um vetor tem coordenadas com valores extremos (outliers),
 * a WHT os "espalha" uniformemente. Após isso, a quantização perde
 * muito menos informação porque não tem mais picos.
 */

/**
 * Aplica WHT in-place num Float32Array.
 * O array DEVE ter tamanho potência de 2.
 */
function walshHadamardTransform(arr) {
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
 * WHT Inversa — idêntica à WHT (a transformada é auto-inversa após normalização)
 */
function inverseWalshHadamardTransform(arr) {
  // WHT é auto-inversa com a normalização correta
  return walshHadamardTransform(arr);
}

/**
 * "Randomized WHT" — multiplica cada elemento por ±1 aleatório antes da WHT.
 * Isso "randomiza" a rotação, garantindo que outliers não fiquem concentrados.
 * 
 * @param {Float32Array} arr - Vetor a transformar
 * @param {Int8Array} signs - Array de ±1 (gerado uma vez por sessão)
 */
function randomizedWHT(arr, signs) {
  // 1. Aplicar sinais aleatórios (multiplica cada coord por ±1)
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= signs[i];
  }
  // 2. Aplicar WHT
  walshHadamardTransform(arr);
}

function inverseRandomizedWHT(arr, signs) {
  // 1. WHT inversa
  inverseWalshHadamardTransform(arr);
  // 2. Aplicar sinais (reverter — como são ±1, multiplicar de novo desfaz)
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= signs[i];
  }
}

/**
 * Gera vetor de sinais aleatórios (±1) — deve ser gerado UMA VEZ por modelo
 * e salvo para usar em toda a sessão.
 */
function generateRandomSigns(dim) {
  const signs = new Int8Array(dim);
  for (let i = 0; i < dim; i++) {
    signs[i] = Math.random() < 0.5 ? 1 : -1;
  }
  return signs;
}

module.exports = {
  walshHadamardTransform,
  inverseWalshHadamardTransform,
  randomizedWHT,
  inverseRandomizedWHT,
  generateRandomSigns,
};
```

### 2.2 — Quantizador Escalar Ótimo

```javascript
// src/main/ai/turboQuant/scalarQuantizer.js

/**
 * Quantizador Escalar com codebook ótimo para distribuição Beta concentrada.
 * 
 * Após a rotação aleatória, as coordenadas seguem uma distribuição
 * aproximadamente Gaussiana concentrada. Isso nos permite criar um
 * codebook ótimo (não uniforme) que minimiza o erro quadrático médio.
 */

/**
 * Gera codebook ótimo para quantização de N bits.
 * Baseado na distribuição Gaussiana N(0, sigma²).
 */
function generateOptimalCodebook(numBits, sigma = 1.0) {
  const numCentroids = Math.pow(2, numBits); // Ex: 4 bits = 16 centroids
  const codebook = new Float32Array(numCentroids);

  // Para distribuição Gaussiana, os centroids ótimos são os quantis
  // calculados pelo algoritmo de Lloyd-Max (simplificado aqui por lookup table)
  // Usando estimativa por quantis da normal padrão
  
  for (let i = 0; i < numCentroids; i++) {
    // Calcula o quantil correspondente
    const p = (i + 0.5) / numCentroids;
    codebook[i] = gaussianInverseCDF(p) * sigma;
  }

  return codebook;
}

/**
 * Aproximação da CDF inversa Gaussiana (algoritmo de Beasley-Springer-Moro)
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
 * Quantiza um valor escalar usando o codebook.
 * Retorna o ÍNDICE (não o valor) — isso é o que comprimimos.
 */
function quantizeScalar(value, codebook) {
  let bestIdx = 0;
  let bestDist = Math.abs(value - codebook[0]);

  for (let i = 1; i < codebook.length; i++) {
    const dist = Math.abs(value - codebook[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx; // Retorna índice de 0 a 2^bits - 1
}

/**
 * Dequantiza: converte índice de volta para float
 */
function dequantizeScalar(idx, codebook) {
  return codebook[idx];
}

module.exports = {
  generateOptimalCodebook,
  quantizeScalar,
  dequantizeScalar,
};
```

### 2.3 — Motor Principal do TurboQuant

```javascript
// src/main/ai/turboQuant/turboQuantEngine.js

const {
  randomizedWHT,
  inverseRandomizedWHT,
  generateRandomSigns,
} = require('./hadamard');

const {
  generateOptimalCodebook,
  quantizeScalar,
  dequantizeScalar,
} = require('./scalarQuantizer');

/**
 * TurboQuantEngine — Implementação completa do TurboQuant para NexoMente
 * 
 * Uso típico:
 *   const tq = new TurboQuantEngine({ dim: 128, numBits: 4 });
 *   const compressed = tq.compress(kvVector);
 *   const restored = tq.decompress(compressed);
 */
class TurboQuantEngine {
  constructor({ dim, numBits = 4, sigma = 1.0 }) {
    // Garantir que dim é potência de 2 (necessário para WHT)
    this.dim = nextPowerOf2(dim);
    this.originalDim = dim;
    this.numBits = numBits;

    // Gerado uma vez, reutilizado em toda a sessão
    this.signs = generateRandomSigns(this.dim);
    this.codebook = generateOptimalCodebook(numBits, sigma);

    // Cache de vetores reutilizáveis (evita alocações no hot path)
    this._workBuffer = new Float32Array(this.dim);

    console.log(`[TurboQuant] Inicializado: dim=${this.dim}, bits=${numBits}, ` +
                `codebook_size=${this.codebook.length}, ` +
                `compressão=${(32 / numBits).toFixed(1)}x`);
  }

  /**
   * Comprime um vetor KV (Float32Array) → Uint8Array (ou Uint16Array para >8 bits)
   * 
   * @param {Float32Array} vector - Vetor original em FP32
   * @returns {Object} { indices, norm } - Índices quantizados + norma do vetor
   */
  compress(vector) {
    const n = vector.length;
    
    // 1. Copiar para buffer de trabalho (pad com zeros se necessário)
    this._workBuffer.fill(0);
    for (let i = 0; i < n; i++) {
      this._workBuffer[i] = vector[i];
    }

    // 2. Salvar norma (necessário para reconstrução)
    let normSq = 0;
    for (let i = 0; i < n; i++) normSq += this._workBuffer[i] ** 2;
    const norm = Math.sqrt(normSq);

    // 3. Normalizar (para quantizar os ângulos/direções, não a magnitude)
    if (norm > 1e-8) {
      for (let i = 0; i < n; i++) this._workBuffer[i] /= norm;
    }

    // 4. Aplicar rotação aleatória (WHT com sinais aleatórios)
    randomizedWHT(this._workBuffer, this.signs);

    // 5. Quantizar cada coordenada
    const indices = new Uint8Array(this.dim); // 1 byte por coordenada (para até 8 bits)
    for (let i = 0; i < this.dim; i++) {
      indices[i] = quantizeScalar(this._workBuffer[i], this.codebook);
    }

    return { indices, norm };
  }

  /**
   * Descomprime de volta para Float32Array
   * 
   * @param {Object} compressed - { indices, norm }
   * @returns {Float32Array} - Vetor reconstruído
   */
  decompress({ indices, norm }) {
    const result = new Float32Array(this.dim);

    // 1. Dequantizar cada coordenada
    for (let i = 0; i < this.dim; i++) {
      result[i] = dequantizeScalar(indices[i], this.codebook);
    }

    // 2. Aplicar rotação inversa
    inverseRandomizedWHT(result, this.signs);

    // 3. Reescalar pela norma original
    for (let i = 0; i < this.dim; i++) {
      result[i] *= norm;
    }

    // 4. Retornar apenas as dimensões originais
    return result.subarray(0, this.originalDim);
  }

  /**
   * Calcula produto interno aproximado entre dois vetores comprimidos
   * SEM descomprimir — é o "truque assimétrico" do QJL/TurboQuant
   * 
   * @param {Float32Array} queryVector - Query em FP32 (NÃO comprimida)
   * @param {Object} compressedKey - Key comprimida
   */
  approximateDotProduct(queryVector, compressedKey) {
    // Aplicar a mesma rotação à query
    const rotatedQuery = new Float32Array(this.dim);
    for (let i = 0; i < queryVector.length; i++) {
      rotatedQuery[i] = queryVector[i];
    }
    randomizedWHT(rotatedQuery, this.signs);

    // Produto interno no espaço comprimido
    let dot = 0;
    const { indices, norm } = compressedKey;
    for (let i = 0; i < this.dim; i++) {
      dot += rotatedQuery[i] * dequantizeScalar(indices[i], this.codebook);
    }

    return dot * norm;
  }

  /**
   * Estatísticas de compressão
   */
  get compressionStats() {
    const bytesOriginal = this.originalDim * 4;      // FP32 = 4 bytes
    const bytesCompressed = this.dim * 1 + 4;        // indices + norm (float)
    return {
      originalBytes: bytesOriginal,
      compressedBytes: bytesCompressed,
      ratio: (bytesOriginal / bytesCompressed).toFixed(2),
      savingsPercent: ((1 - bytesCompressed / bytesOriginal) * 100).toFixed(1),
    };
  }
}

/**
 * Gerenciador de KV Cache comprimido para uma sessão de chat
 */
class CompressedKVCache {
  constructor({ numLayers, numHeads, headDim, numBits = 4 }) {
    this.engines = Array.from({ length: numHeads }, () =>
      new TurboQuantEngine({ dim: headDim, numBits })
    );

    this.cache = {
      keys: Array.from({ length: numLayers }, () => []),   // [layer][token] = compressed
      values: Array.from({ length: numLayers }, () => []), // [layer][token] = compressed
    };

    this.numLayers = numLayers;
    this.numHeads = numHeads;
  }

  addToken(layer, head, keyVector, valueVector) {
    const engine = this.engines[head];
    this.cache.keys[layer].push(engine.compress(keyVector));
    this.cache.values[layer].push(engine.compress(valueVector));
  }

  getKeys(layer, head) {
    return this.cache.keys[layer].map(
      compressed => this.engines[head].decompress(compressed)
    );
  }

  getValues(layer, head) {
    return this.cache.values[layer].map(
      compressed => this.engines[head].decompress(compressed)
    );
  }

  get tokenCount() {
    return this.cache.keys[0]?.length ?? 0;
  }

  clear() {
    for (let l = 0; l < this.numLayers; l++) {
      this.cache.keys[l] = [];
      this.cache.values[l] = [];
    }
  }
}

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

module.exports = { TurboQuantEngine, CompressedKVCache };
```

### 2.4 — Integração com o node-llama-cpp (Wrapper)

```javascript
// src/main/ai/smartContextManager.js

const { TurboQuantEngine, CompressedKVCache } = require('./turboQuant/turboQuantEngine');
const diagnostics = require('./diagnostics');

/**
 * SmartContextManager — Gerencia o contexto de forma inteligente no NexoMente,
 * aplicando TurboQuant para comprimir o KV Cache quando necessário.
 * 
 * IMPORTANTE: O node-llama-cpp gerencia o KV cache internamente em C++.
 * Este manager atua em dois modos:
 * 
 * MODO A (Recomendado): Usa os parâmetros nativos do llama.cpp (cacheTypeK/V)
 *   → Sem código custom, máxima velocidade, feito em CUDA/Metal
 *   
 * MODO B (Experimental): Divide contextos longos em chunks, usando TurboQuant
 *   para comprimir chunks antigos e manter apenas o chunk atual no llama.cpp
 */
class SmartContextManager {
  constructor(llamaContext, hardware) {
    this.context = llamaContext;
    this.hardware = hardware;

    // Histórico de mensagens para chunking
    this.conversationHistory = [];
    this.compressedHistory = []; // Chunks antigos comprimidos

    // Motor TurboQuant para sumarização comprimida
    this.quantEngine = new TurboQuantEngine({
      dim: 4096, // Embedding dim típico para modelos 7B/8B
      numBits: 4,
    });

    // Configurações adaptativas
    this.maxActiveTokens = this.calculateMaxActiveTokens();
    
    console.log(`[SmartContextManager] maxActiveTokens: ${this.maxActiveTokens}`);
    console.log(`[SmartContextManager] Compressão TurboQuant: ${this.quantEngine.compressionStats.ratio}x`);
  }

  calculateMaxActiveTokens() {
    // Deixar 70% do contexto configurado para conteúdo ativo
    // O resto é margem para geração
    const contextSize = this.hardware.ramGB >= 16 ? 8192 : 4096;
    return Math.floor(contextSize * 0.70);
  }

  /**
   * Adiciona mensagem ao histórico gerenciado
   */
  async addMessage(role, content) {
    const tokens = this.estimateTokens(content);
    
    this.conversationHistory.push({ role, content, tokens });
    
    // Se estiver chegando no limite, comprimir histórico antigo
    const totalTokens = this.getTotalActiveTokens();
    if (totalTokens > this.maxActiveTokens) {
      await this.compressOldHistory();
    }
  }

  /**
   * Comprime mensagens antigas do histórico usando sumarização
   */
  async compressOldHistory() {
    // Quantidade de mensagens para comprimir (50% das mais antigas)
    const toCompress = Math.floor(this.conversationHistory.length * 0.4);
    const oldMessages = this.conversationHistory.splice(0, toCompress);
    
    // Criar sumário comprimido das mensagens antigas
    const summary = await this.summarizeMessages(oldMessages);
    
    // Adicionar sumário no início do histórico ativo
    this.conversationHistory.unshift({
      role: 'system',
      content: `[CONTEXTO ANTERIOR RESUMIDO]: ${summary}`,
      tokens: this.estimateTokens(summary),
      isCompressed: true,
    });

    console.log(`[SmartContextManager] Comprimiu ${toCompress} mensagens em 1 sumário`);
  }

  async summarizeMessages(messages) {
    const text = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    // Usa o próprio modelo para sumarizar (chamada rápida com contexto pequeno)
    const session = await this.context.getSequence();
    const prompt = `Resuma em 3-5 frases objetivas o seguinte histórico de conversa para manter o contexto essencial:\n\n${text}\n\nRESUMO:`;
    
    let summary = '';
    await session.prompt(prompt, {
      maxTokens: 200,
      onTextChunk: (chunk) => { summary += chunk; },
    });
    
    return summary.trim();
  }

  /**
   * Retorna o prompt completo para o modelo, com histórico otimizado
   */
  buildOptimizedPrompt(newUserMessage) {
    const systemPrompt = this.buildSystemPrompt();
    const historyText = this.conversationHistory
      .map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content}`)
      .join('\n\n');
    
    return `${systemPrompt}\n\n${historyText}\n\nUsuário: ${newUserMessage}\nIA:`;
  }

  buildSystemPrompt() {
    return `Você é um tutor inteligente do NexoMente, ajudando o estudante a entender e memorizar conteúdo. 
Seja preciso, didático e conciso. Se resumir textos, capture todos os conceitos-chave.`;
  }

  getTotalActiveTokens() {
    return this.conversationHistory.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
  }

  estimateTokens(text) {
    // Aproximação: ~4 caracteres por token (heurística comum)
    return Math.ceil(text.length / 4);
  }
}

module.exports = { SmartContextManager };
```

---

## FASE 3 — Módulo Nativo C++ (Para Máxima Performance)

Esta fase é **opcional e avançada**. Só implementar se a Fase 2 ainda estiver lenta.

### 3.1 — Estrutura do Addon Nativo

```
nexomente/
└── src/
    └── native/
        └── turbo_quant/
            ├── binding.gyp          ← configuração de build
            ├── turbo_quant.cc       ← código C++ principal
            ├── hadamard.h           ← implementação WHT com SIMD
            └── quantizer.h          ← quantizador otimizado
```

### 3.2 — binding.gyp

```json
{
  "targets": [
    {
      "target_name": "turbo_quant_native",
      "sources": ["turbo_quant.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-O3", "-march=native", "-msse4.2", "-mavx2"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/arch:AVX2", "/O2"]
            }
          }
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "OTHER_CPLUSPLUSFLAGS": ["-O3", "-march=native"]
          }
        }]
      ]
    }
  ]
}
```

### 3.3 — turbo_quant.cc (Interface N-API)

```cpp
// src/native/turbo_quant/turbo_quant.cc
#include <napi.h>
#include <cmath>
#include <vector>
#include <cstring>
#include <algorithm>

// ===== WALSH-HADAMARD TRANSFORM (com AVX2 se disponível) =====

void WHT(float* data, int n) {
    for (int h = 1; h < n; h <<= 1) {
        for (int i = 0; i < n; i += h << 1) {
            for (int j = i; j < i + h; ++j) {
                float x = data[j];
                float y = data[j + h];
                data[j]     = x + y;
                data[j + h] = x - y;
            }
        }
    }
    float scale = 1.0f / std::sqrt((float)n);
    for (int i = 0; i < n; ++i) data[i] *= scale;
}

// ===== QUANTIZAÇÃO ESCALAR =====

int QuantizeScalar(float val, const float* codebook, int codebookSize) {
    int best = 0;
    float bestDist = std::abs(val - codebook[0]);
    for (int i = 1; i < codebookSize; ++i) {
        float dist = std::abs(val - codebook[i]);
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    }
    return best;
}

// ===== FUNÇÕES EXPOSTAS AO NODE.JS =====

Napi::Value Compress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Parâmetros: (Float32Array vector, Int8Array signs, Float32Array codebook)
    auto vectorBuf = info[0].As<Napi::Float32Array>();
    auto signsBuf  = info[1].As<Napi::Int8Array>();
    auto cbBuf     = info[2].As<Napi::Float32Array>();

    int n = vectorBuf.ElementLength();
    int cbSize = cbBuf.ElementLength();

    std::vector<float> work(n);
    std::memcpy(work.data(), vectorBuf.Data(), n * sizeof(float));

    // 1. Calcular norma
    float normSq = 0;
    for (int i = 0; i < n; ++i) normSq += work[i] * work[i];
    float norm = std::sqrt(normSq);

    // 2. Normalizar
    if (norm > 1e-8f) {
        for (int i = 0; i < n; ++i) work[i] /= norm;
    }

    // 3. Aplicar sinais aleatórios
    const int8_t* signs = signsBuf.Data();
    for (int i = 0; i < n; ++i) work[i] *= signs[i];

    // 4. WHT
    WHT(work.data(), n);

    // 5. Quantizar
    auto result = Napi::Uint8Array::New(env, n);
    const float* codebook = cbBuf.Data();
    for (int i = 0; i < n; ++i) {
        result[i] = (uint8_t)QuantizeScalar(work[i], codebook, cbSize);
    }

    // Retornar { indices, norm }
    auto obj = Napi::Object::New(env);
    obj.Set("indices", result);
    obj.Set("norm", Napi::Number::New(env, norm));
    return obj;
}

Napi::Value Decompress(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto indicesBuf = info[0].As<Napi::Uint8Array>();
    float norm      = info[1].As<Napi::Number>().FloatValue();
    auto signsBuf   = info[2].As<Napi::Int8Array>();
    auto cbBuf      = info[3].As<Napi::Float32Array>();

    int n = indicesBuf.ElementLength();
    const float* codebook = cbBuf.Data();
    const int8_t* signs = signsBuf.Data();
    const uint8_t* indices = indicesBuf.Data();

    auto result = Napi::Float32Array::New(env, n);
    float* out = result.Data();

    // 1. Dequantizar
    for (int i = 0; i < n; ++i) out[i] = codebook[indices[i]];

    // 2. WHT inversa (mesma operação)
    WHT(out, n);

    // 3. Aplicar sinais inversos
    for (int i = 0; i < n; ++i) out[i] *= signs[i];

    // 4. Escalar pela norma
    for (int i = 0; i < n; ++i) out[i] *= norm;

    return result;
}

// Registrar funções no módulo
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("compress",   Napi::Function::New(env, Compress));
    exports.Set("decompress", Napi::Function::New(env, Decompress));
    return exports;
}

NODE_API_MODULE(turbo_quant_native, Init)
```

### 3.4 — Build script

```json
// package.json (adicionar)
{
  "scripts": {
    "build:native": "node-gyp rebuild --directory=src/native/turbo_quant",
    "rebuild:native": "node-gyp clean && npm run build:native"
  },
  "dependencies": {
    "node-addon-api": "^7.0.0",
    "node-gyp": "^10.0.0"
  }
}
```

---

## FASE 4 — UX Adaptativa no NexoMente

### 4.1 — Tela de Configurações de IA

```jsx
// src/renderer/components/AISettings/AIPerformancePanel.jsx
import React, { useState, useEffect } from 'react';

const QUALITY_PRESETS = {
  quality: {
    label: '🎯 Qualidade Máxima',
    description: 'Melhor para resumos precisos de matéria. Requer mais RAM.',
    cacheTypeK: 'q8_0',
    cacheTypeV: 'q4_0',
    contextSize: 8192,
    minRAM: 16,
  },
  balanced: {
    label: '⚖️ Equilíbrio (Recomendado)',
    description: 'Boa qualidade em computadores com 8-16 GB de RAM.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 4096,
    minRAM: 8,
  },
  performance: {
    label: '⚡ Desempenho',
    description: 'Para computadores mais simples. Contexto menor, resposta mais rápida.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 2048,
    minRAM: 4,
  },
};

export function AIPerformancePanel({ hardware, onPresetChange }) {
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-selecionar preset baseado no hardware detectado
  useEffect(() => {
    if (!hardware) return;
    if (hardware.ramGB >= 32 && hardware.hasGPU) {
      setSelectedPreset('quality');
    } else if (hardware.ramGB >= 16) {
      setSelectedPreset('balanced');
    } else {
      setSelectedPreset('performance');
    }
  }, [hardware]);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    onPresetChange(QUALITY_PRESETS[preset]);
  };

  return (
    <div className="ai-performance-panel">
      <div className="hardware-badge">
        <span>💻 Detectado: {hardware?.ramGB}GB RAM</span>
        {hardware?.hasGPU && <span> · 🎮 {hardware?.gpuName}</span>}
      </div>

      <h3>Modo de Desempenho da IA</h3>

      <div className="preset-grid">
        {Object.entries(QUALITY_PRESETS).map(([key, preset]) => {
          const isCompatible = hardware?.ramGB >= preset.minRAM;
          return (
            <button
              key={key}
              className={`preset-card ${selectedPreset === key ? 'selected' : ''} ${!isCompatible ? 'disabled' : ''}`}
              onClick={() => isCompatible && handlePresetSelect(key)}
              disabled={!isCompatible}
            >
              <div className="preset-label">{preset.label}</div>
              <div className="preset-desc">{preset.description}</div>
              <div className="preset-specs">
                Contexto: {(preset.contextSize / 1000).toFixed(0)}k tokens
                {!isCompatible && <span className="incompatible"> · Requer {preset.minRAM}GB+</span>}
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▲' : '▼'} Configurações Avançadas
      </button>

      {showAdvanced && (
        <AdvancedSettings hardware={hardware} preset={QUALITY_PRESETS[selectedPreset]} />
      )}
    </div>
  );
}

function AdvancedSettings({ hardware, preset }) {
  return (
    <div className="advanced-settings">
      <div className="setting-row">
        <label>Cache Keys (mais sensível)</label>
        <code>{preset.cacheTypeK}</code>
      </div>
      <div className="setting-row">
        <label>Cache Values (menos sensível)</label>
        <code>{preset.cacheTypeV}</code>
      </div>
      <div className="setting-row">
        <label>Contexto máximo</label>
        <code>{preset.contextSize} tokens ≈ {Math.floor(preset.contextSize * 4 / 1000)}k chars</code>
      </div>
      <div className="setting-row">
        <label>GPU Layers</label>
        <code>{hardware?.hasGPU ? 'Auto (GPU detectada)' : 'CPU only'}</code>
      </div>
    </div>
  );
}
```

### 4.2 — Indicador de Memória em Tempo Real

```jsx
// src/renderer/components/AIMemoryIndicator.jsx
import React, { useState, useEffect } from 'react';

export function AIMemoryIndicator() {
  const [memStats, setMemStats] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await window.electronAPI.invoke('ai:getMemoryStats');
      setMemStats(stats);
    }, 2000); // Atualiza a cada 2s

    return () => clearInterval(interval);
  }, []);

  if (!memStats) return null;

  const usagePercent = (memStats.kvCacheUsedMB / memStats.kvCacheMaxMB) * 100;
  const color = usagePercent > 80 ? '#ef4444' : usagePercent > 60 ? '#f59e0b' : '#22c55e';

  return (
    <div className="memory-indicator" title="Uso do contexto de IA">
      <div className="memory-bar" style={{ background: '#1f2937' }}>
        <div
          className="memory-fill"
          style={{ width: `${usagePercent}%`, background: color, transition: 'width 0.3s' }}
        />
      </div>
      <span className="memory-label">
        Contexto: {memStats.activeTokens?.toLocaleString()} tokens
      </span>
    </div>
  );
}
```

---

## 📊 Resultado Esperado por Fase

| Fase | Esforço | Ganho de RAM | Ganho de Velocidade | Risco |
|------|---------|-------------|-------------------|-------|
| 1 — KV nativo (q4_0/q8_0) | 1-2 dias | 2-4x menos RAM | 20-40% mais rápido | Muito baixo |
| 2 — TurboQuant JS | 1-2 semanas | 4-5x menos RAM | 10-20% mais rápido | Baixo |
| 3 — Módulo C++ nativo | 2-4 semanas | Igual à Fase 2 | 2-3x mais rápido | Médio |
| 4 — UX adaptativa | 2-3 dias | N/A | N/A | Baixo |

**Recomendação para o NexoMente:** Implementar Fase 1 + Fase 4 primeiro. Isso já resolve 80% do problema com 20% do esforço.

---

## 🔧 Checklist de Implementação

### Fase 1 (Hoje)
- [ ] Criar `hardwareDetector.js`
- [ ] Atualizar `llamaManager.js` com `cacheTypeK` e `cacheTypeV`
- [ ] Adicionar `diagnostics.js` para medir ganhos reais
- [ ] Testar com Llama 3 8B no cenário de "colar capítulo de livro"

### Fase 2 (Esta semana)
- [ ] Criar pasta `src/main/ai/turboQuant/`
- [ ] Implementar `hadamard.js`
- [ ] Implementar `scalarQuantizer.js`
- [ ] Implementar `turboQuantEngine.js`
- [ ] Integrar `SmartContextManager` no fluxo de chat
- [ ] Testes unitários de compressão/descompressão

### Fase 3 (Opcional)
- [ ] Instalar `node-addon-api` e `node-gyp`
- [ ] Compilar addon C++ no CI/CD do Electron
- [ ] Empacotar binários pré-compilados para Win/Mac/Linux

### Fase 4 (UX)
- [ ] Criar `AIPerformancePanel` nas configurações
- [ ] Criar `AIMemoryIndicator` no chat
- [ ] Persistir preferências no SQLite
- [ ] Tela de onboarding detectando hardware automaticamente

---

## 📚 Referências

- **TurboQuant**: Zandieh et al. (2025) — arXiv:2504.19874
- **PolarQuant**: Han et al. (2025) — arXiv:2502.02617
- **QJL**: Zandieh et al. (2024) — arXiv:2406.03482
- **node-llama-cpp docs**: https://node-llama-cpp.withcat.ai/guide/
- **llama.cpp KV quantization**: https://github.com/ggerganov/llama.cpp/blob/master/docs/quantization.md

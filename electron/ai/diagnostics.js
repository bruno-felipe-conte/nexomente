import os from 'os';

/**
 * Utilitário para medir o impacto da IA no consumo de memória.
 */
class AIDiagnostics {
  constructor() {
    this.snapshots = [];
  }

  snapshot(label) {
    const mem = process.memoryUsage();
    const system = {
      label,
      timestamp: Date.now(),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024), // Onde llama.cpp aloca buffers
      systemFreeRAM: Math.round(os.freemem() / 1024 / 1024),
      systemTotalRAM: Math.round(os.totalmem() / 1024 / 1024),
    };
    this.snapshots.push(system);
    console.log(`[AI DIAGNOSTICS] ${label}:`, system);
    return system;
  }

  delta(labelA, labelB) {
    const a = this.snapshots.find(s => s.label === labelA);
    const b = this.snapshots.find(s => s.label === labelB);
    if (!a || !b) return null;
    return {
      heapDeltaMB: b.heapUsed - a.heapUsed,
      externalDeltaMB: b.external - a.external,
      systemRAMDeltaMB: a.systemFreeRAM - b.systemFreeRAM,
    };
  }
}

export default new AIDiagnostics();

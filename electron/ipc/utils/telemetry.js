/**
 * Telemetria e Observabilidade Unificada do NexoMente (Main Process)
 * Mede latência IPC, taxa de sucesso de inferências de IA, e métricas de sistema.
 */
import os from 'os';

class MetricsCollector {
  constructor() {
    this.ipcCalls = new Map(); // canal -> { count, totalMs, errors }
    this.aiInferences = [];    // histórico de inferências { timestamp, durationMs, success, tokens }
    this.maxHistory = 100;
  }

  recordIpc(channel, durationMs, success = true) {
    const stat = this.ipcCalls.get(channel) || { count: 0, totalMs: 0, errors: 0 };
    stat.count += 1;
    stat.totalMs += durationMs;
    if (!success) stat.errors += 1;
    this.ipcCalls.set(channel, stat);
  }

  recordInference({ durationMs, success, tokenCount = 0, modelName = 'default' }) {
    this.aiInferences.push({
      timestamp: Date.now(),
      durationMs,
      success,
      tokenCount,
      modelName,
      tps: durationMs > 0 && tokenCount > 0 ? Number(((tokenCount / durationMs) * 1000).toFixed(1)) : 0,
    });

    if (this.aiInferences.length > this.maxHistory) {
      this.aiInferences.shift();
    }
  }

  getSnapshot() {
    const memory = process.memoryUsage();
    const ipcSummary = {};

    this.ipcCalls.forEach((val, key) => {
      ipcSummary[key] = {
        totalCalls: val.count,
        avgLatencyMs: Math.round(val.totalMs / val.count),
        errors: val.errors,
      };
    });

    const successfulInferences = this.aiInferences.filter(i => i.success);
    const avgInferenceMs = successfulInferences.length > 0
      ? Math.round(successfulInferences.reduce((acc, curr) => acc + curr.durationMs, 0) / successfulInferences.length)
      : 0;

    return {
      timestamp: Date.now(),
      system: {
        freeRamMB: Math.round(os.freemem() / 1024 / 1024),
        totalRamMB: Math.round(os.totalmem() / 1024 / 1024),
        cpuCount: os.cpus().length,
        uptimeSeconds: Math.round(process.uptime()),
      },
      memory: {
        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
        externalMB: Math.round(memory.external / 1024 / 1024),
      },
      ai: {
        totalInferences: this.aiInferences.length,
        avgInferenceDurationMs: avgInferenceMs,
        lastInference: this.aiInferences[this.aiInferences.length - 1] || null,
      },
      ipc: ipcSummary,
    };
  }
}

export const telemetry = new MetricsCollector();

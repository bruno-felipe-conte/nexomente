import os from 'os';
import { execSync } from 'child_process';

/**
 * Detecta especificações de hardware para otimizar o KV Cache da IA.
 */
export async function detectHardware() {
  const hardware = {
    ramGB: Math.floor(os.totalmem() / 1024 / 1024 / 1024),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    hasGPU: false,
    vramMB: 0,
    gpuName: 'None',
    platform: process.platform,
  };

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
        const rawVram = parseInt(parts[1]);
        hardware.vramMB = Math.abs(Math.floor(rawVram / 1024 / 1024)) || 0;
      }
    } else if (process.platform === 'darwin') {
      const output = execSync('system_profiler SPDisplaysDataType', { encoding: 'utf8', timeout: 3000 });
      if (output.includes('Metal')) {
        hardware.hasGPU = true;
        hardware.gpuName = 'Apple Metal GPU';
        hardware.vramMB = Math.floor((hardware.ramGB * 1024) * 0.5);
      }
    } else if (process.platform === 'linux') {
      try {
        const output = execSync('nvidia-smi --query-gpu=name,memory.total --format:csv,noheader', {
          encoding: 'utf8', timeout: 3000,
        });
        const parts = output.trim().split(',');
        hardware.hasGPU = true;
        hardware.gpuName = parts[0]?.trim();
        hardware.vramMB = parseInt(parts[1]) || 0;
      } catch {
        // Sem NVIDIA
      }
    }
  } catch (err) {
    console.warn('[HardwareDetector] GPU detection failed:', err.message);
  }

  hardware.tier = classifyHardware(hardware);
  return hardware;
}

function classifyHardware(hw) {
  if (hw.ramGB >= 32 && hw.hasGPU && hw.vramMB >= 6000) return 'HIGH';
  if (hw.ramGB >= 16 || (hw.hasGPU && hw.vramMB >= 4000)) return 'MEDIUM';
  if (hw.ramGB >= 8) return 'LOW';
  return 'MINIMAL';
}

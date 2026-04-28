import os from 'os';
import { execSync } from 'child_process';

/**
 * Detecta especificações de hardware para otimizar o KV Cache da IA.
 */
export async function detectHardware() {
  const hardware = {
    ramGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    hasGPU: false,
    vramMB: 0,
    gpuName: 'None',
    platform: process.platform,
  };

  try {
    if (process.platform === 'win32') {
      try {
        const psCmd = 'powershell -Command "Get-CimInstance Win32_VideoController | ForEach-Object { \'{0},{1}\' -f $_.Name, $_.AdapterRAM }"';
        const output = execSync(psCmd, { encoding: 'utf8', timeout: 5000 }).trim();
        const lines = output.split('\n').filter(l => l.includes(','));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          hardware.hasGPU = true;
          hardware.gpuName = parts[0]?.trim() || 'Unknown GPU';
          const rawVram = parseInt(parts[1]) || 0;
          hardware.vramMB = Math.abs(Math.floor(rawVram / 1024 / 1024));
        }
      } catch (err) {
        console.warn('[HardwareDetector] PowerShell GPU detection failed:', err.message);
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
    console.warn('[HardwareDetector] General GPU detection failed:', err.message);
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

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const MAX_BACKUPS = 7;

/**
 * Realiza backup do arquivo SQLite principal
 * @param {string} [backupDir] Diretório de destino opcional
 * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>}
 */
export async function performDatabaseBackup(backupDir = null) {
  try {
    const userDataPath = app.getPath('userData');
    const sourceDb = path.join(userDataPath, 'nexomente.db');

    if (!fs.existsSync(sourceDb)) {
      return { success: false, error: 'Banco de dados de origem não existe ainda.' };
    }

    const targetDir = backupDir || path.join(userDataPath, 'backups');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const today = new Date().toISOString().slice(0, 10);
    const backupFileName = `nexomente_backup_${today}.db`;
    const targetFile = path.join(targetDir, backupFileName);

    // Cópia atômica síncrona / segura
    fs.copyFileSync(sourceDb, targetFile);

    // Rotação: manter apenas os MAX_BACKUPS mais recentes
    rotateOldBackups(targetDir);

    return {
      success: true,
      backupPath: targetFile,
      fileName: backupFileName,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[BACKUP] Erro ao realizar backup do banco:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove backups mais antigos que MAX_BACKUPS
 * @param {string} targetDir
 */
function rotateOldBackups(targetDir) {
  try {
    const files = fs.readdirSync(targetDir)
      .filter(f => f.startsWith('nexomente_backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        fullPath: path.join(targetDir, f),
        mtime: fs.statSync(path.join(targetDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime); // mais novo primeiro

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(file.fullPath);
      }
    }
  } catch (err) {
    console.warn('[BACKUP] Falha menor na rotação de backups:', err.message);
  }
}

/**
 * Lista todos os backups disponíveis
 */
export function listDatabaseBackups() {
  try {
    const targetDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(targetDir)) return [];

    return fs.readdirSync(targetDir)
      .filter(f => f.startsWith('nexomente_backup_') && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(targetDir, f);
        const stat = fs.statSync(fullPath);
        return {
          fileName: f,
          fullPath,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

import fs from 'fs';
import path from 'path';

/**
 * Script de diagnóstico SOMENTE LEITURA para detecção de sessões de estudo
 * e transações de XP potencialmente duplicadas no banco SQLite local.
 *
 * Uso:
 *   node scripts/diagnostico_sessoes_xp.js [--db caminho_do_banco.db]
 */

function findDatabasePath() {
  const customIndex = process.argv.indexOf('--db');
  if (customIndex !== -1 && process.argv[customIndex + 1]) {
    return process.argv[customIndex + 1];
  }

  const appData = process.env.APPDATA || (
    process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support')
      : path.join(process.env.HOME || '', '.config')
  );

  const possiblePaths = [
    path.join(appData, 'nexomente', 'nexomente.db'),
    path.join(appData, 'NexoMente', 'nexomente.db'),
    path.join(process.cwd(), 'nexomente.db')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return possiblePaths[0]; // fallback default
}

async function runDiagnostic() {
  console.log('='.repeat(70));
  console.log('DIAGNÓSTICO DE SESSÕES E XP (MODO SOMENTE LEITURA)');
  console.log('='.repeat(70));

  const dbPath = findDatabasePath();
  console.log(`Caminho verificado: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.log('\n[INFO] O arquivo de banco SQLite não foi encontrado no caminho acima.');
    console.log('Isso é esperado em ambiente de testes ou antes do primeiro uso real do Electron.');
    console.log('Nenhuma duplicata ou inconsistência detectada em disco.\n');
    return;
  }

  let Database;
  try {
    const mod = await import('better-sqlite3');
    Database = mod.default;
  } catch (err) {
    console.error('[ERRO] better-sqlite3 não disponível para leitura do SQLite:', err.message);
    process.exit(1);
  }

  // Abertura estritamente SOMENTE LEITURA
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    // 1. Total de sessões
    const totalSessoes = db.prepare('SELECT COUNT(*) as count FROM sessoes_estudo').get().count;
    const totalXP = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(xp), 0) as total FROM transacoes_xp WHERE source_type = 'sessao'").get();

    console.log(`Total de sessões registradas: ${totalSessoes}`);
    console.log(`Total de transações de XP de sessões: ${totalXP.count} (${totalXP.total} XP)\n`);

    if (totalSessoes === 0) {
      console.log('[OK] Tabela sessoes_estudo está vazia. Nenhuma duplicata encontrada.');
      return;
    }

    // 2. Busca por duplicatas de sessões (mesma matéria, mesmo tipo e criadas/iniciadas no mesmo minuto ou janela < 60s)
    const dups = db.prepare(`
      SELECT s1.id as id1, s2.id as id2,
             s1.materia_id, s1.tipo, s1.duracao_minutos,
             s1.started_at as s1_started, s2.started_at as s2_started,
             s1.criado_em as s1_criado, s2.criado_em as s2_criado
      FROM sessoes_estudo s1
      JOIN sessoes_estudo s2 ON s1.id < s2.id
        AND s1.materia_id = s2.materia_id
        AND s1.tipo = s2.tipo
        AND (
          s1.started_at = s2.started_at
          OR ABS(strftime('%s', s1.criado_em) - strftime('%s', s2.criado_em)) <= 60
        )
      ORDER BY s1.criado_em DESC
    `).all();

    console.log('--- SESSÕES COM INDÍCIO DE DUPLICIDADE (MESMO CICLO) ---');
    if (dups.length === 0) {
      console.log('[OK] Nenhuma sessão duplicada encontrada.');
    } else {
      console.log(`[ALERTA] ${dups.length} pares de sessões identificados com timestamp/ciclo concorrente:`);
      for (const d of dups) {
        console.log(`  - Par: ${d.id1} <-> ${d.id2} | Matéria: ${d.materia_id || 'N/A'} | Tipo: ${d.tipo}`);
        console.log(`    Criado em: [${d.s1_criado}] vs [${d.s2_criado}]`);
      }
    }

    // 3. Busca por XP possivelmente contado em dobro para a mesma sessão ou no mesmo ciclo
    const xpDups = db.prepare(`
      SELECT x1.id as xp1_id, x2.id as xp2_id,
             x1.source_id, x1.xp,
             x1.created_at as xp1_date, x2.created_at as xp2_date
      FROM transacoes_xp x1
      JOIN transacoes_xp x2 ON x1.id < x2.id
        AND x1.source_type = 'sessao'
        AND x2.source_type = 'sessao'
        AND (
          (x1.source_id IS NOT NULL AND x1.source_id = x2.source_id)
          OR ABS(strftime('%s', x1.created_at) - strftime('%s', x2.created_at)) <= 10
        )
      ORDER BY x1.created_at DESC
    `).all();

    console.log('\n--- TRANSAÇÕES DE XP POTENCIALMENTE DUPLICADAS ---');
    if (xpDups.length === 0) {
      console.log('[OK] Nenhuma transação de XP duplicada encontrada.');
    } else {
      let xpExcedente = 0;
      console.log(`[ALERTA] ${xpDups.length} transações concorrentes detectadas:`);
      for (const x of xpDups) {
        console.log(`  - XP Par: ${x.xp1_id} (${x.xp} XP) <-> ${x.xp2_id} (${x.xp} XP) | Sessão ID: ${x.source_id || 'N/A'}`);
        console.log(`    Registrado em: [${x.xp1_date}] vs [${x.xp2_date}]`);
        xpExcedente += x.xp;
      }
      console.log(`\nEstimativa total de XP potencialmente duplicado: ${xpExcedente} XP`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('STATUS: Diagnóstico concluído. NENHUM DADO FOI ALTERADO.');
    console.log('='.repeat(70));
  } finally {
    db.close();
  }
}

runDiagnostic().catch(err => {
  console.error('[ERRO NO DIAGNÓSTICO]:', err);
  process.exit(1);
});

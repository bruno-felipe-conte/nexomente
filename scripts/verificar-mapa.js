#!/usr/bin/env node
/**
 * scripts/verificar-mapa.js
 *
 * Validador automatizado do MAPA de conexões do NexoMente:
 * 1. Verifica se todo arquivo citado no docs/mapa.json existe no disco.
 * 2. Extrai todos os canais IPC declarados no código (ipcMain.handle) e confere paridade com o mapa.
 * 3. Falha com exit code 1 e relatório detalhado se houver discrepância.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MAPA_JSON_PATH = path.join(ROOT_DIR, 'docs', 'mapa.json');
const MAPA_MD_PATH = path.join(ROOT_DIR, 'docs', 'MAPA.md');

console.log('🔍 Iniciando verificação do MAPA de conexões do NexoMente...\n');

let hasErrors = false;

// 1. Carrega docs/mapa.json
if (!fs.existsSync(MAPA_JSON_PATH)) {
  console.error('❌ ERRO: Arquivo docs/mapa.json não encontrado!');
  process.exit(1);
}

if (!fs.existsSync(MAPA_MD_PATH)) {
  console.error('❌ ERRO: Arquivo docs/MAPA.md não encontrado!');
  process.exit(1);
}

const mapa = JSON.parse(fs.readFileSync(MAPA_JSON_PATH, 'utf-8'));
const mapaMdContent = fs.readFileSync(MAPA_MD_PATH, 'utf-8');

// 2. Coleta todos os caminhos de arquivos referenciados no mapa.json
const arquivosParaVerificar = new Set();

// Hubs
(mapa.hubs || []).forEach(hub => {
  if (hub.arquivo) arquivosParaVerificar.add(hub.arquivo);
  if (Array.isArray(hub.implementacao)) {
    hub.implementacao.forEach(f => arquivosParaVerificar.add(f));
  } else if (hub.implementacao) {
    arquivosParaVerificar.add(hub.implementacao);
  }
  (hub.usado_por || []).forEach(f => arquivosParaVerificar.add(f));
});

// Nós
(mapa.nos || []).forEach(no => {
  if (no.arquivo) arquivosParaVerificar.add(no.arquivo);
});

// Canais IPC
(mapa.ipc_canais || []).forEach(ipc => {
  if (ipc.chama) arquivosParaVerificar.add(ipc.chama);
  if (ipc.trata) arquivosParaVerificar.add(ipc.trata);
});

console.log(`📁 Validando existência de ${arquivosParaVerificar.size} arquivos citados no mapa...`);
const arquivosFaltantes = [];
for (const relPath of arquivosParaVerificar) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    arquivosFaltantes.push(relPath);
  }
}

if (arquivosFaltantes.length > 0) {
  console.error('\n❌ Arquivos citados no mapa que NÃO existem no projeto:');
  arquivosFaltantes.forEach(f => console.error(`   - ${f}`));
  hasErrors = true;
} else {
  console.log('   ✅ Todos os arquivos citados no mapa existem no projeto.');
}

// 3. Extrai todos os canais IPC declarados no código do Electron (ipcMain.handle)
console.log('\n📡 Verificando paridade dos canais IPC do Electron...');
const ipcDir = path.join(ROOT_DIR, 'electron', 'ipc');
const ipcFiles = fs.readdirSync(ipcDir).filter(f => f.endsWith('.js'));
const canaisNoCodigo = new Set();

const regexIpcHandle = /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g;

for (const f of ipcFiles) {
  const content = fs.readFileSync(path.join(ipcDir, f), 'utf-8');
  let match;
  while ((match = regexIpcHandle.exec(content)) !== null) {
    canaisNoCodigo.add(match[1]);
  }
}

const canaisNoJson = new Set((mapa.ipc_canais || []).map(i => i.canal));

const canaisFaltandoNoMapa = [...canaisNoCodigo].filter(c => !canaisNoJson.has(c));
const canaisExtrasNoMapa = [...canaisNoJson].filter(c => !canaisNoCodigo.has(c));

if (canaisFaltandoNoMapa.length > 0) {
  console.error('\n❌ Canais IPC encontrados no código mas ausentes em docs/mapa.json:');
  canaisFaltandoNoMapa.forEach(c => console.error(`   - ${c}`));
  hasErrors = true;
}

if (canaisExtrasNoMapa.length > 0) {
  console.error('\n❌ Canais IPC citados em docs/mapa.json que não foram achados no código:');
  canaisExtrasNoMapa.forEach(c => console.error(`   - ${c}`));
  hasErrors = true;
}

if (canaisFaltandoNoMapa.length === 0 && canaisExtrasNoMapa.length === 0) {
  console.log(`   ✅ Todos os ${canaisNoCodigo.size} canais IPC do código coincidem 100% com o mapa.`);
}

// 4. Confere paridade entre MAPA.md e mapa.json para os canais
const canaisFaltandoNoMd = [...canaisNoCodigo].filter(c => !mapaMdContent.includes(`\`${c}\``));
if (canaisFaltandoNoMd.length > 0) {
  console.error('\n❌ Canais IPC ausentes na tabela do docs/MAPA.md:');
  canaisFaltandoNoMd.forEach(c => console.error(`   - ${c}`));
  hasErrors = true;
} else {
  console.log('   ✅ docs/MAPA.md reflete todos os canais IPC.');
}

console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('❌ FALHA: O mapa de conexões está desatualizado!');
  process.exit(1);
} else {
  console.log('✨ SUCESSO: O mapa de conexões está 100% sincronizado e íntegro!');
  process.exit(0);
}

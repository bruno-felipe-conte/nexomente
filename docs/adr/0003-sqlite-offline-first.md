# ADR 003: Armazenamento Offline com SQLite no Electron

## Data
2026-04-25

## Status
Aceito

## Contexto
Sendo uma ferramenta de Segundo Cérebro, a integridade, velocidade e persistência de dados (notas, flashcards, métricas Pomodoro) são essenciais. Soluções como IndexedDB e localStorage são propensas a limites de tamanho e exclusões acidentais caso o cache seja limpo.

## Decisão
Como o NexoMente opera via Electron, foi escolhido o uso do **SQLite** (via pacote `better-sqlite3`) executado no processo principal (Main Process). A camada de interface (Renderer) comunica-se com o banco de dados via Inter-Process Communication (IPC).

## Consequências

### Positivas
- **Robustez e Velocidade:** Operações complexas e buscas completas (LIKE, JOINs) são instantâneas. Sem limitações práticas de tamanho.
- **Segurança dos Dados:** O banco é um arquivo físico persistido no sistema de arquivos do usuário (`~/.database.sqlite`), o qual é fácil de realizar backup.
- **Estabilidade no Main Process:** O processamento SQL não bloqueia a UI (Renderer thread).

### Negativas
- **Testabilidade Front-end:** Impede que os hooks do React acessem o banco de dados diretamente em ambientes de teste puro (como JSDOM no Vitest), obrigando a arquitetura a incluir implementações de fallback ou mocks.
- **Acoplamento Node.js:** Torna a aplicação restrita ao ambiente Electron. Publicar a aplicação como um Web App puro exigirá substituição do backend de armazenamento (por exemplo, uso de `sql.js` no browser com WebAssembly).

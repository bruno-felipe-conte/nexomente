# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Adicionado
- **Arquitetura (ADRs)**: Introdução dos documentos de decisão arquitetural (ADRs 001 a 004) documentando IA Local, Zustand, SQLite e Estratégia de Refatoração.
- **Integração de MSW (Mock Service Worker)**: Suíte robusta de testes de integração implementada no pacote `aiService.test.js`, abstraindo respostas dos provedores locais LM Studio e Ollama de maneira determinística, garantindo estabilidade offline dos testes end-to-end.
- **Tipagem Estática Progressiva**: Injeção automatizada de `PropTypes` via AST parser em 22 componentes críticos (eliminando 153 warnings e padronizando contratos de UI).
- **Experiência de Usuário (UX)**: Implementação consistente de atalhos rápidos de navegação (`Ctrl+Enter` para salvar/gerar, `Esc` para fechar/cancelar) nos principais modais e componentes de criação (Flashcards, Poemas, Gerador de IA).
- **Acessibilidade**: Adicionado suporte automático a foco (autoFocus) ao instanciar painéis modais.
- **Code Splitting (Lazy/Suspense)**: Reformulação no `App.jsx` fragmentando o bundle de componentes da visualização principal (Notas, Gerador, Settings, Estatísticas), reduzindo First Load Time radicalmente.

### Modificado
- **Componentização Avançada**: O componente `Notas.jsx` e demais controladores de conteúdo foram quebrados e modularizados sob os princípios de _Single Responsibility_.
- **Smoke Tests**: Extensão de escopo do `smoke.test.jsx`. Verifica rendering unificado (`<App />`), funcionamento isolado do CRUD das notas e instâncias assíncronas do relógio Pomodoro.
- **Segurança (DevSecOps)**: Dependências chaves com patches de segurança defasados foram remediadas (ex: atualização do `electron-builder`). Credenciais locais (ou URLs) foram sanitizadas para um `.env` com modelo no `.env.example`.
- **Pre-commit Hooks**: `Husky` e `lint-staged` inseridos no loop de desenvolvimento garantindo restrições imediatas contra warnings severos e quebras de pipeline.
- **Testes Unitários / Utils**: Módulos utilitários (`errorMessages`, `toast`, `dateUtils`) padronizados e garantindo cobertura global.

### Corrigido
- Ocorrências generalizadas da quebra crítica de variáveis em contextos ausentes (`no-undef`) na UI, em hooks subjacentes e arquivos de DB.
- Fluxo condicional inconsistente que originava problemas na lógica do Algoritmo SM-2 nativo.

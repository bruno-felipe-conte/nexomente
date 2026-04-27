# ADR 004: Decisão Estratégica: Refatorar em vez de Reescrever

## Data
2026-04-25

## Status
Aceito

## Contexto
No início do ciclo de estabilização, uma auditoria profunda indicou dívida técnica substancial:
- Mais de 150 erros de tipagem e warnings (`react/prop-types`, `no-undef`).
- Componentes com alto volume de linhas (como `Notas.jsx` e `PoemasGerenciador.jsx`).
- Mistura de responsabilidades (chamadas à API em componentes de interface).
- Ausência total de testes de unidade, integração e smoke tests automatizados.

Isso levantou o dilema comum: jogar fora o código atual e reconstruir a aplicação ("Rewrite") ou melhorar a estrutura de forma incremental ("Refactor").

## Decisão
Decidimos **Refatorar** a aplicação progressivamente. A refatoração seria ancorada pela introdução severa de Testes de Integração, separação da camada de hooks e abstração controlada.

## Consequências

### Positivas
- **Aproveitamento de Valor:** A maior parte da lógica de negócio complexa (como SM-2, IPC SQL, parsers AI) já funciona em produção e atende ao usuário.
- **Manutenção de Fluxo:** Não há congelamento total de novas features por meses. O app continua testável e operável diariamente.
- **Arquitetura Base Firme:** Tecnologias como Vite, Zustand e React 18 já forneciam alicerces modernos suficientes. Não havia falha arquitetônica irremediável, apenas acúmulo de código.

### Negativas
- **Múltiplos Paradigmas Transitórios:** Durante algumas semanas, código legado conviverá com o código refatorado.
- **Tempo Oculto:** O processo exige passos minuciosos, como injeções customizadas de PropTypes via AST Scripts e mocks extensos via MSW para viabilizar refatoração de serviços não isolados, aumentando o esforço na criação da rede de segurança.

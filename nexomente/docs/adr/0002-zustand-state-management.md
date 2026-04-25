# ADR 002: Gerenciamento de Estado com Zustand

## Data
2026-04-25

## Status
Aceito

## Contexto
A aplicação possui um estado global crescente que inclui:
- Controle de Interface (Sidebar aberta/fechada, status de loading global)
- Preferências de Usuário (Tema dark/light, métricas de onboarding)
- Dados cacheados/globais temporários
Tradicionalmente, React Context API ou Redux são utilizados. O React Context frequentemente causa re-renders excessivos se não for rigorosamente segmentado. O Redux requer extensa configuração de actions e reducers (boilerplate).

## Decisão
Adotamos o **Zustand** (`useUIStore`) como gerenciador de estado global.

## Consequências

### Positivas
- **Boilerplate Reduzido:** Criação direta de stores sem providers, reducers ou types complexos.
- **Performance:** Permite selecionar fatias específicas do estado (`useUIStore(state => state.sidebarOpen)`), evitando re-renders desnecessários nos componentes.
- **Acesso fora do React:** Possibilidade de acessar o estado e invocar funções fora do ciclo de vida de componentes (via `useUIStore.getState()`), facilitando integrações com scripts puros, IPC do Electron ou utils.

### Negativas
- Riscos de criação de stores gigantescos (como um God Object) se as responsabilidades não forem divididas adequadamente ao longo do tempo. (Nota: Existe plano ativo de quebrar a store monolítica no backlog da Fase 4).

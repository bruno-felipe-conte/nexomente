# ADR 002: Estado Global com Zustand

## Status
Aceito (Abril 2026)

## Contexto
A aplicação React precisa de gerenciamento de estado para a UI (sidebar, temas, notificações) e possivelmente para ponte com o backend Electron (DB). Soluções tradicionais como Redux envolvem muito boilerplate. A Context API do React pode causar re-renders desnecessários se não for memoizada cuidadosamente.

## Decisão
Foi escolhido o **Zustand** como gerenciador de estado global para a aplicação.

## Consequências
**Positivas:**
- API minimalista baseada em hooks.
- Sem necessidade de envolver a aplicação em múltiplos Providers.
- Rápido e evita re-renders desnecessários "out of the box" (seletores).
- Facilita a comunicação entre componentes distantes (como Sidebar e Header).

**Negativas:**
- A lógica de negócio pesada (como hooks SM-2 e manipulação complexa do banco) fica melhor isolada em hooks customizados (ex: `useNotes.js`) que interagem com o Electron via IPC, do que empurrada inteiramente para as stores do Zustand, para evitar sobrecarga de memória na render thread.

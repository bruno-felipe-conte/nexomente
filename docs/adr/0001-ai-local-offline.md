# ADR 001: AI Local (Offline-first)

## Status
Aceito (Abril 2026)

## Contexto
O NexoMente visa ser um "segundo cérebro" focado em privacidade. O uso de IA (LLMs) é essencial para geração de flashcards, resumos e questões. No entanto, enviar dados pessoais e anotações privadas para APIs de terceiros (como OpenAI) viola o princípio fundamental do app de "nada sai do seu computador".

## Decisão
A aplicação utilizará exclusivamente modelos de IA locais através do **LM Studio** e **Ollama**. A comunicação será feita via chamadas REST HTTP (`localhost:1234` ou `localhost:11434`), sem requerer qualquer conexão à internet para o funcionamento da IA.

## Consequências
**Positivas:**
- Privacidade total (zero data leakage).
- Funciona 100% offline.
- Sem custos recorrentes de API para o usuário.

**Negativas:**
- Depende do hardware do usuário (requer máquina com RAM/VRAM razoável para modelos como Llama 3 8B ou Mistral).
- Requer que o usuário inicie o servidor do LM Studio ou Ollama manualmente antes de usar as funções de IA no app.

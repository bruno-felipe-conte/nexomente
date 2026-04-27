# ADR 001: Integração de IA Local (Offline-First)

## Data
2026-04-25

## Status
Aceito

## Contexto
O NexoMente é um "Segundo Cérebro", focado em retenção de conhecimento. Funcionalidades como geração de flashcards, resumo de anotações e chat interativo requerem o uso de Modelos de Linguagem Grandes (LLMs). Originalmente, a maioria das aplicações desse tipo depende de APIs em nuvem (como OpenAI, Anthropic), o que acarreta custos recorrentes, latência e, principalmente, comprometimento da privacidade dos dados pessoais do usuário e dependência de internet.

## Decisão
Decidimos implementar a integração de IA exclusivamente (ou primariamente) através de provedores locais, especificamente **Ollama** e **LM Studio**. A comunicação ocorrerá via requisições HTTP REST diretas (`http://localhost:11434` para Ollama e `http://127.0.0.1:1234` para LM Studio).

## Consequências

### Positivas
- **Privacidade Absoluta:** As anotações do usuário nunca saem da sua máquina local.
- **Offline-First:** O aplicativo permanece 100% funcional sem conexão com a internet.
- **Custo Zero:** Nenhuma API key ou cobrança por token consumido.
- **Flexibilidade:** O usuário pode alternar facilmente entre modelos otimizados (como Llama 3, Mistral, Qwen) conforme a capacidade do seu hardware.

### Negativas
- **Dependência de Hardware:** A velocidade e a capacidade de raciocínio da IA estarão limitadas à CPU/GPU do usuário.
- **Setup Adicional:** O usuário precisa instalar e gerenciar o Ollama ou LM Studio paralelamente ao NexoMente.
- **Consistência:** Diferentes modelos podem não seguir os prompts estruturados (JSON format) de maneira consistente, exigindo técnicas robustas de parse com fallbacks e Regex.

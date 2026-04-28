<div align="center">

![NexoMente Hero Banner](./nexomente_hero_banner.png)

# 🌌 NEXOMENTE: THE ULTIMATE SECOND BRAIN
### ✦ *Local Intelligence. Gamified Wisdom. Absolute Privacy.* ✦

<br>

[![Status](https://img.shields.io/badge/⚡_Status-Production_Ready-00e676?style=for-the-badge&logoColor=white)](#)
[![AI-Whisper](https://img.shields.io/badge/🤖_STT-Whisper_Local-9333EA?style=for-the-badge&logoColor=white)](#)
[![AI-Llama](https://img.shields.io/badge/🧠_LLM-Llama_3.2-3b82f6?style=for-the-badge&logoColor=white)](#)
[![Runtime](https://img.shields.io/badge/🖥_Runtime-Electron_28-47848F?style=for-the-badge&logo=electron)](#)
[![Engine](https://img.shields.io/badge/⚙️_Engine-Vite_React-646CFF?style=for-the-badge&logo=vite)](#)

<br>

> **"A simbiose perfeita entre a profundidade do Obsidian, a eficácia do Anki e o vício do Tamagotchi."**  
> *Onde cada byte de conhecimento pertence a você e ninguém mais.*

<br>

</div>

---

## ◈ 📖 O Que é o NexoMente?

O **NexoMente** não é apenas um app de notas; é um ecossistema de **Gestão do Conhecimento Pessoal (PKM)** projetado para quem busca maestria sem comprometer a privacidade. Ele utiliza Inteligência Artificial de última geração rodando localmente (no seu hardware) para transcrever sua voz, gerar flashcards e organizar seus pensamentos em um grafo neural interativo.

---

## ◈ 🎙️ A Joia da Coroa: Dojo de Poesia (Whisper AI)

O Dojo de Recitação é onde a oratória encontra a neurociência. Utilizando o motor **OpenAI Whisper (via Transformers.js)**, o app analisa sua fala verso a verso.

### ⚡ Como funciona o Motor de Voz:
1.  **Captura High-Fidelity**: Áudio processado a 16kHz via `AudioContext`.
2.  **Worker Off-Thread**: A transcrição acontece em um Web Worker dedicado, mantendo a interface a 60 FPS.
3.  **Algoritmo de Match**: Compara tokens normalizados para calcular precisão percentual.
4.  **Gamificação de Voz**: Ganhe XP proporcional à sua acurácia e memorize obras clássicas para sempre.

```mermaid
graph TD
    A[Início da Recitação] --> B[Gravação de Áudio WebM]
    B --> C[Conversão para Float32Array 16kHz]
    C --> D[Whisper Worker - Modelo ONNX]
    D --> E[Transcrição de Texto]
    E --> F{Cálculo de Precisão}
    F -->|Abaixo do Limiar| G[🔄 Feedback Visual: Erros em Vermelho]
    F -->|Acima do Limiar| H[✅ Sucesso: XP + Próximo Verso]
    G --> B
    H --> I[Conclusão do Poema & Evolução Pet]
```

---

## ◈ 🎮 Sistema Tamagotchi: Estude ou o Pet Sofre

O NexoMente transforma seu esforço intelectual em evolução biológica virtual. Seu companheiro reage à sua produtividade.

### 🧬 Ciclo de Evolução (30 Níveis)
| Nível | Estágio | Visual | Requisito de Foco |
| :--- | :--- | :---: | :--- |
| **01 - 05** | Recém-Nascido | 🥚 ➔ 🐣 | 5h de Estudo Total |
| **06 - 15** | Aprendiz Ativo | 🐥 ➔ 🦊 | 25h + 100 Flashcards |
| **16 - 25** | Guardião do Saber | 🐺 ➔ 🦁 | 100h + 500 Flashcards |
| **26 - 30** | Entidade Cósmica | 🦅 ➔ ✴️ | Domínio Total das Matérias |

**⚠️ Mecânica de Sobrevivência**: Se você não estudar por mais de 48 horas, seu pet começa a perder HP. A única cura é uma sessão de foco ou revisão de cards.

---

## ◈ 🧠 Inteligência Artificial 100% Local (LLM)

Esqueça assinaturas de IA e preocupações com dados na nuvem. O NexoMente integra-se ao seu motor local para:

- **Geração Automática de Flashcards**: Selecione um parágrafo e peça para a IA criar perguntas SM-2.
- **Chat Contextual**: A IA "lê" a nota que você está editando e ajuda a expandir conceitos.
- **Resumos Inteligentes**: Transforme capítulos extensos em bullet points acionáveis.
- **Suporte a Modelos**: Otimizado para **Llama 3.2 (3B)** e **Qwen 2.5 (7B)**.

---

## ◈ 🕸️ Grafo de Conhecimento Neuronal

Visualize como suas ideias se conectam. Cada link `[[wikilink]]` cria um caminho no seu cérebro digital.

- **Física de Partículas**: Nós que "puxam" e "empurram" conforme a relação semântica.
- **Cores por Categoria**: Identifique áreas de domínio (ex: Direito em Vermelho, Medicina em Verde).
- **Preview Hover**: Veja o conteúdo de uma nota sem sair da visão de Grafo.

---

## ◈ 🛠️ Stack Técnica & Arquitetura

O NexoMente é construído sobre uma base tecnológica robusta e moderna:

- **Core**: React 18 & Vite (Frontend ultra-veloz)
- **Runtime**: Electron 28 (Desktop nativo com acesso ao sistema de arquivos)
- **Estética**: CSS Vanilla com Tokens de Design (Glassmorphism & Sci-Fi)
- **Voz**: Transformers.js (Whisper ONNX Quantized)
- **Persistência**: SQLite WASM + LocalStorage (Backup automático em Markdown)
- **Animações**: Framer Motion & GSAP

---

## ◈ 🚀 Setup Rápido (Developer Mode)

### Pré-requisitos
- Node.js 18+
- Git

### Instalação
```bash
# 1. Obtenha o código
git clone https://github.com/bruno-felipe-conte/nexomente.git

# 2. Instale as engrenagens
npm install

# 3. Prepare o motor de voz (Execute apenas uma vez)
# Isso baixará o modelo whisper-small para assets/models
node scripts/download-model.js

# 4. Decole!
npm run dev
```

---

## ◈ 🔒 O Manifesto da Privacidade

No NexoMente, a privacidade não é uma opção, é a arquitetura.

- **Zero Cloud**: Não existe servidor central.
- **Zero Telemetria**: Não rastreamos seus cliques.
- **Seus Arquivos, Suas Regras**: Todas as notas são salvas em `.md` legível na sua pasta de usuário. Se você quiser parar de usar o app amanhã, suas notas continuam lá, prontas para qualquer outro editor.

---

<div align="center">

### *“The mind is for having ideas, not holding them.”*  
**Deixe o NexoMente segurar, organizar e evoluir o seu conhecimento.**

<br>

*Orgulhosamente desenvolvido por [Bruno Felipe Conte](https://github.com/bruno-felipe-conte)*

[![Follow](https://img.shields.io/github/followers/bruno-felipe-conte?label=Follow&style=social)](https://github.com/bruno-felipe-conte)
[![Star](https://img.shields.io/github/stars/bruno-felipe-conte/nexomente?style=social)](https://github.com/bruno-felipe-conte/nexomente)

</div>

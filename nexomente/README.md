<div align="center">

# 🌌 NexoMente

**Onde seu conhecimento ganha vida, gamificação e Inteligência Artificial.**<br>
*Um Segundo Cérebro 100% Offline & Focado no Estudante.*

<br>

[![Status](https://img.shields.io/badge/Status-Produção_Pronta-00e676?style=for-the-badge&logo=rocket&logoColor=white)](#)
[![Electron](https://img.shields.io/badge/Runtime-Electron_28-47848F?style=for-the-badge&logo=electron)](#)
[![React](https://img.shields.io/badge/UI-React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![AI](https://img.shields.io/badge/AI-100%25_Local-9333EA?style=for-the-badge&logo=openai&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#)

<br>

<p align="center">
  <blockquote>
    <i>"Pense no NexoMente como uma fusão de Obsidian, Anki e um Tamagotchi.<br>Nenhum byte seu vai para a nuvem. O controle do seu aprendizado voltou para suas mãos."</i>
  </blockquote>
</p>

</div>

---

<br>

## ✨ Destaques de Funcionalidades

<table>
  <tr>
    <td width="50%">
      <h3>📝 Wiki-Notes Mágicas</h3>
      <ul>
        <li>Editor TipTap premium (Markdown + WYSIWYG)</li>
        <li>Conexões neurais via <code>[[wikilinks]]</code> automáticos</li>
        <li>Sincronização 100% local com pasta Markdown</li>
        <li>Suporte nativo a fórmulas matemáticas (LaTeX)</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🤖 IA de Bolso (Offline)</h3>
      <ul>
        <li>Gera resumos e extrai conceitos-chave</li>
        <li>Cria Flashcards e Questões de Concurso da sua nota</li>
        <li>Conecta-se ao Ollama ou LM Studio invisivelmente</li>
        <li>Chat contextual que "lê" suas anotações ativas</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📇 Flashcards SM-2</h3>
      <ul>
        <li>Algoritmo SuperMemo 2 adaptativo para o seu cérebro</li>
        <li>Criação manual ou massiva via Inteligência Artificial</li>
        <li>Revisões focadas apenas no que seu cérebro está esquecendo</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📜 Canto Poético</h3>
      <ul>
        <li>Dashboard luxuoso com o "Poema Vigente" do dia</li>
        <li>Tipografia serifada premium inspirando o seu estudo</li>
        <li>Modo de foco total para recitação mental</li>
      </ul>
    </td>
  </tr>
</table>

<br>

---

## 👾 O Tamagotchi de Estudos

NexoMente não é apenas um bloco de notas; é um **RPG do seu conhecimento**.

Acompanhe a evolução de um mascote virtual na tela inicial que reage diretamente ao seu esforço no mundo real. Cada sessão de Pomodoro alimenta o seu Tamagotchi!

<details open>
<summary><b>🔥 Clique para ver a Tabela de Evolução e Mecânicas (XP/HP)</b></summary>
<br>

Seu nível define a forma do mascote. O XP é ganho ao focar!

| Tempo de Foco | XP Base | 🔥 Ofensiva 7d (x2) | 🔥 Ofensiva 30d (x3) |
|:---:|:---:|:---:|:---:|
| **Livre (<15m)** | `5 XP` | `10 XP` | `15 XP` |
| **Padrão (25m)** | `15 XP` | `30 XP` | `45 XP` |
| **Intenso (50m)** | `30 XP` | `60 XP` | `90 XP` |
| **Maratona (2h+)**| `80 XP` | `160 XP`| `240 XP`|

🛡️ **Mecânica de Vida (HP):**
* **Dia não estudado:** Mascote perde `-10 HP`. Dois dias: `-30 HP`.
* **HP Zerado:** O mascote entra em coma (**Hibernação**), quebrando sua Ofensiva diária. Volte a estudar para ressuscitá-lo!

🐉 **A Escalada de 30 Níveis (Evoluções):**
1. **O Nascimento (1-5):** Ovinho 🥚 → Pato 🦆
2. **A Descoberta (6-10):** Coelho 🐰 → Raposa 🦊
3. **A Ascensão (11-15):** Guaxinim 🦝 → Leão 🦁
4. **O Poder (16-20):** Tigre 🐯 → Dragão Jovem 🐉
5. **A Transcendência (21-25):** Serpente 🐍 → Dragão Arco-Íris 🐲
6. **O Absoluto (26-30):** Ser Cósmico 🌌 → Forma Final ✴️ *(Habilidades cósmicas desbloqueadas)*

</details>

<br>

---

## ⚙️ A Arquitetura Invisível (Tech Stack)

Fizemos as escolhas mais paranoicas possíveis com privacidade, somadas ao que há de mais luxuoso em UI/UX.

<div align="center">

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=blue)
![Zustand](https://img.shields.io/badge/Zustand-Bear-brown?style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

</div>

<details>
<summary><b>📂 Explore a árvore de diretórios</b></summary>

```text
nexomente/
├── electron/               # ⚡ Motor de Desktop e Ponte Segura IPC
│   ├── main.js             # Cria a janela sem bordas
│   └── preload.js          # Isolamento seguro React <-> SQLite
├── app/src/                # 🎨 O Frontend (React + Vite)
│   ├── components/         #
│   │   ├── gamification/   # 👾 Widgets do Tamagotchi e Confetes
│   │   ├── layout/         # Barra lateral e cabeçalhos de vidro
│   │   └── ui/             # Design System (Cards parallax 3D, Botões)
│   ├── pages/              # 📌 Dashboard, Study, Poemas, AI Chat
│   ├── store/              # 🐻 Zustand (useUIStore, useTamagotchiStore)
│   └── lib/                # Algoritmo SM-2, Regex Parser, IA Connect
└── src/test/               # 🧪 Laboratório Vitest
```
</details>

<br>

---

## 🚀 Instalando sua Instância

Você precisa do Node.js (18+) e de alguns segundos.

```bash
# 1. Clone ou baixe este repositório e entre na pasta
cd nexomente

# 2. Instale as magias
npm install

# 3. Levante os escudos (Inicia o Vite + Electron)
npm run dev
```

### 🧠 Como ligar o "Cérebro IA" (Totalmente Opcional)
Para as funções mágicas de resumo e gerador funcionarem:
1. Baixe o [Ollama](https://ollama.com).
2. Abra o terminal e baixe um modelo rápido: `ollama pull llama3.2:3b`.
3. Pronto! O NexoMente já vai detectar o Ollama rodando no background na porta 11434. Vá nas configurações do app se preferir usar o LM Studio.

<br>

---

<div align="center">
  <p><b>Privacidade Absoluta. Gamificação Intensa. Conhecimento Eterno.</b></p>
  <i>Desenvolvido e moldado artesanalmente por Bruno Felipe Conte.</i><br><br>
  <img src="https://img.shields.io/github/license/bruno-felipe-conte/nexomente?style=flat-square" alt="MIT License">
</div>
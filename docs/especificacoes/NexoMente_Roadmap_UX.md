# NexoMente — Plano de Implementação UX/Design
> Documento de trabalho · Versão 1.0 · Abril 2026
> Baseado no Guia Mestre de UX. Cada etapa é autônoma e pode ser executada por sprint.

---

## Visão Geral das Etapas

| Etapa | Nome | Foco | Duração estimada |
|-------|------|------|-----------------|
| **E1** | Fundação de Design System | Tokens, tipografia, cores | 1–2 dias |
| **E2** | Componentes Base | Botões, inputs, cards, feedback | 2–3 dias |
| **E3** | Navegação Global | Sidebar, breadcrumbs, atalhos | 1–2 dias |
| **E4** | Tela de Notas | Editor, bibliotecas, toolbar | 2–3 dias |
| **E5** | Tela de Estudo | Timer, matérias, progresso | 1–2 dias |
| **E6** | Tela de Flashcards | Gerenciamento, modo revisão | 2 dias |
| **E7** | Gerador IA | Flow em etapas, banco | 2–3 dias |
| **E8** | Chat IA | Mensagens, contexto, streaming | 1–2 dias |
| **E9** | Grafo | Nós, interação, estado vazio | 1–2 dias |
| **E10** | Estatísticas | Gamificação, heatmap, conquistas | 2 dias |
| **E11** | Responsividade & Mobile | Breakpoints, bottom nav, gestos | 2–3 dias |
| **E12** | Acessibilidade & Polimento | WCAG, motion, revisão final | 1–2 dias |

---

## E1 — Fundação de Design System

> **Objetivo:** criar o arquivo central de tokens CSS que todo o app vai consumir. Nenhuma cor, espaçamento ou fonte hardcoded a partir daqui.

### Atividades

- [x] **1.1** Criar arquivo `tokens.css` (ou seção `:root` global) com variáveis de superfície:
  ```css
  --surface-base, --surface-raised, --surface-card,
  --surface-elevated, --surface-overlay, --surface-border
  ```

- [x] **1.2** Adicionar tokens de cor semântica por módulo:
  ```css
  --color-notas, --color-estudo, --color-flashcards,
  --color-gerador, --color-chat, --color-grafo, --color-stats
  ```

- [x] **1.3** Adicionar cores de estado:
  ```css
  --color-success, --color-warning, --color-error, --color-info
  ```

- [x] **1.4** Adicionar tokens de texto:
  ```css
  --text-hi, --text-mid, --text-lo
  ```

- [ ] **1.5** Adicionar tokens de espaçamento (escala base 4px):
  ```css
  --space-1 (4px) → --space-2 (8px) → ... → --space-16 (64px)
  ```

- [ ] **1.6** Adicionar tokens de raio:
  ```css
  --radius-xs (4px), --radius-sm (8px), --radius-md (12px),
  --radius-lg (18px), --radius-xl (24px), --radius-full (9999px)
  ```

- [ ] **1.7** Adicionar tokens de sombra:
  ```css
  --shadow-sm, --shadow-md, --shadow-lg,
  --shadow-glow-violet, --shadow-glow-teal
  ```

- [x] **1.8** Configurar fontes no `index.html` ou equivalente:
  - **Display/Títulos:** `Syne` (Google Fonts) — pesos 600, 700, 800
  - **Corpo/UI:** `DM Sans` — pesos 300, 400, 500
  - **Dados/Mono:** `JetBrains Mono` — pesos 400, 500

- [x] **1.9** Criar tokens de tipografia:
  ```css
  --font-display, --font-body, --font-mono
  --type-display-xl, --type-display-lg, --type-display-md,
  --type-body-lg, --type-body-md, --type-body-sm,
  --type-label, --type-mono
  ```

- [ ] **1.10** Adicionar tokens de motion:
  ```css
  --duration-micro (80ms), --duration-fast (150ms),
  --duration-normal (220ms), --duration-slow (350ms),
  --ease-standard: cubic-bezier(.4,0,.2,1),
  --ease-spring: cubic-bezier(.34,1.56,.64,1)
  ```

- [ ] **1.11** Substituir todos os valores hardcoded existentes no CSS pelo token correspondente (busca global por `#`, `px` e `ms` literais fora do arquivo de tokens)

### Critério de conclusão
Todos os valores visuais do app são controlados via variável. Mudar `--surface-base` muda o fundo de todas as telas corretamente.

---

## E2 — Componentes Base

> **Objetivo:** construir a biblioteca de componentes atômicos que as telas vão reutilizar.

### Atividades

#### Botões
- [ ] **2.1** Implementar 5 variantes: `primary`, `secondary`, `ghost`, `danger`, `icon-only`
- [ ] **2.2** Cada variante com 3 estados: `default`, `hover` (transition 150ms), `disabled` (opacity 0.4, cursor not-allowed)
- [ ] **2.3** Estado de `loading`: spinner inline + texto "Carregando…" + `pointer-events: none`
- [ ] **2.4** Tamanho mínimo de 44px de altura em todos os botões

#### Inputs
- [ ] **2.5** Input padrão com border `--surface-border`, focus com `2px solid --color-brand` + glow
- [ ] **2.6** Input com ícone à esquerda e botão "×" à direita (aparece apenas com conteúdo)
- [ ] **2.7** Textarea com `resize: vertical`, altura mínima 120px, contador de caracteres opcional
- [ ] **2.8** Estado de erro: borda vermelha + mensagem inline com ícone `⚠` abaixo do campo + animação shake sutil

#### Cards
- [ ] **2.9** Card base com padding `var(--space-6)`, `border-radius: var(--radius-lg)`, sombra `--shadow-md`
- [ ] **2.10** Variante interativa: `cursor: pointer` + `hover: translateY(-2px)` + shadow aumenta (transition 180ms)
- [ ] **2.11** Card com header/divider/body/footer conforme anatomia do guia

#### Feedback
- [ ] **2.12** Componente Toast: 4 variantes (success/warning/error/info), slide-in canto inferior direito, auto-dismiss 4s, máx. 3 simultâneas
- [ ] **2.13** Skeleton Loader: retângulos com gradiente shimmer animado para substituir spinners em listas e cards
- [ ] **2.14** Empty State: componente com ícone grande + título + descrição + botão de ação, para cada tela do app
- [ ] **2.15** Modal de confirmação destrutiva: título + descrição de consequências + botão cancelar (esquerda) + botão confirmar vermelho (direita)

#### Pills / Badges
- [ ] **2.16** Componente `Pill` com 6 variantes de cor (violet, blue, teal, amber, rose, lime)
- [ ] **2.17** Badge de contagem numérica para nav items e tabs

### Critério de conclusão
Existe um Storybook ou página de preview onde todos os componentes acima são visíveis e testáveis em seus estados.

---

## E3 — Navegação Global

> **Objetivo:** tornar a sidebar informativa, agrupada e com identidade visual forte.

### Atividades

- [x] **3.1** Reagrupar itens de navegação em 3 grupos com labels:
  - `APRENDER` → Notas, Estudo, Flashcards
  - `CRIAR` → Gerador, Poemas
  - `EXPLORAR` → Chat IA, Grafo, Estatísticas

- [x] **3.2** Adicionar divisores visuais entre grupos (1px `--surface-border`)

- [x] **3.3** Atribuir cor única a cada ícone de módulo conforme tabela:
  | Módulo | Cor do ícone |
  |--------|-------------|
  | Notas | `--color-notas` (#4D9EFF) |
  | Estudo | `--color-estudo` (#2DD4BF) |
  | Flashcards | `--color-flashcards` (#A78BFA) |
  | Gerador | `--color-gerador` (#F59E0B) |
  | Chat IA | `--color-chat` (#818CF8) |
  | Grafo | `--color-grafo` (#34D399) |
  | Estatísticas | `--color-stats` (#F5A623) |

- [x] **3.4** Estado ativo do nav item: fundo `rgba(cor-do-módulo, 0.08)` + barra esquerda 3px colorida + ícone com cor do módulo

- [ ] **3.5** Implementar colapso de sidebar com `Ctrl+B`:
  - Expandida: 240px com ícone + texto
  - Colapsada: 60px apenas com ícone + tooltip no hover

- [ ] **3.6** Adicionar tooltip com atalho de teclado nos nav items (visível no hover quando sidebar colapsada):
  - Ex: "Notas — Ctrl+1"

- [x] **3.7** Rodapé da sidebar com 2 elementos fixos:
  - Status de IA como pílula animada: `● IA Online · [nome do modelo]` (verde pulsante) ou `● IA Offline` (vermelho)
  - Item "Configurações" com ícone de engrenagem

- [ ] **3.8** Breadcrumb global no topo de todas as telas: `NexoMente / [Módulo] / [Subseção]` — cada parte clicável

- [ ] **3.9** Implementar atalhos globais de teclado:
  - `Ctrl+K` — busca global (melhorar o existente)
  - `Ctrl+1` até `Ctrl+9` — navegação direta por módulo
  - `Ctrl+N` — nova nota de qualquer tela

### Critério de conclusão
Navegar por todo o app usando apenas teclado é possível e confortável. A sidebar comunica visualmente onde o usuário está.

---

## E4 — Tela de Notas

> **Objetivo:** transformar o editor em um espaço de escrita de verdade.

### Atividades

#### Painel de Bibliotecas
- [ ] **4.1** Adicionar cor/ícone único a cada biblioteca (Inbox, Livros, Projetos, Ideias, Estudo, Bíblia)
- [ ] **4.2** Contador de notas por biblioteca como badge numérico inline
- [ ] **4.3** Estado de biblioteca ativa: background highlight + borda esquerda colorida
- [ ] **4.4** Botão `+` para criar nova biblioteca com campo de nome inline (não modal)

#### Lista de Notas
- [ ] **4.5** Card de nota na lista: título + primeiras 2 linhas de preview + data + tags como pills
- [ ] **4.6** Hover em card de nota: revelar botões de ação rápida (⋯ menu com Mover, Duplicar, Excluir)
- [ ] **4.7** Barra de busca de notas com filtragem em tempo real (debounce 200ms)

#### Editor
- [ ] **4.8** Reagrupar toolbar em 5 grupos separados por divisor vertical:
  1. **Texto:** Bold, Italic, Underline, Strike, Code inline, Highlight
  2. **Estrutura:** H1, H2, H3, Lista, Lista numerada, Checklist
  3. **Inserir:** Quote, Tabela, Link, Fórmula
  4. **IA:** Resumir, Expandir, Perguntar
  5. **Ações:** Modo foco, Desfazer, Refazer

- [ ] **4.9** Implementar **toolbar flutuante contextual**: ao selecionar texto, mini-toolbar aparece 8px acima da seleção com Bold, Italic, Link, Highlight, Ask AI

- [ ] **4.10** Implementar **slash commands**: digitar `/` no início de uma linha abre menu de inserção com busca:
  - `/h1`, `/h2`, `/lista`, `/tabela`, `/card`, `/imagem`

- [ ] **4.11** Tags da nota visíveis como pills coloridas abaixo do título (não escondidas atrás de botão)

- [ ] **4.12** Footer do editor com: status de autosave "Salvo há Xs" + contagem de palavras + botão de modo foco

- [ ] **4.13** Modo foco `Ctrl+Shift+Enter`: esconde sidebar e painéis, expande editor para 100% da viewport com max-width 720px centralizado

- [ ] **4.14** Indicador "IA offline" como banner âmbar sutil no topo do editor (não apenas no canto)

### Critério de conclusão
Criar e editar uma nota é fluído, sem necessidade de toolbar principal para formatações comuns. Modo foco funciona.

---

## E5 — Tela de Estudo

> **Objetivo:** tornar o timer uma ferramenta de foco real, não apenas um contador.

### Atividades

- [ ] **5.1** Substituir display numérico do timer por **círculo SVG** com `stroke-dashoffset` animado:
  - Cor teal `--color-estudo` durante estudo
  - Cor âmbar durante pausa
  - Número central com `font-family: --font-mono`, tamanho grande

- [ ] **5.2** Indicador de ciclos Pomodoro como dots: `● ● ● ○` (3 de 4 completos)

- [ ] **5.3** **Campo de matéria obrigatório antes de iniciar**: se nenhuma matéria selecionada, botão "Iniciar" mostra tooltip "Selecione uma matéria"

- [ ] **5.4** Campo de texto opcional "O que estou estudando agora?" abaixo do timer — ancora o foco

- [ ] **5.5** Toggle de som com ícone de sino no header do timer; som de sino suave no término

- [ ] **5.6** Botão de modo foco no timer: esconde tudo exceto o círculo e a tarefa atual

- [ ] **5.7** Painel lateral (em desktop) com histórico das sessões do dia: hora, matéria, duração

- [ ] **5.8** Barras de progresso por matéria com:
  - Cor única de cada matéria
  - Porcentagem preenchida = tempo estudado / meta semanal
  - Valor textual "Xm / Ym" à direita

- [ ] **5.9** Notificação do browser via Web Notifications API quando sessão terminar (pedir permissão na primeira sessão)

### Critério de conclusão
Iniciar uma sessão de Pomodoro com matéria selecionada, estudar, e ver o progresso atualizado sem ambiguidade.

---

## E6 — Tela de Flashcards

> **Objetivo:** criar a experiência de revisão mais satisfatória possível.

### Atividades

#### Gerenciamento
- [ ] **6.1** Adicionar tabs de filtro com badge de contagem: `Todos | Hoje (X) | Novos (X) | Revisão (X) | Dominados (X)`

- [ ] **6.2** Modal de criação rápida de card (`Ctrl+Shift+C` ou botão `+ Card`):
  - Campo "Frente" (textarea, obrigatório)
  - Campo "Verso" (textarea, obrigatório)
  - Seletor de matéria/deck
  - Botão "Criar" + "Criar e continuar"

- [ ] **6.3** Card na lista: mostrar frente truncada, deck/matéria como pill, próxima revisão em badge

- [ ] **6.4** Hover em card: revelar "Editar | Excluir | Revisar agora"

#### Modo Revisão
- [ ] **6.5** Layout: card grande (600px × 380px) centralizado na viewport

- [ ] **6.6** Implementar flip 3D com CSS:
  ```css
  transform-style: preserve-3d;
  transition: transform var(--duration-normal);
  backface-visibility: hidden;
  ```
  Trigger: clique no card ou tecla `Espaço`

- [ ] **6.7** Frente do card: fundo `--surface-card`, título da matéria no topo, texto centralizado grande

- [ ] **6.8** Verso do card: fundo ligeiramente diferente (borda colorida no topo com cor da matéria) para distinguir visualmente

- [ ] **6.9** Após flip, mostrar 4 botões de avaliação com cores fixas e tamanho generoso (min 48px):
  | Tecla | Cor | Label | SM-2 |
  |-------|-----|-------|------|
  | `1` | 🔴 Vermelho | Não Lembrei | q=1 |
  | `2` | 🟠 Laranja | Difícil | q=2 |
  | `3` | 🟢 Verde | Bom | q=3 |
  | `4` | 💜 Roxo | Fácil | q=5 |

- [ ] **6.10** Barra de progresso no topo da sessão: `X / Total` com porcentagem preenchida

- [ ] **6.11** Animação de conclusão: confetti ou animação de XP ganho quando todos os cards da sessão forem revisados

### Critério de conclusão
Revisar 10 flashcards usando apenas teclado (Espaço + 1/2/3/4) sem precisar usar o mouse.

---

## E7 — Gerador IA

> **Objetivo:** transformar o gerador em um fluxo guiado de 4 etapas claro e satisfatório.

### Atividades

- [x] **7.1** Implementar layout de steps com indicador visual:
  ```
  [1 Entrada] → [2 Configurar] → [3 Gerar] → [4 Revisar]
  ```
  Step ativo: círculo cheio + label colorida. Steps futuros: círculo vazio + label esmaecida.

- [x] **7.2** **Step 1 — Entrada:**
  - Zona de drag-and-drop com borda tracejada animada (pulsante ao arrastar arquivo sobre ela)
  - Aceitar `.txt`, `.md`, `.pdf`
  - OU textarea com contador de caracteres e indicador de tamanho ideal ("~500–3000 palavras para melhores resultados")
  - Preview do texto extraído após upload (colapsável, máx. 5 linhas visíveis)

- [x] **7.3** **Step 2 — Configurar:**
  - Slider de quantidade: 5, 10, 15, 20 questões
  - Seletor de tipo: `Múltipla Escolha | Verdadeiro/Falso | Dissertativa`
  - Seletor de dificuldade: `Fácil | Médio | Difícil`
  - Seletor de matéria de destino (dropdown)
  - Estimativa: "Tempo estimado: ~15 segundos"

- [ ] **7.4** **Step 3 — Gerar:**
  - Botão CTA primário âmbar "✨ Gerar Questões"
  - Durante geração: questões aparecem em streaming (uma por vez conforme chegam), não esperar tudo
  - Skeleton de card aparece enquanto a questão não chegou

- [ ] **7.5** **Step 4 — Revisar:**
  - Cada questão como card editável com campos inline
  - Checkbox de seleção no canto do card (padrão: todas selecionadas)
  - Botão "Regenerar esta questão" por card
  - Botão "Rejeitar" remove o card com animação de saída
  - CTA final: "Salvar X questões selecionadas no Banco"

- [x] **7.6** Aba "Banco" com:
  - Grid de cards de questões
  - Filtros por matéria e tipo
  - Exportação para `.txt` e `.docx`

### Critério de conclusão
Carregar um arquivo, configurar, gerar e salvar questões no banco sem nenhuma ambiguidade sobre o próximo passo.

---

## E8 — Chat IA

> **Objetivo:** tornar o chat um assistente de estudo, não um chat genérico.

### Atividades

- [ ] **8.1** **Estado vazio com suggestions**: exibir 4–6 cards de ação rápida clicáveis:
  - "📝 Resumir minha nota"
  - "🃏 Criar flashcards desta nota"
  - "❓ Fazer perguntas sobre o conteúdo"
  - "💡 Explicar um conceito"
  - "🔍 Revisar para a prova"

- [ ] **8.2** Indicador de nota em contexto: quando nota selecionada, chip compacto abaixo do header:
  `📒 Nota: [Nome da nota]  ×`  (× remove o contexto)

- [ ] **8.3** Dropdown de modelo mais descritivo:
  - Nome do modelo
  - Badge de velocidade vs. qualidade (ex: `⚡ Rápido` ou `🧠 Preciso`)

- [ ] **8.4** Balões de mensagem:
  - Usuário: alinhado à direita, fundo `rgba(--color-brand, 0.12)`, borda `--color-brand`
  - Assistente: alinhado à esquerda, fundo `--surface-card`
  - Timestamp visível no hover (tooltip)

- [ ] **8.5** Hover em qualquer mensagem revela mini-toolbar:
  `Copiar | Regenerar | → Criar Nota | → Criar Flashcard`

- [ ] **8.6** Streaming visual:
  - Loading dots `· · ·` animados enquanto IA processa
  - Texto aparece palavra por palavra com cursor piscante `|` ao final

- [ ] **8.7** Textarea de input:
  - Auto-expand até 5 linhas
  - `Enter` envia, `Shift+Enter` nova linha
  - Contador de tokens opcional

- [ ] **8.8** Painel lateral colapsável (ícone de histórico no header) com lista de conversas anteriores

### Critério de conclusão
Selecionar uma nota, clicar em "Criar flashcards desta nota" no estado vazio, e receber flashcards gerados — fluxo completo em 2 cliques.

---

## E9 — Grafo de Conexões

> **Objetivo:** tornar o grafo explorável e motivador, não assustador quando vazio.

### Atividades

- [ ] **9.1** **Estado vazio animado**: mostrar grafo de demonstração ghost (5–7 nós fictícios com animação de float suave) + texto "Crie notas para começar a mapear seu conhecimento" + botão "Criar primeira nota"

- [ ] **9.2** Nós coloridos por tipo de nota conforme tabela de cores do módulo 03

- [ ] **9.3** Hover em nó: tooltip card com título, tipo (pill colorida), data de criação e nº de conexões

- [ ] **9.4** Click em nó: painel lateral desliza da direita com:
  - Título da nota
  - Preview do conteúdo (3–4 linhas)
  - Lista de conexões (nós ligados)
  - Botão "Abrir nota"

- [ ] **9.5** Campo de busca que filtra o grafo em tempo real: nós não correspondentes ficam `opacity: 0.15`, correspondentes ficam destacados com borda brilhante

- [ ] **9.6** Minimap no canto inferior direito (visível apenas quando há 10+ nós)

- [ ] **9.7** Controles de zoom acessíveis: botões `+` / `−` / `⊡ Ajustar à tela` no canto superior direito + scroll do mouse para zoom + arrastar para pan

### Critério de conclusão
Com 5+ notas criadas, o grafo exibe nós coloridos, hover mostra informação, click abre painel lateral.

---

## E10 — Estatísticas & Gamificação

> **Objetivo:** fazer o painel de stats ser motivador, não um relatório frio de zeros.

### Atividades

- [ ] **10.1** **Card de nível no topo**:
  - Avatar/ícone de nível (pode ser emoji temático por nível)
  - Nome do nível (ex: "Aprendiz Curioso", "Estudante Dedicado", "Mestre do Conhecimento")
  - XP atual e XP necessário para próximo nível
  - Barra de progresso animada com gradiente

- [ ] **10.2** Definir tabela de níveis:
  | Nível | Nome | XP necessário |
  |-------|------|--------------|
  | 1 | Aprendiz Curioso | 0–100 |
  | 2 | Estudante Iniciante | 101–300 |
  | 3 | Estudante Dedicado | 301–600 |
  | 4 | Explorador do Saber | 601–1000 |
  | 5 | Mestre do Conhecimento | 1001+ |

- [ ] **10.3** **Heatmap de atividade** (estilo GitHub contributions):
  - Grid de 52 semanas × 7 dias
  - Cor mais intensa = mais minutos estudados naquele dia
  - Hover: tooltip com data e minutos estudados

- [ ] **10.4** Animação de XP ganho ao completar sessão: número count-up + partículas voando para cima (spring animation)

- [ ] **10.5** **Grid de conquistas**:
  - Desbloqueadas: ícone colorido + nome + descrição
  - Bloqueadas: ícone em grayscale com `opacity: 0.4` + "?" no hover revela o critério
  - Exemplos de conquistas:
    - 🔥 "Primeira Chama" — Complete sua primeira sessão
    - 📚 "Maratonista" — 7 dias de streak
    - 🃏 "Memória de Ouro" — 100 flashcards dominados
    - 🌐 "Tecelão de Ideias" — 20 notas com conexões no grafo

- [ ] **10.6** Gráfico de linha de XP ao longo do tempo (últimas 4 semanas) com sparkline simples

- [ ] **10.7** Estado vazio motivador na primeira visita:
  - "Seu jornada começa aqui — complete uma sessão de estudo para ganhar seus primeiros XP"
  - Botão "Começar a estudar →"

### Critério de conclusão
Um novo usuário que nunca usou o app vê a tela de estatísticas e fica com vontade de ganhar XP, não entediado com zeros.

---

## E11 — Responsividade & Mobile

> **Objetivo:** o app funcionar bem em qualquer tela sem sacrificar funcionalidade.

### Atividades

- [ ] **11.1** Definir e implementar os 5 breakpoints com CSS media queries:
  ```css
  /* Desktop Large */ @media (min-width: 1280px)
  /* Desktop */       @media (min-width: 1024px)
  /* Tablet */        @media (min-width: 768px)
  /* Mobile Large */  @media (min-width: 480px)
  /* Mobile */        @media (max-width: 479px)
  ```

- [ ] **11.2** **Tablet (768–1023px):** sidebar colapsa para 60px com apenas ícones + tooltips

- [ ] **11.3** **Mobile (<768px):** substituir sidebar por **bottom navigation bar** com 5 itens:
  Notas · Estudo · Flashcards · Chat IA · ⋯ Mais

- [ ] **11.4** Tela de Notas em mobile: painéis viram camadas — lista de notas é tela separada, editor é tela separada, navegação por breadcrumb e botão "←"

- [ ] **11.5** Timer em mobile: tela fullscreen dedicada quando sessão ativa — sem distrações

- [ ] **11.6** Flashcard flip em mobile: adicionar **swipe horizontal**:
  - Swipe esquerda = "Difícil"
  - Swipe direita = "Fácil"
  - Além dos botões existentes

- [ ] **11.7** Modais em mobile viram **bottom sheets** (animação de baixo para cima, com handle de arrastar)

- [ ] **11.8** Verificar e corrigir todos os targets de toque < 44×44px

- [ ] **11.9** Testar em viewport 375px (iPhone SE) e 390px (iPhone 14) — nenhum overflow horizontal

### Critério de conclusão
Todas as funcionalidades principais são acessíveis em viewport 390px. Nenhum elemento sai da tela.

---

## E12 — Acessibilidade & Polimento Final

> **Objetivo:** garantir que o app é utilizável por todos e que os detalhes finais brilham.

### Atividades

#### Acessibilidade
- [ ] **12.1** Verificar contraste de todas as combinações texto/fundo com ferramenta (ex: Colour Contrast Analyser). Mínimo 4.5:1 para texto normal, 3:1 para texto grande

- [ ] **12.2** Garantir que todos os ícones interativos sem texto têm `aria-label` descritivo

- [ ] **12.3** Adicionar `aria-current="page"` ao item de nav ativo

- [ ] **12.4** Adicionar `aria-expanded`, `aria-pressed` em toggles e accordions

- [ ] **12.5** Garantir ordem de tab lógica em todas as telas (testar com Tab puro, sem mouse)

- [ ] **12.6** Implementar focus ring visível em todos os elementos interativos:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-brand);
    outline-offset: 2px;
  }
  ```

- [ ] **12.7** Adicionar suporte a `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

#### Polimento Visual
- [ ] **12.8** Revisar todos os estados vazios — nenhum deve ser apenas texto cinza sem ação

- [ ] **12.9** Revisar consistência de espaçamento — todas as telas usam a escala de tokens (nenhum valor arbitrário)

- [ ] **12.10** Revisar hierarquia tipográfica em cada tela — o título mais importante deve ser o maior elemento

- [ ] **12.11** Testar todas as animações em slow motion (DevTools → Network → throttle) para garantir que são suaves

- [ ] **12.12** Revisar textos de todos os estados vazios, tooltips, placeholders e mensagens de erro — tom consistente, em português brasileiro, sem jargão técnico

- [ ] **12.13** Teste de regressão visual: comparar screenshots antes/depois de cada etapa

### Critério de conclusão
O app passa em auditoria básica de acessibilidade no Lighthouse (score ≥ 85). Não há elementos quebrados em nenhum breakpoint.

---

## Checklist de Revisão por Sprint

Ao finalizar cada etapa, verificar:

- [ ] Todos os novos elementos usam tokens CSS (sem valores hardcoded)
- [ ] Todos os elementos interativos têm estado hover, focus e disabled
- [ ] Nenhuma tela tem estado vazio "cru" (sem ícone + mensagem + ação)
- [ ] Textos menores que 12px foram eliminados
- [ ] Targets de toque têm mínimo 44×44px
- [ ] Animações respeitam `prefers-reduced-motion`
- [ ] Novos componentes têm `aria-label` onde necessário

---

*NexoMente Design Roadmap v1.0 · Documento vivo — atualizar conforme implementação avança*

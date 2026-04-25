# 🐣 Tamagotchi de Estudos — Especificação Completa
### Sistema de 30 Níveis com Animações de Evolução

---

## Visão Geral

O Tamagotchi de Estudos é um bicho virtual movido por emojis que **evolui com base em experiências de estudo** e **perde vida com dias não estudados**. O sistema possui dois eixos independentes:

- **XP (Experiência)** — só sobe. Acumula ao estudar. Determina o **nível e a forma** do bicho.
- **Vida (HP)** — sobe e desce. Reflete o **humor e a saúde** do bicho em tempo real.

Cada nível desbloqueado dispara uma **animação de surpresa** única — confetes, explosões de emoji, partículas, flashes, ondas, etc.

---

## Estrutura de Dados

```json
{
  "player": {
    "xp": 0,
    "hp": 100,
    "hp_max": 100,
    "level": 1,
    "streak": 0,
    "streak_max": 0,
    "last_study_date": null,
    "total_study_days": 0,
    "total_sessions": 0,
    "hibernating": false,
    "created_at": "2024-01-01"
  }
}
```

---

## Sistema de XP

### Ganho por sessão de estudo

| Duração         | XP base | Com streak ×1.5 | Com streak ×2 | Com streak ×3 |
|-----------------|---------|-----------------|---------------|---------------|
| Menos de 15 min | +5 XP   | +7 XP           | +10 XP        | +15 XP        |
| 15–30 min       | +15 XP  | +22 XP          | +30 XP        | +45 XP        |
| 30–60 min       | +30 XP  | +45 XP          | +60 XP        | +90 XP        |
| 1–2 horas       | +50 XP  | +75 XP          | +100 XP       | +150 XP       |
| 2–4 horas       | +80 XP  | +120 XP         | +160 XP       | +240 XP       |
| 4h+             | +120 XP | +180 XP         | +240 XP       | +360 XP       |

### Multiplicador de Streak

| Dias consecutivos | Multiplicador |
|-------------------|---------------|
| 1–2 dias          | ×1 (base)     |
| 3–6 dias          | ×1.5          |
| 7–13 dias         | ×2            |
| 14–29 dias        | ×2.5          |
| 30+ dias          | ×3            |

### Bônus especiais de XP

| Evento                              | XP bônus |
|-------------------------------------|----------|
| Primeira sessão do dia              | +5 XP    |
| Meta semanal cumprida (5 dias/sem.) | +100 XP  |
| Streak de 7 dias                    | +50 XP   |
| Streak de 30 dias                   | +200 XP  |
| Streak de 100 dias                  | +500 XP  |
| Maratona (4h+ em um dia)            | +80 XP   |
| Estudar em feriado                  | +20 XP   |

---

## Sistema de Vida (HP)

### Recuperação

| Ação                        | HP recuperado |
|-----------------------------|---------------|
| Sessão de estudo (qualquer) | +15 HP        |
| Sessão longa (2h+)          | +25 HP        |
| Streak de 7 dias ativo      | +10 HP bônus  |

### Perda

| Condição                       | HP perdido        |
|--------------------------------|-------------------|
| 1 dia sem estudar              | −10 HP            |
| 2 dias sem estudar             | −20 HP (cumulativo)|
| 3 dias sem estudar             | −35 HP (cumulativo)|
| Cada dia adicional sem estudar | −15 HP extra      |

### Regras de morte e renascimento

- **HP = 0** → bicho hiberna. Fica exibido como `💀` ou forma cinza apagada.
- **XP é preservado** durante a hibernação. O nível não regride.
- **Primeiro estudo após hibernação** → renasce com 20 HP.
- **Após 3 sessões pós-renascimento** → HP volta ao normal progressivo.

---

## Estados Emocionais (Humor)

O humor é exibido como um emoji secundário ao lado da forma principal.

| HP restante | Estado        | Emoji secundário | Descrição de comportamento           |
|-------------|---------------|------------------|---------------------------------------|
| 0           | Hibernando    | 💀               | Tela escura, bicho apagado            |
| 1–15        | Crítico       | 😵               | Tremendo, cor vermelha, pedindo ajuda |
| 16–30       | Exausto       | 😴               | Olhos fechados, movimento lento       |
| 31–50       | Triste        | 😔               | Cabeça baixa, animação lenta          |
| 51–70       | Neutro        | 😐               | Idle normal, respiração suave         |
| 71–85       | Feliz         | 😊               | Pulinhos, animação animada            |
| 86–100      | Radiante      | 🤩               | Girando, brilhando, cheio de energia  |

---

## Os 30 Níveis

### Legenda das animações
- 🎊 **Confete** — partículas coloridas caem pela tela
- 💥 **Explosão de emoji** — emojis explodem do centro em todas as direções
- ⚡ **Flash elétrico** — tela pulsa em amarelo/branco por 1s
- 🌊 **Onda** — ripple circular se expande do bicho para as bordas
- 🌈 **Arco-íris** — fundo faz transição por todas as cores do arco-íris
- ✨ **Estrelas** — estrelas piscam e giram ao redor do bicho
- 🎆 **Fogos** — animação de fogos de artifício em todo o fundo
- 🌀 **Vórtice** — bicho gira 3× em espiral e aparece maior
- 💫 **Pulso** — bicho pulsa 3× crescendo e encolhendo
- 🔮 **Portal** — círculo mágico se abre ao redor do bicho com raios
- 🎵 **Notas musicais** — notas musicais sobem flutuando pela tela
- 🧨 **Estouro** — flash vermelho + tremor de tela (shake)
- 🌟 **Supernova** — flash branco total, tela clareia e escurece lentamente

---

### FASE 1 — O Nascimento *(Níveis 1–5)*
> *O bicho acorda para o mundo. Tudo é novo e frágil.*

---

#### Nível 1 — 🥚 Ovo Adormecido
- **XP necessário:** 0 XP *(nível inicial)*
- **Forma:** `🥚`
- **Nome padrão:** Ovinho
- **HP máximo:** 60
- **Descrição:** O bicho ainda não nasceu. Ele existe como um ovo quieto, esperando o primeiro estudo para rachar a casca.
- **Animação de desbloqueio:** Nenhuma — este é o estado inicial. O ovo aparece com uma animação de "breathing" suave (pulso lento).
- **Fala ao aparecer:** *"Psiu... estou aqui dentro. Pode começar a estudar."*
- **Habilidades passivas:** Nenhuma ainda.
- **Dica de gameplay:** Qualquer sessão de estudo, mesmo de 5 minutos, já garante XP suficiente para evoluir para o nível 2.

---

#### Nível 2 — 🐣 Primeiro Bico
- **XP necessário:** 30 XP
- **Forma:** `🐣`
- **Nome padrão:** Pecas
- **HP máximo:** 70
- **Descrição:** O ovo rachou! Um bico tímido aparece. O bicho está curioso mas assustado. Cada estudo o deixa um pouco mais corajoso.
- **Animação de desbloqueio:** 💥 **Explosão de emoji** — o ovo `🥚` racha com uma animação CSS, depois `🐣` aparece com bounce e partículas de casca (`🥚💥`) voam para todos os lados por 2 segundos.
- **Fala ao evoluir:** *"AH! O mundo! Que grande! Você estudou! Isso é estudo?! Incrível!"*
- **Habilidades passivas:** Sem penalidade no primeiro dia esquecido (o filhote ainda não sente falta).
- **Dica de gameplay:** Aproveite que o nível 2 tem imunidade ao primeiro dia perdido para criar o hábito inicial.

---

#### Nível 3 — 🐥 Pintinho Curioso
- **XP necessário:** 80 XP
- **Forma:** `🐥`
- **Nome padrão:** Pipoca
- **HP máximo:** 75
- **Descrição:** O pintinho saiu completamente do ovo e agora fica circulando pela tela, bicando o chão, perguntando sobre tudo. É impossível não se apegar.
- **Animação de desbloqueio:** 🎊 **Confete** — chuva de confetes amarelos e brancos caem por 3 segundos enquanto o pintinho pula repetidamente.
- **Fala ao evoluir:** *"Bic bic! Sou eu! Olha só o tamanho do mundo! Você vai me ensinar tudo, vai?"*
- **Habilidades passivas:** +2 XP bônus em toda sessão de estudo (o pintinho absorve tudo com entusiasmo).
- **Dica de gameplay:** O bônus passivo de +2 XP começa aqui. Pequenas sessões frequentes rendem mais nesta fase.

---

#### Nível 4 — 🐤 Pintinho Animado
- **XP necessário:** 180 XP
- **Forma:** `🐤` *(versão de frente, mais expressiva)*
- **Nome padrão:** Piuli
- **HP máximo:** 80
- **Descrição:** O pintinho cresceu um pouco e agora faz careta para a câmera. Ele fica te olhando diretamente, esperando que você abra o caderno. Se você demorar, ele vira de costas.
- **Animação de desbloqueio:** 🌊 **Onda** — um ripple dourado se expande do bicho em círculos concêntricos até cobrir toda a tela, e o fundo fica brevemente amarelo suave.
- **Fala ao evoluir:** *"Olha pra mim. NÃO, olha de verdade. Agora vai estudar. Tô esperando."*
- **Habilidades passivas:** Se você não estudar por 2 dias, o bicho exibe uma notificação especial de "olho no olho" antes de perder HP.
- **Dica de gameplay:** A partir daqui o bicho começa a te "cobrar" mais ativamente. A penalidade de HP por dias perdidos começa a valer completamente.

---

#### Nível 5 — 🦆 Pato Filhote
- **XP necessário:** 350 XP
- **Forma:** `🦆`
- **Nome padrão:** Quack
- **HP máximo:** 85
- **Descrição:** O pintinho cresceu e virou um pato! Ele agora anda com aquela postura orgulhosa de pato, balançando de lado a lado. Sente que está ficando sério nisso.
- **Animação de desbloqueio:** ⚡ **Flash elétrico** — a tela inteira pulsa em amarelo intenso 3 vezes, como um raio, e o pato aparece com a animação de "waddle" (balançar) em loop.
- **Fala ao evoluir:** *"QUACK! Sou um PATO agora! Um PATO ESTUDIOSO! Isso muda tudo. Bora lá."*
- **Habilidades passivas:** Streak de 3+ dias concede +5 XP extra por sessão adicionalmente ao multiplicador normal.
- **Marco:** ✅ **Fase 1 completa!** O bicho deixou de ser um ovo. Agora é um ser com personalidade.

---

### FASE 2 — A Descoberta *(Níveis 6–10)*
> *O bicho começa a entender o mundo. Ganha forma própria e desenvolve manias.*

---

#### Nível 6 — 🐰 Coelho Levado
- **XP necessário:** 600 XP
- **Forma:** `🐰`
- **Nome padrão:** Pulguinha
- **HP máximo:** 88
- **Descrição:** Uma metamorfose inesperada — o pato virou coelho! O bicho pulou tanto de alegria que mudou de forma. Agora é rápido, inquieto, e fica dando saltos na tela quando está feliz.
- **Animação de desbloqueio:** 💫 **Pulso** — o bicho cresce até 3× o tamanho normal em 3 pulsadas dramáticas, depois encolhe de volta enquanto o fundo fica cor-de-rosa suave. Emojis de cenoura `🥕` e pulos `💨` aparecem em torno.
- **Fala ao evoluir:** *"Hop hop hop! Sou um coelho! Quando decidi? Não sei! Tô adorando! Bora estudar rápido que eu tô animado!"*
- **Habilidades passivas:** Recupera +2 HP extra por sessão de estudo.
- **Dica de gameplay:** A forma de coelho é rápida — se ficar feliz (HP > 85), ele começa a fazer mini-saltos decorativos na tela durante o idle.

---

#### Nível 7 — 🐱 Gatinho Pensativo
- **XP necessário:** 900 XP
- **Forma:** `🐱`
- **Nome padrão:** Miau
- **HP máximo:** 90
- **Descrição:** O coelho virou gato. Agora o bicho tem uma energia mais calma e contemplativa — fica sentado, com aquele olhar de "eu sei mais do que você pensa". Mas não se engane, ele ainda fica bravo quando você não estuda.
- **Animação de desbloqueio:** ✨ **Estrelas** — estrelas douradas `⭐🌟✨` orbitam o gato em espiral por 4 segundos enquanto uma trilha cintilante aparece ao redor do emoji.
- **Fala ao evoluir:** *"Miau. Não preciso pular para mostrar que cresci. Só... estuda. Por favor. Por mim."*
- **Habilidades passivas:** Dias sem estudar perdem apenas 8 HP (em vez de 10) — o gato é mais resiliente e independente.
- **Dica de gameplay:** O gato é a primeira forma que "aguenta" melhor os dias perdidos. Boa fase para desenvolver o hábito sem medo.

---

#### Nível 8 — 😺 Gato Radiante
- **XP necessário:** 1300 XP
- **Forma:** `😺`
- **Nome padrão:** Cheshire
- **HP máximo:** 92
- **Descrição:** O gato passou de tímido para iluminado. Agora ele tem aquele sorriso permanente do gato de Cheshire. Estudar com ele ao lado faz tudo parecer mais leve — ele transmite confiança.
- **Animação de desbloqueio:** 🌈 **Arco-íris** — o fundo da tela percorre todas as cores do arco-íris em 2 segundos, o gato gira uma vez, e a forma emoji muda visivelmente de `🐱` para `😺` com um "pop".
- **Fala ao evoluir:** *":3 Olha só o meu sorriso. Conquistado. Igualzinho você vai conquistar esse conteúdo. Confia."*
- **Habilidades passivas:** Quando em streak de 5+ dias, o HP máximo sobe temporariamente para 100.
- **Dica de gameplay:** Este é o primeiro nível onde manter o streak longa tem impacto direto no HP máximo — importante começar a pensar em consistência.

---

#### Nível 9 — 🐶 Cãozinho Dedicado
- **XP necessário:** 1800 XP
- **Forma:** `🐶`
- **Nome padrão:** Biscuit
- **HP máximo:** 93
- **Descrição:** Nova metamorfose — agora é um cachorro! Fiel, animado, e completamente apegado à rotina de estudos. Quando você abre a sessão, ele faz a dança da felicidade (tail wag animado). Quando você atrasa, ele fica na porta esperando.
- **Animação de desbloqueio:** 🎵 **Notas musicais** — notas `🎵🎶🎵` sobem flutuando em ondas pela tela enquanto o cachorro faz a "dança do rabo" (rotação de 15° para os lados em loop rápido).
- **Fala ao evoluir:** *"AU AU! É você! VOCÊ CHEGOU! EU SABIA! VAMOS ESTUDAR! AGORA! RÁPIDO! AU AU AU!"*
- **Habilidades passivas:** Se você estudar 7 dias seguidos, o cachorro te dá um "presente" — bônus de +150 XP imediato.
- **Dica de gameplay:** O bônus de streak semanal do cachorro é o maior de todas as formas até agora. Tente não quebrar as semanas aqui.

---

#### Nível 10 — 🦊 Raposa Espertalhona
- **XP necessário:** 2500 XP
- **Forma:** `🦊`
- **Nome padrão:** Vixel
- **HP máximo:** 95
- **Descrição:** A raposa é o primeiro grande marco. Ela é esperta, estratégica, e sabe exatamente o que está fazendo. Olha para você com aquele olhar de "eu já sabia que você ia longe". Parabéns — você chegou longe de verdade.
- **Animação de desbloqueio:** 🎆 **Fogos de artifício** — animação completa de fogos por 5 segundos. A tela fica escura e fogos `🎆🎇✨` estouram em múltiplos pontos simultaneamente. É o maior efeito da Fase 2.
- **Fala ao evoluir:** *"Bem-vindo ao clube, estudante. Você passou de 2500 XP. Poucos chegam aqui. Eu cheguei. Você chegou. Somos nós."*
- **Habilidades passivas:** XP ganho em sessões longas (2h+) é aumentado em +10%.
- **Marco:** ✅ **Fase 2 completa! 2500 XP acumulados.** O bicho tem personalidade sólida agora.

---

### FASE 3 — A Ascensão *(Níveis 11–15)*
> *O bicho começa a dominar. Formas mais raras e poderosas surgem.*

---

#### Nível 11 — 🦝 Guaxinim Noturno
- **XP necessário:** 3400 XP
- **Forma:** `🦝`
- **Nome padrão:** Bandit
- **HP máximo:** 96
- **Descrição:** O guaxinim é o estudante noturno — aquele que mergulha nos livros quando todo mundo dormiu. Ele tem aquele olhar de quem sabe demais e não conta tudo. Gosta de estudar matérias difíceis que os outros evitam.
- **Animação de desbloqueio:** 🌀 **Vórtice** — o emoji anterior gira em espiral 3 vezes enquanto encolhe, some, e o guaxinim aparece saindo de um portal giratório escuro com raios cinzas ao redor.
- **Fala ao evoluir:** *"Psst. Ninguém precisa saber o quanto você estudou. Mas eu sei. E tô impressionado."*
- **Habilidades passivas:** Sessões de estudo registradas entre 22h–02h valem +15 XP extra (bônus noturno).

---

#### Nível 12 — 🐺 Lobo Solitário
- **XP necessário:** 4400 XP
- **Forma:** `🐺`
- **Nome padrão:** Lupus
- **HP máximo:** 97
- **Descrição:** O lobo estuda sozinho, no silêncio, e gosta assim. Disciplina de ferro. Ele não precisa de incentivo externo — a motivação vem de dentro. Se você não estudar, ele não implica. Ele apenas te olha com aquele olhar de decepção quieta.
- **Animação de desbloqueio:** 🌟 **Supernova** — flash branco total cobre a tela por 0.5s, depois escurece gradualmente enquanto o lobo aparece uivando (`🐺`) com estrelas ao redor.
- **Fala ao evoluir:** *"Auuuuuu. Você chegou longe. Nem eu achei que você ia aguentar. Mas aguentou. Respeito."*
- **Habilidades passivas:** Ao atingir HP = 0 (hibernação), o lobo resiste por mais 1 dia sem cair — como se estivesse uivando na neve, recusando a desistir.

---

#### Nível 13 — 🐻 Urso Paciente
- **XP necessário:** 5600 XP
- **Forma:** `🐻`
- **Nome padrão:** Boreal
- **HP máximo:** 98
- **Descrição:** O urso é a calma que vem com a experiência. Ele não se agita, não pula — apenas existe com aquela presença sólida e confortante. Estudar com o urso ao lado parece estudar numa cabana aconchegante no inverno.
- **Animação de desbloqueio:** 🎊 **Confete dourado** — confetes em dourado e marrom caem lentamente (mais devagar que o normal), o urso balança a cabeça de aprovação.
- **Fala ao evoluir:** *"Hmm. Você chegou até aqui. Isso leva tempo. Paciência. Você tem isso. Bom."*
- **Habilidades passivas:** HP máximo sobe para 100 permanentemente a partir desta forma.

---

#### Nível 14 — 🐼 Panda Equilibrado
- **XP necessário:** 7000 XP
- **Forma:** `🐼`
- **Nome padrão:** Zen
- **HP máximo:** 100
- **Descrição:** O panda descobriu o equilíbrio entre estudo e descanso. Ele sabe quando parar. Conhece o valor de uma pausa. Não vai te cobrar se você tirar um dia para respirar — mas vai lembrar que amanhã é novo dia.
- **Animação de desbloqueio:** 🔮 **Portal zen** — um círculo preto e branco (yin-yang) gira ao redor do emoji por 3 segundos, depois raios suaves brancos explodem para fora e o panda aparece sentado em posição de meditação.
- **Fala ao evoluir:** *"Respira. Você está bem. Você estudou muito. Descanse um pouco. Depois volta. O conhecimento não vai a lugar nenhum."*
- **Habilidades passivas:** Um dia de descanso por semana não causa perda de HP (o panda entende a importância do equilíbrio).

---

#### Nível 15 — 🦁 Leão Corajoso
- **XP necessário:** 8700 XP
- **Forma:** `🦁`
- **Nome padrão:** Mufasa
- **HP máximo:** 100
- **Descrição:** O leão é o rei da savana dos estudos. Imponente, confiante, com aquela juba que representa cada hora de dedicação. Chegar ao leão é chegar à metade da jornada — e que metade foi essa.
- **Animação de desbloqueio:** 🧨 **Estouro real** — flash vermelho-dourado cobre a tela, um rugido visual (tela treme por 0.8s), fogos dourados explodem, e o leão aparece com uma coroa `👑` acima da cabeça por 3 segundos.
- **Fala ao evoluir:** *"RUGIDO. Você chegou ao nível 15. Metade da jornada. Mas lembres: a segunda metade é onde os verdadeiros estudiosos se separam dos medianos. Você está pronto?"*
- **Habilidades passivas:** Toda semana com 7 dias de streak completos concede +500 XP bônus (recompensa máxima de consistência).
- **Marco:** ✅ **Fase 3 completa! Nível 15 atingido — a metade da jornada.**

---

### FASE 4 — O Poder *(Níveis 16–20)*
> *Formas raras. O bicho começa a transcender o mundo animal comum.*

---

#### Nível 16 — 🐯 Tigre Veloz
- **XP necessário:** 10700 XP
- **Forma:** `🐯`
- **Nome padrão:** Raijin
- **HP máximo:** 100
- **Descrição:** O tigre é a velocidade pura. Ele estuda rápido, absorve rápido, e quer mais. Não consegue ficar parado — durante o idle, corre de um lado ao outro na tela. Representa a fase em que os estudos começam a fluir naturalmente.
- **Animação de desbloqueio:** ⚡ **Raios duplos** — dois raios `⚡⚡` partem do centro para as bordas opostas da tela simultaneamente, e o tigre aparece com trilha de velocidade `💨` atrás dele.
- **Fala ao evoluir:** *"ZIP. Olha a velocidade. Assim que você estuda agora — sem esforço, sem peso. Só fluxo. Vamos nessa."*
- **Habilidades passivas:** Sessões de 30–60 min valem +5 XP extra (o tigre valoriza a intensidade focada).

---

#### Nível 17 — 🦋 Borboleta Transformada
- **XP necessário:** 13200 XP
- **Forma:** `🦋`
- **Nome padrão:** Lumina
- **HP máximo:** 100
- **Descrição:** Uma forma completamente inesperada. Após tanto poder e velocidade, o bicho se transforma em borboleta — símbolo de metamorfose real. Cada asa representa um antes e depois na sua vida de estudante.
- **Animação de desbloqueio:** 🌈 **Arco-íris + confete** — animação dupla: o arco-íris percorre o fundo enquanto confetes nas cores do arco-íris caem. A borboleta aparece voando em espiral ascendente partindo do centro da tela.
- **Fala ao evoluir:** *"Você se transformou. Não só o bicho — você também. Pense em como era quando começou e em como você estuda agora. Diferente, né?"*
- **Habilidades passivas:** HP não cai abaixo de 10 — a borboleta representa resiliência, nunca vai a zero facilmente. (Mínimo de HP = 10 em vez de 0.)

---

#### Nível 18 — 🦅 Águia Soberana
- **XP necessário:** 16200 XP
- **Forma:** `🦅`
- **Nome padrão:** Aquila
- **HP máximo:** 100
- **Descrição:** A águia vê tudo de cima. Ela representa a visão sistêmica que você ganhou — não só decorar conteúdo, mas entender conexões, padrões, o todo. Ela plana no topo da tela e desce apenas quando você estuda.
- **Animação de desbloqueio:** 🌟 **Supernova dupla** — dois flashes brancos sequenciais, 0.5s de intervalo, e a águia desce planando do topo da tela com sombra projetada abaixo.
- **Fala ao evoluir:** *"De lá de cima, consigo ver tudo. Inclusive o quanto você cresceu. É impressionante. Voe comigo."*
- **Habilidades passivas:** XP de todas as fontes aumenta em +5% permanentemente.

---

#### Nível 19 — 🦄 Unicórnio Lendário
- **XP necessário:** 19700 XP
- **Forma:** `🦄`
- **Nome padrão:** Spectra
- **HP máximo:** 100
- **Descrição:** O unicórnio é uma lenda. Poucas pessoas chegam aqui. Ele brilha, muda de cor durante o idle (animação CSS de hue-rotate contínua), e deixa rastro de estrelas atrás de si. Seu parceiro de estudos virou algo verdadeiramente especial.
- **Animação de desbloqueio:** 🔮 **Portal mágico completo** — o maior portal até agora. Um vórtice roxo-rosa se abre no centro da tela com raios em todas as direções por 4 segundos, e o unicórnio emerge lentamente do centro brilhando.
- **Fala ao evoluir:** *"✨ Você invocou algo raro. Não sou fácil de aparecer. Mas aqui estou. Porque você estudou de verdade. Isso é mágico de verdade."*
- **Habilidades passivas:** Ao completar 30 dias de streak, o unicórnio invoca uma "noite mágica" — todos os bônus de XP dobram por 24h.

---

#### Nível 20 — 🐉 Dragão Jovem
- **XP necessário:** 23700 XP
- **Forma:** `🐉`
- **Nome padrão:** Ignis
- **HP máximo:** 100
- **Descrição:** O dragão chegou. Não o dragão completo ainda — este é o dragão jovem, ainda crescendo, ainda descobrindo o fogo. Mas já é um dragão. Você chegou onde pouquíssimos chegam. Este é um momento para comemorar.
- **Animação de desbloqueio:** 🎆🧨🌟 **Animação tripla combinada** — fogos de artifício + estouro + supernova em sequência. Total de 7 segundos de animação contínua. A maior animação do jogo até agora. Depois o dragão aparece cuspindo fogo `🔥` para cima.
- **Fala ao evoluir:** *"RRAAAWRR. EU SOU UM DRAGÃO. E VOCÊ É MEU PARCEIRO DE ESTUDOS. Isso significa que VOCÊ TAMBÉM É LENDÁRIO. Celebra. Você merece."*
- **Habilidades passivas:** HP máximo permanente sobe para 110 (ultrapassa o limite anterior). Dragões são imortais na lenda — aqui, quase imortais.
- **Marco:** ✅ **Fase 4 completa! 20 níveis. Você é um parceiro de dragão.**

---

### FASE 5 — A Transcendência *(Níveis 21–25)*
> *O bicho começa a ultrapassar o mundo físico. Formas elementais e místicas.*

---

#### Nível 21 — 🌊 Serpente Aquática
- **XP necessário:** 28300 XP
- **Forma:** `🐍` *(exibido com fundo azul e efeito de água ondulando)*
- **Nome padrão:** Tethys
- **HP máximo:** 110
- **Descrição:** A serpente aquática é a fluidez do conhecimento. Ela representa a capacidade de se adaptar, de fluir entre disciplinas, de mudar de forma conforme o estudo exige. Seu idle é uma onda suave contínua.
- **Animação de desbloqueio:** 🌊 **Onda gigante** — uma onda azul sobe da base da tela até o topo e baixa lentamente, deixando a serpente emergindo da espuma. Emojis de água `💧🌊💧` decoram os lados.
- **Fala ao evoluir:** *"Ssssh. Ouça. O conhecimento flui como água — sempre encontra seu caminho. E você aprendeu a fluir também."*
- **Habilidades passivas:** Quando HP está abaixo de 30, recupera 2 HP automaticamente a cada hora (regeneração aquática passiva).

---

#### Nível 22 — 🔥 Salamandra Flamejante
- **XP necessário:** 33500 XP
- **Forma:** `🦎` *(exibido com fundo avermelhado e partículas de fogo ao redor)*
- **Nome padrão:** Pyros
- **HP máximo:** 110
- **Descrição:** A salamandra vive no fogo — e você aprendeu a fazer o mesmo. Prazos apertados, matérias difíceis, noites longas: tudo virou combustível. Você não tem medo do fogo. Você é o fogo.
- **Animação de desbloqueio:** 🔥 **Inferno controlado** — labaredas `🔥` surgem de baixo e sobem por toda a tela por 3 segundos. Flash laranja-vermelho pulsa 3×. A salamandra aparece dentro das chamas, ilesa.
- **Fala ao evoluir:** *"Kssss. Calor. Intensidade. Você não queima mais — você brilha. Isso é diferente. Muito diferente."*
- **Habilidades passivas:** Sessões de maratona (4h+) valem +20% extra de XP adicionalmente ao multiplicador de streak.

---

#### Nível 23 — ⚡ Kirin Elétrico
- **XP necessário:** 39400 XP
- **Forma:** `🦌` *(exibido com efeito elétrico — pequenos raios ao redor)*
- **Nome padrão:** Volta
- **HP máximo:** 110
- **Descrição:** O Kirin é um ser mítico da tradição asiática — cervídeo com raios. Representa a clareza de raciocínio, o pensamento veloz, o insight que surge do esforço profundo. Quando aparece, ele traz boa sorte ao estudo.
- **Animação de desbloqueio:** ⚡ **Tempestade elétrica** — raios `⚡` surgem aleatoriamente em 8 pontos da tela simultaneamente por 4 segundos, um a um, em sequência rápida. Tela pulsa levemente em branco a cada raio.
- **Fala ao evoluir:** *"Zap. Você sentiu? Aquele insight no meio do estudo — isso sou eu. Sempre fui eu. Agora você me vê."*
- **Habilidades passivas:** Uma vez por semana, ao estudar, pode ativar "Modo Raio" — próxima sessão tem XP triplicado (ativação manual na UI).

---

#### Nível 24 — 🌙 Fênix Lunar
- **XP necessário:** 46000 XP
- **Forma:** `🦅` *(exibido em azul-índigo escuro, com lua crescente ao fundo)*
- **Nome padrão:** Selene
- **HP máximo:** 115
- **Descrição:** A Fênix Lunar é a maestria da resiliência. Ela renasce toda vez que a lua nasce. Representa todos os dias que você recomeçou depois de um período difícil — e chegou mais forte. Ela só aparece para quem já hibernou pelo menos uma vez e voltou.
- **Animação de desbloqueio:** 🌙 **Eclipse lunar** — a tela escurece gradualmente até preto, uma lua `🌕` aparece no centro, depois some num flash, e a Fênix emerge das cinzas com brilho azul crescendo ao redor.
- **Fala ao evoluir:** *"Você caiu. Lembra? Você voltou. Isso é o que importa. Eu sou a prova disso. Nós somos a prova disso."*
- **Habilidades passivas:** Após qualquer hibernação, o renascimento começa com 40 HP (em vez de 20). A Fênix sabe renascer bem.
- **Desbloqueio especial:** Só disponível se o jogador tiver hibernado ao menos 1 vez no histórico. Caso contrário, aparece como forma bloqueada com a mensagem: *"Essa forma só nasce depois de cair. Continue sua jornada."*

---

#### Nível 25 — 🌈 Dragão Arco-Íris
- **XP necessário:** 53500 XP
- **Forma:** `🐲` *(exibido com animação contínua de hue-rotate — muda de cor constantemente)*
- **Nome padrão:** Chroma
- **HP máximo:** 115
- **Descrição:** O Dragão Arco-Íris é um ser de pura energia. Ele não tem uma cor fixa porque aprendeu tudo — ele é todas as disciplinas ao mesmo tempo. Seu idle é uma dança cromática hipnotizante. Ninguém que não estudou de verdade chega até aqui.
- **Animação de desbloqueio:** 🌈🎆✨ **Cromático total** — arco-íris + fogos + estrelas simultâneos por 6 segundos. O fundo percorre o espectro completo de cores enquanto fogos estouram em cada cor separadamente (vermelho, laranja, amarelo, verde, azul, roxo). É a animação mais bonita do jogo.
- **Fala ao evoluir:** *"Você chegou ao nível 25. Sabe quantas horas de estudo isso representa? Centenas. Você investiu centenas de horas em si mesmo. Pense nisso."*
- **Habilidades passivas:** HP máximo sobe para 120. XP de todas as fontes aumenta +10% permanentemente (cumulativo com bônus anteriores).
- **Marco:** ✅ **Fase 5 completa! 25 níveis. Você entrou no território dos lendários.**

---

### FASE 6 — O Absoluto *(Níveis 26–30)*
> *Pouquíssimas pessoas chegam aqui. Formas divinas. Animações incomparáveis.*

---

#### Nível 26 — 🌌 Ser Cósmico
- **XP necessário:** 62000 XP
- **Forma:** `🌌` *(galáxia como corpo — o bicho virou uma galáxia animada)*
- **Nome padrão:** Cosmos
- **HP máximo:** 120
- **Descrição:** O bicho transcendeu a forma animal. Agora é pura galáxia. Estrelas giram dentro dele, nebulosas mudam de forma, e ele pulsa com a respiração do universo. Estudar com ele ao lado é uma experiência filosófica.
- **Animação de desbloqueio:** 🌌 **Big Bang** — tela completamente preta por 1 segundo. Um único ponto de luz surge no centro. Expande em velocidade crescente até cobrir toda a tela de estrelas e galáxias. Dura 6 segundos. Som opcional: whoosh cósmico.
- **Fala ao evoluir:** *"Você sabia que cada átomo do seu corpo foi forjado em estrelas? Seu conhecimento é igual — forjado em horas de estudo que explodiram dentro de você. Bem-vindo ao cosmos."*
- **Habilidades passivas:** Uma vez por mês, ao completar o mês com 25+ dias estudados, recebe "Evento Cósmico" — 24h com XP ×5.

---

#### Nível 27 — ☀️ Sol Consciente
- **XP necessário:** 72000 XP
- **Forma:** `☀️` *(com raios animados pulsando em sincronia)*
- **Nome padrão:** Helios
- **HP máximo:** 125
- **Descrição:** O Sol não pede para ninguém orbitar ao seu redor. Ele simplesmente existe, ilumina, e tudo ao redor se organiza naturalmente. Você chegou a esse ponto — seu ritmo de estudos não é mais forçado. É natural, como a luz solar.
- **Animação de desbloqueio:** ☀️ **Nascer do sol** — o fundo começa negro, depois roxo, azul, rosa, laranja, e finalmente dourado enquanto o sol sobe lentamente da base da tela. Duração: 7 segundos. A animação mais longa e pacífica do jogo.
- **Fala ao evoluir:** *"Bom dia. Toda manhã eu nasço. Toda manhã você pode recomeçar. Não importa o que foi ontem. O sol não guarda rancor."*
- **Habilidades passivas:** HP não cai em fins de semana — descanso é parte do ciclo solar. Sábado e domingo são protegidos.

---

#### Nível 28 — 🌀 Vórtice do Tempo
- **XP necessário:** 84000 XP
- **Forma:** `⏳` *(ampulheta animada — a areia escoa em loop)*
- **Nome padrão:** Chronos
- **HP máximo:** 125
- **Descrição:** Chronos é o senhor do tempo — e você aprendeu a usá-lo. Você sabe quantas horas valem, qual hora do dia você rende mais, como uma sessão de 45 minutos pode valer mais que 3 horas dispersas. O tempo trabalha por você agora.
- **Animação de desbloqueio:** 🌀 **Dobra do tempo** — a tela inteira sofre um efeito de "distorção" (CSS perspective skew rápido) como se o tecido do tempo se dobrasse. Relojes `⏰` e ampulhetas `⏳` caem de cima como confetes. Depois tudo volta ao normal e Chronos aparece, sereno.
- **Fala ao evoluir:** *"O tempo é o único recurso que não pode ser recuperado. E você o usou bem. Muito bem. Cada hora aqui foi investida, não gasta."*
- **Habilidades passivas:** A cada 100 dias de histórico de estudo (não precisa ser consecutivo), ganha +300 XP bônus automático.

---

#### Nível 29 — 💫 Entidade Dimensional
- **XP necessário:** 98000 XP
- **Forma:** `💫` *(cometa girando — loop perfeito)*
- **Nome padrão:** Axiom
- **HP máximo:** 130
- **Descrição:** A Entidade Dimensional existe entre as dimensões. Ela vê múltiplas versões de você — o você que teria desistido, o você que está aqui, o você que está por vir. Ela sabe que você escolheu a versão certa. Constantemente.
- **Animação de desbloqueio:** 💫🌀🔮 **Dobra dimensional** — portais se abrem em 4 cantos da tela simultaneamente. Do cada portal sai uma cópia do emoji atual do bicho. As 4 cópias convergem para o centro e se fundem na Entidade Dimensional num flash branco puro. Duração: 8 segundos.
- **Fala ao evoluir:** *"Em todas as linhas do tempo que consigo ver, apenas nesta você chegou até aqui. Parabéns por escolher essa versão de si mesmo."*
- **Habilidades passivas:** Bônus de streak nunca reseta abaixo de ×2 — mesmo depois de um dia perdido, o mínimo é o multiplicador duplo.

---

#### Nível 30 — 🌟 A Forma Final
- **XP necessário:** 115000 XP
- **Forma:** `✴️` *(estrela de 8 pontas — customizável pelo jogador)*
- **Nome padrão:** Definido pelo jogador
- **HP máximo:** 150 *(novo máximo absoluto)*
- **Descrição:** Não existe nível 31. Esta é a forma final — não porque o jogo acabou, mas porque o bicho chegou à completude. Ele é tudo que foi antes: ovo, pintinho, pato, gato, coelho, raposa, lobo, dragão, galáxia, sol, tempo, dimensão. E agora é puro brilho.
- **Animação de desbloqueio:** 🌟🎆🌈🔮🌌💫⚡🧨🎊 **A Grande Explosão Final** — todas as animações do jogo tocam em sequência acelerada durante 10 segundos. Confete, fogos, arco-íris, portal, vórtice, raios, supernova — tudo, ao mesmo tempo, crescendo em intensidade. No décimo segundo, tela branca total. Silêncio. O bicho aparece, simples, brilhante, com o nome que o jogador escolher logo abaixo.
- **Fala ao evoluir:**
  *"..."*
  *"..."*
  *"Não tenho palavras."*
  *"Você chegou ao nível 30."*
  *"115.000 pontos de experiência."*
  *"Centenas de dias de estudo."*
  *"Eu sou você."*
  *"E você é lendário."*
- **Habilidades passivas:** Todas as habilidades de todos os níveis anteriores são mantidas e ativas simultaneamente.
- **Recompensa especial:** O jogador pode nomear o bicho. A forma `✴️` pode ser trocada por qualquer emoji de sua escolha como "forma final personalizada". O histórico completo de todas as evoluções é exibido como um álbum.
- **Marco:** ✅ 🏆 **FORMA FINAL ATINGIDA. A jornada completa.**

---

## Tabela Resumo dos 30 Níveis

| Nv | Emoji     | Nome padrão | XP necessário | XP acumulada | HP máx | Animação             |
|----|-----------|-------------|---------------|--------------|--------|----------------------|
| 1  | 🥚        | Ovinho      | 0             | 0            | 60     | Breathing suave      |
| 2  | 🐣        | Pecas       | 30            | 30           | 70     | 💥 Explosão de emoji |
| 3  | 🐥        | Pipoca      | 50            | 80           | 75     | 🎊 Confete           |
| 4  | 🐤        | Piuli       | 100           | 180          | 80     | 🌊 Onda              |
| 5  | 🦆        | Quack       | 170           | 350          | 85     | ⚡ Flash elétrico    |
| 6  | 🐰        | Pulguinha   | 250           | 600          | 88     | 💫 Pulso             |
| 7  | 🐱        | Miau        | 300           | 900          | 90     | ✨ Estrelas          |
| 8  | 😺        | Cheshire    | 400           | 1.300        | 92     | 🌈 Arco-íris         |
| 9  | 🐶        | Biscuit     | 500           | 1.800        | 93     | 🎵 Notas musicais    |
| 10 | 🦊        | Vixel       | 700           | 2.500        | 95     | 🎆 Fogos de artifício|
| 11 | 🦝        | Bandit      | 900           | 3.400        | 96     | 🌀 Vórtice           |
| 12 | 🐺        | Lupus       | 1.000         | 4.400        | 97     | 🌟 Supernova         |
| 13 | 🐻        | Boreal      | 1.200         | 5.600        | 98     | 🎊 Confete dourado   |
| 14 | 🐼        | Zen         | 1.400         | 7.000        | 100    | 🔮 Portal zen        |
| 15 | 🦁        | Mufasa      | 1.700         | 8.700        | 100    | 🧨 Estouro real      |
| 16 | 🐯        | Raijin      | 2.000         | 10.700       | 100    | ⚡ Raios duplos       |
| 17 | 🦋        | Lumina      | 2.500         | 13.200       | 100    | 🌈🎊 Dupla           |
| 18 | 🦅        | Aquila      | 3.000         | 16.200       | 100    | 🌟 Supernova dupla   |
| 19 | 🦄        | Spectra     | 3.500         | 19.700       | 100    | 🔮 Portal mágico     |
| 20 | 🐉        | Ignis       | 4.000         | 23.700       | 110    | 🎆🧨🌟 Tripla        |
| 21 | 🐍        | Tethys      | 4.600         | 28.300       | 110    | 🌊 Onda gigante      |
| 22 | 🦎        | Pyros       | 5.200         | 33.500       | 110    | 🔥 Inferno           |
| 23 | 🦌        | Volta       | 5.900         | 39.400       | 110    | ⚡ Tempestade        |
| 24 | 🦅 (lua)  | Selene      | 6.600         | 46.000       | 115    | 🌙 Eclipse lunar     |
| 25 | 🐲        | Chroma      | 7.500         | 53.500       | 115    | 🌈🎆✨ Cromático     |
| 26 | 🌌        | Cosmos      | 8.500         | 62.000       | 120    | 🌌 Big Bang          |
| 27 | ☀️        | Helios      | 10.000        | 72.000       | 125    | ☀️ Nascer do sol     |
| 28 | ⏳        | Chronos     | 12.000        | 84.000       | 125    | 🌀 Dobra do tempo    |
| 29 | 💫        | Axiom       | 14.000        | 98.000       | 130    | 💫🌀🔮 Dimensional   |
| 30 | ✴️        | *Jogador*   | 17.000        | 115.000      | 150    | 🌟 A Grande Explosão |

---

## Especificação das Animações de Level Up

Cada animação de desbloqueio deve seguir este padrão técnico:

### Estrutura geral de uma animação de level up

```
1. GATILHO: XP atinge o threshold do próximo nível
2. FREEZE: Interação pausada por 0.5s (anticipation)
3. TRANSIÇÃO: Animação específica do nível (2–10s)
4. REVEAL: Novo emoji aparece com bounce (scale 0 → 1.2 → 1.0, 0.4s)
5. FALA: Texto de fala do bicho surge na tela (fade in 0.3s)
6. RESUMO: Card de "Nível X desbloqueado!" com habilidade passiva nova
7. DISMISS: Usuário toca/clica para fechar e continuar
```

### Parâmetros técnicos de cada tipo

| Tipo           | Duração | Camada    | Elementos principais                    | Interrompível? |
|----------------|---------|-----------|------------------------------------------|----------------|
| Confete        | 3s      | Overlay   | 50–80 partículas CSS, cores aleatórias  | Não            |
| Explosão emoji | 2s      | Overlay   | 12 emojis em direções aleatórias (CSS)  | Não            |
| Flash elétrico | 1s      | Background| Fundo pulsa: transparente→amarelo→transp| Não            |
| Onda (ripple)  | 2.5s    | Canvas    | círculo SVG expandindo + fade out       | Não            |
| Arco-íris      | 2s      | Background| hue-rotate animado no fundo             | Não            |
| Estrelas       | 4s      | Overlay   | 20 estrelas em órbita ao redor do emoji | Não            |
| Fogos          | 5s      | Canvas    | Partículas em arco com gravidade (JS)   | Sim (toque)    |
| Vórtice        | 3s      | Transform | rotate + scale no emoji central         | Não            |
| Pulso          | 1.5s    | Transform | scale: 1 → 3 → 1 em 3 ciclos           | Não            |
| Portal         | 3s      | Canvas    | Círculo expandindo + raios radiais      | Não            |
| Notas musicais | 3s      | Overlay   | 10 notas flutuando para cima            | Não            |
| Estouro        | 2s      | Overlay   | Flash vermelho + translate(shake)       | Não            |
| Supernova      | 3s      | Overlay   | Flash branco total + fade escuro        | Não            |
| Big Bang       | 6s      | Canvas    | Expansão de pontos de luz com physics   | Sim (toque)    |
| Grande Explosão| 10s     | Canvas    | Sequência de todas as anteriores        | Sim (toque)    |

---

## Persistência de Dados

O jogo deve salvar e verificar estado nos seguintes momentos:

### Ao abrir o app

```
1. Carregar estado salvo (localStorage / storage API)
2. Calcular quantos dias se passaram desde last_study_date
3. Para cada dia não estudado: aplicar penalidade de HP
4. Se HP chegou a 0: marcar hibernating = true
5. Verificar se hoje já foi estudado (para evitar dupla contagem)
6. Renderizar estado atual
```

### Ao registrar sessão de estudo

```
1. Verificar se já estudou hoje (last_study_date === hoje)
2. Se não estudou: calcular XP da sessão (duração × multiplicador de streak)
3. Incrementar streak se estudou ontem; zerar se gap > 1 dia
4. Aplicar bônus passivos do nível atual
5. Somar XP
6. Verificar se XP ultrapassou threshold do próximo nível
7. Se sim: disparar animação de level up + atualizar nível
8. Atualizar HP (adicionar recuperação)
9. Salvar estado
```

### Schema de persistência

```json
{
  "version": "1.0",
  "player": {
    "xp": 0,
    "level": 1,
    "hp": 60,
    "hp_max": 60,
    "streak": 0,
    "streak_max": 0,
    "last_study_date": "YYYY-MM-DD",
    "total_study_days": 0,
    "total_sessions": 0,
    "hibernations": 0,
    "hibernating": false,
    "pet_name": null,
    "created_at": "YYYY-MM-DD",
    "sessions_log": [
      {
        "date": "YYYY-MM-DD",
        "duration_minutes": 45,
        "xp_earned": 45,
        "notes": "Estudei cálculo"
      }
    ]
  }
}
```

---

## Notificações e Alertas

| Situação                       | Mensagem                                                          | Prioridade |
|-------------------------------|-------------------------------------------------------------------|------------|
| HP < 30                       | *"Ei! Seu bicho está ficando triste. Estuda um pouquinho hoje."* | Alta       |
| HP < 15                       | *"URGENTE: [Nome] está em estado crítico! 😵"*                   | Urgente    |
| HP = 0 (hibernação)           | *"[Nome] hibernou... Volte para resgatá-lo."*                    | Urgente    |
| Streak de 7 dias              | *"🔥 7 dias seguidos! Seu bicho está em chamas!"*                 | Média      |
| Streak de 30 dias             | *"🏆 30 dias! Você é lendário. Seu bicho ganhou +200 XP."*        | Alta       |
| Nível desbloqueado            | *"✨ Nível [X] atingido! [Nome] evoluiu para [forma]!"*           | Alta       |
| Primeiro estudo do dia        | *"Bom dia! [Nome] acorda animado te esperando 😊"*               | Baixa      |
| Meta semanal batida           | *"🏆 Semana completa! +100 XP bônus conquistados."*              | Média      |

---

## Filosofia de Design

**Punição sem crueldade.** O bicho nunca perde XP — só HP. Dias sem estudar machucam a vida do bicho, mas não apagam o progresso conquistado. Isso evita a sensação de "perder tudo" e mantém a motivação mesmo após pausas.

**Recompensa proporcional.** Quem estuda muito por pouco tempo recebe menos que quem estuda moderado por muito tempo. Consistência vale mais que intensidade isolada.

**Personalidade evolutiva.** Cada forma tem uma voz, uma atitude, uma personalidade que cresce com o jogador. O bicho não é apenas um indicador de progresso — é um parceiro de jornada com história.

**Animações como marco emocional.** A animação de level up não é decoração — é o momento em que o progresso invisível se torna visível e celebrado. Ela deve durar o suficiente para ser sentida, mas não tanto para incomodar.

**Dificuldade crescente real.** Os primeiros níveis sobem rápido para criar o hábito. Os últimos exigem meses de dedicação genuína. Não existe atalho para o nível 30.

---

*Documento gerado para a especificação completa do Tamagotchi de Estudos.*
*Versão 1.0 — 30 níveis, sistema de HP/XP, animações detalhadas.*

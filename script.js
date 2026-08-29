const stage=document.querySelector("#stage");
const viewport=document.querySelector("#viewport");
const footer=document.querySelector("#footer");

let protagonist="ALEX"; // "ALEX" | "EDUARDO"

// --- SISTEMA DE ÁUDIO (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(
  frequency = 440,
  duration = 0.05,
  type = "sine",
  targetVolume = 0.05
) {
  if (muted) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.00001,
    audioCtx.currentTime + duration
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

const sounds = {
  click: () => playBeep(600, 0.04, "triangle", 0.03),
  advance: () => playBeep(800, 0.06, "sine", 0.04),

  alert: () => {
    playBeep(220, 0.12, "sawtooth", 0.06);
    setTimeout(
      () => playBeep(180, 0.15, "sawtooth", 0.06),
      80
    );
  },

  typewriter: () => playBeep(1200, 0.02, "square", 0.015)
};

// --- ARQUIVOS DE ÁUDIO ---
const somRua = new Audio("./crowd-street.mp3");
somRua.loop = true;
somRua.volume = 0.25;
somRua.preload = "auto";

const somRachadura = new Audio("./dry-crack.mp3");
somRachadura.preload = "auto";

const somRising = new Audio("./rising.mp3");
somRising.preload = "auto";

const somTitle = new Audio("./title.mp3");
somTitle.preload = "auto";

function tocarRua() {
  if (muted) return;

  somRua.currentTime = 0;

  somRua.play().catch(error => {
    console.warn("Falha ao tocar som da rua:", error);
  });
}

function pararSomRua() {
  somRua.pause();
  somRua.currentTime = 0;
}

function tocarRachadura() {
  if (muted) return;

  somRachadura.currentTime = 0;

  somRachadura.play().catch(error => {
    console.warn("Falha ao tocar a rachadura:", error);
  });
}

function tocarRising() {
  if (muted) return;

  somRising.currentTime = 0;

  somRising.play().catch(error => {
    console.warn("Falha ao tocar o som de subida:", error);
  });
}

function tocarTitle() {
  if (muted) return;

  somTitle.currentTime = 0;

  somTitle.play().catch(error => {
    console.warn("Falha ao tocar o som do título:", error);
  });
}

// Estados da cena Visual Novel
let dialogueStep = 0;
let typingTimer = null;
let isTyping = false;
let currentFullText = "";

const alexDialogue = [
  {
    sender: "LIDERANÇA // CHAT INTERNO",
    text: "Alex, preciso do relatório de margem de cartões fechado até as 08h. O Eduardo vai apresentar na reunião das 09h.",
    type: "message"
  },
  {
    sender: "SISTEMA // ALERTA",
    text: "Os números não contam a mesma história. O relatório que será apresentado amanhã contém informações divergentes.",
    type: "system"
  },
  {
    sender: "ALEX // PONDERAÇÃO",
    text: "Posso corrigir os números e entregar o relatório a tempo. Mas, se eu não entender a causa do problema, alguém pode tomar uma decisão errada amanhã.",
    type: "thought"
  }
];

const eduardoDialogue = [
  {
    sender: "CONSELHO // MENSAGEM DIRETA",
    text: "Eduardo, a reunião com os acionistas começa em 30 minutos. Precisamos do seu parecer sobre a queda da margem de cartões.",
    type: "message"
  },
  {
    sender: "SISTEMA EXECUTIVO // ALERTA",
    text: "O relatório que sustentará a reunião de hoje ainda não foi liberado.",
    type: "system"
  },
  {
    sender: "EDUARDO // PONDERAÇÃO",
    text: "Preciso de respostas antes da reunião. Mas, se os números estiverem errados, o problema não termina hoje. Ele apenas fica escondido.",
    type: "thought"
  }
];

const choicesByCharacter = {
  ALEX: [
    {
      key: "A",
      title: "Corrigir e entregar",
      detail: "Altera os valores diretamente para cumprir o prazo de amanhã."
    },
    {
      key: "B",
      title: "Investigar a origem",
      detail: "Busca a causa raiz do erro, mesmo com alto risco de atrasar a entrega."
    },
    {
      key: "C",
      title: "Pedir apoio",
      detail: "Avisa a liderança e compartilha a responsabilidade antes de mexer nos dados."
    }
  ],

  EDUARDO: [
    {
      key: "A",
      title: "Pressionar a entrega",
      detail: "Exige os números prontos para a reunião das 09h sem aceitar desculpas."
    },
    {
      key: "B",
      title: "Solicitar auditoria",
      detail: "Manda congelar o relatório e manda a engenharia auditando a origem."
    },
    {
      key: "C",
      title: "Adiar a decisão",
      detail: "Ganha tempo com o conselho para entender a inconsistência com calma."
    }
  ]
};

const consequencesByCharacter = {
  ALEX: {
    A: {
      headline: "O prazo foi cumprido.",
      base: "Alex corrige os totais diretamente e entrega o relatório a tempo.",
      top: "Eduardo entra na reunião com números aparentemente coerentes.",
      impacts: [
        ["Prazo", "↑"],
        ["Governança", "↓"],
        ["Confiança", "↓"],
        ["Risco Futuro", "↑"]
      ]
    },

    B: {
      headline: "A entrega atrasou.",
      base: "A origem do problema foi encontrada e evitou um reprocessamento crítico.",
      top: "Eduardo entra na reunião sem o número fechado, mas descobre uma brecha operacional.",
      impacts: [
        ["Prazo", "↓"],
        ["Governança", "↑"],
        ["Conhecimento", "↑"],
        ["Pressão", "↑"]
      ]
    },

    C: {
      headline: "A responsabilidade foi compartilhada.",
      base: "Alex aciona a liderança e recusa-se a alterar a base sem autorização.",
      top: "A decisão subiu na hierarquia e mobilizou a gestão para explicar os dados.",
      impacts: [
        ["Colaboração", "↑"],
        ["Transparência", "↑"],
        ["Autonomia", "↓"],
        ["Prazo", "↓"]
      ]
    }
  },

  EDUARDO: {
    A: {
      headline: "O relatório chegou no prazo.",
      base: "Na ponta, a operação é obrigada a maquiar divergências para cumprir ordens do topo.",
      top: "Eduardo apresenta o resultado aos investidores, ignorando o risco técnico embutido.",
      impacts: [
        ["Prazo", "↑"],
        ["Governança", "↓"],
        ["Confiança", "↓"],
        ["Risco Futuro", "↑"]
      ]
    },

    B: {
      headline: "A reunião foi remarcada.",
      base: "A engenharia recebe ordem direta para auditar cada camada até achar a falha original.",
      top: "Eduardo assume o desgaste com os acionistas, mas garante total governança nos dados.",
      impacts: [
        ["Prazo", "↓"],
        ["Governança", "↑"],
        ["Conhecimento", "↑"],
        ["Pressão", "↑"]
      ]
    },

    C: {
      headline: "O tempo foi comprado.",
      base: "A equipe ganha margem para revisar os scripts sem o peso imediato da reunião.",
      top: "Eduardo adia a definição estratégica, transmitindo cautela (ou hesitação) ao conselho.",
      impacts: [
        ["Colaboração", "↑"],
        ["Transparência", "↑"],
        ["Autonomia", "↓"],
        ["Prazo", "↓"]
      ]
    }
  }
};

const labels = [
  "Ativação",
  "Abertura",
  "Menu",
  "A história",
  "Ponto de vista",
  "O mundo",
  "Uma pergunta no topo",
  "O incidente",
  "A escolha",
  "Consequência",
  "Como funciona",
  "Sobre o autor",
  "Encerramento"
];

const menuItems = [
  {
    label: "A HISTÓRIA",
    detail: "Dois extremos. Uma história em comum.",
    target: 3
  },
  {
    label: "PONTO DE VISTA",
    detail: "Escolha qual perspectiva acompanhar.",
    target: 4
  },
  {
    label: "O MUNDO",
    detail: "Uma organização em transformação.",
    target: 5
  },
  {
    label: "UMA PERGUNTA NO TOPO",
    detail: "O início da cadeia de decisões.",
    target: 6
  },
  {
    label: "O INCIDENTE",
    detail: "Quando o problema exige uma resposta.",
    target: 7
  },
  {
    label: "SOBRE O CRIADOR",
    detail: "Arquivo do criador.",
    target: 11
  }
];

// Posições narrativas alinhadas aos andares reais da torre NovaBank.
const hierarchyLevels = [
  {
    step: "01",
    floor: "24",
    position: "6%",
    text: "EDUARDO // PRESIDÊNCIA"
  },
  {
    step: "02",
    floor: "18",
    position: "29%",
    text: "DIRETORIA"
  },
  {
    step: "03",
    floor: "12",
    position: "52%",
    text: "GERÊNCIA"
  },
  {
    step: "04",
    floor: "06",
    position: "75%",
    text: "LIDERANÇA TÉCNICA"
  },
  {
    step: "05",
    floor: "01",
    position: "94%",
    text: "ALEX // ENGENHARIA DE DADOS"
  }
];

const openingIds = [
  "car-pass",
  "secondary-car-pass",
  "opening-zoom-translate",
  "opening-zoom-in",
  "camera-rise",
  "wide-person-left-near",
  "wide-person-left-far",
  "wide-person-right-far",
  "wide-person-right-near",
  "novabank-name-flicker-target",
  "novabank-sign-light",
  "novabank-sign-crack",
  "sky-evening-transition",
  "sky-night-overlay",
  "building-dark-overlay",
  "windows-middle-lit",
  "windows-lit",
  "window-sequence-01",
  "window-sequence-02",
  "window-sequence-03",
  "window-sequence-final",
  "window-final-glow"
];

const openingTimeline = {
  traffic: 0,
  people: 80,
  streetLead: 80,
  zoom:1250,
  sign: 3600,
  rise: 4100,
  light01: 13650,
  light02: 15150,
  light03: 16650,
  finalLight: 19300,
  title: 22050,
  complete: 22350
};

let screen = 0;
let menuSelected = 0;
let selected = 1;
let decision = "B";
let muted = false;
let openingReady = false;
let openingTimers = [];
let openingAnimations = [];
let openingSmil = [];
let openingLoadToken = 0;

const eye = text => `<p class="eye">${text}</p>`;

const templates = {
  start: () => `
    <button class="start-screen" aria-label="Iniciar Data Valley">
      <span>DATA VALLEY // SISTEMA EM ESPERA</span>
      <strong>PRESSIONE ENTER</strong>
      <small>PRESS ANY KEY · PRESS START</small>
    </button>
  `,

  opening: () => `
    <div
      class="cinematic-opening"
      data-opening-ready="false"
      data-opening-playing="false"
      data-opening-fault="none"
      data-opening-phase="loading"
    >
      <div class="opening-camera">
        <div
          id="opening-art"
          class="opening-art"
          role="img"
          aria-label="A câmera se aproxima do letreiro NovaBank e sobe pela fachada até o céu"
        ></div>
      </div>

      <div class="opening-vignette"></div>

      <div class="opening-system">
        <span>NOVABANK</span>
        <i></i>
        <span data-opening-status>CARREGANDO FACHADA</span>
      </div>

      <div class="opening-title">
        ${eye("SISTEMA NARRATIVO // ONLINE")}
        <h2 class="massive">DATA VALLEY</h2>

        <p class="opening">
          Eu poderia começar explicando o que é uma narrativa interativa.<br>
          <strong>Mas prefiro mostrar como ela funciona.</strong>
        </p>
      </div>

      <button class="opening-skip" disabled>
        ENTER · ACESSAR MENU
      </button>
    </div>
  `,

  menu: () => `
    <div class="menu">
      <div class="brand">
        <p>NOVABANK / ÍNDICE NARRATIVO</p>

        <h1>
          DATA<br>
          <span>VALLEY</span>
        </h1>

        <em>Toda decisão percorre o banco.</em>
      </div>

      <nav>
        ${menuItems.map((item, index) => `
          <button
            data-target="${item.target}"
            class="${menuSelected === index ? "primary" : ""}"
          >
            <b>${menuSelected === index ? "▶" : "·"}</b>

            <span>
              ${item.label}
              <small>${item.detail}</small>
            </span>
          </button>
        `).join("")}

        <p>↑ ↓ NAVEGAR · ENTER INICIAR CAPÍTULO</p>
      </nav>
    </div>
  `,

  story: () => `
    <div class="story">
      ${eye("01 // A HISTÓRIA")}

      <h2>
        DOIS EXTREMOS.<br>
        <span>UMA HISTÓRIA EM COMUM.</span>
      </h2>

      <p class="logline">
        Na NovaBank recém-adquirida,
        <strong>Alex Rocha</strong> tenta conquistar seu primeiro emprego
        na base da organização, enquanto <strong>Eduardo</strong>
        arrisca tudo para reconstruí-la do topo.
      </p>

      <div class="story-axis">
        <article>
          <small>BASE // PRIMEIRO EMPREGO</small>
          <b>ALEX</b>
          <p>Precisa provar que está pronto para crescer.</p>
        </article>

        <i><span>SEM SE CONHECEREM</span></i>

        <article>
          <small>TOPO // MAIOR APOSTA</small>
          <b>EDUARDO</b>
          <p>Precisa provar que é capaz de transformar o banco.</p>
        </article>
      </div>

      <blockquote>
        Eles ainda não se conhecem — mas as decisões de um começam
        a transformar a vida do outro.
      </blockquote>
    </div>
  `,

  perspective: () => `
    <div class="perspective-screen">
      ${eye("01.5 // PONTO DE VISTA")}

      <h2>
        QUEM VOCÊ VAI<br>
        <span>ACOMPANHAR?</span>
      </h2>

      <div class="character-select">
        <button
          data-protagonist="ALEX"
          class="${protagonist === "ALEX" ? "selected" : ""}"
        >
          <small>BASE // PRIMEIRO EMPREGO</small>
          <strong>ALEX</strong>

          <p>
            Na base da engenharia, lidando com inconsistências
            técnicas e a pressão do prazo.
          </p>
        </button>

        <button
          data-protagonist="EDUARDO"
          class="${protagonist === "EDUARDO" ? "selected" : ""}"
        >
          <small>TOPO // MAIOR APOSTA</small>
          <strong>EDUARDO</strong>

          <p>
            No topo da presidência, cobrando clareza nos resultados
            antes da reunião das 09h.
          </p>
        </button>
      </div>

      <p class="select-hint">
        ↑ ↓ SELECIONAR · ENTER CONFIRMAR PROTAGONISTA
      </p>
    </div>
  `,

  world: () => `
    <div class="editorial world">
      <div>
        ${eye("02 // O MUNDO")}

        <h2>
          A NOVABANK.<br>
          <span>UMA ORGANIZAÇÃO EM TRANSFORMAÇÃO.</span>
        </h2>
      </div>

      <div class="premise">
        <div>
          <strong>MUDOU DE MÃOS</strong>

          <p>
            Recém-adquirida, pressionada por resultados e obrigada
            a se modernizar para provar que ainda tem futuro.
          </p>
        </div>

        <blockquote>
          Entre a presidência e a operação existem dezenas de áreas,
          centenas de profissionais e milhares de decisões.
        </blockquote>
      </div>
    </div>
  `,

  question: () => `
    <div class="hierarchy hierarchy-building-view">
      <div class="order">
        ${eye("03 // UMA PERGUNTA NO TOPO")}

        <blockquote>
          “Quero saber por que a margem dos cartões caiu.<br>
          <strong>A reunião é amanhã, às nove.</strong>”
        </blockquote>

        <p>
          Eduardo ainda não sabe quem precisará encontrar a resposta.
        </p>
      </div>

      <div class="flow-container">
        <div
          id="hierarchy-building"
          class="building-bg-silhouette"
          aria-hidden="true"
        ></div>

        <div class="flow-spine" aria-hidden="true"></div>

        <div class="flow">
          ${hierarchyLevels.map(level => `
            <div
              class="level l${Number(level.step) - 1}"
              data-floor="${level.floor}"
              style="--floor-y:${level.position}"
            >
              <span>${level.step}</span>
              <b>${level.text}</b>
              <small>ANDAR ${level.floor}</small>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `,

  incident: () => {
    const isAlex = protagonist === "ALEX";
    const activeDialogue = isAlex ? alexDialogue : eduardoDialogue;
    const current = activeDialogue[dialogueStep];
    const isLastStep = dialogueStep === activeDialogue.length - 1;

    let viewStateAttr = "";

    if (isAlex) {
      viewStateAttr = dialogueStep === 0
        ? 'data-alex-view="closed"'
        : 'data-alex-view="fullscreen"';
    } else {
      viewStateAttr = dialogueStep === 0
        ? 'data-eduardo-view="closed"'
        : 'data-eduardo-view="fullscreen"';
    }

    return `
      <div class="vn-scene" ${viewStateAttr}>
        <div class="vn-environment">
          <div id="vn-svg-container" class="vn-art-container"></div>
        </div>

        <div class="vn-dialogue-box ${current.type}">
          <div class="vn-sender">${current.sender}</div>

          <p class="vn-text" id="vn-dialogue-text"></p>

          <div class="vn-controls">
            <small>
              PASSO ${dialogueStep + 1} DE ${activeDialogue.length}
            </small>

            <button data-vn-next class="vn-btn">
              ${isLastStep
                ? "IR PARA A ESCOLHA →"
                : "AVANÇAR [ESPAÇO] →"}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  choice: () => {
    const currentChoices = choicesByCharacter[protagonist];
    const isAlex = protagonist === "ALEX";

    return `
      <div class="decision">
        <div class="incident">
          ${eye("05 // A ESCOLHA")}

          <h2>
            ${isAlex
              ? "ALEX PRECISA<br>DECIDIR AGORA."
              : "EDUARDO PRECISA<br>DEFINIR A ORDEM."}
          </h2>

          <p>
            Não há uma resposta sem custo. Cada caminho protege alguma
            coisa — e coloca outra em risco.
          </p>
        </div>

        <div class="choice">
          <h3>
            O que ${isAlex ? "Alex" : "Eduardo"} deve fazer?
          </h3>

          ${currentChoices.map((choice, index) => `
            <button
              data-choice="${index}"
              class="${selected === index ? "selected" : ""}"
            >
              <b>${choice.key}</b>

              <span>
                <strong>${choice.title}</strong>
                <small>${choice.detail}</small>
              </span>
            </button>
          `).join("")}

          <p>↑ ↓ NAVEGAR · ENTER CONFIRMAR</p>
        </div>
      </div>
    `;
  },

  result: () => {
    const currentChoices = choicesByCharacter[protagonist];
    const key = currentChoices[selected]?.key || "B";
    const result = consequencesByCharacter[protagonist][key];

    const impactsHtml = result.impacts
      ? `
        <div
          style="
            margin-top:24px;
            border-top:1px solid var(--line);
            padding-top:16px;
          "
        >
          <span
            style="
              font:700 10px ui-monospace,monospace;
              color:var(--muted);
              letter-spacing:.14em;
              display:block;
              margin-bottom:12px;
            "
          >
            IMPACTOS SISTÊMICOS
          </span>

          <div
            style="
              display:grid;
              grid-template-columns:repeat(2,1fr);
              gap:8px;
              font:700 12px ui-monospace,monospace;
            "
          >
            ${result.impacts.map(([metric, trend]) => `
              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  background:rgba(16,27,30,.65);
                  padding:8px 12px;
                  border:1px solid var(--line);
                "
              >
                <span style="color:var(--muted)">
                  ${metric}
                </span>

                <span
                  style="
                    color:${trend === "↑"
                      ? "var(--cyan)"
                      : "var(--red)"};
                  "
                >
                  ${trend}
                </span>
              </div>
            `).join("")}
          </div>
        </div>
      `
      : "";

    return `
      <div class="consequences narrative-result">
        <div class="result-title">
          <div>
            ${eye("06 // CONSEQUÊNCIA")}
            <h2>${result.headline}</h2>
          </div>

          <p>
            PROTAGONISTA: ${protagonist} | DECISÃO ${key}
          </p>
        </div>

        <div class="consequence-path">
          <article class="at-base">
            <small>NA BASE</small>
            <p>${result.base}</p>
          </article>

          <i>↑</i>

          <article class="at-top">
            <small>NO TOPO</small>
            <p>${result.top}</p>
          </article>
        </div>

        ${impactsHtml}

        <blockquote>
          Não existe apenas uma resposta técnica.<br>
          <strong>Existem consequências humanas.</strong>
        </blockquote>
      </div>
    `;
  },

  how: () => `
    <div class="how narrative-how">
      ${eye("07 // COMO FUNCIONA")}

      <h2>
        O ESPECTADOR NÃO<br>
        ACOMPANHA APENAS A HISTÓRIA.
      </h2>

      <p class="participates">
        Ele participa das decisões.
      </p>

      <div class="human-loop">
        <span>UMA PESSOA DECIDE</span>
        <i>→</i>
        <strong>OUTRA PESSOA VIVE A CONSEQUÊNCIA</strong>
      </div>

      <p>
        Algumas escolhas nascem de conflitos humanos. Outras envolvem
        situações reais de dados, tecnologia e negócios. Todas alteram
        a narrativa.
      </p>
    </div>
  `,

  creator: () => `
    <div class="creator">
      <div>
        ${eye("08 // ARQUIVO DO CRIADOR")}

        <h2>
          LEANDRO<br>
          <span>ESVAEL</span>
        </h2>
      </div>

      <div class="file">
        <p>ENGENHEIRO</p>
        <p>PROFISSIONAL DE DADOS</p>
        <p>+ DE UMA DÉCADA NO SETOR FINANCEIRO</p>
        <p>BANCOS · NEGÓCIOS · METAS · TECNOLOGIA</p>

        <blockquote>
          “O Data Valley nasce do encontro entre aquilo que a tecnologia
          promete, aquilo que os negócios exigem e aquilo que as pessoas
          realmente vivem dentro das organizações.”
        </blockquote>
      </div>
    </div>
  `,

  ending: () => `
    <div class="ending">
      <div class="axis">
        <span>
          ALEX<br>
          <small>BASE</small>
        </span>

        <i></i>

        <span>
          EDUARDO<br>
          <small>TOP</small>
        </span>
      </div>

      ${eye("DATA VALLEY")}

      <h2>
        TODA DECISÃO<br>
        <span>PERCORRE O BANCO.</span>
      </h2>

      <p>
        Você vivenciou esta história pelo ponto de vista de
        <strong>${protagonist}</strong>.<br>

        Experimente jogar no papel de
        <strong>
          ${protagonist === "ALEX" ? "EDUARDO" : "ALEX"}
        </strong>
        para descobrir o outro lado da mesma decisão.
      </p>

      <button data-menu>↻ VOLTAR AO MENU</button>
    </div>
  `
};

const views = [
  templates.start,
  templates.opening,
  templates.menu,
  templates.story,
  templates.perspective,
  templates.world,
  templates.question,
  templates.incident,
  templates.choice,
  templates.result,
  templates.how,
  templates.creator,
  templates.ending
];

function stopOpening() {
  openingLoadToken += 1;

  openingTimers.forEach(clearTimeout);
  openingTimers = [];

  openingAnimations.forEach(animation => animation.cancel());
  openingAnimations = [];

  openingSmil.forEach(animation => animation.endElement?.());
  openingSmil = [];

  pararSomRua();

  somRising.pause();
  somRising.currentTime = 0;
}

function stopTypewriter() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }

  isTyping = false;
}

function startTypewriter() {
  stopTypewriter();

  const textEl = document.getElementById("vn-dialogue-text");
  if (!textEl) return;

  const activeDialogue = protagonist === "ALEX"
    ? alexDialogue
    : eduardoDialogue;

  const current = activeDialogue[dialogueStep];

  currentFullText = current.text;
  textEl.textContent = "";
  isTyping = true;

  let index = 0;

  typingTimer = setInterval(() => {
    textEl.textContent += currentFullText.charAt(index);
    sounds.typewriter();

    index++;

    if (index >= currentFullText.length) {
      clearInterval(typingTimer);
      typingTimer = null;
      isTyping = false;
    }
  }, 25);
}

function advanceDialogue() {
  sounds.advance();

  if (isTyping) {
    stopTypewriter();

    const activeDialogue = protagonist === "ALEX"
      ? alexDialogue
      : eduardoDialogue;

    document.getElementById("vn-dialogue-text").textContent =
      activeDialogue[dialogueStep].text;

    return;
  }

  const activeDialogue = protagonist === "ALEX"
    ? alexDialogue
    : eduardoDialogue;

  if (dialogueStep < activeDialogue.length - 1) {
    dialogueStep++;
    render();
  } else {
    dialogueStep = 0;
    next();
  }
}

async function loadIncidentSvg() {
  if (screen !== 7) return;

  const container = document.getElementById("vn-svg-container");
  if (!container) return;

  const svgFile = protagonist === "ALEX"
    ? "alex-pondering.svg"
    : "eduardo-pondering.svg";

  try {
    const response = await fetch(`./${svgFile}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const source = await response.text();

    const parsed = new DOMParser().parseFromString(
      source,
      "image/svg+xml"
    );

    if (parsed.querySelector("parsererror")) {
      throw new Error("SVG inválido");
    }

    const svg = document.importNode(
      parsed.documentElement,
      true
    );

    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute(
      "preserveAspectRatio",
      "xMidYMid slice"
    );

    svg.classList.add(
      `vn-art-${protagonist.toLowerCase()}`
    );

    container.replaceChildren(svg);
  } catch (error) {
    console.error(
      "Falha ao carregar SVG do incidente:",
      error
    );
  }
}

async function loadHierarchyBuilding() {
  if (screen !== 6) return;

  const host = document.getElementById(
    "hierarchy-building"
  );

  if (!host) return;

  try {
    const response = await fetch(
      "./novabank-opening.svg",
      {
        cache: "force-cache"
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const source = await response.text();

    const parsed = new DOMParser().parseFromString(
      source,
      "image/svg+xml"
    );

    if (parsed.querySelector("parsererror")) {
      throw new Error("SVG inválido");
    }

    const building = parsed.querySelector(
      "#building-main"
    );

    if (!building) {
      throw new Error(
        "Camada #building-main ausente"
      );
    }

    const namespace = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(
      namespace,
      "svg"
    );

    svg.setAttribute(
      "viewBox",
      "70 -118 500 994"
    );

    svg.setAttribute(
      "preserveAspectRatio",
      "xMidYMid meet"
    );

    svg.setAttribute(
      "focusable",
      "false"
    );

    svg.classList.add(
      "hierarchy-building-svg"
    );

    const sourceStyle = parsed.querySelector(
      "svg > style"
    );

    const sourceDefs = parsed.querySelector(
      "svg > defs"
    );

    if (sourceStyle) {
      svg.appendChild(
        document.importNode(sourceStyle, true)
      );
    }

    if (sourceDefs) {
      svg.appendChild(
        document.importNode(sourceDefs, true)
      );
    }

    svg.appendChild(
      document.importNode(building, true)
    );

    // Usa somente a arte estática da torre.
    svg.querySelectorAll(
      "animate, animateTransform, animateMotion, set"
    ).forEach(node => node.remove());

    host.replaceChildren(svg);
  } catch (error) {
    console.warn(
      "NovaBank: silhueta da hierarquia indisponível",
      error
    );

    host.dataset.buildingFault = "true";
  }
}

function render() {
  stopTypewriter();

  stage.className = `stage s${screen}`;
  viewport.innerHTML = views[screen]();

  renderFooter();
  bind();

  if (screen === 6) {
    loadHierarchyBuilding();
  }

  if (screen === 7) {
    loadIncidentSvg();
    startTypewriter();

    if (dialogueStep === 0) {
      sounds.alert();
    }
  }
}

function renderFooter() {
  footer.hidden = screen <= 2;

  if (footer.hidden) return;

  const enterActionAttr = screen === 7
    ? "data-vn-footer-next"
    : "data-next";

  footer.innerHTML = `
    <button data-menu>← MENU</button>

    <div class="progress">
      ${Array.from(
        { length: 10 },
        (_, index) => `
          <i class="${index < screen - 2 ? "on" : ""}"></i>
        `
      ).join("")}
    </div>

    <span>${labels[screen]}</span>

    <button data-sound>
      ${muted ? "SOM OFF" : "SOM ON"}
    </button>

    <button data-menu>M MENU</button>

    <button ${enterActionAttr}>
      ENTER AVANÇAR →
    </button>
  `;
}

function bind() {
  viewport
    .querySelector(".start-screen")
    ?.addEventListener("click", () => {
      sounds.advance();
      setScreen(1);
    });

  const menuButtons = viewport.querySelectorAll(
    ".menu nav button"
  );

  menuButtons.forEach((button, index) => {
    button.addEventListener("mouseenter", () => {
      menuSelected = index;

      menuButtons.forEach((currentButton, currentIndex) => {
        const isSelected = currentIndex === menuSelected;

        currentButton.classList.toggle(
          "primary",
          isSelected
        );

        const indicator = currentButton.querySelector("b");

        if (indicator) {
          indicator.textContent = isSelected ? "▶" : "·";
        }
      });
    });

    button.addEventListener("click", () => {
      sounds.click();
      setScreen(Number(button.dataset.target));
    });
  });

  viewport
    .querySelectorAll("[data-protagonist]")
    .forEach(button => {
      button.addEventListener("click", () => {
        sounds.click();

        protagonist = button.dataset.protagonist;
        dialogueStep = 0;

        render();
      });
    });

  viewport
    .querySelectorAll("[data-choice]")
    .forEach(button => {
      button.addEventListener("click", () => {
        sounds.click();

        selected = Number(button.dataset.choice);

        render();
      });
    });

  document
    .querySelectorAll("[data-menu]")
    .forEach(button => {
      button.addEventListener("click", () => {
        sounds.click();
        goMenu();
      });
    });

  document
    .querySelectorAll("[data-next]")
    .forEach(button => {
      button.addEventListener("click", () => {
        sounds.advance();
        next();
      });
    });

  document
    .querySelectorAll("[data-vn-footer-next]")
    .forEach(button => {
      button.addEventListener(
        "click",
        advanceDialogue
      );
    });

  footer
    .querySelector("[data-sound]")
    ?.addEventListener("click", () => {
      muted = !muted;

      if (muted) {
        pararSomRua();

        somRising.pause();
        somTitle.pause();
        somRachadura.pause();
      } else {
        sounds.click();
      }

      renderFooter();
      bind();
    });

  viewport
    .querySelector("[data-vn-next]")
    ?.addEventListener(
      "click",
      advanceDialogue
    );

  if (screen === 1) {
    startOpening();
  }
}

function setScreen(value) {
  if (screen === 1 && value !== 1) {
    stopOpening();
  }

  screen = value;

  if (screen !== 1) {
    openingReady = false;
  }

  render();
}

function goMenu() {
  dialogueStep = 0;
  setScreen(2);
}

function back() {
  if (screen === 7) {
    dialogueStep = 0;
  }

  if (screen > 2) {
    goMenu();
  } else {
    setScreen(Math.max(0, screen - 1));
  }
}

function next() {
  if (screen === 1) {
    if (openingReady) {
      goMenu();
    }

    return;
  }

  if (screen === 8) {
    decision =
      choicesByCharacter[protagonist][selected].key;
  }

  if (screen === 12) {
    goMenu();
    return;
  }

  setScreen(Math.min(12, screen + 1));
}

async function loadOpeningSvg(host) {
  const response = await fetch(
    "./novabank-opening.svg",
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `SVG HTTP ${response.status}`
    );
  }

  const source = await response.text();

  const parsed = new DOMParser().parseFromString(
    source,
    "image/svg+xml"
  );

  if (
    parsed.querySelector("parsererror") ||
    parsed.documentElement.localName !== "svg"
  ) {
    throw new Error("SVG inválido");
  }

  const svg = document.importNode(
    parsed.documentElement,
    true
  );

  svg.removeAttribute("width");
  svg.removeAttribute("height");

  svg.classList.add("opening-art-svg");

  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  host.replaceChildren(svg);

  return svg;
}

async function startOpening() {
  stopOpening();

  openingReady = false;

  const loadToken = openingLoadToken;
  const art = document.querySelector("#opening-art");
  const root = document.querySelector(".cinematic-opening");
  const status = document.querySelector(
    "[data-opening-status]"
  );

  const later = (action, delay) => {
    openingTimers.push(
      setTimeout(action, delay)
    );
  };

  root.dataset.openingPhase = "loading";

  try {
    const svg = await loadOpeningSvg(art);

    if (
      loadToken !== openingLoadToken ||
      screen !== 1
    ) {
      return;
    }

    status.textContent = "CONEXÃO ESTABELECIDA";
    root.dataset.openingPlaying = "true";
    root.dataset.openingPhase = "street";

    const get = id => svg.querySelector(`#${id}`);

    const missing = openingIds.filter(
      id => !get(id)
    );

    if (missing.length) {
      console.warn(
        "NovaBank SVG: IDs ausentes",
        missing
      );

      root.dataset.openingFault =
        "camadas-ausentes";

      status.textContent =
        missing.length === 1
          ? "1 CAMADA INDISPONÍVEL"
          : `${missing.length} CAMADAS INDISPONÍVEIS`;
    }

    const phase = value => {
      root.dataset.openingPhase = value;
    };

    const at = (
      delay,
      value,
      action = () => {}
    ) => {
      later(() => {
        phase(value);
        action();
      }, delay);
    };

    const begin = id => {
      const animation = get(id);

      if (animation) {
        openingSmil.push(animation);
      }

      animation?.beginElement?.();
    };

    const animate = (
      id,
      keyframes,
      options
    ) => {
      const element = get(id);

      if (!element) return null;

      const animation = element.animate(
        keyframes,
        options
      );

      if (animation) {
        openingAnimations.push(animation);
      }

      return animation;
    };

    [
      "window-sequence-01",
      "window-sequence-02",
      "window-sequence-03",
      "window-sequence-final",
      "window-final-glow",
      "novabank-sign-crack"
    ].forEach(id => {
      const element = get(id);

      if (element) {
        element.style.opacity = "0";
      }
    });

    [
      "opening-zoom-translate",
      "opening-zoom-in"
    ].forEach(id => {
      get(id)?.setAttribute("dur", "2.5s");
    });

    get("camera-rise")?.setAttribute(
      "keyTimes",
      "0;0.01;0.94;1"
    );

    at(
      openingTimeline.traffic,
      "street-motion",
      () => {
        begin("car-pass");
        begin("secondary-car-pass");
        tocarRua();
      }
    );

    at(
      openingTimeline.people,
      "street-motion",
      () => {
        [
          "wide-person-left-near",
          "wide-person-left-far",
          "wide-person-right-far",
          "wide-person-right-near"
        ].forEach((id, index) => {
          animate(
            id,
            [
              { transform: "translateX(0)" },
              {
                transform: `translateX(${
                  index < 2 ? 10 : -10
                }px)`
              }
            ],
            {
              duration: 4300,
              fill: "forwards",
              easing: "ease-in-out"
            }
          );
        });
      }
    );

    at(
      openingTimeline.streetLead,
      "street-to-zoom"
    );

    at(
      openingTimeline.zoom,
      "zoom",
      () => {
        begin("opening-zoom-translate");
        begin("opening-zoom-in");
      }
    );

    at(
      openingTimeline.sign,
      "sign",
      () => {
        animate(
          "novabank-name-flicker-target",
          [
            { opacity: 1 },
            { opacity: 0.28 },
            { opacity: 1 },
            { opacity: 0.48 },
            { opacity: 1 }
          ],
          {
            duration: 520,
            easing: "steps(1,end)"
          }
        );

        animate(
          "novabank-sign-light",
          [
            { opacity: 0.14 },
            { opacity: 0.88 },
            { opacity: 0.08 },
            { opacity: 0.7 },
            { opacity: 0.14 }
          ],
          {
            duration: 520,
            easing: "steps(1,end)"
          }
        );

        animate(
          "novabank-sign-crack",
          [
            { opacity: 0 },
            {
              opacity: 0,
              offset: 0.36
            },
            { opacity: 1 }
          ],
          {
            duration: 520,
            fill: "forwards",
            easing: "steps(2,end)"
          }
        );

        later(() => {
          pararSomRua();
          tocarRachadura();
        }, 190);
      }
    );

    at(
      openingTimeline.rise,
      "rise",
      () => {
        begin("camera-rise");
        tocarRising();

        animate(
          "sky-evening-transition",
          [
            { opacity: 0.18 },
            { opacity: 1 }
          ],
          {
            duration: 17800,
            fill: "forwards",
            easing: "ease-in-out"
          }
        );

        animate(
          "sky-night-overlay",
          [
            { opacity: 0 },
            { opacity: 0.12 },
            { opacity: 1 }
          ],
          {
            duration: 18200,
            fill: "forwards",
            easing: "ease-in"
          }
        );

        animate(
          "building-dark-overlay",
          [
            { opacity: 0.32 },
            { opacity: 0.55 },
            { opacity: 1 }
          ],
          {
            duration: 18000,
            fill: "forwards",
            easing: "ease-in"
          }
        );

        animate(
          "windows-middle-lit",
          [
            { opacity: 1 },
            { opacity: 0.65 },
            { opacity: 0 }
          ],
          {
            duration: 15000,
            fill: "forwards",
            easing: "ease-in"
          }
        );

        animate(
          "windows-lit",
          [
            { opacity: 1 },
            { opacity: 0.35 }
          ],
          {
            duration: 16000,
            fill: "forwards",
            easing: "ease-in"
          }
        );
      }
    );

    at(
      openingTimeline.light01,
      "light-01",
      () => {
        animate(
          "window-sequence-01",
          [
            { opacity: 0 },
            {
              opacity: 1,
              offset: 0.22
            },
            {
              opacity: 1,
              offset: 0.7
            },
            { opacity: 0 }
          ],
          {
            duration: 1400,
            fill: "forwards",
            easing: "ease-in-out"
          }
        );
      }
    );

    at(
      openingTimeline.light02,
      "light-02",
      () => {
        animate(
          "window-sequence-02",
          [
            { opacity: 0 },
            {
              opacity: 1,
              offset: 0.22
            },
            {
              opacity: 1,
              offset: 0.7
            },
            { opacity: 0 }
          ],
          {
            duration: 1400,
            fill: "forwards",
            easing: "ease-in-out"
          }
        );
      }
    );

    at(
      openingTimeline.light03,
      "light-03",
      () => {
        animate(
          "window-sequence-03",
          [
            { opacity: 0 },
            {
              opacity: 1,
              offset: 0.22
            },
            {
              opacity: 1,
              offset: 0.7
            },
            { opacity: 0 }
          ],
          {
            duration: 1500,
            fill: "forwards",
            easing: "ease-in-out"
          }
        );
      }
    );

    at(
      openingTimeline.finalLight,
      "final-light",
      () => {
        animate(
          "window-sequence-final",
          [
            { opacity: 0 },
            { opacity: 1 }
          ],
          {
            duration: 800,
            fill: "forwards",
            easing: "ease-out"
          }
        );

        animate(
          "window-final-glow",
          [
            { opacity: 0 },
            {
              opacity: 0.95,
              offset: 0.55
            },
            { opacity: 0.72 }
          ],
          {
            duration: 1400,
            fill: "forwards",
            easing: "ease-out"
          }
        );
      }
    );

    at(
      openingTimeline.title,
      "title-reveal",
      tocarTitle
    );

    at(
      openingTimeline.complete,
      "complete",
      unlockOpening
    );
  } catch (error) {
    if (
      loadToken !== openingLoadToken ||
      screen !== 1
    ) {
      return;
    }

    console.error(
      "NovaBank SVG: falha de carregamento",
      error
    );

    root.dataset.openingFault =
      "svg-nao-carregado";

    root.dataset.openingPlaying = "true";
    root.dataset.openingPhase = "fallback";

    status.textContent =
      "FALHA AO CARREGAR SVG";

    unlockOpening();
  }
}

function unlockOpening() {
  openingReady = true;

  const root = document.querySelector(
    ".cinematic-opening"
  );

  const button = document.querySelector(
    ".opening-skip"
  );

  if (root) {
    root.dataset.openingReady = "true";
  }

  if (button) {
    button.disabled = false;
    button.classList.add("ready");

    button.addEventListener(
      "click",
      goMenu,
      {
        once: true
      }
    );
  }
}

window.addEventListener("keydown", event => {
  if (
    [
      "ArrowDown",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
      " ",
      "Backspace",
      "Escape"
    ].includes(event.key)
  ) {
    event.preventDefault();
  }

  if (screen === 0) {
    sounds.advance();
    setScreen(1);
    return;
  }

  if (
    screen === 7 &&
    (
      event.key === " " ||
      event.key === "Enter"
    )
  ) {
    advanceDialogue();
    return;
  }

  if (
    screen === 2 &&
    (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight"
    )
  ) {
    sounds.click();

    menuSelected =
      (menuSelected + 1) %
      menuItems.length;

    render();
    return;
  }

  if (
    screen === 2 &&
    (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    )
  ) {
    sounds.click();

    menuSelected =
      (
        menuSelected +
        menuItems.length -
        1
      ) %
      menuItems.length;

    render();
    return;
  }

  if (
    screen === 2 &&
    (
      event.key === "Enter" ||
      event.key === " "
    )
  ) {
    sounds.advance();

    setScreen(
      menuItems[menuSelected].target
    );

    return;
  }

  if (
    screen === 4 &&
    (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    )
  ) {
    sounds.click();

    protagonist =
      protagonist === "ALEX"
        ? "EDUARDO"
        : "ALEX";

    dialogueStep = 0;

    render();
    return;
  }

  if (
    screen === 8 &&
    (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight"
    )
  ) {
    sounds.click();

    selected =
      (selected + 1) %
      choicesByCharacter[protagonist].length;

    render();
    return;
  }

  if (
    screen === 8 &&
    (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    )
  ) {
    sounds.click();

    selected =
      (
        selected +
        choicesByCharacter[protagonist].length -
        1
      ) %
      choicesByCharacter[protagonist].length;

    render();
    return;
  }

  if (
    event.key === "Enter" ||
    event.key === " " ||
    event.key === "ArrowRight"
  ) {
    sounds.advance();
    next();
  }

  if (
    event.key === "Backspace" ||
    event.key === "ArrowLeft"
  ) {
    sounds.click();
    back();
  }

  if (
    event.key === "Escape" ||
    event.key.toLowerCase() === "m"
  ) {
    sounds.click();
    goMenu();
  }

  if (event.key.toLowerCase() === "s") {
    muted = !muted;

    if (muted) {
      pararSomRua();

      somRising.pause();
      somRachadura.pause();
      somTitle.pause();
    } else {
      sounds.click();
    }

    renderFooter();
    bind();
  }
});

render();
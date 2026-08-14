// app.js — Interactive showcase, i18n engine, theme manager, and real-time streaming for Sparkline Mini Charts demo.

import "../src/register.js";

// --- Authentic ThemeRiver Dataset (from Last.fm / ECharts / Byron & Wattenberg) ---

export const THEMERIVER_LASTFM_DATA = Object.freeze([
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 49, 67, 15, 6, 19, 19, 9, 0, 1, 10, 5, 6, 1, 1, 0, 25, 0, 3, 0],
  [0, 6, 1, 34, 0, 16, 1, 0, 3, 1, 5, 6, 1, 56, 0, 7, 0, 7, 6, 0],
  [0, 8, 13, 15, 0, 12, 23, 0, 0, 1, 0, 1, 0, 0, 8, 0, 8, 1, 8, 1],
  [0, 9, 28, 0, 91, 6, 1, 0, 6, 7, 18, 0, 9, 16, 0, 1, 0, 0, 0, 0],
  [0, 3, 42, 36, 21, 5, 1, 0, 0, 0, 16, 30, 1, 4, 62, 55, 1, 5, 0, 0],
  [0, 7, 13, 12, 64, 5, 0, 0, 6, 8, 17, 3, 72, 1, 1, 53, 1, 0, 0, 0],
  [1, 14, 13, 7, 8, 8, 7, 8, 1, 1, 14, 6, 44, 0, 7, 17, 21, 1, 0, 0],
  [0, 6, 14, 2, 14, 1, 0, 0, 3, 0, 2, 2, 7, 15, 6, 3, 0, 0, 0, 0],
  [0, 9, 11, 3, 0, 8, 0, 0, 14, 2, 8, 1, 1, 7, 13, 2, 1, 0, 0, 0],
  [0, 7, 5, 10, 8, 21, 0, 0, 110, 1, 2, 18, 6, 1, 5, 1, 4, 1, 0, 7],
  [0, 2, 15, 1, 5, 5, 0, 0, 0, 0, 4, 1, 3, 1, 17, 8, 0, 9, 0, 0],
  [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [6, 27, 26, 1, 0, 11, 1, 0, 0, 0, 1, 1, 2, 0, 0, 9, 1, 0, 0, 0],
  [31, 81, 11, 8, 11, 0, 0, 0, 0, 0, 8, 3, 2, 8, 3, 14, 6, 8, 12, 0],
  [19, 53, 6, 20, 6, 4, 37, 0, 38, 86, 43, 7, 5, 7, 17, 19, 2, 0, 0, 5],
  [0, 22, 14, 6, 18, 24, 18, 3, 13, 21, 5, 7, 13, 35, 7, 1, 8, 0, 0, 1],
  [0, 58, 5, 0, 0, 8, 0, 7, 24, 8, 17, 7, 0, 8, 3, 0, 8, 8, 0, 0],
  [18, 29, 3, 6, 11, 35, 0, 12, 42, 37, 0, 3, 3, 13, 8, 0, 0, 1, 0, 0],
  [32, 39, 37, 5, 33, 21, 6, 3, 4, 17, 0, 11, 0, 2, 3, 0, 23, 0, 17, 0],
  [72, 15, 28, 0, 0, 8, 0, 1, 3, 0, 35, 0, 9, 17, 1, 9, 1, 8, 8, 0],
  [11, 15, 4, 2, 0, 18, 0, 26, 3, 0, 6, 2, 8, 0, 2, 2, 36, 0, 0, 0],
  [14, 29, 19, 5, 2, 17, 13, 9, 7, 12, 2, 0, 6, 0, 1, 1, 34, 0, 1, 0],
  [1, 1, 7, 6, 1, 1, 15, 1, 1, 2, 1, 3, 1, 1, 9, 1, 1, 25, 1, 72]
]);

// --- i18n Translation Dictionary ---
export const translations = {
  en: {
    tagline: "Native Web Components · SVG · Zero runtime dependencies",
    heroTitle: "Sparkline Mini Charts",
    heroDesc: "Ultra-lightweight, reactive, framework-agnostic micro data visualizations. Drop semantic SVG sparkline tags into any table, dashboard, card, or metric widget.",
    navDocs: "Docs",
    navStreaming: "Live Stream",
    navGallery: "All Charts",
    navPlayground: "Playground",
    navIntegrations: "Frameworks",
    
    // Sidebar groups
    groupGettingStarted: "Getting Started",
    itemOverview: "Overview & Features",
    itemInstallation: "Installation",
    itemQuickStart: "Quick Start",
    groupLiveStream: "Live Real-Time",
    itemStreamingDashboard: "Streaming Dashboard (All 16)",
    groupComponents: "Components Gallery",
    itemAllComponents: "All 16 Primitives",
    groupCartesian: "Continuous & Cartesian",
    groupBarFinancial: "Bar & Financial",
    groupRadialMetrics: "Radial & Metrics",
    groupPlayground: "Interactive Sandbox",
    itemPlayground: "Live Playground",
    groupFrameworks: "Framework Integrations",
    itemFrameworks: "React, Vue, Angular",
    
    // Live Stream section
    streamTitle: "Live Real-Time Streaming (All 16 Charts)",
    streamSubtitle: "Witness smooth SVG path morphing, synchronized point tracking, staggered bar physics, and authentic ThemeRiver organic flows in real time.",
    btnPlay: "▶ Resume Stream",
    btnPause: "⏸ Pause Stream",
    btnStep: "⏭ Single Step",
    btnRandom: "🎲 Randomize",
    speedLabel: "Tick Speed:",
    speedFast: "Fast (0.6s)",
    speedNormal: "Normal (1.2s)",
    speedSlow: "Slow (2.5s)",
    
    streamLineLabel: "Live Market Ticker (10 Ticks)",
    streamAreaLabel: "Server CPU Load (10 Ticks)",
    streamBarLabel: "Network I/O Variance (8 Ticks)",
    streamPieLabel: "Traffic Share Distribution",
    streamHalfPieLabel: "Tier Subscription Split",
    streamRadialLabel: "Multi-Core Utilization (Rings)",
    streamProgressLabel: "Task Completion Arc",
    streamGaugeLabel: "Core Temperature Gauge",
    streamCandleLabel: "Financial Asset Candlesticks (18 Candles)",
    streamOhlcLabel: "Asset OHLC Tick Bars (18 Ticks)",
    streamStackedLabel: "Multi-Channel Resource Flow",
    streamStreamLabel: "Authentic ThemeRiver Organic Flow",
    streamComboLabel: "Volume vs Target Combo",
    streamBulletLabel: "Revenue KPI vs Target (Bullet)",
    streamWinLossLabel: "CI/CD Build History (Win/Loss)",
    streamRangeBarLabel: "52-Week Price Range (Range Bar)",
    streamScatterLabel: "Latency vs Throughput (Scatter)",
    
    // Gallery & Cards
    galleryTitle: "All Chart Primitives",
    gallerySubtitle: "Every component is encapsulated in Shadow DOM, supports custom theme variables, and reacts to attribute updates.",
    
    // Component names & descriptions
    lineTitle: "Line Sparkline",
    lineDesc: "Continuous trend series with smooth Bézier curves, threshold reference lines, and interactive crosshair.",
    areaTitle: "Area Sparkline",
    areaDesc: "Filled region chart with native vertical gradient, curve interpolation, and baseline anchoring.",
    stackedAreaTitle: "Stacked Area",
    stackedAreaDesc: "Cumulative multi-series layers with rotating palette and 100% normalized mode.",
    streamTitleChart: "Streamgraph (ThemeRiver)",
    streamDesc: "Silhouette-centered organic flowing streams with vibrant multi-layer spline contours.",
    barTitle: "Bar Sparkline",
    barDesc: "Discrete bar layout with positive/negative zero baseline, rounded caps, and focus dimming.",
    pieTitle: "Pie & Donut",
    pieDesc: "Full radial distribution with inner-radius cutout for instant donut conversion and hover pop-out.",
    halfPieTitle: "Half-Pie & Half-Donut",
    halfPieDesc: "Upper 180° semi-circle arc for dashboard headers and metric breakdowns.",
    radialBarTitle: "Radial Bar (Activity Rings)",
    radialBarDesc: "Concentric activity rings with custom sweep angles (270°/360°) and round caps.",
    progressTitle: "Progress Arc",
    progressDesc: "Semi-circular meter with elastic bouncy physics, center value display, and completion events.",
    gaugeTitle: "Speedometer Gauge",
    gaugeDesc: "Multi-zone meter with colored threshold bands and animated reactive needle.",
    candleTitle: "Candlestick (OHLC)",
    candleDesc: "Financial asset pricing with hollow/solid bullish styling and high/low wicks.",
    ohlcTitle: "OHLC Tick Bar",
    ohlcDesc: "Clean financial tick layout with open (left) and close (right) wings.",
    comboTitle: "Combo (Bar + Line)",
    comboDesc: "Dual-layer visualization combining background volume bars with a synchronized foreground trend line.",
    bulletTitle: "Bullet Graph (KPI & Target)",
    bulletDesc: "Stephen Few standard for KPI tracking against targets and multi-tier qualitative ranges.",
    winLossTitle: "Win / Loss Sparkline",
    winLossDesc: "Discrete ternary outcomes (+1 win, -1 loss, 0 tie) for build streaks and uptime status.",
    rangeBarTitle: "Range Bar (Min-Max)",
    rangeBarDesc: "Floating interval bars with min-max dispersion and optional current position markers.",
    scatterTitle: "Scatter Sparkline (2D)",
    scatterDesc: "2D coordinate distribution with optional regression trendline and bubble sizing.",


    // Playground
    playgroundTitle: "Interactive Playground",
    playgroundSubtitle: "Experiment with chart attributes, test reactive data updates, and copy ready-to-use HTML/framework code.",
    selectChartType: "Select Component:",
    editDataLabel: "JSON Data Array:",
    editLabelLabel: "Accessible Label (aria-label):",
    btnCopyCode: "📋 Copy Markup",
    btnCopied: "✅ Copied!",
    
    // Integrations
    integrationsTitle: "Framework Integrations",
    integrationsSubtitle: "Standard Web Components work in any environment. Use native Custom Elements directly or via first-class typed wrappers.",
    tabVanilla: "Vanilla / HTML",
    tabReact: "React 18 / 19+",
    tabVue: "Vue 3 (SFC)",
    tabAngular: "Angular 18 / 19 / 20+",
  },
  it: {
    tagline: "Web Components Nativi · SVG · Zero dipendenze runtime",
    heroTitle: "Sparkline Mini Charts",
    heroDesc: "Micro-visualizzazioni dati ultra-leggere, reattive e indipendenti da framework. Inserisci tag SVG semantici in qualsiasi tabella, dashboard, card o widget di metriche.",
    navDocs: "Documentazione",
    navStreaming: "Dati Live",
    navGallery: "Tutti i Grafici",
    navPlayground: "Playground",
    navIntegrations: "Integrazioni",
    
    // Sidebar groups
    groupGettingStarted: "Guida Iniziale",
    itemOverview: "Panoramica & Funzioni",
    itemInstallation: "Installazione",
    itemQuickStart: "Guida Rapida",
    groupLiveStream: "Dati in Tempo Reale",
    itemStreamingDashboard: "Streaming Dashboard (Tutti i 16)",
    groupComponents: "Galleria Componenti",
    itemAllComponents: "Tutti i 16 Grafici",
    groupCartesian: "Continui & Cartesiani",
    groupBarFinancial: "Barre & Finanziari",
    groupRadialMetrics: "Radiali & Metriche",
    groupPlayground: "Sandbox Interattivo",
    itemPlayground: "Playground Live",
    groupFrameworks: "Integrazioni Framework",
    itemFrameworks: "React, Vue, Angular",
    
    // Live Stream section
    streamTitle: "Dashboard Live Streaming (Tutti i 16 Grafici)",
    streamSubtitle: "Ammira il morphing geometrico delle curve SVG, il tracking sincronizzato dei pallini, la fisica a cascata delle barre e il flusso organico ThemeRiver in tempo reale.",
    btnPlay: "▶ Riprendi Stream",
    btnPause: "⏸ Sospendi Stream",
    btnStep: "⏭ Singolo Passo",
    btnRandom: "🎲 Dati Casuali",
    speedLabel: "Velocità Tick:",
    speedFast: "Veloce (0.6s)",
    speedNormal: "Normale (1.2s)",
    speedSlow: "Lenta (2.5s)",
    
    streamLineLabel: "Ticker di Mercato Live (10 Punti)",
    streamAreaLabel: "Carico CPU Server (10 Punti)",
    streamBarLabel: "Varianza I/O Rete (8 Barre)",
    streamPieLabel: "Distribuzione Quote Traffico",
    streamHalfPieLabel: "Adozione Piani Sottoscrizione",
    streamRadialLabel: "Utilizzo Multi-Core (Anelli)",
    streamProgressLabel: "Arco Avanzamento Task",
    streamGaugeLabel: "Tachimetro Temperatura Core",
    streamCandleLabel: "Candele Finanziarie Asset (18 Candele)",
    streamOhlcLabel: "Barre a Tick OHLC (18 Ticks)",
    streamStackedLabel: "Flusso Risorse Multi-Canale",
    streamStreamLabel: "Flusso Organico ThemeRiver",
    streamComboLabel: "Volume vs Target Combinato",
    streamBulletLabel: "Fatturato KPI vs Target (Bullet)",
    streamWinLossLabel: "Serie Esiti Build CI/CD (Win/Loss)",
    streamRangeBarLabel: "Range Prezzo Min-Max (Range Bar)",
    streamScatterLabel: "Latenza vs Throughput (Scatter)",
    
    // Gallery & Cards
    galleryTitle: "Tutti i Componenti Primitivi",
    gallerySubtitle: "Ogni componente è incapsulato in Shadow DOM, supporta variabili CSS per i temi e reagisce istantaneamente al cambio dati.",
    
    // Component names & descriptions
    lineTitle: "Grafico a Linea",
    lineDesc: "Serie continua con curve di Bézier smussate, linea di soglia e crosshair interattivo.",
    areaTitle: "Grafico ad Area",
    areaDesc: "Area colorata con gradiente verticale nativo, curve smussate e linea di base ancorata.",
    stackedAreaTitle: "Area Impilata (Stacked)",
    stackedAreaDesc: "Layer cumulativi multi-serie con palette automatica e modalità normalizzata al 100%.",
    streamTitleChart: "Streamgraph (ThemeRiver)",
    streamDesc: "Silhouette organica centrata a fiumi fluidi con curve spline vivaci e contrastate.",
    barTitle: "Grafico a Barre",
    barDesc: "Layout a barre discrete con zero-baseline positiva/negativa, angoli arrotondati e hover focus.",
    pieTitle: "Torta & Ciambella (Donut)",
    pieDesc: "Distribuzione radiale con foro centrale per trasformazione immediata in donut chart e hover pop-out.",
    halfPieTitle: "Semi-Torta & Semi-Donut",
    halfPieDesc: "Arco superiore a 180° per testate di dashboard e ripartizione percentuali.",
    radialBarTitle: "Barre Radiali (Activity Rings)",
    radialBarDesc: "Anelli concentrici di attività con sweep personalizzato (270°/360°) e punte arrotondate.",
    progressTitle: "Misuratore di Progresso",
    progressDesc: "Arco di completamento con fisica elastica, valore centrale ed evento di completamento.",
    gaugeTitle: "Tachimetro Gauge",
    gaugeDesc: "Indicatore multi-zona con fasce colorate di soglia e lancetta reattiva rotante.",
    candleTitle: "Candlestick Giapponese",
    candleDesc: "Dati finanziari OHLC con candele rialziste piene/cave e stoppini di massimo/minimo.",
    ohlcTitle: "Barra a Tick OHLC",
    ohlcDesc: "Visualizzazione tick finanziaria essenziale con aletta di apertura e chiusura.",
    comboTitle: "Grafico Combinato (Barre + Linea)",
    comboDesc: "Doppio livello visivo che combina barre di volume con una linea di tendenza sincronizzata.",
    bulletTitle: "Grafico Bullet (KPI & Target)",
    bulletDesc: "Standard Stephen Few per monitoraggio KPI, target prefissato e fasce qualitative.",
    winLossTitle: "Grafico Win / Loss",
    winLossDesc: "Esiti discreti ternari (+1 vittoria, -1 sconfitta, 0 pareggio) per serie e uptime status.",
    rangeBarTitle: "Barre di Intervallo (Min-Max)",
    rangeBarDesc: "Barre di oscillazione a intervallo fluttuante con marcatore del punto attuale.",
    scatterTitle: "Grafico a Dispersione (2D)",
    scatterDesc: "Distribuzione di punti bidimensionali (x, y) con linea di regressione e supporto bubble.",


    // Playground
    playgroundTitle: "Sandbox Interattivo",
    playgroundSubtitle: "Modifica gli attributi, osserva gli aggiornamenti reattivi e copia il markup pronto per HTML o framework.",
    selectChartType: "Seleziona Componente:",
    editDataLabel: "Array Dati JSON:",
    editLabelLabel: "Etichetta Accessibile (aria-label):",
    btnCopyCode: "📋 Copia Markup",
    btnCopied: "✅ Copiato!",
    
    // Integrations
    integrationsTitle: "Integrazioni Framework",
    integrationsSubtitle: "Gli standard Web Components funzionano ovunque. Usa i Custom Elements nativi o i wrapper tipizzati per framework.",
    tabVanilla: "Vanilla / HTML",
    tabReact: "React 18 / 19+",
    tabVue: "Vue 3 (SFC)",
    tabAngular: "Angular 18 / 19 / 20+",
  }
};

// --- App Global State ---
export const state = {
  theme: localStorage.getItem("mini-charts-theme") || "dark",
  lang: localStorage.getItem("mini-charts-lang") || "en",
  isStreaming: true,
  streamSpeedMs: 1200,
  streamTimerId: null,
};

// --- Theme Controller ---
export function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("mini-charts-theme", theme);
  const html = document.documentElement;
  
  if (theme === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
    html.style.colorScheme = "dark";
  } else {
    html.classList.add("light");
    html.classList.remove("dark");
    html.style.colorScheme = "light";
  }

  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  }
}

export function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
}

// --- i18n Controller ---
export function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("mini-charts-lang", lang);
  const dict = translations[lang] || translations.en;
  
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  const langBtn = document.getElementById("lang-toggle-btn");
  if (langBtn) {
    langBtn.textContent = lang === "en" ? "🇬🇧 EN" : "🇮🇹 IT";
  }
}

export function toggleLanguage() {
  applyLanguage(state.lang === "en" ? "it" : "en");
}

// --- High-Fidelity Sliding Window Realtime Data Generators ---

// 1. Line & Area (Sliding 10-point FIFO queue)
let lineStreamHistory = [24, 28, 25, 32, 30, 42, 48, 45, 54, 52];
let areaStreamHistory = [42, 48, 45, 55, 58, 52, 64, 68, 62, 70];

// 2. Bar (8 points variance)
let barStreamHistory = [-12, 18, 28, -6, 22, -10, 32, 15];

// 3. Pie & Half-Pie
let pieStreamValues = [42, 28, 18, 12];
let halfPieStreamValues = [55, 28, 17];

// 4. Radial Rings & Progress
let radialRings = [72, 54, 86];
let progressValue = 68;

// 5. Gauge Temperature
let gaugeValue = 62;

// 6. Candlestick & OHLC (18 compact candles with Open_t = Close_{t-1})
let financialPrice = 110;
let candleStreamHistory = [];
for (let i = 0; i < 18; i++) {
  const open = financialPrice;
  const delta = (Math.random() - 0.48) * 8;
  const close = Math.round(open + delta);
  const high = Math.round(Math.max(open, close) + Math.random() * 4);
  const low = Math.round(Math.min(open, close) - Math.random() * 4);
  candleStreamHistory.push([open, high, low, close]);
  financialPrice = close;
}

// 7. Stacked Area (3 layers x 8 points)
let stackedStreamData = [
  [12, 18, 24, 22, 28, 32, 30, 36],
  [15, 14, 18, 20, 16, 22, 25, 24],
  [8, 12, 10, 15, 14, 16, 18, 20],
];

// 8. Streamgraph: Multi-layer ThemeRiver rolling window
let streamRiverState = THEMERIVER_LASTFM_DATA.map((row) => [...row]);
let streamTickOffset = 0;

// 9. Combo (6 points)
let comboStreamData = [
  { bar: 12, line: 18 },
  { bar: 16, line: 15 },
  { bar: 10, line: 22 },
  { bar: 24, line: 28 },
  { bar: 18, line: 25 },
  { bar: 28, line: 34 },
];

// 10. Bullet Chart
let bulletStreamData = { value: 74, target: 85, ranges: [50, 80, 100], min: 0, max: 100 };

// 11. Win / Loss Chart (12 items)
let winLossStreamHistory = [1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1];

// 12. Range Bar Chart (5 intervals)
let rangeBarStreamHistory = [
  [15, 45, 32],
  [22, 68, 54],
  [18, 52, 48],
  [30, 85, 62],
  [25, 70, 44],
];

// 13. Scatter Chart (8 points)
let scatterStreamPoints = [
  [10, 25],
  [18, 42],
  [28, 30],
  [35, 65],
  [44, 52],
  [58, 80],
  [65, 74],
  [78, 90],
];


export function stepStreamData() {
  // 1. Line: FIFO sliding window progression
  const lastLine = lineStreamHistory[lineStreamHistory.length - 1];
  const deltaLine = (Math.random() - 0.47) * 9;
  const newLine = Math.max(12, Math.min(85, Math.round(lastLine + deltaLine)));
  lineStreamHistory = [...lineStreamHistory.slice(1), newLine];
  
  const streamLineEl = document.getElementById("stream-line-chart");
  if (streamLineEl) {
    streamLineEl.setAttribute("data", JSON.stringify(lineStreamHistory));
  }

  // 2. Area: FIFO sliding window progression
  const lastArea = areaStreamHistory[areaStreamHistory.length - 1];
  const deltaArea = (Math.random() - 0.49) * 10;
  const newArea = Math.max(20, Math.min(90, Math.round(lastArea + deltaArea)));
  areaStreamHistory = [...areaStreamHistory.slice(1), newArea];
  
  const streamAreaEl = document.getElementById("stream-area-chart");
  if (streamAreaEl) {
    streamAreaEl.setAttribute("data", JSON.stringify(areaStreamHistory));
  }

  // 3. Bar: shift variance
  barStreamHistory = barStreamHistory.map((v) => {
    const shift = (Math.random() - 0.5) * 10;
    return Math.round(Math.max(-35, Math.min(45, v + shift)));
  });
  const streamBarEl = document.getElementById("stream-bar-chart");
  if (streamBarEl) {
    streamBarEl.setAttribute("data", JSON.stringify(barStreamHistory));
  }

  // 4. Pie: shifting shares
  pieStreamValues = pieStreamValues.map((v) => Math.max(10, Math.round(v + (Math.random() - 0.5) * 8)));
  const streamPieEl = document.getElementById("stream-pie-chart");
  if (streamPieEl) {
    streamPieEl.setAttribute("data", JSON.stringify(pieStreamValues));
  }

  // 5. Half-Pie: shifting tier split
  halfPieStreamValues = halfPieStreamValues.map((v) => Math.max(12, Math.round(v + (Math.random() - 0.5) * 6)));
  const streamHalfPieEl = document.getElementById("stream-half-pie-chart");
  if (streamHalfPieEl) {
    streamHalfPieEl.setAttribute("data", JSON.stringify(halfPieStreamValues));
  }

  // 6. Radial Bar: fluid stroke-dashoffset transition
  radialRings = radialRings.map((r) => Math.max(25, Math.min(95, Math.round(r + (Math.random() - 0.5) * 14))));
  const streamRadialEl = document.getElementById("stream-radial-chart");
  if (streamRadialEl) {
    streamRadialEl.setAttribute("data", JSON.stringify([
      { value: radialRings[0] },
      { value: radialRings[1] },
      { value: radialRings[2] },
    ]));
  }


  // 7. Progress Arc: fluctuating completion
  progressValue = Math.max(20, Math.min(98, Math.round(progressValue + (Math.random() - 0.48) * 8)));
  const streamProgressEl = document.getElementById("stream-progress-chart");
  if (streamProgressEl) {
    streamProgressEl.setAttribute("data", JSON.stringify([progressValue]));
  }

  // 8. Gauge: smooth temperature oscillation
  gaugeValue = Math.max(25, Math.min(92, Math.round(gaugeValue + (Math.random() - 0.48) * 9)));
  const streamGaugeEl = document.getElementById("stream-gauge-chart");
  if (streamGaugeEl) {
    streamGaugeEl.setAttribute("data", JSON.stringify([gaugeValue, 0, 100]));
  }

  // 9. Candlestick & 10. OHLC: 18 continuous financial ticks
  const lastCandle = candleStreamHistory[candleStreamHistory.length - 1];
  const open = lastCandle[3]; // Open_t = Close_{t-1}
  const delta = (Math.random() - 0.48) * 7;
  const close = Math.round(open + delta);
  const high = Math.round(Math.max(open, close) + Math.random() * 5);
  const low = Math.round(Math.min(open, close) - Math.random() * 5);
  candleStreamHistory = [...candleStreamHistory.slice(1), [open, high, low, close]];
  
  const streamCandleEl = document.getElementById("stream-candle-chart");
  if (streamCandleEl) {
    streamCandleEl.setAttribute("data", JSON.stringify(candleStreamHistory));
  }
  const streamOhlcEl = document.getElementById("stream-ohlc-chart");
  if (streamOhlcEl) {
    streamOhlcEl.setAttribute("data", JSON.stringify(candleStreamHistory));
  }

  // 11. Stacked Area: shifting layers
  stackedStreamData = stackedStreamData.map((layer) => {
    const last = layer[layer.length - 1];
    const next = Math.max(8, Math.min(45, Math.round(last + (Math.random() - 0.5) * 6)));
    return [...layer.slice(1), next];
  });
  const streamStackedEl = document.getElementById("stream-stacked-chart");
  if (streamStackedEl) {
    streamStackedEl.setAttribute("data", JSON.stringify(stackedStreamData));
  }

  // 12. Streamgraph: ThemeRiver wave flow (sliding rolling window across time)
  streamTickOffset = (streamTickOffset + 1) % 20;
  streamRiverState = THEMERIVER_LASTFM_DATA.map((row) => {
    const shifted = [...row.slice(streamTickOffset), ...row.slice(0, streamTickOffset)];
    return shifted;
  });
  const streamRiverEl = document.getElementById("stream-stream-chart");
  if (streamRiverEl) {
    streamRiverEl.setAttribute("data", JSON.stringify(streamRiverState));
  }

  // 13. Combo: sales vs target
  const lastCombo = comboStreamData[comboStreamData.length - 1];
  const nextBar = Math.max(8, Math.min(36, Math.round(lastCombo.bar + (Math.random() - 0.5) * 8)));
  const nextLine = Math.max(10, Math.min(40, Math.round(lastCombo.line + (Math.random() - 0.48) * 8)));
  comboStreamData = [...comboStreamData.slice(1), { bar: nextBar, line: nextLine }];
  const streamComboEl = document.getElementById("stream-combo-chart");
  if (streamComboEl) {
    streamComboEl.setAttribute("data", JSON.stringify(comboStreamData));
  }

  // 14. Bullet: KPI measure tracking
  bulletStreamData.value = Math.max(15, Math.min(96, Math.round(bulletStreamData.value + (Math.random() - 0.48) * 9)));
  const streamBulletEl = document.getElementById("stream-bullet-chart");
  if (streamBulletEl) {
    streamBulletEl.setAttribute("data", JSON.stringify(bulletStreamData));
  }

  // 15. Win / Loss: FIFO streak shift
  const outcomes = [1, 1, -1, 0, 1, -1, 1];
  const nextOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
  winLossStreamHistory = [...winLossStreamHistory.slice(1), nextOutcome];
  const streamWinLossEl = document.getElementById("stream-win-loss-chart");
  if (streamWinLossEl) {
    streamWinLossEl.setAttribute("data", JSON.stringify(winLossStreamHistory));
  }

  // 16. Range Bar: interval shift
  rangeBarStreamHistory = rangeBarStreamHistory.map((item) => {
    const shift = (Math.random() - 0.5) * 6;
    const min = Math.max(5, Math.round(item[0] + shift));
    const max = Math.min(95, Math.round(item[1] + shift));
    const cur = Math.round(min + (max - min) * (0.3 + Math.random() * 0.4));
    return [min, max, cur];
  });
  const streamRangeBarEl = document.getElementById("stream-range-bar-chart");
  if (streamRangeBarEl) {
    streamRangeBarEl.setAttribute("data", JSON.stringify(rangeBarStreamHistory));
  }

  // 17. Scatter: 2D coordinate shift
  scatterStreamPoints = scatterStreamPoints.map((pt) => {
    const shiftY = (Math.random() - 0.48) * 8;
    const newY = Math.max(10, Math.min(95, Math.round(pt[1] + shiftY)));
    return [pt[0], newY];
  });
  const streamScatterEl = document.getElementById("stream-scatter-chart");
  if (streamScatterEl) {
    streamScatterEl.setAttribute("data", JSON.stringify(scatterStreamPoints));
  }
}

export function startStreaming() {
  state.isStreaming = true;
  if (state.streamTimerId) clearInterval(state.streamTimerId);
  state.streamTimerId = setInterval(stepStreamData, state.streamSpeedMs);
  updateStreamButtons();
}

export function pauseStreaming() {
  state.isStreaming = false;
  if (state.streamTimerId) {
    clearInterval(state.streamTimerId);
    state.streamTimerId = null;
  }
  updateStreamButtons();
}

export function setStreamSpeed(speedMs) {
  state.streamSpeedMs = speedMs;
  if (state.isStreaming) {
    startStreaming();
  }
}

function updateStreamButtons() {
  const toggleBtn = document.getElementById("stream-toggle-btn");
  if (toggleBtn) {
    const dict = translations[state.lang] || translations.en;
    toggleBtn.textContent = state.isStreaming ? dict.btnPause : dict.btnPlay;
    toggleBtn.className = state.isStreaming ? "btn btn-secondary" : "btn btn-primary";
  }
}

// --- Chart Examples Database for Playground ---
export const chartPlaygroundExamples = Object.freeze({
  "mini-line-chart": {
    data: [18, 23, 20, 31, 27, 38, 44],
    label: "Weekly revenue trend",
    attributes: { curve: "smooth", points: "last", "trend-color": "auto", interactive: "" },
  },
  "mini-area-chart": {
    data: [18, 23, 20, 31, 27, 38, 44],
    label: "Active user growth",
    attributes: { curve: "smooth", gradient: "true", "trend-color": "auto" },
  },
  "mini-bar-chart": {
    data: [-12, 8, 19, -5, 13, 21],
    label: "Monthly net variance",
    attributes: { gap: "0.25", radius: "3", interactive: "" },
  },
  "mini-pie-chart": {
    data: [42, 27, 18, 13],
    label: "Traffic source breakdown",
    attributes: { donut: "0.6", "start-angle": "-90", interactive: "" },
  },
  "mini-half-pie-chart": {
    data: [58, 25, 17],
    label: "Tier subscription split",
    attributes: { donut: "0.55", interactive: "" },
  },
  "mini-radial-bar-chart": {
    data: [{ value: 75 }, { value: 55 }, { value: 90 }],
    label: "Activity goal rings",
    attributes: { sweep: "270", "round-caps": "true", interactive: "" },
  },

  "mini-progress-chart": {
    data: [78],
    label: "Quota capacity",
    attributes: { min: "0", max: "100", "show-value": "true", unit: "%" },
  },
  "mini-gauge-chart": {
    data: [68, 0, 100],
    label: "Turbine pressure",
    attributes: { "needle-type": "triangle" },
  },
  "mini-candlestick-chart": {
    data: [
      [100, 108, 96, 104],
      [104, 112, 102, 109],
      [109, 115, 105, 106],
      [106, 114, 100, 112],
      [112, 120, 110, 118],
      [118, 122, 114, 116],
      [116, 124, 115, 121],
      [121, 126, 118, 125],
    ],
    label: "Daily stock movement",
    attributes: { "hollow-bullish": "true", gap: "0.28", "wick-width": "0.75", interactive: "" },
  },
  "mini-ohlc-chart": {
    data: [
      [100, 108, 96, 104],
      [104, 112, 102, 109],
      [109, 115, 105, 106],
      [106, 114, 100, 112],
      [112, 120, 110, 118],
      [118, 122, 114, 116],
      [116, 124, 115, 121],
      [121, 126, 118, 125],
    ],
    label: "Asset tick breakdown",
    attributes: { "tick-width": "0.75", gap: "0.28", interactive: "" },
  },
  "mini-stacked-area-chart": {
    data: [[10, 20, 30, 40], [20, 15, 25, 35], [5, 10, 15, 20]],
    label: "Resource distribution",
    attributes: { curve: "smooth", interactive: "" },
  },
  "mini-stream-chart": {
    data: THEMERIVER_LASTFM_DATA,
    label: "Organic stream flow (Last.fm ThemeRiver)",
    attributes: { curve: "smooth", interactive: "" },
  },
  "mini-combo-chart": {
    data: [{ bar: 10, line: 20 }, { bar: 15, line: 15 }, { bar: 8, line: 25 }, { bar: 22, line: 30 }],
    label: "Sales vs Quota target",
    attributes: { "shared-domain": "true", curve: "smooth", interactive: "" },
  },
  "mini-bullet-chart": {
    data: { value: 78, target: 85, ranges: [50, 80, 100], min: 0, max: 100 },
    label: "Q3 revenue vs quota",
    attributes: { interactive: "" },
  },
  "mini-win-loss-chart": {
    data: [1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1],
    label: "CI/CD continuous build streak",
    attributes: { gap: "0.2", radius: "2", interactive: "" },
  },
  "mini-range-bar-chart": {
    data: [
      [12, 45, 30],
      [20, 68, 55],
      [15, 52, 48],
      [30, 85, 60],
      [25, 70, 42],
    ],
    label: "52-week stock price range",
    attributes: { gap: "0.25", radius: "3", interactive: "" },
  },
  "mini-scatter-chart": {
    data: [
      [10, 25],
      [18, 42],
      [28, 30],
      [35, 65],
      [44, 52],
      [58, 80],
      [65, 74],
      [78, 90],
    ],
    label: "Latency vs throughput distribution",
    attributes: { "trend-line": "true", "point-radius": "3.5", interactive: "" },
  },
});


// --- Playground Controller ---
export function renderPlayground() {
  const typeSelect = document.getElementById("pg-chart-type");
  const dataInput = document.getElementById("pg-chart-data");
  const labelInput = document.getElementById("pg-chart-label");
  const previewContainer = document.getElementById("pg-preview-container");
  const codeOutput = document.getElementById("pg-code-output");

  if (!typeSelect || !dataInput || !previewContainer || !codeOutput) return;

  const tagName = typeSelect.value;
  const example = chartPlaygroundExamples[tagName] || chartPlaygroundExamples["mini-line-chart"];
  
  let parsedData;
  try {
    parsedData = JSON.parse(dataInput.value);
  } catch {
    return;
  }

  const label = labelInput?.value?.trim() || example.label;
  const chartEl = document.createElement(tagName);
  chartEl.setAttribute("data", JSON.stringify(parsedData));
  chartEl.setAttribute("label", label);

  // Apply custom example attributes
  if (example.attributes) {
    for (const [k, v] of Object.entries(example.attributes)) {
      chartEl.setAttribute(k, v);
    }
  }

  previewContainer.replaceChildren(chartEl);

  // Format code
  const attrsFormatted = Object.entries(example.attributes || {})
    .map(([k, v]) => (v === "" ? `  ${k}` : `  ${k}="${v}"`))
    .join("\n");
  
  const code = `<${tagName}\n  data='${JSON.stringify(parsedData)}'\n  label="${label}"${attrsFormatted ? "\n" + attrsFormatted : ""}\n></${tagName}>`;
  codeOutput.textContent = code;
}

// --- App Initialization on DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Theme & Language
  applyTheme(state.theme);
  applyLanguage(state.lang);

  // 2. Setup Header Theme & Language Event Listeners
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("lang-toggle-btn")?.addEventListener("click", toggleLanguage);

  // 3. Setup Live Stream Controls
  document.getElementById("stream-toggle-btn")?.addEventListener("click", () => {
    if (state.isStreaming) pauseStreaming();
    else startStreaming();
  });
  document.getElementById("stream-step-btn")?.addEventListener("click", () => {
    pauseStreaming();
    stepStreamData();
  });
  document.getElementById("stream-random-btn")?.addEventListener("click", () => {
    stepStreamData();
  });
  document.getElementById("stream-speed-select")?.addEventListener("change", (e) => {
    setStreamSpeed(parseInt(e.target.value, 10));
  });

  // 4. Setup Interactive Playground
  const typeSelect = document.getElementById("pg-chart-type");
  const dataInput = document.getElementById("pg-chart-data");
  const labelInput = document.getElementById("pg-chart-label");

  function loadPlaygroundPreset(tagName) {
    const example = chartPlaygroundExamples[tagName];
    if (!example) return;
    if (dataInput) dataInput.value = JSON.stringify(example.data, null, 2);
    if (labelInput) labelInput.value = example.label;
    renderPlayground();
  }

  typeSelect?.addEventListener("change", (e) => {
    loadPlaygroundPreset(e.target.value);
  });
  dataInput?.addEventListener("input", renderPlayground);
  labelInput?.addEventListener("input", renderPlayground);

  // Initialize playground with initial select value
  if (typeSelect) {
    loadPlaygroundPreset(typeSelect.value || "mini-line-chart");
  }

  // 5. Setup Copy Code Button
  document.getElementById("copy-code-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("pg-code-output")?.textContent;
    if (code) {
      await navigator.clipboard.writeText(code);
      const copyBtn = document.getElementById("copy-code-btn");
      if (copyBtn) {
        const dict = translations[state.lang] || translations.en;
        const originalText = copyBtn.textContent;
        copyBtn.textContent = dict.btnCopied;
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1800);
      }
    }
  });

  // 6. Setup Integration Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      
      const targetId = btn.getAttribute("data-tab");
      btn.classList.add("active");
      document.getElementById(targetId)?.classList.add("active");
    });
  });

  // 7. Start live streaming auto-loop
  startStreaming();
});

// app.js — Interactive showcase, SPA Router, i18n engine, theme manager, multi-framework code generator, and real-time streaming for Sparkline Mini Charts demo.

import "../src/register.js";

// --- Authentic ThemeRiver Dataset (Last.fm / Byron & Wattenberg) ---
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
    heroDesc: "Ultra-lightweight, reactive, framework-agnostic micro data visualizations. Drop semantic SVG sparkline tags into any table, dashboard, card, or metric widget with 100% Shadow DOM encapsulation.",
    
    // Sidebar & Navigation
    groupGettingStarted: "Getting Started",
    itemOverview: "Overview & Features",
    itemInstallation: "Installation",
    groupLiveStream: "Live Studio",
    itemStreamingDashboard: "Streaming Dashboard (17)",
    groupComponents: "Components Catalog",
    itemAllComponents: "All 17 Primitives",
    catTrends: "1. Continuous Trends & Flow",
    catSigned: "2. Signed & Categorical",
    catRadial: "3. Radial & Proportions",
    catGauges: "4. Gauges, Meters & Benchmarks",
    catFinancial: "5. Financial & 2D Coordinates",
    groupTheming: "Theming & Tokens",
    itemTheming: "Theming & CSS Tokens",
    itemGradients: "✨ Gradients Studio",
    groupPlayground: "Interactive Sandbox",
    itemPlayground: "Live Playground",
    groupFrameworks: "Framework Guides",
    itemFrameworks: "React, Vue, Angular, Svelte",

    // Gradients Studio
    gradientsTitle: "Gradients Studio & Multi-Stop Colors",
    gradientsSubtitle: "Explore hardware-accelerated continuous SVG gradients and multi-stop chromatic transitions across Gauge, Progress, Radial Rings, Bullet, and Area sparklines.",
    gradientsLabTitle: "🎨 Continuous Multi-Stop Color Lab",
    gradientsLabSubtitle: "Select a chromatic preset or live-tweak stops to see real-time gradient rendering across all compatible charts:",
    gradientsSnippetTitle: "HTML Declarative Syntax:",
    btnCopyCode: "📋 Copy Code",

    // Theming Guide
    themingTitle: "Theming & Design Tokens Guide",
    themingSubtitle: "Discover how to brand, customize, and integrate Sparkline Mini Charts with your Design System using CSS Custom Properties and Shadow Parts.",
    themingLabTitle: "🧪 Interactive Theming Lab",
    themingLabSubtitle: "Select a preset or tweak individual CSS tokens to see real-time 60fps cascading theme updates:",
    themingCssOutputTitle: "Generated CSS Token Snippet:",
    btnCopyCss: "📋 Copy CSS",
    themingStrategiesTitle: "The 4 Levels of Customization",
    themingTableTitle: "Complete Design Tokens Reference",
    
    // Live Stream
    streamTitle: "Live Real-Time Streaming Studio (All 17 Charts)",
    streamSubtitle: "Witness smooth SVG path morphing, synchronized point tracking, staggered bar physics, and authentic ThemeRiver organic flows in real time.",
    btnPlay: "▶ Resume Stream",
    btnPause: "⏸ Pause Stream",
    btnStep: "⏭ Single Step",
    btnRandom: "🎲 Randomize",
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
    galleryTitle: "Components Catalog & Code Explorer",
    gallerySubtitle: "Explore all 17 primitives with uniform cards, multi-framework code snippets, and deep-dive documentation.",
    btnDetails: "API & Details →",
    
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
    playgroundTitle: "Interactive Sandbox & Playground",
    playgroundSubtitle: "Experiment with chart attributes, test custom datasets, and export ready-to-use markup.",
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
    tabSvelte: "Svelte",
  },
  it: {
    tagline: "Web Components Nativi · SVG · Zero dipendenze runtime",
    heroTitle: "Sparkline Mini Charts",
    heroDesc: "Micro-visualizzazioni dati ultra-leggere, reattive e indipendenti da framework. Inserisci tag SVG semantici in qualsiasi tabella, dashboard, card o widget di metriche con incapsulamento Shadow DOM al 100%.",
    
    // Sidebar & Navigation
    groupGettingStarted: "Guida Iniziale",
    itemOverview: "Panoramica & Funzioni",
    itemInstallation: "Installazione",
    groupLiveStream: "Live Studio",
    itemStreamingDashboard: "Streaming Dashboard (17)",
    groupComponents: "Catalogo Componenti",
    itemAllComponents: "Tutti i 17 Grafici",
    catTrends: "1. Trend Continui & Flussi",
    catSigned: "2. Barre & Esiti Categorici",
    catRadial: "3. Radiali & Proporzioni",
    catGauges: "4. Tachimetri, Metri & Target",
    catFinancial: "5. Finanziari & Coordinate 2D",
    groupTheming: "Temi & Token",
    itemTheming: "Temi & Token CSS",
    itemGradients: "✨ Gradients Studio",
    groupPlayground: "Sandbox Interattivo",
    itemPlayground: "Playground Live",
    groupFrameworks: "Guide Framework",
    itemFrameworks: "React, Vue, Angular, Svelte",

    // Gradients Studio
    gradientsTitle: "Studio Gradienti & Colori Multi-Stop",
    gradientsSubtitle: "Esplora i gradienti SVG continui accelerati via hardware e le transizioni cromatiche multi-stop su Gauge, Progress, Anelli Radiali, Bullet e Area sparklines.",
    gradientsLabTitle: "🎨 Laboratorio Colori Multi-Stop Continui",
    gradientsLabSubtitle: "Seleziona un preset cromatico o modifica i singoli stop per visualizzare il rendering in tempo reale su tutti i componenti compatibili:",
    gradientsSnippetTitle: "Sintassi Dichiarativa HTML:",
    btnCopyCode: "📋 Copia Codice",

    // Theming Guide
    themingTitle: "Guida alla Temizzazione & Design Token",
    themingSubtitle: "Scopri come brandizzare, personalizzare e integrare Sparkline Mini Charts con il tuo Design System usando CSS Custom Properties e Shadow Parts.",
    themingLabTitle: "🧪 Laboratorio Interattivo di Temi",
    themingLabSubtitle: "Seleziona un preset o modifica i singoli token CSS per vedere gli aggiornamenti a cascata in tempo reale a 60fps:",
    themingCssOutputTitle: "Snippet Token CSS Generato:",
    btnCopyCss: "📋 Copia CSS",
    themingStrategiesTitle: "I 4 Livelli di Personalizzazione",
    themingTableTitle: "Tabella di Riferimento dei Token",
    
    // Live Stream
    streamTitle: "Studio Live Streaming (Tutti i 17 Grafici)",
    streamSubtitle: "Ammira il morphing geometrico delle curve SVG, il tracking sincronizzato dei pallini, la fisica a cascata delle barre e il flusso organico ThemeRiver in tempo reale.",
    btnPlay: "▶ Riprendi Stream",
    btnPause: "⏸ Sospendi Stream",
    btnStep: "⏭ Singolo Passo",
    btnRandom: "🎲 Dati Casuali",
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
    galleryTitle: "Catalogo Componenti & Explorer Codice",
    gallerySubtitle: "Esplora tutti i 17 componenti primitivi con card uniformi, snippet di codice multi-framework e schede di dettaglio.",
    btnDetails: "Dettagli & API →",
    
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
    playgroundTitle: "Sandbox Interattivo & Playground",
    playgroundSubtitle: "Modifica gli attributi del grafico, testa dataset personalizzati ed esporta il markup pronto all'uso.",
    selectChartType: "Seleziona Componente:",
    editDataLabel: "Array Dati JSON:",
    editLabelLabel: "Etichetta Accessibile (aria-label):",
    btnCopyCode: "📋 Copia Markup",
    btnCopied: "✅ Copiato!",
    
    // Integrations
    integrationsTitle: "Integrazioni Framework",
    integrationsSubtitle: "I Web Components standard funzionano ovunque. Usali nativamente o tramite i comodi wrapper tipizzati.",
    tabVanilla: "Vanilla / HTML",
    tabReact: "React 18 / 19+",
    tabVue: "Vue 3 (SFC)",
    tabAngular: "Angular 18 / 19 / 20+",
    tabSvelte: "Svelte",
  }
};

// --- Application State ---
export const state = {
  theme: localStorage.getItem("smc_theme") || "dark",
  lang: localStorage.getItem("smc_lang") || "en",
  currentRoute: "overview",
  isStreaming: true,
  streamSpeed: 1200,
  streamTimerId: null,
  streamTick: 0,
};

// --- Toast Manager ---
export function showToast(message = "Copied to clipboard!") {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// --- Theme Management ---
export function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("smc_theme", theme);
  const html = document.documentElement;
  const icon = document.getElementById("theme-icon");
  if (theme === "light") {
    html.classList.remove("dark");
    html.classList.add("light");
    if (icon) icon.textContent = "☀️";
  } else {
    html.classList.remove("light");
    html.classList.add("dark");
    if (icon) icon.textContent = "🌙";
  }
}

export function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
}

// --- i18n Language Manager ---
export function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem("smc_lang", lang);
  const dict = translations[lang] || translations.en;
  const langBtn = document.getElementById("lang-toggle-btn");
  if (langBtn) {
    langBtn.textContent = lang === "it" ? "🇮🇹 IT" : "🇬🇧 EN";
  }
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  renderGallery();
  if (state.currentRoute.startsWith("components/")) {
    const tag = state.currentRoute.split("/")[1];
    renderComponentDetail(tag);
  }
}

export function toggleLanguage() {
  applyLanguage(state.lang === "en" ? "it" : "en");
}

// --- Component Specifications Database ---
export const COMPONENTS_CATALOG = Object.freeze([
  // Category 1: Continuous Trends & Flow
  {
    category: "trends",
    tag: "mini-line-chart",
    nameKey: "lineTitle",
    descKey: "lineDesc",
    data: [18, 23, 20, 31, 27, 38, 44],
    attrs: 'curve="smooth" trend-color="auto" points="last" interactive label="Weekly revenue trend"',
    reactProps: 'data={[18, 23, 20, 31, 27, 38, 44]} curve="smooth" trendColor="auto" points="last" label="Weekly revenue trend"',
    vueProps: ':data="[18, 23, 20, 31, 27, 38, 44]" curve="smooth" trend-color="auto" points="last" label="Weekly revenue trend"',
    angularProps: '[data]="revenueData" curve="smooth" trend-color="auto" points="last" label="Weekly revenue trend"',
  },
  {
    category: "trends",
    tag: "mini-area-chart",
    nameKey: "areaTitle",
    descKey: "areaDesc",
    data: [18, 23, 20, 31, 27, 38, 44],
    attrs: 'curve="smooth" gradient="true" trend-color="auto" label="Weekly active users"',
    reactProps: 'data={[18, 23, 20, 31, 27, 38, 44]} curve="smooth" gradient="true" label="Weekly active users"',
    vueProps: ':data="[18, 23, 20, 31, 27, 38, 44]" curve="smooth" gradient="true" label="Weekly active users"',
    angularProps: '[data]="usersData" curve="smooth" gradient="true" label="Weekly active users"',
  },
  {
    category: "trends",
    tag: "mini-stacked-area-chart",
    nameKey: "stackedAreaTitle",
    descKey: "stackedAreaDesc",
    data: [[10, 20, 30, 40], [20, 15, 25, 35], [5, 10, 15, 20]],
    attrs: 'curve="smooth" interactive label="Resource distribution"',
    reactProps: 'data={[[10, 20, 30, 40], [20, 15, 25, 35], [5, 10, 15, 20]]} curve="smooth" label="Resource distribution"',
    vueProps: ':data="[[10, 20, 30, 40], [20, 15, 25, 35], [5, 10, 15, 20]]" curve="smooth" label="Resource distribution"',
    angularProps: '[data]="layersData" curve="smooth" label="Resource distribution"',
  },
  {
    category: "trends",
    tag: "mini-stream-chart",
    nameKey: "streamTitleChart",
    descKey: "streamDesc",
    data: THEMERIVER_LASTFM_DATA,
    attrs: 'curve="smooth" interactive label="Organic stream flow"',
    reactProps: 'data={themeRiverData} curve="smooth" label="Organic stream flow"',
    vueProps: ':data="themeRiverData" curve="smooth" label="Organic stream flow"',
    angularProps: '[data]="themeRiverData" curve="smooth" label="Organic stream flow"',
  },
  {
    category: "trends",
    tag: "mini-combo-chart",
    nameKey: "comboTitle",
    descKey: "comboDesc",
    data: [{ bar: 10, line: 20 }, { bar: 15, line: 15 }, { bar: 8, line: 25 }, { bar: 22, line: 30 }],
    attrs: 'shared-domain="true" curve="smooth" interactive label="Sales vs Target"',
    reactProps: 'data={[{ bar: 10, line: 20 }, { bar: 15, line: 15 }, { bar: 8, line: 25 }, { bar: 22, line: 30 }]} sharedDomain="true" label="Sales vs Target"',
    vueProps: ':data="comboData" shared-domain="true" label="Sales vs Target"',
    angularProps: '[data]="comboData" shared-domain="true" label="Sales vs Target"',
  },

  // Category 2: Signed & Categorical
  {
    category: "signed",
    tag: "mini-bar-chart",
    nameKey: "barTitle",
    descKey: "barDesc",
    data: [-12, 8, 19, -5, 13, 21],
    attrs: 'gap="0.25" radius="3" interactive label="Monthly net variance"',
    reactProps: 'data={[-12, 8, 19, -5, 13, 21]} gap={0.25} radius={3} label="Monthly net variance"',
    vueProps: ':data="[-12, 8, 19, -5, 13, 21]" gap="0.25" radius="3" label="Monthly net variance"',
    angularProps: '[data]="varianceData" gap="0.25" radius="3" label="Monthly net variance"',
  },
  {
    category: "signed",
    tag: "mini-win-loss-chart",
    nameKey: "winLossTitle",
    descKey: "winLossDesc",
    data: [1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1],
    attrs: 'gap="0.2" radius="2" interactive label="CI/CD build history"',
    reactProps: 'data={[1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1]} gap={0.2} radius={2} label="CI/CD build history"',
    vueProps: ':data="[1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1]" gap="0.2" radius="2" label="CI/CD build history"',
    angularProps: '[data]="buildStreak" gap="0.2" radius="2" label="CI/CD build history"',
  },
  {
    category: "signed",
    tag: "mini-range-bar-chart",
    nameKey: "rangeBarTitle",
    descKey: "rangeBarDesc",
    data: [[12, 45, 30], [20, 68, 55], [15, 52, 48], [30, 85, 60], [25, 70, 42]],
    attrs: 'gap="0.25" radius="3" interactive label="52-week price range"',
    reactProps: 'data={[[12, 45, 30], [20, 68, 55], [15, 52, 48], [30, 85, 60], [25, 70, 42]]} gap={0.25} radius={3} label="52-week price range"',
    vueProps: ':data="rangeData" gap="0.25" radius="3" label="52-week price range"',
    angularProps: '[data]="rangeData" gap="0.25" radius="3" label="52-week price range"',
  },

  // Category 3: Radial & Proportions
  {
    category: "radial",
    tag: "mini-pie-chart",
    nameKey: "pieTitle",
    descKey: "pieDesc",
    data: [42, 27, 18, 13],
    attrs: 'donut="0.6" interactive label="Traffic sources share"',
    reactProps: 'data={[42, 27, 18, 13]} donut={0.6} label="Traffic sources share"',
    vueProps: ':data="[42, 27, 18, 13]" donut="0.6" label="Traffic sources share"',
    angularProps: '[data]="trafficShare" donut="0.6" label="Traffic sources share"',
  },
  {
    category: "radial",
    tag: "mini-half-pie-chart",
    nameKey: "halfPieTitle",
    descKey: "halfPieDesc",
    data: [58, 25, 17],
    attrs: 'donut="0.55" interactive label="Plan adoption split"',
    reactProps: 'data={[58, 25, 17]} donut={0.55} label="Plan adoption split"',
    vueProps: ':data="[58, 25, 17]" donut="0.55" label="Plan adoption split"',
    angularProps: '[data]="planAdoption" donut="0.55" label="Plan adoption split"',
  },
  {
    category: "radial",
    tag: "mini-radial-bar-chart",
    nameKey: "radialBarTitle",
    descKey: "radialBarDesc",
    data: [{ value: 75, color: "#8b5cf6" }, { value: 55, color: "#3b82f6" }, { value: 90, color: "#10b981" }],
    attrs: 'sweep="270" round-caps interactive label="Activity goal rings"',
    reactProps: 'data={[{ value: 75, color: "#8b5cf6" }, { value: 55, color: "#3b82f6" }, { value: 90, color: "#10b981" }]} sweep={270} roundCaps label="Activity rings"',
    vueProps: ':data="ringsData" sweep="270" round-caps label="Activity rings"',
    angularProps: '[data]="ringsData" sweep="270" round-caps label="Activity rings"',
  },

  // Category 4: Gauges, Meters & Benchmarks
  {
    category: "gauges",
    tag: "mini-progress-chart",
    nameKey: "progressTitle",
    descKey: "progressDesc",
    data: [78],
    attrs: 'max="100" show-value unit="%" label="Server quota capacity"',
    reactProps: 'data={[78]} max={100} showValue unit="%" label="Server quota capacity"',
    vueProps: ':data="[78]" max="100" show-value unit="%" label="Server quota capacity"',
    angularProps: '[data]="[78]" max="100" show-value unit="%" label="Server quota capacity"',
  },
  {
    category: "gauges",
    tag: "mini-gauge-chart",
    nameKey: "gaugeTitle",
    descKey: "gaugeDesc",
    data: [65, 0, 100],
    attrs: 'label="Turbine pressure gauge"',
    reactProps: 'data={[65, 0, 100]} label="Turbine pressure gauge"',
    vueProps: ':data="[65, 0, 100]" label="Turbine pressure gauge"',
    angularProps: '[data]="[65, 0, 100]" label="Turbine pressure gauge"',
  },
  {
    category: "gauges",
    tag: "mini-bullet-chart",
    nameKey: "bulletTitle",
    descKey: "bulletDesc",
    data: { value: 78, target: 85, ranges: [50, 80, 100], min: 0, max: 100 },
    attrs: 'interactive label="Revenue KPI vs Target"',
    reactProps: 'data={{ value: 78, target: 85, ranges: [50, 80, 100], min: 0, max: 100 }} label="Revenue KPI vs Target"',
    vueProps: ':data="bulletData" label="Revenue KPI vs Target"',
    angularProps: '[data]="bulletData" label="Revenue KPI vs Target"',
  },

  // Category 5: Financial & 2D Coordinates
  {
    category: "financial",
    tag: "mini-candlestick-chart",
    nameKey: "candleTitle",
    descKey: "candleDesc",
    data: [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 106], [106, 112, 105, 110], [110, 114, 108, 112], [112, 118, 110, 117], [117, 120, 114, 115], [115, 122, 113, 120]],
    attrs: 'hollow-bullish gap="0.28" wick-width="0.75" interactive label="Stock price chart"',
    reactProps: 'data={stockCandles} hollowBullish gap={0.28} wickWidth={0.75} label="Stock price chart"',
    vueProps: ':data="stockCandles" hollow-bullish gap="0.28" wick-width="0.75" label="Stock price chart"',
    angularProps: '[data]="stockCandles" hollow-bullish gap="0.28" wick-width="0.75" label="Stock price chart"',
  },
  {
    category: "financial",
    tag: "mini-ohlc-chart",
    nameKey: "ohlcTitle",
    descKey: "ohlcDesc",
    data: [[100, 105, 98, 103], [103, 108, 100, 107], [107, 110, 104, 106], [106, 112, 105, 110], [110, 114, 108, 112], [112, 118, 110, 117], [117, 120, 114, 115], [115, 122, 113, 120]],
    attrs: 'tick-width="0.75" gap="0.28" interactive label="Asset tick price"',
    reactProps: 'data={assetTicks} tickWidth={0.75} gap={0.28} label="Asset tick price"',
    vueProps: ':data="assetTicks" tick-width="0.75" gap="0.28" label="Asset tick price"',
    angularProps: '[data]="assetTicks" tick-width="0.75" gap="0.28" label="Asset tick price"',
  },
  {
    category: "financial",
    tag: "mini-scatter-chart",
    nameKey: "scatterTitle",
    descKey: "scatterDesc",
    data: [[10, 25], [18, 42], [28, 30], [35, 65], [44, 52], [58, 80], [65, 74], [78, 90]],
    attrs: 'trend-line="true" point-radius="3.5" interactive label="Latency vs throughput"',
    reactProps: 'data={[[10, 25], [18, 42], [28, 30], [35, 65], [44, 52], [58, 80], [65, 74], [78, 90]]} trendLine pointRadius={3.5} label="Latency vs throughput"',
    vueProps: ':data="scatterData" trend-line="true" point-radius="3.5" label="Latency vs throughput"',
    angularProps: '[data]="scatterData" trend-line="true" point-radius="3.5" label="Latency vs throughput"',
  }
]);

function tagToPascalCase(tag) {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Render Categorized Gallery with Uniform Heights ---
export function renderGallery() {
  const dict = translations[state.lang] || translations.en;
  const categories = ["trends", "signed", "radial", "gauges", "financial"];
  
  categories.forEach((cat) => {
    const grid = document.getElementById(`grid-${cat}`);
    if (!grid) return;

    const items = COMPONENTS_CATALOG.filter((c) => c.category === cat);
    grid.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "glass-card gallery-card";

      const title = dict[item.nameKey] || item.tag;
      const desc = dict[item.descKey] || "";
      const pascalName = tagToPascalCase(item.tag);

      // Multi-framework code snippets
      const htmlSnippet = `<${item.tag}\n  data='${JSON.stringify(item.data)}'\n  ${item.attrs}\n></${item.tag}>`;
      const reactSnippet = `import { ${pascalName} } from 'sparkline-mini-charts/react';\n\n<${pascalName}\n  ${item.reactProps}\n/>`;
      const vueSnippet = `<script setup lang="ts">\nimport { ${pascalName} } from 'sparkline-mini-charts/vue';\n</script>\n\n<template>\n  <${pascalName} ${item.vueProps} />\n</template>`;
      const angularSnippet = `import { MiniChartDirective } from 'sparkline-mini-charts/angular';\n\n<${item.tag}\n  ${item.angularProps}\n></${item.tag}>`;

      card.innerHTML = `
        <div class="gallery-card-top">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="font-size: 1.05rem;">${title}</h3>
              <code style="font-size: 0.75rem; color: var(--primary);">&lt;${item.tag}&gt;</code>
            </div>
            <a href="#/components/${item.tag}" class="btn btn-secondary btn-sm" style="font-size: 0.725rem; padding: 0.2rem 0.5rem;">${dict.btnDetails || "Details →"}</a>
          </div>
          <p class="gallery-card-desc">${desc}</p>
        </div>

        <div class="gallery-stage">
          <${item.tag} data='${JSON.stringify(item.data)}' ${item.attrs}></${item.tag}>
        </div>

        <div class="card-tabs">
          <div class="card-tab-nav" role="tablist">
            <button class="card-tab-btn active" data-framework="html">HTML</button>
            <button class="card-tab-btn" data-framework="react">React</button>
            <button class="card-tab-btn" data-framework="vue">Vue</button>
            <button class="card-tab-btn" data-framework="angular">Angular</button>
          </div>
          <div class="card-code-container">
            <pre class="card-code-block"><code>${escapeHtml(htmlSnippet)}</code></pre>
            <button class="card-copy-btn" title="Copy code">Copy</button>
          </div>
        </div>
      `;

      // Setup tab switcher & copy button for this specific card
      const tabBtns = card.querySelectorAll(".card-tab-btn");
      const codeBlock = card.querySelector(".card-code-block code");
      const copyBtn = card.querySelector(".card-copy-btn");

      const snippets = {
        html: htmlSnippet,
        react: reactSnippet,
        vue: vueSnippet,
        angular: angularSnippet
      };

      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          tabBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const fw = btn.getAttribute("data-framework");
          if (codeBlock) codeBlock.textContent = snippets[fw];
        });
      });

      copyBtn?.addEventListener("click", async () => {
        if (codeBlock?.textContent) {
          await navigator.clipboard.writeText(codeBlock.textContent);
          showToast(`Copied ${pascalName} code!`);
          copyBtn.textContent = "✓";
          setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        }
      });

      grid.appendChild(card);
    });
  });
}

// --- Dedicated Component Detail View Page ---
export function renderComponentDetail(tag) {
  const item = COMPONENTS_CATALOG.find((c) => c.tag === tag) || COMPONENTS_CATALOG[0];
  const dict = translations[state.lang] || translations.en;

  const titleEl = document.getElementById("detail-title");
  const tagEl = document.getElementById("detail-tag");
  const descEl = document.getElementById("detail-desc");
  const badgeEl = document.getElementById("detail-cat-badge");
  const stageEl = document.getElementById("detail-stage");
  const attrsPanel = document.getElementById("detail-attrs-panel");
  const codeOutput = document.getElementById("detail-code-output");

  if (!titleEl || !tagEl || !stageEl || !codeOutput) return;

  const title = dict[item.nameKey] || item.tag;
  const desc = dict[item.descKey] || "";
  const pascalName = tagToPascalCase(item.tag);

  titleEl.textContent = title;
  tagEl.textContent = `<${item.tag}>`;
  if (descEl) descEl.textContent = desc;
  if (badgeEl) badgeEl.textContent = `Category: ${item.category.toUpperCase()}`;

  // Render live chart in detail stage
  stageEl.innerHTML = `<${item.tag} data='${JSON.stringify(item.data)}' ${item.attrs}></${item.tag}>`;

  // Render attributes list
  if (attrsPanel) {
    attrsPanel.innerHTML = `
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; font-size: 0.85rem;">
        <strong>data:</strong> <code>JSON array / object</code>
        <strong>label:</strong> <code>Accessible ARIA label</code>
        <strong>Shadow DOM:</strong> <code>mode="open"</code>
        <strong>Frameworks:</strong> <code>React, Vue, Angular, Svelte</code>
        <strong>Theme Tokens:</strong> <code>--mini-chart-color-1..8</code>
      </div>
    `;
  }

  // Snippets
  const htmlSnippet = `<${item.tag}\n  data='${JSON.stringify(item.data, null, 2)}'\n  ${item.attrs}\n></${item.tag}>`;
  const reactSnippet = `import { ${pascalName} } from 'sparkline-mini-charts/react';\n\nexport function ChartCard() {\n  return (\n    <${pascalName}\n      ${item.reactProps}\n    />\n  );\n}`;
  const vueSnippet = `<script setup lang="ts">\nimport { ${pascalName} } from 'sparkline-mini-charts/vue';\n</script>\n\n<template>\n  <${pascalName} ${item.vueProps} />\n</template>`;
  const angularSnippet = `import { Component } from '@angular/core';\nimport { MiniChartDirective } from 'sparkline-mini-charts/angular';\n\n@Component({\n  standalone: true,\n  imports: [MiniChartDirective],\n  template: \`\n    <${item.tag} ${item.angularProps}></${item.tag}>\n  \`\n})\nexport class ChartCardComponent {}`;

  const detailSnippets = { html: htmlSnippet, react: reactSnippet, vue: vueSnippet, angular: angularSnippet };
  codeOutput.textContent = htmlSnippet;

  document.querySelectorAll("[data-detail-tab]").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll("[data-detail-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const fw = btn.getAttribute("data-detail-tab");
      codeOutput.textContent = detailSnippets[fw];
    };
  });

  const detailCopyBtn = document.getElementById("detail-copy-btn");
  if (detailCopyBtn) {
    detailCopyBtn.onclick = async () => {
      await navigator.clipboard.writeText(codeOutput.textContent);
      showToast(`Copied ${pascalName} code!`);
    };
  }
}

// --- Client-Side Hash Router ---
export function handleRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  state.currentRoute = hash || "overview";

  // Hide all page views
  document.querySelectorAll(".page-view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".sidebar-link").forEach((l) => l.classList.remove("active"));

  if (state.currentRoute.startsWith("components/")) {
    const tag = state.currentRoute.split("/")[1];
    document.getElementById("view-component-detail")?.classList.add("active");
    renderComponentDetail(tag);
    // highlight sidebar
    const link = document.querySelector(`.sidebar-link[data-route="components/${tag}"]`);
    if (link) link.classList.add("active");
  } else if (state.currentRoute === "components") {
    document.getElementById("view-components")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="components"]')?.classList.add("active");
    renderGallery();
  } else if (state.currentRoute === "streaming") {
    document.getElementById("view-streaming")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="streaming"]')?.classList.add("active");
  } else if (state.currentRoute === "theming") {
    document.getElementById("view-theming")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="theming"]')?.classList.add("active");
    renderThemingLab();
  } else if (state.currentRoute === "gradients") {
    document.getElementById("view-gradients")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="gradients"]')?.classList.add("active");
    renderGradientsStudio();
  } else if (state.currentRoute === "playground") {
    document.getElementById("view-playground")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="playground"]')?.classList.add("active");
    renderPlayground();
  } else if (state.currentRoute === "frameworks") {
    document.getElementById("view-frameworks")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="frameworks"]')?.classList.add("active");
  } else {
    document.getElementById("view-overview")?.classList.add("active");
    document.querySelector('.sidebar-link[data-route="overview"]')?.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

// --- Live Real-Time Stream Simulator ---
export function stepStreamData() {
  state.streamTick++;
  const t = state.streamTick;

  // 1. Line
  const lineEl = document.getElementById("stream-line-chart");
  if (lineEl) {
    const prev = JSON.parse(lineEl.getAttribute("data") || "[]");
    const nextVal = Math.round(Math.max(10, Math.min(80, (prev[prev.length - 1] || 40) + (Math.random() * 16 - 7.5))));
    const next = [...prev.slice(1), nextVal];
    lineEl.setAttribute("data", JSON.stringify(next));
  }

  // 2. Area
  const areaEl = document.getElementById("stream-area-chart");
  if (areaEl) {
    const prev = JSON.parse(areaEl.getAttribute("data") || "[]");
    const nextVal = Math.round(Math.max(20, Math.min(95, (prev[prev.length - 1] || 50) + (Math.random() * 18 - 8))));
    const next = [...prev.slice(1), nextVal];
    areaEl.setAttribute("data", JSON.stringify(next));
  }

  // 3. Bar
  const barEl = document.getElementById("stream-bar-chart");
  if (barEl) {
    const prev = JSON.parse(barEl.getAttribute("data") || "[]");
    const nextVal = Math.round(Math.random() * 70 - 30);
    const next = [...prev.slice(1), nextVal];
    barEl.setAttribute("data", JSON.stringify(next));
  }

  // 4. Pie
  const pieEl = document.getElementById("stream-pie-chart");
  if (pieEl) {
    const r = [Math.round(20 + Math.random() * 30), Math.round(15 + Math.random() * 25), Math.round(10 + Math.random() * 20), Math.round(5 + Math.random() * 15)];
    pieEl.setAttribute("data", JSON.stringify(r));
  }

  // 5. Half Pie
  const halfPieEl = document.getElementById("stream-half-pie-chart");
  if (halfPieEl) {
    const r = [Math.round(35 + Math.random() * 25), Math.round(20 + Math.random() * 20), Math.round(10 + Math.random() * 15)];
    halfPieEl.setAttribute("data", JSON.stringify(r));
  }

  // 6. Radial Bar
  const radialEl = document.getElementById("stream-radial-chart");
  if (radialEl) {
    const r = [
      { value: Math.round(40 + Math.random() * 55), color: "#6366f1" },
      { value: Math.round(30 + Math.random() * 60), color: "#06b6d4" },
      { value: Math.round(50 + Math.random() * 45), color: "#10b981" }
    ];
    radialEl.setAttribute("data", JSON.stringify(r));
  }

  // 7. Progress
  const progressEl = document.getElementById("stream-progress-chart");
  if (progressEl) {
    const val = (t * 7) % 100;
    progressEl.setAttribute("data", JSON.stringify([val]));
  }

  // 8. Gauge
  const gaugeEl = document.getElementById("stream-gauge-chart");
  if (gaugeEl) {
    const val = Math.round(30 + Math.sin(t * 0.4) * 35 + Math.random() * 15);
    gaugeEl.setAttribute("data", JSON.stringify([val, 0, 100]));
  }

  // 9. Candlestick & 10. OHLC
  const candleEl = document.getElementById("stream-candle-chart");
  const ohlcEl = document.getElementById("stream-ohlc-chart");
  if (candleEl || ohlcEl) {
    const base = 100 + Math.sin(t * 0.2) * 25 + Math.random() * 5;
    const candles = Array.from({ length: 18 }, (_, i) => {
      const open = Math.round(base + i * 2 + Math.random() * 6 - 3);
      const close = Math.round(open + Math.random() * 8 - 4);
      const high = Math.max(open, close) + Math.round(Math.random() * 4);
      const low = Math.min(open, close) - Math.round(Math.random() * 4);
      return [open, high, low, close];
    });
    const cData = JSON.stringify(candles);
    candleEl?.setAttribute("data", cData);
    ohlcEl?.setAttribute("data", cData);
  }

  // 11. Stacked Area
  const stackedEl = document.getElementById("stream-stacked-chart");
  if (stackedEl) {
    const s1 = Array.from({ length: 8 }, (_, i) => Math.round(15 + Math.sin(t * 0.3 + i) * 10 + 5));
    const s2 = Array.from({ length: 8 }, (_, i) => Math.round(12 + Math.cos(t * 0.25 + i) * 8 + 4));
    const s3 = Array.from({ length: 8 }, (_, i) => Math.round(8 + Math.sin(t * 0.2 + i) * 6 + 3));
    stackedEl.setAttribute("data", JSON.stringify([s1, s2, s3]));
  }

  // 12. Stream (ThemeRiver)
  const streamEl = document.getElementById("stream-stream-chart");
  if (streamEl) {
    const shifted = [...THEMERIVER_LASTFM_DATA.slice(t % 6), ...THEMERIVER_LASTFM_DATA.slice(0, t % 6)];
    streamEl.setAttribute("data", JSON.stringify(shifted));
  }

  // 13. Combo
  const comboEl = document.getElementById("stream-combo-chart");
  if (comboEl) {
    const combo = Array.from({ length: 6 }, (_, i) => ({
      bar: Math.round(10 + Math.random() * 20),
      line: Math.round(14 + Math.random() * 18)
    }));
    comboEl.setAttribute("data", JSON.stringify(combo));
  }

  // 14. Bullet
  const bulletEl = document.getElementById("stream-bullet-chart");
  if (bulletEl) {
    const val = Math.round(45 + Math.sin(t * 0.3) * 35 + Math.random() * 10);
    bulletEl.setAttribute("data", JSON.stringify({ value: val, target: 85, ranges: [50, 80, 100], min: 0, max: 100 }));
  }

  // 15. Win/Loss
  const winLossEl = document.getElementById("stream-win-loss-chart");
  if (winLossEl) {
    const outcomes = [1, 1, -1, 1, 0, 1, -1, 1, 1, 0, 1, 1];
    const shifted = [...outcomes.slice(1), Math.random() > 0.4 ? 1 : (Math.random() > 0.5 ? -1 : 0)];
    winLossEl.setAttribute("data", JSON.stringify(shifted));
  }

  // 16. Range Bar
  const rangeBarEl = document.getElementById("stream-range-bar-chart");
  if (rangeBarEl) {
    const ranges = Array.from({ length: 5 }, (_, i) => {
      const min = Math.round(10 + i * 4 + Math.random() * 5);
      const max = Math.round(min + 25 + Math.random() * 15);
      const val = Math.round(min + (max - min) * (0.3 + Math.random() * 0.4));
      return [min, max, val];
    });
    rangeBarEl.setAttribute("data", JSON.stringify(ranges));
  }

  // 17. Scatter
  const scatterEl = document.getElementById("stream-scatter-chart");
  if (scatterEl) {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const x = Math.round(10 + i * 10 + Math.random() * 4 - 2);
      const y = Math.round(15 + i * 9 + Math.sin(t * 0.3 + i) * 8 + Math.random() * 6 - 3);
      return [x, y];
    });
    scatterEl.setAttribute("data", JSON.stringify(pts));
  }
}

export function startStreaming() {
  state.isStreaming = true;
  updateStreamButtonState();
  if (state.streamTimerId) clearInterval(state.streamTimerId);
  state.streamTimerId = setInterval(stepStreamData, state.streamSpeed);
}

export function pauseStreaming() {
  state.isStreaming = false;
  updateStreamButtonState();
  if (state.streamTimerId) {
    clearInterval(state.streamTimerId);
    state.streamTimerId = null;
  }
}

export function setStreamSpeed(ms) {
  state.streamSpeed = ms;
  if (state.isStreaming) {
    startStreaming();
  }
}

function updateStreamButtonState() {
  const toggleBtn = document.getElementById("stream-toggle-btn");
  if (toggleBtn) {
    const dict = translations[state.lang] || translations.en;
    toggleBtn.textContent = state.isStreaming ? dict.btnPause : dict.btnPlay;
    toggleBtn.className = state.isStreaming ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm";
  }
}

// --- Theming Lab Controller & Presets ---
export const THEME_PRESETS = Object.freeze({
  ocean: {
    primary: "#0284c7",
    point: "#38bdf8",
    bullish: "#10b981",
    bearish: "#f43f5e",
    target: "#f43f5e",
    stroke: 2,
    opacity: 0.45,
    colors: ["#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f59e0b", "#0d9488", "#10b981"],
  },
  emerald: {
    primary: "#059669",
    point: "#34d399",
    bullish: "#10b981",
    bearish: "#e11d48",
    target: "#e11d48",
    stroke: 2,
    opacity: 0.4,
    colors: ["#10b981", "#0d9488", "#0284c7", "#6366f1", "#8b5cf6", "#f59e0b", "#f97316", "#ef4444"],
  },
  cyberpunk: {
    primary: "#00f0ff",
    point: "#ffe600",
    bullish: "#00ff88",
    bearish: "#ff0055",
    target: "#ffe600",
    stroke: 2.5,
    opacity: 0.25,
    colors: ["#00f0ff", "#ff007f", "#7000ff", "#00ff88", "#ffe600", "#ff6600", "#b800ff", "#00bfff"],
  },
  sunset: {
    primary: "#f97316",
    point: "#facc15",
    bullish: "#10b981",
    bearish: "#e11d48",
    target: "#e11d48",
    stroke: 2,
    opacity: 0.45,
    colors: ["#f59e0b", "#f97316", "#ef4444", "#ec4899", "#d946ef", "#8b5cf6", "#6366f1", "#312e81"],
  },
  monochrome: {
    primary: "#8b5cf6",
    point: "#c084fc",
    bullish: "#10b981",
    bearish: "#f43f5e",
    target: "#fbbf24",
    stroke: 2,
    opacity: 0.35,
    colors: ["#a855f7", "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#fbbf24", "#f97316", "#f43f5e"],
  },
});

export function renderThemingLab(activePresetKey = "ocean") {
  const board = document.getElementById("theming-preview-board");
  const codeEl = document.getElementById("theming-css-output");
  if (!board || !codeEl) return;

  const primary = document.getElementById("theme-token-primary")?.value || "#0284c7";
  const point = document.getElementById("theme-token-point")?.value || "#38bdf8";
  const bullish = document.getElementById("theme-token-bullish")?.value || "#10b981";
  const bearish = document.getElementById("theme-token-bearish")?.value || "#f43f5e";
  const stroke = document.getElementById("theme-token-stroke")?.value || "2";
  const opacity = document.getElementById("theme-token-opacity")?.value || "0.45";

  const preset = THEME_PRESETS[activePresetKey] || THEME_PRESETS.ocean;
  const colors = preset.colors;

  // Apply directly to preview container CSS variables
  board.style.setProperty("--mini-chart-color", primary);
  board.style.setProperty("--mini-chart-point-fill", point);
  board.style.setProperty("--mini-chart-bullish-color", bullish);
  board.style.setProperty("--mini-chart-bearish-color", bearish);
  board.style.setProperty("--mini-chart-target-color", preset.target || bearish);
  board.style.setProperty("--mini-chart-stroke-width", `${stroke}px`);
  board.style.setProperty("--mini-chart-inactive-opacity", opacity);

  colors.forEach((c, idx) => {
    board.style.setProperty(`--mini-chart-color-${idx + 1}`, c);
  });

  // Generate complete CSS code block
  const cssCode = `/* Theme Custom Properties for Sparkline Mini Charts */
.my-custom-theme {
  /* 1. Base Brand & Curves */
  --mini-chart-color: ${primary};
  --mini-chart-point-fill: ${point};
  --mini-chart-stroke-width: ${stroke}px;
  --mini-chart-inactive-opacity: ${opacity};

  /* 2. Financial & Binary Tones */
  --mini-chart-bullish-color: ${bullish};
  --mini-chart-bearish-color: ${bearish};
  --mini-chart-target-color: ${preset.target || bearish};

  /* 3. Multi-Series Categorical Palette */
${colors.map((c, i) => `  --mini-chart-color-${i + 1}: ${c};`).join("\n")}
}`;
  codeEl.textContent = cssCode;
}

export function setupThemingLab() {
  const primaryInput = document.getElementById("theme-token-primary");
  const primaryText = document.getElementById("theme-token-primary-text");
  const pointInput = document.getElementById("theme-token-point");
  const pointText = document.getElementById("theme-token-point-text");
  const bullishInput = document.getElementById("theme-token-bullish");
  const bullishText = document.getElementById("theme-token-bullish-text");
  const bearishInput = document.getElementById("theme-token-bearish");
  const bearishText = document.getElementById("theme-token-bearish-text");
  const strokeInput = document.getElementById("theme-token-stroke");
  const strokeVal = document.getElementById("theme-token-stroke-val");
  const opacityInput = document.getElementById("theme-token-opacity");
  const opacityVal = document.getElementById("theme-token-opacity-val");

  function bindInput(input, text) {
    input?.addEventListener("input", () => {
      if (text) text.value = input.value;
      // Deselect preset pills on custom change
      document.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
      renderThemingLab();
    });
  }

  bindInput(primaryInput, primaryText);
  bindInput(pointInput, pointText);
  bindInput(bullishInput, bullishText);
  bindInput(bearishInput, bearishText);

  strokeInput?.addEventListener("input", () => {
    if (strokeVal) strokeVal.textContent = `${strokeInput.value}px`;
    document.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
    renderThemingLab();
  });

  opacityInput?.addEventListener("input", () => {
    if (opacityVal) opacityVal.textContent = opacityInput.value;
    document.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
    renderThemingLab();
  });

  // Preset buttons
  document.querySelectorAll(".preset-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-preset");
      const preset = THEME_PRESETS[presetKey];
      if (!preset) return;

      document.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");

      if (primaryInput) primaryInput.value = preset.primary;
      if (primaryText) primaryText.value = preset.primary;
      if (pointInput) pointInput.value = preset.point;
      if (pointText) pointText.value = preset.point;
      if (bullishInput) bullishInput.value = preset.bullish;
      if (bullishText) bullishText.value = preset.bullish;
      if (bearishInput) bearishInput.value = preset.bearish;
      if (bearishText) bearishText.value = preset.bearish;
      if (strokeInput) strokeInput.value = String(preset.stroke);
      if (strokeVal) strokeVal.textContent = `${preset.stroke}px`;
      if (opacityInput) opacityInput.value = String(preset.opacity);
      if (opacityVal) opacityVal.textContent = String(preset.opacity);

      // Set palette colors on board
      const board = document.getElementById("theming-preview-board");
      if (board && preset.colors) {
        preset.colors.forEach((c, idx) => {
          board.style.setProperty(`--mini-chart-color-${idx + 1}`, c);
        });
      }

      renderThemingLab(presetKey);
    });
  });

  // Copy CSS button
  document.getElementById("copy-theme-css-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("theming-css-output")?.textContent;
    if (code) {
      await navigator.clipboard.writeText(code);
      showToast("Copied theme CSS tokens!");
    }
  });

  // Copy Master Tokens button
  document.getElementById("copy-master-tokens-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("master-tokens-code")?.textContent;
    if (code) {
      await navigator.clipboard.writeText(code);
      showToast("Copied Master Tokens snippet!");
    }
  });

  // Apply default preset palette
  const defaultPreset = THEME_PRESETS.ocean;
  const board = document.getElementById("theming-preview-board");
  if (board && defaultPreset.colors) {
    defaultPreset.colors.forEach((c, idx) => {
      board.style.setProperty(`--mini-chart-color-${idx + 1}`, c);
    });
  }

  renderThemingLab();
}

// --- Gradients Studio Controller ---
export const GRADIENT_PRESETS = Object.freeze({
  thermal: {
    name: "Thermal Gauge (6 Stops)",
    gauge: "['#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444']",
    progress: "['#10b981', '#f59e0b', '#ef4444']",
    radial: "[['#10b981', '#84cc16'], ['#f59e0b', '#f97316'], ['#ef4444', '#dc2626']]",
    bullet: "['#10b981', '#f59e0b', '#ef4444']",
    area: "['#10b981', '#f59e0b', '#ef4444']",
  },
  cyber: {
    name: "Cyber Cyan & Lime",
    gauge: "['#06b6d4', '#0ea5e9', '#3b82f6', '#10b981', '#84cc16']",
    progress: "['#06b6d4', '#10b981']",
    radial: "[['#06b6d4', '#3b82f6'], ['#3b82f6', '#8b5cf6'], ['#10b981', '#84cc16']]",
    bullet: "['#06b6d4', '#10b981']",
    area: "['#06b6d4', '#10b981']",
  },
  sunset: {
    name: "Sunset Horizon",
    gauge: "['#eab308', '#f59e0b', '#f97316', '#f43f5e', '#ec4899', '#8b5cf6']",
    progress: "['#f59e0b', '#f43f5e', '#8b5cf6']",
    radial: "[['#f59e0b', '#f97316'], ['#f43f5e', '#ec4899'], ['#8b5cf6', '#a855f7']]",
    bullet: "['#f59e0b', '#f43f5e']",
    area: "['#f97316', '#f43f5e', '#8b5cf6']",
  },
  aurora: {
    name: "Aurora Borealis",
    gauge: "['#10b981', '#06b6d4', '#6366f1', '#8b5cf6', '#a855f7']",
    progress: "['#10b981', '#06b6d4', '#8b5cf6']",
    radial: "[['#10b981', '#06b6d4'], ['#06b6d4', '#6366f1'], ['#8b5cf6', '#a855f7']]",
    bullet: "['#06b6d4', '#8b5cf6']",
    area: "['#10b981', '#06b6d4', '#8b5cf6']",
  },
  neon: {
    name: "Neon Violet & Fuchsia",
    gauge: "['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e']",
    progress: "['#6366f1', '#ec4899']",
    radial: "[['#3b82f6', '#6366f1'], ['#8b5cf6', '#a855f7'], ['#ec4899', '#f43f5e']]",
    bullet: "['#8b5cf6', '#ec4899']",
    area: "['#3b82f6', '#8b5cf6', '#ec4899']",
  },
});

export function renderGradientsStudio(presetKey = "thermal") {
  const preset = GRADIENT_PRESETS[presetKey] || GRADIENT_PRESETS.thermal;

  const gauge = document.getElementById("demo-grad-gauge");
  const progress = document.getElementById("demo-grad-progress");
  const radial = document.getElementById("demo-grad-radial");
  const bullet = document.getElementById("demo-grad-bullet");
  const area = document.getElementById("demo-grad-area");
  const codeEl = document.getElementById("gradients-code-output");

  if (gauge) gauge.setAttribute("gradient", preset.gauge);
  if (progress) progress.setAttribute("gradient", preset.progress);
  if (radial) radial.setAttribute("gradient", preset.radial);
  if (bullet) bullet.setAttribute("gradient", preset.bullet);
  if (area) area.setAttribute("gradient", preset.area);

  if (codeEl) {
    codeEl.textContent = `<!-- 1. Speedometer Gauge with continuous multi-color arc -->
<mini-gauge-chart
  data="[72, 0, 100]"
  gradient="${preset.gauge}"
  interactive
></mini-gauge-chart>

<!-- 2. Semi-circular progress score with stroke gradient -->
<mini-progress-chart
  data="[84]"
  gradient="${preset.progress}"
  interactive
  show-value
  unit="%"
></mini-progress-chart>

<!-- 3. Concentric activity rings with individual track gradients -->
<mini-radial-bar-chart
  data="[90, 75, 55]"
  gradient="${preset.radial}"
  interactive
></mini-radial-bar-chart>

<!-- 4. Performance KPI bullet bar with intensity gradient -->
<mini-bullet-chart
  data="[82, 90, 40, 70, 100]"
  gradient="${preset.bullet}"
  interactive
></mini-bullet-chart>

<!-- 5. Multi-hue smooth area sparkline with vertical opacity fade -->
<mini-area-chart
  data="[14, 22, 19, 32, 28, 45, 40, 58, 62]"
  curve="smooth"
  points="last"
  gradient="${preset.area}"
  interactive
></mini-area-chart>`;
  }
}

export function setupGradientsStudio() {
  document.querySelectorAll("#gradient-presets-bar [data-grad-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-grad-preset") || "thermal";
      document.querySelectorAll("#gradient-presets-bar [data-grad-preset]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderGradientsStudio(presetKey);
    });
  });

  document.getElementById("copy-grad-code-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("gradients-code-output")?.textContent;
    if (code) {
      await navigator.clipboard.writeText(code);
      showToast("Copied gradient declarative markup!");
    }
  });

  renderGradientsStudio("thermal");
}

// --- Playground Controller ---
export function renderPlayground() {
  const typeSelect = document.getElementById("pg-chart-type");
  const dataInput = document.getElementById("pg-chart-data");
  const labelInput = document.getElementById("pg-chart-label");
  const previewContainer = document.getElementById("pg-preview-container");
  const codeOutput = document.getElementById("pg-code-output");

  if (!typeSelect || !dataInput || !previewContainer || !codeOutput) return;

  const tagName = typeSelect.value;
  const item = COMPONENTS_CATALOG.find((c) => c.tag === tagName) || COMPONENTS_CATALOG[0];

  let parsedData;
  try {
    parsedData = JSON.parse(dataInput.value);
  } catch {
    return;
  }

  const label = labelInput?.value?.trim() || "Live Sandbox Preview";
  const chartEl = document.createElement(tagName);
  chartEl.setAttribute("data", JSON.stringify(parsedData));
  chartEl.setAttribute("label", label);

  // Apply custom example attributes
  if (item.attrs) {
    const pairs = item.attrs.match(/([a-z-]+)(?:="([^"]*)")?/g) || [];
    pairs.forEach((p) => {
      const [k, v] = p.split("=");
      chartEl.setAttribute(k, v ? v.replace(/"/g, "") : "");
    });
  }

  previewContainer.replaceChildren(chartEl);

  const code = `<${tagName}\n  data='${JSON.stringify(parsedData)}'\n  label="${label}"\n  ${item.attrs}\n></${tagName}>`;
  codeOutput.textContent = code;
}

// --- App Initialization on DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Theme & Language
  applyTheme(state.theme);
  applyLanguage(state.lang);

  // 2. Setup Top Navbar Event Listeners
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("lang-toggle-btn")?.addEventListener("click", toggleLanguage);

  // Quick Install Copy Button
  document.getElementById("quick-install-btn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText("pnpm add sparkline-mini-charts");
    showToast("Copied: pnpm add sparkline-mini-charts");
  });

  // Mobile Menu Drawer Toggle
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("docs-sidebar");
  mobileMenuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });

  // 3. Setup Hash Router & Listeners
  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  // 4. Setup Live Stream Controls
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

  // 5. Setup Interactive Playground
  const typeSelect = document.getElementById("pg-chart-type");
  const dataInput = document.getElementById("pg-chart-data");
  const labelInput = document.getElementById("pg-chart-label");

  function loadPlaygroundPreset(tagName) {
    const item = COMPONENTS_CATALOG.find((c) => c.tag === tagName) || COMPONENTS_CATALOG[0];
    if (!item) return;
    if (dataInput) dataInput.value = JSON.stringify(item.data, null, 2);
    if (labelInput) labelInput.value = "Custom " + item.tag;
    renderPlayground();
  }

  typeSelect?.addEventListener("change", (e) => {
    loadPlaygroundPreset(e.target.value);
  });
  dataInput?.addEventListener("input", renderPlayground);
  labelInput?.addEventListener("input", renderPlayground);

  if (typeSelect) {
    loadPlaygroundPreset(typeSelect.value || "mini-line-chart");
  }

  // 6. Setup Playground Copy Code Button
  document.getElementById("copy-code-btn")?.addEventListener("click", async () => {
    const code = document.getElementById("pg-code-output")?.textContent;
    if (code) {
      await navigator.clipboard.writeText(code);
      showToast("Copied playground markup!");
    }
  });

  // 7. Setup Global Framework Integration Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => (c.style.display = "none"));
      
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const target = document.getElementById(targetId);
      if (target) target.style.display = "block";
    });
  });

  // 8. Setup Interactive Theming Lab
  setupThemingLab();

  // 9. Setup Interactive Gradients Studio
  setupGradientsStudio();

  // 10. Start live streaming auto-loop
  startStreaming();
});

// Auto-boot application on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// app.js — Native-form playground behavior for the static Sparkline Mini Charts demo.


const chartExamples = Object.freeze({
  "mini-line-chart": {
    data: [18, 23, 20, 31, 27, 38, 44],
    label: "Weekly revenue trend",
    name: "line chart",
  },
  "mini-area-chart": {
    data: [18, 23, 20, 31, 27, 38, 44],
    label: "Weekly active users",
    name: "area chart",
  },
  "mini-bar-chart": {
    data: [-12, 8, 19, -5, 13, 21],
    label: "Monthly variance",
    name: "bar chart",
  },
  "mini-combo-chart": {
    data: [{"bar": 10, "line": 20}, {"bar": 15, "line": 15}, {"bar": 8, "line": 25}],
    label: "Sales vs Target",
    name: "combo chart",
  },
  "mini-stacked-area-chart": {
    data: [[10,20,30,40], [20,15,25,35], [5,10,15,20]],
    label: "Resource allocation",
    name: "stacked area chart",
  },
  "mini-stream-chart": {
    data: [[28,22,19,19,22,26,27,27,29,33,33,30,28,29,31,33,33,31,30,30,27,23,23,27,31,28,22,18,18,18],[14,24,32,37,37,32,26,17,15,17,22,25,27,31,31,26,18,18,23,30,30,28,24,25,26,29,31,28,22,11],[18,24,30,31,30,25,25,24,28,25,25,23,25,25,26,27,27,27,25,26,26,28,27,24,17,13,15,21,27,30],[21,27,31,31,33,31,28,24,21,24,23,21,18,21,26,29,27,23,23,22,24,23,24,24,19,15,14,19,23,24]],
    label: "Organic volume",
    name: "stream chart",
  },
  "mini-radial-bar-chart": {
    data: [{"value": 70, "color": "#8b5cf6"}, {"value": 50, "color": "#3b82f6"}, {"value": 90, "color": "#10b981"}],
    label: "Activity rings",
    name: "radial bar chart",
  },
  "mini-ohlc-chart": {
    data: [[100,110,95,105], [105,105,90,95], [95,115,90,110]],
    label: "Daily asset price",
    name: "OHLC chart",
  },
  "mini-candlestick-chart": {
    data: [[100,110,95,105], [105,105,90,95], [95,115,90,110]],
    label: "Daily asset price",
    name: "candlestick chart",
  },
  "mini-progress-chart": {
    data: [75],
    label: "Server load percentage",
    name: "progress chart",
  },
  "mini-gauge-chart": {
    data: [65, 0, 100],
    label: "Speedometer gauge",
    name: "gauge chart",
  },
  "mini-pie-chart": {
    data: [42, 27, 18, 13],
    label: "Traffic sources by share",
    name: "pie chart",
  },
  "mini-half-pie-chart": {
    data: [58, 25, 17],
    label: "Plan adoption by tier",
    name: "half-pie chart",
  },
});

const form = document.querySelector("#chart-form");
const chartType = document.querySelector("#chart-type");
const chartData = document.querySelector("#chart-data");
const chartLabel = document.querySelector("#chart-label");
const chartPreview = document.querySelector("#chart-preview");
const previewLabel = document.querySelector("#preview-label");
const markupOutput = document.querySelector("#markup-output");
const formStatus = document.querySelector("#form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderPreview();
});

chartType.addEventListener("change", () => {
  const example = chartExamples[chartType.value];
  chartData.value = JSON.stringify(example.data);
  chartLabel.value = example.label;
  renderPreview();
});

renderPreview();

function renderPreview() {
  const data = parseData(chartData.value);
  if (!data) return;

  const tagName = chartType.value;
  const label = chartLabel.value.trim() || `Example ${chartExamples[tagName].name}`;
  const chart = document.createElement(tagName);

  chart.setAttribute("data", JSON.stringify(data));
  chart.setAttribute("label", label);
  chartPreview.replaceChildren(chart);
  previewLabel.textContent = `Rendering ${tagName}`;
  markupOutput.textContent = createMarkup(tagName, data, label);
  chartData.setAttribute("aria-invalid", "false");
  formStatus.dataset.state = "success";
  formStatus.textContent = `Updated ${chartExamples[tagName].name} with ${data.length} values.`;
}

function parseData(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new TypeError("Enter a valid JSON array.");
    }

    return parsed;
  } catch (error) {
    chartData.setAttribute("aria-invalid", "true");
    formStatus.dataset.state = "error";
    formStatus.textContent = error instanceof Error ? error.message : "Enter valid chart data.";
    return null;
  }
}

function createMarkup(tagName, data, label) {
  return `<${tagName}\n  data='${JSON.stringify(data)}'\n  label="${escapeAttribute(label)}"\n></${tagName}>`;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

// Tab logic for Framework Integrations
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('[role="tabpanel"]');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(p => p.hidden = true);
    
    // Activate current
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panelId = btn.getAttribute('aria-controls');
    document.getElementById(panelId).hidden = false;
  });
});

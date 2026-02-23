const PIGMENTS = [
  { key: "cyan", name: "Cyan", rgb: [0, 211, 231] },
  { key: "magenta", name: "Magenta", rgb: [255, 46, 168] },
  { key: "yellow", name: "Yellow", rgb: [255, 212, 71] },
  { key: "white", name: "White", rgb: [255, 255, 255] },
  { key: "black", name: "Black", rgb: [10, 15, 25] },
];

const MILESTONES = [75, 90, 95, 97, 98, 99];

const state = {
  targetWeights: randomWeights(),
  sliderValues: randomWeights(),
  guesses: [],
  reached: {},
  pieMode: "segments",
  submittedRGB: null,
};

const targetSwatch = document.getElementById("targetSwatch");
const pieChart = document.getElementById("pieChart");
const pieCaption = document.getElementById("pieCaption");
const slidersWrap = document.getElementById("sliders");
const latestAccuracy = document.getElementById("latestAccuracy");
const historyList = document.getElementById("historyList");
const shareText = document.getElementById("shareText");

const guessBtn = document.getElementById("guessBtn");
const randomizeBtn = document.getElementById("randomizeBtn");
const newGameBtn = document.getElementById("newGameBtn");
const copyShareBtn = document.getElementById("copyShareBtn");

buildSliders();
renderAll();

randomizeBtn.addEventListener("click", () => {
  state.sliderValues = randomWeights();
  state.pieMode = "segments";
  state.submittedRGB = null;
  syncSliderUI();
  renderAll();
});

guessBtn.addEventListener("click", () => {
  const normalized = normalizeWeights(state.sliderValues);
  const score = calcAccuracy(state.targetWeights, normalized);
  const rgb = mixToRGB(normalized);

  state.guesses.unshift({
    score,
    mix: normalized,
    rgb,
    sliderValues: { ...state.sliderValues },
  });

  state.pieMode = "solid";
  state.submittedRGB = rgb;

  trackMilestones(score);
  renderAll();
});

newGameBtn.addEventListener("click", () => {
  state.targetWeights = randomWeights();
  state.sliderValues = randomWeights();
  state.guesses = [];
  state.reached = {};
  state.pieMode = "segments";
  state.submittedRGB = null;
  syncSliderUI();
  renderAll();
});

copyShareBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareText.textContent);
    copyShareBtn.textContent = "Copied";
    setTimeout(() => {
      copyShareBtn.textContent = "Copy";
    }, 1100);
  } catch {
    copyShareBtn.textContent = "Copy failed";
    setTimeout(() => {
      copyShareBtn.textContent = "Copy";
    }, 1100);
  }
});

function buildSliders() {
  const fragment = document.createDocumentFragment();

  for (const pigment of PIGMENTS) {
    const row = document.createElement("div");
    row.className = "slider-row";

    const label = document.createElement("div");
    label.className = "slider-label";
    label.textContent = pigment.name;

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "0.1";
    input.value = state.sliderValues[pigment.key].toString();
    input.dataset.pigment = pigment.key;
    input.style.background = sliderTrackColor(pigment.key);

    const value = document.createElement("div");
    value.className = "value-pill";
    value.id = `val-${pigment.key}`;

    input.addEventListener("input", (event) => {
      const key = event.target.dataset.pigment;
      const next = Number(event.target.value);
      state.sliderValues[key] = Number.isFinite(next) ? next : 0;
      state.pieMode = "segments";
      state.submittedRGB = null;
      renderAll();
    });

    row.append(label, input, value);
    fragment.appendChild(row);
  }

  slidersWrap.appendChild(fragment);
  syncSliderUI();
}

function syncSliderUI() {
  const inputs = slidersWrap.querySelectorAll("input[type='range']");
  for (const input of inputs) {
    const key = input.dataset.pigment;
    input.value = state.sliderValues[key].toString();
  }
}

function renderAll() {
  const normalized = normalizeWeights(state.sliderValues);
  const targetRGB = mixToRGB(state.targetWeights);

  applyTheme(targetRGB);

  for (const pigment of PIGMENTS) {
    const key = pigment.key;
    const valueEl = document.getElementById(`val-${key}`);
    valueEl.textContent = `${state.sliderValues[key].toFixed(1)}%`;
  }

  renderPie(normalized);
  renderHistory();
  renderLatestAccuracy();
  renderShare();
  renderLastGuessSwatch();
}

function renderLastGuessSwatch() {
  if (state.guesses.length === 0) {
    targetSwatch.style.opacity = "0";
    targetSwatch.style.visibility = "hidden";
    return;
  }

  let displayRGB;
  if (state.pieMode === "solid") {
    if (state.guesses.length > 1) {
      displayRGB = state.guesses[1].rgb;
    } else {
      targetSwatch.style.opacity = "0";
      targetSwatch.style.visibility = "hidden";
      return;
    }
  } else {
    displayRGB = state.guesses[0].rgb;
  }

  targetSwatch.style.background = rgbCss(displayRGB);
  targetSwatch.style.opacity = "1";
  targetSwatch.style.visibility = "visible";

  const lum = relativeLuminance(displayRGB);
  targetSwatch.style.color = lum > 0.56 ? "#11243b" : "#f2f7ff";
}

function renderPie(normalized) {
  if (state.pieMode === "solid" && state.submittedRGB) {
    pieChart.style.background = rgbCss(state.submittedRGB);
    pieCaption.textContent = "Submitted guess color";
  } else {
    pieChart.style.background = buildPieGradient(normalized);
    pieCaption.textContent = "Relative mix breakdown";
  }
}

function renderLatestAccuracy() {
  if (state.guesses.length === 0) {
    latestAccuracy.textContent = "No guesses yet";
    return;
  }
  latestAccuracy.textContent = `Latest match: ${formatScore(state.guesses[0].score)}%`;
}

function renderHistory() {
  historyList.innerHTML = "";

  for (let i = 0; i < state.guesses.length; i += 1) {
    const guess = state.guesses[i];
    const item = document.createElement("li");

    const sw = document.createElement("div");
    sw.className = "row-swatch";
    sw.style.background = rgbCss(guess.rgb);

    const text = document.createElement("div");
    text.className = "row-text";
    text.textContent = formatMix(guess.mix);

    const score = document.createElement("div");
    score.className = "row-score";
    score.textContent = `${formatScore(guess.score)}%`;

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "restore-btn ghost";
    restoreBtn.textContent = "Restore";
    restoreBtn.addEventListener("click", () => {
      if (guess.sliderValues) {
        state.sliderValues = { ...guess.sliderValues };
        state.pieMode = "segments";
        state.submittedRGB = null;
        syncSliderUI();
        renderAll();
      }
    });

    item.append(sw, text, score, restoreBtn);
    historyList.appendChild(item);
  }
}

function renderShare() {
  const lines = MILESTONES.map((m) => {
    const value = state.reached[m];
    if (!value) {
      return `${m}%: not yet`;
    }
    return `${m}%: ${value} ${value === 1 ? "guess" : "guesses"}`;
  });

  shareText.textContent = lines.join("\n");
}

function trackMilestones(score) {
  for (const milestone of MILESTONES) {
    if (score >= milestone && !state.reached[milestone]) {
      state.reached[milestone] = state.guesses.length;
    }
  }
}

function normalizeWeights(raw) {
  let sum = 0;
  for (const pigment of PIGMENTS) {
    sum += Math.max(0, raw[pigment.key] || 0);
  }

  if (sum <= 0) {
    const equal = 100 / PIGMENTS.length;
    return Object.fromEntries(PIGMENTS.map((p) => [p.key, equal]));
  }

  const normalized = {};
  for (const pigment of PIGMENTS) {
    const v = Math.max(0, raw[pigment.key] || 0);
    normalized[pigment.key] = (v / sum) * 100;
  }

  return normalized;
}

function mixToRGB(weightsPercent) {
  const accum = [0, 0, 0];

  for (const pigment of PIGMENTS) {
    const weight = (weightsPercent[pigment.key] || 0) / 100;
    accum[0] += pigment.rgb[0] * weight;
    accum[1] += pigment.rgb[1] * weight;
    accum[2] += pigment.rgb[2] * weight;
  }

  return accum.map((v) => Math.max(0, Math.min(255, Math.round(v))));
}

function calcAccuracy(target, guess) {
  const t = mixToRGB(target);
  const g = mixToRGB(guess);

  const dr = t[0] - g[0];
  const dg = t[1] - g[1];
  const db = t[2] - g[2];
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  const maxDistance = Math.sqrt(255 * 255 * 3);
  const accuracy = Math.max(0, (1 - distance / maxDistance) * 100);
  return accuracy;
}

function formatMix(weights) {
  return PIGMENTS.map((p) => `${p.name[0]} ${weights[p.key].toFixed(1)}%`).join("  ");
}

function buildPieGradient(weights) {
  let start = 0;
  const slices = [];

  for (const pigment of PIGMENTS) {
    const end = start + weights[pigment.key];
    const color = rgbCss(pigment.rgb);
    slices.push(`${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    start = end;
  }

  return `conic-gradient(${slices.join(",")})`;
}

function randomWeights() {
  const values = [];
  for (let i = 0; i < PIGMENTS.length; i += 1) {
    values.push(Math.random());
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return Object.fromEntries(
    PIGMENTS.map((pigment, idx) => [pigment.key, (values[idx] / sum) * 100])
  );
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function formatScore(score) {
  if (score >= 99) {
    return score.toFixed(2);
  }
  return score.toFixed(1);
}

function applyTheme(targetRGB) {
  const root = document.documentElement;
  root.style.setProperty("--target-bg", rgbCss(targetRGB));

  const lum = relativeLuminance(targetRGB);
  const darkText = lum > 0.56;

  if (darkText) {
    root.style.setProperty("--ink", "#11243b");
    root.style.setProperty("--muted", "rgba(17, 36, 59, 0.82)");
  } else {
    root.style.setProperty("--ink", "#f2f7ff");
    root.style.setProperty("--muted", "rgba(242, 247, 255, 0.86)");
  }
}

function relativeLuminance([r, g, b]) {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function sliderTrackColor(key) {
  const map = {
    cyan: "linear-gradient(90deg, rgba(0, 211, 231, 0.3), rgba(0, 211, 231, 0.9))",
    magenta: "linear-gradient(90deg, rgba(255, 46, 168, 0.3), rgba(255, 46, 168, 0.9))",
    yellow: "linear-gradient(90deg, rgba(255, 212, 71, 0.3), rgba(255, 212, 71, 0.9))",
    white: "linear-gradient(90deg, rgba(200, 208, 224, 0.35), rgba(255, 255, 255, 0.95))",
    black: "linear-gradient(90deg, rgba(79, 88, 104, 0.2), rgba(10, 15, 25, 0.95))",
  };

  return map[key] || "linear-gradient(90deg, rgba(0,0,0,0.2), rgba(255,255,255,0.4))";
}

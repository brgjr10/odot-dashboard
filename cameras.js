import { formatTime } from "./time.js";

export function createCameraDashboard({ mountEl, viewer, getSettings, onAnyRefresh }) {
  let settings = getSettings();

  let globalAlt = false;
  let paused = false;
  let refreshTimer = null;
  let camState = [];

  function applySettings() {
    settings = getSettings();
    rebuild();
    restartTimer();
  }

  function start() {
    rebuild();
    restartTimer();
  }

  function rebuild() {
    mountEl.innerHTML = "";
    camState = settings.cameras.map((camera) => renderCameraCard(camera));
  }

  function restartTimer() {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      if (paused) return;
      refreshAllNow();
    }, settings.cameraRefreshSeconds * 1000);
  }

  function refreshAllNow() {
    camState.forEach((c) => c.refresh());
    if (typeof onAnyRefresh === "function") onAnyRefresh();
  }

  function setGlobalAlt(next) {
    globalAlt = Boolean(next);
    camState.forEach((c) => c.setAlt(globalAlt));
  }

  function getGlobalAlt() {
    return globalAlt;
  }

  function setPaused(next) {
    paused = Boolean(next);
  }

  function isPaused() {
    return paused;
  }

  function renderCameraCard(camera) {
    const card = document.createElement("article");
    card.className = "cam";

    const img = document.createElement("img");
    img.className = "cam__img";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = camera.label;

    const actions = document.createElement("div");
    actions.className = "cam__actions";

    const btnAlt = document.createElement("button");
    btnAlt.className = "chip";
    btnAlt.type = "button";
    btnAlt.textContent = "ALT";
    btnAlt.setAttribute("aria-pressed", "false");

    const btnView = document.createElement("button");
    btnView.className = "chip";
    btnView.type = "button";
    btnView.textContent = "VIEW";
    btnView.setAttribute("aria-pressed", "false");

    const btnErr = document.createElement("button");
    btnErr.className = "chip chip--danger";
    btnErr.type = "button";
    btnErr.textContent = "ERR";
    btnErr.title = "Image failed to load. Click to retry.";
    btnErr.hidden = true;

    actions.append(btnAlt, btnView, btnErr);

    const label = document.createElement("div");
    label.className = "cam__label";

    const labelLeft = document.createElement("div");
    const labelRight = document.createElement("small");

    label.append(labelLeft, labelRight);

    card.append(img, actions, label);
    mountEl.appendChild(card);

    let usingAlt = false;
    let hadError = false;

    function refresh() {
      const url = usingAlt ? camera.alt : camera.src;
      img.src = `${url}?t=${Date.now()}`;
      labelLeft.textContent = usingAlt ? camera.altLabel : camera.label;
      labelRight.textContent = formatTime(Date.now());
    }

    function setAlt(next) {
      usingAlt = Boolean(next);
      btnAlt.setAttribute("aria-pressed", String(usingAlt));
      refresh();
    }

    btnAlt.addEventListener("click", () => setAlt(!usingAlt));

    btnView.addEventListener("click", () => {\n      viewer.open(camera, usingAlt);\n    });\n\n    img.addEventListener("click", () => {\n      viewer.open(camera, usingAlt);\n    });

    btnErr.addEventListener("click", () => {
      hadError = false;
      btnErr.hidden = true;
      refresh();
    });

    img.addEventListener("error", () => {
      hadError = true;
      btnErr.hidden = false;
    });

    img.addEventListener("load", () => {
      if (!hadError) btnErr.hidden = true;
    });

    setAlt(globalAlt);

    return { refresh, setAlt };
  }

  return {
    start,
    applySettings,
    refreshAllNow,
    setGlobalAlt,
    getGlobalAlt,
    setPaused,
    isPaused
  };
}
window.__ODOT_APP_BOOTED = true;\nimport { DEFAULT_SETTINGS, FALLBACK_COORDS } from "./defaults.js";
import { loadSettings, normalizeSettings, resetSettings, saveSettings } from "./storage.js";
import { formatTime } from "./time.js";
import { createCameraDashboard } from "./cameras.js";
import { createWeatherSidebar } from "./weather.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const els = {
  btnAltAll: document.getElementById("btn-alt-all"),
  btnPause: document.getElementById("btn-pause"),
  btnSettings: document.getElementById("btn-settings"),
  btnRefreshNow: document.getElementById("btn-refresh-now"),
  badgeRefresh: document.getElementById("badge-refresh"),
  badgeLast: document.getElementById("badge-last"),
  camGrid: document.getElementById("cam-grid"),
  settingsDialog: document.getElementById("settings-dialog"),
  settingsForm: document.getElementById("settings-form"),
  inpApiKey: document.getElementById("inp-api-key"),
  chkGeolocate: document.getElementById("chk-geolocate"),
  btnUseFallback: document.getElementById("btn-use-fallback"),
  inpLat: document.getElementById("inp-lat"),
  inpLon: document.getElementById("inp-lon"),
  inpRefreshSeconds: document.getElementById("inp-refresh-seconds"),
  inpWeatherMinutes: document.getElementById("inp-weather-minutes"),
  inpCameras: document.getElementById("inp-cameras"),
  btnReset: document.getElementById("btn-reset")
};

let settings = loadSettings(DEFAULT_SETTINGS);

const viewer = createViewer();
const cameras = createCameraDashboard({
  mountEl: els.camGrid,
  viewer,
  getSettings: () => settings,
  onAnyRefresh: () => {
    els.badgeLast.textContent = `Last update: ${formatTime(Date.now())}`;
  }
});

const weather = createWeatherSidebar({
  getSettings: () => settings
});

syncTopBar();
weather.refresh({ reason: "startup" });
cameras.start();

els.btnAltAll.addEventListener("click", () => {
  const next = !cameras.getGlobalAlt();
  cameras.setGlobalAlt(next);
  els.btnAltAll.setAttribute("aria-pressed", String(next));
});

els.btnPause.addEventListener("click", () => {
  const next = !cameras.isPaused();
  cameras.setPaused(next);
  els.btnPause.setAttribute("aria-pressed", String(next));
  els.btnPause.textContent = next ? "Resume" : "Pause";
});

els.btnRefreshNow.addEventListener("click", () => cameras.refreshAllNow());
els.btnSettings.addEventListener("click", () => openSettings());

els.btnUseFallback.addEventListener("click", () => {
  els.inpLat.value = String(FALLBACK_COORDS.lat);
  els.inpLon.value = String(FALLBACK_COORDS.lon);
});

els.btnReset.addEventListener("click", () => {
  settings = resetSettings(DEFAULT_SETTINGS);
  saveSettings(settings);
  closeSettings();
  applySettings();
});

els.settingsForm.addEventListener("submit", (e) => {
  const submitter = e.submitter;
  if (submitter && submitter.value === "cancel") return;
  if (submitter && submitter.value === "close") return;

  if (submitter && submitter.value === "save") {
    e.preventDefault();
    const updated = readSettingsFromForm();
    if (!updated) return;

    settings = updated;
    saveSettings(settings);
    closeSettings();
    applySettings();
  }
});

function applySettings() {
  syncTopBar();
  cameras.applySettings();
  weather.applySettings();
  weather.refresh({ reason: "settings-change" });
}

function syncTopBar() {
  els.badgeRefresh.textContent = `Refreshing every ${settings.cameraRefreshSeconds}s`;
}

function openSettings() {
  els.inpApiKey.value = settings.ohgoApiKey;
  els.chkGeolocate.checked = settings.useGeolocation;
  els.inpLat.value = String(settings.coords.lat);
  els.inpLon.value = String(settings.coords.lon);
  els.inpRefreshSeconds.value = String(settings.cameraRefreshSeconds);
  els.inpWeatherMinutes.value = String(settings.weatherRefreshMinutes);
  els.inpCameras.value = JSON.stringify(settings.cameras, null, 2);
  els.settingsDialog.showModal();
}

function closeSettings() {
  els.settingsDialog.close();
}

function readSettingsFromForm() {
  const apiKey = String(els.inpApiKey.value || "").trim();
  const useGeolocation = Boolean(els.chkGeolocate.checked);
  const lat = Number.parseFloat(String(els.inpLat.value || "").trim());
  const lon = Number.parseFloat(String(els.inpLon.value || "").trim());
  const cameraRefreshSeconds = Number.parseInt(String(els.inpRefreshSeconds.value || "").trim(), 10);
  const weatherRefreshMinutes = Number.parseInt(String(els.inpWeatherMinutes.value || "").trim(), 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    alert("Latitude/Longitude must be valid numbers.");
    return null;
  }

  let camerasList;
  try {
    camerasList = JSON.parse(String(els.inpCameras.value || "[]"));
  } catch {
    alert("Cameras JSON is invalid.");
    return null;
  }

  return normalizeSettings(DEFAULT_SETTINGS, {
    ohgoApiKey,
    useGeolocation,
    coords: { lat, lon },
    cameraRefreshSeconds,
    weatherRefreshMinutes,
    cameras: camerasList
  });
}

function createViewer() {
  const dialog = document.getElementById("viewer-dialog");
  const img = document.getElementById("viewer-img");
  const title = document.getElementById("viewer-title");
  const sub = document.getElementById("viewer-sub");
  const btnAlt = document.getElementById("btn-viewer-alt");

  let state = null; // { camera, usingAlt }

  btnAlt.addEventListener("click", () => {
    if (!state) return;
    state.usingAlt = !state.usingAlt;
    btnAlt.setAttribute("aria-pressed", String(state.usingAlt));
    render();
  });

  function render() {
    if (!state) return;
    const camera = state.camera;
    const usingAlt = state.usingAlt;
    title.textContent = usingAlt ? camera.altLabel : camera.label;
    sub.textContent = usingAlt ? "Alternate view" : "Primary view";
    img.alt = title.textContent;
    img.src = `${usingAlt ? camera.alt : camera.src}?t=${Date.now()}`;
  }

  return {
    open(camera, usingAlt) {
      state = { camera, usingAlt: Boolean(usingAlt) };
      btnAlt.setAttribute("aria-pressed", String(state.usingAlt));
      render();
      dialog.showModal();
    }
  };
}
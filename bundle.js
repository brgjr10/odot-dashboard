(() => {
  window.__ODOT_APP_BOOTED = true;
  try {
    window.dispatchEvent(new Event("odot-app-booted"));
    const el = document.getElementById("boot-warning");
    if (el) el.hidden = true;
  } catch {}

  const FALLBACK_COORDS = { lat: 41.0814, lon: -81.519 };

  const DEFAULT_SETTINGS = {
    apiKey: "",
    useGeolocation: true,
    coords: FALLBACK_COORDS,
    cameraRefreshSeconds: 5,
    weatherRefreshMinutes: 10,
    ohgoApiKey: "",
    trafficEnabled: true,
    trafficIncludeSlowdowns: true,
    trafficRadiusMiles: 25,
    trafficRefreshSeconds: 60,
    trafficNotify: false,
    cameras: [
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE082.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE202.jpg",
        label: "I-224 [State St.] (Barberton)",
        altLabel: "I-224 ALT - Facing East"
      },
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE104a-L.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/CCTV6083.jpg",
        label: "I-76 [Tallmadge Rd.] (Brimfield)",
        altLabel: "I-76 ALT - WB View"
      },
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE094a-L.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE097-L.jpg",
        label: "I-76 [E. Market St.] (Ellet)",
        altLabel: "I-76 ALT - Ramp View"
      },
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE026-L.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE024-L.jpg",
        label: "SR 8 [Howe Ave.] (Cuyahoga Falls)",
        altLabel: "SR 8 ALT - Southbound"
      },
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE166a-L.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/I-77_at_Hillside_Rd.jpg",
        label: "I-77 [Copley Rd.] (W. Akron)",
        altLabel: "I-77 ALT - Hillside Rd"
      },
      {
        src: "https://itscameras.dot.state.oh.us/images/CLE/CLE096.jpg",
        alt: "https://itscameras.dot.state.oh.us/images/CLE/CCTV3102.jpg",
        label: "I-480 [I-80] (Streetsboro)",
        altLabel: "I-480 ALT - WB"
      }
    ]
  };

  const STORAGE_KEY = "odot-dashboard:settings:v1";
  const TRAFFIC_SEEN_KEY = "odot-dashboard:trafficSeen:v1";  const clone = globalThis.structuredClone
    ? (x) => globalThis.structuredClone(x)
    : (x) => JSON.parse(JSON.stringify(x));

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function sanitizeCameras(cameras, fallback) {
    const cleaned = cameras
      .filter((c) => c && typeof c === "object")
      .map((c) => ({
        src: typeof c.src === "string" ? c.src : "",
        alt: typeof c.alt === "string" ? c.alt : "",
        label: typeof c.label === "string" ? c.label : "",
        altLabel: typeof c.altLabel === "string" ? c.altLabel : ""
      }))
      .filter((c) => c.src && c.alt && c.label && c.altLabel);

    return cleaned.length ? cleaned : clone(fallback);
  }

  function mergeSettings(defaults, override) {
    const out = clone(defaults);

    if (override && typeof override === "object") {
      if (typeof override.apiKey === "string") out.apiKey = override.apiKey;
      if (typeof override.useGeolocation === "boolean") out.useGeolocation = override.useGeolocation;

      if (override.coords && typeof override.coords === "object") {
        if (typeof override.coords.lat === "number") out.coords.lat = override.coords.lat;
        if (typeof override.coords.lon === "number") out.coords.lon = override.coords.lon;
      }

      if (Number.isFinite(override.cameraRefreshSeconds)) {
        out.cameraRefreshSeconds = clamp(Math.trunc(override.cameraRefreshSeconds), 5, 60);
      }

      if (Number.isFinite(override.weatherRefreshMinutes)) {
        out.weatherRefreshMinutes = clamp(Math.trunc(override.weatherRefreshMinutes), 2, 60);
      }

      
      if (typeof override.ohgoApiKey === "string") out.ohgoApiKey = override.ohgoApiKey;
      if (typeof override.trafficEnabled === "boolean") out.trafficEnabled = override.trafficEnabled;
      if (typeof override.trafficIncludeSlowdowns === "boolean") out.trafficIncludeSlowdowns = override.trafficIncludeSlowdowns;
      if (Number.isFinite(override.trafficRadiusMiles)) out.trafficRadiusMiles = clamp(Math.trunc(override.trafficRadiusMiles), 1, 200);
      if (Number.isFinite(override.trafficRefreshSeconds)) out.trafficRefreshSeconds = clamp(Math.trunc(override.trafficRefreshSeconds), 15, 600);
      if (typeof override.trafficNotify === "boolean") out.trafficNotify = override.trafficNotify;if (Array.isArray(override.cameras)) {
        out.cameras = sanitizeCameras(override.cameras, defaults.cameras);
      }
    }

    return out;
  }

  function loadSettings(fallback) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(fallback);
      const parsed = JSON.parse(raw);
      return mergeSettings(fallback, parsed);
    } catch {
      return clone(fallback);
    }
  }

  function normalizeSettings(defaults, override) {
    try {
      return mergeSettings(defaults, override);
    } catch {
      return clone(defaults);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function resetSettings(fallback) {
    localStorage.removeItem(STORAGE_KEY);
    return clone(fallback);
  }

  function formatTime(ts = Date.now()) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
    } catch {
      return "-";
    }
  }

  function toTitleCase(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
  }

  function weatherEmoji(main, iconCode) {
    const m = String(main || "").toLowerCase();
    const night = String(iconCode || "").endsWith("n");

    const sun = "\u2600\uFE0F";
    const moon = "\uD83C\uDF19";
    const clouds = "\u2601\uFE0F";
    const rain = "\uD83C\uDF27\uFE0F";
    const drizzle = "\uD83C\uDF26\uFE0F";
    const thunder = "\u26C8\uFE0F";
    const snow = "\uD83C\uDF28\uFE0F";
    const fog = "\uD83C\uDF2B\uFE0F";
    const wind = "\uD83D\uDCA8";
    const tornado = "\uD83C\uDF2A";
    const thermo = "\uD83C\uDF21\uFE0F";

    if (m === "clear") return night ? moon : sun;
    if (m === "clouds") return clouds;
    if (m === "rain") return rain;
    if (m === "drizzle") return drizzle;
    if (m === "thunderstorm") return thunder;
    if (m === "snow") return snow;
    if (/(mist|fog|haze|smoke|dust|sand|ash)/.test(m)) return fog;
    if (m === "squall") return wind;
    if (m === "tornado") return tornado;

    return thermo;
  }
  function stableHash(str) {
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
  }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  function getTrafficId(item) {
    if (!item || typeof item !== "object") return stableHash(String(item));

    const direct = firstDefined(
      item.id,
      item.Id,
      item.incidentId,
      item.IncidentId,
      item.slowdownId,
      item.SlowdownId,
      item.eventId,
      item.EventId
    );

    if (direct !== undefined) return String(direct);

    let link;
    if (Array.isArray(item.links)) {
      for (let i = 0; i < item.links.length; i++) {
        const l = item.links[i];
        if (l && typeof l.href === "string") {
          link = l.href;
          break;
        }
      }
    }

    if (link) return link;

    const coords =
      item.geometry && item.geometry.coordinates
        ? item.geometry.coordinates
        : item.Geometry && item.Geometry.Coordinates
          ? item.Geometry.Coordinates
          : undefined;

    const parts = {
      t: firstDefined(item.type, item.Type),
      d: firstDefined(item.description, item.Description),
      r: firstDefined(item.route, item.Route, item.road, item.Road),
      x: coords
    };

    return stableHash(JSON.stringify(parts));
  }

  function loadSeenTrafficIds() {
    try {
      const raw = localStorage.getItem(TRAFFIC_SEEN_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function saveSeenTrafficIds(ids) {
    try {
      const unique = Array.from(new Set(ids.map(String))).slice(-800);
      localStorage.setItem(TRAFFIC_SEEN_KEY, JSON.stringify(unique));
    } catch {}
  }

  function requestNotificationPermissionIfNeeded(settings) {
    if (!settings || !settings.trafficNotify) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {}
    }
  }
  function createCameraDashboard({ mountEl, viewer, getSettings, onAnyRefresh }) {
    let settings = getSettings();

    let globalAlt = false;
    let paused = false;
    let refreshTimer = null;
    let nextRefreshAt = null;
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
      nextRefreshAt = Date.now() + settings.cameraRefreshSeconds * 1000;
      refreshTimer = window.setInterval(() => {
        if (document.hidden) return;
        if (paused) return;
        refreshAllNow();
      }, settings.cameraRefreshSeconds * 1000);
    }

    function refreshAllNow() {
      const stepMs = 150;
      camState.forEach((c, i) => {
        window.setTimeout(() => c.refresh(), i * stepMs);
      });
      nextRefreshAt = Date.now() + settings.cameraRefreshSeconds * 1000;
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

    function retryFailed() {
      camState.forEach((c) => {
        try {
          if (c.hasError && c.hasError()) c.retry();
        } catch {}
      });
    }

    function getStatus() {
      const errors = camState
        .filter((c) => {
          try {
            return c.hasError && c.hasError();
          } catch {
            return false;
          }
        })
        .map((c) => ({
          label: c.getLabel ? c.getLabel() : "Unknown",
          lastErrorAt: c.getLastErrorAt ? c.getLastErrorAt() : null,
          errorCount: c.getErrorCount ? c.getErrorCount() : 0
        }));

      return {
        paused,
        refreshSeconds: settings.cameraRefreshSeconds,
        nextRefreshAt,
        cameraCount: camState.length,
        errorCount: errors.length,
        errors
      };
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
      let lastOkAt = null;
      let lastErrAt = null;
      let errorCount = 0;

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

      btnView.addEventListener("click", () => {
        viewer.open(camera, usingAlt);
      });

      img.addEventListener("click", () => {
        viewer.open(camera, usingAlt);
      });

      btnErr.addEventListener("click", () => {
        hadError = false;
        btnErr.hidden = true;
        refresh();
      });

      img.addEventListener("error", () => {
        hadError = true;
        lastErrAt = Date.now();
        errorCount += 1;
        btnErr.hidden = false;
      });

      img.addEventListener("load", () => {
        lastOkAt = Date.now();
        if (hadError) hadError = false;
        btnErr.hidden = true;
      });

      setAlt(globalAlt);

      return {
        refresh,
        setAlt,
        hasError: () => hadError,
        retry: () => {
          hadError = false;
          btnErr.hidden = true;
          refresh();
        },
        getLabel: () => camera.label,
        getLastErrorAt: () => lastErrAt,
        getErrorCount: () => errorCount
      };
    }

    return {
      start,
      applySettings,
      refreshAllNow,
      setGlobalAlt,
      getGlobalAlt,
      setPaused,
      isPaused,
      retryFailed,
      getStatus
    };
  }

  function createWeatherSidebar({ getSettings }) {
    const els = {
      weatherHeader: document.getElementById("weather-header"),
      weatherSub: document.getElementById("weather-sub"),
      weatherCurrent: document.getElementById("weather-current"),
      painLevel: document.getElementById("pain-level"),
      painBox: document.getElementById("pain-box"),
      riskLevel: document.getElementById("risk-level"),
      riskBox: document.getElementById("risk-box"),
      btnWeatherNow: document.getElementById("btn-weather-now")
    };

    let settings = getSettings();
    let weatherTimer = null;
    let busy = false;

    els.btnWeatherNow.addEventListener("click", () => refresh({ reason: "manual" }));

    function applySettings() {
      settings = getSettings();
      restartTimer();
    }

    function restartTimer() {
      if (weatherTimer) window.clearInterval(weatherTimer);
      weatherTimer = window.setInterval(() => refresh({ reason: "interval" }), settings.weatherRefreshMinutes * 60 * 1000);
    }

    async function refresh({ reason }) {
      if (busy) return;
      settings = getSettings();

      if (!settings.apiKey) {
        renderNotConfigured();
        restartTimer();
        return;
      }

      busy = true;
      els.weatherSub.textContent = reason === "manual" ? "Updating..." : "Refreshing...";

      try {
        const coords = await resolveCoords(settings);
        const data = await fetchCurrentWeather({ coords, apiKey: settings.apiKey });
        renderWeather(data);
        restartTimer();
      } catch (e) {
        renderError(e);
        restartTimer();
      } finally {
        busy = false;
      }
    }

    function renderNotConfigured() {
      els.weatherHeader.textContent = "Weather";
      els.weatherSub.textContent = "Not configured";
      els.weatherCurrent.innerHTML = '<div class="empty">Enter an OpenWeather API key in Settings.</div>';
      els.painLevel.textContent = "-";
      els.riskLevel.textContent = "-";
      els.painBox.innerHTML = "";
      els.riskBox.innerHTML = "";
    }

    function renderError(err) {
      const msg = normalizeError(err);
      els.weatherSub.textContent = "Error";
      els.weatherCurrent.innerHTML = `<div class="empty">Weather update failed: ${escapeHtml(msg)}</div>`;
    }

    function renderWeather(w) {
      const place = w && w.name ? w.name : "Current location";
      els.weatherHeader.textContent = `Weather - ${place}`;
      els.weatherSub.textContent = "Updated just now";

      const visibilityMiles = typeof w.visibility === "number" ? w.visibility / 1609.344 : null;
      const temp = safeRound(w && w.main && w.main.temp);
      const feels = safeRound(w && w.main && w.main.feels_like);
      const wind = safeRound(w && w.wind && w.wind.speed);
      const pressure = safeRound(w && w.main && w.main.pressure);
      const humidity = safeRound(w && w.main && w.main.humidity);

      const mainRaw = w && w.weather && w.weather[0] && w.weather[0].main ? String(w.weather[0].main) : "";
      const descRaw = w && w.weather && w.weather[0] && w.weather[0].description ? String(w.weather[0].description) : "-";
      const iconCode = w && w.weather && w.weather[0] && w.weather[0].icon ? String(w.weather[0].icon) : "";

      const main = toTitleCase(mainRaw);
      const desc = toTitleCase(descRaw);
      const iconHtml = iconCode
        ? `<img class="weathervis__img" src="https://openweathermap.org/img/wn/${encodeURIComponent(iconCode)}@2x.png" alt="${escapeHtml(desc)}" loading="lazy" decoding="async">`
        : weatherEmoji(mainRaw, iconCode);


      function scalePercent(v, min, max) {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
        return Math.round(clamp(((n - min) / (max - min)) * 100, 0, 100));
      }

      function pickColor(kind, v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return "rgba(255,255,255,0.22)";

        if (kind === "temp") {
          if (n < 32) return "#60a5fa";
          if (n < 55) return "#34d399";
          if (n < 80) return "#22c55e";
          if (n < 95) return "#f59e0b";
          return "#ef4444";
        }

        if (kind === "wind") {
          if (n < 10) return "#22c55e";
          if (n < 20) return "#f59e0b";
          if (n < 30) return "#f97316";
          return "#ef4444";
        }

        if (kind === "vis") {
          if (n < 1) return "#ef4444";
          if (n < 3) return "#f97316";
          if (n < 6) return "#f59e0b";
          return "#22c55e";
        }

        if (kind === "pressure") {
          if (n < 1005) return "#f59e0b";
          if (n <= 1025) return "#22c55e";
          return "#60a5fa";
        }

        if (kind === "humidity") {
          if (n < 30) return "#f59e0b";
          if (n < 60) return "#22c55e";
          if (n < 80) return "#38bdf8";
          return "#60a5fa";
        }

        return "rgba(255,255,255,0.22)";
      }

      function kvBar(pct, color) {
        const w = pct == null ? 0 : clamp(pct, 0, 100);
        const bg = color || "rgba(255,255,255,0.22)";
        return `<div class="kv__bar"><div class="progress progress--thin"><div class="progress__fill" style="width:${w}%;background:${bg}"></div></div></div>`;
      }

      const tempPct = scalePercent(temp, -10, 110);
      const windPct = scalePercent(wind, 0, 40);
      const visPct = scalePercent(visibilityMiles, 0, 10);
      const pressurePct = scalePercent(pressure, 970, 1050);
      const humidityPct = scalePercent(humidity, 0, 100);

      const tempBar = kvBar(tempPct, pickColor("temp", temp));
      const windBar = kvBar(windPct, pickColor("wind", wind));
      const visBar = kvBar(visPct, pickColor("vis", visibilityMiles));
      const pressureBar = kvBar(pressurePct, pickColor("pressure", pressure));
      const humidityBar = kvBar(humidityPct, pickColor("humidity", humidity));

      els.weatherCurrent.innerHTML = `
        <div class="weathervis">
          <div class="weathervis__icon">${iconHtml}</div>
          <div>
            <div class="weathervis__main">${escapeHtml(main || "Conditions")}</div>
            <div class="weathervis__desc">${escapeHtml(desc)}</div>
          </div>
        </div>
        <div class="kv">
          <div>Temperature</div><div>${temp == null ? "-" : `${temp}&deg;F`} (feels ${feels == null ? "-" : `${feels}&deg;F`})</div>
          ${tempBar}
          <div>Wind</div><div>${wind == null ? "-" : `${wind} mph`}</div>
          ${windBar}
          <div>Visibility</div><div>${visibilityMiles == null ? "-" : `${visibilityMiles.toFixed(1)} mi`}</div>
          ${visBar}
          <div>Pressure</div><div>${pressure == null ? "-" : `${pressure} hPa`}</div>
          ${pressureBar}
          <div>Humidity</div><div>${humidity == null ? "-" : `${humidity}%`}</div>
          ${humidityBar}
          <div>Conditions</div><div>${escapeHtml(desc)}</div>
        </div>
      `;

      const pain = calcPainRisk(w);
      els.painLevel.textContent = `${pain.level} (${pain.score}%)`;
      els.painBox.innerHTML = `
        <div class="kv">
          <div>Score</div><div>${pain.score}%</div>
        </div>
        <div class="progress" aria-label="Pain risk">
          <div class="progress__fill" style="width:${pain.score}%;background:${pain.color}"></div>
        </div>
        ${
          pain.reasons.length
            ? `<ul class="list">${pain.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
            : '<div class="empty">No major triggers detected.</div>'
        }
      `;

      const risk = calcDrivingRisk(w);
      els.riskLevel.textContent = `${risk.level} (${risk.score}%)`;
      els.riskBox.innerHTML = `
        <div class="kv">
          <div>Score</div><div>${risk.score}%</div>
          <div>Primary concern</div><div>${escapeHtml(risk.primary)}</div>
        </div>
        <div class="progress" aria-label="Driving risk">
          <div class="progress__fill" style="width:${risk.score}%;background:${risk.color}"></div>
        </div>
        ${
          risk.reasons.length
            ? `<ul class="list">${risk.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
            : '<div class="empty">No obvious hazards from current conditions.</div>'
        }
      `;
    }

    return { refresh, applySettings };
  }
  function createTrafficAlertsSidebar({ getSettings }) {
    const els = {
      sub: document.getElementById("traffic-sub"),
      box: document.getElementById("traffic-box"),
      btnNow: document.getElementById("btn-traffic-now")
    };

    let settings = getSettings();
    let timer = null;
    let busy = false;

    if (els.btnNow) els.btnNow.addEventListener("click", () => refresh({ reason: "manual" }));

    function applySettings() {
      settings = getSettings();
      restartTimer();
    }

    function restartTimer() {
      if (timer) window.clearInterval(timer);
      settings = getSettings();
      timer = window.setInterval(() => refresh({ reason: "interval" }), settings.trafficRefreshSeconds * 1000);
    }

    function extractList(raw) {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.items)) return raw.items;
        if (Array.isArray(raw.results)) return raw.results;
      }
      return [];
    }

    function getFirst(it) {
      for (let i = 1; i < arguments.length; i++) {
        const key = arguments[i];
        if (it && it[key] !== undefined && it[key] !== null) return it[key];
      }
      return undefined;
    }

    async function refresh({ reason }) {
      if (busy) return;
      settings = getSettings();

      if (!settings.trafficEnabled) {
        els.sub.textContent = "Disabled";
        els.box.innerHTML = '<div class="empty">Traffic alerts are disabled in Settings.</div>';
        restartTimer();
        return;
      }

      if (!settings.ohgoApiKey) {
        els.sub.textContent = "Not configured";
        els.box.innerHTML = '<div class="empty">Add your OHGO API key in Settings to see incidents near you.</div>';
        restartTimer();
        return;
      }

      busy = true;
      els.sub.textContent = reason === "manual" ? "Updating..." : "Refreshing...";

      try {
        const coords = await resolveCoords(settings);
        const radius = `${coords.lat},${coords.lon},${settings.trafficRadiusMiles}`;

        const incidentsRaw = await fetchOhgo("incidents", { apiKey: settings.ohgoApiKey, radius });
        const slowdownsRaw = settings.trafficIncludeSlowdowns
          ? await fetchOhgo("dangerous-slowdowns", { apiKey: settings.ohgoApiKey, radius })
          : [];

        const incidents = extractList(incidentsRaw);
        const slowdowns = extractList(slowdownsRaw);

        render({ incidents, slowdowns });
        notifyNew({ incidents, slowdowns });
      } catch (e) {
        const msg = normalizeError(e);
        els.sub.textContent = "Error";
        els.box.innerHTML = `<div class="empty">Traffic update failed: ${escapeHtml(msg)}</div>`;
      } finally {
        busy = false;
        restartTimer();
      }
    }

    function render({ incidents, slowdowns }) {
      const incCount = incidents.length;
      const slCount = slowdowns.length;

      els.sub.textContent = `Nearby: ${incCount} incidents${settings.trafficIncludeSlowdowns ? `, ${slCount} slowdowns` : ""}`;

      const parts = [];
      parts.push(`
        <div class="trafficmeta">
          <div class="trafficpill">Radius: ${settings.trafficRadiusMiles} mi</div>
          <div class="trafficpill trafficpill--muted">Updated: ${escapeHtml(formatTime(Date.now()))}</div>
        </div>
      `);

      if (!incCount && !slCount) {
        parts.push('<div class="empty">No nearby alerts right now.</div>');
        els.box.innerHTML = parts.join("");
        return;
      }

      if (incCount) {
        parts.push('<div class="trafficsection">INCIDENTS</div>');
        parts.push('<div class="trafficlist">');
        for (let i = 0; i < Math.min(30, incidents.length); i++) {
          parts.push(renderItem(incidents[i], "incident"));
        }
        parts.push('</div>');
      }

      if (settings.trafficIncludeSlowdowns && slCount) {
        parts.push('<div class="trafficsection">DANGEROUS SLOWDOWNS</div>');
        parts.push('<div class="trafficlist">');
        for (let i = 0; i < Math.min(30, slowdowns.length); i++) {
          parts.push(renderItem(slowdowns[i], "slowdown"));
        }
        parts.push('</div>');
      }

      els.box.innerHTML = parts.join("");
    }

    function renderItem(it, kind) {
      const title = getFirst(it, "title", "Title", "eventType", "EventType", "incidentType", "IncidentType", "type", "Type") ||
        (kind === "slowdown" ? "Dangerous slowdown" : "Incident");

      const desc = getFirst(it, "description", "Description", "shortDescription", "ShortDescription", "details", "Details") || "";

      const route = getFirst(it, "route", "Route", "road", "Road", "roadName", "RoadName") || "";
      const dir = getFirst(it, "direction", "Direction", "travelDirection", "TravelDirection") || "";

      const sevRaw = getFirst(it, "severity", "Severity", "impact", "Impact");
      const sev = Number(sevRaw);
      const sevClass = !Number.isFinite(sev)
        ? "trafficsev--med"
        : sev >= 3
          ? "trafficsev--high"
          : sev >= 2
            ? "trafficsev--med"
            : "trafficsev--low";

      const kv = [];
      if (route || dir) kv.push(`<div>Road</div><div>${escapeHtml(`${route} ${dir}`.trim())}</div>`);

      const start = getFirst(it, "startTime", "StartTime", "createdAt", "CreatedAt") || "";
      if (start) kv.push(`<div>Reported</div><div>${escapeHtml(String(start).slice(0, 19).replace('T',' '))}</div>`);

      const delay = getFirst(it, "delay", "Delay", "delayTime", "DelayTime");
      if (delay !== undefined && delay !== null) kv.push(`<div>Delay</div><div>${escapeHtml(String(delay))}</div>`);

      const id = getTrafficId(it);

      return `
        <div class="trafficitem" data-traffic-id="${escapeHtml(id)}">
          <div class="trafficitem__top">
            <div>
              <div class="trafficitem__title">${escapeHtml(toTitleCase(title))}</div>
              <div class="trafficitem__sub">${escapeHtml(desc || "")}</div>
            </div>
            <div class="trafficsev ${sevClass}" title="Severity"></div>
          </div>
          ${kv.length ? `<div class="trafficitem__kv">${kv.join("")}</div>` : ""}
        </div>
      `;
    }

    function notifyNew({ incidents, slowdowns }) {
      settings = getSettings();
      if (!settings.trafficNotify) return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const current = incidents.concat(settings.trafficIncludeSlowdowns ? slowdowns : []);
      const seen = loadSeenTrafficIds();
      const seenSet = new Set(seen);

      const newIds = [];
      const newItems = [];

      for (let i = 0; i < current.length; i++) {
        const it = current[i];
        const id = getTrafficId(it);
        if (!id) continue;
        if (!seenSet.has(id)) {
          newIds.push(id);
          newItems.push(it);
        }
      }

      if (!newItems.length) {
        saveSeenTrafficIds(seen);
        return;
      }

      for (let i = 0; i < Math.min(3, newItems.length); i++) {
        const it = newItems[i];
        const title = (it && (it.title || it.Title || it.incidentType || it.IncidentType || it.type || it.Type)) || "New traffic alert";
        const body = (it && (it.description || it.Description || it.shortDescription || it.ShortDescription)) || "";
        try {
          const n = new Notification(`OHGO: ${toTitleCase(title)}`, {
            body: String(body).slice(0, 180),
            silent: true
          });
          n.onclick = () => {
            try { window.focus(); } catch {}
          };
        } catch {}
      }

      saveSeenTrafficIds(seen.concat(newIds));
    }

    restartTimer();

    return { refresh, applySettings };
  }

  async function resolveCoords(settings) {
    if (!settings.useGeolocation) return settings.coords || FALLBACK_COORDS;
    if (!("geolocation" in navigator)) return settings.coords || FALLBACK_COORDS;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(settings.coords || FALLBACK_COORDS),
        { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false }
      );
    });
  }
  async function fetchOhgo(resource, { apiKey, radius }) {
    const base = "https://publicapi.ohgo.com/api/v1";
    const params = new URLSearchParams();
    if (radius) params.set("radius", String(radius));
    params.set("page-size", "50");
    params.set("api-key", String(apiKey));

    const url = `${base}/${resource}?${params.toString()}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OHGO error (${res.status}): ${text || res.statusText}`);
    }
    return res.json();
  }

  async function fetchCurrentWeather({ coords, apiKey }) {
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lon: String(coords.lon),
      units: "imperial",
      appid: apiKey
    });

    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenWeather error (${res.status}): ${text || res.statusText}`);
    }

    return res.json();
  }

  function calcPainRisk(w) {
    let score = 0;
    const reasons = [];

    const pressure = Number(w && w.main && w.main.pressure);
    const temp = Number(w && w.main && w.main.temp);
    const feels = Number(w && w.main && w.main.feels_like);
    const wind = Number(w && w.wind && w.wind.speed);
    const main = String((w && w.weather && w.weather[0] && w.weather[0].main) || "");

    if (Number.isFinite(pressure) && pressure < 1005) {
      score += 40;
      reasons.push("Low pressure (stormier pattern)." );
    }

    if (Number.isFinite(temp) && Number.isFinite(feels) && Math.abs(temp - feels) >= 8) {
      score += 25;
      reasons.push("Big feels-like difference (wind chill / humidity)." );
    }

    if (Number.isFinite(wind) && wind >= 15) {
      score += 15;
      reasons.push("Windy conditions." );
    }

    if (/rain|snow|thunder/i.test(main)) {
      score += 20;
      reasons.push("Precipitation / storm conditions." );
    }

    score = clamp(score, 0, 100);
    const level = score >= 60 ? "High" : score >= 30 ? "Moderate" : "Low";
    const color = score >= 60 ? "#ef4444" : score >= 30 ? "#f59e0b" : "#22c55e";
    return { score, level, color, reasons };
  }

  function calcDrivingRisk(w) {
    let score = 0;
    const reasons = [];

    const temp = Number(w && w.main && w.main.temp);
    const wind = Number(w && w.wind && w.wind.speed);
    const visibility = Number(w && w.visibility);
    const main = String((w && w.weather && w.weather[0] && w.weather[0].main) || "");
    const desc = String((w && w.weather && w.weather[0] && w.weather[0].description) || "");

    if (Number.isFinite(visibility)) {
      const mi = visibility / 1609.344;
      if (mi < 0.5) {
        score += 55;
        reasons.push("Very low visibility (<0.5 mi)." );
      } else if (mi < 1.5) {
        score += 35;
        reasons.push("Reduced visibility (<1.5 mi)." );
      } else if (mi < 3) {
        score += 15;
        reasons.push("Slightly reduced visibility (<3 mi)." );
      }
    }

    if (Number.isFinite(wind)) {
      if (wind >= 25) {
        score += 30;
        reasons.push("Strong winds (>=25 mph), watch high-profile vehicles." );
      } else if (wind >= 15) {
        score += 15;
        reasons.push("Windy (>=15 mph)." );
      }
    }

    if (/thunderstorm/i.test(main)) {
      score += 45;
      reasons.push("Thunderstorms: sudden downpours and hydroplaning risk." );
    } else if (/snow/i.test(main)) {
      score += 45;
      reasons.push("Snow: reduced traction and longer stopping distance." );
    } else if (/rain|drizzle/i.test(main)) {
      score += 30;
      reasons.push("Rain: slick roads and hydroplaning risk." );
    } else if (/fog|mist|haze|smoke|dust|sand|ash/i.test(main) || /fog|mist|haze/i.test(desc)) {
      score += 25;
      reasons.push("Haze/fog-like conditions." );
    }

    if (Number.isFinite(temp) && temp <= 34) {
      score += 20;
      reasons.push("Near/below freezing: black ice possible (bridges first)." );
    }

    score = clamp(score, 0, 100);
    const level = score >= 70 ? "High" : score >= 35 ? "Moderate" : "Low";
    const color = score >= 70 ? "#ef4444" : score >= 35 ? "#f59e0b" : "#22c55e";
    const primary = reasons.length ? reasons[0] : "-";
    return { score, level, color, primary, reasons };
  }

  function safeRound(n) {
    return Number.isFinite(Number(n)) ? Math.round(Number(n)) : null;
  }

  function normalizeError(e) {
    if (!e) return "Unknown error";
    if (e instanceof Error) return e.message || "Error";
    return String(e);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // App wiring
  const els = {
    btnAltAll: document.getElementById("btn-alt-all"),
    btnPause: document.getElementById("btn-pause"),
    btnSettings: document.getElementById("btn-settings"),
    btnRefreshNow: document.getElementById("btn-refresh-now"),
    badgeRefresh: document.getElementById("badge-refresh"),
    badgeLast: document.getElementById("badge-last"),
    camGrid: document.getElementById("cam-grid"),
    camStatusSub: document.getElementById("camstatus-sub"),
    camStatusBody: document.getElementById("camstatus-body"),
    btnRetryFailed: document.getElementById("btn-retry-failed"),
    settingsDialog: document.getElementById("settings-dialog"),
    settingsForm: document.getElementById("settings-form"),
    inpApiKey: document.getElementById("inp-api-key"),
    inpOhgoKey: document.getElementById("inp-ohgo-key"),
    chkTrafficEnabled: document.getElementById("chk-traffic-enabled"),
    chkTrafficSlowdowns: document.getElementById("chk-traffic-slowdowns"),
    inpTrafficRadius: document.getElementById("inp-traffic-radius"),
    inpTrafficSeconds: document.getElementById("inp-traffic-seconds"),
    chkTrafficNotify: document.getElementById("chk-traffic-notify"),
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

  function createViewer({ getSettings }) {
    const dialog = document.getElementById("viewer-dialog");
    const imgWrap = document.querySelector("#viewer-dialog .viewer__imgwrap");
    const img = document.getElementById("viewer-img");
    const title = document.getElementById("viewer-title");
    const sub = document.getElementById("viewer-sub");
    const btnAlt = document.getElementById("btn-viewer-alt");

    const btnZoomOut = document.getElementById("btn-zoom-out");
    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomReset = document.getElementById("btn-zoom-reset");
    const rngZoom = document.getElementById("rng-zoom");

    let state = null; // { camera, usingAlt }
    let zoom = 1;
    let refreshTimer = null;

    function getRefreshSeconds() {
      try {
        const s = getSettings && getSettings();
        const n = s && s.cameraRefreshSeconds != null ? Number(s.cameraRefreshSeconds) : NaN;
        return Number.isFinite(n) && n > 0 ? n : 5;
      } catch {
        return 5;
      }
    }

    function stopAutoRefresh() {
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = null;
    }

    function startAutoRefresh() {
      stopAutoRefresh();
      const seconds = Math.max(1, getRefreshSeconds());
      refreshTimer = window.setInterval(() => {
        if (document.hidden) return;
        if (!state) return;
        if (!dialog.open) return;
        render();
      }, seconds * 1000);
    }

    function setZoom(next) {
      zoom = clamp(Number(next) || 1, 1, 3);
      if (rngZoom) rngZoom.value = String(zoom);
      if (btnZoomReset) btnZoomReset.textContent = `${Math.round(zoom * 100)}%`;
      img.style.width = `${zoom * 100}%`;
      img.style.height = "auto";
    }

    function resetPan() {
      if (!imgWrap) return;
      imgWrap.scrollLeft = 0;
      imgWrap.scrollTop = 0;
    }

    btnAlt.addEventListener("click", () => {
      if (!state) return;
      state.usingAlt = !state.usingAlt;
      btnAlt.setAttribute("aria-pressed", String(state.usingAlt));
      render();
    });

    if (btnZoomOut) btnZoomOut.addEventListener("click", () => setZoom(zoom - 0.25));
    if (btnZoomIn) btnZoomIn.addEventListener("click", () => setZoom(zoom + 0.25));
    if (btnZoomReset) btnZoomReset.addEventListener("click", () => setZoom(1));
    if (rngZoom) rngZoom.addEventListener("input", () => setZoom(parseFloat(rngZoom.value)));

    // Drag-to-pan when zoomed
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    img.addEventListener("pointerdown", (e) => {
      if (!imgWrap) return;
      if (zoom <= 1) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = imgWrap.scrollLeft;
      startTop = imgWrap.scrollTop;
      try { img.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    });

    img.addEventListener("pointermove", (e) => {
      if (!imgWrap) return;
      if (!dragging) return;
      imgWrap.scrollLeft = startLeft - (e.clientX - startX);
      imgWrap.scrollTop = startTop - (e.clientY - startY);
      e.preventDefault();
    });

    function stopDrag() {
      dragging = false;
    }

    img.addEventListener("pointerup", stopDrag);
    img.addEventListener("pointercancel", stopDrag);



    dialog.addEventListener("close", stopAutoRefresh);
    dialog.addEventListener("cancel", stopAutoRefresh);

    function render() {
      if (!state) return;
      const camera = state.camera;
      const usingAlt = state.usingAlt;
      title.textContent = usingAlt ? camera.altLabel : camera.label;
      sub.textContent = usingAlt ? "Alternate view" : "Primary view";
      img.alt = title.textContent;
      img.src = `${usingAlt ? camera.alt : camera.src}?t=${Date.now()}`;
    }

    // Init
    setZoom(1);

    return {
      open(camera, usingAlt) {
        state = { camera, usingAlt: Boolean(usingAlt) };
        btnAlt.setAttribute("aria-pressed", String(state.usingAlt));
        setZoom(1);
        resetPan();
        render();
        dialog.showModal();
        startAutoRefresh();
      }
    };
  }

  const viewer = createViewer({ getSettings: () => settings });

  const cameras = createCameraDashboard({
    mountEl: els.camGrid,
    viewer,
    getSettings: () => settings,
    onAnyRefresh: () => {
      els.badgeLast.textContent = `Last update: ${formatTime(Date.now())}`;
      renderCamStatus();
    }
  });

  const weather = createWeatherSidebar({
    getSettings: () => settings
  });

  const traffic = createTrafficAlertsSidebar({
    getSettings: () => settings
  });

  function renderCamStatus() {
    if (!els.camStatusBody || !els.camStatusSub) return;

    let st;
    try {
      st = cameras.getStatus();
    } catch {
      st = null;
    }
    if (!st) return;

    const now = Date.now();
    let sub = st.paused ? "Paused" : "Running";
    if (!st.paused && st.nextRefreshAt) {
      const sec = Math.max(0, Math.ceil((st.nextRefreshAt - now) / 1000));
      sub += ` • Next refresh in ${sec}s`;
    }
    els.camStatusSub.textContent = sub;

    if (els.btnRetryFailed) {
      els.btnRetryFailed.disabled = !st.errorCount;
      els.btnRetryFailed.title = st.errorCount ? `Retry ${st.errorCount} failed camera(s)` : "No failed cameras";
    }

    const errorsHtml = st.errorCount
      ? `<ul>${st.errors
          .map((e) => {
            const when = e.lastErrorAt ? formatTime(e.lastErrorAt) : "-";
            const count = e.errorCount ? ` • ${e.errorCount}x` : "";
            return `<li>${escapeHtml(e.label)} <small>(${escapeHtml(when)}${escapeHtml(count)})</small></li>`;
          })
          .join("")}</ul>`
      : '<div class="empty">No camera errors detected.</div>';

    els.camStatusBody.innerHTML = `
      <div class="camstats__kpi"><b>Cameras</b>${st.cameraCount}</div>
      <div class="camstats__kpi"><b>Refresh</b>${st.refreshSeconds}s</div>
      <div class="camstats__kpi"><b>Errors</b>${st.errorCount}</div>
      <div class="camstats__list"><b>${st.errorCount ? "Needs attention" : "Healthy"}</b>${errorsHtml}</div>
    `;
  }

  function syncTopBar() {
    els.badgeRefresh.textContent = `Refreshing every ${settings.cameraRefreshSeconds}s`;
  }

  function applySettings() {
    syncTopBar();
    requestNotificationPermissionIfNeeded(settings);
    cameras.applySettings();
    weather.applySettings();
    traffic.applySettings();
    weather.refresh({ reason: "settings-change" });
    traffic.refresh({ reason: "settings-change" });
    renderCamStatus();
  }

  function openSettings() {
    els.inpApiKey.value = settings.apiKey;
    els.inpOhgoKey.value = settings.ohgoApiKey || "";
    els.chkTrafficEnabled.checked = Boolean(settings.trafficEnabled);
    els.chkTrafficSlowdowns.checked = Boolean(settings.trafficIncludeSlowdowns);
    els.inpTrafficRadius.value = String(settings.trafficRadiusMiles != null ? settings.trafficRadiusMiles : 25);
    els.inpTrafficSeconds.value = String(settings.trafficRefreshSeconds != null ? settings.trafficRefreshSeconds : 60);
    els.chkTrafficNotify.checked = Boolean(settings.trafficNotify);
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
    const ohgoApiKey = String(els.inpOhgoKey.value || "").trim();
    const trafficEnabled = Boolean(els.chkTrafficEnabled.checked);
    const trafficIncludeSlowdowns = Boolean(els.chkTrafficSlowdowns.checked);
    const trafficRadiusMiles = Number.parseInt(String(els.inpTrafficRadius.value || "").trim(), 10);
    const trafficRefreshSeconds = Number.parseInt(String(els.inpTrafficSeconds.value || "").trim(), 10);
    const trafficNotify = Boolean(els.chkTrafficNotify.checked);
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
      apiKey,
      ohgoApiKey,
      trafficEnabled,
      trafficIncludeSlowdowns,
      trafficRadiusMiles,
      trafficRefreshSeconds,
      trafficNotify,
      useGeolocation,
      coords: { lat, lon },
      cameraRefreshSeconds,
      weatherRefreshMinutes,
      cameras: camerasList
    });
  }

  // Initial render
  syncTopBar();
  weather.refresh({ reason: "startup" });
  traffic.refresh({ reason: "startup" });
  cameras.start();
  renderCamStatus();
  window.setInterval(renderCamStatus, 1000);

  // Wire buttons
  els.btnAltAll.addEventListener("click", () => {
    const next = !cameras.getGlobalAlt();
    cameras.setGlobalAlt(next);
    els.btnAltAll.setAttribute("aria-pressed", String(next));
    renderCamStatus();
  });

  els.btnPause.addEventListener("click", () => {
    const next = !cameras.isPaused();
    cameras.setPaused(next);
    els.btnPause.setAttribute("aria-pressed", String(next));
    els.btnPause.textContent = next ? "Resume" : "Pause";
    renderCamStatus();
  });

  els.btnRefreshNow.addEventListener("click", () => cameras.refreshAllNow());
  els.btnSettings.addEventListener("click", () => openSettings());
  if (els.btnRetryFailed) {
    els.btnRetryFailed.addEventListener("click", () => {
      cameras.retryFailed();
      renderCamStatus();
    });
  }

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
})();
































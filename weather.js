import { FALLBACK_COORDS } from "./defaults.js";

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

export function createWeatherSidebar({ getSettings }) {
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

    if (!settings.openWeatherApiKey) {
      renderNotConfigured();
      restartTimer();
      return;
    }

    busy = true;
    els.weatherSub.textContent = reason === "manual" ? "Updating..." : "Refreshing...";

    try {
      const coords = await resolveCoords(settings);
      const data = await fetchCurrentWeather({ coords, openWeatherApiKey: settings.openWeatherApiKey });
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
    const desc = w && w.weather && w.weather[0] && w.weather[0].description ? String(w.weather[0].description) : "-";

    els.weatherCurrent.innerHTML = `
      <div class="kv">
        <div>Temperature</div><div>${temp == null ? "-" : `${temp} F`} (feels ${feels == null ? "-" : `${feels} F`})</div>
        <div>Wind</div><div>${wind == null ? "-" : `${wind} mph`}</div>
        <div>Visibility</div><div>${visibilityMiles == null ? "-" : `${visibilityMiles.toFixed(1)} mi`}</div>
        <div>Pressure</div><div>${pressure == null ? "-" : `${pressure} hPa`}</div>
        <div>Humidity</div><div>${humidity == null ? "-" : `${humidity}%`}</div>
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

async function fetchCurrentWeather({ coords, openWeatherApiKey }) {
  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    units: "imperial",
    appid: openWeatherApiKey
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
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
const STORAGE_KEY = "odot-dashboard:settings:v1";

const clone = globalThis.structuredClone
  ? (x) => globalThis.structuredClone(x)
  : (x) => JSON.parse(JSON.stringify(x));

export function loadSettings(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(fallback);
    const parsed = JSON.parse(raw);
    return mergeSettings(fallback, parsed);
  } catch {
    return clone(fallback);
  }
}

export function normalizeSettings(defaults, override) {
  try {
    return mergeSettings(defaults, override);
  } catch {
    return clone(defaults);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings(fallback) {
  localStorage.removeItem(STORAGE_KEY);
  return clone(fallback);
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
      out.cameraRefreshSeconds = clamp(Math.trunc(override.cameraRefreshSeconds), 2, 60);
    }

    if (Number.isFinite(override.weatherRefreshMinutes)) {
      out.weatherRefreshMinutes = clamp(Math.trunc(override.weatherRefreshMinutes), 2, 60);
    }

    if (Array.isArray(override.cameras)) {
      out.cameras = sanitizeCameras(override.cameras, defaults.cameras);
    }
  }

  return out;
}

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
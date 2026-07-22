export function formatTime(ts = Date.now()) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  } catch {
    return "-";
  }
}
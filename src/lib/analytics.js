// Lightweight event tracking for the community-test success metric.
// No analytics backend is wired up yet — this keeps event names/shapes
// stable (console-visible) for whenever one is added, without adding a
// dependency or blocking the UI if logging itself fails.
export function track(event, payload = {}) {
  try {
    console.log(`[analytics] ${event}`, payload)
  } catch {
    // Analytics must never break the app.
  }
}

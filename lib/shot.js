// Capture a specific window, not the clipboard. dsh-wsl-shot handles an image
// that is already on the clipboard; this one goes and takes the picture.
export function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function normalizeTarget(t) {
  return { pid: safeInt(t?.pid), handle: String(t?.handle ?? ""), title: String(t?.title ?? "") };
}

/** A capture with no area is a failed capture, not a 0x0 image. */
export function isUsableRect(r) {
  return safeInt(r?.width) > 0 && safeInt(r?.height) > 0;
}

export function sanitizeName(name, fallback) {
  const base = typeof name === "string" && name.trim() ? name.trim() : fallback;
  return base.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

export function format(v) {
  const lines = [`win_shot_window ok=${v.ok}`];
  if (v.path) lines.push(`path: ${v.path}`);
  if (v.width) lines.push(`size: ${v.width}x${v.height}`);
  if (v.pid) lines.push(`pid: ${v.pid}`);
  if (v.error) lines.push(`error: ${v.error}`);
  return lines.join("\n");
}

export function parameters() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      pid: { type: "number", description: "Process id of the window to capture. Defaults to the foreground window." },
      outDir: { type: "string", description: "Output directory under WSL (default ~/.dsh/shots)." },
      name: { type: "string", description: "File basename without extension." },
    },
  };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

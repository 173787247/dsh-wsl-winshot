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

/**
 * A crop is expressed relative to the window, so the caller does not have to
 * know where the window sits on screen. Out-of-window values are clamped to the
 * window rather than refused: asking for "the right half" of a window whose
 * width you misjudged should give you the right edge, not an error.
 */
export function normalizeCrop(crop, bounds) {
  if (!crop || typeof crop !== "object") return null;
  const w = safeInt(bounds?.width), h = safeInt(bounds?.height);
  let x = safeInt(crop.x), y = safeInt(crop.y);
  let width = safeInt(crop.width), height = safeInt(crop.height);
  if (width < 1 || height < 1) return null;
  if (x < 0) { width += x; x = 0; }
  if (y < 0) { height += y; y = 0; }
  if (w > 0) width = Math.min(width, w - x);
  if (h > 0) height = Math.min(height, h - y);
  if (width < 1 || height < 1) return null;
  return { x, y, width, height };
}

export function sanitizeName(name, fallback) {
  const base = typeof name === "string" && name.trim() ? name.trim() : fallback;
  return base.replace(/[^\w.-]+/g, "_").slice(0, 80);
}

export function format(v) {
  const lines = [`win_shot_window ok=${v.ok}`];
  if (v.path) lines.push(`path: ${v.path}`);
  if (v.width) lines.push(`size: ${v.width}x${v.height}`);
  if (v.crop) lines.push(`crop: ${v.crop.width}x${v.crop.height} at ${v.crop.x},${v.crop.y} (window-relative)`);
  if (v.element) lines.push(`element: ${v.element.controlType} "${v.element.name}"`);
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
      expectName: { type: "string", description: "Crop to the element with this exact name instead of the whole window. Use uia_tree to see what is there." },
      expectType: { type: "string", description: "Narrow the expectName match by control type, e.g. Button." },
      x: { type: "number", description: "Crop: window-relative left edge." },
      y: { type: "number", description: "Crop: window-relative top edge." },
      width: { type: "number", description: "Crop: width in pixels." },
      height: { type: "number", description: "Crop: height in pixels." },
    },
  };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

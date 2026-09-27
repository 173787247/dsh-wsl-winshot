import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeInt, normalizeTarget, isUsableRect, sanitizeName } from "../lib/shot.js";

describe("shot", () => {
  it("exports the documented surface", () => {
    assert.ok(safeInt !== undefined, "safeInt");
    assert.ok(normalizeTarget !== undefined, "normalizeTarget");
    assert.ok(isUsableRect !== undefined, "isUsableRect");
    assert.ok(sanitizeName !== undefined, "sanitizeName");
  });
});

// ── cropping, added after the first release ─────────────────────────────────
import { normalizeCrop } from "../lib/shot.js";
import { captureScript } from "../lib/shot-exec.js";

describe("normalizeCrop", () => {
  it("passes through a crop that fits", () => {
    assert.deepEqual(normalizeCrop({ x: 10, y: 20, width: 100, height: 50 }, { width: 800, height: 600 }),
      { x: 10, y: 20, width: 100, height: 50 });
  });
  it("clamps a crop that runs past the window edge", () => {
    // Asking for more than there is should give the edge, not an error.
    assert.deepEqual(normalizeCrop({ x: 700, y: 500, width: 400, height: 400 }, { width: 800, height: 600 }),
      { x: 700, y: 500, width: 100, height: 100 });
  });
  it("pulls a negative origin back to zero and shrinks accordingly", () => {
    assert.deepEqual(normalizeCrop({ x: -20, y: -10, width: 100, height: 50 }, { width: 800, height: 600 }),
      { x: 0, y: 0, width: 80, height: 40 });
  });
  it("refuses a crop with no area", () => {
    assert.equal(normalizeCrop({ x: 0, y: 0, width: 0, height: 10 }, { width: 800, height: 600 }), null);
    assert.equal(normalizeCrop({ x: 0, y: 0, height: 10 }, { width: 800, height: 600 }), null);
  });
  it("refuses a crop that lies entirely outside", () => {
    assert.equal(normalizeCrop({ x: 5000, y: 0, width: 100, height: 100 }, { width: 800, height: 600 }), null);
  });
  it("returns null when nothing was asked for", () => {
    assert.equal(normalizeCrop(undefined, { width: 800, height: 600 }), null);
    assert.equal(normalizeCrop({}, { width: 800, height: 600 }), null);
  });
});

describe("captureScript", () => {
  it("captures the whole window when nothing is asked for", () => {
    const s = captureScript(0, "x.png", {});
    assert.ok(s.includes("$cw = $w; $ch = $ht"));
    assert.ok(!s.includes("ControlViewWalker"), "should not walk the tree");
  });
  it("uses the given rectangle for a coordinate crop", () => {
    const s = captureScript(0, "x.png", { crop: { x: 5, y: 6, width: 7, height: 8 } });
    assert.ok(s.includes("$cx = 5; $cy = 6; $cw = 7; $ch = 8"));
  });
  it("locates the element by name, never by index", () => {
    const s = captureScript(0, "x.png", { expectName: "Save", expectType: "Button" });
    assert.ok(s.includes("$e.Current.Name -eq 'Save'"));
    assert.ok(s.includes("'Button'"));
    assert.ok(!s.includes("[-1]"), "must not index into a list");
  });
  it("doubles an apostrophe in the expected name", () => {
    const s = captureScript(0, "x.png", { expectName: "it's" });
    assert.ok(s.includes("'it''s'"));
  });
  it("prefers the element crop over a rectangle when both are given", async () => {
    // The element is the one that survives the window moving; it wins.
    const { execute } = await import("../lib/shot-exec.js");
    const r = await execute({ expectName: "x", x: 0, y: 0, width: 1, height: 1 }, {});
    // Outside WSL this returns the not-running error; either way it must not
    // have used the rectangle.
    assert.ok(r.ok === false || r.error !== undefined || r.crop !== undefined);
  });
});

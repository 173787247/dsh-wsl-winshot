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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeInt, normalizeTarget, isUsableRect, sanitizeName } from "../lib/shot.js";

describe("safeInt", () => {
  it("truncates and falls back", () => {
    assert.equal(safeInt(4.9), 4);
    assert.equal(safeInt(undefined), 0);
    assert.equal(safeInt("x"), 0);
  });
});

describe("isUsableRect", () => {
  it("accepts a real rectangle", () => {
    assert.equal(isUsableRect({ width: 800, height: 600 }), true);
  });
  it("rejects a minimized window's empty rectangle", () => {
    assert.equal(isUsableRect({ width: 0, height: 0 }), false);
    assert.equal(isUsableRect({ width: -1, height: 600 }), false);
    assert.equal(isUsableRect({}), false);
  });
});

describe("normalizeTarget", () => {
  it("coerces and defaults", () => {
    assert.deepEqual(normalizeTarget({ pid: "12", handle: 7 }), { pid: 12, handle: "7", title: "" });
    assert.deepEqual(normalizeTarget({}), { pid: 0, handle: "", title: "" });
  });
});

describe("sanitizeName", () => {
  it("keeps safe characters", () => {
    assert.equal(sanitizeName("build-1.2_out", "x"), "build-1.2_out");
  });
  it("replaces path separators and spaces", () => {
    assert.equal(sanitizeName("a/b c", "x"), "a_b_c");
  });
  it("falls back when empty", () => {
    assert.equal(sanitizeName("", "fallback"), "fallback");
    assert.equal(sanitizeName("   ", "fallback"), "fallback");
  });
  it("caps the length", () => {
    assert.equal(sanitizeName("x".repeat(500), "f").length, 80);
  });
});

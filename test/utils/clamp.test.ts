import assert from "node:assert/strict";
import test from "node:test";
import { clamp } from "../../src/utils/clamp.js";

test("clamp returns value when within range", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test("clamp returns min when value is below range", () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(-100, 0, 10), 0);
});

test("clamp returns max when value is above range", () => {
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(100, 0, 10), 10);
});

test("clamp handles floating point values", () => {
  assert.equal(clamp(5.5, 0, 10), 5.5);
  assert.equal(clamp(-0.5, 0, 10), 0);
  assert.equal(clamp(10.5, 0, 10), 10);
});

test("clamp throws RangeError when min > max", () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
  assert.throws(() => clamp(0, 1, 0), RangeError);
});

test("clamp returns NaN when value is NaN", () => {
  assert.ok(Number.isNaN(clamp(NaN, 0, 10)));
});

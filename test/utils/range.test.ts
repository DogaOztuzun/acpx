import assert from "node:assert/strict";
import test from "node:test";
import { range } from "../../src/utils/range.js";

test("range returns numbers from start to end with default step of 1", () => {
  assert.deepEqual(range(0, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(range(1, 4), [1, 2, 3]);
});

test("range returns numbers with custom step", () => {
  assert.deepEqual(range(0, 10, 2), [0, 2, 4, 6, 8]);
  assert.deepEqual(range(0, 10, 3), [0, 3, 6, 9]);
  assert.deepEqual(range(0, 10, 5), [0, 5]);
});

test("range handles descending ranges with negative step", () => {
  assert.deepEqual(range(5, 0, -1), [5, 4, 3, 2, 1]);
  assert.deepEqual(range(10, 0, -2), [10, 8, 6, 4, 2]);
});

test("range returns empty array when start equals end", () => {
  assert.deepEqual(range(5, 5), []);
  assert.deepEqual(range(0, 0), []);
});

test("range throws RangeError when step is zero", () => {
  assert.throws(() => range(0, 10, 0), RangeError);
});

test("range handles negative to positive ranges", () => {
  assert.deepEqual(range(-3, 3), [-3, -2, -1, 0, 1, 2]);
  assert.deepEqual(range(-5, -2), [-5, -4, -3]);
});

test("range handles floating point values", () => {
  const result = range(0, 2, 0.5);
  const expected = [0, 0.5, 1, 1.5];
  assert.equal(result.length, expected.length);
  for (let i = 0; i < result.length; i++) {
    assert.ok(
      Math.abs(result[i] - expected[i]) < Number.EPSILON,
      `result[${i}]=${result[i]} expected ${expected[i]}`,
    );
  }
});

test("range returns empty array when start > end with positive step", () => {
  assert.deepEqual(range(5, 0, 1), []);
  assert.deepEqual(range(10, 5, 2), []);
});

test("range returns empty array when start < end with negative step", () => {
  assert.deepEqual(range(0, 5, -1), []);
  assert.deepEqual(range(3, 10, -2), []);
});

test("range throws TypeError when start, end, or step is NaN", () => {
  assert.throws(() => range(NaN, 5), TypeError);
  assert.throws(() => range(0, NaN), TypeError);
  assert.throws(() => range(0, 5, NaN), TypeError);
});

test("range handles Infinity gracefully", () => {
  assert.deepEqual(range(Infinity, Infinity), []);
  assert.deepEqual(range(-Infinity, Infinity), []);
  assert.deepEqual(range(0, Infinity), []);
  assert.deepEqual(range(Infinity, 0), []);
});

test("range handles non-integer start with integer step", () => {
  const result = range(0.5, 5, 1);
  assert.deepEqual(result, [0.5, 1.5, 2.5, 3.5, 4.5]);
});

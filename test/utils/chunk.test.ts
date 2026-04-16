import assert from "node:assert/strict";
import test from "node:test";
import { chunk } from "../../src/utils/chunk.js";

test("chunk splits array into groups of size", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([1, 2, 3, 4, 5, 6], 3), [
    [1, 2, 3],
    [4, 5, 6],
  ]);
});

test("chunk returns empty array when given empty array", () => {
  assert.deepEqual(chunk([], 2), []);
});

test("chunk returns single-element array when size >= length", () => {
  assert.deepEqual(chunk([1, 2, 3], 5), [[1, 2, 3]]);
  assert.deepEqual(chunk([1, 2, 3], 3), [[1, 2, 3]]);
});

test("chunk handles size of 1", () => {
  assert.deepEqual(chunk([1, 2, 3], 1), [[1], [2], [3]]);
});

test("chunk handles last group smaller than size", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5, 6, 7], 3), [[1, 2, 3], [4, 5, 6], [7]]);
});

test("chunk works with different element types", () => {
  assert.deepEqual(chunk(["a", "b", "c", "d"], 2), [
    ["a", "b"],
    ["c", "d"],
  ]);
  assert.deepEqual(chunk([{}, { a: 1 }, { b: 2 }], 2), [[{}, { a: 1 }], [{ b: 2 }]]);
});

test("chunk throws TypeError when size is not a positive integer", () => {
  assert.throws(() => chunk([1, 2, 3], 0), TypeError);
  assert.throws(() => chunk([1, 2, 3], -1), TypeError);
  assert.throws(() => chunk([1, 2, 3], 1.5), TypeError);
  assert.throws(() => chunk([1, 2, 3], NaN), TypeError);
  assert.throws(() => chunk([1, 2, 3], Infinity), TypeError);
});

test("chunk throws TypeError when array is null or undefined", () => {
  assert.throws(() => chunk(null as unknown as number[], 2), TypeError);
  assert.throws(() => chunk(undefined as unknown as number[], 2), TypeError);
});

import assert from "node:assert/strict";
import test from "node:test";
import { dedupe } from "../../src/utils/dedupe.js";

test("dedupe returns empty array when given empty array", () => {
  assert.deepEqual(dedupe([]), []);
});

test("dedupe returns same array with single element", () => {
  assert.deepEqual(dedupe([1]), [1]);
  assert.deepEqual(dedupe(["a"]), ["a"]);
});

test("dedupe removes duplicate values", () => {
  assert.deepEqual(dedupe([1, 2, 1, 3, 2]), [1, 2, 3]);
  assert.deepEqual(dedupe(["a", "b", "a"]), ["a", "b"]);
});

test("dedupe preserves first occurrence order", () => {
  assert.deepEqual(dedupe([3, 1, 4, 1, 5, 9]), [3, 1, 4, 5, 9]);
  assert.deepEqual(dedupe(["z", "a", "z", "a"]), ["z", "a"]);
});

test("dedupe with keyFn extracts comparison key", () => {
  const arr = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
    { id: 1, name: "c" },
  ];
  assert.deepEqual(
    dedupe(arr, (item) => item.id),
    [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ],
  );
});

test("dedupe with keyFn handles objects as keys", () => {
  const arr = [{ id: 1 }, { id: 2 }, { id: 1 }];
  assert.deepEqual(
    dedupe(arr, (item) => item.id),
    [{ id: 1 }, { id: 2 }],
  );
});

test("dedupe returns all elements when all are unique", () => {
  assert.deepEqual(dedupe([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  assert.deepEqual(dedupe(["a", "b", "c"]), ["a", "b", "c"]);
});

test("dedupe handles all duplicates (returns one)", () => {
  assert.deepEqual(dedupe([1, 1, 1, 1]), [1]);
  assert.deepEqual(dedupe(["x", "x", "x"]), ["x"]);
});

test("dedupe handles mixed types", () => {
  assert.deepEqual(dedupe([1, "1", true, true, 1]), [1, "1", true]);
});

test("dedupe with keyFn uses key for comparison not identity", () => {
  const a = { id: 1, val: "original" };
  const b = { id: 1, val: "duplicate" };
  assert.deepEqual(
    dedupe([a, b], (item) => item.id),
    [a],
  );
});

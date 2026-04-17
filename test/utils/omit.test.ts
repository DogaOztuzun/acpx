import assert from "node:assert/strict";
import test from "node:test";
import { omit } from "../../src/utils/omit.js";

test("omit returns new object with specified keys removed", () => {
  const obj = { a: 1, b: 2, c: 3 };
  const result = omit(obj, ["a", "b"]);
  assert.deepEqual(result, { c: 3 });
  assert.notStrictEqual(result, obj);
});

test("omit skips keys that don't exist on the source object at runtime", () => {
  const obj = { a: 1, b: 2 };
  assert.deepEqual(omit(obj, ["nonexistent" as keyof typeof obj]), { a: 1, b: 2 });
});

test("omit does not mutate the input object", () => {
  const obj = { a: 1, b: 2 };
  const result = omit(obj, ["a"]);
  assert.deepEqual(obj, { a: 1, b: 2 });
  assert.deepEqual(result, { b: 2 });
});

test("omit handles empty keys array", () => {
  const obj = { a: 1 };
  assert.deepEqual(omit(obj, []), { a: 1 });
});

test("omit handles empty object", () => {
  const obj = {};
  assert.deepEqual(omit(obj, []), {});
});

test("omit removes all keys when every key exists", () => {
  const obj = { a: 1, b: 2 };
  assert.deepEqual(omit(obj, ["a", "b"]), {});
});

test("omit works with various value types", () => {
  const obj = { name: "test", count: 0, active: false };
  assert.deepEqual(omit(obj, ["name", "active"]), { count: 0 });
});

test("omit returns empty object when all keys are removed", () => {
  const obj = { a: 1 };
  assert.deepEqual(omit(obj, ["a"]), {});
});

test("omit handles empty object with non-empty keys", () => {
  const obj: Record<string, number> = {};
  assert.deepEqual(omit(obj, ["a", "b"]), {});
});

test("omit handles duplicate keys in array", () => {
  const obj = { a: 1, b: 2 };
  assert.deepEqual(omit(obj, ["a", "a", "b"]), {});
});

test("omit does not include inherited properties", () => {
  const parent = { inherited: 1 };
  const child = Object.create(parent);
  child.own = 2;
  assert.deepEqual(omit(child, ["own"]), {});
});
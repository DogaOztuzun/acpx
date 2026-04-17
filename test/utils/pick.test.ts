import assert from "node:assert/strict";
import test from "node:test";
import { pick } from "../../src/utils/pick.js";

test("pick returns new object with selected keys", () => {
  const obj = { a: 1, b: 2, c: 3 };
  const result = pick(obj, ["a", "b"]);
  assert.deepEqual(result, { a: 1, b: 2 });
  assert.notStrictEqual(result, obj);
});

test("pick skips keys that don't exist on the source object at runtime", () => {
  const obj = { a: 1, b: 2 };
  assert.deepEqual(pick(obj, ["a", "nonexistent" as keyof typeof obj]), { a: 1 });
});

test("pick does not mutate the input object", () => {
  const obj = { a: 1, b: 2 };
  const result = pick(obj, ["a"]);
  assert.deepEqual(obj, { a: 1, b: 2 });
  assert.deepEqual(result, { a: 1 });
});

test("pick handles empty keys array", () => {
  const obj = { a: 1 };
  assert.deepEqual(pick(obj, []), {});
});

test("pick handles empty object", () => {
  const obj = {};
  assert.deepEqual(pick(obj, []), {});
});

test("pick preserves original values", () => {
  const obj = { a: "value", b: 42, c: true };
  const result = pick(obj, ["a", "b"]);
  assert.strictEqual(result.a, "value");
  assert.strictEqual(result.b, 42);
});

test("pick works with various value types", () => {
  const obj = { name: "test", count: 0, active: false };
  assert.deepEqual(pick(obj, ["name", "active"]), {
    name: "test",
    active: false,
  });
});

test("pick returns empty object when all keys are nonexistent", () => {
  const obj: { a: number; [key: string]: unknown } = { a: 1 };
  assert.deepEqual(pick(obj, ["x", "y"]), {});
});
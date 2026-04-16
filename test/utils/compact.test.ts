import assert from "node:assert/strict";
import test from "node:test";
import { compact } from "../../src/utils/compact.js";

test("compact removes null values", () => {
  assert.deepEqual(compact({ a: null, b: "value" }), { b: "value" });
});

test("compact removes undefined values", () => {
  assert.deepEqual(compact({ a: undefined, b: "value" }), { b: "value" });
});

test("compact preserves falsy values", () => {
  assert.deepEqual(compact({ a: 0, b: false, c: "", d: "value" }), {
    a: 0,
    b: false,
    c: "",
    d: "value",
  });
});

test("compact handles empty object", () => {
  assert.deepEqual(compact({}), {});
});

test("compact handles all-null object", () => {
  assert.deepEqual(compact({ a: null, b: null }), {});
});

test("compact performs shallow compaction only", () => {
  const nested = { x: 1 };
  const obj = { a: nested, b: null };
  const result = compact(obj);
  assert.deepEqual(result, { a: nested });
  assert.strictEqual(result.a, nested);
});

test("compact handles mixed values", () => {
  assert.deepEqual(
    compact({
      name: "test",
      count: 0,
      active: false,
      meta: null,
      undefined,
      value: "",
    }),
    { name: "test", count: 0, active: false, value: "" },
  );
});

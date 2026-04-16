import assert from "node:assert/strict";
import test from "node:test";
import { memoize } from "../../src/utils/memoize.js";

test("memoize returns same reference on cache hit", () => {
  const obj = { value: 42 };
  const fn = (): { value: number } => obj;
  const memoized = memoize(fn);

  const result1 = memoized("key");
  const result2 = memoized("key");

  assert.strictEqual(result1, result2);
  assert.strictEqual(result1, obj);
});

test("memoize caches different args independently", () => {
  let callCount = 0;
  const fn = (arg: string) => {
    callCount++;
    return arg.toUpperCase();
  };
  const memoized = memoize(fn);

  const result1 = memoized("a");
  const result2 = memoized("b");
  const result3 = memoized("a");

  assert.strictEqual(result1, "A");
  assert.strictEqual(result2, "B");
  assert.strictEqual(result3, "A");
  assert.strictEqual(callCount, 2);
});

test("memoize calls fn exactly once per unique arg", () => {
  let callCount = 0;
  const fn = (arg: number) => {
    callCount++;
    return arg * 2;
  };
  const memoized = memoize(fn);

  memoized(1);
  memoized(2);
  memoized(3);
  memoized(1);
  memoized(2);
  memoized(1);

  assert.strictEqual(callCount, 3);
});

test("memoize throws TypeError when fn is not a function", () => {
  assert.throws(() => memoize(null as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize(undefined as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize(42 as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize("not a function" as unknown as (arg: string) => string), TypeError);
});

test("memoize caches errors thrown by fn", () => {
  let callCount = 0;
  const fn = (arg: string) => {
    callCount++;
    if (arg === "fail") {
      throw new Error("intentional error");
    }
    return arg.toUpperCase();
  };
  const memoized = memoize(fn);

  assert.throws(() => memoized("fail"), Error, "intentional error");
  assert.strictEqual(callCount, 1);

  assert.throws(() => memoized("fail"), Error, "intentional error");
  assert.strictEqual(callCount, 1);

  const result = memoized("success");
  assert.strictEqual(result, "SUCCESS");
  assert.strictEqual(callCount, 2);
});

test("memoize correctly caches NaN as a Map key", () => {
  let callCount = 0;
  const fn = (arg: number) => {
    callCount++;
    return NaN;
  };
  const memoized = memoize(fn);

  const result1 = memoized(NaN);
  assert.strictEqual(callCount, 1);
  assert.strictEqual(result1, NaN);

  const result2 = memoized(NaN);
  assert.strictEqual(callCount, 1);
  assert.strictEqual(result2, NaN);
});

test("memoize correctly caches falsy return values", () => {
  let callCount = 0;
  const fn = (arg: string) => {
    callCount++;
    if (arg === "undefined") return undefined;
    if (arg === "null") return null;
    if (arg === "zero") return 0;
    if (arg === "empty") return "";
    return arg;
  };
  const memoized = memoize(fn);

  const resultUndefined = memoized("undefined");
  assert.strictEqual(resultUndefined, undefined);
  assert.strictEqual(callCount, 1);

  const cachedUndefined = memoized("undefined");
  assert.strictEqual(cachedUndefined, undefined);
  assert.strictEqual(callCount, 1);

  const resultNull = memoized("null");
  assert.strictEqual(resultNull, null);
  assert.strictEqual(callCount, 2);

  const cachedNull = memoized("null");
  assert.strictEqual(cachedNull, null);
  assert.strictEqual(callCount, 2);

  const resultZero = memoized("zero");
  assert.strictEqual(resultZero, 0);
  assert.strictEqual(callCount, 3);

  const cachedZero = memoized("zero");
  assert.strictEqual(cachedZero, 0);
  assert.strictEqual(callCount, 3);

  const resultEmpty = memoized("empty");
  assert.strictEqual(resultEmpty, "");
  assert.strictEqual(callCount, 4);

  const cachedEmpty = memoized("empty");
  assert.strictEqual(cachedEmpty, "");
  assert.strictEqual(callCount, 4);
});

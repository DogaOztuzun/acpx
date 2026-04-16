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

  assert.equal(result1, "A");
  assert.equal(result2, "B");
  assert.equal(result3, "A");
  assert.equal(callCount, 2);
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

  assert.equal(callCount, 3);
});

test("memoize throws TypeError when fn is not a function", () => {
  assert.throws(() => memoize(null as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize(undefined as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize(42 as unknown as (arg: string) => string), TypeError);
  assert.throws(() => memoize("not a function" as unknown as (arg: string) => string), TypeError);
});

test("memoize does not cache errors thrown by fn", () => {
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
  assert.equal(callCount, 1);

  assert.throws(() => memoized("fail"), Error, "intentional error");
  assert.equal(callCount, 2);

  const result = memoized("success");
  assert.equal(result, "SUCCESS");
  assert.equal(callCount, 3);
});

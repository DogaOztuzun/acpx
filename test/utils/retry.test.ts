import assert from "node:assert/strict";
import test from "node:test";
import { retry } from "../../src/utils/retry.js";

test("retry succeeds on first try", async () => {
  let callCount = 0;
  const result = await retry(async () => {
    callCount++;
    return "success";
  });
  assert.equal(result, "success");
  assert.equal(callCount, 1);
});

test("retry returns value from successful function", async () => {
  const result = await retry(() => Promise.resolve(42));
  assert.equal(result, 42);
});

test("retry throws immediately when maxAttempts is 0", async () => {
  await assert.rejects(
    async () =>
      retry(
        async () => {
          throw new Error("should not be called");
        },
        { maxAttempts: 0 },
      ),
    /maxAttempts must be positive/,
  );
});

test("retry throws when maxAttempts is negative", async () => {
  await assert.rejects(
    async () =>
      retry(
        async () => {
          throw new Error("should not be called");
        },
        { maxAttempts: -1 },
      ),
    /maxAttempts must be positive/,
  );
});

test("retry attempts exactly once when maxAttempts is 1", async () => {
  let callCount = 0;
  await assert.rejects(
    async () =>
      retry(
        async () => {
          callCount++;
          throw new Error("fail");
        },
        { maxAttempts: 1 },
      ),
    Error,
  );
  assert.equal(callCount, 1);
});

test("retry throws last error when all attempts fail", async () => {
  const error = new Error("persistent failure");
  await assert.rejects(
    async () =>
      retry(
        async () => {
          throw error;
        },
        { maxAttempts: 3 },
      ),
    error,
  );
});

test("retry respects maxAttempts default of 3", async () => {
  let callCount = 0;
  await assert.rejects(
    async () =>
      retry(() => {
        callCount++;
        throw new Error("fail");
      }),
    Error,
  );
  assert.equal(callCount, 3);
});

test("retry calls function maxAttempts times when it always fails", async () => {
  let callCount = 0;
  await assert.rejects(
    async () =>
      retry(
        () => {
          callCount++;
          throw new Error("always fails");
        },
        { maxAttempts: 5 },
      ),
    Error,
  );
  assert.equal(callCount, 5);
});

test("retry applies exponential backoff", async () => {
  const delays: number[] = [];
  const start = Date.now();

  await assert.rejects(
    async () =>
      retry(
        async () => {
          const elapsed = Date.now() - start;
          delays.push(elapsed);
          throw new Error("fail");
        },
        { maxAttempts: 4, baseDelay: 50 },
      ),
    Error,
  );

  assert.ok(delays.length >= 3);
  assert.ok(delays[1]! - delays[0]! >= 45);
  assert.ok(delays[2]! - delays[1]! >= 90);
});

test("retry caps delay at maxDelay", async () => {
  const delays: number[] = [];
  const start = Date.now();

  await assert.rejects(
    async () =>
      retry(
        async () => {
          const elapsed = Date.now() - start;
          delays.push(elapsed);
          throw new Error("fail");
        },
        { maxAttempts: 5, baseDelay: 100, maxDelay: 150 },
      ),
    Error,
  );

  assert.ok(delays.length >= 4);
  assert.ok(delays[1]! - delays[0]! >= 95);
  assert.ok(delays[2]! - delays[1]! >= 145);
  assert.ok(delays[3]! - delays[2]! >= 145);
});

test("retry succeeds on second attempt", async () => {
  let callCount = 0;
  const result = await retry(async () => {
    callCount++;
    if (callCount < 2) {
      throw new Error("not yet");
    }
    return "finally";
  });
  assert.equal(result, "finally");
  assert.equal(callCount, 2);
});

test("retry works with non-Error thrown values", async () => {
  let caught: unknown;
  await assert.rejects(async () => {
    await retry(
      async () => {
        throw "string error";
      },
      { maxAttempts: 2 },
    ).catch((e) => {
      caught = e;
      throw e;
    });
  });
  assert.equal(caught, "string error");
});

test("retry works with object thrown as error", async () => {
  const errorObj = { code: 500, message: "internal" };
  await assert.rejects(
    async () =>
      retry(
        async () => {
          throw errorObj;
        },
        { maxAttempts: 2 },
      ),
    errorObj,
  );
});

test("retry accepts numeric return values", async () => {
  const result = await retry(() => Promise.resolve(123));
  assert.equal(result, 123);
});

test("retry accepts object return values", async () => {
  const obj = { key: "value" };
  const result = await retry(() => Promise.resolve(obj));
  assert.deepEqual(result, obj);
});

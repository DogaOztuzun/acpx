import assert from "node:assert/strict";
import test from "node:test";
import { debounce } from "../../src/utils/debounce.js";

test("debounce basic: rapid calls only invoke once after delay", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 50);

  debounced();
  debounced();
  debounced();

  setTimeout(() => {
    assert.equal(callCount, 1);
    done();
  }, 100);
});

test("debounce cancel: pending call is cleared", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 50);

  debounced();
  debounced.cancel();

  setTimeout(() => {
    assert.equal(callCount, 0);
    done();
  }, 100);
});

test("debounce flush: pending call is invoked immediately", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 50);

  debounced();
  debounced.flush();

  setTimeout(() => {
    assert.equal(callCount, 1);
    done();
  }, 100);
});

test("debounce timer reset: calling again before delay resets the timer", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 50);

  debounced();
  setTimeout(() => debounced(), 25);
  setTimeout(() => debounced(), 50);

  setTimeout(() => {
    assert.equal(callCount, 1);
    done();
  }, 150);
});

test("debounce arguments: last arguments are used when invoked", (t, done) => {
  let lastArgs: [number, string] | null = null;
  const fn = (a: number, b: string) => {
    lastArgs = [a, b];
  };
  const debounced = debounce<typeof fn>(fn, 50);

  debounced(1, "first");
  debounced(2, "second");
  debounced(3, "third");

  setTimeout(() => {
    assert.deepEqual(lastArgs, [3, "third"]);
    done();
  }, 100);
});

test("debounce 0 delay: still defers to next tick", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 0);

  debounced();
  assert.equal(callCount, 0);

  setTimeout(() => {
    assert.equal(callCount, 1);
    done();
  }, 10);
});

test("debounce negative delay: throws RangeError", (t, done) => {
  assert.throws(() => debounce(() => {}, -1), RangeError);
  done();
});

test("debounce NaN delay: throws RangeError", (t, done) => {
  assert.throws(() => debounce(() => {}, NaN), RangeError);
  done();
});

test("debounce Infinity delay: throws RangeError", (t, done) => {
  assert.throws(() => debounce(() => {}, Infinity), RangeError);
  done();
});

test("debounce cancel when nothing is pending: no-op", (t, done) => {
  const debounced = debounce(() => {}, 50);
  debounced.cancel();
  debounced.cancel();
  done();
});

test("debounce flush when nothing is pending: no-op", (t, done) => {
  const debounced = debounce(() => {}, 50);
  debounced.flush();
  debounced.flush();
  done();
});

test("debounced function has cancel method", (t, done) => {
  const debounced = debounce(() => {}, 50);
  assert.equal(typeof debounced.cancel, "function");
  done();
});

test("debounced function has flush method", (t, done) => {
  const debounced = debounce(() => {}, 50);
  assert.equal(typeof debounced.flush, "function");
  done();
});

test("debounce flush: timer does not fire after flush", (t, done) => {
  let callCount = 0;
  const fn = () => callCount++;
  const debounced = debounce(fn, 50);

  debounced();
  debounced.flush();

  setTimeout(() => {
    assert.equal(callCount, 1);
    done();
  }, 100);
});

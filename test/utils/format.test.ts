import assert from "node:assert/strict";
import test from "node:test";
import { formatBytes } from "../../src/utils/format.js";

test("formatBytes returns 0 B for zero", () => {
  assert.equal(formatBytes(0), "0 B");
});

test("formatBytes returns NaN for NaN", () => {
  assert.equal(formatBytes(NaN), "NaN");
});

test("formatBytes formats negative numbers correctly", () => {
  assert.equal(formatBytes(-1024), "-1 KB");
  assert.equal(formatBytes(-1048576), "-1 MB");
});

test("formatBytes formats bytes correctly", () => {
  assert.equal(formatBytes(1), "1 B");
  assert.equal(formatBytes(512), "512 B");
});

test("formatBytes formats kilobytes correctly", () => {
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.50 KB");
});

test("formatBytes formats megabytes correctly", () => {
  assert.equal(formatBytes(1048576), "1 MB");
  assert.equal(formatBytes(1572864), "1.50 MB");
});

test("formatBytes formats gigabytes correctly", () => {
  assert.equal(formatBytes(1073741824), "1 GB");
});

test("formatBytes handles large values", () => {
  assert.equal(formatBytes(1099511627776), "1 TB");
});

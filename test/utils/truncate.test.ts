import assert from "node:assert/strict";
import test from "node:test";
import { truncate } from "../../src/utils/truncate.js";

test("truncate returns original string when shorter than maxLen", () => {
  assert.equal(truncate("hello", 10), "hello");
  assert.equal(truncate("hello", 5), "hello");
});

test("truncate truncates string longer than maxLen with default suffix", () => {
  assert.equal(truncate("hello world", 5), "he...");
  assert.equal(truncate("hello world", 8), "hello wo...");
});

test("truncate truncates string with custom suffix", () => {
  assert.equal(truncate("hello world", 5, ".."), "he..");
  assert.equal(truncate("hello world", 8, "~~"), "hello w~~");
});

test("truncate handles empty string", () => {
  assert.equal(truncate("", 5), "");
  assert.equal(truncate("", 0), "...");
});

test("truncate handles maxLen of 0", () => {
  assert.equal(truncate("hello", 0), "...");
  assert.equal(truncate("hello", 0, ".."), "..");
});

test("truncate handles maxLen shorter than suffix length", () => {
  assert.equal(truncate("hello", 1, "..."), ".");
  assert.equal(truncate("hello", 2, "..."), "..");
  assert.equal(truncate("hello", 3, "..."), "...");
});

test("truncate uses default suffix when not provided", () => {
  assert.equal(truncate("hello world", 5), "he...");
});

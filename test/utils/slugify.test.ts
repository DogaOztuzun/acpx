import assert from "node:assert/strict";
import test from "node:test";
import { slugify } from "../../src/utils/slugify.js";

test("slugify converts to lowercase and replaces spaces with hyphens", () => {
  assert.equal(slugify("Hello World"), "hello-world");
  assert.equal(slugify("FOO BAR"), "foo-bar");
});

test("slugify trims leading and trailing whitespace", () => {
  assert.equal(slugify("  hello  "), "hello");
  assert.equal(slugify("\thello\t"), "hello");
});

test("slugify removes non-alphanumeric characters except hyphens", () => {
  assert.equal(slugify("café résumé"), "caf-rsum");
  assert.equal(slugify("Hello! World?"), "hello-world");
  assert.equal(slugify("foo@bar.com"), "foobarcom");
});

test("slugify collapses multiple hyphens", () => {
  assert.equal(slugify("hello---world"), "hello-world");
  assert.equal(slugify("foo  bar"), "foo-bar");
});

test("slugify handles edge cases", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("   "), "");
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("123"), "123");
  assert.equal(slugify("test123"), "test123");
  assert.equal(slugify("abc-123-def"), "abc-123-def");
});

test("slugify handles mixed input", () => {
  assert.equal(slugify("  Foo  BAR  "), "foo-bar");
  assert.equal(slugify("Hello-World!"), "hello-world");
});

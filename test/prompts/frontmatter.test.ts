import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../../src/prompts/frontmatter.js";

test("parses a leading frontmatter block and returns the body after it", () => {
  const raw = `---\ndescription: "hello"\nargument-hint: [an idea]\n---\n# Title\n\nbody line`;
  const { attributes, body } = parseFrontmatter(raw);
  assert.equal(attributes.description, "hello");
  assert.equal(attributes["argument-hint"], "[an idea]");
  assert.equal(body, "# Title\n\nbody line");
});

test("a file with no leading fence has empty attributes and full body", () => {
  const raw = `# /problem-fit — Gate 0\n\n**Stage:** 0\n\n---\n\n## Why`;
  const { attributes, body } = parseFrontmatter(raw);
  assert.deepEqual(attributes, {});
  assert.equal(body, raw);
});

test("DISCRIMINATING: a body `---` divider is NOT treated as a delimiter", () => {
  // leading frontmatter present AND a `---` divider later in the body.
  const raw = `---\ndescription: "d"\n---\n# Title\n\n---\n\n## Section after divider`;
  const { attributes, body } = parseFrontmatter(raw);
  assert.equal(attributes.description, "d");
  // the body must still contain the divider and the section after it
  assert.ok(body.includes("\n---\n"), "body retains the section divider");
  assert.ok(body.includes("## Section after divider"));
});

test("strips matching surrounding quotes; leaves unquoted bracket values intact", () => {
  const { attributes } = parseFrontmatter(`---\ndescription: 'single'\nargument-hint: [raw idea]\n---\nx`);
  assert.equal(attributes.description, "single");
  assert.equal(attributes["argument-hint"], "[raw idea]");
});

test("CRLF line endings are handled", () => {
  const raw = `---\r\ndescription: "d"\r\n---\r\n# Title\r\nbody`;
  const { attributes, body } = parseFrontmatter(raw);
  assert.equal(attributes.description, "d");
  assert.equal(body.replace(/\r/g, ""), "# Title\nbody");
});

test("an opening fence with no closing fence is treated as body, not frontmatter", () => {
  const raw = `---\ndescription: "d"\n# Title with no closing fence\n\nbody`;
  const { attributes, body } = parseFrontmatter(raw);
  assert.deepEqual(attributes, {});
  assert.equal(body, raw);
});

test("an unterminated quoted value is not quote-stripped (only matching pairs are)", () => {
  const { attributes } = parseFrontmatter(`---\ndescription: "no closing quote\n---\nx`);
  // leading quote survives because there is no matching trailing quote
  assert.equal(attributes.description, '"no closing quote');
});

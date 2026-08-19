import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLinks, classifyLink } from "../../src/tools/context-audit/links.js";

test("extractLinks finds inline links with line numbers and flags malformed", () => {
  const md = "intro [a](./a.md)\nline2 [b](../b.md) and [bad]( )\n";
  const links = extractLinks(md);
  assert.equal(links.length, 3);
  assert.equal(links[0].targetRaw, "./a.md");
  assert.equal(links[0].line, 1);
  assert.equal(links[1].line, 2);
  assert.equal(links.find((l) => l.targetRaw.trim() === "")!.malformed, true);
});

test("classifyLink separates edge / external / anchor / escapes_root / malformed", () => {
  const at = (raw: string, malformed = false) => classifyLink({ targetRaw: raw, line: 1, malformed }, "src/CONTEXT.md");
  assert.equal(at("./notes.md").kind, "edge");
  assert.equal(at("./notes.md").targetPath, "src/notes.md");
  assert.equal(at("planning/CONTEXT.md#routing").kind, "edge");        // anchor stripped
  assert.equal(at("planning/CONTEXT.md#routing").targetPath, "src/planning/CONTEXT.md");  // doc-relative from src/CONTEXT.md
  assert.equal(at("https://example.com").kind, "external");
  assert.equal(at("mailto:x@y.z").kind, "external");
  assert.equal(at("#section").kind, "anchor");
  assert.equal(at("../../../etc/passwd").kind, "escapes_root");        // resolves above root
  assert.equal(at("/etc/passwd").kind, "escapes_root");               // absolute
  assert.equal(at("", true).kind, "malformed");
});

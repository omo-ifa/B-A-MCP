import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLinks, classifyLink, isRoutingPathShape, hasPlaceholderToken, isMarkdownPlaceholder, stripDestDelimiter } from "../../src/tools/context-audit/links.js";

test("extractLinks finds inline links with line numbers and flags malformed", () => {
  const md = "intro [a](./a.md)\nline2 [b](../b.md) and [bad]( )\n";
  const links = extractLinks(md);
  assert.equal(links.length, 3);
  assert.equal(links[0].targetRaw, "./a.md");
  assert.equal(links[0].line, 1);
  assert.equal(links[1].line, 2);
  assert.equal(links.find((l) => l.targetRaw.trim() === "")!.malformed, true);
});

test("extractLinks tags markdown links with source 'markdown'", () => {
  const links = extractLinks("see [a](./a.md)\n");
  assert.equal(links.length, 1);
  assert.equal(links[0].source, "markdown");
});

test("extractLinks surfaces path-shaped backtick code spans as source 'backtick'", () => {
  // Routers in the wild route via backtick code-span paths, not markdown links.
  const md = "Read `src/CONTEXT.md` before `prompts/`.\n";
  const links = extractLinks(md);
  const bt = links.filter((l) => l.source === "backtick").map((l) => l.targetRaw);
  assert.deepEqual(bt, ["src/CONTEXT.md", "prompts/"]);
});

test("extractLinks does not double-count a [`path`](path) link as a backtick edge too", () => {
  // GitHub-style `[`x`](x)` matches both the markdown and backtick scanners; the
  // backtick twin (the link text) must be suppressed so the edge counts once.
  const links = extractLinks("route via [`src/CONTEXT.md`](src/CONTEXT.md)\n");
  assert.equal(links.length, 1);
  assert.equal(links[0].source, "markdown");
  assert.equal(links[0].targetRaw, "src/CONTEXT.md");
});

test("extractLinks ignores prose backtick spans that are not path-shaped", () => {
  // Identifiers, commands, and prose in backticks must NOT become routing edges.
  const md = "The `AuditResult` type; run `npm test`; call `foo()`.\n";
  const links = extractLinks(md).filter((l) => l.source === "backtick");
  assert.equal(links.length, 0);
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

test("T1a isRoutingPathShape rejects template placeholders", () => {
  assert.equal(isRoutingPathShape("products/desktop/<dir>/AGENTS.md"), false);
  assert.equal(isRoutingPathShape("chart:<chart_id>.md"), false);
  assert.equal(isRoutingPathShape("docs/{name}.md"), false);
});

test("T1b isRoutingPathShape rejects a bare extension", () => {
  assert.equal(isRoutingPathShape(".md"), false);
  assert.equal(isRoutingPathShape("docs/.md"), false);
});

test("T1c isRoutingPathShape keeps leading-dot SEGMENTS", () => {
  // "no stem" is about the FINAL segment, not a leading dot anywhere.
  assert.equal(isRoutingPathShape(".claude/CLAUDE.md"), true);
  assert.equal(isRoutingPathShape(".github/copilot-instructions.md"), true);
});

test("T1d hasPlaceholderToken is syntax-independent", () => {
  assert.equal(hasPlaceholderToken("chart:<chart_id>"), true);
  assert.equal(hasPlaceholderToken("a/{b}/c.md"), true);
  assert.equal(hasPlaceholderToken("src/CONTEXT.md"), false);
});

test("T1e a wrapped TOKEN is a placeholder; a wrapped PATH is a delimiter", () => {
  // Design §3.2 precedence, amended 2026-08-25. The discriminator is
  // "contains / or ends in an extension".
  assert.equal(hasPlaceholderToken("<dir>"), true);            // bare token
  assert.equal(hasPlaceholderToken("<README>"), true);         // no slash, no extension
  assert.equal(hasPlaceholderToken("<docs/gone.md>"), false);  // slash -> delimiter
  assert.equal(hasPlaceholderToken("<my file.md>"), false);    // extension -> delimiter
});

test("T1f isMarkdownPlaceholder: enumerated forms only, stray brackets are NOT placeholders", () => {
  // Design §3.2 as amended 2026-08-25 (option C). Fully-wrapped token, scheme:<token>,
  // and brace-PAIR forms are placeholders; a stray bracket or a wrapped PATH is not.
  assert.equal(isMarkdownPlaceholder("<dir>"), true);              // fully-wrapped token
  assert.equal(isMarkdownPlaceholder("<README>"), true);          // token, no ext/slash
  assert.equal(isMarkdownPlaceholder("chart:<chart_id>"), true);  // scheme:<token>
  assert.equal(isMarkdownPlaceholder("templates/{name}.md"), true); // brace-pair form
  assert.equal(isMarkdownPlaceholder("a/{x,y}/z.md"), true);       // brace-pair form
  // NOT placeholders — adjudicated normally, so a broken one drifts (the FN fix):
  assert.equal(isMarkdownPlaceholder("<docs/gone.md>"), false);   // wrapped PATH -> delimiter
  assert.equal(isMarkdownPlaceholder("<docs/gone.md>#sec"), false); // partial wrap + fragment
  assert.equal(isMarkdownPlaceholder("weird}name.md"), false);    // lone stray brace
  assert.equal(isMarkdownPlaceholder("src/CONTEXT.md"), false);   // ordinary path
});

test("T1g stripDestDelimiter: fully-wrapped delimiter PATH is stripped, everything else unchanged", () => {
  assert.equal(stripDestDelimiter("<docs/gone.md>"), "docs/gone.md");  // slash -> delimiter, stripped
  assert.equal(stripDestDelimiter("<src/API.md>"), "src/API.md");      // slash -> stripped
  assert.equal(stripDestDelimiter("<a.b>"), "a.b");                    // extension -> stripped
  assert.equal(stripDestDelimiter("<dir>"), "<dir>");                  // bare token -> unchanged (excluded upstream)
  assert.equal(stripDestDelimiter("<docs/gone.md>#sec"), "<docs/gone.md>#sec"); // not fully wrapped -> unchanged
  assert.equal(stripDestDelimiter("src/CONTEXT.md"), "src/CONTEXT.md"); // no wrapper -> unchanged
});

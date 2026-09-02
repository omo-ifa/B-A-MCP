import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseFrontmatter } from "../../src/prompts/frontmatter.js";

// dist/test/prompts -> repo root is three up, then /prompts
const promptsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prompts");

test("problem-fit is normalized: description + argument-hint + one $ARGUMENTS point", () => {
  const raw = readFileSync(join(promptsDir, "problem-fit.md"), "utf8");
  const { attributes, body } = parseFrontmatter(raw);
  assert.ok(attributes.description && attributes.description.length > 0, "has description");
  assert.ok(attributes["argument-hint"] && attributes["argument-hint"].length > 0, "has argument-hint");
  const count = body.split("$ARGUMENTS").length - 1;
  assert.equal(count, 1, "exactly one $ARGUMENTS interpolation point");
  assert.ok(body.includes("## Why this gate exists"), "retains its body section (divider not eaten)");
});

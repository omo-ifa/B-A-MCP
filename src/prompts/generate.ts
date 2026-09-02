import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { listPromptNames } from "./registry.js";

export interface CommandFile {
  name: string;
  content: string;
}

/**
 * Claude Code slash-command file. `$ARGUMENTS` is PRESERVED literally (the client
 * substitutes it at slash-command time) — the opposite of the MCP server, which
 * substitutes server-side.
 *
 * Accepted limitation (do NOT "harden" this): `description` is double-quoted with
 * no escaping and `argument-hint` is emitted verbatim (unquoted). Safe for the
 * reviewed five gates (no description contains a `"`). Adding YAML-correct
 * quoting/escaping would change the emitted bytes and silently break the
 * byte-for-byte drift test without a regeneration.
 */
export function renderCommand(attributes: Record<string, string>, body: string): string {
  const fm: string[] = ["---"];
  if (attributes.description !== undefined) fm.push(`description: "${attributes.description}"`);
  if (attributes["argument-hint"] !== undefined) fm.push(`argument-hint: ${attributes["argument-hint"]}`);
  fm.push("---");
  return fm.join("\n") + "\n" + body;
}

export function computeCommandFiles(dir: string): CommandFile[] {
  return listPromptNames(dir).map((name) => {
    const { attributes, body } = parseFrontmatter(readFileSync(join(dir, `${name}.md`), "utf8"));
    return { name, content: renderCommand(attributes, body) };
  });
}

export function findOrphans(dir: string, commandsDir: string): string[] {
  const served = new Set(listPromptNames(dir));
  let entries: string[];
  try {
    entries = readdirSync(commandsDir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith(".md") && !served.has(basename(f, ".md")))
    .sort();
}

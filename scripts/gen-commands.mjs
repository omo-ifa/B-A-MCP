import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolvePromptsDir, computeCommandFiles, findOrphans } from "../dist/src/prompts/index.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const commandsDir = join(repoRoot, ".claude", "commands");
mkdirSync(commandsDir, { recursive: true });

const promptsDir = resolvePromptsDir();
for (const orphan of findOrphans(promptsDir, commandsDir)) {
  rmSync(join(commandsDir, orphan));
  console.log(`pruned orphan: ${orphan}`);
}
const files = computeCommandFiles(promptsDir);
for (const { name, content } of files) {
  const normalized = content.replace(/\n*$/, "\n"); // exactly one trailing newline
  writeFileSync(join(commandsDir, `${name}.md`), normalized, "utf8");
}
console.log(`generated ${files.length} command file(s) in .claude/commands/`);

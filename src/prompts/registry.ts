import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { statSync, readdirSync, readFileSync } from "node:fs";
import { parseFrontmatter } from "./frontmatter.js";

export class PromptDirError extends Error {}
export class UnknownPromptError extends Error {}
export class MalformedPromptError extends Error {}

function isPromptDir(p: string): boolean {
  try {
    return statSync(p).isDirectory() && readdirSync(p).some((f) => f.endsWith(".md"));
  } catch {
    return false;
  }
}

/** Nearest ancestor `prompts/` directory that actually holds `.md` files. Never cwd. */
export function resolvePromptsDir(startUrl: string = import.meta.url): string {
  let dir = dirname(fileURLToPath(startUrl));
  for (;;) {
    const candidate = join(dir, "prompts");
    if (isPromptDir(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new PromptDirError("prompt directory not found");
}

export function listPromptNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => basename(f, ".md"))
    .sort();
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}
export interface Prompt {
  name: string;
  description?: string;
  arguments: PromptArgument[];
}

function argumentsFor(attributes: Record<string, string>): PromptArgument[] {
  const hint = attributes["argument-hint"];
  if (hint === undefined || hint.trim() === "") return [];
  return [{ name: "idea", description: hint, required: false }];
}

export function listPrompts(): Prompt[] {
  const dir = resolvePromptsDir();
  return listPromptNames(dir).map((name) => {
    const { attributes } = parseFrontmatter(readFileSync(join(dir, `${name}.md`), "utf8"));
    return { name, description: attributes.description, arguments: argumentsFor(attributes) };
  });
}

export interface PromptMessage {
  role: "user";
  content: { type: "text"; text: string };
}
export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
}

const NAME_RE = /^[a-z0-9-]+$/;

function isServedName(name: string, dir: string): boolean {
  return NAME_RE.test(name) && listPromptNames(dir).includes(name);
}

export function getPrompt(name: string, args?: Record<string, string>): GetPromptResult {
  const dir = resolvePromptsDir();
  if (!isServedName(name, dir)) throw new UnknownPromptError(`unknown prompt: ${name}`);
  let raw: string;
  try {
    raw = readFileSync(join(dir, `${name}.md`), "utf8");
  } catch {
    throw new MalformedPromptError(`prompt could not be read: ${name}`);
  }
  const { attributes, body } = parseFrontmatter(raw);
  const idea = args?.idea ?? "";
  const text = body.split("$ARGUMENTS").join(idea);
  return { description: attributes.description, messages: [{ role: "user", content: { type: "text", text } }] };
}

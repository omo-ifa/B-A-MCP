export interface ParsedFrontmatter {
  attributes: Record<string, string>;
  body: string;
}

/**
 * Dependency-free frontmatter reader. A frontmatter block exists ONLY when the
 * file's first line is exactly `---`; `---` used as a markdown section divider
 * inside the body is never a delimiter. Parses flat `key: value` lines only
 * (the schema needs `description` and `argument-hint`, no nested YAML).
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const lines = raw.split("\n");
  const first = (lines[0] ?? "").replace(/\r$/, "");
  if (first !== "---") {
    return { attributes: {}, body: raw };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].replace(/\r$/, "") === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    // opening fence with no close — treat the whole file as body, not frontmatter
    return { attributes: {}, body: raw };
  }
  const attributes: Record<string, string> = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (line.trim() === "") continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value[value.length - 1] === '"') ||
        (value[0] === "'" && value[value.length - 1] === "'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) attributes[key] = value;
  }
  const body = lines.slice(end + 1).join("\n").replace(/^\r?\n/, "");
  return { attributes, body };
}

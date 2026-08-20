import { posix } from "node:path";

export type LinkKind = "edge" | "external" | "anchor" | "malformed" | "escapes_root";
export interface ClassifiedLink { kind: LinkKind; targetRaw: string; targetPath: string | null; line: number; }

export type LinkSource = "markdown" | "backtick";
export interface ExtractedLink { targetRaw: string; line: number; malformed: boolean; source: LinkSource; }

const LINK_RE = /\[[^\]]*\]\(([^)]*)\)/g;
const BACKTICK_RE = /`([^`\n]+)`/g;

// A backtick code span is a routing-edge CANDIDATE only if it is shaped like a
// path: no internal whitespace (excludes prose/commands like `npm test`), and it
// either contains a "/" or ends in ".md" (case-insensitive). Whether it actually
// routes is decided downstream by an existence check — backtick edges are
// resolve-only (see buildGraph), so a non-resolving span is treated as prose and
// never produces a broken_ref/routing_drift/escapes finding.
function isBacktickPathCandidate(raw: string): boolean {
  const t = raw.trim();
  if (t === "" || /\s/.test(t)) return false;
  if (t.startsWith("-")) return false;   // flags/options (e.g. `--out=x/y`) are not routes
  return t.includes("/") || /\.md$/i.test(t);
}

// Known limitation (resolve-only bounds the harm): this scans line-by-line and
// does NOT track ``` fenced code blocks, so a path-shaped span inside a fenced
// example that happens to resolve is treated as an edge. Effect is over-linking
// (can mask a genuine orphan / inflate coverage), never a false broken_ref.
// Revisit with fence tracking if calibration shows it matters.
export function extractLinks(content: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Markdown links first, remembering each match's character range so a backtick
    // span that is a markdown link's own label (the `[`x`](x)` idiom) is not
    // double-counted as a separate backtick edge.
    const mdRanges: [number, number][] = [];
    LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = LINK_RE.exec(line)) !== null) {
      const raw = m[1];
      const malformed = raw.trim() === "" || /\s/.test(raw.trim());
      out.push({ targetRaw: raw, line: i + 1, malformed, source: "markdown" });
      mdRanges.push([m.index, LINK_RE.lastIndex]);
    }
    BACKTICK_RE.lastIndex = 0;
    let b: RegExpExecArray | null;
    while ((b = BACKTICK_RE.exec(line)) !== null) {
      if (!isBacktickPathCandidate(b[1])) continue;
      if (mdRanges.some(([s, e]) => b!.index >= s && b!.index < e)) continue;   // inside a markdown link: already counted
      out.push({ targetRaw: b[1].trim(), line: i + 1, malformed: false, source: "backtick" });
    }
  }
  return out;
}

// The definition of a routing PATH by shape — used to decide whether a
// NON-resolving router backtick is a broken route (routing_path_missing). A
// routing path is a plain intra-repo .md doc path: it ends in `.md` and carries
// none of the markers that mean "not a repo doc route" — glob (`*` `{` `}`),
// home (`~`), env (`$`), package scope (leading `@`), whitespace, or a leading
// dash. A package scope, a shell path, or an `org/repo` ref cannot be a doc
// route in any repo, so excluding them makes the rule sharper, not looser.
// (A backtick that RESOLVES to a real file/dir is a route by existence and does
// not need this shape test.) See planning/decisions/2026-08-20_router-path-drift.md.
export function isRoutingPathShape(raw: string): boolean {
  const t = raw.trim();
  if (t === "" || /\s/.test(t)) return false;
  if (t.startsWith("-") || t.startsWith("@")) return false;
  if (/[*{}~$]/.test(t)) return false;
  return /\.md$/i.test(t);
}

export function classifyLink(raw: { targetRaw: string; line: number; malformed: boolean }, docRelPath: string): ClassifiedLink {
  const base = { targetRaw: raw.targetRaw, targetPath: null, line: raw.line };
  if (raw.malformed) return { ...base, kind: "malformed" };
  const t = raw.targetRaw.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || /^mailto:/i.test(t)) return { ...base, kind: "external" };
  const pathPart = t.split("#")[0];
  if (pathPart === "") return { ...base, kind: "anchor" };
  if (posix.isAbsolute(pathPart) || pathPart.startsWith("/")) return { ...base, kind: "escapes_root" };
  const docDir = posix.dirname(docRelPath);
  const resolved = posix.normalize(posix.join(docDir, pathPart));
  if (resolved === ".." || resolved.startsWith("../")) return { ...base, kind: "escapes_root" };
  return { ...base, kind: "edge", targetPath: resolved };
}

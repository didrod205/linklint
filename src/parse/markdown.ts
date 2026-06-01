/**
 * Extract links, headings, reference definitions and explicit anchors from a
 * Markdown document. Deliberately dependency-free and line-aware so issues can
 * point at the exact line. Code spans/fences are masked so their contents are
 * not mistaken for links or headings.
 */

import { uniqueSlugs } from "../slug.js";
import { classifyTarget } from "./classify.js";
import type { DocModel, Heading, LinkKind, RawLink } from "../types.js";

interface MaskedDoc {
  lines: string[];
  /** Per-line boolean: is this line inside a fenced code block? */
  inFence: boolean[];
}

/** Mask fenced code blocks (``` / ~~~) so we skip their lines. */
function maskFences(raw: string): MaskedDoc {
  const lines = raw.split(/\r?\n/);
  const inFence: boolean[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const m = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fence) {
      inFence.push(true);
      if (m && line.trim().startsWith(fence)) fence = null;
    } else if (m) {
      fence = m[2]![0]!.repeat(3); // ``` or ~~~
      inFence.push(true);
    } else {
      inFence.push(false);
    }
  }
  return { lines, inFence };
}

/** Replace inline code spans with spaces of equal length (keep columns). */
function maskInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const SETEXT_RE = /^(=+|-+)\s*$/;
const REF_DEF_RE = /^\s{0,3}\[([^\]]+)\]:\s+(\S+)/;
const INLINE_LINK_RE = /(!?)\[([^\]]*)\]\(([^)]*)\)/g;
const REF_LINK_RE = /(!?)\[([^\]]+)\]\[([^\]]*)\]/g;
const HTML_ID_RE = /\bid\s*=\s*["']([^"']+)["']/gi;
const HTML_NAME_RE = /<a\s+[^>]*name\s*=\s*["']([^"']+)["']/gi;

export function parseMarkdown(path: string, raw: string): DocModel {
  const { lines, inFence } = maskFences(raw);
  const links: RawLink[] = [];
  const headingTexts: { text: string; level: number; line: number }[] = [];
  const references = new Map<string, string>();
  const explicitIds = new Set<string>();

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    if (inFence[i]) return;
    const line = maskInlineCode(rawLine);

    // Reference definitions: [id]: url
    const refDef = line.match(REF_DEF_RE);
    if (refDef) {
      references.set(refDef[1]!.toLowerCase(), refDef[2]!.trim());
      return;
    }

    // ATX headings.
    const heading = line.match(HEADING_RE);
    if (heading) {
      headingTexts.push({ level: heading[1]!.length, text: stripInline(heading[2]!), line: lineNo });
    } else {
      // Setext headings: a text line followed by === or ---.
      const next = lines[i + 1];
      if (next && SETEXT_RE.test(next) && line.trim() !== "" && !inFence[i + 1]) {
        headingTexts.push({ level: next.trim()[0] === "=" ? 1 : 2, text: stripInline(line.trim()), line: lineNo });
      }
    }

    // Explicit HTML anchors inside markdown.
    let hm: RegExpExecArray | null;
    while ((hm = HTML_ID_RE.exec(line))) explicitIds.add(hm[1]!.toLowerCase());
    while ((hm = HTML_NAME_RE.exec(line))) explicitIds.add(hm[1]!.toLowerCase());

    // Inline links/images: [text](target) and ![alt](src)
    let m: RegExpExecArray | null;
    INLINE_LINK_RE.lastIndex = 0;
    while ((m = INLINE_LINK_RE.exec(line))) {
      const isImage = m[1] === "!";
      const text = m[2] ?? "";
      const target = (m[3] ?? "").trim().replace(/\s+["'].*["']$/, ""); // drop optional title
      const kind: LinkKind = isImage ? "image" : classifyTarget(target);
      links.push({ kind: target === "" ? "empty" : kind, target, text, line: lineNo });
    }

    // Reference-style links: [text][id] or [text][]
    REF_LINK_RE.lastIndex = 0;
    while ((m = REF_LINK_RE.exec(line))) {
      const text = m[2] ?? "";
      const id = (m[3] && m[3].trim() !== "" ? m[3] : m[2]) ?? "";
      links.push({ kind: "reference", target: id.toLowerCase(), refId: id.toLowerCase(), text, line: lineNo });
    }
  });

  // Resolve reference-style links to their definition's URL so they're checked
  // like normal links. Links whose id has no definition stay kind "reference"
  // (the undefined-reference rule reports them).
  for (const link of links) {
    if (link.kind !== "reference" || link.refId === undefined) continue;
    const url = references.get(link.refId);
    if (url === undefined) continue;
    const cleaned = url.replace(/^<|>$/g, "");
    link.target = cleaned;
    link.kind = cleaned === "" ? "empty" : classifyTarget(cleaned);
  }

  const slugs = uniqueSlugs(headingTexts.map((h) => h.text));
  const headings: Heading[] = headingTexts.map((h, idx) => ({
    level: h.level,
    text: h.text,
    slug: slugs[idx]!,
    line: h.line,
  }));

  return { path, format: "markdown", links, headings, references, explicitIds };
}

/** Strip inline markdown (links, emphasis, code) from heading text for slugging. */
function stripInline(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // [t](u) -> t
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, "$1") // [t][id] -> t
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

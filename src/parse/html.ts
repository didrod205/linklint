/** Extract links, headings and ids from an HTML document. */

import { parse, type HTMLElement } from "node-html-parser";
import { uniqueSlugs } from "../slug.js";
import { classifyTarget } from "./classify.js";
import type { DocModel, Heading, LinkKind, RawLink } from "../types.js";

/** Build a map of byte-offset -> line number for an HTML string. */
function lineLookup(raw: string): (index: number) => number {
  const starts: number[] = [0];
  for (let i = 0; i < raw.length; i++) if (raw.charCodeAt(i) === 10) starts.push(i + 1);
  return (index: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

function lineOf(raw: string, lookup: (i: number) => number, el: HTMLElement): number {
  const idx = (el as unknown as { range?: [number, number] }).range?.[0];
  if (typeof idx === "number") return lookup(idx);
  const outer = el.outerHTML;
  const pos = outer ? raw.indexOf(outer.slice(0, 30)) : -1;
  return pos === -1 ? 1 : lookup(pos);
}

export function parseHtml(path: string, raw: string): DocModel {
  const root = parse(raw, { comment: false });
  const lookup = lineLookup(raw);
  const links: RawLink[] = [];
  const explicitIds = new Set<string>();

  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (href === undefined) continue;
    const kind: LinkKind = href.trim() === "" ? "empty" : classifyTarget(href);
    links.push({ kind, target: href.trim(), text: a.textContent.trim(), line: lineOf(raw, lookup, a) });
  }
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src === undefined) continue;
    links.push({
      kind: "image",
      target: src.trim(),
      text: img.getAttribute("alt") ?? "",
      line: lineOf(raw, lookup, img),
    });
  }

  // Explicit ids and <a name>.
  for (const el of root.querySelectorAll("[id]")) {
    const id = el.getAttribute("id");
    if (id) explicitIds.add(id.toLowerCase());
  }
  for (const el of root.querySelectorAll("a[name]")) {
    const name = el.getAttribute("name");
    if (name) explicitIds.add(name.toLowerCase());
  }

  // Headings (for anchor slug resolution, mirroring markdown behavior).
  const headingEls = root.querySelectorAll("h1,h2,h3,h4,h5,h6");
  const texts = headingEls.map((h) => h.textContent.trim());
  const slugs = uniqueSlugs(texts);
  const headings: Heading[] = headingEls.map((h, i) => ({
    level: Number(h.tagName.slice(1)),
    text: texts[i]!,
    slug: slugs[i]!,
    line: lineOf(raw, lookup, h),
  }));

  return { path, format: "html", links, headings, references: new Map(), explicitIds };
}

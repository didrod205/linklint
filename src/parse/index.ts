/** Parse a document by extension into a DocModel. */

import { parseHtml } from "./html.js";
import { parseMarkdown } from "./markdown.js";
import type { DocModel } from "../types.js";

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function parseDocument(path: string, content: string): DocModel {
  const text = stripBom(content);
  try {
    if (/\.html?$/i.test(path)) return parseHtml(path, text);
    return parseMarkdown(path, text);
  } catch (e) {
    return {
      path,
      format: /\.html?$/i.test(path) ? "html" : "markdown",
      links: [],
      headings: [],
      references: new Map(),
      explicitIds: new Set(),
      error: (e as Error).message,
    };
  }
}

export { parseMarkdown } from "./markdown.js";
export { parseHtml } from "./html.js";
export { classifyTarget, splitTarget } from "./classify.js";

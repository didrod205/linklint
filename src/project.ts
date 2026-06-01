/** A resolved project: all docs + a cross-file anchor index. */

import { existsSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { DocModel } from "./types.js";

export interface Project {
  root: string;
  /** Absolute path -> parsed document. */
  docs: Map<string, DocModel>;
  /** Absolute doc path -> set of valid anchor slugs/ids (lowercased). */
  anchors: Map<string, Set<string>>;
}

/** Collect all valid anchors for a document (heading slugs + explicit ids). */
export function anchorsFor(doc: DocModel): Set<string> {
  const set = new Set<string>();
  for (const h of doc.headings) set.add(h.slug);
  for (const id of doc.explicitIds) set.add(id);
  return set;
}

export function buildProject(root: string, docs: Map<string, DocModel>): Project {
  const anchors = new Map<string, Set<string>>();
  for (const [path, doc] of docs) anchors.set(path, anchorsFor(doc));
  return { root, docs, anchors };
}

/** Resolve a relative target from a document to an absolute filesystem path. */
export function resolveTarget(fromDocPath: string, target: string): string {
  return resolve(dirname(fromDocPath), target);
}

export interface PathCheck {
  exists: boolean;
  isDirectory: boolean;
  /** If a directory, whether it has an index/README we can resolve to. */
  indexPath?: string;
}

const INDEX_FILES = ["index.html", "index.md", "README.md", "readme.md"];

/** Check whether a resolved filesystem path exists (with index fallback). */
export function checkPath(absPath: string): PathCheck {
  if (!existsSync(absPath)) {
    // Try common implicit extensions for extension-less links.
    for (const ext of [".md", ".html"]) {
      if (existsSync(absPath + ext)) return { exists: true, isDirectory: false };
    }
    return { exists: false, isDirectory: false };
  }
  const st = statSync(absPath);
  if (st.isDirectory()) {
    for (const idx of INDEX_FILES) {
      const candidate = resolve(absPath, idx);
      if (existsSync(candidate)) return { exists: true, isDirectory: true, indexPath: candidate };
    }
    return { exists: true, isDirectory: true };
  }
  return { exists: true, isDirectory: false };
}

/** A nice relative label for reporting. */
export function rel(root: string, absPath: string): string {
  const r = relative(root, absPath);
  return r === "" ? "." : r;
}

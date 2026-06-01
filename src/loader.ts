/** Discover and read documents from CLI targets. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { DocInput } from "./index.js";
import type { LinklintConfig } from "./types.js";

function walk(dir: string, config: LinklintConfig, out: string[]): void {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (config.ignoreDirs.includes(entry.name) || entry.name.startsWith(".")) continue;
      walk(full, config, out);
    } else if (entry.isFile() && config.extensions.includes(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
}

/** Resolve targets into absolute document paths. */
export function discoverFiles(targets: string[], config: LinklintConfig): string[] {
  const files: string[] = [];
  for (const target of targets) {
    const abs = resolve(target);
    let st: import("node:fs").Stats;
    try {
      st = statSync(abs);
    } catch {
      throw new Error(`path not found: ${target}`);
    }
    if (st.isDirectory()) walk(abs, config, files);
    else if (st.isFile()) files.push(abs);
  }
  return [...new Set(files)].sort();
}

/** Read all discovered documents into inputs. */
export function loadInputs(targets: string[], config: LinklintConfig): DocInput[] {
  const files = discoverFiles(targets, config);
  if (files.length === 0) {
    throw new Error(
      `no documents (${config.extensions.join(", ")}) found in the given path(s).`,
    );
  }
  return files.map((path) => ({ path, content: readFileSync(path, "utf8") }));
}

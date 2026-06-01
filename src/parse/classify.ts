/** Classify a raw link target into a LinkKind. */

import type { LinkKind } from "../types.js";

export function classifyTarget(target: string): LinkKind {
  const t = target.trim();
  if (t === "") return "empty";
  if (/^https?:\/\//i.test(t)) return "external";
  if (/^\/\//.test(t)) return "external"; // protocol-relative
  if (/^mailto:/i.test(t)) return "mailto";
  if (/^tel:/i.test(t)) return "tel";
  if (t.startsWith("#")) return "anchor";
  // other schemes (ftp, data, etc.) -> treat as external/unchecked
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return "external";
  if (t.includes("#")) return "cross-anchor";
  return "file";
}

/** Split a `path#anchor` target into its parts. */
export function splitTarget(target: string): { path: string; anchor: string | null } {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return { path: target, anchor: null };
  return {
    path: target.slice(0, hashIndex),
    anchor: target.slice(hashIndex + 1),
  };
}

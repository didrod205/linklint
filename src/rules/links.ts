/** Link & image integrity rules (file, anchor, cross-anchor, image). */

import { splitTarget } from "../parse/index.js";
import { checkPath, rel, resolveTarget } from "../project.js";
import { normalizeAnchor } from "../slug.js";
import type { Issue } from "../types.js";
import { isIgnored, makeIssue, type DocRule, type RuleContext } from "./context.js";

export const brokenFileLink: DocRule = {
  id: "broken-file-link",
  severity: "error",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "file") continue;
      if (isIgnored(link.target, ctx.config)) continue;
      const abs = resolveTarget(ctx.doc.path, decodeURISafe(link.target));
      if (!checkPath(abs).exists) {
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target: link.target,
            text: link.text,
            message: `Link target not found: "${link.target}"`,
            detail: `Resolved to ${rel(ctx.project.root, abs)}`,
            fix: "Fix the path or restore the missing file.",
          }),
        );
      }
    }
    return issues;
  },
};

export const brokenImage: DocRule = {
  id: "broken-image",
  severity: "error",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "image") continue;
      const target = link.target;
      if (target === "" || /^https?:\/\//i.test(target) || target.startsWith("data:")) continue;
      if (isIgnored(target, ctx.config)) continue;
      const abs = resolveTarget(ctx.doc.path, decodeURISafe(splitTarget(target).path));
      if (!checkPath(abs).exists) {
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target,
            text: link.text,
            message: `Image not found: "${target}"`,
            detail: `Resolved to ${rel(ctx.project.root, abs)}`,
            fix: "Fix the image path or add the missing file.",
          }),
        );
      }
    }
    return issues;
  },
};

export const brokenAnchor: DocRule = {
  id: "broken-anchor",
  severity: "error",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const anchors = ctx.project.anchors.get(ctx.doc.path) ?? new Set<string>();
    for (const link of ctx.doc.links) {
      if (link.kind !== "anchor") continue;
      const anchor = normalizeAnchor(link.target);
      if (anchor === "" || anchor === "top") continue; // #top is special / empty
      if (isIgnored(link.target, ctx.config)) continue;
      if (!anchors.has(anchor)) {
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target: link.target,
            text: link.text,
            message: `Anchor "#${anchor}" has no matching heading or id in this document`,
            detail: suggest(anchor, anchors),
            fix: "Use a heading's slug, or add an explicit id.",
          }),
        );
      }
    }
    return issues;
  },
};

export const brokenCrossAnchor: DocRule = {
  id: "broken-cross-anchor",
  severity: "error",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "cross-anchor") continue;
      if (isIgnored(link.target, ctx.config)) continue;
      const { path, anchor } = splitTarget(link.target);
      const abs = resolveTarget(ctx.doc.path, decodeURISafe(path));
      const check = checkPath(abs);
      if (!check.exists) {
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target: link.target,
            text: link.text,
            message: `Cross-file link target not found: "${path}"`,
            detail: `Resolved to ${rel(ctx.project.root, abs)}`,
            fix: "Fix the path or restore the missing file.",
          }),
        );
        continue;
      }
      // Resolve to the actual doc (directory -> index).
      const targetDoc = check.indexPath ?? abs;
      const anchorSet = ctx.project.anchors.get(targetDoc);
      if (anchor && anchorSet) {
        const norm = normalizeAnchor(anchor);
        if (norm !== "" && norm !== "top" && !anchorSet.has(norm)) {
          issues.push(
            makeIssue(this, ctx, {
              line: link.line,
              target: link.target,
              text: link.text,
              message: `Anchor "#${norm}" not found in ${rel(ctx.project.root, targetDoc)}`,
              detail: suggest(norm, anchorSet),
              fix: "Point to an existing heading slug in the target file.",
            }),
          );
        }
      }
    }
    return issues;
  },
};

function decodeURISafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Suggest the closest anchor (simple prefix/contains match) for a typo. */
function suggest(anchor: string, anchors: Set<string>): string | undefined {
  const candidates = [...anchors].filter((a) => a.includes(anchor) || anchor.includes(a));
  if (candidates.length > 0) return `Did you mean "#${candidates[0]}"?`;
  return undefined;
}

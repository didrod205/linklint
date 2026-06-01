/** Hygiene rules: references, empty links, mailto, external, absolute paths. */

import { isAbsolute } from "node:path";
import type { Issue } from "../types.js";
import { isIgnored, makeIssue, type DocRule, type RuleContext } from "./context.js";

export const undefinedReference: DocRule = {
  id: "undefined-reference",
  severity: "error",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      // After parse, only reference links whose id had NO definition remain
      // kind "reference" (defined ones are resolved to their target & kind).
      if (link.kind !== "reference") continue;
      const id = link.refId ?? link.target;
      issues.push(
        makeIssue(this, ctx, {
          line: link.line,
          target: id,
          text: link.text,
          message: `Reference "[${id}]" is never defined`,
          detail: "Reference-style links need a matching `[id]: url` definition.",
          fix: `Add a definition: [${id}]: <url>`,
        }),
      );
    }
    return issues;
  },
};

export const ambiguousAnchor: DocRule = {
  id: "ambiguous-anchor",
  severity: "info",
  run(ctx: RuleContext): Issue[] {
    // Two headings producing the same base slug -> the 2nd needs a -1 suffix.
    const counts = new Map<string, number>();
    for (const h of ctx.doc.headings) {
      const base = h.slug.replace(/-\d+$/, "");
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    const issues: Issue[] = [];
    const reported = new Set<string>();
    for (const h of ctx.doc.headings) {
      const base = h.slug.replace(/-\d+$/, "");
      if ((counts.get(base) ?? 0) > 1 && !reported.has(base)) {
        reported.add(base);
        issues.push(
          makeIssue(this, ctx, {
            line: h.line,
            target: `#${base}`,
            message: `Multiple headings slug to "#${base}" — anchors get -1/-2 suffixes`,
            detail: "Linking to the duplicate requires the numbered slug (e.g. #" + base + "-1).",
            fix: "Rename headings to be unique, or link with the suffixed slug.",
          }),
        );
      }
    }
    return issues;
  },
};

export const emptyLink: DocRule = {
  id: "empty-link",
  severity: "warning",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "empty") continue;
      issues.push(
        makeIssue(this, ctx, {
          line: link.line,
          target: "",
          text: link.text,
          message: `Empty link target for "${link.text || "(no text)"}"`,
          fix: "Add a URL/path, or remove the link.",
        }),
      );
    }
    return issues;
  },
};

export const mailtoFormat: DocRule = {
  id: "mailto-format",
  severity: "warning",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "mailto") continue;
      const addr = link.target.replace(/^mailto:/i, "").split("?")[0] ?? "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target: link.target,
            text: link.text,
            message: `Malformed mailto address: "${addr || "(empty)"}"`,
            fix: "Use a valid email, e.g. mailto:hello@example.com.",
          }),
        );
      }
    }
    return issues;
  },
};

export const absolutePathLink: DocRule = {
  id: "absolute-path-link",
  severity: "warning",
  run(ctx: RuleContext): Issue[] {
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "file" && link.kind !== "cross-anchor" && link.kind !== "image") continue;
      if (isIgnored(link.target, ctx.config)) continue;
      // OS-absolute paths (e.g. /Users/..., C:\) are non-portable in docs.
      if (isAbsolute(link.target) && !link.target.startsWith("/")) {
        // Windows drive path.
        issues.push(
          makeIssue(this, ctx, {
            line: link.line,
            target: link.target,
            text: link.text,
            message: `Absolute filesystem path: "${link.target}"`,
            fix: "Use a relative path so the link works for everyone.",
          }),
        );
      }
    }
    return issues;
  },
};

export const externalLink: DocRule = {
  id: "external-link",
  severity: "info",
  run(ctx: RuleContext): Issue[] {
    if (!ctx.config.reportExternal) return [];
    const issues: Issue[] = [];
    for (const link of ctx.doc.links) {
      if (link.kind !== "external") continue;
      issues.push(
        makeIssue(this, ctx, {
          line: link.line,
          target: link.target,
          text: link.text,
          message: `External link (not network-checked): ${link.target}`,
          fix: "linklint checks internal integrity only; verify external URLs separately.",
        }),
      );
    }
    return issues;
  },
};

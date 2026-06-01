/**
 * linklint — check internal link & anchor integrity in Markdown/HTML docs.
 * Verifies relative file links, same-doc and cross-file #anchors (GitHub slug
 * rules), images, reference definitions and more — deterministically, with no
 * network calls. This module is the programmatic API; see `cli.ts`.
 */

import { dirname, resolve } from "node:path";
import { DEFAULT_CONFIG } from "./config.js";
import { parseDocument } from "./parse/index.js";
import { splitTarget } from "./parse/classify.js";
import { buildProject, checkPath, rel, resolveTarget, type Project } from "./project.js";
import { DOC_RULES } from "./rules/index.js";
import { gradeFor, scoreDoc } from "./score.js";
import type {
  DocModel,
  DocReport,
  Issue,
  LinklintConfig,
  Report,
  RuleId,
} from "./types.js";

export * from "./types.js";
export { DEFAULT_CONFIG, loadConfig } from "./config.js";
export { parseDocument, parseMarkdown, parseHtml } from "./parse/index.js";
export { slugify, uniqueSlugs, normalizeAnchor } from "./slug.js";
export { buildProject, checkPath, resolveTarget } from "./project.js";
export { gradeFor } from "./score.js";
export { toJSON } from "./report/json.js";
export { toMarkdown } from "./report/markdown.js";

export interface DocInput {
  /** Absolute path is recommended so cross-file resolution works. */
  path: string;
  content: string;
}

/** Build a Project from a set of document inputs (paths should be absolute). */
export function buildProjectFromInputs(root: string, inputs: DocInput[]): Project {
  const docs = new Map<string, DocModel>();
  for (const input of inputs) {
    const abs = resolve(input.path);
    docs.set(abs, parseDocument(abs, input.content));
  }
  return buildProject(resolve(root), docs);
}

/** Run all per-document rules for one doc within a project. */
export function lintDocument(
  doc: DocModel,
  project: Project,
  config: LinklintConfig = DEFAULT_CONFIG,
): DocReport {
  const issues: Issue[] = [];
  if (doc.error) {
    issues.push({
      rule: "parse-error",
      severity: "error",
      document: doc.path,
      target: "",
      message: `Could not parse ${rel(project.root, doc.path)}: ${doc.error}`,
    });
  }
  const ctx = { doc, project, config };
  for (const rule of DOC_RULES) {
    if (config.ruleSeverity[rule.id] === undefined && config.ruleSeverity) {
      // (no-op: severity overrides handled inside rules)
    }
    issues.push(...rule.run(ctx));
  }

  const counts = { error: 0, warning: 0, info: 0 };
  for (const i of issues) counts[i.severity]++;
  const score = scoreDoc(doc.links.length, issues);
  return {
    path: doc.path,
    links: doc.links.length,
    score,
    grade: gradeFor(score),
    counts,
    issues,
  };
}

/** Compute which documents nothing links to (orphans). */
export function findOrphans(project: Project): string[] {
  const linkedTo = new Set<string>();
  for (const [fromPath, doc] of project.docs) {
    for (const link of doc.links) {
      if (link.kind === "file" || link.kind === "cross-anchor") {
        const { path } = splitTarget(link.target);
        if (path === "") continue;
        const abs = resolveTarget(fromPath, safeDecode(path));
        const check = checkPath(abs);
        linkedTo.add(check.indexPath ?? abs);
      }
    }
  }
  const orphans: string[] = [];
  for (const path of project.docs.keys()) {
    // A root README is never an orphan.
    if (/readme\.md$/i.test(path) && dirname(path) === project.root) continue;
    if (!linkedTo.has(path)) orphans.push(path);
  }
  return orphans.sort();
}

export interface AnalyzeOptions {
  version?: string;
  now?: Date;
}

/** Lint an entire project and assemble a report. */
export function analyze(
  project: Project,
  config: LinklintConfig = DEFAULT_CONFIG,
  options: AnalyzeOptions = {},
): Report {
  const docReports: DocReport[] = [];
  for (const doc of project.docs.values()) {
    docReports.push(lintDocument(doc, project, config));
  }

  // Orphan documents (project-level rule).
  if (config.checkOrphans) {
    const orphans = findOrphans(project);
    const sev = config.ruleSeverity["orphan-document"] ?? "info";
    for (const orphan of orphans) {
      const report = docReports.find((d) => d.path === orphan);
      const issue: Issue = {
        rule: "orphan-document",
        severity: sev,
        document: orphan,
        target: "",
        message: `Nothing links to ${rel(project.root, orphan)}`,
        fix: "Link to it from an index/README, or remove it if obsolete.",
      };
      if (report) {
        report.issues.push(issue);
        report.counts[sev]++;
        report.score = scoreDoc(report.links, report.issues);
        report.grade = gradeFor(report.score);
      }
    }
  }

  docReports.sort((a, b) => a.path.localeCompare(b.path));

  const links = docReports.reduce((s, d) => s + d.links, 0);
  const errors = docReports.reduce((s, d) => s + d.counts.error, 0);
  const warnings = docReports.reduce((s, d) => s + d.counts.warning, 0);
  const infos = docReports.reduce((s, d) => s + d.counts.info, 0);
  const score = docReports.length
    ? Math.round(docReports.reduce((s, d) => s + d.score, 0) / docReports.length)
    : 100;

  const ruleCounts = new Map<RuleId, number>();
  for (const d of docReports) {
    for (const i of d.issues) ruleCounts.set(i.rule, (ruleCounts.get(i.rule) ?? 0) + 1);
  }
  const byRule = [...ruleCounts.entries()]
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule));

  // Relativize document paths for the report.
  const relDocs = docReports.map((d) => ({
    ...d,
    path: rel(project.root, d.path),
    issues: d.issues.map((i) => ({ ...i, document: rel(project.root, i.document) })),
  }));

  return {
    tool: "linklint",
    version: options.version ?? "0.0.0",
    generatedAt: (options.now ?? new Date()).toISOString(),
    root: project.root,
    summary: {
      documents: docReports.length,
      links,
      score,
      grade: gradeFor(score),
      errors,
      warnings,
      infos,
      byRule,
    },
    documents: relDocs,
  };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

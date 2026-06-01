/** Core types for linklint. */

export type Severity = "error" | "warning" | "info";

export type LinkKind =
  | "file" // relative link to another file
  | "anchor" // same-document #anchor
  | "cross-anchor" // other.md#anchor
  | "image" // ![](src)
  | "external" // http(s)://
  | "mailto"
  | "tel"
  | "reference" // [text][id]
  | "empty"; // [text]()

export type RuleId =
  | "parse-error"
  | "broken-file-link"
  | "broken-anchor"
  | "broken-cross-anchor"
  | "broken-image"
  | "undefined-reference"
  | "ambiguous-anchor"
  | "empty-link"
  | "mailto-format"
  | "external-link"
  | "absolute-path-link"
  | "orphan-document";

export const RULE_LABELS: Record<RuleId, string> = {
  "parse-error": "Parse error",
  "broken-file-link": "Broken file link",
  "broken-anchor": "Broken anchor",
  "broken-cross-anchor": "Broken cross-file anchor",
  "broken-image": "Broken image",
  "undefined-reference": "Undefined reference",
  "ambiguous-anchor": "Ambiguous anchor",
  "empty-link": "Empty link",
  "mailto-format": "Malformed mailto",
  "external-link": "External link (unchecked)",
  "absolute-path-link": "Absolute filesystem path",
  "orphan-document": "Orphan document",
};

/** A raw link extracted from a document. */
export interface RawLink {
  kind: LinkKind;
  /** Raw href/target as written (resolved to the ref URL for reference links). */
  target: string;
  /** For reference-style links, the reference id used (before resolution). */
  refId?: string;
  /** Visible text (or alt for images). */
  text: string;
  line: number;
}

/** A heading extracted from a document, with its computed slug. */
export interface Heading {
  level: number;
  text: string;
  slug: string;
  line: number;
}

/** Parsed model of a single document. */
export interface DocModel {
  path: string;
  format: "markdown" | "html";
  links: RawLink[];
  headings: Heading[];
  /** Reference-definition ids -> their URL/target (markdown). */
  references: Map<string, string>;
  /** Explicit anchor ids (HTML id=, or <a name>). */
  explicitIds: Set<string>;
  error?: string;
}

export interface Issue {
  rule: RuleId;
  severity: Severity;
  document: string;
  line?: number;
  target: string;
  text?: string;
  message: string;
  detail?: string;
  fix?: string;
}

export interface DocReport {
  path: string;
  links: number;
  score: number;
  grade: string;
  counts: { error: number; warning: number; info: number };
  issues: Issue[];
}

export interface Report {
  tool: "linklint";
  version: string;
  generatedAt: string;
  root: string;
  summary: {
    documents: number;
    links: number;
    score: number;
    grade: string;
    errors: number;
    warnings: number;
    infos: number;
    byRule: { rule: RuleId; count: number }[];
  };
  documents: DocReport[];
}

export interface LinklintConfig {
  /** Glob-ish extensions to scan. */
  extensions: string[];
  /** Directory names to skip while walking. */
  ignoreDirs: string[];
  /** Report external (http) links as info instead of skipping silently. */
  reportExternal: boolean;
  /** Flag documents that nothing links to. */
  checkOrphans: boolean;
  /** Treat these target substrings as always-valid (skip checking). */
  ignoreTargets: string[];
  /** CI gate: minimum overall score. */
  minScore: number;
  ruleSeverity: Partial<Record<RuleId, Severity>>;
}

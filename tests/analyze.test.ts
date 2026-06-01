import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, buildProjectFromInputs, toJSON, toMarkdown, gradeFor } from "../src/index.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { loadInputs } from "../src/loader.js";
import type { Report } from "../src/types.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "linklint-"));
  mkdirSync(join(dir, "sub"), { recursive: true });
  writeFileSync(
    join(dir, "README.md"),
    [
      "# Home",
      "",
      "- [Good file](sub/page.md)",
      "- [Good anchor](#home)",
      "- [Good cross](sub/page.md#details)",
      "- [Bad file](missing.md)",
      "- [Bad anchor](#nope)",
      "- [Bad cross anchor](sub/page.md#missing)",
      "- ![img](logo.svg)",
      "- ![bad img](nope.png)",
    ].join("\n"),
  );
  writeFileSync(join(dir, "logo.svg"), "<svg></svg>");
  writeFileSync(join(dir, "sub", "page.md"), "# Page\n\n## Details\n\nText.\n");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(config = DEFAULT_CONFIG): Report {
  const inputs = loadInputs([dir], config);
  const project = buildProjectFromInputs(dir, inputs);
  return analyze(project, config, { version: "9.9.9", now: new Date("2026-01-01T00:00:00Z") });
}

describe("analyze (integration)", () => {
  it("finds exactly the planted broken links", () => {
    const report = run();
    const readme = report.documents.find((d) => d.path === "README.md")!;
    const rules = readme.issues.map((i) => i.rule).sort();
    expect(rules).toContain("broken-file-link");
    expect(rules).toContain("broken-anchor");
    expect(rules).toContain("broken-cross-anchor");
    expect(rules).toContain("broken-image");
    // 4 broken of 8 links
    expect(readme.counts.error).toBe(4);
  });

  it("does not flag the valid links", () => {
    const report = run();
    const messages = report.documents.flatMap((d) => d.issues.map((i) => i.target));
    expect(messages).not.toContain("sub/page.md"); // valid file + valid cross anchor
    expect(messages).not.toContain("#home");
  });

  it("resolves cross-file anchors against the target document's headings", () => {
    const report = run();
    const crossIssue = report.documents
      .flatMap((d) => d.issues)
      .find((i) => i.rule === "broken-cross-anchor");
    expect(crossIssue?.target).toContain("#missing");
  });

  it("is deterministic", () => {
    expect(toJSON(run())).toBe(toJSON(run()));
  });

  it("flags orphans when enabled", () => {
    const report = run({ ...DEFAULT_CONFIG, checkOrphans: true });
    // sub/page.md IS linked; nothing should be orphaned except none here.
    const orphanIssues = report.documents.flatMap((d) => d.issues).filter((i) => i.rule === "orphan-document");
    // README is root (never orphan), page.md is linked -> no orphans
    expect(orphanIssues.length).toBe(0);
  });

  it("renders JSON and Markdown", () => {
    const report = run();
    expect(JSON.parse(toJSON(report)).tool).toBe("linklint");
    const md = toMarkdown(report);
    expect(md).toContain("# linklint report");
    expect(md).toContain("Issues by rule");
  });

  it("grades correctly", () => {
    expect(gradeFor(95)).toBe("A");
    expect(gradeFor(40)).toBe("F");
  });
});

describe("orphan detection", () => {
  it("flags a document nothing links to", () => {
    const d2 = mkdtempSync(join(tmpdir(), "linklint-orphan-"));
    writeFileSync(join(d2, "README.md"), "# Root\n\nNo links here.\n");
    writeFileSync(join(d2, "lonely.md"), "# Lonely\n");
    try {
      const inputs = loadInputs([d2], DEFAULT_CONFIG);
      const project = buildProjectFromInputs(d2, inputs);
      const report = analyze(project, { ...DEFAULT_CONFIG, checkOrphans: true });
      const orphans = report.documents.flatMap((d) => d.issues).filter((i) => i.rule === "orphan-document");
      expect(orphans.some((o) => o.document === "lonely.md")).toBe(true);
    } finally {
      rmSync(d2, { recursive: true, force: true });
    }
  });
});

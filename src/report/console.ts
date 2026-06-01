import pc from "picocolors";
import type { Report, Severity } from "../types.js";

const MARK: Record<Severity, (s: string) => string> = {
  error: (s) => pc.red(s),
  warning: (s) => pc.yellow(s),
  info: (s) => pc.blue(s),
};
const SIGN: Record<Severity, string> = { error: "✗", warning: "⚠", info: "ℹ" };

function gradeColor(grade: string, text: string): string {
  if (grade === "A") return pc.green(text);
  if (grade === "B") return pc.cyan(text);
  if (grade === "C") return pc.yellow(text);
  return pc.red(text);
}

/** Print a report to the console. When `quiet`, info-level issues are hidden. */
export function printReport(report: Report, quiet = false): void {
  for (const doc of report.documents) {
    const issues = quiet ? doc.issues.filter((i) => i.severity !== "info") : doc.issues;
    if (issues.length === 0) continue;
    const head = gradeColor(doc.grade, `${doc.score}/100 (${doc.grade})`);
    console.log(`\n${pc.bold(doc.path)}  ${head}  ${pc.dim(`${doc.links} links`)}`);
    for (const i of issues) {
      const loc = i.line ? pc.dim(`:${i.line}`) : "";
      console.log(`  ${MARK[i.severity](SIGN[i.severity])} ${i.message}${loc}`);
      if (i.detail) console.log(`      ${pc.dim(i.detail)}`);
      if (i.fix) console.log(`      ${pc.dim("→ " + i.fix)}`);
    }
  }

  const s = report.summary;
  const head = gradeColor(s.grade, `${s.score}/100 (${s.grade})`);
  const clean = s.errors + s.warnings === 0;
  if (clean && !quiet) console.log(`\n${pc.green("✓")} ${pc.dim("no broken links or anchors")}`);
  console.log(
    `\n${pc.bold("Overall")}  ${head}  ` +
      `${s.documents} doc(s), ${s.links} link(s), ` +
      `${pc.red(`${s.errors} error(s)`)}, ${pc.yellow(`${s.warnings} warning(s)`)}, ${s.infos} info`,
  );
}

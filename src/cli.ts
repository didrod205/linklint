#!/usr/bin/env node
/** linklint command-line interface. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cac } from "cac";
import pkg from "../package.json";
import { DEFAULT_CONFIG, loadConfig } from "./config.js";
import { analyze, buildProjectFromInputs } from "./index.js";
import { loadInputs } from "./loader.js";
import { printReport } from "./report/console.js";
import { toJSON } from "./report/json.js";
import { toMarkdown } from "./report/markdown.js";
import type { Report } from "./types.js";

const CONFIG_FILE = "linklint.config.json";
const cli = cac("linklint");

interface ScanOptions {
  config?: string;
  external?: boolean;
  orphans?: boolean;
  json?: string;
  md?: string;
  minScore?: string;
  quiet?: boolean;
}

cli
  .command("scan [...targets]", "Check links & anchors in docs (default: current dir)")
  .option("--config <file>", "Path to a config file")
  .option("--external", "Also report external (http) links as info")
  .option("--orphans", "Flag documents nothing links to")
  .option("--json <file>", "Write a JSON report")
  .option("--md <file>", "Write a Markdown report")
  .option("--min-score <n>", "Exit non-zero if the overall score is below this (CI gate)")
  .option("--quiet", "Hide info-level issues in the console")
  .example("  linklint scan")
  .example("  linklint scan ./docs README.md --min-score 95")
  .example("  linklint scan . --orphans --json report.json")
  .action((targets: string[], options: ScanOptions) => {
    const dirs = targets && targets.length > 0 ? targets : ["."];
    try {
      const config = loadConfig(options.config);
      if (options.external) config.reportExternal = true;
      if (options.orphans) config.checkOrphans = true;

      const inputs = loadInputs(dirs, config);
      // Use the common root (cwd) so cross-file resolution + rel paths work.
      const project = buildProjectFromInputs(process.cwd(), inputs);
      const report = analyze(project, config, { version: pkg.version });

      printReport(report, Boolean(options.quiet));

      if (options.json) {
        writeFileSync(resolve(options.json), toJSON(report));
        console.log(`\nWrote JSON report → ${options.json}`);
      }
      if (options.md) {
        writeFileSync(resolve(options.md), toMarkdown(report));
        console.log(`Wrote Markdown report → ${options.md}`);
      }

      const minScore = options.minScore !== undefined ? Number(options.minScore) : config.minScore;
      // Default CI behavior: any error fails unless a minScore was set explicitly.
      if (options.minScore !== undefined) {
        if (report.summary.score < minScore) {
          console.error(`\nlinklint: score ${report.summary.score} is below the minimum ${minScore}.`);
          process.exit(1);
        }
      } else if (report.summary.errors > 0) {
        process.exit(1);
      }
    } catch (e) {
      console.error(`linklint: ${(e as Error).message}`);
      process.exit(2);
    }
  });

cli
  .command("report <input>", "Re-render a saved JSON report as Markdown")
  .option("--md <file>", "Write Markdown to this path instead of stdout")
  .action((input: string, options: { md?: string }) => {
    try {
      const report = JSON.parse(readFileSync(resolve(input), "utf8")) as Report;
      const md = toMarkdown(report);
      if (options.md) {
        writeFileSync(resolve(options.md), md);
        console.log(`Wrote ${options.md}`);
      } else {
        process.stdout.write(md);
      }
    } catch (e) {
      console.error(`linklint: ${(e as Error).message}`);
      process.exit(2);
    }
  });

cli
  .command("init", "Create a linklint config file with the defaults")
  .option("--force", "Overwrite an existing config")
  .action((options: { force?: boolean }) => {
    const file = resolve(CONFIG_FILE);
    if (existsSync(file) && !options.force) {
      console.error(`linklint: ${CONFIG_FILE} already exists (use --force to overwrite).`);
      process.exit(1);
    }
    writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    console.log(`Created ${CONFIG_FILE}`);
  });

cli.help();
cli.version(pkg.version);
cli.parse();

# Changelog

All notable changes are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-01

### Added

- Initial public release.
- `scan` command: check internal link & anchor integrity in Markdown/HTML docs.
- `report` command: re-render a saved JSON report as Markdown.
- `init` command: scaffold a `linklint.config.json`.
- Dependency-free, code-fence-aware Markdown parser (links, images, headings,
  reference definitions, explicit ids) + HTML parser.
- GitHub-compatible heading slug generation, including duplicate `-1`/`-2`
  suffixes, for anchor resolution.
- Checks: broken relative file links, dead same-document anchors, broken
  cross-file anchors (`other.md#section`), missing images, undefined references,
  ambiguous duplicate-heading anchors, empty links, malformed `mailto:`,
  absolute filesystem paths, external links (opt-in), and orphan documents.
- Project-wide anchor index so cross-file anchors resolve against the target
  document's actual headings; directory `index`/`README` fallback.
- Score with an A–F grade per document and overall.
- JSON (`--json`) and Markdown (`--md`) export; colored console output.
- CI gate: non-zero exit on errors, or `--min-score`.
- Config: extensions, ignoreDirs, reportExternal, checkOrphans, ignoreTargets,
  per-rule severities.
- Programmatic API: `buildProjectFromInputs`, `analyze`, `lintDocument`,
  `parseMarkdown`, `slugify`, `toJSON`, `toMarkdown`.
- Deterministic; **no network calls**. ESM + CJS + TypeScript types.

[0.1.0]: https://github.com/didrod205/linklint/releases/tag/v0.1.0

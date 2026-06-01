<div align="center">

# 🔗 linklint

### Catch broken links & dead anchors in your docs — locally, no network.

[![npm version](https://img.shields.io/npm/v/@didrod2539/linklint.svg?color=success)](https://www.npmjs.com/package/@didrod2539/linklint)
[![CI](https://github.com/didrod205/linklint/actions/workflows/ci.yml/badge.svg)](https://github.com/didrod205/linklint/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/@didrod2539/linklint.svg)](https://www.npmjs.com/package/@didrod2539/linklint)
[![license](https://img.shields.io/npm/l/@didrod2539/linklint.svg)](./LICENSE)

A deterministic CLI that checks the **internal integrity** of your Markdown/HTML
docs: broken relative links, dead `#anchors` (using GitHub's slug rules),
cross-file anchors (`other.md#section`), missing images, and undefined
references — **without making a single network request**. Score, A–F grade, and
JSON/Markdown reports.

</div>

---

## One-line summary

`linklint` builds a link/anchor graph of your docs and reports every internal
link that points at a file, heading, or image that doesn't exist — fast,
deterministic, and offline.

## Why this project exists

When you rename a file, restructure `docs/`, or edit a heading, links break
**silently**:

- A relative link points at a file you moved — readers hit a 404.
- A table-of-contents anchor (`#installation`) survives, but you renamed the
  heading — the link now scrolls nowhere.
- A cross-file link `../api.md#auth` references a section that was deleted.
- An image `![](./diagram.png)` lost its file in a refactor.

These never fail your build, so **users find them before you do** — and broken
docs erode trust, hurt SEO, and slow onboarding. Existing checkers like
`markdown-link-check` and `lychee` focus on **external URLs**, which is slow and
rate-limited. `linklint` does the part that's fully knowable and deterministic:
**internal** link & anchor integrity. It's the perfect pre-commit / CI gate.

## Key features

- 📄 **Relative file links** — resolves and verifies every `[x](./path)` link
  (with directory-`index`/`README` fallback and extension-less resolution).
- ⚓ **Anchor checks** — validates `#section` against headings using **GitHub's
  slug algorithm** (including duplicate `-1`/`-2` suffixes) and explicit `id`s.
- 🔀 **Cross-file anchors** — checks `other.md#heading` against the *target*
  document's headings, project-wide.
- 🖼️ **Images** — flags missing local image sources.
- 🧩 **Reference links** — resolves `[text][id]` to its definition and verifies
  it; flags undefined references.
- 🧹 **Hygiene** — empty links, malformed `mailto:`, absolute filesystem paths,
  ambiguous duplicate-heading anchors, and optional orphan-document detection.
- 📊 **Score + A–F grade**, JSON/Markdown export, **CI gate** exit codes.
- 🔒 **No network.** Internal integrity only — deterministic and instant.

## Install

```bash
# run without installing
npx @didrod2539/linklint scan

# or install
npm install -g @didrod2539/linklint    # global CLI (provides `linklint`)
npm install -D @didrod2539/linklint    # project dev-dependency (for CI)
```

Node ≥ 18. ESM + CJS + TypeScript types.

## Quick start

```bash
# scan the current directory (Markdown + HTML)
linklint scan
```

```
docs/README.md  31/100 (F)  13 links
  ✗ Link target not found: "missing-page.md":13
  ✗ Anchor "#does-not-exist" has no matching heading or id in this document:9
  ✗ Anchor "#no-such-heading" not found in docs/guide.md:12
  ✗ Image not found: "images/missing.png":16

docs/guide.md  74/100 (C)  3 links
  ✗ Reference "[nope]" is never defined:17
  ⚠ Multiple headings slug to "#setup" — anchors get -1/-2 suffixes:7

Overall  68/100 (D)  3 doc(s), 17 link(s), 6 error(s), 1 warning(s), 0 info
```

## CLI usage

```bash
linklint scan [...targets]    # check docs (files or directories; default: .)
linklint report <input.json>  # re-render a saved JSON report as Markdown
linklint init                 # scaffold linklint.config.json
linklint --help
linklint --version
```

`scan` options:

| Option | Description |
| --- | --- |
| `--config <file>` | Path to a config file (otherwise auto-detected) |
| `--external` | Also report external (http) links as info |
| `--orphans` | Flag documents nothing links to |
| `--json <file>` | Write a JSON report |
| `--md <file>` | Write a Markdown report |
| `--min-score <n>` | Exit non-zero if the overall score < n |
| `--quiet` | Hide info-level issues in the console |

Without `--min-score`, `scan` exits non-zero if there are **any errors** — so
it's a CI gate out of the box. Pointed at a directory it recurses, skipping
`node_modules`, `.git`, build folders, etc.

## Example result

Full reports for the bundled sample docs are in
[`examples/sample-report.md`](./examples/sample-report.md) and
[`examples/sample-report.json`](./examples/sample-report.json).

> 📸 _Screenshot / demo GIF placeholder:_ `./docs/screenshot.png` — record the
> terminal running `npx @didrod2539/linklint scan examples/docs`.

## Configuration

Create `linklint.config.json` (or run `linklint init`):

```json
{
  "extensions": [".md", ".markdown", ".html", ".htm"],
  "ignoreDirs": ["node_modules", ".git", "dist", "build"],
  "reportExternal": false,
  "checkOrphans": true,
  "ignoreTargets": ["CHANGELOG"],
  "minScore": 90,
  "ruleSeverity": { "ambiguous-anchor": "warning" }
}
```

| Field | Meaning |
| --- | --- |
| `extensions` | File extensions to scan |
| `ignoreDirs` | Directory names to skip while walking |
| `reportExternal` | Emit external `http(s)` links as info (not network-checked) |
| `checkOrphans` | Flag documents that nothing links to |
| `ignoreTargets` | Substrings; matching link targets are skipped |
| `minScore` | CI gate threshold (overridable with `--min-score`) |
| `ruleSeverity` | Override severity per rule id |

Rule ids: `broken-file-link`, `broken-anchor`, `broken-cross-anchor`,
`broken-image`, `undefined-reference`, `ambiguous-anchor`, `empty-link`,
`mailto-format`, `absolute-path-link`, `external-link`, `orphan-document`.

## Real-world use cases

1. **Gate docs in CI.** Add `linklint scan` to your workflow. A PR that renames
   a file or a heading and leaves a stale link fails the build before the broken
   doc ships.
2. **Pre-commit safety net.** Run `linklint scan docs/ README.md` in a
   pre-commit hook so internal links are verified at authoring time — no browser,
   no network, instant.
3. **Audit a large docs site or wiki.** `linklint scan . --orphans --md
   link-audit.md` produces a graded report of every broken link, dead anchor,
   and orphaned page across hundreds of files.

## Programmatic API

```ts
import { buildProjectFromInputs, analyze, toMarkdown } from "@didrod2539/linklint";

const project = buildProjectFromInputs(root, inputs); // inputs: { path, content }[]
const report = analyze(project, config);
console.log(report.summary.errors, report.documents);
await fs.writeFile("links.md", toMarkdown(report));
```

## Roadmap

- Optional external link checking (opt-in, cached, rate-limited).
- AsciiDoc and reStructuredText support.
- `--fix` to update links when files are renamed (with a moves map).
- Auto-suggest the closest heading slug for a typo'd anchor (basic version ships
  in the "Did you mean…?" detail).
- Monorepo / multi-root awareness and a base-path option for site builders.
- A GitHub Action with PR annotations on changed docs.

## FAQ

**Does it check external URLs (http/https)?**
No — by design. External checking is slow, flaky, and rate-limited. linklint
focuses on **internal** integrity, which is deterministic and instant. Use
`--external` to at least *list* external links, and pair with a dedicated
external checker if you need it.

**How does anchor checking work?**
It computes each heading's slug with **GitHub's algorithm** (lowercase, strip
punctuation, spaces→hyphens, duplicate `-1`/`-2` suffixes) and matches your
`#anchor` against those slugs plus any explicit HTML `id`/`<a name>`.

**Does it handle `other.md#section`?**
Yes. linklint builds a project-wide index, so cross-file anchors are validated
against the *target* document's actual headings.

**Markdown and HTML?**
Both. Markdown is parsed with a dependency-free, code-fence-aware parser; HTML
with a fast static parser. Links inside code spans/fences are correctly ignored.

**Will it have false positives on templated links?**
Use `ignoreTargets` (substring match) for generated or templated paths, or
`ruleSeverity`/`ignoreDirs` to tune. linklint errs toward correctness on real
relative links.

## Contributing

Contributions welcome! Each check is a small, self-contained rule in
`src/rules/`. See [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

```bash
git clone https://github.com/didrod205/linklint.git
cd linklint
npm install
npm test
npm run build
node dist/cli.js scan examples/docs
```

## License

[MIT](./LICENSE) © linklint contributors

## 💖 Sponsor

linklint is free, MIT-licensed, and built in spare time. If it caught a broken
link before your readers did, please consider supporting it:

- ⭐ **Star this repo** — free, and it helps others find it.
- 🍋 **[Sponsor via Lemon Squeezy](https://elab-studio.lemonsqueezy.com/checkout/buy/5d059b89-51d0-456b-b33a-ed56994f7010)** — one-time or recurring.

**Where your support goes:** opt-in external checking, AsciiDoc/reST support, a
`--fix` mode for renames, a PR-annotating GitHub Action, and fast issue
responses.

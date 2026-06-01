# linklint — Product & Launch Strategy

The strategy brief behind linklint, so the project can be maintained, marketed,
and grown by one person.

## 1. Idea & rationale

Every project with docs accumulates broken internal links: a renamed file, an
edited heading, a moved image. These never fail a build, so users find them
first — eroding trust, hurting SEO, and slowing onboarding. linklint is a
**deterministic, offline** CLI that verifies internal link & anchor integrity
(relative links, GitHub-slug anchors, cross-file anchors, images, references) so
it drops straight into a pre-commit hook or CI gate.

## 2. Competitor analysis

| Tool | Focus | Gap linklint fills |
| --- | --- | --- |
| **markdown-link-check** | Per-file link check (incl. external) | Network-bound/slow; weak cross-file anchor support |
| **lychee** | Fast external+internal checker (Rust) | Heavy on external URLs/rate limits; binary install |
| **remark-validate-links** | remark plugin for MD links | Tied to the remark/unified pipeline; setup overhead |
| **htmltest** | HTML link checker | HTML-only; Go binary; not Markdown-native |
| **Manual review** | — | Doesn't scale; misses anchor drift entirely |

**White space:** a zero-config, **internal-integrity-first**, deterministic
Node CLI that nails **GitHub-style cross-file anchors** and gives a graded report.

## 3. Differentiation

- **Internal-only by design** — deterministic, instant, no rate limits.
- **GitHub-accurate anchors** — slug algorithm incl. duplicate suffixes, plus
  explicit ids, validated **across files**.
- **Markdown + HTML**, code-fence aware, dependency-light.
- **Score + grade + reports** — gate-able and shareable.
- **CI-native** — non-zero exit on errors out of the box.

## 4. Folder structure

```
linklint/
├─ src/
│  ├─ slug.ts                      # GitHub slug rules
│  ├─ parse/{markdown,html,classify,index}.ts
│  ├─ project.ts                   # cross-file anchor index + resolution
│  ├─ rules/{links,hygiene,index}.ts
│  ├─ score.ts, config.ts, types.ts
│  ├─ report/{json,markdown,console}.ts
│  ├─ index.ts, loader.ts, cli.ts
├─ tests/                          # vitest specs (slug, parser, integration)
├─ examples/docs/                  # sample tree w/ intentional broken links
└─ .github/, README.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE, package.json
```

## 5. Source

Full TypeScript in `src/` (ESM+CJS via tsup), MIT-licensed. See README
"Programmatic API" and CONTRIBUTING "Adding a rule".

## 6. README

See [README.md](./README.md): one-liner, why-it-exists, features, install,
quick start, CLI usage, example result, config, 3 use cases, roadmap, FAQ,
contributing, license, sponsor (Lemon Squeezy), screenshot placeholder.

## 7. License

[MIT](./LICENSE).

## 8. GitHub topics

`broken-link-checker`, `markdown`, `link-checker`, `dead-link`, `anchor`,
`docs`, `link-lint`, `markdown-link`, `documentation`, `linkcheck`,
`static-analysis`, `cli`, `typescript`.

## 9. Product Hunt blurb

> **linklint — catch broken links & dead anchors in your docs, offline.**
> A free, deterministic CLI that checks the internal integrity of your
> Markdown/HTML: broken relative links, dead `#anchors` (GitHub slug rules),
> cross-file anchors, missing images, undefined references — no network, instant.
> Score + JSON/Markdown reports. `npx @didrod2539/linklint scan`. A CI gate out
> of the box.

## 10. npm name

Package `@didrod2539/linklint`, bin `linklint`. Scoped to satisfy npm's
name-similarity policy while keeping the memorable `*lint` brand and the
high-intent `link` keyword. ESM+CJS+types.

## 11. SEO/keyword strategy

- **Primary:** broken link checker, markdown link checker, dead link, anchor
  check, docs link validator, link lint.
- **Long-tail:** "check markdown anchors", "cross-file anchor checker", "broken
  link CI without network", "validate relative links docs".
- **Channels:** README (keyword-rich + FAQ), npm keywords, GitHub topics, a
  dev.to post ("The broken links in your README that CI never catches"), Product
  Hunt, r/webdev, technical-writing communities (Write the Docs), Show HN.
- **Content moat:** a "GitHub heading anchors explained" reference page that
  doubles as docs and ranks for "github markdown anchor".

## 12. Monetization

- **Sponsorship via Lemon Squeezy only** (one-time/recurring) — FUNDING.yml +
  README. Funds: opt-in external checking, AsciiDoc/reST, a `--fix` rename mode,
  a GitHub Action, issue triage.
- **Future optional paid tier (never gates the OSS):** a hosted docs-health
  dashboard that tracks broken-link trends and comments on PRs. CLI + library
  stay free and MIT forever.

## 13. Maintenance plan (one person)

- Each rule is an isolated pure function with its own test → low-risk changes.
- The slug rules and parser are small and fully unit-tested.
- CI matrix (Node 18/20/22) + a committed example doc tree guard regressions.
- Tagged releases auto-publish via `release.yml`.
- Determinism + committed sample reports make output changes obvious in diffs.

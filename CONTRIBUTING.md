# Contributing to linklint

Thanks for your interest! linklint is built so that **adding a check is small,
isolated, and testable**.

## Getting started

```bash
git clone https://github.com/didrod205/linklint.git
cd linklint
npm install
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run build       # tsup -> dist/
node dist/cli.js scan examples/docs
```

## Project layout

```
src/
  slug.ts           # GitHub-compatible heading slug rules
  parse/
    markdown.ts     # dependency-free, fence-aware Markdown link/heading parser
    html.ts         # HTML link/heading/id extraction
    classify.ts     # link-kind classification
  project.ts        # cross-file anchor index + path resolution
  rules/            # links (file/anchor/cross/image) + hygiene  + registry
  score.ts          # issues -> score & grade
  report/           # json | markdown | console renderers
  config.ts, types.ts, index.ts, loader.ts, cli.ts
tests/              # vitest specs (slug, markdown parser, integration)
examples/docs/      # a sample doc tree with intentional broken links
```

## Adding a rule

1. Add the rule id to `RuleId` and `RULE_LABELS` in `src/types.ts`.
2. Write the rule in `src/rules/links.ts` or `src/rules/hygiene.ts`:

   ```ts
   import type { Issue } from "../types.js";
   import { makeIssue, type DocRule, type RuleContext } from "./context.js";

   export const myRule: DocRule = {
     id: "my-rule",
     severity: "warning",
     run(ctx: RuleContext): Issue[] {
       const issues: Issue[] = [];
       for (const link of ctx.doc.links) {
         // inspect link / ctx.project and push makeIssue(this, ctx, {...})
       }
       return issues;
     },
   };
   ```

3. Register it in `src/rules/index.ts` (order = report order).
4. Add a test in `tests/` proving it fires (and doesn't on valid input).

## Principles

- **Deterministic & offline.** No network, no randomness, no time-dependent
  output. Same docs must always produce the same report.
- **Internal integrity only.** External URL checking is explicitly out of scope
  for the core (it's slow and flaky).
- **Dependency-light.** Only `cac`, `picocolors`, and `node-html-parser`.
- **Actionable.** Every issue carries a line and a concrete `fix`.

## Checklist before opening a PR

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (tests added for new behavior)
- [ ] New rules have a stable id, a label, and a `fix` message
- [ ] `CHANGELOG.md` updated for user-facing changes
- [ ] Regenerated `examples/sample-report.*` if output changed

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).

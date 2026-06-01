---
name: Bug report
about: A wrong or unexpected link/anchor result
title: ""
labels: bug
assignees: ""
---

**What happened**
A clear description of the bug.

**Minimal reproduction**
The smallest doc(s) that trigger it:

```markdown
# Title

[link](./missing.md) and [anchor](#title)
```

```bash
linklint scan ...
```

**Expected vs actual**
What you expected, and what linklint reported (paste the rule id, e.g.
`broken-anchor`).

**Environment**
- linklint version: (`linklint --version`)
- Node version: (`node -v`)
- OS:

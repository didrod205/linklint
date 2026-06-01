import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../src/parse/markdown.js";
import { classifyTarget, splitTarget } from "../src/parse/classify.js";

describe("classifyTarget", () => {
  it("classifies the link kinds", () => {
    expect(classifyTarget("https://x.com")).toBe("external");
    expect(classifyTarget("mailto:a@b.com")).toBe("mailto");
    expect(classifyTarget("#section")).toBe("anchor");
    expect(classifyTarget("other.md#sec")).toBe("cross-anchor");
    expect(classifyTarget("./file.md")).toBe("file");
    expect(classifyTarget("")).toBe("empty");
  });
});

describe("splitTarget", () => {
  it("splits path and anchor", () => {
    expect(splitTarget("a/b.md#sec")).toEqual({ path: "a/b.md", anchor: "sec" });
    expect(splitTarget("a/b.md")).toEqual({ path: "a/b.md", anchor: null });
  });
});

describe("parseMarkdown", () => {
  const md = [
    "# Title",
    "",
    "[inline](./a.md) and ![img](./logo.png) and [anchor](#title).",
    "[ref link][ref] and [missing][nope].",
    "",
    "## Section One",
    "## Section One",
    "",
    "```",
    "[not a link](./ignored.md)",
    "```",
    "",
    "`[also ignored](x.md)`",
    "",
    "[ref]: ./real.md",
  ].join("\n");
  const doc = parseMarkdown("/docs/index.md", md);

  it("extracts headings with slugs (incl. duplicate suffix)", () => {
    expect(doc.headings.map((h) => h.slug)).toEqual(["title", "section-one", "section-one-1"]);
  });

  it("extracts inline links, images and anchors", () => {
    const kinds = doc.links.map((l) => `${l.kind}:${l.target}`);
    expect(kinds).toContain("file:./a.md");
    expect(kinds).toContain("image:./logo.png");
    expect(kinds).toContain("anchor:#title");
  });

  it("resolves defined reference links and keeps undefined ones", () => {
    const ref = doc.links.find((l) => l.refId === "ref");
    expect(ref?.kind).toBe("file");
    expect(ref?.target).toBe("./real.md");
    const nope = doc.links.find((l) => l.refId === "nope");
    expect(nope?.kind).toBe("reference"); // unresolved
  });

  it("ignores links inside code fences and inline code", () => {
    expect(doc.links.some((l) => l.target.includes("ignored"))).toBe(false);
  });

  it("records reference definitions with their URL", () => {
    expect(doc.references.get("ref")).toBe("./real.md");
  });
});

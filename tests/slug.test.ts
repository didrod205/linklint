import { describe, it, expect } from "vitest";
import { slugify, uniqueSlugs, normalizeAnchor } from "../src/slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Getting Started")).toBe("getting-started");
  });

  it("drops punctuation but keeps letters/numbers", () => {
    expect(slugify("What's New? (v2)")).toBe("whats-new-v2");
    expect(slugify("API & SDK")).toBe("api--sdk");
  });

  it("strips markdown emphasis markers", () => {
    expect(slugify("**Bold** and `code`")).toBe("bold-and-code");
  });

  it("keeps unicode letters", () => {
    expect(slugify("설치 방법")).toBe("설치-방법");
  });
});

describe("uniqueSlugs", () => {
  it("suffixes duplicates like GitHub", () => {
    expect(uniqueSlugs(["Setup", "Usage", "Setup", "Setup"])).toEqual([
      "setup",
      "usage",
      "setup-1",
      "setup-2",
    ]);
  });
});

describe("normalizeAnchor", () => {
  it("strips leading # and lowercases", () => {
    expect(normalizeAnchor("#Installation")).toBe("installation");
    expect(normalizeAnchor("Section")).toBe("section");
  });

  it("decodes percent-encoding", () => {
    expect(normalizeAnchor("#%EC%84%A4%EC%B9%98")).toBe("설치");
  });
});

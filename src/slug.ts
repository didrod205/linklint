/**
 * GitHub-compatible heading slug generation.
 *
 * Mirrors GitHub's algorithm (used by most Markdown renderers):
 *   - lowercase
 *   - strip anything that isn't a letter, number, space, or hyphen
 *     (Unicode letters/numbers are kept)
 *   - replace spaces with hyphens
 * Duplicate slugs get a `-1`, `-2`, … suffix in document order.
 */

/** Compute the base slug for a single heading's text. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // Remove markdown emphasis/code markers and links syntax remnants.
    .replace(/[`*_~]/g, "")
    // Drop characters that are not letters, numbers, spaces, or hyphens.
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

/**
 * Assign unique slugs to a list of heading texts in document order, applying
 * GitHub's duplicate-suffix rule. Returns slugs parallel to the input.
 */
export function uniqueSlugs(texts: string[]): string[] {
  const counts = new Map<string, number>();
  return texts.map((text) => {
    const base = slugify(text);
    const seen = counts.get(base);
    if (seen === undefined) {
      counts.set(base, 0);
      return base;
    }
    const next = seen + 1;
    counts.set(base, next);
    return `${base}-${next}`;
  });
}

/** Normalize an anchor target (strip leading '#', decode, lowercase-compare). */
export function normalizeAnchor(anchor: string): string {
  let a = anchor.startsWith("#") ? anchor.slice(1) : anchor;
  try {
    a = decodeURIComponent(a);
  } catch {
    // keep as-is if malformed percent-encoding
  }
  return a.toLowerCase();
}

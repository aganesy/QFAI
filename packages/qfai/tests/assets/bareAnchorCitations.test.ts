import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant surface plus its generated root mirror. */
const ASSISTANT_GLOBS = [
  "packages/qfai/assets/init/.qfai/assistant/**/*.md",
  ".qfai/assistant/**/*.md",
];

/**
 * A prose citation of a heading fragment, written as a code span.
 *
 * Restricted to lowercase kebab-case with at least one hyphen, which is the
 * shape every real citation in the tree uses. That deliberately excludes the
 * literals that share the syntax but name no heading: colour placeholders
 * (`#abc`, `#hex`, `#RRGGBB`) and screaming-snake identifiers
 * (`#NON_COVERAGE_LAYERS`). A hypothetical single-word anchor is not matched;
 * widening the pattern would re-admit the colour literals.
 */
const BARE_ANCHOR_SPAN = /`(#[a-z0-9]+(?:-[a-z0-9]+)+)`/g;

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slugify(headingText: string): string {
  return headingText
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function collectHeadingSlugs(content: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    const headingText = /^#{1,6}\s+(.*)$/.exec(line)?.[1];
    if (headingText !== undefined) {
      slugs.add(slugify(headingText));
    }
  }
  return slugs;
}

describe("bare `#anchor` citations in shipped assistant markdown", () => {
  // A bare `#anchor` is a same-document reference. Three of them named headings
  // that live in other files, so the instruction carrying them ("split the row
  // per ...", "do not proceed to Green") pointed at nothing an agent could open.
  // Cross-document checks cannot see this class: there is no file part to check.
  it("resolves every bare anchor against its own file's headings", async () => {
    const files = await fg(ASSISTANT_GLOBS, { cwd: repoRoot, absolute: true });
    expect(files.length).toBeGreaterThan(0);

    const dangling: string[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf-8");
      const slugs = collectHeadingSlugs(content);
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const match of line.matchAll(BARE_ANCHOR_SPAN)) {
          const span = match[1];
          if (span === undefined) continue;
          const anchor = span.slice(1);
          if (!slugs.has(anchor)) {
            dangling.push(
              `${path.relative(repoRoot, filePath).replace(/\\/g, "/")}:${index + 1}: #${anchor}`,
            );
          }
        }
      });
    }

    expect(dangling).toEqual([]);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const discussionRoots = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-discussion",
  ),
  path.join(repoRoot, ".qfai", "assistant", "skills", "qfai-discussion"),
];

/**
 * Review criteria that name artifacts this package has retired. A reviewer who
 * takes any of them literally asks the author to produce a file
 * `validateForbiddenLegacyFiles` rejects at `error` severity, so they must not
 * survive in any shipped review form.
 */
const RETIRED_CRITERIA = [
  "taste interview",
  "3-layer",
  "option comparison",
  "selected anchor",
];

const REVIEW_FORMS = [
  path.join("templates", "review", "review_request.md"),
  path.join("templates", "review", "Rxx_reviewer.md"),
];

/** Strips list markers (`- `, `- [ ] `) and normalizes a `## Review Focus` / `## Checked` bullet. */
function normalizeBullet(line: string): string {
  return line
    .replace(/^\s*-\s*(?:\[[ xX]\]\s*)?/, "")
    .trim();
}

/** Returns the bullets of `heading` up to the next `## ` heading. */
function sectionBullets(content: string, heading: string): string[] {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return [];
  }
  const bullets: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (/^\s*-\s/.test(line)) {
      bullets.push(normalizeBullet(line));
    }
  }
  return bullets;
}

const uiBearingOnly = (bullets: string[]): string[] =>
  bullets.filter((bullet) => bullet.includes("(when UI-bearing)"));

describe("shipped review forms track the canonical UI-bearing review focus", () => {
  for (const discussionRoot of discussionRoots) {
    const label = path.relative(repoRoot, discussionRoot);

    it(`${label}: no review form names a retired review criterion`, async () => {
      for (const form of REVIEW_FORMS) {
        const content = await readFile(path.join(discussionRoot, form), "utf-8");
        const lowered = content.toLowerCase();
        for (const criterion of RETIRED_CRITERIA) {
          expect(
            lowered.includes(criterion),
            `${form} still names the retired criterion "${criterion}"`,
          ).toBe(false);
        }
      }
    });

    it(`${label}: review forms carry the same UI-bearing bullets as 14_Review-Request.md`, async () => {
      const canonical = uiBearingOnly(
        sectionBullets(
          await readFile(
            path.join(discussionRoot, "templates", "14_Review-Request.md"),
            "utf-8",
          ),
          "## Review Focus",
        ),
      );
      expect(canonical.length).toBeGreaterThan(0);

      const requestBullets = uiBearingOnly(
        sectionBullets(
          await readFile(
            path.join(discussionRoot, "templates", "review", "review_request.md"),
            "utf-8",
          ),
          "## Review Focus",
        ),
      );
      expect(requestBullets).toEqual(canonical);

      const reviewerBullets = uiBearingOnly(
        sectionBullets(
          await readFile(
            path.join(discussionRoot, "templates", "review", "Rxx_reviewer.md"),
            "utf-8",
          ),
          "## Checked",
        ),
      );
      expect(reviewerBullets).toEqual(canonical);
    });
  }
});

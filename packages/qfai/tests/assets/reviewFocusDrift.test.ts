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
const RETIRED_CRITERIA = ["taste interview", "3-layer", "option comparison", "selected anchor"];

/**
 * Live criteria the recut must NOT drop. Trend Scan was not retired — only its
 * sidecar was; the SSOT moved to `04_Sources.md#Trend Scan`
 * (`references/ui-bearing-playbook.md`).
 */
const RETAINED_CRITERIA = ["04_Sources.md#Trend Scan"];

const REVIEW_FORMS = [
  path.join("templates", "review", "review_request.md"),
  path.join("templates", "review", "Rxx_reviewer.md"),
];

/** Strips list markers (`- `, `- [ ] `) and normalizes a `## Review Focus` / `## Checked` bullet. */
function normalizeBullet(line: string): string {
  return line.replace(/^\s*-\s*(?:\[[ xX]\]\s*)?/, "").trim();
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

    it(`${label}: the live Trend Scan check survives the recut`, async () => {
      for (const form of REVIEW_FORMS) {
        const content = await readFile(path.join(discussionRoot, form), "utf-8");
        for (const criterion of RETAINED_CRITERIA) {
          expect(content, `${form} dropped the live criterion "${criterion}"`).toContain(criterion);
        }
      }
    });

    it(`${label}: no review form asks for a single visual winner`, async () => {
      // qfai-discussion forbids choosing one, and qfai-prototyping accepts the
      // latest iteration with no best-of-history, so the old bullet was
      // unsatisfiable.
      for (const form of REVIEW_FORMS) {
        const content = await readFile(path.join(discussionRoot, form), "utf-8");
        expect(content).not.toContain("Best-of-history handling and winner selection consistency");
        expect(content).toContain("no single visual winner was selected");
      }
    });

    it(`${label}: review forms carry the same UI-bearing bullets as 14_Review-Request.md`, async () => {
      const canonical = uiBearingOnly(
        sectionBullets(
          await readFile(path.join(discussionRoot, "templates", "14_Review-Request.md"), "utf-8"),
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

  it("carries the same canonical bullets in both trees, not just within each", async () => {
    // Every case above runs per tree, so the shipped assets and the repo-root
    // mirror could each be internally consistent while disagreeing with each
    // other — exactly what happens when `packages/qfai/assets/init/` is edited
    // and `pnpm sync:ssot` is forgotten. Compare the trees directly, against
    // discussionRoots[0], which is the SSOT the mirror is generated from.
    const [ssotRoot, ...mirrorRoots] = discussionRoots;
    const expected = uiBearingOnly(
      sectionBullets(
        await readFile(path.join(ssotRoot, "templates", "14_Review-Request.md"), "utf-8"),
        "## Review Focus",
      ),
    );
    expect(expected.length).toBeGreaterThan(0);

    for (const mirrorRoot of mirrorRoots) {
      const actual = uiBearingOnly(
        sectionBullets(
          await readFile(path.join(mirrorRoot, "templates", "14_Review-Request.md"), "utf-8"),
          "## Review Focus",
        ),
      );
      expect(actual, `${path.relative(repoRoot, mirrorRoot)} drifted from the init assets`).toEqual(
        expected,
      );
    }
  });
});

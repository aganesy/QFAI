/**
 * Phase Red's 3a / 3b / 3c pointers must land on something addressable.
 *
 * `qfai-implement/SKILL.md` carries 17 cross-references into the three
 * sub-items of Phase Red step 3. They used to be indented list lines carrying
 * ~10 KB of unbroken prose between them: not headings, not anchors, not link
 * targets. Nothing could check them, so renumbering or resequencing the three
 * silently invalidated every pointer while the surrounding text still read as
 * well-formed English.
 *
 * Promoting them to `#### Red 3<x> — <topic>` headings makes each one an
 * anchor. This test is what makes the pointers checkable: it fails if a
 * heading loses its ordinal, if the three fall out of order, or if a
 * `step 3<x>` reference appears with no heading to resolve to.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const read = (tree: string): Promise<string> => readFile(path.join(repoRoot, tree, SKILL), "utf-8");

/** The heading text each sub-step is addressed by, in required order. */
const SUBSTEP_HEADINGS = [
  "#### Red 3a — Minimal seam",
  "#### Red 3b — Handed-over provenance",
  "#### Red 3c — Falsifiability mutation",
] as const;

/** GitHub's heading slug, so the anchor a pointer would use is asserted too. */
function slug(heading: string): string {
  return heading
    .replace(/^#+\s*/, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .replace(/ /g, "-");
}

describe.each(TREES)("%s qfai-implement Phase Red sub-steps", (tree) => {
  it("addresses 3a, 3b and 3c by heading, in that order", async () => {
    const skill = await read(tree);
    const [firstAt, secondAt, thirdAt] = SUBSTEP_HEADINGS.map((heading) => {
      const at = skill.indexOf(`\n${heading}\n`);
      expect(at, `heading not found: ${heading}`).toBeGreaterThan(-1);
      return at;
    });
    if (firstAt === undefined || secondAt === undefined || thirdAt === undefined) {
      throw new Error("SUBSTEP_HEADINGS must declare exactly the three Phase Red sub-steps");
    }

    // Reached from 3b, never before it: an ordered read that met 3c first ran
    // the production mutation before 3b had checked the entry's provenance.
    expect(firstAt).toBeLessThan(secondAt);
    expect(secondAt).toBeLessThan(thirdAt);
  });

  it("keeps every sub-step heading inside Phase Red", async () => {
    const skill = await read(tree);
    const red = skill.indexOf("### Phase: Red (Write Failing Test)");
    const green = skill.indexOf("### Phase: Green (Make It Pass)");
    expect(red).toBeGreaterThan(-1);
    expect(green).toBeGreaterThan(red);

    for (const heading of SUBSTEP_HEADINGS) {
      const at = skill.indexOf(heading);
      expect(at, `heading not found: ${heading}`).toBeGreaterThan(red);
      expect(at, `heading escaped Phase Red: ${heading}`).toBeLessThan(green);
    }
  });

  it("resolves every `step 3<x>` pointer to one of those headings", async () => {
    const skill = await read(tree);
    // Anchors come from the file's own headings, not from the constants above:
    // a renumbered heading must break this, not be assumed correct.
    const anchors = new Map(
      [...skill.matchAll(/^#{2,6} .*$/gm)]
        .map((match) => match[0])
        .flatMap((heading) => {
          const ordinal = /\b(3[abc])\b/.exec(heading)?.[1];
          return ordinal === undefined ? [] : [[ordinal, slug(heading)] as const];
        }),
    );
    // Every ordinal the prose points at, however it is emphasised in between:
    // "step 3c", "step **3c**", "Phase Red **step 3c**".
    const pointers = new Set(
      [...skill.matchAll(/\b[Ss]teps?\s+\**(3[abc])\**/g)].flatMap((match) => {
        const ordinal = match[1];
        return ordinal === undefined ? [] : [ordinal];
      }),
    );

    expect(
      pointers.size,
      "no sub-step pointer found — the reference shape changed",
    ).toBeGreaterThan(0);
    for (const ordinal of pointers) {
      const anchor = anchors.get(ordinal);
      expect(anchor, `step ${ordinal} points at no heading`).toBeDefined();
      expect(anchor).toContain(ordinal);
    }
  });

  it("gives each sub-step a stable anchor slug", async () => {
    const skill = await read(tree);
    for (const heading of SUBSTEP_HEADINGS) {
      expect(skill).toContain(heading);
      expect(slug(heading)).toMatch(/^red-3[abc]-{1,2}[a-z-]+$/);
    }
  });
});

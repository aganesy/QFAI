/**
 * `/qfai-implement` had no phase whose exit criterion is that the product runs.
 *
 * The supported path from a finished spec to running software was "open
 * `test-list.md`, take row 1, proceed one row at a time", and nothing ever
 * asked whether the assembled parts start. A ledger could then carry hundreds
 * of `done` rows and a fully green suite with no entrypoint at all, because
 * every one of those tests constructed its subject directly.
 *
 * `Layer = E2E` and `Layer = API` rows are where that bill arrives: a test
 * written against a system that cannot start produces a collection error, and
 * `red-admissibility.md` correctly rules a collection error a *missing seam*
 * rather than a RED. The seam those rows are missing is the program itself.
 *
 * `Phase: Skeleton` is the precondition that makes the unchanged admissibility
 * criterion satisfiable for those layers — not a relaxation of it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const SKELETON = "assistant/skills/qfai-implement/references/walking-skeleton.md";
const ADMISSIBILITY = "assistant/skills/qfai-implement/references/red-admissibility.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement has a phase whose exit criterion is that the product runs", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the phase exists and is ordered ahead of the first Red`, async () => {
      const skill = await read(tree, SKILL);

      expect(skill).toContain("### Phase: Skeleton (Once Per Project, Before The First Red)");
      // Ordering is the whole point: a phase placed after Red would be
      // unreachable for the rows that need it.
      const skeletonAt = skill.indexOf("### Phase: Skeleton");
      const redAt = skill.indexOf("### Phase: Red");
      expect(skeletonAt).toBeGreaterThan(-1);
      expect(redAt).toBeGreaterThan(-1);
      expect(skeletonAt).toBeLessThan(redAt);
      expect(skill).toContain("references/walking-skeleton.md");
    });

    it(`${tree}: the exit criterion is executable, not prose`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      for (const content of [skill, doc]) {
        expect(content).toContain("starts from a declared entrypoint");
        expect(content).toContain("answered over a **real socket**");
        expect(content).toContain("committed smoke script that exits non-zero otherwise");
      }
      // A prose verdict is exactly what the phase replaces.
      expect(doc).toContain('"The skeleton is in place" is not an exit criterion');
      expect(doc).toContain("An already-passing smoke script satisfies the phase");
    });

    it(`${tree}: both bounds that stop it becoming a TDD bypass are blocking`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // Bound 1 — no predicates.
      expect(skill).toContain("**Write no predicate here.**");
      expect(skill).toContain(
        "No authorization decision, no business rule, no calculation, no persistence invariant",
      );
      expect(skill).toContain("routes return constants or pass-throughs");
      expect(skill).toContain("A predicate authored in this phase is a **blocking** finding");
      expect(doc).toContain("**A predicate authored in this phase is a blocking finding**");

      // Bound 2 — seam debt is visible to the ledger.
      expect(skill).toContain(
        "**Write the seam debt back as `todo` rows in the same commit** — also **blocking**",
      );
      expect(skill).toContain("The skeleton may be shallow; it may not be invisible to the ledger");
      expect(doc).toContain("**it may not be invisible to the ledger.**");
    });

    it(`${tree}: the budget halts instead of refining rows`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(skill).toContain("**Budget 3 cycles, then halt with a Change Request**");
      expect(skill).toContain("deliberately the opposite of the row-level policy");
      expect(doc).toContain("On the third failure, **halt and raise a Change Request**");
      expect(doc).toContain("change-request-reset.md");
      expect(doc).toContain("Do not continue to `Phase: Red`");
    });

    it(`${tree}: applicability is recorded, never silently skipped`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(skill).toContain("`Skeleton: not applicable`");
      expect(skill).toContain("the phase is never skipped silently");
      expect(doc).toContain("**The verdict is written; the phase is never skipped silently.**");
      // The one mechanical applicability test, so the verdict is not a
      // judgement call about effort.
      expect(doc).toContain(
        "If any row in the ledger carries `Layer = E2E` or `Layer = API`, an entrypoint is declared by construction and the phase applies",
      );
    });

    it(`${tree}: the phase is a precondition of the RED rule, not a relaxation of it`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));
      const admissibility = unwrap(await read(tree, ADMISSIBILITY));

      expect(skill).toContain("This is a precondition of the RED rule, not a relaxation of it");
      expect(skill).toContain("references/red-admissibility.md");
      expect(doc).toContain(
        "**This phase is a precondition of the existing RED rule, not a relaxation of it.**",
      );
      expect(doc).toContain("Nothing in `red-admissibility.md` moves");

      // The missing-seam ruling now names the case it keeps producing.
      expect(admissibility).toContain("the absent seam is frequently the **program itself**");
      expect(admissibility).toContain("walking-skeleton.md");
    });

    it(`${tree}: the smoke script proves a start, not an in-process construction`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**Starts the system the way the entrypoint declares it**");
      expect(doc).toContain("not a test harness that constructs the application object in-process");
      expect(doc).toContain("**Exits non-zero on any failure**, including a start-up timeout");
      expect(doc).toContain("**Names the `US-*` it answers**");
    });

    it(`${tree}: the phase leaves recordable evidence`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      for (const field of [
        "`Skeleton verdict`",
        "`Skeleton entrypoint`",
        "`Skeleton US`",
        "`Skeleton command`",
        "`Skeleton result`",
        "`Skeleton debt`",
        "`Skeleton cycles`",
      ]) {
        expect(doc).toContain(field);
      }
      // Same rule as every other gate result in this skill.
      expect(doc).toContain("the command and its real output, never a prose verdict");
    });
  }
});

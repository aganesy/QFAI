import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

// Anchored to this file, not to `process.cwd()`: from the repo root `../..`
// resolves above the repo and every read below fails on an unrelated path.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKILL_DIRS = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement",
  ".qfai/assistant/skills/qfai-implement",
];

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");
const read = (dir: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, dir, rel), "utf-8");

describe("a reviewer REVISE has a legal state and an evidence slot", () => {
  for (const relativePath of SKILL_DIRS) {
    // The ledger schema and its transitions live in
    // `references/execution-ledger.md` under the progressive-disclosure budget
    // (#414); SKILL.md keeps the process steps and a pointer.
    it(`${relativePath}: review-fix is a status with both edges`, async () => {
      const ledger = await read(relativePath, "references/execution-ledger.md");
      expect(ledger).toContain(
        "Valid status values: `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`.",
      );
      expect(ledger).toContain(
        "`refactor` -> `review-fix` (a blocking reviewer returned `REVISE`)",
      );
      expect(ledger).toContain(
        "`review-fix` -> `refactor` (rework complete; re-submit to the reviewer)",
      );
    });

    it(`${relativePath}: rework is explicitly not a backward transition`, async () => {
      const ledger = await read(relativePath, "references/execution-ledger.md");
      expect(ledger).toContain("### Reviewer rework is not a backward transition");
      expect(flat(ledger)).toContain("without any of those runs counting as a backward transition");
    });

    it(`${relativePath}: review-fix blocks completion`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain(
        "- Items with `todo`, `blocked`, `red`, `green`, `refactor`, or `review-fix` status still exist",
      );
    });

    it(`${relativePath}: the SKILL.md status enumeration is not one value short`, async () => {
      // SKILL.md's "Status values are ..." line is the only place in the skill
      // that answers what a `Status` cell may contain. Dropping `review-fix`
      // from it made a legal status read as illegal: an agent validating a cell
      // against this line either refuses `refactor` -> `review-fix` (stranding
      // an open REVISE) or rewrites the cell to `refactor`, which marks
      // unfinished rework as finished and clears the completion gate below.
      const skill = await read(relativePath, "SKILL.md");
      expect(flat(skill)).toContain(
        "Status values are `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`;",
      );

      // And it stays in step with the reference that owns the value set.
      const ledger = await read(relativePath, "references/execution-ledger.md");
      const owned = /Valid status values: ([^.]+)\./.exec(ledger)?.[1];
      const summarised = /Status values are ([^;]+);/.exec(flat(skill))?.[1];
      expect(owned).toBeDefined();
      expect(summarised).toBe(owned);
    });

    it(`${relativePath}: the evidence contract is a repeatable round shape`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      expect(flat(skill)).toContain("Each RED/GREEN cycle is one **round block**");
      expect(skill).toContain("references/round-evidence.md");

      const reference = await read(relativePath, "references/round-evidence.md");
      for (const field of [
        "`Round N: RED command`",
        "`Round N: GREEN result`",
        "`Round N: reviewer verdict`",
      ]) {
        expect(reference).toContain(field);
      }
      expect(reference).toContain("## Single-round items");
    });

    it(`${relativePath}: the closed round list enumerates every field the Round N prefix is required on`, async () => {
      // The list declares itself whole, so a field absent from it is row-level
      // by construction — one slot for however many rounds the row has. These
      // fields have a producer that runs once per round, so a second round
      // either overwrote round 1's record or reused it for a tree that no
      // longer exists. Left uncounted on purpose: the set grows, and a comment
      // that names a number goes stale the next time it does.
      const reference = await read(relativePath, "references/round-evidence.md");
      for (const field of [
        "`Round N: Falsifiability revision`",
        "`Round N: Oracle proof`",
        "`Round N: Review pack`",
        "`Round N: Review pack seal`",
        // A round-1 `falsifiability` row can get a natural RED in round 2, so
        // the classification of a round's RED moves with the round.
        "`Round N: RED failure mode`",
      ]) {
        expect(reference).toContain(field);
      }
      // ...and the paragraph that closes the list names them, so the summary
      // and the enumeration cannot drift apart again.
      expect(flat(reference)).toContain(
        "the `RED failure mode` that classifies it, the `Replacement proof revision` where the test was replaced, the GREEN pair, the `Oracle proof`, the review pack and its seal, the reviewer verdict",
      );
      // The rule that decides where a newly added field lands, so the next
      // omission is answerable without re-deriving it in SKILL.md.
      expect(flat(reference)).toContain(
        "a field its producer writes once per round takes the prefix",
      );
    });

    it(`${relativePath}: the producers write RED failure mode with the round prefix`, async () => {
      // The closed list is the sole authority on the prefix, so a producer
      // still writing the field bare leaves the completion gate unable to find
      // round 1's classification at all.
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain("`Round 1: RED failure mode: falsifiability`");
      expect(skill).not.toContain("the `RED failure mode: falsifiability`");
      const admissibility = await read(relativePath, "references/red-admissibility.md");
      expect(flat(admissibility)).toContain("`Round N: RED failure mode`");
      expect(flat(admissibility)).toContain("`Round N: RED failure mode: falsifiability`");
    });

    it(`${relativePath}: an entry predating the list keeps its bare fields readable`, async () => {
      // The tree an `Oracle proof` or a RED addressed is gone by the revert or
      // by Phase Green, so a row already at `refactor`/`review-fix` cannot
      // re-take what the prefix would demand. The bare slot was overwritten by
      // each round, so its surviving value is the last round's — reading it as
      // round 1's would attribute the newest proof to the oldest tree.
      const reference = await read(relativePath, "references/round-evidence.md");
      expect(flat(reference)).toContain(
        "**An entry written before a field joined this list carries it unprefixed.**",
      );
      expect(flat(reference)).toContain(
        "as belonging to that entry's **highest-numbered** round, **not** to round 1",
      );
    });

    it(`${relativePath}: the replacement proof revision is a round field too`, async () => {
      // A REVISE can replace the acceptance test in more than one round, and
      // the proof is re-taken against a different tree each time.
      const reference = await read(relativePath, "references/round-evidence.md");
      expect(reference).toContain("`Round N: Replacement proof revision`");
      // ...and the producers name it with the prefix, or the round block and
      // the instruction that fills it disagree.
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain("`Round N: Replacement proof revision`");
      expect(skill).not.toContain("carries `Replacement proof revision`");
    });

    it(`${relativePath}: a round keeps one review pack per review attempt`, async () => {
      // A behaviour-preserving REVISE re-reviews inside the same round and
      // every review creates its own pack, so one slot per round either
      // discarded the REVISE pack's audit trail or left the completion gate
      // recomputing over a pack the round did not close on.
      const reference = await read(relativePath, "references/round-evidence.md");
      expect(flat(reference)).toContain("**One pair per review attempt, not one per round**");
      expect(flat(reference)).toContain(
        "`Round N: Review pack (attempt M)` / `Round N: Review pack seal (attempt M)`",
      );
      // Each pack in the round is answerable to the verdict it carried.
      expect(flat(reference)).toContain(
        "A round with several review attempts records each attempt's verdict here in review order, under the same `(attempt M)` qualifier",
      );
    });

    it(`${relativePath}: the oracle-proof producer is per round, not per item`, async () => {
      // Round 2 rewrites the code round 1's mutation targeted, so a re-used
      // proof shows nothing about the new pass.
      const oracle = await read(relativePath, "references/oracle-strength.md");
      expect(flat(oracle)).toContain("Per **round**, alongside that round's RED/GREEN pair");
      expect(flat(oracle)).toContain(
        "One mutation per round — not one per item, and never round 1's re-used",
      );
      expect(oracle).not.toContain("One mutation per item.");
    });

    it(`${relativePath}: every attempt's seal is produced and recomputed`, async () => {
      // Sealing only the attempt that closed the round left the earlier packs
      // editable with nothing recomputing over them.
      const revision = await read(relativePath, "references/evidence-revision.md");
      expect(flat(revision)).toContain(
        "**A round that was reviewed more than once carries one pair per attempt**",
      );
      expect(flat(revision)).toContain("**Gate item 10 recomputes every seal the entry carries**");
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain("Every `Review pack seal` the entry carries");
    });

    it(`${relativePath}: review is requested from refactor, so REVISE has a legal edge`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      // "After GREEN" left a REVISE landing on `green`, which has no
      // `review-fix` edge and cannot go backwards.
      expect(skill).not.toContain("After GREEN, implementation agent submits");
      expect(skill).toContain("After the item reaches `refactor`, implementation agent submits");
      expect(skill).toContain("Review is requested from `refactor`, never from `green`");
    });

    it(`${relativePath}: an interrupted review-fix item is resumed before new work`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain("**rework first**: if any row is at `review-fix`");
      expect(skill).toContain("otherwise never picked up");

      const reference = await read(relativePath, "references/round-evidence.md");
      expect(reference).toContain("## Resuming a `review-fix` item");
      expect(reference).toContain("selected **before** any `todo` row");
    });

    it(`${relativePath}: rework never writes an illegal review-fix -> red hop`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      // Phase Red step 2 would otherwise demand `review-fix -> red`, which the
      // allowed-transition list does not contain.
      expect(skill).toContain("**only for a `todo` row**");
      expect(skill).toContain("A `review-fix` row **stays at `review-fix`** for the whole rework");
      expect(skill).toContain("`review-fix -> red` is not an allowed transition");

      const reference = await read(relativePath, "references/round-evidence.md");
      expect(reference).toContain("**The row's `Status` stays `review-fix` throughout.**");
      expect(flat(reference)).toContain(
        "`review-fix -> refactor` is the only status change the rework produces",
      );
    });

    it(`${relativePath}: the Green phase keeps a review-fix row at review-fix`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      // An unconditional "Transition status to `green`" would write the
      // prohibited `review-fix -> green` for every rework row.
      expect(skill).toContain(
        "Transition status to `green` — **only for a row that entered from `todo`**",
      );
      expect(skill).toContain("`review-fix -> green` is not an allowed transition");
      expect(skill).not.toContain("3. Transition status to `green`.\n");
    });

    it(`${relativePath}: a behaviour-preserving REVISE has a stated path`, async () => {
      // SKILL.md carries the pointer only; both rework paths are stated in the
      // reference, so the two-path rule is asserted there.
      const skill = await read(relativePath, "SKILL.md");
      expect(flat(skill)).toContain(
        "Numbering, cardinality and the two rework paths are that reference",
      );

      const reference = await read(relativePath, "references/round-evidence.md");
      expect(flat(reference)).toContain(
        "A `REVISE` that needs none (naming, duplication, comments) opens no round and is verified by a refreshed `Refactor verify` pair instead.",
      );
      expect(reference).toContain("## A `REVISE` that needs no new production behaviour");
      expect(reference).toContain("**No round is opened.**");
      // All three `Refactor verify` fields, the revision included: the rework
      // moved the tree, so a stale address would put the re-review out of
      // agreement with item 6 at gate item 10.
      expect(reference).toContain(
        "refresh all three\n   `Refactor verify` fields — `command`, `result` and `revision`",
      );
      expect(reference).toContain("Which path applies is decided by the finding, not by the");
    });

    it(`${relativePath}: rework is re-submitted to every reviewer it could invalidate`, async () => {
      // A PASS from the other blocking reviewer was given on the pre-rework
      // artifact, so it cannot satisfy "all routed blocking reviewers PASS".
      const reference = await read(relativePath, "references/round-evidence.md");
      expect(reference).toContain("## Who the rework goes back to");
      expect(reference).toContain(
        "**every routed blocking reviewer\nwhose verdict the rework could invalidate**",
      );
      expect(reference).toContain(
        "plus any reviewer that already returned `PASS` on artifacts the",
      );
      expect(reference).toContain("is stale evidence: it does not count towards");
      // The narrower "re-submit to the reviewer that opened the round" is gone.
      expect(reference).not.toContain("re-submits the item to the reviewer that opened the round");
      expect(reference).not.toContain("re-submit to the reviewer that opened the\n   round");
    });
  }
});

async function withReviewFixLedger(
  opts: { testFileCell: string; createTestFile: boolean },
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-fix-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    for (const file of [
      "01_Spec.md",
      "02_User-stories.md",
      "03_Acceptance-Criteria.md",
      "06_Test-Cases.md",
    ]) {
      await writeFile(path.join(specDir, file), "# seed\n", "utf-8");
    }
    if (opts.createTestFile) {
      await mkdir(path.join(root, "tests"), { recursive: true });
      await writeFile(path.join(root, "tests", "a.test.ts"), "// seed\n", "utf-8");
    }
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [
        "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status     | DR-ID | Evidence |",
        "| -------- | ------- | ----- | --------------- | -------- | ---------- | ----- | -------- |",
        `| TDD-0001 | TC-0001 | Unit  | ${opts.testFileCell.padEnd(15)} | case a   | review-fix | -     | round 2  |`,
      ].join("\n"),
      "utf-8",
    );

    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("validateTddList accepts review-fix", () => {
  it("does not flag review-fix as an invalid status", async () => {
    await withReviewFixLedger(
      { testFileCell: "tests/a.test.ts", createTestFile: true },
      (issues) => {
        expect(issues.some((entry) => entry.code === "TDDLIST_INVALID_STATUS")).toBe(false);
        expect(issues.some((entry) => entry.code === "TDDLIST_TEST_FILE_MISSING")).toBe(false);
      },
    );
  });

  it("still requires the test file a review-fix row necessarily reached refactor with", async () => {
    await withReviewFixLedger(
      { testFileCell: "tests/a.test.ts", createTestFile: false },
      (issues) => {
        expect(issues.some((entry) => entry.code === "TDDLIST_TEST_FILE_MISSING")).toBe(true);
      },
    );
  });

  it("reports an empty Test file on a review-fix row", async () => {
    await withReviewFixLedger({ testFileCell: "-", createTestFile: false }, (issues) => {
      // "-" is a non-empty cell that resolves to a non-existent path.
      expect(issues.some((entry) => entry.code === "TDDLIST_TEST_FILE_MISSING")).toBe(true);
    });
  });
});

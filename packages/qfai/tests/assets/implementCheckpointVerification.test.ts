import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror. */
const SKILL_DIRS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement"),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement"),
];

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) {
      slugs.add(slug(match[1]));
    }
  }
  return slugs;
}

describe("qfai-implement checkpoint verification contract", () => {
  it("reaches the spec-level boundary before the all-done early exit", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // The bare "all done -> nothing to do" exit skipped the per-spec boundary
      // permanently: an interrupted run, or a re-run of a complete ledger, could
      // never record it afterwards.
      expect(skill).not.toMatch(
        /^- When all items are `done`, report "nothing to do" and exit\.$/m,
      );
      expect(skill).toContain("spec-level checkpoint boundary");
      // A ledger whose last row went to `exception` is terminal too — gating the
      // recovery on "all done" left that path with no way to record the boundary.
      expect(skill).toContain("terminal (`done` or a valid `exception`)");
      expect(skill).toContain(
        "references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger",
      );

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(headingSlugs(reference)).toContain(
        "spec-level-boundary-on-an-already-complete-ledger",
      );
    }
  });

  it("resolves every same-file anchor the skill body points at", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const slugs = headingSlugs(skill);

      const anchors = Array.from(skill.matchAll(/\(see `#([a-z0-9-]+)`\)/g), (m) => m[1]);
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(slugs, `${anchor} must be a heading in qfai-implement/SKILL.md`).toContain(anchor);
      }
    }
  });

  // The ledger's `Selector` is a test NAME. Every common runner takes a name via
  // a flag; a positional argument is a file filter, so `vitest '<Selector>'`
  // exits 1 with "No test files found" and no item could ever leave `refactor`.
  it("passes the selector through the runner's test-name option", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("<test runner> <Test file> -t '<Selector>'");
      expect(reference).toContain('exits 1 with "No test files');
    }
  });

  // `go test` selects by package, not by file: handing it a lone `*_test.go`
  // switches it into file mode and drops the rest of the package from the
  // build, so the item's test normally fails on undefined symbols.
  it("derives a package, not a file, for package-selecting runners", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**b. The unit of selection.**");
      expect(reference).toContain("**Package-selecting runners** (`go test`) take a package");
      expect(reference).toContain("go test ./<dir of Test file> -run '<Selector>'");
      expect(reference).toContain("drops the rest of the package from the build");
      expect(reference).toContain("Derive the package from the `Test file`'s directory");
    }
  });

  // The reviewers PASS before the per-item checkpoint, so a fix made because
  // the checkpoint failed is code no reviewer has judged.
  it("requires a fresh reviewer PASS after a checkpoint fix", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**A fix invalidates the reviewer PASS that preceded it.**");
      expect(reference).toContain("re-submit to every routed blocking reviewer");
      expect(reference).toContain("obtain a fresh PASS **before** re-running the command set");
      expect(reference).toContain("carrying code no reviewer ever saw");
    }
  });

  // A spec-level re-run has no "item just completed" to build step 1 from.
  it("defines a per-spec command set without the item selector", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("## Verification command set (per item)");
      expect(reference).toContain("## Verification command set (per spec)");
      expect(reference).toContain("step 1 is dropped");
    }
  });

  it("launches the CLI through npx, which is how a project dependency resolves", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      // The claim is the launcher, not the whole invocation: the command also
      // carries `--spec <spec-id>`, because this skill runs one spec at a time
      // and an unscoped checkpoint fails on a sibling's in-flight work.
      expect(reference).toContain("`npx qfai validate --profile tdd --fail-on error --spec");
      // A bare launcher exits 127 on a normal local install, failing every checkpoint.
      expect(reference).not.toMatch(/^\d+\.\s+`qfai /m);
    }
  });

  // The boundary cadence was stated three times: this file denied the counted
  // rule that `relevant-test-suite.md` and gate item 12 both assume, so an agent
  // ran either ~1 full suite per row or ~1 per 10 depending on which document it
  // opened. The cadence now lives in one file; the other two cite its anchor.
  it("defers the boundary cadence to relevant-test-suite.md instead of restating it", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const cadence = await readFile(
        path.join(dir, "references", "relevant-test-suite.md"),
        "utf-8",
      );

      // Neither the reference nor the skill may deny the counted rule again.
      for (const [name, document] of [
        ["checkpoint-verification.md", reference],
        ["SKILL.md", skill],
      ] as const) {
        expect(document, `${name} must not deny the counted cadence`).not.toContain(
          'There is no "every N items" rule',
        );
        expect(document, `${name} must not claim a boundary per row`).not.toContain(
          "Every item has exactly one",
        );
        // Nor may either re-derive the condition. "The last row a run completes
        // is always a boundary" is false for a run that completes one named row
        // while others are still `todo` — the ordinary `/qfai-atdd` handoff.
        expect(document, `${name} must not re-derive the condition`).not.toContain(
          "always a boundary",
        );
      }

      expect(reference).toContain("**Not every row is one.**");
      expect(reference).toContain("`relevant-test-suite.md#checkpoint-boundaries`");
      expect(skill).toContain("**Not every row is one**");
      expect(skill).toContain("`references/relevant-test-suite.md#checkpoint-boundaries`");

      // The cited anchor has to resolve, and the cadence has to stay in the one
      // file that owns it.
      expect(headingSlugs(cadence)).toContain("checkpoint-boundaries");
      expect(cadence).toContain("**This list is the single definition of the boundary cadence.**");
      expect(cadence).toContain("every **N-th** completed row, with `N = 10` by default");

      // `qfai-atdd` hands branch-1 rows to this skill, and its own reference
      // restated the cadence as one full suite per row. Two skills, two
      // frequencies — the same contradiction one directory over.
      const provenance = await readFile(
        path.join(dir, "..", "qfai-atdd", "references", "red-provenance.md"),
        "utf-8",
      );
      expect(provenance, "red-provenance.md must not restate the cadence").not.toContain(
        "every row's checkpoint runs the full suite",
      );
      expect(provenance).toContain(
        "../../qfai-implement/references/relevant-test-suite.md#checkpoint-boundaries",
      );
      // Nor may it re-derive one. "The last row a run completes is always a
      // boundary" is false for the single-row handoff P1c makes while other
      // `todo` rows are still open, and reading it that way puts every
      // ATDD-driven run back on one full suite per row.
      expect(provenance, "red-provenance.md must state no cadence condition").toContain(
        "this file states no condition of its own",
      );
    }
  });

  // Off a boundary nothing is re-run, but item 12 still recomputes the seal over
  // all three checkpoint fields on every row. Without a stated source for those
  // fields an off-boundary row either cannot reach `done` or has to fabricate a
  // full-suite command it never executed.
  it("gives an off-boundary row a completable checkpoint evidence contract", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      expect(reference).toContain("**A row between boundaries records the same three fields.**");
      expect(reference).toContain("recomputes the seal on every row");
      expect(reference).toContain("invent a full-suite command it never ran");
      expect(reference).toContain("takes the narrow relevant-suite command set of Phase: Refactor");

      expect(skill).toContain(
        "**Off a boundary nothing is re-run, and the three fields are still required**",
      );
      expect(skill).toContain("`references/checkpoint-verification.md#evidence`");
      expect(headingSlugs(reference)).toContain("evidence");
    }
  });

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

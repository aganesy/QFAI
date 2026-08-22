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

/** The body between an H2 heading and the next heading of the same level. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  expect(
    start,
    `${heading} must be a heading in checkpoint-verification.md`,
  ).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

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

  // A per-item gate can only be discharged by properties of the row it gates.
  // `npx qfai validate` and the static gates report the *spec's* defects — another
  // row's empty Evidence cell, a `.qfai/contracts/**` file no spec owns, an ATDD
  // finding this skill declares out of scope — none of which the gated row caused
  // or may fix. Carried per item, one unrelated defect anywhere in the spec holds
  // every row at `refactor` for good, and `refactor -> done` never fires again.
  it("keeps the spec-wide commands out of the per-item command set", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const perItem = section(reference, "## Verification command set (per item)");
      const perSpec = section(reference, "## Verification command set (per spec)");

      // Per item: the row's own selector and the suite its change could break.
      expect(perItem).toMatch(/^1\. The item's own test/m);
      expect(perItem).toMatch(/^2\. The full test suite/m);
      // The prose names the command to say it is *not* run here; the invocation
      // itself, and any step past 2, must be absent.
      expect(perItem).not.toContain("qfai validate --profile");
      expect(perItem).not.toContain("--fail-on error");
      expect(perItem).not.toMatch(/^3\.\s/m);
      expect(perItem).not.toMatch(/^4\.\s/m);
      expect(flat(perItem)).toContain(
        "they sit in the per-spec set below and are **not** run here",
      );

      // Per spec: the two commands whose findings that boundary's owner can act on.
      expect(perSpec).toMatch(/^3\. The project's static gates/m);
      expect(perSpec).toContain("npx qfai validate --profile tdd --fail-on error --spec");
      expect(flat(perSpec)).toContain(
        "the spec-level set is step 2 above plus steps 3 and 4 below",
      );
    }
  });

  // "A partial run is not a pass" must not read as "the per-item set owes step 4".
  it("scopes the zero-`QFAI-TEST-001` criterion to the set that runs step 4", async () => {
    for (const dir of SKILL_DIRS) {
      const criteria = flat(
        section(
          await readFile(path.join(dir, "references", "checkpoint-verification.md"), "utf-8"),
          "## Pass criteria",
        ),
      );
      expect(criteria).toContain("the per-spec set, the only one that includes it");
      expect(criteria).toContain("A step outside the applicable set is not owed");
      expect(criteria).toContain("A partial run of the applicable set is not a pass.");
    }
  });

  // Moving the static gates to the per-spec set means a lint/format/type defect
  // over a `done` row's code first surfaces where no row can be re-opened:
  // `done` has one exit (the approved upstream reset) and the skill skips `done`
  // rows on re-execution. Without a stated repair path the failure is unfixable.
  it("gives the per-spec FAIL a legal repair path", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      const criteria = flat(section(reference, "## Pass criteria"));

      expect(headingSlugs(reference)).toContain("repairing-a-per-spec-fail");
      // The failure mode the section exists for, named.
      expect(criteria).toContain("formatter, linter or type-check failure");
      expect(criteria).toContain("skips `done` rows on re-execution");
      // The repair: fix in place, no status moves, fresh reviewer verdicts first.
      expect(criteria).toContain("**A per-spec FAIL is not a ledger event.**");
      expect(criteria).toContain("leave every `Status` where it is");
      expect(criteria).toContain("re-run the **whole** per-spec set");
      // A fix that moves the obligation is the one case that does reopen a row,
      // and it goes through the existing approved reset rather than a new edge.
      expect(criteria).toContain("that is a Change Request");
      expect(criteria).toContain("change-request-reset.md");
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

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

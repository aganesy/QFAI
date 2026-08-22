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

  // A failed checkpoint had two remedies: the pass criteria kept the row at
  // `refactor`, while `relevant-test-suite.md` sent it to `exception` + a DR,
  // a status that then needs a user-approved waiver to satisfy completion.
  it("states FAIL handling once, in the pass criteria, for both boundaries", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(headingSlugs(reference)).toContain("pass-criteria");
      expect(reference).toMatch(/\*\*FAIL handling is defined here\s+and nowhere else\*\*/);
      expect(reference).toContain("the item stays at `refactor`, the failure is fixed");
      expect(reference).toContain("does **not** go to `exception`");
      // The per-spec boundary owns no row, so it needs its own branch here
      // rather than being left undefined by the deletion.
      expect(reference).toContain("**Per spec** — the boundary owns no row");
      expect(reference).toContain("Spec-level completion is not declared until it passes");
      // A ledger row is upstream SSOT: the carve-out this skill holds is the
      // Status / DR-ID / Evidence cells, so the per-spec repair may not append
      // a `todo` row itself — it takes the drift path and the owner's rerun.
      expect(reference).toContain("**Do not add a row here.**");
      expect(reference).toContain(
        "`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`",
      );
      expect(reference).toContain("#when-drift-is-detected");

      // No second remedy anywhere else on the shipped surface.
      const suite = await readFile(path.join(dir, "references", "relevant-test-suite.md"), "utf-8");
      expect(suite).toContain("`checkpoint-verification.md#pass-criteria`");
      expect(suite).not.toContain("`refactor -> exception`");

      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill).not.toContain("on failure transition to `exception` with a DR-ID");
      expect(skill).toContain("a FAIL keeps the row at `refactor`");

      // A FAIL now keeps the row at `refactor`, which is neither terminal nor
      // selectable by Phase Red step 1 (named row / `review-fix` / `todo`). An
      // interrupted repair would strand it for every later invocation, so
      // preflight has to be the entry that re-selects it.
      expect(skill).toContain(
        "**Resume every row left at `refactor`, before any other selection.**",
      );
      expect(skill).toContain("This is the only entry that re-selects `refactor`");
      expect(reference).toContain("Preflight step 3");
    }
  });

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

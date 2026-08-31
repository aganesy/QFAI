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

  // The per-item command is FILE-SCOPED, and the earlier prescription it replaces
  // is the reason: `-t` / `-k` hand the ledger's `Selector` to a REGEX matcher, so
  // a selector in the common `TC-NNNN-NNNN (TDD-NNNN): title` shape has its
  // parentheses read as a capture group, matches nothing, reports `1 skipped` — and
  // EXITS 0. Exit code is what the surrounding procedure reads, so that failure is
  // invisible exactly where it is consumed. Hence both halves are pinned here: the
  // prescribed form is present AND the defective one is gone.
  it("prescribes the file-scoped run and demotes the name option behind its regex caveat", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("run **file-scoped, with no test-name option**");
      // The fenced command itself, EOL-agnostic so a CRLF checkout reads the same.
      expect(reference).toMatch(/```bash\r?\n\s*<test runner> <Test file>\r?\n\s*```/);
      expect(reference).not.toContain("<test runner> <Test file> -t '<Selector>'");

      // The caveat must name the MECHANISM and the SILENCE, not merely counsel
      // care: a reader told only "mind the quoting" reproduces the exit-0 skip.
      expect(reference).toContain("reads as a capture group, not as characters");
      expect(reference).toContain("**exits 0**");
      // Narrowing survives as an OPTION, with the check that makes it safe.
      expect(reference).toContain("**If you do narrow**");
      expect(reference).toContain("A skipped count is not a pass.");
    }
  });

  // `go test` selects by package, not by file: handing it a lone `*_test.go`
  // switches it into file mode and drops the rest of the package from the
  // build, so the item's test normally fails on undefined symbols. This guidance
  // SURVIVES the file-scoped prescription — only its `-run` flag left with `-t`,
  // which is why the last assertion pins the flag's absence separately.
  it("derives a package, not a file, for package-selecting runners", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("**The unit of selection is not always a file.**");
      expect(reference).toContain("Package-selecting runners (`go test`) take a");
      expect(reference).toMatch(/```bash\r?\n\s*go test \.\/<dir of Test file>\r?\n\s*```/);
      expect(reference).toContain("drops the rest of the package from the build");
      expect(reference).toContain("Derive the package from the `Test file`'s directory");
      expect(reference).not.toContain("-run '<Selector>'");
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
        "**Resume every row left at `refactor` — after any named handoff, before any `todo` row.**",
      );
      expect(skill).toContain("This is the only entry that re-selects `refactor`");
      expect(reference).toContain("Preflight step 3");
    }
  });

  // Resuming an unrelated `refactor` row ahead of a named handoff runs that
  // row's full-suite checkpoint against the handoff's deliberate RED, so it
  // FAILs on an obligation the resumed row does not own.
  it("keeps a named handoff ahead of the refactor resume", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill).toContain("**A named handoff is processed first.**");
      expect(skill).toContain(
        "run Phase Red step 1 on those rows and come back here only once they are terminal",
      );
      expect(skill).toContain("FAILs on an obligation the row does not own");

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("after any\n  named handoff");
    }
  });

  // A T1 coherent group parks every member in `refactor` by design, so an
  // interrupted run leaves several. Resuming them one by one would review each
  // separately and break the one-ledger-write group transition.
  it("resumes interrupted refactor rows by review unit, not row by row", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      // The old premise — "a fresh invocation holds no open T1 group" — is false.
      expect(skill).not.toContain("no in-flight reviewer round and no open T1 group");
      expect(skill).toContain(
        "a T1 group left open, whose members park in `refactor` legally and by design",
      );
      expect(skill).toContain("**Resume by review unit, not row by row**");
      expect(skill).toContain("every member transitioning in the same ledger write");

      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("as one reopened group when the row is a T1 member of one");
    }
  });

  // The stale-PASS rule was scoped to the per-item boundary, so a spec-level
  // repair could edit reviewed code and still declare completion on the PASSes
  // that preceded it.
  it("invalidates reviewer PASSes after a spec-level repair too", async () => {
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain("the stale-PASS rule below binds");
      expect(reference).toContain("**The spec-level boundary is bound by that rule too.**");
      expect(reference).toContain(
        "**every item whose `Test file` or production scope it touched**",
      );
      expect(reference).toContain("only then re-run the per-spec command set");
    }
  });

  it("names the observation a spec-level repair owes, not just a fresh revision", async () => {
    // Gate items 3 and 5 want observations, not addresses. Re-submitting
    // reviewers and bumping `Evidence` leaves the RED and the GREEN untouched,
    // and where the repair edited a test, the RED and its `RED test hash`
    // describe a test that no longer exists — on a row that is already `done`
    // and that Phase Red does not re-select.
    for (const dir of SKILL_DIRS) {
      const reference = await readFile(
        path.join(dir, "references", "checkpoint-verification.md"),
        "utf-8",
      );
      expect(reference).toContain(
        "**A fresh reviewer PASS is not always enough, and a revision is never the repair.**",
      );
      // Production-only repair: re-observe the GREEN; the RED still stands.
      expect(reference).toContain("**Production code only, tests untouched**");
      expect(reference).toContain("record that result as the GREEN with its revision");
      // A changed test has no in-place route — say so, and name the one it has.
      expect(reference).toContain("**The item's test changed**");
      expect(reference).toContain("its RED is unrecoverable in place");
      expect(reference).toContain("`change-request-reset.md`");
      expect(reference).toContain("run its micro-cycle again");
    }
  });

  it("resumes a review unit with the whole reviewer set it owes", async () => {
    // A T1 group close takes a `qa-gatekeeper` turn as well as the two review
    // passes, and item 9 takes a `product-surface-reviewer` PASS on a
    // UI-affecting row. Naming two reviewers in the resume step sent a resumed
    // row to the gate missing a verdict it could no longer obtain.
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill).toContain("**A reopened unit owes its whole reviewer set, not a subset.**");
      expect(skill).toContain("never from a list written here");
      expect(skill).toContain("`qa-gatekeeper` turn over the members' recorded RED/GREEN evidence");
      expect(skill).toContain("`references/ui-affecting.md`");
      // …and the enumeration that caused it is gone.
      expect(skill).not.toContain(
        "one `completion-reviewer` pass, one `implementation-reviewer` pass, one checkpoint run",
      );
    }
  });

  it("keeps the skill body inside its progressive-disclosure budget", async () => {
    for (const dir of SKILL_DIRS) {
      const skill = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      expect(skill.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
    }
  });
});

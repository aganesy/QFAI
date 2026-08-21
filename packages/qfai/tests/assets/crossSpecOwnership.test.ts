/**
 * Two shipped rules collided with no way to satisfy both.
 *
 * `/qfai-implement` constrains execution to one spec and scopes every artifact
 * it writes to that spec — but the codebase is not partitioned at all, and the
 * Refactor phase actively **mandates** duplication removal. qfai defines no
 * module → owning-spec index, `done` has no outbound edge, and the Drift
 * Protocol's upstream list contains no code or test artifacts, so the
 * STOP → Change Request → owner-rerun route never fired for them.
 *
 * So when implementing spec B correctly required changing something spec A's
 * `done` rows certify, both outcomes violated a shipped rule — and neither left
 * any trace under `.qfai/**`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/cross-spec-ownership.md";
const DRIFT = "assistant/constitution/drift-protocol.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("detects the collision where it happens — before the edit, in Refactor", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("**Before editing a production file**");
    expect(skill).toContain("another spec's `tdd/test-list.md` names it in `Owning module`");
  });

  it("keys detection on the only column that holds a production path", async () => {
    // The trigger is editing a production file, so keying the lookup on
    // `Test file` compared a production path against a column of test paths and
    // never hit. `Owning module` is the column that holds production paths.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "**A production module another spec's ledger names in `Owning module` is that spec's to certify.**",
    );
    expect(reference).toContain(
      "under `Owning module` — that is the only column that holds a production path",
    );
    // `Test file` survives only for the narrower case it can actually cover.
    expect(reference).toContain("where the file being edited is itself that spec's test");
  });

  it("does not let an undeclared `Owning module` pass detection silently", async () => {
    // The column is optional and `-` is legal, and no real ledger declares it
    // today — so its absence must restrict, the way it does for parallel
    // dispatch, rather than clear the edit.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("An undeclared seam is a restriction, not a clearance");
    expect(reference).toContain("fall back to a repo-wide search");
    expect(reference).toContain(
      "Detection never passes silently just because the column is absent",
    );
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "a ledger that declares no `Owning module` falls back to the repo-wide search",
    );
  });

  it("gives the evidence file a place to record it", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`## Cross-spec obligations` (if any)");
    expect(skill).toContain("the obligation left unverified");
  });

  it("makes an open obligation block completion", async () => {
    // Without this the record is a note; with it, a run cannot report clean
    // while knowingly leaving another spec's assertion unverified.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "A `## Cross-spec obligations` entry in this spec's evidence file is still open",
    );
  });

  it("states the rule as record-and-re-review, not permission", async () => {
    // Requiring approval for every shared-file edit would make the mandated
    // duplication removal one line above unperformable.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain(
      "Editing it does not require permission — it requires a record and a re-review",
    );
  });

  it("names the field that carries the actual risk", async () => {
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("`Obligation at risk` is the load-bearing field");
    expect(reference).toContain('"Changed a shared helper" is not a record');
  });

  it("escalates to the Change Request path when the obligation truly broke", async () => {
    // Re-review can confirm an assertion still holds; it cannot ratify a
    // behaviour change the other spec never agreed to.
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("that is upstream drift");
    expect(reference).toContain("only its owner can");
  });

  it("is honest about what it does not fix", async () => {
    const reference = await read(tree, REFERENCE);
    expect(reference).toContain("It does not partition the codebase");
    expect(reference).toContain("does not give `done` an outbound edge");
  });

  it("puts the artifact class on the Drift Protocol's upstream list", async () => {
    // The list contained no code or test artifacts, which is why the existing
    // escalation route never applied to them.
    const drift = await read(tree, DRIFT);
    expect(drift).toContain(
      "**test or production artifacts another spec's completed implement run certifies**",
    );
    expect(drift).toContain("Changing one is not forbidden");
  });
});

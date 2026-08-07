/**
 * `/qfai-atdd` authored the tests for rows whose lifecycle requires a RED it
 * never observed, and never mentioned the ledger it writes into.
 *
 * `qfai-implement/SKILL.md` assigns ownership explicitly — `Layer = E2E` and
 * `Layer = API` rows are tracked in its ledger, their tests authored in
 * `/qfai-atdd` — and its Phase Red requires an admissible failure confirmed
 * before production code exists. `qfai-atdd/SKILL.md` contained no occurrence
 * of `RED`, `red`, `green`, `refactor`, `exception` or `test-list.md`, and its
 * stage gates ran plan → layer → E2E → API → integration → validate → runtime →
 * repo gates → reviewer with no failing-test step anywhere.
 *
 * The result was a lifecycle no such row could traverse: `todo` has exactly two
 * exits, `todo -> red` needs a RED the stage order makes unobservable, so
 * `exception` was the only terminal state available. On the repository this was
 * measured on, all 13 remaining `todo` rows were `/qfai-atdd`-owned, and the
 * ledger ended at 95 `exception` against 21 `done`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const IMPLEMENT = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("the ATDD skill names the ledger it writes into", async () => {
    // It never did. A skill that does not know it writes a ledger cannot be
    // held to that ledger's rules.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("## Execution Ledger: the rows this skill owns");
    expect(atdd).toContain("`.qfai/specs/<spec-id>/tdd/test-list.md`");
    expect(atdd).toContain("`Layer = E2E` and `Layer = API` rows");
  });

  it("states which cells it may write, and that the lifecycle is not its own", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**Cells this skill may write**: `Status`, `DR-ID`, `Evidence`");
    expect(atdd).toContain("references/execution-ledger.md#allowed-transitions");
  });

  it("gives the three RED-provenance branches, in order", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("### RED provenance for an ATDD-owned row (MUST)");
    expect(atdd).toContain("**Observed RED (preferred).**");
    expect(atdd).toContain("**Falsifiability (surface already exists).**");
    expect(atdd).toContain("**Neither is possible.**");
    // The failure being fixed is `exception` as the default outcome.
    expect(atdd).toContain("Branch 3 is the last resort, not the default.");
  });

  it("has a stage gate that runs the RED before any surface is built", async () => {
    // Ordering is the whole point: after P2-P4 there is nothing left to watch
    // fail, so a gate placed later would be unsatisfiable by construction.
    const atdd = await read(tree, ATDD);
    const gates = atdd.slice(atdd.indexOf("## Stage Gates"));
    expect(gates).toContain("P1b:");
    expect(flat(gates)).toContain("**before** P2-P4 build any surface");
    expect(gates.indexOf("P1b:")).toBeLessThan(gates.indexOf("P2: E2E"));
  });

  it("makes an unevidenced advance and a bare `exception` not-done", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain(
      "A ledger row was advanced past `todo` with neither an observed RED nor falsifiability evidence.",
    );
    expect(atdd).toContain('"The surface was built earlier in this cycle" is not such a reason.');
  });

  it("requires the branch and its evidence in the stage evidence file", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**Ledger rows advanced**");
    expect(atdd).toContain("Exactly one form per row, never both and never neither.");
    expect(atdd).toContain("## Ledger rows advanced");
  });

  it("the ledger reference documents the ATDD-owned case and refuses to waive RED", async () => {
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("## ATDD-owned rows (`Layer = E2E` / `Layer = API`)");
    expect(ledger).toContain("**There is no waiver here.**");
    expect(ledger).toContain("**The falsifiability path is the answer, not `exception`.**");
    expect(ledger).toContain(
      "A spec whose ATDD rows are all `exception` has recorded that the provenance step was skipped",
    );
  });

  it("qfai-implement points at the ATDD side of the split", async () => {
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("## Execution Ledger: the rows this skill owns");
    expect(implement).toContain("this skill neither writes those rows nor waives their evidence");
  });

  it("qa-gatekeeper accepts the falsifiability form and rejects a default exception", async () => {
    for (const rel of [GATEKEEPER, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain(
        "**A `Layer = E2E` / `Layer = API` row from `/qfai-atdd` is judged the same way.**",
      );
      expect(text).toContain("the falsifiability form is the expected evidence");
      expect(text).toContain("says only that the surface came first");
    }
  });
});

describe.each(TREES)("%s — the split has one writer and reachable references", (tree) => {
  const DRIFT = "assistant/constitution/drift-protocol.md";
  const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md";
  const PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";

  it("the Drift Protocol whitelist names /qfai-atdd as a ledger writer", async () => {
    // It authorised the carve-out for `/qfai-implement` only, so an agent
    // honouring both documents had no legal writer for these rows at all.
    const drift = flat(await read(tree, DRIFT));
    expect(drift).toContain("`/qfai-atdd` writes the same three cells");
    expect(drift).toContain("Exactly one skill owns any given row");
  });

  it("qfai-implement stops selecting and claiming the rows /qfai-atdd owns", async () => {
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "skipping any `Layer = E2E` / `Layer = API` row, which `/qfai-atdd` owns end to end",
    );
    // The old sentence had this skill driving their status once the test exists
    // — two owners for one row's cells.
    expect(implement).not.toContain("this skill only drives that row's status and evidence");
  });

  it("the shipped ledger template seeds the E2E/API rows", async () => {
    const template = flat(await read(tree, TEMPLATE));
    expect(template).toContain("one `Layer = E2E` row per `US-*`");
    expect(template).not.toContain("`/qfai-atdd` does not write to this ledger");
  });

  it("branch 1 creates the seam before the RED run", async () => {
    // Without it, a test for an unregistered route fails on a 404 — the exact
    // shape branch 1 calls inadmissible, leaving new-surface rows no branch.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Create the minimal seam first.**");
    expect(provenance).toContain("Phase Red takes at 3a");
  });

  it("branch 2 covers the surface this cycle built, not only a pre-existing one", async () => {
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("or this cycle built it before the journey was written");
    expect(provenance).not.toContain("When the surface predates this cycle, the correct test");
  });

  it("Satisfied-by accepts a surface, not only a sibling ledger row", async () => {
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "**`Satisfied-by` takes whatever already implements the predicate.**",
    );
    expect(provenance).toContain("otherwise the production path and symbol");
  });

  it("every qfai-implement reference from the ATDD tree resolves", async () => {
    // These are read from `qfai-atdd/`, where a bare `references/...` path
    // resolves inside the ATDD skill and does not exist.
    for (const rel of [ATDD, PROVENANCE]) {
      const text = await read(tree, rel);
      const bad = Array.from(
        text.matchAll(
          /`(references\/(?:execution-ledger|red-not-observable|red-admissibility)\.md[^`]*)`/g,
        ),
      ).map((m) => m[1]);
      expect(bad, `${rel} points at a qfai-implement reference through a qfai-atdd path`).toEqual(
        [],
      );
    }
  });

  it("qa-gatekeeper is given the ATDD evidence file and a resolvable ledger path", async () => {
    for (const rel of [GATEKEEPER, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain("`.qfai/evidence/atdd-<spec-id>.md`");
      expect(text).toContain(
        "`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md#atdd-owned-rows",
      );
    }
  });
});

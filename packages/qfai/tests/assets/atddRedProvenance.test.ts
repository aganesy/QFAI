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
const PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";
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
    expect(atdd).toContain("## Execution Ledger: the rows this skill feeds");
    expect(atdd).toContain("`.qfai/specs/<spec-id>/tdd/test-list.md`");
    expect(atdd).toContain("`Layer = E2E` and `Layer = API` rows");
  });

  it("states that it produces evidence, not ledger cells, and whose lifecycle applies", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**This skill does not write the ledger.**");
    expect(atdd).toContain("references/execution-ledger.md#allowed-transitions");
  });

  it("points at the reference and names the three branches in order", async () => {
    // The branch detail lives in `references/red-provenance.md` — SKILL.md is
    // at the 500-line asset ceiling, which is the split the guard exists to
    // force. What the skill body must still carry is the rule and the pointer.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("### RED provenance for an ATDD-owned row (MUST)");
    expect(atdd).toContain("**Read `references/red-provenance.md` before advancing any row.**");
    expect(atdd).toContain("Branch 3 is the last resort");

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Observed RED (preferred).**");
    expect(provenance).toContain("**Falsifiability");
    expect(provenance).toContain("**Neither is possible.**");
    expect(provenance).toContain("Branch 3 is the last resort, not the default.");
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
    expect(atdd).toContain("A ledger row was advanced past `todo` with none of the three forms");
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
    expect(implement).toContain("qfai-atdd/references/red-provenance.md");
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

  it("does not claim the ledger carve-out for a second writer", async () => {
    // The transfer this PR first attempted needs machinery the package does
    // not have — Phase 2b does not seed E2E/API rows and the ledger header has
    // no `US-Refs` / `CON-API-Refs` column — so it is out of scope here.
    // `/qfai-implement` keeps the single carve-out; this stage produces the
    // evidence its cells point at.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("**This skill does not write the ledger.**");
    const drift = flat(await read(tree, DRIFT));
    expect(drift).toContain("append/update by `/qfai-implement`");
  });

  it("qfai-implement points at the provenance reference for those rows", async () => {
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("qfai-atdd/references/red-provenance.md");
    expect(implement).toContain("this skill writes their `Status` / `DR-ID` / `Evidence`");
  });

  it("states the falsifiability branch's status transitions", async () => {
    // Without this the branch described a row reaching `green` with no `red`,
    // and the shared lifecycle has no `todo -> green` edge.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**The row still moves `todo -> red -> green`.**");
    expect(provenance).toContain("There is no `todo -> green` edge and none is needed");
  });

  it("requires an Oracle proof on the observed-RED branch too", async () => {
    // `qa-gatekeeper` requires one on every item, and a natural RED is not a
    // substitute — so the preferred branch's prescribed evidence could not
    // clear the gate it is judged by. The branch names the mutation it
    // intends; the run is recorded at GREEN, which is `/qfai-implement`'s
    // phase, because there is no production code to mutate until then.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "| Observed RED | RED command+result, `qa-gatekeeper` PASS, the `Oracle proof` plan |",
    );
    expect(provenance).toContain("A natural RED is not a substitute");
    expect(provenance).toContain("branch 1 names the mutation it intends");
  });

  it("accepts a valid exception as the third evidence form", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("or a `DR-*` recording why neither was available");
    expect(atdd).toContain("The third form is a valid outcome, not a shortfall");
  });

  it("names the per-stage evidence home in both contracts", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("put the evidence in `.qfai/evidence/atdd-<spec-id>.md`");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("**The evidence file follows the stage that produced it.**");
    expect(ledger).not.toContain("is the single home for the per-item");
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

describe.each(TREES)("%s (handover and container)", (tree) => {
  it("gives /qfai-implement a branch that consumes the evidence instead of re-observing", async () => {
    // Phase Red's steps 4 and 5 re-run the test and watch it fail. By the time
    // that skill reaches an ATDD-owned row the surface exists, so the run
    // passes and step 5 classifies it as an anomaly bound for `exception` —
    // the terminal state branch 2 exists to avoid, reached through the branch
    // itself. A falsifiability row could not reach `green` at all.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("3b.");
    expect(implement).toContain("consumes the provenance `/qfai-atdd` recorded");
    expect(implement).toContain("steps 4 and 5 do not apply to it");
    expect(implement).toContain("red-provenance.md#handover-to-qfai-implement");

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## Handover to /qfai-implement");
    expect(provenance).toContain("The mutation run **is** `todo -> red`");
    expect(provenance).toContain("stops with a handoff note");
  });

  it("forbids a minimal seam that answers with the contracted status", async () => {
    // When the row's predicate IS the status — 201 on create, 204 on delete,
    // 403 on a refusal — a handler registered with "the declared status"
    // passes the assertion the moment it exists. There is no RED left to
    // observe, and the row's behaviour was implemented before its test failed.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**The seam must not return the contracted status.**");
    expect(provenance).toContain("not-implemented sentinel the contract does not use");
    expect(provenance).not.toContain("with **no behaviour**: the declared status");
    expect(provenance).toContain("no assertion in this row's selector can pass against the seam");
  });

  it("keeps the run payload out of the evidence table cell", async () => {
    // Same container defect the implement ledger had: a GFM row is one
    // physical line and a cell ends at every unescaped `|`, so a multi-line
    // run or a shell pipe in the output truncates the proof qa-gatekeeper
    // needs, or breaks every row below it.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("cell is an **anchor, never the commands and output**");
    expect(atdd).toContain("### TDD-NNNN");

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Where each form lives.**");
    expect(provenance).toContain("execution-ledger.md#evidence-cell-contract");
  });
});

describe.each(TREES)("%s (ownership and gate alignment)", (tree) => {
  it("does not write `red` before the handover has been verified", async () => {
    // Step 2 wrote `todo -> red` unconditionally, so a row whose ATDD entry is
    // missing or malformed was parked at `red` with no RED behind it — and an
    // `exception` row reached its DR only after an illegal `red` hop.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("not yet for an `E2E` / `API` row");
    expect(implement).toContain("`exception` writes `todo -> exception`");
    expect(implement).toContain("leaves the row at `todo` and stops with a handoff note");
  });

  it("keeps the ATDD evidence file reachable from the completion gate", async () => {
    // Item 10 required every row's anchor to resolve into
    // `implement-<spec-id>.md`, so an E2E/API row pointing at the ATDD file
    // could not reach `done` however correct its RED and GREEN were.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("the evidence file its `Layer` owns");
    expect(implement).toContain("`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row");
    expect(implement).toContain(
      "The item's evidence file (item 10) is appended with both reviewer verdicts",
    );

    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("completion item 10 reads the same split");
  });

  it("submits the observed RED to qa-gatekeeper before any production code exists", async () => {
    // Branch 1 went straight from recording the RED to building the surface,
    // so the blocking confirmation `qfai-implement` requires could only be
    // sought after the fact — post-hoc self-attestation of a state nobody can
    // re-observe.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "Submit that run to `qa-gatekeeper` (routing phase `red`) before any production code exists",
    );
    expect(provenance).toContain("Stage gate **P1b** is where steps 1-3 happen.");
  });

  it("leaves the production surface to the skill that owns production code", async () => {
    // `agent-routing.yml` gives this stage `acceptance-test-engineer` and no
    // backend or frontend agent, so "build the surface and re-run for GREEN"
    // asked it to write code it does not own — or to stop without a GREEN.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Stop there. Do not build the surface.**");
    expect(provenance).toContain("no backend or frontend agent");
    expect(provenance).not.toContain("then build the surface and re-run for GREEN");

    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("does **not** write production code");
  });

  it("makes the ledger a mandatory ATDD input", async () => {
    // The stage has to enumerate the E2E/API rows it owes evidence for. Both
    // the preflight priority list and the Read Set Contract omitted the
    // ledger, so a default-mode run could not name a single row — and step 3b
    // then stops on a missing handoff for every one of them.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain(
      "`.qfai/specs/<spec-id>/tdd/test-list.md` (the execution ledger — enumerate the `Layer = E2E` / `Layer = API` rows",
    );
    expect(atdd).toContain("`.qfai/specs/<spec-id>/tdd/test-list.md` — read, never written.");
  });
});

describe.each(TREES)("%s (reachability and sequencing)", (tree) => {
  it("points step 3b at a path that exists", async () => {
    // `qfai-atdd/references/red-provenance.md` resolves from
    // `qfai-implement/SKILL.md` to `qfai-implement/qfai-atdd/...`, which is
    // nothing — so the mandatory handover contract was unreachable.
    const implement = await read(tree, IMPLEMENT);
    expect(implement).toContain("`../qfai-atdd/references/red-provenance.md");
    expect(implement).not.toContain("per `qfai-atdd/references/red-provenance.md");
  });

  it("keeps a review-fix row out of the handover branch", async () => {
    // Phase Red step 1 selects a `review-fix` row first and step 2 keeps its
    // status. 3b did not check, so it would replay the original handoff — and
    // write `todo -> red` from a row that is not at `todo`.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("A `todo` `E2E` / `API` row consumes the provenance");
    expect(implement).toContain("A `review-fix` row does **not** come here");
    expect(implement).toContain("references/round-evidence.md");
  });

  it("names the layer-owned evidence file everywhere the row is written", async () => {
    // Item 10 alone was not enough: the orchestrator override and the ledger's
    // own column definition both still said `implement-<spec-id>.md`
    // unconditionally, so following either produced a pointer item 10 rejects.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("plus the anchor into the evidence file the row's `Layer` owns");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("an anchor into the evidence file this row's `Layer` owns");
  });

  it("gives the observed-RED submission a routing phase that exists", async () => {
    // Branch 1 says to submit the RED at routing phase `red`, and
    // `agent-routing.yml` gave qfai-atdd only coverage / implementation /
    // evidence / review — the phase named was `/qfai-implement`'s.
    const catalog = await read(tree, "assistant/manifest/agent-routing.yml");
    const atdd = catalog.slice(catalog.indexOf("- skill: qfai-atdd"));
    const block = atdd.slice(0, atdd.indexOf("- skill: ", 1));
    expect(block).toContain("- id: red");
    expect(block).toContain("blocking_agents: [qa-gatekeeper]");
    // Before `implementation`: after the surfaces exist there is no RED left.
    expect(block.indexOf("- id: red")).toBeLessThan(block.indexOf("- id: implementation"));
  });

  it("hands branch-1 rows over before the gates that require a green tree", async () => {
    // Branch 1 ends with a deliberately failing test and no production code,
    // and P5-P8 require the suite and the repo quality gates to pass. Without
    // an intermediate handoff the stage cannot finish its own gates.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("P1c:");
    expect(atdd).toContain("Branch 1 rows are handed to `/qfai-implement` before P5");
    expect(atdd).toContain("return here with the tree green");
  });

  it("does not claim branch 2 has its evidence at P1b", async () => {
    // P1b required RED provenance "established" for every row while the same
    // sentence deferred branch 2's mutation run to P6 — a gate no branch-2 row
    // could pass.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("Branch chosen for every row this cycle will advance");
    expect(atdd).toContain(
      "A branch 2 row legally leaves P1b with its branch recorded and no evidence yet",
    );
  });
});

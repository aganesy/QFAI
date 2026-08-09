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
    expect(flat(gates)).toContain("before P2-P4 build any surface");
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
    expect(atdd).toContain("Exactly one form per row, never both and never neither");
    expect(atdd).toContain("## Ledger rows advanced");
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "Exactly one form per row, never both and never neither:",
    );
  });

  it("the ledger reference documents the ATDD-owned case and refuses to waive RED", async () => {
    const ledger = flat(await read(tree, LEDGER));
    // The heading is short so one anchor serves every reference to it; the
    // layers it covers are named in the first line of its body.
    expect(ledger).toContain("## ATDD-owned rows");
    expect(ledger).toContain("A row whose `Layer` is `E2E` or `API`.");
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
      "| Observed RED | RED command+result, `RED revision`, `qa-gatekeeper` PASS, the `Oracle proof` plan |",
    );
    expect(provenance).toContain("A natural RED is not a substitute");
    expect(provenance).toContain("branch 1 names the mutation it intends");
  });

  it("accepts a valid exception as the third evidence form", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("or a `DR-*` recording why neither was available");
    expect(atdd).toContain("The third form is a valid _branch_, and it is **not a completion**");
    // ...and the qualification that keeps it from reading as "done".
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "## Branch 3 does not close a spec on its own",
    );
  });

  it("names the per-stage evidence home in both contracts", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("put the evidence in `.qfai/evidence/atdd-<spec-id>.md`");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("**The evidence file follows the stage that produced it.**");
    expect(ledger).not.toContain("is the single home for the per-item");
  });

  it("branch 1 gets the seam from the skill that owns production code", async () => {
    // Without a seam, a test for an unregistered route fails on a 404 — the
    // exact shape branch 1 calls inadmissible, leaving new-surface rows no
    // branch. But the seam *is* production code, and this stage's `red` phase
    // has no backend or frontend agent, so writing it here is the ownership
    // breach step 5 forbids. It is asked for, not authored.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "**Ask `/qfai-implement` for the minimal seam first — for a surface that does not exist.**",
    );
    expect(provenance).toContain("Phase Red step 3a");
    expect(provenance).toContain(
      "writing it here is the ownership breach step 5 exists to prevent",
    );
    expect(provenance).not.toContain("**Create the minimal seam first.**");
    // A row that arrives from branch 2s first-run check has its surface already.
    expect(provenance).toContain("skip to step 2 and read the note there");
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
    expect(provenance).toContain("otherwise the production **path and symbol**");
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
    expect(provenance).toContain("treat the mutation run as `todo -> red`");
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
    // SKILL.md points at the shape; the shape and its rationale live in the
    // reference, which is what the 500-line ceiling forces and what keeps one
    // statement of the rule rather than two that can drift.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("the cell is an anchor and the payload goes in the section");
    expect(atdd).toContain("### TDD-NNNN");

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "row per `TDD-*`, holding the branch and an anchor. The commands and their output",
    );
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
    expect(provenance).toContain("Stage gate **P1b** is where steps 1-4 happen.");
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
    expect(atdd).toContain("A branch 1 row is discharged in that loop");
    expect(flat(await read(tree, PROVENANCE))).toContain("return with the tree green");
  });

  it("does not claim branch 2 has its evidence at P1b", async () => {
    // P1b required RED provenance "established" for every row while the same
    // sentence deferred branch 2's mutation run to P6 — a gate no branch-2 row
    // could pass.
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("A branch is chosen for every row");
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "A run whose rows are all branch 2 passes P1b with nothing submitted",
    );
  });
});

describe.each(TREES)("%s (executability of the handed-over row)", (tree) => {
  it("does not require the handed-over RED to name the final revision", async () => {
    // Item 10 asked all four observations for one revision. A branch-1 RED is
    // taken before the production code exists, so its revision necessarily
    // differs from GREEN's and the reviewers' — the property that RED is worth
    // having. An `observed-red` E2E/API row could not reach `done` at all.
    const implement = flat(await read(tree, IMPLEMENT));
    // The exemption now covers both transient observations, and the
    // handed-over RED is named inside it.
    expect(implement).toContain(
      "**except an observation that cannot be taken against the final tree**",
    );
    expect(implement).toContain("a RED `/qfai-atdd` handed over, taken before the production code");
    expect(implement).toContain("items 5, 7 and 8 agree among themselves");
  });

  it("keeps the whole per-item record in the file the gate reads", async () => {
    // Items 10-11 pointed an E2E/API row at `atdd-<spec-id>.md` while the
    // mandatory Evidence section still created `implement-<spec-id>.md` and
    // called it the single home for every row's payload. Following it split
    // the row across two files and left the one the gate reads incomplete.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("Create/update the evidence file the row's `Layer` owns");
    expect(implement).toContain("belongs in the **one** file");
    expect(implement).not.toContain("Create/update: `.qfai/evidence/implement-<spec-id>.md`");
  });

  it("runs the Oracle proof in Phase Green, where production code exists", async () => {
    // Branch 1 records the mutation it *plans*; there is nothing to mutate
    // until Phase Green builds the surface. Completion item 5 wants the
    // command and its real failing output, so without this step an
    // `observed-red` row arrives at the gate with a plan and no run.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "2a. **Run the `Oracle proof` and record it here, before the submission in step 2.**",
    );
    expect(implement).toContain("revert the mutation immediately");
    expect(implement).toContain("its falsifiability run **is** the Oracle proof");
  });

  it("performs the branch-2 mutation instead of stopping or deferring", async () => {
    // Phase Red always takes the first `todo` row. A branch-2 row above the
    // branch-1 rows has its branch recorded and its evidence still to come at
    // P6 — treating that as a malformed handoff stops the run, so the
    // branch-1 rows never reach Phase Green, their tests stay red, ATDD never
    // passes P5-P8, and P6 never happens. The deadlock is self-inflicted.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("goes to **step 3c**");
    expect(implement).toContain(
      "3c. **A `falsifiability` entry with no evidence yet: take it here.**",
    );

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "**A branch-2 row whose evidence is not written yet is not a stop, and not a defer either.**",
    );
    expect(provenance).toContain("names no branch, or is malformed in any other way");
  });

  it("hands the P1c round-trip a named row list", async () => {
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("hand it to `/qfai-implement`, GREEN,");
    expect(flat(await read(tree, PROVENANCE))).toContain("Name the row in the handoff");
  });

  it("chooses branch 2 from a first-run pass, not from surface existence", async () => {
    // A surface that exists can still be wrong, and a correct test against a
    // buggy one fails naturally — an observed RED, not an exception. Branch 2's
    // mutation cannot run against an already-failing test and has no GREEN to
    // restore to, so keying on existence sent a real defect to `exception`.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Run the test before choosing this branch.**");
    expect(provenance).toContain("Surface existence is not the condition; a first-run **pass** is");
    expect(provenance).toContain("the row belongs in branch 1");
  });

  it("puts delivery-planner's scope approval before the RED gate", async () => {
    // `qfai-implement` makes it the only authority on whether a selector covers
    // a sufficient slice, and requires a scope REVISE settled before the RED is
    // submitted. Approving the RED first leaves the planner only "keep the PASS
    // and open a new row", which cannot repair a wrong-granularity handoff.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "**Scope approval — obtained before step 2 runs, listed here for the contract it carries.**",
    );
    // The ordering is the point: a REVISE changes the test or its selector, so
    // a RED recorded ahead of approval is evidence for a scope that no longer
    // exists and its `RED test hash` addresses a file the repair rewrites.
    expect(provenance).toContain("**With the scope approved (step 3), run the test.**");

    const catalog = await read(tree, "assistant/manifest/agent-routing.yml");
    const atddBlock = catalog.slice(catalog.indexOf("- skill: qfai-atdd"));
    const block = atddBlock.slice(0, atddBlock.indexOf("- skill: ", 1));
    expect(block).toContain("blocking_agents: [delivery-planner, qa-gatekeeper]");
  });
});

describe.each(TREES)("%s (gate ordering)", (tree) => {
  it("takes the Oracle proof before submitting the GREEN", async () => {
    // `qa-gatekeeper` requires an `Oracle proof` on every item, and the `build`
    // phase is blocking — so a GREEN submitted before step 2a produced one is a
    // REVISE by construction, and that REVISE blocks the step meant to produce
    // the proof.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("Do not submit it yet");
    expect(implement).toContain("a GREEN submitted before step 2a has produced one is a REVISE");
    expect(implement).toContain(
      "Take the proof first (2a), then submit the pass and the proof together",
    );
  });

  it("reruns the agents a scope REVISE invalidates, not only the planner", async () => {
    // A `delivery-planner` REVISE means the selector covers too little, and the
    // repair is `acceptance-test-engineer` splitting the test plus a fresh
    // `qa-gatekeeper` verdict on the new RED. `failed-agents-only` re-ran the
    // planner against an unchanged selector, or left a stale PASS standing.
    const catalog = await read(tree, "assistant/manifest/agent-routing.yml");
    const atdd = catalog.slice(catalog.indexOf("- skill: qfai-atdd"));
    const block = atdd.slice(0, atdd.indexOf("- skill: ", 1));
    const red = block.slice(block.indexOf("- id: red"), block.indexOf("- id: implementation"));
    expect(red).toContain("rerun_policy: changed-scope-dependents");
  });
});

describe.each(TREES)("%s (natural RED and the shared falsifiability gate)", (tree) => {
  it("routes a natural RED into branch 1 at the step that fits it", async () => {
    // Branch 2's first-run check sends an already-failing row to branch 1, but
    // branch 1 step 1 asks for a seam for a surface that does not exist and
    // step 4 confirms "before any production code exists" — neither is true
    // here, so the row that observed a real defect stopped.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("the row belongs in branch 1 — **at its step 2**");
    expect(provenance).toContain("observed **against the tree before the fix**");
    expect(provenance).toContain("for a surface that does not exist");
  });

  it("lets the shared contract accept a `Satisfied-by` that is not a row id", async () => {
    // `red-provenance.md` required the path/symbol form for an ATDD surface no
    // ledger row owns, while `red-not-observable.md` called a sibling
    // `TDD-NNNN` the only legal value and `qa-gatekeeper.md` called a sibling
    // row the only legitimate absence — so the form ATDD mandates was rejected
    // by the gate that judges it, and the row could not proceed.
    const shared = flat(
      await read(tree, "assistant/skills/qfai-implement/references/red-not-observable.md"),
    );
    expect(shared).toContain(
      "accepted only on a `Layer = E2E` / `Layer = API` row handed over by `/qfai-atdd`",
    );
    // And still refused elsewhere: widening it for every row would let an
    // ordinary TDD row reach `done` with no production change and no sibling.
    expect(shared).toContain(
      "On a `Unit` / `Component` / `Integration` row it is **not** accepted",
    );

    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain(
      "**On an `E2E` / `API` row, `Satisfied-by` need not be a sibling `TDD-NNNN`.**",
    );
    expect(gatekeeper).toContain("On any other row the sibling row is still required");
  });
});

describe.each(TREES)("%s (the contracts the handover has to land in)", (tree) => {
  it("gives the handed-over RED its own revision field", async () => {
    // Item 10's exception could not be expressed: the per-item contract stores
    // one `Revision` per round and `evidence-revision.md` calls any observation
    // naming a different revision stale — so a correct `observed-red` row was
    // permanently stale however the gate worded its carve-out.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("`RED revision`");
    expect(implement).toContain("recording both in one field made the row permanently stale");

    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("One exception, and it is structural");
    expect(revision).toContain("leaves `Revision` for the GREEN and the two reviews");
  });

  it("takes branch-1 rows through P1c one at a time", async () => {
    // Every row's checkpoint runs the full suite, so a second deliberate RED
    // left open elsewhere fails the first row's checkpoint — and that row is
    // then stranded at `refactor`, which Phase Red does not re-select.
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "P1c — discharge branch 1, one row at a time",
    );
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "stranded at `refactor`, which Phase Red does not re-select",
    );
  });

  it("hands branch 2's mutation to the skill that owns production code", async () => {
    // The `evidence` phase is `devops-ci-engineer` and `qa-gatekeeper`, neither
    // of which owns production source — the same boundary branch 1 step 5
    // states. Applying the mutation here is the breach; refusing to is a stop.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "**The mutation is production code, so `/qfai-implement` applies it.**",
    );
    expect(provenance).toContain("writes the trio into this row's entry here");
  });
});

describe.each(TREES)("%s (someone can perform every step)", (tree) => {
  it("routes the production owners into the phase that touches production code", async () => {
    // The `red` phase had `qa-gatekeeper` alone, and the orchestrator may not
    // implement — so neither step 3a's seam nor step 3c's mutation had anyone
    // to perform it, and a new-surface row could not reach an admissible RED.
    const catalog = await read(tree, "assistant/manifest/agent-routing.yml");
    const implement = catalog.slice(catalog.indexOf("- skill: qfai-implement"));
    const block = implement.slice(0, implement.indexOf("- skill: ", 1));
    const red = block.slice(block.indexOf("- id: red"), block.indexOf("- id: build"));
    expect(red).toContain(
      "conditional_agents: [qa-gatekeeper, frontend-engineer, backend-engineer]",
    );
  });

  it("names one phase that performs the first falsifiability mutation", async () => {
    // The precondition was circular: 3b deferred until the trio existed, and
    // Phase Green 2a refused to repeat a mutation it assumed had run — so
    // nobody performed the first one and an ordinary first-run-pass row could
    // not leave `todo`.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "3c. **A `falsifiability` entry with no evidence yet: take it here.**",
    );
    expect(implement).toContain("this mutation _is_ the row's `Oracle proof`");

    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("Phase Red **step 3c** applies the mutation");
    expect(provenance).toContain("not a stop, and not a defer either");
  });

  it("keeps the scope and RED gates on a natural RED", async () => {
    // Only the seam is skipped when the surface already exists. Skipping steps
    // 3-4 dropped `delivery-planner`'s scope approval and the `qa-gatekeeper`
    // PASS the handover table then requires on every `observed-red` entry.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("Only step 1 is skipped");
    expect(provenance).toContain("Steps 3 and 4 still run");
  });

  it("writes checkpoint evidence to the file the row's Layer owns", async () => {
    const checkpoint = flat(
      await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
    );
    expect(checkpoint).toContain(
      "Record a **per-item** result in the evidence file the row's `Layer` owns",
    );
    expect(checkpoint).not.toContain(
      "Record the result in `.qfai/evidence/implement-<spec-id>.md`",
    );
  });

  it("requires of the gatekeeper only the evidence file the row's Layer owns", async () => {
    // Listed unconditionally, the Stop condition fired on a Unit-only spec that
    // never ran `/qfai-atdd`, before the `implement-<spec-id>.md` that does
    // exist was read.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain("in the file its `Layer` owns, and only that one");
    // Both directions: a Unit-only spec has no ATDD file, an E2E/API-only spec
    // has no implement file, and requiring both stops on one of them.
    expect(gatekeeper).toContain("has no implement file");
  });

  it("points the lifecycle reference at a heading that exists", async () => {
    const ledger = await read(tree, LEDGER);
    expect(ledger).toContain("### Allowed transitions");
  });
});

describe.each(TREES)("%s (gates only what has a payload)", (tree) => {
  it("does not block a branch-2-only run on evidence P1b defers", async () => {
    // The `red` phase's `qa-gatekeeper` is mandatory and blocking, and a branch
    // 2 row's payload is the falsifiability trio — which by the same gate's own
    // rule does not exist until P6. A run whose rows are all branch 2 had
    // nothing submittable and could not pass P1b to reach P6.
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "judges the rows that have evidence at P1b — the branch 1 ones",
    );
    expect(flat(await read(tree, PROVENANCE))).toContain("its rows are gated when the trio lands");
  });

  it("reruns the production owner when the RED gate faults its edit", async () => {
    // The seam and the mutation are written by `frontend-engineer` /
    // `backend-engineer` in this phase, and a `qa-gatekeeper` REVISE here is
    // usually about one of them. `failed-agents-only` re-judged an unchanged
    // artifact and returned the same REVISE, so the row never left `red`.
    const catalog = await read(tree, "assistant/manifest/agent-routing.yml");
    const implement = catalog.slice(catalog.indexOf("- skill: qfai-implement"));
    const block = implement.slice(0, implement.indexOf("- skill: ", 1));
    const red = block.slice(block.indexOf("- id: red"), block.indexOf("- id: build"));
    expect(red).toContain("rerun_policy: changed-scope-dependents");
  });
});

describe.each(TREES)("%s (the handoff survives ledger order and time)", (tree) => {
  it("selects the row P1c named, not the first todo row", async () => {
    // P1c hands over by `TDD-ID`, and Phase Red step 1 took the first `todo`
    // row regardless — so a branch-2 row above the named one was processed
    // first, and its full-suite checkpoint ran against a tree still holding
    // the named row's deliberate RED. It failed, landed at `refactor`, and
    // step 1 does not re-select that.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**A named row wins**");
    expect(implement).toContain("Row order in the ledger is not a priority");
  });

  it("re-checks the branch against the tree at each row's handoff", async () => {
    // Fixing every row's branch at P1b goes stale as soon as rows are taken
    // one at a time: an earlier branch-1 row's production code can satisfy a
    // later row's predicate, leaving a row recorded as `observed-red` with no
    // observable RED and no re-classification step.
    const atdd = flat(await read(tree, ATDD));
    // The gate names the rule; the reference carries it, which is what the
    // 500-line ceiling forces and what keeps one statement of it.
    expect(atdd).toContain("provisionally until its handoff");
    expect(flat(await read(tree, PROVENANCE))).toContain("**The choice is provisional");
    expect(flat(await read(tree, PROVENANCE))).toContain(
      "can have no observable RED left by the time that row's turn comes",
    );
  });

  it("records the RED revision where it can still be observed", async () => {
    // The completion gate requires `RED revision` on a handed-over RED, and
    // the producer recorded no revision at all — `/qfai-implement` cannot
    // recover an uncommitted tree's address after Phase Green has changed it,
    // so the required field was a guess or absent.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**and the revision it was observed at**");
    expect(provenance).toContain("| Observed RED | RED command+result, `RED revision`,");
  });

  it("hands a review-fix acceptance test back to the skill that owns it", async () => {
    // `/qfai-implement` does not author those tests and its `red` phase has no
    // `acceptance-test-engineer`, so a REVISE asking for a test change left
    // the row at `review-fix` or had a production agent edit a test it does
    // not own.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("hand the acceptance test back to `/qfai-atdd` first");
    expect(implement).toContain("has nobody here to do it");
  });

  it("keeps cross-spec obligations in the row's own evidence file", async () => {
    const cross = flat(
      await read(tree, "assistant/skills/qfai-implement/references/cross-spec-ownership.md"),
    );
    expect(cross).toContain("in the evidence file the row's `Layer` owns");
  });
});

describe.each(TREES)("%s (a gate must be reachable in the order it is listed)", (tree) => {
  it("puts the branch-2 handoff after P4, where its precondition is met", async () => {
    // P1d required "after P2-P4" while sitting before P2 in a Do-not-skip
    // list: a run with an ordinary branch-2 row could only wait at a gate
    // whose precondition needed gates it had not reached, or skip it.
    const atdd = await read(tree, ATDD);
    const gates = atdd.slice(atdd.indexOf("## Stage Gates"));
    expect(gates).toContain("P4b: **Branch 2 rows are handed over**");
    expect(gates.indexOf("P4: Integration")).toBeLessThan(gates.indexOf("P4b:"));
    expect(gates.indexOf("P4b:")).toBeLessThan(gates.indexOf("P6: Runtime"));
    // Branch 3 has no such precondition and stays early.
    expect(flat(gates)).toContain(
      "P1d: **Branch 3 rows are handed over once their `DR-*` is written.**",
    );
  });

  it("does not gate a seam-only round trip on a RED that cannot exist yet", async () => {
    // `/qfai-atdd` calls step 3a before it has a RED — that is what the trip is
    // for. Continuing into step 3b read the entry as malformed, and the
    // always-blocking `qa-gatekeeper` had no assertion failure to judge, so the
    // only reachable verdict was REVISE.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**A seam-only invocation stops here.**");
    expect(implement).toContain("Do **not** continue to step 3b, and do **not** route");
    expect(implement).toContain(
      "The blocking gate applies to the handoff that follows, once that stage has taken the RED against the seam.",
    );
  });

  it("asks the RED gate only for what a RED gate can have", async () => {
    // validate output, coverage reports and runtime evidence are first written
    // at P5/P6, and this role is blocking at P1b.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain(
      "**The three below are required at a completion gate, not at a RED/GREEN observation.**",
    );
    expect(gatekeeper).toContain(
      "At an observation gate the row's own evidence above is the whole input.",
    );
    expect(gatekeeper).toContain("judged against what the invoking phase requires");
  });

  it("addresses an uncommitted RED by content, not by status", async () => {
    // `git status --porcelain` names paths and states. Edit the file under test
    // after the RED and the digest is unchanged, so a stale observation passes
    // the freshness gate the handover depends on.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("it needs a **content** address rather than a status one");
    expect(provenance).toContain("**Not `git stash create`**");
    expect(provenance).not.toContain("`working-tree+<porcelain digest>`");
  });
});

describe.each(TREES)("%s (a gate must be executable by the routing it declares)", (tree) => {
  it("routes the RED phase per ledger item, and the gatekeeper conditionally", async () => {
    // The default `per-invocation` routes each agent once for the whole ledger,
    // which cannot execute the one-row-at-a-time loop P1b/P1c require. And a
    // mandatory blocking `qa-gatekeeper` stopped a branch-2-only run before it
    // could reach the P4b handoff that produces the trio it stopped for.
    const routing = await read(tree, "assistant/manifest/agent-routing.yml");
    const red = routing.slice(routing.indexOf("- id: red"));
    expect(red.slice(0, red.indexOf("- id: implementation"))).toContain(
      "iteration: per-ledger-item",
    );
    expect(flat(routing)).toContain("conditional_agents: [qa-gatekeeper]");
  });

  it("names the same handoff stage in the skill and in the reference", async () => {
    // The reference is mandatory reading before a row advances, so a stage name
    // that disagrees with the Do-not-skip list leaves the order undetermined.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("P4b, after P4 and before P6");
    expect(provenance).toContain("P4b hands it over in its turn.");
    expect(provenance).not.toContain("P1d, after P2-P4");
  });

  it("accepts a plan as the Oracle proof at a RED observation", async () => {
    // Branch 1's RED precedes the production behaviour, so there is nothing to
    // mutate — requiring a demonstrated mutation made a correct observed RED
    // unable to pass P1b and so unable to reach the phase that builds the code.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain(
      "**At a RED observation the proof is a plan, and a plan is enough.**",
    );
    expect(gatekeeper).toContain(
      "Require an `Oracle proof` on each item **at a GREEN or completion gate**",
    );
  });

  it("states the revision field as a content address in the shared contract", async () => {
    // The field contract is what the consumer reads; leaving it on porcelain
    // meant the freshness rule was stated in one place and contradicted in the
    // one that binds.
    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("Revision: <git rev> | working-tree+<content hash>");
    expect(revision).toContain("**A `git status --porcelain` digest is not sufficient**");
    expect(revision).toContain("`git stash create` does not do it either");
  });

  it("keeps a pre-split row gateable where its evidence actually is", async () => {
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "an `E2E` / `API` row that reached `done` or `review-fix` before this split",
    );
    expect(implement).toContain("Accept that anchor for such a row");
  });

  it("tells a project whose manifest predates the red phase what to do", async () => {
    // `qfai init --force` leaves `assistant/manifest/**` alone, so the skill
    // update can arrive without the phase it relies on.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## A project without the `red` phase");
    expect(provenance).toContain(
      "A missing phase is a stale manifest, never the gate not applying",
    );
  });

  it("requires a neutral seam response, not an empty one", async () => {
    // An empty body raises a parse error in a test that decodes JSON before
    // asserting — a non-assertion failure `red-admissibility.md` rejects.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Neutral, not empty.**");
    expect(provenance).toContain("with only the contracted predicate withheld");
  });
});

describe.each(TREES)("%s (the nested run and the third branch)", (tree) => {
  it("says the P1c round trip is an item cycle, not a completion gate", async () => {
    // `/qfai-implement` PASSes its blocking reviewers before the checkpoint,
    // and its completion-gate inputs are P5/P6 artifacts. Owing them inside a
    // P1c handoff stranded the first branch-1 row at `refactor`, which Phase
    // Red does not re-select, so P2 was never reached.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## What the nested run owes");
    expect(provenance).toContain("Either run is an **item cycle**, not this spec's completion");
    expect(flat(await read(tree, ATDD))).toContain(
      "the nested run is an item cycle, not a completion gate",
    );
  });

  it("does not let branch 3 read as a way to close a spec", async () => {
    // `exception` is a blocking output; completion needs a user-approved
    // `TDDLIST-001` waiver. "A valid outcome, not a shortfall" read as done, so
    // a run could record the `DR-*`, hand over, and leave a spec that can never
    // legally close — nothing later can produce the approval retroactively.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## Branch 3 does not close a spec on its own");
    expect(provenance).toContain("user-approved accepted-risk waiver");
    expect(provenance).toContain("user approval is a decision this stage asks for");
  });

  it("records a test hash that survives Phase Green", async () => {
    // The working-tree hash covers the production files Phase Green necessarily changes,
    // so it cannot be recomputed from the final tree — the reviewer cannot tell
    // "only production changed" from "the test was edited after the handoff".
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Record the test's own content hash as well.**");
    expect(provenance).toContain("`RED test hash` alongside `RED revision`");
  });

  it("points the falsifiability contract at the sibling file", async () => {
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("`red-not-observable.md` already defines the substitute");
    expect(ledger).not.toContain("`references/red-not-observable.md` already defines");
  });
});

describe.each(TREES)("%s (the contracts a row's Layer implies)", (tree) => {
  it("keys the RED test hash on the Test file column", async () => {
    // `Selector` is a test *name* in the ordinary case — the checkpoint runs
    // `<Test file> -t '<Selector>'` — so hashing "the files the Selector names"
    // yields an empty or guessed value and detects no post-handoff edit.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("the files the row's **`Test file`** column names");
    expect(provenance).toContain("Not the `Selector` — that column is a test _name_");
  });

  it("scopes planner authority by the row's obligation column", async () => {
    // An `E2E` row owes `US-Refs` and an `API` row owes `CON-API-Refs`. Defined
    // as "a sufficient slice of its `TC-*` obligation", the blocking gate asked
    // the planner to judge something those rows do not have.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("a sufficient slice of the obligation its `Layer` names");
    const planner = flat(await read(tree, "assistant/agents/delivery-planner.md"));
    expect(planner).toContain("**The document the row's obligation column points at.**");
    expect(planner).toContain("`.qfai/specs/spec-*/02_User-stories.md` for a `US-Refs` row");
    expect(planner).toContain("`.qfai/contracts/api/**` for a `CON-API-Refs` row");
  });

  it("says zero ATDD-owned rows is a count, not nothing to do", async () => {
    // `/qfai-sdd` seeds a row per coverage-target `TC-*`, which excludes L4/L5,
    // and this skill cannot write the ledger — so a fresh spec legitimately has
    // none, and reading that as "no work" skips the US/CON-API obligations that
    // are this skill's own.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## A spec with no ATDD-owned rows");
    expect(provenance).toContain('Zero is a count, not "nothing to do"');
  });

  it("states the reviewer revision as a content hash in the shared baseline", async () => {
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain("`working-tree+<content hash>` when the tree is uncommitted");
    expect(baseline).toContain("**Not** a `git status --porcelain` digest");
  });
});

describe.each(TREES)("%s (each gate reads what the step before it produced)", (tree) => {
  it("orders Phase Red 3a, 3b, 3c", async () => {
    // Listed 3c first, an ordered read ran the production mutation and wrote
    // `todo -> red` before 3b had checked the entry's branch, its selector and
    // its missing fields — advancing the ledger on unverified provenance.
    const implement = await read(tree, IMPLEMENT);
    const [a, b, c] = ["   3a.", "   3b.", "   3c."].map((s) => implement.indexOf(s));
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(flat(implement)).toContain("**Reached from step 3b, never before it.**");
  });

  it("requires and rechecks the RED test hash at the consumer gate", async () => {
    // The producer records it; without the consumer recomputing it, a test
    // edited after the handoff passes gate item 10 exactly as a fresh one does.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**required on a handed-over `E2E` / `API` row**, and checked");
    expect(implement).toContain("Recompute it over the **same inputs the producer hashed**");
    // Recomputing over `Test file` alone yields a different value for every row
    // that reads a fixture, so an unchanged row failed the gate every pass.
    expect(implement).toContain("the acceptance-test-owned artifacts it names");
  });

  it("identifies a pre-split row by a marker, not by its status", async () => {
    // `done` plus an old anchor also describes a new E2E/API row written to the
    // wrong file, which would then be accepted with no ATDD handoff at all.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**Identify it by a marker, not by its status**");
    expect(implement).toContain("`Pre-split-evidence: implement`");
    expect(implement).toContain("A row with no marker is judged by the current rule");
  });

  it("defines the rework path a review-fix row takes through this stage", async () => {
    // Step 3b sends the row back here when the REVISE touches the acceptance
    // test, and the three branches only cover a `todo` row's first handoff.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("## A `review-fix` row comes back here for a new RED");
    expect(provenance).toContain("A `### Round N` block in");
    expect(provenance).toContain("round-evidence.md");
    expect(provenance).toContain("this stage writes no ledger cell");
  });

  it("hashes a manifest of untracked files, not just their contents", async () => {
    // Contents alone collide on a rename or a swap, and with no order or
    // separator a second reviewer cannot recompute the same value.
    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("a **manifest** of every untracked file");
    expect(revision).toContain(
      "its path, a NUL byte, and the hash of its contents, sorted by path",
    );
  });

  it("covers the artifacts the acceptance test reads", async () => {
    // A snapshot or fixture edit reshapes the assertion after the handoff, and
    // the working-tree hash cannot be recomputed from the final tree.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain(
      "plus the acceptance-test-owned artifacts those files read — fixtures, snapshots",
    );
    expect(provenance).toContain("Not the production tree.");
  });
});

describe.each(TREES)("%s (a gate cannot fail on its own bookkeeping)", (tree) => {
  it("keeps the ledger and the evidence out of the revision hash", async () => {
    // Phase Green writes `green` and Refactor writes `refactor` between the
    // observations, and item 10 wants one revision across the three — so a hash
    // over all of `git diff HEAD` moved on its own bookkeeping and no
    // uncommitted item could reach `done`.
    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("**The ledger is excluded from it.**");
    expect(revision).toContain("minus `.qfai/specs/*/tdd/test-list.md` and `.qfai/evidence/**`");
  });

  it("names the migration that writes the pre-split marker", async () => {
    // Without one, no row ever carries the marker, so the compatibility clause
    // it gates is unreachable and every legacy row is rejected.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**Write it once, from the history**");
    expect(implement).toContain("`git log -S`");
    expect(implement).toContain("until it has run, those rows are judged by the current rule");
  });

  it("recomputes the test hash over what the producer hashed", async () => {
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("Recompute it over the **same inputs the producer hashed**");
  });

  it("carries the untracked manifest into the shared reviewer contract", async () => {
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain("a **manifest** of every untracked file");
    expect(baseline).toContain(
      "its path, a NUL byte, and the hash of its contents, sorted by path",
    );
  });

  it("lets a handed-over row's mutation touch the predicate it names", async () => {
    // The Oracle Strength Check rejects a mutation outside the code the item
    // owns, and an `E2E` / `API` row owns no production surface — so no
    // branch-2 row could produce falsifiability evidence that passes.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain("**And the mutation may touch it.**");
    expect(gatekeeper).toContain("the predicate `Satisfied-by` names is the owned code");
  });

  it("gives branch 3 a verdict the observation gate can return", async () => {
    // Judged by the two evidence forms a genuine branch-3 row can only be
    // REVISE, and skipping the gate leaves the stage's completion condition
    // unmet — the row could not close either way.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain("**Branch 3 gets its own verdict.**");
    expect(gatekeeper).toContain("this is a third form of evidence, not an exemption");
  });

  it("reclassifies a corrected test that passes on its first run", async () => {
    // A REVISE asking for no new behaviour — a selector split, a rename —
    // leaves the corrected test passing, so demanding a fresh RED stranded the
    // row at `review-fix`.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**run it and let the result choose the path**");
    expect(provenance).toContain("**It passes.**");
    expect(provenance).toContain("no-new-behaviour");
  });
});

describe.each(TREES)("%s (the two sides of each contract agree)", (tree) => {
  it("excludes the ledger from the reviewer's revision too", async () => {
    // `Revision` is phase-authored and `Reviewed revision` is not, and the
    // phases write `test-list.md` between them — so hashing all of
    // `git diff HEAD` here made the two permanently unequal while item 10
    // wants them equal.
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain("**The ledger and the evidence tree are excluded**");
  });

  it("records the manifest the test hash was taken over", async () => {
    // The consumer recomputes it; naming only the *kinds* of file leaves two
    // readers free to choose different sets from an unchanged tree.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Record the manifest, not only the hash.**");
    expect(provenance).toContain("`RED test manifest`");
    expect(provenance).toContain("`path + NUL + blob hash`");
  });

  it("finds the migration's commit from the patch, not from -S", async () => {
    // The id is on both sides of a status-only change, so `-S` walks back to
    // the commit that added the row and the marker lands on the wrong one.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("from the row's **patch history**, not with `git log -S`");
    expect(implement).toContain("`git log -p -- <test-list.md>`");
  });

  it("submits branch 2's mutation to the gate before the transition", async () => {
    // Steps 4 and 5 are skipped for this row and step 4 is the only place that
    // submits a RED, so the branch advanced the ledger with no verdict at all.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("**route `qa-gatekeeper` on that mutation run and wait for PASS**");
  });

  it("holds the revert until the gatekeeper has seen the mutated tree", async () => {
    // The step said "capture the failure, revert, re-run" and then "route the
    // gatekeeper before reverting" — both cannot hold. Reverting first left it
    // nothing but the restored tree, so it could not check that what broke is
    // the predicate `Satisfied-by` names.
    const implement = flat(await read(tree, IMPLEMENT));
    const order = implement.indexOf("route `qa-gatekeeper` on that mutation run");
    const revert = implement.indexOf("only then revert and re-run to confirm the tree is green");
    expect(order).toBeGreaterThan(0);
    expect(revert).toBeGreaterThan(order);
    expect(implement).not.toContain("capture the failure, revert, and re-run");
  });

  it("gives a branch-2 row the test manifest its completion gate recomputes", async () => {
    // The gate requires `RED test hash` for every handed-over E2E/API row, but
    // a falsifiability row has no RED pair, so nothing was hashed at handoff.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "Record the `RED test hash` and its manifest here too, over the same inputs a handed-over RED hashes",
    );
    expect(implement).toContain("**Phase Red step 3c records it against the mutation run**");
  });

  it("addresses the evidence the reviewers audit, which the revision excludes", async () => {
    // `.qfai/evidence/**` is out of the revision so it stays stable across the
    // phase's own writes — which also let a PASS survive an edit to the very
    // RED/GREEN output and coverage justification it ruled on.
    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("**`Audited evidence hash`**");
    expect(revision).toContain("with the reviewer-appended fields");
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("`Audited evidence hash` is **recomputed** here");
    expect(implement).toContain(
      "completion-reviewer result (PASS or REVISE) with its `Reviewed revision` and `Audited evidence hash`",
    );
  });

  it("makes Satisfied-by name a predicate a mutation can reach", async () => {
    // A commit that touches several routes and a helper names no single
    // predicate, so the gatekeeper's ownership boundary cannot be applied to
    // it: it either REVISEs a correct mutation or accepts an unrelated one.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("otherwise the production **path and symbol**");
    expect(provenance).toContain("**A commit id does not**, and is not an alternative form");
    expect(provenance).not.toContain("or the commit that added it");
  });

  it("lets a test-only replacement re-address the test it replaced", async () => {
    // The REVISE changed the test, so the handoff's `RED test hash` addresses
    // the manifest before the edit and the consumer sends the row back here
    // for a fresh RED — which is this same passing no-round path, for ever.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Re-address the test.**");
    expect(provenance).toContain("marked `test-only replacement` with the reviewer verdict");
  });

  it("covers the branch-2 handoff with the same item-cycle exemption", async () => {
    // P4b's nested run also sits before P5/P6, so naming only P1c left the
    // falsifiability rows stopped by completion inputs their own stage had not
    // produced yet.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**P4b hands a branch-2 row over on the same terms**");
    const atdd = flat(await read(tree, ATDD));
    expect(atdd).toContain("an item cycle like P1c's");
  });

  it("puts the audited-evidence hash in the template every reviewer answers with", async () => {
    // The field is required and recomputed at gate item 10, but the shared
    // template offered only `Reviewed revision` — so a reviewer answering it
    // faithfully omitted the hash, and the row could not reach `done` unless
    // somebody filled it in on the reviewer's behalf.
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain("Audited evidence hash: <content hash of the evidence read>");
    expect(baseline).toContain("`Audited evidence hash` is REQUIRED");
    expect(baseline).toContain("**The reviewer computes it**");
  });

  it("makes the gatekeeper reject a Satisfied-by that names only a commit", async () => {
    // The producer forbids the commit-only form; the gatekeeper still called it
    // equally valid, so the ownership check had no boundary to apply.
    const gatekeeper = flat(await read(tree, GATEKEEPER));
    expect(gatekeeper).toContain("**A commit id alone does not answer it — REVISE.**");
    expect(gatekeeper).not.toContain("or the commit that added it, is equally valid");
  });

  it("re-takes the mutation proof when the test itself was replaced", async () => {
    // A new hash over the old proof says somebody edited the test; it does not
    // say the edited test still fails when the predicate is broken. Clarifying
    // an expectation can weaken an assertion by accident.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Re-take the proof as well, on a row that has one.**");
    // Owed here, performed where the production owners are: this stage owns no
    // agent for a mutation, which the paragraph below it says of the same
    // operation. It marks the proof and hands it back.
    expect(provenance).toContain("Mark the proof `stale — test replaced`");
    expect(provenance).toContain(
      "happen in `/qfai-implement`'s rework, where the production owners are routed",
    );
    expect(provenance).not.toContain(
      "Re-run the same mutation under the corrected selector and replace the proof",
    );
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "**A returned proof marked `stale — test replaced` is re-taken here too**",
    );
  });

  it("does not accept a falsifiability trio that no gate has judged", async () => {
    // Step 3c writes the trio and only then routes the gatekeeper, so an
    // interrupted run leaves a trio with no verdict — and step 3b read the
    // trio alone as verified, advancing the row on evidence nothing judged.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "**complete means the trio _and_ the recorded `qa-gatekeeper` PASS on it**",
    );
    expect(implement).toContain("A trio with no PASS re-enters step 3c at the point the verdict");
  });

  it("defines one recomputable procedure for the audited evidence hash", async () => {
    // The subject is part of a file, so a file-level manifest alone left the
    // reviewer and item 10 free to hash different extents — a verdict that is
    // either always stale or never checked.
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain("**How to compute it, exactly.**");
    expect(baseline).toContain("the heading line through the line before the next");
    // The row's own `### Round N` blocks are inside the subject: a rework's
    // RED, GREEN and proof live there, so ending at any `###` let a PASS
    // survive every edit to the very evidence it was given for.
    expect(baseline).toContain("heading that **names a `TDD-` id**");
    expect(baseline).toContain("cut the row's own `### Round N` blocks out of the subject");
    expect(baseline).toContain("strip trailing whitespace from every line");
    expect(baseline).toContain("Gate item 10 runs the same four steps");
  });

  it("gives the mutation run a revision of its own", async () => {
    // The gate reads the mutated tree before the revert, so item 3 observes a
    // tree that is deliberately thrown away while the GREEN and both reviews
    // see the restored one. One revision across all four made every correct
    // branch-2 row permanently stale.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "`Falsifiability revision` — **required on a `falsifiability` row**",
    );
    expect(implement).toContain(
      "**except an observation that cannot be taken against the final tree**",
    );
    const revision = flat(
      await read(tree, "assistant/skills/qfai-implement/references/evidence-revision.md"),
    );
    expect(revision).toContain("## A transient observation names its own revision");
  });
  it("does not gate completion on rows no skill is allowed to write", async () => {
    // The condition read "every `US-*` has a `Layer = E2E` row". Phase 2b seeds
    // one row per coverage-target `TC-*` and `/qfai-atdd` may not write the
    // ledger, so a correct spec was uncompletable and the handoff for the
    // missing rows returned nothing, for ever. The gate names the rule that
    // has an owner instead.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain("`QFAI-ATDD-111` and `QFAI-ATDD-113` are clean for this spec");
    expect(implement).not.toContain("has a `Layer = E2E` row whose `US-Refs` names it");
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("**Do not raise it as a request for rows.**");
    expect(provenance).not.toContain("raise the missing rows as a request to `/qfai-sdd`");
  });

  it("points the phase-authored sequencing note at the file the Layer owns", async () => {
    // It named `implement-<spec-id>.md` unconditionally, so an E2E row's
    // phase evidence went there while item 10 looked for the anchor in the
    // ATDD file.
    const implement = flat(await read(tree, IMPLEMENT));
    expect(implement).toContain(
      "Sequencing note: the phase-authored part of the evidence file **item 10's `Layer` rule selects**",
    );
  });

  it("routes a passing review-fix row to the no-round path, not falsifiability", async () => {
    // That form needs a production mutation this stage owns no agent for and
    // cannot hand over: 3b excludes `review-fix` and 3c is reachable only from
    // a `todo` entry.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("take the **no-new-behaviour path**");
    expect(provenance).toContain("**Not falsifiability.**");
  });

  it("exempts every blocking reviewer of the nested run, not just the gatekeeper", async () => {
    // `completion-reviewer` is mandatory and blocking there too and requires
    // validate evidence, so exempting one left the row stopped at the same gate
    // for a different reason.
    const provenance = flat(await read(tree, PROVENANCE));
    expect(provenance).toContain("applies to every blocking reviewer of the nested run");
    const reviewer = flat(await read(tree, "assistant/agents/completion-reviewer.md"));
    expect(reviewer).toContain(
      "**Validate evidence is a completion-gate input, not an item-cycle one.**",
    );
  });
});

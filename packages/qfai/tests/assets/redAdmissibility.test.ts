/**
 * "Confirm the test actually fails for the expected reason" was the entire RED
 * admissibility standard qfai shipped.
 *
 * The phrase occurred three times in the assistant tree, always as an
 * obligation and never as a definition, and no validator adjudicated it. Under
 * the skill's own Red-then-Green ordering, the first failure for any row that
 * introduces a new module or symbol is a load error **by construction** — which
 * proves the seam was absent and says nothing about whether the assertions
 * discriminate. The evidence contract could not record the difference and
 * explicitly blessed truncated output, so the strongest RED and the emptiest
 * one were indistinguishable at every gate.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const ADMISSIBILITY = "assistant/skills/qfai-implement/references/red-admissibility.md";
const ROUND_EVIDENCE = "assistant/skills/qfai-implement/references/round-evidence.md";
const GATEKEEPER = "assistant/agents/qa-gatekeeper.md";
const PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const WORKFLOW = "assistant/constitution/workflow.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(TREES)("%s", (tree) => {
  it("defines admissibility positively and negatively", async () => {
    const doc = await read(tree, ADMISSIBILITY);
    // Positive: what a RED must be.
    expect(doc).toContain("The test module **imports and loads successfully**");
    expect(doc).toContain("executing inside the row's own `Selector`");
    expect(doc).toContain("names the predicate the row owns");
    // Negative: the forms that prove only that a seam was missing.
    for (const excluded of [
      "collection / import / module-resolution error",
      "syntax error",
      "missing symbol or missing export",
      "fixture, factory or test-harness setup error",
    ]) {
      expect(doc).toContain(excluded);
    }
  });

  it("states the vacuity test the whole gate exists for", async () => {
    // If the run would fail identically with every assertion deleted, the
    // observation carries no information about the assertions.
    expect(await read(tree, ADMISSIBILITY)).toContain(
      "Deleting every assertion in the test would make the run **pass**",
    );
  });

  it("gives criterion 4 an evidence field, so it is not a conjunct nothing can evaluate", async () => {
    // Criteria 1-3 are readable off the recorded RED pair. Criterion 4 is a
    // counterfactual: `RED failure mode: assertion` is written with the same
    // three characters whether the assertion-stripped run happened or not, so
    // with no field of its own no gate could ever fail a row on it.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("`RED assertion-stripped result` — criterion 4's evidence");
    expect(doc).toContain("Re-run the `RED command` unchanged");
    expect(doc).toContain("**Restore immediately.**");
    // A falsifiability row has no RED pair to strip; its mutation answers it.
    expect(doc).toContain("A `falsifiability` row has no RED pair to strip");
    // Criterion 4 itself must point at where the obligation is discharged.
    expect(doc).toContain(
      "discharged by a second run and recorded as `RED assertion-stripped result`",
    );
  });

  it("carries the field in the per-item contract and in Phase Red", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "`RED assertion-stripped result` — **required wherever a RED pair is present**",
    );
    // The obligation must also be reachable at the point of action, not only
    // in the field list the reviewers audit.
    expect(skill).toContain("record that run as `RED assertion-stripped result`");
  });

  it("makes the field per round, since each round strips its own RED", async () => {
    // round-evidence.md claims its list is the whole of the round block, so a
    // RED field missing from it is a field with two contradictory homes.
    const doc = await read(tree, ROUND_EVIDENCE);
    expect(doc).toContain("`Round N: RED assertion-stripped result`");
    expect(doc).toContain("the RED pair and its assertion-stripped run");
  });

  it("makes it adjudicable — the gatekeeper can fail a row on it", async () => {
    // Without a clause here the field would be recorded and never judged,
    // which is the same unenforceability in a new place.
    const doc = await read(tree, GATEKEEPER);
    expect(doc).toContain("`RED assertion-stripped result` records the `RED command` re-run");
    expect(doc).toContain("REVISE when it is absent, when the stripped run still fails");
  });

  it("keeps the producer and the audit subject in step with the new field", async () => {
    // A handed-over row's RED is taken by /qfai-atdd, so requiring the field
    // only on the consumer side would hand over an incomplete row; and a field
    // outside the audit subject can be back-filled after the PASS.
    expect(await read(tree, PROVENANCE)).toContain(
      "`RED failure mode`, `RED assertion-stripped result`",
    );
    expect(await read(tree, DELEGATION)).toContain(
      "RED pair with its `RED assertion-stripped result`",
    );
  });

  it("does not let the seam throw, which would be the same non-observation", async () => {
    // An unasserted exception fails the run before any assertion executes, so
    // it shows the seam is unfinished — not that the assertions discriminate.
    // The seam telling the author to throw would have contradicted the
    // criterion in the same file.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("Do **not** make the seam throw");
    expect(doc).toContain("a test whose oracle _is_ an expected-exception check");
  });

  it("makes the admissible form reachable under the skill's own ordering", async () => {
    // Without a seam step, a new-symbol row can only ever produce a load error
    // at Red time, so the gate is vacuous exactly where it matters most.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "3a. Create the **minimal seam** the test needs to reach its assertion",
    );
    expect(skill).toContain(
      "This is not Phase Green's production code: it implements no predicate",
    );
    // An HTTP row reaches its surface by route, not by import. Leaving the seam
    // defined as "module, export or signature" sent `/qfai-atdd` here for a
    // registration this step did not describe, so the test kept 404ing on the
    // resolution error `red-provenance.md` calls inadmissible.
    expect(skill).toContain("for an HTTP test a **registered route**");
    expect(skill).toContain("**Register it with a status the row does not contract for.**");
  });

  it("carries the criterion in Phase Red, not only in the reference", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("is a **missing seam**, not a RED");
    // An expected-exception check is admissible too; step 4 must not read as
    // assertion-only, or a correct exception test is judged a missing seam.
    expect(skill).toContain("an assertion — or an expected-exception check — inside this row");
    expect(skill).not.toContain(
      "Run the test and **watch it fail** — confirm the test actually fails for the expected reason",
    );
  });

  it("adds a failure-mode field so the distinction is recorded, not inferred", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "`RED failure mode` — `assertion` | `expected-error` | `falsifiability`",
    );
    expect(skill).toContain("There is no admissible value for a load error");
  });

  it("narrows the truncation allowance for the part that proves admissibility", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain(
      "result completeness is best-effort; truncated output is acceptable",
    );
    expect(skill).toContain(
      "never for the assertion message and its location: that is what demonstrates admissibility",
    );
  });

  it("mirrors the criterion into gate item 3", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`qa-gatekeeper` confirmed an **admissible** failure");
  });

  it("mirrors it into the constitution, which restated the obligation with no criterion", async () => {
    const workflow = await read(tree, WORKFLOW);
    expect(workflow).toContain("A RED is admissible only when an assertion — or an");
    expect(workflow).toContain("red-admissibility.md");
  });

  it("routes the genuinely-unobservable case to its own path, not to a load error", async () => {
    // The one legitimate case for no assertion-level RED already has evidence
    // rules of its own; admitting a load error instead would be a second,
    // unaudited escape.
    const doc = await read(tree, ADMISSIBILITY);
    expect(doc).toContain("`RED failure mode: falsifiability`");
    expect(doc).toContain("red-not-observable.md");
    expect(doc).toContain(
      "Never weaken a correct test until it fails in order to manufacture a RED.",
    );
  });
});

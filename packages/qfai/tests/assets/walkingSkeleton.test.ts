/**
 * `/qfai-implement` had no phase whose exit criterion is that the product runs.
 *
 * The supported path from a finished spec to running software was "open
 * `test-list.md`, take row 1, proceed one row at a time", and nothing ever
 * asked whether the assembled parts start. A ledger could then carry hundreds
 * of `done` rows and a fully green suite with no entrypoint at all, because
 * every one of those tests constructed its subject directly.
 *
 * `Layer = E2E` and `Layer = API` rows are where that bill arrives: a test
 * written against a system that cannot start produces a collection error, and
 * `red-admissibility.md` correctly rules a collection error a *missing seam*
 * rather than a RED. The seam those rows are missing is the program itself.
 *
 * `Phase: Skeleton` is the precondition that makes the unchanged admissibility
 * criterion satisfiable for those layers — not a relaxation of it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Shipped surface plus its generated root mirror. */
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const SKELETON = "assistant/skills/qfai-implement/references/walking-skeleton.md";
const ADMISSIBILITY = "assistant/skills/qfai-implement/references/red-admissibility.md";
const CHECKPOINT = "assistant/skills/qfai-implement/references/checkpoint-verification.md";
const ROUTING = "assistant/manifest/agent-routing.yml";
const RED_PROVENANCE = "assistant/skills/qfai-atdd/references/red-provenance.md";
const ATDD_SKILL = "assistant/skills/qfai-atdd/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

type Phase = {
  id?: string;
  iteration?: string;
  mandatory_agents?: string[];
  conditional_agents?: string[];
  blocking_agents?: string[];
};

async function implementPhases(tree: string): Promise<Phase[]> {
  const parsed = parseYaml(await read(tree, ROUTING)) as {
    routing?: Array<{ skill?: string; phases?: Phase[] }>;
  };
  const route = parsed.routing?.find((r) => r.skill === "qfai-implement");
  expect(route, `${tree} has no qfai-implement route`).toBeDefined();
  return route?.phases ?? [];
}

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement has a phase whose exit criterion is that the product runs", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the phase exists and is ordered ahead of the first Red`, async () => {
      const skill = await read(tree, SKILL);

      expect(skill).toContain("### Phase: Skeleton (Once Per Entrypoint, Before The First Red)");
      // Ordering is the whole point: a phase placed after Red would be
      // unreachable for the rows that need it.
      const skeletonAt = skill.indexOf("### Phase: Skeleton");
      const redAt = skill.indexOf("### Phase: Red");
      expect(skeletonAt).toBeGreaterThan(-1);
      expect(redAt).toBeGreaterThan(-1);
      expect(skeletonAt).toBeLessThan(redAt);
      expect(skill).toContain("references/walking-skeleton.md");
    });

    it(`${tree}: the exit criterion is executable, not prose`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      for (const content of [skill, doc]) {
        expect(content).toContain("starts from a declared entrypoint");
        // The transport is whatever the entrypoint declares. Pinning it to a
        // socket left a correct CLI or worker — both inside Applicability, and
        // both named by the smoke contract — unable to exit the phase at all.
        expect(content).toContain(
          "**reached** over the **real transport that entrypoint declares** — a socket for a service, stdio for a CLI, the queue for a worker",
        );
        expect(content).toContain("committed smoke script that exits non-zero otherwise");
      }
      // A prose verdict is exactly what the phase replaces.
      expect(doc).toContain('"The skeleton is in place" is not an exit criterion');
      expect(doc).toContain("An already-passing smoke script satisfies the phase");
      expect(doc).toContain(
        "a CLI that opens no socket satisfies the criterion over stdio, and a worker over its queue",
      );
    });

    it(`${tree}: the criterion is reachability, so Bound 1 stays satisfiable`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // "one declared `US-*` is answered" and "write no predicate" cannot both
      // hold on a project whose obligations are authorization, calculation or
      // persistence: a sentinel leaves the US unanswered and the smoke script
      // red, and a constant shaped like the expected result implements that
      // US ahead of its row — a blocking finding under Bound 1. The phase then
      // had no legal exit at all.
      expect(doc).toContain("**Reached, not satisfied — this is a boot obligation.**");
      expect(doc).toContain("Nothing here asserts the `US-*`'s outcome");
      expect(doc).toContain("would make this criterion and Bound 1 unsatisfiable together");
      expect(doc).toContain("The phase would have no legal exit");
      expect(skill).toContain("**Reached, not satisfied**");
      expect(skill).toContain("would contradict item 2");
      // And the smoke contract asserts the same thing the criterion does.
      expect(doc).toContain("asserts that reachability alone");
      expect(doc).toContain("asserting the outcome would need the predicate Bound 1 forbids");
    });

    it(`${tree}: a stale pass does not carry a broken entrypoint into Red`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // Re-running the recorded command and appending the result regardless of
      // its exit status walked a since-broken entrypoint straight into
      // `Phase: Red`, which is the collection error this phase removes.
      expect(doc).toContain("**the appended run's own exit status decides, not the recorded one**");
      expect(doc).toContain(
        "the entrypoint is **unproven again**, exactly as if it had no section",
      );
      expect(doc).toContain("re-enters this phase's 3-cycle budget");
      expect(doc).toContain("`Phase: Red` does not start for it");
      expect(doc).toContain(
        "A past pass says the entrypoint started once, not that it still starts",
      );
      expect(skill).toContain("continue only while **it** exits 0");
      expect(skill).toContain("puts it back through this phase's cycle budget");
    });

    it(`${tree}: the smoke run is judged, not self-attested`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));
      const skeleton = (await implementPhases(tree)).find((p) => p.id === "skeleton");

      // `blocking_agents` only stops the REVISE of an agent that was routed,
      // so a merely-conditional gatekeeper could go unselected and the phase
      // passed on its own author's account of the smoke run.
      expect(skeleton?.mandatory_agents ?? []).toContain("qa-gatekeeper");
      expect(doc).toContain("**`qa-gatekeeper` judges the exit, not the author.**");
      expect(doc).toContain("lists the gatekeeper **mandatory** and blocking");
      expect(doc).toContain("`Skeleton gatekeeper`");
      expect(skill).toContain("`qa-gatekeeper` is **mandatory and blocking** here");
      // `not applicable` is the one verdict with no run to judge.
      expect(doc).toContain("`not applicable` is the one verdict that routes nobody");
    });

    it(`${tree}: the skeleton record reaches a commit`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // `.qfai/evidence/*` is ignored by the managed block, so without an
      // explicit negation the pass and the `Skeleton debt` never left the
      // working directory that produced them — and Bound 2 requires them in
      // the skeleton's own commit.
      expect(doc).toContain("**This file is tracked, not ignored.**");
      expect(doc).toContain("!.qfai/evidence/skeleton.md");
      expect(skill).toContain("git-tracked through the managed `.gitignore` negation");
    });

    it(`${tree}: the unit of execution is one entrypoint, not one project`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // `catalog/structure.md` records several entrypoints, so "once per
      // project" verified the first one and let a second service reach Red
      // having never been started.
      expect(doc).toContain(
        "The phase runs once per **declared entrypoint that has no recorded pass**, not once per project",
      );
      expect(doc).toContain("catalog/structure.md#key-packages--entrypoints");
      expect(skill).toContain("The Skeleton phase runs once per **declared entrypoint**");
      expect(skill).toContain("a queued spec that reaches a new entrypoint runs it for that one");
    });

    it(`${tree}: the phase evidence has a named home and is re-read`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // The ledger's `Evidence` cell is a pointer from an existing row, and
      // this phase runs before any row is selected — so "record it in the
      // ledger evidence" named no writable location at all.
      for (const content of [skill, doc]) {
        expect(content).toContain(".qfai/evidence/skeleton.md");
      }
      expect(doc).toContain("One `## <entrypoint>` section per declared entrypoint");
      expect(doc).toContain("**On every later invocation, read this file first.**");
    });

    it(`${tree}: the smoke script stops what it started`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**Stops what it started, on every exit path**");
      expect(doc).toContain("success, failure and timeout alike");
      expect(doc).toContain("no child it launched is still running");
      // Both halves of the damage a leaked process does.
      expect(doc).toContain("EADDRINUSE");
      expect(doc).toContain("answers the next cycle's smoke request from the **stale** process");
    });

    it(`${tree}: the skeleton has a routed owner that is not the orchestrator`, async () => {
      const phases = await implementPhases(tree);
      const skeleton = phases.find((p) => p.id === "skeleton");

      // Without a phase of its own, the entrypoint and the smoke script had
      // nobody permitted to write them: every other phase is per-row and the
      // orchestrator may not write code.
      expect(skeleton, "qfai-implement has no `skeleton` routing phase").toBeDefined();
      expect(skeleton?.iteration).toBe("per-invocation");
      for (const agent of ["frontend-engineer", "backend-engineer", "devops-ci-engineer"]) {
        expect(skeleton?.conditional_agents ?? []).toContain(agent);
      }
      expect(skeleton?.mandatory_agents ?? []).toContain("qa-gatekeeper");
      // The exit criterion is an execution result, so it is judged, not
      // self-attested.
      expect(skeleton?.blocking_agents ?? []).toContain("qa-gatekeeper");

      // Ordered ahead of the first per-row phase, like the skill's own text.
      const ids = phases.map((p) => p.id);
      expect(ids.indexOf("skeleton")).toBeGreaterThan(-1);
      expect(ids.indexOf("skeleton")).toBeLessThan(ids.indexOf("red"));
    });

    it(`${tree}: ATDD can reach the phase before its own runtime gate`, async () => {
      const provenance = unwrap(await read(tree, RED_PROVENANCE));

      // Stage 5 runs before stage 6, so a fresh project's acceptance tests hit
      // P5-P7 against a program that does not exist yet.
      expect(provenance).toContain("## A project whose program does not start yet");
      expect(provenance).toContain(
        "invoke it for `Phase: Skeleton` **alone**, at stage gate **P1a**",
      );
      expect(provenance).toContain("walking-skeleton.md");
      expect(unwrap(await read(tree, SKELETON))).toContain("## Reached from `/qfai-atdd`");
    });

    it(`${tree}: the skeleton is a stage gate ahead of ATDD's first RED`, async () => {
      const atddSkill = await read(tree, ATDD_SKILL);
      const provenance = unwrap(await read(tree, RED_PROVENANCE));

      // "before P5" did not bind: P1c takes the first branch-1 RED before
      // P2-P4 build any surface, so a skeleton scheduled anywhere in P1b-P4
      // lands after the collection error it exists to prevent.
      expect(atddSkill).toContain(
        "- P1a: **`Phase: Skeleton` is discharged before any RED is taken.**",
      );
      expect(atddSkill.indexOf("- P1a:")).toBeLessThan(atddSkill.indexOf("- P1b:"));
      expect(atddSkill.indexOf("- P1a:")).toBeLessThan(atddSkill.indexOf("- P1c:"));
      expect(provenance).toContain("**Before P1b, not merely before P5.**");
      expect(unwrap(await read(tree, SKELETON))).toContain(
        "That invocation belongs to **stage gate P1a**, ahead of P1b, not merely somewhere before P5",
      );
    });

    it(`${tree}: both bounds that stop it becoming a TDD bypass are blocking`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      // Bound 1 — no predicates.
      expect(skill).toContain("**Write no predicate here.**");
      expect(skill).toContain(
        "No authorization decision, no business rule, no calculation, no persistence invariant",
      );
      expect(skill).toContain("routes return constants or pass-throughs");
      expect(skill).toContain("A predicate authored in this phase is a **blocking** finding");
      expect(doc).toContain("**A predicate authored in this phase is a blocking finding**");

      // Bound 2 — seam debt is visible to the ledger, but written back through
      // the ledger's owner: a `todo` **row** is upstream SSOT and this skill's
      // carve-out is the Status / DR-ID / Evidence cells of existing rows, so
      // adding one here would be the Drift Protocol violation the bound is
      // supposed to prevent.
      expect(skill).toContain("**Write the seam debt back in the same commit**");
      expect(skill).toContain("**through the ledger's owner**");
      expect(skill).toContain("raise a Change Request for `/qfai-sdd`");
      expect(skill).toContain("Adding a row here would be drift");
      expect(skill).toContain("The skeleton may be shallow; it may not be invisible to the ledger");
      expect(doc).toContain("**Written back through the ledger's owner, not into the ledger.**");
      expect(doc).toContain("constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist");
      expect(doc).toContain("**it may not be invisible to the ledger.**");
      // And the CR that carries them is the scoped halt, so it does not park
      // the whole run behind an approval.
      expect(doc).toContain("**The rest of `Phase: Red` continues**");
    });

    it(`${tree}: the budget halts, and classifies before it raises a Change Request`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(skill).toContain("**Budget 3 cycles, then halt and classify**");
      expect(skill).toContain("deliberately the opposite of the row-level policy");
      expect(doc).toContain("On the third failure, **halt**");
      expect(doc).toContain("**classify the failure before raising anything**");
      expect(doc).toContain("change-request-reset.md");
      expect(doc).toContain("Do not continue to `Phase: Red`");

      // A port conflict has no upstream artifact to change, so it cannot
      // produce an approvable CR — and an open CR blocks completion.
      expect(skill).toContain("the **Change Request is not**");
      for (const cls of ["**Environment**", "**Code**", "**Steering**", "**Upstream**"]) {
        expect(doc).toContain(cls);
      }
      expect(doc).toContain("Only the last row produces a Change Request");
      expect(doc).toContain("The halt itself is not conditional on the class");
    });

    it(`${tree}: applicability is recorded, never silently skipped`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(skill).toContain("`Skeleton: not applicable`");
      expect(skill).toContain("the phase is never skipped silently");
      expect(doc).toContain("**The verdict is written; the phase is never skipped silently.**");
      // The one mechanical applicability test, so the verdict is not a
      // judgement call about effort.
      expect(doc).toContain(
        "If any row in the ledger carries `Layer = E2E` or `Layer = API`, an entrypoint is declared by construction and the phase applies",
      );
    });

    it(`${tree}: the phase is a precondition of the RED rule, not a relaxation of it`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));
      const admissibility = unwrap(await read(tree, ADMISSIBILITY));

      expect(skill).toContain("This is a precondition of the RED rule, not a relaxation of it");
      expect(skill).toContain("references/red-admissibility.md");
      expect(doc).toContain(
        "**This phase is a precondition of the existing RED rule, not a relaxation of it.**",
      );
      expect(doc).toContain("Nothing in `red-admissibility.md` moves");

      // The missing-seam ruling now names the case it keeps producing.
      expect(admissibility).toContain("the absent seam is frequently the **program itself**");
      expect(admissibility).toContain("walking-skeleton.md");
    });

    it(`${tree}: the smoke script proves a start, not an in-process construction`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**Starts the system the way the entrypoint declares it**");
      expect(doc).toContain("not a test harness that constructs the application object in-process");
      expect(doc).toContain("**Exits non-zero on any failure**, including a start-up timeout");
      expect(doc).toContain("**Names the `US-*` whose surface it reaches**");
    });

    it(`${tree}: the phase leaves recordable evidence`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      for (const field of [
        "`Skeleton verdict`",
        "`Skeleton entrypoint`",
        "`Skeleton US`",
        "`Skeleton command`",
        "`Skeleton result`",
        "`Skeleton gatekeeper`",
        "`Skeleton debt`",
        "`Skeleton cycles`",
      ]) {
        expect(doc).toContain(field);
      }
      // Same rule as every other gate result in this skill.
      expect(doc).toContain("the command and its real output, never a prose verdict");
    });

    // Requiring the sentinel *response* made the phase unpassable for any
    // project whose entrypoint already answers the US — an existing app, or a
    // US an earlier spec finished. Passing would have meant regressing a
    // working handler to 501, while smoke contract 3 says the script does not
    // inspect the outcome at all.
    it(`${tree}: a surface that already answers exits the phase on its real response`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**with whatever that surface already returns**");
      expect(doc).toContain("nothing here prescribes one either");
      // The sentinel is what Bound 1 leaves a *new* seam, not a demand.
      expect(doc).toContain("**permitted answer of a seam this phase newly authors**");
      expect(doc).toContain("never a response the smoke script requires");
      expect(doc).toContain(
        "its real `200` / `201` and its real payload exit the phase as they stand",
      );
      expect(doc).toContain("**Any answer that process gives counts**");
      // And Bound 1 does not reach backwards into finished work.
      expect(doc).toContain("This bound governs what the phase **writes**, not what it finds");
      expect(skill).toContain("never regressed to a sentinel to look skeletal");
    });

    // The cross-invocation re-run left the whole of one invocation uncovered:
    // its own Red/Green/Refactor can break the composition root while a suite
    // that constructs its subject directly stays green, and the spec-level
    // command set never starts the product.
    it(`${tree}: spec completion re-runs the smoke command, not the opening record`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));
      const checkpoint = unwrap(await read(tree, CHECKPOINT));

      expect(doc).toContain("### The same re-run before spec completion");
      expect(doc).toContain(
        "**spec-level checkpoint re-runs the `Skeleton command` of every in-scope entrypoint**",
      );
      expect(doc).toContain("**fails that checkpoint, blocks spec completion**");
      expect(doc).toContain("returns the entrypoint to this phase's 3-cycle budget");

      // The command set itself has to carry it, or the rule has no runner.
      expect(checkpoint).toContain("the spec-level set is steps 2, 3 and 4, plus step 5");
      expect(checkpoint).toContain(
        "**The `Skeleton command` of every in-scope entrypoint whose `Skeleton verdict` is `applicable`**",
      );
      expect(checkpoint).toContain("no other step in this set runs the product");
      expect(skill).toContain("blocks completion on a non-zero exit");
    });

    // Making the evidence file git-tracked turned "verbatim" from a discarded
    // scrollback into repository history: a queue URL, connection string or
    // token echoed at start-up would be committed permanently.
    it(`${tree}: the tracked evidence redacts secrets without losing the exit status`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**Verbatim except for secrets.**");
      expect(doc).toContain("**known secret values replaced by a stable placeholder**");
      // Redaction may not cost the criterion or the halt taxonomy its inputs.
      expect(doc).toContain("the **exit status** is never redacted");
      expect(doc).toContain("redact the **value**, not the line");
      expect(doc).toContain("so the halt is still classifiable by the taxonomy above");
      // Nor may it become a licence to write prose where output belongs.
      expect(doc).toContain("Redaction is not licence to paraphrase");
      expect(skill).toContain("**with known secret values replaced by a named placeholder**");
    });

    // A contract-only target declares no user story: `catalog/test-layers.md`
    // gives the API layer its obligations as `CON-API-*`. Requiring a `US-*`
    // left such a project with no surface the smoke script could name.
    it(`${tree}: an API entrypoint may name a CON-API-* as its boot obligation`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain(
        "**The boot obligation is a `US-*`, or a `CON-API-*` on an API entrypoint.**",
      );
      expect(doc).toContain("a correct project whose in-scope rows are all `Layer = API`");
      // The exit criterion itself must not re-narrow it to `US-*`.
      expect(doc).toContain("the surface one declared **boot obligation** names is **reached**");
      expect(doc).toContain("a `US-*`, or a `CON-API-*` on an API entrypoint");
    });

    // `--force` regenerates skills and agents but deliberately never
    // `manifest/**`, so a project updating to this version gets the phase and
    // no route to dispatch it through.
    it(`${tree}: an installation that predates the phase is told to add the route`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**An installation that predates this phase adds the route itself.**");
      expect(doc).toContain("never `manifest/**`");
      expect(doc).toContain("through `qfai-configure`");
    });

    // A CR that asks for a duplicate row, or for a row `/qfai-sdd` does not
    // generate, is unapprovable — and an unresolved CR blocks completion.
    it(`${tree}: skeleton debt is attributed before anything is requested`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("Attribute first, request second.");
      expect(doc).toContain("**coverage-target `TC-*`** and nothing else");
      expect(doc).toContain(
        "a request to add a row for a `US-*` or a `CON-API-*` produces no row and returns",
      );
      expect(doc).toContain("only the shortcuts that step 1 could not attribute to anything");
    });

    // The 3-cycle table told the agent to fix a Code failure inside a phase
    // the same paragraph had just halted, and never said when the budget
    // resets.
    it(`${tree}: the halt names who repairs, when work resumes, and the new budget`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("### After the halt");
      expect(doc).toContain("The halt ends the **invocation**, not the work.");
      expect(doc).toContain("belongs to the **next** invocation of the phase");
      expect(doc).toContain("**The budget is per invocation**");
      expect(doc).toContain("A cause that survives two halts is reported to the operator");
    });

    // A library declares no entrypoint, so the verdict it still owes had no
    // section it could legally be written in.
    it(`${tree}: a target with no entrypoint has a section for its verdict`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("`## (no entrypoint)` section");
      expect(doc).toContain("carrying `Skeleton verdict: not applicable` and its reason");
      expect(doc).toContain("Later invocations read it exactly like the others");
    });

    // The stored command is re-run, so a redacted one is re-run against
    // nothing — and nothing seals the file it is stored in.
    it(`${tree}: the stored command stays runnable and defers to the committed script`, async () => {
      const doc = unwrap(await read(tree, SKELETON));

      expect(doc).toContain("**`Skeleton command` stays runnable after redaction.**");
      expect(doc).toContain("`Skeleton command` may not");
      expect(doc).toContain("resolves the secret at run time instead of quoting it");
      expect(doc).toContain(
        "**The command is a pointer to the committed script, not an independent copy.**",
      );
      expect(doc).toContain("the committed script wins and the entrypoint is **unproven**");
      expect(doc).toContain("with a fresh `qa-gatekeeper` judgement");
    });

    // A mandatory reviewer whose input contract names artifacts this phase
    // does not have would enter its Stop condition on every run.
    it(`${tree}: qa-gatekeeper has an input contract for the skeleton gate`, async () => {
      const card = unwrap(await read(tree, "assistant/agents/qa-gatekeeper.md"));

      expect(card).toContain("**The Skeleton observation gate reads a different set.**");
      expect(card).toContain("before the first ledger row is selected");
      expect(card).toContain("`.qfai/evidence/skeleton.md`, the section of the entrypoint");
      expect(card).toContain("the committed smoke script `catalog/tech.md` names");
      // It judges the exit criterion, and nothing the rows own.
      expect(card).toContain("Correctness of the boot obligation is **not** in scope");
      expect(card).toContain("**no ledger row or per-item evidence is required or expected**");
    });
  }
});

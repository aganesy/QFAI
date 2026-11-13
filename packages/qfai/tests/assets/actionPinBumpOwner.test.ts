/**
 * Rows whose satisfying artifact is a durable repository RECORD rather than code.
 *
 * `spec-0017`'s traceability ledger routes thirteen rows here, and they share a shape: the
 * business rule asks for a decision to have been taken and written down — an owner named, a
 * justification recorded, a rejected alternative kept with its reason — and the only thing a
 * test can check is that the record exists and says what the rule requires.
 *
 * That is worth doing rather than skipping. A rule satisfied by "somebody decided this"
 * degrades to nothing the moment the person who decided it stops reading pull requests. A
 * rule satisfied by a row in `.qfai/spec/decisions.md`, asserted here, fails when the
 * row is removed or stops citing what it decides.
 *
 * ## What this file must NOT do
 *
 * It must not assert a row's prose. A register row keeps its ID and is never removed, but its
 * wording may be restated while the decision stands, so a test that pins a word, a phrase or a
 * number of a live row makes every restatement a red build. Each row is therefore located by its
 * `DEC-NNNN` ID and asserted only through the identifiers it cites: the imported decision key and
 * the requirement, example and test IDs the decision answers. Whether the prose still carries the
 * reason the rule asks for is a review question, not a pattern this file can grade.
 *
 * What the rules ask of the TREE — the gate file, its wiring, the retired and surviving workflows,
 * the declared worker value — is still asserted against the tree.
 *
 * ## The first two rows
 *
 * `TC-0017-0074` and `TC-0017-0075` are about retiring the repository's own duplicate of the
 * validate workflow it ships. `BR-0016-0060` allows that deletion only with a structural
 * contract gate over the shipped set present at or before it, and requires the recorded cost
 * to be **the loss of the manual cross-check** — explicitly not the absence of a mirror,
 * because the two files had already diverged on the profile they ran, so no mirror existed to
 * lose. Recording the absent mirror would overstate what the deletion takes away.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readRepositoryDecisionRow } from "../helpers/decisionRegister.js";
import { declaredIncludeGlobs, testFileCount } from "../helpers/runnerProjects.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

/** The decision this pair of rows reads: its register row and the imported key it carries. */
const RETIREMENT: DecisionRef = { row: "DEC-0333", key: "DR-0017-0007" };

/**
 * The gate `BR-0016-0060` requires to exist at or before the deletion, as a repository path.
 *
 * A literal, and asserted to exist below. The rule is about a specific instrument being in
 * place; a path read out of the decision record would let the record name anything.
 */
const SHIPPED_SET_GATE = "packages/qfai/tests/integration/shippedWorkflowShapeGate.test.ts";

/** The workflow whose own-tree copy the decision retires. */
const RETIRED_WORKFLOW = ".github/workflows/qfai-validate.yml";

/** And the shipped copy, which must survive — adopters still receive it. */
const SHIPPED_WORKFLOW = "packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml";

/**
 * A capture group the pattern guarantees, narrowed.
 *
 * Under `noUncheckedIndexedAccess` every `match[1]` is `string | undefined`, and the
 * project rules forbid the assertion that would silence it. A pattern that matched but
 * produced no group means the pattern changed under the reader — a broken helper rather
 * than a failing claim — so it throws instead of handing back a value to compare.
 */
function group(match: RegExpMatchArray | RegExpExecArray, index: number): string {
  const value = match[index];
  if (value === undefined) {
    throw new Error(`the pattern matched without capture group ${index}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A decision as the register identifies it: its row ID and the imported decision key it cites. */
interface DecisionRef {
  readonly row: string;
  readonly key: string;
}

/**
 * One decision's row in the consolidated decision register, located by its row ID.
 *
 * Selected rather than read whole, so an ID cited somewhere else in the register cannot satisfy a
 * claim about this decision.
 */
function decisionSection(decision: DecisionRef): string {
  return readRepositoryDecisionRow(REPO_ROOT, decision.row);
}

/**
 * Asserts the row exists and cites `ids`, softly, one failure per missing ID.
 *
 * The first assertion is hard: a missing row would otherwise produce one confusing failure per ID
 * instead of one clear one.
 */
function expectRowCites(decision: DecisionRef, ids: readonly string[], subject: string): void {
  const section = decisionSection(decision);
  expect(section, `${decision.row} must record ${subject}`).not.toBe("");
  for (const id of [decision.key, ...ids]) {
    expect.soft(section, `${decision.row} must cite ${id}`).toContain(id);
  }
}

// QFAI:EX-0002-0014-09
// QFAI:EX-0002-0014-10
// QFAI:EX-0002-0018-09
// QFAI:EX-0002-0019-05
// QFAI:EX-0002-0020-04
describe("TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected", () => {
  it("records the retirement, citing its decision key and the gate's test cases", () => {
    // The row names the gate through the gate's own cases, so a restatement that drops the path
    // still answers which gate; that the gate exists and runs is TC-0017-0075's half, read from
    // the tree.
    expectRowCites(
      RETIREMENT,
      ["TC-0017-0074", "TC-0017-0075"],
      "the retirement of the repository's own validate workflow",
    );
  });
});

describe("TC-0017-0075 (TDD-0075): the gate is present at or before the deletion", () => {
  it("holds the gate in the tree, wired into a lane, at the revision the duplicate is gone", () => {
    // CLAIM 1 — the gate exists. "At or before the deletion" is satisfied structurally by
    // co-presence at this revision: the duplicate is absent here and the gate is present
    // here, so no revision of this branch has the deletion without the gate. That is
    // checkable without reading history, which matters — a history-dependent assertion
    // inside the main suite breaks under a shallow clone, and this repository already keeps
    // its one history-dependent check out of the aggregate gate for that reason.
    expect
      .soft(
        existsSync(path.join(REPO_ROOT, SHIPPED_SET_GATE)),
        `the shipped-set contract gate must exist: ${SHIPPED_SET_GATE}`,
      )
      .toBe(true);

    // CLAIM 2 — and it RUNS. A gate present but unwired is a file, not a gate, which is the
    // same decoration defect this spec has caught twice already.
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf-8"),
    );
    const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
    const bodies = isRecord(scripts)
      ? Object.values(scripts).filter((v): v is string => typeof v === "string")
      : [];
    const gateFile = path.basename(SHIPPED_SET_GATE);
    expect
      .soft(
        bodies.filter((body) => body.includes(gateFile)),
        `the gate must be invoked by a package script, not merely present: ${gateFile}`,
      )
      .not.toEqual([]);

    // CLAIM 3 — the deletion actually happened in the own tree, and did NOT happen in the
    // shipped tree. Both directions matter: the rule is about retiring a duplicate, and
    // deleting the copy adopters receive would be a different and much worse change.
    expect
      .soft(
        existsSync(path.join(REPO_ROOT, RETIRED_WORKFLOW)),
        `the repository's own duplicate must be gone: ${RETIRED_WORKFLOW}`,
      )
      .toBe(false);
    expect
      .soft(
        existsSync(path.join(REPO_ROOT, SHIPPED_WORKFLOW)),
        `the shipped copy must survive — adopters still receive it: ${SHIPPED_WORKFLOW}`,
      )
      .toBe(true);
  });
});

// ── the pin bump owner, the shipped ordering, and the parallelism episode ────
//
// Three subjects, one shape: each is an obligation whose satisfying artifact is a paragraph in
// the decision register, and each row reads the specific content its rule names rather than
// the paragraph as a whole.

/** The decision that names the pin bump owner. */
const PIN_OWNER: DecisionRef = { row: "DEC-0329", key: "DR-0017-0003" };

/** The decision recording that shipped coverage did not precede the shipped hardening. */
const SHIPPED_ORDER: DecisionRef = { row: "DEC-0334", key: "DR-0017-0008" };

/** The decision recording the parallelism episode. */
const PARALLELISM: DecisionRef = { row: "DEC-0335", key: "DR-0017-0009" };

/**
 * Files that would BE a bump configuration.
 *
 * `BR-0016-0023` forbids creating one without the user, so the row asserts their absence — and
 * the list is enumerated rather than pattern-matched, because "a bump configuration" is not a
 * shape a glob can recognise. These are the three a maintainer would reach for.
 */
const BUMP_CONFIGS = [
  path.join(".github", "dependabot.yml"),
  path.join(".github", "dependabot.yaml"),
  "renovate.json",
];

describe("TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner", () => {
  it("records the owner, citing the capability that owns the pins and the criteria it discharges", () => {
    // `BR-0016-0022` makes the pins unsatisfied until a durable artifact says who bumps them. The
    // row cites the capability whose maintainer role owns them and the two criteria it discharges.
    expectRowCites(PIN_OWNER, ["CAP-0017", "AC-0017-0010", "AC-0017-0011"], "the pin bump owner");
  });
});

describe("TC-0017-0026 (TDD-0026): no root bump configuration, and the owner is recorded anyway", () => {
  it("keeps the repository free of a bump configuration while the obligation stays discharged", () => {
    // CLAIM 1 — none of the three exists. `BR-0016-0023` forbids creating one without the
    // user, and `OC-3` is why: it is a root-level addition.
    const present = BUMP_CONFIGS.filter((rel) => existsSync(path.join(REPO_ROOT, rel)));
    expect.soft(present, "a bump configuration may not be created without the user").toEqual([]);

    // CLAIM 2 — and the obligation is discharged anyway. This is the half that makes the row
    // more than a prohibition: the absence of the configuration is only acceptable BECAUSE the
    // record exists, so both are asserted together.
    expect
      .soft(decisionSection(PIN_OWNER), "the owner must be recorded even with no configuration")
      .not.toBe("");
  });
});

describe("TC-0017-0052 (TDD-0052): shipped coverage never precedes the shipped hardening", () => {
  it("records the ordering check, citing the example it satisfies and this case", () => {
    // `EX-0017-0045` gives the rejected shape ("lands instantly red") and the accepting one, so the
    // row that records which happened cites it.
    expectRowCites(SHIPPED_ORDER, ["EX-0017-0045", "TC-0017-0052"], "the ordering check");
  });
});

describe("TC-0017-0066 (TDD-0066): a slower or flakier higher value keeps the lower one", () => {
  // QFAI:EX-0002-0019-04
  it("records the flakiness episode, citing the examples it answers and this case", () => {
    // `BR-0016-0049` says a flakier higher value means the lower one is kept; here the higher value
    // was kept and the cause removed instead, and the row recording that cites the examples and
    // cases of both rules it answers.
    expectRowCites(
      PARALLELISM,
      ["EX-0017-0050", "EX-0017-0051", "TC-0017-0066"],
      "the parallelism episode",
    );
  });
});

describe("TC-0017-0067 (TDD-0067): revising the declared starting value needs the sign-off", () => {
  it("records that a revision was proposed and refused, and that the value did not move", () => {
    // The rule's negative direction, and this repository has an actual instance of it: a
    // revision was proposed on the strength of a measurement and refused. `BR-0016-0050` says
    // "no agent may substitute a different starting value on the strength of its own
    // measurement", so the interesting artifact is the refusal, recorded in the row that cites
    // this case.
    expectRowCites(PARALLELISM, ["TC-0017-0067"], "the refused revision");

    // And the declared value is still what it was. Asserted against the runner configuration
    // rather than against the record, so the two cannot agree with each other while both being
    // wrong.
    const knobs = readFileSync(
      path.join(REPO_ROOT, "packages", "qfai", "vitest.knobs.ts"),
      "utf-8",
    );
    expect
      .soft(knobs, "the declared starting value must still be the user's ten")
      .toMatch(/DECLARED_START\s*=\s*10\b/);
  });
});

describe("TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement", () => {
  // QFAI:EX-0002-0019-03
  it("compares at least two settings on the largest project and places the adopted value", () => {
    // `EX-0017-0049` fixes both halves: a timing artifact comparing at least two worker
    // settings ON THE LARGEST PROJECT plus the value actually adopted, and the adopted setting
    // must be the fastest measured or within ten percent of it WITH A WRITTEN REASON. "A value
    // adopted against no comparison does not satisfy the rule."
    //
    // The artifact is read and its arithmetic RE-DONE here rather than its prose trusted. A
    // record that states a percentage is a record that can state the wrong percentage; the ten
    // percent test is computed from the artifact's own numbers, so a transcription error fails
    // this row instead of surviving it.
    //
    // The artifact is the doc comment on `DECLARED_START`, with its ` * ` margin removed, so it
    // sits beside the value it justifies and reaches every checkout.
    const knobsSource = readFileSync(
      path.join(REPO_ROOT, "packages", "qfai", "vitest.knobs.ts"),
      "utf-8",
    );
    const declaration = knobsSource.indexOf("export const DECLARED_START");
    expect(declaration, "vitest.knobs.ts must declare DECLARED_START").toBeGreaterThan(0);
    const artifact = knobsSource
      .slice(knobsSource.lastIndexOf("/**", declaration), declaration)
      .replace(/^[ \t]*\* ?/gm, "");

    // CLAIM 1 — the largest project is NAMED, and named as a measurement rather than an
    // assumption. "Largest" is a property of the tree that changes as tests are added, so the
    // artifact has to say how it was determined and the row checks the claim still holds.
    const largest = /largest project:\s*`([a-z0-9-]+)`\s*\((\d+)\s*tests\)/i.exec(artifact);
    expect(largest, "the artifact must name the largest project and its test count").not.toBeNull();
    if (largest === null) return;
    // Only the project name is bound. The count is still REQUIRED by the pattern above, so a
    // an artifact that omits it fails CLAIM 1 — but nothing below needs its value, because the
    // size check re-counts test FILES rather than cases.
    const project = group(largest, 1);

    // CLAIM 2 — at least two settings, each with a duration. Parsed as data, so a row of prose
    // claiming a comparison cannot stand in for one.
    const rows = [...artifact.matchAll(/^\|\s*(\d+)\s*\|\s*([0-9.]+)\s*s\s*\|/gm)].map((m) => ({
      workers: Number(m[1]),
      seconds: Number(m[2]),
    }));
    expect
      .soft(rows.length, "the artifact must compare at least two worker settings")
      .toBeGreaterThanOrEqual(2);
    if (rows.length < 2) return;

    // CLAIM 3 — the adopted value is stated, and it is the value the runner actually uses.
    // Asserted against `vitest.knobs.ts` and not only against the artifact, so the record and
    // the configuration cannot agree with each other while both being wrong.
    const adoptedMatch = /adopted:\s*(\d+)\b/i.exec(artifact);
    expect(adoptedMatch, "the artifact must state the adopted value").not.toBeNull();
    if (adoptedMatch === null) return;
    const adopted = Number(adoptedMatch[1]);

    const knobs = readFileSync(
      path.join(REPO_ROOT, "packages", "qfai", "vitest.knobs.ts"),
      "utf-8",
    );
    const cpuMatch = /available logical CPUs:\s*(\d+)\b/i.exec(artifact);
    expect(cpuMatch, "the artifact must state its measurement CPU count").not.toBeNull();
    if (cpuMatch === null) return;
    const measuredCpus = Number(cpuMatch[1]);
    expect.soft(measuredCpus, "the recorded CPU count must be positive").toBeGreaterThan(0);
    expect
      .soft(knobs, "the declared starting hypothesis remains ten")
      .toMatch(/DECLARED_START\s*=\s*10\b/);
    expect
      .soft(knobs, "the runner applies the approved CPU cap")
      .toMatch(/DECLARED_WORKERS\s*=\s*Math\.min\(DECLARED_START,\s*availableParallelism\(\)\)/);
    expect
      .soft(adopted, "the adopted value matches the recorded machine's applied cap")
      .toBe(Math.min(10, measuredCpus));

    // CLAIM 4 — the adopted value was actually measured. A comparison that omits the value it
    // adopts is the "adopted against no comparison" case the rule rejects outright.
    const adoptedRow = rows.find((r) => r.workers === adopted);
    expect(
      adoptedRow,
      `the comparison must include the adopted value ${adopted}`,
    ).not.toBeUndefined();
    if (adoptedRow === undefined) return;

    // CLAIM 5 — and it is the fastest, or within ten percent of the fastest with a reason.
    // Computed, not read.
    const fastest = rows.reduce((a, b) => (b.seconds < a.seconds ? b : a));
    const overhead = (adoptedRow.seconds - fastest.seconds) / fastest.seconds;
    if (adoptedRow.workers !== fastest.workers) {
      expect
        .soft(
          overhead,
          `the adopted value ${adopted} (${adoptedRow.seconds}s) must be within ten percent of the fastest ${fastest.workers} (${fastest.seconds}s)`,
        )
        .toBeLessThanOrEqual(0.1);
      // The written reason is required only on this branch, which is why it is asserted here
      // and not unconditionally: a record that adopts the fastest value owes no explanation.
      expect
        .soft(artifact, "a value that is not the fastest must carry a written reason")
        .toMatch(/reason for not adopting the fastest/i);
    }

    // CLAIM 6 — the artifact still describes this project. A comparison is only meaningful for
    // the tree it was run on, so the artifact records the project's test-FILE count and this
    // claim re-counts it by walking every directory the project collects from.
    //
    // Files and not test cases, deliberately: counting cases needs the runner, and spawning
    // vitest from a test is the cost that put this spec's own integration slice past its
    // timeout. A directory walk is a few milliseconds.
    //
    // Tolerance rather than equality, because files are added constantly and a red build on
    // every new test file would make this row an obstacle instead of a check.
    const filesMatch = /test files:\s*(\d+)\b/i.exec(artifact);
    expect(filesMatch, "the artifact must record the project's test-file count").not.toBeNull();
    if (filesMatch === null) return;

    // Every root the project collects from. A project's `include` is not always
    // its own directory — `e2e` also collects `tests/assets/**`, and
    // `integration` three trees beside its own — so the count is the sum over
    // the globs it declares. Read through the same helper the slice-surface row
    // reads them with, so one file cannot be counted two ways.
    const globs = declaredIncludeGlobs().filter((entry) => entry.project === project);
    expect(
      globs.length,
      `the workspace must declare the ${project} project's include globs`,
    ).toBeGreaterThan(0);
    const actual = globs.reduce((total, entry) => total + testFileCount(entry.glob), 0);
    expect
      .soft(
        Math.abs(actual - Number(group(filesMatch, 1))) / Number(group(filesMatch, 1)),
        `the artifact says ${project} held ${group(filesMatch, 1)} test files; it now holds ${actual}, and beyond twenty percent the comparison describes a different project`,
      )
      .toBeLessThanOrEqual(0.2);
  });
});

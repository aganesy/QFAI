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
 * rule satisfied by a paragraph in `07_Decisions.md`, asserted here, fails when the
 * paragraph is deleted or reworded past the point where it still carries the reason.
 *
 * ## What this file must NOT do
 *
 * It must not assert prose verbatim. A test that pins whole sentences makes every editorial
 * pass a red build, and the rules do not ask for wording — they ask for content. So each
 * claim below names the specific thing its rule names: a path that must be cited, a reason
 * that must be present, a rejected reason that must be marked rejected.
 *
 * ## The exception, and why it is not a loophole
 *
 * Three claims pin a PHRASE rather than a word, and each says why at its own site. The reason
 * is always the same and it is not editorial taste: these records QUOTE the business rule they
 * satisfy, so the obvious word-level pattern matched the quotation instead of the record's own
 * statement. `/\bkept\b/` passed over a record saying the opposite of what it needed to say,
 * because `BR-0017-0050`'s quoted text contains "the lower setting MUST be kept". `before` and
 * `first` appear in the surrounding prose; `sign-off` appears in the next sentence.
 *
 * Each of those was found by an oracle round that reddened NOTHING, which is the only way this
 * class of vacuity shows up. So the rule stands as "content, not wording", with the
 * clarification that a phrase is the smallest unit of content when a shorter one is satisfied
 * by the rule's own text quoted nearby. Implementation-review finding L12 pointed out that the
 * paragraph above said otherwise while the pins existed; this is the honest version.
 *
 * Markdown FORMATTING is never part of a pin, and one had crept in — corrected below.
 *
 * ## The first two rows
 *
 * `TC-0017-0074` and `TC-0017-0075` are about retiring the repository's own duplicate of the
 * validate workflow it ships. `BR-0017-0061` allows that deletion only with a structural
 * contract gate over the shipped set present at or before it, and requires the recorded cost
 * to be **the loss of the manual cross-check** — explicitly not the absence of a mirror,
 * because the two files had already diverged on the profile they ran, so no mirror existed to
 * lose. Recording the absent mirror would overstate what the deletion takes away.
 */
// QFAI:SPEC-0017:TC-0017-0074
// QFAI:SPEC-0017:TC-0017-0075
// QFAI:SPEC-0017:TC-0017-0025
// QFAI:SPEC-0017:TC-0017-0026
// QFAI:SPEC-0017:TC-0017-0052
// QFAI:SPEC-0017:TC-0017-0066
// QFAI:SPEC-0017:TC-0017-0067

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const DECISIONS = path.join(REPO_ROOT, ".qfai", "specs", "spec-0017", "07_Decisions.md");

/** The decision this pair of rows reads. */
const RETIREMENT_DR = "DR-0017-0007";

/**
 * The gate `BR-0017-0061` requires to exist at or before the deletion, as a repository path.
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

/**
 * One decision's section, from its heading to the next one.
 *
 * Sliced rather than read whole, so a phrase present somewhere else in the register cannot
 * satisfy a claim about this decision.
 */
function decisionSection(id: string): string {
  const source = readFileSync(DECISIONS, "utf-8");
  const start = source.indexOf(`### ${id}`);
  if (start < 0) {
    return "";
  }
  const next = source.indexOf("\n### ", start + 1);
  return next < 0 ? source.slice(start) : source.slice(start, next);
}

describe("TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected", () => {
  it("records the retirement with the gate named and the cost stated as the lost cross-check", () => {
    const section = decisionSection(RETIREMENT_DR);

    // CLAIM 1 — the decision exists. Everything below reads it, so this is asserted first
    // and hard: a missing record would otherwise produce four confusing empty-string
    // failures instead of one clear one.
    expect(
      section,
      `${RETIREMENT_DR} must record the retirement of the repository's own validate workflow`,
    ).not.toBe("");

    // CLAIM 2 — it names the gate. `BR-0017-0061`'s accepting shape is "the gate present in
    // the same change or an earlier one", so a record that omits which gate cannot be
    // checked against anything.
    expect
      .soft(section, `${RETIREMENT_DR} must name the structural contract gate it relies on`)
      .toContain(SHIPPED_SET_GATE);

    // CLAIM 3 — the recorded cost is the manual cross-check.
    expect
      .soft(section, "the recorded justification must be the loss of the manual cross-check")
      .toMatch(/manual cross-check/i);

    // CLAIM 4 — and the absent mirror is recorded as NOT the reason. This is the half the
    // rule is specific about: the two files had already diverged, so "we lost the mirror"
    // would be a reason that was never true. A record naming the cross-check while leaving
    // the mirror unaddressed passes CLAIM 3 and still misstates the trade.
    expect
      .soft(section, "the record must state that the absence of a mirror is NOT the justification")
      .toMatch(/\bnot\b[^.]{0,120}\bmirror\b/i);

    // CLAIM 5 — and the rejected alternative is kept with its reason. `BR-0017-0059` rejects
    // repointing at the shipped file because it resolves to the published package; a
    // register that drops rejected options invites the next reader to re-propose them.
    expect
      .soft(section, "the record must keep the rejected repoint alternative and why")
      .toMatch(/published/i);
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
const PIN_OWNER_DR = "DR-0017-0003";

/** The decision recording that shipped coverage did not precede the shipped hardening. */
const SHIPPED_ORDER_DR = "DR-0017-0008";

/** The decision recording the parallelism episode. */
const PARALLELISM_DR = "DR-0017-0009";

/**
 * Files that would BE a bump configuration.
 *
 * `BR-0017-0023` forbids creating one without the user, so the row asserts their absence — and
 * the list is enumerated rather than pattern-matched, because "a bump configuration" is not a
 * shape a glob can recognise. These are the three a maintainer would reach for.
 */
const BUMP_CONFIGS = [
  path.join(".github", "dependabot.yml"),
  path.join(".github", "dependabot.yaml"),
  "renovate.json",
];

describe("TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner", () => {
  it("records an owner and binds the obligation to a moment something can detect", () => {
    const section = decisionSection(PIN_OWNER_DR);
    expect(section, `${PIN_OWNER_DR} must record the pin bump owner`).not.toBe("");

    // CLAIM 1 — an owner is named. `BR-0017-0022` makes the pins unsatisfied until a durable
    // artifact says who bumps them, so the absence of a name is the failure.
    expect.soft(section, "the record must name who bumps the pins").toMatch(/owner/i);

    // CLAIM 2 — and the obligation is attached to a recurring moment. An owner with no cadence
    // discharges "whenever someone remembers", which is the state `BR-0017-0022` describes as
    // unsatisfied rather than as informal.
    expect
      .soft(section, "the record must bind the obligation to a recurring, detectable moment")
      .toMatch(/release preparation/i);

    // CLAIM 3 — and it is a ROLE. A named individual would go stale with no gate able to
    // notice, which is the same failure class the version-marker rules exist to prevent. The
    // record says so; this asserts it still does.
    expect
      .soft(section, "the record must name a role rather than an individual, and say why")
      .toMatch(/role/i);
  });
});

describe("TC-0017-0026 (TDD-0026): no root bump configuration, and the owner is recorded anyway", () => {
  it("keeps the repository free of a bump configuration while the obligation stays discharged", () => {
    // CLAIM 1 — none of the three exists. `BR-0017-0023` forbids creating one without the
    // user, and `OC-3` is why: it is a root-level addition.
    const present = BUMP_CONFIGS.filter((rel) => existsSync(path.join(REPO_ROOT, rel)));
    expect.soft(present, "a bump configuration may not be created without the user").toEqual([]);

    // CLAIM 2 — and the obligation is discharged anyway. This is the half that makes the row
    // more than a prohibition: the absence of the configuration is only acceptable BECAUSE the
    // record exists, so both are asserted together.
    expect
      .soft(decisionSection(PIN_OWNER_DR), "the owner must be recorded even with no configuration")
      .not.toBe("");
  });
});

describe("TC-0017-0052 (TDD-0052): shipped coverage never precedes the shipped hardening", () => {
  it("records that the hardening was in place before the scan was enabled, with what was checked", () => {
    const section = decisionSection(SHIPPED_ORDER_DR);
    expect(section, `${SHIPPED_ORDER_DR} must record the ordering check`).not.toBe("");

    // CLAIM 1 — the ordering is stated in the accepting direction. `EX-0017-0045` gives the
    // rejected shape ("lands instantly red") and the accepting one ("in the same change as the
    // shipped hardening or later, never before it"), so the record has to say which happened.
    expect
      .soft(section, "the record must state that the hardening preceded the coverage")
      // The SENTENCE, not a word. `before` and `first` both appear elsewhere in this
      // section, so the alternation this replaced survived its own oracle round.
      .toMatch(/enabled only after/i);

    // CLAIM 2 — and it says what was checked, not merely that a check happened. A record that
    // asserts "the tree was hardened" without naming the properties is a claim nobody can
    // re-derive, which is the same defect as a cost claim with no numbers.
    for (const property of [/permission/i, /timeout/i, /pin/i]) {
      expect
        .soft(section, `the record must name what was verified (${String(property)})`)
        .toMatch(property);
    }
  });
});

describe("TC-0017-0066 (TDD-0066): a slower or flakier higher value keeps the lower one", () => {
  it("records the flakiness measurement, and what happened instead of lowering the value", () => {
    const section = decisionSection(PARALLELISM_DR);
    expect(section, `${PARALLELISM_DR} must record the parallelism episode`).not.toBe("");

    // CLAIM 1 — the measurement is recorded, with numbers. `BR-0017-0030` is explicit that no
    // parallelism claim lands on argument, and this record exists because a claim WAS made and
    // then measured.
    expect
      .soft(section, "the record must carry the measurement rather than describing it")
      .toMatch(/\b862\b/);

    // CLAIM 2 — and the outcome is stated as a THIRD outcome, not as the rule's. `BR-0017-0050`
    // says a flakier higher value means the lower one is kept; here the higher value was kept
    // and the cause removed instead. A record that let that read as compliance would be worse
    // than one that omitted it.
    expect
      .soft(section, "the record must say the declared value was KEPT, not lowered")
      // `kept` alone is not enough: this record QUOTES BR-0017-0050, whose own text says
      // the lower setting must be kept. Matching that word let the claim pass over a
      // record saying the opposite of what it needs to say.
      //
      // The subject plus the verb, and NOT the Markdown emphasis around it. The pattern was
      // `/higher setting was \*\*kept\*\*/i`, which made bolding load-bearing — an
      // editorial change this file's own docblock says must not break a build.
      .toMatch(/higher setting[^.]{0,40}\bkept\b/i);

    // CLAIM 3 — and it names the retry loop the rule forbids, as something that did not happen.
    // "Re-running the comparison until it agrees is forbidden" is the failure mode this episode
    // was closest to, so the record has to distinguish diagnosis from repetition.
    expect
      .soft(section, "the record must distinguish diagnosis from re-running until it agrees")
      .toMatch(/re-?run/i);
  });
});

describe("TC-0017-0067 (TDD-0067): revising the declared starting value needs the sign-off", () => {
  it("records that a revision was proposed and refused, and that the value did not move", () => {
    const section = decisionSection(PARALLELISM_DR);

    // The rule's negative direction, and this repository has an actual instance of it: a
    // revision was proposed on the strength of a measurement and refused. `BR-0017-0051` says
    // "no agent may substitute a different starting value on the strength of its own
    // measurement", so the interesting artifact is the refusal, not a value.
    expect
      .soft(section, "the record must show a revision was proposed and not taken")
      // `sign-off` appears in the very next sentence, so matching it let this pass over a
      // record that never mentioned a proposal at all.
      .toMatch(/proposed lowering/i);

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
    const artifact = readFileSync(
      path.join(REPO_ROOT, ".qfai", "evidence", "timing-workers-spec-0017.md"),
      "utf-8",
    );

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
    expect
      .soft(knobs, "the adopted value must be the one the runner declares")
      .toMatch(new RegExp(`DECLARED_START\\s*=\\s*${adopted}\\b`));

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
    // claim re-counts it by walking the directory.
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

    const countTestFiles = (dir: string): number => {
      let n = 0;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) n += countTestFiles(p);
        else if (/\.test\.ts$/.test(entry.name)) n += 1;
      }
      return n;
    };
    const actual = countTestFiles(path.join(PACKAGE_ROOT, "tests", project));
    expect
      .soft(
        Math.abs(actual - Number(group(filesMatch, 1))) / Number(group(filesMatch, 1)),
        `the artifact says ${project} held ${group(filesMatch, 1)} test files; it now holds ${actual}, and beyond twenty percent the comparison describes a different project`,
      )
      .toBeLessThanOrEqual(0.2);
  });
});

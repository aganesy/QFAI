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

import { existsSync, readFileSync } from "node:fs";
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

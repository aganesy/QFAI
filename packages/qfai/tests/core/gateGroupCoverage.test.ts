/**
 * `QFAI-PROFILE-001` names what a partial run did not evaluate, from
 * `GATE_GROUP_FAMILIES` — and that table was hand-maintained with nothing
 * checking it against the emitters.
 *
 * The message asserts completeness ("Hard gates NOT evaluated in this run: …"),
 * so a family missing from the table reads as a family that WAS evaluated. When
 * #572 was filed the table named 25 families of at least 37, and the twelve it
 * omitted included the spec-pack structural gates — triage approval, status
 * enums, acceptance-criteria verification, the Traceability Ledger. An
 * implementer running `--profile tdd` per item was told accurately that
 * repository hygiene and the prototyping gates were skipped, and told nothing
 * about six spec-pack families that were also skipped. The list's specificity
 * is what makes the omission misleading.
 *
 * `EMITTED_RULE_CODES` is the derivation the issue asked for, and it already
 * ships: `scripts/generate-emitted-rule-codes.mjs` scans the package source for
 * every code a validate `Issue` can carry, and the scripts slice fails on
 * drift. So the guard is a comparison between two things that are already
 * maintained, rather than a third list of families.
 *
 * A code outside every group is not automatically a defect — the notice derives
 * `full groups - profile groups`, and a code that runs in EVERY profile is
 * never unevaluated, so it has nothing to be reported under. Those are
 * enumerated below with the layer that emits them, because "outside on purpose"
 * and "forgotten" are the two readings this test exists to separate.
 */
import { describe, expect, it } from "vitest";

import { GATE_GROUP_FAMILIES } from "../../src/cli/commands/validate.js";
import { EMITTED_RULE_CODES } from "../../src/core/emittedRuleCodes.js";
import { familyMatches } from "../helpers/gateFamilies.js";

/**
 * Codes that belong to no gate group because they are not gated by profile.
 *
 * Each one is emitted by a layer that runs whatever profile was asked for: the
 * `validate` command itself, config loading, the waiver engine, the run log, or
 * the separate `saas-package` runner. `full groups - profile groups` can never
 * include them, so a group entry would make `QFAI-PROFILE-001` report as
 * unevaluated something that ran.
 *
 * The reason is the point of the entry. "This code is not in the table" is not
 * a claim anyone can check; naming the emitting module is, and the second test
 * below refuses an entry whose code a family has since started covering.
 */
const PROFILE_INDEPENDENT_CODES: ReadonlyMap<string, string> = new Map([
  // `src/cli/commands/validate.ts` — the command's own findings, raised around
  // the validator run rather than by it.
  ["QFAI-LINK-001", "the command's own skill-link check, run before any profile is selected"],
  ["QFAI-LINK-002", "as QFAI-LINK-001"],
  ["QFAI-SCOPE-001", "the command's `--spec` scope resolution, which precedes the group dispatch"],
  ["QFAI-SCOPE-002", "as QFAI-SCOPE-001"],
  ["QFAI-TOOL-001", "which copy of qfai is running — a property of the invocation, not of a gate"],
  ["QFAI-TOOL-002", "as QFAI-TOOL-001"],
  ["D-DEPRECATED-PATH", "a deprecated input path, reported wherever the run reads one"],
  ["QFAI-CFG-001", "the command's `qfai.config.yaml` read, which every profile needs first"],
  ["QFAI-CTYPE-004", "the change-type lane, dispatched by the command for every profile"],
  // `src/core/config.ts` — the config load itself.
  ["QFAI_CONFIG_INVALID", "config parse failure: nothing downstream runs, so no group owns it"],
  // `src/core/waivers.ts` and the report writer that consumes it.
  ["QFAI-WAIVER-001", "the waiver engine, applied to the findings of whatever profile ran"],
  ["QFAI-WAIVER-002", "as QFAI-WAIVER-001"],
  ["QFAI-WAIVER-003", "as QFAI-WAIVER-001, raised by the report writer"],
  ["QFAI-WAIVER-004", "as QFAI-WAIVER-001"],
  ["QFAI-WAIVER-005", "as QFAI-WAIVER-001"],
  // `src/core/runLog.ts` — the run log's own consistency.
  ["TRACE_DOWNSTREAM_REF", "run-log bookkeeping, written by every profile"],
  ["TRACE_SHARED_SCOPE_VIOLATION", "as TRACE_DOWNSTREAM_REF"],
  // `src/core/phasePolicy.ts`, via `buildCiProfileIssue`.
  ["QFAI-VALIDATE-017", "the CI-profile advisory, decided from the environment rather than a gate"],
  // `src/core/saasPackage/profile.ts` — a separate profile with its own table.
  [
    "D-SAAS-PACKAGE-VERIFY-SKIPPED",
    "the `saas-package` runner's own skip notice; its skip-set is SAAS_PACKAGE_SKIPPED_GATE_FAMILIES",
  ],
]);

const ALL_FAMILIES: readonly string[] = Object.values(GATE_GROUP_FAMILIES).flat();

function coveringFamilies(code: string): string[] {
  return ALL_FAMILIES.filter((family) => familyMatches(family, code));
}

describe("QFAI-PROFILE-001's skip-set accounts for every code that can be emitted", () => {
  it("names a gate group for every emitted code, or exempts it with a reason", () => {
    const unaccounted = EMITTED_RULE_CODES.filter(
      (code) => coveringFamilies(code).length === 0 && !PROFILE_INDEPENDENT_CODES.has(code),
    ).sort();

    expect(
      unaccounted,
      `emitted but named by no GATE_GROUP_FAMILIES entry and not exempt: ${unaccounted.join(", ")} — ` +
        "`QFAI-PROFILE-001` derives what a partial run skipped as `full groups - profile groups`, " +
        "so a code outside every group is reported as skipped by NO profile. Add its family to the " +
        "group whose `run*Validators` dispatches it, or, if it is raised outside the validator " +
        "groups entirely, add it to PROFILE_INDEPENDENT_CODES with the layer that emits it",
    ).toEqual([]);
  });

  it("drops an exemption once a group starts covering its code", () => {
    // The other direction, and the one an exemption list rots in. A code that
    // gained a family is now reported by the notice, and the entry claiming it
    // is profile-independent contradicts the table it sits beside.
    const covered = [...PROFILE_INDEPENDENT_CODES.keys()]
      .filter((code) => coveringFamilies(code).length > 0)
      .sort();

    expect(
      covered,
      `exempt from the skip-set but now covered by a gate family: ${covered.join(", ")} — ` +
        "remove the PROFILE_INDEPENDENT_CODES entry; the table already accounts for it",
    ).toEqual([]);
  });

  it("drops an exemption whose code nothing emits any more", () => {
    const emitted = new Set(EMITTED_RULE_CODES);
    const gone = [...PROFILE_INDEPENDENT_CODES.keys()].filter((code) => !emitted.has(code)).sort();

    expect(
      gone,
      `exempt from the skip-set but emitted by nothing: ${gone.join(", ")} — ` +
        "an exemption for a code that no longer exists is a claim about a rule that is not there",
    ).toEqual([]);
  });

  it("requires a reason on every exemption, because that is what a reviewer reads", () => {
    const unreasoned = [...PROFILE_INDEPENDENT_CODES.entries()]
      .filter(([, reason]) => reason.trim().length === 0)
      .map(([code]) => code)
      .sort();

    expect(unreasoned, `exempt with no reason given: ${unreasoned.join(", ")}`).toEqual([]);
  });
});

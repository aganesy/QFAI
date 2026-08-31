/**
 * `BR-0017-0030` and `BR-0017-0031`: a cost, wall-clock or parallelism claim is backed by captured
 * before-and-after numbers, or it does not land — and a measured regression is an accepting outcome
 * rather than a failed attempt.
 *
 * These three cases were blocked for eleven review rounds behind `CR-20260820-0007` (approved
 * 2026-08-23, option 1). The block was real: their sibling `TC-0017-0032` asserts over a measurement
 * that requires landing artifact reuse, and the four rows together were routed to a skill forbidden to
 * write the decision record they read. Ratifying the records released these three. `TC-0017-0032` is
 * still open, and for a reason no ratification touches — it needs a new CI job, which adds a check
 * name to a branch-protection set no agent can reconfigure.
 *
 * The fixtures below are fixtures, so the last block anchors the extractor against real prose in this
 * repository's own decision record. Without it every assertion here would be testing whether the
 * fixture matches the regex that was written while looking at it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  capturedPairs,
  evaluateMeasurementClaim,
  resolveArtifactReuse,
} from "../helpers/measurementClaim.js";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DECISIONS = path.join(REPO_ROOT, ".qfai", "specs", "spec-0017", "07_Decisions.md");

/** A record in the shape these rules police, with the numbers left out. */
const WITHOUT_NUMBERS = [
  "- Status: accepted",
  "- Decision: build-artifact reuse is adopted. Producing the bundle once and downloading it in the",
  "  legs that rebuild today is plainly cheaper than rebuilding it four times, and the saving grows",
  "  with every lane added.",
  "- Consequences: the rebuild legs become downloads.",
].join("\n");

const WITH_NUMBERS = [
  "- Status: accepted",
  "- Decision: build-artifact reuse is adopted. The bundler ran four times per pull request and now",
  "  runs once; wall-clock across the affected legs went from 4.20min to 2.05min, captured over three",
  "  consecutive runs.",
  "- Consequences: the rebuild legs become downloads.",
].join("\n");

const REGRESSION_WITH_NUMBERS = [
  "- Status: accepted",
  "- Decision, the measurement: the producer job serialises what four legs did concurrently. Wall-clock",
  "  went from 4.20min to 5.60min across three consecutive runs, so reuse is slower here, not cheaper.",
  "- Decision: the rebuilds are kept and this measurement is the reason. No second comparison was run.",
].join("\n");

const REGRESSION_WITHOUT_NUMBERS = [
  "- Status: accepted",
  "- Decision: reuse measured slower than rebuilding, so the rebuilds are kept.",
  "- Consequences: none; the legs are unchanged.",
].join("\n");

// QFAI:SPEC-0017:TC-0017-0033
describe("a cost claim with no captured numbers does not satisfy the rule", () => {
  it("rejects a saving asserted on argument, and accepts the same claim once the numbers are quoted", () => {
    const bare = evaluateMeasurementClaim({ claim: "saving", record: WITHOUT_NUMBERS });
    expect(
      bare.satisfied,
      "the evidence tree is ignored by git, so a saving whose numbers are not IN the record is a " +
        "saving nobody can review",
    ).toBe(false);
    expect(bare.pairs).toEqual([]);
    expect(bare.reason).toContain("lands on argument");

    // Both directions. A rule that only ever says no is satisfied by a function returning `false`.
    const measured = evaluateMeasurementClaim({ claim: "saving", record: WITH_NUMBERS });
    expect(measured.satisfied, measured.reason).toBe(true);
    expect(measured.pairs).toEqual([{ before: "4.20min", after: "2.05min" }]);

    // And the obligation attaches to the claim, not to the prose: the same unnumbered record is fine
    // when nothing is being claimed. Otherwise every record in the file would owe numbers.
    expect(
      evaluateMeasurementClaim({ claim: "none", record: WITHOUT_NUMBERS }).satisfied,
      "a record that claims no cost outcome owes no numbers",
    ).toBe(true);
  });
});

// QFAI:SPEC-0017:TC-0017-0034
describe("a recorded regression with the rebuilds kept is accepting", () => {
  it("resolves the criterion satisfied on a measured regression, and only while the rebuilds are there", () => {
    const kept = resolveArtifactReuse({
      claim: "regression",
      record: REGRESSION_WITH_NUMBERS,
      rebuildsPresent: true,
    });
    expect(
      kept.satisfied,
      "a measured negative result is an accepting outcome — it is what keeps the requirement " +
        "falsifiable in both directions instead of inviting a re-run until the answer agrees",
    ).toBe(true);
    expect(kept.pairs).toEqual([{ before: "4.20min", after: "5.60min" }]);

    // The conjunct that is easy to lose: recording the regression AND removing the rebuilds anyway
    // would satisfy a check that only read the record.
    const removed = resolveArtifactReuse({
      claim: "regression",
      record: REGRESSION_WITH_NUMBERS,
      rebuildsPresent: false,
    });
    expect(removed.satisfied, "the measurement is the reason the rebuilds stay").toBe(false);
    expect(removed.reason).toContain("keeps the rebuilds");

    // A measured SAVING does not resolve this criterion — it lands the reuse under the sibling one.
    // Without this the function could ignore its claim argument entirely and both cases above still
    // pass, which is the shape of oracle that reports success no matter what it is given.
    const saving = resolveArtifactReuse({
      claim: "saving",
      record: WITH_NUMBERS,
      rebuildsPresent: true,
    });
    expect(saving.satisfied, saving.reason).toBe(false);
  });
});

// QFAI:SPEC-0017:TC-0017-0035
describe("an asserted regression with no numbers is not accepting", () => {
  it("refuses to close the criterion on an unmeasured regression, rebuilds present or not", () => {
    for (const rebuildsPresent of [true, false]) {
      const verdict = resolveArtifactReuse({
        claim: "regression",
        record: REGRESSION_WITHOUT_NUMBERS,
        rebuildsPresent,
      });
      expect(
        verdict.satisfied,
        `an unmeasured regression must not close the criterion (rebuildsPresent=${String(rebuildsPresent)}); ` +
          "otherwise the cheapest way to satisfy it is to assert the reuse would be slower and stop",
      ).toBe(false);
      expect(verdict.pairs).toEqual([]);
    }
  });
});

describe("the extractor reads this repository's own decision record, not only its fixtures", () => {
  it("finds the one measured pair that exists and none in the record that only describes the rule", async () => {
    const text = await readFile(DECISIONS, "utf8");
    const sections = new Map<string, string>();
    for (const raw of text.split(/^### /m).slice(1)) {
      sections.set(raw.slice(0, Math.max(raw.indexOf(":"), 0)), raw);
    }
    expect(
      sections.size,
      "the decision record must have sections for this to read",
    ).toBeGreaterThan(0);

    // The record that measured something.
    const measured = sections.get("DR-0017-0009");
    expect(
      measured,
      "DR-0017-0009 must be present; it is the accepting example this design was fitted to",
    ).toBeDefined();
    expect(capturedPairs(measured ?? "")).toEqual([{ before: "22.90s", after: "5.49s" }]);

    // The record that names a regression without measuring one. It sits in a `- Decision` bullet and
    // cites `BR-0017-0030`, exactly like the one above — which is why the claim direction is an input
    // to this module rather than something it infers. If this ever yields a pair, that argument has
    // changed and the API shape should be revisited rather than the assertion relaxed.
    const described = sections.get("DR-0017-0002");
    expect(described, "DR-0017-0002 must be present; it is the counter-example").toBeDefined();
    expect(described ?? "").toContain("regression");
    expect(capturedPairs(described ?? "")).toEqual([]);
  });
});

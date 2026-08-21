/**
 * Two properties of this repository's OWN workflows. One of them is coverage; the other deliberately is
 * not, and the difference is the point of this header.
 *
 * `QFAI-ATDD-112` reported eight `TC`s uncovered for eleven rounds and nobody went back to them, because
 * every round's agenda was the previous round's findings. Both of these are about the OWN tree, which is
 * why they were easy to miss: every `tests/e2e/**` file in this package asserts over an adopter's tree
 * built by `qfai init`, so the habit of the suite pointed away from the subject they name.
 *
 * ## `TC-0017-0030` is covered. `TC-0017-0016` is not, and must not be.
 *
 * I measured the permission departures, found the case's "exactly two" against a tree holding three, wrote
 * the assertion below, registered the annotation, and watched `QFAI-ATDD-112` stop reporting the row.
 *
 * Then I found `CR-20260818-0007` — raised 2026-08-18 by `/qfai-implement`, `Class: intent`,
 * `Status: open`, `Blocked set: spec-0017 TDD-0016 (TC-0017-0016)` — carrying the same three-row table I
 * had just re-derived, and the reason it was raised rather than written:
 *
 * > `TC-0017-0016` is a `boundary` row, and `06_Test-Cases.md` says a boundary row exists to "fix where
 * > the rule stops". This one is ambiguous at precisely that point, so writing it now would encode my
 * > reading of an undefined term as a hard assertion.
 *
 * The CR **recommends** Option A: the minimal-scope default is the literal `contents: read`, three
 * exceptions are enumerated, and the case's oracle becomes a set equality against them. That is exactly
 * what this test asserts. But `Approved by:` and `Approved option:` are both `-`, and **the gate finding
 * is the signal that the decision is pending.** Discharging it by adopting the recommendation would
 * remove the signal while the choice is still the user's.
 *
 * So the claim is withdrawn and the test stays. It protects what every option shares — the set of
 * departures is closed and every member deliberate — and it is written against Option A's oracle, so
 * approving A turns it into coverage by restoring one annotation. Approving B (per-job minimum, count two)
 * or C (only the blocks this spec adds) means rewriting the expected set, and the comment on the
 * `describe` says which.
 *
 * The near-miss is worth keeping in view: I re-derived a filed CR's measurement, treated it as a new
 * finding, and nearly resolved an open intent question by picking its recommended option. **An open CR
 * naming a TC in its blocked set is the thing to check before covering that TC**, not after.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const WORKFLOWS = path.join(REPO_ROOT, ".github", "workflows");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface Workflow {
  readonly file: string;
  readonly document: Record<string, unknown>;
}

async function ownWorkflows(): Promise<Workflow[]> {
  const files = (await readdir(WORKFLOWS)).filter((name) => /\.ya?ml$/.test(name)).sort();
  expect(files.length, "this repository must have its own workflows to read").toBeGreaterThan(0);
  const out: Workflow[] = [];
  for (const file of files) {
    const parsed: unknown = parseYaml(await readFile(path.join(WORKFLOWS, file), "utf8"));
    if (!isRecord(parsed)) throw new Error(`${file} did not parse to a mapping`);
    out.push({ file, document: parsed });
  }
  return out;
}

// NOT annotated for `TC-0017-0016`, deliberately. `CR-20260818-0007` is open, `Class: intent`, and its
// `Blocked set` names `TDD-0016 (TC-0017-0016)`: the term "the minimal-scope default" has two readings and
// the pack does not choose between them. The CR RECOMMENDS Option A — the default is the literal
// `contents: read`, three exceptions are enumerated, and the case's oracle becomes a set equality against
// them — which is exactly what this test asserts. But `Approved by:` and `Approved option:` are both `-`,
// and the `QFAI-ATDD-112` finding is the signal that the choice is still the user's. Annotating this would
// discharge that signal by adopting the recommendation, which is not this stage's decision to take.
//
// So the test runs and claims nothing. It protects the property every option shares — the set of
// departures is closed and every member deliberate — and it is written against Option A's oracle, so
// approving A makes it coverage by adding the annotation back. Approving B (per-job minimum, count two) or
// C (only the blocks this spec adds) means rewriting the expected set.
describe("the own tree's departures from minimal permission scope are a closed set", () => {
  it("grants no job-level permission block beyond the three that are deliberate", async () => {
    const workflows = await ownWorkflows();
    const departures: string[] = [];
    for (const { file, document } of workflows) {
      // The workflow-level grant is the baseline every job inherits. A job block that RESTATES it is not
      // a departure — `ci.yml`'s `detect` does exactly that — and counting it would make the assertion
      // about how the file is written rather than about what is granted.
      const baseline = JSON.stringify(document["permissions"] ?? null);
      const jobs = isRecord(document["jobs"]) ? document["jobs"] : {};
      for (const [id, job] of Object.entries(jobs)) {
        if (!isRecord(job)) continue;
        const granted = job["permissions"];
        if (granted === undefined) continue;
        const serialised = JSON.stringify(granted);
        if (serialised === baseline) continue;
        departures.push(`${file}#${id}: ${serialised}`);
      }
    }

    // Exactly this set, by content. A new departure fails; a widened existing one fails; and removing
    // one fails too, because each is load-bearing and its removal would break the job.
    expect(
      departures.sort(),
      "the set of permission grants that depart from the workflow baseline must be closed: a new one, " +
        "or a widened one, is a supply-chain change someone should read",
    ).toEqual([
      // The aggregate verdict job computes a result from `needs` and touches nothing.
      "ci.yml#ci-pass: {}",
      // Creating a GitHub release writes to the repository. Not named by `TC-0017-0016`, which expects
      // two departures; see this file's header.
      'release.yml#github-release: {"contents":"write"}',
      // npm provenance needs an OIDC token, which is the one grant `contents` cannot express.
      'release.yml#publish: {"contents":"read","id-token":"write"}',
    ]);

    // And the baseline itself, since "departs from the baseline" says nothing if the baseline is wide.
    for (const { file, document } of workflows) {
      expect(document["permissions"], `${file} must default to read-only`).toEqual({
        contents: "read",
      });
    }
  });
});

// QFAI:SPEC-0017:TC-0017-0030
describe("TC-0017-0030: the own tree holds no workflow-level Node version literal", () => {
  it("reads every Node version from a named source rather than from a literal at the use site", async () => {
    const workflows = await ownWorkflows();
    const literals: string[] = [];
    const references: string[] = [];
    for (const { file } of workflows) {
      const text = await readFile(path.join(WORKFLOWS, file), "utf8");
      for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (line.trim().startsWith("#")) continue;
        const match = /node-version:\s*(\S.*)$/.exec(line);
        if (match === null) continue;
        const value = (match[1] ?? "").trim();
        // A `${{ ... }}` expression names its source; a bare digit is the literal this forbids.
        if (/^\$\{\{/.test(value)) references.push(`${file}:${String(index + 1)}: ${value}`);
        else literals.push(`${file}:${String(index + 1)}: ${value}`);
      }
    }
    expect(
      literals,
      "a Node version written at the use site is a second source of truth for one answer, which is the " +
        "drift this forbids",
    ).toEqual([]);
    // A floor, because zero literals is also what an empty scan reports — the failure mode that made a
    // sibling pin inert at eleven packs.
    expect(
      references.length,
      "the scan must have found the version references it is checking the form of",
    ).toBeGreaterThan(0);
  });
});

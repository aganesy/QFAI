/**
 * Two `spec-0017` test cases over this repository's OWN workflows, both previously uncovered.
 *
 * `QFAI-ATDD-112` has reported eight `TC`s uncovered for eleven rounds. Six of the eight are the rows
 * parked on `CR-20260820-0007`, `CR-20260820-0012` and `DR-0017-0010`, each with a recorded reason. These
 * two are not parked and were simply never written.
 *
 * Both are about the OWN tree, which is why they were easy to miss: every `tests/e2e/**` file in this
 * package asserts over an adopter's tree built by `qfai init`, so the habit of the suite pointed away
 * from the subject these two name.
 *
 * ## A disagreement between `TC-0017-0016` and the tree, reported rather than resolved here
 *
 * The case reads: "The set of non-minimal permission blocks is exactly the verdict's empty map and the
 * publishing job's token write" — two of them. Measured, the tree holds **three** job-level blocks that
 * depart from the workflow-level `contents: read`:
 *
 *     ci.yml       ci-pass          {}                                 <- named by the case
 *     release.yml  github-release   { contents: write }                <- NOT named by the case
 *     release.yml  publish          { contents: read, id-token: write } <- named by the case
 *
 * `github-release` needs `contents: write` to create a release, so the third departure is real and
 * necessary rather than an over-grant. Two readings of the case are available — that it is stale, or that
 * "non-minimal" means "broader than the job needs" and `contents: write` is minimal FOR that job — and
 * they are not distinguishable from the case's text.
 *
 * So this test asserts the **measured set**, exactly, and does not pretend the count is two. Bending an
 * assertion to fit a sentence that the tree contradicts is how `US-0017-0004` spent ten rounds asserting
 * something it could not check. The disagreement is recorded in `.qfai/evidence/atdd-spec-0017.md` as a
 * cross-artifact obligation for whoever owns `06_Test-Cases.md`; the property this pins — that the set of
 * departures is CLOSED and every member is deliberate — is the one the case exists to protect, and it
 * holds under either reading.
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

// QFAI:SPEC-0017:TC-0017-0016
describe("TC-0017-0016: the own tree's departures from minimal permission scope are a closed set", () => {
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

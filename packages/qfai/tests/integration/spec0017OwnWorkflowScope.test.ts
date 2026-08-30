/**
 * Two properties of this repository's OWN workflows, and the history of how each became coverage.
 *
 * `QFAI-ATDD-112` reported eight `TC`s uncovered for eleven rounds and nobody went back to them, because
 * every round's agenda was the previous round's findings. Both of these are about the OWN tree, which is
 * why they were easy to miss: every `tests/e2e/**` file in this package asserts over an adopter's tree
 * built by `qfai init`, so the habit of the suite pointed away from the subject they name.
 *
 * ## Both are coverage now. Neither was, while its Change Request was open.
 *
 * I measured the permission departures, found `TC-0017-0016`'s "exactly two" against a tree holding
 * three, wrote the assertion, registered the annotation, and watched `QFAI-ATDD-112` stop reporting the
 * row.
 *
 * Then I found `CR-20260818-0007` — raised 2026-08-18 by `/qfai-implement`, `Class: intent`,
 * `Blocked set: spec-0017 TDD-0016 (TC-0017-0016)` — carrying the same three-row table I had just
 * re-derived, and the reason it was raised rather than written:
 *
 * > `TC-0017-0016` is a `boundary` row, and `06_Test-Cases.md` says a boundary row exists to "fix where
 * > the rule stops". This one is ambiguous at precisely that point, so writing it now would encode my
 * > reading of an undefined term as a hard assertion.
 *
 * So the annotation came back off, and both tests sat here as properties rather than as coverage —
 * asserting what every option shared, with the gate finding left standing. **Discharging a
 * pending-decision signal by adopting the recommendation it carries removes the signal while the choice
 * is still the user's.**
 *
 * Both are approved as of 2026-08-23 — `CR-20260818-0007` option A, `CR-20260820-0001` option C. Each
 * test was then rewritten against the approved oracle, falsified by planting the violations it claims to
 * catch, and only after that re-annotated. The annotation is a claim about the test; nothing in this
 * repository checks it, so the order is the only thing that makes it true.
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

// QFAI:SPEC-0017:TC-0017-0016
//
// Annotated as of `CR-20260818-0007`, approved 2026-08-23, **option A**: the minimal-scope default is
// the literal `permissions: { contents: read }`, and exactly three blocks are declared exceptions.
// This test was written against that oracle while the CR was open and deliberately carried no
// annotation, because annotating it then would have discharged the pending-decision signal by adopting
// a recommendation that was not this stage's to adopt. The decision is made, so the annotation is back.
//
// Two things changed with the approval, and both close a laundering path rather than restate the rule.
//
// **The comparison is against the literal, not against each file's own baseline.** Relative comparison
// had a hole: widen `ci.yml`'s workflow-level block to `contents: write` and a NEW job carrying
// `contents: write` equals its file's baseline and drops out of the departure set silently. The old
// second loop would have caught the widened baseline, but the set itself under-reported. One fixed
// literal, one set, no hole.
//
// **A missing workflow-level block is a member, not an absence.** Folding it in is what lets the two
// assertions collapse into one equality without losing the baseline check.
describe("the own tree's departures from minimal permission scope are a closed set", () => {
  it("grants no permission block beyond the three that are deliberate", async () => {
    const workflows = await ownWorkflows();
    // The literal default, serialised the same way every candidate is.
    const DEFAULT = JSON.stringify({ contents: "read" });
    // Key order is a property of how the YAML was typed, not of what is granted: `JSON.stringify`
    // preserves insertion order, so swapping `contents:` and `id-token:` in the source would otherwise
    // change the string and redden a tree that granted exactly the same thing.
    const canonical = (value: unknown): string => {
      if (!isRecord(value)) return JSON.stringify(value);
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value).sort()) sorted[key] = value[key];
      return JSON.stringify(sorted);
    };

    const departures: string[] = [];
    let jobCount = 0;
    for (const { file, document } of workflows) {
      // `permissions:` is legal at workflow and job level only — never at step level, and a composite
      // action cannot declare one — so these two loops are the whole surface.
      const atWorkflow = document["permissions"];
      if (atWorkflow === undefined) departures.push(`${file}#<workflow>: MISSING`);
      else if (canonical(atWorkflow) !== DEFAULT) {
        departures.push(`${file}#<workflow>: ${canonical(atWorkflow)}`);
      }

      const jobs = isRecord(document["jobs"]) ? document["jobs"] : {};
      for (const [id, job] of Object.entries(jobs)) {
        if (!isRecord(job)) continue;
        jobCount += 1;
        const granted = job["permissions"];
        // Absent means inherited, which is `TC-0017-0014`'s property and not this one. A job that
        // RESTATES the default — `ci.yml`'s `detect` does — is not a departure either.
        if (granted === undefined) continue;
        if (canonical(granted) === DEFAULT) continue;
        departures.push(`${file}#${id}: ${canonical(granted)}`);
      }
    }

    // Non-vacuity, both halves. An empty departure set is also what an empty scan produces, and the
    // file floor alone passes on two documents that parse to `{}`.
    expect(jobCount, "the own tree must have jobs for this to be about").toBeGreaterThan(0);

    // Set EQUALITY, in both directions. The previous formulation only forbade extras, so deleting
    // `id-token: write` from `publish` would have passed it.
    expect(
      departures.sort(),
      "the set of permission blocks departing from the literal `{ contents: read }` must be exactly " +
        "the three declared exceptions: a fourth is a supply-chain change someone should read, and a " +
        "missing one means a job lost a grant it needs",
    ).toEqual([
      // The aggregate verdict job computes a result from `needs` and touches nothing. Explicit rather
      // than missing, which is the distinction the `MISSING` record above exists to keep.
      "ci.yml#ci-pass: {}",
      // Creating a GitHub Release writes to the repository; this is the minimum that can.
      'release.yml#github-release: {"contents":"write"}',
      // npm provenance needs an OIDC token, which is the one grant `contents` cannot express.
      'release.yml#publish: {"contents":"read","id-token":"write"}',
    ]);
  });
});

// QFAI:SPEC-0017:TC-0017-0030
//
// Annotated as of `CR-20260820-0001`, approved 2026-08-23, **option C**: the prohibition on a
// workflow-level Node literal stays tree-wide, and the publishing job is exempted explicitly rather than
// by scoping the rule away from `release.yml`.
//
// **What this replaced was weaker than the case, and the gap was the thing the case is about.** The old
// scan matched `node-version:` use sites only, so it read the gate's `${{ env.NODE_LTS }}` as compliant
// and never looked at the `env:` block the value came from — blind to the literal it forbids. Three sets
// close it:
//
// **A. every Node version literal**, found two ways so that neither laundering path works. By name, so a
// literal left dangling after its use site moved is still caught; and by resolving each use site's
// `${{ env.X }}` back to its definition, so renaming the key away from `NODE` does not hide it. The two
// paths agree on the one member, which is why the set is de-duplicated rather than concatenated.
//
// **B. every job that establishes a toolchain outside the shared definition.** A value-only rule is
// satisfiable by inlining `actions/setup-node` with a `node-version-file`, which is drift with no
// literal in it. This is the half that makes the gate's rewire an assertion rather than a comment.
//
// **C. the shared definition reads from a file, and that file carries the constraint.** Without the last
// clause the indirection is decorative: `node-version-file` pointed at a `package.json` with no
// `engines.node` resolves to whatever the runner image ships, silently.
describe("the own tree takes its Node version from one shared definition", () => {
  it("leaves exactly the publishing job's declared literal and routes every other job through the shared setup", async () => {
    const workflows = await ownWorkflows();

    // A version-shaped scalar: `24`, `20.19`, `20.19.0`. The YAML parser has already removed the quotes.
    const VERSION_SHAPE = /^\d+(?:\.\d+){0,2}$/;
    // `${{ env.NAME }}`, tolerant of the inner spacing nobody writes consistently.
    const ENV_REFERENCE = /^\$\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/;
    // The shared definition, at either of the two paths it can be reached by.
    //
    // `release.yml`'s gate checks out the TAG's tree, and `uses: ./…` resolves against the
    // workspace — so for a tag created before the composite action existed the reference does not
    // resolve and the job dies on step resolution, which is review finding [07]: the re-publish
    // route this workflow opens with was documented and unreachable for exactly the tags it was
    // written for. The gate therefore fetches `.github/actions` at `github.sha` into a side path
    // and consumes it from there.
    //
    // Both spellings name the SAME definition — the obligation `BR-0017-0027` states is
    // single-definition, and a second path to one file is not a second definition. What would
    // violate it is an inlined preamble or a second action, and the negative half below still
    // rejects both.
    const SHARED_SETUP_PATHS = new Set([
      "./.github/actions/setup",
      "./.ci-actions/.github/actions/setup",
    ]);

    const stepsOf = (owner: unknown): Record<string, unknown>[] => {
      if (!isRecord(owner)) return [];
      const steps = owner["steps"];
      return Array.isArray(steps) ? steps.filter(isRecord) : [];
    };
    const named = (env: Record<string, unknown>, where: string, into: Set<string>): void => {
      for (const [key, value] of Object.entries(env)) {
        if (!/node/i.test(key)) continue;
        if (!VERSION_SHAPE.test(String(value))) continue;
        into.add(`${where}#env.${key}: ${String(value)}`);
      }
    };

    const literals = new Set<string>();
    const inlineSetups: string[] = [];
    const sharedSetupUsers: string[] = [];
    const useSites: string[] = [];

    for (const { file, document } of workflows) {
      const workflowEnv = isRecord(document["env"]) ? document["env"] : {};
      named(workflowEnv, file, literals);

      const jobs = isRecord(document["jobs"]) ? document["jobs"] : {};
      for (const [id, job] of Object.entries(jobs)) {
        const jobEnv = isRecord(job) && isRecord(job["env"]) ? job["env"] : {};
        named(jobEnv, `${file}#${id}`, literals);

        for (const step of stepsOf(job)) {
          const uses = typeof step["uses"] === "string" ? step["uses"] : "";
          if (SHARED_SETUP_PATHS.has(uses)) sharedSetupUsers.push(`${file}#${id}`);
          // Set B. A composite action of our own is the sanctioned route; reaching past it to the
          // upstream action is the drift, whether or not the version beside it is a literal.
          if (/^actions\/setup-node@/.test(uses)) inlineSetups.push(`${file}#${id}`);

          const withBlock = isRecord(step["with"]) ? step["with"] : {};
          const declared = withBlock["node-version"];
          if (declared === undefined) continue;
          useSites.push(`${file}#${id}`);

          const raw = String(declared).trim();
          const reference = ENV_REFERENCE.exec(raw);
          if (reference === null) {
            // A bare version at the use site, or an expression reading something other than `env`.
            literals.add(`${file}#${id}#node-version: ${raw}`);
            continue;
          }
          const key = reference[1] ?? "";
          const resolved = jobEnv[key] ?? workflowEnv[key];
          if (resolved === undefined) {
            throw new Error(
              `${file}#${id} reads env.${key}, which neither the job nor the workflow defines`,
            );
          }
          literals.add(`${file}#env.${key}: ${String(resolved)}`);
        }
      }
    }

    // Set A.
    expect(
      [...literals].sort(),
      "the publishing job's Node literal is the one declared exception (BR-0017-0027): it encodes npm's " +
        "own engine range for trusted publishing, which no file in this repository expresses. A second " +
        "literal is a second answer to one question, and the stale one wins as often as not",
    ).toEqual(["release.yml#env.NODE_PUBLISH: 24"]);

    // Set B, negative half: nothing but `publish` reaches past the shared definition.
    expect(
      inlineSetups.sort(),
      "every job needing a toolchain takes it from the shared definition; `publish` is the exception " +
        "because it is the one job that deliberately does not run on the repository's own Node",
    ).toEqual(["release.yml#publish"]);

    // Set B, positive half: the rewire `CR-20260820-0001` option C decided, asserted rather than assumed.
    expect(
      sharedSetupUsers,
      "the release gate must consume the shared definition — it is the job whose drift from `ci.yml` " +
        "would let a release pass a gate `main` never ran",
    ).toContain("release.yml#gate");

    // Set B, third clause: the release gate takes the action from a revision that HAS it.
    //
    // Review finding [07]. `uses: ./…` resolves against the workspace, and the gate's checkout puts
    // the TAG's tree there — so re-publishing a tag created before the composite action existed
    // left the reference unresolvable and the job died on step resolution, never reaching
    // `pnpm ci:gate`. The `workflow_dispatch` re-publish route this workflow opens with was
    // documented and unreachable for exactly the tags it was written for.
    //
    // Asserted as the PAIR, because either half alone is the defect: the side-path `uses:`, and a
    // checkout of `github.sha` into that path. A plant reverting just the `uses:` passed while this
    // suite only checked membership in the two-spelling set, which is how this clause came to
    // exist.
    const releaseGate = (() => {
      const release = workflows.find((entry) => entry.file === "release.yml");
      const jobs = isRecord(release?.document["jobs"]) ? release.document["jobs"] : {};
      return isRecord(jobs["gate"]) ? jobs["gate"] : undefined;
    })();
    expect(releaseGate, "release.yml must declare the gate job").toBeDefined();
    const gateSteps = stepsOf(releaseGate);

    expect(
      gateSteps.map((step) => step["uses"]).filter((uses) => typeof uses === "string"),
      "the gate must consume the action from the side path, not from the tag tree it checked out",
    ).toContain("./.ci-actions/.github/actions/setup");

    const sidePathCheckout = gateSteps.find((step) => {
      const withBlock = isRecord(step["with"]) ? step["with"] : {};
      return (
        typeof step["uses"] === "string" &&
        step["uses"].startsWith("actions/checkout@") &&
        withBlock["path"] === ".ci-actions"
      );
    });
    expect(
      sidePathCheckout,
      "and something must put the action there — a `uses:` naming a path nothing populates is the " +
        "same unresolvable step in a different spelling",
    ).toBeDefined();

    const checkoutWith = isRecord(sidePathCheckout?.["with"]) ? sidePathCheckout["with"] : {};
    expect(
      checkoutWith["ref"],
      "at THIS workflow's revision, which by construction contains the action this file references",
    ).toBe("${{ github.sha }}");

    // Non-vacuity for all three sets. An empty scan satisfies every emptiness assertion above, and a
    // sibling pin in this suite was inert at eleven packs for exactly that reason.
    expect(
      useSites.length,
      "the scan must have found the Node use sites whose form it checks",
    ).toBeGreaterThan(0);
    expect(
      sharedSetupUsers.length,
      "the scan must have found jobs on the shared definition for its absence to mean anything",
    ).toBeGreaterThan(1);

    // Set C. The shared definition names a file, and names only a file.
    const parsedAction: unknown = parseYaml(
      await readFile(path.join(REPO_ROOT, ".github", "actions", "setup", "action.yml"), "utf8"),
    );
    const sources: string[] = [];
    for (const step of stepsOf(isRecord(parsedAction) ? parsedAction["runs"] : undefined)) {
      const withBlock = isRecord(step["with"]) ? step["with"] : {};
      for (const key of ["node-version", "node-version-file"]) {
        if (withBlock[key] !== undefined) sources.push(`${key}: ${String(withBlock[key])}`);
      }
    }
    // Both keys, and NEITHER of them a version. `node-version-file` is the default path;
    // `node-version` carries the floor the action DERIVES from that same file when a caller asks
    // for it (review finding [13] — otherwise every lane resolves the range and nothing ever runs
    // on the floor the package promises). The pin is the exact pair, so a literal appearing in
    // either slot fails here: the property this row defends is that the shared definition is not
    // "the single place the whole tree is wrong from", and an expression reading a step output is
    // not a place anything can be wrong from — `engines.node` still is.
    expect(
      sources,
      "the shared definition must read the version from a file and never from a literal of its own, or " +
        "it becomes the single place the whole tree is wrong from",
    ).toEqual([
      "node-version: ${{ steps.shim.outputs.version }}",
      "node-version-file: package.json",
    ]);

    // Set C, second clause: the named file carries what the indirection resolves through.
    const manifest: unknown = JSON.parse(
      await readFile(path.join(REPO_ROOT, "package.json"), "utf8"),
    );
    const engines = isRecord(manifest) && isRecord(manifest["engines"]) ? manifest["engines"] : {};
    expect(
      typeof engines["node"] === "string" ? engines["node"] : "",
      "`node-version-file: package.json` resolves through `engines.node`; with the field absent " +
        "setup-node reads nothing and the runner image's default Node wins, which is not a decision " +
        "anyone made",
    ).toMatch(/\d/);
  });
});

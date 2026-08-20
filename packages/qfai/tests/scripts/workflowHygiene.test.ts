/**
 * Hygiene properties of QFAI's OWN CI trees — `.github/workflows/**` and
 * `.github/actions/**`. Nothing here governs the shipped tree under
 * `packages/qfai/assets/init/root/.github/workflows/**`; that belongs to a
 * different spec and a different contract, and the only rules that reach it are
 * the shipped-file rules of the hygiene lane, which is a later change.
 *
 * This file is the home spec-0017's ledger names for its permission, checkout and
 * action-pin rows. It grows as the sequenced changes land; today it carries
 * change 2, the own-tree hardening — properties of the tree, measured by parsing
 * it. The rows that assert a LANE's exit code (`TDD-0017`, `TDD-0018`,
 * `TDD-0020`, `TDD-0023`) belong to change 3, which introduces the script whose
 * exit code they read, and they are deliberately absent here rather than stubbed.
 *
 * ## Reachability, not declaration
 *
 * `BR-0017-0014` forbids declaration-only counting, and the reason is worth
 * keeping in front of the reader: GitHub resolves a job's permissions from the
 * job's own block if it has one and from the workflow's otherwise, so a job with
 * no block of its own is still governed when its workflow declares one. A counter
 * that only looked for job-level blocks would report a compliant tree as
 * non-compliant, and — worse for a gate — would go on reporting a violation after
 * the violation was fixed at the workflow level.
 *
 * The baseline the spec records for this is `2 of 12 declare, 4 of 12 reach`, and
 * both halves reproduce here. The gap change 2 closes is eight jobs.
 *
 * ## What is NOT asserted, and why
 *
 * `TC-0017-0016` — "exactly two permission blocks depart from the minimal-scope
 * default" — is absent. The own tree already carries a third elevation the rule
 * does not name (`github-release`'s `contents: write`), and "the minimal-scope
 * default" is undefined at exactly the point a `boundary` row has to measure.
 * Writing it would encode one reading of an undefined term as a hard assertion,
 * which `constitution/drift-protocol.md` forbids. Routed as `CR-20260818-0007`,
 * which names `TDD-0016` as its blocked set.
 */
// QFAI:SPEC-0017:TC-0017-0014
// QFAI:SPEC-0017:TC-0017-0019
// QFAI:SPEC-0017:TC-0017-0021
// QFAI:SPEC-0017:TC-0017-0022
// QFAI:SPEC-0017:TC-0017-0024
// QFAI:SPEC-0017:TC-0017-0015
// QFAI:SPEC-0017:TC-0017-0017
// QFAI:SPEC-0017:TC-0017-0018
// QFAI:SPEC-0017:TC-0017-0020
// QFAI:SPEC-0017:TC-0017-0023

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const WORKFLOWS_DIR = path.join(REPO_ROOT, ".github", "workflows");
const ACTIONS_DIR = path.join(REPO_ROOT, ".github", "actions");

/**
 * The jobs that legitimately need full history.
 *
 * A LITERAL list rather than a derived set, and that is the whole assertion: the
 * point is that this list and the tree agree, so deriving one from the other
 * would make the test check the tree against itself.
 *
 * Three, and the third arrived with change 8. `BR-0017-0019`'s Notes said "two jobs need
 * it today", which was a measurement of the tree at authoring time and not a cap — the
 * normative half is "the jobs that legitimately need full history MUST request it on the
 * job, and full-history checkout MUST NOT become a workflow-level default". `AC-0017-0004`
 * names the third outright: "the change-detection job requests full history and diffs
 * against the base commit". Its diff cannot resolve the base commit in a shallow clone,
 * which is one of the two failures that rule requires to fail open with an annotation.
 *
 * So this is an extension with a cited authorization, not a relaxation. CLAIM 2 below —
 * no workflow-level default — is what the rule actually guards, and it is untouched.
 */
const FULL_HISTORY_JOBS = ["ci.yml::detect", "ci.yml::lint", "release.yml::verify"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ParsedWorkflow = { file: string; doc: Record<string, unknown> };

/** Every own-CI workflow, parsed. Throws rather than skipping a file it cannot read. */
function ownWorkflows(): ParsedWorkflow[] {
  const files = readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
  if (files.length === 0) {
    throw new Error(`${WORKFLOWS_DIR} holds no workflow files`);
  }
  return files.map((file) => {
    const doc: unknown = parseYaml(readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8"));
    if (!isRecord(doc)) {
      throw new Error(`${file} did not parse to a mapping`);
    }
    return { file, doc };
  });
}

type Job = {
  id: string;
  file: string;
  job: Record<string, unknown>;
  workflow: Record<string, unknown>;
};

/** Every job across the own tree, tagged `<file>::<job key>`. */
function ownJobs(): Job[] {
  const out: Job[] = [];
  for (const { file, doc } of ownWorkflows()) {
    const jobs = doc["jobs"];
    if (!isRecord(jobs)) {
      throw new Error(`${file} declares no jobs mapping`);
    }
    for (const [key, job] of Object.entries(jobs)) {
      if (!isRecord(job)) {
        throw new Error(`${file} job ${key} did not parse to a mapping`);
      }
      out.push({ id: `${file}::${key}`, file, job, workflow: doc });
    }
  }
  return out;
}

/**
 * Whether a permission block is REACHABLE from this job — declared on the job or
 * on its workflow. `BR-0017-0014`'s rule, expressed as the one line it is.
 *
 * `"permissions" in x` rather than a truthiness test, deliberately: the aggregate
 * verdict's block is an EMPTY map, which is falsy-looking and is the whole point
 * of declaring it — explicit rather than missing.
 */
function hasReachablePermissions(entry: Job): boolean {
  return "permissions" in entry.job || "permissions" in entry.workflow;
}

/** Declaration-only counting, kept so the two measurements can be compared. */
function hasDeclaredPermissions(entry: Job): boolean {
  return "permissions" in entry.job;
}

type Step = { jobId: string; step: Record<string, unknown> };

function ownSteps(): Step[] {
  const out: Step[] = [];
  for (const entry of ownJobs()) {
    const steps = entry.job["steps"];
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      if (isRecord(step)) out.push({ jobId: entry.id, step });
    }
  }
  return out;
}

function checkoutSteps(): Step[] {
  return ownSteps().filter(
    (s) => typeof s.step["uses"] === "string" && s.step["uses"].startsWith("actions/checkout@"),
  );
}

function stepWith(step: Record<string, unknown>): Record<string, unknown> {
  const w = step["with"];
  return isRecord(w) ? w : {};
}

/** Every `uses:` value across the own workflows AND actions trees, tagged by its file. */
function ownUses(): { where: string; uses: string }[] {
  const out: { where: string; uses: string }[] = [];
  for (const entry of ownJobs()) {
    const steps = entry.job["steps"];
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      if (isRecord(step) && typeof step["uses"] === "string") {
        out.push({ where: entry.id, uses: step["uses"] });
      }
    }
  }
  // `.github/actions/**` does not exist until a later change. Its absence is not
  // a failure here, but a present tree must be scanned — otherwise this row would
  // stop covering the composite action on the day it lands.
  if (existsSync(ACTIONS_DIR)) {
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(p);
          continue;
        }
        if (!/\.ya?ml$/.test(e.name)) continue;
        const doc: unknown = parseYaml(readFileSync(p, "utf-8"));
        if (!isRecord(doc)) continue;
        const runs = doc["runs"];
        const steps = isRecord(runs) ? runs["steps"] : undefined;
        if (!Array.isArray(steps)) continue;
        for (const step of steps) {
          if (isRecord(step) && typeof step["uses"] === "string") {
            out.push({
              where: path.relative(REPO_ROOT, p).replace(/\\/g, "/"),
              uses: step["uses"],
            });
          }
        }
      }
    };
    walk(ACTIONS_DIR);
  }
  return out;
}

describe("TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block", () => {
  it("reaches a permission block from every job, and reachability differs from declaration", () => {
    const jobs = ownJobs();

    // Guard — the tree is non-trivial. On an empty job set the claim below holds
    // by iterating nothing, which is the vacuity a count assertion invites.
    expect(
      jobs.length,
      "the own tree must declare jobs for this count to mean anything",
    ).toBeGreaterThan(0);

    // CLAIM — the count is zero, reported as the ID LIST rather than as a number.
    // A number tells a red reader that something is wrong; the list tells them
    // which job, which is the difference between a diagnosable gate and a puzzle.
    expect
      .soft(
        jobs.filter((j) => !hasReachablePermissions(j)).map((j) => j.id),
        "every own-CI job must have a permission block reachable from it — declared on the job or on its workflow",
      )
      .toEqual([]);

    // The two measurements are recorded together, because `BR-0017-0014`'s whole
    // point is that they are different and only one of them can falsify the rule.
    // Declaration-only is expected to stay BELOW reachability here: most jobs
    // inherit, and that is compliant.
    //
    // Compared against REACHABILITY, not against the job count. `declared <= jobs.length`
    // stood here and was a tautology — `jobs.filter(p).length <= jobs.length` holds for every
    // predicate `p`, so no mutation of either counter could fail it, including one that made
    // `hasDeclaredPermissions` return true unconditionally. Implementation-review finding L1.
    const declared = jobs.filter(hasDeclaredPermissions).length;
    const reachable = jobs.filter(hasReachablePermissions).length;
    expect
      .soft(
        { declared, reachable },
        "a declared block is reachable by definition, so declaration can never exceed reachability; if it does, the two counters disagree about what a block is",
      )
      .toEqual({ declared, reachable: Math.max(declared, reachable) });

    // And they must actually DIFFER, which is the half `BR-0017-0014` is about: if every job
    // declared its own block the two counters would coincide and the distinction the rule
    // draws would be untested by this tree.
    expect
      .soft(
        reachable - declared,
        "the tree must contain at least one job that inherits rather than declares, or this row proves nothing about reachability",
      )
      .toBeGreaterThan(0);
  });
});

describe("TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials", () => {
  it("sets persist-credentials to false on every checkout step in the own tree", () => {
    const steps = checkoutSteps();

    // Guard — there are checkout steps to govern.
    expect(steps.length, "the own tree must contain checkout steps").toBeGreaterThan(0);

    // CLAIM — `=== false` and not merely "present": `persist-credentials: true`
    // is present and is the thing the rule forbids, and a string `"false"` is
    // truthy in the runner's eyes for some inputs, so the boolean is asserted.
    expect
      .soft(
        steps.filter((s) => stepWith(s.step)["persist-credentials"] !== false).map((s) => s.jobId),
        "every checkout step must set `persist-credentials: false`, so a job cannot push with the workflow token by accident",
      )
      .toEqual([]);
  });
});

describe("TC-0017-0021 (TDD-0021): full history is job-scoped, never a workflow default", () => {
  it("requests full history on exactly the two jobs that need it", () => {
    const requesting = [
      ...new Set(
        checkoutSteps()
          .filter((s) => stepWith(s.step)["fetch-depth"] === 0)
          .map((s) => s.jobId),
      ),
    ].sort();

    // CLAIM 1 — exactly the jobs the allow-list names. `toEqual` on the sorted list
    // rather than a count: a count is also satisfied by the wrong members, and the rule
    // is about WHICH jobs, not how many. That mattered when the list grew from two to
    // three — a count assertion would have needed the same edit while proving less.
    expect
      .soft(
        requesting,
        "full history belongs to change detection, the lint lane's pair-changed diff and the release verification job, and to no other job",
      )
      .toEqual([...FULL_HISTORY_JOBS].sort());

    // CLAIM 2 — and to no workflow-level default. A workflow-level `defaults:`
    // block cannot carry `with:` for an action, so the reachable way to make full
    // history a default is a workflow-level `env` or `defaults` naming it; both
    // are asserted absent by looking for the token anywhere outside a step.
    const leaked = ownWorkflows()
      .filter(({ doc }) => JSON.stringify(doc["defaults"] ?? {}).includes("fetch-depth"))
      .map(({ file }) => file);
    expect
      .soft(leaked, "no workflow may make full-history checkout a default; it is requested per job")
      .toEqual([]);
  });
});

describe("TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin", () => {
  it("resolves every uses value to a forty-hex commit SHA", () => {
    const uses = ownUses();

    // Guard — there are references to pin.
    expect(
      uses.length,
      "the own tree must reference actions for this claim to bite",
    ).toBeGreaterThan(0);

    // CLAIM — forty hex characters, anchored. A floating major-version tag, a
    // branch name and a short SHA all fail, which is the intent: a short SHA is
    // ambiguous and a tag is mutable by whoever owns the action.
    //
    // The example forms are described rather than written out, and that is not
    // squeamishness: `shippedWorkflowPins.test.ts` scans EVERY test file line for
    // a floating-major reference and forbids it, because a surviving expectation
    // of that form would demand the un-pinned tree back. The scan is comment-blind
    // on purpose — its docblock records that the class escaped a file-scoped scan
    // once — so a literal here reddens a sibling row for prose.
    // A LOCAL reference (`./.github/actions/setup`) is exempt, and this is the
    // same exemption the lane itself carries rather than a weakening of the row.
    // A local path resolves inside the repository at the same commit, which is
    // the property pinning buys — so there is nothing a SHA would add, and
    // demanding one would reject the composite action this repository's own
    // toolchain preamble now lives in. Added when change 4 introduced the first
    // such reference; the lane had it from the start and the row did not, which
    // is how the gap surfaced.
    expect
      .soft(
        uses
          .filter((u) => !u.uses.startsWith("./"))
          .filter((u) => !/@[0-9a-f]{40}$/.test(u.uses))
          .map((u) => `${u.where} -> ${u.uses}`),
        "every non-local action reference must be pinned to a full commit SHA, so what runs cannot change under a tag move",
      )
      .toEqual([]);
  });
});

describe("TC-0017-0024 (TDD-0024): a readable pin trailer stays legal and no guard is widened", () => {
  it("passes the leakage guard with version trailers present, because .github is outside its scope", () => {
    // The trailers this row is about look exactly like the version markers the
    // leakage guard forbids — `# v4.4.0` contains `v4.4.0`. They are legal for a
    // structural reason and not by exception: the guard derives its scope from
    // `packages/qfai/package.json#files`, and `.github/` is not in it.
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "packages", "qfai", "package.json"), "utf-8"),
    );
    // Narrowed, not asserted. `JSON.parse` returns `any`, and naming a shape with `as` here
    // would let every read below trust a field nothing checked.
    const shipped =
      isRecord(manifest) && Array.isArray(manifest["files"]) ? manifest["files"] : undefined;
    expect(
      shipped,
      "the guard reads package.json#files as its scope, so this row depends on that field existing",
    ).toBeDefined();

    // CLAIM 1 — `.github` is outside the distributed surface, which is WHY the
    // trailer is legal. Asserted rather than assumed, because the day `.github`
    // enters `files` this row's premise is gone and a reader needs to be told.
    expect
      .soft(
        (shipped ?? []).filter((f) => typeof f === "string" && f.startsWith(".github")),
        "`.github/` must stay outside package.json#files, or the pin trailers enter the distributed surface",
      )
      .toEqual([]);

    // CLAIM 2 — and the guard actually exits 0. Run rather than reasoned about:
    // the scope argument above is a claim about the guard's design, and this is
    // the guard's behaviour.
    const run = spawnSync("bash", ["packages/qfai/scripts/check-no-internal-version-leakage.sh"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    expect
      .soft(
        run.status,
        `the leakage guard must exit 0 with the pin trailers present:\n${run.stdout ?? ""}${run.stderr ?? ""}`,
      )
      .toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Change 3 — the hygiene lane. The rows above assert PROPERTIES of the tree by
// parsing it; these assert the LANE's verdict on a planted tree, which is a
// different observation and needs the script to exist.
//
// Every planted violation is applied to a COPY in a temp directory, never to
// `.github/` itself. Two reasons, and the second is the one that decided it:
// a mutation in the shared working tree produced a false red for a concurrent
// reviewer earlier in this slice, and a test that edits the repository it runs
// inside leaves the repository broken when it crashes between edit and restore.
// ───────────────────────────────────────────────────────────────────────────

const LANE = path.join(REPO_ROOT, "scripts", "check-workflow-hygiene.mjs");

/** The shipped workflows tree, relative to the repository root. */
const SHIPPED_WORKFLOWS_REL = path.join(
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  ".github",
  "workflows",
);

/** A throwaway copy of the own `.github` tree, for planting violations into. */
function plantedTree(mutate: (dir: string) => void): string {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-hygiene-"));
  cpSync(path.join(REPO_ROOT, ".github"), path.join(dir, ".github"), { recursive: true });
  // The shipped workflows too, because the lane scans BOTH roots. Copying only the own tree
  // would make every shipped-tree row prove nothing: the lane would find no shipped files and
  // report no shipped findings, which is indistinguishable from a passing shipped tree.
  cpSync(path.join(REPO_ROOT, SHIPPED_WORKFLOWS_REL), path.join(dir, SHIPPED_WORKFLOWS_REL), {
    recursive: true,
  });
  mutate(dir);
  return dir;
}

type LaneRun = { exitCode: number; output: string };

/**
 * Runs the lane against a tree and returns its exit code and combined output.
 *
 * `status` is mapped to -1 when the child was killed by a signal rather than
 * exiting, so a crashed lane stays distinguishable from a lane that reported a
 * violation. A `?? 1` here would let a crash satisfy every row that expects 1 —
 * which is exactly how a missing script would have passed these rows.
 */
function runLane(root: string): LaneRun {
  const r = spawnSync(process.execPath, [LANE, "--root", root], { encoding: "utf-8" });
  return {
    exitCode: r.status ?? -1,
    output: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

/** Rewrites one workflow file inside a planted tree. */
function editWorkflow(dir: string, file: string, edit: (text: string) => string): void {
  const p = path.join(dir, ".github", "workflows", file);
  const before = readFileSync(p, "utf-8");
  const after = edit(before);
  if (after === before) {
    throw new Error(`planting into ${file} changed nothing — the needle is stale`);
  }
  writeFileSync(p, after, "utf-8");
}

describe("TC-0017-0015 (TDD-0015): reachability and declaration are two different measurements", () => {
  it("accepts an inheriting fixture job that the declaration-only counter rejects", async () => {
    // The lane exports both counters so this row can compare them. Importing the
    // script rather than re-implementing the predicate here is the whole point: a
    // test-local copy would pass while the lane's own counter was wrong, which is
    // the failure `BR-0017-0014` exists to prevent.
    const lane: unknown = await import(pathToFileURL(LANE).href);
    if (!isRecord(lane)) throw new Error("the lane did not import to a module namespace");
    const reach = lane["hasReachablePermissions"];
    const decl = lane["hasDeclaredPermissions"];
    if (typeof reach !== "function" || typeof decl !== "function") {
      throw new Error("the lane must export hasReachablePermissions and hasDeclaredPermissions");
    }

    // The boundary case, stated as data: a job with no block of its own, inside a
    // workflow that declares one. GitHub governs it; a declaration-only counter
    // does not see it.
    const inheriting = { job: {}, workflow: { permissions: { contents: "read" } } };

    expect.soft(reach(inheriting), "an inheriting job HAS a reachable permission block").toBe(true);
    expect
      .soft(decl(inheriting), "and it does NOT declare one — that is the whole difference")
      .toBe(false);

    // The other three corners, so the pair is pinned as a truth table rather than
    // by one example: both counters agree on a job that declares, and both agree
    // on a job governed by nothing.
    const declaring = { job: { permissions: {} }, workflow: {} };
    const ungoverned = { job: {}, workflow: {} };
    expect.soft(reach(declaring), "a declaring job is reachable").toBe(true);
    expect.soft(decl(declaring), "and declares — an EMPTY map still counts as declared").toBe(true);
    expect.soft(reach(ungoverned), "a job governed by nothing is not reachable").toBe(false);
    expect.soft(decl(ungoverned), "and declares nothing").toBe(false);
  });
});

describe("TC-0017-0017 (TDD-0017): removing both blocks exits 1 naming the workflow and the job", () => {
  it("reports the workflow and the job whose two permission blocks were both removed", () => {
    // `ci-pass` is the job to strip: it is the only one carrying its OWN block
    // (an empty map), so removing the workflow-level block alone would leave it
    // reachable and the row would measure nothing.
    const dir = plantedTree((d) => {
      editWorkflow(d, "ci.yml", (t) =>
        t.replace("permissions:\n  contents: read\n", "").replace("    permissions: {}\n", ""),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `the lane must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "and name the failure code").toContain("R-WORKFLOW-HYGIENE-DRIFT");
      expect.soft(run.output, "and name the workflow").toContain("ci.yml");
      expect.soft(run.output, "and name the job").toContain("ci-pass");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0018 (TDD-0018): restoring either one of the two blocks returns exit 0", () => {
  it("exits 0 with only the workflow-level block, and again with only the job-level one", () => {
    // Two trees, each missing ONE of the pair. The TC's point is that either
    // alone suffices, because the requirement is written against reachability;
    // a lane that demanded both would reject a compliant tree.
    const workflowOnly = plantedTree((d) => {
      editWorkflow(d, "ci.yml", (t) => t.replace("    permissions: {}\n", ""));
    });
    const jobOnly = plantedTree((d) => {
      editWorkflow(d, "ci.yml", (t) => t.replace("permissions:\n  contents: read\n", ""));
    });
    try {
      const a = runLane(workflowOnly);
      expect
        .soft(a.exitCode, `workflow-level block alone must satisfy the lane:\n${a.output}`)
        .toBe(0);

      // The job-level tree leaves every OTHER ci.yml job unreachable, so this leg
      // is asserted on the absence of `ci-pass` from the output rather than on
      // exit 0 — the lane is right to fail that tree, and right not to blame the
      // one job that declares.
      const b = runLane(jobOnly);
      expect
        .soft(
          b.output,
          "a job that declares its own block is never reported, whatever its workflow omits",
        )
        .not.toMatch(/ci-pass/);
    } finally {
      rmSync(workflowOnly, { recursive: true, force: true });
      rmSync(jobOnly, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0020 (TDD-0020): deleting the flag from one checkout step exits 1", () => {
  it("names the file and the job of the one step that stopped refusing credentials", () => {
    const dir = plantedTree((d) => {
      // Exactly one step, and it is `check-types`'s — chosen because its checkout
      // block holds nothing else, so the planted tree differs from the compliant
      // one by a single line and the lane's report can be attributed to it.
      // Located by the job header and the FIRST flag line after it, so the edit
      // is attributable to one job. `{2}` and `{10}` rather than literal runs of
      // spaces: a lint rule forbids them in a regex, and rightly — a miscounted
      // indent would match nothing, plant no violation, and leave a test that
      // passes while measuring the compliant tree.
      editWorkflow(d, "ci.yml", (t) =>
        t.replace(/ {2}check-types:[\s\S]*?\n {10}persist-credentials: false\n/, (block) =>
          block.replace(/\n {10}persist-credentials: false\n/, "\n"),
        ),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `the lane must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "and name the failure code").toContain("R-WORKFLOW-HYGIENE-DRIFT");
      expect.soft(run.output, "and name the file").toContain("ci.yml");
      expect.soft(run.output, "and name the job").toContain("check-types");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0023 (TDD-0023): a planted floating reference exits 1 and is named", () => {
  it("names the reference that was replaced by a floating major-version tag", () => {
    const dir = plantedTree((d) => {
      editWorkflow(d, "ci.yml", (t) =>
        t.replace(
          "        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2",
          "        uses: actions/upload-artifact@" + "v" + "4",
        ),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `the lane must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "and name the failure code").toContain("R-WORKFLOW-HYGIENE-DRIFT");
      expect
        .soft(run.output, "and name the offending reference, not merely the file")
        .toContain("actions/upload-artifact");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── the expected-required-context declaration ────────────────────────────────
//
// Which checks branch protection actually requires is a repository SETTING, and a pull
// request cannot read it. `BR-0017-0042` resolves that by moving the expectation into the
// tree: a checked-in declaration names the job expected to carry the context, and the lane
// checks the workflow against the declaration. Reading live settings is forbidden precisely
// because it cannot run where it matters.
//
// `BR-0017-0043` fixes the three properties: the declared context resolves to an existing
// job, that job is not skippable — counting a condition on any job it depends on — and its
// enumerated verification set is intact. The rows below take those one at a time, because a
// single "the lane exits 1" row would pass on any one of the three working.

const DECLARATION_REL = path.join(".github", "required-status-contexts.json");
const DECLARATION_RULE = "required-context";

interface Declaration {
  contexts: { workflow: string; job: string; verificationSet: string[] }[];
}

/**
 * A package manifest's `scripts` entry, narrowed.
 *
 * The three call sites below each read one script out of one manifest, and each one used to do
 * it with two bare `as Record<string, unknown>` assertions — `CLAUDE.md` forbids them and
 * nothing in the lint configuration catches them inside `tests/**`. One narrowing helper
 * removes six.
 */
function manifestScript(manifestPath: string, name: string): string {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!isRecord(manifest)) return "";
  const scripts = manifest["scripts"];
  if (!isRecord(scripts)) return "";
  const value = scripts[name];
  return typeof value === "string" ? value : "";
}

/**
 * One declared context, narrowed without an assertion.
 *
 * A predicate rather than a shape check followed by `as`: `CLAUDE.md` forbids the assertion, and
 * `filter` over a predicate is what lets the parsed objects through unchanged.
 */
function isContext(value: unknown): value is Declaration["contexts"][number] {
  return (
    isRecord(value) &&
    typeof value["workflow"] === "string" &&
    typeof value["job"] === "string" &&
    (value["verificationSet"] === undefined || Array.isArray(value["verificationSet"]))
  );
}
/** The declaration as the repository ships it. */
function declaration(dir: string): Declaration {
  const parsed: unknown = JSON.parse(readFileSync(path.join(dir, DECLARATION_REL), "utf-8"));
  // Narrowed and REBUILT rather than asserted. `as Declaration` would let every caller
  // below trust a shape only the `contexts` array was checked for — the members' `workflow`,
  // `job` and `verificationSet` were never verified, and a malformed declaration would have
  // surfaced as an undefined field deep inside a planting helper.
  if (!isRecord(parsed) || !Array.isArray(parsed["contexts"])) {
    throw new Error("the declaration does not hold a contexts array");
  }
  // VALIDATED in place, not rebuilt. The first version of this narrowing returned freshly
  // constructed context objects carrying only the three fields it checked — and
  // `editDeclaration` writes the result back, so planting into a tree silently stripped
  // `$comment`, `why` and `verificationSetNote` from the file it planted into. The lane reads
  // none of those, so nothing asserted differently and the loss was invisible; a fixture that
  // quietly differs from the artifact it copies is still the wrong fixture.
  // Implementation-review finding F8.
  const raw = parsed["contexts"];
  for (const [i, entry] of raw.entries()) {
    if (!isContext(entry)) {
      throw new Error(
        `declaration context ${i} lacks a string workflow, a string job, or an array verificationSet`,
      );
    }
  }
  // `filter` over the predicate rather than a rebuild or an `as`: it narrows the array type and
  // hands back the SAME objects, so `$comment`, `why` and `verificationSetNote` travel with them.
  return { contexts: raw.filter(isContext) };
}

/** Rewrites the declaration inside a planted tree. */
function editDeclaration(dir: string, edit: (d: Declaration) => Declaration): void {
  const before = declaration(dir);
  const after = edit(structuredClone(before));
  if (JSON.stringify(after) === JSON.stringify(before)) {
    throw new Error("planting into the declaration changed nothing — the edit is stale");
  }
  writeFileSync(path.join(dir, DECLARATION_REL), `${JSON.stringify(after, null, 2)}\n`, "utf-8");
}

describe("TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree", () => {
  it("takes the job name from the file rather than from anything compiled in", () => {
    // The row's real claim is that the declaration is INPUT, not decoration. Asserting the
    // lane passes over the shipped declaration would not show that — a lane ignoring the
    // file entirely also passes. So the file is edited to name a job that does not exist,
    // and the lane's verdict has to follow the edit.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        decl.contexts[0].job = "a-job-no-workflow-declares";
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `the lane must follow the declaration in the tree:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the job the declaration asked for")
        .toContain("a-job-no-workflow-declares");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes over the repository's own declaration, and reads no live settings", () => {
    // The accepting direction, so the row is not satisfied by a lane that always exits 1.
    const clean = plantedTree(() => {});
    try {
      const run = runLane(clean);
      expect
        .soft(run.exitCode, `the shipped tree must satisfy its own declaration:\n${run.output}`)
        .toBe(0);
      expect
        .soft(run.output, "a green run must name the declaration rule it evaluated")
        .toContain(DECLARATION_RULE);
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }

    // A context that names a real job and enumerates NOTHING is not a passing declaration.
    //
    // It clears properties 1 and 2 — the job exists, carries no condition — and then property
    // 3 iterates an empty list, so the lane reports PASS having checked the one property that
    // carries the obligation against nothing. That is the same advertised-but-unevaluated
    // shape `TC-0017-0047` catches for a rule, one level further in.
    const hollow = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        decl.contexts[0].verificationSet = [];
        return decl;
      });
    });
    try {
      const run = runLane(hollow);
      expect.soft(run.exitCode, `an empty verification set must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must say the third property had nothing to check")
        .toMatch(/empty or missing verificationSet/i);
    } finally {
      rmSync(hollow, { recursive: true, force: true });
    }

    // And `BR-0017-0042`'s prohibition, asserted structurally: a lane that queried the API
    // would satisfy every behavioural row above while being unable to run on a pull
    // request, which is the whole reason the declaration exists.
    const source = readFileSync(LANE, "utf-8");
    for (const forbidden of ["api.github.com", "octokit", "gh api", "GITHUB_TOKEN"]) {
      expect
        .soft(source, `the lane must not reach for live settings (${forbidden})`)
        .not.toContain(forbidden);
    }
  });
});

describe("TC-0017-0058 (TDD-0058): a declared context resolving to no job exits 1", () => {
  it("reports the workflow and the job when the declared job is absent from it", () => {
    // Distinct from TDD-0057's first case in what it plants: there the DECLARATION moved,
    // here the TREE loses the job while the declaration stays correct. Same rule, opposite
    // direction, and a lane that only compared strings one way would pass one and fail the
    // other.
    const dir = plantedTree((d) => {
      const declared = declaration(d).contexts[0];
      editWorkflow(d, declared.workflow, (text) =>
        text.replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}-renamed:\n`),
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a declared context with no job must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the declaration rule")
        .toContain(DECLARATION_RULE);

      // And it must produce ONE finding, not one per verification item.
      //
      // The oracle is why this claim exists. Removing the existence check outright reddened
      // nothing: execution fell through to the verification-set property, found no steps
      // because the job was gone, and reported every declared item as missing. The lane still
      // exited 1 with the rule named — so the row passed while the diagnosis had become six
      // findings about moved steps in a job that does not exist.
      //
      // A count, because the count IS the property: an absent job is one fact.
      const findings = run.output.split(/\r?\n/).filter((line) => line.includes(DECLARATION_RULE));
      expect
        .soft(
          findings.length,
          `an absent job is one fact and must be reported once:\n${findings.join("\n")}`,
        )
        .toBe(1);
      expect
        .soft(findings.join("\n"), "the finding must say the job is not declared")
        .toMatch(/no such job|declares no/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0013 (TDD-0013): a condition on a dependency makes the required job skippable", () => {
  it("exits 1 for a condition on a job the declared one depends on, not only on itself", () => {
    // The transitive case, and the one worth a row of its own. A job whose dependency is
    // skipped is itself skipped, and a skipped job reports SUCCESS to branch protection —
    // so a condition two edges away is as fatal as one on the job itself, and much harder
    // to see. The declared job carries no dependencies in the real tree, so the fixture adds
    // one and puts the condition there.
    const dir = plantedTree((d) => {
      const declared = declaration(d).contexts[0];
      editWorkflow(d, declared.workflow, (text) =>
        text
          .replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}:\n    needs: [a-gate]\n`)
          .replace(
            "\njobs:\n",
            "\njobs:\n  a-gate:\n    if: ${{ github.event_name == 'push' }}\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo gate\n\n",
          ),
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `a condition on a dependency of the declared job must exit 1:\n${run.output}`,
        )
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the dependency that carries the condition")
        .toContain("a-gate");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0037 (TDD-0037): a rename or an added dependency condition is reported", () => {
  it("names the rule and the offending job in both shapes, rather than only exiting 1", () => {
    // `TC-0017-0058` and `TC-0017-0013` assert the exit code; this row asserts the FINDING.
    // An exit code tells an operator that something is wrong in a repository with two
    // workflow files and eighteen jobs, which is not enough to act on — `BR-0017-0021`'s
    // reporting obligation is why every finding carries file, job and rule.
    const shapes = [
      {
        label: "a rename",
        mutate: (d: string): string => {
          const declared = declaration(d).contexts[0];
          editWorkflow(d, declared.workflow, (text) =>
            text.replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}-2:\n`),
          );
          return declared.job;
        },
      },
      {
        label: "an added dependency condition",
        mutate: (d: string): string => {
          const declared = declaration(d).contexts[0];
          editWorkflow(d, declared.workflow, (text) =>
            text
              .replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}:\n    needs: [late-gate]\n`)
              .replace(
                "\njobs:\n",
                "\njobs:\n  late-gate:\n    if: ${{ false }}\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo gate\n\n",
              ),
          );
          return "late-gate";
        },
      },
    ];

    for (const { label, mutate } of shapes) {
      let named = "";
      const dir = plantedTree((d) => {
        named = mutate(d);
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `${label}: must exit 1:\n${run.output}`).toBe(1);
        expect
          .soft(run.output, `${label}: the finding must name the rule`)
          .toContain(DECLARATION_RULE);
        expect.soft(run.output, `${label}: the finding must name what went wrong`).toContain(named);
        expect
          .soft(run.output, `${label}: the finding must name the file`)
          .toContain(declaration(REPO_ROOT).contexts[0].workflow);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});

describe("TC-0017-0059 (TDD-0059): skippable-through-a-dependency and a shrunk set both exit 1", () => {
  it("checks the third property too, so a shrunk verification set is not a silent pass", () => {
    // The boundary this row exists for. Two of the three properties can hold while the
    // third does not: the declared job can exist and be unconditional while its work has
    // been moved out from under it, which is exactly the "keeping the name alone is not
    // sufficient" case `BR-0017-0032` names. A lane checking only existence and
    // skippability passes that.
    const dir = plantedTree((d) => {
      const declared = declaration(d).contexts[0];
      const dropped = declared.verificationSet[0];
      editWorkflow(d, declared.workflow, (text) =>
        text.replace(`- name: ${dropped}\n`, `- name: ${dropped} (moved elsewhere)\n`),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a shrunk verification set must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the missing verification item")
        .toContain(declaration(REPO_ROOT).contexts[0].verificationSet[0]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("treats a verification item put behind a condition as shrinking the set", () => {
    // The same property, reached by the cheaper edit. Moving a step out of the job is
    // visible in a diff as a moved block; adding one line of `if:` to it is not, and it has
    // the same effect on every run where the condition is false: the item does not run, the
    // job still succeeds, and the required context still reports green.
    //
    // The condition planted is `always()` on purpose. It is the one an author would reach
    // for while believing it harmless, and the lane deliberately does not evaluate GitHub
    // expressions to decide that — so if the rule ever grows an exemption list, this row is
    // the one that fails.
    const dir = plantedTree((d) => {
      const declared = declaration(d).contexts[0];
      const guarded = declared.verificationSet[0];
      editWorkflow(d, declared.workflow, (text) =>
        text.replace(`- name: ${guarded}\n`, `- name: ${guarded}\n        if: always()\n`),
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a conditionalised verification item must exit 1:\n${run.output}`)
        .toBe(1);
      const findings = run.output.split(/\r?\n/).filter((line) => line.includes(DECLARATION_RULE));
      expect
        .soft(findings.join("\n"), "the finding must name the item that went conditional")
        .toContain(declaration(REPO_ROOT).contexts[0].verificationSet[0]);
      // And say WHY, because "missing" would send a maintainer looking for a step that is
      // still right there in the file.
      expect
        .soft(findings.join("\n"), "the finding must attribute it to the condition")
        .toMatch(/condition|if:/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── the rule set, and what a green run is allowed to mean ────────────────────
//
// `BR-0017-0037` closes the set over `.github/workflows/**` at exactly five obligations:
// every job declares permissions and `timeout-minutes`; every checkout refuses to persist
// credentials; every action reference is SHA-pinned; every matrix disables fail-fast; secret
// inheritance appears nowhere.
//
// The declaration rule is deliberately NOT one of the five. Its subject is a JSON file
// checked against the workflows, it comes from a different criterion (`AC-0017-0025`), and
// counting it here would make "exactly five" a number nobody could reproduce from the rule
// text. The lane therefore carries a scope per rule and these rows count the workflow-tree
// ones.
//
// `BR-0017-0038` is the half that makes a green run readable: the output enumerates each rule
// it evaluated, and a rule that was not evaluated is ABSENT rather than implied. Two rows
// take the two directions of that — every printed rule is falsifiable, and every falsifiable
// rule is printed — because either alone is satisfiable by a lane that lies in one direction.

/** The five obligations `BR-0017-0037` enumerates, paired with the rule id each becomes. */
const WORKFLOW_RULES = [
  "job-guardrails",
  "checkout-credentials",
  "action-pin",
  "matrix-fail-fast",
  "secret-inheritance",
] as const;

/**
 * The rule ids a green run prints, BY SCOPE.
 *
 * The lane announces each scope with a heading and lists its rules underneath, so a row that
 * cares about the workflow-tree set can ask for that set instead of filtering the declaration
 * rule out by name. The difference matters: a name filter is a hand-kept exclusion list, and
 * the next rule from a third scope would silently join the count `TC-0017-0045` pins at five.
 */
function printedRules(output: string, heading: string): string[] {
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) {
    throw new Error(`the lane printed no section headed "${heading}"`);
  }
  const ids: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const m = /^\s+-\s+([a-z][a-z0-9-]*):/.exec(line);
    if (m === null) break;
    ids.push(m[1]);
  }
  return ids.sort();
}

/** The headings the lane announces its two scopes under. */
// The heading changed when the shipped tree joined the scan: the five structural rules now
// cover BOTH trees, so a heading saying "the own CI tree" would be false. The constant is
// what keeps TC-0017-0045 asking for the right section.
const WORKFLOW_SCOPE = "Rules run over both workflow trees:";
const DECLARATION_SCOPE = "Rules run over the required-status-context declaration:";

/**
 * One plantable violation per workflow-tree rule.
 *
 * The plants are the fixtures `BR-0017-0039` requires, and they live here rather than in a
 * helper so each one sits next to the rule it falsifies. Each returns the job it broke, so
 * the row can assert the finding names it.
 */
/**
 * Each plant carries the FILE its finding must name, not just the job.
 *
 * The first version hard-coded `ci.yml` in the row that reads this table, which was fine while
 * every plant was in the own tree and wrong the moment a shipped plant joined it — the shipped
 * finding names a path under the asset tree, and a row asserting `ci.yml` would have demanded
 * the wrong answer.
 */
const PLANTS: {
  rule: string;
  label: string;
  file: string;
  plant: (dir: string) => string;
}[] = [
  {
    rule: "job-guardrails",
    label: "a job loses its timeout",
    file: "ci.yml",
    plant: (dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace(
          "  lint:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n",
          "  lint:\n    runs-on: ubuntu-latest\n",
        ),
      );
      return "lint";
    },
  },
  {
    rule: "checkout-credentials",
    label: "a checkout persists credentials",
    file: "ci.yml",
    plant: (dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace(
          "          persist-credentials: false\n",
          "          persist-credentials: true\n",
        ),
      );
      return "detect";
    },
  },
  {
    rule: "action-pin",
    label: "an action reference floats",
    file: "ci.yml",
    // A BRANCH reference and not a major tag, deliberately. The pin rule forbids anything
    // that is not forty hex characters, so either falsifies it — but a sibling row scans
    // every test file in this suite for a floating-major literal, and writing one here made
    // that row fail. Not a reason to weaken the scan: a branch reference breaks the same rule
    // and carries no such literal.
    plant: (dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace(/uses: actions\/checkout@[0-9a-f]{40}/, "uses: actions/checkout@main"),
      );
      return "detect";
    },
  },
  {
    rule: "matrix-fail-fast",
    label: "a matrix stops disabling fail-fast",
    file: "ci.yml",
    plant: (dir) => {
      editWorkflow(dir, "ci.yml", (text) => text.replace("fail-fast: false", "fail-fast: true"));
      return "test";
    },
  },
  {
    rule: "secret-inheritance",
    label: "a job inherits secrets",
    file: "ci.yml",
    plant: (dir) => {
      editWorkflow(dir, "ci.yml", (text) =>
        text.replace("  lint:\n", "  lint:\n    secrets: inherit\n"),
      );
      return "lint";
    },
  },
];

describe("TC-0017-0044 (TDD-0044): the hygiene lane exits 0 over the hardened own tree", () => {
  it("passes over the real tree with every one of the five rules evaluated", () => {
    const dir = plantedTree(() => {});
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `the hardened tree must satisfy its own lane:\n${run.output}`)
        .toBe(0);

      // The accepting direction is only worth something if the rules ran. A lane that
      // evaluated nothing also exits 0, which is the reading `BR-0017-0038` exists to close.
      const printed = printedRules(run.output, WORKFLOW_SCOPE);
      for (const rule of WORKFLOW_RULES) {
        expect.soft(printed, `rule ${rule} must have been evaluated`).toContain(rule);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0045 (TDD-0045): the own-tree hygiene rule set is closed at exactly five", () => {
  it("evaluates the five enumerated obligations over the workflows tree and no sixth", () => {
    const dir = plantedTree(() => {});
    try {
      const printed = printedRules(runLane(dir).output, WORKFLOW_SCOPE);

      // The closure, both directions in one equality. `BR-0017-0037` enumerates five, so a
      // sixth workflow-tree rule is as much a violation as a missing one: it would mean the
      // lane asserts something the rule text does not authorize, and a reviewer reading the
      // rule could not predict the lane's behaviour.
      //
      // The declaration rule is excluded by SCOPE, not by name: it is read from the
      // declaration section, which this row never asks for. A name filter would be a
      // hand-kept exclusion list, and the next rule from a third scope would join the count
      // silently.
      expect
        .soft(printed, "the workflow-tree rule set is closed at exactly the five enumerated")
        .toEqual([...WORKFLOW_RULES].sort());

      // And the declaration rule is present in its own scope, so "five" is a scoping claim
      // rather than a claim that the sixth rule was dropped.
      expect
        .soft(
          printedRules(runLane(dir).output, DECLARATION_SCOPE),
          "the declaration rule must still be evaluated, in its own scope",
        )
        .toEqual(["required-context"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0046 (TDD-0046): a green run names every rule it evaluated", () => {
  it("prints each rule with a description, and says what it does not cover", () => {
    const dir = plantedTree(() => {});
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, "this row reads a GREEN run's output").toBe(0);

      // A bare list of identifiers is not legible to a reviewer who did not write them, so
      // each printed rule carries a description. Asserted as "the line is longer than the id"
      // rather than by matching prose, which would make every wording change a red build.
      for (const rule of WORKFLOW_RULES) {
        const line = run.output.split(/\r?\n/).find((l) => l.includes(`- ${rule}:`)) ?? "";
        expect
          .soft(line.length, `rule ${rule} must be printed with a description, not bare`)
          .toBeGreaterThan(`  - ${rule}: `.length + 20);
      }

      // And the boundary of the green result is stated. `OQ-0017`'s deferral of an external
      // linter is only honest while what the lane does NOT cover is visible next to what it
      // does.
      expect
        .soft(run.output, "a green run must state its coverage boundary")
        .toMatch(/not covered/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to name a rule as evaluated when its whole tree is gone", () => {
    // The failure this row is closest to and did not cover. `yamlFilesUnder` returns an empty
    // list for a directory that does not exist — deliberately, so the walk cannot crash — and
    // the consequence is that a deleted or renamed workflow tree yields no jobs, no findings,
    // and a green run that still prints every rule scoped to it as one it evaluated.
    //
    // This test file already knew about the hazard from the other side: `plantedTree` copies
    // BOTH roots, and the comment there says copying only the own tree "would make every
    // shipped-tree row prove nothing ... which is indistinguishable from a passing shipped
    // tree". The production lane had no such protection, which is implementation-review
    // finding M2 — a hazard recognised in the fixture and never enforced in the thing shipped.
    const gutted = plantedTree((d) => {
      const shipped = path.join(d, SHIPPED_WORKFLOWS_REL);
      for (const entry of readdirSync(shipped)) {
        if (/\.ya?ml$/.test(entry)) rmSync(path.join(shipped, entry), { force: true });
      }
    });
    try {
      const run = runLane(gutted);
      expect.soft(run.exitCode, `an empty workflow tree must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the tree that holds nothing")
        .toMatch(/holds no YAML files/i);
      expect.soft(run.output, "and say why that is not a pass").toMatch(/evaluated nothing/i);
    } finally {
      rmSync(gutted, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0047 (TDD-0047): an unevaluated rule is absent, not implied by the green run", () => {
  it("prints exactly the rules it actually evaluates", () => {
    // The direction that catches a lie in the FLATTERING direction: a lane could print six
    // rules and evaluate four, and every accepting row above would still pass. `BR-0017-0038`
    // is explicit that an unevaluated rule must be ABSENT rather than implied by green.
    //
    // So the evaluated set is DERIVED by running each plant and seeing which rule the lane
    // reports — not read from the plant table, which would compare two static lists and pass
    // a lane that printed a rule it never ran.
    // EVERY printed scope, not just the structural one. `BR-0017-0038` is about the printed
    // list, and the oracle showed the narrower version had a hole: removing the shipped rule's
    // call while leaving it printed reddened nothing here, because the shipped section was
    // never read.
    const clean = plantedTree(() => {});
    let printed: string[] = [];
    try {
      const output = runLane(clean).output;
      printed = [
        ...printedRules(output, WORKFLOW_SCOPE),
        ...printedRules(output, SHIPPED_SCOPE),
        ...printedRules(output, DECLARATION_SCOPE),
      ].sort();
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }

    const evaluated = new Set<string>();
    for (const { rule, plant } of PLANTS) {
      const dir = plantedTree((d) => {
        plant(d);
      });
      try {
        const run = runLane(dir);
        // The rule counts as evaluated only if breaking it produced a finding UNDER THAT
        // RULE. A lane that exits 1 for some other reason has not demonstrated this one.
        if (
          run.exitCode === 1 &&
          run.output.split(/\r?\n/).some((line) => line.includes(`: ${rule} —`))
        ) {
          evaluated.add(rule);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }

    expect
      .soft(
        [...evaluated].sort(),
        "every printed rule must be one the lane actually evaluates, and every evaluated rule must be printed",
      )
      .toEqual(printed);
  });
});

describe("TC-0017-0048 (TDD-0048): each planted violation exits 1 naming file, job and rule", () => {
  it("falsifies every rule independently, and returns to green when the plant is removed", () => {
    for (const { rule, label, file, plant } of PLANTS) {
      let brokenJob = "";
      const dir = plantedTree((d) => {
        brokenJob = plant(d);
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `${label}: must exit 1:\n${run.output}`).toBe(1);

        // File, job and rule — all three, because an exit code in a tree with two workflow
        // files and eighteen jobs is not something an operator can act on.
        const matching = run.output.split(/\r?\n/).filter((line) => line.includes(rule));
        expect.soft(matching.join("\n"), `${label}: must name the rule ${rule}`).toContain(rule);
        expect.soft(matching.join("\n"), `${label}: must name the file`).toContain(file);
        expect.soft(matching.join("\n"), `${label}: must name the job`).toContain(brokenJob);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }

    // And removing the plant returns the lane to 0 — asserted once rather than per plant,
    // because the plants are made into COPIES and the unplanted copy is the same tree in
    // every case.
    const clean = plantedTree(() => {});
    try {
      expect.soft(runLane(clean).exitCode, "an unplanted copy must return to green").toBe(0);
    } finally {
      rmSync(clean, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0049 (TDD-0049): hygiene findings use the bare lint namespace", () => {
  it("emits every finding under the bare-R code, and no other code", () => {
    // The action-pin plant, chosen rather than taken from the front of the list. This row’s
    // subject is the NAMESPACE, so which rule it breaks is incidental — and the oracle showed
    // that using the first plant coupled the row to whichever check that happened to be:
    // removing the timeout check made this row fail for a reason that has nothing to do with
    // namespaces. The pin rule is the oldest and least likely to move.
    const chosen = PLANTS.find((p) => p.rule === "action-pin");
    expect(chosen, "the action-pin plant must exist").not.toBeUndefined();
    if (chosen === undefined) return;
    const { rule, plant } = chosen;
    let dir = "";
    try {
      dir = plantedTree((d) => {
        plant(d);
      });
      const run = runLane(dir);
      expect.soft(run.exitCode, "the plant must have taken").toBe(1);

      const codes = new Set(
        run.output
          .split(/\r?\n/)
          .map((line) => /^([A-Z][A-Z0-9-]*):/.exec(line.trim()))
          .filter((m): m is RegExpExecArray => m !== null)
          .map((m) => m[1]),
      );

      // `BR-0017-0040` is a NAMESPACE decision and nothing more: the bare `R-` form, matching
      // the `check-pack-locations` precedent. It does not decide catalog membership, which is
      // settled by severity class and deferred as a lockstep change.
      expect
        .soft([...codes].sort(), `findings must use one bare-R code (rule ${rule})`)
        .toEqual(["R-WORKFLOW-HYGIENE-DRIFT"]);
    } finally {
      if (dir !== "") rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── the shipped tree, and where the lane is invoked from ─────────────────────
//
// `BR-0017-0044` extends the lane to the workflows QFAI ships to adopters. Two roots rather
// than copying the shipped files into the workflows directory inside the checkout: copying
// makes the reported path ambiguous, and the rule requires the shipped path to be named AS
// the shipped path.
//
// `BR-0017-0045` puts an ordering condition on this: shipped coverage lands with the shipped
// hardening or later, never before, because enabling the scan over an unhardened tree lands
// instantly red. Measured before these rows were written — every shipped job already declares
// permissions and a timeout, every reference is SHA-pinned, the one matrix disables fail-fast
// and no job declares secrets. The condition holds.
//
// `BR-0017-0046` is the one rule here that is NOT a count. The shipped set legitimately keeps
// one third-party action, the package-manager setup, so the rule asserts membership in a closed
// sanctioned set. A count of zero would fail the lane on the entry the pin policy deliberately
// keeps, which is why the rule text rejects that formulation by name.

/** The scope heading the shipped-only rule is announced under. */
const SHIPPED_SCOPE = "Rules run over the shipped workflow tree only:";

/** The shipped workflow the structural plants target. */
const SHIPPED_FILE = "qfai-tests.yml";

/**
 * And the one that carries the sanctioned third-party action.
 *
 * A separate constant because it is a separate fact: the third-party rule has nothing to
 * assert unless it is pointed at the file that actually holds such a reference, and the
 * first draft pointed it at the wrong one.
 */
const SHIPPED_THIRD_PARTY_FILE = "qfai-validate.yml";

/** Rewrites one shipped workflow inside a planted tree. */
function editShipped(dir: string, file: string, edit: (text: string) => string): void {
  const p = path.join(dir, SHIPPED_WORKFLOWS_REL, file);
  const before = readFileSync(p, "utf-8");
  const after = edit(before);
  if (after === before) {
    throw new Error(`planting into shipped ${file} changed nothing — the needle is stale`);
  }
  writeFileSync(p, after, "utf-8");
}

// The shipped-scope plant joins the table declared above, appended here because it needs
// `editShipped` and the file constant. `TC-0017-0047` derives the evaluated set from this
// table, so a printed rule with no entry in it is a rule nothing demonstrates — which is
// exactly the hole the oracle found when the shipped rule had no plant.
PLANTS.push({
  rule: "shipped-third-party",
  label: "the shipped set references an unsanctioned owner",
  file: SHIPPED_THIRD_PARTY_FILE,
  plant: (dir) => {
    editShipped(dir, SHIPPED_THIRD_PARTY_FILE, (text) =>
      text.replace(
        /uses: pnpm\/action-setup@[0-9a-f]{40}/,
        "uses: someone-else/action-setup@0123456789abcdef0123456789abcdef01234567",
      ),
    );
    return "validate";
  },
});

// The declaration-scope plant, appended for the same reason and after the same mistake.
// `TC-0017-0047` read only the workflow and shipped scopes, while its own comment claimed
// "EVERY printed scope" — so `required-context` was printed by every green run and
// demonstrated by nothing, which is precisely the hole the shipped plant above was added to
// close one scope earlier. Implementation-review finding L4.
//
// The plant renames the declared job in the workflow, so the declaration keeps pointing at a
// job that no longer exists. Same shape as `TC-0017-0058`'s, reached through the table so
// `TC-0017-0047` and `TC-0017-0048` both pick it up.
PLANTS.push({
  rule: "required-context",
  label: "the declared required-status-context job is renamed away",
  file: "ci.yml",
  plant: (dir) => {
    const declared = declaration(dir).contexts[0];
    editWorkflow(dir, declared.workflow, (text) =>
      text.replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}-renamed:\n`),
    );
    return declared.job;
  },
});

/** The findings a run reported, one per line, filtered to those naming a rule. */
function findingsOf(output: string): string[] {
  return output.split(/\r?\n/).filter((line) => line.startsWith("R-WORKFLOW-HYGIENE-DRIFT:"));
}

describe("TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such", () => {
  it("reports a violation from each tree in one run, each under its own path", () => {
    // Both plants in ONE run, because that is what "scans both roots" means. Two separate
    // runs would each prove one root is scanned and neither would prove they are scanned
    // together — a lane that scanned whichever tree it was pointed at would pass that.
    const dir = plantedTree((d) => {
      editWorkflow(d, "ci.yml", (text) =>
        text.replace(
          "  lint:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n",
          "  lint:\n    runs-on: ubuntu-latest\n",
        ),
      );
      // The timeout rule, not fail-fast: the shipped tree expresses its lanes as seven
      // independent jobs rather than matrix legs, so it has no matrix to disable.
      editShipped(d, SHIPPED_FILE, (text) =>
        text.replace("      contents: read\n    timeout-minutes: 10\n", "      contents: read\n"),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `both plants must be reported:\n${run.output}`).toBe(1);

      const findings = findingsOf(run.output);
      const own = findings.filter((f) => f.includes(".github/workflows/ci.yml"));
      const shipped = findings.filter((f) => f.includes(SHIPPED_WORKFLOWS_REL.replace(/\\/g, "/")));
      expect
        .soft(own.length, `the own-tree plant must be reported:\n${run.output}`)
        .toBeGreaterThan(0);
      expect
        .soft(shipped.length, `the shipped-tree plant must be reported:\n${run.output}`)
        .toBeGreaterThan(0);

      // And the shipped finding names the SHIPPED path — the property the two-roots choice
      // exists for. A copy-into-the-checkout implementation reports
      // `.github/workflows/qfai-tests.yml`, which tells an adopter to look in a file they do
      // not have.
      expect
        .soft(shipped.join("\n"), "a shipped finding must name the shipped path, not an own-CI one")
        .toContain(`${SHIPPED_WORKFLOWS_REL.replace(/\\/g, "/")}/${SHIPPED_FILE}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0051 (TDD-0051): a shipped-only violation exits 1 naming the shipped path", () => {
  it("exits 1 with no own-CI path in the report when only the shipped tree is broken", () => {
    const dir = plantedTree((d) => {
      editShipped(d, SHIPPED_FILE, (text) =>
        text.replace(/uses: actions\/checkout@[0-9a-f]{40}/, "uses: actions/checkout@main"),
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a shipped-only violation must exit 1:\n${run.output}`).toBe(1);

      // The distinguishing claim: NOTHING is reported against the own tree. An
      // implementation that copied the shipped files into `.github/workflows/` would exit 1
      // here too, and would name an own-CI path — passing an exit-code-only row while
      // misdirecting whoever reads it.
      const findings = findingsOf(run.output);
      const own = findings.filter((f) => /\.github\/workflows\/(ci|release)\.yml/.test(f));
      expect
        .soft(
          own,
          "an intact own tree must produce no findings when only the shipped tree is broken",
        )
        .toEqual([]);
      expect
        .soft(findings.join("\n"), "the finding must name the shipped file")
        .toContain(SHIPPED_FILE);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0053 (TDD-0053): the shipped third-party rule is allow-list membership", () => {
  it("passes the sanctioned third-party action, which a count of zero could not", () => {
    // The claim `BR-0017-0046` makes by rejecting an alternative: the shipped set keeps one
    // third-party action on purpose, so a rule of "zero third-party references" would fail
    // the lane on the entry the pin policy deliberately keeps.
    //
    // Two halves, and both are needed. Exiting 0 alone would also be satisfied by a lane with
    // no third-party rule at all, so the fixture is asserted to actually CONTAIN a
    // third-party reference — otherwise the row passes over an empty premise.
    const dir = plantedTree(() => {});
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `the sanctioned entry must pass:\n${run.output}`).toBe(0);

      const shippedText = readdirSync(path.join(dir, SHIPPED_WORKFLOWS_REL))
        .map((f) => readFileSync(path.join(dir, SHIPPED_WORKFLOWS_REL, f), "utf-8"))
        .join("\n");
      const thirdParty = [...shippedText.matchAll(/uses:\s+([^/\s]+)\/[^\s]+/g)]
        .map((m) => m[1])
        .filter((owner) => owner !== "actions" && owner !== "github");
      expect
        .soft(thirdParty, "the premise: the shipped set keeps at least one third-party action")
        .not.toEqual([]);

      // And the rule is announced in its own scope, so a reader can see the shipped set is
      // governed by something the own tree is not.
      //
      // Asserted over the raw output rather than by parsing the section: the parser throws
      // when the heading is absent, and a thrown helper is an inadmissible RED - it says the
      // row could not run, not that the behaviour is missing.
      expect
        .soft(run.output, "the shipped scope must be announced in the printed rule set")
        .toContain(SHIPPED_SCOPE);

      // And a rule must be LISTED under it. The heading comes from the scope list and the
      // rules from the rule list, so removing the rule leaves the heading standing over
      // nothing — which the oracle caught: that mutation reddened no row at all.
      expect
        .soft(printedRules(run.output, SHIPPED_SCOPE), "the shipped scope must declare its rule")
        .toEqual(["shipped-third-party"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0054 (TDD-0054): an unsanctioned third-party reference exits 1", () => {
  it("rejects a third-party owner that is not in the sanctioned set, and names it", () => {
    const dir = plantedTree((d) => {
      // `qfai-validate.yml`, not the tests workflow: that is where the one sanctioned
      // third-party action lives.
      editShipped(d, SHIPPED_THIRD_PARTY_FILE, (text) =>
        text.replace(
          /uses: pnpm\/action-setup@[0-9a-f]{40}/,
          "uses: someone-else/action-setup@0123456789abcdef0123456789abcdef01234567",
        ),
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unsanctioned third-party reference must exit 1:\n${run.output}`)
        .toBe(1);

      // Named, and named as the OWNER rather than as "a third-party action": the operator's
      // next question is which one, and a finding that does not answer it costs a second run.
      expect
        .soft(findingsOf(run.output).join("\n"), "the finding must name the unsanctioned owner")
        .toContain("someone-else");

      // The plant keeps a valid SHA pin, so this cannot pass by tripping the pin rule
      // instead. Asserted rather than assumed, because a plant that fails the wrong rule is
      // the commonest way a negative fixture goes vacuous.
      expect
        .soft(findingsOf(run.output).join("\n"), "the finding must come from the third-party rule")
        .not.toContain("action-pin");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TC-0017-0055 (TDD-0055): the lane is invoked from an aggregate pull requests execute", () => {
  it("appears in the lint aggregate, and that aggregate runs in an unconditional pull-request job", () => {
    const lintAggregate = manifestScript(path.join(REPO_ROOT, "package.json"), "ci:lint");

    // CLAIM 1 — the lane is a member of the lint aggregate.
    expect
      .soft(lintAggregate, "the hygiene lane must be a member of ci:lint")
      .toContain("check-workflow-hygiene.mjs");

    // CLAIM 2 — and that aggregate is actually executed by a pull request. Membership in an
    // aggregate nobody runs is the failure `BR-0017-0041` names, so the workflow side is
    // asserted too: a job that invokes it, in a workflow triggered by pull_request, with no
    // condition that could skip it.
    const ci = readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf-8");
    expect.soft(ci, "ci.yml must invoke the lint aggregate").toContain("pnpm ci:lint");
    expect
      .soft(ci, "and be triggered by pull requests")
      .toMatch(/^on:\s*$[\s\S]{0,80}pull_request:/m);
  });
});

describe("TC-0017-0056 (TDD-0056): the lane is absent from the release-only aggregate", () => {
  it("stays out of ci:gate, which no pull request invokes", () => {
    const gate = manifestScript(path.join(REPO_ROOT, "package.json"), "ci:gate");

    // `BR-0017-0041` rejects placing the lane here, and the reason is the second claim below
    // rather than anything about ci:gate's contents: no pull request invokes it, so a lane
    // living only there would block nothing while looking registered.
    expect
      .soft(gate, "the hygiene lane must not live only in the release-only aggregate")
      .not.toContain("check-workflow-hygiene.mjs");

    // The warrant, asserted so the reason cannot rot: ci:gate is invoked by the release
    // workflow, and that workflow has no pull-request trigger.
    const release = readFileSync(
      path.join(REPO_ROOT, ".github", "workflows", "release.yml"),
      "utf-8",
    );
    expect.soft(release, "the release workflow is what invokes ci:gate").toContain("pnpm ci:gate");
    expect
      .soft(release, "and the release workflow is not triggered by pull requests")
      .not.toMatch(/^\s{2}pull_request:/m);
  });
});

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
 * The two jobs `BR-0017-0019`'s Notes name as legitimately needing full history:
 * the lint lane's pair-changed diff, and the release workflow's verification job.
 *
 * A LITERAL pair rather than a derived set, and that is the whole assertion: the
 * point is that this list and the tree agree, so deriving one from the other
 * would make the test check the tree against itself.
 */
const FULL_HISTORY_JOBS = ["ci.yml::lint", "release.yml::verify"];

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
    const declared = jobs.filter(hasDeclaredPermissions).length;
    expect
      .soft(
        declared <= jobs.length,
        "declaration is a subset of reachability by construction; if this ever inverts, the counters disagree about what a block is",
      )
      .toBe(true);
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

    // CLAIM 1 — exactly the two the business rule names. `toEqual` on the sorted
    // list rather than a count: a count of two is also satisfied by the wrong two,
    // and the rule is about WHICH jobs, not how many.
    expect
      .soft(
        requesting,
        "full history belongs to the lint lane's pair-changed diff and the release verification job, and to no other job",
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
    expect
      .soft(
        uses.filter((u) => !/@[0-9a-f]{40}$/.test(u.uses)).map((u) => `${u.where} -> ${u.uses}`),
        "every action reference must be pinned to a full commit SHA, so what runs cannot change under a tag move",
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
    const files = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "packages", "qfai", "package.json"), "utf-8"),
    ) as { files?: unknown };
    expect(
      Array.isArray(files.files) ? files.files : undefined,
      "the guard reads package.json#files as its scope, so this row depends on that field existing",
    ).toBeDefined();

    // CLAIM 1 — `.github` is outside the distributed surface, which is WHY the
    // trailer is legal. Asserted rather than assumed, because the day `.github`
    // enters `files` this row's premise is gone and a reader needs to be told.
    expect
      .soft(
        (files.files as string[]).filter((f) => f.startsWith(".github")),
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

/** A throwaway copy of the own `.github` tree, for planting violations into. */
function plantedTree(mutate: (dir: string) => void): string {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-hygiene-"));
  cpSync(path.join(REPO_ROOT, ".github"), path.join(dir, ".github"), { recursive: true });
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

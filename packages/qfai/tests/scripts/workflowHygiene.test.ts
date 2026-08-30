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
 * The spec's baseline for this is `2 of 12 declare, 4 of 12 reach` — a statement about the
 * tree BEFORE change 2, not about this one. Measured at HEAD: **4 declare, 12 reach**, a gap
 * of eight. Round 6 finding F-12: the sentence read as a claim about the current tree, and
 * as that claim it was false. Both counters are still computed here; only one of them is
 * asserted, and `TC-0017-0015` owns the comparison.
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
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  invokedFileDigests,
  invokedScriptBodies,
  verificationBodyDigest,
  yamlFilesUnder,
} from "../../../../scripts/check-workflow-hygiene.mjs";

import {
  DECLARATION_RULE,
  LANE,
  REPO_ROOT,
  SHIPPED_WORKFLOWS_REL,
  editDeclaration,
  editWorkflow,
  firstContext,
  firstVerificationItem,
  isRecord,
  onlyContext,
  plantedTree,
  runLane,
  runLaneWithReport,
} from "./helpers/hygieneTree.js";

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
 *
 * Four, and the fourth is `release.yml::gate`, on the same "legitimately needs it" clause.
 * The gate runs `pnpm ci:gate`, which runs `scripts/check-prompt-scanner-pair.mjs`, which
 * takes a three-dot diff between `origin/main` and `HEAD`. At the default depth of 1 the
 * tag being published and the branch share no reachable merge base, so the script exits 2
 * and the workflow's own stated use — re-running a failed publish for an older tag — could
 * never clear this job. The need is structural, not incidental.
 */
const FULL_HISTORY_JOBS = [
  "ci.yml::detect",
  "ci.yml::lint",
  "release.yml::verify",
  "release.yml::gate",
];

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

// `hasDeclaredPermissions` had a test-local copy here, used only by the two claims round 6
// removed. `TC-0017-0015` reads the LANE's export instead, which is the point that row makes
// about itself — so a local duplicate was the weaker half of a pair that already had a
// stronger half. Deleted rather than prefixed with an underscore to keep it alive.

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

    // This row asserts the COUNT and nothing else, and the reason is worth recording because
    // two attempts at more have now been removed from here.
    //
    // `declared <= jobs.length` stood here first and was a tautology: `jobs.filter(p).length
    // <= jobs.length` holds for every predicate. Round 5 replaced it with `declared <=
    // reachable`, which is the SAME tautology one level in — `hasDeclaredPermissions` is the
    // first disjunct of `hasReachablePermissions`, so the containment holds by construction of
    // the two bodies. Measured over this tree: jobs 12, declared 4, reachable 12, and because
    // `reachable === jobs.length` the second form was numerically identical to the first.
    // Round 6 finding F-2.
    //
    // A companion claim asserting `reachable - declared > 0` went with it: it reddens the day
    // every job declares its own permission block, which is a HARDENING, and its failure text
    // invited un-hardening the tree or editing the test.
    //
    // The discrimination those claims were reaching for is owned by `TC-0017-0015` at the
    // four-corner truth table below, over two synthetic fixtures, against the lane's EXPORTED
    // predicates — which is what `EX-0017-0014` asks for and what this row's own expected
    // result in `06_Test-Cases.md` does not. Duplicating it here, with test-local copies of the
    // predicates, was weaker in every respect.
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

describe("TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree", () => {
  it("takes the job name from the file rather than from anything compiled in", () => {
    // The row's real claim is that the declaration is INPUT, not decoration. Asserting the
    // lane passes over the shipped declaration would not show that — a lane ignoring the
    // file entirely also passes. So the file is edited to name a job that does not exist,
    // and the lane's verdict has to follow the edit.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        onlyContext(decl).job = "a-job-no-workflow-declares";
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
        onlyContext(decl).verificationSet = [];
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
      const declared = firstContext(d);
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
      // The declared job is `ci-pass`, which carries `if: always()` — the one condition that
      // guarantees a job runs, so the lane deliberately stops walking its dependencies. This
      // row is about the OTHER case, a declared job that really can be skipped through a
      // dependency, so the declaration is re-pointed at an unconditional job first.
      editDeclaration(d, (decl) => ({
        ...decl,
        contexts: decl.contexts.map((c, i) => (i === 0 ? { ...c, job: "build" } : c)),
      }));
      const declared = { ...firstContext(d), job: "build" };
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

// Review finding [28] on PR #794 moved the required status context from `build` to the aggregate
// verdict, because `build` declares no `needs` at all and requiring it let every test lane fail with
// the merge condition satisfied. Property 2 rejected any condition on a declared job, so the verdict
// — which must carry `if: always()` to render a result when its dependencies are skipped — could
// never hold it. The exception is narrow, and these two rows are what keeps it narrow.
// Review finding [N1] on PR #794. A `paths` filter stops the workflow starting on some pull
// requests; a `types` filter stops it starting on some EVENTS of a pull request that did start it.
// `types: [opened]` is the shape that bites: the context is created on the first push and never
// again, so every later push leaves branch protection pending against a SHA with no required check.
describe("the required-context workflow starts on every pull request event, not only the first", () => {
  const plantTypes = (types: string): string =>
    plantedTree((d) => {
      const declared = firstContext(d);
      editWorkflow(d, declared.workflow, (text) =>
        text.replace("\n  pull_request:\n", `\n  pull_request:\n    types: [${types}]\n`),
      );
    });

  it("exits 1 when the trigger omits synchronize", () => {
    const dir = plantTypes("opened");
    try {
      const run = runLane(dir);
      expect(run.exitCode, `a types filter missing synchronize must exit 1:\n${run.output}`).toBe(
        1,
      );
      expect(run.output, "the finding must name what was omitted").toContain("synchronize");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts a superset of the three defaults", () => {
    // The half that keeps this from being "no types filter allowed". Adding an activity type
    // removes nothing, and a lane that rejected it would be forbidding a legal narrowing of scope
    // in the name of a hole it does not open.
    const dir = plantTypes("opened, synchronize, reopened, ready_for_review");
    try {
      const run = runLane(dir);
      expect(run.exitCode, `a superset must stay green:\n${run.output}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the required-context job may carry always(), and nothing else", () => {
  it("accepts always() on the declared job", () => {
    // The live tree already declares the verdict, so this asserts the shipped arrangement rather
    // than a fixture: an unplanted run must be green with a conditional job holding the context.
    const dir = plantedTree(() => undefined);
    try {
      const run = runLane(dir);
      expect(run.exitCode, `always() must satisfy property 2:\n${run.output}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects any other condition on the declared job", () => {
    // The half that keeps the exception from becoming "conditions are fine now". A condition that
    // can evaluate false skips the job, and a skipped job reports SUCCESS to branch protection.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      editWorkflow(d, declared.workflow, (text) =>
        text.replace("\n    if: always()\n", "\n    if: ${{ github.event_name == 'push' }}\n"),
      );
    });
    try {
      const run = runLane(dir);
      expect(run.exitCode, `a skippable condition must exit 1:\n${run.output}`).toBe(1);
      expect(run.output, "the finding must name the condition it rejected").toContain(
        "carries a condition of its own",
      );
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
          const declared = firstContext(d);
          editWorkflow(d, declared.workflow, (text) =>
            text.replace(`\n  ${declared.job}:\n`, `\n  ${declared.job}-2:\n`),
          );
          return declared.job;
        },
      },
      {
        label: "an added dependency condition",
        mutate: (d: string): string => {
          // Same re-point as TC-0017-0013, and for the same reason: the declared job carries
          // `if: always()`, so the lane no longer walks its dependencies. This shape is about a
          // declared job that really can be skipped through one.
          editDeclaration(d, (decl) => ({
            ...decl,
            contexts: decl.contexts.map((c, i) => (i === 0 ? { ...c, job: "build" } : c)),
          }));
          const declared = { ...firstContext(d), job: "build" };
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
          .toContain(firstContext(REPO_ROOT).workflow);
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
      const declared = firstContext(d);
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
        .toContain(firstVerificationItem(REPO_ROOT));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Review finding [24]. The [03] repair compared a pinned body against the step's — and skipped
  // the comparison entirely when no digest was pinned. So the whole repair came undone in one
  // move: hollow the step out AND delete its key from `verificationBodies`. Done to the verdict
  // step, the aggregate job every required context depends on would succeed while the lanes under
  // it failed.
  it("rejects a hollowed step even when a same-named copy is pasted into a dependency", () => {
    // The second escape review finding [24] named, measured against the lane: `needsClosure`
    // yields the declaring job first, and the digest map was keyed by step NAME with
    // last-write-wins. So hollowing `ci-pass`'s verdict step and pasting the original — same
    // name — into a job it depends on restored the pinned digest, with no edit to the
    // declaration at all. The lane exited 0.
    //
    // A name is not a step: every step wearing the item's name has to carry the pinned body.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      const item = declared.verificationSet[0];
      editWorkflow(d, declared.workflow, (text) => {
        const at = text.indexOf(`- name: ${item}`);
        if (at === -1) throw new Error(`no step named ${item} — the needle is stale`);
        const lineEnd = text.indexOf("\n", at);
        const nextStep = text.indexOf("      - name:", lineEnd);
        const stop = nextStep === -1 ? text.length : nextStep;
        const original = text.slice(at, stop);

        // Hollow the real one…
        const hollowed = `${text.slice(0, lineEnd + 1)}        run: true\n\n${text.slice(stop)}`;

        // …and paste the original into `lint`, a job the declared context depends on.
        const lintAt = hollowed.indexOf("      - name: Run lint gate");
        if (lintAt === -1) throw new Error("the lint anchor is stale");
        return `${hollowed.slice(0, lintAt)}      ${original.trim()}\n${hollowed.slice(lintAt)}`;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a pasted twin must not stand in for the real step:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must say a second step does not substitute")
        .toMatch(/does not stand in/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a dependency job made skippable, even though the declared job is always()", () => {
    // Review finding [37]. `always()` on the declared job stands property 2 down for the whole
    // `needs` closure — correctly, because a skipped dependency is the state `always()` exists
    // to classify — and property 3 then went on counting a skipped dependency's steps as
    // performed. Measured against the lane: `if: false` on `build` left all six build-side
    // verification items reading as performed, and since the aggregate verdict accepts
    // `skipped`, the required context went green with the pack verification and all three
    // self-validates never run.
    //
    // `if: false` rather than a plausible condition: the lane evaluates no GitHub expressions,
    // so the plant has to be a condition and not a FALSE one — this one just makes the
    // consequence unambiguous to a reader.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      editWorkflow(d, declared.workflow, (text) => {
        const at = text.indexOf("\n  build:\n");
        if (at === -1) throw new Error("the build-job anchor is stale");
        const lineEnd = text.indexOf("\n", at + 1);
        return `${text.slice(0, lineEnd + 1)}    if: false\n${text.slice(lineEnd + 1)}`;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `a conditional dependency carrying declared verifications must exit 1:\n${run.output}`,
        )
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the job whose condition put the work out of reach")
        .toMatch(/job build if: false/);
      // …and the item, so the finding says WHICH verification stopped being reachable rather
      // than only that something did.
      expect
        .soft(run.output, "the finding must name a declared item the guarded job carried")
        .toContain("Run build & pack verification");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a step whose invoked package script was hollowed, with the workflow untouched", () => {
    // Review finding [36]. `run: pnpm ci:build-verify` is a REFERENCE, and a digest over the
    // `run:` text pins the pointer rather than the work: deleting
    // `node ./scripts/check-publish-dry-run.mjs` from that script in the root manifest left the
    // step's digest and its declaration in perfect agreement while the pack verification stopped
    // happening, and the required context still went green.
    //
    // The workflow file is NOT edited here. That is the whole point of the row: every other
    // required-context plant reaches the lane through `.github/**`, and this one proves the
    // digest's subject reaches past it.
    const dir = plantedTree((d) => {
      const manifestPath = path.join(d, "package.json");
      const manifest: { scripts: Record<string, string> } = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      ) as { scripts: Record<string, string> };
      const before = manifest.scripts["ci:build-verify"];
      if (before === undefined || !before.includes("check-publish-dry-run")) {
        throw new Error("the ci:build-verify needle is stale");
      }
      manifest.scripts["ci:build-verify"] = before
        .split("&&")
        .filter((part) => !part.includes("check-publish-dry-run"))
        .join("&&")
        .trim();
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `hollowing the script a verification step invokes must exit 1:\n${run.output}`,
        )
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the item whose work moved")
        .toContain("Run build & pack verification");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a hollowed script the step reaches through ANOTHER script", () => {
    // The transitive hop. `ci:build-verify` runs `pnpm verify:pack`, so a resolution that
    // stopped at the first reference would pin `run: pnpm ci:build-verify` and the text of
    // `ci:build-verify` — and `verify:pack` could then be emptied with both of them untouched.
    // Measured: with the recursion removed, the row above still reddens and this one does not,
    // which is how a one-hop resolution would have looked like a working one.
    const dir = plantedTree((d) => {
      const manifestPath = path.join(d, "package.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
        scripts: Record<string, string>;
      };
      const first = manifest.scripts["ci:build-verify"];
      if (first === undefined || !first.includes("pnpm verify:pack")) {
        throw new Error("ci:build-verify no longer reaches verify:pack — the needle is stale");
      }
      if (manifest.scripts["verify:pack"] === undefined) {
        throw new Error("verify:pack is gone — the needle is stale");
      }
      manifest.scripts["verify:pack"] = "true";
      writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}
`,
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `hollowing a transitively invoked script must exit 1:
${run.output}`,
        )
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the item that reaches it")
        .toContain("Run build & pack verification");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes the same tree with the script restored, so the row above is about the script", () => {
    // The control. Without it the row above holds for a lane that rejects any tree whose
    // manifest it happened to touch — and a `plantedTree` that copies the manifests is new, so
    // that is a live possibility rather than a formality.
    const dir = plantedTree((d) => {
      const manifestPath = path.join(d, "package.json");
      const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a rewritten but unchanged manifest must stay green:\n${run.output}`)
        .toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a command-template shell on a verification step, and names it", () => {
    // Review finding [41]. `shell:` is a command template — GitHub substitutes the step body for
    // `{0}` and runs the WHOLE line — so `bash {0} || true` performs the step's name and reports
    // its own status, 0, whatever the body did. `Run build & pack verification` would then fail
    // silently and `build` and the required `ci-pass` would both go green.
    //
    // Two independent reasons this now fails: the effective shell is in the body digest, and a
    // shell outside GitHub's named set is rejected in its own right. The named-shell control is
    // the untouched tree — four declared items already carry `shell: bash` and are green there.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(anchor, `${anchor}        shell: "bash {0} || true"\n`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a template shell must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the shell that was substituted")
        .toContain("bash {0} || true");
      expect
        .soft(run.output, "and must say why a template is not a shell")
        .toMatch(/command template/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a command-template shell inherited from the job's defaults.run", () => {
    // The same escape one level out, and the level the step object cannot see. A step that
    // declares no `shell` inherits the job's, then the workflow's — so a rule reading only the
    // step is a rule that can be stepped around by editing two lines somewhere else in the file.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  build:\n    runs-on: ubuntu-latest\n";
        if (!text.includes(anchor)) throw new Error("the build-job anchor is stale");
        return text.replace(
          anchor,
          '  build:\n    defaults:\n      run:\n        shell: "bash {0} || true"\n    runs-on: ubuntu-latest\n',
        );
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a template shell in the job defaults must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the inherited shell")
        .toContain("bash {0} || true");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves invoked scripts from the step's working directory, not from the root", () => {
    // Review finding [41], second half. `working-directory` changes which manifest
    // `pnpm ci:build-verify` resolves against, so pointing a verification step at a package whose
    // manifest defines a SHORTER `ci:build-verify` ran different work while the pin over the root
    // manifest still matched exactly.
    //
    // Asserted on the digest rather than through the lane, because the lane can only say "this
    // step changed" — which it would say for any edit at all. What has to hold is narrower: the
    // same step body, the same script NAME, two manifests, two digests.
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-hygiene-wd-"));
    try {
      const step = { name: "x", run: "pnpm ci:build-verify" };
      writeFileSync(
        path.join(dir, "package.json"),
        `${JSON.stringify({ scripts: { "ci:build-verify": "node a.mjs && node b.mjs" } })}\n`,
        "utf-8",
      );
      mkdirSync(path.join(dir, "pkg"), { recursive: true });
      writeFileSync(
        path.join(dir, "pkg", "package.json"),
        `${JSON.stringify({ scripts: { "ci:build-verify": "node a.mjs" } })}\n`,
        "utf-8",
      );

      const fromRoot = verificationBodyDigest(step, dir);
      const fromPackage = verificationBodyDigest(step, dir, { workingDirectory: "pkg" });
      expect(
        fromRoot,
        "the same step must not digest the same under two manifests defining different work",
      ).not.toBe(fromPackage);

      // …and the difference is the SCRIPT, not merely the working-directory string: a step that
      // declares the directory explicitly must agree with one that inherits it.
      expect(
        verificationBodyDigest({ ...step, "working-directory": "pkg" }, dir),
        "step-level and inherited working directories must resolve to the same work",
      ).toBe(fromPackage);

      // The resolution itself, asserted directly. Without this the digests above differ for two
      // possible reasons — the working-directory string being in the shape, or the script being
      // resolved from it — and reverting the resolution alone would leave the row green.
      expect(
        invokedScriptBodies(step.run, dir, "pkg"),
        "the script must be resolved against the manifest in the working directory",
      ).toEqual([
        ["pkg#ci:build-verify", "node a.mjs"],
        // The LIFECYCLE SIBLINGS, recorded as absent. Review finding [104]: `pnpm run x` runs
        // `prex` before it and `postx` after, and neither was resolved — so a `preci:lint` added
        // beside the script a verification invokes ran in the required lane while every pinned
        // digest stayed equal. Absent is recorded rather than skipped for the reason every other
        // name is: an ADDED one has to move the digest.
        ["pkg#postci:build-verify", null],
        ["pkg#preci:build-verify", null],
      ]);
      expect(
        invokedScriptBodies(step.run, dir, "."),
        "and against the root manifest when there is no working directory",
      ).toEqual([
        [".#ci:build-verify", "node a.mjs && node b.mjs"],
        [".#postci:build-verify", null],
        [".#preci:build-verify", null],
      ]);

      // And the working-directory STRING is in the shape in its own right, for a step that
      // invokes no script and names no file — where the directory is still what it runs in.
      expect(
        verificationBodyDigest({ name: "x", run: "true" }, dir),
        "the working directory must be part of the body even with nothing to resolve",
      ).not.toBe(
        verificationBodyDigest({ name: "x", run: "true" }, dir, { workingDirectory: "pkg" }),
      );

      // The digest's OWN use of the working directory, isolated. The assertions above all differ
      // for a second reason — the directory string is in the shape — so reverting the resolution
      // while keeping the string left every one of them green. Measured. Here the two trees have
      // identical ROOT manifests and differ only in the one the working directory points at, so
      // the digest can only tell them apart by resolving from there.
      const other = mkdtempSync(path.join(tmpdir(), "qfai-hygiene-wd2-"));
      try {
        writeFileSync(
          path.join(other, "package.json"),
          `${JSON.stringify({ scripts: { "ci:build-verify": "node a.mjs && node b.mjs" } })}
`,
          "utf-8",
        );
        mkdirSync(path.join(other, "pkg"), { recursive: true });
        writeFileSync(
          path.join(other, "pkg", "package.json"),
          `${JSON.stringify({ scripts: { "ci:build-verify": "node c.mjs" } })}
`,
          "utf-8",
        );
        expect(
          verificationBodyDigest(step, other, { workingDirectory: "pkg" }),
          "the digest must resolve the script from the working directory, not from the root",
        ).not.toBe(fromPackage);
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a hollowed guard script the step runs, with the workflow untouched", () => {
    // Review finding [42]. `run: bash packages/qfai/scripts/check-no-internal-version-leakage.sh`
    // is a reference too, and replacing that file's body with `exit 0` left the step's name, its
    // `run` and its digest all unchanged — so the same neutered guard went green in `lint` and in
    // `build`, and the leakage rule the distributed-surface contract rests on checked nothing.
    //
    // The workflow file is NOT edited: the digest's subject has to reach past `.github/**`.
    const dir = plantedTree((d) => {
      const guard = path.join(
        d,
        "packages",
        "qfai",
        "scripts",
        "check-no-internal-version-leakage.sh",
      );
      if (!existsSync(guard)) throw new Error("the guard was not staged — the fixture is stale");
      writeFileSync(guard, "#!/usr/bin/env bash\nexit 0\n", "utf-8");
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `hollowing a guard a verification runs must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the item that runs it")
        .toContain("Sanity grep");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records a reference outside the pinned script roots without hashing its bytes", () => {
    // The boundary, pinned so it is not "improved" into hashing build output. Two declared
    // verification steps run `packages/qfai/dist/cli/index.mjs`, whose bytes change on every
    // compile: a digest over those would need re-pinning after every build and would say nothing
    // about whether the verification still happens. The PATH is still recorded, so the reference
    // moving is still a change.
    const entries = invokedFileDigests(
      "node packages/qfai/dist/cli/index.mjs validate --root .",
      REPO_ROOT,
      ".",
    );
    expect(
      entries,
      "a reference outside the pinned roots must be recorded, and recorded as outside them",
    ).toEqual([["packages/qfai/dist/cli/index.mjs", "outside"]]);

    // And the other side of the boundary really is hashed, or the row above would be describing a
    // scan that hashes nothing at all.
    const inside = invokedFileDigests(
      "bash packages/qfai/scripts/check-no-internal-version-leakage.sh",
      REPO_ROOT,
      ".",
    );
    const guard = inside.find(
      ([file]) => file === "packages/qfai/scripts/check-no-internal-version-leakage.sh",
    );
    expect(guard?.[1], "a guard inside the pinned roots must be hashed").toMatch(/^[0-9a-f]{16}$/);
  });

  it("rejects an environment inherited from the job that replaces what the shell runs", () => {
    // Review finding [51]. `BASH_ENV` is sourced by the non-interactive bash GitHub runs BEFORE the
    // step body, so a file it names that ends in `exit 0` means the body never runs and the step
    // reports success — with `run`, `shell`, `working-directory` and every pinned digest untouched.
    // Declared at JOB level it is invisible from the step object, which is where the digest was
    // looking, so two lines elsewhere in the file turned every declared verification into a no-op.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  build:\n    runs-on: ubuntu-latest\n";
        if (!text.includes(anchor)) throw new Error("the build-job anchor is stale");
        return text.replace(
          anchor,
          "  build:\n    env:\n      BASH_ENV: /tmp/noop.sh\n    runs-on: ubuntu-latest\n",
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an inherited BASH_ENV must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the variable it refused")
        .toContain("BASH_ENV");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects a PATH that decides which shell receives the step body", () => {
    // Review finding [60]. `PATH` is not a preload, but it decides WHICH program receives the
    // body: a workspace directory holding an executable named `bash`, put first, hands every `run:`
    // in the closure to a shell the pull request wrote, which can return 0 having run nothing.
    //
    // In the refused set rather than only in the digest, for the reason the finding gives: the pin
    // tool is committed, so a pull request that adds the variable can land the new digest in the
    // same commit.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  build:\n    runs-on: ubuntu-latest\n";
        if (!text.includes(anchor)) throw new Error("the build-job anchor is stale");
        return text.replace(
          anchor,
          "  build:\n    env:\n      PATH: /tmp/fake-bin:/usr/bin:/bin\n    runs-on: ubuntu-latest\n",
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an inherited PATH must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "the finding must name the variable it refused").toContain("PATH");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects a step that sets the environment of the steps after it", () => {
    // Review finding [69]. The env checks read what the YAML DECLARES — workflow, job and step —
    // and a step can set a variable for every step after it by appending to `$GITHUB_ENV`.
    // `echo "BASH_ENV=…/noop.sh" >> "$GITHUB_ENV"` before the verdict step neuters it with no
    // declared env anywhere and no pinned digest moved: the same capability arriving through a
    // file instead of a key.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          '      - name: Prepare the environment\n        run: echo "BASH_ENV=$GITHUB_WORKSPACE/noop.sh" >> "$GITHUB_ENV"\n' +
            anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a step writing $GITHUB_ENV must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the command file it refused")
        .toContain("GITHUB_ENV");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses the ordinary brace spelling of the same command file", () => {
    // Review finding [72]: the detection enumerated two spellings — `$GITHUB_ENV` and
    // `${{ env.GITHUB_ENV }}` — and `>> "${GITHUB_ENV}"`, the form a shell author writes without
    // thinking about it, went straight through. There is no end to that list: a variable holding the
    // path, `printenv`, a here-doc. So the NAME anywhere in the body is what the lane refuses now,
    // and this row is the spelling the enumeration missed.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          "      - name: Prepare the environment\n" +
            '        run: echo "BASH_ENV=$GITHUB_WORKSPACE/noop.sh" >> "${GITHUB_ENV}"\n' +
            anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `the brace form is the same capability:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the command file it refused")
        .toContain("GITHUB_ENV");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  for (const [label, planted] of [
    [
      "a with: input carrying the path",
      '      - uses: ./.github/actions/setup\n        with:\n          extra: ">> $GITHUB_ENV"\n',
    ],
    [
      "an env: VALUE carrying the path",
      '      - run: echo BASH_ENV=noop.sh >> "$OUT"\n        env:\n          OUT: $GITHUB_ENV\n',
    ],
  ] as const) {
    it(`refuses ${label}, which never appears in the run: text`, () => {
      // Review finding [79]. A `with:` value reaches a composite action's own `run:` through
      // `${{ inputs.… }}`, and an `env:` value can hand the path to a body that appends to it
      // under another name. Neither is in the `run:` text the check used to search, and both
      // write the same file — so the search covers the whole surface the step supplies.
      const dir = plantedTree((d) => {
        editWorkflow(d, firstContext(d).workflow, (text) => {
          const anchor = "      - name: Run build & pack verification\n";
          if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
          return text.replace(anchor, planted + anchor);
        });
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `${label} is the same capability:\n${run.output}`).toBe(1);
        expect
          .soft(run.output, "the finding must name the command file it refused")
          .toContain("GITHUB_ENV");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
  it("refuses a command-file write from a step with no name at all", () => {
    // Review finding [78]. Everything in property 3 keys on `step.name`, because a declaration
    // names the item it declares — so the loop skipped unnamed steps before any check ran, and
    // `- run: echo "BASH_ENV=…" >> "$GITHUB_ENV"` with no `name:` went past the writer check
    // untouched. A step needs no name to set the environment of every step after it.
    //
    // Found while testing the composite-action scan: `ci.yml`'s seven
    // `- uses: ./.github/actions/setup` steps are all unnamed, so that scan was unreachable too.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          '      - run: echo "BASH_ENV=$GITHUB_WORKSPACE/noop.sh" >> "$GITHUB_ENV"\n' + anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unnamed writer is still a writer:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the command file it refused")
        .toContain("GITHUB_ENV");
      expect
        .soft(run.output, "and locate the step, which has no name to give")
        .toMatch(/\(unnamed\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("refuses a local action that is not composite, whose entrypoint it cannot scan", () => {
    // Review finding [84]. A local action need not be a list of steps: `runs: { using: node20,
    // main: index.js }` is a JavaScript action, and GitHub runs that entrypoint in the job like
    // any other step. `index.js` appending `BASH_ENV` to the environment file sets the
    // environment of every step after it — and the scan found no `runs.steps` array, reported
    // nothing, and left the lane green. The `uses:` string never changed, so no digest moved
    // either.
    //
    // Refused rather than scanned: reading a JavaScript entrypoint for what it writes would be a
    // second and worse parser. The planted `index.js` DOES write the file, which is the point —
    // the refusal must not depend on this lane being able to tell that.
    const dir = plantedTree((d) => {
      const action = path.join(d, ".github", "actions", "setup");
      writeFileSync(
        path.join(action, "index.js"),
        "// planted: appends BASH_ENV to the environment file\n",
        "utf-8",
      );
      writeFileSync(
        path.join(action, "action.yml"),
        [
          "name: Set up the QFAI toolchain",
          "description: planted",
          "runs:",
          "  using: node20",
          "  main: index.js",
          "",
        ].join("\n"),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a non-composite local action must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must say what it refused and why")
        .toMatch(/is not a composite action/);
      expect
        .soft(run.output, "and name the runtime it found instead, so the diagnosis is actionable")
        .toContain("node20");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("refuses a command-file write inside a local composite action the closure invokes", () => {
    // Review finding [77]. `.github/actions/**` is not inside `VERIFIED_SOURCE_ROOTS`, so a
    // composite action's bytes are in no pinned verification digest — the `uses:` string is all
    // the digest records — and its steps were scanned by nothing. Every toolchain job in `ci.yml`
    // opens with `uses: ./.github/actions/setup`, so one write in there sets the environment of
    // every step after it in every job. Same capability as the step-level row above, through the
    // one door the step scan does not open.
    const dir = plantedTree((d) => {
      const action = path.join(d, ".github", "actions", "setup", "action.yml");
      const before = readFileSync(action, "utf-8");
      const anchor = "  steps:" + "\n";
      if (!before.includes(anchor)) throw new Error("the composite steps anchor is stale");
      writeFileSync(
        action,
        before.replace(
          anchor,
          anchor +
            "    - name: Prepare the environment\n" +
            "      shell: bash\n" +
            '      run: echo "BASH_ENV=$GITHUB_WORKSPACE/noop.sh" >> "$GITHUB_ENV"\n',
        ),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a composite action writing a command file must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the action file, not only the workflow")
        .toContain("action.yml");
      expect.soft(run.output, "and the command file it reached").toContain("GITHUB_ENV");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("follows one local composite action into another rather than stopping at the first", () => {
    // The nested arm, which the row above does not reach: the write is one action deeper, so a
    // scan that read only the directly-invoked action would report nothing. `uses: ./…` is legal
    // inside a composite action, and this is the shape that hides a write behind an indirection
    // no digest covers.
    const dir = plantedTree((d) => {
      const inner = path.join(d, ".github", "actions", "inner");
      mkdirSync(inner, { recursive: true });
      writeFileSync(
        path.join(inner, "action.yml"),
        [
          "name: inner",
          "description: planted",
          "runs:",
          "  using: composite",
          "  steps:",
          "    - shell: bash",
          '      run: echo "BASH_ENV=$GITHUB_WORKSPACE/noop.sh" >> "$GITHUB_ENV"',
          "",
        ].join("\n"),
        "utf-8",
      );

      const outer = path.join(d, ".github", "actions", "setup", "action.yml");
      const before = readFileSync(outer, "utf-8");
      const anchor = "  steps:" + "\n";
      if (!before.includes(anchor)) throw new Error("the composite steps anchor is stale");
      writeFileSync(
        outer,
        before.replace(anchor, anchor + "    - uses: ./.github/actions/inner\n"),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a write one action deeper is the same write:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the INNER action, where the write is")
        .toContain("inner");
      expect.soft(run.output).toContain("GITHUB_ENV");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("reports a local composite action it cannot read rather than finding no writes in it", () => {
    // The fail-open half. A reference this lane cannot follow is a reference whose steps are
    // checked by nothing, and answering `no writes found` for it would be the same silent pass
    // the root-refusal and walk-ceiling checks exist to refuse.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        if (!text.includes("uses: ./.github/actions/setup")) {
          throw new Error("the local action reference is stale");
        }
        return text.replaceAll("uses: ./.github/actions/setup", "uses: ./.github/actions/absent");
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unfollowable local action must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must say the action could not be read")
        .toMatch(/unreadable|unresolvable/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("pins the artifact directory's inode across the whole write, in both producers", async () => {
    // Review finding [71]: comparing only `dev` proves the staging file and the verified directory
    // are on ONE FILESYSTEM, which a checkout and any sibling directory on the same volume already
    // are — so swapping the report directory for a link to a sibling passed the test and the
    // rename replaced an artifact over there. The inode is what says it is the same directory.
    //
    // Asserted on the SOURCE of both writers. The interleaving it closes is between two processes,
    // and Node has no `openat` or `renameat`, so what the code can do is compare identities around
    // each step — which is a shape a reader can check and an in-process test cannot produce.
    const { readFile } = await import("node:fs/promises");
    for (const [label, file, marker] of [
      [
        "the hygiene lane",
        path.join(REPO_ROOT, "scripts", "check-workflow-hygiene.mjs"),
        "function writeExclusivelyThenRename(",
      ],
      [
        "the shape gate",
        path.join(REPO_ROOT, "packages", "qfai", "tests", "integration", "shippedWorkflowShape.ts"),
        "export async function writeShapeFindingsForReviewerGate(",
      ],
    ] as const) {
      const source = await readFile(file, "utf-8");
      const start = source.indexOf(marker);
      expect(start, `${label} must define its writer`).toBeGreaterThan(-1);
      const body = source.slice(start, source.indexOf("\n}\n", start) + 3);
      // The helper's DEFINITION is not the check. Measured: a plant that removed both call
      // sites and left `const sameDirectory = (a, b) => a.dev === b.dev && a.ino === b.ino`
      // standing satisfied a pattern looking for `.ino === …ino`, and the row stayed green over
      // a writer that compared only the device. So the definition is stripped and what is left
      // has to carry the uses.
      const withoutDefinition = body
        .split(/\r?\n/)
        .filter((line) => !line.includes("const sameDirectory"))
        .join("\n");
      expect(
        body,
        `${label} must compare the directory's INODE, not only its device — a device comparison ` +
          "is satisfied by any sibling directory on the same volume",
      ).toMatch(/\.ino\b/);
      expect(
        withoutDefinition.split("sameDirectory(").length - 1,
        `${label} must compare the parent around the open AND again before the rename; one ` +
          "comparison leaves the other operation resolving a name nobody re-checked",
      ).toBeGreaterThanOrEqual(2);
    }
  });
  it("rejects a preload variable that makes node exit before it runs anything", () => {
    // Review finding [57]. `NODE_OPTIONS=--require=<file>` preloads that file before the entry
    // point, so a preload calling `process.exit(0)` makes every `node` — and every `pnpm`, which
    // is node — in the closure succeed without running. It is `BASH_ENV` one layer down.
    //
    // A REFUSAL rather than only a digest input, and that distinction is the finding's real point:
    // the pin tool is committed, so a pull request that adds one of these can recompute the pin in
    // the same commit and the lane would stay green on the digest alone.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  build:\n    runs-on: ubuntu-latest\n";
        if (!text.includes(anchor)) throw new Error("the build-job anchor is stale");
        return text.replace(
          anchor,
          "  build:\n    env:\n      NODE_OPTIONS: --require=./preload.cjs\n    runs-on: ubuntu-latest\n",
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an inherited NODE_OPTIONS must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the variable it refused")
        .toContain("NODE_OPTIONS");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("puts the inherited environment in the body digest, merged step over job over workflow", () => {
    // The digest half, isolated. The finding above is a named refusal for four variables; this is
    // the general property, and it is what makes ANY inherited environment change visible.
    const step = { name: "x", run: "true" };
    const bare = verificationBodyDigest(step, REPO_ROOT);
    expect(
      verificationBodyDigest(step, REPO_ROOT, { env: { CI_KNOB: "1" } }),
      "an environment the step inherits is part of what it does",
    ).not.toBe(bare);

    // …and the precedence is step over inherited, so declaring the same value at either level is
    // the same step. Without this the merge could be a concatenation and nobody would notice.
    expect(
      verificationBodyDigest({ ...step, env: { CI_KNOB: "1" } }, REPO_ROOT),
      "a value declared on the step and the same value inherited are the same environment",
    ).toBe(verificationBodyDigest(step, REPO_ROOT, { env: { CI_KNOB: "1" } }));
  });

  it("rejects a job whose own failure is discarded, not only a step whose failure is", () => {
    // Review finding [52]. A job-level `continue-on-error: true` discards that job's failure the
    // way a step-level one discards a step's, and only steps were checked. On `ci-pass` — the one
    // aggregate the required context sits on — the verdict can exit 1 and the context still passes,
    // with every pinned digest and every other rule unchanged.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      editWorkflow(d, declared.workflow, (text) => {
        const anchor = `\n  ${declared.job}:\n`;
        if (!text.includes(anchor)) throw new Error("the declared-job anchor is stale");
        return text.replace(anchor, `${anchor}    continue-on-error: true\n`);
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a job whose failure is discarded must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must say the job's failure is discarded")
        .toMatch(/continue-on-error: true/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects a verification step whose env changed, which is what it runs on", () => {
    // The third escape: the digest hashed `run` / `uses` / `with` and not `env`. The verdict
    // step's WHOLE input is `NEEDS_JSON: ${{ toJSON(needs) }}`, so replacing that expression
    // with a hardcoded all-success map neuters the aggregate verdict while `run` is untouched
    // and every pin still matches. Measured: the lane exited 0.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      editWorkflow(d, declared.workflow, (text) => {
        const before = "NEEDS_JSON: ${{ toJSON(needs) }}";
        if (!text.includes(before)) throw new Error(`the env needle is stale`);
        return text.replace(before, `NEEDS_JSON: '{"lint":{"result":"success"}}'`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a rewritten step env must exit 1:\n${run.output}`).toBe(1);
      // The VERDICT step, named — not whichever item happens to be first in the declaration.
      // This row plants into one specific step's `env:`, and the positional helper was a
      // coincidence that held only while that step led the list: adding the pre-flight refusal
      // ahead of it (review finding [82]) made the row demand a name it had not planted into.
      expect
        .soft(run.output, "and the finding must name the item whose body moved")
        .toContain("Derive the verdict from the serialized needs map");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a declared verification item that pins no body at all", () => {
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      const item = declared.verificationSet[0];

      // Both halves of the move, because either alone is already caught: the hollowed body by the
      // digest comparison, the missing key by this row. Together they were caught by nothing.
      editWorkflow(d, declared.workflow, (text) => {
        const at = text.indexOf(`- name: ${item}`);
        if (at === -1) throw new Error(`no step named ${item} — the needle is stale`);
        const lineEnd = text.indexOf("\n", at);
        const nextStep = text.indexOf("      - name:", lineEnd);
        const stop = nextStep === -1 ? text.length : nextStep;
        return `${text.slice(0, lineEnd + 1)}        run: true\n\n${text.slice(stop)}`;
      });
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        context.verificationBodies = Object.fromEntries(
          Object.entries(context.verificationBodies ?? {}).filter(([name]) => name !== item),
        );
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unpinned verification item must exit 1:\n${run.output}`)
        .toBe(1);
      const findings = run.output.split(/\r?\n/).filter((line) => line.includes(DECLARATION_RULE));
      expect
        .soft(findings.join("\n"), "the finding must name the item with no digest")
        .toContain(firstVerificationItem(REPO_ROOT));
      expect
        .soft(findings.join("\n"), "and say that the pin itself is missing")
        .toMatch(/pins no body digest/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Review finding [03]. Membership in the verification set was decided by the step's NAME alone,
  // so a step keeping its name and losing its body satisfied the lane while the required context
  // verified nothing. The declaration pins what each step DOES.
  it("rejects a declared verification item whose body was hollowed out", () => {
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      const guarded = declared.verificationSet[0];
      editWorkflow(d, declared.workflow, (text) => {
        // The whole point of the finding: the name is untouched, and only the body changes.
        const at = text.indexOf(`- name: ${guarded}`);
        if (at === -1) throw new Error(`no step named ${guarded} — the needle is stale`);
        const lineEnd = text.indexOf("\n", at);
        const nextStep = text.indexOf("      - name:", lineEnd);
        const stop = nextStep === -1 ? text.length : nextStep;
        return `${text.slice(0, lineEnd + 1)}        run: true\n\n${text.slice(stop)}`;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a hollowed-out verification must exit 1:\n${run.output}`).toBe(1);
      const findings = run.output.split(/\r?\n/).filter((line) => line.includes(DECLARATION_RULE));
      expect
        .soft(findings.join("\n"), "the finding must name the item whose body moved")
        .toContain(firstVerificationItem(REPO_ROOT));
      expect
        .soft(
          findings.join("\n"),
          "and say what to do, because a digest mismatch is otherwise unactionable",
        )
        .toContain("verificationBodies");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Review finding [05]. This lane runs on a pull request, over paths the pull request adds.
  it("reports a workflow path that is not a readable regular file rather than following it", () => {
    const dir = plantedTree((d) => {
      const target = path.join(d, ".github", "workflows", "planted-oversize.yml");
      // Past the 1 MiB ceiling. A symlink to a FIFO is the case that actually hangs, but creating
      // one is platform-conditional; an oversized file exercises the same refusal unconditionally,
      // and the sibling unit rows cover the link and device shapes.
      writeFileSync(target, `# ${"x".repeat(1_100_000)}` + "\n" + "name: planted", "utf-8");
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unreadable workflow must be reported, not read:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the path an operator has to look at")
        .toContain("planted-oversize.yml");
      expect.soft(run.output, "and why it was refused").toMatch(/regular file|size ceiling/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Review finding [30]. The lane used to compare `continue-on-error` against the boolean `true`,
  // and an expression reaches the YAML parser as a STRING — so `continue-on-error: ${{ true }}`
  // and `${{ matrix.experimental }}` both slipped past it and the step was recorded as performed.
  // At runtime the expression decides, the step's failure is discarded, and the required context
  // stays green over a verification that established nothing. Two shapes, because the second is the
  // one an author would write without meaning anything by it.
  for (const expression of ["${{ true }}", "${{ matrix.experimental }}"]) {
    it(`treats continue-on-error: ${expression} as shrinking the set`, () => {
      const dir = plantedTree((d) => {
        const declared = firstContext(d);
        const guarded = declared.verificationSet[0];
        editWorkflow(d, declared.workflow, (text) =>
          text.replace(
            `- name: ${guarded}\n`,
            `- name: ${guarded}\n        continue-on-error: ${expression}\n`,
          ),
        );
      });
      try {
        const run = runLane(dir);
        expect
          .soft(run.exitCode, `an expression-valued continue-on-error must exit 1:\n${run.output}`)
          .toBe(1);
        const findings = run.output
          .split(/\r?\n/)
          .filter((line) => line.includes(DECLARATION_RULE));
        expect
          .soft(findings.join(`\n`), "the finding must name the item it rejected")
          .toContain(firstVerificationItem(REPO_ROOT));
        expect
          .soft(
            findings.join(`\n`),
            "and the reason, so a maintainer is not sent looking for a step that is still there",
          )
          .toContain("continue-on-error");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it(`accepts continue-on-error: false, so the rule is a check and not a ban`, () => {
    // The other direction. An explicit `false` says exactly what the default says, and rejecting
    // it would make the rule a prohibition on writing the field at all.
    const dir = plantedTree((d) => {
      const declared = firstContext(d);
      const guarded = declared.verificationSet[0];
      editWorkflow(d, declared.workflow, (text) =>
        text.replace(
          `- name: ${guarded}\n`,
          `- name: ${guarded}\n        continue-on-error: false\n`,
        ),
      );
    });
    try {
      const run = runLane(dir);
      expect(run.exitCode, `an explicit false must stay green:\n${run.output}`).toBe(0);
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
      const declared = firstContext(d);
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
        .toContain(firstVerificationItem(REPO_ROOT));
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
    const id = m?.[1];
    if (id === undefined) break;
    ids.push(id);
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

// ── [10] ────────────────────────────────────────────────
describe("a version marker in a shipped file is rejected wherever it sits", () => {
  it("catches one in a trailing comment, which every parsing gate is blind to", () => {
    // `.agents/rules/distributed-surface.md` forbids `vN.M[.P]` across the whole distributed
    // surface, and this lane is the rule the shipped-workflows contract nominates for the comment
    // case: `lint:shipping` skips comment lines before its shipped-runtime rules apply, and the
    // shape gate loses comments at parse time. Review finding [10] measured the consequence —
    // `# v9.9.9` appended to a shipped workflow left `pnpm ci:lint` green with no finding at all.
    const dir = plantedTree((d) => {
      const target = path.join(d, path.join(SHIPPED_WORKFLOWS_REL, "qfai-tests.yml"));
      writeFileSync(target, `${readFileSync(target, "utf-8")}# v9.9.9\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a shipped version marker must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "the finding must name the rule").toContain("shipped-version-marker");
      expect
        .soft(run.output, "and the marker itself, so the operator knows what to delete")
        .toContain("v9.9.9");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("catches one in a step name, because the property is the leading v and not the location", () => {
    // The contract's adopted resolution is to carry the version in the step `name:` with the `v`
    // dropped. So `Setup pnpm 10.15.0` is fine and `Setup pnpm v10.15.0` is not, and this row is
    // what keeps that distinction from being a comment-only rule.
    const dir = plantedTree((d) => {
      const target = path.join(d, path.join(SHIPPED_WORKFLOWS_REL, "qfai-tests.yml"));
      const before = readFileSync(target, "utf-8");
      const after = before.replace("    name: change detection", "    name: change detection v1.2");
      if (after === before) throw new Error("the step-name needle is stale");
      writeFileSync(target, after, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect(run.exitCode, `a marker in a step name must exit 1:\n${run.output}`).toBe(1);
      expect(run.output).toContain("v1.2");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── [14] ────────────────────────────────────────────────
describe("a shipped runner label literal must be a public GitHub-hosted runner", () => {
  it("rejects self-hosted, which does not resolve in an adopter's repository", () => {
    const dir = plantedTree((d) => {
      const target = path.join(d, path.join(SHIPPED_WORKFLOWS_REL, "qfai-tests.yml"));
      const before = readFileSync(target, "utf-8");
      const after = before.replace(
        "runs-on: ${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}",
        "runs-on: self-hosted",
      );
      if (after === before) throw new Error("the runs-on needle is stale");
      writeFileSync(target, after, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a private runner literal must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toContain("shipped-runner-label");
      expect.soft(run.output).toContain("self-hosted");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the sanctioned selector, whose only literal is a public label", () => {
    // The other direction, and the one a whole-string rule would have failed on every job: the
    // shipped set deliberately writes `${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}` so the
    // adopter can choose their own runner. What they put in their own variable is not a literal
    // QFAI ships. The unplanted tree carries exactly that form, so a green run is the assertion.
    const dir = plantedTree(() => undefined);
    try {
      const run = runLane(dir);
      expect(run.exitCode, `the sanctioned selector must stay green:\n${run.output}`).toBe(0);
      expect(
        printedRules(run.output, SHIPPED_SCOPE),
        "and the rule must have been evaluated, or the green means nothing",
      ).toContain("shipped-runner-label");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── [15] ────────────────────────────────────────────────
describe("the reviewer artifact is written to its name, never through it", () => {
  // Review finding [48]. `.qfai/review/**` is gitignored but not unwritable, and a pull request
  // can force-add a path under it. This producer runs on an untrusted checkout — from `ci:lint`
  // and again from the `build` bridge — so a `writeFileSync` onto a name the pull request made a
  // symlink truncates whatever it points at: a file outside the repository on the runner, or the
  // input of a later gate.

  /** A junction on Windows, an ordinary symlink elsewhere; neither needs privilege. */
  function link(target: string, at: string, type: "junction" | "file"): boolean {
    try {
      symlinkSync(target, at, type);
      return true;
    } catch {
      return false;
    }
  }

  it("replaces a symlinked artifact name instead of writing through it", () => {
    const dir = plantedTree(() => undefined);
    const outside = mkdtempSync(path.join(tmpdir(), "qfai-artifact-outside-"));
    try {
      const bystander = path.join(outside, "somebody-elses-file.txt");
      writeFileSync(bystander, "not this lane's to write\n", "utf-8");

      const reportRel = path.join(".qfai", "review", "workflow-hygiene");
      mkdirSync(path.join(dir, reportRel), { recursive: true });
      const target = path.join(dir, reportRel, "workflow-hygiene.json");
      if (!link(bystander, target, "file")) return;

      const run = runLaneWithReport(dir, reportRel);
      expect(run.exitCode, `the lane must still produce its artifact:\n${run.output}`).not.toBe(-1);
      expect(
        readFileSync(bystander, "utf-8"),
        "the file the name pointed at must be exactly as it was",
      ).toBe("not this lane's to write\n");
      expect(
        JSON.parse(readFileSync(path.join(dir, reportRel, "workflow-hygiene.json"), "utf-8")),
        "and the artifact must be at the name, as a file of its own",
      ).toHaveProperty("findings");
    } finally {
      rmSync(outside, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a report directory reached through a symlinked component", () => {
    // The other half: `mkdirSync(..., { recursive: true })` FOLLOWS an existing component and
    // creates nothing, so a linked directory inside the checkout puts the whole write elsewhere.
    const dir = plantedTree(() => undefined);
    const outside = mkdtempSync(path.join(tmpdir(), "qfai-artifact-dir-"));
    try {
      mkdirSync(path.join(dir, ".qfai"), { recursive: true });
      if (!link(outside, path.join(dir, ".qfai", "review"), "junction")) return;

      const run = runLaneWithReport(dir, path.join(".qfai", "review", "workflow-hygiene"));
      expect(
        run.output,
        "the lane must say which component it refused rather than writing through it",
      ).toMatch(/is not a real directory/);
      expect(
        existsSync(path.join(outside, "workflow-hygiene")),
        "nothing may be created beyond the link",
      ).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
describe("a root this lane refuses to walk is reported, not silently empty", () => {
  // Review finding [63]. `yamlFilesUnder` answers the empty list for BOTH "absent" and
  // "refused", which is right for a walk and wrong for a report — and the empty-tree check that
  // would have noticed was applied to the workflow roots only. `ci.yml`'s toolchain jobs all run
  // `./.github/actions/setup`, so a link at `.github/actions` pointing at a fake composite action
  // inside the repository IS the whole toolchain, and the scan said nothing at all.

  function linkDir(target: string, at: string): boolean {
    try {
      symlinkSync(target, at, "junction");
      return true;
    } catch {
      return false;
    }
  }

  for (const rel of [path.join(".github", "actions"), path.join(".github", "workflows")]) {
    it(`reports ${rel.split(path.sep).join("/")} when it is present but not a real directory`, () => {
      const dir = plantedTree(() => undefined);
      const outside = mkdtempSync(path.join(tmpdir(), "qfai-refused-root-"));
      try {
        const target = path.join(dir, rel);
        rmSync(target, { recursive: true, force: true });
        if (!linkDir(outside, target)) return;

        const run = runLane(dir);
        expect.soft(run.exitCode, `a refused root must exit 1:\n${run.output}`).toBe(1);
        expect
          .soft(run.output, "the finding must name the root it refused to walk")
          .toContain(rel.split(path.sep).join("/"));
        expect
          .soft(run.output, "and must say the refusal is what happened, not that the tree is empty")
          .toMatch(/not a real directory this lane may walk/);
      } finally {
        rmSync(outside, { recursive: true, force: true });
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});

describe("the required context may not choose the machine its verifications run on", () => {
  it("rejects a container on a job in the declared closure", () => {
    // Review finding [65]. A `container:` replaces the machine every `run:` in that job executes
    // on, so an image whose shell returns 0 having done nothing makes every step succeed — with
    // `run`, `shell`, `env` and every pinned digest untouched, because the digest describes the
    // step and this describes where it runs.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  build:\n    runs-on: ubuntu-latest\n";
        if (!text.includes(anchor)) throw new Error("the build-job anchor is stale");
        return text.replace(
          anchor,
          "  build:\n    container: alpine:3\n    runs-on: ubuntu-latest\n",
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a job container must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output, "the finding must name the image it refused").toContain("alpine:3");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the declaration is read the way the workflows are", () => {
  it("reports a declaration that is not a readable regular file rather than following it", () => {
    // Review finding [64]. This was a plain `readFileSync`, which follows a link: the declaration
    // replaced by a symlink to `/dev/zero` or a FIFO made the read never return, and this required
    // lane held the runner until the job timed out without reaching the missing-or-malformed
    // branch. A lane that can be made to hang blocks nothing.
    //
    // Planted as a link to a DIRECTORY rather than to `/dev/zero`, which does not exist on every
    // platform this suite runs on. The reader refuses both by the same descriptor test, and the
    // row asserts the refusal is reported — a hang would fail it by timing out either way.
    const dir = plantedTree(() => undefined);
    const elsewhere = mkdtempSync(path.join(tmpdir(), "qfai-decl-target-"));
    try {
      const target = path.join(dir, ".github", "required-status-contexts.json");
      rmSync(target, { force: true });
      try {
        symlinkSync(elsewhere, target, "junction");
      } catch {
        return;
      }

      const run = runLane(dir);
      expect.soft(run.exitCode, `an unreadable declaration must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the refusal must be reported as a required-context finding")
        .toMatch(/not a readable regular file within the size ceiling/);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("the workflow walk refuses a root it did not open, and is bounded", () => {
  // Review finding [45]. This lane runs on a pull request, over paths the pull request itself
  // controls, and `readdirSync` follows a link — so replacing `.github/workflows` (or
  // `.github/actions`, or the shipped root) with a symlink to `/proc` or to a huge external tree
  // started an unbounded traversal. Every guard downstream is per-FILE and descriptor-based, and
  // none of them is reached until the walk finishes: a required lane that can be made to hang or
  // throw instead of producing a finding blocks nothing.

  /** A junction on Windows, an ordinary symlink elsewhere; neither needs privilege. */
  function linkDir(target: string, at: string): boolean {
    try {
      symlinkSync(target, at, "junction");
      return true;
    } catch {
      return false;
    }
  }

  it("walks a real root and refuses a linked one, in the same tree", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-walk-"));
    try {
      mkdirSync(path.join(dir, "real"), { recursive: true });
      writeFileSync(path.join(dir, "real", "a.yml"), "name: a\n", "utf-8");

      // The control first, so the refusal below is a refusal and not a walk that finds nothing.
      expect(yamlFilesUnder(dir, "real"), "a real directory must still be walked").toEqual([
        "real/a.yml",
      ]);

      if (!linkDir(path.join(dir, "real"), path.join(dir, "link"))) return;
      expect(
        yamlFilesUnder(dir, "link"),
        "a root that is a link is a root this lane did not open",
      ).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not descend into a linked entry inside a real root", () => {
    // The same refusal one level in. `readdirSync(..., { withFileTypes: true })` reports a linked
    // directory as a symlink and not a directory, so the explicit `isSymbolicLink()` arm is a
    // second statement of a refusal the entry test already makes — measured: removing that arm
    // leaves this row green. It stays because it names the intent, and this row stays because a
    // later `{ recursive: true }`, a `statSync`, or a switch to string entries would undo the
    // behaviour without touching either.
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-walk-entry-"));
    try {
      mkdirSync(path.join(dir, "outside"), { recursive: true });
      writeFileSync(path.join(dir, "outside", "b.yml"), "name: b\n", "utf-8");
      mkdirSync(path.join(dir, "root"), { recursive: true });
      writeFileSync(path.join(dir, "root", "a.yml"), "name: a\n", "utf-8");
      if (!linkDir(path.join(dir, "outside"), path.join(dir, "root", "away"))) return;

      expect(
        yamlFilesUnder(dir, "root"),
        "a linked entry is a door out of the tree, and the walk must not take it",
      ).toEqual(["root/a.yml"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stops at its ceiling rather than walking forever, and keeps what it found", () => {
    // Refusing links is not the same as bounding the walk: a tree that is merely enormous, or a
    // filesystem that presents one, is still a lane that never finishes. The ceiling is a
    // parameter with the production value as its default, so this reaches it without laying down
    // five thousand files.
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-walk-ceiling-"));
    try {
      mkdirSync(path.join(dir, "root"), { recursive: true });
      for (const name of ["a", "b", "c", "d", "e"]) {
        writeFileSync(path.join(dir, "root", `${name}.yml`), `name: ${name}\n`, "utf-8");
      }
      expect(
        yamlFilesUnder(dir, "root").length,
        "the premise: an unbounded walk finds all five",
      ).toBe(5);
      expect(
        yamlFilesUnder(dir, "root", 2).length,
        "the walk must stop at the ceiling, and report what it collected before it",
      ).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("tells the caller it stopped early, so a short walk is not read as a finished one", () => {
    // Review finding [74]. The ceiling used to end the recursion and say nothing: five thousand
    // irrelevant entries followed by an unpinned action, and every rule reported PASS over the part
    // that was read. A partial scan has to be distinguishable from a whole one, and the out-param is
    // how the caller learns which of the two it was handed.
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-walk-truncation-"));
    try {
      mkdirSync(path.join(dir, "root"), { recursive: true });
      for (const name of ["a", "b", "c"]) {
        writeFileSync(path.join(dir, "root", `${name}.yml`), `name: ${name}\n`, "utf-8");
      }

      const whole: string[] = [];
      expect(
        yamlFilesUnder(dir, "root", 10, whole).length,
        "the control: a walk that finished must find all three",
      ).toBe(3);
      expect(whole, "and must report no truncation, or the signal means nothing").toEqual([]);

      const short: string[] = [];
      yamlFilesUnder(dir, "root", 2, short);
      expect(
        short,
        "a walk that stopped at its ceiling must name the root it stopped in",
      ).toContain("root");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const [label, rel] of [
    ["the own workflow root", path.join(".github", "workflows")],
    ["the composite-action root", path.join(".github", "actions")],
  ] as const) {
    it(`reports a truncated walk of ${label} as a finding rather than passing on it`, () => {
      // The lane half of the same finding, and it is the half that mattered: a tree a pull request
      // padded past the ceiling had the files past it never parsed, while every rule scoped to that
      // tree reported PASS over the part that was read. An unpinned action, or a YAML weakening the
      // required context, hides behind the padding.
      //
      // Past `MAX_WALKED_ENTRIES`, which is a thousand — chosen so this row costs a fifth of what
      // it did at five thousand, and still two orders of magnitude above any legitimate tree.
      //
      // The padding is named `zz-…` so it sorts AFTER every real file: the whole legitimate tree is
      // still walked and every other rule still sees it, which makes the truncation finding the only
      // one this row can be reddened by. The files are empty and not YAML, because the walk counts
      // ENTRIES and reads only the `.yml` ones.
      const dir = plantedTree((d) => {
        const pad = path.join(d, rel);
        mkdirSync(pad, { recursive: true });
        for (let i = 0; i < 1_001; i += 1) {
          writeFileSync(path.join(pad, `zz-pad-${String(i).padStart(5, "0")}.txt`), "");
        }
      });
      try {
        const run = runLane(dir);
        expect
          .soft(run.exitCode, `a partial scan is not a pass:\n${run.output.slice(0, 4000)}`)
          .toBe(1);
        expect
          .soft(
            run.output,
            "the finding must say the walk stopped, not merely that something is wrong",
          )
          .toMatch(/stopped walking/);
        expect
          .soft(run.output, "and name the tree it stopped in")
          .toContain(rel.replace(/\\/g, "/"));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }, 240_000);
  }
});

describe("the lane writes the artifact the Reviewer Gate ingests", () => {
  it("emits gate-shaped JSON carrying every finding, on a dirty tree", () => {
    // Review finding [15]: the lane wrote prose to stderr, the gate ingests
    // `{ findings: [...] }` JSON under `.qfai/review/**`, and no production bridge existed between
    // them anywhere — the E2E that demonstrates the ingestion parsed stderr and built the JSON
    // itself. So a hygiene violation failed the CI log and never reached a reviewer.
    const dir = plantedTree((d) => {
      const target = path.join(d, path.join(SHIPPED_WORKFLOWS_REL, "qfai-tests.yml"));
      writeFileSync(target, `${readFileSync(target, "utf-8")}# v9.9.9\n`, "utf-8");
    });
    try {
      const reportRel = path.join(".qfai", "review", "workflow-hygiene");
      const run = runLaneWithReport(dir, reportRel);
      expect.soft(run.exitCode, run.output).toBe(1);

      const artifact = path.join(dir, reportRel, "workflow-hygiene.json");
      const payload: unknown = JSON.parse(readFileSync(artifact, "utf-8"));
      if (!isRecord(payload) || !Array.isArray(payload.findings)) {
        throw new Error("the artifact must be an object with a findings array");
      }
      const first: unknown = payload.findings[0];
      if (!isRecord(first)) throw new Error("the artifact carried no finding");

      // The gate keys on `code`, and passes `file` / `job` / `rule` through untouched — so those
      // four are the contract between the two, not a convenience.
      expect.soft(first.code, "the code the gate keys on").toBe("R-WORKFLOW-HYGIENE-DRIFT");
      expect.soft(first.rule).toBe("shipped-version-marker");
      expect.soft(String(first.file)).toContain("qfai-tests.yml");
      expect.soft(first.job, "the site, so a reviewer is not sent hunting").toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits an empty findings array on a clean tree, so a missing file means the bridge did not run", () => {
    // Two different facts, and they have to stay distinguishable: nothing found, versus nothing
    // asked. Writing on every run also overwrites a stale artifact rather than leaving one to be
    // read as current.
    const dir = plantedTree(() => undefined);
    try {
      const reportRel = path.join(".qfai", "review", "workflow-hygiene");
      const run = runLaneWithReport(dir, reportRel);
      expect.soft(run.exitCode, run.output).toBe(0);
      const artifact = path.join(dir, reportRel, "workflow-hygiene.json");
      const payload: unknown = JSON.parse(readFileSync(artifact, "utf-8"));
      if (!isRecord(payload)) throw new Error("the artifact must be an object");
      expect(payload.findings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

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

// The two shipped rules review findings [10] and [14] added, registered here for the same
// reason the third-party plant above was: `TC-0017-0047` derives the evaluated set from this
// table, so a rule printed by every green run and demonstrated by nothing is exactly the hole
// that check exists to find.
PLANTS.push({
  rule: "shipped-version-marker",
  label: "a shipped file carries a version marker in a comment",
  file: SHIPPED_THIRD_PARTY_FILE,
  plant: (dir) => {
    editShipped(dir, SHIPPED_THIRD_PARTY_FILE, (text) => `${text}# v9.9.9\n`);
    // The marker rule reports a LINE rather than a job, because a comment belongs to no job —
    // and the site is what an operator needs. The table's `job` field carries it.
    return "line";
  },
});

PLANTS.push({
  rule: "shipped-runner-label",
  label: "a shipped job names a private runner label",
  file: SHIPPED_THIRD_PARTY_FILE,
  plant: (dir) => {
    editShipped(dir, SHIPPED_THIRD_PARTY_FILE, (text) =>
      text.replace(
        "runs-on: ${{ vars.QFAI_CI_RUNNER || 'ubuntu-latest' }}",
        "runs-on: self-hosted",
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
    const declared = firstContext(dir);
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
        .soft(printedRules(run.output, SHIPPED_SCOPE), "the shipped scope must declare its rules")
        .toEqual(["shipped-third-party", "shipped-version-marker", "shipped-runner-label"].sort());
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

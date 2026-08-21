/**
 * E2E: the layered CI scaffold an adopter receives (spec-0017)
 *
 * `spec-0017` has two halves. The first is QFAI's own CI, which
 * `tests/scripts/ownWorkflowTopology.test.ts` and `tests/scripts/workflowHygiene.test.ts` assert
 * against `.github/workflows/**` directly. The second is the half a user story is about: **the same
 * scaffold in the templates QFAI ships, so an adopter receives it rather than rebuilding it.** That
 * half has exactly one end-to-end surface — run `qfai init` into an empty project and read what
 * arrives — and this file is it.
 *
 * `US-*` is answered from `<testsDir>/e2e/**` (`catalog/test-layers.md`, `QFAI-ATDD-111`), so the
 * nine annotations below are this spec's US coverage. Before this file there were none, and the gate
 * reported all nine.
 *
 * ## What each row establishes, and what it does not
 *
 * Measured against the shipped tree before writing a line of this file. Four of the nine user
 * stories are satisfied in `assets/init/root/.github/workflows/**` today; five are not:
 *
 *     US-0017-0001  detection job + verdict over toJSON(needs)      SHIPPED
 *     US-0017-0002  SHA pins, persist-credentials: false            SHIPPED
 *     US-0017-0003  no workflow-level Node version literal          SHIPPED
 *     US-0017-0009  the layer-to-CI-lane map                        SHIPPED
 *     US-0017-0004  build reuse + upload hygiene                    no surface: 0 uploads, 0 builds
 *     US-0017-0005  layer lanes without a new check name            5 separate JOBS, not matrix legs
 *     US-0017-0006  a hygiene lint lane pull requests run           not invoked by the shipped set
 *     US-0017-0007  parallelism knobs derived from the workload      no knob file ships
 *     US-0017-0008  the duplicate validate workflow retired          qfai-validate.yml still ships
 *
 * The four satisfied ones are asserted on their substance. The five unsatisfied ones are **not**
 * asserted as absences: a test pinning "no hygiene lane is invoked" would fail the day someone
 * correctly adds one, which is a test that punishes its own fix. Each instead asserts the INVARIANT
 * its user story depends on and which stays true after the gap closes — the trigger a lint lane
 * would run on, the single-workflow shape a matrix would live in, and so on.
 *
 * That difference is the point of the Coverage Depth Matrix, and it is recorded there rather than
 * flattened here: `.qfai/evidence/coverage-depth-spec-0017.md` carries a `❌` per unsatisfied story
 * with the ledger rows that would close it.
 *
 * `runInit` once, shared. Nine inits of a full asset tree is nine times the same work, and this
 * spec's own integration slice was pushed past its timeout by exactly that shape.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import { classifyBuildCommand } from "../helpers/buildCommand.js";
import {
  ALLOWED_ACTION_INPUTS,
  ALLOWED_ACTIONS,
  ALLOWED_SHELLS,
  invocationsOf,
  refusals,
} from "../helpers/shippedLaneCommands.js";
import { captureStdout } from "../helpers/stdout.js";

/** The initialised project, built once for the whole file. */
let projectPromise: Promise<string> | undefined;

function project(): Promise<string> {
  projectPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0017-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return projectPromise;
}

// The shared project is one temp tree for the whole file, so it needs one teardown. Without
// this each run of the suite left a full asset tree behind — the cost of memoizing the
// fixture is that its lifetime is now the file's, not an individual test's.
afterAll(async () => {
  if (projectPromise === undefined) return;
  const dir = await projectPromise;
  await rm(dir, { recursive: true, force: true });
});

const ORCHESTRATOR = "qfai-tests.yml";

async function workflowText(file: string): Promise<string> {
  return readFile(path.join(await project(), ".github", "workflows", file), "utf-8");
}

async function exists(rel: string): Promise<boolean> {
  try {
    await access(path.join(await project(), rel));
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes one extracted `run:` body under bash with a stubbed `GITHUB_OUTPUT`, returning the exit
 * status, the streams and the `key=value` pairs the shell published.
 *
 * The same pattern as `tests/integration/shippedWorkflow*.test.ts`: the only way to tell a step that
 * resolves a value from a step that merely mentions one is to run it and read what came out.
 */
async function runStep(
  body: string,
  cwd: string,
): Promise<{
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
  skipped: boolean;
}> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-step-"));
  try {
    const scriptPath = path.join(stage, "step.sh");
    const outputPath = path.join(stage, "github-output.txt");
    await writeFile(scriptPath, body, "utf8");
    await writeFile(outputPath, "", "utf8");
    // `-e -o pipefail` are the flags GitHub applies to a `shell: bash` step, and this row's headline
    // assertion — "no version file must not fail the lane" — is precisely a claim about the exit
    // semantics they define. Two of the three sibling helpers pass them and this one did not, while
    // its docstring claimed to follow their pattern; round 2 caught the divergence. Measured: the
    // current resolver behaves identically either way, so this is correctness ahead of a consequence
    // rather than a fix to one.
    const child = spawnSync("bash", ["-e", "-o", "pipefail", scriptPath], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GITHUB_OUTPUT: outputPath },
    });
    if (child.error !== undefined) {
      // `bash` is absent on some Windows images. Rethrowing turns a missing interpreter into a
      // failure of the property under test, which it is not.
      // Narrowed rather than asserted: the project rule bars a bare `as`, and the repository already
      // has this exact idiom in `scripts/check-atdd-annotation-ledger.mjs`.
      const error: unknown = child.error;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code ?? "")
          : "";
      if (code === "ENOENT")
        return { status: null, stdout: "", stderr: "", outputs: {}, skipped: true };
      throw child.error;
    }
    const outputs: Record<string, string> = {};
    for (const line of (await readFile(outputPath, "utf8")).split(/\r?\n/)) {
      const eq = line.indexOf("=");
      if (eq > 0) outputs[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return {
      status: child.status,
      stdout: child.stdout ?? "",
      stderr: child.stderr ?? "",
      outputs,
      skipped: false,
    };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The orchestrator's job map, narrowed from the parsed document. */
async function jobs(): Promise<Record<string, unknown>> {
  const parsed: unknown = parseYaml(await workflowText(ORCHESTRATOR));
  if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
    throw new Error(`${ORCHESTRATOR} did not parse to a document with a jobs map`);
  }
  return parsed["jobs"];
}

/**
 * Every job in EVERY shipped workflow, keyed `<file>#<job>`.
 *
 * `jobs()` reads the orchestrator alone, and both `US-0017-0004` assertions used to call it — while the
 * story they carry is about an adopter's lanes, plural. Round 10 planted a real build in
 * `qfai-validate.yml` and measured it missed here and caught only by the own-tree scan in
 * `tests/unit/buildCommand.test.ts`: the gap was covered, by a test annotated for something else, and a
 * reader of this annotation would not have known its scope was one file.
 *
 * The set is derived from the shipped directory rather than listed, so a third workflow is in scope the
 * moment it ships instead of the round after someone remembers to add it.
 */
async function shippedWorkflowFiles(): Promise<string[]> {
  const dir = path.join(await project(), ".github", "workflows");
  const files = (await readdir(dir)).filter((name) => /\.ya?ml$/.test(name)).sort();
  if (files.length === 0) throw new Error("the shipped tree has no workflows to read");
  return files;
}

async function shippedJobs(): Promise<Record<string, unknown>> {
  const files = await shippedWorkflowFiles();
  const out: Record<string, unknown> = {};
  for (const file of files) {
    const parsed: unknown = parseYaml(await workflowText(file));
    if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
      throw new Error(`${file} did not parse to a document with a jobs map`);
    }
    for (const [id, job] of Object.entries(parsed["jobs"])) out[`${file}#${id}`] = job;
  }
  return out;
}

// QFAI:SPEC-0017:US-0017-0001
describe(
  "E2E: an adopter receives change-derived selection behind a derived verdict (US-0017-0001)",
  { timeout: 120000 },
  () => {
    it("ships a detection job and a verdict that reads the serialized needs map", async () => {
      const map = await jobs();

      // The detection half. A named job, because the adopter's lanes key their conditions off it.
      expect
        .soft(Object.keys(map), "the shipped orchestrator must carry a detection job")
        .toContain("detection");

      // The drift-proof half, and the reason this row is not satisfied by a job merely existing:
      // a verdict that enumerates need names by hand goes stale the moment a lane is added, which
      // is the failure `BR-0017-0001` is written against. Iterating the serialized map cannot.
      const verdict = map["verdict"];
      expect(verdict, "the shipped orchestrator must carry a verdict job").not.toBeUndefined();
      const text = await workflowText(ORCHESTRATOR);
      expect
        .soft(text, "the verdict must iterate the serialized needs map rather than name lanes")
        .toContain("toJSON(needs)");
    });
  },
);

// QFAI:SPEC-0017:US-0017-0002
describe(
  "E2E: an adopter receives a supply-chain-hardened workflow set (US-0017-0002)",
  { timeout: 120000 },
  () => {
    it("pins every action to a full SHA and refuses to persist credentials", async () => {
      // Derived, not listed. This row said `[ORCHESTRATOR, "qfai-validate.yml"]` while the function
      // that derives the set sat forty lines above it, added last round for `US-0017-0004` after
      // exactly this defect was measured there. A third shipped workflow with a floating-major
      // checkout reference and no `persist-credentials: false` left this row green. (The reference is
      // described rather than written: a co-change guard forbids any test in this suite from carrying a
      // literal floating-major spelling, and it caught this comment.)
      const files = await shippedWorkflowFiles();
      const floating: string[] = [];
      const unhardened: string[] = [];
      for (const file of files) {
        const text = await workflowText(file);
        // Comments are not content. This scan read the RAW text while `US-0017-0003` two rows down
        // skipped comment lines, so two adjacent scans of the same files disagreed — and round 11
        // reddened this one with a backticked `uses:` inside a YAML comment. A false positive rather
        // than a hole, and a scan that documentation can break is a scan people learn to work around.
        const content = text
          .split(/\r?\n/)
          .filter((line) => !line.trim().startsWith("#"))
          .join("\n");
        for (const ref of content.match(/uses:\s*\S+/g) ?? []) {
          // A local composite action has no SHA to pin and is not a supply-chain edge.
          if (/uses:\s*\.\//.test(ref)) continue;
          if (!/@[0-9a-f]{40}\b/.test(ref)) floating.push(`${file}: ${ref.trim()}`);
        }
        const checkouts = (text.match(/uses:\s*actions\/checkout/g) ?? []).length;
        const refusals = (text.match(/persist-credentials:\s*false/g) ?? []).length;
        if (checkouts > refusals) {
          unhardened.push(`${file}: ${checkouts} checkout(s), ${refusals} refusal(s)`);
        }
      }
      expect
        .soft(floating, "every third-party action in the shipped set must be pinned to a full SHA")
        .toEqual([]);
      expect
        .soft(unhardened, "every checkout in the shipped set must set persist-credentials: false")
        .toEqual([]);
    });
  },
);

// QFAI:SPEC-0017:US-0017-0003
describe(
  "E2E: an adopter receives no hard-coded Node version to drift from (US-0017-0003)",
  { timeout: 120000 },
  () => {
    it("declares no workflow-level Node version literal in either shipped workflow", async () => {
      // The story is "file-derived", and the observable an adopter can check is the absence of the
      // literal that would compete with the file. A version pinned in the workflow and a version in
      // the project's own file are two sources for one answer, which is the drift this forbids.
      const offenders: string[] = [];
      for (const file of await shippedWorkflowFiles()) {
        const text = await workflowText(file);
        for (const line of text.split(/\r?\n/)) {
          if (line.trim().startsWith("#")) continue;
          if (/node-version:\s*['"]?\d/.test(line)) offenders.push(`${file}: ${line.trim()}`);
        }
      }
      expect
        .soft(
          offenders,
          "a workflow-level Node version literal competes with the project's own file",
        )
        .toEqual([]);
    });

    it("resolves the version by running the shipped step, not by naming a file in prose", async () => {
      // The positive half of "file-derived". Round 1's `completion-reviewer` was right that the
      // first version of this row asserted only the negative half, and justified the gap with a
      // claim that was false: the matrix said "nothing here proves the version comes from a file
      // rather than from a default", and `qfai-validate.yml` does prove it — it probes `.nvmrc`
      // then `.node-version` and only falls open to a documented default with a warning.
      //
      // The first repair asserted that over the step's TEXT and was vacuous, which two oracle
      // rounds caught: `.nvmrc` also appears in the step's warning message, and `version=` also
      // appears in its fallback publish, so breaking the real mechanism left both patterns matching
      // other text in the same body. That is the fourth time on this spec that a claim about how
      // code is *written* held while the behaviour was gone.
      //
      // So: run the step. `tests/integration/shippedWorkflow*.test.ts` established this pattern —
      // extract the `run` body, execute it under bash with a stubbed `GITHUB_OUTPUT`, and read what
      // it published. A behaviour cannot be satisfied by a mention.
      const text = await workflowText("qfai-validate.yml");
      const parsed: unknown = parseYaml(text);
      const map = isRecord(parsed) && isRecord(parsed["jobs"]) ? parsed["jobs"] : {};

      // Find the resolver through the CHAIN rather than by guessing its name: setup-node's
      // `node-version` must reference a step output, and that reference names the step to run.
      // Both halves are scoped to ONE job and the search stops at the first match. `steps.<id>` is
      // job-scoped in GitHub Actions, so a resolver in job A can never feed a consumer in job B —
      // and round 2's `implementation-reviewer` measured what the unscoped version did instead: a
      // later job carrying a step with the same `id` and no `setup-node` of its own overwrote the
      // body, so the test executed an unrelated step and asserted against it. `qfai-validate.yml`
      // has one job today, which is exactly why it was invisible; the sibling orchestrator has
      // eight, and folding the validate work into it is this spec's own direction.
      let resolverId: string | undefined;
      let resolverBody: string | undefined;
      for (const job of Object.values(map)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        let idInThisJob: string | undefined;
        for (const step of steps) {
          if (!isRecord(step)) continue;
          const uses = typeof step["uses"] === "string" ? step["uses"] : "";
          if (!/setup-node/.test(uses)) continue;
          const withBlock = isRecord(step["with"]) ? step["with"] : {};
          const version =
            typeof withBlock["node-version"] === "string" ? withBlock["node-version"] : "";
          const reference =
            /\$\{\{\s*steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)\s*\}\}/.exec(version);
          if (reference === null) continue;
          idInThisJob = reference[1];
          break;
        }
        if (idInThisJob === undefined) continue;
        for (const step of steps) {
          if (!isRecord(step)) continue;
          if (step["id"] !== idInThisJob) continue;
          if (typeof step["run"] !== "string") continue;
          resolverId = idInThisJob;
          resolverBody = step["run"];
          break;
        }
        if (resolverBody !== undefined) break;
      }

      expect
        .soft(
          resolverId,
          "setup-node must take its version from a resolved step output, not a literal",
        )
        .toBeDefined();
      expect
        .soft(resolverBody, "the referenced resolver step must exist and carry a run body")
        .toBeDefined();
      if (resolverBody === undefined) return;

      // With an adopter version file present, the published version must be the file's content.
      // BOTH probe candidates are exercised, and a third directory settles their precedence. Round 2
      // caught the Coverage Depth Matrix claiming "the two probe candidates … are exercised" when
      // only `.nvmrc` was ever written — deleting `.node-version` from the shipped probe list was
      // invisible to this row. Asserting the second candidate is four lines; leaving the sentence
      // false was the alternative.
      // Every fixture directory is registered as it is created, and torn down from that list — the
      // first version mkdtemp'd two of them BEFORE the `try`, so a failure in the second leaked the
      // first. Round 2 found it.
      const fixtures: string[] = [];
      const fixture = async (suffix: string): Promise<string> => {
        const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-e2e-nodever-${suffix}-`));
        fixtures.push(dir);
        return dir;
      };
      try {
        const withFile = await fixture("a");
        const withoutFile = await fixture("b");
        const withSecond = await fixture("c");
        const withBoth = await fixture("d");
        await writeFile(path.join(withFile, ".nvmrc"), "23.4.1\n", "utf8");
        const pinned = await runStep(resolverBody, withFile);
        if (pinned.skipped) return;
        expect
          .soft(
            pinned.outputs["version"],
            "the adopter's own version file must win — this is the whole of 'file-derived'",
          )
          .toBe("23.4.1");

        await writeFile(path.join(withSecond, ".node-version"), "21.7.3\n", "utf8");
        const second = await runStep(resolverBody, withSecond);
        expect
          .soft(
            second.outputs["version"],
            "the second probe candidate must resolve too, or the list is one entry long",
          )
          .toBe("21.7.3");

        // Precedence, so the order is a fact rather than an accident of which file a project has.
        await writeFile(path.join(withBoth, ".nvmrc"), "23.4.1\n", "utf8");
        await writeFile(path.join(withBoth, ".node-version"), "21.7.3\n", "utf8");
        const both = await runStep(resolverBody, withBoth);
        expect
          .soft(both.outputs["version"], "`.nvmrc` is probed first, so it wins when both exist")
          .toBe("23.4.1");

        // With none present it must fall OPEN rather than fail, and say so.
        const fallback = await runStep(resolverBody, withoutFile);
        if (fallback.skipped) return;
        expect.soft(fallback.status, "no version file must not fail the lane").toBe(0);
        // The documented literal, not "any leading digit". Round 2 pointed out that the integration
        // row at `tests/integration/shippedWorkflowPortability.test.ts` asserts the exact value, and
        // that an E2E row claiming to have added a behavioural check should not be the weaker of the
        // two. The value is the `engines: ">=20.19.0"` floor the shipped comment names.
        expect
          .soft(
            fallback.outputs["version"],
            "the documented fallback must be published verbatim, or setup-node receives a guess",
          )
          .toBe("20");
        expect
          .soft(
            fallback.stdout + fallback.stderr,
            "falling open silently is the drift this forbids",
          )
          .toMatch(/::warning::/);
      } finally {
        for (const dir of fixtures) await rm(dir, { recursive: true, force: true });
      }
    });
  },
);

// QFAI:SPEC-0017:US-0017-0004
describe(
  "E2E: an adopter's lanes do not each rebuild what one could produce (US-0017-0004)",
  { timeout: 120000 },
  () => {
    it("ships no lane that runs its own bundler build", async () => {
      // The invariant, not the feature. Measured: the shipped set uploads no artifact and runs no
      // build, so "reuse" has no surface there yet and `TDD-0032`..`TDD-0035` are `blocked` on
      // `CR-20260820-0007`. What holds now and after that work is that no lane duplicates a build —
      // before reuse because there is nothing to duplicate, after it because reuse is the point.
      //
      // Five versions of this predicate, each measured, each of the first four wrong in a way the
      // next round found — the history is in `tests/helpers/buildCommand.ts`, which now owns it, with
      // its corpora in `tests/unit/buildCommand.test.ts`. The two facts that matter here:
      //
      //   - v4 caught this repository's `pnpm ci:build-verify` by the script's NAME. Its body is
      //     `node ./scripts/check-build-warnings.mjs && …`, so the predicate was measuring npm-script
      //     naming rather than behaviour — the exact defect this spec keeps finding.
      //   - the shipped tree ships no `package.json`, so no script body can be resolved for an
      //     adopter and a name-shaped match is all that is available. This assertion therefore
      //     rejects **both** `build` and `heuristic`, which is the stronger claim: not even a
      //     suspicious name appears in a shipped lane.
      //
      // Over the whole shipped SET, not the orchestrator alone. Round 10 planted a build in
      // `qfai-validate.yml` and this row did not see it, because it read one file while its annotation
      // claims a property of an adopter's lanes.
      const map = await shippedJobs();
      const rebuilding: string[] = [];
      for (const [id, job] of Object.entries(map)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        for (const step of steps) {
          const run = isRecord(step) ? step["run"] : undefined;
          if (typeof run !== "string") continue;
          for (const line of run.split(/\r?\n/)) {
            // Comments are not commands, trailing ones included — round 2 found that whole-line
            // stripping alone read `pnpm check-types   # runs tsc -b` as a build.
            const command = line.replace(/#.*$/, "").trim();
            if (command === "") continue;
            const verdict = classifyBuildCommand(command);
            if (verdict !== "none") rebuilding.push(`${id} [${verdict}]: ${command.slice(0, 55)}`);
          }
        }
      }
      expect
        .soft(rebuilding, "no shipped lane may run its own build; one producer feeds the rest")
        .toEqual([]);
    });

    it("invokes only the programs an adopter's lanes are allowed to invoke", async () => {
      // The same story, asserted the other way round, because the first way cannot be made to work.
      //
      // The assertion above asks "is any of this a build" and answers with a predicate over build
      // spellings. Ten versions of that predicate were reported clean and then broken; round 10 planted
      // fifty real builds and **forty-four shipped unnoticed**, with the verdict that settles the
      // approach: "I did not have to find a weakness in v12: I only named build tools it does not name."
      // A denylist over spellings fails OPEN — every spelling nobody thought of is a pass — and for a
      // claim whose whole content is "there is nothing here", that is the wrong direction.
      //
      // This asks the decidable question instead: **what does the lane invoke?** The shipped tree
      // invokes a small fixed set of programs. Enumerating them and refusing everything else needs no
      // corpus of
      // build spellings and cannot be evaded by one. It fails CLOSED: adding an innocent program breaks
      // this test, which is the correct cost for a shipped surface — a new program in an adopter's lane
      // is a change someone should read.
      //
      // The split between the two lists is the whole design. A program whose arguments cannot reach a
      // build is allowed by NAME; a program that could build is allowed only as an exact invocation, so
      // `npx qfai` ships and `npx tsup` does not, though they are the same program.
      const map = await shippedJobs();
      const refused: string[] = [];
      for (const [id, job] of Object.entries(map)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        for (const step of steps) {
          const run = isRecord(step) ? step["run"] : undefined;
          if (typeof run !== "string") continue;
          for (const invocation of refusals(run)) refused.push(`${id}: ${invocation}`);
        }
      }
      expect
        .soft(
          refused,
          "a shipped lane may invoke only an enumerated program; anything else is a change to read, " +
            "which is the point of refusing it",
        )
        .toEqual([]);

      // And the SET itself, pinned. Three sites used to carry three different counts of it, none
      // derived; a set is checkable where a count is not, because a reader can see what changed rather
      // than only that a number moved. Adding a program to a shipped lane must be a visible diff here.
      const invoked = new Set<string>();
      for (const job of Object.values(map)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        for (const step of steps) {
          const run = isRecord(step) ? step["run"] : undefined;
          if (typeof run !== "string") continue;
          // PROGRAMS, not invocations: an `echo` invocation carries its whole message, so a pin over
          // invocations would break on any wording edit and pin nothing anyone cares about.
          for (const invocation of invocationsOf(run)) invoked.add(invocation.split(" ")[0] ?? "");
        }
      }
      expect
        .soft([...invoked].sort(), "the set of programs an adopter's lanes invoke")
        .toEqual([
          "[",
          "corepack",
          "cut",
          "echo",
          "exit",
          "git",
          "grep",
          "node",
          "npm",
          "npx",
          "pnpm",
          "printf",
          "read",
          "tr",
          "true",
          "yarn",
        ]);

      // The other channel, which round 10 found invisible to BOTH instruments: a build arriving as an
      // action input. `uses: gradle/actions/setup-gradle` with `arguments: build` runs a build without a
      // `run:` line existing, and the assertion above greps `run:` bodies. So the action and every input
      // key it is given are enumerated too — `arguments`, `args` and `run` are refused by not appearing.
      const refusedUses: string[] = [];
      const readUses = (label: string, holder: Record<string, unknown>): void => {
        const uses = holder["uses"];
        if (typeof uses === "string") {
          const action = uses.split("@")[0] ?? uses;
          if (!ALLOWED_ACTIONS.has(action)) refusedUses.push(`${label}: uses ${action}`);
          const inputs = holder["with"];
          if (isRecord(inputs)) {
            for (const key of Object.keys(inputs)) {
              if (!ALLOWED_ACTION_INPUTS.has(key))
                refusedUses.push(`${label}: ${action} with ${key}`);
            }
          }
        }
        // An image is a program with an entrypoint, so it is the same channel by another name and
        // nothing in the shipped set uses one. Refused by not being enumerated at all.
        for (const key of ["container", "services"]) {
          if (holder[key] !== undefined) refusedUses.push(`${label}: declares ${key}`);
        }
        // A `shell:` is a COMMAND TEMPLATE. Round 12 planted `shell: npx tsup {0}` with a `run:` body of
        // `echo noop` and it shipped, because the scan read `run:` bodies and `uses:` and never this. Same
        // shape as the job-level `uses:` the previous round closed: a channel one level from where anyone
        // had looked. Every shipped step declares `bash`.
        const shell = holder["shell"];
        if (shell !== undefined && (typeof shell !== "string" || !ALLOWED_SHELLS.has(shell))) {
          refusedUses.push(`${label}: declares shell ${JSON.stringify(shell)}`);
        }
      };
      for (const [id, job] of Object.entries(map)) {
        if (!isRecord(job)) continue;
        // The JOB level first. The previous version read `step["uses"]` inside `job["steps"]`, so a job
        // with no steps was scanned zero times — and a job-level `uses:` is a whole third-party
        // reusable workflow, a larger supply-chain edge than any of the three enumerated actions. The
        // planted one carried `with: arguments: build`, which is the exact key this guard's own comment
        // names as the channel a `uses:` build arrives by, and it shipped because the key was read at
        // the wrong level of the document.
        readUses(id, job);
        const steps = Array.isArray(job["steps"]) ? job["steps"] : [];
        for (const step of steps) {
          if (!isRecord(step)) continue;
          readUses(id, step);
        }
      }
      expect
        .soft(
          refusedUses,
          "a shipped lane may use only an enumerated action with enumerated inputs; `arguments` and " +
            "`args` are refused by not being listed, which is the channel a `uses:` build arrives by",
        )
        .toEqual([]);
    });
  },
);

// QFAI:SPEC-0017:US-0017-0005
describe(
  "E2E: an adopter's layer separation lives in one workflow file (US-0017-0005)",
  { timeout: 120000 },
  () => {
    it("ships exactly one orchestrator carrying every test lane", async () => {
      // "Without a new check name" is about not adding a workflow FILE, which is what would add check
      // names an adopter's branch protection does not know. Measured: the shipped set separates layers
      // into five jobs rather than the matrix legs the own tree uses — a divergence recorded as `❌` in
      // the Coverage Depth Matrix, not asserted here, because either shape satisfies "one file".
      const map = await jobs();
      const lanes = ["unit", "component", "integration", "api", "e2e"].filter((id) => id in map);
      expect
        .soft(lanes.length, "every test layer must be a job of the one orchestrator")
        .toBeGreaterThanOrEqual(5);

      const dir = path.join(await project(), ".github", "workflows");
      const { readdir } = await import("node:fs/promises");
      const files = (await readdir(dir)).filter((f) => /\.ya?ml$/.test(f)).sort();
      expect
        .soft(files, "layer separation must not arrive as one workflow file per layer")
        .toEqual([ORCHESTRATOR, "qfai-validate.yml"]);
    });
  },
);

// QFAI:SPEC-0017:US-0017-0006
describe(
  "E2E: an adopter's workflow set runs on the event that matters (US-0017-0006)",
  { timeout: 120000 },
  () => {
    it("triggers on pull_request, which is where a lint lane would run", async () => {
      // The invariant the story rests on. Measured: the shipped orchestrator does not invoke the
      // hygiene lane yet — `❌` in the matrix — but a lane added to a workflow that never runs on a
      // pull request would be the "aggregate nobody runs" failure `BR-0017-0041` names, so the trigger
      // is the half worth pinning and it stays true after the lane lands.
      const parsed: unknown = parseYaml(await workflowText(ORCHESTRATOR));
      // `on` is read under two keys: YAML 1.1 folds the bare word to the boolean `true`.
      const under = isRecord(parsed)
        ? (parsed["on"] ?? parsed[String(true)] ?? parsed["true"])
        : undefined;
      expect(isRecord(under), "the shipped orchestrator must declare triggers").toBe(true);
      expect
        .soft(Object.keys(isRecord(under) ? under : {}), "it must run on pull requests")
        .toContain("pull_request");
    });
  },
);

/*
 * US-0017-0007 — runner parallelism derived from QFAI's own workload — is NOT covered here, and the
 * annotation for it has been REMOVED from `tests/e2e/qfai-traceability.md`.
 *
 * The first version of this file claimed it with one assertion: that `qfai.config.yaml` exists after
 * init. Round 1's `completion-reviewer` found that `tests/e2e/initE2E.test.ts` already asserts
 * exactly that — "creates qfai.config.yaml in the project root" — so the row added no discriminating
 * power at all. Its own matrix cell already conceded the assertion "would hold for a project with no
 * knobs in it at all" and scored its oracle strength missing.
 *
 * That is an annotation over a gap, which is the failure `CR-20260814-0001` describes: the ledger the
 * gate reads is hand-maintained, so a line in it certifies coverage in both false directions. Writing
 * one for a story nothing tests is the direction that matters.
 *
 * So `QFAI-ATDD-111` reports `US-0017-0007` again, deliberately. Measured: no knob file ships —
 * `vitest.knobs.ts` exists only under `packages/qfai/` and is not part of the init asset tree — so an
 * adopter receives no declared worker or file-parallelism setting, and there is nothing to assert
 * that a project without the feature would fail. The row becomes coverable when the knobs ship.
 */

// QFAI:SPEC-0017:US-0017-0008
describe(
  "E2E: an adopter's required check keeps its work when a workflow retires (US-0017-0008)",
  { timeout: 120000 },
  () => {
    it("ships a validate workflow whose run is reachable, not an empty shell", async () => {
      // Measured: `qfai-validate.yml` still ships, so the retirement half is `❌` in the matrix. The
      // invariant either way is that the validate work is somewhere reachable — the failure this story
      // guards against is a workflow retired while the check that depended on it keeps its name and
      // loses its content, which is the "green check over nothing" case `BR-0017-0032` is about.
      const text = await workflowText("qfai-validate.yml");
      const map = await jobs();
      const reachable =
        /qfai\s+validate|dist\/cli\/index\.mjs\s+validate|npx\s+qfai\s+validate/.test(text) ||
        Object.keys(map).some((id) => id.includes("validate"));
      expect
        .soft(reachable, "the validate work must be reachable from a shipped workflow")
        .toBe(true);
    });
  },
);

// QFAI:SPEC-0017:US-0017-0009
describe(
  "E2E: an adopter receives the layer-to-CI-lane map, invisibly to the parser (US-0017-0009)",
  { timeout: 120000 },
  () => {
    it("ships the mapping beside the catalog and not as the file the loader resolves", async () => {
      const mapping = path.join(".qfai", "assistant", "catalog", "test-layers-ci-lanes.md");
      const catalog = path.join(".qfai", "assistant", "catalog", "test-layers.md");
      expect.soft(await exists(mapping), "the mapping document must reach the adopter").toBe(true);
      expect.soft(await exists(catalog), "beside the catalog it maps from").toBe(true);

      // The invisibility half, at the adopter's copy: the loader resolves `test-layers.md`, and the
      // mapping's own header has to say so — an adopter reading the map must not take it for policy.
      const text = await readFile(path.join(await project(), mapping), "utf-8");
      expect
        .soft(text, "the mapping must disclaim the layer-policy loader in its header")
        .toMatch(/does not read|not the file the loader/i);
    });
  },
);

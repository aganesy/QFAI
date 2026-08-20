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
import { mkdtemp, readFile, rm, access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
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
}> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-step-"));
  try {
    const scriptPath = path.join(stage, "step.sh");
    const outputPath = path.join(stage, "github-output.txt");
    await writeFile(scriptPath, body, "utf8");
    await writeFile(outputPath, "", "utf8");
    const child = spawnSync("bash", [scriptPath], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, GITHUB_OUTPUT: outputPath },
    });
    if (child.error !== undefined) throw child.error;
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
      const files = [ORCHESTRATOR, "qfai-validate.yml"];
      const floating: string[] = [];
      const unhardened: string[] = [];
      for (const file of files) {
        const text = await workflowText(file);
        for (const ref of text.match(/uses:\s*\S+/g) ?? []) {
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
      for (const file of [ORCHESTRATOR, "qfai-validate.yml"]) {
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
      const withFile = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nodever-a-"));
      const withoutFile = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nodever-b-"));
      const withSecond = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nodever-c-"));
      const withBoth = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nodever-d-"));
      try {
        await writeFile(path.join(withFile, ".nvmrc"), "23.4.1\n", "utf8");
        const pinned = await runStep(resolverBody, withFile);
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
        expect.soft(fallback.status, "no version file must not fail the lane").toBe(0);
        expect
          .soft(
            fallback.outputs["version"],
            "a documented fallback must still be published, or setup-node receives nothing",
          )
          .toMatch(/^\d+/);
        expect
          .soft(fallback.outputs["version"], "the fallback must not be mistaken for a pinned value")
          .not.toBe("23.4.1");
        expect
          .soft(
            fallback.stdout + fallback.stderr,
            "falling open silently is the drift this forbids",
          )
          .toMatch(/::warning::/);
      } finally {
        for (const dir of [withFile, withoutFile, withSecond, withBoth]) {
          await rm(dir, { recursive: true, force: true });
        }
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
      // Three widenings, each measured, because the first two were each wrong in one direction.
      //
      // v1 `/\b(pnpm|npm|yarn)\s+(-\S+\s+\S+\s+)?build\b/` admitted ONE flag-value pair. Round 1
      //    measured it a form at a time: `pnpm run build`, `npm run build`, `yarn run build`,
      //    `pnpm exec tsup` and `npx tsup` all reddened NOTHING. The idiomatic form was invisible.
      // v2 `/\b(?:pnpm|npm|yarn|npx|bun)\b[^\n]*?\bbuild\b/` fixed that and overshot. Round 2
      //    measured the other direction, which nobody had: `npx tsc --noEmit` is a TYPE CHECK and
      //    was reported as a build, and `--cache-location .cache/build`, `reports/build.xml`,
      //    `--output=build-artifacts` and `./build` all matched. It was also not the verb anchor its
      //    own comment claimed — it was a closed five-member package-manager list, so `make build`,
      //    `turbo run build`, `nx build`, `cargo build`, `go build`, `bazel build`, `gradle build`
      //    and `./scripts/build.sh` were all invisible.
      // v3, below, anchors on `build` as a standalone shell WORD, which is what the runners above
      //    have in common and what a path fragment does not. Measured both directions:
      //    21 forms caught, 14 non-builds rejected, 0 misclassified.
      //
      // `tsc` is deliberately absent from BUNDLER: in this ecosystem it is a type check as often as
      // an emit — `npx tsc --noEmit`, and this repository's own `check-types` is `tsc -b`. A lane
      // that genuinely bundles reaches for one of the others.
      const BUILD_WORD = /(?<![\w/=.-])build(?![\w/.-])/;
      const BUILD_SCRIPT = /[\w./-]*\bbuild[\w.-]*\.(?:sh|ps1|bat|cmd|mjs|cjs|js|ts)\b/;
      const BUNDLER = /\b(?:tsup|rollup|esbuild|webpack|swc|parcel|vite\s+build)\b/;
      const map = await jobs();
      const rebuilding: string[] = [];
      for (const [id, job] of Object.entries(map)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        for (const step of steps) {
          const run = isRecord(step) ? step["run"] : undefined;
          if (typeof run !== "string") continue;
          // Comments inside a `run` block are not commands. Scanning the raw string is how a claim
          // goes vacuous by matching prose — this spec's own `--no-renames` claim did exactly that,
          // and implement round 5 found it. Whole-line comments were stripped first; round 2 found
          // that TRAILING comments were not, so `pnpm check-types   # runs tsc -b` was read as a
          // build. Both forms go now. The known limit: a `#` inside a quoted string truncates the
          // line, which can only ever make this scan miss, never false-positive.
          const commands = run
            .split(/\r?\n/)
            .map((line) => line.replace(/#.*$/, ""))
            .filter((line) => line.trim() !== "")
            .join("\n");
          if (BUILD_WORD.test(commands) || BUILD_SCRIPT.test(commands) || BUNDLER.test(commands)) {
            rebuilding.push(`${id}: ${commands.trim().slice(0, 60)}`);
          }
        }
      }
      expect
        .soft(rebuilding, "no shipped lane may run its own build; one producer feeds the rest")
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

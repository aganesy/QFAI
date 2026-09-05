/**
 * E2E: the CI workflow set an adopter receives from `qfai init` (spec-0003)
 *
 * `spec-0003` owns the DISTRIBUTED half of CHG-007 — the workflow files QFAI ships into an
 * adopter's `.github/workflows/`. Its eight CHG-007 user stories (`US-0003-0021`..`US-0003-0028`)
 * each already have a deep integration oracle beside `tests/integration/shippedWorkflow*.test.ts`,
 * and every one of those reads the PACKAGED asset under `packages/qfai/assets/init/root/.github/`.
 *
 * That leaves one proposition unasserted, and it is the one a user story is about: **that the
 * property survives delivery.** `qfai init` copies through `copyTemplateTree` with an asset filter
 * and a provenance-aware conflict policy, so a file can be dropped, skipped or truncated between
 * the packaged tree and the adopter's disk without a single integration oracle noticing — each of
 * them is reading the source, not the destination. `US-*` is answered from `<testsDir>/e2e/**`
 * (`catalog/test-layers.md`, `QFAI-ATDD-111`), which is the layer that owns exactly that step.
 *
 * So every assertion below runs against a tree produced by `runInit`, never against
 * `assets/init/**`, and each describe asserts its story's SUBSTANCE on the delivered bytes rather
 * than re-checking that the packaged file still says what its sibling suite already pins. Where the
 * property is behavioural — lane selection, the verdict, Node and package-manager resolution — the
 * delivered step body is EXECUTED under bash, because a step that resolves a value and a step that
 * merely mentions one are indistinguishable to a text scan.
 *
 * `runInit` once, shared across the file: nine inits of a full asset tree is nine times the same
 * work, and this repository has already pushed a slice past its timeout with that shape.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import {
  collectJobSteps,
  headerComment,
  isRecord,
  parseHeaderTable,
} from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/e2e/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ORCHESTRATOR = "qfai-tests.yml";
const VALIDATE = "qfai-validate.yml";
const DOCS = "qfai-docs.yml";

/** The initialised project, built once for the whole file. */
let projectPromise: Promise<string> | undefined;

function project(): Promise<string> {
  projectPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0003-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return projectPromise;
}

afterAll(async () => {
  if (projectPromise === undefined) return;
  const dir = await projectPromise;
  await removeTempTree(dir);
});

async function workflowsDir(): Promise<string> {
  return path.join(await project(), ".github", "workflows");
}

/** Every workflow file `qfai init` actually delivered, sorted. */
async function deliveredWorkflowFiles(): Promise<string[]> {
  const files = (await readdir(await workflowsDir()))
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();
  if (files.length === 0) {
    throw new Error("qfai init delivered no workflow file — every row below would pass vacuously");
  }
  return files;
}

async function workflowText(file: string): Promise<string> {
  return readFile(path.join(await workflowsDir(), file), "utf-8");
}

/** The delivered file's job map, narrowed from the parsed document. */
async function jobsOf(file: string): Promise<Record<string, Record<string, unknown>>> {
  const parsed: unknown = parseYaml(await workflowText(file));
  if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
    throw new Error(`${file} was delivered without a jobs map`);
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, job] of Object.entries(parsed["jobs"])) {
    if (isRecord(job)) out[`${file}#${id}`] = job;
  }
  return out;
}

/** Every job of every delivered workflow, keyed `<file>#<job>`. */
async function deliveredJobs(): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const file of await deliveredWorkflowFiles()) {
    Object.assign(out, await jobsOf(file));
  }
  return out;
}

/** The delivered document itself, for the top-level keys jobs do not carry. */
async function documentOf(file: string): Promise<Record<string, unknown>> {
  const parsed: unknown = parseYaml(await workflowText(file));
  if (!isRecord(parsed)) throw new Error(`${file} was delivered as a non-mapping document`);
  return parsed;
}

type StepRun = {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
  skipped: boolean;
};

/**
 * Executes one delivered `run:` body under bash with a stubbed `GITHUB_OUTPUT`, returning the exit
 * status, both streams and the `key=value` pairs the shell published.
 *
 * `-e -o pipefail` are the flags GitHub applies to a `shell: bash` step, so a claim about a lane's
 * exit semantics is only a claim about the delivered file when they are on. The same shape as
 * `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` and the `shippedWorkflow*` integration suites.
 */
async function runStep(body: string, cwd: string, env: NodeJS.ProcessEnv = {}): Promise<StepRun> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-step-"));
  try {
    const scriptPath = path.join(stage, "step.sh");
    const outputPath = path.join(stage, "github-output.txt");
    await writeFile(scriptPath, body, "utf8");
    await writeFile(outputPath, "", "utf8");
    const child = spawnSync("bash", ["-e", "-o", "pipefail", scriptPath], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, ...env, GITHUB_OUTPUT: outputPath },
    });
    if (child.error !== undefined) {
      // `bash` is absent on some Windows images. Rethrowing would turn a missing interpreter into a
      // failure of the property under test, which it is not.
      const error: unknown = child.error;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code ?? "")
          : "";
      if (code === "ENOENT") {
        return { status: null, stdout: "", stderr: "", outputs: {}, skipped: true };
      }
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
    await removeTempTree(stage);
  }
}

/** The `run:` body of the named step of the named job, or a throw naming what was missing. */
async function stepBody(file: string, jobId: string, stepId: string): Promise<string> {
  const job = (await jobsOf(file))[`${file}#${jobId}`];
  if (job === undefined) throw new Error(`${file} was delivered without a '${jobId}' job`);
  for (const step of collectJobSteps(job)) {
    if (step["id"] === stepId && typeof step["run"] === "string") return step["run"];
  }
  throw new Error(`${file}#${jobId} was delivered without a run-carrying step id '${stepId}'`);
}

/** A throwaway git repository with one commit per supplied tree, oldest first. */
async function gitRepoWithCommits(trees: ReadonlyArray<Record<string, string>>): Promise<{
  dir: string;
  shas: string[];
}> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-git-"));
  const git = (...args: string[]): string => {
    const child = spawnSync("git", args, { cwd: dir, encoding: "utf-8" });
    if (child.status !== 0) {
      throw new Error(`git ${args.join(" ")} failed: ${child.stderr ?? ""}`);
    }
    return (child.stdout ?? "").trim();
  };
  git("init", "--quiet", "--initial-branch", "main");
  git("config", "user.email", "e2e@example.invalid");
  git("config", "user.name", "qfai e2e");
  const shas: string[] = [];
  for (const tree of trees) {
    for (const [rel, contents] of Object.entries(tree)) {
      const target = path.join(dir, rel);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents, "utf8");
    }
    git("add", "-A");
    git("commit", "--quiet", "-m", `commit ${shas.length + 1}`);
    shas.push(git("rev-parse", "HEAD"));
  }
  return { dir, shas };
}

const gitRepos: string[] = [];
afterAll(async () => {
  await Promise.allSettled(gitRepos.map((dir) => removeTempTree(dir)));
});

async function scratchRepo(trees: ReadonlyArray<Record<string, string>>): Promise<{
  dir: string;
  shas: string[];
}> {
  const repo = await gitRepoWithCommits(trees);
  gitRepos.push(repo.dir);
  return repo;
}

// QFAI:SPEC-0003:US-0003-0021
describe(
  "E2E: an adopter receives a hardened validate workflow, not merely a packaged one (US-0003-0021)",
  { timeout: 120000 },
  () => {
    it("delivers every job bounded, least-privileged and cancellable", async () => {
      const jobs = await deliveredJobs();
      expect(Object.keys(jobs).length).toBeGreaterThan(0);

      for (const [key, job] of Object.entries(jobs)) {
        expect(typeof job["timeout-minutes"], `${key} arrived unbounded`).toBe("number");
        const permissions = job["permissions"];
        expect(
          permissions === undefined,
          `${key} arrived with no job-reachable permissions block`,
        ).toBe(false);
        // Least privilege is a claim about what is NOT granted, so it is asserted as the absence of
        // any `write` scope rather than as equality with one accepted literal — a job that later
        // needs `checks: read` stays compliant, a job that gains `contents: write` does not.
        if (isRecord(permissions)) {
          for (const [scope, level] of Object.entries(permissions)) {
            expect(String(level), `${key} grants ${scope}: ${String(level)}`).not.toBe("write");
          }
        }
      }
    });

    it("delivers ref-scoped cancelling concurrency and a credential-free checkout", async () => {
      for (const file of await deliveredWorkflowFiles()) {
        const concurrency = (await documentOf(file))["concurrency"];
        expect(isRecord(concurrency), `${file} arrived without a concurrency block`).toBe(true);
        if (!isRecord(concurrency)) continue;
        expect(String(concurrency["group"]), `${file} concurrency is not ref-scoped`).toContain(
          "github.ref",
        );
        expect(concurrency["cancel-in-progress"], `${file} does not cancel superseded runs`).toBe(
          true,
        );
      }

      let checkouts = 0;
      for (const [key, job] of Object.entries(await deliveredJobs())) {
        for (const step of collectJobSteps(job)) {
          const uses = step["uses"];
          if (typeof uses !== "string" || !uses.startsWith("actions/checkout@")) continue;
          checkouts += 1;
          const withBlock = step["with"];
          expect(
            isRecord(withBlock) && withBlock["persist-credentials"] === false,
            `${key} checks out with the token left on disk`,
          ).toBe(true);
        }
      }
      // The loop above is only an oracle while it has something to iterate: a delivery that dropped
      // every checkout step would otherwise satisfy it silently.
      // One per job that reads the tree: the validate lane, the docs lane, and
      // the orchestrator's detection job. The number is asserted rather than
      // merely required to be non-zero because the loop above is only an oracle
      // while it has something to iterate — a delivery that dropped every
      // checkout step would otherwise satisfy it silently.
      expect(checkouts, "no delivered job checks out — the assertion above ran over nothing").toBe(
        3,
      );
    });

    it("stops the header claiming a Node floor the package does not declare", async () => {
      const manifest: unknown = JSON.parse(
        await readFile(path.join(packageRoot, "package.json"), "utf-8"),
      );
      const engines =
        isRecord(manifest) && isRecord(manifest["engines"]) ? manifest["engines"] : {};
      const declared = String(engines["node"] ?? "");
      expect(declared, "the package declares no Node engines range to compare against").not.toBe(
        "",
      );

      const rows = parseHeaderTable(headerComment(await workflowText(VALIDATE)));
      const floor = (rows.get("node support floor") ?? []).join(" ");
      expect(floor, "the delivered header states no Node support floor").not.toBe("");
      // The claim and its source, compared. A header that names a different range than the package
      // ships is exactly the drifted assertion this story removed.
      expect(
        floor,
        `header floor row does not quote the package engines range ${declared}`,
      ).toContain(declared);
    });

    it("preserves the lockfile detection behind the cache through delivery", async () => {
      const job = (await jobsOf(VALIDATE))[`${VALIDATE}#validate`];
      expect(job, "the delivered validate workflow has no validate job").toBeDefined();
      const steps = collectJobSteps(job ?? {});
      const setup = steps.find(
        (step) =>
          typeof step["uses"] === "string" && step["uses"].startsWith("actions/setup-node@"),
      );
      expect(setup, "the delivered validate job sets no Node up").toBeDefined();
      const withBlock = setup?.["with"];
      const cache = isRecord(withBlock) ? String(withBlock["cache"] ?? "") : "";

      // The decision used to be a ternary in `cache:` itself and now lives in a step, because an
      // expression cannot ask whether the package manager is on PATH — and `cache: yarn` sends
      // setup-node to `yarn cache dir` before anything has installed Yarn. What survives delivery
      // is the DETECTION, so this row follows it to wherever it is made rather than pinning the
      // shape it happened to have.
      const named = /steps\.([A-Za-z0-9_-]+)\.outputs\./.exec(cache);
      let deciding = cache;
      if (named !== null) {
        const producer = steps.find((step) => step["id"] === named[1]);
        const body = producer?.["run"];
        expect(
          body,
          `the delivered cache reads steps.${named[1]}.outputs and no step with that id produces a body`,
        ).toBeTypeOf("string");
        deciding = typeof body === "string" ? body : "";
      }

      // All three lockfiles: a delivery that replaced the detection with a single hard-coded
      // manager would still parse and would still be a `cache:` key.
      for (const lockfile of ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]) {
        expect(deciding, `the delivered lane stopped detecting ${lockfile}`).toContain(lockfile);
      }
      expect(
        ["pnpm", "yarn", "npm"].includes(cache.trim()),
        "a single package-manager literal ignores what the adopter actually uses",
      ).toBe(false);
    });
  },
);

// QFAI:SPEC-0003:US-0003-0022
describe(
  "E2E: every action an adopter is handed is pinned, and readable without a trailer (US-0003-0022)",
  { timeout: 120000 },
  () => {
    /** `owner/repo@<ref>` split of every `uses:` in the delivered set, with its step name. */
    async function deliveredUses(): Promise<Array<{ key: string; uses: string; name: string }>> {
      const found: Array<{ key: string; uses: string; name: string }> = [];
      for (const [key, job] of Object.entries(await deliveredJobs())) {
        for (const step of collectJobSteps(job)) {
          const uses = step["uses"];
          if (typeof uses !== "string") continue;
          found.push({ key, uses, name: String(step["name"] ?? "") });
        }
      }
      return found;
    }

    it("delivers commit-SHA pins and a closed one-member third-party set", async () => {
      const uses = await deliveredUses();
      expect(uses.length, "the delivered set references no action at all").toBeGreaterThan(0);

      for (const entry of uses) {
        expect(entry.uses, `${entry.key} is not pinned to a 40-hex commit`).toMatch(
          /^[^@]+@[0-9a-f]{40}$/,
        );
      }

      const thirdParty = new Set(
        uses
          .map((entry) => entry.uses.split("@")[0] ?? "")
          .filter((repo) => !repo.startsWith("actions/")),
      );
      // Closed set, asserted as equality. A subset check would accept a delivery that added a
      // second third-party dependency beside the sanctioned one.
      expect([...thirdParty].sort()).toEqual(["pnpm/action-setup"]);
    });

    it("keeps the readable version out of the comment lane the leakage guard scans", async () => {
      // The shipped-surface guard is comment-blind — it matches the bare token anywhere in the file
      // — so a conventional `# v4.4.0` trailer beside a pin fails the build for every adopter tree
      // built from these assets. `.agents/rules/distributed-surface.md` states the pattern.
      const guard = /\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b/;

      for (const file of await deliveredWorkflowFiles()) {
        const body = await workflowText(file);
        expect(guard.test(body), `${file} was delivered carrying a version marker`).toBe(false);
      }

      // …and the same predicate against a planted trailer, so the green above is a checked green
      // rather than a regex that matches nothing.
      const planted = `${await workflowText(VALIDATE)}\n# v4.4.0\n`;
      expect(guard.test(planted), "the guard pattern cannot see a planted trailer").toBe(true);

      // The version stays readable — it moved to the step name, spelled without the leading `v`
      // the guard keys on.
      const named = (await deliveredUses()).filter((entry) => /\b\d+\.\d+\.\d+\b/.test(entry.name));
      expect(named.length, "no delivered step name carries a readable version").toBeGreaterThan(0);
      for (const entry of named) {
        expect(entry.name, `${entry.key} reintroduces the leading v in its step name`).not.toMatch(
          guard,
        );
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0023
describe(
  "E2E: the layer lanes arrive declared, inert and credential-free (US-0003-0023)",
  { timeout: 120000 },
  () => {
    const LAYERS = ["unit", "component", "integration", "api", "e2e"] as const;

    it("delivers one lane per layer inside one prefixed, self-contained file", async () => {
      const files = await deliveredWorkflowFiles();
      for (const file of files) {
        expect(file, `${file} is delivered without the reserved prefix`).toMatch(/^qfai-/);
      }

      const jobs = await jobsOf(ORCHESTRATOR);
      for (const layer of LAYERS) {
        expect(jobs[`${ORCHESTRATOR}#${layer}`], `${layer} lane was not delivered`).toBeDefined();
      }

      // Self-containment is what keeps a partial install merely incomplete: a delivered file that
      // named a sibling would become a parse error the moment the sibling is absent, and create-only
      // install has no repair path.
      for (const file of files) {
        const body = await workflowText(file);
        for (const other of files) {
          if (other === file) continue;
          expect(body, `${file} references the sibling file ${other}`).not.toContain(other);
        }
      }
    });

    it("keeps every lane conditional on the adopter's own opt-in", async () => {
      const jobs = await jobsOf(ORCHESTRATOR);
      for (const layer of LAYERS) {
        const condition = String(jobs[`${ORCHESTRATOR}#${layer}`]?.["if"] ?? "");
        // BOTH conjuncts: the script probe (the adopter's opt-in) and the diff selection. A lane
        // keyed on selection alone would execute in a tree that declared no such script.
        expect(condition, `${layer} lane is not gated on the script probe`).toContain(
          `needs.detection.outputs.scripts, '${layer}'`,
        );
        expect(condition, `${layer} lane is not gated on lane selection`).toContain(
          `needs.detection.outputs.lanes, '${layer}'`,
        );
      }
    });

    it("resolves the opt-in from the adopter's package.json, executed", async () => {
      const body = await stepBody(ORCHESTRATOR, "detection", "scripts");
      const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-scripts-"));
      try {
        // No package.json at all: nothing is declared, so no lane may run.
        const empty = await runStep(body, cwd);
        if (empty.skipped) return;
        expect(empty.status).toBe(0);
        expect(empty.outputs["scripts"]).toBe("[]");

        // Two layers declared, three not. The probe must report exactly the declared two — a probe
        // that answered "all" or "none" would pass a presence check and break the opt-in.
        await writeFile(
          path.join(cwd, "package.json"),
          JSON.stringify({ scripts: { "test:unit": "vitest run", "test:e2e": "playwright test" } }),
          "utf8",
        );
        const declared = await runStep(body, cwd);
        expect(declared.status).toBe(0);
        expect(JSON.parse(declared.outputs["scripts"] ?? "null")).toEqual(["unit", "e2e"]);

        // Unparsable manifest: still the safe default, and still exit 0.
        await writeFile(path.join(cwd, "package.json"), "{ not json", "utf8");
        const broken = await runStep(body, cwd);
        expect(broken.status).toBe(0);
        expect(broken.outputs["scripts"]).toBe("[]");
      } finally {
        await removeTempTree(cwd);
      }
    });

    it("delivers a set that declares and reads no secret", async () => {
      for (const file of await deliveredWorkflowFiles()) {
        const body = await workflowText(file);
        expect(body, `${file} reads a secret`).not.toMatch(/\bsecrets\s*\./);
        expect(body, `${file} declares a secrets block`).not.toMatch(/^\s*secrets\s*:/m);
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0024
describe(
  "E2E: change detection selects lanes without a third party, and the verdict is green on skip (US-0003-0024)",
  { timeout: 120000 },
  () => {
    it("delivers a detection job that depends on no third-party action", async () => {
      const job = (await jobsOf(ORCHESTRATOR))[`${ORCHESTRATOR}#detection`];
      expect(job, "no detection job was delivered").toBeDefined();
      const repos = collectJobSteps(job ?? {})
        .map((step) => (typeof step["uses"] === "string" ? step["uses"].split("@")[0] : undefined))
        .filter((repo): repo is string => repo !== undefined);
      expect(repos.length, "the detection job uses no action at all").toBeGreaterThan(0);
      for (const repo of repos) {
        expect(repo, "the detection job took a third-party dependency").toMatch(/^actions\//);
      }
    });

    it("selects the empty set for documentation and the superset for source, executed", async () => {
      const body = await stepBody(ORCHESTRATOR, "detection", "diff");
      const docs = await scratchRepo([
        { "README.md": "base\n" },
        { "README.md": "base\ndocs only\n", "docs/guide.md": "prose\n" },
      ]);
      const first = await runStep(body, docs.dir, { QFAI_BASE_REF: docs.shas[0] ?? "" });
      if (first.skipped) return;
      expect(first.status).toBe(0);
      // Documentation needs no test lane — the minimal set, and the one a `contains()` gate reads
      // as "no lane".
      expect(first.outputs["lanes"]).toBe("[]");

      const source = await scratchRepo([
        { "README.md": "base\n" },
        { "README.md": "base\n", "src/index.ts": "export const x = 1;\n" },
      ]);
      const second = await runStep(body, source.dir, { QFAI_BASE_REF: source.shas[0] ?? "" });
      expect(second.status).toBe(0);
      expect(JSON.parse(second.outputs["lanes"] ?? "null")).toEqual([
        "unit",
        "component",
        "integration",
        "api",
        "e2e",
      ]);
    });

    it("fails open to the superset with a warning when the base is unreachable", async () => {
      const body = await stepBody(ORCHESTRATOR, "detection", "diff");
      const repo = await scratchRepo([{ "README.md": "base\n" }]);
      const degraded = await runStep(body, repo.dir, {
        QFAI_BASE_REF: "0".repeat(40),
      });
      if (degraded.skipped) return;
      // Fail OPEN: a degraded input must not report a narrower lane set than it established.
      expect(degraded.status).toBe(0);
      expect(degraded.stdout).toContain("::warning::");
      expect(JSON.parse(degraded.outputs["lanes"] ?? "null")).toEqual([
        "unit",
        "component",
        "integration",
        "api",
        "e2e",
      ]);

      // …and with no base at all, which is the first push to a new branch.
      const missing = await runStep(body, repo.dir, { QFAI_BASE_REF: "" });
      expect(missing.status).toBe(0);
      expect(missing.stdout).toContain("::warning::");
      expect(missing.outputs["lanes"]).not.toBe("[]");
    });

    it("returns a green verdict for an all-skipped matrix and a red one for a failure, executed", async () => {
      const job = (await jobsOf(ORCHESTRATOR))[`${ORCHESTRATOR}#verdict`];
      expect(job, "no verdict job was delivered").toBeDefined();
      expect(String(job?.["if"] ?? ""), "the verdict does not always run").toContain("always()");

      const step = collectJobSteps(job ?? {}).find((entry) => typeof entry["run"] === "string");
      const body = String(step?.["run"] ?? "");
      expect(body, "the delivered verdict job runs nothing").not.toBe("");

      const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-verdict-"));
      try {
        const skipped = await runStep(body, cwd, {
          QFAI_NEEDS_JSON: JSON.stringify({
            detection: { result: "success" },
            unit: { result: "skipped" },
            e2e: { result: "skipped" },
          }),
        });
        if (skipped.skipped) return;
        // The empty-matrix case: every lane skipped, and the verdict still exits 0 without claiming
        // a result it does not have.
        expect(skipped.status).toBe(0);

        const failed = await runStep(body, cwd, {
          QFAI_NEEDS_JSON: JSON.stringify({
            detection: { result: "success" },
            unit: { result: "failure" },
          }),
        });
        expect(failed.status).toBe(1);
        expect(failed.stdout).toContain("::error::");

        // A cancelled lane is not a skipped lane. Without this the green-on-skip rule would swallow
        // a run someone stopped mid-flight.
        const cancelled = await runStep(body, cwd, {
          QFAI_NEEDS_JSON: JSON.stringify({ unit: { result: "cancelled" } }),
        });
        expect(cancelled.status).toBe(1);
      } finally {
        await removeTempTree(cwd);
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0025
describe(
  "E2E: the runner an adopter gets is a variable with a public default (US-0003-0025)",
  { timeout: 120000 },
  () => {
    it("delivers every runner selector through a repository variable", async () => {
      const jobs = await deliveredJobs();
      let selectors = 0;
      for (const [key, job] of Object.entries(jobs)) {
        const runsOn = job["runs-on"];
        if (runsOn === undefined) continue;
        selectors += 1;
        const match = /^\$\{\{\s*vars\.([A-Za-z_][A-Za-z0-9_]*)\s*\|\|\s*'([^']*)'\s*\}\}$/.exec(
          String(runsOn),
        );
        expect(match, `${key} hard-codes its runner: ${String(runsOn)}`).not.toBeNull();
        // The default carries the risk here, not the knob: a wrong label does not fail fast, it
        // queues forever, so the shipped default must be a public GitHub-hosted label.
        expect(match?.[2] ?? "", `${key} defaults to a non-public label`).toMatch(
          /^(?:ubuntu|windows|macos)-[a-z0-9.]+$/,
        );
      }
      expect(selectors, "no delivered job declares a runner").toBe(Object.keys(jobs).length);
    });

    it("documents the variable, the default and the silent failure mode in every header", async () => {
      for (const file of await deliveredWorkflowFiles()) {
        const rows = parseHeaderTable(headerComment(await workflowText(file)));
        const selector = (rows.get("runner selector") ?? []).join(" ");
        expect(selector, `${file} header names no runner selector`).toContain("QFAI_CI_RUNNER");
        expect(selector, `${file} header states no default label`).toContain("ubuntu-latest");

        // The failure mode is the row a reader needs and no runtime signal supplies: GitHub does
        // not reject an unknown label, so a mistyped value is invisible until someone notices the
        // job never started.
        const wrong = (rows.get("wrong runner value") ?? []).join(" ").toLowerCase();
        expect(wrong, `${file} header does not state the wrong-label failure mode`).toMatch(
          /queue/,
        );
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0026
describe(
  "E2E: Node fails open and the package manager fails closed, on the delivered file (US-0003-0026)",
  { timeout: 120000 },
  () => {
    it("prefers the adopter's own Node version file and falls open with a warning", async () => {
      const body = await stepBody(VALIDATE, "validate", "node-version");
      const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-node-"));
      try {
        const none = await runStep(body, cwd);
        if (none.skipped) return;
        // Fail OPEN: a tree that never pinned a Node version must still get a lane.
        expect(none.status).toBe(0);
        expect(none.stdout).toContain("::warning::");
        expect(none.outputs["version"]).toBe("20");

        await writeFile(path.join(cwd, ".node-version"), "22.11.0\n", "utf8");
        const secondary = await runStep(body, cwd);
        expect(secondary.status).toBe(0);
        expect(secondary.outputs["version"]).toBe("22.11.0");
        expect(secondary.stdout).not.toContain("::warning::");

        // Both present: `.nvmrc` wins, which is the order the delivered header states.
        await writeFile(path.join(cwd, ".nvmrc"), "20.19.4\n", "utf8");
        const primary = await runStep(body, cwd);
        expect(primary.status).toBe(0);
        expect(primary.outputs["version"]).toBe("20.19.4");
      } finally {
        await removeTempTree(cwd);
      }
    });

    it("stops the pnpm route closed, and only the pnpm route", async () => {
      const body = await stepBody(VALIDATE, "validate", "package-manager");
      const cwd = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-pm-"));
      try {
        // No pnpm lockfile: nothing to resolve, and stopping here would stop on a resolvable case.
        const npmTree = await runStep(body, cwd);
        if (npmTree.skipped) return;
        expect(npmTree.status).toBe(0);

        await writeFile(path.join(cwd, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
        await writeFile(path.join(cwd, "package.json"), JSON.stringify({ name: "x" }), "utf8");
        const undeclared = await runStep(body, cwd);
        // Fail CLOSED: the lane must not report a validate result it could not compute.
        expect(undeclared.status).toBe(1);
        expect(undeclared.stdout).toContain("::error file=package.json::");
        expect(undeclared.stdout).toContain("packageManager");

        // Present but unresolvable is the case a presence test passes and the setup action then
        // fails on, opaquely.
        await writeFile(
          path.join(cwd, "package.json"),
          JSON.stringify({ packageManager: "pnpm" }),
          "utf8",
        );
        expect((await runStep(body, cwd)).status).toBe(1);

        await writeFile(
          path.join(cwd, "package.json"),
          JSON.stringify({ packageManager: "pnpm@9.12.3" }),
          "utf8",
        );
        const resolvable = await runStep(body, cwd);
        expect(resolvable.status).toBe(0);
        expect(resolvable.stdout).toContain("pnpm@9.12.3");
      } finally {
        await removeTempTree(cwd);
      }
    });

    it("delivers the whole lockfile-detecting install column, not one manager's branch", async () => {
      const job = (await jobsOf(VALIDATE))[`${VALIDATE}#validate`];
      // The install COLUMN, selected by what it does rather than by what it mentions: two earlier
      // steps in this job talk about installing in their diagnostics, and picking the first mention
      // would score a resolver step as the install branch set.
      const install = collectJobSteps(job ?? {})
        .map((step) => String(step["run"] ?? ""))
        .find((run) => /^\s*(?:pnpm|yarn|npm)\s+(?:install|ci)\b/m.test(run));
      expect(install, "the delivered validate job installs nothing").toBeDefined();
      // Four managers and the no-lockfile fallback. A delivery that kept only the branch this
      // repository happens to use would install nothing in most adopter trees.
      for (const marker of [
        "pnpm-lock.yaml",
        "yarn.lock",
        "package-lock.json",
        "--immutable",
        "--frozen-lockfile",
        "npm ci",
        "npm install",
      ]) {
        expect(install ?? "", `the delivered install column dropped ${marker}`).toContain(marker);
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0027
describe(
  "E2E: init writes only what QFAI ships and never touches what the adopter wrote (US-0003-0027)",
  { timeout: 120000 },
  () => {
    it("leaves an adopter's own workflows, and a same-prefixed one, byte-identical", async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-own-"));
      try {
        const wf = path.join(dir, ".github", "workflows");
        await mkdir(wf, { recursive: true });
        const mine = "name: mine\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n";
        // The reserved prefix is a reservation NOTICE, not a selector: an adopter file that happens
        // to carry it was written by the adopter, so provenance — not the glob — decides ownership.
        const prefixed = "name: adopter's own qfai-shaped file\non: push\njobs: {}\n";
        await writeFile(path.join(wf, "adopter-own.yml"), mine, "utf8");
        await writeFile(path.join(wf, "qfai-adopter-authored.yml"), prefixed, "utf8");

        await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));

        expect(await readFile(path.join(wf, "adopter-own.yml"), "utf-8")).toBe(mine);
        expect(await readFile(path.join(wf, "qfai-adopter-authored.yml"), "utf-8")).toBe(prefixed);

        const delivered = (await readdir(wf)).sort();
        expect(delivered).toEqual([
          "adopter-own.yml",
          "qfai-adopter-authored.yml",
          DOCS,
          ORCHESTRATOR,
          VALIDATE,
        ]);
      } finally {
        await removeTempTree(dir);
      }
    });

    it("does not refresh an installed workflow the adopter has since edited", async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-refresh-"));
      try {
        await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
        const target = path.join(dir, ".github", "workflows", VALIDATE);
        const edited = `${await readFile(target, "utf-8")}\n# adopter edit\n`;
        await writeFile(target, edited, "utf8");

        // `--force` too: init hard-codes `force: false` / `conflictPolicy: "skip"` for the root
        // asset tree, so even the destructive flag must not reach an installed workflow. That is the
        // premise `qfai doctor`'s drift advisory exists to compensate for (spec-0006).
        await captureStdout(() => runInit({ dir, force: true, dryRun: false, yes: true }));
        expect(await readFile(target, "utf-8")).toBe(edited);
      } finally {
        await removeTempTree(dir);
      }
    });
  },
);

// QFAI:SPEC-0003:US-0003-0028
describe(
  "E2E: the semantic values the gate pins are the ones the adopter actually receives (US-0003-0028)",
  { timeout: 120000 },
  () => {
    it("delivers the validate invocation at the profile and threshold the gate declares", async () => {
      const job = (await jobsOf(VALIDATE))[`${VALIDATE}#validate`];
      // An INVOCATION, not a mention: two of this job's steps print `qfai validate: …` diagnostics,
      // and a scan for the bare phrase counts those as three runs of the validator.
      const invocations = collectJobSteps(job ?? {})
        .map((step) => String(step["run"] ?? ""))
        .filter((run) => /^\s*npx\s+qfai\s+validate\b/m.test(run));
      expect(invocations.length, "the delivered validate workflow does not run validate").toBe(1);

      const invocation = invocations[0] ?? "";
      // The two load-bearing semantic values. A drift in either is the failure the structural gate
      // exists to catch, and it is invisible to a file-exists check.
      expect(invocation).toContain("--profile full");
      expect(invocation).toContain("--fail-on error");
    });

    it("routes a drifted value to the declared shape rather than to a second copy", async () => {
      // The gate's operand is a TREE, so drift is planted on a copy of the delivered set and the
      // declared-shape module is asked about it. Importing the SSOT here is the point: a value
      // re-typed into this file would make the row pass while the gate and the shipped set
      // disagreed.
      const { SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE, diffShippedWorkflowShape } =
        await import("../integration/shippedWorkflowShape.js");

      const stage = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-0003-shape-"));
      try {
        // A copy of the DELIVERED tree, not of the packaged assets: the gate's sibling suite
        // already diffs the package, and the proposition here is that what init wrote satisfies the
        // same declared shape. Copied so the plant below never reaches the shared project.
        const wf = path.join(stage, ".github", "workflows");
        await mkdir(wf, { recursive: true });
        for (const file of await deliveredWorkflowFiles()) {
          await writeFile(path.join(wf, file), await workflowText(file), "utf8");
        }

        const clean = await diffShippedWorkflowShape(stage);
        expect(
          clean.filter((finding) => finding.code === SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE),
          "the delivered set does not satisfy the shape the gate declares",
        ).toEqual([]);

        const target = path.join(wf, VALIDATE);
        await writeFile(
          target,
          (await readFile(target, "utf-8")).replace("--profile full", "--profile tdd"),
          "utf8",
        );
        const drifted = await diffShippedWorkflowShape(stage);
        const codes = drifted.map((finding) => finding.code);
        expect(codes, "a changed profile value produced no drift finding").toContain(
          SHIPPED_WORKFLOW_SHAPE_DRIFT_CODE,
        );
        // Both halves of the report, because a gate that says only "something moved" cannot be
        // acted on: the drifted value and the one the declared shape pins.
        expect(
          drifted.map((finding) => finding.actual).join("\n"),
          "the drift finding does not carry the value the tree now holds",
        ).toMatch(/tdd/);
        expect(
          drifted.map((finding) => finding.expected).join("\n"),
          "the drift finding does not carry the value the shape declares",
        ).toMatch(/full/);
      } finally {
        await removeTempTree(stage);
      }
    });
  },
);

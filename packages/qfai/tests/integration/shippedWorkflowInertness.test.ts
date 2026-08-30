/**
 * Integration: shipped orchestrator lane inertness and the credential-free
 * set.
 *
 * Covers the inertness half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5 dimensions 6
 * and 8): every shipped test lane stays declared but keyed on the
 * adopter's own opt-in — the presence of the matching layer-named test
 * script (test:unit, test:component, test:integration, test:api,
 * test:e2e) in package.json — never on a credential attribute. The
 * script-presence probe is extracted from the REAL init-written
 * orchestrator and executed via bash (with the runner's `-e -o pipefail`
 * flags, matching `shell: bash` semantics on GitHub-hosted runners)
 * against fixture package.json files.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { spawnSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import {
  collectJobSteps,
  collectWorkflowJobs,
  findWorkflowJob,
  isRecord,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

/** The orchestrator file that owns detection, lanes and verdict. */
const ORCHESTRATOR = "qfai-tests.yml";
const ORCHESTRATOR_REL = path.join(".github", "workflows", ORCHESTRATOR);

/** The five lane layers (value SSOT in the suite per CLI-WFSET §5). */
const LANE_LAYERS = ["unit", "component", "integration", "api", "e2e"] as const;

/** The detection lane-set output at its widest (the full superset). */
const FULL_LANES_JSON = JSON.stringify([...LANE_LAYERS]);

const newTempDir = useTempDirPool("qfai-wfinert-");

async function runInitQuiet(dir: string): Promise<void> {
  await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
}

/**
 * A package.json that declares scripts but not ONE layer-named test
 * script. The bare `test` entry is the boundary: "layer-named" means
 * `test:<layer>`, so a plain `test` script must not opt any lane in.
 */
const NO_LAYER_SCRIPTS_MANIFEST = JSON.stringify(
  {
    name: "adopter-without-layer-scripts",
    private: true,
    scripts: { test: "echo unlayered test entry", build: "echo build" },
  },
  null,
  2,
);

/** The discriminating control: exactly one layer script declared. */
const ONE_LAYER_SCRIPT_MANIFEST = JSON.stringify(
  {
    name: "adopter-with-unit-script",
    private: true,
    scripts: { "test:unit": "echo unit tests" },
  },
  null,
  2,
);

interface ShellRun {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
}

/**
 * Executes one extracted `run:` body the way the runner would — `bash -e
 * -o pipefail`, the flags GitHub applies to `shell: bash` steps — with a
 * stubbed GITHUB_OUTPUT file, returning exit status, streams and the
 * parsed `key=value` outputs the shell wrote.
 */
async function runShell(body: string, cwd: string): Promise<ShellRun> {
  const stage = await newTempDir();
  const scriptPath = path.join(stage, "step.sh");
  const outputPath = path.join(stage, "github-output.txt");
  await writeFile(scriptPath, body, "utf-8");
  await writeFile(outputPath, "", "utf-8");
  const child = spawnSync("bash", ["-e", "-o", "pipefail", scriptPath], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, GITHUB_OUTPUT: outputPath },
  });
  if (child.error) {
    throw child.error;
  }
  const outputs: Record<string, string> = {};
  for (const line of (await readFile(outputPath, "utf-8")).split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      outputs[line.slice(0, eq)] = line.slice(eq + 1);
    }
  }
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "", outputs };
}

/**
 * The script-presence probe body (`detection` step `id: scripts`) from a
 * parsed orchestrator document, or undefined so the CALLER's assertion is
 * what fails when the probe is absent.
 */
function scriptsProbeBody(doc: unknown): string | undefined {
  const detection = findWorkflowJob(doc, "detection");
  if (detection === undefined) {
    return undefined;
  }
  for (const step of collectJobSteps(detection)) {
    const run = step["run"];
    if (step["id"] === "scripts" && typeof run === "string") {
      return run;
    }
  }
  return undefined;
}

/**
 * Evaluates one lane's `if:` value against stubbed detection outputs.
 * Only the sanctioned conjunction shape is interpreted: an optional
 * `${{ … }}` wrapper around `&&`-joined conjuncts, each either a boolean
 * literal or `contains(needs.detection.outputs.<key>, '<literal>')`
 * (GitHub's `contains` over a string output is substring membership; the
 * five layer names are substring-free of one another). Anything this
 * evaluator cannot prove skipped — an absent condition, an unknown
 * output, any other expression form — counts as EXECUTING, so an
 * unrecognized condition fails the zero-executing oracle instead of
 * passing it silently.
 */
function laneExecutes(condition: unknown, outputs: Record<string, string>): boolean {
  if (typeof condition !== "string") {
    return true;
  }
  const wrapped = /^\$\{\{(.*)\}\}$/s.exec(condition.trim());
  const expression = (wrapped?.[1] ?? condition).trim();
  for (const rawConjunct of expression.split("&&")) {
    const conjunct = rawConjunct.trim();
    if (conjunct === "true") {
      continue;
    }
    if (conjunct === "false") {
      return false;
    }
    const containsCall = /^contains\(needs\.detection\.outputs\.([a-z]+),\s*'([^']+)'\)$/.exec(
      conjunct,
    );
    if (containsCall === null) {
      return true;
    }
    const key = containsCall[1] ?? "";
    const needle = containsCall[2] ?? "";
    if (!(outputs[key] ?? "").includes(needle)) {
      return false;
    }
  }
  return true;
}

/** Runs init over a scriptless adopter tree and parses its orchestrator. */
async function initScriptlessTree(): Promise<{ dir: string; doc: unknown }> {
  const dir = await newTempDir();
  await writeFile(path.join(dir, "package.json"), NO_LAYER_SCRIPTS_MANIFEST, "utf-8");
  await runInitQuiet(dir);
  const doc: unknown = parse(await readFile(path.join(dir, ORCHESTRATOR_REL), "utf-8"));
  return { dir, doc };
}

describe(
  "TC-0003-0036 (TDD-0036): no declared layer script means zero executing test lanes",
  { timeout: 60000 },
  () => {
    // One it() per TC-0003-0036 verify bullet. Scope notes, disclosed:
    // - The evaluator above honestly interprets a literal `false` conjunct
    //   as skipped, so a hard-disabled lane also evaluates to zero
    //   executing lanes. The zero-executing bullet (it2) therefore earns
    //   its RED from the TC's Action — the script-presence probe must be
    //   EXECUTED against the fixture package.json, and a probe-less
    //   orchestrator fails that extraction — while the "keys on script
    //   presence, not a hard false and not a credential attribute" bullet
    //   is it3's own surface.
    // - it2 stubs the detection lane-set at the FULL superset: inertness
    //   must hold even when change detection selects every lane.

    it("every test lane stays declared with its check name in the init-written orchestrator", async () => {
      const { doc } = await initScriptlessTree();
      const violations: string[] = [];
      for (const layer of LANE_LAYERS) {
        const job = findWorkflowJob(doc, layer);
        if (job === undefined) {
          violations.push(`lane job "${layer}" is not declared`);
          continue;
        }
        const name = job["name"];
        if (typeof name !== "string" || name.length === 0) {
          violations.push(`lane job "${layer}" carries no check name`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("the probe finds no layer script in the fixture and every lane condition evaluates to skipped", async () => {
      const { dir, doc } = await initScriptlessTree();
      const probe = scriptsProbeBody(doc);
      expect(
        probe,
        "the init-written orchestrator declares no script-presence probe (detection step id: scripts)",
      ).toBeTypeOf("string");
      if (typeof probe !== "string") {
        throw new Error("unreachable: asserted above");
      }

      const fixtureRun = await runShell(probe, dir);
      expect(fixtureRun.status).toBe(0);
      expect(JSON.parse(fixtureRun.outputs["scripts"] ?? "null")).toEqual([]);

      const outputs = { scripts: fixtureRun.outputs["scripts"] ?? "", lanes: FULL_LANES_JSON };
      const executing = LANE_LAYERS.filter((layer) => {
        const job = findWorkflowJob(doc, layer);
        return job === undefined ? true : laneExecutes(job["if"], outputs);
      });
      expect(executing, "no test lane may execute without its opt-in script").toEqual([]);

      // Discriminating control of the same predicate: ONE declared layer
      // script must flip exactly that lane to executing, proving the zero
      // above is earned by the fixture rather than hardwired.
      const controlDir = await newTempDir();
      await writeFile(path.join(controlDir, "package.json"), ONE_LAYER_SCRIPT_MANIFEST, "utf-8");
      const controlRun = await runShell(probe, controlDir);
      expect(controlRun.status).toBe(0);
      expect(JSON.parse(controlRun.outputs["scripts"] ?? "null")).toEqual(["unit"]);
      const controlOutputs = {
        scripts: controlRun.outputs["scripts"] ?? "",
        lanes: FULL_LANES_JSON,
      };
      const controlExecuting = LANE_LAYERS.filter((layer) => {
        const job = findWorkflowJob(doc, layer);
        return job === undefined ? true : laneExecutes(job["if"], controlOutputs);
      });
      expect(controlExecuting).toEqual(["unit"]);

      // Second control, for the OTHER conjunct. Both cases above hold `lanes` at
      // the full set, so nothing here had yet shown the lane set suppressing
      // anything: replacing a condition's `contains(...lanes...)` with
      // `(contains(...lanes...) || true)` leaves the scriptless fixture skipped
      // and this control executing, and every assertion above still passes —
      // while a documentation-only change, which is exactly when `lanes` is
      // empty, would run the lane. Same script presence, empty lane set, zero
      // executing lanes.
      const unselectedOutputs = { scripts: controlRun.outputs["scripts"] ?? "", lanes: "[]" };
      const unselectedExecuting = LANE_LAYERS.filter((layer) => {
        const job = findWorkflowJob(doc, layer);
        return job === undefined ? true : laneExecutes(job["if"], unselectedOutputs);
      });
      expect(
        unselectedExecuting,
        "a declared layer script must not execute a lane the detection step did not select",
      ).toEqual([]);
    });

    it("each lane condition references layer-script presence and the detection lane set, never a credential attribute", async () => {
      const { doc } = await initScriptlessTree();
      const violations: string[] = [];
      for (const layer of LANE_LAYERS) {
        const job = findWorkflowJob(doc, layer);
        if (job === undefined) {
          violations.push(`lane job "${layer}" is not declared`);
          continue;
        }
        const condition = job["if"];
        if (typeof condition !== "string") {
          violations.push(`lane "${layer}" declares no if: condition`);
          continue;
        }
        if (!condition.includes(`contains(needs.detection.outputs.scripts, '${layer}')`)) {
          violations.push(
            `lane "${layer}" condition does not key on its own layer-script presence`,
          );
        }
        if (!condition.includes(`contains(needs.detection.outputs.lanes, '${layer}')`)) {
          violations.push(`lane "${layer}" condition does not key on the detection lane set`);
        }
        if (/secret|credential|token|password/i.test(condition)) {
          violations.push(`lane "${layer}" condition references a credential attribute`);
        }
      }
      expect(violations).toEqual([]);
    });
  },
);

describe(
  "TC-0003-0037 (TDD-0037): exactly one installing job and zero secret references",
  { timeout: 60000 },
  () => {
    // Setup is TC-0003-0036's init output tree (the scriptless adopter);
    // every count below is taken over EVERY workflow file init wrote.
    // Scope notes, disclosed:
    // - The five test lanes ship install-less by the skeleton's staging
    //   design (their bodies land with later revisions of the file), so
    //   the installing-job count is exactly 1 — the validate lane —
    //   today. The oracle counts install-bearing jobs, so it names any
    //   job the moment one gains an install step; whether an enabled
    //   lane's future body may install is that revision's scoping call,
    //   judged then against this AC's count.
    // - Born-green disclosure: all three its pass first-run — the set
    //   never carried a secret, and detection/verdict shipped with
    //   timeouts and without installs. The falsifiability path is taken
    //   in-cycle via real-asset mutations, applied and reverted
    //   byte-identically (recorded in the row's evidence block).

    /** A run body that invokes a package-manager dependency install. */
    const INSTALL_RUN_RE = /\b(?:pnpm|yarn|npm)\s+(?:install|ci)\b/;

    /** Every workflow file the init run wrote, as `[name, body]` sorted. */
    async function initWorkflowSet(): Promise<Array<[string, string]>> {
      const dir = await newTempDir();
      await writeFile(path.join(dir, "package.json"), NO_LAYER_SCRIPTS_MANIFEST, "utf-8");
      await runInitQuiet(dir);
      const workflowsDir = path.join(dir, ".github", "workflows");
      const names = (await readdir(workflowsDir)).sort();
      const files: Array<[string, string]> = [];
      for (const name of names) {
        files.push([name, await readFile(path.join(workflowsDir, name), "utf-8")]);
      }
      return files;
    }

    /** Occurrences of a mapping key anywhere in a parsed YAML tree. */
    function countKeyOccurrences(node: unknown, key: string): number {
      if (Array.isArray(node)) {
        return node.reduce((count: number, member) => count + countKeyOccurrences(member, key), 0);
      }
      if (!isRecord(node)) {
        return 0;
      }
      let count = 0;
      for (const [candidate, value] of Object.entries(node)) {
        if (candidate === key) {
          count += 1;
        }
        count += countKeyOccurrences(value, key);
      }
      return count;
    }

    it("exactly one job across the init-written set installs dependencies: the validate lane", async () => {
      const files = await initWorkflowSet();
      // Non-vacuity: the whole multi-file set is what is being counted.
      expect(
        files.length,
        "the init-written set must have two or more files",
      ).toBeGreaterThanOrEqual(2);
      const installing: Array<{ file: string; jobId: string }> = [];
      for (const [name, body] of files) {
        for (const { jobId, job } of collectWorkflowJobs(parse(body))) {
          const installs = collectJobSteps(job).some((step) => {
            const run = step["run"];
            return typeof run === "string" && INSTALL_RUN_RE.test(run);
          });
          if (installs) {
            installing.push({ file: name, jobId });
          }
        }
      }
      expect(installing).toEqual([{ file: "qfai-validate.yml", jobId: "validate" }]);
    });

    it("zero secret declarations, secret-context references and secrets: inherit across the set", async () => {
      const files = await initWorkflowSet();
      const violations: string[] = [];
      for (const [name, body] of files) {
        // Raw-text half: ANY mention of the secrets context, and any `secrets:`
        // mapping line (a workflow_call declaration, a job-level passing
        // block, or `secrets: inherit`), named per line.
        //
        // Not the dotted form alone — review finding [11]. `${{ toJSON(secrets) }}`
        // names no property, hands the adopter's whole secret set to a step, and
        // left this row green while the shape dimension beside it and the hygiene
        // lane both looked elsewhere.
        body.split(/\r?\n/).forEach((line, index) => {
          if (/\bsecrets\b/.test(line) && !/\bsecrets\s*:/.test(line)) {
            violations.push(`${name}:${index + 1}: secret context reference`);
          }
          if (/\bsecrets\s*:/.test(line)) {
            violations.push(`${name}:${index + 1}: secrets declaration or inheritance`);
          }
        });
        // Parsed-tree half: no `secrets` mapping key anywhere, so a form
        // the line regexes cannot see (flow style, odd spacing) is still
        // caught.
        const keyCount = countKeyOccurrences(parse(body), "secrets");
        if (keyCount !== 0) {
          violations.push(`${name}: ${keyCount} secrets mapping key(s) in the parsed tree`);
        }
      }
      expect(violations).toEqual([]);
    });

    it("detection and verdict install nothing and each carries timeout-minutes", async () => {
      const files = await initWorkflowSet();
      const orchestrator = files.find(([name]) => name === ORCHESTRATOR);
      expect(orchestrator, "the init-written set carries no orchestrator").toBeDefined();
      const doc: unknown = parse(orchestrator?.[1] ?? "");
      const violations: string[] = [];
      for (const jobId of ["detection", "verdict"]) {
        const job = findWorkflowJob(doc, jobId);
        if (job === undefined) {
          violations.push(`orchestrator declares no ${jobId} job`);
          continue;
        }
        if (typeof job["timeout-minutes"] !== "number") {
          violations.push(`${jobId} job declares no timeout-minutes`);
        }
        for (const step of collectJobSteps(job)) {
          const run = step["run"];
          if (typeof run === "string" && INSTALL_RUN_RE.test(run)) {
            violations.push(`${jobId} job installs dependencies`);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  },
);

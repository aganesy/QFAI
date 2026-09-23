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
async function runShell(
  body: string,
  cwd: string,
  env: Record<string, string> = {},
): Promise<ShellRun> {
  const stage = await newTempDir();
  const scriptPath = path.join(stage, "step.sh");
  const outputPath = path.join(stage, "github-output.txt");
  await writeFile(scriptPath, body, "utf-8");
  await writeFile(outputPath, "", "utf-8");
  const child = spawnSync("bash", ["-e", "-o", "pipefail", scriptPath], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, ...env, GITHUB_OUTPUT: outputPath },
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
    // `needs.detection.outputs.<key> != '<literal>'`, which is how the one
    // matrixed lane asks whether its axis has anything on it. Read here rather
    // than treated as unrecognised, because an unrecognised conjunct returns
    // `true` — the lane would score as executing whatever the output held, and
    // the zero this suite asserts would be unearned.
    const comparison = /^needs\.detection\.outputs\.([a-z]+)\s*(!=|==)\s*'([^']*)'$/.exec(conjunct);
    if (comparison !== null) {
      const actual = outputs[comparison[1] ?? ""] ?? "";
      const matches = actual === (comparison[3] ?? "");
      if (comparison[2] === "!=" ? matches : !matches) {
        return false;
      }
      continue;
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

/** The detection job's selection step body, which computes the matrix axis. */
function selectionStepBody(doc: unknown): string | undefined {
  const detection = findWorkflowJob(doc, "detection");
  if (detection === undefined) {
    return undefined;
  }
  for (const step of collectJobSteps(detection)) {
    const run = step["run"];
    if (step["id"] === "selected" && typeof run === "string") {
      return run;
    }
  }
  return undefined;
}

/** Runs init over a scriptless adopter tree and parses its orchestrator. */
async function initScriptlessTree(): Promise<{ dir: string; doc: unknown }> {
  const dir = await newTempDir();
  await writeFile(path.join(dir, "package.json"), NO_LAYER_SCRIPTS_MANIFEST, "utf-8");
  await runInitQuiet(dir);
  const doc: unknown = parse(await readFile(path.join(dir, ORCHESTRATOR_REL), "utf-8"));
  return { dir, doc };
}

// QFAI:SPEC-0003:TC-0003-0036
describe("TC-0003-0036 (TDD-0036): no declared layer script means zero executing test lanes", () => {
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
    // One job, whose legs are the lanes. A check name per lane is still what
    // this asserts: the name has to vary with the leg, or five lanes would
    // report under one name and an adopter's branch protection could not tell
    // which layer failed.
    const job = findWorkflowJob(doc, "tests");
    if (job === undefined) {
      violations.push('lane job "tests" is not declared');
    } else {
      const name = job["name"];
      if (typeof name !== "string" || name.length === 0) {
        violations.push('lane job "tests" carries no check name');
      } else if (!name.includes("matrix.layer")) {
        violations.push(`lane job "tests" check name does not vary by layer: ${name}`);
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

    // The selection step is what turns the two probes into the matrix axis, so
    // the lanes that would execute are the members of what it emits — not a
    // condition per layer any more. It is EXECUTED here for the same reason the
    // probe is: a body that stopped intersecting would still parse.
    const selection = selectionStepBody(doc);
    expect(
      selection,
      "the init-written orchestrator declares no selection step (detection step id: selected)",
    ).toBeTypeOf("string");
    if (typeof selection !== "string") {
      throw new Error("unreachable: asserted above");
    }
    const select = async (scripts: string, lanes: string): Promise<string[]> => {
      const run = await runShell(selection, dir, { QFAI_SCRIPTS: scripts, QFAI_LANES: lanes });
      expect(run.status).toBe(0);
      return JSON.parse(run.outputs["selected"] ?? "null") as string[];
    };

    const executing = await select(fixtureRun.outputs["scripts"] ?? "", FULL_LANES_JSON);
    expect(executing, "no test lane may execute without its opt-in script").toEqual([]);
    expect(
      laneExecutes(findWorkflowJob(doc, "tests")?.["if"], { selected: JSON.stringify(executing) }),
      "the lane must not run on an empty axis",
    ).toBe(false);

    // Discriminating control of the same predicate: ONE declared layer
    // script must flip exactly that lane to executing, proving the zero
    // above is earned by the fixture rather than hardwired.
    const controlDir = await newTempDir();
    await writeFile(path.join(controlDir, "package.json"), ONE_LAYER_SCRIPT_MANIFEST, "utf-8");
    const controlRun = await runShell(probe, controlDir);
    expect(controlRun.status).toBe(0);
    expect(JSON.parse(controlRun.outputs["scripts"] ?? "null")).toEqual(["unit"]);
    const controlExecuting = await select(controlRun.outputs["scripts"] ?? "", FULL_LANES_JSON);
    expect(controlExecuting).toEqual(["unit"]);
    expect(
      laneExecutes(findWorkflowJob(doc, "tests")?.["if"], {
        selected: JSON.stringify(controlExecuting),
      }),
      "the lane must run once the axis has a member",
    ).toBe(true);

    // Second control, for the OTHER conjunct. Both cases above hold `lanes` at
    // the full set, so nothing here had yet shown the lane set suppressing
    // anything: replacing a condition's `contains(...lanes...)` with
    // `(contains(...lanes...) || true)` leaves the scriptless fixture skipped
    // and this control executing, and every assertion above still passes —
    // while a documentation-only change, which is exactly when `lanes` is
    // empty, would run the lane. Same script presence, empty lane set, zero
    // executing lanes.
    const unselectedExecuting = await select(controlRun.outputs["scripts"] ?? "", "[]");
    expect(
      unselectedExecuting,
      "a declared layer script must not execute a lane the detection step did not select",
    ).toEqual([]);
  });

  it("each lane condition references layer-script presence and the detection lane set, never a credential attribute", async () => {
    const { doc } = await initScriptlessTree();
    const violations: string[] = [];

    // Both keys are still required, one step earlier. The lane's condition
    // reads the intersection; the step that computes it reads the script probe
    // and the lane set. Asserting only the condition would leave a selection
    // body that dropped one of them entirely invisible.
    const selection = selectionStepBody(doc);
    if (typeof selection !== "string") {
      violations.push("the detection job declares no selection step");
    } else {
      if (!selection.includes("QFAI_SCRIPTS")) {
        violations.push("the selection does not key on layer-script presence");
      }
      if (!selection.includes("QFAI_LANES")) {
        violations.push("the selection does not key on the detection lane set");
      }
    }

    const job = findWorkflowJob(doc, "tests");
    const condition = job?.["if"];
    if (typeof condition !== "string") {
      violations.push('lane "tests" declares no if: condition');
    } else {
      if (!condition.includes("needs.detection.outputs.selected")) {
        violations.push('lane "tests" condition does not key on the computed selection');
      }
      if (/secret|credential|token|password/i.test(condition)) {
        violations.push('lane "tests" condition references a credential attribute');
      }
    }
    expect(violations).toEqual([]);
  });
});

// QFAI:SPEC-0003:TC-0003-0037
describe("TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references", () => {
  // Setup is TC-0003-0036's init output tree (the scriptless adopter);
  // every count below is taken over EVERY workflow file init wrote.
  // Scope notes, disclosed:
  // - The test lane installs, because the script it runs is the
  //   adopter's own and an adopter's test script needs the adopter's
  //   dependencies. The oracle names install-bearing jobs rather than
  //   counting them, so a job that gains or loses an install is reported
  //   by name rather than absorbed into a total.
  // - Born-green disclosure: all three its pass first-run — the set
  //   never carried a secret, and detection/verdict shipped with
  //   timeouts and without installs. The falsifiability path is taken
  //   in-cycle via real-asset mutations, applied and reverted
  //   byte-identically (recorded in the row's evidence block).

  /** A run body that invokes a package-manager dependency install. */
  const INSTALL_RUN_RE = /\b(?:pnpm|yarn|npm)\s+(?:install|ci)\b/;

  /**
   * How many values one matrix axis takes for `event`.
   *
   * Two shapes are interpreted, and they are the two the shipped set uses: a
   * literal list, and the `fromJSON(github.event_name == '<event>' && '<json>'
   * || '<json>')` selection the validation profiles are chosen by. Anything
   * else throws rather than scoring 1 — a matrix this cannot read must fail the
   * count, not quietly shrink it.
   */
  function matrixAxisLength(key: string, value: unknown, event: string): number {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value !== "string") {
      throw new Error(`matrix axis "${key}" is neither a list nor an expression`);
    }
    const selection =
      /^\$\{\{\s*fromJSON\(\s*github\.event_name\s*==\s*'([^']+)'\s*&&\s*'(.+?)'\s*\|\|\s*'(.+?)'\s*\)\s*\}\}$/.exec(
        value.trim(),
      );
    // The test orchestrator's axis reads a list its own detection job built from the adopter's
    // manifest, so the file alone does not fix its width. What the file DOES fix is the bound:
    // the probe that fills it looks for five layer-named scripts and nothing else. Counting the
    // bound is the honest reading — it is what an adopter who declares every layer starts, and
    // it cannot silently grow, because a sixth layer would have to be added to that probe.
    if (/^\$\{\{\s*fromJSON\(needs\.detection\.outputs\.selected\)\s*\}\}$/.test(value.trim())) {
      return LANE_LAYERS.length;
    }
    if (selection === null) {
      throw new Error(`matrix axis "${key}" uses an expression this count cannot read: ${value}`);
    }
    const chosen = (event === selection[1] ? selection[2] : selection[3]) ?? "";
    const parsed: unknown = JSON.parse(chosen);
    if (!Array.isArray(parsed)) {
      throw new Error(`matrix axis "${key}" selects a non-list for ${event}`);
    }
    return parsed.length;
  }

  /** How many instances one job declaration expands to for `event`. */
  function matrixInstances(job: Record<string, unknown>, event: string): number {
    const strategy = job["strategy"];
    if (!isRecord(strategy)) {
      return 1;
    }
    const matrix = strategy["matrix"];
    if (matrix === undefined) {
      return 1;
    }
    if (!isRecord(matrix)) {
      throw new Error("a shipped strategy declares a matrix that is not a mapping");
    }
    let instances = 1;
    for (const [key, value] of Object.entries(matrix)) {
      instances *= matrixAxisLength(key, value, event);
    }
    return instances;
  }

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

  it("the init-written jobs that install dependencies are exactly the docs, test and validate lanes, nine instances on a pull request and eight on a push", async () => {
    const files = await initWorkflowSet();
    // Non-vacuity: the whole multi-file set is what is being counted.
    expect(files.length, "the init-written set must have two or more files").toBeGreaterThanOrEqual(
      2,
    );
    const installing: Array<{ file: string; jobId: string; job: Record<string, unknown> }> = [];
    for (const [name, body] of files) {
      for (const { jobId, job } of collectWorkflowJobs(parse(body))) {
        const installs = collectJobSteps(job).some((step) => {
          const run = step["run"];
          return typeof run === "string" && INSTALL_RUN_RE.test(run);
        });
        if (installs) {
          installing.push({ file: name, jobId, job });
        }
      }
    }
    // An ALLOW-LIST of installing jobs rather than a count, and the
    // distinction is the point: a count of one was the whole assertion when
    // one lane installed, and it would have been satisfied by the wrong lane
    // installing while the right one stopped. Naming them says which.
    //
    // The docs lane installs for the same reason the validate lane does: it
    // runs a program out of the adopter's `node_modules`, and the package has
    // to be there first. The test lane installs for a third reason — the
    // script it runs is the adopter's own, and an adopter's test script needs
    // the adopter's dependencies. It reaches that install only on a leg the
    // adopter's manifest put on the axis, so a project declaring no
    // layer-named script still pays for no toolchain.
    expect(installing.map(({ file, jobId }) => ({ file, jobId }))).toEqual([
      { file: "qfai-docs.yml", jobId: "checks" },
      { file: "qfai-tests.yml", jobId: "tests" },
      { file: "qfai-validate.yml", jobId: "validate" },
    ]);

    // The declaration count is not the run count. Both installing jobs are
    // matrix jobs, and the validation profiles are selected by the event, so
    // what an adopter's runner actually starts is the expansion — four
    // installs on a pull request, three on a push. A declaration count alone
    // reads a leg that stopped expanding as unchanged.
    const instances = (event: string): number =>
      installing.reduce((total, entry) => total + matrixInstances(entry.job, event), 0);
    // Nine and eight rather than four and three: the test lane's axis is
    // bounded by the five layer-named scripts its probe looks for, and this
    // count reads that bound. An adopter declaring none of them starts none
    // of those five, which is what the condition above the matrix decides and
    // this count deliberately does not.
    expect(instances("pull_request"), "a pull request does not expand to nine installs").toBe(9);
    expect(instances("push"), "a push does not expand to eight installs").toBe(8);
  });

  it("zero secret declarations, secret-context references and secrets: inherit across the set", async () => {
    const files = await initWorkflowSet();
    const violations: string[] = [];
    for (const [name, body] of files) {
      // Raw-text half: ANY mention of the secrets context, and any `secrets:`
      // mapping line (a workflow_call declaration, a job-level passing
      // block, or `secrets: inherit`), named per line.
      //
      // Not the dotted form alone: `${{ toJSON(secrets) }}`
      // names no property, and would hand the adopter's whole secret set to a step while
      // leaving this row green — the shape dimension beside it and the hygiene
      // lane both look elsewhere.
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
});

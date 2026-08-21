/**
 * Integration: shipped orchestrator change detection and verdict.
 *
 * Covers the detection/verdict half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5): the
 * orchestrator's change-detection shell is self-contained (name-only diff
 * + JSON filtering, no third-party action), selects the minimal lane set
 * for docs-only diffs and the full one for source diffs, fails OPEN to the
 * full superset with a warning on degraded inputs, and the co-located
 * verdict stays green over an empty matrix. The detection shell and the
 * verdict body are extracted from the REAL shipped orchestrator and
 * executed with bash against git fixture repositories built in temp dirs —
 * env stubs (GITHUB_OUTPUT, QFAI_BASE_REF, QFAI_NEEDS_JSON) stand in for
 * the runner context.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  collectJobSteps,
  collectWorkflowJobs,
  findWorkflowJob,
  firstRunBody,
  isRecord,
  loadShippedWorkflows,
  shippedWorkflowPath,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";

/** The orchestrator file that owns detection, lanes and verdict. */
const ORCHESTRATOR = "qfai-tests.yml";

/** The full lane superset (value SSOT in the suite per CLI-WFSET §5). */
const FULL_LANES: readonly string[] = ["unit", "component", "integration", "api", "e2e"];

const newTempDir = useTempDirPool("qfai-wfdetect-");

/** Parses the shipped orchestrator fresh from disk. */
/**
 * The shipped orchestrator, read and parsed ONCE per worker process.
 *
 * It was re-read and re-parsed on every call, and it is called by every detection run plus
 * several tests of its own. The file does not change while the suite runs — it is a fixture
 * in the repository — so the parse is pure overhead repeated dozens of times.
 *
 * The promise is cached rather than the value, so concurrent callers share one read instead
 * of racing to populate a slot.
 */
let orchestratorDocPromise: Promise<unknown> | undefined;

async function orchestratorDoc(): Promise<unknown> {
  // The PROMISE is cached, not the value, so concurrent callers share one read — and a REJECTION is not
  // cached, which the first version got wrong. A transient failure would otherwise be replayed to every
  // later caller in the file, turning one bad read into ten test failures with one cause and no way to
  // tell from the output that they were the same event.
  orchestratorDocPromise ??= readFile(shippedWorkflowPath(ORCHESTRATOR), "utf-8")
    .then((text) => parse(text))
    .catch((error: unknown) => {
      orchestratorDocPromise = undefined;
      throw error;
    });
  return orchestratorDocPromise;
}

interface ShellRun {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
}

/**
 * Executes one extracted `run:` body via bash with a stubbed GITHUB_OUTPUT
 * file and the given env, returning exit status, streams and the parsed
 * `key=value` outputs the shell wrote.
 */
async function runShell(body: string, cwd: string, env: Record<string, string>): Promise<ShellRun> {
  const stage = await newTempDir();
  const scriptPath = path.join(stage, "step.sh");
  const outputPath = path.join(stage, "github-output.txt");
  await writeFile(scriptPath, body, "utf-8");
  await writeFile(outputPath, "", "utf-8");
  // `execFile`, not `spawnSync`: a fork blocked in `spawnSync` cannot yield its slot, so the pool gains
  // nothing from having other work available. `TC-0003-0039` builds three independent fixtures and this
  // is what lets them overlap.
  const child = await run("bash", [scriptPath], {
    cwd,
    env: { ...process.env, GITHUB_OUTPUT: outputPath, ...env },
  });
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
 * One child process, awaited rather than blocked on.
 *
 * A non-zero exit is not an error here — several callers assert on the status — so the rejection an
 * `execFile` promise raises for it is caught and folded back into the same shape `spawnSync` returned.
 */
async function run(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, [...args], {
      cwd: options.cwd,
      encoding: "utf-8",
      ...(options.env === undefined ? {} : { env: options.env }),
    });
    return { status: 0, stdout, stderr };
  } catch (error) {
    // ONLY a numeric `code` is an exit status. Promisified `execFile` assigns `stdout` and `stderr` on
    // every rejection, including a spawn failure, so the previous guard admitted three different outcomes
    // — a real non-zero exit, a binary that does not exist (`ENOENT`), and stdout past `maxBuffer` — and
    // the `: 1` fallback erased the difference between them. That made this file's one discriminating
    // control, `expect(failedLane.status).toBe(1)`, satisfiable by a shell that never ran.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "number"
    ) {
      return {
        status: error.code,
        stdout: "stdout" in error ? String(error.stdout ?? "") : "",
        stderr: "stderr" in error ? String(error.stderr ?? "") : "",
      };
    }
    throw error;
  }
}

/** Runs git in a fixture repo, throwing loudly on any failure. */
async function git(cwd: string, ...args: string[]): Promise<string> {
  const child = await run("git", [...GIT_ISOLATION, ...args], { cwd });
  if (child.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed (${String(child.status)}): ${child.stderr}`);
  }
  return child.stdout.trim();
}

/** A fresh fixture repository with one base commit (README.md only). */
/**
 * Configuration this fixture must not inherit from whoever is running it.
 *
 * `git()` passed no `env` and `runShell` spreads `...process.env`, so every fixture read the developer's
 * ambient git configuration — and a global `core.excludesFile` reddens four of the ten tests here. The
 * identity flags below were already passed per invocation for exactly this reason; these belong beside
 * them. Passed as `-c` rather than written into each repository, so no fixture can forget them.
 */
const GIT_ISOLATION = [
  "-c",
  "core.excludesFile=",
  "-c",
  "core.autocrlf=false",
  "-c",
  "core.hooksPath=",
  "-c",
  "init.templateDir=",
  "-c",
  "commit.gpgsign=false",
];

/**
 * Identity and signing passed as `-c` flags rather than written with three `git config`
 * invocations.
 *
 * Same effect, three fewer process spawns per fixture repository. That mattered: this file
 * builds several repositories per test and a spawn is the dominant cost, not the git work.
 */
const COMMIT_IDENTITY = [
  "-c",
  "user.email=fixture@example.invalid",
  "-c",
  "user.name=QFAI Fixture",
  "-c",
  "commit.gpgsign=false",
];

async function makeRepo(): Promise<{ dir: string; baseSha: string }> {
  const dir = await newTempDir();
  await git(dir, "init", "--initial-branch=main");
  await writeFile(path.join(dir, "README.md"), "# fixture\n", "utf-8");
  await git(dir, "add", ".");
  await git(dir, ...COMMIT_IDENTITY, "commit", "-m", "base");
  return { dir, baseSha: await git(dir, "rev-parse", "HEAD") };
}

/** Writes one file (creating parents) and commits it. */
async function commitChange(dir: string, relPath: string, content: string): Promise<void> {
  const filePath = path.join(dir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
  await git(dir, "add", ".");
  await git(dir, ...COMMIT_IDENTITY, "commit", "-m", `change ${relPath}`);
}

/**
 * Extracts the shipped detection shell (asserting it exists) and executes
 * it inside the fixture repo with the given base ref.
 */
async function runDetection(repoDir: string, baseRef: string): Promise<ShellRun> {
  const detection = findWorkflowJob(await orchestratorDoc(), "detection");
  const body = detection === undefined ? undefined : firstRunBody(detection);
  expect(body, "the orchestrator declares no detection job with a run: step").toBeTypeOf("string");
  if (typeof body !== "string") {
    throw new Error("unreachable: asserted above");
  }
  return runShell(body, repoDir, { QFAI_BASE_REF: baseRef });
}

/** The lanes output of a detection run, parsed from JSON (null if absent). */
function lanesOf(run: ShellRun): unknown {
  return JSON.parse(run.outputs["lanes"] ?? "null");
}

describe("TC-0003-0038 (TDD-0038): docs-only diff selects the minimal lane set, source diff selects the full one", () => {
  // One it() per TC-0003-0038 verify bullet. The detection shell is the
  // REAL shipped run: body, executed against real git repos; the minimal
  // lane set for a docs-only diff is the EMPTY set (nothing to test), which
  // is exactly the empty-matrix input the verdict row handles.

  it("a Markdown-only diff selects the minimal (empty) lane set without a warning", async () => {
    const { dir, baseSha } = await makeRepo();
    await commitChange(dir, "README.md", "# fixture\n\nupdated docs\n");
    await commitChange(dir, "docs/guide.md", "# guide\n");
    const run = await runDetection(dir, baseSha);
    expect(run.status).toBe(0);
    expect(run.stdout).not.toMatch(/::warning::/);
    expect(lanesOf(run)).toEqual([]);
  });

  it("a diff containing source selects the full lane set", async () => {
    const { dir, baseSha } = await makeRepo();
    await commitChange(dir, "README.md", "# fixture\n\nupdated docs\n");
    await commitChange(dir, "src/index.ts", "export const marker = 1;\n");
    const run = await runDetection(dir, baseSha);
    expect(run.status).toBe(0);
    expect(lanesOf(run)).toEqual([...FULL_LANES]);
  });

  it("the detection path uses no third-party action: name-only diff plus JSON filtering only", async () => {
    const doc = await orchestratorDoc();
    const detection = findWorkflowJob(doc, "detection");
    expect(detection, "the orchestrator declares no detection job").toBeDefined();
    if (detection === undefined) {
      throw new Error("unreachable: asserted above");
    }
    const violations: string[] = [];
    for (const step of collectJobSteps(detection)) {
      const uses = step["uses"];
      if (typeof uses === "string" && !uses.startsWith("actions/")) {
        violations.push(`detection step uses non-first-party action: ${uses}`);
      }
    }
    expect(violations).toEqual([]);
    // The mechanism itself: a name-only git diff feeding JSON lane output.
    const body = firstRunBody(detection);
    expect(body, "detection has no run: step").toBeTypeOf("string");
    if (typeof body !== "string") {
      throw new Error("unreachable: asserted above");
    }
    expect(body).toContain("git diff --name-only");
    expect(body).toContain('"$GITHUB_OUTPUT"');
  });

  it("the full-history request appears on the detection job only, across the whole shipped set", async () => {
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

    let detectionFullHistoryRequests = 0;
    const violations: string[] = [];
    for (const [name, body] of await loadShippedWorkflows()) {
      const doc: unknown = parse(body);
      let insideDetectionCheckout = 0;
      for (const { jobId, job } of collectWorkflowJobs(doc)) {
        for (const step of collectJobSteps(job)) {
          const uses = step["uses"];
          const withNode = step["with"];
          if (
            typeof uses === "string" &&
            uses.startsWith("actions/checkout@") &&
            isRecord(withNode) &&
            withNode["fetch-depth"] === 0
          ) {
            if (jobId === "detection" && name === ORCHESTRATOR) {
              insideDetectionCheckout += 1;
              detectionFullHistoryRequests += 1;
            } else {
              violations.push(`${name}: job "${jobId}" requests full history`);
            }
          }
        }
      }
      const total = countKeyOccurrences(doc, "fetch-depth");
      if (total !== insideDetectionCheckout) {
        violations.push(
          `${name}: ${total - insideDetectionCheckout} fetch-depth key(s) outside the detection job's checkout`,
        );
      }
    }
    // Non-vacuity: the detection job itself must request full history —
    // the name-only diff needs the base commit locally reachable.
    expect(detectionFullHistoryRequests).toBe(1);
    expect(violations).toEqual([]);
  });
});

describe("TC-0003-0039 (TDD-0039): shallow clone and unreachable base ref fail open with a warning annotation", () => {
  // One it() per TC-0003-0039 verify bullet, each judging the SAME three
  // degraded fixtures: a --depth 1 clone, an unreachable base sha, and a
  // diff whose only changed path is outside the recognized set. Scoping
  // decision for bullet 3, disclosed: "verdict is green" is realized here
  // as the DETECTION shell exiting 0 in all three cases (fail open is the
  // green path — the superset selection is what keeps the claim honest);
  // the verdict job's own green behaviour (always-run, empty matrix,
  // aggregation) is TC-0003-0040's dedicated surface, landing next in this
  // same group.

  type DegradedCase = { label: string; run: ShellRun };

  /** Builds and runs the three degraded fixtures against the REAL shell. */
  async function runDegradedCases(): Promise<DegradedCase[]> {
    // The three fixtures share no state — each has its own temporary directory — so they are built
    // CONCURRENTLY. Serialised, this test spent its entire 15s budget with the machine idle and timed out
    // at 18.7s under load, which is a structural mismatch rather than a parallelism problem: raising the
    // timeout would have moved the number instead of the cost.
    const [shallowRun, unreachableRun, unrecognizedRun] = await Promise.all([
      // Shallow: a --depth 1 clone cannot prove the base commit reachable.
      (async (): Promise<ShellRun> => {
        const origin = await makeRepo();
        await commitChange(origin.dir, "src/app.ts", "export {};\n");
        const cloneParent = await newTempDir();
        await git(
          cloneParent,
          "clone",
          "--depth",
          "1",
          pathToFileURL(origin.dir).href,
          "shallow-clone",
        );
        return runDetection(path.join(cloneParent, "shallow-clone"), origin.baseSha);
      })(),
      // Unreachable base: a syntactically valid sha no commit answers to.
      (async (): Promise<ShellRun> => {
        const orphan = await makeRepo();
        await commitChange(orphan.dir, "src/app.ts", "export {};\n");
        return runDetection(orphan.dir, "0123456789abcdef0123456789abcdef01234567");
      })(),
      // Unrecognized path: the only change is neither docs nor source class.
      (async (): Promise<ShellRun> => {
        const stranger = await makeRepo();
        await commitChange(stranger.dir, "logo.png", "placeholder bytes\n");
        return runDetection(stranger.dir, stranger.baseSha);
      })(),
    ]);

    return [
      { label: "shallow clone", run: shallowRun },
      { label: "unreachable base ref", run: unreachableRun },
      { label: "unrecognized changed path", run: unrecognizedRun },
    ];
  }

  /**
   * The fixture set, built ONCE for the whole describe.
   *
   * The three cases below judge the same three fixtures — the comment at the top of this
   * describe says so — and `runDegradedCases` was being called once per `it()`, rebuilding
   * three git repositories, three commits, a shallow clone and three shell runs each time.
   * That is roughly eighty process spawns to produce one fixture set three times, and on a
   * platform where a spawn costs tens of milliseconds it is what put these cases past their
   * fifteen-second timeout.
   *
   * Memoized rather than moved into `beforeAll`, deliberately: the temp-directory pool
   * deletes its directories in `afterEach`, so a `beforeAll` fixture would be building
   * repositories that vanish after the first test. What the tests actually read is the RUN
   * RESULT — status, streams, parsed outputs — which survives the directory it came from.
   */
  let cases: Promise<DegradedCase[]> | undefined;

  const degradedCases = (): Promise<DegradedCase[]> => {
    cases ??= runDegradedCases();
    return cases;
  };

  it("all three degraded cases emit a warning annotation", async () => {
    const violations: string[] = [];
    for (const { label, run } of await degradedCases()) {
      if (!/::warning::/.test(run.stdout)) {
        violations.push(`${label}: no ::warning:: annotation in stdout`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("all three degraded cases select the full lane superset", async () => {
    const violations: string[] = [];
    for (const { label, run } of await degradedCases()) {
      const lanes = lanesOf(run);
      if (JSON.stringify(lanes) !== JSON.stringify(FULL_LANES)) {
        violations.push(`${label}: selected ${JSON.stringify(lanes)} instead of the full superset`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("all three degraded cases exit 0 — fail open stays green because the superset claim holds", async () => {
    const violations: string[] = [];
    for (const { label, run } of await degradedCases()) {
      if (run.status !== 0) {
        violations.push(`${label}: detection exited ${String(run.status)} instead of failing open`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("TC-0003-0040 (TDD-0040): verdict exits 0 on an empty matrix and carries an empty permission map", () => {
  // One it() per TC-0003-0040 verify bullet. The verdict body is the REAL
  // shipped run: block, executed via bash with QFAI_NEEDS_JSON stubs. This
  // row also discharges the GB3 conditional oracles: once the verdict job
  // lands, TDD-0027's verdict-empty-map it becomes non-vacuous.

  /** The shipped verdict job, asserted present, with its extracted body. */
  async function verdictJobAndBody(): Promise<{
    verdict: Record<string, unknown>;
    body: string;
  }> {
    const verdict = findWorkflowJob(await orchestratorDoc(), "verdict");
    expect(verdict, "the orchestrator declares no verdict job").toBeDefined();
    if (verdict === undefined) {
      throw new Error("unreachable: asserted above");
    }
    const body = firstRunBody(verdict);
    expect(body, "the verdict job has no run: step").toBeTypeOf("string");
    if (typeof body !== "string") {
      throw new Error("unreachable: asserted above");
    }
    return { verdict, body };
  }

  /** A needs-context stub: detection succeeded, every lane as given. */
  function needsStub(laneResult: string, lanes: string): string {
    const needs: Record<string, unknown> = {
      detection: { result: "success", outputs: { lanes } },
    };
    for (const lane of FULL_LANES) {
      needs[lane] = { result: laneResult, outputs: {} };
    }
    return JSON.stringify(needs, null, 2);
  }

  it("the verdict runs under an always-run condition and exits 0 on an empty matrix", async () => {
    const { verdict, body } = await verdictJobAndBody();
    expect(String(verdict["if"])).toContain("always()");
    // Empty matrix: detection selected zero lanes, every lane skipped.
    const stage = await newTempDir();
    const emptyMatrix = await runShell(body, stage, {
      QFAI_NEEDS_JSON: needsStub("skipped", "[]"),
    });
    expect(emptyMatrix.status).toBe(0);
    // Discriminating control of the same predicate: green-on-skip is not
    // green-on-anything — a failed lane must turn the verdict red.
    const failedLane = await runShell(body, stage, {
      QFAI_NEEDS_JSON: needsStub("failure", '["unit"]'),
    });
    expect(failedLane.status).toBe(1);
  });

  it("the verdict permissions block is an empty map", async () => {
    const { verdict } = await verdictJobAndBody();
    const permissions = verdict["permissions"];
    expect(isRecord(permissions) ? Object.keys(permissions) : permissions).toEqual([]);
  });

  it("verdict and detection are co-located in the same shipped file and the dependency edge stays inside it", async () => {
    const declaringFiles: Record<string, string[]> = { detection: [], verdict: [] };
    for (const [name, body] of await loadShippedWorkflows()) {
      for (const { jobId } of collectWorkflowJobs(parse(body))) {
        if (jobId === "detection" || jobId === "verdict") {
          declaringFiles[jobId]?.push(name);
        }
      }
    }
    expect(declaringFiles["detection"]).toEqual([ORCHESTRATOR]);
    expect(declaringFiles["verdict"]).toEqual([ORCHESTRATOR]);
    // The dependency edge: verdict needs detection, inside the same file.
    const { verdict } = await verdictJobAndBody();
    const needs = verdict["needs"];
    const needsList = Array.isArray(needs) ? needs : [needs];
    expect(needsList).toContain("detection");
  });
});

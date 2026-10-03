/** Execute the release workflow's classifier and evaluate its gate paths against tag manifests. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { parse as parseYaml } from "yaml";

import { invokedScriptBodies } from "../../../../scripts/check-workflow-hygiene.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const WORKFLOWS_DIR = path.join(REPO_ROOT, ".github", "workflows");
const RELEASE_WORKFLOW = path.join(WORKFLOWS_DIR, "release.yml");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const TAGGED_MANIFESTS = {
  "v1.12.3": {
    root: [
      "preinstall",
      "build",
      "sync:ssot",
      "ci:gate",
      "ci:gate:checks",
      "ci:gate:ssot",
      "ci:gate:lint",
      "ci:gate:types",
      "ci:gate:build",
      "ci:gate:structure",
      "ci:gate:scans",
      "ci:lint",
      "ci:lint:structure",
      "ci:lint:scans",
      "ci:build-verify",
      "ci:coverage",
      "lint",
      "lint:md",
      "lint:mermaid",
      "lint:mdschema",
      "lint:doc-clarity",
      "format",
      "format:check",
      "check-types",
      "check-types:future",
      "test:assets",
      "verify:pack",
      "prepack",
    ],
    package: [
      "build",
      "prepack",
      "lint",
      "lint:branch-version",
      "lint:md:shipped",
      "lint:shipping",
      "lint:workflow-shape",
      "lint:mirror-surface",
      "generate:rule-codes",
      "generate:governed-manifest",
      "check-types",
      "test",
      "test:coverage",
      "test:core",
      "test:validators",
      "test:integration",
      "test:e2e",
      "test:cli",
      "test:unit",
      "test:scripts",
      "test:pr-fix",
      "test:pr-merge",
      "test:assets",
      "self-validate",
    ],
  },
  "v1.12.0": {
    root: [
      "preinstall",
      "build",
      "sync:ssot",
      "ci:gate",
      "ci:lint",
      "ci:build-verify",
      "ci:coverage",
      "lint",
      "lint:md",
      "lint:mermaid",
      "lint:mdschema",
      "lint:doc-clarity",
      "format",
      "format:check",
      "check-types",
      "check-types:future",
      "test:assets",
      "verify:pack",
      "prepack",
    ],
    package: [
      "build",
      "prepack",
      "lint",
      "lint:branch-version",
      "lint:shipping",
      "lint:workflow-shape",
      "lint:mirror-surface",
      "generate:rule-codes",
      "generate:governed-manifest",
      "check-types",
      "test",
      "test:coverage",
      "test:core",
      "test:validators",
      "test:integration",
      "test:e2e",
      "test:cli",
      "test:unit",
      "test:scripts",
      "test:assets",
      "self-validate",
    ],
  },
  "v1.10.0": {
    root: [
      "preinstall",
      "build",
      "sync:ssot",
      "ci:gate",
      "ci:lint",
      "ci:build-verify",
      "ci:coverage",
      "lint",
      "lint:md",
      "format",
      "format:check",
      "check-types",
      "check-types:future",
      "test:assets",
      "verify:pack",
      "prepack",
    ],
    package: [
      "build",
      "prepack",
      "lint",
      "lint:branch-version",
      "lint:shipping",
      "check-types",
      "test",
      "test:coverage",
      "test:core",
      "test:validators",
      "test:integration",
      "test:e2e",
      "test:cli",
      "test:assets",
      "self-validate",
    ],
  },
  "v1.8.0": {
    root: [
      "build",
      "sync:ssot",
      "ci:gate",
      "ci:lint",
      "ci:build-verify",
      "lint",
      "lint:md",
      "format",
      "format:check",
      "check-types",
      "check-types:future",
      "test:assets",
      "verify:pack",
      "prepack",
    ],
    package: [
      "build",
      "prepack",
      "lint",
      "check-types",
      "test",
      "test:core",
      "test:validators",
      "test:integration",
      "test:e2e",
      "test:cli",
      "test:assets",
    ],
  },
} as const;

/** The tag keys, narrowed once so every row below indexes the record rather than a string. */
export const TAGS = Object.keys(TAGGED_MANIFESTS) as Array<keyof typeof TAGGED_MANIFESTS>;

/**
 * A manifest carrying exactly these script keys.
 *
 * The bodies are a placeholder because the classifier never reads one: it asks whether the
 * lookup yields a string. Writing the real bodies here would record something no row checks and
 * invite a reader to trust it.
 */
export const manifestWith = (keys: readonly string[]): string =>
  JSON.stringify({ scripts: Object.fromEntries(keys.map((key) => [key, "…"])) });

export const releaseDocument = (): Record<string, unknown> => {
  const parsed: unknown = parseYaml(readFileSync(RELEASE_WORKFLOW, "utf-8"));
  if (!isRecord(parsed)) throw new Error("release.yml did not parse to a mapping");
  return parsed;
};

export const releaseJobs = (): Record<string, Record<string, unknown>> => {
  const jobs = releaseDocument()["jobs"];
  if (!isRecord(jobs)) throw new Error("release.yml declares no jobs");
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, job] of Object.entries(jobs)) {
    if (!isRecord(job)) throw new Error(`release.yml's ${id} job did not parse to a mapping`);
    out[id] = job;
  }
  return out;
};

export const steps = (job: Record<string, unknown>): Array<Record<string, unknown>> => {
  const value = job["steps"];
  if (!Array.isArray(value)) return [];
  return value.filter((step): step is Record<string, unknown> => isRecord(step));
};

/** The `verify` step that decides, identified by the id its output expression names. */
export const shapeStep = (): Record<string, unknown> => {
  const verify = releaseJobs()["verify"];
  if (verify === undefined) throw new Error("release.yml declares no verify job");
  const step = steps(verify).find((candidate) => candidate["id"] === "shape");
  if (step === undefined) throw new Error("release.yml's verify job declares no `shape` step");
  return step;
};

/** The slice list the decision is made against, read off the step rather than restated here. */
export const declaredSlices = (): string[] => {
  const env = shapeStep()["env"];
  const value = isRecord(env) ? env["SUITE_SLICES"] : undefined;
  if (typeof value !== "string") throw new Error("the shape step declares no SUITE_SLICES");
  return value.trim().split(/\s+/).filter(Boolean);
};

/**
 * The classifier, out of its quoted heredoc.
 *
 * Quoted is what makes the extraction sound: bash expands nothing inside `<<'SHAPE'`, so the
 * bytes the runner executes and the bytes below are the same bytes. Exactly one well-ordered
 * delimiter pair is accepted — a silent zero-match would hand every row an empty program, and
 * `node ""` exits 0, so every row that expects a refusal would fail and every row that expects
 * a classification would fail for the wrong reason.
 */
export const classifierProgram = (): string => {
  const body = shapeStep()["run"];
  if (typeof body !== "string") throw new Error("the shape step has no run body");
  const lines = body.split(/\r?\n/);
  const opens = lines.flatMap((line, index) => (line === "node - <<'SHAPE'" ? [index] : []));
  const closes = lines.flatMap((line, index) => (line === "SHAPE" ? [index] : []));
  if (opens.length !== 1 || closes.length !== 1) {
    throw new Error(
      `the shape step must hold exactly one quoted SHAPE heredoc; found ${opens.length} ` +
        `openings and ${closes.length} terminators`,
    );
  }
  const [open] = opens;
  const [close] = closes;
  if (open === undefined || close === undefined || close <= open + 1) {
    throw new Error("the shape step's SHAPE heredoc is empty or its delimiters are out of order");
  }
  return `${lines.slice(open + 1, close).join("\n")}\n`;
};

export type Classification = { status: number; shape: string; checks: string; output: string };
export const operationScripts = ["ci:gate:ssot", "ci:gate:lint", "ci:gate:types", "ci:gate:build"];
export const operationJobs = ["gate-ssot", "gate-lint", "gate-types"];
export const gatePaths = [
  { shape: "whole", checks: "aggregate" },
  { shape: "sliced", checks: "aggregate" },
  { shape: "sliced", checks: "operations" },
];

/**
 * The classifier, run against two manifests.
 *
 * `.cjs`, because the workflow feeds it to `node -` on stdin, which Node reads as CommonJS.
 * A `.js` file in a directory with no manifest is read the same way today; naming the module
 * system is what keeps the two from drifting apart on a future Node.
 */
export const classify = (
  root: string,
  pkg: string,
  slices: string[] = declaredSlices(),
): Classification => {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-gate-shape-"));
  try {
    const program = path.join(dir, "classify.cjs");
    const outputFile = path.join(dir, "github-output");
    writeFileSync(program, classifierProgram(), "utf-8");
    writeFileSync(outputFile, "", "utf-8");
    const run = spawnSync("node", [program], {
      encoding: "utf-8",
      env: {
        ...process.env,
        ROOT_MANIFEST: root,
        PACKAGE_MANIFEST: pkg,
        SUITE_SLICES: slices.join(" "),
        GITHUB_OUTPUT: outputFile,
      },
    });
    if (run.error !== undefined) throw run.error;
    const written = readFileSync(outputFile, "utf-8");
    const match = /^suite-shape=(.*)$/m.exec(written);
    return {
      status: run.status ?? -1,
      shape: match?.[1] ?? "",
      checks: /^checks-shape=(.*)$/m.exec(written)?.[1] ?? "",
      output: `${run.stdout ?? ""}${run.stderr ?? ""}`,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

export const classifyTag = (tag: keyof typeof TAGGED_MANIFESTS): Classification =>
  classify(manifestWith(TAGGED_MANIFESTS[tag].root), manifestWith(TAGGED_MANIFESTS[tag].package));

/** This tree's own manifests, which are the sliced shape by construction. */
export const currentRoot = (): string =>
  readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8");
export const currentPackage = (): string =>
  readFileSync(path.join(REPO_ROOT, "packages", "qfai", "package.json"), "utf-8");

export const scriptKeys = (manifest: string): string[] => {
  const parsed: unknown = JSON.parse(manifest);
  if (!isRecord(parsed) || !isRecord(parsed["scripts"])) {
    throw new Error("a manifest under test declares no scripts");
  }
  return Object.keys(parsed["scripts"]);
};

/**
 * Which shape a job or a step runs under.
 *
 * A condition that never mentions the decision is orthogonal to it — the two build steps select
 * on `matrix.slice` — and counts as running under both. A condition that DOES mention it must
 * use the restricted release-condition grammar. Unknown syntax throws rather than silently
 * treating an unrecognized condition as an unconditional step.
 */
export const runsUnder = (
  owner: Record<string, unknown>,
  where: string,
  shape: string,
  checks: string,
): boolean => {
  const condition = owner["if"];
  if (condition === undefined) return true;
  if (typeof condition !== "string") throw new Error(`${where} carries a non-string condition`);
  const text = condition.trim();
  if (!text.includes("suite-shape") && !text.includes("checks-shape")) return true;
  try {
    return acceptsRelease(
      text,
      { verify: { outputs: { "suite-shape": shape, "checks-shape": checks } } },
      "push",
    );
  } catch (error) {
    throw new Error(`${where} has an unsupported shape condition`, { cause: error });
  }
};

/** The gate jobs, discovered by prefix and checked against the declared set below. */
export const gateJobs = (): Record<string, Record<string, unknown>> =>
  Object.fromEntries(Object.entries(releaseJobs()).filter(([id]) => id.startsWith("gate")));

export const matrixSlices = (job: Record<string, unknown>): string[] => {
  const strategy = job["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  const slices = isRecord(matrix) ? matrix["slice"] : undefined;
  if (slices === undefined) return [""];
  if (!Array.isArray(slices) || !slices.every((s) => typeof s === "string")) {
    throw new Error("a gate job declares a matrix.slice that is not a list of strings");
  }
  return slices;
};

/** Whether a job resolves the engines floor, read off the setup step's inputs. */
export const pinsFloor = (job: Record<string, unknown>): boolean =>
  steps(job).some((step) => {
    const inputs = step["with"];
    return isRecord(inputs) && inputs["pin-engines-floor"] === "true";
  });

export type Invocation = {
  jobId: string;
  where: string;
  manifest: "root" | "package";
  script: string;
};

/**
 * Every script a gate job would invoke for a tag of this shape.
 *
 * `pnpm <name>` reads from the root manifest and `pnpm -C packages/qfai <name>` from the
 * package's. No gate step calls a pnpm built-in, so every match is a script that has to exist;
 * a `-C` naming any other directory throws rather than being dropped.
 */
export const invocations = (shape: string, checks: string): Invocation[] => {
  const out: Invocation[] = [];
  for (const [jobId, job] of Object.entries(gateJobs())) {
    if (!runsUnder(job, `release.yml#${jobId}`, shape, checks)) continue;
    for (const step of steps(job)) {
      const name = String(step["name"] ?? "(unnamed)");
      const where = `release.yml#${jobId}: ${name}`;
      if (!runsUnder(step, where, shape, checks)) continue;
      const body = step["run"];
      if (typeof body !== "string") continue;
      for (const slice of matrixSlices(job)) {
        const text = body.split("${{ matrix.slice }}").join(slice);
        for (const match of text.matchAll(/\bpnpm (?:-C (\S+) )?([A-Za-z][\w:.-]*)/g)) {
          const directory = match[1];
          const script = match[2];
          if (script === undefined) continue;
          if (directory !== undefined && directory !== "packages/qfai") {
            throw new Error(`${where} runs pnpm -C ${directory}, which this row cannot resolve`);
          }
          out.push({
            jobId,
            where,
            manifest: directory === undefined ? "root" : "package",
            script,
          });
        }
      }
    }
  }
  return out;
};

/**
 * The suite call every tag's `ci:gate` ends in.
 *
 * Recorded rather than read, because the rows that need it run where the tags are not fetched.
 * The last row in this block re-derives it from the tags themselves wherever they are
 * reachable, and all four carry this call verbatim.
 */
export const TAGGED_AGGREGATE_BODY = "pnpm -C packages/qfai test";

/**
 * What the root aggregate a gate step names would itself run.
 *
 * On the old path it is the tag's own `ci:gate`, recorded above. On the sliced path the gate
 * names either the checks aggregate or an operation entry point. Each invoked script is
 * resolved transitively so a check reaching the suite through another script is counted too.
 */
export const aggregateBody = (shape: string, script: string): string => {
  if (shape === "whole") return TAGGED_AGGREGATE_BODY;
  const resolved: unknown = invokedScriptBodies(`pnpm ${script}`, REPO_ROOT);
  if (!Array.isArray(resolved)) {
    throw new Error(`the script reader returned no list for pnpm ${script}`);
  }
  return resolved.map((entry) => (Array.isArray(entry) ? String(entry[1] ?? "") : "")).join("\n");
};

/**
 * The package test scripts one tag's gate would run, counted, on one Node resolution.
 *
 * A root script contributes what IT runs: on the old path the gate runs `ci:gate`, whose body
 * ends in `pnpm -C packages/qfai test`, so the aggregate's suite run is counted here as one.
 * That is the whole reason a count is taken rather than the job list read — the aggregate's
 * suite and a sliced leg are the same suite arriving by two routes, and a set would swallow the
 * second.
 */
export const suiteRuns = (shape: string, checks: string, floor: boolean): string[] => {
  const onFloor = new Set(
    Object.entries(gateJobs())
      .filter(([, job]) => pinsFloor(job) === floor)
      .map(([id]) => id),
  );
  const runs: string[] = [];
  for (const invocation of invocations(shape, checks)) {
    if (!onFloor.has(invocation.jobId)) continue;
    if (invocation.manifest === "package") {
      if (invocation.script === "test" || invocation.script.startsWith("test:")) {
        runs.push(invocation.script);
      }
      continue;
    }
    if (!invocation.script.startsWith("ci:gate")) continue;
    for (const match of aggregateBody(shape, invocation.script).matchAll(
      /\bpnpm -C packages\/qfai (test(?::[\w-]+)?)\b/g,
    )) {
      const script = match[1];
      if (script !== undefined) runs.push(script);
    }
  }
  return runs.sort();
};

type ReleaseNeed = {
  result?: string | undefined;
  outputs?: { "suite-shape"?: string | undefined; "checks-shape"?: string | undefined };
};
export type ReleaseNeeds = Record<string, ReleaseNeed>;

/** Evaluates the release conditions' lowercase string fixtures and Boolean operators only. */
export const acceptsRelease = (
  condition: string,
  needs: ReleaseNeeds,
  event: string,
  cancelled = false,
): boolean => {
  const expression = condition.trim().replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, "$1");
  const token =
    /\s+|contains\(needs\.\*\.result,\s*'([^']*)'\)|cancelled\(\)|github\.event_name|needs\.([a-z][a-z-]*)\.(result|outputs\.(?:suite|checks)-shape)|'[^']*'|&&|\|\||==|!=|[!()]/gy;
  const translated: string[] = [];
  let offset = 0;
  while (offset < expression.length) {
    token.lastIndex = offset;
    const match = token.exec(expression);
    if (match === null) {
      throw new Error(`Unsupported release condition syntax at ${expression.slice(offset)}`);
    }
    offset = token.lastIndex;
    const text = match[0];
    if (/^\s+$/.test(text)) continue;
    if (match[1] !== undefined) {
      translated.push(String(Object.values(needs).some((need) => need.result === match[1])));
    } else if (text === "cancelled()") {
      translated.push(String(cancelled));
    } else if (text === "github.event_name") {
      translated.push(JSON.stringify(event));
    } else if (match[2] !== undefined) {
      if (
        ![
          "verify",
          "gate",
          "gate-tests",
          "gate-floor",
          "gate-floor-whole",
          ...operationJobs,
        ].includes(match[2])
      ) {
        throw new Error(`Unsupported release need ${match[2]}`);
      }
      const need = needs[match[2]];
      translated.push(
        JSON.stringify(
          (match[3] === "result"
            ? need?.result
            : need?.outputs?.[
                match[3] === "outputs.checks-shape" ? "checks-shape" : "suite-shape"
              ]) ?? "",
        ),
      );
    } else if (text.startsWith("'")) {
      translated.push(JSON.stringify(text.slice(1, -1)));
    } else {
      translated.push(text);
    }
  }
  // Only literals and the operators above reach the VM; unsupported syntax never evaluates.
  // Such an expression has no loop or call and cannot run away, so it takes no time limit:
  // a wall-clock limit would guard nothing and only fail on a loaded machine.
  const result: unknown = runInNewContext(translated.join(" "), {});
  if (typeof result !== "boolean") throw new Error("Release condition must return a Boolean");
  return result;
};

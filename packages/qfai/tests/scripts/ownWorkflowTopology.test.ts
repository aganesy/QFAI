/**
 * Topology assertions over QFAI's OWN CI workflows — `.github/workflows/**` and
 * `.github/actions/**`. Nothing here governs the shipped tree under
 * `packages/qfai/assets/init/root/.github/workflows/**`, which belongs to a
 * different spec and a different contract.
 *
 * This file is the home the ledger names for spec-0017's rows, so it grows one
 * describe per row as the nine sequenced changes land. Today it carries the first
 * change only: the aggregate verdict derives its result from the serialized needs
 * map instead of comparing a hand-written list of job names.
 *
 * ## How a YAML `run:` body is evaluated rather than read
 *
 * Three of the five rows below are `unit` rows whose oracle is "the verdict
 * expression evaluated over a needs map the test supplies". That requires
 * EXECUTING the shipped body, not pattern-matching it — a test that greps for
 * `success` passes on a body that accepts everything.
 *
 * The body is therefore written into `ci.yml` as a Node program inside a QUOTED
 * heredoc (`<<'NODE'`). Quoted is the load-bearing part: bash performs no
 * expansion inside it, so the bytes GitHub executes and the bytes extracted here
 * are the same bytes. Under an unquoted heredoc the shell would rewrite `$` and
 * backticks on the way in and this file would be testing a text the runner never
 * sees.
 *
 * `extractVerdictProgram` refuses anything but exactly one well-ordered
 * delimiter pair. A silent zero-match extractor is the failure mode that matters
 * here: it would hand every test an empty program, every `node ""` would exit 0,
 * and the two accepting rows would pass while the three rejecting rows failed
 * with an error that named the wrong thing.
 *
 * ## Node, not jq
 *
 * The runner image ships both. Node is chosen because the accepting-set rule has
 * to run in this test process too, and Node is the one interpreter guaranteed to
 * exist wherever this repository's tests run. A jq body would be unverifiable on
 * a developer machine without jq, and an unverifiable gate is what the derived
 * verdict exists to replace.
 */
// QFAI:SPEC-0017:TC-0017-0001
// QFAI:SPEC-0017:TC-0017-0002
// QFAI:SPEC-0017:TC-0017-0003
// QFAI:SPEC-0017:TC-0017-0004
// QFAI:SPEC-0017:TC-0017-0005
// QFAI:SPEC-0017:TC-0017-0027
// QFAI:SPEC-0017:TC-0017-0028
// QFAI:SPEC-0017:TC-0017-0029
// QFAI:SPEC-0017:TC-0017-0031
// QFAI:SPEC-0017:TC-0017-0071
// QFAI:SPEC-0017:TC-0017-0072
// QFAI:SPEC-0017:TC-0017-0073

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, "ci.yml");

/**
 * The aggregate verdict's job key. A LITERAL, and it has to stay one: the key is
 * the check name a repository-settings surface refers to, no agent can
 * reconfigure that surface, and deriving this constant from the file would make
 * every assertion below survive a rename that stranded the name.
 */
const VERDICT_JOB = "ci-pass";

/**
 * The document is narrowed with guards rather than asserted into a shape. A YAML
 * file is `unknown` by construction — it is text a human edits — and an `as` here
 * would make every reader below trust a shape nothing checked, which is the
 * failure this file exists to prevent one level up.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** The `ci-pass` job object, narrowed from the parsed document. */
function verdictJob(): Record<string, unknown> {
  const parsed: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(parsed) || !isRecord(parsed["jobs"])) {
    throw new Error(`${CI_WORKFLOW} did not parse to a document with a jobs map`);
  }
  const job = parsed["jobs"][VERDICT_JOB];
  if (!isRecord(job)) {
    throw new Error(`${CI_WORKFLOW} declares no job named ${VERDICT_JOB}`);
  }
  return job;
}

/** The verdict job's declared `needs`, which is the set every row below measures against. */
function verdictNeeds(): string[] {
  const needs = verdictJob()["needs"];
  if (!isStringArray(needs) || needs.length === 0) {
    throw new Error(`job ${VERDICT_JOB} declares no needs`);
  }
  return needs;
}

/** The single step whose `run` carries the heredoc — located by the delimiter, not by name. */
function verdictStep(): { run: string; env: Record<string, unknown> | undefined } {
  const steps = verdictJob()["steps"];
  if (!Array.isArray(steps)) {
    throw new Error(`job ${VERDICT_JOB} declares no steps`);
  }
  const carrying = steps.filter(
    (step: unknown): step is Record<string, unknown> =>
      isRecord(step) && typeof step["run"] === "string" && step["run"].includes("<<'NODE'"),
  );
  const [only] = carrying;
  if (carrying.length !== 1 || only === undefined) {
    throw new Error(
      `expected exactly 1 heredoc-carrying step in ${VERDICT_JOB}, found ${carrying.length}`,
    );
  }
  const run = only["run"];
  if (typeof run !== "string") {
    throw new Error(`the heredoc-carrying step in ${VERDICT_JOB} has no string run body`);
  }
  return { run, env: isRecord(only["env"]) ? only["env"] : undefined };
}

/**
 * The program text between the heredoc opener and its terminator.
 *
 * Throws on anything but one well-ordered pair. The alternative — returning `""`
 * when the delimiters move — is the silent failure described in the header.
 */
function extractVerdictProgram(): string {
  const lines = verdictStep().run.split("\n");
  const openers = lines.flatMap((line, index) => (line.includes("<<'NODE'") ? [index] : []));
  const terminators = lines.flatMap((line, index) => (line.trimEnd() === "NODE" ? [index] : []));
  const [opener] = openers;
  const [terminator] = terminators;
  if (opener === undefined || terminator === undefined || terminator <= opener) {
    throw new Error(
      `expected one well-ordered heredoc pair, found openers ${JSON.stringify(openers)} and terminators ${JSON.stringify(terminators)}`,
    );
  }
  if (openers.length !== 1 || terminators.length !== 1) {
    throw new Error(
      `expected exactly one heredoc pair, found ${openers.length} openers and ${terminators.length} terminators`,
    );
  }
  const body = lines.slice(opener + 1, terminator).join("\n");
  if (body.trim().length === 0) {
    throw new Error("the extracted verdict program is empty");
  }
  return body;
}

/** Runs the extracted program over a supplied needs map and returns its exit code and output. */
function evaluateVerdict(needs: Record<string, { result?: string }>): {
  exitCode: number;
  output: string;
} {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-verdict-"));
  const scriptPath = path.join(dir, "ci-verdict.mjs");
  writeFileSync(scriptPath, `${extractVerdictProgram()}\n`, "utf-8");
  try {
    const output = execFileSync(process.execPath, [scriptPath], {
      encoding: "utf-8",
      env: { ...process.env, NEEDS_JSON: JSON.stringify(needs) },
    });
    return { exitCode: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    // `status` is `null` when the child was killed by a signal rather than
    // exiting. Mapping that to -1 keeps a signal death distinguishable from
    // exit 1; a `?? 1` here would let a crashed child satisfy every rejecting row.
    return {
      exitCode: failure.status ?? -1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

/** A needs map assigning one result to every declared need. */
function allNeeds(result: string): Record<string, { result: string }> {
  return Object.fromEntries(verdictNeeds().map((name) => [name, { result }]));
}

describe("TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map", () => {
  it("reads the serialized map and evaluates a need name that appears nowhere in its body", () => {
    const step = verdictStep();

    // Guard — the derivation's input is the serialized map, not individual need
    // lookups. Without this the behavioural claim below could be satisfied by a
    // body that read `needs.build.result` six times and happened to reject.
    expect(
      step.env?.["NEEDS_JSON"],
      "the verdict step must receive the whole needs map serialized, or it cannot iterate one",
    ).toBe("${{ toJSON(needs) }}");

    // CLAIM 1 — no literal enumeration. Checked against the body with its
    // whole-line comments removed, because a need name appearing in prose is not
    // an enumeration: one of the need names is the English word `test`, and a raw
    // substring check over the whole body would redden on a comment explaining
    // the rule. Only whole-line comments are stripped, so a name in a TRAILING
    // comment still fails — a stricter rule than the obligation, chosen because
    // the looser one cannot be written without a JavaScript parser and because a
    // trailing comment naming a need is indistinguishable from the enumeration
    // this row removes when it sits beside the code that would use it.
    const code = extractVerdictProgram().replace(/^\s*\/\/.*$/gm, "");
    for (const name of verdictNeeds()) {
      expect
        .soft(
          code,
          `the verdict body must not name the need ${name} — a hand-maintained list is what this row removes`,
        )
        .not.toContain(name);
    }

    // CLAIM 2 — the behavioural half, and the one that cannot be faked by
    // renaming a variable: a need this repository has never declared still drives
    // the verdict, which is only possible if the body iterates whatever it is
    // given. This is the "zero-line diff to the verdict body" property stated as
    // an observation rather than as a promise about future edits.
    const withFutureJob = { ...allNeeds("success"), "some-future-lane": { result: "failure" } };
    const run = evaluateVerdict(withFutureJob);
    expect.soft(run.exitCode, "a need the body has never heard of must still be evaluated").toBe(1);
    expect
      .soft(
        run.output,
        "the verdict must name the need it rejected, or a red run cannot be diagnosed",
      )
      .toContain("some-future-lane");
  });
});

describe("TC-0017-0002 (TDD-0002): a failed need and a cancelled need each drive the verdict to 1", () => {
  it("rejects a failure and a cancellation, naming the need in both", () => {
    for (const state of ["failure", "cancelled"]) {
      const needs = { ...allNeeds("success"), build: { result: state } };
      const run = evaluateVerdict(needs);
      expect.soft(run.exitCode, `a need concluding ${state} must fail the verdict`).toBe(1);
      expect
        .soft(run.output, `the verdict must report the ${state} state it rejected`)
        .toContain(state);
    }
  });
});

describe("TC-0017-0003 (TDD-0003): no need is outside the verdict derivation and edge 1 is cited", () => {
  it("lets every declared need, one at a time, drive the verdict to 1", () => {
    const needs = verdictNeeds();

    // Guard — the fixture is non-trivial. On an empty needs list the loop below
    // would assert nothing and the row would pass by iterating zero times.
    expect(needs.length, "the verdict must declare at least one need").toBeGreaterThan(0);

    // The set difference stated as a measurement: for each declared need, force
    // that one to `failure` and require a rejection. A need the derivation did
    // not cover would leave the verdict at 0 for its own iteration and at 0 only
    // there, which is exactly the leak a text-level "does the body mention it"
    // check cannot see.
    for (const name of needs) {
      const run = evaluateVerdict({ ...allNeeds("success"), [name]: { result: "failure" } });
      expect.soft(run.exitCode, `need ${name} must be inside the verdict's derivation`).toBe(1);
      expect
        .soft(run.output, `the verdict must name ${name} when it is the rejecting need`)
        .toContain(name);
    }
  });
});

describe("TC-0017-0004 (TDD-0004): all-succeeded and all-skipped are both accepting", () => {
  it("returns 0 for an all-success map and for an all-skipped one", () => {
    // Two accepting states and not one: an all-skipped run is what change
    // detection produces on a documentation-only pull request, and a verdict that
    // rejected it would make the whole selection mechanism unmergeable.
    expect
      .soft(
        evaluateVerdict(allNeeds("success")).exitCode,
        "every need succeeded, so the verdict accepts",
      )
      .toBe(0);
    expect
      .soft(
        evaluateVerdict(allNeeds("skipped")).exitCode,
        "nothing needed running, which is an accepting outcome and not an unverified one",
      )
      .toBe(0);
  });
});

describe("TC-0017-0005 (TDD-0005): an unrecognized need state fails closed", () => {
  it("rejects every token outside the accepting set, including ones that look benign", () => {
    // The rule is that the ACCEPTING set is closed, not that a known-bad list is
    // rejected. Testing one unknown token cannot tell those apart — a denylist
    // containing `neutral` would pass that test. These five are chosen to be
    // near-misses rather than obvious garbage: a real GitHub conclusion the
    // verdict does not accept, a case variant, a whitespace variant, the empty
    // string, and a need with no `result` at all.
    const unknown: Record<string, { result?: string }>[] = [
      { ...allNeeds("success"), build: { result: "neutral" } },
      { ...allNeeds("success"), build: { result: "SUCCESS" } },
      { ...allNeeds("success"), build: { result: "success " } },
      { ...allNeeds("success"), build: { result: "" } },
      { ...allNeeds("success"), build: {} },
    ];

    for (const needs of unknown) {
      const token = JSON.stringify(needs["build"]);
      expect
        .soft(
          evaluateVerdict(needs).exitCode,
          `an unrecognized need state ${token} must fail closed`,
        )
        .toBe(1);
    }

    // The boundary from the other side: an empty map is rejected too. "No job
    // result was observed" is the strongest form of "nothing was verified", and
    // it is the one state where a permissive verdict would report green having
    // measured nothing at all.
    expect
      .soft(
        evaluateVerdict({}).exitCode,
        "an empty needs map means nothing was observed, which is not success",
      )
      .toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Change 4 — the shared setup definition.
//
// The preamble was duplicated six times in `ci.yml`: enable the corepack shim,
// set up Node, re-shim pnpm against the toolcache Node, install with a frozen
// lockfile. `BR-0017-0024`'s obligation is SINGLE-DEFINITION, and a
// repository-internal composite action is the mechanism that satisfies it today
// — a reusable workflow was rejected because per-job dispatch overhead
// contradicts the cost objective this whole spec exists to serve.
// ───────────────────────────────────────────────────────────────────────────

const SETUP_ACTION_REL = ".github/actions/setup/action.yml";
const SETUP_ACTION = path.join(REPO_ROOT, SETUP_ACTION_REL);
const SETUP_USES = "./.github/actions/setup";
const FROZEN_INSTALL = "pnpm install --frozen-lockfile";

/** The composite action, narrowed from its parsed document. */
function setupActionSteps(): Record<string, unknown>[] {
  const parsed: unknown = parseYaml(readFileSync(SETUP_ACTION, "utf-8"));
  if (!isRecord(parsed) || !isRecord(parsed["runs"])) {
    throw new Error(`${SETUP_ACTION_REL} did not parse to a document with a runs block`);
  }
  const steps = parsed["runs"]["steps"];
  if (!Array.isArray(steps)) {
    throw new Error(`${SETUP_ACTION_REL} declares no runs.steps list`);
  }
  return steps.filter(isRecord);
}

/**
 * The `ci.yml` jobs that need the toolchain, derived rather than listed: a job
 * needs it exactly when one of its steps runs a `pnpm` command.
 *
 * Derived on purpose. A hard-coded list would stop covering the tree the day a
 * job is added, and this row's whole point is that EVERY such job consumes the
 * one definition — a claim a stale list cannot make.
 */
function toolchainJobs(): { id: string; job: Record<string, unknown> }[] {
  const doc: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"])) throw new Error("ci.yml has no jobs mapping");
  const out: { id: string; job: Record<string, unknown> }[] = [];
  for (const [id, job] of Object.entries(doc["jobs"])) {
    if (!isRecord(job)) continue;
    const steps = Array.isArray(job["steps"]) ? job["steps"] : [];
    const usesPnpm = steps.some(
      (step) => isRecord(step) && typeof step["run"] === "string" && step["run"].includes("pnpm"),
    );
    if (usesPnpm) out.push({ id, job });
  }
  return out;
}

function ciWorkflowText(): string {
  return readFileSync(CI_WORKFLOW, "utf-8");
}

describe("TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition", () => {
  it("holds zero occurrences in ci.yml and exactly one in the shared definition", () => {
    // Counted over the RAW TEXT rather than the parsed document, because the
    // obligation is about the literal appearing once anywhere — a second copy in
    // a comment would still be a second copy to keep in sync, which is the
    // failure single-definition exists to prevent.
    const ciCount = ciWorkflowText().split(FROZEN_INSTALL).length - 1;
    const actionCount = readFileSync(SETUP_ACTION, "utf-8").split(FROZEN_INSTALL).length - 1;

    expect
      .soft(ciCount, "the own-CI workflow must not restate the frozen-lockfile install at all")
      .toBe(0);
    expect.soft(actionCount, "and the shared definition must state it exactly once").toBe(1);
  });
});

describe("TC-0017-0028 (TDD-0028): no toolchain job restates a preamble step inline", () => {
  it("consumes the shared definition from every toolchain job and inlines none of its steps", () => {
    const jobs = toolchainJobs();

    // Guard — the derivation found jobs. On an empty list every claim below holds
    // by iterating nothing.
    expect(jobs.length, "ci.yml must declare jobs that need the toolchain").toBeGreaterThan(0);

    // CLAIM 1 — each of them consumes the definition, reported as the ID list of
    // the ones that do not. A count would say a job is missing; the list says
    // which.
    expect
      .soft(
        jobs
          .filter(
            ({ job }) =>
              !(Array.isArray(job["steps"]) ? job["steps"] : []).some(
                (step) => isRecord(step) && step["uses"] === SETUP_USES,
              ),
          )
          .map(({ id }) => id),
        `every toolchain job must consume ${SETUP_USES} rather than restating the preamble`,
      )
      .toEqual([]);

    // CLAIM 2 — and none of the preamble's steps survives inline anywhere in
    // ci.yml. Each token is a distinct half of the preamble, so a partial
    // extraction that left one behind is named rather than lumped into a single
    // pass/fail.
    const text = ciWorkflowText();
    for (const token of ["corepack enable", "corepack prepare", "actions/setup-node@"]) {
      expect
        .soft(text, `ci.yml must not restate the preamble step \`${token}\` inline`)
        .not.toContain(token);
    }
  });
});

describe("TC-0017-0029 (TDD-0029): the shared definition keeps its four-step order and the re-shim", () => {
  it("runs shim, Node setup with cache and dependency path, re-shim, frozen install — in that order", () => {
    const steps = setupActionSteps();

    // CLAIM 1 — four steps, in order. The ORDER is the assertion, not the
    // membership: the re-shim exists because `setup-node` replaces the Node the
    // first shim was activated against, so a re-shim that ran BEFORE the Node
    // setup would be a no-op and the install would use the wrong pnpm.
    expect.soft(steps.length, "the definition has exactly four steps").toBe(4);

    const runOf = (i: number): string =>
      typeof steps[i]?.["run"] === "string" ? (steps[i]["run"] as string) : "";
    expect.soft(runOf(0), "step 1 enables the package-manager shim").toContain("corepack enable");
    expect
      .soft(steps[1]?.["uses"], "step 2 sets Node up")
      .toMatch(/^actions\/setup-node@[0-9a-f]{40}$/);
    expect
      .soft(runOf(2), "step 3 re-shims the package manager against the toolcache Node")
      .toContain("corepack prepare");
    expect.soft(runOf(3), "step 4 installs with a frozen lockfile").toContain(FROZEN_INSTALL);

    // CLAIM 2 — the Node step carries the package-manager cache AND an EXPLICIT
    // cache-dependency path. `BR-0017-0026` names both; today's inline preamble
    // has only the first, so the explicit path is new here rather than carried
    // over, and asserting it is what stops the extraction from silently dropping
    // half the rule.
    const nodeWith = isRecord(steps[1]?.["with"])
      ? (steps[1]["with"] as Record<string, unknown>)
      : {};
    expect.soft(nodeWith["cache"], "the Node step caches the package manager").toBe("pnpm");
    expect
      .soft(nodeWith["cache-dependency-path"], "and names its cache-dependency path explicitly")
      .toBeDefined();
  });
});

// ── TC-0017-0030 (TDD-0030) is deliberately NOT written here ───────────────
//
// The row asserts that no workflow-level Node version literal survives anywhere
// in the own workflows tree. `ci.yml` satisfies it after change 4; `release.yml`
// does not, and cannot be made to without choosing between three options that
// `CR-20260820-0001` puts to the spec's owner — one of which would launder a
// measured npm engine constraint through `engines.node`, on the workflow whose
// failure mode is an irreversible publish.
//
// So the assertions are withheld rather than committed red. `ci:gate` runs the
// whole package suite, so a red test here reds every pull request; and `it.todo`
// is not the escape, because `QFAI-TEST-001` gates on `.todo` stubs under the
// full validate profile. A `todo` row with no test is also simply the honest
// state.
//
// The oracle is written down in `.qfai/evidence/implement-spec-0017.md` under
// change 4, ready to paste back when the CR resolves: read each own workflow's
// top-level `env` block from the PARSED document (not by grepping text, so
// "workflow-level" is decided by YAML structure), and assert that no key
// matching /node/i holds a value starting with a digit.

describe("TC-0017-0031 (TDD-0031): the shared definition never enters the shipped asset tree", () => {
  it("is absent under the packaged asset tree, whose non-workflows rejection a sibling row already pins", () => {
    // CLAIM — absent from the shipped tree. Walked rather than probed at one path:
    // the obligation is that the definition lives OUTSIDE `assets/init/**`, and a
    // check of one expected location would miss a copy placed anywhere else.
    const assetsInit = path.join(REPO_ROOT, "packages", "qfai", "assets", "init");
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "actions") found.push(path.relative(REPO_ROOT, p).replace(/\\/g, "/"));
          walk(p);
        } else if (e.name === "action.yml" || e.name === "action.yaml") {
          found.push(path.relative(REPO_ROOT, p).replace(/\\/g, "/"));
        }
      }
    };
    walk(assetsInit);
    expect
      .soft(
        found,
        "no composite action or actions/ directory may exist under the shipped asset tree",
      )
      .toEqual([]);

    // The TC's second half — "pack verification still throws on a non-workflows
    // child" — is NOT re-asserted here, and that is a citation rather than a gap.
    // `verify-pack.mjs` resolves the repository root from its own location and
    // packs THIS repo, so it cannot be pointed at a fixture; the repository
    // already answered that with a static backstop in
    // `tests/integration/shippedWorkflowTopology.test.ts`, whose own comment names
    // this exact case — "an `actions/` directory stays a hard pack failure".
    // Duplicating it here would create a second site for one claim, which is the
    // class this spec has been correcting all slice. Asserted instead: that the
    // backstop is still there to be relied on.
    const backstop = readFileSync(
      path.join(
        REPO_ROOT,
        "packages",
        "qfai",
        "tests",
        "integration",
        "shippedWorkflowTopology.test.ts",
      ),
      "utf-8",
    );
    expect
      .soft(backstop, "the sibling static backstop this row relies on is gone — re-home the claim")
      .toContain('const allowedRootGithubEntries = new Set(["workflows"]);');
  });
});

// ── change 7: the duplicate validate workflow is retired and its run folded ──
//
// The repository shipped a validate workflow to adopters AND kept its own copy of it.
// The copy was never a mirror — it ran `--profile full` while the repository's own CI ran
// `tdd` and `sdd` — so deleting it would have dropped coverage rather than removed a
// duplicate. `BR-0017-0059` is what makes the deletion safe: the full-profile run moves
// into the `build` job first.
//
// Why the fold and not a repoint at the shipped file: the root manifest declares no
// dependency on the package and provides no local binary, so `npx qfai` from the root
// resolves to the PUBLISHED package. That inverts the dogfooding — CI would validate a
// release instead of the change under review.

const DUPLICATE_WORKFLOW = "qfai-validate.yml";
const BUILD_JOB = "build";
const LOCAL_BINARY = "node packages/qfai/dist/cli/index.mjs";

/**
 * Every workflow file in the repository's own tree.
 *
 * Read from the directory rather than from a list, so a workflow added later is covered by
 * `TC-0017-0071` without anyone remembering to register it.
 */
function ownWorkflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
}

/**
 * The parsed trigger block of one workflow.
 *
 * `on` is read under BOTH keys deliberately. It is a boolean in YAML 1.1, so a parser
 * following that schema yields the key `true` rather than the string `"on"`. This parser
 * follows YAML 1.2 and gives `"on"`, but a row whose correctness depends on which schema
 * the parser chose is a row that breaks silently on a dependency bump — and silently is the
 * failure mode this whole spec is written against.
 */
function triggersOf(file: string): Record<string, unknown> {
  const doc: unknown = parseYaml(readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8"));
  if (!isRecord(doc)) {
    throw new Error(`${file} does not parse as a mapping`);
  }
  const under = doc["on"] ?? doc[String(true)] ?? (doc as Record<string, unknown>)["true"];
  return isRecord(under) ? under : {};
}

/** The `build` job's steps, narrowed. */
function buildJobSteps(): Record<string, unknown>[] {
  const doc: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"]) || !isRecord(doc["jobs"][BUILD_JOB])) {
    throw new Error(`ci.yml declares no \`${BUILD_JOB}\` job`);
  }
  const steps = doc["jobs"][BUILD_JOB]["steps"];
  if (!Array.isArray(steps)) {
    throw new Error(`ci.yml's \`${BUILD_JOB}\` job declares no steps`);
  }
  return steps.filter(isRecord);
}

const stepName = (step: Record<string, unknown>): string =>
  typeof step["name"] === "string" ? step["name"] : "(unnamed)";

const stepRun = (step: Record<string, unknown>): string =>
  typeof step["run"] === "string" ? step["run"] : "";

describe("TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request", () => {
  it("has removed the duplicate and leaves a single pull-request-triggered workflow", () => {
    const files = ownWorkflowFiles();

    // CLAIM 1 — the duplicate is gone. Named as a literal: the row is about THIS file, and
    // a name derived from the directory it was deleted from would be vacuous.
    expect
      .soft(files, `${DUPLICATE_WORKFLOW} duplicated a workflow this repository also ships`)
      .not.toContain(DUPLICATE_WORKFLOW);

    // CLAIM 2 — and exactly one workflow remains pull-request-triggered. Asserted over the
    // PARSED trigger block, so a `pull_request` appearing in a comment or in a job name does
    // not count, and one nested under `on:` does.
    const triggered = files.filter((file) => "pull_request" in triggersOf(file));
    expect
      .soft(triggered, "exactly one workflow may run on a pull request")
      .toEqual([path.basename(CI_WORKFLOW)]);
  });
});

describe("TC-0017-0072 (TDD-0072): the folded run uses the local binary, not the published one", () => {
  it("runs the full profile from the build job against the repository root, via the built binary", () => {
    const steps = buildJobSteps();
    const fullProfile = steps.filter((step) => /--profile\s+full\b/.test(stepRun(step)));

    // CLAIM 1 — the run exists, exactly once, in the build job.
    expect
      .soft(
        fullProfile.map(stepName),
        "the build job must carry exactly one full-profile validate run",
      )
      .toHaveLength(1);
    if (fullProfile.length !== 1) return;
    const run = stepRun(fullProfile[0]);

    // CLAIM 2 — it fails the job, targets the repository root, and uses the LOCAL binary.
    // The binary is the half that matters: the root manifest declares no dependency on the
    // package, so any resolution through the package name would reach the published release
    // instead of the build under review.
    for (const [needle, why] of [
      ["--fail-on error", "the folded run must fail the job, not merely report"],
      ["--root .", "the folded run must validate the repository root"],
      [LOCAL_BINARY, "the folded run must invoke the locally built binary"],
    ] as const) {
      expect.soft(run, `${why}: ${JSON.stringify(run)}`).toContain(needle);
    }

    // CLAIM 3 — and no own workflow reaches the package through a resolver that would find
    // the published one. This is the rejected alternative, asserted rather than described.
    const published: string[] = [];
    for (const file of ownWorkflowFiles()) {
      const text = readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8");
      for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (line.trimStart().startsWith("#")) continue;
        if (/\b(?:npx|pnpm\s+dlx|yarn\s+dlx|bunx)\s+qfai\b/.test(line)) {
          published.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      }
    }
    expect
      .soft(published, "a resolver-based invocation would reach the published package")
      .toEqual([]);

    // The warrant for CLAIM 3, asserted so the reason cannot rot: the root manifest really
    // does not depend on the package. If that ever changes, CLAIM 3's rationale changes with
    // it and this row should be revisited rather than silently kept.
    const rootManifest: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
    );
    const declared = isRecord(rootManifest)
      ? {
          ...(isRecord(rootManifest["dependencies"]) ? rootManifest["dependencies"] : {}),
          ...(isRecord(rootManifest["devDependencies"]) ? rootManifest["devDependencies"] : {}),
        }
      : {};
    expect
      .soft(
        Object.keys(declared).filter((name) => name === "qfai"),
        "the root manifest declaring a dependency on qfai would change why a repoint is unsafe",
      )
      .toEqual([]);
  });
});

describe("TC-0017-0073 (TDD-0073): the folded run joins the enumerated verification set", () => {
  it("enumerates the build job's verifications and requires each of them, the folded run included", () => {
    // THE enumeration. Keeping it here, as literals, is what makes removing any member a
    // failing test rather than a tidy diff — which is precisely what `BR-0017-0060` asks
    // for ("removing it later is a release blocker rather than a cleanup"). A set derived
    // from the workflow would agree with the workflow by construction and assert nothing.
    const REQUIRED = [
      "Run build & pack verification",
      "Sanity grep — no internal spec IDs or version markers leak (post-build)",
      "QFAI self-validate this repo (dogfooding — TDD gates)",
      "QFAI self-validate this repo (dogfooding — SDD gates)",
      "QFAI self-validate this repo (dogfooding — full profile)",
      "Run qfai validate gate (fail on error)",
    ] as const;

    const steps = buildJobSteps();
    const present = steps.map(stepName);
    const absent = REQUIRED.filter((name) => !present.includes(name));
    expect
      .soft(absent, "every enumerated verification must be present in the build job")
      .toEqual([]);

    // And each of them must be able to FAIL. A step that cannot fail is not a verification,
    // however it is named — the job already carries one such step on purpose (the optional
    // report, which ends in `|| true`), and the difference between the two kinds is the
    // whole point of enumerating them.
    const toothless = steps
      .filter((step) => REQUIRED.includes(stepName(step) as (typeof REQUIRED)[number]))
      .filter(
        (step) =>
          step["continue-on-error"] === true ||
          /\|\|\s*true\b/.test(stepRun(step)) ||
          /\|\|\s*:\s*$/m.test(stepRun(step)),
      )
      .map(stepName);
    expect
      .soft(toothless, "an enumerated verification that cannot fail is not a verification")
      .toEqual([]);
  });
});

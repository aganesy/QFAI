/**
 * Topology assertions over QFAI's OWN CI workflows — `.github/workflows/**` and
 * `.github/actions/**`. Nothing here governs the shipped tree under
 * `packages/qfai/assets/init/root/.github/workflows/**`, which belongs to a
 * different spec and a different contract.
 *
 * This file is the home the ledger names for spec-0017's rows, so it grows one
 * describe per row as the nine sequenced changes land. It now carries changes 1, 4,
 * 7, 8 and 9 — the derived verdict, the shared setup definition, the retirement of
 * the duplicate validate workflow, change detection and lane selection, and the
 * check-name invariants layer separation must preserve. The sentence that stood
 * here said "the first change only", which stopped being true four changes ago; a
 * count maintained in prose is a count that goes stale, so this one names the
 * changes instead.
 *
 * ## How a YAML `run:` body is evaluated rather than read
 *
 * Several rows below are `unit` rows whose oracle is "the expression evaluated over
 * an input the test supplies" — the verdict over a needs map, and the change
 * classifier over a path list. That requires
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
// QFAI:SPEC-0017:TC-0017-0006
// QFAI:SPEC-0017:TC-0017-0007
// QFAI:SPEC-0017:TC-0017-0008
// QFAI:SPEC-0017:TC-0017-0009
// QFAI:SPEC-0017:TC-0017-0010
// QFAI:SPEC-0017:TC-0017-0011
// QFAI:SPEC-0017:TC-0017-0012
// QFAI:SPEC-0017:TC-0017-0041
// QFAI:SPEC-0017:TC-0017-0042
// QFAI:SPEC-0017:TC-0017-0043
// QFAI:SPEC-0017:TC-0017-0036
// QFAI:SPEC-0017:TC-0017-0038
// QFAI:SPEC-0017:TC-0017-0039
// QFAI:SPEC-0017:TC-0017-0040

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
/**
 * A capture group the pattern guarantees, narrowed.
 *
 * Under `noUncheckedIndexedAccess` every `match[1]` is `string | undefined`, and the
 * project rules forbid the assertion that would silence it. A pattern that matched but
 * produced no group means the pattern changed under the reader — a broken helper rather
 * than a failing claim — so it throws instead of handing back a value to compare.
 */
function group(match: RegExpMatchArray | RegExpExecArray, index: number): string {
  const value = match[index];
  if (value === undefined) {
    throw new Error(`the pattern matched without capture group ${index}`);
  }
  return value;
}

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
    // Narrowed field by field rather than asserted into a shape. A thrown value is `unknown`
    // by construction, and an `as` here would make the three reads below trust a shape nothing
    // checked — the same defect this file exists to catch one level up.
    const failure = isRecord(error) ? error : {};
    const status = failure["status"];
    const stdout = failure["stdout"];
    const stderr = failure["stderr"];
    // `status` is `null` when the child was killed by a signal rather than
    // exiting. Mapping that to -1 keeps a signal death distinguishable from
    // exit 1; a `?? 1` here would let a crashed child satisfy every rejecting row.
    return {
      exitCode: typeof status === "number" ? status : -1,
      output: `${typeof stdout === "string" ? stdout : ""}${typeof stderr === "string" ? stderr : ""}`,
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
    // A job that INVOKES pnpm, not one that merely contains the word.
    //
    // The substring test was wrong and change 8 proved it: the detection job embeds a
    // program whose recognized-file list names `pnpm-lock.yaml` and
    // `pnpm-workspace.yaml`, so the job read as a toolchain job and was reported for
    // not consuming the shared setup definition. It needs no dependencies at all — it
    // runs the image's node against a git diff — and making it install the workspace
    // would add the slowest step in the file to its cheapest job, against the cost
    // objective this spec exists to serve.
    //
    // A narrowing, not a weakening: the row is about jobs that run pnpm, and a command
    // word is what running pnpm looks like in every form a `run:` block can take.
    const invokesPnpm = (run: string): boolean =>
      run.split(/\r?\n/).some((line) => /(?:^|[&|;]\s*)pnpm(?:\s|$)/.test(line.trim()));
    const usesPnpm = steps.some(
      (step) => isRecord(step) && typeof step["run"] === "string" && invokesPnpm(step["run"]),
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

    // CLAIM 1 — five steps, in order. The ORDER is the assertion, not the
    // membership: the re-shim exists because `setup-node` replaces the Node the
    // first shim was activated against, so a re-shim that ran BEFORE the Node
    // setup would be a no-op and the install would use the wrong pnpm.
    //
    // The fifth step is review finding [127]. The install now runs with
    // `--ignore-scripts`, because a dependency's manifest is not in this tree —
    // it arrives inside a tarball, and its `postinstall` ran before every guard
    // in the job. What may build is named in `.github/dependency-builds.txt`,
    // whose digest the pre-flight pins, and this step rebuilds exactly that set
    // AFTER the install that deliberately ran nothing.
    expect.soft(steps.length, "the definition has exactly four steps").toBe(4);

    const runOf = (i: number): string => {
      // Bound to a local first. `typeof steps[i]?.["run"] === "string"` narrows the EXPRESSION,
      // not `steps[i]["run"]`, so indexing again threw the narrowing away and invited an
      // assertion to paper over it.
      const value = steps[i]?.["run"];
      return typeof value === "string" ? value : "";
    };
    expect.soft(runOf(0), "step 1 enables the package-manager shim").toContain("corepack enable");
    expect
      .soft(steps[1]?.["uses"], "step 2 sets Node up")
      .toMatch(/^actions\/setup-node@[0-9a-f]{40}$/);
    expect
      .soft(runOf(2), "step 3 re-shims the package manager against the toolcache Node")
      .toContain("corepack prepare");
    expect.soft(runOf(3), "step 4 installs with a frozen lockfile").toContain(FROZEN_INSTALL);
    expect
      .soft(
        runOf(3),
        "and runs none of the install scripts a dependency ships — review finding [127]",
      )
      .toContain("--ignore-scripts");
    expect
      .soft(runOf(3), "and rebuilds only what the pinned allow-list names, in the same step")
      .toContain("dependency-builds.txt");
    expect
      .soft(
        runOf(3).indexOf("--ignore-scripts"),
        "with the install first: rebuilding before installing rebuilds nothing",
      )
      .toBeLessThan(runOf(3).indexOf("pnpm rebuild"));

    // CLAIM 2 — the Node step carries the package-manager cache AND an EXPLICIT
    // cache-dependency path. `BR-0017-0026` names both; today's inline preamble
    // has only the first, so the explicit path is new here rather than carried
    // over, and asserting it is what stops the extraction from silently dropping
    // half the rule.
    const withBlock = steps[1]?.["with"];
    const nodeWith = isRecord(withBlock) ? withBlock : {};
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
  // `doc` is already narrowed to a record by the guard above, so the third lookup needs no
  // assertion — it was there only because the key is written two ways.
  const under = doc["on"] ?? doc[String(true)] ?? doc["true"];
  return isRecord(under) ? under : {};
}

/**
 * The build job's steps, and NOT a call to `stepsOf(BUILD_JOB)` — kept deliberately after round
 * 6 finding F-10 asked why a near-duplicate survives the F6 de-duplication.
 *
 * The difference is the second throw. `stepsOf` returns `[]` for a job that declares no steps,
 * which is right for a caller asking "which of these steps carry an `if`" — an empty answer is a
 * true answer. It is wrong for every caller of THIS helper: `TC-0017-0038` and `TC-0017-0073`
 * assert that no verification item is weakened and that each enumerated item is present, and
 * both pass vacuously over an empty list. So a `build` job whose steps vanished would satisfy
 * them rather than fail them, which is the vacuity this spec has now been bitten by five times.
 *
 * The cost is one extra parse of a file already parsed elsewhere in the same run. That is the
 * trade, stated so the next de-duplication pass does not have to re-derive it.
 */
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
    const [only] = fullProfile;
    if (fullProfile.length !== 1 || only === undefined) return;
    const run = stepRun(only);

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
      .filter((step) => listHas(REQUIRED, stepName(step)))
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

    // And this list is pinned to the DECLARATION, which is the copy production reads.
    //
    // Implementation-review finding M3: the same six literals exist in three places — this
    // `REQUIRED`, `TC-0017-0036`'s `VERIFICATION_SET`, and
    // `.github/required-status-contexts.json`. `TC-0017-0036` CLAIM 4 pins its copy to the
    // declaration. This one was pinned to nothing, so it could drift from both while every
    // assertion above kept passing — and it is the only copy that checks the can-it-fail
    // property, so a member that drifted out of it would lose that check silently.
    //
    // Pinned by EQUALITY rather than by sharing a constant, deliberately. `BR-0017-0060` and
    // `BR-0017-0032` are different obligations over the same list, and a shared constant would
    // let one row's edit satisfy the other by construction — the reason `VERIFICATION_SET`
    // restates rather than imports. Equality keeps three copies and makes divergence fail.
    const declared: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, ".github", "required-status-contexts.json"), "utf-8"),
    );
    const contexts =
      isRecord(declared) && Array.isArray(declared["contexts"]) ? declared["contexts"] : [];
    const forRequired = contexts
      .filter(isRecord)
      .find((entry) => entry["job"] === REQUIRED_CONTEXT_NAME);
    expect(
      forRequired,
      `the declaration must name the ${REQUIRED_CONTEXT_NAME} job`,
    ).not.toBeUndefined();
    expect
      .soft(
        forRequired === undefined ? undefined : forRequired["verificationSet"],
        "this row's literals and the declaration production reads must not drift apart",
      )
      // The declaration names NINE items and this row restates six, and the difference is not
      // drift: the other three belong to jobs other than `build` — the verdict step to the
      // declared job itself, and two to `lint`. The pre-flight refusal of the local composite
      // actions has to run before that job invokes one (review finding [82]); `pnpm ci:lint`
      // is the lint job's own work, pinned by body for the reason review finding [89] gives
      // about a gated lane — being in the aggregate is not the same claim as still doing the
      // work. Composed here rather than added to `REQUIRED`, which is checked against
      // `buildJobSteps()` above and would then be looking for steps that job does not have.
      .toEqual([
        // First, and in `detect`: an audit found the classifier's body pinned by nothing while
        // this file's own note claimed otherwise. It decides whether five of the eight lanes
        // run, so two literal edits inside its heredoc skipped them into an accepting `skipped`
        // — including the lane whose tests execute that heredoc.
        "Classify the change against the enumerated directory lists",
        "Verify the toolchain action before running it",
        "Derive the verdict from the serialized needs map",
        ...REQUIRED,
        "Run lint gate",
      ]);
  });
});

// ── change 8: change detection and lane selection ───────────────────────────
//
// Two kinds of claim live here, kept apart on purpose.
//
// The STRUCTURAL claims read the workflow: which jobs carry a selection condition,
// which do not, and that no matrix leg was removed to achieve a narrower run. Those
// are about the shape branch protection sees.
//
// The BEHAVIOURAL claims extract the classifier program out of the workflow and RUN
// it against synthetic path lists — the technique change 1 used for the verdict, for
// the same reason: a rule that is only read is a rule nobody has tested. The heredoc
// is quoted, so the bytes GitHub executes are the bytes these tests execute.
//
// Why the classifier decides even the failure case: `BR-0017-0008` requires a failed
// diff to emit an annotation naming the reason AND to select the full set. If that
// decision lived in the shell around the program it would be the one part of the rule
// no test could reach. So the workflow only ATTEMPTS the diff — paths to one file,
// git's stderr to another — and the program decides. A missing or empty path file is
// "the diff could not be computed", never "nothing changed".

const DETECT_JOB = "detect";
const LINT_JOB = "lint";
const REQUIRED_CONTEXT_JOB = "build";

/**
 * Jobs that must run whatever detection selects.
 *
 * `EX-0017-0007` names the four instances a documentation-only pull request may
 * execute: detection, lint, build and the verdict. `build` is there because it carries
 * the required status context (`BR-0017-0007`), and `BR-0017-0012` forbids a condition
 * on such a job or on anything it depends on. `lint` is there because `BR-0017-0011`
 * exempts it by name — it carries the formatter, the Markdown linter, the leakage
 * guard and the pin guard, every one of which a documentation change can break.
 */
const UNCONDITIONAL_JOBS = [DETECT_JOB, LINT_JOB, REQUIRED_CONTEXT_JOB, VERDICT_JOB] as const;

/** `needs` normalized to an array; a scalar `needs` is legal YAML. */
function needsOf(job: Record<string, unknown>): string[] {
  const needs = job["needs"];
  if (typeof needs === "string") return [needs];
  return isStringArray(needs) ? needs : [];
}

function ciJobs(): Record<string, Record<string, unknown>> {
  const doc: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"])) {
    throw new Error("ci.yml declares no jobs");
  }
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, job] of Object.entries(doc["jobs"])) {
    if (isRecord(job)) out[id] = job;
  }
  return out;
}

const conditionOf = (job: Record<string, unknown>): string => String(job["if"] ?? "(none)");

/**
 * The classifier program, extracted from the detect job's quoted heredoc.
 *
 * Located by the heredoc delimiter rather than by a line offset, so adding a step to
 * the job cannot silently extract the wrong text.
 */
function extractClassifier(): string {
  const job = ciJobs()[DETECT_JOB];
  if (job === undefined) {
    throw new Error(`ci.yml declares no \`${DETECT_JOB}\` job`);
  }
  const steps = Array.isArray(job["steps"]) ? job["steps"].filter(isRecord) : [];
  const bodies = steps
    .map((step) => step["run"])
    .filter((run): run is string => typeof run === "string")
    .filter((run) => run.includes("<<'NODE'"));
  if (bodies.length !== 1) {
    throw new Error(
      `expected exactly one quoted NODE heredoc in \`${DETECT_JOB}\`, found ${bodies.length}`,
    );
  }
  const [body] = bodies;
  if (body === undefined) {
    throw new Error(`no quoted NODE heredoc in \`${DETECT_JOB}\``);
  }
  const start = body.indexOf("\n", body.indexOf("<<'NODE'"));
  const end = body.indexOf("\nNODE", start);
  if (start < 0 || end < 0) {
    throw new Error("the classifier heredoc is not terminated");
  }
  return body.slice(start + 1, end);
}

interface Classification {
  status: number;
  full: boolean | null;
  reason: string;
  annotations: string[];
  raw: string;
}

/** One classifier run over a synthetic input. */
function runClassifier(input: {
  paths?: readonly string[] | null;
  diffError?: string;
}): Classification {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-detect-"));
  try {
    const program = path.join(dir, "detect.mjs");
    writeFileSync(program, extractClassifier(), "utf-8");

    const pathsFile = path.join(dir, "changed.txt");
    if (input.paths !== null && input.paths !== undefined) {
      writeFileSync(pathsFile, `${input.paths.join("\n")}\n`, "utf-8");
    }
    const errFile = path.join(dir, "diff-err.txt");
    writeFileSync(errFile, input.diffError ?? "", "utf-8");
    const outFile = path.join(dir, "github-output.txt");
    writeFileSync(outFile, "", "utf-8");

    const run = spawnSync(process.execPath, [program, pathsFile, errFile], {
      encoding: "utf-8",
      env: { ...process.env, GITHUB_OUTPUT: outFile },
    });
    const raw = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    const written = readFileSync(outFile, "utf-8");
    const full = /^full=(.*)$/m.exec(written);
    const reason = /^reason=(.*)$/m.exec(written);
    return {
      status: run.status ?? -1,
      full: full === null ? null : group(full, 1).trim() === "true",
      reason: reason === null ? "" : group(reason, 1).trim(),
      annotations: raw
        .split(/\r?\n/)
        .filter((line) => line.startsWith("::warning"))
        .map((line) => line.trim()),
      raw,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("TC-0017-0006 (TDD-0006): a documentation-only change executes at most four instances", () => {
  it("leaves exactly four jobs unconditional and derives every other job's condition from detection", () => {
    const jobs = ciJobs();

    // CLAIM 1 — the four that always run are exactly the four `EX-0017-0007` names.
    // A set equality rather than "at least these", because the ceiling IS the
    // requirement: a fifth unconditional job breaks it however useful it is.
    // "Unconditional" means the job cannot be prevented from running, which is not
    // the same as carrying no `if`. The verdict carries `if: always()` on purpose —
    // it must run when its needs are SKIPPED, which is precisely the documentation-only
    // case, and its accepting set treats `skipped` as passing. Counting it as
    // conditional would have made the ceiling unmeetable for the one job the ceiling
    // exists to protect.
    const ALWAYS = /^\s*(?:\$\{\{\s*)?always\(\)\s*(?:\}\})?\s*$/;
    const unconditional = Object.entries(jobs)
      .filter(([, job]) => job["if"] === undefined || ALWAYS.test(String(job["if"])))
      .map(([id]) => id)
      .sort();

    // And only the verdict may reach the ceiling that way. `always()` on a lane would
    // satisfy the count while running it on every documentation change, so which job
    // is allowed the escape hatch is asserted rather than left to convention.
    const alwaysJobs = Object.entries(jobs)
      .filter(([, job]) => job["if"] !== undefined && ALWAYS.test(String(job["if"])))
      .map(([id]) => id);
    expect
      .soft(alwaysJobs, "only the verdict may use always() to stay unconditional")
      .toEqual([VERDICT_JOB]);
    expect
      .soft(
        unconditional,
        "a documentation-only run may execute only detection, lint, build and the verdict",
      )
      .toEqual([...UNCONDITIONAL_JOBS].sort());

    const selected = Object.entries(jobs).filter(([id]) => !listHas(UNCONDITIONAL_JOBS, id));

    // CLAIM 2 — every conditional job derives its condition from the detection output.
    // A hand-written condition would satisfy CLAIM 1 and still select lanes by a rule
    // nothing tests.
    const underived = selected
      .filter(([, job]) => !conditionOf(job).includes(`needs.${DETECT_JOB}.outputs.full`))
      .map(([id, job]) => `${id}: ${conditionOf(job)}`);
    expect
      .soft(underived, "every selected job's condition must be derived from the detection output")
      .toEqual([]);

    // CLAIM 3 — and each declares the dependency that makes its condition resolvable.
    // `needs.detect.outputs.full` on a job that does not need `detect` evaluates to
    // empty, which reads as false and skips the lane forever, silently.
    const unwired = selected
      .filter(([, job]) => !needsOf(job).includes(DETECT_JOB))
      .map(([id]) => id);
    expect.soft(unwired, `a job reading needs.${DETECT_JOB} must declare it in needs`).toEqual([]);

    // CLAIM 4 — and the verdict covers detection itself.
    //
    // Not a restatement of CLAIM 3. Every selected lane needs `detect`, so a CRASHED
    // detection skips all of them; the verdict reads `skipped`, and `skipped` is
    // accepting because a documentation-only run legitimately produces one. Without
    // `detect` in the verdict's own needs that arrives as a green run in which nothing
    // was verified — the case the verdict's accepting set was written to exclude.
    // Failing OPEN is a decision the classifier makes and annotates; failing HARD has to
    // reach the gate. Found by reading the shape, not by a failing test, which is why it
    // is written down here.
    expect
      .soft(
        needsOf(jobs[VERDICT_JOB] ?? {}),
        "a crashed detection must reach the verdict rather than skipping every lane into a green run",
      )
      .toContain(DETECT_JOB);
  });
});

describe("TC-0017-0007 (TDD-0007): unneeded legs stay declared and are skipped, never removed", () => {
  it("keeps every matrix leg declared and puts the condition on the job, not the list", () => {
    const test = ciJobs()["test"];
    expect(test, "ci.yml must declare a `test` job").not.toBeUndefined();
    if (test === undefined) return;

    // CLAIM 1 — the leg list is untouched. `BR-0017-0006` forbids removing a leg to
    // achieve a narrower run: a removed leg takes its check name with it, and branch
    // protection then needs a repository setting change.
    const strategy = test["strategy"];
    const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
    const slices = isRecord(matrix) ? matrix["slice"] : undefined;
    expect
      .soft(
        Array.isArray(slices) ? [...slices].sort() : slices,
        "every declared slice must stay in the matrix so its check name persists",
      )
      .toEqual(["cli", "core", "e2e", "integration", "scripts", "unit", "validators"]);

    // CLAIM 2 — and the condition sits on the JOB. A condition inside the matrix would
    // change the leg set, which is CLAIM 1's removal by another route.
    expect
      .soft(conditionOf(test), "the selection condition belongs on the job")
      .toContain(`needs.${DETECT_JOB}.outputs.full`);
    expect
      .soft(JSON.stringify(strategy ?? null), "no selection condition may live inside the matrix")
      .not.toContain("needs.");
  });
});

describe("TC-0017-0008 (TDD-0008): a resolvable base ref narrows the lane set with no annotation", () => {
  it("selects the narrow set for a documentation-only list and annotates nothing", () => {
    const result = runClassifier({ paths: ["REVIEW.md", "packages/qfai/docs/anything.md"] });
    expect.soft(result.status, `the classifier must exit 0:\n${result.raw}`).toBe(0);
    expect
      .soft(result.full, "a documentation-only change must not select the full set")
      .toBe(false);
    expect
      .soft(result.annotations, "a successful classification must emit no warning annotation")
      .toEqual([]);
  });

  it("computes the path list with rename detection OFF, so a move cannot hide its source", () => {
    // A narrowing is only correct if the path list is complete, and with rename detection ON it
    // is not: git reports only the DESTINATION of a move. Measured in a scratch repository —
    //
    //   git mv packages/qfai/src/foo.ts packages/qfai/docs/foo.md
    //   git diff --name-only              -> packages/qfai/docs/foo.md
    //   git diff --name-only --no-renames -> packages/qfai/docs/foo.md
    //                                        packages/qfai/src/foo.ts
    //
    // So `git mv src/x.ts docs/x.md` reached the classifier as one documentation path and the
    // source change skipped every test lane. The same move out of the assistant tree bypassed
    // the never-documentation exclusion on precisely the change class it exists for.
    //
    // Asserted over the SHELL rather than the classifier, because that is where the input is
    // produced — the classifier cannot recover a path it was never given. That is also why this
    // claim reads a flag: its oracle is a mutation of the workflow, not of the program.
    // Comment lines are STRIPPED before the flag is looked for, and that is not tidiness — the
    // first version of this claim searched the whole `run` string and was vacuous, because the
    // comment three lines above the command explains the flag by naming it. An oracle round that
    // deleted the flag from the command reddened NOTHING. Read the assertion below as: the flag is
    // on the invocation, not merely mentioned near it.
    const shellLines = stepsOf(DETECT_JOB)
      .map((step) => step["run"])
      .filter((run): run is string => typeof run === "string")
      .flatMap((run) => run.split(/\r?\n/))
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    const diffCommands = shellLines.filter((line) => line.includes("git diff"));
    expect(diffCommands.length, "the detect job must compute a diff").toBeGreaterThan(0);
    expect
      .soft(
        diffCommands.filter((line) => !line.includes("--no-renames")),
        "every git diff the detect job runs must pass --no-renames on the command itself",
      )
      .toEqual([]);
  });
});

describe("TC-0017-0009 (TDD-0009): a shallow clone and an unreachable base ref both fail open", () => {
  it("selects the full set and names the reason when the diff produced nothing", () => {
    // Two shapes of one failure. A shallow clone makes git refuse; an unreachable base
    // ref makes it fail differently. Both arrive as "no path list was produced", which
    // is why an EMPTY list must never read as "nothing changed".
    for (const [label, input] of [
      ["no path file at all", { paths: null, diffError: "fatal: bad object deadbeef" }],
      ["an empty path file", { paths: [], diffError: "fatal: unable to read tree" }],
    ] as const) {
      const result = runClassifier(input);
      expect
        .soft(result.status, `${label}: the classifier must still exit 0:\n${result.raw}`)
        .toBe(0);
      expect.soft(result.full, `${label}: a failed diff must select the full lane set`).toBe(true);
      expect
        .soft(result.annotations.length, `${label}: a failed diff must emit a warning annotation`)
        .toBeGreaterThan(0);
      expect
        .soft(result.annotations.join("\n"), `${label}: the annotation must name git's reason`)
        .toContain("fatal:");
    }
  });
});

describe("TC-0017-0010 (TDD-0010): assistant-tree Markdown is not documentation-only", () => {
  it("selects everything for the assistant tree and narrows for the agent mirrors", () => {
    // The assistant tree is excluded from the documentation-only set by name
    // (`BR-0017-0010`) because what lives there changes validate output — the same
    // reason the catalog is loaded rather than merely shipped.
    const assistant = runClassifier({ paths: [".qfai/assistant/catalog/test-layers.md"] });
    expect
      .soft(
        assistant.full,
        "assistant-tree Markdown alters validate output and must select everything",
      )
      .toBe(true);

    // And it must be excluded for THAT reason, not by happening to fall through.
    //
    // The oracle caught this: removing the assistant tree from the classifier's
    // never-documentation list reddened nothing, because `.qfai/` is not in the
    // documentation set either, so the path still selected everything as a plain source
    // path. The list was inert — the same decoration defect as a project matching zero
    // files and a knob the runner ignores, and this time it was in my own code.
    //
    // `BR-0017-0010` requires the exclusion to be explicit ("MUST exclude the assistant
    // catalog tree BECAUSE changes there alter validate output"), so the reason is what
    // makes the rule enforced rather than incidental. Asserting it also keeps the
    // exclusion working if `.qfai/` is ever admitted to the documentation set.
    expect
      .soft(
        assistant.reason,
        "the assistant tree must be excluded as validate-affecting, not as an incidental source path",
      )
      .toMatch(/validate output/i);

    // And the mirrors are documentation-only, which is what `BR-0017-0010` and `AC-0017-0005`
    // say and what the user approved when they took `CR-20260820-0004` **option A**: the mirror
    // guards move into the lint lane, which selection never skips, so the mirrors keep their
    // saving without losing their guard.
    //
    // A round of this work implemented option B instead — the four members were removed — on the
    // measurement that `lint:mirror-surface` did not cover the tests that read the mirrors. The
    // measurement was right and the conclusion was not: the CR had already been decided, by the
    // user, the other way. So the fix was to FINISH option A, and the lane now runs every test
    // whose subject is a root mirror tree — the three that were missing are `codex/agents`,
    // `core/prFixMonitor` and `core/prMergePlan`.
    const mirrors = runClassifier({
      paths: [".claude/rules/temporary-files.md", ".codex/skills/whatever.md"],
    });
    expect
      .soft(
        mirrors.full,
        "an agent-integration mirror is documentation-only — its guards run in the lint lane, " +
          "which selection never skips",
      )
      .toBe(false);

    // The saving is only real if the guard travels with it, so the row that matters is this one:
    // every test whose subject is a root mirror tree must be IN the lane the classification
    // skips past. Read from the manifest rather than restated, because a lane that lost a member
    // would otherwise leave this row green while the mirror it guarded went unwatched.
    const manifest = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "packages", "qfai", "package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };
    const lane = manifest.scripts?.["lint:mirror-surface"] ?? "";
    for (const guard of [
      "tests/integration/agentsRulesSurface.test.ts",
      "tests/integration/skillLinkSurface.test.ts",
      "tests/core/integrationSurface.test.ts",
      "tests/core/integrationSurfaceReadErrors.test.ts",
      "tests/assets/reviewerVerdictVocabulary.test.ts",
      "tests/codex/agents.test.ts",
      "tests/core/prFixMonitor.test.ts",
      "tests/core/prMergePlan.test.ts",
    ]) {
      expect
        .soft(
          lane,
          `${guard} reads a root mirror tree, so it must run in the lane a mirror-only change ` +
            "does not skip",
        )
        .toContain(guard);
    }

    // The assistant catalog tree is still NOT a mirror, and still selects everything. Keeping
    // this beside the row above is the point: re-admitting the mirrors must not re-admit it.
    const catalog = runClassifier({
      paths: [".qfai/assistant/catalog/test-layers.md"],
    });
    expect
      .soft(
        catalog.full,
        "the assistant catalog tree alters validate output and is not documentation",
      )
      .toBe(true);

    // `packages/qfai/docs/` is what is left, and it stays: its only appearance in the test tree
    // is a FIXTURE in this classifier's own rows — a path that does not exist — rather than a
    // file any test reads. That distinction is what decides membership.
    const docs = runClassifier({ paths: ["packages/qfai/docs/anything.md"] });
    expect.soft(docs.full, "the docs directory still selects nothing").toBe(false);

    // The executable half still holds, and it is doing real work again now that the directory
    // is documentation-only: a PowerShell script is not a mirror, so a change to one selects
    // everything. `CR-20260820-0004` calls this the half that needed no decision.
    const script = runClassifier({ paths: [".agents/skills/pr-fix/scripts/run-pr-fix.ps1"] });
    expect
      .soft(script.full, "an executable under an instruction mirror must select everything")
      .toBe(true);

    // And an ordinary source path must NOT be excluded as an executable, which is the half that
    // had no test at all. The check used to run before the documentation test, so it also fired
    // for `src/**.ts` — right verdict, false explanation. Round 6 finding F-7 measured that
    // reverting the fix reddened nothing: `/executable/i` matches the OLD reason string too, and
    // nothing asserted `source path`. Both halves are pinned now, so the ordering is load-bearing
    // in both directions.
    const src = runClassifier({ paths: ["packages/qfai/src/core/layerPolicy.ts"] });
    expect.soft(src.full, "a source path must select everything").toBe(true);
    expect
      .soft(src.reason, "and be reported as a source path, not as an executable")
      .toMatch(/source path/);
    expect
      .soft(src.reason, "an ordinary source file is not 'inside a documentation directory'")
      .not.toMatch(/executable/i);
  });
});

describe("TC-0017-0011 (TDD-0011): a path in no recognized directory selects everything", () => {
  it("selects the full set and says the path was unrecognized, not that it was source", () => {
    const result = runClassifier({ paths: ["some/directory/nobody/declared.txt"] });
    expect.soft(result.full, "an unclassified path must never read as nothing to run").toBe(true);

    // The REASON is the row, not a nicety. `TC-0017-0010` also selects everything, so
    // `full` alone cannot tell an unrecognized path from a recognized source one — only
    // the reason distinguishes the closed list working from it matching by accident.
    expect
      .soft(
        result.reason,
        "the reason must identify the path as outside every recognized directory",
      )
      .toMatch(/unrecognized|not in any recognized/i);
  });
});

describe("TC-0017-0012 (TDD-0012): the lint lane carries no selection condition", () => {
  it("leaves the lint lane and the required-context job unconditional", () => {
    const jobs = ciJobs();
    const lint = jobs[LINT_JOB];
    expect(lint, "ci.yml must declare a `lint` job").not.toBeUndefined();
    if (lint === undefined) return;

    // `BR-0017-0011`: the lint lane carries the formatter, the Markdown linter, the
    // leakage guard and the pin guard — all of which a documentation-only change can
    // break. Skipping it would make those gates vacuous for exactly the changes most
    // likely to trip them.
    expect.soft(lint["if"], "the lint lane must carry no selection condition").toBeUndefined();
    expect
      .soft(needsOf(lint), "the lint lane must not depend on detection")
      .not.toContain(DETECT_JOB);

    // And the required-context job. `BR-0017-0012` is about what branch protection
    // sees: a skipped job reports success, so a condition on the job carrying a
    // required context — or on anything it depends on — turns the gate into a rubber
    // stamp. Asserted as an EMPTY needs set rather than "no conditional need",
    // because the transitive closure is what the rule is about and an empty closure
    // is the only shape that needs no traversal to verify.
    const required = jobs[REQUIRED_CONTEXT_JOB];
    expect
      .soft(required?.["if"], "the required-context job must carry no condition")
      .toBeUndefined();
    expect
      .soft(
        needsOf(required ?? {}),
        "the required-context job must depend on nothing that can be skipped",
      )
      .toEqual([]);
  });
});

// ── change 9: layer separation stays inside the file, and no check name moves ─
//
// The layer split ALREADY exists: seven matrix legs of the `test` job, one per runner
// project. `BR-0017-0035` is what keeps it that way — "test-layer separation MUST be
// expressed as jobs and matrix legs inside the existing own-CI workflow file", with the
// file count and the aggregate check name unchanged.
//
// What change 9 does NOT do is repartition those legs by cost. `10_Plan.md` puts that
// last "because the partition is the only part of this spec that needs a measurement it
// does not itself take", and step 6 landed structure only: no timing artifact exists, and
// `BR-0017-0049` forbids adopting a value without one. So these three rows are the
// invariant that repartition will have to satisfy, landed BEFORE it rather than after —
// which is the only order in which a guard can reject the change it guards against.
//
// ## Why literals rather than a before-and-after comparison
//
// `EX-0017-0013` describes "the set of check names a run reports, derived before lane
// selection lands and after it lands". A test cannot derive the earlier set without
// reading history, and a history-dependent assertion inside the main suite breaks under a
// shallow clone — this repository already keeps its one history-dependent check out of the
// aggregate gate for that reason.
//
// Pinning the set as literals gets the same guarantee and a better failure. A check name
// is a repository-settings surface no agent can configure, so what matters is that the set
// does not move; a literal list makes any creation, removal or rename a failing test that
// names which one, instead of a diff someone has to interpret.

/**
 * The own-CI workflow files.
 *
 * `BR-0017-0035` is what this list serves, and its subject is TEST-LAYER SEPARATION: layer
 * separation must be jobs and matrix legs inside the existing file, and a new workflow file PER
 * LAYER must be rejected. It is not a freeze on the repository ever gaining a workflow — the row
 * below says so in as many words, that it asserts the count layer separation must not change
 * rather than a count frozen when the spec was written.
 *
 * The two release-automation files are outside that subject, and outside the concern behind it.
 * What `AC-0017-0018` protects against is a new workflow creating a CHECK NAME nobody has
 * configured — a repository-settings surface no agent can reach. Neither of these runs on
 * `pull_request`: `prepare-release.yml` is `workflow_dispatch` only, and `tag-release.yml` fires
 * on a push to `main`. They report no check on any pull request, so the configured set is
 * unchanged.
 *
 * The list stays a literal for the reason it always was: a creation, removal or rename should be
 * a failing test naming which file, not a diff somebody has to interpret. It named these two.
 */
const OWN_WORKFLOW_FILES = [
  "ci.yml",
  "prepare-release.yml",
  "release.yml",
  "tag-release.yml",
] as const;

/**
 * Every check name the own-CI workflow reports, as literals.
 *
 * Derived once by hand from the job keys and the matrix expansion, and then frozen. No job
 * in this file declares a `name:` override, so each check name is its job key — which is
 * exactly what makes `EX-0017-0004`'s falsifying observation work: "a rename shows as a
 * diff on the job key".
 *
 * A matrix job reports one check per leg, named `<job> (<value>)`. That is why the seven
 * legs appear here individually: they are seven check names, and removing a leg removes
 * one — the thing `BR-0017-0006` forbids and `TC-0017-0007` also guards from the matrix
 * side.
 *
 * `node-floor` was added deliberately, which is what this pin is for: it made the addition a
 * failing test naming the new member rather than a diff to interpret. Review finding [13] —
 * every toolchain job resolves `engines.node` (`>=20.19.0`, no ceiling), so `setup-node`
 * gives all of them the newest satisfying release and nothing runs on the floor the package
 * promises; an API present in Node 24 and absent in 20.19 passes every gate and breaks
 * exactly the supported users.
 *
 * Creating a check name is normally a repository-settings problem. It is not one here: only
 * `ci-pass` is required, the verdict is derived from its `needs` map, and `node-floor` is in
 * that map — so the new lane is gated by the context that already exists, and no setting has
 * to change for it to block a merge.
 */
const CI_CHECK_NAMES = [
  "build",
  "check-types",
  "check-types-future",
  "ci-pass",
  "detect",
  "lint",
  "node-floor",
  "scanner-coverage",
  "test (cli)",
  "test (core)",
  "test (e2e)",
  "test (integration)",
  "test (scripts)",
  "test (unit)",
  "test (validators)",
] as const;

/**
 * The check names one workflow file reports.
 *
 * A job's check name is its `name:` when it declares one and its key otherwise; a matrix
 * job reports one per leg. Both are modelled, so a future `name:` override is visible to
 * `TC-0017-0043` rather than silently renaming a check.
 */
function checkNames(file: string): string[] {
  const doc: unknown = parseYaml(readFileSync(path.join(WORKFLOWS_DIR, file), "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"])) {
    throw new Error(`${file} declares no jobs`);
  }
  const names: string[] = [];
  for (const [id, job] of Object.entries(doc["jobs"])) {
    if (!isRecord(job)) continue;
    const label = typeof job["name"] === "string" ? job["name"] : id;
    const strategy = job["strategy"];
    const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
    const legs = isRecord(matrix) ? Object.values(matrix).filter(isStringArray).flat() : [];
    if (legs.length > 0) {
      for (const leg of legs) names.push(`${label} (${leg})`);
    } else {
      names.push(label);
    }
  }
  return names.sort();
}

describe("TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name", () => {
  it("keeps the layer split inside the existing file as matrix legs of one job", () => {
    // CLAIM 1 — two files, and neither is a per-layer workflow. A new workflow file would
    // create a check name nobody has configured, which is why `AC-0017-0018` rejects it in
    // review rather than treating it as a style choice.
    //
    // Two and not three: change 7 deleted the repository's own duplicate of the shipped
    // validate workflow. That deletion is `BR-0017-0058`'s, recorded in `DR-0017-0007`, and
    // this row asserts the count layer separation must not change — not a count frozen at
    // the moment the spec was written.
    expect
      .soft(ownWorkflowFiles(), "layer separation may not add a workflow file")
      .toEqual([...OWN_WORKFLOW_FILES]);

    // CLAIM 2 — the layers are legs of ONE job, not one job each. Seven jobs would satisfy
    // "inside the existing file" and still create six new check names, so the shape is
    // asserted and not just the location.
    const jobs = ciJobs();
    const matrixJobs = Object.entries(jobs)
      .filter(([, job]) => {
        const strategy = job["strategy"];
        return isRecord(strategy) && isRecord(strategy["matrix"]);
      })
      .map(([id]) => id);
    expect
      .soft(matrixJobs, "the layer split is expressed as the matrix of a single job")
      .toEqual(["test"]);
  });
});

/**
 * The lanes whose findings the Reviewer Gate is required to ingest, and how each one appears in
 * a `run:` body.
 *
 * BOTH, because the gate's deferred-registration exemption names two codes and is required to
 * ingest both. Review finding [38]: these rows were written for the hygiene lane alone, so when
 * the shape gate grew a producer of its own the rows kept passing while that producer wrote its
 * artifact only into the `lint` job's checkout — and the self-validates below run here, on a
 * fresh one. Half the exemption reached no reviewer, and nothing said so.
 */
const REVIEWER_GATE_PRODUCERS: readonly { what: string; needles: readonly string[] }[] = [
  {
    what: "the workflow hygiene lane",
    needles: ["check-workflow-hygiene.mjs", "--report-dir"],
  },
  {
    what: "the shipped-shape gate",
    needles: ["lint:workflow-shape", ".qfai/review/shipped-workflow-shape"],
  },
];

describe("both producers' findings reach the job that runs the Reviewer Gate", () => {
  const buildSteps = (): Record<string, unknown>[] => {
    const jobs = ciJobs();
    return Array.isArray(jobs["build"]?.["steps"]) ? jobs["build"]["steps"].filter(isRecord) : [];
  };

  /** The index of the step whose `run` carries every needle, or `-1`. */
  const stepIndex = (needles: readonly string[]): number =>
    buildSteps().findIndex((step) => {
      const run = step["run"];
      return typeof run === "string" && needles.every((needle) => run.includes(needle));
    });

  for (const producer of REVIEWER_GATE_PRODUCERS) {
    it(`writes ${producer.what}'s artifact in the same job as the dogfooding validate, and before it`, () => {
      // Review finding [26], then [38]. A lane writes `{ findings: [...] }` under
      // `.qfai/review/**` and the gate ingests it — but the lanes run in `lint`, on that job's
      // checkout, and the dogfooding validate runs in `build` on a fresh one. With nothing
      // transferring the file, a violation reddened `lint` and reached no reviewer, which is the
      // whole promise the shipped-workflows contract makes for those codes.
      //
      // Asserted as ONE JOB and an ORDER, because either alone is the defect: an artifact written
      // after the gate has read the directory is an artifact the gate did not see, and one
      // written in another job is one this job's `.qfai/review/**` never contains.
      const steps = buildSteps();
      expect(steps.length, "the build job must declare steps").toBeGreaterThan(0);

      const writesArtifact = stepIndex(producer.needles);
      expect(
        writesArtifact,
        `the build job must produce ${producer.what}'s findings where its own Reviewer Gate looks`,
      ).toBeGreaterThan(-1);

      const readsThem = steps.findIndex((step) => {
        const run = step["run"];
        return typeof run === "string" && run.includes("validate") && run.includes("--root .");
      });
      expect(
        readsThem,
        "the dogfooding validate — the step that ingests them — must be in this job too",
      ).toBeGreaterThan(-1);

      expect(
        writesArtifact < readsThem,
        "the findings must be written BEFORE the gate reads the directory; after it, the gate " +
          "ingested nothing and the run is green over a violation",
      ).toBe(true);
    });

    it(`survives ${producer.what} exiting non-zero, and fails when no artifact appears`, () => {
      // The step's whole design is that a VIOLATION still reaches the gate — so the lane's
      // non-zero exit must not abort the step before the validate steps below it. GitHub runs
      // `shell: bash` as `bash --noprofile --norc -eo pipefail {0}`, so `-e` comes from the
      // INVOCATION and a `set -uo pipefail` inside the body does not remove it. Measured: the
      // first version of the hygiene step aborted on the lane's non-zero exit and never reached
      // the line that captured it — the exact abort its own comment said must not happen.
      //
      // And the other direction, which is not symmetric: a MISSING artifact is fatal. The lane
      // failing means a violation the gate should see; no artifact at all means the bridge did
      // not run, and a silent bridge is what these steps exist to remove.
      const index = stepIndex(producer.needles);
      expect(index, `the build job must carry ${producer.what}'s artifact step`).toBeGreaterThan(
        -1,
      );
      const body = String(buildSteps()[index]?.["run"] ?? "");

      // The lane's own invocation, and it has to be the one inside the `||` list — a body that
      // suspends `-e` for some OTHER command would satisfy a bare `includes` check.
      const laneCall = producer.needles[0] ?? "";
      const suspended = body
        .split(/\r?\n/)
        .some((line) => line.includes(laneCall) && line.includes("||"));
      expect(
        suspended,
        "the lane call must sit in an `||` list (or otherwise suspend `-e`), or a violation " +
          "aborts the step before the Reviewer Gate below ever runs",
      ).toBe(true);

      expect(
        body,
        "and a missing artifact must be reported as an error rather than passed over",
      ).toContain("::error::");
    });
  }
});
describe("one lane runs on the floor `engines.node` declares", () => {
  it("asks the shared definition for the floor, and checks it got it", () => {
    // Review finding [13]. Every other toolchain job resolves the range, so `setup-node` gives
    // them all the newest satisfying release and nothing ever runs on the floor the package
    // promises — an API present in Node 24 and absent in the floor passes every gate, release
    // gate included, and breaks exactly the supported users.
    //
    // A plant that flipped this input to `"false"` left every other row in this file green, which
    // is how this row came to exist: the lane's NAME was pinned, its check name was pinned, and
    // nothing asserted the one thing it is for.
    const jobs = ciJobs();
    const floor = jobs["node-floor"];
    expect(floor, "the floor lane must exist").toBeDefined();

    const steps = Array.isArray(floor?.["steps"]) ? floor["steps"].filter(isRecord) : [];
    const setup = steps.find((step) => step["uses"] === "./.github/actions/setup");
    expect(
      setup,
      "and consume the shared definition, like every other toolchain job",
    ).toBeDefined();

    const withBlock = isRecord(setup?.["with"]) ? setup["with"] : {};
    expect(
      withBlock["pin-engines-floor"],
      "the floor lane must ASK for the floor; without this input it is an ordinary lane wearing " +
        "the name of a floor lane",
    ).toBe("true");
  });

  it("builds before it tests, or the lane is red for a reason that is not the floor", () => {
    // `dist/` is not committed and two slices read it — `cliStartupCost.test.ts` fails with "no
    // shipped bundle was readable" and `spec0010DiscussionMockAndPointerE2E.test.ts` spawns
    // `dist/cli/index.cjs`. Without a build the floor lane is structurally ALWAYS RED, and an
    // always-red required lane conveys no differential signal: a genuine Node 20 break and a
    // missing bundle look identical, so the lane gets un-required or "fixed" by dropping the pin.
    //
    // The ORDER is asserted, not just the presence: a build after the test step is a build that
    // ran too late.
    const jobs = ciJobs();
    const steps = Array.isArray(jobs["node-floor"]?.["steps"])
      ? jobs["node-floor"]["steps"].filter(isRecord)
      : [];
    const builds = steps.findIndex(
      (step) => typeof step["run"] === "string" && /\bbuild\b/.test(step["run"]),
    );
    const tests = steps.findIndex(
      (step) => typeof step["run"] === "string" && /\btest\b/.test(step["run"]),
    );
    expect(builds, "the floor lane must build the package").toBeGreaterThan(-1);
    expect(tests, "and run the suite").toBeGreaterThan(-1);
    expect(
      builds < tests,
      "the build must come first, or the slices that read `dist/` fail for a reason that has " +
        "nothing to do with the Node version this lane exists to exercise",
    ).toBe(true);
  });

  it("derives the expected version from engines.node rather than restating it", () => {
    // The verification step inside the lane is what makes the pin observable at runtime, and it
    // must not carry a literal either: two answers to one question, and the stale one wins.
    const jobs = ciJobs();
    const steps = Array.isArray(jobs["node-floor"]?.["steps"])
      ? jobs["node-floor"]["steps"].filter(isRecord)
      : [];
    const bodies = steps
      .map((step) => (typeof step["run"] === "string" ? step["run"] : ""))
      .join("\n");

    expect(
      bodies,
      "the lane must read the floor from `engines.node`, the same place the action derives it from",
    ).toContain("engines.node");

    // And no bare version anywhere the SHELL would use one.
    //
    // Comment lines are stripped first. The rule is about values, and a comment explaining which
    // literal must not be written is legitimate documentation — this very lane carries one, and
    // scanning it made the row fail on its own explanation. Leading-`#` lines only, which is the
    // same granularity `lint-shipping.ts` applies for the same reason.
    const executable = bodies
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .join("\n");
    expect(
      // `\.` and not `\\.`. The first version wrote the escaped form, which in a regex literal
      // matches a literal BACKSLASH followed by any character — so it returned false for
      // `v20.19.0` and the row was vacuous: writing the literal straight back into the lane kept
      // it green, which is the exact drift the derivation exists to prevent. Verified by eval'ing
      // the literal off disk rather than by re-reading it.
      /\bv?[0-9]+\.[0-9]+\.[0-9]+\b/.test(executable),
      "a version literal in the floor lane is the second answer this derivation removes",
    ).toBe(false);
  });
});

describe("TC-0017-0042 (TDD-0042): the aggregate verdict check name is immutable", () => {
  it("keeps the verdict's key and declares no name that could rename it", () => {
    const jobs = ciJobs();

    // CLAIM 1 — the key is unchanged. `BR-0017-0004` forbids renaming it across every
    // change in this spec, and eight changes have now touched this file.
    expect
      .soft(Object.keys(jobs), `the verdict job key must stay \`${VERDICT_JOB}\``)
      .toContain(VERDICT_JOB);

    // CLAIM 2 — and it declares no `name:`. A `name:` override would change the check name
    // while leaving the key intact, which defeats `EX-0017-0004`'s falsifying observation
    // ("a rename shows as a diff on the job key") — the rename would show as a diff on a
    // line nobody is watching.
    expect
      .soft(
        jobs[VERDICT_JOB]?.["name"],
        "the verdict must take its check name from its key, so a rename is a diff on the key",
      )
      .toBeUndefined();

    // CLAIM 3 — and no other job claims that name. A sibling declaring
    // `name: ci-pass` would produce two checks with one name, which branch protection
    // resolves in a way no repository setting records.
    const impostors = Object.entries(jobs)
      .filter(([id, job]) => id !== VERDICT_JOB && job["name"] === VERDICT_JOB)
      .map(([id]) => id);
    expect.soft(impostors, `no other job may report as \`${VERDICT_JOB}\``).toEqual([]);
  });
});

describe("TC-0017-0043 (TDD-0043): selection creates, removes and renames no check name", () => {
  it("reports exactly the pinned check-name set", () => {
    // The whole set, as one equality. Selection landed in change 8 and added conditions to
    // four jobs; a condition changes whether a check REPORTS success or skipped, never
    // whether it exists. This is the assertion that says so.
    expect
      .soft(
        checkNames("ci.yml"),
        "no check name may be created, removed or renamed — each one is a repository setting no agent can configure",
      )
      .toEqual([...CI_CHECK_NAMES].sort());
  });
});

// ── the required-context job's integrity, and upload hygiene ─────────────────
//
// `BR-0017-0032` is unusually explicit about what it is not satisfied by: "Any split, fold
// or restructuring MUST leave a job of the exact name `build` that is unconditional and
// that still performs — or depends on jobs that perform — every item of its enumerated
// verification set. **Keeping the name alone is explicitly not sufficient.**"
//
// That sentence exists because the cheap way to satisfy a required status context is to
// keep a job with the right name and move its work elsewhere. The check stays green, the
// setting stays valid, and nothing is verified. So `TDD-0036` asserts all three properties
// together, and the "or depends on" clause is modelled rather than ignored: an item may
// migrate to a job `build` needs, and that is legal.

/**
 * The exact name `BR-0017-0032` requires. A literal — the rule is about this string.
 *
 * Moved from `build` by review finding [28] on PR #794: `build` declares no `needs` at all, so
 * requiring it and nothing else let every test lane fail with the merge condition satisfied.
 */
const REQUIRED_CONTEXT_NAME = "ci-pass";

/**
 * The job that produces the build artifact.
 *
 * Separate from `REQUIRED_CONTEXT_NAME` since the context moved. Two rows below assert that exactly
 * one artifact upload is declared, and they were reading the required-context constant — which was
 * `build` by coincidence, not because the upload has anything to do with branch protection.
 */
const BUILD_JOB_NAME = "build";

/**
 * The items of the required-context job's enumerated verification set.
 *
 * The same literals `TC-0017-0073` pins, restated here on purpose rather than imported
 * from that row: `BR-0017-0060` and `BR-0017-0032` are different obligations over the same
 * list, and a shared constant would let one row's edit silently satisfy the other.
 */
const VERIFICATION_SET = [
  // The change classifier, in `detect`. It decides whether the gated lanes run at all, and an
  // audit found it pinned by nothing — the wiring was declared and the program behind it was
  // not.
  "Classify the change against the enumerated directory lists",
  // First, and in `lint` rather than in the declared job: the pre-flight refusal of the local
  // composite actions has to run before any job invokes one. Review finding [82] — a step at
  // the top of `./.github/actions/setup` writing `BASH_ENV` makes every later `shell: bash`
  // step exit 0 without running its body, the hygiene lane included, so the lane cannot be the
  // thing that catches it.
  "Verify the toolchain action before running it",
  "Derive the verdict from the serialized needs map",
  "Run build & pack verification",
  "Sanity grep — no internal spec IDs or version markers leak (post-build)",
  "QFAI self-validate this repo (dogfooding — TDD gates)",
  "QFAI self-validate this repo (dogfooding — SDD gates)",
  "QFAI self-validate this repo (dogfooding — full profile)",
  "Run qfai validate gate (fail on error)",
  // Last, and in `lint`: `pnpm ci:lint` is that job's own work. Review finding [89] measured
  // what a declared dependency pins on its own — the name and the condition, and nothing about
  // whether the step still does anything.
  "Run lint gate",
] as const;

/**
 * Membership without a type assertion.
 *
 * `LIST.includes(value)` on an `as const` tuple rejects a plain `string`, and the usual workaround
 * is `value as (typeof LIST)[number]` — a bare assertion, which `CLAUDE.md` forbids. Widening the
 * parameter to `readonly string[]` accepts every tuple in this file and needs no assertion at all.
 */
function listHas(list: readonly string[], value: string): boolean {
  return list.includes(value);
}

/** Every step of one job, narrowed. */
function stepsOf(jobId: string): Record<string, unknown>[] {
  const job = ciJobs()[jobId];
  if (job === undefined) {
    throw new Error(`ci.yml declares no \`${jobId}\` job`);
  }
  const steps = job["steps"];
  return Array.isArray(steps) ? steps.filter(isRecord) : [];
}

/**
 * The steps of the required-context job and of every job it transitively needs.
 *
 * This is what makes `BR-0017-0032`'s "or depends on jobs that perform" clause real rather
 * than decorative: an item that moved into a dependency still counts, and one that moved
 * into an unrelated job does not.
 */
function reachableSteps(jobId: string): { jobId: string; step: Record<string, unknown> }[] {
  const jobs = ciJobs();
  const seen = new Set<string>();
  const out: { jobId: string; step: Record<string, unknown> }[] = [];
  const walk = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const job = jobs[id];
    if (job === undefined) return;
    for (const step of stepsOf(id)) out.push({ jobId: id, step });
    for (const need of needsOf(job)) walk(need);
  };
  walk(jobId);
  return out;
}

const named = (step: Record<string, unknown>): string =>
  typeof step["name"] === "string" ? step["name"] : "(unnamed)";

describe("TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality", () => {
  it("keeps the exact name, no condition, and every verification item within reach", () => {
    const jobs = ciJobs();

    // CLAIM 1 — the exact name. `BR-0017-0032` says "a job of the exact name", so this is a
    // string equality against the key set and not a search for something build-like.
    expect
      .soft(Object.keys(jobs), `a job of the exact name \`${REQUIRED_CONTEXT_NAME}\` must exist`)
      .toContain(REQUIRED_CONTEXT_NAME);

    // CLAIM 2 — unskippable. A skipped job reports success to branch protection, so a condition
    // here would convert the gate into a rubber stamp — with ONE exception, which is why this is
    // no longer `toBeUndefined()`: `always()` is the condition that guarantees the job runs. It is
    // also the condition the aggregate verdict must carry, because its whole purpose is to render a
    // result when its dependencies were skipped. Any other value fails, including an absent one
    // being replaced by something conditional later.
    const condition = jobs[REQUIRED_CONTEXT_NAME]?.["if"];
    expect
      .soft(
        condition === undefined ? "(none)" : String(condition),
        "the required-context job must be unskippable: no condition, or `always()`",
      )
      .toMatch(/^(\(none\)|always\(\))$/);

    // CLAIM 3 — and every item is still reachable. This is the half the rule says the name
    // alone does not give: the cheap way to satisfy a required context is to keep the name
    // and move the work, leaving a green check over nothing.
    const reachable = new Set(reachableSteps(REQUIRED_CONTEXT_NAME).map((s) => named(s.step)));
    const missing = VERIFICATION_SET.filter((item) => !reachable.has(item));
    expect
      .soft(
        missing,
        "every verification item must be performed by the required-context job or by a job it needs",
      )
      .toEqual([]);

    // CLAIM 3b — and reachable has to mean UNCONDITIONALLY reachable, which is the half of
    // this row's own title the set membership above does not give. A step behind a
    // condition is present in the diff and absent from the run: on every run where the
    // condition is false the job still reports success to branch protection with that
    // verification not performed. The job-level version of this is CLAIM 2; there is no
    // reason the step level should be weaker, and the cheaper edit is at the step level.
    //
    // Placed here rather than beside `TC-0017-0038`'s `continue-on-error` claim because the
    // failure modes differ: `continue-on-error` runs and cannot fail, an `if` may not run
    // at all. Same rule as the hygiene lane's property 3 now enforces from CI, asserted
    // here against this repository's own workflow.
    const guarded = reachableSteps(REQUIRED_CONTEXT_NAME)
      .filter(({ step }) => listHas(VERIFICATION_SET, named(step)))
      .filter(({ step }) => step["if"] !== undefined)
      .map(({ jobId, step }) => `${jobId}: ${named(step)} if=${String(step["if"])}`);
    expect
      .soft(
        guarded,
        "a verification item behind a condition is not performed on the runs where that condition is false",
      )
      .toEqual([]);

    // CLAIM 4 — and the checked-in declaration agrees with these literals.
    //
    // The hygiene lane reads `.github/required-status-contexts.json` and checks the same
    // three properties from CI. That puts this list in two places, which is the defect this
    // spec has caught three times — so the two are pinned to each other here.
    //
    // The redundancy is deliberate and only safe because of this claim. One copy is
    // production data a lane reads; the other is this suite's expectation of it. Editing
    // either alone now fails, which turns two unsynchronised copies into a change that has
    // to be made consistently in three places: the workflow, the declaration and this row.
    const declared: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, ".github", "required-status-contexts.json"), "utf-8"),
    );
    const contexts =
      isRecord(declared) && Array.isArray(declared["contexts"]) ? declared["contexts"] : [];
    const forRequired = contexts
      .filter(isRecord)
      .find((entry) => entry["job"] === REQUIRED_CONTEXT_NAME);
    expect(
      forRequired,
      `the declaration must name the ${REQUIRED_CONTEXT_NAME} job`,
    ).not.toBeUndefined();
    expect
      .soft(
        forRequired === undefined ? undefined : forRequired["verificationSet"],
        "the declaration's verification set and this row's literals must not drift apart",
      )
      .toEqual([...VERIFICATION_SET]);
  });
});

describe("TC-0017-0038 (TDD-0038): no verification-set item is weakened by continue-on-error", () => {
  it("leaves no verification item able to fail without failing the job", () => {
    const weakened = reachableSteps(REQUIRED_CONTEXT_NAME)
      .filter(({ step }) => listHas(VERIFICATION_SET, named(step)))
      .filter(({ step }) => step["continue-on-error"] !== undefined)
      .map(({ jobId, step }) => `${jobId}: ${named(step)} = ${String(step["continue-on-error"])}`);

    // `!== undefined` and not `=== true`, deliberately. `continue-on-error` accepts an
    // expression, so `${{ github.event_name == 'push' }}` is neither `true` nor `false` at
    // parse time and would slip past an equality check while doing exactly what
    // `BR-0017-0033` forbids on the runs where it evaluates true. A verification item has no
    // legitimate reason to carry the key at all.
    expect
      .soft(
        weakened,
        "a verification item carrying continue-on-error keeps performing while losing the ability to fail the job",
      )
      .toEqual([]);
  });
});

describe("TC-0017-0039 (TDD-0039): the report upload skips on cancellation and ages out sooner", () => {
  it("declines to run on a cancelled run, tolerates a missing file, and expires within a week", () => {
    const uploads = stepsOf(BUILD_JOB_NAME).filter(
      (step) => typeof step["uses"] === "string" && step["uses"].includes("upload-artifact"),
    );
    expect(uploads.length, "the build job must declare exactly one artifact upload").toBe(1);
    const [upload] = uploads;
    if (upload === undefined) return;
    const withBlock = isRecord(upload["with"]) ? upload["with"] : {};

    // CLAIM 1 — not `always()`. `always()` runs on a CANCELLED run too, which spends runner
    // minutes uploading a report of a run nobody waited for. `!cancelled()` keeps the
    // upload on failure — where it is most useful — and drops it on cancellation.
    expect
      .soft(
        String(upload["if"] ?? "(none)"),
        "the upload must not run on a cancelled run; always() does",
      )
      .not.toMatch(/^\s*(?:\$\{\{\s*)?always\(\)/);
    expect
      .soft(String(upload["if"] ?? "(none)"), "the upload must still run when the job failed")
      .toMatch(/cancelled\(\)/);

    // CLAIM 2 — a missing report is tolerated. The report step ends in `|| true`, so the
    // files may legitimately be absent; without this the upload fails the job for a reason
    // that is not a verification failure.
    expect
      .soft(
        String(withBlock["if-no-files-found"] ?? "(unset)"),
        "a missing report must not fail the job — the step that produces it may legitimately not",
      )
      .toMatch(/^(?:warn|ignore)$/);
  });
});

describe("TC-0017-0040 (TDD-0040): retention 7 passes, retention 8 and an unconditional run fail", () => {
  it("holds the retention boundary at seven days", () => {
    const uploads = stepsOf(BUILD_JOB_NAME).filter(
      (step) => typeof step["uses"] === "string" && step["uses"].includes("upload-artifact"),
    );
    const [upload] = uploads;
    expect(upload, "the build job must declare an artifact upload").not.toBeUndefined();
    if (upload === undefined) return;
    const withBlock = isRecord(upload["with"]) ? upload["with"] : {};

    // The boundary, asserted as a boundary. `BR-0017-0034` says "at most seven days", so
    // seven passes and eight fails — and an ABSENT value is not a pass either, because the
    // action's own default is ninety.
    const retention = withBlock["retention-days"];
    expect
      .soft(
        typeof retention === "number" ? retention : `not a number: ${String(retention)}`,
        "retention must be declared and at most seven days; the action defaults to ninety",
      )
      .toBeLessThanOrEqual(7);
    expect.soft(retention, "retention must be a positive number of days").toBeGreaterThan(0);
  });
});

describe("the release tag is exactly vX.Y.Z, and the check is run rather than read", () => {
  // The pattern was `v[0-9]*.[0-9]*.[0-9]*`, and a shell `*` matches ANY run of characters — so
  // `v1.10.1-beta.1` passed, and so did `v1x.2y.3junk`. Both were measured against the old
  // pattern before this was changed, and both are in the table below.
  //
  // Why it matters more than a malformed tag usually would: the publish step passes no `--tag`,
  // so npm points `latest` at whatever it publishes. A hand-dispatched prerelease would have
  // gone out to every `npm install qfai`.
  //
  // EXECUTED, not pattern-matched. A row asserting the shape of the `case` statement is a row
  // that agrees with whatever is written there, which is exactly how the old pattern survived.

  /** The validation prefix of the `pin` step: everything before it touches git. */
  const validationPrefix = (): string => {
    const doc = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8"),
    ) as { jobs?: Record<string, { steps?: Array<Record<string, unknown>> }> };
    const steps = doc.jobs?.["verify"]?.steps ?? [];
    const pin = steps.find((step) => step["id"] === "pin");
    const body = pin?.["run"];
    expect(body, "release.yml has no `pin` step with a body").toBeTypeOf("string");
    const text = typeof body === "string" ? body : "";
    // Everything up to the first git call — the part that decides whether the tag is a release.
    const cut = text.indexOf("git fetch");
    expect(
      cut,
      "the pin step never reaches git, so this row has the wrong subject",
    ).toBeGreaterThan(0);
    return text.slice(0, cut);
  };

  it("accepts a release tag and refuses everything else, measured by running it", () => {
    const prefix = validationPrefix();
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-tag-"));
    try {
      const script = path.join(dir, "pin.sh");
      writeFileSync(script, prefix, "utf-8");

      const accepted = (tag: string): boolean => {
        const run = spawnSync("bash", [script], {
          env: { ...process.env, RELEASE_TAG: tag },
          encoding: "utf-8",
        });
        if (run.error !== undefined) throw run.error;
        return run.status === 0;
      };

      for (const [tag, expected, why] of [
        ["v1.10.1", true, "an ordinary release"],
        ["v0.0.0", true, "zeroes are numbers"],
        ["v10.20.30", true, "multi-digit components"],
        ["v1.10.1-beta.1", false, "the reviewer's prerelease: npm would point latest at it"],
        ["v1x.2y.3junk", false, "the reviewer's second value, which the old glob also took"],
        ["v1.2", false, "two components is not a version"],
        ["v1.2.3.4", false, "and neither is four"],
        ["1.2.3", false, "the v is required"],
        ["v1..3", false, "an empty component"],
        ["v1.2.", false, "a trailing dot"],
      ] as Array<[string, boolean, string]>) {
        expect.soft(accepted(tag), `${tag} (${why})`).toBe(expected);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still publishes to the default dist-tag, which is why the tag has to be strict", () => {
    // The two halves are one property. If publish ever passes an explicit `--tag`, a prerelease
    // stops reaching `latest` by accident and the strictness above is a different argument — so
    // the row that pins the strictness names the reason beside it.
    const text = readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8");
    // The INVOCATION, not the file: a comment naming the flag is not the flag. Measured — the
    // first version of this row matched the sentence a few lines above that explains why the
    // flag is absent.
    const invocations = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^(run: )?(npm|pnpm) publish\b/.test(line));
    expect(
      invocations.length,
      "release.yml publishes nothing, so this row has the wrong subject",
    ).toBeGreaterThan(0);
    for (const invocation of invocations) {
      expect(
        invocation,
        "publish passes no --tag, so npm points latest at whatever it publishes — which is what " +
          "makes an unstable tag reaching this workflow a user-facing event",
      ).not.toMatch(/--tag\b/);
    }
  });
});

describe("the publish job confirms its environment before it runs anything the tag controls", () => {
  // `environment: release` makes a tag push PROPOSE a publish rather than perform one — but only
  // when the environment carries required reviewers. Without them GitHub starts the job at once,
  // and the guard that refuses exactly that case used to sit eight steps down: after
  // `actions/checkout` at the tag, and after `pnpm install`, which runs the lifecycle scripts of
  // whatever that tag declares. The job holds `id-token: write`, so that code could mint an OIDC
  // token and publish on its own before the guard ever ran and failed.

  const publishSteps = (): Array<Record<string, unknown>> => {
    const doc = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8"),
    ) as { jobs?: Record<string, { steps?: Array<Record<string, unknown>> }> };
    const steps = doc.jobs?.["publish"]?.steps ?? [];
    expect(steps.length, "release.yml has no publish job with steps").toBeGreaterThan(0);
    return steps;
  };

  it("asks whether the environment is protected in its very first step", () => {
    const steps = publishSteps();
    const first = steps[0] ?? {};
    expect(
      String(first["name"] ?? ""),
      "the protection check must be the first step: an unprotected environment is the case it " +
        "exists to refuse, so nothing the tag controls may run ahead of it",
    ).toBe("Require an approved environment");
    expect(
      String(first["run"] ?? ""),
      "and it must actually read the environment protection rules",
    ).toMatch(/protection_rules/);
  });

  it("fetches and runs nothing from the tag before that answer", () => {
    // Stated as a property of the steps BEFORE the guard rather than as a fixed index, so
    // inserting an unrelated step above it cannot quietly reopen the window.
    const steps = publishSteps();
    const guardAt = steps.findIndex(
      (step) => String(step["name"] ?? "") === "Require an approved environment",
    );
    expect(guardAt, "the publish job has no environment guard at all").toBeGreaterThan(-1);

    const before = steps.slice(0, guardAt);
    const offenders = before.filter((step) => {
      const uses = String(step["uses"] ?? "");
      const run = String(step["run"] ?? "");
      if (uses.startsWith("actions/checkout")) return true;
      return /\b(pnpm|npm|yarn|npx) (install|ci|rebuild|run)\b/.test(run);
    });
    expect(
      offenders.map((step) => String(step["name"] ?? step["uses"] ?? "(unnamed)")),
      "these run before the environment is known to be protected, in a job holding " +
        "id-token: write",
    ).toEqual([]);
  });

  it("installs without running the lifecycle scripts the tag resolves to", () => {
    // Defence in depth, and not the same claim as the ordering. The guard means a human approved
    // this release; it does not mean they reviewed every transitive lifecycle script the tag
    // brings in — and a dependency's manifest is not in this tree at all, it arrives in a
    // tarball.
    const steps = publishSteps();
    const installs = steps.filter((step) =>
      /\b(pnpm|npm|yarn) (install|ci)\b/.test(String(step["run"] ?? "")),
    );
    expect(installs.length, "the publish job installs nothing").toBeGreaterThan(0);
    for (const step of installs) {
      const run = String(step["run"] ?? "");
      expect(
        run,
        `${String(step["name"] ?? "(unnamed)")} installs without --ignore-scripts, so the tag's ` +
          "dependency lifecycle runs in a job holding id-token: write",
      ).toMatch(/--ignore-scripts/);
    }
  });
});

describe("the environment guard tells a denied read apart from an unprotected environment", () => {
  // `Get an environment` requires repository `Administration: read`, and the workflow
  // `permissions:` block has no key that grants it. The read was `2>/dev/null || echo ""`, so a
  // permission failure and a genuinely unprotected environment collapsed to the same empty
  // string — a properly protected repository would have been told its environment was
  // unprotected, and every release would have stopped at a message pointing at the wrong thing.
  //
  // Both outcomes still refuse: a check that cannot read its input must never report a pass.
  // What this row pins is that they are told APART, which is the part an operator acts on.
  //
  // Executed against a stubbed `gh`, because the defect was in what the shell did with an exit
  // status — not something reading the YAML can see.

  it("passes on required reviewers, and refuses the other three with the right diagnosis", () => {
    const doc = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8"),
    ) as { jobs?: Record<string, { steps?: Array<Record<string, unknown>> }> };
    const steps = doc.jobs?.["publish"]?.steps ?? [];
    const guard = steps.find(
      (step) => String(step["name"] ?? "") === "Require an approved environment",
    );
    const body = guard?.["run"];
    expect(body, "the publish job has no environment guard").toBeTypeOf("string");
    const script = typeof body === "string" ? body : "";

    const dir = mkdtempSync(path.join(tmpdir(), "qfai-envguard-"));
    try {
      const binDir = path.join(dir, "bin");
      mkdirSync(binDir, { recursive: true });
      writeFileSync(path.join(dir, "guard.sh"), script, "utf-8");

      const run = (exitCode: number, output: string) => {
        const stub = [
          "#!/usr/bin/env bash",
          `printf %s ${JSON.stringify(output)}`,
          `exit ${exitCode}`,
          "",
        ].join("\n");
        const gh = path.join(binDir, "gh");
        writeFileSync(gh, stub, { encoding: "utf-8", mode: 0o755 });
        const result = spawnSync("bash", ["guard.sh"], {
          cwd: dir,
          env: {
            ...process.env,
            PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
            GITHUB_REPOSITORY: "aganesy/QFAI",
            GH_TOKEN: "stub",
          },
          encoding: "utf-8",
        });
        if (result.error !== undefined) throw result.error;
        return {
          status: result.status ?? -1,
          output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
        };
      };

      const protectedEnv = run(0, "required_reviewers,wait_timer");
      expect
        .soft(protectedEnv.status, `a protected environment must pass:\n${protectedEnv.output}`)
        .toBe(0);

      for (const [rules, why] of [
        ["", "no rules at all"],
        ["wait_timer", "a timer is not a reviewer"],
      ] as Array<[string, string]>) {
        const unprotected = run(0, rules);
        expect.soft(unprotected.status, `${why} must refuse`).toBe(1);
        expect
          .soft(unprotected.output, `${why} must be diagnosed as unprotected`)
          .toMatch(/no required reviewers/);
      }

      // The finding itself: a denied read must NOT read as an unprotected environment.
      const denied = run(1, "gh: Resource not accessible by integration (HTTP 403)");
      expect.soft(denied.status, "a denied read must still refuse").toBe(1);
      expect
        .soft(
          denied.output,
          "and must say the job could not find out, rather than that the environment is " +
            "unprotected — the operator is otherwise sent to fix something that is not broken",
        )
        .toMatch(/could not find out/);
      expect
        .soft(denied.output, "naming the permission that is actually missing")
        .toMatch(/Administration: read/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the release job installs no floating version of anything", () => {
  // Every global install in this job runs in the one place holding `id-token: write` and
  // performing an irreversible upload. `npm@latest` meant the same tag installed a different
  // npm on different days: a future release with a different engine requirement, a regression,
  // or a tampered publish all arrive without a diff.
  //
  // The floor check that already existed cannot see any of that — it only asks whether the
  // version is at least 11.5.1. It stays, because it is the ASSERTION that the pin is still
  // adequate, which is a different question from what to install.

  it("names an exact version and a registry for every global install", () => {
    const doc = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8"),
    ) as { jobs?: Record<string, { steps?: Array<Record<string, unknown>> }> };
    const installs: Array<{ where: string; line: string }> = [];
    for (const [jobId, job] of Object.entries(doc.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        const body = String(step["run"] ?? "");
        for (const raw of body.split(/\r?\n/)) {
          const line = raw.trim();
          if (!/^(npm|pnpm|yarn) (install|add|i)\b/.test(line)) continue;
          if (!/(^|\s)(-g|--global)(\s|$)/.test(line)) continue;
          installs.push({
            where: `${jobId}: ${String(step["name"] ?? "(unnamed)")}`,
            line,
          });
        }
      }
    }
    expect(installs.length, "release.yml installs nothing globally").toBeGreaterThan(0);

    for (const { where, line } of installs) {
      expect(
        line,
        `${where} installs a floating version, so the same tag installs different code on ` +
          "different days — in the job that holds id-token: write",
      ).not.toMatch(/@latest\b/);
      expect(line, `${where} names no exact version`).toMatch(/@[0-9]+\.[0-9]+\.[0-9]+(\s|$)/);
      expect(
        line,
        `${where} names no registry, so the package name is one an attacker-controlled ` +
          "registry can answer",
      ).toMatch(/--registry https:\/\/registry\.npmjs\.org/);
    }
  });

  it("keeps the floor check, which is what says the pin is still adequate", () => {
    const text = readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8");
    expect(
      text,
      "the trusted-publishing floor must survive the pin: it is the assertion that what is " +
        "pinned still clears the bar",
    ).toMatch(/need="11\.5\.1"/);
  });
});

describe("the rebuild allow-list is reachable on a tag that predates it", () => {
  // Review finding [131]. `release.yml` re-publishes an existing tag by checking out the TAG's
  // tree and then fetching only `.github/actions` from the current revision — a tag cut before
  // the composite action existed has no action in its tree, which is why that second checkout
  // is there at all.
  //
  // With the allow-list at the repository root it was NOT part of that fetch. An older tag saw
  // it missing, the refusal fired, and both `gate` and `gate-floor` stopped: a re-publish route
  // the workflow documents, broken by a guard added to protect it.
  //
  // It now lives beside the action, so it travels with every fetch of it — and
  // `.github/pinned-bytes.txt` covers everything under `.github/actions`, so the pre-flight
  // verifies its bytes and refuses a file that tree holds and the list does not name. It is
  // pinned MORE tightly there than it was at the root, not less.

  it("keeps the list inside the action directory the gate jobs fetch", () => {
    const listed = readFileSync(path.join(REPO_ROOT, ".github", "pinned-bytes.txt"), "utf-8");
    expect(
      existsSync(path.join(REPO_ROOT, ".github", "actions", "setup", "dependency-builds.txt")),
      "the allow-list must sit beside the action, or a re-published tag cannot see it",
    ).toBe(true);
    expect(
      existsSync(path.join(REPO_ROOT, ".github", "dependency-builds.txt")),
      "and must not also sit at the root, where two copies could disagree",
    ).toBe(false);
    expect(
      listed,
      "and its bytes must be pinned, which `.github/actions/**` already gives it",
    ).toMatch(/\.github\/actions\/setup\/dependency-builds\.txt/);
  });

  it("has every reader fetch it from the current revision, not from the tag", () => {
    const release = parseYaml(
      readFileSync(path.join(REPO_ROOT, ".github", "workflows", "release.yml"), "utf-8"),
    ) as { jobs?: Record<string, { steps?: Array<Record<string, unknown>> }> };

    for (const [jobId, job] of Object.entries(release.jobs ?? {})) {
      const steps = job.steps ?? [];
      const readsList = steps.some((step) =>
        String(step["run"] ?? "").includes("dependency-builds.txt"),
      );
      if (!readsList) continue;

      // Whatever path it reads must come from the second checkout — the one pinned to
      // `github.sha` — rather than from the tag's own tree.
      const fetchesActions = steps.some((step) => {
        const uses = String(step["uses"] ?? "");
        if (!uses.startsWith("actions/checkout")) return false;
        const withBlock = step["with"];
        if (withBlock === null || typeof withBlock !== "object") return false;
        const inputs = withBlock as Record<string, unknown>;
        return String(inputs["ref"] ?? "").includes("github.sha");
      });
      expect(
        fetchesActions,
        `${jobId} reads the rebuild allow-list but never fetches it from the current ` +
          "revision, so re-publishing a tag that predates the list stops there",
      ).toBe(true);

      const readers = steps.filter((step) =>
        String(step["run"] ?? "").includes("dependency-builds.txt"),
      );
      for (const step of readers) {
        expect(
          String(step["run"] ?? ""),
          `${jobId}: ${String(step["name"] ?? "(unnamed)")} reads the list out of the tag's ` +
            "tree, which a tag cut before the list does not carry",
        ).toMatch(/\.ci-actions\/\.github\/actions\/setup\/dependency-builds\.txt/);
      }
    }
  });
});

describe("a permitted rebuild is verified against where the package comes from", () => {
  // Review finding [135]. Installation runs with `--ignore-scripts` and the step beside it then
  // rebuilds exactly the packages the allow-list names — which runs their `postinstall`. The
  // list names `esbuild`, so it permits *the package called esbuild*, whatever that turns out
  // to be. A pull request that resolves that name to a local `.tgz`, a directory or a git
  // checkout keeps the name and replaces the code, and the rebuild executes it in the job every
  // later verification depends on.
  //
  // Executed against synthetic lockfiles, because the property is what the guard DOES with a
  // resolution — not something reading the YAML can see.

  const VERIFIER = path.join(
    REPO_ROOT,
    ".github",
    "actions",
    "setup",
    "verify-rebuild-sources.mjs",
  );

  it("accepts a registry tarball and refuses every other source", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-rebuild-src-"));
    try {
      const list = path.join(dir, "dependency-builds.txt");
      writeFileSync(list, `# probe\nesbuild\n`, "utf-8");

      const verify = (lock: string): number => {
        const lockPath = path.join(dir, "pnpm-lock.yaml");
        writeFileSync(lockPath, lock, "utf-8");
        const run = spawnSync("node", [VERIFIER, lockPath, list], { encoding: "utf-8" });
        if (run.error !== undefined) throw run.error;
        return run.status ?? -1;
      };

      const registry = [
        "lockfileVersion: '9.0'",
        "",
        "packages:",
        "",
        "  esbuild@0.21.5:",
        "    resolution: {integrity: sha512-deadbeef}",
        "",
        "snapshots:",
        "",
        // The same key appears again here with no resolution; reading the snapshot section as
        // unresolved packages reported a finding against an ordinary lockfile, and did until it
        // was measured.
        "  esbuild@0.21.5:",
        "    optionalDependencies:",
        "      '@esbuild/aix-ppc64': 0.21.5",
        "",
      ].join("\n");

      expect
        .soft(verify(registry), "a content-addressed registry tarball must be accepted")
        .toBe(0);

      for (const [resolution, why] of [
        ["{tarball: file:vendor/esbuild-0.21.5.tgz}", "the reviewer's local .tgz"],
        ["{directory: vendor/esbuild, type: directory}", "a workspace directory"],
        ["{repo: git@github.com:someone/esbuild.git, commit: deadbeef}", "a git checkout"],
      ] as Array<[string, string]>) {
        const swapped = [
          "lockfileVersion: '9.0'",
          "",
          "packages:",
          "",
          "  esbuild@0.21.5:",
          `    resolution: ${resolution}`,
          "",
        ].join("\n");
        expect.soft(verify(swapped), `${why} keeps the name and replaces the code`).toBe(1);
      }

      // And a permitted name the lockfile does not resolve at all: a permission with no
      // subject, which is not a pass either.
      const absent = [
        "lockfileVersion: '9.0'",
        "",
        "packages:",
        "",
        "  vite@5.0.0:",
        "    resolution: {integrity: sha512-deadbeef}",
        "",
      ].join("\n");
      expect
        .soft(verify(absent), "a permitted name the lockfile never resolves must be reported")
        .toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs that verification before the rebuild, in every reader", () => {
    // Ordering, not presence: verifying after the rebuild verifies nothing.
    const action = readFileSync(
      path.join(REPO_ROOT, ".github", "actions", "setup", "action.yml"),
      "utf-8",
    );
    const verifyAt = action.indexOf("verify-rebuild-sources.mjs");
    const rebuildAt = action.indexOf("pnpm rebuild");
    expect(verifyAt, "the action must verify the sources").toBeGreaterThan(-1);
    expect(rebuildAt, "and must rebuild something").toBeGreaterThan(-1);
    expect(verifyAt, "the source check must precede the rebuild it authorises").toBeLessThan(
      rebuildAt,
    );

    const release = readFileSync(
      path.join(REPO_ROOT, ".github", "workflows", "release.yml"),
      "utf-8",
    );
    if (release.includes("pnpm rebuild")) {
      expect(
        release.indexOf("verify-rebuild-sources.mjs"),
        "release.yml rebuilds without checking where the package comes from",
      ).toBeGreaterThan(-1);
      expect(
        release.indexOf("verify-rebuild-sources.mjs"),
        "and must check before it rebuilds",
      ).toBeLessThan(release.indexOf("pnpm rebuild"));
    }
  });
});

describe("release automation performs decisions rather than making them", () => {
  // `prepare-release.yml` and `tag-release.yml` mechanise a release that a human has already
  // decided twice over: once by typing the version into the dispatch form, once by merging the
  // pull request that carries it. `.agents/rules/version-discipline.md` puts both of those with
  // the user, and the rule's own recorded failure is an agent choosing a version number — so
  // what these rows pin is that neither workflow can.

  const workflow = (name: string): Record<string, unknown> =>
    parseYaml(readFileSync(path.join(REPO_ROOT, ".github", "workflows", name), "utf-8")) as Record<
      string,
      unknown
    >;

  it("takes the version from a human and never computes one", () => {
    const prepare = workflow("prepare-release.yml");
    const on = prepare["on"];
    expect(isRecord(on), "prepare-release must declare its triggers").toBe(true);
    const triggers = isRecord(on) ? on : {};
    expect(
      Object.keys(triggers).sort(),
      "dispatch ONLY: a schedule or a push trigger would mean a release nobody asked for, and " +
        "the version would have to come from somewhere other than a person",
    ).toEqual(["workflow_dispatch"]);

    const dispatch = triggers["workflow_dispatch"];
    const inputs = isRecord(dispatch) && isRecord(dispatch["inputs"]) ? dispatch["inputs"] : {};
    expect(Object.keys(inputs), "the version is the input, and the only one").toEqual(["version"]);
    expect(
      isRecord(inputs["version"]) ? inputs["version"]["required"] : undefined,
      "and it is required: a default would be this workflow choosing",
    ).toBe(true);
  });

  it("tags from the manifest, and only when the CHANGELOG names that version", () => {
    const tagWorkflow = workflow("tag-release.yml");
    const jobs = isRecord(tagWorkflow["jobs"]) ? tagWorkflow["jobs"] : {};
    const tagJob = jobs["tag"];
    expect(isRecord(tagJob), "tag-release must have a tag job").toBe(true);
    const job = isRecord(tagJob) ? tagJob : {};
    // The TRIGGER, not a commit message. This repository merges pull requests with merge
    // commits, so `head_commit.message` reads "Merge pull request #N from …" and a condition on
    // the release commit's own subject could never have fired. A version is a fact about the
    // tree; a commit subject is a fact about how somebody merged.
    const push = isRecord(tagWorkflow["on"]) ? tagWorkflow["on"]["push"] : undefined;
    const paths = isRecord(push) ? push["paths"] : undefined;
    expect(
      paths,
      "the trigger must be the manifest changing: that is the only way a version can change, " +
        "and it is independent of how the pull request was merged",
    ).toEqual(["packages/qfai/package.json"]);
    expect(
      String(job["if"] ?? ""),
      "and there must be no condition on a commit subject, which merge commits hide",
    ).not.toContain("head_commit");

    const body =
      (job["steps"] as Array<Record<string, unknown>> | undefined)
        ?.map((step) => String(step["run"] ?? ""))
        .join("\n") ?? "";
    // The READ and the comparison, not a mention of the path. Measured: the first version
    // asserted the body contained `packages/qfai/package.json`, and the error message beside the
    // check names that path too — so replacing the read with `manifest="$claimed"` left the row
    // green. Fourth time in this work that a row matched a sentence about a thing instead of the
    // thing; every one of them was found by planting.
    const commands = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .join("\n");
    expect(
      commands,
      "the version must be read out of the manifest, which is the tree's own statement of it",
    ).toMatch(/claimed=.*packages\/qfai\/package\.json/);
    expect(
      commands,
      "and the CHANGELOG must be SEARCHED for that version before anything is tagged: the " +
        "Release body is extracted from that section, so a tag without it publishes a release " +
        "nobody described. The grep, not a mention — the message inside that branch names the " +
        "file too, and a row that matched it stayed green when the check was removed",
    ).toMatch(/grep[^\n]*CHANGELOG\.md/);
    expect(
      body,
      "and the CHANGELOG heading, because the GitHub Release body is extracted from that section",
    ).toContain("CHANGELOG.md");
  });

  it("refuses to cut a release nobody described", () => {
    // The answer to "where does the release text come from": nowhere in here. These workflows
    // rename a section; the prose is whatever the merged pull requests wrote. So an empty
    // `## [Unreleased]` has to stop the release rather than produce an empty heading — a release
    // note nobody wrote reads as "nothing happened".
    const prepare = readFileSync(
      path.join(REPO_ROOT, ".github", "workflows", "prepare-release.yml"),
      "utf-8",
    );
    expect(prepare, "an empty Unreleased section must be refused").toMatch(/body\.trim\(\) === ""/);
    expect(
      prepare,
      "and nothing here may compose release prose: the only CHANGELOG write is the rename",
    ).not.toMatch(/### (Added|Changed|Fixed)/);
  });

  // ── the Release body, capped rather than fatal ─────────────────────────────────────────
  //
  // v1.10.1 is why these two rows exist. Its CHANGELOG section runs to 160,679 characters
  // against the 125,000-character limit on a GitHub Release body; `gh release create`
  // answered 422 and no Release was created, while the npm publish beside it succeeded —
  // the two jobs are siblings, so nothing surfaced until somebody read the run. A release
  // that is too well described is not a reason to stop shipping it.
  //
  // EXECUTED, not grepped. The cap is arithmetic over a body, and a row that matched
  // `slice(` would pass on a cap that kept nothing, on one that kept everything, and on one
  // that reordered the entries. Same reason `extractVerdictProgram` exists at the top of
  // this file, and the same quoted-heredoc guarantee: `<<'CAP'` means the bytes the runner
  // executes and the bytes run here are the same bytes.

  const NOTES_LIMIT = 125_000;

  const extractNotesCapProgram = (): string => {
    const steps = (workflow("release.yml")["jobs"] as Record<string, unknown>)["github-release"];
    const run = (isRecord(steps) ? ((steps["steps"] as Array<Record<string, unknown>>) ?? []) : [])
      .map((step) => String(step["run"] ?? ""))
      .join("\n");
    const lines = run.split("\n");
    const openers = lines.flatMap((line, index) => (line.includes("<<'CAP'") ? [index] : []));
    const terminators = lines.flatMap((line, index) => (line.trimEnd() === "CAP" ? [index] : []));
    const [opener] = openers;
    const [terminator] = terminators;
    // Refused rather than defaulted, for the reason the header gives: a silent zero-match
    // extractor hands every row an empty program, and `node ""` exits 0 on all of them.
    if (opener === undefined || terminator === undefined || terminator <= opener) {
      throw new Error(
        `expected one well-ordered CAP heredoc, found openers ${JSON.stringify(openers)} and terminators ${JSON.stringify(terminators)}`,
      );
    }
    if (openers.length !== 1 || terminators.length !== 1) {
      throw new Error(
        `expected exactly one CAP heredoc, found ${openers.length} openers and ${terminators.length} terminators`,
      );
    }
    const body = lines.slice(opener + 1, terminator).join("\n");
    if (body.trim().length === 0) {
      throw new Error("the extracted cap program is empty");
    }
    return body;
  };

  /** Runs the shipped cap over a supplied section and returns what it left on disk. */
  const capNotes = (section: string, version: string): { notes: string; output: string } => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-notes-cap-"));
    try {
      mkdirSync(path.join(dir, "tmp"));
      writeFileSync(path.join(dir, "tmp", "release-notes.md"), section, "utf-8");
      // `.cjs`, because the shipped block is fed to `node -` on stdin — which is CommonJS —
      // and its `require` would throw under the `.mjs` an ESM extension would imply.
      const scriptPath = path.join(dir, "cap.cjs");
      writeFileSync(scriptPath, `${extractNotesCapProgram()}\n`, "utf-8");
      const output = execFileSync(process.execPath, [scriptPath], {
        cwd: dir,
        encoding: "utf-8",
        env: { ...process.env, RELEASE_VERSION: version, GITHUB_REPOSITORY: "aganesy/QFAI" },
      });
      return {
        notes: readFileSync(path.join(dir, "tmp", "release-notes.md"), "utf-8"),
        output,
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("caps a section past the body limit instead of failing the release", () => {
    // Shaped like the real thing: top-level entries, because that is the boundary the cap
    // cuts on and a body of undifferentiated text would exercise only the fallback.
    const section = Array.from(
      { length: 600 },
      (_unused, index) => `- **Entry ${index}.** ${"detail ".repeat(40)}`,
    ).join("\n");
    expect(section.length, "the fixture has to actually exceed the limit").toBeGreaterThan(
      NOTES_LIMIT,
    );

    const { notes, output } = capNotes(section, "9.9.9");
    expect(notes.length, "the body it leaves must fit").toBeLessThanOrEqual(NOTES_LIMIT);
    // …and must still be a release note. A cap that satisfies the line above by writing one
    // character passes every limit and describes nothing.
    expect(notes.length, "and must still carry most of the section").toBeGreaterThan(
      NOTES_LIMIT * 0.7,
    );

    // Document order, unedited. This is the property that matters: the cap must not choose
    // which entries matter — that judgement belongs to whoever wrote the CHANGELOG, and it is
    // the same thing every other row in this describe refuses to let the machinery do.
    // `split` always yields at least one element, but the index signature is
    // `string | undefined` under this tree's settings and the two rows below
    // pass it where a `string` is required.
    const kept = notes.split("\n\n---\n\n")[0] ?? "";
    expect(
      section.startsWith(kept),
      "what it keeps must be a PREFIX of the section: no reordering, no selection, no summary",
    ).toBe(true);
    // Cut at an entry boundary, so the notes never stop mid-sentence.
    // Cut ON a boundary, stated as the boundary rather than as the fixture's last characters:
    // what follows the kept prefix must be the start of the next entry, so the notes can never
    // stop mid-entry.
    expect(
      section.slice(kept.length).startsWith(`
- **`),
      "the cut must land on an entry boundary, never inside one",
    ).toBe(true);

    expect(notes, "and must say where the rest is").toContain(
      "https://github.com/aganesy/QFAI/blob/v9.9.9/CHANGELOG.md",
    );
    expect(output, "and must say on the run that it did so").toMatch(/capped/);
  });

  it("leaves a section that already fits exactly as it is", () => {
    // The other direction. Without it the row above is satisfied by a cap that truncates
    // unconditionally, which would put a "not the whole section" footer on every release.
    const section = `### Added\n\n- **A small release.** One entry.`;
    const { notes, output } = capNotes(section, "9.9.9");
    expect(notes, "an ordinary section must pass through untouched").toBe(section);
    expect(output, "and must not claim it was capped").not.toMatch(/capped/);
  });

  it("keeps both workflows at the minimal permission scope", () => {
    // The writes go through a token in a secret, not through the job token, which is what keeps
    // `BR-0017-0016`'s closed departure set at three. The row above that enforces the set would
    // catch a regression here too; this one says why it holds, so a later reader does not
    // "simplify" it by granting `contents: write` and widening the set.
    for (const name of ["prepare-release.yml", "tag-release.yml"]) {
      const document = workflow(name);
      expect(document["permissions"], `${name} must grant exactly the minimal scope`).toEqual({
        contents: "read",
      });

      const text = readFileSync(path.join(REPO_ROOT, ".github", "workflows", name), "utf-8");
      expect(
        text,
        `${name} must take its write capability from a secret, not from the job token`,
      ).toContain("RELEASE_AUTOMATION_TOKEN");
    }
  });
});

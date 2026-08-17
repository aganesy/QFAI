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

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
const CI_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "ci.yml");

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

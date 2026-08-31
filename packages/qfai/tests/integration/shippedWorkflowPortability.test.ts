/**
 * Integration: shipped setup-install portability and its two degrade
 * directions.
 *
 * Covers the portability half of the shipped-workflows contract
 * (`.qfai/contracts/cli/shipped-workflows.md`, CLI-WFSET §5 dimension 2 and
 * §6): the shipped setup-install column resolves the adopter's Node version
 * and the adopter's package manager from the adopter's own tree, and the two
 * resolutions degrade in OPPOSITE directions — an absent Node version file
 * falls OPEN to the documented literal with a warning annotation and the
 * lane continues, while an unresolvable package-manager version fails CLOSED
 * with an annotation naming the manifest field to fix. Both resolutions live
 * in extractable `run:` bodies precisely so they are observable off-runner:
 * they are extracted from the REAL packaged shipped tree and executed with
 * bash (`-e -o pipefail`, the flags GitHub applies to `shell: bash` steps on
 * hosted runners) against adopter fixture trees in temp directories.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  collectJobSteps,
  collectWorkflowJobs,
  headerComment,
  isRecord,
  loadShippedWorkflows,
  useTempDirPool,
} from "../helpers/shippedWorkflowFixtures.js";

/**
 * The Node version the shipped setup falls open to when the adopter pins
 * none. Value SSOT is this suite per CLI-WFSET §5; the shipped header block
 * must document the same literal.
 */
const DOCUMENTED_NODE_VERSION = "20";

/** The adopter Node version files the resolution honours, in precedence order. */
const NODE_VERSION_FILES: readonly string[] = [".nvmrc", ".node-version"];

/** A pinned version distinct from the literal, so precedence is observable. */
const FIXTURE_NODE_VERSION = "22.11.0";

/** The step id and output key the Node-version resolution exposes. */
const NODE_STEP_ID = "node-version";
const NODE_VERSION_OUTPUT = "version";

/** The step id of the package-manager resolution guard. */
const PACKAGE_MANAGER_STEP_ID = "package-manager";

/** The manifest field the pnpm route resolves its version from. */
const PACKAGE_MANAGER_FIELD = "packageManager";

/** The action whose `node-version:` input consumes the resolved value. */
const SETUP_NODE_ACTION = "actions/setup-node@";

/** The third-party action that resolves pnpm from the manifest field. */
const SETUP_PNPM_ACTION = "pnpm/action-setup@";

/** A run body that invokes a package-manager dependency install. */
const INSTALL_RUN_RE = /\b(?:pnpm|yarn|npm)\s+(?:install|ci)\b/;

/**
 * A validator INVOCATION, i.e. the command that reports a lane result. The
 * runner prefix is required on purpose: the resolution steps below log lines
 * that start with the workflow's own name (`qfai validate: …`), and a bare
 * `qfai validate` substring would match those logs and misidentify a
 * resolution step as the lane result.
 */
const QFAI_LANE_RE = /^\s*(?:npx|pnpm|yarn|npm)\s+(?:exec\s+|dlx\s+|run\s+)?qfai\s+validate\b/;

/** A bash diagnostic line, i.e. an aborted command rather than a chosen exit. */
const BASH_DIAGNOSTIC_RE = /: line \d+: |command not found|unexpected|syntax error/;

const newTempDir = useTempDirPool("qfai-wfport-");

interface ShippedJob {
  file: string;
  body: string;
  jobId: string;
  job: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
}

/** Every job of every packaged shipped workflow, with its file body. */
async function shippedJobs(): Promise<ShippedJob[]> {
  const jobs: ShippedJob[] = [];
  for (const [file, body] of await loadShippedWorkflows()) {
    for (const { jobId, job } of collectWorkflowJobs(parse(body))) {
      jobs.push({ file, body, jobId, job, steps: collectJobSteps(job) });
    }
  }
  return jobs;
}

function isSetupNodeStep(step: Record<string, unknown>): boolean {
  const uses = step["uses"];
  return typeof uses === "string" && uses.startsWith(SETUP_NODE_ACTION);
}

/** The shipped jobs that set the runner's Node version up. */
async function nodeSetupJobs(): Promise<ShippedJob[]> {
  return (await shippedJobs()).filter((entry) => entry.steps.some(isSetupNodeStep));
}

function isInstallStep(step: Record<string, unknown>): boolean {
  const run = step["run"];
  return typeof run === "string" && INSTALL_RUN_RE.test(run);
}

/** The shipped jobs that install the adopter's dependencies. */
async function installJobs(): Promise<ShippedJob[]> {
  return (await shippedJobs()).filter((entry) => entry.steps.some(isInstallStep));
}

/** True when a step runs the validator (comment lines never count). */
function reportsLaneResult(step: Record<string, unknown>): boolean {
  const run = step["run"];
  if (typeof run !== "string") {
    return false;
  }
  return run
    .split(/\r?\n/)
    .some((line) => !line.trimStart().startsWith("#") && QFAI_LANE_RE.test(line));
}

function stepById(job: ShippedJob, id: string): Record<string, unknown> | undefined {
  return job.steps.find((step) => step["id"] === id);
}

/** The `run:` body of a step, or undefined when the step has none. */
function stepRunBody(step: Record<string, unknown> | undefined): string | undefined {
  const run = step?.["run"];
  return typeof run === "string" ? run : undefined;
}

interface ShellRun {
  status: number | null;
  stdout: string;
  stderr: string;
  outputs: Record<string, string>;
}

/**
 * Executes one extracted `run:` body the way the runner would — `bash -e -o
 * pipefail`, the flags GitHub applies to `shell: bash` steps — in the given
 * adopter fixture directory with a stubbed GITHUB_OUTPUT file, returning the
 * exit status, both streams and the parsed `key=value` outputs the shell
 * wrote. The body is appended verbatim after the optional prologue, which is
 * how a caller shadows a command it must not really run; the environment is
 * otherwise the only thing stubbed.
 */
async function runShell(body: string, cwd: string, prologue = ""): Promise<ShellRun> {
  const stage = await newTempDir();
  const scriptPath = path.join(stage, "step.sh");
  const outputPath = path.join(stage, "github-output.txt");
  await writeFile(scriptPath, prologue === "" ? body : `${prologue}\n${body}`, "utf-8");
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

describe(
  "TC-0003-0043 (TDD-0043): absent Node version file falls open to the documented literal",
  { timeout: 60000 },
  () => {
    // One it() per TC-0003-0043 verify bullet. Scope notes, disclosed:
    // - `actions/setup-node` cannot run off-runner, so the resolution the
    //   TC asks to EXECUTE has to live in a `run:` body. it3 therefore pins
    //   the wiring — the resolved value is what the action consumes, and no
    //   `node-version-file:` input is present — so a resolution that runs
    //   but feeds nothing cannot pass this row.
    // - The version-file list and the fall-open literal are value SSOT in
    //   this suite per CLI-WFSET §5. Header-block COMPLETENESS is
    //   TC-0003-0042's surface; that the header documents THIS literal is
    //   this row's, asserted in it1.
    // - The `node-version-file:` half of it3 is the fail-closed form the
    //   TC's third bullet forbids: it fails the job for every adopter
    //   without such a file, which is the whole hazard BR-0003-0037 names.

    /** The Node-version resolution body of one job, asserted extractable. */
    function resolutionBody(job: ShippedJob): string {
      const body = stepRunBody(stepById(job, NODE_STEP_ID));
      expect(
        body,
        `${job.file}: job "${job.jobId}" declares no extractable Node-version resolution step (a \`run:\` step with id: ${NODE_STEP_ID})`,
      ).toBeTypeOf("string");
      if (typeof body !== "string") {
        throw new Error("unreachable: asserted above");
      }
      return body;
    }

    it("an adopter tree with no Node version file resolves the documented literal, warns, and exits 0", async () => {
      const jobs = await nodeSetupJobs();
      // Non-vacuity: the shipped set sets Node up somewhere today.
      expect(
        jobs.length,
        "no shipped job sets a Node version up — this row would have no subject",
      ).toBeGreaterThanOrEqual(1);
      for (const job of jobs) {
        const body = resolutionBody(job);
        // Fixture: an adopter tree carrying NO Node version file at all.
        const dir = await newTempDir();
        const run = await runShell(body, dir);
        expect(
          run.status,
          `${job.file}: job "${job.jobId}" Node resolution exited ${String(run.status)} with no version file — it must fail OPEN: ${run.stderr}`,
        ).toBe(0);
        expect(run.outputs[NODE_VERSION_OUTPUT]).toBe(DOCUMENTED_NODE_VERSION);
        expect(
          run.stdout,
          `${job.file}: job "${job.jobId}" emitted no ::warning:: annotation for the fall-open`,
        ).toContain("::warning::");
        // The header documents the literal the fall-open actually used.
        const header = headerComment(job.body);
        expect(header, `${job.file}: header does not document the fall-open literal`).toContain(
          `Node ${DOCUMENTED_NODE_VERSION}`,
        );
        for (const versionFile of NODE_VERSION_FILES) {
          expect(header, `${job.file}: header does not name ${versionFile}`).toContain(versionFile);
        }
      }
    });

    it("a version file in the adopter tree wins over the literal, with no warning", async () => {
      for (const job of await nodeSetupJobs()) {
        const body = resolutionBody(job);
        for (const versionFile of NODE_VERSION_FILES) {
          const dir = await newTempDir();
          await writeFile(path.join(dir, versionFile), `${FIXTURE_NODE_VERSION}\n`, "utf-8");
          const run = await runShell(body, dir);
          expect(
            run.status,
            `${job.file}: Node resolution failed with ${versionFile} present: ${run.stderr}`,
          ).toBe(0);
          expect(
            run.outputs[NODE_VERSION_OUTPUT],
            `${job.file}: ${versionFile} did not win over the documented literal`,
          ).toBe(FIXTURE_NODE_VERSION);
          expect(
            run.stdout,
            `${job.file}: warned even though ${versionFile} pinned a version`,
          ).not.toContain("::warning::");
        }
        // Determinism when the adopter carries both files: the declared
        // precedence order decides, so neither value is picked by accident.
        const bothDir = await newTempDir();
        const [first, second] = NODE_VERSION_FILES;
        if (first === undefined || second === undefined) {
          throw new Error("the version-file precedence list must have two or more members");
        }
        await writeFile(path.join(bothDir, first), `${FIXTURE_NODE_VERSION}\n`, "utf-8");
        await writeFile(path.join(bothDir, second), "18.20.4\n", "utf-8");
        const bothRun = await runShell(body, bothDir);
        expect(bothRun.status).toBe(0);
        expect(
          bothRun.outputs[NODE_VERSION_OUTPUT],
          `${job.file}: with both files present the precedence order (${first} first) did not decide`,
        ).toBe(FIXTURE_NODE_VERSION);
      }
    });

    it("the fall-open value is what setup-node consumes, and nothing tolerates or fails the step closed", async () => {
      const violations: string[] = [];
      for (const job of await nodeSetupJobs()) {
        const resolutionIndex = job.steps.findIndex((step) => step["id"] === NODE_STEP_ID);
        const setupIndex = job.steps.findIndex(isSetupNodeStep);
        if (resolutionIndex === -1) {
          violations.push(`${job.file}: job "${job.jobId}" has no ${NODE_STEP_ID} step`);
          continue;
        }
        const resolution = job.steps[resolutionIndex] ?? {};
        if (resolution["continue-on-error"] !== undefined) {
          violations.push(
            `${job.file}: job "${job.jobId}" tolerates the resolution via continue-on-error, so its exit 0 would not be earned`,
          );
        }
        if (resolutionIndex > setupIndex) {
          violations.push(
            `${job.file}: job "${job.jobId}" resolves the Node version after setup-node consumes it`,
          );
        }
        const setup = job.steps[setupIndex] ?? {};
        const withInputs = isRecord(setup["with"]) ? setup["with"] : {};
        const nodeVersion = withInputs["node-version"];
        const wiring = `steps.${NODE_STEP_ID}.outputs.${NODE_VERSION_OUTPUT}`;
        if (typeof nodeVersion !== "string" || !nodeVersion.includes(wiring)) {
          violations.push(
            `${job.file}: job "${job.jobId}" setup-node node-version: does not consume \${{ ${wiring} }} (found ${JSON.stringify(nodeVersion)})`,
          );
        }
        if (withInputs["node-version-file"] !== undefined) {
          violations.push(
            `${job.file}: job "${job.jobId}" declares node-version-file:, which fails CLOSED for every adopter that has no such file`,
          );
        }
      }
      expect(violations).toEqual([]);
    });
  },
);

describe(
  "TC-0003-0044 (TDD-0044): absent packageManager field fails closed with an actionable annotation",
  { timeout: 60000 },
  () => {
    // One it() per TC-0003-0044 verify bullet. This is the OPPOSITE degrade
    // direction from TDD-0043 on the same setup-install column. Scope notes,
    // disclosed:
    // - The fixture is the TC's: a pnpm lockfile plus a package.json with no
    //   `packageManager` field. The guard is scoped to the pnpm route
    //   because that is the route whose version has no fallback —
    //   `pnpm/action-setup` is invoked with no `version:` input on purpose
    //   (overriding the adopter's declared version would be worse), so the
    //   manifest field is its only source. Yarn Classic and npm ship with
    //   the runner and DO resolve without the field, so failing closed
    //   there would fail closed on a resolvable case, which AC-0003-0033
    //   ("解決不能" = unresolvable) does not ask for.
    // - Observation handed to the orchestrator rather than implemented
    //   here: a pnpm lockfile with a `packageManager` naming a DIFFERENT
    //   manager (`yarn@…`) is also unresolvable for this route and would end
    //   in the action's opaque error. No ledger row covers it; widening the
    //   guard now would be behaviour no TC observes.
    // - it3's non-opacity has two independent halves: the guard runs BEFORE
    //   the third-party action that would otherwise produce the opaque
    //   error, and the stop is a chosen exit (no bash diagnostic on stderr).
    //   The header half of it3 records the same precondition in the file the
    //   adopter reads; header-block COMPLETENESS stays TC-0003-0042's.
    // - it4's cross-job half is vacuous today (no shipped job `needs:` the
    //   install-bearing job), disclosed; its non-vacuous half is the
    //   in-job one — GitHub skips the remaining steps of a job after a
    //   failed step unless a step opts out, so the assertion is that
    //   nothing between the guard and the lane result opts out.

    /** The TC's fixture: a pnpm lockfile and a manifest without the field. */
    async function pnpmTreeWithoutPackageManager(): Promise<string> {
      const dir = await newTempDir();
      await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
      await writeFile(
        path.join(dir, "package.json"),
        `${JSON.stringify({ name: "adopter-without-package-manager", private: true }, null, 2)}\n`,
        "utf-8",
      );
      return dir;
    }

    /**
     * A manifest whose `packageManager` value is attacker-controlled: the
     * declared version followed by embedded newlines and `::`-leading
     * workflow commands. `\n` is a legal JSON string escape, so this value
     * reaches the guard from any fork PR that can edit package.json. The
     * runner parses `::`-leading stdout lines as workflow commands, so an
     * unsanitised echo of this value lets the adopter's PR UI show forged
     * annotations against arbitrary files and lets `::stop-commands::`
     * silence the rest of the step.
     */
    const INJECTED_PACKAGE_MANAGER =
      "pnpm@10.15.0\n::error file=SECURITY.md,line=1::spoofed annotation from an untrusted fork\n::stop-commands::deadbeef";

    /** A pnpm tree whose manifest carries the injected value. */
    async function pnpmTreeWithInjectedPackageManager(): Promise<string> {
      const dir = await newTempDir();
      await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
      await writeFile(
        path.join(dir, "package.json"),
        `${JSON.stringify(
          {
            name: "adopter-with-injected-package-manager",
            private: true,
            packageManager: INJECTED_PACKAGE_MANAGER,
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );
      return dir;
    }

    /** The package-manager guard body of one job, asserted extractable. */
    function guardBody(job: ShippedJob): string {
      const body = stepRunBody(stepById(job, PACKAGE_MANAGER_STEP_ID));
      expect(
        body,
        `${job.file}: job "${job.jobId}" declares no extractable package-manager resolution step (a \`run:\` step with id: ${PACKAGE_MANAGER_STEP_ID})`,
      ).toBeTypeOf("string");
      if (typeof body !== "string") {
        throw new Error("unreachable: asserted above");
      }
      return body;
    }

    it("a pnpm lockfile with no packageManager field stops the step with a non-zero exit", async () => {
      const jobs = await installJobs();
      // Non-vacuity: the shipped set installs dependencies somewhere today.
      expect(
        jobs.length,
        "no shipped job installs dependencies — this row would have no subject",
      ).toBeGreaterThanOrEqual(1);
      for (const job of jobs) {
        const body = guardBody(job);
        const dir = await pnpmTreeWithoutPackageManager();
        const run = await runShell(body, dir);
        expect(
          run.status,
          `${job.file}: job "${job.jobId}" package-manager resolution exited ${String(run.status)} with an unresolvable pnpm version — it must fail CLOSED`,
        ).toBeGreaterThan(0);
      }
    });

    it("the failure annotation names the package.json packageManager field as the fix site, and nothing else authors on that channel", async () => {
      for (const job of await installJobs()) {
        const body = guardBody(job);
        const run = await runShell(body, await pnpmTreeWithoutPackageManager());
        const output = `${run.stdout}${run.stderr}`;
        expect(output, `${job.file}: the stop emitted no ::error:: annotation`).toContain(
          "::error",
        );
        expect(
          output,
          `${job.file}: the annotation does not name the ${PACKAGE_MANAGER_FIELD} field`,
        ).toContain(PACKAGE_MANAGER_FIELD);
        expect(output, `${job.file}: the annotation does not name package.json`).toContain(
          "package.json",
        );
        // Actionable means the reader is told what to write, not just what
        // is missing: the concrete `pnpm@<version>` value form.
        expect(
          output,
          `${job.file}: the annotation states no concrete fix (the pnpm@ value form)`,
        ).toContain("pnpm@");

        // Integrity of the same channel (round 2, implementation-reviewer#3
        // F1). The bullet above makes this step's annotation output the
        // observable contract, so the step must be the only author on it.
        // A `packageManager` value carrying embedded newlines plus
        // `::`-leading workflow commands is adopter-controlled input from any
        // fork PR; echoed unsanitised it forges annotations in the adopter's
        // PR UI.
        //
        // The fixture no longer RESOLVES, and the change is deliberate: the
        // guard checks the value to its END, so `pnpm@10.15.0` followed by
        // anything is not a pnpm version. (It used to be accepted on its first
        // digit alone, which is the hole this row's sibling rule closed.) So
        // the guard now authors exactly ONE annotation of its own, and that is
        // the only workflow command line this channel may carry — every other
        // `::`-leading line would be one the manifest value forged.
        const injected = await runShell(body, await pnpmTreeWithInjectedPackageManager());
        expect(
          injected.status,
          `${job.file}: the injected value is not a resolvable pnpm version and must fail closed: ${injected.stderr}`,
        ).toBe(1);
        // Split on every line terminator the runner honours (a bare `\r`
        // included) and trim leading whitespace before the `::` test: the
        // runner strips leading spaces and tabs before parsing a workflow
        // command, so `  ::error` is a command too. Both shapes are
        // unreachable today — the guard collapses every whitespace run — and
        // that is exactly the hole a first-line-truncation implementation
        // would open, so the predicate closes it in advance.
        const commands = `${injected.stdout}${injected.stderr}`
          .split(/\r\n|\r|\n/)
          .filter((line) => line.trimStart().startsWith("::"));
        const forged = commands.filter(
          (line) => !line.trimStart().startsWith("::error file=package.json::"),
        );
        expect(
          forged,
          `${job.file}: the manifest value forged workflow command line(s) on this step's output channel`,
        ).toEqual([]);
        expect(
          commands,
          `${job.file}: the guard must author exactly one annotation of its own`,
        ).toHaveLength(1);
      }
    });

    it("the stop pre-empts the third-party action's opaque error and is a chosen exit", async () => {
      const violations: string[] = [];
      for (const job of await installJobs()) {
        const guardIndex = job.steps.findIndex((step) => step["id"] === PACKAGE_MANAGER_STEP_ID);
        if (guardIndex === -1) {
          violations.push(
            `${job.file}: job "${job.jobId}" has no ${PACKAGE_MANAGER_STEP_ID} step to pre-empt the action`,
          );
          continue;
        }
        const pnpmActionIndex = job.steps.findIndex((step) => {
          const uses = step["uses"];
          return typeof uses === "string" && uses.startsWith(SETUP_PNPM_ACTION);
        });
        if (pnpmActionIndex !== -1 && guardIndex > pnpmActionIndex) {
          violations.push(
            `${job.file}: job "${job.jobId}" resolves the package manager after ${SETUP_PNPM_ACTION}, so the action's own opaque error wins`,
          );
        }
        const installIndex = job.steps.findIndex(isInstallStep);
        if (installIndex !== -1 && guardIndex > installIndex) {
          violations.push(
            `${job.file}: job "${job.jobId}" resolves the package manager after the install step`,
          );
        }
        // The file the adopter reads states the precondition too, so the
        // stop is foreseeable and not only diagnosable after the fact.
        const header = headerComment(job.body);
        if (!header.includes(PACKAGE_MANAGER_FIELD)) {
          violations.push(
            `${job.file}: header does not document the ${PACKAGE_MANAGER_FIELD} precondition`,
          );
        }
      }
      expect(violations).toEqual([]);

      // The stop itself is deliberate: a chosen exit, not a command that
      // blew up under `-e` and left a shell diagnostic behind.
      for (const job of await installJobs()) {
        const run = await runShell(guardBody(job), await pnpmTreeWithoutPackageManager());
        expect(
          run.stderr,
          `${job.file}: the stop left a shell diagnostic, i.e. an opaque abort rather than a chosen exit`,
        ).not.toMatch(BASH_DIAGNOSTIC_RE);
      }
    });

    it("nothing between the stop and the lane result reports what the stop prevented computing", async () => {
      const violations: string[] = [];
      const installJobIds = new Set<string>();
      for (const job of await installJobs()) {
        installJobIds.add(job.jobId);
        const guardIndex = job.steps.findIndex((step) => step["id"] === PACKAGE_MANAGER_STEP_ID);
        if (guardIndex === -1) {
          violations.push(`${job.file}: job "${job.jobId}" has no ${PACKAGE_MANAGER_STEP_ID} step`);
          continue;
        }
        const laneIndex = job.steps.findIndex(reportsLaneResult);
        if (laneIndex === -1) {
          violations.push(`${job.file}: job "${job.jobId}" reports no lane result to protect`);
        } else if (laneIndex < guardIndex) {
          violations.push(
            `${job.file}: job "${job.jobId}" reports its lane result before the package manager is resolved`,
          );
        }
        // A step from the guard onwards that opts out of the job's abort
        // semantics would run anyway and could report an uncomputed result.
        job.steps.slice(guardIndex).forEach((step, offset) => {
          const stepName =
            typeof step["name"] === "string" ? step["name"] : `#${guardIndex + offset}`;
          if (step["continue-on-error"] !== undefined) {
            violations.push(
              `${job.file}: job "${job.jobId}" step "${stepName}" declares continue-on-error, so the closed stop would not stop it`,
            );
          }
          const condition = step["if"];
          if (
            typeof condition === "string" &&
            /always\(\)|!\s*cancelled\(\)|failure\(\)/.test(condition)
          ) {
            violations.push(
              `${job.file}: job "${job.jobId}" step "${stepName}" runs under "${condition}", which survives the closed stop`,
            );
          }
        });
      }
      // Cross-job half: no shipped job may depend on an install-bearing job
      // and escape its failure. Vacuous today (the dependent set is empty),
      // disclosed above; it names a regression the moment one appears.
      for (const job of await shippedJobs()) {
        const needs = job.job["needs"];
        const needsList = typeof needs === "string" ? [needs] : Array.isArray(needs) ? needs : [];
        if (!needsList.some((entry) => typeof entry === "string" && installJobIds.has(entry))) {
          continue;
        }
        const condition = job.job["if"];
        if (typeof condition === "string" && /always\(\)|!\s*cancelled\(\)/.test(condition)) {
          violations.push(
            `${job.file}: job "${job.jobId}" needs an install-bearing job but runs under "${condition}"`,
          );
        }
      }
      expect(violations).toEqual([]);
    });
    it("accepts only an integrity algorithm this runner can actually hash with", async () => {
      // Review finding [116]. The algorithm half of `+<algorithm>.<digest>` was checked as a run
      // of alphanumerics and hyphens and nothing more, so `pnpm@9.12.3+garbage.deadbeef` was
      // pronounced resolvable — and corepack, which hands that name to `crypto.createHash`, then
      // failed with the opaque resolution error this precondition exists to replace. The
      // precondition reached the failure it was written to prevent.
      //
      // Asked of `crypto.getHashes()` rather than of a fixed list, so `sha3-256` still passes:
      // that case is why the original comment refused a closed list, and it is a case this row
      // holds on to. Executed, not read — the defect was in what the shell accepted, and reading
      // the shape of the `case` statement is what let it through in the first place.
      const cases: Array<{ value: string; resolvable: boolean; why: string }> = [
        {
          value: "pnpm@9.12.3+sha512.deadbeef",
          resolvable: true,
          why: "the ordinary spelling corepack itself writes",
        },
        {
          value: "pnpm@9.12.3+sha3-256.deadbeef",
          resolvable: true,
          why: "supported by Node and refused by every closed list — the reason there is none",
        },
        {
          value: "pnpm@9.12.3+SHA512.deadbeef",
          resolvable: true,
          why: "`crypto.createHash` is case-insensitive about the name, so this guard is too",
        },
        {
          value: "pnpm@9.12.3+garbage.deadbeef",
          resolvable: false,
          why: "the reviewer's value: alphanumeric, and not an algorithm that exists",
        },
        {
          value: "pnpm@9.12.3+sha999.deadbeef",
          resolvable: false,
          why: "shaped like a real one, which is exactly what a shape check cannot separate",
        },
      ];

      const jobs = await installJobs();
      expect(
        jobs.length,
        "no shipped job installs dependencies — this row would have no subject",
      ).toBeGreaterThanOrEqual(1);

      for (const job of jobs) {
        const body = guardBody(job);
        for (const { value, resolvable, why } of cases) {
          const dir = await newTempDir();
          await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
          await writeFile(
            path.join(dir, "package.json"),
            `${JSON.stringify(
              {
                name: "adopter-with-declared-integrity",
                private: true,
                packageManager: value,
              },
              null,
              2,
            )}\n`,
            "utf-8",
          );
          const run = await runShell(body, dir);
          if (resolvable) {
            expect(
              run.status,
              `${job.file}: ${value} (${why}) must be accepted, not stopped:\n${run.stdout}${run.stderr}`,
            ).toBe(0);
          } else {
            expect(
              run.status,
              `${job.file}: ${value} (${why}) cannot resolve and must be stopped here rather than by corepack:\n${run.stdout}${run.stderr}`,
            ).toBeGreaterThan(0);
          }
        }
      }
    });
  },
);

describe(
  "TC-0003-0053 (TDD-0053): version file plus packageManager field is the non-degrading happy path",
  { timeout: 60000 },
  () => {
    // One it() per TC-0003-0053 verify bullet. This row is the BOUNDARY that
    // keeps TDD-0043's and TDD-0044's degrade oracles from being vacuously
    // green: it runs the same three extracted bodies over a fixture that
    // degrades in neither direction and requires silence, then (it4) reruns
    // them over the doubly-degraded fixture and requires the noise — so
    // "no warning / no stop" is a fact about the fixture, not about the
    // assertions.
    //
    // BORN GREEN, disclosed. Satisfied-by: TDD-0043, TDD-0044. The happy
    // path is the non-degraded branch of the very code those two rows had to
    // add, so no production change could be withheld for this row without
    // inventing a failure the specs do not ask for. Falsifiability is shown
    // in-cycle by the mutations recorded in this row's evidence block, and
    // structurally by it4's control (the same assertions do fire when the
    // inputs degrade).
    //
    // The install body is executed with a prologue that shadows pnpm / yarn
    // / npm / corepack with recording stubs: a real `pnpm install` needs a
    // network and a registry, while the observable this row needs is WHICH
    // branch the adopter's lockfile selects and that the body reaches its
    // end with status 0. Every one of the four is shadowed, so no branch of
    // the body can reach a real package manager.

    /** The manifest value the pnpm route resolves its version from. */
    const FIXTURE_PACKAGE_MANAGER = "pnpm@10.15.0";

    /** Marker prefix the shadowed package managers echo when invoked. */
    const STUB_MARKER = "stub-invoked:";

    /**
     * Shell prologue shadowing every package manager the install body can
     * reach. `yarn --version` answers with a Classic version and NOTHING
     * else, because the body pipes it (`yarn --version | cut -d . -f 1`)
     * into an integer comparison: emitting the marker line first would make
     * `$yarn_major` two lines, `[ … -ge 2 ]` fail with "integer expression
     * expected", and the Classic branch get chosen off an error path — the
     * shape this suite's own BASH_DIAGNOSTIC_RE classifies as a defect.
     */
    const PACKAGE_MANAGER_STUBS = [
      `pnpm() { echo "${STUB_MARKER} pnpm $*"; }`,
      `npm() { echo "${STUB_MARKER} npm $*"; }`,
      `corepack() { echo "${STUB_MARKER} corepack $*"; }`,
      `yarn() { if [ "$1" = "--version" ]; then echo "1.22.22"; return 0; fi; echo "${STUB_MARKER} yarn $*"; }`,
    ].join("\n");

    /** Both inputs present: a pinned Node version and a declared manager. */
    async function nonDegradingTree(): Promise<string> {
      const dir = await newTempDir();
      const versionFile = NODE_VERSION_FILES[0];
      if (versionFile === undefined) {
        throw new Error("the version-file precedence list is empty");
      }
      await writeFile(path.join(dir, versionFile), `${FIXTURE_NODE_VERSION}\n`, "utf-8");
      await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
      await writeFile(
        path.join(dir, "package.json"),
        `${JSON.stringify(
          {
            name: "adopter-with-both-inputs",
            private: true,
            packageManager: FIXTURE_PACKAGE_MANAGER,
          },
          null,
          2,
        )}\n`,
        "utf-8",
      );
      return dir;
    }

    /** Neither input present: the control that must trigger both degrades. */
    async function doublyDegradedTree(): Promise<string> {
      const dir = await newTempDir();
      await writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf-8");
      await writeFile(
        path.join(dir, "package.json"),
        `${JSON.stringify({ name: "adopter-degraded", private: true }, null, 2)}\n`,
        "utf-8",
      );
      return dir;
    }

    /** The row's subject: the job that both resolves and installs. */
    async function setupInstallJobs(): Promise<ShippedJob[]> {
      const jobs = (await shippedJobs()).filter(
        (entry) =>
          entry.steps.some(isInstallStep) &&
          entry.steps.some((step) => step["id"] === NODE_STEP_ID) &&
          entry.steps.some((step) => step["id"] === PACKAGE_MANAGER_STEP_ID),
      );
      expect(
        jobs.length,
        "no shipped job carries the whole setup-install column (Node resolution + package-manager resolution + install)",
      ).toBeGreaterThanOrEqual(1);
      return jobs;
    }

    function requiredBody(job: ShippedJob, stepId: string): string {
      const body = stepRunBody(stepById(job, stepId));
      expect(
        body,
        `${job.file}: job "${job.jobId}" has no \`run:\` step with id: ${stepId}`,
      ).toBeTypeOf("string");
      if (typeof body !== "string") {
        throw new Error("unreachable: asserted above");
      }
      return body;
    }

    function installBody(job: ShippedJob): string {
      const step = job.steps.find(isInstallStep);
      const body = stepRunBody(step);
      if (typeof body !== "string") {
        throw new Error("unreachable: the job was selected for having an install step");
      }
      return body;
    }

    it("the version file's value is what the resolution emits — the documented literal is not used", async () => {
      for (const job of await setupInstallJobs()) {
        const run = await runShell(requiredBody(job, NODE_STEP_ID), await nonDegradingTree());
        expect(run.status, `${job.file}: Node resolution failed on the happy path`).toBe(0);
        expect(
          run.outputs[NODE_VERSION_OUTPUT],
          `${job.file}: the pinned version file did not decide the resolved version`,
        ).toBe(FIXTURE_NODE_VERSION);
        expect(
          run.outputs[NODE_VERSION_OUTPUT],
          `${job.file}: the documented fall-open literal was used even though the adopter pinned a version`,
        ).not.toBe(DOCUMENTED_NODE_VERSION);
      }
    });

    it("no warning annotation is emitted anywhere in the setup-install column", async () => {
      for (const job of await setupInstallJobs()) {
        const dir = await nonDegradingTree();
        const runs = [
          await runShell(requiredBody(job, PACKAGE_MANAGER_STEP_ID), dir),
          await runShell(requiredBody(job, NODE_STEP_ID), dir),
          await runShell(installBody(job), dir, PACKAGE_MANAGER_STUBS),
        ];
        runs.forEach((run, index) => {
          expect(
            `${run.stdout}${run.stderr}`,
            `${job.file}: step ${index + 1} of the setup-install column warned on the happy path`,
          ).not.toContain("::warning::");
        });
      }
    });

    it("the install succeeds through the lockfile's own branch and the lane result follows it", async () => {
      for (const job of await setupInstallJobs()) {
        const run = await runShell(
          installBody(job),
          await nonDegradingTree(),
          PACKAGE_MANAGER_STUBS,
        );
        expect(
          run.status,
          `${job.file}: the install body failed on the happy path: ${run.stderr}`,
        ).toBe(0);
        expect(
          run.stdout,
          `${job.file}: the pnpm lockfile did not select the pnpm frozen-lockfile branch`,
        ).toContain(`${STUB_MARKER} pnpm install --frozen-lockfile`);
        // A result is only reported after the install that computed it, and
        // is not conditioned into running without one.
        const installIndex = job.steps.findIndex(isInstallStep);
        const laneIndex = job.steps.findIndex(reportsLaneResult);
        expect(laneIndex, `${job.file}: job "${job.jobId}" reports no lane result`).toBeGreaterThan(
          -1,
        );
        expect(
          laneIndex,
          `${job.file}: job "${job.jobId}" reports its lane result before installing`,
        ).toBeGreaterThan(installIndex);
        const laneStep = job.steps[laneIndex] ?? {};
        expect(
          laneStep["if"],
          `${job.file}: the lane-result step is conditioned, so it could report without the install`,
        ).toBeUndefined();
      }
    });

    it("neither degrade clause fires on the happy path, and both fire on the degraded control", async () => {
      for (const job of await setupInstallJobs()) {
        const happyDir = await nonDegradingTree();
        const happyGuard = await runShell(requiredBody(job, PACKAGE_MANAGER_STEP_ID), happyDir);
        const happyNode = await runShell(requiredBody(job, NODE_STEP_ID), happyDir);
        expect(
          happyGuard.status,
          `${job.file}: the fail-closed clause fired on the happy path`,
        ).toBe(0);
        expect(
          `${happyGuard.stdout}${happyGuard.stderr}`,
          `${job.file}: the fail-closed annotation was emitted on the happy path`,
        ).not.toContain("::error");
        expect(happyNode.status).toBe(0);
        expect(
          `${happyNode.stdout}${happyNode.stderr}`,
          `${job.file}: the fall-open annotation was emitted on the happy path`,
        ).not.toContain("::warning::");

        // The control: the same two bodies over a fixture degraded in both
        // directions MUST fire, or the silence above proves nothing.
        const degradedDir = await doublyDegradedTree();
        const degradedGuard = await runShell(
          requiredBody(job, PACKAGE_MANAGER_STEP_ID),
          degradedDir,
        );
        const degradedNode = await runShell(requiredBody(job, NODE_STEP_ID), degradedDir);
        expect(
          degradedGuard.status,
          `${job.file}: the fail-closed clause did not fire on the degraded control`,
        ).toBeGreaterThan(0);
        expect(`${degradedGuard.stdout}${degradedGuard.stderr}`).toContain("::error");
        expect(
          degradedNode.status,
          `${job.file}: the fall-open clause stopped the lane on the degraded control`,
        ).toBe(0);
        expect(degradedNode.stdout).toContain("::warning::");
        expect(degradedNode.outputs[NODE_VERSION_OUTPUT]).toBe(DOCUMENTED_NODE_VERSION);
      }
    });
  },
);

/**
 * Every bash `run:` block in the repository's own workflows and actions, and in
 * the workflow templates `qfai init` ships, parses as bash.
 *
 * GitHub dedents a `run: |` block to its base indentation and hands the result
 * to bash, which parses each compound command whole before running any of it.
 * A heredoc terminator indented past that base survives the dedent with leading
 * spaces, and a plain `<<` never matches it: the heredoc swallows the rest of
 * the script, the enclosing `if` is never closed, and the step exits 2 on every
 * branch of that `if`, including those that never reach the heredoc. Nothing
 * else in the suite runs these bodies through bash's parser, so a step like
 * that stays green here and fails only when a release is being prepared.
 *
 * `bash -n` parses without executing. A heredoc left open at the very end of a
 * script is only a warning with exit 0, so any output on stderr fails too.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  effectiveRunDefaults,
  yamlFilesUnder,
} from "../../../../scripts/check-workflow-hygiene.mjs";

import { REPO_ROOT, SHIPPED_WORKFLOWS_REL, isRecord } from "./helpers/hygieneTree.js";

interface RunBlock {
  readonly where: string;
  readonly body: string;
}

/**
 * GitHub substitutes `${{ … }}` before the shell sees the body, so an
 * expression is replaced by a bare word rather than left for bash to read.
 */
function asShellText(run: string): string {
  return run.replace(/\$\{\{[\s\S]*?\}\}/g, "GITHUB_EXPRESSION");
}

/** A step without `shell` runs under bash on the Linux runners every job here uses. */
function runsUnderBash(shell: unknown): boolean {
  return shell === undefined || (typeof shell === "string" && /^bash\b/.test(shell));
}

function bashBlocksOfSteps(
  file: string,
  owner: string,
  steps: unknown,
  inheritedShell: unknown,
): RunBlock[] {
  if (!Array.isArray(steps)) return [];
  const blocks: RunBlock[] = [];
  steps.forEach((step: unknown, index) => {
    if (!isRecord(step) || typeof step.run !== "string") return;
    if (!runsUnderBash(step.shell ?? inheritedShell)) return;
    const name = typeof step.name === "string" ? ` (${step.name})` : "";
    blocks.push({ where: `${file} ${owner} step ${index}${name}`, body: step.run });
  });
  return blocks;
}

/** Every bash `run:` body in one workflow or composite action file. */
function bashRunBlocks(file: string, text: string): RunBlock[] {
  const document: unknown = parseYaml(text);
  if (!isRecord(document)) return [];
  const blocks: RunBlock[] = [];
  if (isRecord(document.jobs)) {
    for (const [jobId, job] of Object.entries(document.jobs)) {
      if (!isRecord(job)) continue;
      const { shell } = effectiveRunDefaults(document, job);
      blocks.push(...bashBlocksOfSteps(file, `job ${jobId}`, job.steps, shell));
    }
  }
  if (isRecord(document.runs)) {
    blocks.push(...bashBlocksOfSteps(file, "runs", document.runs.steps, undefined));
  }
  return blocks;
}

/** Empty when the body parses cleanly; otherwise bash's own diagnostics. */
function bashSyntaxErrors(body: string): string {
  const result = spawnSync("bash", ["-n"], { input: asShellText(body), encoding: "utf-8" });
  if (result.error) throw result.error;
  const stderr = result.stderr.trim();
  if (result.status === 0 && stderr === "") return "";
  return stderr === "" ? `bash -n exited ${String(result.status)}` : stderr;
}

const ROOTS = [
  path.join(".github", "workflows"),
  path.join(".github", "actions"),
  SHIPPED_WORKFLOWS_REL,
] as const;

describe("bash run blocks parse", () => {
  for (const root of ROOTS) {
    it(`every bash run block under ${root.replace(/\\/g, "/")} passes bash -n`, () => {
      const files = yamlFilesUnder(REPO_ROOT, root);
      const blocks = files.flatMap((file) =>
        bashRunBlocks(file, readFileSync(path.join(REPO_ROOT, file), "utf-8")),
      );
      // A walk that found nothing would pass every assertion below.
      expect(blocks.length, `no bash run blocks found under ${root}`).toBeGreaterThan(0);
      const failures = blocks
        .map((block) => ({ where: block.where, errors: bashSyntaxErrors(block.body) }))
        .filter((failure) => failure.errors !== "");
      expect(failures).toEqual([]);
    });
  }

  describe("the check itself", () => {
    /** A one-step workflow whose `run: |` body is `lines`, each at the block's base indentation. */
    const workflowWith = (lines: readonly string[], shell = "bash"): string =>
      [
        "on: workflow_dispatch",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - name: Heredoc",
        "        run: |",
        ...lines.map((line) => `          ${line}`),
        `        shell: ${shell}`,
        "",
      ].join("\n");

    const errorsOf = (lines: readonly string[]): string => {
      const [block] = bashRunBlocks("fixture.yml", workflowWith(lines));
      if (block === undefined) throw new Error("fixture produced no bash run block");
      return bashSyntaxErrors(block.body);
    };

    const heredocIn = (terminator: string): string[] => [
      "if true; then",
      "  node - <<'BODY'",
      "  console.log(`${{ github.ref }}`);",
      terminator,
      "fi",
    ];

    it("accepts a terminator at the block's base indentation", () => {
      expect(errorsOf(heredocIn("BODY"))).toBe("");
    });

    it("rejects a terminator indented past the block's base", () => {
      expect(errorsOf(heredocIn("  BODY"))).toMatch(/here-document/);
    });

    it("rejects an unterminated heredoc at the end of the body, which bash only warns about", () => {
      expect(errorsOf(["cat <<'BODY'", "text", "  BODY"])).toMatch(/here-document/);
    });

    it("skips steps that run under another shell", () => {
      expect(bashRunBlocks("fixture.yml", workflowWith(heredocIn("  BODY"), "pwsh"))).toEqual([]);
    });
  });
});

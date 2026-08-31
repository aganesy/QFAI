/**
 * E2E: spec-0004 CHG-005 — profile-suffixed validate output, SSOT-sync
 * pair-changed CI lane, R-PROMPT-SCANNER-DRIFT justification ingestion
 * gate. Exercises the user-story surfaces end-to-end against tmpdir
 * fixtures.
 */
// QFAI:SPEC-0004:US-0004-0034
// QFAI:SPEC-0004:US-0004-0035
// QFAI:SPEC-0004:US-0004-0036

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { loadConfig } from "../../src/core/config.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

const CHECK_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "scripts",
  "check-prompt-scanner-pair.mjs",
);

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-spec0004-chg005-e2e-${prefix}-`));
}

async function runCheckScript(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP("node", [CHECK_SCRIPT, ...args]);
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

let root: string;

beforeEach(async () => {
  root = await newRoot("base");
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("US-0004-0034: profile-suffixed validate output + always-latest validate.json", () => {
  it("writes .qfai/report/validate-<profile>.json per invocation and refreshes always-latest validate.json with profile field", async () => {
    await runValidate({ root, strict: false, profile: "prototyping" });
    await runValidate({ root, strict: false, profile: "tdd" });

    expect(await pathExists(path.join(root, ".qfai/report/validate-prototyping.json"))).toBe(true);
    expect(await pathExists(path.join(root, ".qfai/report/validate-tdd.json"))).toBe(true);

    const latest = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate.json"), "utf-8"),
    ) as { profile?: string };
    expect(latest.profile).toBe("tdd");
  });
});

describe("US-0004-0035: SSOT-sync pair-changed CI lane rejects single-half edits", () => {
  it("fails when only the scanner changed and passes when both changed", async () => {
    const scannerOnly = await runCheckScript(["--changed", SCANNER_REL]);
    expect(scannerOnly.code).not.toBe(0);
    expect(scannerOnly.stdout + scannerOnly.stderr).toMatch(/R-PROMPT-SCANNER-DRIFT/);

    const both = await runCheckScript(["--changed", `${SCANNER_REL},${PROMPT_REL}`]);
    expect(both.code).toBe(0);
  });
});

describe("US-0004-0036: qfai validate rejects R-PROMPT-SCANNER-DRIFT with empty justification", () => {
  it("validate exits error when the finding has whitespace-only justification; accepts 3-part justification", async () => {
    const dir = path.join(root, ".qfai/review/review-2026-05-25");
    await mkdir(dir, { recursive: true });

    // Empty-justification report → error.
    await writeFile(
      path.join(dir, "reviewer-completion.json"),
      JSON.stringify({ findings: [{ code: "R-PROMPT-SCANNER-DRIFT", justification: "" }] }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const empty = await validateReviewerJustification(root, config);
    expect(empty.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT")[0]?.severity).toBe("error");

    // 3-part justification → no error issue.
    await writeFile(
      path.join(dir, "reviewer-completion.json"),
      JSON.stringify({
        findings: [
          {
            code: "R-PROMPT-SCANNER-DRIFT",
            justification:
              "modified=designMdViolations.ts, un-paired=generator-prompt.md, clause=color-literal-ban",
          },
        ],
      }),
      "utf-8",
    );
    const populated = await validateReviewerJustification(root, config);
    expect(populated.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT")).toEqual([]);
  });
});

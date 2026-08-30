/**
 * Integration: spec-0004 CHG-005 — Profile-suffixed validate output +
 * SSOT-sync pair-changed CI lane + Reviewer-Gate justification
 * ingestion gate.
 *
 * Covers TC-0004-0055..0066.
 */
// QFAI:SPEC-0004:TC-0004-0055
// QFAI:SPEC-0004:TC-0004-0056
// QFAI:SPEC-0004:TC-0004-0057
// QFAI:SPEC-0004:TC-0004-0058
// QFAI:SPEC-0004:TC-0004-0059
// QFAI:SPEC-0004:TC-0004-0060
// QFAI:SPEC-0004:TC-0004-0061
// QFAI:SPEC-0004:TC-0004-0062
// QFAI:SPEC-0004:TC-0004-0063
// QFAI:SPEC-0004:TC-0004-0064
// QFAI:SPEC-0004:TC-0004-0065
// QFAI:SPEC-0004:TC-0004-0066

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { runPrototypingCertify } from "../../src/cli/commands/prototypingCertify.js";
import { loadConfig } from "../../src/core/config.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFileP = promisify(execFile);

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-spec0004-chg005-${prefix}-`));
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

async function seedReviewerReport(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "review", "review-2026-05-25");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "reviewer-completion.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

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

let root: string;

beforeEach(async () => {
  root = await newRoot("base");
});

afterEach(async () => {
  await removeTempTree(root);
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-0120 — Profile-suffixed validate output
// ────────────────────────────────────────────────────────────────────────────

describe("TC-0004-0055: profile-suffixed path written per invocation", () => {
  it("running --profile prototyping then --profile default produces both validate-<profile>.json files with independent contents", async () => {
    await runValidate({ root, strict: false, profile: "prototyping" });
    await runValidate({ root, strict: false, profile: "tdd" });

    const protoPath = path.join(root, ".qfai/report/validate-prototyping.json");
    const defaultPath = path.join(root, ".qfai/report/validate-tdd.json");

    expect(await pathExists(protoPath)).toBe(true);
    expect(await pathExists(defaultPath)).toBe(true);

    const protoBody = JSON.parse(await readFile(protoPath, "utf-8")) as { profile?: string };
    const defaultBody = JSON.parse(await readFile(defaultPath, "utf-8")) as { profile?: string };
    expect(protoBody.profile).toBe("prototyping");
    expect(defaultBody.profile).toBe("tdd");
    // Independent — at minimum the `profile` field differs.
    expect(protoBody.profile).not.toBe(defaultBody.profile);
  });
});

describe("TC-0004-0056: always-latest validate.json#profile reflects most-recent run", () => {
  it("top-level profile field flips between consecutive profile invocations", async () => {
    const alwaysLatest = path.join(root, ".qfai/report/validate.json");

    await runValidate({ root, strict: false, profile: "prototyping" });
    let body = JSON.parse(await readFile(alwaysLatest, "utf-8")) as { profile?: string };
    expect(body.profile).toBe("prototyping");

    await runValidate({ root, strict: false, profile: "tdd" });
    body = JSON.parse(await readFile(alwaysLatest, "utf-8")) as { profile?: string };
    expect(body.profile).toBe("tdd");
  });
});

describe("TC-0004-0057: legacy .qfai/output/validate.json path retained under deprecation window", () => {
  it("legacy path is written on every pre-sunset run, including the first on a clean checkout", async () => {
    // BR-0004-0026: the compatibility write runs for the whole window and is
    // NOT gated on evidence. A consumer reading `.qfai/output/` from a fresh
    // clone has left no evidence to find, so withholding the write would break
    // it before the announced sunset (#238 review).
    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.9.1",
    });
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(true);

    const body = JSON.parse(await readFile(legacy, "utf-8")) as { issues?: unknown };
    expect(body.issues).toBeDefined();
  });

  it("D-DEPRECATED-PATH warning body literally contains `sunset: 1.10.0` for a legacy-pointing consumer", async () => {
    // AC-0004-0032's Given: "a downstream project that still reads from the
    // legacy path". The config naming the legacy literal is that evidence —
    // pre-sunset the file's mere presence is not, because the tool deposits it
    // itself on every run.
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["output:", "  validateJsonPath: .qfai/output/validate.json", ""].join("\n"),
      "utf-8",
    );

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.9.1",
    });
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(true);

    const body = JSON.parse(await readFile(legacy, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("warning");
    expect(dep?.message).toContain("sunset: 1.10.0");
  });
});

describe("TC-0004-0058: legacy path escalates to error at tool version 1.10.0 when consumer evidence exists", () => {
  it("D-DEPRECATED-PATH escalates to error and validate does NOT write the legacy file (but a pre-existing legacy file from a prior consumer remains)", async () => {
    // Seed a stale legacy file (simulating a prior pre-sunset write or a
    // consumer-managed file). This is the on-disk evidence the new
    // post-sunset emission gate keys off.
    const legacy = path.join(root, ".qfai/output/validate.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    const stalePlaceholder = '{"stale": "pre-sunset placeholder"}';
    await writeFile(legacy, stalePlaceholder, "utf-8");

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });

    // Legacy file still exists (validate did NOT delete it), but content
    // is unchanged — validate did NOT write to it under post-sunset.
    expect(await pathExists(legacy)).toBe(true);
    const legacyContent = await readFile(legacy, "utf-8");
    expect(legacyContent).toBe(stalePlaceholder);

    // The escalated finding appears in the always-latest report so
    // operators see why the legacy file is now stale.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("error");
  });

  it("D-DEPRECATED-PATH is SUPPRESSED at tool version 1.10.0 when no legacy file is on disk (no consumer evidence)", async () => {
    // No pre-seed: clean project never used the legacy path.
    const legacy = path.join(root, ".qfai/output/validate.json");
    expect(await pathExists(legacy)).toBe(false);

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });

    // Legacy file still absent — validate did not create it.
    expect(await pathExists(legacy)).toBe(false);

    // D-DEPRECATED-PATH must NOT be emitted: there is no consumer
    // evidence and the user never touched the legacy path.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-0102 — Pair-changed CI lane (script: scripts/check-prompt-scanner-pair.mjs)
// ────────────────────────────────────────────────────────────────────────────

async function runCheckScript(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileP("node", [CHECK_SCRIPT, ...args], {
      cwd: process.cwd(),
    });
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

describe("TC-0004-0059: pair-changed lane fails when only scanner changes", () => {
  it("scanner-only PR emits R-PROMPT-SCANNER-DRIFT naming the scanner and un-paired prompt", async () => {
    const result = await runCheckScript(["--changed", SCANNER_REL]);
    expect(result.code).not.toBe(0);
    const out = result.stdout + result.stderr;
    expect(out).toMatch(/R-PROMPT-SCANNER-DRIFT/);
    expect(out).toMatch(/designMdViolations\.ts/);
    expect(out).toMatch(/generator-prompt\.md/);
    expect(out).toMatch(/clause=/);
  });
});

describe("TC-0004-0060: pair-changed lane fails when only prompt changes", () => {
  it("prompt-only PR emits R-PROMPT-SCANNER-DRIFT naming the prompt and un-paired scanner", async () => {
    const result = await runCheckScript(["--changed", PROMPT_REL]);
    expect(result.code).not.toBe(0);
    const out = result.stdout + result.stderr;
    expect(out).toMatch(/R-PROMPT-SCANNER-DRIFT/);
    expect(out).toMatch(/generator-prompt\.md/);
    expect(out).toMatch(/designMdViolations\.ts/);
  });
});

describe("TC-0004-0061: pair-changed lane passes when both halves change", () => {
  it("both-changed PR passes the lane silently with no drift finding", async () => {
    const result = await runCheckScript(["--changed", `${SCANNER_REL},${PROMPT_REL}`]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});

describe("TC-0004-0062: pair-changed lane passes when neither half changes", () => {
  it("neither-changed PR (README typo etc.) passes the lane silently", async () => {
    const result = await runCheckScript(["--changed", "README.md"]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toMatch(/R-PROMPT-SCANNER-DRIFT/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-0125 — Justification ingestion gate
// ────────────────────────────────────────────────────────────────────────────

describe("TC-0004-0063: validate rejects empty-justification R-PROMPT-SCANNER-DRIFT", () => {
  it("whitespace-only justification exits validate error severity", async () => {
    await seedReviewerReport(root, {
      findings: [{ code: "R-PROMPT-SCANNER-DRIFT", justification: "   " }],
    });
    const issues = await validateReviewerJustification(root, await getConfig(root));
    const drift = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(drift.length).toBe(1);
    expect(drift[0]?.severity).toBe("error");
  });
});

describe("TC-0004-0064: validate accepts 3-part justification R-PROMPT-SCANNER-DRIFT", () => {
  it("modified file + counterpart + clause justification is accepted", async () => {
    await seedReviewerReport(root, {
      findings: [
        {
          code: "R-PROMPT-SCANNER-DRIFT",
          justification:
            "modified=packages/qfai/src/core/prototyping/designMdViolations.ts, " +
            "un-paired=packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md, " +
            "clause=color-literal-ban",
        },
      ],
    });
    const issues = await validateReviewerJustification(root, await getConfig(root));
    const drift = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(drift).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Certify + post-sunset consumer
// ────────────────────────────────────────────────────────────────────────────

describe("TC-0004-0065: certify profile-mismatch surfaces recovery command", () => {
  it("certify aborts naming observed/expected profiles and prints recovery command", async () => {
    // Seed minimal prototyping.json + verify.json + DESIGN.md + a
    // validate.json with the WRONG profile.
    const protoDir = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(protoDir, { recursive: true });
    await writeFile(
      path.join(protoDir, "prototyping.json"),
      JSON.stringify({
        runId: "run-x",
        phase: "prototyping",
        designMd: { sha256: "0".repeat(64) },
        reviewerGate: { result: "PASS" },
        iterations: [{}],
        specsCovered: ["0004"],
      }),
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai/output"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "PASS" }),
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai/report"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/report/validate.json"),
      JSON.stringify({ counts: { error: 0 }, profile: "tdd" }),
      "utf-8",
    );

    // Capture stderr from runPrototypingCertify.
    const errs: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stderr as any).write = (chunk: string | Uint8Array) => {
      errs.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    };
    let exitCode = 0;
    try {
      exitCode = await runPrototypingCertify({ root, check: false });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.stderr as any).write = origErr;
    }

    expect(exitCode).not.toBe(0);
    const combined = errs.join("");
    expect(combined).toMatch(/tdd/);
    expect(combined).toMatch(/prototyping/);
    expect(combined).toMatch(/qfai validate --profile prototyping --fail-on error/);
  });
});

describe("TC-0004-0066: legacy validate.json path escalates to error post sunset", () => {
  it("consumer pointed at legacy path under tool 1.10.0+ surfaces D-DEPRECATED-PATH at error severity", async () => {
    // "Consumer pointed at legacy path" = the legacy file exists on disk
    // (from a prior pre-sunset run OR a manually-managed consumer write).
    // The post-sunset gate keys off this evidence to avoid noise on
    // projects that never used the legacy surface.
    const legacy = path.join(root, ".qfai/output/validate.json");
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, '{"stale": "prior consumer write"}', "utf-8");

    await runValidate({
      root,
      strict: false,
      profile: "prototyping",
      toolVersionOverride: "1.10.0",
    });
    // The escalated finding appears in the always-latest report; the legacy
    // path is no longer being written by validate post-sunset, so a
    // consumer reading the legacy path will be blocked and the
    // operator-facing escalated D-DEPRECATED-PATH names the cutoff.
    const latest = path.join(root, ".qfai/report/validate.json");
    const body = JSON.parse(await readFile(latest, "utf-8")) as {
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    const dep = body.issues.find((i) => i.code === "D-DEPRECATED-PATH");
    expect(dep).toBeDefined();
    expect(dep?.severity).toBe("error");
    expect(dep?.message).toContain("1.10.0");
  });
});

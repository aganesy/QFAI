/**
 * Integration: Reviewer-Gate R-CERTIFY-VERIFY-CIRCULAR emission and
 * the option-B compliant control path.
 *
 * The validator inspects `.qfai/output/verify.json#scope` against the
 * concurrent prototyping-phase signal at `.qfai/output/prototyping.json`.
 * When a prototyping-phase context consumes verify.json with
 * scope="atdd" or scope="full" the gate raises
 * R-CERTIFY-VERIFY-CIRCULAR (error). When scope="prototyping" (or no
 * prototyping-phase context exists) the gate stays silent.
 */
// QFAI:SPEC-0015:TC-0015-0017
// QFAI:SPEC-0015:TC-0015-0018

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateReviewerGate } from "../../src/core/validators/reviewerGate.js";

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

async function seedVerifyJson(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "output");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "verify.json"), JSON.stringify(body, null, 2), "utf-8");
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "output");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body, null, 2), "utf-8");
}

let root: string;

beforeEach(async () => {
  root = await newRoot("revgate-cycle");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0017: Reviewer Gate emits R-CERTIFY-VERIFY-CIRCULAR on regressed certify path", () => {
  it("emits R-CERTIFY-VERIFY-CIRCULAR at severity error with 3-part justification when verify.json scope=atdd is consumed at prototyping phase", async () => {
    await seedVerifyJson(root, { status: "PASS", scope: "atdd" });
    await seedPrototypingJson(root, { phase: "prototyping", runId: "run-1" });

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // 3-part justification: (1) certify path, (2) offending validator-output
    // profile, (3) option-B contract clause violated.
    expect(f?.message).toMatch(/\.qfai\/output\/verify\.json/);
    expect(f?.message).toMatch(/atdd/);
    expect(f?.message).toMatch(/option-?B/i);
  });

  it("emits R-CERTIFY-VERIFY-CIRCULAR when verify.json scope=full is consumed at prototyping phase", async () => {
    await seedVerifyJson(root, { status: "PASS", scope: "full" });
    await seedPrototypingJson(root, { phase: "prototyping", runId: "run-1" });

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toMatch(/full/);
  });
});

describe("TC-0015-0018: Option-B compliant certify passes without R-CERTIFY-VERIFY-CIRCULAR (control)", () => {
  it("does NOT emit R-CERTIFY-VERIFY-CIRCULAR when verify.json scope=prototyping", async () => {
    await seedVerifyJson(root, { status: "PASS", scope: "prototyping" });
    await seedPrototypingJson(root, { phase: "prototyping", runId: "run-1" });

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(0);
  });

  it("does NOT emit R-CERTIFY-VERIFY-CIRCULAR when verify.json is absent", async () => {
    // No verify.json on disk — nothing to evaluate.
    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(0);
  });

  it("does NOT emit R-CERTIFY-VERIFY-CIRCULAR when no prototyping-phase context exists", async () => {
    // Verify.json with broad scope but no prototyping.json — there is no
    // prototyping-phase consumer so the circular-read concern does not apply.
    await seedVerifyJson(root, { status: "PASS", scope: "atdd" });

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(0);
  });
});

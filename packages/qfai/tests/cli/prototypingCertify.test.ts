/**
 * Tests for `qfai prototyping certify` and `qfai prototyping show-spec`
 * (v1.8.4 Phase 5).
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  runPrototypingCertify,
  runPrototypingShowSpec,
} from "../../src/cli/commands/prototypingCertify.js";
import { COMPLETION_CERTIFICATE_REL_PATH } from "../../src/core/prototyping/certificate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-cert-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedMinimalProject(root: string, opts?: { specMarker?: boolean }): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0012"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/01_Spec.md"),
    opts?.specMarker ? "---\nsurface_type: ui-bearing\n---\n\n# spec-0012\n" : "# spec-0012\n",
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/specs/spec-0012/02_User-stories.md"),
    "# stories\n",
    "utf-8",
  );
}

async function seedAllGatesPass(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai/output"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/output/validate.json"),
    JSON.stringify({ counts: { error: 0, warning: 0, info: 0 } }),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/output/verify.json"),
    JSON.stringify({ status: "PASS" }),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping.json"),
    JSON.stringify({
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
      surface: "web",
      fullHarness: { runId: "run-test-2026" },
      reviewerGate: {
        result: "PASS",
        signoff: { reviewer: "test-reviewer", timestamp: "2026-04-27T00:00:00Z" },
      },
      rounds: [{ round: "r5" }, { round: "r3" }],
      polishCycles: [{ cycle: 1, kind: "polish" }],
    }),
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
    "{}\n",
    "utf-8",
  );
}

describe("qfai prototyping certify (generate)", () => {
  it("writes completion-certificate.json when all gates pass", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);

    const exit = await runPrototypingCertify({ root, check: false });

    expect(exit).toBe(0);
    const certPath = path.join(root, COMPLETION_CERTIFICATE_REL_PATH);
    const body = JSON.parse(
      await (await import("node:fs/promises")).readFile(certPath, "utf-8"),
    ) as { runId: string; specsCovered: string[]; reviewerSignoff: { reviewer: string } };
    expect(body.runId).toBe("run-test-2026");
    expect(body.specsCovered).toEqual(["0012"]);
    expect(body.reviewerSignoff.reviewer).toBe("test-reviewer");
  });

  it("exits 2 when prototyping.json is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when fullHarness.runId is missing", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping.json"),
      JSON.stringify({ mode: { effective: "standard", source: "test", rationale: "x" } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when validate.json reports errors", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Override validate.json with errors
    await writeFile(
      path.join(root, ".qfai/output/validate.json"),
      JSON.stringify({ counts: { error: 3, warning: 0, info: 0 } }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when verify.json status is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    await writeFile(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "FAIL" }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });

  it("exits 2 when reviewerGate is not PASS", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedAllGatesPass(root);
    // Re-seed prototyping.json without reviewerGate.result === PASS
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping.json"),
      JSON.stringify({
        mode: { effective: "standard", source: "test", rationale: "x" },
        fullHarness: { runId: "run-x" },
        reviewerGate: { result: "REVISE" },
      }),
      "utf-8",
    );
    const exit = await runPrototypingCertify({ root, check: false });
    expect(exit).toBe(2);
  });
});

describe("qfai prototyping certify --check", () => {
  it("exits 0 when certificate matches current evidence", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    expect(await runPrototypingCertify({ root, check: false })).toBe(0);
    expect(await runPrototypingCertify({ root, check: true })).toBe(0);
  });

  it("exits 2 when certificate is absent", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });

  it("exits 2 when evidence has been modified after certify", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    await seedAllGatesPass(root);
    await runPrototypingCertify({ root, check: false });
    await writeFile(
      path.join(root, ".qfai/evidence/prototyping/some-evidence.json"),
      '{"modified":true}\n',
      "utf-8",
    );
    expect(await runPrototypingCertify({ root, check: true })).toBe(2);
  });
});

describe("qfai prototyping show-spec", () => {
  it("returns 0 when a marker-bearing spec exists", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: true });
    expect(await runPrototypingShowSpec({ root })).toBe(0);
  });

  it("returns 2 when no spec has the prototyping marker", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { specMarker: false });
    expect(await runPrototypingShowSpec({ root })).toBe(2);
  });
});

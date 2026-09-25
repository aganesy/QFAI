import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { createDoctorData } from "../../src/core/doctor.js";
import { captureStdout } from "../helpers/stdout.js";
import {
  editShippedWorkflow,
  quietUnrelatedWarnings,
  runDoctorText,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const workflowPool = useAdopterTreePool();

async function withWorkspace(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-acceptance-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function check(data: Awaited<ReturnType<typeof createDoctorData>>, id: string) {
  const found = data.checks.find((entry) => entry.id === id);
  expect(found, `missing doctor check ${id}`).toBeDefined();
  return found;
}

describe("BF-0003 doctor acceptance", () => {
  // QFAI:AC-0003-0001-01
  it("reports an existing configuration and its path", async () => {
    await withWorkspace(async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: stories\n");
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(data.config).toMatchObject({ found: true, configPath: "qfai.config.yaml" });
      expect(check(data, "config.search")).toMatchObject({
        severity: "ok",
        details: { configPath: "qfai.config.yaml" },
      });
    });
  });

  // QFAI:AC-0003-0001-02
  it("warns when the configuration is absent without creating it", async () => {
    await withWorkspace(async (root) => {
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(data.config.found).toBe(false);
      expect(check(data, "config.search")).toMatchObject({ severity: "warning" });
      expect(check(data, "config.search")?.message).toContain("qfai.config.yaml not found");
      const files = await readdir(root);
      expect(files).not.toContain("qfai.config.yaml");
    });
  });

  // QFAI:AC-0003-0002-01
  // QFAI:AC-0003-0003-01
  it("diagnoses each missing configured directory by its own path key", async () => {
    await withWorkspace(async (root) => {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: custom/stories\n  contractsDir: custom/contracts\n  discussionDir: custom/discussion\n  testsDir: custom/tests\n",
      );
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      for (const [key, relative] of [
        ["specsDir", "custom/stories"],
        ["contractsDir", "custom/contracts"],
        ["discussionDir", "custom/discussion"],
        ["testsDir", "custom/tests"],
      ]) {
        expect(check(data, `paths.${key}`)).toMatchObject({
          severity: "warning",
          details: { path: relative },
        });
      }
      await mkdir(path.join(root, "custom/stories"), { recursive: true });
      const repaired = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(check(repaired, "paths.specsDir")?.severity).toBe("ok");
      expect(check(repaired, "paths.testsDir")?.severity).toBe("warning");
    });
  });

  // QFAI:AC-0003-0004-01
  // QFAI:EX-0003-0004-01
  it("warns about a configured legacy prompts directory and names the replacement", async () => {
    await withWorkspace(async (root) => {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  promptsDir: .qfai/assistant/legacy-prompts\n",
      );
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const legacy = check(data, "paths.promptsDirDeprecated");
      expect(legacy).toMatchObject({
        severity: "warning",
        details: { path: ".qfai/assistant/legacy-prompts", configured: true },
      });
      expect(legacy?.message).toContain("migrate to skillsDir");

      const output = await captureStdout(async () => {
        await runDoctor({ root, rootExplicit: true, format: "text", failOn: "error" });
      });
      expect(output).toMatch(/\[warning\] paths\.promptsDirDeprecated:/u);
    });
  });

  // QFAI:AC-0003-0005-01
  // QFAI:AC-0003-0005-02
  it("emits machine-readable diagnosis and writes the same result to --out", async () => {
    await withWorkspace(async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: custom/stories\n");
      const outputPath = path.join(root, "doctor.json");
      const output = await captureStdout(async () => {
        const status = await runDoctor({
          root,
          rootExplicit: true,
          format: "json",
          failOn: "error",
        });
        expect(status).toBe(0);
      });
      const writeMessage = await captureStdout(async () => {
        const status = await runDoctor({
          root,
          rootExplicit: true,
          format: "json",
          failOn: "error",
          outPath: outputPath,
        });
        expect(status).toBe(0);
      });
      const stdoutData: unknown = JSON.parse(output);
      const fileData: unknown = JSON.parse(await readFile(outputPath, "utf8"));
      expect(stdoutData).toMatchObject({
        root: path.relative(process.cwd(), root).replace(/\\/g, "/"),
        config: { found: true },
        checks: expect.any(Array),
        summary: { warning: expect.any(Number), error: 0 },
      });
      expect(fileData).toMatchObject({
        root: path.relative(process.cwd(), root).replace(/\\/g, "/"),
        config: { found: true },
        checks: expect.any(Array),
      });
      expect(writeMessage).toContain(`doctor: wrote ${outputPath}`);
    });
  });

  // QFAI:AC-0003-0012-01
  // QFAI:AC-0003-0012-02
  it("applies the chosen failure threshold to the same warning finding", async () => {
    await withWorkspace(async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: custom/stories\n");
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(check(data, "paths.specsDir")?.severity).toBe("warning");
      let onError = -1;
      await captureStdout(async () => {
        onError = await runDoctor({ root, rootExplicit: true, format: "json", failOn: "error" });
      });
      let onWarning = -1;
      await captureStdout(async () => {
        onWarning = await runDoctor({
          root,
          rootExplicit: true,
          format: "json",
          failOn: "warning",
        });
      });
      expect(onError).toBe(0);
      expect(onWarning).toBe(1);
    });
  });

  // QFAI:AC-0003-0011-02
  it("places shipped-workflow drift in the advisory group without blocking errors", async () => {
    const root = await workflowPool.seedAdopterTree();
    await quietUnrelatedWarnings(root);
    await editShippedWorkflow(root, "qfai-tests.yml");

    const data = await createDoctorData({ startDir: root, rootExplicit: true });
    expect(check(data, "workflows.integrity")?.severity).toBe("info");
    const result = await runDoctorText(root, "error");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("== warnings advisory of drift ==");
    const advisory = result.stdout.split("== warnings advisory of drift ==")[1];
    expect(advisory).toContain("[info] workflows.integrity:");
  });
});

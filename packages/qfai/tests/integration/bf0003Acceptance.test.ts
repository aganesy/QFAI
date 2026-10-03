import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { createDoctorData } from "../../src/core/doctor.js";
import { isEperm } from "../../src/core/fs/errno.js";
import { captureStdout } from "../helpers/stdout.js";

async function withWorkspace(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0003-acceptance-"));
  try {
    // A project carries the document-schema lane; doctor reports its absence as an error.
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, ".github", "workflows", "qfai-docs.yml"), "name: qfai-docs\n");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Runs `qfai validate` and returns the `QFAI-CFG-LINK-002` issues it wrote to validate.json. */
async function linkIssuesFromValidate(root: string) {
  await captureStdout(async () => {
    await runValidate({ root, strict: false, format: "text" });
  });
  const report: { issues: Array<{ code: string; rule?: string; severity: string }> } = JSON.parse(
    await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf-8"),
  );
  return report.issues.filter((found) => found.code === "QFAI-CFG-LINK-002");
}

/** Creates a link to a target that is absent; false only where Windows withholds the privilege. */
async function tryBrokenLink(root: string, linkPath: string): Promise<boolean> {
  try {
    await symlink(path.join(root, "missing-target"), linkPath);
    return true;
  } catch (error: unknown) {
    if (process.platform === "win32" && isEperm(error)) {
      return false;
    }
    throw error;
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

  // QFAI:AC-0003-0003-02
  // QFAI:EX-0003-0003-02
  it("reports an absent shipped-default path and a missing validate.json at info", async () => {
    await withWorkspace(async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: stories\n");
      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(check(data, "paths.srcDir")).toMatchObject({ severity: "info" });
      expect(check(data, "paths.srcDir")?.message).toContain("the project has no source yet");
      expect(check(data, "paths.testsDir")).toMatchObject({ severity: "info" });
      expect(check(data, "paths.testsDir")?.message).toContain("the project has no tests yet");
      expect(check(data, "paths.outDir")).toMatchObject({ severity: "info" });
      expect(check(data, "paths.outDir")?.message).toContain(
        "the first `qfai validate` creates it",
      );
      expect(check(data, "output.validateJson")).toMatchObject({ severity: "info" });
      expect(check(data, "output.validateJson")?.message).toContain("qfai validate");
    });
  });

  // QFAI:AC-0003-0003-03
  // QFAI:EX-0003-0003-03
  it("raises QFAI-CFG-LINK-002 at info for an absent shipped-default source and test directories", async () => {
    await withWorkspace(async (root) => {
      const linkIssues = await linkIssuesFromValidate(root);

      expect(
        linkIssues.find((found) => found.rule === "config.paths.srcDir.reality"),
      ).toMatchObject({ severity: "info" });
      expect(
        linkIssues.find((found) => found.rule === "config.paths.testsDir.reality"),
      ).toMatchObject({ severity: "info" });
      expect(linkIssues.some((found) => found.rule === "config.paths.outDir.reality")).toBe(false);
    });
  });

  // QFAI:AC-0003-0003-03
  // QFAI:EX-0003-0003-04
  it("keeps QFAI-CFG-LINK-002 at warning where a file or a broken link stands at the shipped-default source path", async () => {
    await withWorkspace(async (root) => {
      const srcPath = path.join(root, "src");
      await writeFile(srcPath, "not a directory", "utf-8");
      expect(
        (await linkIssuesFromValidate(root)).find(
          (found) => found.rule === "config.paths.srcDir.reality",
        ),
      ).toMatchObject({ severity: "warning" });

      await rm(srcPath);
      if (!(await tryBrokenLink(root, srcPath))) {
        return;
      }
      expect(
        (await linkIssuesFromValidate(root)).find(
          (found) => found.rule === "config.paths.srcDir.reality",
        ),
      ).toMatchObject({ severity: "warning" });
    });
  });

  // QFAI:AC-0003-0003-02
  // QFAI:EX-0003-0003-05
  it("keeps the doctor warning where a broken link stands at the shipped-default source path", async () => {
    await withWorkspace(async (root) => {
      if (!(await tryBrokenLink(root, path.join(root, "src")))) {
        return;
      }
      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(check(data, "paths.srcDir")).toMatchObject({ severity: "warning" });
      expect(check(data, "paths.srcDir")?.message).not.toContain("no source yet");
    });
  });

  // QFAI:AC-0003-0003-02
  // QFAI:EX-0003-0003-06
  it("keeps the doctor warning where a directory or a broken link stands at the validate.json path", async () => {
    await withWorkspace(async (root) => {
      const reportDir = path.join(root, ".qfai", "report");
      const reportPath = path.join(reportDir, "validate.json");
      await mkdir(reportPath, { recursive: true });
      const asDirectory = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(check(asDirectory, "output.validateJson")).toMatchObject({ severity: "warning" });

      await rm(reportPath, { recursive: true });
      if (!(await tryBrokenLink(root, reportPath))) {
        return;
      }
      const asLink = await createDoctorData({ startDir: root, rootExplicit: true });
      expect(check(asLink, "output.validateJson")).toMatchObject({ severity: "warning" });
    });
  });

  // QFAI:AC-0003-0003-02
  // QFAI:EX-0003-0003-02
  it("reads a shipped default spelled with a leading ./ as the default", async () => {
    await withWorkspace(async (root) => {
      await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  srcDir: ./src\n");
      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(check(data, "paths.srcDir")).toMatchObject({ severity: "info" });
      expect(check(data, "paths.srcDir")?.message).toContain("no source yet");
    });
  });

  // QFAI:AC-0003-0003-02
  // QFAI:EX-0003-0003-02
  it("still warns for a source directory that is not the shipped default", async () => {
    await withWorkspace(async (root) => {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: stories\n  srcDir: lib\n  outDir: build/report\n",
      );
      const data = await createDoctorData({ startDir: root, rootExplicit: true });

      expect(check(data, "paths.srcDir")).toMatchObject({
        severity: "warning",
        details: { path: "lib" },
      });
      expect(check(data, "paths.outDir")).toMatchObject({ severity: "warning" });
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
});

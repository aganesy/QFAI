import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";
import { captureStdout } from "../helpers/stdout.js";

// This suite runs end-to-end CLI flows (`init` + `doctor`) with real
// filesystem work, so we keep a higher timeout to prevent CI flakiness.
describe("doctor", { timeout: 60000 }, () => {
  it("finds config in parent when --root is omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const cwd = path.join(root, "packages", "app");
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await mkdir(cwd, { recursive: true });

      const output = await captureStdout(async () => {
        await run(["doctor"], cwd);
      });

      expect(output).toContain("qfai doctor:");
      expect(output).toContain("found");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes json output to --out", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const parsed = await readDoctorData(root);
      expect(parsed.tool).toBe("qfai");
      expect(Array.isArray(parsed.checks)).toBe(true);
      expect(typeof parsed.summary?.ok).toBe("number");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports skills.local as info when it exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const parsed = await readDoctorData(root);
      const check = findCheck(parsed.checks, "paths.skillsLocalDir");
      expect(check?.severity).toBe("info");
      expect(typeof parsed.summary?.info).toBe("number");
      expect((parsed.summary?.info ?? 0) >= 1).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("orders checks by config -> paths -> spec -> output -> traceability", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const parsed = await readDoctorData(root);
      const ids = parsed.checks.map((check) => check.id);
      const indexOf = (id: string): number => {
        const index = ids.indexOf(id);
        expect(index).toBeGreaterThanOrEqual(0);
        return index;
      };
      const pathKeys = [
        "specsDir",
        "contractsDir",
        "requireDir",
        "outDir",
        "srcDir",
        "testsDir",
        "skillsDir",
      ];
      const pathIndices = pathKeys.map((key) => indexOf(`paths.${key}`));
      const promptsDeprecated = indexOf("paths.promptsDirDeprecated");

      const configSearch = indexOf("config.search");
      const configLoad = indexOf("config.load");
      const specLayout = indexOf("spec.layout");
      const guardrails = indexOf("guardrails.present");
      const outputValidate = indexOf("output.validateJson");
      const outputAlignment = indexOf("output.pathAlignment");
      const outDirCollision = indexOf("output.outDirCollision");
      const traceability = indexOf("traceability.testGlobs");

      expect(configLoad).toBeGreaterThan(configSearch);
      expect(Math.min(...pathIndices)).toBeGreaterThan(configLoad);
      expect(promptsDeprecated).toBeGreaterThan(Math.max(...pathIndices));
      expect(specLayout).toBeGreaterThan(promptsDeprecated);
      expect(guardrails).toBeGreaterThan(specLayout);
      expect(outputValidate).toBeGreaterThan(guardrails);
      expect(outputAlignment).toBeGreaterThan(outputValidate);
      expect(outDirCollision).toBeGreaterThan(outputAlignment);
      expect(traceability).toBeGreaterThan(outDirCollision);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when spec pack files are missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const specPackDir = path.join(root, ".qfai", "specs", "spec-0001");
      await rm(specPackDir, { recursive: true, force: true });
      await mkdir(specPackDir, { recursive: true });
      await writeFile(
        path.join(specPackDir, "spec.md"),
        "# SPEC-0001: Sample Spec\n",
        "utf-8",
      );

      const parsed = await readDoctorData(root);
      const check = findCheck(parsed.checks, "spec.layout");
      expect(check?.severity).toBe("warning");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when legacy file layout is used", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const specPackDir = path.join(root, ".qfai", "specs", "spec-0001");
      await rm(specPackDir, { recursive: true, force: true });
      await mkdir(specPackDir, { recursive: true });
      await writeFile(
        path.join(specPackDir, "spec.md"),
        "# SPEC-0001\n",
        "utf-8",
      );
      await writeFile(path.join(specPackDir, "delta.md"), "# Delta\n", "utf-8");
      await writeFile(
        path.join(specPackDir, "scenario.feature"),
        "Feature: Sample\n",
        "utf-8",
      );
      await writeFile(
        path.join(specPackDir, "case-catalogue.md"),
        "# Case Catalogue\n",
        "utf-8",
      );
      await writeFile(
        path.join(specPackDir, "traceability-matrix.md"),
        "# Traceability Matrix\n",
        "utf-8",
      );
      await writeFile(
        path.join(specPackDir, "implementation-brief.md"),
        "# Implementation Brief\n",
        "utf-8",
      );

      const parsed = await readDoctorData(root);
      const check = findCheck(parsed.checks, "spec.layout");
      // Legacy layout guidance is informational in v1.4.19; hard errors focus
      // on missing required files for layered/spec-pack contracts.
      expect(check?.severity).toBe("info");
      expect(check?.message).toContain("legacy implementation-brief.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when config is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      const parsed = await readDoctorData(root);
      const check = findCheck(parsed.checks, "config.search");
      expect(check?.severity).toBe("warning");
      expect(parsed.config?.found).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns on empty testFileGlobs and output path mismatch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const configPath = path.join(root, "qfai.config.yaml");
      await writeFile(
        configPath,
        [
          "paths:",
          "  specsDir: .qfai/specs",
          "  contractsDir: .qfai/contracts",
          "  requireDir: .qfai/require",
          "  outDir: .qfai/report",
          "  skillsDir: .qfai/assistant/skills",
          "  srcDir: src",
          "  testsDir: tests",
          "validation:",
          "  traceability:",
          "    testFileGlobs: []",
          "output:",
          "  validateJsonPath: validate.json",
          "",
        ].join("\n"),
        "utf-8",
      );

      const parsed = await readDoctorData(root);
      const globsCheck = findCheck(parsed.checks, "traceability.testGlobs");
      const pathCheck = findCheck(parsed.checks, "output.pathAlignment");
      expect(globsCheck?.severity).toBe("warning");
      expect(pathCheck?.severity).toBe("warning");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns when deprecated promptsDir is configured", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const configPath = path.join(root, "qfai.config.yaml");
      await writeFile(
        configPath,
        [
          "paths:",
          "  promptsDir: .qfai/assistant/legacy-prompts",
          "validation:",
          "  traceability:",
          "    testFileGlobs: []",
          "",
        ].join("\n"),
        "utf-8",
      );

      const parsed = await readDoctorData(root);
      const promptsCheck = findCheck(
        parsed.checks,
        "paths.promptsDirDeprecated",
      );
      const skillsCheck = findCheck(parsed.checks, "paths.skillsDir");

      expect(promptsCheck?.severity).toBe("warning");
      expect(promptsCheck?.message).toContain("設定で指定されています");
      expect(skillsCheck?.details?.path).toBe(".qfai/assistant/legacy-prompts");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails with --fail-on warning when warnings exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const outPath = path.join(root, ".qfai", "report", "doctor.json");

      const exitCode = await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath,
        failOn: "warning",
      });

      expect(exitCode).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores warnings with --fail-on error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const outPath = path.join(root, ".qfai", "report", "doctor.json");

      const exitCode = await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath,
        failOn: "error",
      });

      expect(exitCode).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("warns on outDir collisions when rootExplicit is true", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const monorepoRoot = path.join(root, "repo");
    try {
      await mkdir(monorepoRoot, { recursive: true });
      await writeFile(
        path.join(monorepoRoot, "pnpm-workspace.yaml"),
        ["packages:", '  - "packages/*"', ""].join("\n"),
        "utf-8",
      );
      const appA = path.join(monorepoRoot, "packages", "app-a");
      const appB = path.join(monorepoRoot, "packages", "app-b");
      await mkdir(appA, { recursive: true });
      await mkdir(appB, { recursive: true });

      const configText = [
        "paths:",
        "  outDir: ../.qfai/report/shared",
        "",
      ].join("\n");
      await writeFile(path.join(appA, "qfai.config.yaml"), configText, "utf-8");
      await writeFile(path.join(appB, "qfai.config.yaml"), configText, "utf-8");

      const parsed = await readDoctorData(appA);
      const check = findCheck(parsed.checks, "output.outDirCollision");

      expect(check?.severity).toBe("warning");
      expect(Array.isArray(check?.details?.collisions)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

type DoctorCheck = {
  id: string;
  severity: string;
  message?: string;
  details?: Record<string, unknown>;
};

type DoctorData = {
  tool?: string;
  checks: DoctorCheck[];
  config?: { found?: boolean };
  summary?: { ok?: number; info?: number; warning?: number; error?: number };
};

async function readDoctorData(root: string): Promise<DoctorData> {
  const outPath = path.join(root, ".qfai", "report", "doctor.json");
  await runDoctor({
    root,
    rootExplicit: true,
    format: "json",
    outPath,
  });
  const raw = await readFile(outPath, "utf-8");
  return JSON.parse(raw) as DoctorData;
}

function findCheck(checks: DoctorCheck[], id: string): DoctorCheck | undefined {
  return checks.find((check) => check.id === id);
}

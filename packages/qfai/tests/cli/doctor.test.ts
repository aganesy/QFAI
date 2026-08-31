import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { chmod, mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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

  it("resolves a relative --out against the resolved root, not the process cwd", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const relativeOut = "doctor-relative-out.json";
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      await withSandboxCwd(async (sandbox) => {
        await captureStdout(async () => {
          await runDoctor({ root, rootExplicit: true, format: "json", outPath: relativeOut });
        });
        expect(await readdir(sandbox)).toEqual([]);
      });

      const raw = await readFile(path.join(root, relativeOut), "utf-8");
      expect(JSON.parse(raw)).toMatchObject({ tool: "qfai" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves a relative --out against the config root found from a subdirectory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const cwd = path.join(root, "packages", "app");
    const relativeOut = "doctor-subdir-out.json";
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await mkdir(cwd, { recursive: true });

      await withSandboxCwd(async (sandbox) => {
        await captureStdout(async () => {
          await run(["doctor", "--format", "json", "--out", relativeOut], cwd);
        });
        expect(await readdir(sandbox)).toEqual([]);
      });

      const raw = await readFile(path.join(root, relativeOut), "utf-8");
      expect(JSON.parse(raw)).toMatchObject({ tool: "qfai" });
      await expect(stat(path.join(cwd, relativeOut))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not report deprecated skills.local override checks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const parsed = await readDoctorData(root);
      const check = findCheck(parsed.checks, "paths.skillsLocalDir");
      expect(check).toBeUndefined();
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
        "discussionDir",
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
      await writeFile(path.join(specPackDir, "spec.md"), "# SPEC-0001: Sample Spec\n", "utf-8");

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
      await writeFile(path.join(specPackDir, "spec.md"), "# SPEC-0001\n", "utf-8");
      await writeFile(path.join(specPackDir, "delta.md"), "# Delta\n", "utf-8");
      await writeFile(path.join(specPackDir, "scenario.feature"), "Feature: Sample\n", "utf-8");
      await writeFile(path.join(specPackDir, "case-catalogue.md"), "# Case Catalogue\n", "utf-8");
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
      // Legacy layout guidance is informational in v1.4.36; hard errors focus
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
          "  discussionDir: .qfai/discussion",
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

  // `traceability.testGlobs` is the check `/qfai-configure` owns end to end, and
  // its Completion Contract smoke check reads `doctor --fail-on error`'s exit
  // code as the verdict. While globs that matched nothing were `warning`, that
  // exit code was 0 for a configuration collecting no test at all — the one
  // defect the stage exists to prevent — even though `validate` already calls
  // the same state a `QFAI-TRACE-124` error. The two tools have to agree.
  it("errors when configured testFileGlobs match no test file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedScenarioSpecPack(root);
      await writeTestGlobsConfig(root, ["tests/**/*.matches-nothing.ts"]);

      const parsed = await readDoctorData(root);
      const globsCheck = findCheck(parsed.checks, "traceability.testGlobs");
      expect(globsCheck?.severity).toBe("error");
      expect(globsCheck?.details?.["scenarioFiles"]).toBe(1);

      expect(await runDoctorExit(root, "error")).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Over-correction pin: globs that do cover the tree stay `ok`, so a correct
  // configure run is not turned into a permanent completion blocker.
  it("keeps testGlobs ok — and doctor at exit 0 — once the globs match a test", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedScenarioSpecPack(root);
      await mkdir(path.join(root, "tests"), { recursive: true });
      await writeFile(path.join(root, "tests", "sample.test.ts"), "export {};\n", "utf-8");
      await writeTestGlobsConfig(root, ["tests/**/*.test.ts"]);

      const parsed = await readDoctorData(root);
      const globsCheck = findCheck(parsed.checks, "traceability.testGlobs");
      expect(globsCheck?.severity).toBe("ok");

      expect(await runDoctorExit(root, "error")).toBe(0);
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
      const promptsCheck = findCheck(parsed.checks, "paths.promptsDirDeprecated");
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

      const configText = ["paths:", "  outDir: ../.qfai/report/shared", ""].join("\n");
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

  it("adds prototyping profile checks when preflight prerequisites exist", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(parsed.profile).toBe("prototyping");
      expect(findCheck(parsed.checks, "prototyping.primarySpec")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.uiContracts")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.designContracts")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.requiredRoles")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.playwrightCli")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.targetUrl")?.severity).toBe("ok");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("forwards --target-url on doctor --profile prototyping", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, "http://127.0.0.1:9");

      const outPath = path.join(root, ".qfai", "report", "doctor-cli.json");
      await run(
        [
          "doctor",
          "--root",
          root,
          "--profile",
          "prototyping",
          "--target-url",
          server.url,
          "--format",
          "json",
          "--out",
          outPath,
        ],
        root,
      );

      const parsed = JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
      expect(findCheck(parsed.checks, "prototyping.targetUrl")?.severity).toBe("ok");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports prototyping role wrapper failures before runtime execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, ".claude", "agents", "frontend-engineer.md"), { force: true });

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.requiredRoles")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats existing GitHub agent wrappers as sufficient when Claude wrappers are absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, ".claude", "agents"), { recursive: true, force: true });

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.requiredRoles")?.severity).toBe("ok");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports missing literal role inputs before runtime execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, ".github", "instructions", "principles.instructions.md"), {
        force: true,
      });

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.requiredRoles")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports launcher probe failures when only a broken playwright-cli exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    // Probe-order flip (spec-0006 CHG-005): playwright-cli is now the
    // deprecated stage. To force the launcher check into the error path we
    // must also suppress the stage-2 `npx --no-install playwright` fallback,
    // which would otherwise resolve against any developer-host install.
    const originalPath = process.env.PATH;
    process.env.PATH = "";
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await writeTestPlaywrightCli(path.join(root, "node_modules", ".bin"), 1);

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.playwrightCli")?.severity).toBe("error");
    } finally {
      process.env.PATH = originalPath;
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports prototyping design-contract blockers before runtime execution", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      // Remove the brand SSOT to trigger DCON-030; this is the canonical
      // pre-prototyping blocker now that legacy yaml enforcement (DCON-018)
      // is dropped.
      await rm(path.join(root, "DESIGN.md"), { force: true });

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designContracts")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // TC-3.7.x — root DESIGN.md preflight checks
  // ───────────────────────────────────────────────────────────────────────

  it("TC-3.7.1: all designMd checks ok when DESIGN.md + lock + sha agree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdRoot")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.designMdLock")?.severity).toBe("ok");
      expect(findCheck(parsed.checks, "prototyping.designMdSha")?.severity).toBe("ok");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.2: missing DESIGN.md → designMdRoot=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, "DESIGN.md"), { force: true });
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdRoot")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.3: malformed DESIGN.md → designMdRoot=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await writeFile(path.join(root, "DESIGN.md"), "not a front matter\n", "utf-8");
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdRoot")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.4: missing DESIGN.md.lock.yaml → designMdLock=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, ".qfai", "contracts", "design", "DESIGN.md.lock.yaml"), {
        force: true,
      });
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdLock")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.5: lock sha mismatch → designMdSha=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      // Replace lock with a non-matching sha.
      await writeFile(
        path.join(root, ".qfai", "contracts", "design", "DESIGN.md.lock.yaml"),
        [
          'designMdPath: "DESIGN.md"',
          `designMdSha256: "${"0".repeat(64)}"`,
          'frozenAt: "2026-05-05T00:00:00Z"',
          "",
        ].join("\n"),
        "utf-8",
      );
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdSha")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.6: malformed lock yaml → designMdLock=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await writeFile(
        path.join(root, ".qfai", "contracts", "design", "DESIGN.md.lock.yaml"),
        ": : :\n",
        "utf-8",
      );
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdLock")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.7: well-formed but stale lock sha → designMdSha=error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      // 64-hex but doesn't match — same shape as TC-3.7.5.
      await writeFile(
        path.join(root, ".qfai", "contracts", "design", "DESIGN.md.lock.yaml"),
        ['designMdPath: "DESIGN.md"', `designMdSha256: "${"a".repeat(64)}"`, ""].join("\n"),
        "utf-8",
      );
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdSha")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.8: DESIGN.md AND lock missing → both checks error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await rm(path.join(root, "DESIGN.md"), { force: true });
      await rm(path.join(root, ".qfai", "contracts", "design", "DESIGN.md.lock.yaml"), {
        force: true,
      });
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designMdRoot")?.severity).toBe("error");
      expect(findCheck(parsed.checks, "prototyping.designMdLock")?.severity).toBe("error");
    } finally {
      await stopTestServer(server.server);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-3.7.9: existing prototyping checks still fire (additive)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.primarySpec")).toBeDefined();
      expect(findCheck(parsed.checks, "prototyping.uiContracts")).toBeDefined();
      expect(findCheck(parsed.checks, "prototyping.designContracts")).toBeDefined();
      expect(findCheck(parsed.checks, "prototyping.requiredRoles")).toBeDefined();
      expect(findCheck(parsed.checks, "prototyping.playwrightCli")).toBeDefined();
      expect(findCheck(parsed.checks, "prototyping.targetUrl")).toBeDefined();
    } finally {
      await stopTestServer(server.server);
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
  profile?: string;
  checks: DoctorCheck[];
  config?: { found?: boolean };
  summary?: { ok?: number; info?: number; warning?: number; error?: number };
};

async function readDoctorData(
  root: string,
  options?: { profile?: "prototyping"; targetUrl?: string },
): Promise<DoctorData> {
  const outPath = path.join(root, ".qfai", "report", "doctor.json");
  await runDoctor({
    root,
    rootExplicit: true,
    format: "json",
    outPath,
    ...(options?.profile ? { profile: options.profile } : {}),
    ...(options?.targetUrl ? { targetUrl: options.targetUrl } : {}),
  });
  const raw = await readFile(outPath, "utf-8");
  return JSON.parse(raw) as DoctorData;
}

function findCheck(checks: DoctorCheck[], id: string): DoctorCheck | undefined {
  return checks.find((check) => check.id === id);
}

/** The exit code `/qfai-configure`'s smoke check reads as its verdict. */
async function runDoctorExit(root: string, failOn: "warning" | "error"): Promise<number> {
  return runDoctor({
    root,
    rootExplicit: true,
    format: "json",
    outPath: path.join(root, ".qfai", "report", "doctor.json"),
    failOn,
  });
}

/**
 * A spec pack whose scenario file exists, so the SC->Test gate is armed
 * (`collectScenarioFiles` is non-empty). `qfai init` ships no spec packs, which
 * is why a bare init tree never reaches the glob verdict at all.
 */
async function seedScenarioSpecPack(root: string): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(dir, { recursive: true });
  // `01_Spec.md` + `02_User-stories.md` + `05_Examples.md` select the layered
  // layout whose `examplesPath` is `05_Examples.md`.
  await writeFile(path.join(dir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(dir, "02_User-stories.md"), "# User stories\n", "utf-8");
  await writeFile(path.join(dir, "05_Examples.md"), "# Examples\n", "utf-8");
}

async function writeTestGlobsConfig(root: string, globs: string[]): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  specsDir: .qfai/specs",
      "  contractsDir: .qfai/contracts",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/report",
      "  skillsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  traceability:",
      "    scMustHaveTest: true",
      `    testFileGlobs: [${globs.map((glob) => JSON.stringify(glob)).join(", ")}]`,
      "output:",
      "  validateJsonPath: .qfai/report/validate.json",
      "",
    ].join("\n"),
    "utf-8",
  );
}

/**
 * Run `body` with the process cwd pointed at a throwaway directory, handing
 * that directory to the body so it can assert on what landed there.
 *
 * The two relative-`--out` tests assert the negative half of the contract:
 * the artifact must NOT be resolved against the process cwd. Naming that
 * location `path.resolve(process.cwd(), "<fixed name>")` made the cleanup
 * delete a path the test had not necessarily created — a contributor who
 * happened to keep a `doctor-relative-out.json` next to `package.json` would
 * silently lose it, and worst of all on the run where the assertion already
 * failed. Redirecting the cwd instead keeps the regression check honest (a
 * cwd-resolved write still shows up, under any name) while confining every
 * byte the test can produce to a directory it owns outright.
 */
async function withSandboxCwd(body: (sandbox: string) => Promise<void>): Promise<void> {
  const sandbox = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-cwd-"));
  const previous = process.cwd();
  process.chdir(sandbox);
  try {
    await body(sandbox);
  } finally {
    process.chdir(previous);
    await rm(sandbox, { recursive: true, force: true });
  }
}

async function seedPrototypingFixture(root: string, targetUrl: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  specsDir: .qfai/specs",
      "  contractsDir: .qfai/contracts",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/report",
      "  skillsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "prototyping:",
      '  primarySpecId: "0001"',
      "  execution:",
      `    targetUrl: ${targetUrl}`,
      "    browserTool: playwright-cli",
      "",
    ].join("\n"),
    "utf-8",
  );

  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  const designDir = path.join(root, ".qfai", "contracts", "design");
  const binDir = path.join(root, "node_modules", ".bin");
  await mkdir(specDir, { recursive: true });
  await mkdir(uiDir, { recursive: true });
  await mkdir(designDir, { recursive: true });
  await mkdir(binDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0001 (doctor fixture)\n",
    "utf-8",
  );
  await writeFile(path.join(specDir, "02_User-stories.md"), "# stories\n", "utf-8");
  await writeFile(
    path.join(uiDir, "ui-0001.yaml"),
    [
      "screens:",
      "  - id: home",
      "    title: Home",
      "    route: /",
      "    primary_tasks:",
      "      - Browse the surface",
      "",
    ].join("\n"),
    "utf-8",
  );
  // Phase 3b: brand SSOT lives in root DESIGN.md plus a sha freeze in
  // contracts/design/DESIGN.md.lock.yaml.
  const designMdText = [
    "---",
    "brand:",
    '  name: "Acme Ledger"',
    "  archetype: tech",
    "visual:",
    "  colors:",
    '    primary:        "#1F2937"',
    '    secondary:      "#6366F1"',
    '    accent:         "#D97706"',
    '    surface:        "#FFFFFF"',
    '    surface_muted:  "#F3F4F6"',
    '    text:           "#111827"',
    '    text_muted:     "#6B7280"',
    '    danger:         "#DC2626"',
    '    warning:        "#F59E0B"',
    '    success:        "#10B981"',
    '    border:         "#E5E7EB"',
    '    overlay:        "rgba(0,0,0,0.5)"',
    "  typography:",
    '    family_sans:    "Inter, system-ui, sans-serif"',
    '    family_display: "Inter, system-ui, sans-serif"',
    '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
    "  radius:",
    '    sm:   "0.25rem"',
    '    md:   "0.5rem"',
    '    lg:   "0.75rem"',
    '    full: "9999px"',
    "  shadow:",
    '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
    '    md: "0 4px 6px rgba(15,23,42,0.08)"',
    '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
    "---",
    "",
    "# Brand Philosophy",
    "",
    "Calm confidence.",
    "",
  ].join("\n");
  await writeFile(path.join(root, "DESIGN.md"), designMdText, "utf-8");
  const designMdSha = createHash("sha256").update(designMdText, "utf8").digest("hex");
  await writeFile(
    path.join(designDir, "DESIGN.md.lock.yaml"),
    [
      'designMdPath: "DESIGN.md"',
      `designMdSha256: "${designMdSha}"`,
      'frozenAt: "2026-05-05T00:00:00Z"',
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeTestPlaywrightCli(binDir, 0);
}

async function writeTestPlaywrightCli(binDir: string, exitCode: 0 | 1): Promise<void> {
  if (process.platform === "win32") {
    const content = exitCode === 0 ? "@echo off\r\necho ok\r\n" : "@echo off\r\nexit /b 1\r\n";
    await writeFile(path.join(binDir, "playwright-cli.cmd"), content, "utf-8");
    return;
  }

  const content = exitCode === 0 ? "#!/bin/sh\necho ok\n" : "#!/bin/sh\nexit 1\n";
  const launcherPath = path.join(binDir, "playwright-cli");
  await writeFile(launcherPath, content, "utf-8");
  await chmod(launcherPath, 0o755);
}

async function startTestServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((_, response) => {
    response.statusCode = 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to resolve test server address");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function stopTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

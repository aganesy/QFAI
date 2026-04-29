import { createServer, type Server } from "node:http";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

  it("reports launcher probe failures when playwright-cli exists but is not runnable", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const server = await startTestServer();
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedPrototypingFixture(root, server.url);
      await writeTestPlaywrightCli(path.join(root, "node_modules", ".bin"), 1);

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.playwrightCli")?.severity).toBe("error");
    } finally {
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
      await writeFile(
        path.join(root, ".qfai", "contracts", "design", "selected-direction.yaml"),
        [
          "chosen_direction_id: direction-02",
          "winning_rationale: This must be produced after prototyping, not before it.",
          "carry_forward_rules:",
          "  - Keep the asymmetrical hero and condensed headline pairing",
        ].join("\n"),
        "utf-8",
      );

      const parsed = await readDoctorData(root, { profile: "prototyping", targetUrl: server.url });
      expect(findCheck(parsed.checks, "prototyping.designContracts")?.severity).toBe("error");
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
  await writeFile(
    path.join(designDir, "exploration-brief.yaml"),
    [
      "product_intent: Clarify the primary decision in one screen",
      "target_users:",
      "  - operations manager",
      "must_preserve_interactions:",
      "  - Search remains visible above the fold",
      "brand_signals:",
      "  - Calm confidence",
      "differentiation_targets:",
      "  - Avoid generic admin-shell defaults",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "reference-pool.yaml"),
    [
      "references:",
      "  - id: ref-competitor-01",
      "    kind: competitor",
      "    source: Example competitor product surface",
      "    adopted_points:",
      "      - Dense comparison layout with clear hierarchy",
      "    rejected_points:",
      "      - Generic sidebar shell",
      "    local_translation:",
      "      - Translate density into task-first grouping",
      "    copy_risk: low",
      "    template_usage_policy: reference-only",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "brand-design.yaml"),
    [
      "brand_personality:",
      "  - precise",
      "  - quietly confident",
      "audience_emotion:",
      "  - feels in control of operational tradeoffs",
      "category_conventions:",
      "  - admin surfaces prioritize predictable scanning",
      "differentiation_strategy:",
      "  - use compact editorial hierarchy instead of default dashboard cards",
      "visual_language:",
      "  - strong typographic contrast",
      "  - restrained color accents",
      "content_tone:",
      "  - direct operational language",
      "do_not_look_like:",
      "  - generic shadcn dashboard starter",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "evaluation-rubric.yaml"),
    [
      "axes:",
      "  - id: design-quality",
      "    weight: 3",
      "hard_floors:",
      "  - id: functionality",
      "    min_score: 80",
      "weighted_axes:",
      "  - design-quality",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "evaluator-calibration.yaml"),
    [
      "good_critique_examples:",
      "  - Specific critique tied to user goals",
      "too_lenient_examples:",
      "  - Generic praise without evidence",
      "blandness_fail_examples:",
      "  - Recycled default admin shell",
      "originality_fail_examples:",
      "  - Near-copy of reference product",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(designDir, "absorption-policy.yaml"),
    [
      "minAbsorptionsPerSurvivor: 2",
      "require_rejected_reason: true",
      "allow_adapt_required: true",
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

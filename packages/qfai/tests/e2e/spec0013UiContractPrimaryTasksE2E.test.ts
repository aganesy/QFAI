/**
 * E2E test for spec-0013 CHG-005 US-0013-0011.
 *
 * Verifies the shipped /qfai-sdd UI contract template carries the
 * `primary_tasks: []` slot on every `screens[]` entry, and that the
 * QFAI-AUD-001 aligned validate lane blocks `/qfai-prototyping` preflight
 * (exit code != 0, QFAI-AUD-001 token in output) when any screen has empty
 * primary_tasks. The reverse path (populated primary_tasks) emits zero
 * QFAI-AUD-001 errors.
 */
// QFAI:SPEC-0013:US-0013-0011

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { captureStdout } from "../helpers/stdout.js";

const TEMPLATE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "templates",
  "contracts",
  "ui-contract.sample.yaml",
);

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-aud001-e2e-"));
  tempDirs.push(dir);
  return dir;
}

async function seedWorkspace(root: string, uiContract: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/report",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
      "  traceability:",
      "    scMustHaveTest: false",
      "    unknownContractIdSeverity: warning",
      "uiux:",
      "  audit:",
      "    enabled: true",
      "    maxPrimaryCtas: 1",
      "",
    ].join("\n"),
    "utf-8",
  );
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, "sample.yaml"), uiContract, "utf-8");
}

function emptyPrimaryTasksContract(): string {
  return [
    "screens:",
    "  - id: order_create",
    "    title: Create Order",
    "    route: /orders/new",
    "    primary_tasks: []",
    "",
  ].join("\n");
}

function populatedPrimaryTasksContract(): string {
  return [
    "screens:",
    "  - id: order_create",
    "    title: Create Order",
    "    route: /orders/new",
    "    primary_tasks:",
    "      - create_order",
    "",
  ].join("\n");
}

describe(
  "US-0013-0011: UI contract primary_tasks slot + QFAI-AUD-001 aligned validate lane",
  { timeout: 60000 },
  () => {
    it("shipped ui-contract.sample.yaml carries primary_tasks slot on every screen", async () => {
      const raw = await readFile(TEMPLATE_PATH, "utf-8");
      const parsed = parseYaml(raw) as { screens?: Array<Record<string, unknown>> };
      expect(Array.isArray(parsed.screens)).toBe(true);
      expect((parsed.screens ?? []).length).toBeGreaterThan(0);
      for (const screen of parsed.screens ?? []) {
        expect(Object.hasOwn(screen, "primary_tasks")).toBe(true);
        expect(Array.isArray(screen.primary_tasks)).toBe(true);
      }
    });

    it("validate lane blocks preflight (exit != 0 + QFAI-AUD-001) when primary_tasks is empty", async () => {
      const root = await newTempDir();
      await seedWorkspace(root, emptyPrimaryTasksContract());

      let exitCode = 0;
      const stdout = await captureStdout(async () => {
        exitCode = await runValidate({ root, strict: false, failOn: "error" });
      });

      expect(exitCode, `expected non-zero exit, got ${exitCode}`).not.toBe(0);
      expect(stdout).toMatch(/QFAI-AUD-001/);
      expect(stdout).toMatch(/order_create/);
    });

    it("validate lane reports zero QFAI-AUD-001 errors when primary_tasks is populated", async () => {
      const root = await newTempDir();
      await seedWorkspace(root, populatedPrimaryTasksContract());

      const stdout = await captureStdout(async () => {
        await runValidate({ root, strict: false, failOn: "error" });
      });

      // Filter stdout for QFAI-AUD-001 error-severity lines. Other validators
      // (e.g. traceability) may still warn/error in the tmp workspace, but
      // the QFAI-AUD-001 aligned lane must be silent at error severity.
      const audit001ErrorLines = stdout
        .split("\n")
        .filter((line) => line.includes("QFAI-AUD-001") && line.startsWith("[error]"));
      expect(audit001ErrorLines).toEqual([]);
    });
  },
);

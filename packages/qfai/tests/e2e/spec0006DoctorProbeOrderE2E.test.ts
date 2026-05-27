/**
 * E2E acceptance for spec-0006 CHG-005 user stories:
 *   doctor playwright primary probe + deprecation window,
 *   2-group summary + skills.integrity severity downgrade.
 */
// QFAI:SPEC-0006:US-0006-0006
// QFAI:SPEC-0006:US-0006-0007

import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";

const isWin = process.platform === "win32";
const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-spec0006e2e-${label}-`));
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

async function seedLocalPlaywright(root: string): Promise<void> {
  const binDir = path.join(root, "node_modules", ".bin");
  await mkdir(binDir, { recursive: true });
  if (isWin) {
    await writeFile(path.join(binDir, "playwright.cmd"), "@echo off\r\necho 1.52.0\r\n", "utf-8");
  } else {
    const launcher = path.join(binDir, "playwright");
    await writeFile(launcher, "#!/bin/sh\necho 1.52.0\n", "utf-8");
    await chmod(launcher, 0o755);
  }
}

describe("US-0006-0006: doctor probes playwright primary, npx fallback, playwright-cli deprecation", () => {
  it("fresh init + seeded playwright launcher -> doctor text output has zero [error] lines on the launcher path and resolves playwright (not playwright-cli)", async () => {
    const root = await newTempDir("us06");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await seedLocalPlaywright(root);

    const outPath = path.join(root, ".qfai", "report", "doctor.txt");
    await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      outPath,
      profile: "prototyping",
    });
    const text = await readFile(outPath, "utf-8");

    // The playwright launcher line must NOT be an [error] line.
    const launcherLine = text
      .split(/\r?\n/u)
      .find((line) => line.includes("prototyping.playwrightCli"));
    expect(launcherLine, "playwright launcher check must appear in the text output").toBeDefined();
    expect(launcherLine?.startsWith("[error]")).toBe(false);
    // playwright (not playwright-cli) must be the recorded launcher.
    expect(launcherLine ?? "").not.toMatch(/playwright-cli/u);
  });
});

describe("US-0006-0007: doctor summary splits into 2 groups and downgrades skills.integrity to warning", () => {
  it("text output presents both group headers and skills.integrity always lives under the advisory group", async () => {
    const root = await newTempDir("us07");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const skillsDir = path.join(root, ".qfai", "assistant", "skills");
    const targetSkill = path.join(skillsDir, "qfai-atdd", "SKILL.md");
    const skillOriginal = await readFile(targetSkill, "utf-8");
    await writeFile(targetSkill, `${skillOriginal}\n<!-- e2e drift -->\n`, "utf-8");

    const outPath = path.join(root, ".qfai", "report", "doctor.txt");
    await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      outPath,
      profile: "prototyping",
    });
    const text = await readFile(outPath, "utf-8");

    expect(text).toContain("errors blocking the active profile");
    expect(text).toContain("advisory findings (drift, non-blocking by default)");
    const advisoryIdx = text.indexOf("advisory findings (drift, non-blocking by default)");
    const skillsIdx = text.indexOf("skills.integrity");
    expect(skillsIdx).toBeGreaterThan(advisoryIdx);
  });
});

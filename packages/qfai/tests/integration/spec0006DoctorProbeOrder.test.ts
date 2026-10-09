/**
 * Integration acceptance for spec-0006 CHG-005 test cases.
 *
 * Covers the doctor probe-order rebuild (REQ-0107) and the 2-group summary
 * split (REQ-0122).
 *
 * Note: TC-0006-0017 is layered here even though its spec `Type:` column
 * marks it `unit`. ATDD layer pinning is by TC location (every TC must be
 * referenced from tests/integration/**); type-column values are planning
 * signals per .qfai/assistant/catalog/test-layers.md "Volume policy".
 */

import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";

const isWin = process.platform === "win32";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-spec0006-${label}-`));
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

/**
 * Seed a project-local node_modules/.bin/playwright launcher that exits 0
 * for `--version` invocations. Windows: write the .cmd shim used by npm.
 */
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

async function readDoctorJson(root: string): Promise<DoctorJson> {
  const outPath = path.join(root, ".qfai", "report", "doctor.json");
  await runDoctor({
    root,
    rootExplicit: true,
    format: "json",
    outPath,
    profile: "prototyping",
  });
  return JSON.parse(await readFile(outPath, "utf-8")) as DoctorJson;
}

type DoctorJson = {
  checks: Array<{
    id: string;
    severity: "ok" | "info" | "warning" | "error";
    title?: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
  summary: { ok: number; info: number; warning: number; error: number };
};

function findCheck(data: DoctorJson, id: string): DoctorJson["checks"][number] | undefined {
  return data.checks.find((check) => check.id === id);
}

// QFAI:EX-0003-0006-01
// QFAI:EX-0003-0006-03
// QFAI:AC-0003-0006-01
describe("TC-0006-0012: playwright primary probe detects node_modules/.bin/playwright", () => {
  it("resolves the project-local playwright shim and records it as primary", async () => {
    const root = await newTempDir("tc12");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await seedLocalPlaywright(root);

    const data = await readDoctorJson(root);
    const playwrightCheck = findCheck(data, "prototyping.playwrightCli");
    expect(playwrightCheck).toBeDefined();
    expect(playwrightCheck?.severity).toBe("ok");
    const details = playwrightCheck?.details as
      { resolvedStage?: string; executable?: string } | undefined;
    expect(details?.resolvedStage).toBe("primary");
    expect(String(details?.executable ?? "")).toMatch(/playwright(\.cmd)?$/u);
  });
});

describe("TC-0006-0013: playwright probe order documented and observable", () => {
  it("exposes the canonical probe order via the launcher helper", async () => {
    const mod = await import("../../src/core/prototyping/playwrightLauncher.js");
    expect(typeof mod.getProbeOrder).toBe("function");
    const order = mod.getProbeOrder();
    expect(order).toEqual(["playwright", "npx fallback"]);
  });
});

// QFAI:AC-0003-0006-02
describe("TC-0006-0015: full failure surfaces `npm i -D playwright` install hint", () => {
  it("emits an error finding whose message contains the install hint", async () => {
    const root = await newTempDir("tc15");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    // No seeding — node_modules empty; PATH cleared to suppress any system
    // playwright installed on the developer machine.
    const originalPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const data = await readDoctorJson(root);
      const launcherCheck = findCheck(data, "prototyping.playwrightCli");
      expect(launcherCheck?.severity).toBe("error");
      const body = `${launcherCheck?.message ?? ""}\n${JSON.stringify(launcherCheck?.details ?? {})}`;
      expect(body).toContain("npm i -D playwright");
    } finally {
      process.env.PATH = originalPath;
    }
  });
});

// QFAI:AC-0003-0006-03
// QFAI:EX-0003-0006-04
describe("TC-0006-0016: fresh init + playwright install gives the launcher check no error", () => {
  it("fresh init + seeded playwright shim -> the launcher check is ok", async () => {
    const root = await newTempDir("tc16");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await seedLocalPlaywright(root);

    const data = await readDoctorJson(root);
    // The active-profile probe must NOT contribute an error finding when a
    // fresh-init project has the recommended playwright install.
    const launcherCheck = findCheck(data, "prototyping.playwrightCli");
    expect(launcherCheck?.severity).toBe("ok");
  });
});

describe("root DESIGN.md readiness", () => {
  // QFAI:AC-0003-0006-05
  // QFAI:EX-0003-0006-06
  it("names root DESIGN.md in the readiness check and lists its findings", async () => {
    const root = await newTempDir("design-md");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const ready = findCheck(await readDoctorJson(root), "prototyping.designMdReadiness");
    expect(ready).toMatchObject({
      severity: "ok",
      title: "Root DESIGN.md readiness",
      details: { designMd: "DESIGN.md" },
    });

    const uiDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "ui-0001-home.yaml"),
      "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: home\n    route: /\n    primary_tasks:\n      - { id: browse, label: Browse, acceptance: done }\n",
      "utf-8",
    );
    await rm(path.join(root, "DESIGN.md"), { force: true });
    const blocked = findCheck(await readDoctorJson(root), "prototyping.designMdReadiness");
    expect(blocked).toMatchObject({
      severity: "error",
      title: "Root DESIGN.md readiness",
      details: { designMd: "DESIGN.md" },
    });
    expect(blocked?.details?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "QFAI-DCON-030" })]),
    );
  });
});

// Integration: `qfai doctor --clean` prunes TTL-expired validate run
// logs under `paths.outDir` in addition to archiving review packs, and
// `qfai doctor` surfaces the run-log count so the accumulation is
// visible before it is measured in tens of megabytes. Uses the
// in-process `runDoctor` entry point with deterministic temp-dir
// fixtures (no shelling out so Windows parallel-FS flake stays bounded).

import { access, mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import { createDoctorData } from "../../../../src/core/doctor.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-runlogs-${label}-`));
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

async function seedRunLog(root: string, runId: string, ageDays: number): Promise<string> {
  const dir = path.join(root, ".qfai", "report", runId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "run.json"), "{}\n", "utf-8");
  const mtime = new Date(Date.now() - ageDays * DAY_MS);
  await utimes(dir, mtime, mtime);
  return dir;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --clean prunes stale validate run logs", () => {
  it("removes a 30-day-old run and keeps the newest ones", async () => {
    const root = await newTempDir("prune");
    await writeFile(path.join(root, "qfai.config.yaml"), "report:\n  keepLatestRuns: 1\n", "utf-8");
    const stale = await seedRunLog(root, "run-20260401120000001", 30);
    const fresh = await seedRunLog(root, "run-20260811120000002", 0);

    const exit = await runDoctor({ root, rootExplicit: true, format: "text", clean: true });

    expect(exit).toBe(0);
    expect(await exists(stale)).toBe(false);
    expect(await exists(fresh)).toBe(true);
  });

  it("honors report.staleTtlDays: 0 as a full opt-out", async () => {
    const root = await newTempDir("opt-out");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "report:\n  staleTtlDays: 0\n  keepLatestRuns: 0\n",
      "utf-8",
    );
    const stale = await seedRunLog(root, "run-20260401120000001", 365);

    const exit = await runDoctor({ root, rootExplicit: true, format: "text", clean: true });

    expect(exit).toBe(0);
    expect(await exists(stale)).toBe(true);
  });

  it("--dry-run leaves every run in place", async () => {
    const root = await newTempDir("dry-run");
    await writeFile(path.join(root, "qfai.config.yaml"), "report:\n  keepLatestRuns: 0\n", "utf-8");
    const stale = await seedRunLog(root, "run-20260401120000001", 30);

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      clean: true,
      dryRun: true,
    });

    expect(exit).toBe(0);
    expect(await exists(stale)).toBe(true);
  });

  it("doctor reports the run-log count so the growth is visible", async () => {
    const root = await newTempDir("count");
    await seedRunLog(root, "run-20260401120000001", 30);
    await seedRunLog(root, "run-20260402120000002", 29);

    const data = await createDoctorData({ startDir: root, rootExplicit: true });
    const check = data.checks.find((entry) => entry.id === "report.runLogs");

    expect(check).toBeDefined();
    expect(check?.details?.["runLogCount"]).toBe(2);
  });
});

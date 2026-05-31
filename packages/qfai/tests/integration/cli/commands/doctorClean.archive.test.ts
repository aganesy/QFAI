// QFAI:SPEC-0006:TC-0006-0019
//
// Integration: `qfai doctor --clean` archives a TTL-expired review pack
// into `.qfai/review/_archive/<ts>/` while leaving TTL-in packs in place.
// Uses the in-process `runDoctor` entry point with deterministic
// temp-dir fixtures (no shelling out so Windows parallel-FS flake stays
// bounded).

import { access, mkdir, mkdtemp, readdir, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-clean-${label}-`));
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

async function seedReviewPack(
  root: string,
  ts: string,
  mtime: Date,
): Promise<string> {
  const dir = path.join(root, ".qfai", "review", `review-${ts}`);
  await mkdir(dir, { recursive: true });
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

describe("doctor --clean archives TTL-expired review packs", () => {
  it("moves a 26-day-old pack into _archive/ and leaves TTL-in pack", async () => {
    const root = await newTempDir("archive");
    // 17-digit timestamp matches REVIEW_PACK_DIR_RE format.
    const oldTs = "20260401120000123";
    const newTs = "20260527120000456";
    const oldDir = await seedReviewPack(root, oldTs, new Date(Date.now() - 26 * 24 * 60 * 60 * 1000));
    const newDir = await seedReviewPack(root, newTs, new Date());

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      clean: true,
    });

    expect(exit).toBe(0);
    expect(await exists(oldDir)).toBe(false);
    expect(await exists(newDir)).toBe(true);
    expect(await exists(path.join(root, ".qfai", "review", "_archive", `review-${oldTs}`))).toBe(true);

    const topLevel = await readdir(path.join(root, ".qfai", "review"));
    expect(topLevel).toContain(`review-${newTs}`);
    expect(topLevel).toContain("_archive");
    expect(topLevel).not.toContain(`review-${oldTs}`);
  });

  it("honors config override review.staleTtlDays: 7 (10-day pack archived)", async () => {
    const root = await newTempDir("config-override");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "review:\n  staleTtlDays: 7\n",
      "utf-8",
    );
    const ts = "20260518120000789";
    const dir = await seedReviewPack(root, ts, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      clean: true,
    });
    expect(exit).toBe(0);
    expect(await exists(dir)).toBe(false);
    expect(await exists(path.join(root, ".qfai", "review", "_archive", `review-${ts}`))).toBe(true);
  });
});

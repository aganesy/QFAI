// QFAI:SPEC-0006:TC-0006-0020
//
// Boundary: `qfai doctor --clean` is a move (never delete) operation;
// re-running on an already-archived pack is a no-op. The
// `validateReviewArtifacts` validator only scans top-level review-pack
// directories matching `review-<17-digit>` so `_archive/` is naturally
// out-of-scope.

import { access, mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import { validateReviewArtifacts } from "../../../../src/core/validators/reviewArtifacts.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-noDelete-${label}-`));
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

async function seedReviewPack(root: string, ts: string, mtime: Date): Promise<string> {
  const dir = path.join(root, ".qfai", "review", `review-${ts}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --clean never deletes; validate review excludes _archive", () => {
  it("second --clean run is a no-op after the first archived the pack", async () => {
    const root = await newTempDir("idempotent");
    const ts = "20260401120000123";
    const oldDir = await seedReviewPack(root, ts, new Date());
    // Force mtime to 30 days ago.
    const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldDir, mtime, mtime);

    const exit1 = await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      clean: true,
    });
    expect(exit1).toBe(0);
    const archivedPath = path.join(root, ".qfai", "review", "_archive", `review-${ts}`);
    expect(await fileExists(archivedPath)).toBe(true);
    expect(await fileExists(oldDir)).toBe(false);

    // Second run: archived pack still exists; nothing is deleted.
    const exit2 = await runDoctor({
      root,
      rootExplicit: true,
      format: "text",
      clean: true,
    });
    expect(exit2).toBe(0);
    expect(await fileExists(archivedPath)).toBe(true);
  });

  it("validateReviewArtifacts scans only top-level packs (_archive/ excluded)", async () => {
    const root = await newTempDir("review-scope");
    // Required gitignore marker so QFAI-REVIEW-001 doesn't dominate.
    await writeFile(
      path.join(root, ".gitignore"),
      "# QFAI managed block start\n.qfai/review/*\n.qfai/evidence/*\n.qfai/report/*\n# QFAI managed block end\n",
      "utf-8",
    );

    // Top-level pack with mandatory artifacts present (no findings).
    const topTs = "20260520120000111";
    const topDir = path.join(root, ".qfai", "review", `review-${topTs}`);
    await mkdir(topDir, { recursive: true });
    await writeFile(path.join(topDir, "review_request.md"), "# request\n", "utf-8");
    await writeFile(path.join(topDir, "R01_reviewer.md"), "# review\n", "utf-8");
    await writeFile(
      path.join(topDir, "summary.json"),
      JSON.stringify({
        version: "1.0",
        created_at: "2026-05-20T12:00:00Z",
        target: { kind: "spec", path: ".qfai/specs/spec-0006/" },
        overall_status: "PASS",
        roster: [{ reviewer: "code-reviewer", status: "PASS", feedback_count: 0 }],
      }),
      "utf-8",
    );

    // Archived pack with NO required artifacts. If the scanner peeked
    // into `_archive/`, this would surface QFAI-REVIEW-003 / 004 / 005.
    const archivedDir = path.join(root, ".qfai", "review", "_archive", `review-20260401120000111`);
    await mkdir(archivedDir, { recursive: true });

    const issues = await validateReviewArtifacts(root);
    const codesAgainstArchive = issues.filter(
      (iss) => typeof iss.file === "string" && iss.file.includes("_archive"),
    );
    expect(codesAgainstArchive).toEqual([]);
    // The top-level pack passes the schema check.
    expect(issues.filter((iss) => iss.code === "QFAI-REVIEW-003")).toEqual([]);
    expect(issues.filter((iss) => iss.code === "QFAI-REVIEW-004")).toEqual([]);
    expect(issues.filter((iss) => iss.code === "QFAI-REVIEW-005")).toEqual([]);
  });
});

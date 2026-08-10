/**
 * QFAI-REVIEW-009 — a review pack says which state it ruled on (#388).
 *
 * `summary.json` recorded `overall_status` and per-reviewer `status`, with no
 * field addressing the state those verdicts describe. The field is optional in
 * the schema — packs written before it exist — but its absence is reported, and
 * a present-but-malformed value is an error like any other.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateReviewArtifacts } from "../../src/core/validators/reviewArtifacts.js";

const tempDirs: string[] = [];

type Summary = Record<string, unknown>;

const baseSummary = (): Summary => ({
  version: "1.0",
  created_at: "2026-08-01T00:00:00Z",
  target: { kind: "spec", path: ".qfai/specs/spec-0001" },
  overall_status: "PASS",
  roster: [{ reviewer: "completion-reviewer", status: "PASS", feedback_count: 0 }],
});

async function withPack(
  summary: Summary,
): Promise<Awaited<ReturnType<typeof validateReviewArtifacts>>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-"));
  tempDirs.push(root);
  const packDir = path.join(root, ".qfai", "review", "review-20260801000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
  await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
  await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  return validateReviewArtifacts(root);
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("review pack revision", () => {
  it("reports a summary.json with no revision", async () => {
    const issues = await withPack(baseSummary());
    const found = issues.filter((i) => i.code === "QFAI-REVIEW-009");

    expect(found).toHaveLength(1);
    // A warning: existing packs predate the field, and the point is to make the
    // omission visible rather than to invalidate history.
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.suggested_action).toContain("evidence-revision.md");
    // The remedy has to name the form the reference accepts. It said
    // `working-tree+<porcelain digest>`, which that reference now forbids by
    // name: porcelain gives paths and states, so re-editing the very file
    // under review leaves it identical and a stale verdict reads as fresh.
    expect(found[0]?.suggested_action).toContain("working-tree+<content hash>");
    expect(found[0]?.suggested_action).not.toContain("porcelain");
  });

  it("accepts a git rev", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "55af6834f0" });

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
  });

  it("accepts the uncommitted-tree form", async () => {
    const issues = await withPack({
      ...baseSummary(),
      // The content hash the four-step procedure produces: SHA-256, 64 hex.
      revision: "working-tree+" + "a".repeat(64),
    });

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
    expect(issues.filter((i) => i.code === "QFAI-REVIEW-007")).toEqual([]);
  });

  it("rejects the porcelain digest the reference forbids", async () => {
    // It reads as a legitimate value while being exactly the digest that does
    // not move when the file under review is edited, so a stale verdict passed
    // the freshness check this field exists for.
    const issues = await withPack({ ...baseSummary(), revision: "working-tree+9f2c1ab" });
    const schema = issues.filter((i) => i.code === "QFAI-REVIEW-007");

    expect(schema).toHaveLength(1);
    expect(schema[0]?.message).toContain("porcelain digest");
  });

  it("reports an older pack's legacy revision as a warning", async () => {
    // The tree a past verdict described is not reconstructible, so there is no
    // content hash to migrate to — an error would leave `--fail-on error`
    // permanently red for a repository that keeps its packs.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-"));
    tempDirs.push(root);
    const reviewRoot = path.join(root, ".qfai", "review");
    for (const [stamp, revision] of [
      ["20260101000000000", "working-tree+9f2c1ab"],
      ["20260801000000000", "a".repeat(40)],
    ] as const) {
      const packDir = path.join(reviewRoot, `review-${stamp}`);
      await mkdir(packDir, { recursive: true });
      await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
      await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
      await writeFile(
        path.join(packDir, "summary.json"),
        JSON.stringify({ ...baseSummary(), revision }, null, 2),
        "utf-8",
      );
    }

    const issues = await validateReviewArtifacts(root);
    expect(issues.filter((i) => i.code === "QFAI-REVIEW-007")).toEqual([]);
    const legacy = issues.filter(
      (i) => i.code === "QFAI-REVIEW-009" && i.message.includes("porcelain digest"),
    );
    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.severity).toBe("warning");
  });

  it("rejects a value that is neither a rev nor a content hash", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "yesterday" });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
  });

  it("rejects a present-but-empty revision", async () => {
    const issues = await withPack({ ...baseSummary(), revision: "  " });
    const schema = issues.filter((i) => i.code === "QFAI-REVIEW-007");

    expect(schema).toHaveLength(1);
    expect(schema[0]?.message).toContain("revision");
  });

  it("rejects a non-string revision", async () => {
    const issues = await withPack({ ...baseSummary(), revision: 12345 });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
  });

  it("still reports the missing revision alongside other schema errors", async () => {
    // The two findings are independent; a pack with a broken roster must not
    // hide the fact that it also names no revision.
    const broken = baseSummary();
    delete broken.overall_status;
    const issues = await withPack(broken);

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
    expect(issues.some((i) => i.code === "QFAI-REVIEW-009")).toBe(true);
  });
});

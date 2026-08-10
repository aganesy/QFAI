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

// A pack written under the current contract declares which one produced it.
// That declaration — not the pack's age, and not its rank among siblings — is
// what holds it to the strict `revision` form.
const baseSummary = (): Summary => ({
  version: "1.0",
  revision_form: "content-hash",
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
  const packDir = path.join(root, ".qfai", "review", "review-20260815000000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
  await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
  await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  return validateReviewArtifacts(root);
}

async function withPacks(
  packs: readonly (readonly [string, Summary])[],
): Promise<Awaited<ReturnType<typeof validateReviewArtifacts>>> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-rev-"));
  tempDirs.push(root);
  for (const [stamp, summary] of packs) {
    const packDir = path.join(root, ".qfai", "review", `review-${stamp}`);
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# request\n", "utf-8");
    await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# review\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  }
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

  it("reports a pack that declares no form as a warning", async () => {
    // The tree a past verdict described is not reconstructible, so there is no
    // content hash to migrate to — an error would leave `--fail-on error`
    // permanently red for a repository that keeps its packs. A pack written
    // before the marker existed cannot declare it, so it is not held to it.
    const legacyPack = baseSummary();
    delete legacyPack.revision_form;
    const issues = await withPacks([
      ["20260101000000000", { ...legacyPack, revision: "working-tree+9f2c1ab" }],
    ]);

    expect(issues.filter((i) => i.code === "QFAI-REVIEW-007")).toEqual([]);
    const legacy = issues.filter(
      (i) => i.code === "QFAI-REVIEW-009" && i.message.includes("porcelain digest"),
    );
    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.severity).toBe("warning");
  });

  it("reports a declared pack as an error whatever its age or rank", async () => {
    // Neither rank nor time can decide this. "Newest overall" meant a malformed
    // pack written under the current contract stopped being an error the moment
    // any other spec produced one; a timestamp cutoff misclassifies the hours
    // between the contract shipping and the boundary chosen for it, and the
    // directory stamp carries no timezone at all. Here the malformed pack is
    // both the oldest on disk and stamped well before any plausible cutoff, and
    // it is an error because it says which contract wrote it.
    const issues = await withPacks([
      ["20250101000000000", { ...baseSummary(), revision: "working-tree+9f2c1ab" }],
      ["20260820000000000", { ...baseSummary(), revision: "a".repeat(40) }],
    ]);

    const current = issues.filter(
      (i) => i.code === "QFAI-REVIEW-007" && i.message.includes("porcelain digest"),
    );
    expect(current).toHaveLength(1);
    expect(current[0]?.severity).toBe("error");
    expect(issues.filter((i) => i.code === "QFAI-REVIEW-009")).toEqual([]);
  });

  it("reports a producer that wrote a revision but forgot the marker", async () => {
    // Otherwise forgetting it silently downgrades the producer's own check.
    const undeclared = baseSummary();
    delete undeclared.revision_form;
    const issues = await withPack({ ...undeclared, revision: "a".repeat(40) });
    const found = issues.filter((i) => i.rule === "reviewArtifacts.summaryRevisionForm");

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain("revision_form");
  });

  it("rejects a revision_form it does not define", async () => {
    const issues = await withPack({
      ...baseSummary(),
      revision_form: "porcelain",
      revision: "a".repeat(40),
    });

    expect(issues.some((i) => i.code === "QFAI-REVIEW-007")).toBe(true);
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

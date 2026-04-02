/**
 * reviewArtifacts validator tests — summary.json v1.0 / v2.0 schema validation
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateReviewArtifacts } from "../../../src/core/validators/reviewArtifacts.js";
import { QFAI_GITIGNORE_BLOCK } from "../../../src/core/gitignore.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-review-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function scaffoldRoot(root: string): Promise<void> {
  await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
}

async function writeReviewPack(
  root: string,
  packName: string,
  summary: Record<string, unknown>,
): Promise<void> {
  const packDir = path.join(root, ".qfai", "review", packName);
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
  await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# R01\n", "utf-8");
  await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
}

function makeV1Summary(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    version: "1.0",
    created_at: "2026-04-01T00:00:00Z",
    target: { kind: "discussion", path: ".qfai/discussion/discussion-20260401000000000" },
    overall_status: "PASS",
    roster: [{ reviewer: "qa-lead", status: "PASS", feedback_count: 0 }],
    ...overrides,
  };
}

function makeV2Summary(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    version: "2.0",
    created_at: "2026-04-01T00:00:00Z",
    target: { kind: "discussion", path: ".qfai/discussion/discussion-20260401000000000" },
    routing_profile: "requirements-heavy",
    reviewers: [{ reviewer: "completion-reviewer", status: "PASS", feedback_count: 0 }],
    conditional_reviewers: [],
    overall_status: "PASS",
    ...overrides,
  };
}

describe("validateReviewArtifacts — summary.json schema", () => {
  it("accepts valid v1.0 summary", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV1Summary());
    const issues = await validateReviewArtifacts(root);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("accepts valid v2.0 summary", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV2Summary());
    const issues = await validateReviewArtifacts(root);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("rejects unknown version", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV1Summary({ version: "3.0" }));
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    expect(schemaErrors[0]?.message).toContain("version");
  });

  it("rejects v1.0 with empty roster", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV1Summary({ roster: [] }));
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    expect(schemaErrors[0]?.message).toContain("roster");
  });

  it("rejects v2.0 with missing routing_profile", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const summary = makeV2Summary();
    delete summary.routing_profile;
    await writeReviewPack(root, "review-20260401000000000", summary);
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    expect(schemaErrors[0]?.message).toContain("routing_profile");
  });

  it("rejects v2.0 with empty reviewers", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV2Summary({ reviewers: [] }));
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    expect(schemaErrors[0]?.message).toContain("reviewers");
  });

  it("rejects v2.0 with non-array conditional_reviewers", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({ conditional_reviewers: "invalid" }),
    );
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    expect(schemaErrors[0]?.message).toContain("conditional_reviewers");
  });

  it("accepts v2.0 without conditional_reviewers field", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const summary = makeV2Summary();
    delete summary.conditional_reviewers;
    await writeReviewPack(root, "review-20260401000000000", summary);
    const issues = await validateReviewArtifacts(root);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("validates reviewer entry fields in v2.0", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({
        reviewers: [{ reviewer: "", status: "INVALID", feedback_count: -1 }],
      }),
    );
    const issues = await validateReviewArtifacts(root);
    const schemaErrors = issues.filter((i) => i.code === "QFAI-REVIEW-007");
    expect(schemaErrors.length).toBeGreaterThan(0);
    const msg = schemaErrors[0]?.message ?? "";
    expect(msg).toContain("reviewers[0].reviewer");
    expect(msg).toContain("reviewers[0].status");
    expect(msg).toContain("reviewers[0].feedback_count");
  });
});

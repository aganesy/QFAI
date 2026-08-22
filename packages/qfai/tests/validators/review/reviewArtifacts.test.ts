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
    // Required: which contract wrote this pack. A pack that predates the
    // strict revision form says "legacy" instead, written once from history.
    revision_form: "content-hash",
    // Required alongside it: a pack that declares the current contract and then
    // names no tree at all cannot be re-checked by anything.
    revision: "55af6834f0",
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
    revision_form: "content-hash",
    // Required alongside it: a pack that declares the current contract and then
    // names no tree at all cannot be re-checked by anything.
    revision: "55af6834f0",
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
    expect(schemaErrors.some((i) => i.message.includes("version"))).toBe(true);
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

describe("validateReviewArtifacts — directories the pack pattern skips", () => {
  it("names a mis-named pack instead of skipping it silently", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV2Summary());
    // The exact shape the issue observed: a stage-scoped directory holding one
    // reviewer file, no `review_request.md` and no `summary.json`.
    const strayDir = path.join(root, ".qfai", "review", "implement-spec-0001-tdd-0002-01");
    await mkdir(strayDir, { recursive: true });
    await writeFile(path.join(strayDir, "qa-gatekeeper.md"), "# qa\n", "utf-8");

    const issues = await validateReviewArtifacts(root);
    const notice = issues.find((entry) => entry.code === "QFAI-REVIEW-010");
    expect(notice?.severity).toBe("info");
    expect(notice?.message).toContain("implement-spec-0001-tdd-0002-01");
    // Informational only: a mis-named directory must not fail `--fail-on error`.
    expect(issues.filter((entry) => entry.severity === "error")).toHaveLength(0);
  });

  it("still reports the stray directory when no pack is recognized at all", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const strayDir = path.join(root, ".qfai", "review", "2026-04-01-round-1");
    await mkdir(strayDir, { recursive: true });

    const codes = (await validateReviewArtifacts(root)).map((entry) => entry.code);
    expect(codes).toContain("QFAI-REVIEW-010");
    // The "no packs at all" warning is what explains why nothing was inspected.
    expect(codes).toContain("QFAI-REVIEW-002");
  });

  it("does not report metadata directories or a clean tree", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(root, "review-20260401000000000", makeV2Summary());
    await mkdir(path.join(root, ".qfai", "review", ".cache"), { recursive: true });

    const codes = (await validateReviewArtifacts(root)).map((entry) => entry.code);
    expect(codes).not.toContain("QFAI-REVIEW-010");
  });
});

describe("validateReviewArtifacts — a --spec run judges only its own packs", () => {
  const specsRoot = (root: string): string => path.join(root, ".qfai", "specs");
  const scopeFor = (root: string, ...specNumbers: string[]) => ({
    specScope: new Set(specNumbers),
    specsRoot: specsRoot(root),
  });

  it("ignores a sibling worker's pack that has no summary.json yet", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    // The in-flight shape: `review_request.md` written, `summary.json` not yet.
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).not.toContain("QFAI-REVIEW-004");
    expect(codes).not.toContain("QFAI-REVIEW-005");
    // The unscoped gate is where an unattributable pack is still reported.
    const unscoped = (await validateReviewArtifacts(root)).map((entry) => entry.code);
    expect(unscoped).toContain("QFAI-REVIEW-004");
  });

  it("ignores a complete pack that targets another spec", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "summary.json"),
      JSON.stringify(
        makeV2Summary({ target: { kind: "spec", path: ".qfai/specs/spec-0002" } }),
        null,
        2,
      ),
      "utf-8",
    );

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).not.toContain("QFAI-REVIEW-003");
    expect(codes).not.toContain("QFAI-REVIEW-005");
  });

  it("still judges the pack that names the scoped spec", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "summary.json"),
      JSON.stringify(
        makeV2Summary({ target: { kind: "spec", path: ".qfai/specs/spec-0001" } }),
        null,
        2,
      ),
      "utf-8",
    );

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).toContain("QFAI-REVIEW-003");
    expect(codes).toContain("QFAI-REVIEW-005");
  });

  it("leaves the tree-wide findings to the unscoped gate", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await mkdir(path.join(root, ".qfai", "review", "2026-04-01-round-1"), { recursive: true });

    const scoped = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(scoped).not.toContain("QFAI-REVIEW-002");
    expect(scoped).not.toContain("QFAI-REVIEW-010");

    const unscoped = (await validateReviewArtifacts(root)).map((entry) => entry.code);
    expect(unscoped).toContain("QFAI-REVIEW-002");
    expect(unscoped).toContain("QFAI-REVIEW-010");
  });
});

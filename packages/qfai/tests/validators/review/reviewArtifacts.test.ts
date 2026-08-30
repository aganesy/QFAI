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

/** A pack with a request and a summary but no reviewer reports — the shape a dead round leaves. */
async function writeAbandonedPack(
  root: string,
  packName: string,
  summary: Record<string, unknown>,
): Promise<void> {
  const packDir = path.join(root, ".qfai", "review", packName);
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
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

  // `CR-20260823-0002`, approved 2026-08-23, option 1. `reviewers: []` used to be a schema error, so a
  // round whose reviewers died before writing anything had no accurate representation: the pack could
  // only look like one somebody forgot to seal. It is now a statement, and the four cases below are
  // the whole of what that costs — the guarantee for an unsealed pack has to survive it.
  it("accepts a round that produced nothing, when the summary says so", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeAbandonedPack(
      root,
      "review-20260401000000000",
      makeV2Summary({ reviewers: [], overall_status: "FAIL" }),
    );
    const issues = await validateReviewArtifacts(root);
    expect(
      issues.filter((i) =>
        ["QFAI-REVIEW-004", "QFAI-REVIEW-005", "QFAI-REVIEW-007"].includes(i.code),
      ),
      "an opened round that produced no responses is a real state, and this is how it is written down",
    ).toEqual([]);
  });

  it("rejects a reviewers: [] declaration that contradicts the reports beside it", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    // `writeReviewPack` also writes `R01_completion-reviewer.md`, so the declaration is false. The
    // summary makes the WHOLE zero-response declaration (v2, empty reviewers, FAIL) — a partial one
    // is simply not a declaration, which the two cases below cover.
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({ reviewers: [], overall_status: "FAIL" }),
    );
    const issues = await validateReviewArtifacts(root);
    const found = issues.filter((i) => i.code === "QFAI-REVIEW-005");
    expect(
      found.length,
      "a declaration the pack's own files refute is worse than no declaration",
    ).toBe(1);
    expect(found[0]?.message).toContain("Rxx_*.md");
  });

  // Review finding [27]. The contradiction check used to ask whether the pack made a VALID
  // zero-response declaration, which is a different question: a summary that is wrong twice over —
  // an empty list AND `overall_status: "PASS"` — answered `false` to it, so neither branch fired
  // and a pack contradicted by its own report files was accepted. Two defects cancelling is not a
  // pack passing.
  it("rejects an empty reviewers array beside reports even when the summary also claims PASS", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({ reviewers: [], overall_status: "PASS" }),
    );
    expect(
      (await validateReviewArtifacts(root)).filter((i) => i.code === "QFAI-REVIEW-005").length,
      "`reviewers: []` beside a report file is a failure whatever else the summary says",
    ).toBe(1);
  });

  it("still rejects a pack with no reports and no declaration", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeAbandonedPack(root, "review-20260401000000000", makeV2Summary());
    const issues = await validateReviewArtifacts(root);
    expect(
      issues.filter((i) => i.code === "QFAI-REVIEW-005").length,
      "the guarantee this rule exists for: an unsealed pack is still a defect",
    ).toBe(1);
  });

  // Review finding [22] on PR #794: the first version keyed on the empty array ALONE, so two shapes
  // slipped through. Both are declaration failures, not report failures, which is why each still
  // reports `QFAI-REVIEW-005` — the pack has no reports and has not said why.
  it("does not accept a v1 roster pack that carries an unrelated empty reviewers array", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    // A full `roster` — v1's reviewer list — beside an empty `reviewers` the v1 schema never reads.
    await writeAbandonedPack(root, "review-20260401000000000", makeV1Summary({ reviewers: [] }));
    expect(
      (await validateReviewArtifacts(root)).filter((i) => i.code === "QFAI-REVIEW-005").length,
      "a v1 pack declares its reviewers in `roster`; an empty `reviewers` beside it declares nothing",
    ).toBe(1);
  });

  it("does not accept a zero-reviewer declaration that still claims PASS", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeAbandonedPack(root, "review-20260401000000000", makeV2Summary({ reviewers: [] }));
    expect(
      (await validateReviewArtifacts(root)).filter((i) => i.code === "QFAI-REVIEW-005").length,
      "a round that returned no verdict returned no passing one, so `overall_status` must be FAIL",
    ).toBe(1);
  });

  it("does not let a malformed summary excuse a missing report set", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), "{ not json", "utf-8");
    const codes = (await validateReviewArtifacts(root)).map((i) => i.code);
    // The default is the strict one: anything that is not a present, parseable summary carrying an
    // empty `reviewers` answers "no declaration", so the missing reports are still reported.
    expect(codes).toContain("QFAI-REVIEW-005");
    expect(codes).toContain("QFAI-REVIEW-006");
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

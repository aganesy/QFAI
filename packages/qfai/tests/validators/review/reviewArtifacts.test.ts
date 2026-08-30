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

  it("still catches the scoped spec's own pack when summary.json is missing", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    // Attribution has to survive the very file the gate requires: this pack
    // names its spec in `review_request.md` and forgot `summary.json`.
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- target: `.qfai/specs/spec-0001`\n",
      "utf-8",
    );

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).toContain("QFAI-REVIEW-004");
    expect(codes).toContain("QFAI-REVIEW-005");
  });

  it("still catches the scoped spec's own pack when summary.json is unparseable", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- target: `.qfai/specs/spec-0001/01_Spec.md`\n",
      "utf-8",
    );
    await writeFile(path.join(packDir, "summary.json"), "{ not json", "utf-8");

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).toContain("QFAI-REVIEW-006");
  });

  it("keeps a sibling spec's summary-less pack out even so", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- target: `.qfai/specs/spec-0002`\n",
      "utf-8",
    );

    const codes = (await validateReviewArtifacts(root, scopeFor(root, "0001"))).map(
      (entry) => entry.code,
    );
    expect(codes).not.toContain("QFAI-REVIEW-004");
  });
});

describe("validateReviewArtifacts — a stage profile judges only the packs it owns", () => {
  const stageScope = (root: string, ...producers: string[]) => ({
    specScope: undefined,
    specsRoot: path.join(root, ".qfai", "specs"),
    discussionRoot: path.join(root, ".qfai", "discussion"),
    producers: new Set(producers),
  });

  async function seedIncompletePack(root: string, summary: Record<string, unknown>): Promise<void> {
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  }

  it("does not fail a discussion cycle on a broken spec pack", async () => {
    const root = await newTempDir();
    await seedIncompletePack(root, { version: "2.0", target: { kind: "spec", path: "x" } });

    const discussionCodes = (
      await validateReviewArtifacts(root, stageScope(root, "discussion"))
    ).map((entry) => entry.code);
    expect(discussionCodes).not.toContain("QFAI-REVIEW-005");
    expect(discussionCodes).not.toContain("QFAI-REVIEW-007");

    const sddCodes = (await validateReviewArtifacts(root, stageScope(root, "sdd"))).map(
      (entry) => entry.code,
    );
    expect(sddCodes).toContain("QFAI-REVIEW-005");
  });

  it("does not fail an sdd cycle on a broken discussion pack", async () => {
    const root = await newTempDir();
    await seedIncompletePack(root, { version: "2.0", target: { kind: "discussion", path: "x" } });

    const sddCodes = (await validateReviewArtifacts(root, stageScope(root, "sdd"))).map(
      (entry) => entry.code,
    );
    expect(sddCodes).not.toContain("QFAI-REVIEW-005");

    const discussionCodes = (
      await validateReviewArtifacts(root, stageScope(root, "discussion"))
    ).map((entry) => entry.code);
    expect(discussionCodes).toContain("QFAI-REVIEW-005");
  });

  it("attributes a summary-less pack by the paths review_request.md names", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- `.qfai/discussion/discussion-20260401000000000/06_REQ.md`\n",
      "utf-8",
    );

    const sddCodes = (await validateReviewArtifacts(root, stageScope(root, "sdd"))).map(
      (entry) => entry.code,
    );
    expect(sddCodes).not.toContain("QFAI-REVIEW-004");

    const discussionCodes = (
      await validateReviewArtifacts(root, stageScope(root, "discussion"))
    ).map((entry) => entry.code);
    expect(discussionCodes).toContain("QFAI-REVIEW-004");
  });

  it("lets no profile off a pack that names no owner at all", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await mkdir(path.join(root, ".qfai", "review", "review-20260401000000000"), {
      recursive: true,
    });

    for (const producer of ["sdd", "discussion"]) {
      const codes = (await validateReviewArtifacts(root, stageScope(root, producer))).map(
        (entry) => entry.code,
      );
      expect(codes).toContain("QFAI-REVIEW-003");
      expect(codes).toContain("QFAI-REVIEW-004");
    }
  });

  // `qfai-implement` mandates a review pack of its own and writes
  // `target.kind: "spec"` for it, exactly as an SDD pack does. Selecting the
  // SDD gate's packs by kind therefore made an implementation worker's
  // half-written pack fail `--profile sdd --fail-on error` on a downstream pack
  // the SDD cycle does not own.
  it("keeps an implementation pack out of both stage gates", async () => {
    const root = await newTempDir();
    await seedIncompletePack(root, {
      version: "2.0",
      producer: "implement",
      target: { kind: "spec", path: "x" },
    });

    for (const producer of ["sdd", "discussion"]) {
      const codes = (await validateReviewArtifacts(root, stageScope(root, producer))).map(
        (entry) => entry.code,
      );
      expect(codes).not.toContain("QFAI-REVIEW-005");
    }
    // The full scan owns every pack, so nothing escapes review entirely.
    const full = (await validateReviewArtifacts(root)).map((entry) => entry.code);
    expect(full).toContain("QFAI-REVIEW-005");
  });

  it("keeps an in-flight implementation pack out of the sdd gate before summary.json exists", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    // The in-flight shape: `review_request.md` written, reviewer files and
    // `summary.json` still to come. Its `Producer:` line is the only thing that
    // can say which stage owns it at this point.
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- Producer: `implement`\n- target: `.qfai/specs/spec-0001`\n",
      "utf-8",
    );

    const sddCodes = (await validateReviewArtifacts(root, stageScope(root, "sdd"))).map(
      (entry) => entry.code,
    );
    expect(sddCodes).not.toContain("QFAI-REVIEW-004");
    expect(sddCodes).not.toContain("QFAI-REVIEW-005");
  });

  // Over-correction pin: the packs the SDD gate is FOR must keep failing it,
  // whether they name their producer or predate the field.
  it("still gates the sdd cycle's own packs, declared or legacy", async () => {
    for (const summary of [
      { version: "2.0", producer: "sdd", target: { kind: "spec", path: "x" } },
      { version: "2.0", target: { kind: "spec", path: "x" } },
    ]) {
      const root = await newTempDir();
      await seedIncompletePack(root, summary);
      const codes = (await validateReviewArtifacts(root, stageScope(root, "sdd"))).map(
        (entry) => entry.code,
      );
      expect(codes).toContain("QFAI-REVIEW-005");
    }
  });
});

describe("validateReviewArtifacts — a target the pack's own path contradicts", () => {
  const sddSliceScope = (root: string) => ({
    specScope: new Set(["0001"]),
    specsRoot: path.join(root, ".qfai", "specs"),
    discussionRoot: path.join(root, ".qfai", "discussion"),
    producers: new Set(["sdd"]),
  });

  async function seedPack(root: string, target: Record<string, unknown>): Promise<void> {
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(
      path.join(packDir, "summary.json"),
      JSON.stringify(makeV2Summary({ target }), null, 2),
      "utf-8",
    );
  }

  it("does not let a foreign kind buy a spec pack out of the spec gate", async () => {
    const root = await newTempDir();
    // `kind` says discussion, `path` says spec-0001. Honouring the kind let the
    // pack skip `--profile sdd --spec 0001` — the hard gate its own path puts
    // it in — while the schema check saw two individually valid fields.
    await seedPack(root, { kind: "discussion", path: ".qfai/specs/spec-0001" });

    const codes = (await validateReviewArtifacts(root, sddSliceScope(root))).map(
      (entry) => entry.code,
    );
    expect(codes).toContain("QFAI-REVIEW-005");
  });

  it("reports the contradiction rather than re-filing the pack in silence", async () => {
    const root = await newTempDir();
    await seedPack(root, { kind: "discussion", path: ".qfai/specs/spec-0001" });

    const schema = (await validateReviewArtifacts(root, sddSliceScope(root))).filter(
      (entry) => entry.code === "QFAI-REVIEW-007",
    );
    expect(schema).toHaveLength(1);
    expect(schema[0]?.message).toContain("target.kind");
    expect(schema[0]?.message).toContain(".qfai/specs/spec-0001");
  });

  it("reports a producer its own path contradicts", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# R01\n", "utf-8");
    await writeFile(
      path.join(packDir, "summary.json"),
      JSON.stringify(
        makeV2Summary({
          producer: "discussion",
          target: { kind: "spec", path: ".qfai/specs/spec-0001" },
        }),
        null,
        2,
      ),
      "utf-8",
    );

    const schema = (await validateReviewArtifacts(root, sddSliceScope(root))).filter(
      (entry) => entry.code === "QFAI-REVIEW-007",
    );
    expect(schema[0]?.message).toContain("`producer` (discussion)");
  });

  // Over-correction pins: a target that agrees with its path, and one that
  // names neither root, are both clean.
  it("accepts a target that agrees with its path", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({
        producer: "sdd",
        target: { kind: "spec", path: ".qfai/specs/spec-0001" },
      }),
    );

    const issues = await validateReviewArtifacts(root, sddSliceScope(root));
    expect(issues.filter((entry) => entry.severity === "error")).toHaveLength(0);
  });

  it("says nothing about a target outside both configured roots", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    // What an implementation pack points at: a source file, under neither
    // `specsDir` nor `discussionDir`, so the path proves nothing to contradict.
    await writeReviewPack(
      root,
      "review-20260401000000000",
      makeV2Summary({ producer: "implement", target: { kind: "spec", path: "src/core/x.ts" } }),
    );

    const issues = await validateReviewArtifacts(root, {
      specScope: undefined,
      specsRoot: path.join(root, ".qfai", "specs"),
      discussionRoot: path.join(root, ".qfai", "discussion"),
    });
    expect(issues.filter((entry) => entry.severity === "error")).toHaveLength(0);
  });
});

describe("validateReviewArtifacts — a scoped full run keeps repo-level packs", () => {
  const scopedFullScan = (root: string) => ({
    specScope: new Set(["0001"]),
    specsRoot: path.join(root, ".qfai", "specs"),
    discussionRoot: path.join(root, ".qfai", "discussion"),
  });

  it("judges a discussion pack that no spec could own", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- target: `.qfai/discussion/discussion-20260401000000000`\n",
      "utf-8",
    );

    // A discussion target yields no spec number by construction, so narrowing
    // by spec alone dropped every discussion pack — hard errors included — from
    // a scoped full scan, against the scope contract that keeps repo-level
    // findings in every slice.
    const codes = (await validateReviewArtifacts(root, scopedFullScan(root))).map(
      (entry) => entry.code,
    );
    expect(codes).toContain("QFAI-REVIEW-004");
    expect(codes).toContain("QFAI-REVIEW-005");
  });

  // Over-correction pin: the sibling-spec isolation the scope exists for.
  it("still drops a sibling spec's pack", async () => {
    const root = await newTempDir();
    await scaffoldRoot(root);
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "review_request.md"),
      "# Review Request\n\n- target: `.qfai/specs/spec-0002`\n",
      "utf-8",
    );

    const codes = (await validateReviewArtifacts(root, scopedFullScan(root))).map(
      (entry) => entry.code,
    );
    expect(codes).not.toContain("QFAI-REVIEW-004");
  });
});

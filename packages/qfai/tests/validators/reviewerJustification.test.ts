/**
 * Validator: reviewerJustification (.qfai/review/**\/*.json).
 *
 * Covers TC-0004-0018: empty justification on an advisory-failing finding
 * (R-WORKLOG-DRIFT) causes validate to exit error.
 */
// QFAI:SPEC-0004:TC-0004-0018
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import { loadConfig } from "../../src/core/config.js";

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

async function seedReviewerReport(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "review", "review-2026-05-23");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "reviewer-completion.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

describe("reviewerJustification validator", () => {
  it("returns no issues when .qfai/review/ is absent", async () => {
    const root = await newRoot("revjust-absent");
    try {
      const issues = await validateReviewerJustification(root, await getConfig(root));
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0018: empty justification on R-WORKLOG-DRIFT
  it("TC-0004-0018: emits error when R-WORKLOG-DRIFT carries empty justification", async () => {
    const root = await newRoot("revjust-empty");
    try {
      await seedReviewerReport(root, {
        findings: [
          { code: "R-WORKLOG-DRIFT", justification: "" },
          { code: "R-HANDOFF-INCOMPLETE", justification: "missing State and Constraints sections." },
        ],
      });
      const issues = await validateReviewerJustification(root, await getConfig(root));
      const drift = issues.filter((i) => i.code === "R-WORKLOG-DRIFT");
      expect(drift.length).toBe(1);
      expect(drift[0]?.severity).toBe("error");
      // Non-empty justification on a different code should NOT fire.
      const handoff = issues.filter((i) => i.code === "R-HANDOFF-INCOMPLETE");
      expect(handoff.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not fire on non-advisory codes regardless of justification", async () => {
    const root = await newRoot("revjust-noncare");
    try {
      await seedReviewerReport(root, {
        findings: [{ code: "I-INFO-ONLY", justification: "" }],
      });
      const issues = await validateReviewerJustification(root, await getConfig(root));
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

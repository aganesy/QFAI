import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_REQUIRED_ENTRIES,
} from "../../src/core/gitignore.js";
import { validateReviewArtifacts } from "../../src/core/validators/reviewArtifacts.js";

async function withGitignore(
  content: string,
  assertion: (issues: Awaited<ReturnType<typeof validateReviewArtifacts>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-"));
  try {
    await writeFile(path.join(root, ".gitignore"), content, "utf-8");
    assertion(await validateReviewArtifacts(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the managed block keeps governance records tracked", () => {
  it("writes the negations after the ignore lines", () => {
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
      expect(lines).toContain(negation);
      // git applies the last matching pattern, so a negation before its ignore
      // would have no effect.
      expect(lines.indexOf(negation)).toBeGreaterThan(lines.indexOf(".qfai/evidence/*"));
    }
  });

  it("does not make the negations a validation requirement", () => {
    // An existing project's .gitignore predates them and must not start failing.
    for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
      expect(QFAI_GITIGNORE_REQUIRED_ENTRIES).not.toContain(negation);
    }
  });

  it("re-includes the directory writeDecisionRecord actually writes to", () => {
    // `.qfai/evidence/decisions/<ISO8601-stamp>.json` — git will not descend
    // into a directory ignored by `.qfai/evidence/*`, so the directory itself
    // must be negated before its contents.
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/evidence/decisions/");
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/evidence/decisions/**");
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines.indexOf("!.qfai/evidence/decisions/")).toBeLessThan(
      lines.indexOf("!.qfai/evidence/decisions/**"),
    );
  });
});

describe("QFAI-REVIEW-001 does not punish tracking the audit trail", () => {
  it("passes on a marker-only block with every ignore line removed", async () => {
    await withGitignore(`${QFAI_GITIGNORE_MARKER}\nnode_modules/\n`, (issues) => {
      expect(issues.some((entry) => entry.code === "QFAI-REVIEW-001")).toBe(false);
    });
  });

  it("reports the removed defaults as info, not error", async () => {
    await withGitignore(`${QFAI_GITIGNORE_MARKER}\nnode_modules/\n`, (issues) => {
      const notice = issues.find((entry) => entry.code === "QFAI-REVIEW-008");
      expect(notice?.severity).toBe("info");
      expect(notice?.refs).toContain(".qfai/evidence/*");
    });
  });

  it("still errors when the marker block is absent entirely", async () => {
    await withGitignore("node_modules/\n", (issues) => {
      const finding = issues.find((entry) => entry.code === "QFAI-REVIEW-001");
      expect(finding?.severity).toBe("error");
    });
  });

  it("stays silent on a full managed block", async () => {
    await withGitignore(QFAI_GITIGNORE_BLOCK, (issues) => {
      expect(issues.some((entry) => entry.code === "QFAI-REVIEW-001")).toBe(false);
      expect(issues.some((entry) => entry.code === "QFAI-REVIEW-008")).toBe(false);
    });
  });
});

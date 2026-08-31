import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";
import { validateReviewArtifacts } from "../../src/core/validators/reviewArtifacts.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFile = promisify(execFileCb);

async function withGitignore(
  content: string,
  assertion: (issues: Awaited<ReturnType<typeof validateReviewArtifacts>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-"));
  try {
    await writeFile(path.join(root, ".gitignore"), content, "utf-8");
    assertion(await validateReviewArtifacts(root));
  } finally {
    await removeTempTree(root);
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
      expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain(negation);
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

  it("re-includes the parent directories a leaf negation cannot reach", () => {
    // Git cannot re-include a path whose parent directory is excluded, so a
    // pre-existing `.qfai/` or `.qfai/*` shadows the leaf negations entirely.
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/");
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/evidence/");
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines.indexOf("!.qfai/")).toBeLessThan(lines.indexOf("!.qfai/evidence/"));
    expect(lines.indexOf("!.qfai/evidence/")).toBeLessThan(
      lines.indexOf("!.qfai/evidence/decisions/"),
    );
  });

  it("re-includes the implementation and ATDD evidence records", () => {
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/evidence/implement-*.md");
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain("!.qfai/evidence/atdd-*.md");
  });
});

describe("git honours the managed block against a broad pre-existing rule", () => {
  /** Files the managed block must keep ignored, whatever the pre-existing rule. */
  const stillIgnored = [
    ".qfai/evidence/prototyping/mutation-log.jsonl",
    ".qfai/report/validate.json",
  ];
  /** Governance records that must stay reachable. */
  const stillTracked = [
    ".qfai/evidence/decisions/2026-01-01T00-00-00.000Z.json",
    ".qfai/evidence/implement-spec-0001.md",
    ".qfai/evidence/atdd-spec-0001.md",
    ".qfai/decisions/CR-0001.md",
  ];

  async function isIgnored(root: string, relativePath: string): Promise<boolean> {
    try {
      await execFile("git", ["check-ignore", "-q", "--", relativePath], { cwd: root });
      return true;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 1
      ) {
        return false;
      }
      throw error;
    }
  }

  // The three shapes an adopting project's own `.gitignore` may already carry.
  for (const preExisting of [".qfai/", ".qfai/*", ".qfai/evidence/"]) {
    it(`keeps the decision record trackable under a pre-existing \`${preExisting}\``, async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-git-"));
      try {
        await execFile("git", ["init"], { cwd: root });
        await writeFile(
          path.join(root, ".gitignore"),
          `node_modules/\n${preExisting}\n${QFAI_GITIGNORE_BLOCK}`,
          "utf-8",
        );
        for (const relativePath of [...stillIgnored, ...stillTracked]) {
          await mkdir(path.join(root, path.dirname(relativePath)), { recursive: true });
          await writeFile(path.join(root, relativePath), "{}\n", "utf-8");
        }

        for (const relativePath of stillTracked) {
          expect(await isIgnored(root, relativePath), `${relativePath} must be trackable`).toBe(
            false,
          );
        }
        // The parent re-inclusions must not widen the block: generated evidence
        // and reports stay ignored.
        for (const relativePath of stillIgnored) {
          expect(await isIgnored(root, relativePath), `${relativePath} must stay ignored`).toBe(
            true,
          );
        }
      } finally {
        await removeTempTree(root);
      }
    });
  }
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

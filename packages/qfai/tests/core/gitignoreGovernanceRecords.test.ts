// QFAI:EX-0001-0033-03
import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_LEGACY_LINES,
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";
import { CANONICAL_TIMESTAMP_GLOB } from "../../src/core/packLocator.js";
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

/** Every negation an earlier managed block wrote under `.qfai/evidence/`. */
const RETIRED_EVIDENCE_LINES = [
  ".qfai/evidence/prototyping/*",
  "!.qfai/evidence/",
  "!.qfai/evidence/decision/",
  "!.qfai/evidence/decision/**",
  "!.qfai/evidence/prototyping/",
  "!.qfai/evidence/prototyping/grilling.md",
  "!.qfai/evidence/workflow/",
  "!.qfai/evidence/change-request-*.md",
  "!.qfai/evidence/decision-*.md",
  "!.qfai/evidence/implement-*.md",
  "!.qfai/evidence/sdd-*.md",
  `!.qfai/evidence/discussion-${CANONICAL_TIMESTAMP_GLOB}.md`,
  "!.qfai/evidence/atdd-*.md",
  "!.qfai/evidence/import-lite.md",
  `!.qfai/evidence/import-lite-${CANONICAL_TIMESTAMP_GLOB}.md`,
  "!.qfai/evidence/coverage-depth-*.md",
  "!.qfai/evidence/skeleton.md",
];

describe("the managed block ignores the evidence directory whole", () => {
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

  it("re-includes nothing under the evidence directory", () => {
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines).toContain(".qfai/evidence/*");
    expect(lines.filter((line) => line.includes(".qfai/evidence/"))).toEqual([".qfai/evidence/*"]);
  });

  it("retires every line that re-included or re-ignored a record under it", () => {
    // A rerun strips a retired line from the block, so an adopter's evidence
    // becomes ignored on the next `qfai init`.
    for (const line of RETIRED_EVIDENCE_LINES) {
      expect(QFAI_GITIGNORE_LEGACY_LINES).toContain(line);
      expect(QFAI_GITIGNORE_BLOCK.split("\n")).not.toContain(line);
    }
  });

  it("retires the obsolete decision directory negations", () => {
    for (const line of ["!.qfai/decisions/", "!.qfai/decisions/**"]) {
      expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).not.toContain(line);
      expect(QFAI_GITIGNORE_LEGACY_LINES).toContain(line);
      expect(QFAI_GITIGNORE_BLOCK.split("\n")).not.toContain(line);
    }
  });
});

describe("git honours the managed block against a broad pre-existing rule", () => {
  /** Local records the managed block keeps out of every commit. */
  const ignored = [
    ".qfai/evidence/decision/2026-01-01T00-00-00.000Z.json",
    ".qfai/evidence/implement-BF-0001.md",
    ".qfai/evidence/atdd-BF-0001.md",
    ".qfai/evidence/sdd-BF-0001.md",
    ".qfai/evidence/discussion-20260101000000000.md",
    ".qfai/evidence/import-lite-20260101000000000.md",
    ".qfai/evidence/skeleton.md",
    ".qfai/evidence/workflow/run-20260101000000000/summary.json",
    ".qfai/evidence/prototyping/grilling.md",
    ".qfai/evidence/prototyping/mutation-log.jsonl",
    ".qfai/report/validate.json",
  ];
  /** Records under `.qfai/` that stay in version control. */
  const tracked = [".qfai/install-provenance.json", ".qfai/assistant/.assets.lock.json"];

  async function isIgnored(root: string, relativePath: string): Promise<boolean> {
    try {
      await execFile("git", ["check-ignore", "-q", "--", relativePath], { cwd: root });
      return true;
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && Reflect.get(error, "code") === 1) {
        return false;
      }
      throw error;
    }
  }

  // This repository uses its own root `.qfai/` as an installed QFAI tree.
  // Evidence there is a local work area, so nothing under it may reach a commit.
  it("this repository's own ignores keep every evidence record out of version control", async () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(here, "..", "..", "..", "..");
    for (const relativePath of [
      ".qfai/evidence/skeleton.md",
      ".qfai/evidence/verify-spec-0001.md",
      ".qfai/evidence/decision/2026-01-01T00-00-00.000Z.json",
      ".qfai/evidence/workflow/run/summary.json",
      ".qfai/evidence/migration-spec-to-story/retired/spec-0001/07_Decisions.md",
    ]) {
      expect(await isIgnored(repoRoot, relativePath), `${relativePath} must be ignored`).toBe(true);
    }
  });

  // The shapes an adopting project's own `.gitignore` may already carry, and none.
  for (const preExisting of ["", ".qfai/", ".qfai/*", ".qfai/evidence/"]) {
    it(`keeps evidence local under a pre-existing \`${preExisting}\``, async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-git-"));
      try {
        await execFile("git", ["init"], { cwd: root });
        await writeFile(
          path.join(root, ".gitignore"),
          `node_modules/\n${preExisting}\n${QFAI_GITIGNORE_BLOCK}`,
          "utf-8",
        );
        for (const relativePath of [...ignored, ...tracked]) {
          await mkdir(path.join(root, path.dirname(relativePath)), { recursive: true });
          await writeFile(path.join(root, relativePath), "{}\n", "utf-8");
        }

        for (const relativePath of ignored) {
          expect(await isIgnored(root, relativePath), `${relativePath} must be ignored`).toBe(true);
        }
        for (const relativePath of tracked) {
          expect(await isIgnored(root, relativePath), `${relativePath} must be trackable`).toBe(
            false,
          );
        }
      } finally {
        await removeTempTree(root);
      }
    });
  }
});

describe("QFAI-REVIEW-001 does not punish a project's own ignore choices", () => {
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

import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

  it("re-includes the per-item evidence the completion gate anchors into", () => {
    // Gate item 10 resolves every `test-list.md` Evidence anchor against
    // `.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md`
    // for an E2E / API / Integration row. Ignored, the anchor resolves only on
    // the machine that ran the gate.
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    for (const negation of ["!.qfai/evidence/implement-*.md", "!.qfai/evidence/atdd-*.md"]) {
      expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain(negation);
      expect(lines.indexOf(negation)).toBeGreaterThan(lines.indexOf(".qfai/evidence/*"));
    }
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
    // The negation is narrow on purpose: the other stage evidence files stay
    // regenerable logs, and re-including them was never the point.
    ".qfai/evidence/sdd-spec-0001.md",
    ".qfai/evidence/verify-spec-0001.md",
  ];
  /** Governance records that must stay reachable. */
  const stillTracked = [
    ".qfai/evidence/decisions/2026-01-01T00-00-00.000Z.json",
    ".qfai/evidence/implement-spec-0001.md",
    ".qfai/evidence/atdd-spec-0001.md",
    ".qfai/decisions/CR-0001.md",
    // The two files gate item 10 names, and the only ones it resolves an
    // Evidence anchor against.
    ".qfai/evidence/implement-spec-0001.md",
    ".qfai/evidence/atdd-spec-0001.md",
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

/**
 * The negation only stops git from HIDING the file. It does not stage one, so
 * the shipped instructions decide whether these records reach a commit.
 *
 * **Before this change they said they must not.** `orchestrator.md` labelled all
 * of `.qfai/evidence/` "gitignored; do not commit" and its Sign-off box repeated
 * it; `drift-protocol.md` classified `.qfai/evidence/<stage>-<spec-id>.md` as
 * regenerable and not committed; `evidence-revision.md` argued from
 * `implement-<spec-id>.md` being unavailable to commit; and `qfai-atdd`, which
 * owns `atdd-<spec-id>.md`, called its own stage evidence regenerable and left
 * that file out of its governance-record list. An agent following any of them
 * left the two records untracked and the Evidence anchor resolving on one
 * machine only — the failure this change exists to end, reached through the
 * instructions instead of through git.
 *
 * The cases below assert the repaired state: each names the wording that has to
 * be gone and the wording that has to be there.
 */
describe("the shipped instructions commit the records the managed block untracks", () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
  );
  const TREES = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];

  /** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
  const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

  const read = async (tree: string, rel: string): Promise<string> =>
    unwrap(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

  for (const tree of TREES) {
    it(`${tree}: names the RED/GREEN records as committed governance records`, async () => {
      const drift = await read(tree, "constitution/drift-protocol.md");
      // The classification these two moved OUT of, and the one they moved into.
      expect(drift).not.toContain(
        "**Regenerable** — stage evidence (`.qfai/evidence/<stage>-<spec-id>.md`), run logs, reports",
      );
      expect(drift).toContain("`.qfai/evidence/implement-<spec-id>.md`");
      expect(drift).toContain("`.qfai/evidence/atdd-<spec-id>.md`");
      expect(drift).toContain("so they are committed");
      // A negation is not a commit, and the instruction has to say so.
      expect(drift).toContain("Committing them is a step, not a consequence");

      const orchestrator = await read(tree, "agents/orchestrator.md");
      expect(orchestrator).not.toContain("`.qfai/evidence/` (gitignored; do not commit)");
      expect(orchestrator).toContain("must** be committed");
      // The Sign-off box is the last thing an orchestrator reads, and it
      // repeated the blanket claim the Deliverables line had just dropped.
      expect(orchestrator, "the Sign-off box still says evidence is gitignored").not.toContain(
        "- [ ] Evidence is present (gitignored)",
      );
      expect(orchestrator).toContain("governance records committed");

      // `/qfai-atdd` owns `atdd-<spec-id>.md`, so its own list decides whether
      // that half of the split is committed. It called the file regenerable.
      const atdd = await read(tree, "skills/qfai-atdd/SKILL.md");
      expect(atdd, "the ATDD skill still calls its stage evidence uncommitted").not.toContain(
        "Stage evidence is **regenerable** and is not committed",
      );
      expect(atdd).toContain("stage's own `.qfai/evidence/atdd-<spec-id>.md`**");
      expect(atdd).toContain("A negation does");
      expect(atdd).toContain("not stage a file");

      const revision = await read(tree, "skills/qfai-implement/references/evidence-revision.md");
      expect(revision).not.toContain(
        "stage evidence is regenerable and deliberately not committed",
      );
      expect(revision).toContain("are now governance records and ARE committed");
    });

    it(`${tree}: every record it calls committed is one the managed block negates`, async () => {
      const drift = await read(tree, "constitution/drift-protocol.md");
      // The document must not promise tracking for a path the block still
      // ignores — that is the same false instruction pointing the other way.
      for (const pattern of ["implement-*.md", "atdd-*.md"]) {
        expect(
          QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
          `${pattern} is named as committed and must be negated`,
        ).toContain(`!.qfai/evidence/${pattern}`);
      }
      expect(drift).toContain("managed");
    });
  }
});

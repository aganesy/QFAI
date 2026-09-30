import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import { ensureRootGitignoreEntries, replaceRootGitignore } from "../../core/init/rootGitignore.js";
import { isEnoent } from "../../core/fs/errno.js";
import { reincludesEvidence, trackedEvidence, untrackEvidence } from "./evidenceIndex.js";
import type {
  GitIndexPlan,
  MigrationContext,
  MigrationOperation,
  MigrationStep,
  StepPlan,
} from "./harness.js";

const EVIDENCE_IGNORE = ".qfai/evidence/.gitignore";
const BLOCK_UPDATE = "maintain the managed QFAI block and its staging";

type PartialPlan = { operations: MigrationOperation[]; forAPerson: string[] };

async function readGitignore(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

/**
 * One operation on `.gitignore`: drop every line that re-includes
 * `.qfai/evidence/`, inside the managed block or outside it, then rebuild the
 * block. The removal runs first because the block writer reads a retired line
 * sitting just below the block as part of it.
 */
async function gitignorePlan(root: string, rebuildBlock: boolean): Promise<PartialPlan> {
  const file = path.join(root, ".gitignore");
  const existing = await readGitignore(file);
  const removed = (existing ?? "").split("\n").filter(reincludesEvidence);
  const preview = await ensureRootGitignoreEntries(root, true, () => {});
  const maintain = rebuildBlock || preview.staging.length > 0;
  const rebuild = maintain && preview.copied.length > 0;
  const targets: string[] = [];
  const report: string[] = [];
  if (rebuild || removed.length > 0) targets.push(".gitignore");
  if (rebuild) report.push(`.gitignore: ${BLOCK_UPDATE}`);
  for (const line of removed) report.push(`.gitignore: remove \`${line.trimEnd()}\``);
  for (const stage of maintain ? preview.staging : []) {
    targets.push(stage, `${stage}.owner`);
    report.push(`${stage}: ${BLOCK_UPDATE}`, `${stage}.owner: ${BLOCK_UPDATE}`);
  }
  const first = targets[0];
  if (first === undefined) return { operations: [], forAPerson: preview.stagingConflicts };
  return {
    forAPerson: preview.stagingConflicts,
    operations: [
      {
        kind: "delegate",
        target: first,
        targets,
        description: BLOCK_UPDATE,
        report,
        apply: async () => {
          if (removed.length > 0) {
            const current = await readFile(file, "utf8");
            const kept = current.split("\n").filter((line) => !reincludesEvidence(line));
            await replaceRootGitignore(root, file, kept.join("\n"), current, true);
          }
          if (maintain) await ensureRootGitignoreEntries(root, false, () => {});
        },
      },
    ],
  };
}

/** Every line a nested ignore file holds governs only paths the managed block ignores whole. */
async function evidenceIgnorePlan(root: string): Promise<PartialPlan> {
  let stats;
  try {
    stats = await lstat(path.join(root, EVIDENCE_IGNORE));
  } catch (error) {
    if (isEnoent(error)) return { operations: [], forAPerson: [] };
    throw error;
  }
  if (stats.isFile()) {
    return {
      operations: [{ kind: "remove", target: EVIDENCE_IGNORE, description: "delete" }],
      forAPerson: [],
    };
  }
  return {
    operations: [],
    forAPerson: [
      `${EVIDENCE_IGNORE}: it is not a regular file, so step 10 left it as it is; remove it so that git reads no ignore rules inside \`.qfai/evidence/\``,
    ],
  };
}

function gitIndexPlan(root: string): GitIndexPlan {
  const tracked = trackedEvidence(root);
  if (tracked === null) return { kind: "not-a-repository" };
  if (tracked.length === 0) return { kind: "nothing-tracked" };
  return { kind: "untrack", count: tracked.length, apply: () => untrackEvidence(root) };
}

/**
 * Keeps `.qfai/evidence/` local: its re-include lines, its nested ignore file
 * and its git index entries go. `rebuildBlock` is false on a tree already on
 * the story layout, which keeps its managed block unless staging needs
 * reclaiming.
 */
export async function planStep10(
  context: MigrationContext,
  rebuildBlock: boolean,
): Promise<StepPlan> {
  const gitignore = await gitignorePlan(context.root, rebuildBlock);
  const evidence = await evidenceIgnorePlan(context.root);
  return {
    operations: [...gitignore.operations, ...evidence.operations],
    forAPerson: [...gitignore.forAPerson, ...evidence.forAPerson],
    gitIndex: gitIndexPlan(context.root),
  };
}

export const step10: MigrationStep = {
  number: 10,
  writeSet: ["gitignore", "gitignore-staging", "evidence-gitignore"],
  sections: ["Git index", "For a person"],
  plan: (context) => planStep10(context, true),
};

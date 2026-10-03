import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js";
import type { MigrationContext, MigrationStep, StepPlan } from "./harness.js";

const BLOCK_UPDATE = "reset the managed QFAI block";

/**
 * Brings the managed block of `.gitignore` to the one the installed package
 * writes, through the writer `qfai init` uses. Every line outside the block
 * stays as it is.
 */
export async function planStep10(context: MigrationContext): Promise<StepPlan> {
  const preview = await ensureRootGitignoreEntries(context.root, true, () => {});
  if (preview.copied.length === 0) return { operations: [] };
  return {
    operations: [
      {
        kind: "delegate",
        target: ".gitignore",
        description: BLOCK_UPDATE,
        apply: async () => {
          await ensureRootGitignoreEntries(context.root, false, () => {});
        },
      },
    ],
  };
}

export const step10: MigrationStep = {
  number: 10,
  writeSet: ["gitignore"],
  sections: ["For a person"],
  plan: planStep10,
};

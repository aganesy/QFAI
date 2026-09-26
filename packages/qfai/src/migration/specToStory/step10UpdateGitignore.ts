import { ensureRootGitignoreEntries } from "../../cli/commands/init.js";
import type { MigrationStep } from "./harness.js";

export const step10: MigrationStep = {
  number: 10,
  writeSet: ["gitignore", "gitignore-staging"],
  sections: ["For a person"],
  async plan(context) {
    const preview = await ensureRootGitignoreEntries(context.root, true, () => {});
    const targets: string[] = [];
    if (preview.copied.length > 0) targets.push(".gitignore");
    for (const stage of preview.staging) targets.push(stage, `${stage}.owner`);
    const first = targets[0];
    if (first === undefined) return { operations: [], forAPerson: preview.stagingConflicts };
    return {
      forAPerson: preview.stagingConflicts,
      operations: [
        {
          kind: "delegate",
          target: first,
          targets,
          description: "maintain the managed QFAI block and its staging",
          apply: async () => {
            await ensureRootGitignoreEntries(context.root, false, () => {});
          },
        },
      ],
    };
  },
};

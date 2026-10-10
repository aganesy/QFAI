import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js";
import { CANONICAL_TIMESTAMP_GLOB } from "../../core/packLocator.js";
import type { MigrationContext, MigrationStep, StepPlan } from "./harness.js";

const BLOCK_UPDATE = "reset the managed QFAI block";

/**
 * The lines a 1.x managed block carries that the installed block does not. Every one is dropped
 * from the block. The discussion ignore line was renamed rather than dropped, so a block that
 * holds it and not its successor keeps an ignore for the discussion directory.
 */
export const EARLIER_BLOCK_LINES: ReadonlyMap<string, string | null> = new Map([
  ["!.qfai/report/README.md", null],
  ["!.qfai/evidence/README.md", null],
  ["!.qfai/discussion/README.md", null],
  ["!.qfai/review/README.md", null],
  [".qfai/discussion/discussion-*/", ".qfai/discussion/*"],
  ["!.qfai/review/review-*/", null],
  ["!.qfai/review/review-*/**", null],
  ["!.qfai/review/.legacy-packs", null],
  ["!.qfai/review/", null],
  ["!.qfai/evidence/decisions/", null],
  ["!.qfai/evidence/decisions/**", null],
  ["!.qfai/decisions/", null],
  ["!.qfai/decisions/**", null],
  [".qfai/evidence/prototyping/*", null],
  ["!.qfai/evidence/", null],
  ["!.qfai/evidence/decision/", null],
  ["!.qfai/evidence/decision/**", null],
  ["!.qfai/evidence/prototyping/", null],
  ["!.qfai/evidence/prototyping/grilling.md", null],
  ["!.qfai/evidence/workflow/", null],
  ["!.qfai/evidence/change-request-*.md", null],
  ["!.qfai/evidence/decision-*.md", null],
  ["!.qfai/evidence/implement-*.md", null],
  ["!.qfai/evidence/sdd-*.md", null],
  [`!.qfai/evidence/discussion-${CANONICAL_TIMESTAMP_GLOB}.md`, null],
  ["!.qfai/evidence/atdd-*.md", null],
  ["!.qfai/evidence/import-lite.md", null],
  [`!.qfai/evidence/import-lite-${CANONICAL_TIMESTAMP_GLOB}.md`, null],
  ["!.qfai/evidence/coverage-depth-*.md", null],
  ["!.qfai/evidence/skeleton.md", null],
  ["!.qfai/install-provenance.json", null],
  ["!.qfai/assistant/.assets.lock.json", null],
]);

/**
 * Brings the managed block of `.gitignore` to the one the installed package
 * writes, through the writer `qfai init` uses. Every line outside the block
 * stays as it is.
 */
export async function planStep10(context: MigrationContext): Promise<StepPlan> {
  const preview = await ensureRootGitignoreEntries(
    context.root,
    true,
    () => {},
    EARLIER_BLOCK_LINES,
  );
  if (preview.copied.length === 0) return { operations: [] };
  return {
    operations: [
      {
        kind: "delegate",
        target: ".gitignore",
        description: BLOCK_UPDATE,
        apply: async () => {
          await ensureRootGitignoreEntries(context.root, false, () => {}, EARLIER_BLOCK_LINES);
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

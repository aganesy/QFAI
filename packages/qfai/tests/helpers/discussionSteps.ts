/**
 * The text `/qfai-discussion` runs: its `SKILL.md` and the steps it lists.
 *
 * A suite that pins a sentence of the discussion procedure reads the parent and
 * its steps together, so moving a sentence between them does not break it. A
 * suite that pins where a sentence lives reads one step with
 * {@link readDiscussionStep}.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

/** The steps `qfai-discussion/SKILL.md` lists, in the order it runs them. */
export const DISCUSSION_STEPS = [
  "discussion-research",
  "discussion-interview",
  "discussion-pack",
  "discussion-oq",
  "discussion-uiux",
] as const;

export type DiscussionStep = (typeof DISCUSSION_STEPS)[number];

/** `<assistantDir>/step/<name>/STEP.md`. */
export function discussionStepPath(assistantDir: string, name: DiscussionStep): string {
  return path.join(assistantDir, "step", name, "STEP.md");
}

/**
 * One step's `STEP.md`.
 *
 * @param assistantDir a `.qfai/assistant` directory: the shipped source or the root mirror.
 */
export function readDiscussionStep(assistantDir: string, name: DiscussionStep): Promise<string> {
  return readFile(discussionStepPath(assistantDir, name), "utf-8");
}

/**
 * The parent `SKILL.md` followed by every step it lists, joined by a blank line.
 *
 * @param assistantDir a `.qfai/assistant` directory: the shipped source or the root mirror.
 */
export async function readDiscussionSkill(assistantDir: string): Promise<string> {
  const parts = await Promise.all([
    readFile(path.join(assistantDir, "skill", "qfai-discussion", "SKILL.md"), "utf-8"),
    ...DISCUSSION_STEPS.map((name) => readDiscussionStep(assistantDir, name)),
  ]);
  return parts.join("\n\n");
}

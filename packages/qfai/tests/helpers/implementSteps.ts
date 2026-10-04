/**
 * The text `/qfai-implement` runs for a business flow: its default step,
 * `implement-tdd`, which holds the flow procedure and its completion gate.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

/** The default step order of `qfai-implement` for `<BF-ID>`. */
export const IMPLEMENT_FLOW_STEPS = ["implement-tdd"] as const;

/** `<assistantDir>/step/<name>/STEP.md`. */
export function implementStepPath(assistantDir: string, name: string): string {
  return path.join(assistantDir, "step", name, "STEP.md");
}

/**
 * The default steps, joined by a blank line.
 *
 * @param assistantDir a `.qfai/assistant` directory: the shipped source or the root mirror.
 */
export async function readImplementFlowSteps(assistantDir: string): Promise<string> {
  const parts = await Promise.all(
    IMPLEMENT_FLOW_STEPS.map((name) => readFile(implementStepPath(assistantDir, name), "utf-8")),
  );
  return parts.join("\n\n");
}

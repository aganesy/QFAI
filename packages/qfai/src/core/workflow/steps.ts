import { ASSISTANT_DIR } from "../paths/assistantPaths.js";

// A step of the vocabulary that no plan stage may run.
export const SEAM_STEP = "implement-seam";

// Where an installed step's entry file sits, relative to the project root.
export function stepPath(name: string): string {
  return `${ASSISTANT_DIR}/step/${name}/STEP.md`;
}

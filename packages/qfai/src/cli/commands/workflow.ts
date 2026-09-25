import { EXIT_CODES } from "../lib/exitCodes.js";

// SIMPLIFIED: maps a refusal by its code alone; an unmet finish and a write on a journal that
// fails its integrity check are not told apart from other outcomes.
// Lift when: the command adapter runs finish and the journal integrity check.
export function workflowExitCode(error: { code: string } | undefined): number {
  if (!error) return EXIT_CODES.ok;
  return error.code === "io-error" ? EXIT_CODES.findings : EXIT_CODES.inputError;
}

/**
 * Reviewer-Gate finding `R-EVIDENCE-MUTATION-UNLOGGED` (severity
 * error).
 *
 * SSOT-sync pair scan: each source file known to mutate iter-NN
 * evidence (rename / unlink / overwrite) MUST also call a member of
 * the mutation-log writer module. Asymmetric (mutation token present,
 * log token absent) surfaces this finding.
 *
 * The pair manifest below is the explicit list of mutation call-sites
 * the codebase recognises today. New mutation sites added to a future
 * commit MUST extend the manifest in the same patch — that is the
 * structural contract this validator enforces.
 *
 * Mirrors the `MOCK_HREF_PAIRS` / `detectMockHrefDrift` pattern: short
 * literal substring tokens, no regex; symmetric absent/present → no
 * finding.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

export type EvidenceMutationPair = {
  /** Human-readable name of the mutation surface. */
  readonly clause: string;
  /** Source file under the package that performs the mutation. */
  readonly sourceRel: string;
  /**
   * Substrings whose presence indicates a destructive iter-NN
   * mutation call-site (e.g. `await rename(`, `await unlink(`). Must
   * appear in the source file for the pair check to engage.
   */
  readonly mutationTokens: readonly string[];
  /**
   * Substrings whose presence proves the mutation site is paired with
   * a mutation-log writer call (e.g. `logEvidenceMove`,
   * `appendMutationLogEntry`).
   */
  readonly logTokens: readonly string[];
};

/**
 * SSOT manifest for paired mutation call-sites. Each entry maps to a
 * concrete source file under `packages/qfai/src/core/prototyping/` (or
 * equivalent). The pair check runs once per entry; a future mutation
 * site must add a new row here so the validator catches missing
 * pairing.
 */
export const EVIDENCE_MUTATION_PAIRS: readonly EvidenceMutationPair[] = [
  {
    clause: "iterate-cycle-0-force-rename",
    sourceRel: "packages/qfai/src/cli/commands/prototypingIterate.ts",
    mutationTokens: ["await rename(iter00Abs"],
    logTokens: ["logEvidenceMove"],
  },
  {
    // Mutation-log wiring-depth extension: every
    // iter-NN/ directory rm-loop (clearEvidenceIterDirs) MUST funnel
    // through `logEvidenceDelete` before the destructive rm. The pair
    // scan keys on the cycle-0 reset call-site tokens.
    clause: "iterate-cycle-0-clear-evidence-iter-dirs",
    sourceRel: "packages/qfai/src/cli/commands/prototypingIterate.ts",
    mutationTokens: ["await rm(abs, { recursive: true, force: true })"],
    logTokens: ["logEvidenceDelete"],
  },
];

const FINDING_CODE = "R-EVIDENCE-MUTATION-UNLOGGED";

/**
 * Scan the pair manifest. For each pair: when the source file exists
 * and contains any of the mutation tokens but none of the log tokens,
 * emit one finding naming the source file + which log token must be
 * added.
 */
export async function detectEvidenceMutationUnlogged(root: string): Promise<readonly Issue[]> {
  const issues: Issue[] = [];
  for (const pair of EVIDENCE_MUTATION_PAIRS) {
    const abs = path.join(root, pair.sourceRel);
    if (!(await exists(abs))) continue;
    let text = "";
    try {
      text = await readFile(abs, "utf-8");
    } catch {
      continue;
    }
    const hasMutation = pair.mutationTokens.some((token) => text.includes(token));
    if (!hasMutation) continue;
    const hasLog = pair.logTokens.some((token) => text.includes(token));
    if (hasLog) continue;
    const message =
      `${FINDING_CODE}: ${pair.sourceRel} performs an iter-NN evidence mutation ` +
      `(clause=${pair.clause}, mutation tokens=[${pair.mutationTokens.join(", ")}]) ` +
      `but does NOT call the mutation-log writer (expected one of: ` +
      `${pair.logTokens.join(", ")}). The mutation MUST funnel through ` +
      `core/prototyping/mutationLog.ts so the audit log records the change. ` +
      `Justification: file=${pair.sourceRel}, missing=mutationLog call.`;
    issues.push(
      issue(
        FINDING_CODE,
        message,
        "error",
        pair.sourceRel,
        "reviewerGate.evidenceMutationUnlogged",
      ),
    );
  }
  return issues;
}

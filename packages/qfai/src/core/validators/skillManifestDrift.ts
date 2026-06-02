/**
 * Reviewer-Gate finding `R-SKILL-MANIFEST-DRIFT` (severity error).
 *
 * SSOT-sync pair scan (Pair III): each registered pair lists a
 * probe-implementation source file and a manifest-schema source file
 * that MUST both reference the canonical field name token (or both
 * omit it). Asymmetric presence — one side declares the token and the
 * other side does not — surfaces this finding.
 *
 * Mirrors the `detectMockHrefDrift` / `detectEvidenceMutationUnlogged`
 * pattern: short literal substring tokens, no regex; symmetric
 * absent/present → no finding.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";
import { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";

export { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";
export type { SkillManifestPair } from "./skillManifestPairs.js";

const FINDING_CODE = "R-SKILL-MANIFEST-DRIFT";

async function readSafe(abs: string): Promise<string | null> {
  if (!(await exists(abs))) {
    return null;
  }
  try {
    return await readFile(abs, "utf-8");
  } catch {
    return null;
  }
}

export async function detectSkillManifestDrift(root: string): Promise<readonly Issue[]> {
  const issues: Issue[] = [];
  for (const pair of SKILL_MANIFEST_PAIRS) {
    const probeAbs = path.join(root, pair.probeImplRel);
    const schemaAbs = path.join(root, pair.schemaRel);
    const probeText = await readSafe(probeAbs);
    const schemaText = await readSafe(schemaAbs);
    if (probeText === null || schemaText === null) {
      // Either side absent (consumer repo without the package source) →
      // no signal. Pair check is intentionally conservative.
      continue;
    }
    const probeHas = probeText.includes(pair.probeToken);
    const schemaHas = schemaText.includes(pair.schemaToken);
    if (probeHas === schemaHas) {
      continue;
    }
    const presentSide = probeHas ? "probe-impl" : "schema";
    const missingSide = probeHas ? "schema" : "probe-impl";
    const missingFile = probeHas ? pair.schemaRel : pair.probeImplRel;
    const message =
      `${FINDING_CODE}: skill manifest contract surfaces are out of sync ` +
      `(clause=${pair.clause}). The ${presentSide} side references token ` +
      `'${probeHas ? pair.probeToken : pair.schemaToken}' but the ${missingSide} ` +
      `side (${missingFile}) does not. Add the canonical token to ${missingFile} ` +
      `in the same patch to restore SSOT-sync. ` +
      `Justification: clause=${pair.clause}, missing=${missingFile}.`;
    issues.push(
      issue(FINDING_CODE, message, "error", missingFile, "reviewerGate.skillManifestDrift"),
    );
  }
  return issues;
}

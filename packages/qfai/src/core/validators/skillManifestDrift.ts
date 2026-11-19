/**
 * Reviewer-Gate finding `QFAI-MANIFEST-001` (severity error).
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

import path from "node:path";

import type { Issue } from "../types.js";
import { issue, readPresentFile, type PresentFileRead } from "./utils.js";
import { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";

export { SKILL_MANIFEST_PAIRS } from "./skillManifestPairs.js";
export type { SkillManifestPair } from "./skillManifestPairs.js";

const FINDING_CODE = "QFAI-MANIFEST-001";
const RULE = "reviewerGate.skillManifestDrift";

/** The finding for a side of an in-scope pair that is there and cannot be read. */
function unreadableSide(rel: string, read: PresentFileRead, clause: string): Issue[] {
  if (read.kind !== "unreadable") return [];
  const message =
    `${FINDING_CODE}: ${rel} could not be read (${read.reason}), so the skill manifest ` +
    `SSOT-sync check for clause=${clause} is incomplete. Make it a readable file.`;
  return [issue(FINDING_CODE, message, "error", rel, RULE)];
}

export async function detectSkillManifestDrift(root: string): Promise<readonly Issue[]> {
  const issues: Issue[] = [];
  for (const pair of SKILL_MANIFEST_PAIRS) {
    const probe = await readPresentFile(path.join(root, pair.probeImplRel));
    const schema = await readPresentFile(path.join(root, pair.schemaRel));
    if (probe.kind === "absent" || schema.kind === "absent") {
      // Either side absent (consumer repo without the package source) →
      // no signal. Pair check is intentionally conservative.
      continue;
    }
    if (probe.kind === "unreadable" || schema.kind === "unreadable") {
      // Both sides are there, so the pair is in scope: a side that cannot be
      // read leaves the comparison undone, which is not the same as in sync.
      issues.push(
        ...unreadableSide(pair.probeImplRel, probe, pair.clause),
        ...unreadableSide(pair.schemaRel, schema, pair.clause),
      );
      continue;
    }
    const probeText = probe.text;
    const schemaText = schema.text;
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
    issues.push(issue(FINDING_CODE, message, "error", missingFile, RULE));
  }
  return issues;
}

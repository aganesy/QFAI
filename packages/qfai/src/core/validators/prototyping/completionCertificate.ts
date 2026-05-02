/**
 * Completion certificate validator.
 *
 * - QFAI-PROT-335: prototyping.json claims completion (`completionClaimed=true`
 *   or `phase==="completed"`) but `.qfai/evidence/prototyping/completion-certificate.json`
 *   is absent.
 * - QFAI-PROT-336: completion-certificate.json exists but its digests do not
 *   match the current evidence files (i.e. evidence has been modified since
 *   certification, or new files were added).
 *
 * Together with `qfai prototyping certify`, this closes RR Root Cause #1
 * (completion semantics multi-source): the only way to validly claim
 * completion is to have a digest-matching certificate.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import {
  checkCompletionCertificate,
  loadCompletionCertificate,
} from "../../prototyping/certificate.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

const CERT_REL_PATH = ".qfai/evidence/prototyping/completion-certificate.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function isCompletionClaimed(root: string, config: QfaiConfig): Promise<boolean> {
  const evidenceRoot = path.join(
    path.dirname(path.resolve(root, config.paths.specsDir)),
    "evidence",
  );
  let raw: string;
  try {
    raw = await readFile(path.join(evidenceRoot, "prototyping.json"), "utf-8");
  } catch {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!isRecord(parsed)) return false;
  if (parsed.completionClaimed === true) return true;
  if (parsed.phase === "completed") return true;
  // V2 lifecycle: completion-certificate block presence implies a claim
  // was attempted, even if the standalone artifact is missing. Phase 8
  // removes the block entirely; until then we treat it as a claim signal.
  if (isRecord(parsed.completionCertificate)) return true;
  return false;
}

export async function validateCompletionCertificateIssues(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const certificate = await loadCompletionCertificate(root);
  const claimed = await isCompletionClaimed(root, config);

  if (!certificate) {
    if (claimed) {
      return [
        issue(
          "QFAI-PROT-335",
          `${CERT_REL_PATH} is required when completion is claimed. Run \`qfai prototyping certify\` after all gates pass.`,
          "error",
          CERT_REL_PATH,
          "prototyping.completionCertificate.presence",
          undefined,
          "canonical",
          "completion 主張の前に `qfai prototyping certify` を成功させてください。",
        ),
      ];
    }
    return [];
  }

  // Certificate exists. Per Phase 5 contract, the certificate's authority is
  // tied to the completion claim — if the user hasn't yet claimed completion,
  // the certificate may legitimately be older than the latest evidence
  // (e.g. they ran `certify` once, then continued iterating). We only flag
  // a digest mismatch when the user explicitly claims completion.
  //
  // Reviewer comment from PR #201 (Copilot, MAJOR): align JSDoc with
  // behaviour — "QFAI-PROT-336 fires only when completion is claimed".
  if (!claimed) return [];
  const result = await checkCompletionCertificate(root);
  if (result.ok) return [];
  return [
    issue(
      "QFAI-PROT-336",
      `${CERT_REL_PATH} digest mismatch — evidence has been modified since certify: ${result.reasons.join("; ")}`,
      "error",
      CERT_REL_PATH,
      "prototyping.completionCertificate.digest",
      undefined,
      "canonical",
      "evidence を変更した場合は `qfai prototyping certify` を再実行して certificate を更新してください。",
    ),
  ];
}

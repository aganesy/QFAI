/**
 * Reviewer-Gate finding `R-HANDOFF-SCHEMA-DRIFT` (severity error).
 *
 * SSOT-sync pair (Pair IV): every registered handoff writer MUST
 * reference the canonical schema (either by importing
 * `HANDOFF_MINIMUM_FIELDS` from `core/schemas/handoff.ts` or by
 * literally containing the writer's `writerToken`). When the schema
 * source file exists but a registered writer does not contain the
 * expected token (asymmetric edit), the finding fires naming the
 * modified file, the un-paired counterpart, and the clause.
 *
 * The check is intentionally lightweight — it does NOT parse TypeScript;
 * it asserts stable substring presence so the pair stays deterministic
 * and cheap (mirrors `mockHrefPairs` / `evidenceMutationUnlogged`).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";
import { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";

const FINDING_CODE = "R-HANDOFF-SCHEMA-DRIFT";
/** Stable token whose presence in the schema source proves the canonical field set is exported. */
const SCHEMA_TOKEN = "HANDOFF_MINIMUM_FIELDS";

/**
 * Detect asymmetric edits across the CLI-HANDOFF SSOT-sync pair.
 *
 * For each registered writer pair:
 *   - When the schema source contains `SCHEMA_TOKEN` and the writer
 *     source exists but does NOT contain the writer's expected token,
 *     fire `R-HANDOFF-SCHEMA-DRIFT` naming the writer file as the
 *     un-paired counterpart.
 *   - When neither source file exists in the repo (consumer install
 *     without source), no finding is emitted.
 */
export async function detectHandoffSchemaDrift(root: string): Promise<Issue[]> {
  const schemaAbs = path.join(root, HANDOFF_SCHEMA_REL);
  if (!(await exists(schemaAbs))) return [];
  let schemaText = "";
  try {
    schemaText = await readFile(schemaAbs, "utf-8");
  } catch {
    return [];
  }
  const schemaHasField = schemaText.includes(SCHEMA_TOKEN);
  if (!schemaHasField) return [];

  const issues: Issue[] = [];
  for (const pair of HANDOFF_WRITER_PAIRS) {
    const writerAbs = path.join(root, pair.writerRel);
    if (!(await exists(writerAbs))) continue;
    let writerText = "";
    try {
      writerText = await readFile(writerAbs, "utf-8");
    } catch {
      continue;
    }
    const writerHasToken = writerText.includes(pair.writerToken);
    if (writerHasToken) continue;
    const message =
      `${FINDING_CODE}: SSOT-sync pair for clause "${pair.clause}" is asymmetric ` +
      `(justification: schema=${HANDOFF_SCHEMA_REL} exports ${SCHEMA_TOKEN}, ` +
      `writer=${pair.writerRel} does NOT reference "${pair.writerToken}". ` +
      `clause=${pair.clause} — un-paired counterpart=${pair.writerRel}).`;
    issues.push(
      issue(FINDING_CODE, message, "error", pair.writerRel, "reviewerGate.handoffSchemaDrift"),
    );
  }
  return issues;
}

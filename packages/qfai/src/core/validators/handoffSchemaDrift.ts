/**
 * Reviewer-Gate finding `QFAI-HANDOFF-001` (severity error).
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
import path from "node:path";

import type { Issue } from "../types.js";
import { issue, readPresentFile } from "./utils.js";
import { HANDOFF_SCHEMA_REL, HANDOFF_WRITER_PAIRS } from "./handoffSchemaPairs.js";

const FINDING_CODE = "QFAI-HANDOFF-001";
const RULE = "reviewerGate.handoffSchemaDrift";
/** Stable token whose presence in the schema source proves the canonical field set is exported. */
const SCHEMA_TOKEN = "HANDOFF_MINIMUM_FIELDS";

/**
 * The field names the schema source lists in its `HANDOFF_MINIMUM_FIELDS` and
 * `HANDOFF_RESTYLE_FIELDS` array literals.
 */
function schemaFields(schemaText: string): string[] {
  const lists = schemaText.matchAll(/HANDOFF_(?:MINIMUM|RESTYLE)_FIELDS\s*=\s*\[([^\]]*)\]/g);
  return [...lists].flatMap((list) =>
    [...(list[1] ?? "").matchAll(/["']([^"']+)["']/g)].flatMap((m) => (m[1] ? [m[1]] : [])),
  );
}

/**
 * Detect asymmetric edits across the CLI-HANDOFF SSOT-sync pair.
 *
 * For each registered writer pair:
 *   - When the schema source contains `SCHEMA_TOKEN` and the writer
 *     source exists but does NOT contain the writer's expected token,
 *     fire `QFAI-HANDOFF-001` naming the writer file as the
 *     un-paired counterpart.
 *   - When the pair names the schema fields, the same finding fires for
 *     every field the schema lists, the restyle short form's included,
 *     that the writer does not name.
 *   - When neither source file exists in the repo (consumer install
 *     without source), no finding is emitted.
 *   - When a source file exists but cannot be read, the same finding
 *     fires naming it: the check for it is incomplete.
 */
export async function detectHandoffSchemaDrift(root: string): Promise<Issue[]> {
  const schema = await readPresentFile(path.join(root, HANDOFF_SCHEMA_REL));
  if (schema.kind === "absent") return [];
  if (schema.kind === "unreadable") {
    return [unreadableInput(HANDOFF_SCHEMA_REL, schema.reason, "every registered writer")];
  }
  const schemaText = schema.text;
  const schemaHasField = schemaText.includes(SCHEMA_TOKEN);
  if (!schemaHasField) return [];

  const fields = schemaFields(schemaText);
  const issues: Issue[] = [];
  for (const pair of HANDOFF_WRITER_PAIRS) {
    const writer = await readPresentFile(path.join(root, pair.writerRel));
    if (writer.kind === "absent") continue;
    if (writer.kind === "unreadable") {
      issues.push(unreadableInput(pair.writerRel, writer.reason, `clause=${pair.clause}`));
      continue;
    }
    const writerText = writer.text;
    const missing = writerText.includes(pair.writerToken) ? [] : [pair.writerToken];
    if (pair.namesSchemaFields) {
      missing.push(...fields.filter((field) => !writerText.includes(`\`${field}\``)));
    }
    if (missing.length === 0) continue;
    const message =
      `${FINDING_CODE}: SSOT-sync pair for clause "${pair.clause}" is asymmetric ` +
      `(justification: schema=${HANDOFF_SCHEMA_REL} exports ${SCHEMA_TOKEN}, ` +
      `writer=${pair.writerRel} does NOT reference ${missing.map((m) => `"${m}"`).join(", ")}. ` +
      `clause=${pair.clause} — un-paired counterpart=${pair.writerRel}).`;
    issues.push(issue(FINDING_CODE, message, "error", pair.writerRel, RULE));
  }
  return issues;
}

/**
 * A present input that cannot be read leaves the pair check undone, which
 * is not the same as in sync, so it is reported rather than skipped.
 */
function unreadableInput(rel: string, reason: string, scope: string): Issue {
  const message =
    `${FINDING_CODE}: ${rel} could not be read (${reason}), so the handoff schema ` +
    `SSOT-sync check for ${scope} is incomplete. Make it a readable file.`;
  return issue(FINDING_CODE, message, "error", rel, RULE);
}

/**
 * DB contract executability evidence (QFAI-CONTRACT-031).
 *
 * `contract-artifact-rules.md` calls `.qfai/contracts/**` "version-managed
 * downstream execution truth", and `/qfai-sdd` authors DB contracts in a
 * mandatory Phase 0 — yet the complete set of quality properties qfai asserted
 * about a `db/` contract was one correctly-prefixed unique ID plus four
 * dangerous-SQL regexes at `warning`. Nothing required the contract to ever be
 * *run*, so a declared write path that is unreachable at runtime passed every
 * SDD gate and surfaced inside a TDD micro-cycle, where the discovering agent
 * is forbidden from fixing it.
 *
 * This is a **presence check**, deliberately. It does not execute SQL and makes
 * no claim about correctness: it reports that a contract has no recorded
 * apply-and-drive evidence, which is the omission the author can act on. A
 * syntax-level or structural check would not have caught any of the observed
 * defects — those contracts applied cleanly and failed at runtime.
 */

import path from "node:path";

import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/**
 * Evidence lives at a fixed path — `paths` has no `evidenceDir` key, and every
 * shipped skill writes `.qfai/evidence/<stage>-<spec-id>.md`.
 */
const EVIDENCE_REL_DIR = ".qfai/evidence";

/** Waivable as `QFAI-CONTRACT-031`; `CONTRACT-031` also resolves (`waivers.ts#resolveRuleKeys`). */
export const DB_CONTRACT_EXECUTABILITY_RULE_ID = "QFAI-CONTRACT-031";

/**
 * The evidence line the SDD checklist prescribes:
 *
 * `- Executability: CON-DB-0007 — applied to scratch DB; every declared write
 *   path driven twice; <command> / <result>`
 *
 * Keyed on the marker plus the contract ID so a passing mention of the ID
 * elsewhere in the evidence file does not satisfy the check.
 */
const EXECUTABILITY_LINE = /^[ \t]*(?:[-*+]\s*)?Executability:\s*(.+)$/gim;

const CONTRACT_ID = /\bCON-DB-[A-Za-z0-9_-]+/g;

/** Contract IDs declared executable somewhere under the evidence directory. */
async function readAttestedIds(root: string): Promise<Set<string>> {
  const attested = new Set<string>();
  const { files } = await collectFilesByGlobs(root, {
    globs: [`${EVIDENCE_REL_DIR}/**/*.md`],
    ignore: [],
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });
  for (const file of files) {
    const content = await readSafe(file);
    if (!content) {
      continue;
    }
    for (const match of content.matchAll(EXECUTABILITY_LINE)) {
      const rest = match[1] ?? "";
      for (const id of rest.matchAll(CONTRACT_ID)) {
        attested.add(id[0]);
      }
    }
  }
  return attested;
}

/**
 * @param dbFiles - Absolute paths of the `db/` contract files already collected
 *   by `validateContracts`, so the directory is walked once.
 */
export async function validateDbContractExecutability(
  root: string,
  dbFiles: readonly string[],
): Promise<Issue[]> {
  if (dbFiles.length === 0) {
    return [];
  }

  const attested = await readAttestedIds(root);

  const issues: Issue[] = [];
  for (const file of dbFiles) {
    const text = await readSafe(file);
    const declared = Array.from(text.matchAll(CONTRACT_ID), (m) => m[0]);
    if (declared.length === 0) {
      // A `db/` file with no `CON-DB-*` ID is already reported by
      // `QFAI-CONTRACT-010`; do not pile a second finding onto it.
      continue;
    }
    const missing = declared.filter((id) => !attested.has(id));
    if (missing.length === 0) {
      continue;
    }
    const rel = path.relative(root, file).replace(/\\/g, "/");
    issues.push(
      issue(
        DB_CONTRACT_EXECUTABILITY_RULE_ID,
        `DB contract has no recorded executability evidence: ${rel} (${Array.from(new Set(missing)).join(", ")}). ` +
          `A contract applies cleanly and still fails at runtime — this check reports the missing record, not a defect.`,
        "warning",
        rel,
        "contracts.db.executability",
        Array.from(new Set(missing)),
        "canonical",
        `Apply the contract to a scratch database and drive every declared write path at least twice — ` +
          `the second traversal is what exercises head-advance and expected-version guards — then record it in ` +
          `${EVIDENCE_REL_DIR}/sdd-<spec-id>.md as a line of the form ` +
          "`- Executability: CON-DB-NNNN — applied to scratch DB; every declared write path driven twice; <command> / <result>`. " +
          `See .qfai/assistant/skills/qfai-sdd/references/contract-artifact-rules.md#executability-must.`,
      ),
    );
  }

  return issues;
}

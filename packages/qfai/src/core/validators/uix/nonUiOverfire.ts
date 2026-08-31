/**
 * Non-UI over-fire regression validator.
 *
 * Verifies that the canonical UIX validator set produces zero fires when run
 * against a non-UI project fixture. The list is imported from `canonical.ts`
 * rather than re-declared here so the regression can only ever measure what
 * `runCanonicalUixValidators` actually executes.
 */
import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { CANONICAL_UIX_VALIDATORS } from "./canonical.js";

/**
 * Run the canonical UIX validators against a pack and count fires.
 * Used as a regression test for non-UI safety.
 */
export async function countUiBearingFires(
  root: string,
  config: QfaiConfig,
): Promise<{ fireCount: number; issues: Issue[] }> {
  const allIssues: Issue[] = [];
  for (const validator of CANONICAL_UIX_VALIDATORS) {
    const issues = await validator(root, config);
    allIssues.push(...issues);
  }

  return { fireCount: allIssues.length, issues: allIssues };
}

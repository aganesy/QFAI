import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";

/**
 * @deprecated Use {@link validateDiscussionPackReadiness} from `./discussionPack.js` instead.
 * No longer called from validate.ts.
 * Always returns an empty array — the inputs this validator read
 * (`glossary.md`, `actors.md`, `business-flows.md`, `require.md`) are produced
 * by no shipped skill, and requirements-context validation has been replaced
 * by discussion-pack validation (QFAI-DPACK-*).
 *
 * Retired rule codes, recorded so the numbers are not silently re-used:
 * QFAI-REQCTX-000, QFAI-REQCTX-001, QFAI-REQCTX-002, QFAI-REQCTX-003,
 * QFAI-REQCTX-004, QFAI-REQCTX-010, QFAI-REQCTX-020, QFAI-REQCTX-021.
 */
export function validateRequirementsContext(_root: string, _config: QfaiConfig): Promise<Issue[]> {
  return Promise.resolve([]);
}

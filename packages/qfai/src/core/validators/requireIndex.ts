import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";

/**
 * @deprecated Use {@link validateDiscussionPackReadiness} from `./discussionPack.js` instead.
 * No longer called from validate.ts, and no longer re-exported from `./index.js`.
 * Always returns an empty array — the `02_requirement-index.md` input this
 * validator read is produced by no shipped skill, and require-index validation
 * has been replaced by discussion-pack validation (QFAI-DPACK-*).
 *
 * Retired rule codes, recorded so the numbers are not silently re-used:
 * QFAI-REQINDEX-001, QFAI-REQINDEX-002.
 */
export function validateRequireIndexShape(_root: string, _config: QfaiConfig): Promise<Issue[]> {
  return Promise.resolve([]);
}

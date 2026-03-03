import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";

/**
 * @deprecated Use {@link validateDiscussionPackReadiness} from `./discussionPack.js` instead.
 * Kept only for backward-compat reference; no longer called from validate.ts.
 * Always returns an empty array — require-pack validation has been replaced
 * by discussion-pack validation (QFAI-DPACK-*).
 */
export function validateRequirePackReadiness(_root: string, _config: QfaiConfig): Promise<Issue[]> {
  return Promise.resolve([]);
}

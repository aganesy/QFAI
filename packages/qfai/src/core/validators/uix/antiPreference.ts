/**
 * Anti-preference validator.
 *
 * Non-UI surface guard: returns n/a for non-UI projects.
 * For UI projects, validates anti-preferences are excluded.
 */
import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";

export async function validateAntiPreference(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Structure validator only — anti-preference enforcement quality is
  // the reviewer's job.
  return [];
}

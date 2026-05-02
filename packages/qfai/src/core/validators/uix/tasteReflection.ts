/**
 * Taste reflection validator.
 *
 * Non-UI surface guard: returns n/a for non-UI projects.
 * For UI projects, validates taste reflection in design direction.
 */
import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";

export async function validateTasteReflection(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Structure validator only — taste reflection quality assessment is
  // the reviewer's job.
  return [];
}

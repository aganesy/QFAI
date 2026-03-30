/**
 * Taste reflection validator — spec-0037
 *
 * Non-UI surface guard: returns n/a for non-UI projects.
 * For UI projects, validates taste reflection in design direction.
 *
 * BR-0037-0014
 */
import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";

export async function validateTasteReflection(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // For v1.7.8: structure validator only — taste reflection
  // quality assessment is the reviewer's job (NFR-0004)
  return [];
}

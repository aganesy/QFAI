/**
 * Discussion artifact recommendation reader.
 *
 * Reads `prototyping.recommended_mode` and `prototyping.rationale` from a
 * discussion pack sidecar YAML file (prototyping.yaml).
 * Returns null fields when the file or section is absent.
 *
 * Phase M1 of v1.7.7 Mode Switch UX (spec-0006).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

const VALID_MODES = new Set(["low-cost", "standard", "full-harness"]);
const SIDECAR_FILENAME = "prototyping.yaml";

export type DiscussionRecommendation = {
  recommended_mode: string | null;
  rationale: string | null;
};

/**
 * Read prototyping recommendation from a discussion pack directory.
 *
 * Looks for `prototyping.yaml` in the given directory and extracts
 * `prototyping.recommended_mode` and `prototyping.rationale`.
 *
 * @param discussionPackDir - Path to the discussion pack directory
 * @returns Recommendation with nullable fields; never throws
 */
export async function readDiscussionRecommendation(
  discussionPackDir: string,
): Promise<DiscussionRecommendation> {
  const filePath = path.join(discussionPackDir, SIDECAR_FILENAME);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return { recommended_mode: null, rationale: null };
  }

  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch {
    return { recommended_mode: null, rationale: null };
  }

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { recommended_mode: null, rationale: null };
  }

  const record = doc as Record<string, unknown>;
  const prototyping = record.prototyping;
  if (!prototyping || typeof prototyping !== "object" || Array.isArray(prototyping)) {
    return { recommended_mode: null, rationale: null };
  }

  const section = prototyping as Record<string, unknown>;
  const rawMode =
    typeof section.recommended_mode === "string" ? section.recommended_mode.trim() : null;
  const rationale = typeof section.rationale === "string" ? section.rationale.trim() : null;

  const recommended_mode = rawMode && VALID_MODES.has(rawMode) ? rawMode : null;

  return { recommended_mode, rationale };
}

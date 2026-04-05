import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { parseDiscussionModeRecommendationWithWarnings } from "./mode.js";
import type { DiscussionModeRecommendation } from "./types.js";

export type RecommendationArtifactStatus = "valid" | "invalid" | "missing" | "no-pack";

export type ResolvedRecommendationArtifact = {
  status: RecommendationArtifactStatus;
  path?: string;
  recommendation: DiscussionModeRecommendation | null;
  warnings: string[];
};

/**
 * Single source of truth for recommendation artifact resolution.
 *
 * Consumers (report.ts, prototypingEvidence.ts) MUST use this helper
 * instead of duplicating artifact status logic.
 */
export async function resolveLatestRecommendationArtifact(
  root: string,
  config: QfaiConfig,
): Promise<ResolvedRecommendationArtifact> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const latestPackDir = await findLatestDiscussionPackDir(discussionRoot);

  if (!latestPackDir) {
    return { status: "no-pack", recommendation: null, warnings: [] };
  }

  const recPath = path.join(latestPackDir, "prototyping.yaml");
  const result = await parseDiscussionModeRecommendationWithWarnings(recPath);

  if (result.recommendation) {
    return {
      status: "valid",
      path: recPath,
      recommendation: result.recommendation,
      warnings: result.warnings,
    };
  }

  // Determine missing vs invalid: try reading the file
  let fileExists = false;
  try {
    await readFile(recPath, "utf-8");
    fileExists = true;
  } catch {
    // file does not exist or is unreadable
  }

  return {
    status: fileExists ? "invalid" : "missing",
    path: recPath,
    recommendation: null,
    warnings: result.warnings,
  };
}

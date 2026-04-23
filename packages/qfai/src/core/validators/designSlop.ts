import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { QfaiConfig } from "../config.js";
import { isDiscussionUiBearingPack } from "../detection/surfaceType.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { findingToIssue, resolveAuditConfig, type DesignFinding } from "./designAudit.js";
import { readSafe } from "./utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlopPattern = {
  id: string;
  category: string;
  tier: number;
  scopes: string[];
  match: string;
  message: string;
  guidance: string;
};

// ---------------------------------------------------------------------------
// Pattern Loading
// ---------------------------------------------------------------------------

function isValidSlopPattern(rule: unknown): rule is SlopPattern {
  if (typeof rule !== "object" || rule === null) return false;
  const r = rule as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.category === "string" &&
    typeof r.tier === "number" &&
    Array.isArray(r.scopes) &&
    typeof r.match === "string" &&
    typeof r.message === "string" &&
    typeof r.guidance === "string"
  );
}

export async function loadSlopPatterns(jsonPath: string): Promise<SlopPattern[]> {
  const raw = await readFile(jsonPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((r) => isValidSlopPattern(r));
}

// ---------------------------------------------------------------------------
// Default Patterns Path
// ---------------------------------------------------------------------------

function defaultPatternsPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  const baseDir = path.dirname(basePath);
  // src/core/validators/ (dev) or dist/ (bundled) からの候補
  const candidates = [
    path.join(baseDir, "designSlopPatterns.json"),
    path.resolve(baseDir, "../../../assets/validators/designSlopPatterns.json"),
    path.resolve(baseDir, "../../assets/validators/designSlopPatterns.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- literal array, always has [0]
  return candidates[0]!;
}

// ---------------------------------------------------------------------------
// Main Validator
// ---------------------------------------------------------------------------

export async function validateDesignSlop(root: string, config: QfaiConfig): Promise<Issue[]> {
  const auditConfig = resolveAuditConfig(config);
  if (!auditConfig.enabled) return [];
  if (!auditConfig.slopDetection) return [];

  const discussionDir = path.join(root, config.paths.discussionDir);
  const packRoot = await findLatestDiscussionPackDir(discussionDir);
  if (!packRoot) return [];

  const uiBearing = await isDiscussionUiBearingPack(packRoot);
  if (!uiBearing) return [];

  let patterns: SlopPattern[];
  try {
    patterns = await loadSlopPatterns(defaultPatternsPath());
  } catch {
    return [];
  }

  const findings: DesignFinding[] = [];
  const seenRules = new Set<string>();

  for (const pattern of patterns) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern.match, "gi");
    } catch {
      continue;
    }

    for (const scope of pattern.scopes) {
      const filePath = path.join(packRoot, scope);
      const content = await readSafe(filePath);
      if (!content) continue;

      if (regex.test(content) && !seenRules.has(pattern.id)) {
        seenRules.add(pattern.id);
        findings.push({
          ruleId: pattern.id,
          dimension: pattern.category,
          severityTier: pattern.tier as 1 | 2 | 3,
          message: pattern.message,
          why: `Slop pattern "${pattern.id}" matched in ${scope}`,
          evidence: [],
          guidance: pattern.guidance,
          file: scope,
        });
      }
    }
  }

  return findings.map((f) => findingToIssue(f, auditConfig.qualityProfile, "slop"));
}

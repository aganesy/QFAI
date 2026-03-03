import { DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import type { Issue, ValidationPhase, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

export function buildCiRefinementIssue(
  phase: ValidationPhase | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Issue | null {
  if (phase !== "refinement" || !isCiEnvironment(env)) {
    return null;
  }
  return {
    code: "QFAI-VALIDATE-017",
    severity: "error",
    category: "change",
    message: "CI では refinement フェーズは使用できません。full フェーズを使用してください。",
    rule: "VALIDATE-017",
    suggested_action: "CI では --phase full（または --phase 指定なし）で実行してください。",
  };
}

export async function createPhaseGuardResult(
  phase: ValidationPhase,
  blockedIssue: Issue,
): Promise<ValidationResult> {
  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    phase,
    issues: [blockedIssue],
    counts: {
      info: 0,
      warning: 0,
      error: 1,
    },
    traceability: {
      sc: {
        total: 0,
        covered: 0,
        missing: 0,
        missingIds: [],
        refs: {},
      },
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: DEFAULT_GLOB_FILE_LIMIT,
      },
    },
    waivers: {
      active: [],
      suppressed: {
        total: 0,
        byWaiver: {},
        byRule: {},
      },
    },
  };
}

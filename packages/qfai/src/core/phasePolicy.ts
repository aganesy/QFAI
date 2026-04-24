import { DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import type { Issue, ValidationProfile, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

export function buildCiProfileIssue(
  profile: ValidationProfile | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Issue | null {
  if (
    profile === undefined ||
    profile === "full" ||
    profile === "verify" ||
    !isCiEnvironment(env)
  ) {
    return null;
  }
  return {
    code: "QFAI-VALIDATE-017",
    severity: "error",
    category: "change",
    message:
      "CI では部分 validation profile は使用できません。full/verify profile を使用してください。",
    rule: "VALIDATE-017",
    suggested_action: "CI では --profile full（または --profile 指定なし）で実行してください。",
  };
}

export async function createProfileGuardResult(
  profile: ValidationProfile,
  blockedIssue: Issue,
): Promise<ValidationResult> {
  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    profile,
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

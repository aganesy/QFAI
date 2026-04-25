import { DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import type { Issue, ValidationProfile, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

// Profiles permitted to run inside CI. `full` and `verify` cover the standard
// downstream gate; `tdd` is allowed because QFAI's own ci.yml dogfoods the
// test-todo-stub gate via `qfai validate --profile tdd` (spec-0017 REQ-0009),
// and `tdd` is a comprehensive (not narrowing) profile from the perspective
// of test-side gates. Narrow phase profiles (discussion / sdd / prototyping /
// atdd) remain rejected to prevent CI from accidentally skipping unrelated
// gates.
const CI_ALLOWED_PROFILES = new Set<ValidationProfile>(["full", "verify", "tdd"]);

export function buildCiProfileIssue(
  profile: ValidationProfile | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Issue | null {
  if (profile === undefined || CI_ALLOWED_PROFILES.has(profile) || !isCiEnvironment(env)) {
    return null;
  }
  return {
    code: "QFAI-VALIDATE-017",
    severity: "error",
    category: "change",
    message:
      "CI では部分 validation profile は使用できません。full/verify/tdd profile を使用してください。",
    rule: "VALIDATE-017",
    suggested_action:
      "CI では --profile full / --profile verify / --profile tdd（または --profile 指定なし）のいずれかで実行してください。",
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

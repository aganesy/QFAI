import { DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import type { Issue, ValidationProfile, ValidationResult } from "./types.js";
import { resolveToolVersion } from "./version.js";

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

// Profiles permitted to run inside CI. `full` and `verify` cover the standard
// downstream gate; `tdd` and `sdd` are allowed because QFAI's own ci.yml
// dogfoods them as paired steps:
//
//   - `--profile tdd` covers test-side gates (validateTddList,
//     validateTestTodoStubs, validateTraceability, validateTraceabilityIntegrity).
//   - `--profile sdd` covers structural / append-first gates introduced in
//     PR #206 (validateSpecPacks → QFAI-STATUS-001..006, QFAI-TRIAGE-001..006,
//     plus validateStatusInSpecs). Without an `sdd`-allowed CI profile,
//     a future regression in sddTriage / specPack validators could ship
//     green because `tdd` does not exercise those code paths
//     (PR #206 review LW-G).
//
// The narrow-profile guard exists to stop CI from *accidentally* skipping
// unrelated gates. When two narrow profiles are deliberately paired
// alongside the existing `full` validate step against the sandbox
// (`--root tmp/pack/sandbox/out`), broad coverage is preserved.
//
// Narrow phase profiles (discussion / prototyping / atdd) remain rejected.
const CI_ALLOWED_PROFILES = new Set<ValidationProfile>(["full", "verify", "tdd", "sdd"]);

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

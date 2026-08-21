import type { Issue, ValidationProfile } from "./types.js";

// `CI` is truthy-by-presence by convention, not equal to the literal
// `"true"`: Vercel exports `CI=1`, `ci-info` (the de-facto npm convention)
// treats any non-empty non-`"false"` value as CI, and a Makefile or a
// devcontainer running `CI=1 npm run gate` produces the same string. An
// exact `=== "true"` comparison reads those as "local" and lets CI-off
// kill-switches fire the mutating path they exist to forbid.
const CI_FALSY_VALUES = new Set(["", "false", "0"]);

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const ci = env.CI;
  if (ci !== undefined && !CI_FALSY_VALUES.has(ci.trim().toLowerCase())) {
    return true;
  }
  return env.GITHUB_ACTIONS === "true";
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
// A profile outside this set is REPORTED, not blocked. It used to be a hard
// `error` that replaced the entire run — and `qfai-atdd`, `qfai-discussion`
// and `qfai-prototyping` each name one of those profiles as their **only**
// completion gate, with no CI-legal fallback documented. Every one of the three
// became uncompletable the moment it ran anywhere that exports `CI=true`, which
// is GitHub Actions, most hosted agent runners, and many devcontainers. A guard
// against accidental narrowing must not make a deliberate stage gate
// unreachable.
const CI_ALLOWED_PROFILES = new Set<ValidationProfile>(["full", "verify", "tdd", "sdd"]);

export function buildCiProfileIssue(
  profile: ValidationProfile | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Issue | null {
  if (profile === undefined || CI_ALLOWED_PROFILES.has(profile) || !isCiEnvironment(env)) {
    return null;
  }
  // Generated from the allowlist so the operator-facing strings cannot drift
  // from the code. They named three profiles while the set held four.
  const allowed = [...CI_ALLOWED_PROFILES].join(" / ");
  return {
    code: "QFAI-VALIDATE-017",
    severity: "warning",
    category: "change",
    message:
      `CI で full-scan ではない profile "${profile}" を実行しています。stage gate としては有効ですが、` +
      `完了宣言の根拠にはなりません（full-scan は ${allowed}）。`,
    rule: "VALIDATE-017",
    suggested_action:
      `stage gate としての実行であればそのままで構いません。完了を宣言する前に ` +
      `--profile full（または --profile 指定なし）で full-scan を実行してください。CI で full-scan と` +
      `みなされる profile: ${allowed}。`,
  };
}

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
//   - `--profile tdd` covers story test obligations, drift, test stubs,
//     and contracts.
//   - `--profile sdd` covers story tree structure, contract references,
//     policy placeholders, and review artifacts. Without an `sdd`-allowed CI profile,
//     these validators would not run in the paired narrow-profile lanes.
//
// The narrow-profile guard exists to stop CI from *accidentally* skipping
// unrelated gates. When two narrow profiles are deliberately paired
// alongside the existing `full` validate step against the sandbox
// (`--root tmp/pack/sandbox/out`), broad coverage is preserved.
//
// A profile outside this set is REPORTED, not blocked. A hard `error` that
// replaced the entire run would make `qfai-discussion` and `qfai-prototyping`
// uncompletable the moment they ran anywhere that exports
// `CI=true` — GitHub Actions, most hosted agent runners, and many
// devcontainers — since each names one of these profiles as its **only**
// completion gate, with no CI-legal fallback. A guard
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
      `CI is running profile "${profile}", which is not a full-scan. It is valid as a stage gate, ` +
      `but it is not grounds for declaring completion (full-scan profiles: ${allowed}).`,
    rule: "VALIDATE-017",
    suggested_action:
      `If this run is a stage gate, no action is needed. Before declaring completion, ` +
      `run a full-scan with --profile full (or with no --profile). Profiles CI treats ` +
      `as a full-scan: ${allowed}.`,
  };
}

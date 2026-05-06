/**
 * Single source of truth for prototyping evidence paths.
 *
 * The literal strings used to live in 6+ separate `const` declarations
 * across iterate / certify / validators. Each duplicate was an
 * opportunity for path drift (PR #207 review caught two such
 * regressions). New code MUST import these constants instead of
 * hard-coding the strings.
 */

/** Project-root relative directory holding all prototyping evidence. */
export const PROTOTYPING_EVIDENCE_REL = ".qfai/evidence/prototyping" as const;

/** Project-root relative path to the canonical prototyping state file. */
export const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json" as const;

/**
 * Legacy project-root relative path to prototyping.json (pre-UX-loop
 * schema rewrite). Retained ONLY for the artifact self-ref guard, so
 * historical refs that escaped pre-PR can still be detected. Do NOT
 * use this for any read or write — `iterate` / `certify` /
 * validators all use `PROTOTYPING_JSON_REL` (above).
 */
export const PROTOTYPING_JSON_LEGACY_REL = ".qfai/evidence/prototyping.json" as const;

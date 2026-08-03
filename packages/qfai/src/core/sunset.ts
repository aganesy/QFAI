/**
 * One comparator for every announced sunset.
 *
 * Sunsets used to be declared in prose next to the code they governed, and each
 * site decided on its own whether to act on the declaration. Most did not:
 * `playwright-cli` was documented as "sunset 1.10.0 — at sunset only
 * `playwright` is accepted" while `normalizePrototypingExecution` accepted it
 * unconditionally, and `QFAI-AUD-001` carried a sunset in its message while
 * its severity was a hard-coded `info`. The declaration and the enforcement
 * were separate facts, so shipping the sunset version changed nothing and the
 * notice became false.
 *
 * A sunset is now a version comparison a caller makes, not a sentence it
 * writes. `isAtOrPastSunset` is the only comparator; a new deprecation adds its
 * literal here and reads its severity through {@link deprecationSeverity}.
 *
 * Extracted from `cli/commands/validate.ts`, which held the original private
 * copy and still uses it for the legacy `validate.json` path.
 */

/** Sunsets pinned to a version, as the SSOT their call sites read. */
export const SUNSETS = {
  /** `.qfai/output/validate.json`, the pre-1.9 validate output location. */
  legacyValidateJson: "1.10.0",
  /** `prototyping.execution.browserTool: "playwright-cli"`. */
  playwrightCli: "1.10.0",
  /** UI contracts authored before the `primary_tasks` slot (`QFAI-AUD-001`). */
  legacyPrimaryTasksSlot: "1.10.0",
  /** Pre-recut `.qfai/assistant/{steering,instructions}/` (the CHG-003 layer recut). */
  legacyAssistantSteering: "1.10.0",
  /** Specs with a UI contract companion but no `surface_type` (`D-SURFACE-TYPE-MISSING`). */
  surfaceTypeMissing: "1.10.0",
  /**
   * A `prototyping.json` carrying `fullHarness.runId` instead of a top-level
   * `runId` (`D-DEPRECATED-SCHEMA`).
   */
  legacyPrototypingJsonShape: "1.10.0",
} as const;

type FullSemver = {
  major: number;
  minor: number;
  patch: number;
  /**
   * Raw prerelease tag (everything after the first `-`, before any `+build`
   * metadata). `undefined` denotes a clean GA release. Per the semver spec, a
   * clean release sorts AFTER any prerelease sharing the same
   * `major.minor.patch`.
   */
  prerelease: string | undefined;
};

/**
 * Strict full-semver parser: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`.
 * Returns `null` for inputs that do not match — callers treat that as
 * "be conservative" (i.e. pre-sunset).
 *
 * Scope note: this is a **presence-only check**, not a full §9 / §11 validator.
 * The prerelease group `([0-9A-Za-z.-]+)` does NOT enforce SemVer §9 ("numeric
 * identifiers MUST NOT include leading zeros"), so inputs like `1.10.0-01`
 * parse with `prerelease="01"`. That is intentional: the sunset gate only reads
 * `prerelease === undefined` to distinguish GA vs prerelease, never the
 * prerelease contents. If this grows into a general comparator, the regex must
 * be tightened to reject leading-zero numeric identifiers.
 *
 * Build metadata (`+...`) is dropped per semver §10 (ignored for precedence).
 */
function parseFullSemver(value: string): FullSemver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!m) return null;
  const majorRaw = m[1];
  const minorRaw = m[2];
  const patchRaw = m[3];
  if (majorRaw === undefined || minorRaw === undefined || patchRaw === undefined) return null;
  return {
    major: Number(majorRaw),
    minor: Number(minorRaw),
    patch: Number(patchRaw),
    prerelease: m[4],
  };
}

/**
 * Returns `true` iff `currentVersion` is at or past `sunsetVersion`.
 *
 * GA-only sunset assumption: the comparator presumes the sunset literal is a
 * clean GA release. When the sunset is `1.10.0`, a current prerelease at the
 * same triple (`1.10.0-beta.1`) sorts BEFORE the GA (semver §11) and is
 * therefore pre-sunset. It deliberately does not compare prerelease tags
 * against each other, because every entry in {@link SUNSETS} is a clean
 * literal. Pinning a sunset to a prerelease would need an extra step here.
 *
 * Conservative default: if either version fails to parse, the current version
 * is treated as pre-sunset. An unparseable version must not be the thing that
 * escalates a warning into a build failure.
 */
export function isAtOrPastSunset(currentVersion: string, sunsetVersion: string): boolean {
  const cur = parseFullSemver(currentVersion);
  const sun = parseFullSemver(sunsetVersion);
  if (cur === null || sun === null) return false;
  if (cur.major !== sun.major) return cur.major > sun.major;
  if (cur.minor !== sun.minor) return cur.minor > sun.minor;
  if (cur.patch !== sun.patch) return cur.patch > sun.patch;
  // major.minor.patch tied: a clean GA is at-sunset; any prerelease at the
  // same triple is still pre-sunset.
  return cur.prerelease === undefined;
}

/**
 * The severity a deprecation carries at `currentVersion`: `warning` inside the
 * window, `error` from the sunset onwards.
 *
 * Call this instead of writing the sunset into a message and hard-coding a
 * severity beside it — that pairing is what let three sunsets pass unenforced.
 */
export function deprecationSeverity(
  currentVersion: string,
  sunsetVersion: string,
): "warning" | "error" {
  return isAtOrPastSunset(currentVersion, sunsetVersion) ? "error" : "warning";
}

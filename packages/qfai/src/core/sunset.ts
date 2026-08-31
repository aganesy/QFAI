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
  /** Pre-recut `.qfai/assistant/{steering,instructions}/` (the four-layer recut). */
  legacyAssistantSteering: "1.10.0",
  /** Specs with a UI contract companion but no `surface_type` (`D-SURFACE-TYPE-MISSING`). */
  surfaceTypeMissing: "1.10.0",
  /**
   * A `prototyping.json` carrying `fullHarness.runId` instead of a top-level
   * `runId` (`D-DEPRECATED-SCHEMA`).
   */
  legacyPrototypingJsonShape: "1.10.0",
} as const;

/**
 * The mirror image of {@link SUNSETS}: new finding codes and the release at
 * which each stops being a `warning` and becomes an `error`.
 *
 * A sunset gives an *old* shape a window before it fails. A promotion gives an
 * *existing repository* the same window against a *new* rule. Both are the same
 * comparison; only the direction of the migration differs.
 *
 * Why the window: a correct new rule still lands on data written before the
 * rule existed. `TDDLIST_EVIDENCE_EMPTY` shipped straight at `error` and took a
 * consuming repository from 3 errors to 27 in a single `qfai init` — 20 of them
 * on rows already at `done`, a state with no transition left that could
 * re-observe anything. The rule was right; shipping it without a window was
 * what latched that gate.
 *
 * Each entry records both halves of its window: `introducedIn`, the release the
 * code first shipped in, and `promoteAt`, the release it becomes an `error`
 * at. The first is not recoverable from the second once the tool has moved
 * past the pin, and the contract below is about the *distance* between them —
 * so `tests/core/sunsetLedger.test.ts` needs it written down to check that a
 * window is a window at all.
 *
 * The policy a new code follows:
 *
 * 1. ship it here at `warning`, pinned to a promotion release at least one
 *    minor ahead of the release that introduces the code;
 * 2. emit the finding through {@link newRuleSeverity} so the severity follows
 *    the pin instead of a literal beside the `issue(...)` call;
 * 3. say in the finding itself that it is inside a window and which release
 *    ends it, so `--fail-on error` keeps working while the operator sees the
 *    debt they are about to owe;
 * 4. where the code can fire on rows that are already terminal, document how a
 *    terminal row is meant to satisfy it — otherwise the only remedy is an
 *    out-of-lifecycle edit.
 */
export const RULE_PROMOTIONS = {
  /**
   * `TDDLIST_EVIDENCE_EMPTY` — an empty / dash-only `Evidence` cell on a ledger
   * row past RED. Introduced during the 1.10.0 line, so the promotion sits a
   * full minor beyond it.
   */
  tddListEvidenceEmpty: { introducedIn: "1.10.0", promoteAt: "1.12.0" },
  /**
   * `QFAI-AGENT-014` — the agent catalog's embedded copy of an agent body is
   * absent, or disagrees with the markdown file it is derived from. Every
   * repository that customised an agent before the comparison existed carries
   * the divergence already.
   */
  agentDeveloperInstructionsDrift: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-015` — a contract file that states no apply order at all.
   * Contract sets written before the declaration was required state none, so
   * the rule lands on every one of them at once.
   */
  contractDependencyUndeclared: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-032` — a contract index table with no `Depends On` column.
   * The column is in the shipped template, so a table predating it is missing
   * a column its author never had.
   */
  contractIndexDependsOnColumnMissing: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-033` — an index row whose `Depends On` cell is blank, or
   * disagrees with the apply order the contract file declares. Nothing read
   * the column before, so the mirror it asks for was never maintained.
   */
  contractIndexDependsOnMirror: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-034` — a contract that appears in no contract index. The
   * rule fires once per unlisted contract, so a repository that indexed only
   * part of its set meets the whole backlog in one run.
   */
  contractIndexCoverageMissing: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-035` — an index row whose `File` cell points at a file that
   * does not declare the row's id. A wrong pointer is silent until something
   * reads it, so the finding arrives on rows nobody knew were wrong.
   */
  contractIndexFileDeclaresId: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-RESEARCH-012` — a discussion pack with no Research Summary section.
   * A pack is written once and rarely revisited, so the rule necessarily lands
   * on packs that were complete under the schema of their day.
   */
  researchSummarySectionMissing: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-TRIAGE-008` — a Triage heading that is not the canonical `## Triage`,
   * so no triage validator reads the rows under it. Existing delta files carry
   * whatever heading they were written with.
   */
  triageHeadingNonCanonical: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * The assistant-tree provenance family — `QFAI-ASSETS-003` (a vendored copy
   * still as qfai wrote it but behind the installed release), `QFAI-ASSETS-004`
   * (a local fork), `QFAI-ASSETS-005` (a non-overlay addition),
   * `QFAI-ASSETS-006` (a shipped normative file that is absent) and
   * `QFAI-ASSETS-007` (the comparison could not be made at all). Nothing
   * compared the governed layers before, so every project that ever edited one
   * meets the whole family in the run that first records provenance.
   */
  assistantAssetProvenance: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
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

/**
 * The severity a *new* finding code carries at `currentVersion`: `warning`
 * until its {@link RULE_PROMOTIONS} release, `error` from it onwards.
 *
 * Same comparison as {@link deprecationSeverity} — `isAtOrPastSunset` compares
 * two versions and knows nothing about which of them deprecates what — but the
 * two are not interchangeable at a call site: one reads a sunset, the other a
 * promotion, and a reader must be able to tell which migration a finding is in
 * without opening the registry.
 *
 * Conservative default is inherited: an unparseable current version (e.g. the
 * `"unknown"` `resolveToolVersion` falls back to) is treated as inside the
 * window, so a version that cannot be read never escalates a warning into a
 * build failure.
 */
export function newRuleSeverity(
  currentVersion: string,
  promotionVersion: string,
): "warning" | "error" {
  return isAtOrPastSunset(currentVersion, promotionVersion) ? "error" : "warning";
}

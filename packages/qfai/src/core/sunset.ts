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
   * `QFAI-TOOL-002` — the project declares a `qfai` dependency and a different
   * copy is running. Unlike its `info` sibling this is not anybody's choice:
   * the project said what it wanted and something else answered.
   *
   * A window, and P7's default is right here — the condition is INVISIBLE
   * today, so a project carrying it has never been told. It needs a minor to
   * notice and fix before the gate starts failing on it. That is the opposite
   * of a code whose condition already crashes the run, where a window would
   * turn a hard failure into a pass for two minors.
   */
  toolResolvedAgainstDeclaration: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CTYPE-004` — a delta file was read and counted for nothing, per
   * `### DL-` entry. The window is P7's default and it is doing real work: the
   * condition was previously a Markdown NOTE that left `issues`,
   * `summary.counts` and `deltaCoverage.status` untouched, so every project
   * carrying it has been reporting a clean run. Failing the gate on the release
   * that first makes the condition visible would fail it on a backlog nobody
   * was ever told about.
   */
  deltaEntryUncounted: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-PROT-011` — `frozenSurfaceUnion` names a spec that no longer resolves
   * as UI-bearing. The window is doing real work: the in-loop way out does not
   * exist yet (a `rescope` operation is proposed in #1099), so until it does,
   * the only remedy is the cycle-0 reset this finding exists to warn about in
   * advance. Failing a gate for a condition whose remedy discards the review
   * already paid for would make the warning worse than the silence it replaces.
   */
  frozenSurfaceUnreachable: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `TDDLIST_EVIDENCE_EMPTY` — an empty / dash-only `Evidence` cell on a ledger
   * row past RED. Introduced during the 1.10.0 line, so the promotion sits a
   * full minor beyond it.
   */
  tddListEvidenceEmpty: { introducedIn: "1.10.0", promoteAt: "1.12.0" },
  /**
   * `QFAI-ATDD-131` — a spec with ATDD-owned tests and no Coverage Depth
   * Matrix file. Specs annotated before the matrix became a Mandatory Output
   * own no such file, so the rule meets the whole backlog on the first run
   * after the upgrade.
   */
  atddCoverageDepthMatrixMissing: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-ATDD-132` — a Coverage Depth Matrix that `.gitignore` excludes and
   * git does not track, so the judgement never reaches history. The ignore
   * line predates the matrix in every repository that has one, and only a
   * `qfai init` or a hand edit moves it.
   */
  atddCoverageDepthMatrixIgnored: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-ATDD-133` — an ATDD stage evidence file whose `## Coverage Depth
   * Matrix` section is missing, inlines the table, or names no matrix. The
   * section shape is a template younger than the evidence files it lands on.
   */
  atddCoverageDepthInlineMatrix: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
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
   * `QFAI-PLATFORM-003` — a `--platform` the requested profile never reads.
   * The flag has parsed on every profile for as long as it has existed, so
   * every CI matrix that passes it uniformly across profiles meets the finding
   * on its `discussion` / `sdd` / `atdd` / `tdd` legs at once, for invocations
   * that were legal when they were written.
   */
  platformOptionUnusedByProfile: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
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
   * `QFAI-TRIAGE-009` — an `Existing Spec` cell that does not match the
   * declared grammar, or names a spec that is not on disk. The grammar is new,
   * so every delta file written before it carries whatever spelling its author
   * chose, and the cell is never rewritten once a row is approved.
   */
  triageExistingSpecCell: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-SPLIT-106` — a CAP row the declared catalog cannot resolve to exactly
   * one spec directory: a blank `Spec` cell, one naming several directories, a
   * CAP repeated across rows, or two CAPs claiming the same directory. The
   * `Spec` column is new, so every catalog written before it exists resolves
   * nothing and draws the finding on every one of its rows at once.
   */
  specSplitDeclaredMapping: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CONTRACT-050` — a `- SSOT modules:` entry naming a path that does not
   * resolve, or one that resolves only by leaving the project root. Nothing
   * read those paths before, so a route that went stale releases ago has been
   * sitting in the contract unchallenged and arrives in one run.
   */
  contractSsotModuleUnresolved: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-LINK-002` — a `file.md#anchor` citation in the assistant tree whose
   * target document or heading is not there. Nothing resolved these citations
   * before, so a tree refreshed in part carries the whole backlog of drifted
   * anchors the moment the rule arrives — and repairing them is an edit to the
   * vendored documents, not to the consumer's own work.
   */
  assistantAnchorDangling: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-SPECSECTION-001` — a spec pack missing a heading that
   * `validation.require.specSections` requires — and `QFAI-SPECSECTION-002`,
   * an entry of that list that normalises to no heading name at all. Both
   * arrive with the gate itself: a project that already set the key had
   * nothing reading it, so every pack that never carried the heading, and
   * every unusable entry already written, meets the rule in one run.
   */
  specSectionsRequiredHeadings: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-DECISION-001`, `QFAI-DECISION-002`, `QFAI-DECISION-003`,
   * `QFAI-DECISION-004`, `QFAI-DECISION-005`, `QFAI-DECISION-006` and
   * `QFAI-DECISION-007` — the Delta Rejected Guard's re-open record, checked
   * for the first time. The record had no status value, no field for the prior
   * decision and no field for the approval, so every re-open written before
   * these rules existed is missing fields its author was never asked for, and
   * a spec that re-adopted a rejected candidate meets the whole backlog at
   * once. One window covers the seven because they are one guard: an operator
   * repairing a re-open answers all of them in the same edit.
   */
  specPackReOpenDecisionRecord: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-TEST-003` — a vitest/jest test parked with a `.skip` modifier. The
   * construct is silent in the runner, so a repository accumulates them
   * without ever being told; every one written before the check existed
   * arrives in the first run after the upgrade.
   */
  testSkippedSuite: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-TDDLIST-007` — a ledger row at `done` whose `Evidence`
   * cell states an outcome in prose and carries no canonical pointer into the
   * evidence file its `Layer` owns. Nothing read the cell before, so every
   * ledger written under the old shape states its evidence exactly this way.
   */
  tddListEvidenceAnchorMissing: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-TDDLIST-008` — a pointer that does not resolve: the
   * wrong owner file for the row's `Layer`, another row's item, a heading that
   * is not there, or an entry behind it that is not complete. The rule is
   * right and the rows it lands on are already at `done`, a state with no
   * transition left that could re-observe anything — the same shape the first
   * entry in this registry was written after. This repository meets 29 of
   * these on the release that introduces the code.
   */
  tddListEvidenceAnchorUnresolved: { introducedIn: "1.10.1", promoteAt: "1.12.0" },

  /**
   * `QFAI-TDDLIST-009` — the row's `Revision` names a tree that files the
   * observation covered have moved past.
   *
   * `evidence-revision.md#what-makes-evidence-stale` has always defined
   * staleness mechanically, and nothing computed it: the field was written by
   * hand, required in three places, and compared against nothing (#1146). So
   * every project carries whatever stale revisions it has accumulated, by
   * construction — an immediate `error` would fail gates over a backlog nobody
   * has been told about, which is exactly what this window is for.
   *
   * After the window the severity splits by status: `error` at `refactor` /
   * `done` / `review-fix`, `warning` earlier. A row still moving is expected to
   * re-take; a row at rest is making a claim.
   */
  tddListEvidenceRevisionStale: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-ASSETS-003` — a Stage 0 steering catalog file still holding the
   * angle-bracket slots and bare to-do keywords it shipped with. `qfai init`
   * copies those four templates verbatim, so on the release that adds the
   * detector every project that has not yet run `/qfai-configure` meets four
   * findings at once, on files it never edited.
   *
   * (The keywords are spelled out rather than quoted here: a backticked
   * all-caps word in this comment reads as a second finding code to the
   * wiring assertion in `tests/core/sunsetLedger.test.ts`.)
   */
  steeringCatalogPlaceholders: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-CFG-001` — a `validation.traceability` key that was
   * declared, defaulted and parsed but that no validator ever read
   * (`brMustHaveSc`, `scNoTestSeverity`, `orphanContractsPolicy`).
   *
   * The *shape* being retired is old, which is what a {@link SUNSETS} entry
   * describes — but the finding code is new, and P7 keys on the code, because
   * that is what an upgrade meets. Nothing warned about these keys before, so
   * every config in the wild still carries whichever of them it was written
   * with; at `error` on day one the rule would fail a repository for a knob
   * this same change is what made inert. Per OC-63 the one-minor window opens
   * at the release that starts warning and closes at the next minor.
   */
  retiredTraceabilityKeys: { introducedIn: "1.10.1", promoteAt: "1.11.0" },
  /**
   * The skill / `agent-routing.yml` cross-check, which ships as one rule in
   * five findings: `QFAI-AGENT-015` (a declared role nothing routes or selects),
   * `QFAI-AGENT-016` (a `SKILL.md` whose `roles:` or `routing-profile:` cannot
   * be read), `QFAI-AGENT-017` (a skill that binds itself to the manifest which
   * the manifest routes nothing to), `QFAI-AGENT-018` (a route whose review
   * profile is undefined or contradicted by a second route) and
   * `QFAI-AGENT-019` (a routed agent the skill's `roles:` omits).
   *
   * They share one window because they share one cause: nothing compared the
   * two sides before, so on the release that introduces them every project
   * whose `roles:` and manifest drifted apart — which is every project that
   * customised either — meets the whole backlog in a single run.
   */
  skillRolesRoutingCrossCheck: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
  /**
   * `QFAI-TDDLIST-010` — a `Tier` cell that is neither `T1`/`T2`/`T3` nor
   * `-`. The column itself is new, so the first ledgers to carry one were
   * hand-filled against prose rather than against this value set, and a
   * spelling the rule rejects (`T@`, `Tier 2`, `t2 (authz)`) is a cell its
   * author believed was fine. Every such row fails at once on upgrade.
   */
  tddListUnknownTier: { introducedIn: "1.10.1", promoteAt: "1.12.0" },
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

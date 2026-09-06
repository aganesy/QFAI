import path from "node:path";

import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import { runSaasPackageProfile } from "./saasPackage/profile.js";
import { collectScenarioFiles } from "./discovery.js";
import { collectSpecEntries } from "./specLayout.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "./sunset.js";
import { issue } from "./validators/utils.js";
import {
  isFindingInSpecScope,
  isPathInSpecScope,
  resolveSpecScope,
  type SpecScope,
} from "./specScope.js";
import {
  buildScCoverage,
  collectScIdsFromScenarioFiles,
  collectScTestReferences,
} from "./traceability.js";
import type { Issue, ValidationCounts, ValidationProfile, ValidationResult } from "./types.js";
import { locateToolAgainstProject, resolveToolVersion } from "./version.js";
import { applyWaivers } from "./waivers.js";
import { validateContracts } from "./validators/contracts.js";
import { validateDiscussionMermaid } from "./validators/discussMermaid.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { validateSkillsIntegrity } from "./validators/skillsIntegrity.js";
import { inspectIntegrationSurface } from "./validators/integrationSurface.js";
import { validateAssistantAnchorReferences } from "./validators/assistantAnchorReferences.js";
import { validateDefinedIds } from "./validators/ids.js";
import {
  DISCUSSION_PACK_PRODUCERS,
  SDD_PACK_PRODUCERS,
  validateReviewArtifacts,
  type ReviewArtifactsScope,
} from "./validators/reviewArtifacts.js";
import { validateSpecPacks } from "./validators/specPack.js";
import { validateTraceability } from "./validators/traceability.js";
import { evaluateAtddCodeTraceability } from "./atddTraceability.js";
import { validateAtddCodeTraceability } from "./validators/atddCodeTraceability.js";
import { validateAtddCoverageDepth } from "./validators/atddCoverageDepth.js";
import { validateScaffoldPlaceholder } from "./validators/scaffoldPlaceholder.js";
import {
  detectPlatform,
  validateAgentDefinition,
  validateBpApDb,
  validateContractReferences,
  validateContractSsotModules,
  validateDesignToken,
  validateDiscussionPackReadiness,
  validateDiscussionVisuals,
  validateDensityHints,
  validateHtmlMock,
  validateLayerCoverage,
  validateLayeredTraceability,
  validateMermaidScreenFlow,
  validateMermaidEnforcement,
  validateOrphanProhibition,
  validatePrototypingEvidence,
  validateScreenIdCasing,
  validateCompletionCertificateIssues,
  validatePrototypingDelegationMap,
  validateConfigReferenceIntegrity,
  validatePrototypingArtifactRefIntegrity,
  validateSpecIdLinkage,
  validateResearchSummary,
  validateRepositoryHygiene,
  validateSpecSplitByCapability,
  validateStatusInSpecs,
  validateTddList,
  validateTddListSeedShape,
  validateUiDefinitionConsistency,
  validateDesignAudit,
  validateNavigationFlow,
  validateRenderCritique,
  validateDesignFidelity,
  validateFrozenSurfaceReachability,
  validatePrototypingDesignContractReadiness,
  validateRootDesignMdParse,
  validateSddDesignContractReadiness,
  validatePrototypingSkillContent,
  runCanonicalUixValidators,
  validateSpecRequiredFilesCatalog,
  validateMarkdownTableArity,
  validateTraceabilityIntegrity,
  validateUpstreamSsotGuard,
  validateUiEvidenceArtifacts,
  validateTestTodoStubs,
  validateWorklogSurface,
  validateAssistantTreeMigration,
  validateSkillDocReferences,
  validateReviewerJustification,
  validateReviewerGate,
  detectMockHrefDrift,
  validateSurfaceTypeDrift,
  validateDesignMdPatchZone,
  detectEvidenceMutationUnlogged,
  validateAutopilotPolicy,
  runPackageSelfGovernanceValidators,
  validateStaleReferences,
  validateImportLiteEvidencePresence,
} from "./validators/index.js";
import { readSafe } from "./validators/utils.js";

const UIUX_VALIDATION_BUDGET_MS = 2000;

export type ValidationOptions = {
  profile?: ValidationProfile;
  platform?: string;
  /**
   * Restrict the run to the named specs (`--spec`). Repo-level findings are
   * always kept; only findings owned by an out-of-scope `spec-NNNN` directory
   * are dropped, and per-spec report writes are skipped for them.
   */
  specIds?: readonly string[];
};

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const profile: ValidationProfile = options.profile ?? "full";

  const specsRoot = resolvePath(root, config, "specsDir");
  const scopeRoots = { root, specsRoot };
  const { scope: requestedScope, invalid: invalidSpecValues } = resolveSpecScope(options.specIds);
  const scopeIssues = await buildSpecScopeIssues(
    specsRoot,
    requestedScope,
    invalidSpecValues,
    options.specIds,
  );
  // A `--spec` that resolves to nothing must not silently widen to the whole
  // repo: keep the (possibly unsatisfiable) scope so no spec-owned finding
  // slips through while `QFAI-SCOPE-00x` reports the misuse.
  const specScope = requestedScope;

  const findings = [
    ...configIssues,
    ...scopeIssues,
    ...(await runProfileValidators(root, config, profile, options.platform, specScope)),
  ];
  const scopedFindings = findings.filter((finding) =>
    isFindingInSpecScope(finding, scopeRoots, specScope),
  );
  const { issues, waivers } = await applyWaivers(root, scopedFindings);

  // Traceability is part of the same scoped answer: leaving every spec's
  // Examples in would report a sibling's SC totals, missing IDs and refs as the
  // coverage of the requested slice.
  const scenarioFiles = (await collectScenarioFiles(specsRoot)).filter((file) =>
    isPathInSpecScope(file, scopeRoots, specScope),
  );
  const scIds = await collectScIdsFromScenarioFiles(scenarioFiles);
  const { refs: scTestRefs, scan: testFiles } = await collectScTestReferences(
    root,
    config.validation.traceability.testFileGlobs,
    config.validation.traceability.testFileExcludeGlobs,
  );
  const scCoverage = buildScCoverage(scIds, scTestRefs);

  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    // Stamped where the result is assembled, so every writer of a
    // `ValidationResult` carries it without having to remember to.
    generatedAt: new Date().toISOString(),
    profile,
    issues,
    counts: countIssues(issues),
    traceability: {
      sc: scCoverage,
      testFiles,
    },
    waivers,
  };
}

/**
 * Reports a `--spec` that cannot select anything.
 *
 * Without this, `--spec nope` collapsed to "no scoping" and validated the whole
 * repo, and `--spec 9999` produced an empty target set — both exiting 0 while
 * never looking at the spec the operator named. Both are `error`, so a gate
 * fails instead of reporting a green run on the wrong thing.
 */
async function buildSpecScopeIssues(
  specsRoot: string,
  scope: SpecScope | undefined,
  invalid: readonly string[],
  requested: readonly string[] | undefined,
): Promise<Issue[]> {
  if (requested === undefined || requested.length === 0) {
    return [];
  }
  const issues: Issue[] = [];
  if (invalid.length > 0) {
    issues.push(
      issue(
        "QFAI-SCOPE-001",
        `--spec の値を spec 番号として解釈できません: ${invalid.join(", ")}`,
        "error",
        specsRoot,
        "specScope.value",
        Array.from(invalid),
        "canonical",
        "`--spec 0003` / `--spec spec-0003` のように 1-4 桁の spec 番号を指定してください。",
      ),
    );
  }
  if (scope === undefined || scope.size === 0) {
    return issues;
  }
  const entries = await collectSpecEntries(specsRoot);
  const existing = new Set(entries.map((entry) => entry.specNumber));
  const missing = Array.from(scope)
    .filter((specNumber) => !existing.has(specNumber))
    .sort();
  if (missing.length > 0) {
    issues.push(
      issue(
        "QFAI-SCOPE-002",
        `--spec で指定された spec ディレクトリが存在しません: ${missing
          .map((specNumber) => `spec-${specNumber}`)
          .join(", ")}`,
        "error",
        specsRoot,
        "specScope.exists",
        missing.map((specNumber) => `spec-${specNumber}`),
        "canonical",
        "spec ディレクトリ名を確認してください。存在しない spec を指定した run は対象を1件も検証しません。",
      ),
    );
  }
  return issues;
}

/**
 * The parts of the assistant tree a profile's own validators open.
 *
 * A profile allowlist was not enough: `sdd` runs `validateSkillDocReferences`,
 * `validateAutopilotPolicy` and `validateStaleReferences`, all of which
 * `readdir` the configured skills directory — so excluding it by name meant a
 * non-directory or a cycle there raised `ENOTDIR` / `ELOOP` from one of them
 * and lost the `QFAI-LINK-001` that names the path and the repair.
 *
 * Returned as repo-relative POSIX prefixes, which is how `unwalkable` names
 * what it found. Profiles absent from this map walk none of the tree, so damage
 * confined to it is reported and stops nothing.
 */
function assistantPathsWalkedBy(profile: ValidationProfile, skillsRelative: string): string[] {
  switch (profile) {
    // `validateSkillsIntegrity` and `validateAssistantAssets` walk the
    // **skills** directory the configuration names — the same one `sdd` walks,
    // and nothing wider. Returning its parent matched a sibling's damage too:
    // a regular file at `.qfai/assistant/agents` stopped `full` on a tree those
    // validators never open, while `validateAgentDefinition` turns a missing
    // agent into an ordinary finding rather than an exception. The extra
    // profiles here differ in what else they run, not in how far into the
    // assistant tree they reach.
    case "verify":
    case "full":
      // Plus the agents tree, which `validateAgentDefinition` opens by
      // pathname: a canonical agent replaced by a directory gives it `EISDIR`
      // and a FIFO blocks it, either way taking the finding down with the run.
      return [skillsRelative, AGENTS_RELATIVE];
    case "prototyping":
    case "saas-package":
      // These run `validateAgentDefinition` too, and nothing that opens the
      // skills tree.
      return [AGENTS_RELATIVE];
    case "sdd":
      return [skillsRelative];
    default:
      return [];
  }
}

/** The canonical agent tree, which `validateAgentDefinition` opens by pathname. */
const AGENTS_RELATIVE = ".qfai/assistant/agents";

/** Whether `candidate` is `base` itself or sits under it, both repo-relative POSIX. */
function isUnder(base: string, candidate: string): boolean {
  return candidate === base || candidate.startsWith(`${base}/`);
}

/** An absolute path as `unwalkable` spells it: repo-relative, POSIX separators. */
function toRepoRelative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

/**
 * Whether this profile's arm in `runProfileOwnValidators` forwards
 * `platformOption` onwards. Only those arms reach `detectPlatform`, the single
 * site that raises `QFAI-PLATFORM-001`; the rest discard the value.
 *
 * Exhaustive on purpose — the return type makes a new profile declare which
 * side of the fork it is on before this compiles.
 */
function consumesPlatformOption(profile: ValidationProfile): boolean {
  switch (profile) {
    case "prototyping":
    case "verify":
    case "full":
    case "saas-package":
      return true;
    case "discussion":
    case "sdd":
    case "atdd":
    case "tdd":
      return false;
  }
}

/**
 * Reports a `--platform` the requested profile never reads.
 *
 * The flag parses on every `validate` run but reaches `detectPlatform` from
 * four of the eight profiles, so on the other four the value was accepted and
 * dropped in silence: a stale or misspelled platform in a CI matrix fanned out
 * over identical legs with no finding naming the cause.
 *
 * Behind a promotion window (`RULE_PROMOTIONS.platformOptionUnusedByProfile`),
 * because the invocations it fires on were legal when they were written: a
 * matrix that passes one `--platform` uniformly across profiles meets the
 * finding on four legs at once on upgrade. `warning` until the pinned release,
 * `error` from it — never a hard-coded severity, which is a window that never
 * opens. `resolveToolVersion` resolves rather than rejects (its own read
 * failures return `"unknown"`, read as inside the window), so an unreadable
 * version cannot be what escalates this into a build failure.
 */
/**
 * A finding when the running qfai was resolved from outside the project root.
 *
 * `npx qfai` resolves a bare name by walking PARENT directories for
 * `node_modules/.bin`, and every shipped skill prescribes exactly that form. A
 * Claude Code worktree sits three levels below the main checkout, so a worktree
 * without its own dependencies silently ran the enclosing checkout's binary —
 * another branch, another lockfile — and the run said nothing about it. The
 * version was reachable only inside `validate.json`, which the README calls
 * internal, so no gate and no pasted evidence block could tell the two apart
 * (#1096).
 *
 * `info`, at every site, and deliberately off P7's promotion ladder. The same
 * path test catches a deliberate global install and a dependency hoisted to a
 * monorepo root, and both of those are correct operation — so a window ending
 * in `error` would make `--fail-on error` fail for a project doing nothing
 * wrong, with no way out: `applyWaivers` rejects a waiver against an `error`
 * finding (`QFAI-WAIVER-002`). This is the shape
 * `INFO_ONLY_SINCE_BASELINE` exists for, in the words its first member is
 * described with — it does not claim the tree is wrong, and it is not a gate
 * waiting to close. Promoting it needs the project's own dependency
 * declaration to tell an intended resolution from an ambient one, which is
 * more than a path comparison, and what that would take is recorded in #1108.
 */
async function buildToolProvenanceIssues(root: string): Promise<Issue[]> {
  const located = await locateToolAgainstProject(root);
  if (located === null || !located.outside) {
    return [];
  }
  // The one resolution nobody chose: a declaration exists and a different copy
  // answered it. `QFAI-TOOL-001` cannot carry this — it is `info` because the
  // path test alone admits a deliberate global install and a monorepo hoist,
  // and those are correct operation. Splitting the code rather than promoting
  // it is what keeps both statements true (#1108).
  if (located.declaredElsewhere) {
    const promoteAt = RULE_PROMOTIONS.toolResolvedAgainstDeclaration.promoteAt;
    const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);
    const windowNote =
      severity === "warning" ? ` (${promoteAt} までは warning、以降は error になります)` : "";
    return [
      issue(
        "QFAI-TOOL-002",
        `このプロジェクトは qfai を依存として宣言していますが、実行されているのは ` +
          `${located.packageDir} の別の copy です。宣言が指すディレクトリの外から解決されて` +
          `いるため、どの版が gate をかけたかはこのプロジェクトの lockfile が決めていません。` +
          `npx が bare name を親ディレクトリ方向に探索した結果、別のチェックアウト ` +
          `(別ブランチ・別 lockfile) の qfai か、npx が黙って取得した qfai@latest が` +
          `走っています。${windowNote}`,
        severity,
        undefined,
        "toolProvenance.resolvedAgainstDeclaration",
        [located.packageDir],
        "canonical",
        "この作業ツリーで `npm ci` / `pnpm install` を実行してから再実行してください。" +
          "グローバルインストールを意図している場合は、そのプロジェクトから qfai の依存宣言を" +
          "外してください — 宣言と実行の食い違いが、この finding が報告している状態です。",
      ),
    ];
  }
  return [
    issue(
      "QFAI-TOOL-001",
      `実行中の qfai (${located.packageDir}) は検証対象のプロジェクト root ` +
        `(${root}) の外から解決されています。このプロジェクトは qfai を依存として` +
        `宣言していないため、グローバルインストールか npx による取得が唯一の実行経路で、` +
        `いずれも意図した選択です。宣言と実行が食い違う場合は別に QFAI-TOOL-002 で` +
        `報告されます。`,
      "info",
      undefined,
      "toolProvenance.resolvedOutsideProject",
      [located.packageDir],
      "canonical",
      "意図した解決であれば無視して構いません。そうでなければ、この作業ツリーで " +
        "`npm ci` / `pnpm install` を実行してから再実行してください。",
    ),
  ];
}

async function buildUnusedPlatformIssues(
  profile: ValidationProfile,
  platformOption: string | undefined,
): Promise<Issue[]> {
  if (!platformOption || consumesPlatformOption(profile)) {
    return [];
  }
  const promoteAt = RULE_PROMOTIONS.platformOptionUnusedByProfile.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);
  const windowNote =
    severity === "warning" ? ` (${promoteAt} までは warning、以降は error になります)` : "";
  return [
    issue(
      "QFAI-PLATFORM-003",
      `--platform (${platformOption}) は profile "${profile}" では参照されません。${windowNote}`,
      severity,
      undefined,
      "platformDetection.unusedPlatformOption",
      [platformOption],
      "canonical",
      "platform 依存の検証が必要な場合は --profile prototyping / verify / full / saas-package を指定してください。不要であれば --platform を外してください。",
    ),
  ];
}

async function runProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  profile: ValidationProfile,
  platformOption?: string,
  specScope?: SpecScope,
): Promise<Issue[]> {
  // Runs in every profile, ahead of the profile's own validators. A broken
  // integration link means the assistant loaded no skill and routed no agent,
  // so every gate the profile is about was defined by files nothing read. That
  // is not an SDD fact or an ATDD fact; it invalidates the run.
  const surface = await inspectIntegrationSurface(root);
  // A CLI-boundary observation, independent of the tree below: it survives the
  // short-circuit so the operator still learns the flag went nowhere.
  const unusedPlatform = await buildUnusedPlatformIssues(profile, platformOption);
  // Same standing as `unusedPlatform`: a property of the run rather than of the
  // tree, so it survives the short-circuit below. It is also the finding most
  // worth keeping when the tree turns out to be damaged — a validate run
  // against another checkout's qfai explains a whole class of confusing damage.
  const toolProvenance = await buildToolProvenanceIssues(root);
  // Damage on a path the profile validators themselves walk stops here. One of
  // them reading the same tree raises `ENOTDIR` / `ELOOP` from its own
  // `readdir`, and one rejection took the whole run down — losing the finding
  // above, which is the only one that names the path and how to repair it. The
  // run fails either way; this decides whether it fails with something the
  // operator can act on. Damage confined to the integration directories is not
  // on that list: nothing downstream opens them.
  //
  // **And only where this profile's own validators would walk into it.** The
  // test is the intersection of `unwalkable` with the paths they open, not the
  // profile's name: `sdd` reads the configured skills directory from three of
  // its own validators, so a name-based exclusion left one of them raising
  // `ENOTDIR` / `ELOOP` and losing the finding above. Damage elsewhere in the
  // tree stops nothing for `sdd`, and damage anywhere in it stops nothing for
  // `discussion`, `atdd` or `tdd`, whose findings on discussion packs, spec
  // packs, traceability and the ledger are independent of it.
  const walked = assistantPathsWalkedBy(
    profile,
    toRepoRelative(root, resolvePath(root, config, "skillsDir")),
  );
  // Anchor integrity across the assistant tree runs in every profile too, and
  // for the same reason: a citation that resolves to no heading is an
  // instruction that silently does nothing, whichever stage followed it. That
  // is a property of the installation, not of a stage. Its own walk tolerates
  // the damage `QFAI-LINK-001` reports, so it cannot take that finding down.
  //
  // It therefore runs **before** the short-circuit below and is merged into it.
  // Behind the short-circuit it never ran at all, so a `QFAI-LINK-002` on the
  // intact half of the tree stayed hidden until `QFAI-LINK-001` was repaired —
  // "every profile" is what this rule promises, and structural damage
  // elsewhere is not a reason to withhold a finding the walk already has.
  const anchorIssues = await validateAssistantAnchorReferences(root, config);
  if (surface.unwalkable.some((damaged) => walked.some((base) => isUnder(base, damaged)))) {
    return [...toolProvenance, ...unusedPlatform, ...surface.issues, ...anchorIssues];
  }
  return [
    ...toolProvenance,
    ...unusedPlatform,
    ...surface.issues,
    ...anchorIssues,
    ...(await runProfileOwnValidators()),
  ];

  async function runProfileOwnValidators(): Promise<Issue[]> {
    switch (profile) {
      case "discussion":
        return runDiscussionValidators(root, config, specScope);
      case "sdd":
        return runSddValidators(root, config, false, true, specScope);
      case "prototyping":
        return runPrototypingProfileValidators(root, config, platformOption);
      case "atdd":
        return runAtddValidators(root, config, specScope);
      case "tdd":
        return runTddValidators(root, config, true, true, true, true, true, true, specScope);
      case "verify":
      case "full":
        return runFullValidators(root, config, platformOption, specScope);
      case "saas-package":
        return runSaasPackage(root, config, platformOption);
    }
  }
}

async function runSaasPackage(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  const prototypingIssues = await runPrototypingProfileValidators(root, config, platformOption);
  return runSaasPackageProfile(root, config, prototypingIssues);
}

async function runDiscussionValidators(
  root: string,
  config: ConfigLoadResult["config"],
  specScope?: SpecScope,
  // Which review packs this run owns. The discussion profile is the gate for
  // its own cycle only; `full` composes this runner and passes `"all"` so the
  // repo-wide scan keeps judging every pack.
  reviewPackProducers: ReviewPackProducers = DISCUSSION_PACK_PRODUCERS,
): Promise<Issue[]> {
  return [
    // `qfai-discussion` MUSTs a parsable root DESIGN.md and prescribes this
    // profile as its gate, so the gate has to be able to see whether the file
    // it mandates parses. Only the parse half — the lock comparison is
    // `/qfai-sdd` Phase 0's to clear, and the UI-contract checks belong to
    // later stages (#1098).
    ...(await validateRootDesignMdParse(root)),
    ...(await validateDiscussionMermaid(root)),
    ...(await validateDiscussionPackReadiness(root, config)),
    ...(await validateDiscussionVisuals(root)),
    ...(await validateResearchSummary(root, config)),
    ...(await runCanonicalUixValidators(root, config)),
    // The RCP footer names `--profile discussion` as the review-cycle gate and
    // mandates `review_request.md` / `Rxx_*.md` / `summary.json` in the same
    // breath. Without this the command it prescribes could not see the
    // artifacts it prescribes, so an incomplete pack passed the gate silently.
    ...(await validateReviewArtifacts(
      root,
      reviewArtifactsScope(root, config, specScope, reviewPackProducers),
    )),
  ];
}

/** Which review packs a profile is the gate for, or `"all"` for a full scan. */
type ReviewPackProducers = ReadonlySet<string> | "all";

/**
 * Scope handed to `validateReviewArtifacts`.
 *
 * Two narrowings, both so that one owner's in-flight pack cannot fail another
 * owner's gate. A review-pack finding names no spec, so `isFindingInSpecScope`
 * keeps it in every `--spec` run — the validator narrows itself instead, by the
 * target each pack records (a discussion pack, which no spec owns, stays in:
 * the scope contract keeps repo-level findings in every slice). And `sdd` /
 * `discussion` are each the hard gate for their own review cycle, so each
 * judges only the packs their own stage produced; a pack that names no owner at
 * all is still judged by both, since no one else would.
 */
function reviewArtifactsScope(
  root: string,
  config: ConfigLoadResult["config"],
  specScope: SpecScope | undefined,
  reviewPackProducers: ReviewPackProducers,
): ReviewArtifactsScope {
  return {
    specScope,
    specsRoot: resolvePath(root, config, "specsDir"),
    discussionRoot: resolvePath(root, config, "discussionDir"),
    producers: reviewPackProducers === "all" ? undefined : reviewPackProducers,
  };
}

async function runSddValidators(
  root: string,
  config: ConfigLoadResult["config"],
  includeCodeReferences = false,
  enforceNoPrematurePrototypingContracts = true,
  specScope?: SpecScope,
  // `full` runs the discussion profile too, which already carries the same
  // validator, so it opts out here to keep every QFAI-REVIEW-* finding once.
  includeReviewArtifacts = true,
  // `full` also runs the tdd profile, which calls the whole of
  // `validateTddList`, so it opts out here rather than reporting the
  // seed-shape codes twice.
  includeTddListSeedShape = true,
  // `full` is the repo-wide audit and covers the downstream stage too, so it
  // opts into the history-based `QFAI-TRACE-001` here — `runTddValidators`
  // opts out in exchange, so the ledger is still read exactly once.
  // `--profile sdd` on its own must never ask for it: see below.
  includeImplementationDrift = false,
): Promise<Issue[]> {
  return [
    // `/qfai-sdd` Phase 2b writes `tdd/test-list.md`, and `--profile sdd` is
    // the only gate it stops on — so the profile has to be able to read back
    // the shape it just wrote. Only the seed-shape half: the rest of
    // `validateTddList` reports execution state that exists after
    // `/qfai-implement`, which the SDD stage cannot clear.
    // The scope is passed, not left to the run-level `--spec` filter: every
    // `/qfai-sdd` slice gate is a `--spec` run, so an unscoped walk would read
    // and `stat` every sibling ledger once per slice.
    //
    // That same equivalence places the gate: a `--spec` run of this profile IS
    // the Phase 2 slice gate, and the Required Process runs Phase 2b — the
    // phase that writes the ledger — only after it. Reconciling the ledger
    // against `06_Test-Cases.md` there asks the writing stage for a file it
    // has not reached yet, and a new spec declaring a Unit or Component TC got
    // `TDDLIST_TC_NOT_COVERED` (error) on the very gate that has to pass
    // before Phase 2b can run. The unscoped stop gate is the post-Phase-2b
    // one, and it still evaluates the whole seed-shape set.
    //
    // The equivalence is one-way, though, and `beforeLedgerSeed` is read as a
    // permission rather than an assertion for that reason: `--spec` is
    // documented as a scope filter, so a `--spec` run is *also* how an author
    // re-checks a single spec after Phase 2b. Treating the flag as the verdict
    // let that run pass with rows missing. The validator drops the
    // reconciliation codes only where the ledger really is absent.
    ...(includeTddListSeedShape
      ? await validateTddListSeedShape(root, config, {
          ...(specScope ? { specScope } : {}),
          beforeLedgerSeed: specScope !== undefined,
        })
      : []),
    ...(await validateMermaidEnforcement(root)),
    // Preflight input source: a project that has spec packs must be able to
    // point at what they were derived from — a discussion pack `06_REQ.md` or
    // an `.qfai/evidence/import-lite-*.md`. The check was written but never
    // dispatched, so `QFAI-IMPLITE-001` could not fire and a project with
    // specs and no input source passed preflight silently.
    ...(await validateImportLiteEvidencePresence(root, config)),
    ...(await validateSpecPacks(root, config)),
    // The catalog wins over the in-code required-file sets, so a divergence
    // silently changes which files are mandatory. Report it.
    ...(await validateSpecRequiredFilesCatalog(root, config)),
    // One central arity check for every spec-pack table. Without it a stray
    // pipe silently shifts the columns every other validator reads.
    ...(await validateMarkdownTableArity(root, config)),
    ...(await validateStatusInSpecs(root, config)),
    ...(await validateDensityHints(root, config)),
    ...(await validateSpecSplitByCapability(root, config)),
    ...(await validateLayeredTraceability(root, config)),
    ...(await validateOrphanProhibition(root, config)),
    ...(await validateLayerCoverage(root, config, { specScope })),
    ...(await validateContractReferences(root, config)),
    // Contract → implementation routing: every `- SSOT modules:` entry under
    // `.qfai/contracts/**` must resolve on disk, so a renamed or never-written
    // module cannot keep being asserted by the contract that documents it.
    ...(await validateContractSsotModules(root, config)),
    ...(await validateSddDesignContractReadiness(root, config, {
      enforceNoPrematurePrototypingContracts,
    })),
    ...(await validateTraceability(root, config, { includeCodeReferences })),
    // `16_Traceability-ledger.md` is an artifact `/qfai-sdd` writes, and
    // `--profile sdd` is that skill's completion gate — so the profile that
    // owns the file is the one that must hear `QFAI-TRACE-002` about it.
    //
    // Presence and shape only for `--profile sdd`. `/qfai-sdd` updates BR/AC
    // and the ledger and leaves the implementation to `/qfai-implement`, so the
    // linked code is untouched *by design* when that gate runs; asking for the
    // history-based `QFAI-TRACE-001` there would fail the mandatory
    // `--profile sdd --fail-on error` run on the flow the profile exists to
    // certify. `QFAI-TRACE-001` gates the downstream profiles, which run after
    // the code exists.
    ...(await validateTraceabilityIntegrity(root, config, {
      includeImplementationDiff: includeImplementationDrift,
    })),
    ...(await validateDefinedIds(root, config)),
    ...(await validateContracts(root, config)),
    ...(await validateNavigationFlow(root, config)),
    ...(await validateWorklogSurface(root, config)),
    ...(await validateAssistantTreeMigration(root, config)),
    ...(await validateSkillDocReferences(root, config)),
    ...(await validateReviewerJustification(root, config)),
    ...(await validateReviewerGate(root, config)),
    ...(await validateSurfaceTypeDrift(root, config)),
    // Skill governance: `R-AUTOPILOT-POLICY-MISSING` on a qfai-*
    // SKILL.md that lacks the `## Default Autopilot Policy` section.
    // SKILL.md governance lives in the sdd profile.
    ...(await validateAutopilotPolicy(root, { config })),
    // Self-governance group: Pair IV (`R-HANDOFF-SCHEMA-DRIFT`, schema ↔
    // writer) and Pair III (`R-SKILL-MANIFEST-DRIFT`, probe-impl ↔
    // manifest-schema). Both are skill-governance surfaces so they live
    // in sdd, but both read qfai's own package sources — outside this
    // repo the group is a declared no-op and the profile-coverage notice
    // names its finding codes as unevaluated.
    ...(await runPackageSelfGovernanceValidators(root)),
    // Doc governance — surface pre-implementation tokens in
    // `references/*.md` + SKILL.md as warning during the deprecation
    // window and error at sunset.
    ...(await validateStaleReferences(root, { config })),
    // `rcp_footer.md` states both halves of the review-cycle contract — the
    // mandatory pack files and `qfai validate --profile sdd` as the gate — so
    // the gate has to be able to observe them.
    ...(includeReviewArtifacts
      ? await validateReviewArtifacts(
          root,
          reviewArtifactsScope(root, config, specScope, SDD_PACK_PRODUCERS),
        )
      : []),
  ];
}

/**
 * The prototyping issue set at its validators' declared severity.
 *
 * `full` / `verify` call this one. The exploration relaxation belongs to the
 * prototyping profile, not to this validator group: its trigger is a file
 * committed to the repository under test
 * (`.qfai/evidence/prototyping/prototyping.json#mode`), nothing resets it when
 * the project leaves the prototyping stage, and the last explicit mode is
 * inherited forward — so applying it here let an abandoned exploration loop
 * downgrade four gates of the verification profile permanently. Callers that
 * want the relaxation go through `runPrototypingProfileValidators`.
 */
async function runPrototypingValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await runUiuxValidators(root, config, platformOption)),
    ...(await detectMockHrefDrift(root)),
    // Second-wave reviewer-gate findings (prototyping
    // surface). Both detectors no-op when their gating files are
    // absent (consumer repo without the validator source / without a
    // DESIGN.md.backup snapshot), so the prototyping profile stays
    // safe to run on freshly-bootstrapped projects.
    ...(await validateDesignMdPatchZone(root, config)),
    ...(await detectEvidenceMutationUnlogged(root)),
    ...(await validatePrototypingEvidence(root, config)),
    // A screen retired mid-loop leaves `frozenSurfaceUnion` naming a spec that
    // no longer resolves, and nothing said so: `iterate`'s drift hard-stop only
    // fires when EVERY UI signal is gone, so the partial case reported
    // `error=0` over a loop describing a screen that does not exist (#1099).
    ...(await validateFrozenSurfaceReachability(root, config)),
    ...(await validateScreenIdCasing(root, config.paths.contractsDir)),
    ...(await validateUiEvidenceArtifacts(root, config)),
    ...(await validateRenderCritique(root, config)),
    ...(await validateDesignFidelity(root, config)),
    ...(await validatePrototypingDesignContractReadiness(root, config)),
    ...(await validateCompletionCertificateIssues(root, config)),
    ...(await validateConfigReferenceIntegrity(root, config)),
    ...(await validatePrototypingArtifactRefIntegrity(root, config)),
    // `QFAI-PROT-311` — delegationMap entries must name a role from the
    // SKILL.md Delegation Scope Table. No-ops when prototyping.json has no
    // executionPlan, so bootstrap projects are unaffected.
    ...(await validatePrototypingDelegationMap(root)),
    ...(await validateSpecIdLinkage(root, config)),
  ];
}

/**
 * The prototyping issue set as the `prototyping` (and `saas-package`) profile
 * reports it.
 *
 * Prototyping-mode relaxation: under `mode: exploration` the
 * soft-rubric gates (QFAI-CRIT-008, QFAI-DCON-030..032) downgrade
 * error → warning. Schema / path / license gates stay hard error.
 * The mode is read from `prototyping.json#mode` written by iterate
 * at cycle 0 (absent → legacy "convergence" interpretation).
 */
async function runPrototypingProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  const raw = await runPrototypingValidators(root, config, platformOption);
  return await relaxPrototypingIssuesIfExploration(root, raw);
}

async function relaxPrototypingIssuesIfExploration(
  root: string,
  issues: Issue[],
): Promise<Issue[]> {
  const { readPrototypingModeForRelax } = await import("./prototyping/modeRead.js");
  const mode = await readPrototypingModeForRelax(root);
  if (mode !== "exploration") return issues;
  const { relaxIssuesForMode } = await import("./prototyping/mode.js");
  return [...relaxIssuesForMode(issues, mode)];
}

async function runAtddValidators(
  root: string,
  config: ConfigLoadResult["config"],
  specScope?: SpecScope,
): Promise<Issue[]> {
  // Evaluated once and shared: the Coverage Depth Matrix gate needs the same
  // "which specs have ATDD-owned tests" answer the traceability gate computes,
  // and walking the test tree twice per run buys nothing.
  const evaluated = await evaluateAtddCodeTraceability(root, config);
  return [
    ...(await validateAtddCodeTraceability(root, config, {
      evaluated,
      ...(specScope ? { specScope } : {}),
    })),
    // The Coverage Depth Matrix is a Mandatory Output of this stage that no
    // rule ever opened; scoping is left to `isFindingInSpecScope`, which reads
    // the spec directory each finding is attributed to.
    ...(await validateAtddCoverageDepth(root, evaluated)),
    // D-SCAFFOLD-PLACEHOLDER (BR-0008-0008): surface unfilled
    // `qfai atdd scaffold` skeletons at severity warning until the
    // operator implements a real assertion. Wired into atdd + full
    // profiles so the documented escalation path is reachable from
    // the validate command surface.
    // Scoped: this validator writes `.qfai/state.json` escalation counters, so
    // an unscoped scan under `--spec` mutated sibling specs' state.
    ...(await validateScaffoldPlaceholder(root, config, specScope ? { specScope } : {})),
  ];
}

async function runTddValidators(
  root: string,
  config: ConfigLoadResult["config"],
  includeTraceability = true,
  // `full` already runs the ATDD profile, so it opts out here to avoid
  // emitting every QFAI-ATDD-* finding twice.
  includeAtddCodeTraceability = true,
  // The upstream-ownership guard binds the *downstream* stage. `full` is a
  // repo-wide audit that also covers the SDD profile — the owner of these
  // files — so it opts out rather than flagging every legitimate spec edit.
  includeUpstreamGuard = true,
  // `full` runs the sdd profile, which already calls `validateContracts`.
  includeContracts = true,
  // `full` runs the sdd profile, which already calls
  // `validateMarkdownTableArity`.
  includeTableArity = true,
  // Same reason: the sdd profile owns the traceability ledger and now runs
  // `validateTraceabilityIntegrity` itself — under `full` with the
  // implementation-drift check switched on — so `full` opts out here.
  includeTraceabilityIntegrity = true,
  specScope?: SpecScope,
): Promise<Issue[]> {
  return [
    // The arity check exists for this ledger: every `validateTddList` row check
    // resolves its column with `headers.indexOf(name)` and `continue`s on the
    // empty string a truncated row produces, so a row cut before `Status` is
    // not merely unflagged — it is unread. Running it here first means the
    // profile `qfai-implement` gates on can see the corruption at all.
    ...(includeTableArity ? await validateMarkdownTableArity(root, config) : []),
    ...(await validateTddList(root, config)),
    ...(await validateTestTodoStubs(root, config)),
    // `qfai-implement` names `--profile tdd` as its only completion gate, and
    // it is the stage that creates test-routing obligations. Without this the
    // profile was structurally incapable of observing QFAI-ATDD-111/112/113/
    // 121/122 — the US -> tests/e2e/**, TC -> tests/integration/** and
    // CON-API -> tests/api/** gates it is supposed to satisfy.
    ...(includeAtddCodeTraceability
      ? await validateAtddCodeTraceability(root, config, specScope ? { specScope } : {})
      : []),
    ...(includeTraceability
      ? await validateTraceability(root, config, { includeCodeReferences: true })
      : []),
    ...(includeTraceabilityIntegrity ? await validateTraceabilityIntegrity(root, config) : []),
    // The drift protocol names `--profile tdd` as the downstream completion
    // gate, so the downstream-only ownership rule is enforced here and nowhere
    // else: `/qfai-sdd` owns these files and edits them legitimately.
    ...(includeUpstreamGuard ? await validateUpstreamSsotGuard(root, config) : []),
    // The implementation stage executes against the contracts; its gate should
    // cover them. `--profile tdd` is what `qfai-implement` names as its
    // completion gate, and it ran no contract check at all — so a DB contract
    // that cannot be applied was invisible to the only profile the stage runs.
    // `full` opts out below because `runSddValidators` already includes it.
    ...(includeContracts ? await validateContracts(root, config) : []),
    // Same reasoning for the contract -> implementation routing block: the
    // implementation stage is the one that moves and renames those modules, so
    // `--profile tdd` — the gate `qfai-implement` names — has to see a
    // `- SSOT modules:` entry it just made dead. It rides `includeContracts`
    // so `full` does not report it twice.
    ...(includeContracts ? await validateContractSsotModules(root, config) : []),
  ];
}

async function runFullValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
  specScope?: SpecScope,
): Promise<Issue[]> {
  return [
    ...(await validateRepositoryHygiene(root, config)),
    ...(await validateSkillsIntegrity(root, config)),
    ...(await validateAssistantAssets(root, config)),
    // `"all"`: the full scan owns every review pack, not only the discussion
    // ones this runner gates inside its own profile.
    ...(await runDiscussionValidators(root, config, specScope, "all")),
    // Review artifacts come in with the discussion profile above, and the tdd
    // profile below carries the whole of `validateTddList`, so the sdd profile
    // opts out of both rather than reporting QFAI-REVIEW-* and the ledger
    // seed-shape codes twice. The trailing `true` is the opposite trade:
    // `full` covers the downstream stage, so it opts INTO the history-based
    // implementation-drift check here and `runTddValidators` opts out below.
    ...(await runSddValidators(root, config, true, false, specScope, false, false, true)),
    ...(await runPrototypingValidators(root, config, platformOption)),
    ...(await runAtddValidators(root, config, specScope)),
    ...(await runTddValidators(root, config, false, false, false, false, false, false)),
    ...(await validatePrototypingSkill(root, config)),
  ];
}

async function runUiuxValidators(
  root: string,
  config: ConfigLoadResult["config"],
  platformOption?: string,
): Promise<Issue[]> {
  const uiuxStart = performance.now();
  const platformResult = await detectPlatform(root, config, platformOption);
  const platform = platformResult.platform;
  const uiuxValidators: Array<() => Promise<Issue[]>> = [
    () => validateDesignToken(root, config),
    () => validateHtmlMock(root, platform, config),
    () => validateMermaidScreenFlow(root, config),
    () => validateBpApDb(root, config),
    () => validateUiDefinitionConsistency(root, config),
    () => validateResearchSummary(root, config),
    () => validateAgentDefinition(root, config),
    () => validateDesignAudit(root, config),
    () => runCanonicalUixValidators(root, config),
  ];
  const uiuxIssueGroups = await Promise.all(uiuxValidators.map((validator) => validator()));
  const uiuxIssues: Issue[] = [...platformResult.issues, ...uiuxIssueGroups.flat()];

  const uiuxElapsed = performance.now() - uiuxStart;
  if (uiuxElapsed > UIUX_VALIDATION_BUDGET_MS) {
    uiuxIssues.push({
      code: "QFAI-UIUX-PERF",
      severity: "warning",
      category: "canonical",
      message: `UI/UX validation exceeded budget (${UIUX_VALIDATION_BUDGET_MS}ms). All validators were executed.`,
      rule: "uiux.performanceBudget",
    });
  }
  return uiuxIssues;
}

async function validatePrototypingSkill(
  root: string,
  config: ConfigLoadResult["config"],
): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const prototypingSkillPath = path.join(skillsDir, "qfai-prototyping", "SKILL.md");
  const prototypingSkillContent = await readSafe(prototypingSkillPath);
  return prototypingSkillContent.length > 0
    ? validatePrototypingSkillContent(prototypingSkillContent).issues
    : [];
}

function countIssues(issues: Issue[]): ValidationCounts {
  return issues.reduce<ValidationCounts>(
    (acc, issue) => {
      if (issue.suppressed) {
        return acc;
      }
      acc[issue.severity] += 1;
      return acc;
    },
    { info: 0, warning: 0, error: 0 },
  );
}

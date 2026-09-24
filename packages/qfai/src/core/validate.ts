import path from "node:path";
import { readdir } from "node:fs/promises";

import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import {
  resolveFlowScope,
  flowScopeContainsFile,
  flowScopeContainsId,
  type FlowScope,
} from "./flowScope.js";
import { hasLegacySpecPackEntries } from "./storyTree/layout.js";
import { readStoryTreeModel, type StoryTreeModel } from "./storyTree/tree.js";
import { validateStoryTreeStructure } from "./validators/storyTreeStructure.js";
import { validateStoryTreeObligations } from "./validators/storyTreeObligations.js";
import { validateStoryTreeContractReferences } from "./validators/contractReferences.js";
import { validateStorySteeringPlaceholders } from "./validators/assistantAssets.js";
import { validateStoryTreeDrift } from "./validators/upstreamSsotGuard.js";
import { runSaasPackageProfile } from "./saasPackage/profile.js";
import { issue } from "./validators/utils.js";
import type {
  Issue,
  ValidationCounts,
  ValidationProfile,
  ValidationResult,
  ValidationTimings,
} from "./types.js";
import { locateToolAgainstProject, resolveToolVersion } from "./version.js";
import { applyWaivers } from "./waivers.js";
import { validateContracts, validateUiContractParse } from "./validators/contracts.js";
import { validateUiScreenEntries } from "./validators/uiScreenEntries.js";
import { validateDesignDirectionProposal } from "./validators/designDirectionProposal.js";
import { validateSddDesignContractReadiness } from "./validators/designContractReadiness.js";
import { validateStoryTreeCoverageDepth } from "./validators/storyTreeCoverageDepth.js";
import { validateDiscussionMermaid } from "./validators/discussMermaid.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { validateSkillsIntegrity } from "./validators/skillsIntegrity.js";
import { inspectIntegrationSurface } from "./validators/integrationSurface.js";
import { validateAssistantAnchorReferences } from "./validators/assistantAnchorReferences.js";
import {
  DISCUSSION_PACK_PRODUCERS,
  SDD_PACK_PRODUCERS,
  validateReviewArtifacts,
  type ReviewArtifactsScope,
} from "./validators/reviewArtifacts.js";
import {
  scaffoldPlaceholderReportedFilter,
  validateScaffoldPlaceholder,
} from "./validators/scaffoldPlaceholder.js";
import {
  detectPlatform,
  validateAgentDefinition,
  validateBpApDb,
  validateContractSsotModules,
  validateDesignToken,
  validateDiscussionPackReadiness,
  validateDiscussionVisuals,
  validateHtmlMock,
  validateMermaidScreenFlow,
  validatePrototypingEvidence,
  validateScreenIdCasing,
  validateCompletionCertificateIssues,
  validatePrototypingDelegationMap,
  validateConfigReferenceIntegrity,
  validatePrototypingArtifactRefIntegrity,
  validateSpecIdLinkage,
  validateFrozenSurfaceReachability,
  validateResearchSummary,
  validateRepositoryHygiene,
  validateUiDefinitionConsistency,
  validateDesignAudit,
  validateRenderCritique,
  validatePrototypingDesignContractReadiness,
  validateRootDesignMdParse,
  validatePrototypingSkillContent,
  runCanonicalUixValidators,
  validateUiEvidenceArtifacts,
  validateTestTodoStubs,
  validateWorklogSurface,
  validateAssistantTreeMigration,
  validateSkillDocReferences,
  validateReviewerJustification,
  validateReviewerGate,
  detectMockHrefDrift,
  validateDesignMdPatchZone,
  detectEvidenceMutationUnlogged,
  validateAutopilotPolicy,
  validateGrillingTrace,
  runPackageSelfGovernanceValidators,
  validateStaleReferences,
  stubSourceFilePattern,
} from "./validators/index.js";
import type { TestTodoStubOptions } from "./validators/testTodoStubs.js";
import { atddAcceptanceLayerFilter, atddAcceptanceTestGlobs } from "./atddTraceability.js";
import type { HtmlMockTiming } from "./validators/index.js";
import { readSafe } from "./validators/utils.js";

const UIUX_VALIDATION_BUDGET_MS = 2000;
const HTML_MOCK_VALIDATION_BUDGET_MS = 2000;

/**
 * Where `runUiuxValidators` leaves what it measured.
 *
 * Threaded down instead of returned so the profile runners keep their
 * `Issue[]` shape. Timing used to travel as two `warning` findings, which put
 * the host's speed into `counts.warning`; the sink keeps the signal without
 * letting it reach the issue stream.
 */
type TimingsSink = { timings?: ValidationTimings };

export type ValidationOptions = {
  profile?: ValidationProfile;
  platform?: string;
  flowIds?: readonly string[];
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
  let oldLayoutRoot: string | undefined;
  for (const candidate of new Set([specsRoot, path.join(root, ".qfai", "specs")])) {
    let entries: string[] = [];
    try {
      entries = await readdir(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (hasLegacySpecPackEntries(entries)) {
      oldLayoutRoot = candidate;
      break;
    }
  }
  if (oldLayoutRoot) {
    const layoutIssue = issue(
      "QFAI-LAYOUT-001",
      `Old spec-pack layout at ${oldLayoutRoot}; run /qfai-migration-spec-to-story before validation.`,
      "error",
      oldLayoutRoot,
      "storyTree.oldLayout",
    );
    return {
      toolVersion: await resolveToolVersion(),
      generatedAt: new Date().toISOString(),
      profile,
      profileValidatorsRan: false,
      issues: [layoutIssue],
      counts: countIssues([layoutIssue]),
    };
  }
  const storyModel = await readStoryTreeModel(root, config);
  const flowScope = options.flowIds ? resolveFlowScope(options.flowIds, storyModel) : undefined;
  const scopeIssues =
    flowScope?.invalidValues.map((value) =>
      issue(
        "QFAI-FLOW-001",
        `Unusable --flow value: ${value}`,
        "error",
        specsRoot,
        "flowScope.value",
        [value],
      ),
    ) ?? [];

  const timingsSink: TimingsSink = {};
  const profileRun = await runProfileValidators(
    root,
    config,
    profile,
    timingsSink,
    options.platform,
    storyModel,
    flowScope,
  );
  const findings = [...configIssues, ...scopeIssues, ...profileRun.issues];
  const scopedFindings = findings.filter((finding) => isFindingInFlowScope(finding, flowScope));
  const { issues, waivers } = await applyWaivers(root, scopedFindings);

  const toolVersion = await resolveToolVersion();
  return {
    toolVersion,
    // Stamped where the result is assembled, so every writer of a
    // `ValidationResult` carries it without having to remember to.
    generatedAt: new Date().toISOString(),
    profile,
    // Reported, not inferred: a run stopped by the integration surface returns
    // only those findings, and their absence is indistinguishable from a clean
    // surface to a reader looking at the issue list alone.
    profileValidatorsRan: profileRun.ranProfileValidators,
    issues,
    counts: countIssues(issues),
    waivers,
    ...(timingsSink.timings ? { timings: timingsSink.timings } : {}),
  };
}

function isFindingInFlowScope(finding: Issue, scope: FlowScope | undefined): boolean {
  if (!scope || finding.code === "QFAI-FLOW-001") return true;
  if (!finding.code.startsWith("QFAI-STORY-") && finding.code !== "QFAI-CONTRACT-034") {
    return true;
  }
  if (finding.refs?.some((ref) => flowScopeContainsId(scope, ref))) return true;
  return finding.file ? flowScopeContainsFile(scope, finding.file) : false;
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
    // a regular file at `.qfai/assistant/agent` stopped `full` on a tree those
    // validators never open, while `validateAgentDefinition` turns a missing
    // agent into an ordinary finding rather than an exception. The extra
    // profiles here differ in what else they run, not in how far into the
    // assistant tree they reach.
    case "verify":
    case "full":
    case "prototyping":
    case "saas-package":
      // Plus the agents tree, which `validateAgentDefinition` opens by
      // pathname: a canonical agent replaced by a directory gives it `EISDIR`
      // and a FIFO blocks it, either way taking the finding down with the run.
      //
      // `prototyping` and `saas-package` run `validateAgentDefinition` too,
      // and since `QFAI-AGENT-019` / `QFAI-AGENT-015` it reaches the skills
      // tree as well — it reads every routed skill's `SKILL.md` and `readdir`s
      // the configured skills directory. Listing only the agents tree for them
      // left a FIFO at a routed `SKILL.md` blocking the run forever with the
      // `QFAI-LINK-001` that names it already in hand.
      return [skillsRelative, AGENTS_RELATIVE];
    case "sdd":
      return [skillsRelative];
    default:
      return [];
  }
}

/** The canonical agent tree, which `validateAgentDefinition` opens by pathname. */
const AGENTS_RELATIVE = ".qfai/assistant/agent";

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
    case "drift":
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
 * The invocations it fires on were legal when they were written, so a matrix
 * that passes one `--platform` uniformly across profiles meets the finding on
 * four legs at once. The fix is one edit per leg: drop the flag where the
 * profile does not read it.
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
 * internal, so no gate and no pasted evidence block could tell the two apart.
 *
 * `info`, at every site. The same path test catches a deliberate global
 * install and a dependency hoisted to a monorepo root, and both of those are
 * correct operation — an `error` would make `--fail-on error` fail for a
 * project doing nothing wrong, with no way out, because `applyWaivers` rejects
 * a waiver against an `error` finding (`QFAI-WAIVER-002`). This is the shape
 * `INFO_ONLY_SINCE_BASELINE` exists for, in the words its first member is
 * described with: it does not claim the tree is wrong. Saying more than that
 * needs the project's own dependency declaration to tell an intended
 * resolution from an ambient one, which is more than a path comparison.
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
  // it is what keeps both statements true.
  if (located.declaredElsewhere) {
    const severity = "error";
    return [
      issue(
        "QFAI-TOOL-002",
        `このプロジェクトは qfai を依存として宣言していますが、実行されているのは ` +
          `${located.packageDir} の別の copy です。宣言が指すディレクトリの外から解決されて` +
          `いるため、どの版が gate をかけたかはこのプロジェクトの lockfile が決めていません。` +
          `npx が bare name を親ディレクトリ方向に探索した結果、別のチェックアウト ` +
          `(別ブランチ・別 lockfile) の qfai か、npx が黙って取得した qfai@latest が` +
          `走っています。`,
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

function buildUnusedPlatformIssues(
  profile: ValidationProfile,
  platformOption: string | undefined,
): Issue[] {
  if (!platformOption || consumesPlatformOption(profile)) {
    return [];
  }
  const severity = "error";
  return [
    issue(
      "QFAI-PLATFORM-003",
      `--platform (${platformOption}) は profile "${profile}" では参照されません。`,
      severity,
      undefined,
      "platformDetection.unusedPlatformOption",
      [platformOption],
      "canonical",
      "platform 依存の検証が必要な場合は --profile prototyping / verify / full / saas-package を指定してください。不要であれば --platform を外してください。",
    ),
  ];
}

/**
 * What one profile's run produced, and whether its own validators ran at all.
 *
 * The two cannot be recovered from the issue list downstream: an aborted run
 * and a healthy one both return `surface.issues` first, so a caller counting
 * findings cannot tell "the surface is broken and nothing else was looked at"
 * from "the surface is broken and everything else passed".
 */
type ProfileValidatorRun = {
  readonly issues: Issue[];
  /** `false` when the integration-surface inspection stopped the run below. */
  readonly ranProfileValidators: boolean;
};

async function runProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  profile: ValidationProfile,
  timings: TimingsSink,
  platformOption?: string,
  storyModel?: StoryTreeModel,
  flowScope?: FlowScope,
): Promise<ProfileValidatorRun> {
  // Runs in every profile, ahead of the profile's own validators. A broken
  // integration link means the assistant loaded no skill and routed no agent,
  // so every gate the profile is about was defined by files nothing read. That
  // is not an SDD fact or an ATDD fact; it invalidates the run.
  const surface = await inspectIntegrationSurface(root);
  // A CLI-boundary observation, independent of the tree below: it survives the
  // short-circuit so the operator still learns the flag went nowhere.
  const unusedPlatform = buildUnusedPlatformIssues(profile, platformOption);
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
  // tree stops nothing for `sdd`; the other profiles can still report findings
  // from the inputs they can read.
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
    return {
      issues: [...toolProvenance, ...unusedPlatform, ...surface.issues, ...anchorIssues],
      ranProfileValidators: false,
    };
  }
  return {
    issues: [
      ...toolProvenance,
      ...unusedPlatform,
      ...surface.issues,
      ...anchorIssues,
      ...(await runProfileOwnValidators()),
    ],
    ranProfileValidators: true,
  };

  async function runProfileOwnValidators(): Promise<Issue[]> {
    if (!storyModel) return [];
    return runStoryProfileValidators(
      root,
      config,
      profile,
      storyModel,
      timings,
      platformOption,
      flowScope,
    );
  }
}

async function runStoryProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  profile: ValidationProfile,
  model: StoryTreeModel,
  timings: TimingsSink,
  platformOption?: string,
  flowScope?: FlowScope,
): Promise<Issue[]> {
  const sdd = async (includeSteering = true): Promise<Issue[]> => [
    ...(await validateStoryTreeStructure(root, config, model)),
    ...(await validateStoryTreeContractReferences(root, config, model)),
    ...(includeSteering ? await validateStorySteeringPlaceholders(root, config) : []),
    ...(await validateContracts(root, config)),
    ...(await validateSddDesignContractReadiness(root, config)),
    ...(await validateGrillingTrace(root, {
      subjects: ["flow"],
      flowScope: flowScope ? new Set(flowScope.flowIds) : undefined,
    })),
    ...(await validateContractSsotModules(root, config)),
    ...(await validateWorklogSurface(root, config)),
    ...(await validateAssistantTreeMigration(root, config)),
    ...(await validateSkillDocReferences(root, config)),
    ...(await validateReviewerJustification(root, config)),
    ...(await validateReviewerGate(root, config)),
    ...(await validateAutopilotPolicy(root, { config })),
    ...(await runPackageSelfGovernanceValidators(root)),
    ...(await validateStaleReferences(root, { config })),
    ...(await validateReviewArtifacts(root, {
      specScope: undefined,
      specsRoot: resolvePath(root, config, "specsDir"),
      flowScope,
      producers: SDD_PACK_PRODUCERS,
    })),
  ];
  const atdd = async (): Promise<Issue[]> => [
    ...(await validateStoryTreeObligations(root, config, "atdd", model)),
    ...(await validateStoryTreeCoverageDepth(
      root,
      model,
      flowScope,
      resolvePath(root, config, "testsDir"),
    )),
    ...(await validateScaffoldPlaceholder(root, config, flowScope ? { flowScope } : {})),
    ...(await validateTestTodoStubs(root, config, {
      ...acceptanceStubScan(root, config),
      placeholderReported: scaffoldPlaceholderReportedFilter(root, config),
    })),
  ];
  const tdd = async (includeContracts = true, includeDrift = true): Promise<Issue[]> => [
    ...(await validateStoryTreeObligations(root, config, "tdd", model)),
    ...(includeDrift ? await validateStoryTreeDrift(root, config, "tdd") : []),
    ...(await validateTestTodoStubs(root, config)),
    ...(includeContracts ? await validateContracts(root, config) : []),
    ...(includeContracts ? await validateContractSsotModules(root, config) : []),
  ];
  switch (profile) {
    case "sdd":
      return sdd();
    case "atdd":
      return atdd();
    case "tdd":
      return tdd();
    case "drift":
      return validateStoryTreeDrift(root, config, "drift");
    case "verify":
    case "full":
      return dedupeStubFindings(
        dedupeStoryFindings([
          ...(await validateRepositoryHygiene(root, config)),
          ...(await validateSkillsIntegrity(root, config)),
          ...(await validateAssistantAssets(root, config)),
          ...(await runDiscussionValidators(root, config, "all")),
          ...(await sdd(false)),
          ...(await runPrototypingValidators(root, config, timings, platformOption)),
          ...(await atdd()),
          ...(await tdd(false, false)),
          ...(await validatePrototypingSkill(root, config)),
        ]),
      );
    case "discussion":
      return runDiscussionValidators(root, config);
    case "prototyping":
      return runPrototypingProfileValidators(root, config, timings, platformOption);
    case "saas-package":
      return runSaasPackage(root, config, timings, platformOption);
  }
}

function dedupeStoryFindings(findings: Issue[]): Issue[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    if (
      finding.code !== "QFAI-STORY-008" &&
      finding.code !== "QFAI-STORY-009" &&
      finding.code !== "QFAI-SCAN-002"
    )
      return true;
    const key = [finding.code, finding.file ?? "", ...(finding.refs ?? [])].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runSaasPackage(
  root: string,
  config: ConfigLoadResult["config"],
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  const prototypingIssues = await runPrototypingProfileValidators(
    root,
    config,
    timings,
    platformOption,
  );
  return runSaasPackageProfile(root, config, prototypingIssues);
}

async function runDiscussionValidators(
  root: string,
  config: ConfigLoadResult["config"],
  // Which review packs this run owns. The discussion profile is the gate for
  // its own cycle only; `full` composes this runner and passes `"all"` so the
  // repo-wide scan keeps judging every pack.
  reviewPackProducers: ReviewPackProducers = DISCUSSION_PACK_PRODUCERS,
): Promise<Issue[]> {
  return [
    // A project reaching this profile may already carry a root DESIGN.md —
    // from `npx qfai init`, from a hand-edit, or from an earlier pass of the
    // pipeline — and this is the earliest gate that can see whether it parses.
    // Catching it here means a malformed file surfaces before `/qfai-sdd`
    // Phase 0 authors or freezes anything. Only the parse half — the lock
    // comparison is
    // `/qfai-sdd` Phase 0's to clear, and the UI-contract checks belong to
    // later stages.
    ...(await validateRootDesignMdParse(root)),
    ...(await validateDiscussionMermaid(root)),
    ...(await validateDesignDirectionProposal(root, config)),
    ...(await validateDiscussionPackReadiness(root, config)),
    ...(await validateDiscussionVisuals(root)),
    ...(await validateResearchSummary(root, config)),
    ...(await runCanonicalUixValidators(root, config)),
    // `QFAI-GRILL-001` (warning) on this run's own session record. The stage
    // names `--profile discussion` as its completion gate, so a run that wrote
    // no record could otherwise finish its own gate without the finding. The
    // The discussion profile and full run both inspect discussion evidence.
    ...(await validateGrillingTrace(root, {
      subjects: ["discussion"],
      discussionDir: config.paths.discussionDir,
    })),
    // The RCP footer names `--profile discussion` as the review-cycle gate and
    // mandates `review_request.md` / `Rxx_*.md` / `summary.json` in the same
    // breath. Without this the command it prescribes could not see the
    // artifacts it prescribes, so an incomplete pack passed the gate silently.
    ...(await validateReviewArtifacts(
      root,
      reviewArtifactsScope(root, config, reviewPackProducers),
    )),
  ];
}

/** Which review packs a profile is the gate for, or `"all"` for a full scan. */
type ReviewPackProducers = ReadonlySet<string> | "all";

/**
 * Scope handed to `validateReviewArtifacts`.
 *
 * `sdd` and `discussion` are each the hard gate for their own review cycle,
 * so each judges the packs its stage produced. A full run judges every pack.
 */
function reviewArtifactsScope(
  root: string,
  config: ConfigLoadResult["config"],
  reviewPackProducers: ReviewPackProducers,
): ReviewArtifactsScope {
  return {
    specScope: undefined,
    specsRoot: resolvePath(root, config, "specsDir"),
    discussionRoot: resolvePath(root, config, "discussionDir"),
    producers: reviewPackProducers === "all" ? undefined : reviewPackProducers,
  };
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
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await runUiuxValidators(root, config, timings, platformOption)),
    ...(await detectMockHrefDrift(root)),
    // Second-wave reviewer-gate findings (prototyping
    // surface). Both detectors no-op when their gating files are
    // absent (consumer repo without the validator source / without a
    // DESIGN.md.backup snapshot), so the prototyping profile stays
    // safe to run on freshly-bootstrapped projects.
    ...(await validateDesignMdPatchZone(root, config)),
    ...(await detectEvidenceMutationUnlogged(root)),
    ...(await validatePrototypingEvidence(root, config)),
    ...(await validateScreenIdCasing(root, config.paths.contractsDir)),
    ...(await validateUiEvidenceArtifacts(root, config)),
    ...(await validateRenderCritique(root, config)),
    ...(await validatePrototypingDesignContractReadiness(root, config)),
    ...(await validateCompletionCertificateIssues(root, config)),
    ...(await validateConfigReferenceIntegrity(root, config)),
    ...(await validatePrototypingArtifactRefIntegrity(root, config)),
    ...(await validateSpecIdLinkage(root, config)),
    ...(await validateFrozenSurfaceReachability(root, config)),
    // `QFAI-PROT-311` — delegationMap entries must name a role from the
    // SKILL.md Delegation Scope Table. No-ops when prototyping.json has no
    // executionPlan, so bootstrap projects are unaffected.
    ...(await validatePrototypingDelegationMap(root)),
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
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  const raw = [
    ...(await runPrototypingValidators(root, config, timings, platformOption)),
    // The profile certification accepts, so an entry no screen is read from is
    // reported here too, and so is a UI contract that does not parse. Kept out
    // of `runPrototypingValidators`: `full` also runs `validateContracts`, which
    // reports both already.
    ...(await validateUiScreenEntries(root, config)),
    ...(await validateUiContractParse(root, config)),
  ];
  return await relaxPrototypingIssuesIfExploration(root, raw);
}

async function relaxPrototypingIssuesIfExploration(
  root: string,
  issues: Issue[],
): Promise<Issue[]> {
  const { readPrototypingModeForRelax } = await import("./prototyping/modeRead.js");
  const mode = await readPrototypingModeForRelax(root);
  if (mode !== "exploration") return issues;
  const { relaxIssuesForMode, buildExplorationRelaxationNotice } =
    await import("./prototyping/mode.js");
  const relaxed = [...relaxIssuesForMode(issues, mode)];
  // Weakening a gate is auditable the way a waiver is: the downgraded
  // findings carry `relaxedFrom` and this notice puts the mode, its
  // source file and the affected codes into validate.json + stdout.
  const notice = buildExplorationRelaxationNotice(relaxed, mode);
  return notice === null ? relaxed : [...relaxed, notice];
}

/**
 * The selection the ATDD stage's stub scan reads: the layer directories under
 * `paths.testsDir` and the project's own `testFileGlobs`, kept to the
 * acceptance layers.
 */
function acceptanceStubScan(root: string, config: ConfigLoadResult["config"]): TestTodoStubOptions {
  return {
    // The pattern carries the project's own extensions as well. The layer
    // globs this builds under `paths.testsDir` are generated from it, and an
    // extension named only by a package glob — `packages/**/*.sol` beside a
    // `tests/integration/pay.sol` — reaches that path through them alone,
    // because the package glob does not. A source the gate never collects
    // cannot be reported as unscanned either.
    globs: atddAcceptanceTestGlobs(
      root,
      config,
      stubSourceFilePattern(config.validation.traceability.testFileGlobs),
    ),
    projectGlobs: config.validation.traceability.testFileGlobs,
    fileFilter: atddAcceptanceLayerFilter(root, config),
  };
}

/**
 * Collapses the stub findings the ATDD and TDD scans both produced.
 *
 * `full` runs both, and they select files differently — the acceptance
 * directories versus `validation.traceability.testFileGlobs` — so neither is a
 * subset of the other and dropping either one would lose real findings. The
 * overlap is exact (same rule, file, line and construct), so it dedupes
 * cleanly instead.
 */
const STUB_VALIDATOR_CODES = new Set(["QFAI-TEST-001", "QFAI-TEST-002", "QFAI-TEST-003"]);

function dedupeStubFindings(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((entry) => {
    // All three codes this validator emits, not only the first two: `full`
    // runs it once per profile, so a `.skip` the two selections share was
    // counted twice as `QFAI-TEST-003`, so twice in the error count.
    if (!STUB_VALIDATOR_CODES.has(entry.code)) return true;
    const key = [
      entry.code,
      entry.file ?? "",
      entry.loc?.line ?? "",
      // Two stubs on one line are two findings. Without the column they share
      // every other field and the second one was dropped.
      entry.loc?.column ?? "",
      (entry.refs ?? []).join(","),
      // `QFAI-TEST-002` names a state, not an occurrence, and its three forms
      // carry no line and no column. The ATDD selection hitting the file limit
      // and the repo-wide selection being empty are different states of
      // different scans; keyed on the fields above they collapsed, and the
      // report kept whichever came first while the other went unmentioned. The
      // message is what distinguishes them, and for a real occurrence it is a
      // function of the fields already in the key, so adding it drops nothing
      // that was being deduped before.
      entry.message,
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runUiuxValidators(
  root: string,
  config: ConfigLoadResult["config"],
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  const uiuxStart = performance.now();
  const platformResult = await detectPlatform(root, config, platformOption);
  const platform = platformResult.platform;
  // The html-mock pass times itself and reports through here, rather than
  // being wall-clocked from this side. Its budget is for parsing the mock
  // blocks, and the parser is a jsdom-backed module loaded lazily inside the
  // pass at ~910ms; a stopwatch around the call would charge that one-off load
  // to the budget and report every sub-second `htmlMockTimeout` as an overrun
  // however fast the blocks actually parsed.
  //
  // Stays 0 when there are no mock blocks to parse — nothing was loaded and
  // nothing was parsed, so there is no cost to attribute.
  const htmlMockTiming: HtmlMockTiming = { parseMs: 0 };
  const uiuxValidators: Array<() => Promise<Issue[]>> = [
    () => validateDesignToken(root, config),
    () => validateHtmlMock(root, platform, config, htmlMockTiming),
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

  timings.timings = {
    uiuxMs: performance.now() - uiuxStart,
    uiuxBudgetMs: UIUX_VALIDATION_BUDGET_MS,
    htmlMockMs: htmlMockTiming.parseMs,
    htmlMockBudgetMs: config.uiux?.htmlMockTimeout ?? HTML_MOCK_VALIDATION_BUDGET_MS,
  };
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

/**
 * Count findings by severity, skipping suppressed ones. `counts` is the SSOT
 * every gate reads, so anything that rebuilds a `ValidationResult` from an
 * `issues[]` array — including `report --in`, whose input file is untrusted —
 * must recount through here instead of trusting a carried-over number.
 */
export function countIssues(issues: Issue[]): ValidationCounts {
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

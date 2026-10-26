import path from "node:path";
import { readdir } from "node:fs/promises";

import { loadConfig, resolvePath, type ConfigLoadResult } from "./config.js";
import {
  resolveFlowScope,
  flowScopeContainsFile,
  flowScopeContainsId,
  type FlowScope,
} from "./flowScope.js";
import {
  hasLegacySpecPackEntries,
  listLegacySpecPackFiles,
  oldLayoutMessage,
} from "./storyTree/layout.js";
import { readStoryTreeModel, type StoryTreeModel } from "./storyTree/tree.js";
import { validateStoryTreeStructure } from "./validators/storyTreeStructure.js";
import { validateDocumentSchema } from "./validators/documentSchema.js";
import { validateStaleTerms } from "./validators/staleTerms.js";
import { validateForbiddenIdentifiers } from "./validators/forbiddenIdentifiers.js";
import { validateStoryTreeObligations } from "./validators/storyTreeObligations.js";
import { validateStoryTreeContractReferences } from "./validators/contractReferences.js";
import { validateStoryPolicyPlaceholders } from "./validators/assistantAssets.js";
import { validateStoryTreeDrift } from "./validators/upstreamSsotGuard.js";
import { runSaasPackageProfile } from "./saasPackage/profile.js";
import { issue } from "./validators/utils.js";
import type {
  Issue,
  ValidationCounts,
  ValidationProfile,
  ValidationFamilyTiming,
  ValidationResult,
  ValidationTimings,
} from "./types.js";
import {
  compareInstalledToDeclared,
  locateToolAgainstProject,
  readDeclaredQfaiRange,
  resolveToolVersion,
  type InstalledOlderThanDeclared,
} from "./version.js";
import { applyWaivers } from "./waivers.js";
import {
  ASSISTANT_VERSION_FILE,
  assistantVersionRepair,
  compareAssistantVersion,
  describeAssistantVersionMismatch,
  type AssistantVersionMismatch,
} from "./assistantVersion.js";
import { validateContracts, validateUiContractParse } from "./validators/contracts.js";
import { validateUiRenderedCopy } from "./validators/uiRenderedCopy.js";
import { validateUiScreenCopy } from "./validators/uiScreenCopy.js";
import { validateUiScreenEntries } from "./validators/uiScreenEntries.js";
import { validateDesignDirectionProposal } from "./validators/designDirectionProposal.js";
import { validateDesignContractReadiness } from "./validators/designContractReadiness.js";
import { validateDiscussionMermaid } from "./validators/discussMermaid.js";
import { validateAssistantAssets } from "./validators/assistantAssets.js";
import { STEP_DIR_REL, validateStepTree } from "./validators/stepTree.js";
import { inspectIntegrationSurface } from "./validators/integrationSurface.js";
import { validateAssistantAnchorReferences } from "./validators/assistantAnchorReferences.js";
import {
  detectPlatform,
  validateAgentDefinition,
  validateDesignToken,
  validateDiscussionPackReadiness,
  validateDiscussionVisuals,
  validateHtmlMock,
  validateMermaidScreenFlow,
  validateConfigReferenceIntegrity,
  validateResearchSummary,
  validateRepositoryHygiene,
  validateUiDefinitionConsistency,
  validateDesignAudit,
  validateRootDesignMdParse,
  validateRootDesignMdParseOutsideReadiness,
  validatePrototypingSkillContent,
  runCanonicalUixValidators,
  validateTestTodoStubs,
  validateAssistantTreeMigration,
  validateSkillDocReferences,
  detectMockHrefDrift,
  validateAutopilotPolicy,
  runPackageSelfGovernanceValidators,
  stubSourceFilePattern,
} from "./validators/index.js";
import type { TestTodoStubOptions } from "./validators/testTodoStubs.js";
import { atddAcceptanceLayerFilter, atddAcceptanceTestGlobs } from "./atddTraceability.js";
import type { HtmlMockTiming } from "./validators/index.js";
import { readSafe } from "./validators/utils.js";
import { isEnoent } from "./fs/errno.js";

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
type TimingsSink = { timings?: ValidationTimings; sequential: CheckClock; overlapping: CheckClock };

/**
 * What each check took, keyed by the check, with the code families of the issues it returned.
 * Measured on every run and reported only when `--timings` asks: a clock costs one
 * `performance.now()` pair per check, so it stays unconditional rather than threading the option
 * through every runner.
 */
type CheckClock = Map<string, { ms: number; families: Set<string> }>;

function newTimingsSink(): TimingsSink {
  return { sequential: new Map(), overlapping: new Map() };
}

/** The family a finding code belongs to, as users read it: `QFAI-CFG-LINK-002` is `CFG-LINK`. */
function familyOfCode(code: string): string {
  return code.replace(/^QFAI-/, "").replace(/-\d+$/, "");
}

function recordCheck(clock: CheckClock, check: string, ms: number, issues: readonly Issue[]): void {
  const entry = clock.get(check) ?? { ms: 0, families: new Set<string>() };
  entry.ms += ms;
  for (const found of issues) entry.families.add(familyOfCode(found.code));
  clock.set(check, entry);
}

/**
 * Runs one check and adds its wall-clock time to `check`. Wrap a check, never a group of
 * checks, so no time is counted twice.
 */
async function timedResult<T>(
  sink: TimingsSink,
  check: string,
  run: () => Promise<T>,
  issuesOf: (result: T) => readonly Issue[],
): Promise<T> {
  const start = performance.now();
  const result = await run();
  recordCheck(sink.sequential, check, performance.now() - start, issuesOf(result));
  return result;
}

/** `timedResult` for a check that returns its issues. */
async function timed(
  sink: TimingsSink,
  check: string,
  run: () => Promise<Issue[]>,
): Promise<Issue[]> {
  return timedResult(sink, check, run, (found) => found);
}

/**
 * The checks of a clock under the label a user can read, summed per label, slowest first and ties
 * in name order. The label is the code families of the issues the check returned, sorted and
 * joined with `/`, so it cannot disagree with the findings; a check that returned none keeps its
 * own name.
 */
export function labelCheckTimings(
  clock: ReadonlyMap<string, { ms: number; families: ReadonlySet<string> }>,
): ValidationFamilyTiming[] {
  const byLabel = new Map<string, number>();
  for (const [check, entry] of clock) {
    const label = entry.families.size > 0 ? [...entry.families].sort().join("/") : check;
    byLabel.set(label, (byLabel.get(label) ?? 0) + entry.ms);
  }
  return [...byLabel]
    .map(([family, ms]) => ({ family, ms }))
    .sort((left, right) => right.ms - left.ms || left.family.localeCompare(right.family));
}

export type ValidationOptions = {
  profile?: ValidationProfile;
  platform?: string;
  flowIds?: readonly string[];
  /** A rendered-text file the caller wrote (`--rendered`), compared with the UI contracts in every profile. */
  renderedPath?: string;
  /** Add the time of each finding family to the result (`--timings`). */
  familyTimings?: boolean;
};

export async function validateProject(
  root: string,
  configResult?: ConfigLoadResult,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  const resolved = configResult ?? (await loadConfig(root));
  const { config, issues: configIssues } = resolved;
  const profile: ValidationProfile = options.profile ?? "full";
  // A property of the invocation, raised around the validator run so that every
  // profile and the old-layout early return carry it, ahead of the config and
  // validator findings in the report.
  const olderThanDeclared = await detectInstalledOlderThanDeclared(root);
  const assistantMismatch = await compareAssistantVersion(root, await resolveToolVersion());
  const versionIssues = [
    ...buildInstalledOlderIssues(olderThanDeclared),
    ...buildAssistantVersionIssues(assistantMismatch),
  ];
  const timingsSink = newTimingsSink();
  const forbiddenIdentifiers = config.validation.forbiddenIdentifiers ?? [];
  const securityIssues =
    forbiddenIdentifiers.length > 0
      ? await timed(timingsSink, "forbidden-identifiers", () =>
          validateForbiddenIdentifiers(root, forbiddenIdentifiers),
        )
      : [];

  const specsRoot = resolvePath(root, config, "specsDir");
  let oldLayoutRoot: string | undefined;
  const oldLayoutFiles: string[] = [];
  for (const candidate of new Set([specsRoot, path.join(root, ".qfai", "specs")])) {
    let entries: string[] = [];
    try {
      entries = await readdir(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (hasLegacySpecPackEntries(entries)) {
      oldLayoutRoot ??= candidate;
      oldLayoutFiles.push(...(await listLegacySpecPackFiles(root, candidate, entries)));
    }
  }
  if (oldLayoutRoot) {
    const layoutIssue = issue(
      "QFAI-LAYOUT-001",
      oldLayoutMessage(oldLayoutRoot, oldLayoutFiles),
      "error",
      oldLayoutRoot,
      "storyTree.oldLayout",
    );
    const layoutIssues = [...versionIssues, layoutIssue, ...securityIssues];
    return {
      toolVersion: await resolveToolVersion(),
      generatedAt: new Date().toISOString(),
      profile,
      profileValidatorsRan: false,
      issues: layoutIssues,
      counts: countIssues(layoutIssues),
    };
  }
  const storyModel = await timedResult(
    timingsSink,
    "story-tree-read",
    () => readStoryTreeModel(root, config),
    () => [],
  );
  const flowScope = options.flowIds ? resolveFlowScope(options.flowIds, storyModel) : undefined;
  const scopeIssues =
    flowScope?.invalidValues.map((value) =>
      issue(
        "QFAI-FLOW-005",
        `Unusable --flow value: ${value}`,
        "error",
        specsRoot,
        "flowScope.value",
        [value],
      ),
    ) ?? [];

  const renderedPath = options.renderedPath;
  const renderedIssues = renderedPath
    ? await timed(timingsSink, "ui-rendered-copy", () =>
        validateUiRenderedCopy(root, config, renderedPath),
      )
    : [];

  const profileRun = await runProfileValidators(
    root,
    config,
    profile,
    timingsSink,
    options.platform,
    storyModel,
  );
  const findings = explainVersionMismatch(
    [
      ...versionIssues,
      ...configIssues,
      ...securityIssues,
      ...scopeIssues,
      ...renderedIssues,
      ...profileRun.issues,
    ],
    versionDifferenceNotes(olderThanDeclared, assistantMismatch),
  );
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
    ...(options.familyTimings
      ? {
          familyTimings: {
            sequential: labelCheckTimings(timingsSink.sequential),
            overlapping: labelCheckTimings(timingsSink.overlapping),
          },
        }
      : {}),
  };
}

function isFindingInFlowScope(finding: Issue, scope: FlowScope | undefined): boolean {
  if (!scope || finding.code === "QFAI-FLOW-005") return true;
  if (
    !finding.code.startsWith("QFAI-STORY-") &&
    finding.code !== "QFAI-CONTRACT-034" &&
    finding.code !== "QFAI-DOCSCHEMA-001"
  ) {
    return true;
  }
  if (finding.refs?.some((ref) => flowScopeContainsId(scope, ref))) return true;
  return finding.file ? flowScopeContainsFile(scope, finding.file) : false;
}

/**
 * The parts of the assistant tree a profile's own validators open.
 *
 * A profile allowlist was not enough: `sdd` runs `validateSkillDocReferences`
 * and `validateAutopilotPolicy`, both of which
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
    // `validateAssistantAssets` walks the
    // **skills** directory the configuration names — the same one `sdd` walks,
    // and nothing wider. Returning its parent matched a sibling's damage too:
    // a regular file at `.qfai/assistant/agent` stopped `full` on a tree that
    // validator never opens, while `validateAgentDefinition` turns a missing
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
      return [skillsRelative, STEP_DIR_REL, AGENTS_RELATIVE];
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
        `This project declares qfai as a dependency, but the copy that is running is a ` +
          `different one at ${located.packageDir}. It was resolved from outside the ` +
          `directory the declaration points to, so this project's lockfile does not decide ` +
          `which version gated the run. The copy is either the qfai of another checkout ` +
          `(another branch or lockfile) or a qfai@latest that npx fetched silently. Another ` +
          `checkout's copy is reached through a parent directory's node_modules, or through ` +
          `a node_modules that is a link to that checkout's.`,
        severity,
        undefined,
        "toolProvenance.resolvedAgainstDeclaration",
        [located.packageDir],
        "canonical",
        "If this working tree's node_modules is a link to another checkout's, remove the " +
          "link itself, not what it points to. Then run `npm ci` / `pnpm install` in this " +
          "working tree and run again. " +
          "If a global install is intended, remove the qfai dependency declaration from " +
          "this project — a declaration that disagrees with the running copy is the " +
          "state this finding reports.",
      ),
    ];
  }
  return [
    issue(
      "QFAI-TOOL-001",
      `The running qfai (${located.packageDir}) was resolved from outside the project root ` +
        `being validated (${root}). No qfai dependency declaration of this project was ` +
        `answered by another copy, so the copy was reached in a way the project allows: ` +
        `a parent directory's node_modules, a global install or an npx fetch. A mismatch ` +
        `between the declaration and the running copy is reported separately as ` +
        `QFAI-TOOL-002.`,
      "info",
      undefined,
      "toolProvenance.resolvedOutsideProject",
      [located.packageDir],
      "canonical",
      "If this resolution is intended, ignore this finding. Otherwise, if this working " +
        "tree's node_modules is a link to another checkout's, remove the link itself, not " +
        "what it points to. Then run `npm ci` / `pnpm install` in this working tree and " +
        "run again.",
    ),
  ];
}

/**
 * The running qfai is older than the version this project declares.
 *
 * The project's dependency declaration is one record of which qfai the tree
 * was written for; `.qfai/assistant/VERSION` is the other, read by
 * {@link buildAssistantVersionIssues}. An
 * installed copy below the lowest version that declaration admits is what a
 * lockfile that moved after the last install leaves, and a rule that reads a
 * generated file then reports the file as wrong when the checker is. This is
 * said once, first in the report, so the line to act on is not one of
 * thirteen file-level errors that point at the wrong repair.
 *
 * `warning`, not `error`: the declaration and the running copy disagree, which
 * says nothing certain about the tree, and an `error` would fail a project
 * whose generated files are fine with no waiver available.
 */
async function detectInstalledOlderThanDeclared(
  root: string,
): Promise<InstalledOlderThanDeclared | null> {
  return compareInstalledToDeclared(await resolveToolVersion(), await readDeclaredQfaiRange(root));
}

function buildInstalledOlderIssues(older: InstalledOlderThanDeclared | null): Issue[] {
  if (older === null) return [];
  return [
    issue(
      "QFAI-TOOL-003",
      `The installed qfai is ${older.installed}, older than the ${older.declaredLowest} this project ` +
        `declares (${older.declaredRange}). Files written by the declared version can read as ` +
        `wrong to this older one; a finding below about a generated file may come from the ` +
        `version difference and not from the file.`,
      "warning",
      undefined,
      "toolProvenance.installedOlderThanDeclared",
      undefined,
      "canonical",
      "Run the install command (`npm ci` / `pnpm install`) in this working tree so the " +
        "installed qfai satisfies the declaration, then run again. Do not edit generated " +
        "files to clear a finding before that.",
    ),
  ];
}

/**
 * The running qfai is not the version recorded in `.qfai/assistant/VERSION`.
 *
 * Said once, first, for the reason {@link buildInstalledOlderIssues} is: a rule
 * that reads a generated file reports the file as wrong when the checker and
 * the tree come from different releases. `warning`, and the run continues, so
 * the findings that are real stay visible. A tree with no version file gets the
 * same one finding and no other treatment.
 */
function buildAssistantVersionIssues(mismatch: AssistantVersionMismatch | null): Issue[] {
  if (mismatch === null) return [];
  return [
    issue(
      "QFAI-TOOL-004",
      `${describeAssistantVersionMismatch(mismatch)} A finding below about a generated file ` +
        `may come from the version difference and not from the file.`,
      "warning",
      ASSISTANT_VERSION_FILE,
      "toolProvenance.assistantVersion",
      undefined,
      "canonical",
      assistantVersionRepair(mismatch),
    ),
  ];
}

/** What a generated-file finding gains from one version difference. */
type VersionDifferenceNote = { readonly note: string; readonly action: string };

function versionDifferenceNotes(
  older: InstalledOlderThanDeclared | null,
  assistant: AssistantVersionMismatch | null,
): VersionDifferenceNote[] {
  const notes: VersionDifferenceNote[] = [];
  if (older !== null) {
    notes.push({
      note:
        `The installed qfai ${older.installed} is older than the ` +
        `${older.declaredLowest} this project declares, so this may be a version ` +
        `difference and not a fault in the file (QFAI-TOOL-003).`,
      action:
        "Run the install command (`npm ci` / `pnpm install`) so the installed qfai " +
        `satisfies ${older.declaredRange}, and run again before editing this file.`,
    });
  }
  if (assistant !== null) {
    notes.push({
      note:
        `${describeAssistantVersionMismatch(assistant)} This may be a version difference ` +
        `and not a fault in the file (QFAI-TOOL-004).`,
      action: assistantVersionRepair(assistant),
    });
  }
  return notes;
}

/**
 * Rules whose input is a file `qfai init` generated. Under a version
 * difference each is reported as the difference it may be, with its repair,
 * instead of as a fault in the file that invites an edit to files nobody
 * touched.
 */
const GENERATED_FILE_RULES: ReadonlySet<string> = new Set(["QFAI-SKILLS-010"]);

function explainVersionMismatch(issues: Issue[], notes: readonly VersionDifferenceNote[]): Issue[] {
  if (notes.length === 0) return issues;
  return issues.map((entry) =>
    GENERATED_FILE_RULES.has(entry.code)
      ? {
          ...entry,
          message: [entry.message, ...notes.map((item) => item.note)].join(" "),
          suggested_action: notes.map((item) => item.action).join(" "),
        }
      : entry,
  );
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
      `--platform (${platformOption}) is not used by profile "${profile}".`,
      severity,
      undefined,
      "platformDetection.unusedPlatformOption",
      [platformOption],
      "canonical",
      "If you need platform-dependent validation, pass --profile prototyping / verify / full / saas-package. Otherwise remove --platform.",
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
): Promise<ProfileValidatorRun> {
  // Runs in every profile, ahead of the profile's own validators. A broken
  // integration link means the assistant loaded no skill and routed no agent,
  // so every gate the profile is about was defined by files nothing read. That
  // is not an SDD fact or an ATDD fact; it invalidates the run.
  const surface = await timedResult(
    timings,
    "integration-surface",
    () => inspectIntegrationSurface(root),
    (inspected) => inspected.issues,
  );
  // A CLI-boundary observation, independent of the tree below: it survives the
  // short-circuit so the operator still learns the flag went nowhere.
  const unusedPlatform = buildUnusedPlatformIssues(profile, platformOption);
  // Same standing as `unusedPlatform`: a property of the run rather than of the
  // tree, so it survives the short-circuit below. It is also the finding most
  // worth keeping when the tree turns out to be damaged — a validate run
  // against another checkout's qfai explains a whole class of confusing damage.
  const toolProvenance = await timed(timings, "tool-provenance", () =>
    buildToolProvenanceIssues(root),
  );
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
  const anchorIssues = await timed(timings, "assistant-anchors", () =>
    validateAssistantAnchorReferences(root, config),
  );
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
    return runStoryProfileValidators(root, config, profile, storyModel, timings, platformOption);
  }
}

async function runStoryProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  profile: ValidationProfile,
  model: StoryTreeModel,
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  // `standalone` is false in `verify` and `full`. They leave out the policy
  // placeholders, and leave the root DESIGN.md readiness gate to the prototyping
  // group, which runs it in the same profile.
  const sdd = async (standalone = true): Promise<Issue[]> => [
    ...(await timed(timings, "story-structure", () =>
      validateStoryTreeStructure(root, config, model),
    )),
    ...(await timed(timings, "document-schema", () => validateDocumentSchema(root, config))),
    ...(await timed(timings, "stale-terms", () => validateStaleTerms(root, config))),
    ...(await timed(timings, "story-contract-index", () =>
      validateStoryTreeContractReferences(root, config, model),
    )),
    ...(standalone
      ? await timed(timings, "policy-placeholders", () =>
          validateStoryPolicyPlaceholders(root, config),
        )
      : []),
    ...(await timed(timings, "contracts", () => validateContracts(root, config))),
    ...(standalone
      ? await timed(timings, "design-contract-readiness", () =>
          validateDesignContractReadiness(root, config),
        )
      : []),
    ...(await timed(timings, "assistant-tree-migration", () =>
      validateAssistantTreeMigration(root, config),
    )),
    ...(await timed(timings, "skill-doc-references", () =>
      validateSkillDocReferences(root, config),
    )),
    ...(await timed(timings, "autopilot-policy", () => validateAutopilotPolicy(root, { config }))),
    ...(await timed(timings, "package-self-governance", () =>
      runPackageSelfGovernanceValidators(root),
    )),
  ];
  const atdd = async (): Promise<Issue[]> => [
    ...(await timed(timings, "story-test-obligations", () =>
      validateStoryTreeObligations(root, config, "atdd", model),
    )),
    ...(await timed(timings, "test-stubs", () =>
      validateTestTodoStubs(root, config, acceptanceStubScan(root, config)),
    )),
  ];
  const tdd = async (includeContracts = true, includeDrift = true): Promise<Issue[]> => [
    ...(await timed(timings, "story-test-obligations", () =>
      validateStoryTreeObligations(root, config, "tdd", model),
    )),
    ...(includeDrift
      ? await timed(timings, "drift", () => validateStoryTreeDrift(root, config, "tdd"))
      : []),
    ...(await timed(timings, "test-stubs", () => validateTestTodoStubs(root, config))),
    ...(includeContracts
      ? await timed(timings, "contracts", () => validateContracts(root, config))
      : []),
  ];
  switch (profile) {
    case "sdd":
      return sdd();
    case "atdd":
      return atdd();
    case "tdd":
      return tdd();
    case "drift":
      return timed(timings, "drift", () => validateStoryTreeDrift(root, config, "drift"));
    case "verify":
    case "full":
      return dedupeStubFindings(
        dedupeStoryFindings([
          ...(await timed(timings, "hygiene", () => validateRepositoryHygiene(root, config))),
          ...(await timed(timings, "step-tree", () => validateStepTree(root, config))),
          ...(await timed(timings, "assistant-assets", () =>
            validateAssistantAssets(root, config),
          )),
          // The prototyping group below runs the research summary, the
          // canonical UIX checks and the root DESIGN.md readiness gate, so the
          // discussion and sdd sets leave them to it.
          ...(await runDiscussionValidators(root, config, timings, false)),
          ...(await sdd(false)),
          ...(await runPrototypingValidators(root, config, timings, platformOption)),
          ...(await atdd()),
          ...(await tdd(false, false)),
          ...(await timed(timings, "prototyping-skill", () =>
            validatePrototypingSkill(root, config),
          )),
        ]),
      );
    case "discussion":
      return runDiscussionValidators(root, config, timings);
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
  return timed(timings, "saas-package-profile", () =>
    runSaasPackageProfile(root, prototypingIssues),
  );
}

/**
 * The discussion issue set. `includeSharedWithUiux` is false where the
 * prototyping group runs in the same profile: that group also runs the
 * research summary, the canonical UIX checks and the root DESIGN.md readiness
 * gate, and running them here too reported each of their findings twice.
 */
async function runDiscussionValidators(
  root: string,
  config: ConfigLoadResult["config"],
  timings: TimingsSink,
  includeSharedWithUiux = true,
): Promise<Issue[]> {
  return [
    // A project reaching this profile may already carry a root DESIGN.md —
    // from `npx qfai init`, from a hand-edit, or from an earlier pass of the
    // pipeline — and this is the earliest gate that can see whether it parses.
    // Catching it here means a malformed file surfaces before `/qfai-sdd`
    // builds on it. Only the parse half — the UI-contract checks belong to
    // later stages.
    ...(includeSharedWithUiux
      ? await timed(timings, "root-design-md-parse", () => validateRootDesignMdParse(root))
      : await timed(timings, "root-design-md-parse", () =>
          validateRootDesignMdParseOutsideReadiness(root, config),
        )),
    ...(await timed(timings, "discussion-mermaid", () => validateDiscussionMermaid(root))),
    ...(await timed(timings, "design-direction-proposal", () =>
      validateDesignDirectionProposal(root, config),
    )),
    ...(await timed(timings, "discussion-pack", () =>
      validateDiscussionPackReadiness(root, config),
    )),
    ...(await timed(timings, "discussion-visuals", () => validateDiscussionVisuals(root))),
    ...(includeSharedWithUiux
      ? await timed(timings, "research-summary", () => validateResearchSummary(root, config))
      : []),
    ...(includeSharedWithUiux
      ? await timed(timings, "canonical-uix", () => runCanonicalUixValidators(root, config))
      : []),
  ];
}

/** The prototyping issue set: the UI contracts, the mocks and root `DESIGN.md`. */
async function runPrototypingValidators(
  root: string,
  config: ConfigLoadResult["config"],
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await runUiuxValidators(root, config, timings, platformOption)),
    ...(await timed(timings, "mock-href", () => detectMockHrefDrift(root))),
    ...(await timed(timings, "design-contract-readiness", () =>
      validateDesignContractReadiness(root, config),
    )),
    ...(await timed(timings, "config-reference-integrity", () =>
      validateConfigReferenceIntegrity(root, config),
    )),
  ];
}

/**
 * The prototyping issue set as the `prototyping` (and `saas-package`) profile
 * reports it.
 */
async function runPrototypingProfileValidators(
  root: string,
  config: ConfigLoadResult["config"],
  timings: TimingsSink,
  platformOption?: string,
): Promise<Issue[]> {
  return [
    ...(await runPrototypingValidators(root, config, timings, platformOption)),
    // An entry no screen is read from is reported here too, and so is a UI
    // contract that does not parse. Kept out of `runPrototypingValidators`:
    // `full` also runs `validateContracts`, which reports both already.
    ...(await timed(timings, "ui-screen-entries", () => validateUiScreenEntries(root, config))),
    ...(await timed(timings, "ui-screen-copy", () => validateUiScreenCopy(root, config))),
    ...(await timed(timings, "contract-parse", () => validateUiContractParse(root, config))),
  ];
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

/**
 * The parts of the UI/UX group, slowest first. The html-mock part leaves out the one-off load of
 * its parser, as the group's own time does.
 */
export function orderUiuxParts(
  parts: readonly { name: string; ms: number }[],
  htmlMockLoadMs: number,
): { name: string; ms: number }[] {
  return parts
    .map((part) => (part.name === "html mock" ? { ...part, ms: part.ms - htmlMockLoadMs } : part))
    .sort((left, right) => right.ms - left.ms);
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
  //
  // The group's own clock leaves that load out too, for the same reason: it is
  // paid once per process, and on a cold disk cache it alone outran the whole
  // group's budget.
  const htmlMockTiming: HtmlMockTiming = { parseMs: 0, loadMs: 0 };
  const uiuxValidators: Array<[name: string, run: () => Promise<Issue[]>]> = [
    ["design tokens", () => validateDesignToken(root, config)],
    ["html mock", () => validateHtmlMock(root, platform, config, htmlMockTiming)],
    ["mermaid screen flow", () => validateMermaidScreenFlow(root, config)],
    ["UI definition consistency", () => validateUiDefinitionConsistency(root, config)],
    ["research summary", () => validateResearchSummary(root, config)],
    ["agent definition", () => validateAgentDefinition(root)],
    ["design audit", () => validateDesignAudit(root, config)],
    ["canonical UIX", () => runCanonicalUixValidators(root, config)],
  ];
  const uiuxParts: { name: string; ms: number }[] = [];
  const partIssues = new Map<string, Issue[]>();
  const uiuxIssueGroups = await Promise.all(
    uiuxValidators.map(async ([name, run]) => {
      const start = performance.now();
      const found = await run();
      uiuxParts.push({ name, ms: performance.now() - start });
      partIssues.set(name, found);
      return found;
    }),
  );
  const uiuxIssues: Issue[] = [...platformResult.issues, ...uiuxIssueGroups.flat()];

  // The html-mock part leaves out the one-off load of its parser, as `uiuxMs` does.
  const orderedParts = orderUiuxParts(uiuxParts, htmlMockTiming.loadMs);
  for (const part of orderedParts) {
    recordCheck(timings.overlapping, part.name, part.ms, partIssues.get(part.name) ?? []);
  }
  // The group as one entry of the checks that ran one after another, so that list sums close to
  // the run. Its whole wall clock, the parser load included, because the run paid for it.
  recordCheck(timings.sequential, "uiux", performance.now() - uiuxStart, []);
  timings.timings = {
    uiuxMs: performance.now() - uiuxStart - htmlMockTiming.loadMs,
    uiuxBudgetMs: UIUX_VALIDATION_BUDGET_MS,
    htmlMockMs: htmlMockTiming.parseMs,
    htmlMockBudgetMs: config.uiux?.htmlMockTimeout ?? HTML_MOCK_VALIDATION_BUDGET_MS,
    uiuxParts: orderedParts,
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
  if (prototypingSkillContent.length === 0) {
    return [];
  }
  const stepBodies = await readPrototypingStepBodies(root);
  return validatePrototypingSkillContent([prototypingSkillContent, ...stepBodies].join("\n"))
    .issues;
}

/**
 * The bodies of the `prototyping-*` steps, in name order. The skill's procedure
 * lives in its steps, so the content checks read the parent and its steps as
 * one document. A missing step directory yields no bodies, and the checks then
 * report what the parent alone lacks.
 */
async function readPrototypingStepBodies(root: string): Promise<string[]> {
  const stepDir = path.join(root, ".qfai", "assistant", "step");
  let names: string[];
  try {
    names = await readdir(stepDir);
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
  const stepNames = names.filter((name) => name.startsWith("prototyping-")).sort();
  return Promise.all(stepNames.map((name) => readSafe(path.join(stepDir, name, "STEP.md"))));
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

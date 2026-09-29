import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { BigIntStats, Dirent, Stats } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  link,
  open,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import type { FileHandle, symlink } from "node:fs/promises";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

import { copyTemplatePaths, copyTemplateTree } from "../../core/fs/templateCopy.js";
import {
  ADOPTER_OWNED_ASSETS,
  ASSISTANT_ASSETS_LOCK_BASENAME,
  ASSISTANT_STAGING_PREFIX,
  GOVERNED_ASSISTANT_LAYERS,
  aliasesShippedGovernedAsset,
  buildShippedAssistantHashes,
  hasRealGovernedAssistantParents,
  hashAssistantAssetFile,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../core/assistantAssetProvenance.js";
import { getInitAssetsDir } from "../lib/assets.js";
import { error, info, warn } from "../../core/logger.js";
import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { toRelativePath } from "../../core/paths.js";
import { loadConfig, readWorkflowMode, resolvePath } from "../../core/config.js";
import { CONTRACT_KIND_DIRS, hasLegacySpecPackEntries } from "../../core/storyTree/layout.js";
import { deriveTestFileGlobs, withDerivedTestFileGlobs } from "../../core/testGlobDerivation.js";
import {
  CODEX_AGENT_WRAPPER_DIR,
  CODEX_AGENT_WRAPPER_SUFFIX,
  isGeneratedCodexAgentToml,
  parseAgentCardKind,
  renderCodexAgentToml,
} from "../../core/codexAgentToml.js";
import { detectProjectLanguages, fillLanguageRules } from "../../core/instructionLanguageRules.js";
import {
  AGENT_ENTRY_POINT_FILES,
  QFAI_AGENT_RULES_END,
  addRuleCitations,
  addRuleCitationsToList,
  addEntryDirective,
  addEntryPointDirectives,
  addReviewPointer,
  citedRuleMasters,
  citedRuleMastersOutsideCode,
  hasUnclosedRulesSection,
  extractManagedRulesSection,
  keepSummariesOfKeptMasters,
  needsManagedRulesSection,
  newlyWrittenRuleMasters,
  refreshSupersededRuleBullets,
  refreshSupersededRuleBulletsInList,
} from "../../core/agentEntryPoints.js";
import {
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
  mergeDocumentationClarityHooks,
  serializeClaudeSettings,
} from "../../core/claudeCodeHooks.js";
import {
  ASSISTANT_DIR,
  joinAssistantLayer,
  joinAssistantReadme,
  joinLegacyAssistantInstructions,
  joinLegacyAssistantSteering,
  legacyAssistantSteeringSunsetLabel,
} from "../../core/paths/assistantPaths.js";
import type { RuleMasterPlan } from "../../core/ruleMasterUpdates.js";
import {
  deletedRuleMasters,
  planRuleMasterUpdates,
  readRuleLock,
  RULE_LOCK_BASENAME,
  writeRuleLock,
} from "../../core/ruleMasterUpdates.js";
import {
  type PendingCitations,
  readPendingCitations,
  writePendingCitations,
} from "../../core/pendingRuleCitations.js";
import { resolveToolVersion } from "../../core/version.js";
import {
  RETIRED_WORKFLOW_NAMES,
  SHIPPED_WORKFLOW_NAMES,
} from "../../shared/shippedWorkflowNames.js";
import { readBoundedRegularFile } from "../../shared/boundedRead.js";
import {
  createWorkflowProvenanceEntry,
  readInstallProvenance,
  updateInstallProvenance,
  type InstallProvenanceRecord,
  type WorkflowProvenanceEntry,
} from "../../shared/provenance.js";
import {
  refuseUnsafeEntryPointRewrite,
  replaceEntryPointFile,
} from "../../core/init/entryDirective.js";
import {
  SIDECAR_RE,
  claimSidecar,
  isFlattenedLink,
  restoreSidecar,
  toComparableTarget,
} from "../../core/init/flattenedLink.js";
import {
  describeError,
  exists,
  firstLinkedComponent,
  readPinnedRegularFile,
  readPinnedRegularFileBytes,
  readTextFileIfPresent,
  safeLstat,
} from "../../core/init/fsGuards.js";
import type { PinnedFileRead } from "../../core/init/fsGuards.js";
import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_ARCHIVE_DIR,
  SKILL_INTEGRATION_DIRS,
  collectCanonicalAgentNames,
  collectCanonicalSkillIds,
} from "../../core/init/integrationDirs.js";
import { ensureSymlink } from "../../core/init/managedLink.js";
import type { WrapperSyncOptions } from "../../core/init/managedLink.js";
import { formatReportPath } from "../../core/init/reportPath.js";
import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js";

const execAsync = promisify(execCb);

/**
 * Shipped skill, step and agent files are the assistant assets refreshed by `--force`.
 * Steps are copied like skills and never linked into a host's skill directory: a host
 * would offer each one as a skill of its own.
 */
const STANDARD_ASSET_PATHS: readonly string[] = [
  "assistant/skill",
  "assistant/step",
  "assistant/agent",
];

/** Older receipts can name adopter-owned catalog files needed by story migration. */
const LEGACY_ADOPTER_OWNED_CATALOG_ASSETS: ReadonlySet<string> = new Set([
  "catalog/product.md",
  "catalog/manifest.md",
  "catalog/tech.md",
  "catalog/structure.md",
]);

const STORY_SEED_PATHS = [
  "decisions.md",
  "open-questions.md",
  "01_policy/objective.md",
  "01_policy/initiative.md",
  "01_policy/principle.md",
  "01_policy/glossary.md",
  "01_policy/constraint.md",
  "02_business-flow/business-flows.md",
  "03_contract/contracts.md",
  "03_contract/tech.md",
] as const;

async function legacySpecLayoutPath(root: string): Promise<string | undefined> {
  const { config } = await loadConfig(root);
  const configuredSpecsDir = resolvePath(root, config, "specsDir");
  const candidateDirs = [configuredSpecsDir, path.join(root, ".qfai", "specs")];
  for (const dir of new Set(candidateDirs)) {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (cause) {
      if (isEnoent(cause)) continue;
      throw cause;
    }
    const legacyName = entries
      .filter((entry) => entry.isDirectory() && hasLegacySpecPackEntries([entry.name]))
      .map((entry) => entry.name)
      .sort()[0];
    if (legacyName) return path.join(dir, legacyName);
  }
  const legacyContracts = path.join(root, ".qfai", "contracts");
  return (await exists(legacyContracts)) ? legacyContracts : undefined;
}

async function seedStoryTree(root: string, assetsRoot: string, dryRun: boolean) {
  const source = path.join(assetsRoot, "assistant", "skill", "qfai-sdd", "templates", "spec");
  const destination = path.join(root, ".qfai", "spec");
  for (const relative of STORY_SEED_PATHS) {
    const sourceFile = path.join(source, relative);
    if (!(await stat(sourceFile)).isFile()) {
      throw new Error(`Story-tree seed is not a file: ${sourceFile}`);
    }
  }
  const seedTargets = [
    ...STORY_SEED_PATHS.map((relative) => path.join(destination, relative)),
    ...CONTRACT_KIND_DIRS.map((kind) => path.join(destination, "03_contract", kind)),
  ];
  for (const target of seedTargets) {
    const linked = await firstLinkedComponent(target, root);
    if (linked !== null) {
      throw new Error(
        `qfai init refused to seed the story tree through a symlink: ${formatReportPath(linked)}`,
      );
    }
  }
  const copied = await copyTemplatePaths(source, destination, [...STORY_SEED_PATHS], {
    force: false,
    dryRun,
    conflictPolicy: "skip",
  });
  if (!dryRun) {
    await Promise.all(
      CONTRACT_KIND_DIRS.map((kind) =>
        mkdir(path.join(destination, "03_contract", kind), { recursive: true }),
      ),
    );
  }
  return copied;
}

export type InitOptions = {
  dir: string;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
  upgradeAssistantTree?: boolean;
  /**
   * `--verbose`: expand the `skipped` list in the run report. Off by default —
   * a no-op re-run skips every shipped asset, and that list is the "nothing to
   * do here" case, so the report names its count and points at this flag
   * instead of printing several hundred paths.
   */
  verbose?: boolean;
  /**
   * Overrides the running tool version.
   *
   * It reaches the install-provenance record. Tests set it so an assertion can name a version
   * rather than whatever the shipped `package.json` happens to carry.
   */
  toolVersionOverride?: string;
};

type InitSymlinkRuntime = {
  createSymlink?: typeof symlink;
  platform?: NodeJS.Platform;
};

/**
 * Refuses a run whose destination assistant tree resolves into the assets this
 * command copies from.
 *
 * `init` writes `.qfai/assistant/**` from `assets/init/.qfai/assistant/**`. A
 * repository that vendors the tree by link has the destination resolving to the
 * source, so the write lands in the package's own assets — an edit to the
 * shipped documents, made by the command whose job is to install a copy of
 * them, and indistinguishable afterwards from an ordinary asset change.
 *
 * Detected by resolution rather than by a path or a name, so it holds wherever
 * the repository is checked out. An ordinary project resolves nowhere near the
 * installed package and is unaffected; the check fails open when either side
 * cannot be resolved, for the same reason the dependency guard does — a guard
 * that mistakes a normal project for this one breaks the product.
 */
async function refuseWritingThroughToOwnAssets(
  destRoot: string,
  assistantAssets: string,
): Promise<void> {
  const resolve = async (target: string): Promise<string | null> => {
    try {
      return await realpath(target);
    } catch {
      return null;
    }
  };
  const [destAssistant, sourceAssistant] = await Promise.all([
    resolve(path.join(destRoot, ASSISTANT_DIR)),
    resolve(assistantAssets),
  ]);
  if (destAssistant === null || sourceAssistant === null) return;
  const relative = path.relative(sourceAssistant, destAssistant);
  const inside = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  if (!inside) return;
  throw new Error(
    [
      `qfai init: ${formatReportPath(path.join(destRoot, ASSISTANT_DIR))} resolves to ${formatReportPath(destAssistant)},`,
      "which is inside the assets this command copies from. Writing there would edit the",
      "package's own shipped documents rather than install a copy of them.",
      "",
      "This is the repository that builds the package, with its assistant tree vendored by",
      "link. Edit the assets directly — they are the file the link points at.",
    ].join("\n"),
  );
}

export async function runInit(
  options: InitOptions,
  symlinkRuntime: InitSymlinkRuntime = {},
): Promise<void> {
  const toolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  const assetsRoot = getInitAssetsDir();
  const rootAssets = path.join(assetsRoot, "root");
  const qfaiAssets = path.join(assetsRoot, ".qfai");
  const assistantAssets = path.join(qfaiAssets, "assistant");

  const destRoot = path.resolve(options.dir);
  const destQfai = path.join(destRoot, ".qfai");

  // Disclose the destination before any work starts. The default for `--dir`
  // is the cwd, so a bare `qfai init` leaves the destination implicit and a run
  // from the wrong terminal tab prints the same as a correct one. Printing it
  // ahead of the report keeps the target in the scrollback even when the run
  // is interrupted or fails.
  info(`qfai init: dest=${formatReportPath(destRoot)}`);

  await refuseWritingThroughToOwnAssets(destRoot, assistantAssets);
  const oldSpecLayout = await legacySpecLayoutPath(destRoot);

  if (options.force) {
    info(
      "NOTE: --force regenerates .qfai/assistant/skill/**, assistant/step/**, assistant/agent/** and the symlink assets (.agents/.claude/.github/.codex), and removes legacy wrappers. It also regenerates qfai-provided .github/copilot-instructions.md and .github/instructions/**. assistant/rule/** is refreshed only where the file still matches its .assets.lock.json record; diverged files are left for manual merge. Project specs, contracts and routing overrides in qfai.config.yaml are preserved.",
    );
  }

  if (!options.dryRun) {
    await preflightGovernedCreation(assistantAssets, rootAssets, destRoot, options.force);
  }

  // Relocate known legacy files before shipped assets fill their destinations.
  // The subsequent copy skips edited files, preserving the relocated content.
  const upgradeResult = options.upgradeAssistantTree
    ? await runUpgradeAssistantTree(destRoot, options.dryRun)
    : { copied: [], skipped: [], removed: [], preservedNotes: [] as string[] };

  // Snapshot the shipped-workflow provenance state BEFORE the copy: the
  // record decision keys off the pre-run state (an existing entry is never
  // restamped — a declined name keeps its entry as-is), not off what the
  // copy ends up writing.
  const workflowPreInit = await captureShippedWorkflowPreInitState(destRoot);

  // Declined names are excluded from the copy set BEFORE the copy runs:
  // the file is absent on disk, so the create-only predicate ("write when
  // absent") is exactly what would recreate it. Only pre-copy exclusion
  // holds the declined row of the state table.
  const workflowCopySet = resolveWorkflowCopySet(
    SHIPPED_WORKFLOW_NAMES,
    workflowPreInit.record,
    workflowPreInit.presentOnDisk,
  );
  // …and every shipped name is excluded outright when the directory they would land in is
  // not one this tree owns. `copyFile` — `COPYFILE_EXCL` included —
  // follows a symlinked PARENT, so an adopter whose `.github` or `.github/workflows` points
  // at a directory outside the repository had the workflows written there. The copy then
  // reported those paths as written, the lexical comparison below counted them as in-repo
  // (it resolves `..` and `.`, never a link), and provenance recorded QFAI as the owner of a
  // file outside the tree — after which doctor's drift check and the retired prune both
  // pointed at it too.
  //
  // Refused rather than followed, and refused for the workflows only: the rest of `init` is
  // unaffected by what `.github` is, and failing the whole command over it would be a larger
  // change to an adopter's tree than declining to write two files.
  const workflowAncestorsBefore = await workflowAncestorIdentity(destRoot);
  const workflowsDirIsOwn = workflowAncestorsBefore !== undefined;
  if (!workflowsDirIsOwn) {
    error(
      "Skipped writing the shipped workflows: .github or .github/workflows is a symlink, and its target can point outside this repository. Replace it with a real directory and re-run.",
    );
  }
  // The workflows are copied and recorded BEFORE the rest of the root, as one unit.
  //
  // Copied with the rest of the root and recorded after it, the workflows would already be on disk
  // when a permission, I/O or disk error anywhere else in that copy — `DESIGN.md`,
  // `qfai.config.yaml`, any of it — throws out of `copyTemplateTree` before the record runs. An
  // unrecorded shipped workflow reads as `adopter-owned` on every later run: never recorded again,
  // invisible to doctor's drift detection, and outside the retired prune. The comment below the
  // record says nothing unrelated may run in between, and the rest of that copy is unrelated.
  //
  // Rolling back on failure is the wrong alternative here, for the reason the swap branch gives:
  // this command does not delete what it cannot verify it owns.
  const workflowCopyPaths = [...SHIPPED_WORKFLOW_NAMES]
    .filter((name) => workflowsDirIsOwn && workflowCopySet.has(name))
    .map((name) => path.join(".github", "workflows", name));

  // The workflow directory is CREATED here, before the copy, so its identity is one this run
  // established rather than one it found afterwards.
  //
  // When a component did not exist before the copy there was nothing to
  // compare it against, so the reading taken AFTER the copy became its identity — and on a first
  // `init` that reading proves nothing about which directory the copy actually wrote into. A
  // concurrent process that moved the freshly created `.github/workflows` aside and put another
  // real directory at the name had that substitute settled as the identity, and provenance
  // recorded workflows that are not where the record says they are. The next run reads those
  // names as `declined` and never writes them again.
  //
  // `copyTemplatePaths` would create it either way; doing it here means the identity below is
  // read from a directory this process made, with no window in which the question is open.
  // `mkdir` is recursive and therefore silent on an existing directory, so this is not a claim
  // that we created it — the identity read that follows is what settles that, and it uses
  // `lstat`, which refuses a symlink swapped in between the two calls.
  if (workflowsDirIsOwn && !options.dryRun && workflowCopyPaths.length > 0) {
    await mkdir(path.join(destRoot, ".github", "workflows"), { recursive: true });
  }
  const workflowAncestorsPinned =
    workflowsDirIsOwn && !options.dryRun && workflowCopyPaths.length > 0
      ? await workflowAncestorIdentity(destRoot)
      : workflowAncestorsBefore;

  const workflowResult = await copyTemplatePaths(rootAssets, destRoot, workflowCopyPaths, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
  });

  // The ancestors are still the directories that were inspected. The
  // check above ran once and the copy performs many asynchronous operations, so a concurrent
  // swap of `.github` or `.github/workflows` for a link had the shipped workflow created outside
  // the repository, and the later re-check stopped the provenance record without unwriting
  // anything.
  //
  // REPORTED and unrecorded, not deleted. A rollback would have to remove those files THROUGH
  // the parent that was just found untrustworthy — following the link this command refused to
  // follow, into a directory whose other contents are not ours. This repository already ruled on
  // that once, when the retired-name prune was found enumerating a linked workflows directory:
  // the run that declines to write through a link must not delete through it either.
  //
  // So the operator is told, precisely, and nothing records the write. Leaving the entries out
  // of the record is what keeps the next run honest: an unrecorded file reads as adopter-owned
  // rather than as ours to overwrite.
  // Only a run that actually tried to copy can have been swapped out from under one.
  //
  // A regression the previous round introduced: on a fresh clone
  // where both shipped workflows are `declined` and `.github` does not exist, nothing is
  // copied and no directory is created — but the pre-copy reading is `[null, null]`, not
  // `undefined`. Making an absent component a refusal then turned that ordinary no-op into a
  // reported swap, and the operator was told their workflows may have been written outside the
  // repository when nothing had been written at all.
  //
  // The refusal is right and stays; what was wrong is asking the question when there is no copy
  // to ask it about.
  const attemptedWorkflowCopy = workflowCopyPaths.length > 0;
  const settled =
    !attemptedWorkflowCopy || workflowAncestorsPinned === undefined || options.dryRun
      ? undefined
      : await settleWorkflowAncestors(destRoot, workflowAncestorsPinned);
  const workflowsSwapped =
    attemptedWorkflowCopy &&
    workflowAncestorsBefore !== undefined &&
    !options.dryRun &&
    settled === undefined;
  if (workflowsSwapped) {
    error(
      ".github or .github/workflows was swapped for another directory while the copy was running. The shipped workflows that were written may have landed outside this repository, so they are not recorded in provenance (following the swapped-in target to delete them would break the very policy of not following links). Check that `.github/workflows` is a real directory and that no unexpected files were created, then re-run.",
    );
    workflowResult.copied = [];
  }

  // Record provenance for the shipped workflow files this copy actually wrote (no-op on
  // dry-run and when nothing new was written). Nothing runs between the copy and the record.
  await recordInstalledWorkflows(
    destRoot,
    rootAssets,
    workflowPreInit,
    workflowResult.copied,
    toolVersion,
    options.dryRun,
    settled,
  );

  // root/ and .qfai/ are create-only (existing files are skipped).
  // Only STANDARD_ASSET_PATHS are overwritten by --force.
  //
  // That create-only behaviour comes solely from the `force: false` literal
  // below; nothing protects individual files by name. An adopter-authored
  // DESIGN.md, a qfai.config.yaml tuned by `qfai-configure`, and the shipped
  // workflow handled by the equally create-only workflow copy above all
  // survive for this one reason. Lifting the literal to `options.force`
  // would therefore mean a --force run overwrites adopter-owned files. That
  // is why the shipped-workflow ownership contract calls the same literal
  // load-bearing and forbids lifting it with a source-level oracle, and the
  // other files in the root tree ride on that one rule as well.
  //
  // Every shipped workflow name is excluded here, whatever this run decided about it: the ones
  // it writes were written above, and the ones it declined must not arrive by another route.
  // A master the record says an earlier run wrote, and the project has since
  // deleted, is not copied again. Asked before the copy, because once the file
  // is back the deletion is indistinguishable from a rule shipped for the first
  // time — which is how every upgrade undid the removal.
  const removedMasters = await deletedRuleMasters(
    path.join(rootAssets, AGENTS_RULES_DIR_REL),
    path.join(destRoot, AGENTS_RULES_DIR_REL),
  );
  reportRemovedRuleMasters(removedMasters);
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    exclude: [
      ...[...SHIPPED_WORKFLOW_NAMES].map((name) => path.join(".github", "workflows", name)),
      ...removedMasters.map((name) => path.join(AGENTS_RULES_DIR_REL, name)),
    ],
  });
  // …and the summary counts them together, as one copy, which is what an operator sees.
  rootResult.copied = [...workflowResult.copied, ...rootResult.copied];
  rootResult.skipped = [...workflowResult.skipped, ...rootResult.skipped];

  // The config template ships `testFileGlobs: []`, which leaves the SC traceability lane and
  // the stub scan behind `QFAI-TEST-001` pointed at nothing. Aim them at the files this
  // repository already has.
  //
  // Only when THIS run wrote the file. The copy above is create-only, so a `qfai.config.yaml`
  // it skipped is the adopter's — already tuned, perhaps by `/qfai-configure`, and rewriting a
  // value they chose is not this command's to do.
  const configPath = path.join(destRoot, "qfai.config.yaml");
  if (!options.dryRun && rootResult.copied.includes(configPath)) {
    await aimTestFileGlobsAtRepository(destRoot, configPath);
  }
  // The entry-point repair runs right after the create-only root copy and the
  // rule-master update pass. The files it repairs are exactly the ones that
  // copy skipped because the project already had them, and the signal it reads
  // — which masters this run wrote — is available only in the run that wrote
  // them. A step between the two that failed would leave the master on disk and
  // its citation unwritten, with the next run seeing a master it did not write.
  //
  // The update pass is the one step allowed in between, because a summary may
  // only move to the release's wording where its master did, and a planned
  // replacement can still end with the adopter's master kept. The citation
  // repair reads this run's own copy report, so a master replaced here — already
  // on disk before the run — is not one it is looking for.
  //
  // SIMPLIFIED: the window is the update pass wide rather than closed.
  // Lift when: init records per-master provenance, which the rule-master upgrade
  // path needs for its own reasons.
  const newlyWritten = newlyWrittenRuleMasters(rootResult.copied, destRoot);
  const ruleMasterResult = await updateUneditedRuleMasters(rootAssets, destRoot, options.dryRun);
  const installedMasters: ReadonlySet<string> = new Set([
    ...newlyWritten,
    ...ruleMasterResult.installed,
  ]);
  const entryPointRulesResult = await ensureAgentEntryPointRules(
    rootAssets,
    destRoot,
    options.dryRun,
    options.force,
    newlyWritten,
    installedMasters,
  );
  const minimumMaster = path.join(destRoot, AGENTS_RULES_DIR_REL, "minimal-implementation.md");
  const plannedSafetyFloor =
    options.dryRun &&
    (rootResult.copied.includes(minimumMaster) || ruleMasterResult.copied.includes(minimumMaster));
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    exclude: [
      "spec",
      ...STANDARD_ASSET_PATHS,
      "assistant/constitution",
      "assistant/manifest",
      "assistant/catalog",
      "assistant/process",
      ...GOVERNED_ASSISTANT_LAYERS.map((layer) =>
        path.relative(destQfai, joinAssistantLayer(destRoot, layer)),
      ),
    ],
  });
  const storyTreeResult = oldSpecLayout
    ? { copied: [] as string[], skipped: [] as string[] }
    : await seedStoryTree(destRoot, qfaiAssets, options.dryRun);
  const skillsResult = await copyTemplatePaths(qfaiAssets, destQfai, [...STANDARD_ASSET_PATHS], {
    force: options.force,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
  });
  const differingSkills = options.force
    ? 0
    : await countDifferingSkills(qfaiAssets, destRoot, skillsResult.skipped);
  // The copy above is create-only and this release ships no README to copy, so
  // the one an earlier release left behind is removed here rather than
  // overwritten.
  const markerRemoved = await removeAssistantMarker(destRoot, options.dryRun);
  const governedResult = await syncGovernedAssistantAssets(assistantAssets, destRoot, {
    force: options.force,
    dryRun: options.dryRun,
    rootAssets,
    plannedSafetyFloor,
  });

  // git config core.symlinks true (a precondition for creating symlinks).
  // This is the only change outside the working tree, so report it right
  // after the write (dry-run prints the preview line too). If it were held
  // until report(), a later throw from syncIntegrationWrappers or similar
  // (for example EPERM on Windows without Developer Mode) would lose the
  // disclosure of a setting that is already persisted.
  for (const note of await configureGitSymlinks(destRoot, options.dryRun)) {
    info(note);
  }

  // Symlink-based integration generation (prune old wrappers, create symlinks, generate README / copilot-instructions)
  const wrappersResult = await syncIntegrationWrappers(assistantAssets, destRoot, {
    force: options.force,
    dryRun: options.dryRun,
    installedRuleMasters: installedMasters,
    ...symlinkRuntime,
  });
  const gitignoreResult = await ensureRootGitignoreEntries(destRoot, options.dryRun);
  // Their templates sit outside `root/`, so no earlier copy has touched the files:
  // this owns both writing each and merging into one the project already had.
  const claudeHooksResult = await ensureReminderHooks(
    assetsRoot,
    destRoot,
    CLAUDE_SETTINGS_RELATIVE_PATH,
    options.dryRun,
  );
  const codexHooksResult = await ensureReminderHooks(
    assetsRoot,
    destRoot,
    CODEX_HOOKS_RELATIVE_PATH,
    options.dryRun,
  );
  const removedLegacySkills = options.force
    ? await pruneLegacySkillFiles(destRoot, options.dryRun)
    : [];
  const retiredSkillNotes = options.force
    ? await archiveRetiredMigrationSkill(destRoot, options.dryRun)
    : [];

  // Retired shipped workflows: retired-name-set membership AND recorded
  // QFAI ownership, both. The adopter's `.github/workflows/` directory is
  // adopter-authored; the `qfai-` filename prefix is a reservation notice,
  // never a deletion selector, so a prefix predicate is forbidden here
  // (shipped-workflows contract) — an adopter-created `qfai-*.yml` must stay
  // untouched. Name membership alone is not the ownership test either: an
  // adopter who authored a file under a name QFAI later retires has no
  // provenance entry, and the acceptance criteria require provenance to be
  // consulted before every overwrite and every prune.
  // The SAME boundary the copy is held to, and for a worse reason.
  // `workflowsDirIsOwn` excluded the copy and nothing else, so a `.github/workflows` that is a
  // link to a shared directory or another repository was still ENUMERATED here — and a
  // retired workflow on the far side whose bytes match a recorded digest was quarantined and
  // deleted. The run that refused to write through the link would delete through it.
  //
  // Empty rather than skipped-with-a-message: the message is already emitted where the copy
  // is excluded, and one refusal reported once is what an operator needs.
  const removedRetiredWorkflows: string[] = [];
  // A detected swap stops the prune as well as the record.
  // `workflowsDirIsOwn` was computed BEFORE the copy and stayed `true`, so the retired-name
  // prune went on to enumerate the swapped directory — and a retired workflow over there whose
  // bytes match a recorded digest was quarantined and deleted. That is the exact operation the
  // reporting-instead-of-deleting decision above exists to avoid, reached by another route: a
  // run that declines to write through a swapped parent must not delete through it either.
  const prunableRetiredNames =
    workflowsDirIsOwn && !workflowsSwapped
      ? await resolvePrunableRetiredWorkflows(destRoot, workflowPreInit.record)
      : new Map<string, string>();
  await pruneMatchingEntries(
    path.join(destRoot, ".github", "workflows"),
    (entry) => entry.isFile() && prunableRetiredNames.has(entry.name),
    removedRetiredWorkflows,
    options.dryRun,
    // Re-asked here, against the file as it is now. `prunableRetiredNames` was computed before
    // the copy above ran, and between the two the adopter — or a concurrent run — can put
    // their own content under that name. The name would still match; the bytes would not.
    // The primitive asks it a second time after moving the entry aside,
    // which is why the digest is looked up by the entry's own NAME rather than by the basename
    // of the path being read — after the move those are different strings.
    async (target, name) => (await digestWorkflowFile(target)) === prunableRetiredNames.get(name),
    // The entry goes with the file, in the same success unit. A pruned workflow whose provenance
    // entry survives is read by the NEXT run as a name QFAI installed and the adopter deleted —
    // the `declined` row — so the copy skips it forever. Retiring a workflow would silently
    // poison the name against whatever ships under it later.
    //
    // This ran AFTER the delete, as a separate step. A read-only `.qfai`, a
    // full disk or a lock it could not take then left the file gone and the entry standing —
    // which is exactly the poisoned name the paragraph above is about, reached by the code meant
    // to prevent it. Running it while the files are still in quarantine means a failure here puts
    // them back.
    //
    // Under the record lock and against the record on disk, not against the pre-init snapshot:
    // the copy between them has already written entries of its own.
    async (prunedPaths) => {
      const prunedNames = new Set(prunedPaths.map((target) => path.basename(target)));
      await updateInstallProvenance(destRoot, (current) => {
        const workflows = Object.fromEntries(
          Object.entries(current.workflows).filter(([name]) => !prunedNames.has(name)),
        );
        return { ...current, workflows };
      });
    },
  );

  const removed = [
    ...removedLegacySkills,
    ...wrappersResult.removed,
    ...removedRetiredWorkflows,
    ...governedResult.removed,
  ];

  // Activation guidance for newly created instructions files
  const expectedInstructionsDir = path.join(destRoot, ".github", "instructions");
  const instructionsCreated = wrappersResult.copied.some(
    (p) =>
      path.basename(p).endsWith(".instructions.md") && path.dirname(p) === expectedInstructionsDir,
  );
  if (instructionsCreated && !options.dryRun) {
    info("");
    info("Created the instructions files for Copilot code review.");
    info("To enable it: comment '@github-copilot review' on a PR, or");
    info("configure automatic review in a GitHub Actions workflow.");
    info("Reference: https://docs.github.com/en/copilot/using-github-copilot/code-review");
  }

  // The generic `.qfai/` copy is create-only, so every governed file that
  // already existed is in its `skipped` list before the governed sync runs.
  // Whatever the governed sync then reports on is the authoritative outcome
  // for that path — refreshed, left forked, retired — so the generic verdict
  // is dropped rather than printed beside it, which showed one path twice and
  // listed a file `--force` had just updated as "skipped".
  const governedPaths = new Set([
    ...governedResult.copied,
    ...governedResult.skipped,
    ...governedResult.removed,
  ]);
  report(
    [
      ...rootResult.copied,
      ...withoutPaths(qfaiResult.copied, governedPaths),
      ...storyTreeResult.copied,
      ...skillsResult.copied,
      ...wrappersResult.copied,
      ...gitignoreResult.copied,
      ...entryPointRulesResult.copied,
      ...ruleMasterResult.copied,
      ...claudeHooksResult.copied,
      ...codexHooksResult.copied,
      ...upgradeResult.copied,
      ...governedResult.copied,
    ],
    [
      ...rootResult.skipped,
      ...withoutPaths(qfaiResult.skipped, governedPaths),
      ...storyTreeResult.skipped,
      ...skillsResult.skipped,
      ...wrappersResult.skipped,
      ...gitignoreResult.skipped,
      ...entryPointRulesResult.skipped,
      ...ruleMasterResult.skipped,
      ...claudeHooksResult.skipped,
      ...codexHooksResult.skipped,
      ...upgradeResult.skipped,
      ...governedResult.skipped,
    ],
    [...removed, ...upgradeResult.removed, ...markerRemoved],
    options.dryRun,
    "init",
    destRoot,
    options.verbose ?? false,
  );

  if (oldSpecLayout) {
    info(
      `Old spec layout at ${formatReportPath(oldSpecLayout)}; migrate with /qfai-migration-v1-to-v2.`,
    );
  }

  info(await workflowModeLine(destRoot));
  if (codexHooksResult.copied.length > 0 && !options.dryRun) {
    info(
      `Codex runs the hooks in ${CODEX_HOOKS_RELATIVE_PATH} only after you review and trust them with /hooks.`,
    );
  }

  for (const note of [
    ...upgradeResult.preservedNotes,
    ...differingSkillsNote(differingSkills),
    ...retiredSkillNotes,
  ]) {
    info(note);
  }

  for (const note of governedResult.manualMergeNotes) {
    info(note);
  }

  // Legacy steering/ sunset warning (D-DEPRECATED-PATH). Emitted AFTER
  // the report summary so the warning stays at the bottom of the
  // terminal output and is not buried by the skipped-paths list.
  // Skip when the user is currently running
  // --upgrade-assistant-tree (the helper will move the directory
  // itself); skip on dry-run; skip when no legacy dir exists.
  if (!options.upgradeAssistantTree && !options.dryRun) {
    await emitLegacyAssistantSteeringSunset(destRoot);
  }
}

/**
 * The summary line naming the workflow mode the project's config puts in force. Init writes no
 * mode, so an absent key reads as `active`; a value that is none of the three is named as invalid.
 */
async function workflowModeLine(destRoot: string): Promise<string> {
  const { document } = await loadConfig(destRoot);
  const mode = readWorkflowMode(document);
  if (mode !== null) return `Workflow mode: ${mode}`;
  const configured = JSON.stringify(configuredWorkflowMode(document));
  return `Workflow mode: ${configured} is invalid; expected active, shadow or off`;
}

/** The value the config holds where the mode belongs: `workflow.mode`, or `workflow` itself. */
function configuredWorkflowMode(document: unknown): unknown {
  const workflow =
    typeof document === "object" && document !== null && "workflow" in document
      ? document.workflow
      : undefined;
  return typeof workflow === "object" && workflow !== null && "mode" in workflow
    ? workflow.mode
    : workflow;
}

// ---------------------------------------------------------------------------
// Governed assistant assets: provenance record + upgrade path
// ---------------------------------------------------------------------------

/**
 * How many shipped skills a plain run left alone because the project's copy
 * differs from the template. Line endings are ignored, so a CRLF checkout of an
 * unedited skill is not counted.
 */
async function countDifferingSkills(
  qfaiAssets: string,
  destRoot: string,
  skipped: readonly string[],
): Promise<number> {
  const destQfai = path.join(destRoot, ".qfai");
  const skillsDir = path.join(destRoot, ...ASSISTANT_DIR.split("/"), "skill");
  const differing = new Set<string>();
  for (const dest of skipped) {
    const relative = path.relative(skillsDir, dest);
    const skill = relative.split(path.sep)[0] ?? "";
    if (relative.startsWith("..") || skill === "" || differing.has(skill)) continue;
    const source = path.join(qfaiAssets, path.relative(destQfai, dest));
    const shipped = await hashAssistantAssetFile(source, { allowSymlink: true });
    if ((await hashAssistantAssetFile(dest)) !== shipped) differing.add(skill);
  }
  return differing.size;
}

function differingSkillsNote(count: number): string[] {
  if (count === 0) return [];
  return count === 1
    ? [
        "  1 shipped skill differs from this release and was left as it is. `qfai init --force` updates it: it replaces it with the shipped version, overwriting local edits.",
      ]
    : [
        `  ${String(count)} shipped skills differ from this release and were left as they are. \`qfai init --force\` updates them: it replaces them with the shipped versions, overwriting local edits.`,
      ];
}

function withoutPaths(paths: string[], excluded: ReadonlySet<string>): string[] {
  return paths.filter((candidate) => !excluded.has(candidate));
}

/** Reject unsupported exclusive creation before copying or migrating any assets. */
async function preflightGovernedCreation(
  assistantAssets: string,
  rootAssets: string,
  destRoot: string,
  force: boolean,
): Promise<void> {
  let shipped: Record<string, string>;
  try {
    shipped = await buildShippedAssistantHashes(assistantAssets);
  } catch (cause: unknown) {
    throw new Error(
      `qfai init cannot verify shipped governed assets in ${JSON.stringify(assistantAssets)}. Reinstall QFAI or restore its complete readable package assets, then rerun; no package assets were copied or migrated.`,
      { cause },
    );
  }
  const isContained = makeGovernedContainmentGuard(destRoot);
  const probed = new Set<string>();
  for (const relative of Object.keys(shipped)) {
    if (!(await isContained(relative))) continue;
    const dest = path.join(destRoot, ...ASSISTANT_DIR.split("/"), ...relative.split("/"));
    if (
      relative === "rule/constitution.md" &&
      !(await canPlanConstitutionCreation(rootAssets, destRoot))
    ) {
      continue;
    }
    try {
      await lstat(dest);
      if (!force || (await hashAssistantAssetFile(dest)) !== null) continue;
    } catch (cause: unknown) {
      if (!isEnoent(cause)) {
        if (!force) continue;
        throw new Error(
          `qfai init cannot inspect ${JSON.stringify(dest)} for a force repair. Restore access and rerun; no package assets were copied or migrated.`,
          { cause },
        );
      }
    }
    let directory = path.dirname(dest);
    for (;;) {
      try {
        await stat(directory);
        break;
      } catch (cause: unknown) {
        if (!isEnoent(cause) || directory === path.dirname(directory)) throw cause;
        directory = path.dirname(directory);
      }
    }
    if (probed.has(directory)) continue;
    await probeExclusiveLink(directory);
    probed.add(directory);
  }
}

async function canPlanConstitutionCreation(rootAssets: string, destRoot: string): Promise<boolean> {
  if (await canSyncConstitution(rootAssets, destRoot, false)) return true;
  const name = "minimal-implementation.md";
  const relative = path.join(AGENTS_RULES_DIR_REL, name);
  if (!(await hasRealGovernedAssistantParents(destRoot, relative.split(path.sep).join("/")))) {
    return false;
  }
  try {
    await lstat(path.join(destRoot, relative));
  } catch (cause: unknown) {
    if (isEnoent(cause)) {
      return (
        (await hashAssistantAssetFile(path.join(rootAssets, relative), { allowSymlink: true })) !==
        null
      );
    }
    return false;
  }
  try {
    const plans = await planRuleMasterUpdates(
      path.join(rootAssets, AGENTS_RULES_DIR_REL),
      path.join(destRoot, AGENTS_RULES_DIR_REL),
    );
    return plans.some((plan) => plan.name === name && plan.verdict === "update");
  } catch {
    return false;
  }
}

async function probeExclusiveLink(directory: string): Promise<void> {
  const source = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  const dest = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  let ownsSource = false;
  let ownsDest = false;
  let identity: BigIntStats | undefined;
  const probeFailures: unknown[] = [];
  try {
    const handle = await open(source, "wx");
    ownsSource = true;
    try {
      identity = await handle.stat({ bigint: true });
    } catch (statCause: unknown) {
      try {
        await handle.close();
      } catch (closeCause: unknown) {
        throw new AggregateError(
          [statCause, closeCause],
          "Creation probe inspection and close failed.",
          { cause: closeCause },
        );
      }
      throw statCause;
    }
    await handle.close();
    await link(source, dest);
    ownsDest = true;
  } catch (cause: unknown) {
    probeFailures.push(
      new Error(
        `qfai init cannot prepare creation probes in ${JSON.stringify(directory)}. Restore write access and ensure the filesystem supports hard links, then rerun; no package assets were copied or migrated.`,
        { cause },
      ),
    );
  }
  const cleanupFailures: Error[] = [];
  const protectedEntries: Error[] = [];
  for (const file of [ownsDest ? dest : null, ownsSource ? source : null]) {
    if (file === null) continue;
    try {
      const current = await lstat(file, { bigint: true });
      if (
        identity === undefined ||
        !current.isFile() ||
        current.dev !== identity.dev ||
        current.ino !== identity.ino
      ) {
        protectedEntries.push(new Error(JSON.stringify(file)));
        continue;
      }
    } catch (cause: unknown) {
      if (isEnoent(cause)) continue;
      protectedEntries.push(new Error(JSON.stringify(file), { cause }));
      continue;
    }
    try {
      await rm(file, { force: true });
    } catch (cause: unknown) {
      cleanupFailures.push(new Error(JSON.stringify(file), { cause }));
    }
  }
  if (protectedEntries.length > 0) {
    const cleanupNote =
      cleanupFailures.length === 0
        ? ""
        : ` Other probe cleanup failed at ${cleanupFailures.map((failure) => failure.message).join(", ")}; remove only verified, unchanged probe files before retrying.`;
    throw new AggregateError(
      [...probeFailures, ...protectedEntries, ...cleanupFailures],
      `qfai init could not verify creation probe ownership at ${protectedEntries.map((entry) => entry.message).join(", ")}. Do not delete these occupied paths. Restore access and inspect ownership before rerunning; no package assets were copied or migrated.${cleanupNote}`,
    );
  }
  if (cleanupFailures.length > 0) {
    throw new AggregateError(
      [...probeFailures, ...cleanupFailures],
      `qfai init could not remove creation probes: ${cleanupFailures.map((failure) => failure.message).join(", ")}. Restore access, remove only these probe files, then rerun; no package assets were copied or migrated.`,
    );
  }
  if (probeFailures.length > 0) throw probeFailures[0];
}

type GovernedAssetsResult = {
  copied: string[];
  skipped: string[];
  removed: string[];
  manualMergeNotes: string[];
};

/**
 * Records what qfai wrote under `rule/`, and — under `--force` — refreshes
 * files that still match the recorded hash.
 *
 * Shipped rules were create-only in every mode, so a correction to qfai's
 * own normative rules reached new projects and nobody else, and a project that
 * edited one had no way to say so. The record makes both states nameable:
 * `qfai validate` can now separate a stale copy from a local fork, and this
 * function refreshes only the former. A fork is never overwritten — it is
 * reported for a human merge, because the content it holds is the project's,
 * not the template's.
 *
 * A file the release no longer ships is retired by the same rule, in
 * `retireWithdrawnGovernedAssets`.
 */
async function syncGovernedAssistantAssets(
  assistantAssets: string,
  destRoot: string,
  options: { force: boolean; dryRun: boolean; rootAssets: string; plannedSafetyFloor: boolean },
): Promise<GovernedAssetsResult> {
  // The assistant-tree segments come from `assistantPaths.ts`, the one source
  // of those paths, in init and in validate alike, so a future
  // move of `ASSISTANT_DIR` cannot leave the provenance record, the refresh and
  // the retire pass operating on a tree the validators no longer read.
  const destAssistant = path.join(destRoot, ...ASSISTANT_DIR.split("/"));
  const copied: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  const manualMergeNotes: string[] = [];

  let shipped: Record<string, string>;
  try {
    shipped = await buildShippedAssistantHashes(assistantAssets);
  } catch {
    // Fail closed. An unreadable or partially extracted install yields a
    // shipped set that is short of files it really ships, and every governed
    // file the lock names but the set omits is what `--force` retires — so a
    // truncated package would have deleted the rules it could not read. The
    // sync is abandoned whole: nothing refreshed, nothing removed, and the
    // existing record left exactly as it was.
    manualMergeNotes.push(
      "NOTE: qfai's shipped assistant rules could not be read, so they were not synced and .assets.lock.json was left unchanged (the installation may be incomplete).",
    );
    return { copied, skipped, removed, manualMergeNotes };
  }

  const previous = (await readAssistantAssetsLock(destAssistant))?.files ?? {};
  const recorded: Record<string, string> = {};
  const isContained = makeGovernedContainmentGuard(destRoot);

  for (const [relative, shippedHash] of Object.entries(shipped)) {
    const source = path.join(assistantAssets, ...relative.split("/"));
    const dest = path.join(destAssistant, ...relative.split("/"));
    if (!(await isContained(relative))) {
      skipped.push(dest);
      manualMergeNotes.push(escapedGovernedPathNote(dest));
      continue;
    }
    const currentHash = await hashAssistantAssetFile(dest);
    const previousHash = previous[relative];
    if (
      relative === "rule/constitution.md" &&
      !(await canSyncConstitution(options.rootAssets, destRoot, options.plannedSafetyFloor))
    ) {
      skipped.push(dest);
      if (previousHash !== undefined) recorded[relative] = previousHash;
      const recovery =
        currentHash !== null
          ? "A manual merge of the safety master and existing constitution is needed; keep adopter edits protected."
          : (await pathExists(dest).catch(() => true))
            ? "The constitution path is occupied or unreadable. Restore access to any existing constitution, or remove or relocate the non-file occupant while protecting adopter content. A manual merge of existing policy is needed. Keep master edits by manually installing and reconciling the constitution. To install automatically, back up customizations, restore the exact shipped master, then rerun `qfai init`."
            : "Keep master edits by manually installing and reconciling the constitution. To install automatically, back up customizations, restore the exact shipped master, then rerun `qfai init`.";
      manualMergeNotes.push(
        `NOTE: ${formatReportPath(dest)} was not installed or refreshed: .agents/rules/minimal-implementation.md could not be verified as the shipped master for the safety floor. ${recovery}`,
      );
      continue;
    }

    if (currentHash === shippedHash) {
      skipped.push(dest);
      recorded[relative] = shippedHash;
      continue;
    }

    if (currentHash === null) {
      await restoreUnreadableGovernedAsset(
        destRoot,
        source,
        dest,
        shippedHash,
        previousHash,
        options,
        {
          copied,
          skipped,
          recorded,
          manualMergeNotes,
          relative,
        },
      );
      continue;
    }

    // A file matching the record but not the release is one qfai wrote and a
    // later release moved on from, so `--force` refreshing it loses nothing —
    // except on the four documents the project fills in and owns. There the
    // record holds what the PROJECT wrote once the lock has been rewritten, and
    // the same comparison then says "refreshable" about content that only
    // exists here. Declined rather than merged: this command does not overwrite
    // what it did not write.
    const adopterOwned = ADOPTER_OWNED_ASSETS.has(relative);
    const refreshable =
      options.force && !adopterOwned && previousHash !== undefined && currentHash === previousHash;
    if (refreshable) {
      // `currentHash` was read above; the refresh is only legitimate while the
      // file still holds it. Passing it down makes the replacement decline a
      // target that changed under the run instead of discarding the new
      // content.
      const outcome = options.dryRun
        ? "replaced"
        : await replaceGovernedAsset(source, dest, currentHash);
      if (outcome === "target-changed") {
        skipped.push(dest);
        recorded[relative] = previousHash;
        manualMergeNotes.push(
          `NOTE: ${dest} was rewritten by another process while it was being updated, so it was left alone (run \`qfai init --force\` again).`,
        );
        continue;
      }
      copied.push(dest);
      recorded[relative] = shippedHash;
      continue;
    }

    skipped.push(dest);
    recorded[relative] = previousHash ?? shippedHash;
    if (options.force) {
      manualMergeNotes.push(
        adopterOwned
          ? `NOTE: ${dest} is yours to maintain, so it was left as it is. Compare it against the installed release yourself if a newer template is wanted.`
          : `NOTE: ${dest} has diverged from the shipped content, so it was not updated (a manual merge is needed).`,
      );
    }
  }

  await retireWithdrawnGovernedAssets(
    destAssistant,
    shipped,
    previous,
    recorded,
    options,
    isContained,
    { removed, skipped, manualMergeNotes },
  );

  // The record itself is a governed write: an assistant root that is a symlink
  // out of the project would take the lock — and every later decision made from
  // it — with it.
  if (!options.dryRun && (await isContained(ASSISTANT_ASSETS_LOCK_BASENAME))) {
    await mkdir(destAssistant, { recursive: true });
    await writeAssistantAssetsLock(destAssistant, { files: recorded });
  }

  return { copied, skipped, removed, manualMergeNotes };
}

/**
 * Answers whether a governed relative path sits inside the project's own
 * assistant tree.
 *
 * `rename` and `rm` act on the entry they are given, which makes the *final*
 * component safe on its own — but not the directories above it. A checkout that
 * left `constitution/` (or the assistant root itself) as a symlink to somewhere
 * outside the repository pointed every governed write and every `--force`
 * retire into that directory instead.
 *
 * The walk starts at the **project** root and the path handed to it carries the
 * assistant segments. Starting at the assistant root left `.qfai` and
 * `assistant` themselves unchecked, and `lstat` declines to resolve only the
 * last component it is given — so a `.qfai` symlinked out of the repository
 * made `lstat(.qfai/assistant)` report the external directory as real, and the
 * guard waved through every write and retire inside it.
 *
 * **Nothing is cached.** The first version answered once per containing
 * directory, which made the guard's answer as old as the run: a layer swapped
 * for a link after the first file in it was cleared took every later hash,
 * restore, retire and staging rename with it — and the restore of a missing
 * file writes with no expected hash to stop it. Re-asking is four `lstat`s
 * against a governed tree of a few dozen files, which is not a cost worth an
 * answer that can be minutes stale. It does not make the check atomic with the
 * write that follows it — no API here can — but the window is now the two
 * syscalls either side of it rather than the length of the sync.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export function makeGovernedContainmentGuard(
  destRoot: string,
): (relative: string) => Promise<boolean> {
  return (relative: string) =>
    hasRealGovernedAssistantParents(destRoot, `${ASSISTANT_DIR}/${relative}`);
}

function escapedGovernedPathNote(dest: string): string {
  return `NOTE: a parent of ${dest} is not a real directory (a symlink or junction may point outside the project), so this normative file was excluded from both the sync and the retirement pass.`;
}

/**
 * Copies to a sibling staging file before publishing complete bytes.
 * Replacement renames the directory entry, never following a target symlink.
 * An expected hash is rechecked immediately before publication; this narrows,
 * but cannot eliminate, the race with an editor. Create-only publication uses
 * an exclusive hard link and never overwrites a path created concurrently.
 */
export type GovernedWriteOutcome = "replaced" | "target-changed";

/**
 * @internal Exported for the regression test that pins the `target-changed`
 * branch — not part of the package's public surface. The branch is only
 * reachable through a race, so the test reaches it by handing in an
 * `expectedHash` the target does not hold — the same state the race leaves.
 */
export async function replaceGovernedAsset(
  source: string,
  dest: string,
  expectedHash?: string,
  mode: "replace" | "create-only" = "replace",
): Promise<GovernedWriteOutcome> {
  const directory = path.dirname(dest);
  await mkdir(directory, { recursive: true });
  const staging = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  if (mode === "create-only") {
    let handle: FileHandle;
    try {
      handle = await open(staging, "wx");
    } catch (cause: unknown) {
      throw new Error(
        `qfai init cannot create staging file ${JSON.stringify(staging)} for ${JSON.stringify(dest)}. Restore write access and inspect ownership before rerunning; preserve any occupied staging path and existing destination content.`,
        { cause },
      );
    }
    let identity: BigIntStats | undefined;
    let outcome: GovernedWriteOutcome = "replaced";
    let published = false;
    const failures: unknown[] = [];
    const ownsPath = async (target: string): Promise<boolean> => {
      const current = await lstat(target, { bigint: true });
      return (
        identity !== undefined &&
        current.isFile() &&
        current.dev === identity.dev &&
        current.ino === identity.ino
      );
    };
    try {
      identity = await handle.stat({ bigint: true });
      await handle.writeFile(await readFile(source));
      await handle.chmod((await stat(source)).mode & 0o7777);
      if (expectedHash !== undefined && (await hashAssistantAssetFile(dest)) !== expectedHash) {
        outcome = "target-changed";
      } else {
        if (!(await ownsPath(staging))) {
          throw new Error(
            `qfai init cannot publish ${JSON.stringify(dest)} because staging ownership changed at ${JSON.stringify(staging)}. Inspect ownership before retrying.`,
          );
        }
        await link(staging, dest);
        published = true;
        if (!(await ownsPath(dest))) outcome = "target-changed";
      }
    } catch (cause: unknown) {
      failures.push(cause);
    }
    let closed = true;
    try {
      await handle.close();
    } catch (cause: unknown) {
      closed = false;
      failures.push(cause);
    }
    let present = true;
    let removable = false;
    let inspectionNote = "";
    try {
      removable = await ownsPath(staging);
    } catch (cause: unknown) {
      if (isEnoent(cause)) present = false;
      else inspectionNote = ` Inspection failed: ${JSON.stringify(String(cause))}.`;
    }
    if (present && !removable) {
      warn(
        `NOTE: qfai init could not verify staging ownership at ${JSON.stringify(staging)}.${inspectionNote} Do not delete this occupied path. Restore access and inspect ownership before rerunning; keep any existing destination content at ${JSON.stringify(dest)}.`,
      );
    }
    if (removable && !closed) {
      warn(
        `NOTE: qfai init retained staging file ${JSON.stringify(staging)} because its handle could not be closed. Restore access and close the handle before removing only this verified staging file; keep any existing destination content at ${JSON.stringify(dest)}.`,
      );
    }
    if (removable && closed) {
      await rm(staging, { force: true }).catch(() => {
        const result = published ? "created" : "could not create";
        warn(
          `NOTE: qfai init ${result} ${JSON.stringify(dest)}, but could not remove staging file ${JSON.stringify(staging)}. Restore access, remove only this staging file, then rerun qfai init; keep any existing destination content.`,
        );
      });
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, "Governed asset creation and handle close failed.", {
        cause: failures.at(-1),
      });
    }
    if (failures.length === 1) throw failures[0];
    return outcome;
  }
  try {
    await copyFile(source, staging, constants.COPYFILE_EXCL);
    if (expectedHash !== undefined && (await hashAssistantAssetFile(dest)) !== expectedHash) {
      await rm(staging, { force: true }).catch(() => {
        // Best effort: the answer below is what the caller acts on.
      });
      return "target-changed";
    }
    await rename(staging, dest);
    return "replaced";
  } catch (error: unknown) {
    // An occupied staging path is not this run's to remove. `COPYFILE_EXCL`
    // refuses with `EEXIST` precisely because something is already there, and
    // a name collision does not transfer ownership of the bytes behind it —
    // removing them destroys whatever wrote them, which on a shared checkout
    // is another run's staged asset. Every other failure leaves behind at most
    // what this copy wrote, including a partial one, and that is this run's to
    // clear.
    if (!hasErrnoCode(error) || error.code !== "EEXIST") {
      await rm(staging, { force: true }).catch(() => {
        // Best effort; preserve the original replacement failure.
      });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Assistant-tree marker retirement
// ---------------------------------------------------------------------------

/**
 * Ceiling on the README this retirement will read before deciding.
 *
 * Generous against what init wrote — a few hundred bytes — and small enough
 * that a document somebody else put at that path costs nothing to decline.
 */
const ASSISTANT_README_MAX_BYTES = 64 * 1024;

/**
 * The title earlier releases wrote, and the section every marker README had.
 *
 * One mention of the canonical tree is not a signature — a project documenting
 * where it keeps its own QFAI tree writes that sentence, and one of those made
 * a checkout that never ran init read as initialised. All three parts together
 * are init's, which is what makes them safe to remove.
 */
const INIT_MARKER_TITLE = /^# QFAI /;
const INIT_MARKER_SECTION = "## Canonical entrypoint";

/** Whether a README body is one an earlier `qfai init` wrote. */
function hasInitMarkerSignature(body: string): boolean {
  return (
    INIT_MARKER_TITLE.test(body) &&
    body.includes(INIT_MARKER_SECTION) &&
    body.includes(`${ASSISTANT_DIR}/`)
  );
}

/**
 * Removes `.qfai/assistant/README.md` when it is the one an earlier release
 * wrote.
 *
 * That README documented how `qfai validate` decided whether init had run, and
 * `validators/integrationSurface.ts#INIT_MARKERS` now reads two records
 * instead. Left in place it would describe behaviour the tool no longer has,
 * in the tree the assistant loads its instructions from. Everything else it
 * said is in `constitution/drift-protocol.md`, in more detail.
 *
 * Two conditions have to hold, and both are about ownership rather than about
 * the file being unwanted.
 *
 * The body carries init's signature. Every `.qfai/**` path is create-only, so
 * whatever a project put at this one is still there, and a project's own
 * README is not init's to delete.
 *
 * The body holds no preserved-body section. An earlier release repaired a
 * marker-less README by writing the template over it and filing what was there
 * below {@link PRESERVED_BODY_HEADING}. Those notes are the project's, so a
 * file carrying them is left alone even though the text above them is init's;
 * the operator can take the section out and the next run will remove the rest.
 *
 * Absence is the ordinary case and not a finding: this release writes no such
 * file, so every project initialised by it has none.
 */
async function removeAssistantMarker(destRoot: string, dryRun: boolean): Promise<string[]> {
  const dest = joinAssistantReadme(destRoot);
  let current: Stats;
  try {
    current = await lstat(dest);
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return [];
    }
    // Not silence. The file is still there describing a check that no longer
    // exists, and a run that says nothing reads as one that found nothing to do.
    warn(
      [
        `WARN: could not stat ${dest} (${describeError(err)}).`,
        `      It is a README earlier qfai releases wrote and this one no longer writes; remove it by hand, or check the permissions and run qfai init again.`,
      ].join("\n"),
    );
    return [];
  }
  if (!current.isFile()) {
    return [];
  }
  const existing = await readExistingReadme(dest);
  if (existing === null) {
    return [];
  }
  const body = decodeForDetection(existing.content);
  if (!hasInitMarkerSignature(body) || body.includes(PRESERVED_BODY_HEADING)) {
    return [];
  }
  if (!dryRun) {
    // Re-read immediately before the unlink. The decision above was made from
    // content, and `rm` takes a pathname: an editor that saved over this file
    // in between would have its work deleted on the strength of what was there
    // before. Comparing the bytes rather than only `dev`/`ino` is what catches
    // the ordinary case, because an editor that truncates and rewrites keeps
    // the inode. The window is not closed — no platform offers an atomic
    // compare-and-unlink — but the common case declines instead of deleting.
    const now = await readExistingReadme(dest).catch(() => null);
    if (now === null || !now.content.equals(existing.content)) {
      warn(
        `WARN: another process replaced ${dest} while qfai init was running, so it was not removed. Run qfai init again.`,
      );
      return [];
    }
    try {
      await rm(dest, { force: true });
    } catch (err: unknown) {
      warn(
        `WARN: could not remove ${dest} (${describeError(err)}). It is a README earlier qfai releases wrote and this one no longer writes; remove it by hand.`,
      );
      return [];
    }
  }
  return [dest];
}

/** Heading an earlier release filed a project's own README text under. */
const PRESERVED_BODY_HEADING = "## The README that was here before qfai init";

/**
 * Handles a governed path that holds no readable regular file.
 *
 * Recording the shipped hash here was a false claim: nothing had been written,
 * so the next `validate` compared the project against a record of a file that
 * was never there. Worse, when the path is *occupied* — by a directory, a
 * FIFO, a dangling symlink — the create-only copy upstream skips it as
 * existing and this branch wrote nothing either, so `QFAI-ASSETS-007` kept
 * firing and no `init`, `--force` included, could clear it.
 *
 * Absent is restored. Occupied is only replaced under `--force`, which is the
 * flag that already means "regenerate what qfai owns"; without it the occupant
 * is reported and left alone, because removing something a project deliberately
 * put there is not a decision `qfai init` gets to make silently.
 */
async function restoreUnreadableGovernedAsset(
  destRoot: string,
  source: string,
  dest: string,
  shippedHash: string,
  previousHash: string | undefined,
  options: { force: boolean; dryRun: boolean },
  out: {
    copied: string[];
    skipped: string[];
    recorded: Record<string, string>;
    manualMergeNotes: string[];
    relative: string;
  },
): Promise<void> {
  // An `lstat` that fails for anything but ENOENT (a permission fault on the
  // parent, say) reads as occupied: what could not be inspected must not be
  // clobbered.
  const occupied = await pathExists(dest).catch(() => true);
  if (occupied && options.force && !options.dryRun) {
    // Recheck the displaced occupant before discarding it. A concurrent
    // readable regular file belongs to the adopter even under --force.
    const outcome = await displaceUnreadableGovernedAsset(dest);
    if (outcome !== "displaced") {
      // This readable regular file is not the occupant the repair may replace.
      out.skipped.push(dest);
      if (previousHash !== undefined) {
        out.recorded[out.relative] = previousHash;
      }
      out.manualMergeNotes.push(
        typeof outcome === "object"
          ? `NOTE: ${dest} was replaced by a regular file just before the repair, so the repair was rolled back; the original content could not be restored and is parked at ${outcome.orphaned}.`
          : `NOTE: ${dest} was replaced by a regular file just before the repair, so it was left as it is (run \`qfai init --force\` again).`,
      );
      return;
    }
  }

  if (occupied && !options.force) {
    out.skipped.push(dest);
    if (previousHash !== undefined) out.recorded[out.relative] = previousHash;
    return;
  }

  if (!options.dryRun) {
    let concurrent: boolean;
    try {
      const outcome = await replaceGovernedAsset(source, dest, undefined, "create-only");
      concurrent =
        outcome === "target-changed" || (await hashAssistantAssetFile(dest)) !== shippedHash;
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
      concurrent = true;
    }
    if (concurrent) {
      out.skipped.push(dest);
      const contained = await hasRealGovernedAssistantParents(
        destRoot,
        `${ASSISTANT_DIR}/${out.relative}`,
      );
      if (contained && (await hashAssistantAssetFile(dest)) === shippedHash) {
        out.recorded[out.relative] = shippedHash;
        return;
      }
      if (previousHash !== undefined) out.recorded[out.relative] = previousHash;
      out.manualMergeNotes.push(
        `NOTE: ${formatReportPath(dest)} was created during initialization and left unchanged; keep adopter edits protected.`,
      );
      return;
    }
  }
  out.copied.push(dest);
  out.recorded[out.relative] = shippedHash;
  if (occupied) {
    // Tense follows the run: under `--dry-run` nothing was removed and nothing
    // was written, and an operator who reads only the preview must not come
    // away believing the occupied path has already been repaired.
    out.manualMergeNotes.push(
      options.dryRun
        ? `NOTE: ${dest} is occupied by something other than a regular file (a directory, a special file, a broken symlink), so it will be replaced with the shipped file (not done: --dry-run).`
        : `NOTE: ${dest} was occupied by something other than a regular file (a directory, a special file, a broken symlink), so it was replaced with the shipped file.`,
    );
  }
}

/**
 * The bytes at `filePath`, or `null` when it is not a bounded regular file.
 *
 * Bytes, not text: what comes back is spliced into the replacement verbatim.
 */
async function readExistingReadme(filePath: string): Promise<PinnedFileRead | null> {
  try {
    return await readPinnedRegularFileBytes(filePath, ASSISTANT_README_MAX_BYTES);
  } catch (err: unknown) {
    // Removed between the `lstat` above and this read. Nothing to repair, and
    // the caller's other branches all mean "leave it alone" too.
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Removes the governed files a new release withdrew, under `--force`, when the
 * project still holds exactly what qfai wrote there.
 *
 * The refresh loop walks the *current* shipped set, so it never visits the old
 * path of a file deleted or renamed upstream, and only its lock entry goes.
 * Left there, an untouched retired rule reads as `QFAI-ASSETS-006` — a file the
 * project added — from the next `validate` on, no `qfai init --force` run clears
 * it, and a rule qfai repealed stays in the tree being cited.
 *
 * A retired file whose content was edited is *not* removed: it stops being
 * qfai's the moment the project changed it, and deleting it would throw away
 * work. It keeps its recorded hash so a later `--force`, after the edit is
 * reverted, can still recognise and retire it.
 *
 * Exported for the same reason the other governed-write helpers are: the state
 * that matters here is a path the release has stopped shipping, and a test
 * cannot reach it through `runInit` while the release still ships everything
 * this list names.
 */
export async function retireWithdrawnGovernedAssets(
  destAssistant: string,
  shipped: Record<string, string>,
  previous: Record<string, string>,
  recorded: Record<string, string>,
  options: { force: boolean; dryRun: boolean },
  isContained: (relative: string) => Promise<boolean>,
  out: { removed: string[]; skipped: string[]; manualMergeNotes: string[] },
): Promise<void> {
  for (const [relative, previousHash] of Object.entries(previous)) {
    if (relative in shipped) {
      continue;
    }
    if (aliasesShippedGovernedAsset(relative, shipped)) {
      // A case variant of a path the release still ships. On a case-insensitive
      // filesystem it names that very file, so retiring it would delete a rule
      // qfai ships. The entry is dropped from the record instead of acted on.
      continue;
    }
    const dest = path.join(destAssistant, ...relative.split("/"));
    if (!(await isContained(relative))) {
      out.skipped.push(dest);
      out.manualMergeNotes.push(escapedGovernedPathNote(dest));
      continue;
    }
    if (ADOPTER_OWNED_ASSETS.has(relative) || LEGACY_ADOPTER_OWNED_CATALOG_ASSETS.has(relative)) {
      // A release that stops shipping one of these still does not own what the
      // project wrote in it. Retirement decides by hash, so a lock holding the
      // adopted content would make the project's own document read as an
      // untouched copy of ours and be deleted. Kept and named instead; moving
      // the content is the project's call, not this command's.
      recorded[relative] = previousHash;
      out.skipped.push(dest);
      if (options.force) {
        out.manualMergeNotes.push(
          `NOTE: ${dest} is no longer shipped by this release, and its content is yours, so it was left in place. Move what you need out of it and delete it by hand.`,
        );
      }
      continue;
    }
    const currentHash = await hashAssistantAssetFile(dest);
    if (currentHash === null) {
      // Already gone (or never a readable regular file): nothing to retire,
      // and nothing left worth recording.
      continue;
    }
    if (currentHash !== previousHash) {
      recorded[relative] = previousHash;
      out.skipped.push(dest);
      if (options.force) {
        out.manualMergeNotes.push(
          `NOTE: ${dest} is no longer shipped by this release, but its content has been edited, so it was not removed (delete it by hand if you do not need it).`,
        );
      }
      continue;
    }
    if (!options.force) {
      // Keep the record so a later `--force` can still identify the file as
      // qfai's own withdrawn copy rather than a project addition.
      recorded[relative] = previousHash;
      continue;
    }
    if (options.dryRun) {
      out.removed.push(dest);
      continue;
    }
    const outcome = await retireVerifiedGovernedAsset(dest, previousHash);
    if (outcome === "removed") {
      out.removed.push(dest);
      continue;
    }
    // The pathname stopped holding the content that was checked. Whatever is
    // there now is not qfai's withdrawn copy, so it keeps its record and its
    // place, exactly as an edited retired file does.
    recorded[relative] = previousHash;
    out.skipped.push(dest);
    out.manualMergeNotes.push(
      outcome === "changed"
        ? `NOTE: ${dest} was replaced by another process just before the removal, so it was not removed.`
        : `NOTE: ${dest} was replaced by another process just before the removal, so the removal was rolled back; the original content could not be restored and is parked at ${quarantineLabel(outcome)}.`,
    );
  }
}

/**
 * Removes a withdrawn governed file, and only the exact file that was checked.
 *
 * `rm` acts on a pathname, not on the inode the hash was taken from. A process
 * that replaced the path with a new project-owned file between the two lost
 * that file to a deletion justified by somebody else's bytes. So the entry is
 * moved aside first — `rename` within the directory carries whatever inode is
 * at the path at that instant — and the hash is taken from the moved file,
 * whose name nothing else knows. What is deleted is then necessarily what was
 * inspected.
 *
 * When the moved file turns out not to be the withdrawn copy it is put back,
 * and put back only if the pathname is still free: `link` fails with `EEXIST`
 * rather than replacing whatever arrived there, so the restore cannot destroy
 * the very file this precaution exists to protect. Where hard links are not
 * available the restore falls back to `rename` guarded by a presence check.
 */
/**
 * Moves a non-regular occupant off a governed path and destroys it, and only
 * it.
 *
 * Same shape as {@link retireVerifiedGovernedAsset} and for the same reason:
 * the decision to remove was taken from a probe, and `rm` acts on the pathname
 * rather than on what the probe saw. The entry is renamed aside — atomic within
 * the directory — and then inspected. A readable regular file is put back and
 * the caller told to leave it alone; anything else is what this branch exists
 * to clear, and is deleted where nothing else can reach it.
 *
 * `link` restores only into a free pathname (`EEXIST` otherwise), so the
 * restore cannot overwrite whatever arrived in the meantime.
 */
export type GovernedDisplaceOutcome = "displaced" | "regular-file" | { orphaned: string };

/**
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface.
 */
export async function displaceUnreadableGovernedAsset(
  dest: string,
): Promise<GovernedDisplaceOutcome> {
  const directory = path.dirname(dest);
  const quarantine = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  try {
    await rename(dest, quarantine);
  } catch (error: unknown) {
    if (isEnoent(error)) {
      // Already gone: nothing occupies the path, which is what this call was
      // asked to arrange.
      return "displaced";
    }
    throw error;
  }
  if ((await hashAssistantAssetFile(quarantine)) === null) {
    await rm(quarantine, { force: true, recursive: true });
    return "displaced";
  }
  try {
    await link(quarantine, dest);
    await rm(quarantine, { force: true });
    return "regular-file";
  } catch {
    if (!(await pathExists(dest).catch(() => true))) {
      try {
        await rename(quarantine, dest);
        return "regular-file";
      } catch {
        return { orphaned: quarantine };
      }
    }
    return { orphaned: quarantine };
  }
}

export type GovernedRetireOutcome = "removed" | "changed" | { orphaned: string };

function quarantineLabel(outcome: GovernedRetireOutcome): string {
  return typeof outcome === "object" ? outcome.orphaned : "";
}

/**
 * @internal Exported for the regression test that pins the `changed` branch —
 * not part of the package's public surface. Like the refresh above it is only
 * reachable through a race. The test enters it by naming a hash the file does
 * not hold; an implementation that deleted the pathname rather than the inode
 * it checked destroys the file and fails.
 */
export async function retireVerifiedGovernedAsset(
  dest: string,
  expectedHash: string,
): Promise<GovernedRetireOutcome> {
  const directory = path.dirname(dest);
  const quarantine = path.join(directory, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`);
  try {
    await rename(dest, quarantine);
  } catch (error: unknown) {
    if (isEnoent(error)) {
      // Already gone: the deletion this call was going to make has happened.
      return "removed";
    }
    throw error;
  }
  if ((await hashAssistantAssetFile(quarantine)) === expectedHash) {
    await rm(quarantine, { force: true });
    return "removed";
  }
  try {
    await link(quarantine, dest);
    await rm(quarantine, { force: true });
    return "changed";
  } catch {
    if (!(await pathExists(dest).catch(() => true))) {
      try {
        await rename(quarantine, dest);
        return "changed";
      } catch {
        return { orphaned: quarantine };
      }
    }
    return { orphaned: quarantine };
  }
}

/**
 * The signature test's view of a body whose encoding is unknown.
 *
 * Lossy on purpose, and safe to be: the decoded string is only ever asked
 * whether init's ASCII heading and section are in it, and it is thrown away
 * afterwards. Nothing this returns is written anywhere.
 */
function decodeForDetection(bytes: Buffer): string {
  return bytes.toString("utf-8");
}

/**
 * Point the freshly written config's `testFileGlobs` at this repository's tests.
 *
 * Best-effort, and silent when it finds nothing: the template's `[]` is a valid
 * value that `QFAI-TEST-002` already explains, so a repository with no test file
 * yet is left exactly as before. An I/O failure is the same case — the config is
 * on disk and correct either way, and failing the whole init over a refinement
 * would trade a working install for an empty one.
 */
async function aimTestFileGlobsAtRepository(root: string, configPath: string): Promise<void> {
  try {
    const derived = await deriveTestFileGlobs(root);
    if (derived.length === 0) {
      return;
    }
    const before = await readFile(configPath, "utf-8");
    const after = withDerivedTestFileGlobs(before, derived);
    if (after !== before) {
      await writeConfigByRename(configPath, after);
      info(
        `config: aimed testFileGlobs at ${derived.length} test layout(s) found in this repository`,
      );
    }
  } catch {
    // Deliberately swallowed; see the docblock.
  }
}

/**
 * Replace `target` by rename, keeping its mode.
 *
 * Writing over the file truncates it first, so an `ENOSPC`, an `EIO` or a
 * signal partway through leaves a half-written `qfai.config.yaml` and no copy
 * of what it replaced — and every later `validate` and `doctor` run reads that
 * file. The content goes to a temp file beside the target and is renamed over
 * it, so any failure before the rename leaves the original exactly as it was.
 * That is what makes the caller's swallowed error safe: the refinement is
 * skipped, and the config that init already wrote stands.
 *
 * The narrower cousin of `replaceFileAtomically`, which additionally re-checks
 * the directory and the file for concurrent change. Those checks guard a merge
 * into a file the adopter owns; this one replaces a file the same init run
 * created moments earlier, and there is no older content to lose.
 */
async function writeConfigByRename(target: string, content: string): Promise<void> {
  const { mode } = await stat(target);
  const temp = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  try {
    // `O_EXCL`: the temp name is ours or nothing is written. Created `0600` and
    // widened once complete, so the content is never briefly readable under a
    // mode the original did not carry.
    const handle = await open(
      temp,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    try {
      await handle.writeFile(content, "utf-8");
      await handle.chmod(mode);
    } finally {
      await handle.close();
    }
    await rename(temp, target);
  } catch (err: unknown) {
    // The temp file is this function's alone — leaving it behind would litter
    // the project root with a partial YAML on every failed refinement.
    await rm(temp, { force: true });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// --upgrade-assistant-tree migration helper
// ---------------------------------------------------------------------------

type UpgradeResult = {
  copied: string[];
  skipped: string[];
  removed: string[];
  preservedNotes: string[];
};

async function runUpgradeAssistantTree(destRoot: string, dryRun: boolean): Promise<UpgradeResult> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  const preservedNotes: string[] = [];

  // Only known files in these legacy surfaces have relocation destinations.
  // Unknown files and other legacy surfaces remain where the project put them.
  const legacySurfaces: Array<{ name: "steering" | "instructions"; dir: string }> = [
    { name: "steering", dir: joinLegacyAssistantSteering(destRoot) },
    { name: "instructions", dir: joinLegacyAssistantInstructions(destRoot) },
  ];
  const surfaceExistence = await Promise.all(legacySurfaces.map((s) => pathExists(s.dir)));
  const anyLegacyExists = surfaceExistence.some(Boolean);
  if (!anyLegacyExists) {
    // Already-upgraded project: emit info-only note so the operator
    // sees the migration helper ran, under the same `W-USER-EDIT-PRESERVED`
    // code the preserved-edit notes use.
    preservedNotes.push(
      "  W-USER-EDIT-PRESERVED: no pre-recut surfaces (.qfai/assistant/{steering,instructions}/) found; no migration was needed.",
    );
    return { copied, skipped, removed, preservedNotes };
  }

  // Walk every legacy surface and re-locate each file into the new
  // singular assistant tree based on the name-driven classifier. User edits are
  // preserved by file copy (not overwrite); legacy files are left in
  // place AND a W-USER-EDIT-PRESERVED informational note is emitted so
  // the operator can decide when to delete the originals.
  for (let i = 0; i < legacySurfaces.length; i++) {
    if (!surfaceExistence[i]) continue;
    const surface = legacySurfaces[i];
    if (!surface) continue;
    const legacyEntries = await collectFilesRecursive(surface.dir);
    for (const legacyPath of legacyEntries) {
      const rel = path.relative(surface.dir, legacyPath);
      const target = classifyLegacySteeringEntry(rel);
      if (target === null) continue;
      const newPath = joinAssistantLayer(destRoot, target.layer, ...target.subpath.split("/"));
      if (await pathExists(newPath)) {
        // User has already authored / edited the new file — preserve it.
        skipped.push(newPath);
        preservedNotes.push(
          `  W-USER-EDIT-PRESERVED: ${path.relative(destRoot, newPath).replace(/\\/g, "/")} kept (existing user edit detected).`,
        );
        continue;
      }
      copied.push(newPath);
      if (!dryRun) {
        const body = await readFile(legacyPath, "utf-8");
        await mkdir(path.dirname(newPath), { recursive: true });
        await writeFile(newPath, body, "utf-8");
      }
    }
  }

  return { copied, skipped, removed, preservedNotes };
}

const UPGRADE_RULE_FILES = new Set([
  "constitution.md",
  "communication.md",
  "thinking.md",
  "workflow.md",
  "drift-protocol.md",
  "agent-selection.md",
  "shared-skill-delegation-baseline.md",
  "shared-skill-operating-baseline.md",
  "review-convergence.md",
  "audited-evidence-hash.md",
  "quality.md",
  "test-layers.md",
  "change-classification.md",
  "research-first-protocol.md",
  "ui-definition-protocol.md",
  "ui-procurement.md",
]);

function classifyLegacySteeringEntry(
  relPath: string,
): { layer: "rule" | "skill"; subpath: string } | null {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.includes("/")) return null;
  if (normalized === "requirements-decomposition.md") {
    return { layer: "skill", subpath: "qfai-sdd/references/requirements-decomposition.md" };
  }
  return UPGRADE_RULE_FILES.has(normalized) ? { layer: "rule", subpath: normalized } : null;
}

async function collectFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursive(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Report a legacy pre-recut tree, at the severity the running version implies.
 *
 * The wording matches `assistantTreeMigration`, so `init` and `qfai validate`
 * describe the same layout the same way in the same repository. An unconditional
 * "read-compatible for the current minor release only" would be false at and
 * past the sunset. Post-sunset the line goes to stderr.
 *
 * The exit code deliberately does not change: `init` is what a bootstrap script
 * runs, and `validate` is the surface the contract charges with failing the
 * build. Both surfaces of the tree (steering/ AND instructions/) are reported,
 * matching the validator's symmetry.
 */
async function emitLegacyAssistantSteeringSunset(destRoot: string): Promise<void> {
  const sunset = legacyAssistantSteeringSunsetLabel();
  const detected: string[] = [];
  if (await pathExists(joinLegacyAssistantSteering(destRoot))) detected.push("steering");
  if (await pathExists(joinLegacyAssistantInstructions(destRoot))) detected.push("instructions");
  if (detected.length === 0) return;
  const surfaces = detected.map((s) => `.qfai/assistant/${s}/`).join(" + ");
  // The readers no longer accept the retired layout, so this is an error
  // outright. The version stays in the message as the operator's only pointer
  // to when it started applying.
  error(
    `  D-DEPRECATED-PATH: ${surfaces} past the announced sunset (v${sunset}). Run \`qfai init --upgrade-assistant-tree\` to migrate.`,
  );
}

// ---------------------------------------------------------------------------
// AGENTS.md / CLAUDE.md — QFAI managed cross-AI rules section
// ---------------------------------------------------------------------------

/**
 * Connect an already-present `AGENTS.md` / `CLAUDE.md` to the rule masters this
 * run just seeded.
 *
 * The root templates are copied create-only, so in a repository that already
 * had either file the copy skips it and `.agents/rules/**` is written with
 * nothing pointing at it. Codex loads `AGENTS.md` and Claude Code loads
 * `CLAUDE.md`; neither discovers a directory it is never told about, so the
 * safety rules — the ones about where an agent may write and who decides a
 * release version — silently applied to fresh projects only.
 *
 * The appended block is read out of the shipped template rather than composed
 * here, so the file a fresh init receives and the file an existing project
 * gains cannot word the same rules differently. Nothing outside the markers is
 * read back or rewritten, and a run that finds the start marker (or the masters
 * already cited by hand) writes nothing at all.
 */
/** The masters' directory, relative to a project root and to the shipped tree alike. */
const AGENTS_RULES_DIR_REL = path.join(".agents", "rules");
/** The same directory as a citation spells it: with `/` on every platform. */
const AGENTS_RULES_DIR_CITATION = ".agents/rules";

/** The constitution cannot demote obligations an older or edited floor still omits. */
async function canSyncConstitution(
  rootAssets: string,
  destRoot: string,
  plannedSafetyFloor: boolean,
): Promise<boolean> {
  const relative = path.join(AGENTS_RULES_DIR_REL, "minimal-implementation.md");
  if (!(await hasRealGovernedAssistantParents(destRoot, relative.split(path.sep).join("/")))) {
    return false;
  }
  if (plannedSafetyFloor) return true;
  const [shipped, installed] = await Promise.all([
    hashAssistantAssetFile(path.join(rootAssets, relative), { allowSymlink: true }),
    hashAssistantAssetFile(path.join(destRoot, relative)),
  ]);
  return shipped !== null && shipped === installed;
}

/**
 * Brings each shipped rule master the project has not edited up to this
 * release's text.
 *
 * The root copy above is create-only, so a master whose wording changed in a
 * release never reaches a project that ran `init` before it. That is the right
 * default for a file the project owns and the wrong one for a rule, which is
 * QFAI's: the projects it fails to reach are exactly the ones running an agent
 * against the superseded text.
 *
 * What decides is the record of what `init` last wrote, not a guess from the
 * file. Bytes matching that record are untouched and may be replaced; anything
 * else is the adopter's and is reported instead of overwritten, because nothing
 * in the file tells an edit from an older release.
 *
 * The write is `replaceGovernedAsset`, for the reasons that helper exists: a
 * master left as a symlink is replaced rather than followed, a failure leaves
 * the previous rule in place, and the hash is re-read immediately before the
 * rename so a file that moved while this was deciding is reported rather than
 * discarded.
 */
async function updateUneditedRuleMasters(
  rootAssets: string,
  destRoot: string,
  dryRun: boolean,
): Promise<{ copied: string[]; skipped: string[]; installed: ReadonlySet<string> }> {
  const shippedRulesDir = path.join(rootAssets, AGENTS_RULES_DIR_REL);
  const projectRulesDir = path.join(destRoot, AGENTS_RULES_DIR_REL);
  const copied: string[] = [];
  const skipped: string[] = [];
  // The masters whose file carries the release's text once this pass is done,
  // spelled with `/` as a citation is. A summary moves only for these.
  const installed = new Set<string>();

  let plans: readonly RuleMasterPlan[];
  try {
    plans = await planRuleMasterUpdates(shippedRulesDir, projectRulesDir);
  } catch (error: unknown) {
    // A tree this run cannot read is one it must not rewrite. Say so and leave
    // every master where it is: the copy above already put the missing ones
    // there, and nothing here is required for the run to be correct. With no
    // way to tell which masters are the release's, none is reported installed,
    // which withholds every summary refresh rather than guessing one.
    info(`  NOTE: rule masters were not checked for updates (${describeError(error)})`);
    return { copied, skipped, installed };
  }

  const recorded: Record<string, string> = {};
  for (const plan of plans) {
    const target = path.join(projectRulesDir, plan.name);
    if (plan.verdict === "keep") {
      skipped.push(target);
      info(
        `  kept: ${formatReportPath(target)} (edited here, or written before this record existed)`,
      );
      // Its hash is not recorded. Recording it would make the next release read
      // the adopter's text as this run's write and replace it.
      continue;
    }
    if (plan.verdict === "removed") {
      // Not `installed`: a master that is not there has no summary to refresh
      // and no bullet to add. Its record entry is left as it stands, which is
      // what keeps the removal durable across the next run.
      skipped.push(target);
      continue;
    }
    if (plan.verdict !== "update") {
      recorded[plan.name] = plan.shippedHash;
      installed.add(`${AGENTS_RULES_DIR_CITATION}/${plan.name}`);
      continue;
    }
    if (dryRun) {
      copied.push(target);
      installed.add(`${AGENTS_RULES_DIR_CITATION}/${plan.name}`);
      info(`  would update: ${formatReportPath(target)} (rule master, unedited here)`);
      continue;
    }
    const outcome = await replaceGovernedAsset(
      path.join(shippedRulesDir, plan.name),
      target,
      plan.currentHash ?? undefined,
    );
    if (outcome === "target-changed") {
      skipped.push(target);
      info(`  kept: ${formatReportPath(target)} (changed while this run was deciding)`);
      continue;
    }
    copied.push(target);
    recorded[plan.name] = plan.shippedHash;
    installed.add(`${AGENTS_RULES_DIR_CITATION}/${plan.name}`);
  }

  if (!dryRun && plans.length > 0) {
    // Written whatever happened above, because a record missing a master is the
    // state that keeps it unreplaceable for ever.
    await writeRuleLock(projectRulesDir, { ...(await readRuleLock(projectRulesDir)), ...recorded });
  }
  return { copied, skipped, installed };
}

async function ensureAgentEntryPointRules(
  rootAssets: string,
  destRoot: string,
  dryRun: boolean,
  force: boolean,
  newlyWritten: readonly string[],
  installed: ReadonlySet<string>,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  if (!dryRun) await reclaimEntryPointStaging(destRoot);

  // A master an earlier run wrote and could not cite is owed alongside the ones
  // this run wrote. A master the project has since removed is owed nothing.
  const rulesDir = path.join(destRoot, ".agents", "rules");
  const pending = await readPendingCitations(rulesDir);
  const owed = async (entryPoint: string): Promise<string[]> => {
    const recorded = await Promise.all(
      (pending[entryPoint] ?? []).map(async (master) =>
        (await lstat(path.join(destRoot, ...master.split("/"))).then(
          () => true,
          () => false,
        ))
          ? [master]
          : [],
      ),
    );
    return [...new Set([...newlyWritten, ...recorded.flat()])].sort();
  };

  // Under `--force` the wrapper sync writes the Copilot file whole, from the
  // same source, later in this run. Editing it here first is work thrown away,
  // and its refusals would name a file this run goes on to replace.
  if (!force) {
    await updateCopilotRuleList(
      rootAssets,
      destRoot,
      dryRun,
      await owed(COPILOT_INSTRUCTIONS_ENTRY),
      installed,
      { copied, skipped },
      pending,
    );
  }

  // The review directive points at a policy file init never creates, so it is
  // owed only where the project keeps one.
  const hasReviewPolicy = await pathExists(path.join(destRoot, "REVIEW.md"));
  for (const name of AGENT_ENTRY_POINT_FILES) {
    const target = path.join(destRoot, name);
    const toCite = await owed(name);
    const existing = await readTextFileIfPresent(target);
    if (existing === null) {
      // Absent: the create-only copy above owns this case, and on a dry run
      // nothing has been written yet.
      skipped.push(target);
      continue;
    }

    const template = await readTextFileIfPresent(path.join(rootAssets, name));
    const section = template === null ? null : extractManagedRulesSection(template);
    if (section === null) {
      // The shipped template lost its markers. Appending a guessed region of it
      // would be worse than saying so: the project keeps a file that cites no
      // rule, and now knows it.
      error(
        `  WARNING: ${formatReportPath(name)} already exists and was left unchanged. The shipped template has no ` +
          `managed section, so add a reference to \`.agents/rules/\` by hand (while it is unreferenced, ` +
          `the shared rules never reach the AI's context).`,
      );
      skipped.push(target);
      continue;
    }

    if (hasUnclosedRulesSection(existing)) {
      // Begin marker, no end marker. The file reads as connected, so nothing
      // appends the section, and there is no region to insert a citation into
      // either. Saying so is what lets the project restore the marker; skipping
      // in silence leaves the rule uncited and gives the next run no reason to
      // look at the file again.
      error(
        `  WARNING: ${formatReportPath(target)} was left unchanged. It opens the managed rules section ` +
          `and never closes it, so there is no region to add a citation to. Restore the closing marker ` +
          `${QFAI_AGENT_RULES_END} at the end of that section.`,
      );
      skipped.push(target);
      continue;
    }

    if (!needsManagedRulesSection(existing, section)) {
      // The section is already there. A master this run wrote is one the file
      // cannot have cited, and so is one an earlier run recorded as owed, so its
      // bullet is added. A bullet a release wrote and the project never edited
      // takes the template's wording, as an unedited master takes the release's
      // text. Everything else is left as the project has it, including a bullet
      // it deleted or reworded.
      const refreshed = refreshSupersededRuleBullets(existing, section, installed);
      reportWithheldSummaries(target, refreshed.withheld);
      // The review directive goes in beside the citations; the project's own
      // text and the bullets it deleted are left as they are.
      const cited = addRuleCitations(refreshed.text, section, toCite);
      const reviewed = hasReviewPolicy ? addReviewPointer(cited, template) : cited;
      const merged = addEntryDirective(reviewed, template);
      const shown = new Set(citedRuleMastersOutsideCode(existing));
      const uncited = toCite.filter((master) => !shown.has(master));
      if (merged === existing) {
        if (uncited.length === 0) pending[name] = [];
        skipped.push(target);
        continue;
      }
      // Read from the citation step alone. Compared against the text the
      // pointer was added to as well, a run that only added the pointer
      // reported citing masters it had not cited, and told an operator whose
      // rewrite was refused to add citations that were already there.
      const update = {
        ...describeRuleListUpdate(
          cited !== refreshed.text,
          { review: reviewed !== cited, entry: merged !== reviewed },
          refreshed.refreshed,
        ),
        pending: uncited,
      };
      const outcome = await writeRuleListUpdate(target, existing, merged, update, destRoot, dryRun);
      if (outcome === "refused") {
        pending[name] = uncited;
        skipped.push(target);
      } else {
        if (outcome === "written") pending[name] = [];
        copied.push(target);
      }
      continue;
    }

    // No markers, and rule masters cited anyway: the project wired them in by
    // hand. Appending the section there would restate every citation the file
    // already has, so the masters it does not name go into the list it keeps
    // instead. With no markers nothing records a bullet as removed, so every
    // uncited master is one the file never named.
    if (citedRuleMastersOutsideCode(existing).length > 0) {
      const cited = new Set(citedRuleMastersOutsideCode(existing));
      const uncited = citedRuleMasters(section).filter((master) => !cited.has(master));
      const rulesAdded = addRuleCitationsToList(existing, section, uncited);
      const merged = addEntryPointDirectives(rulesAdded, template, hasReviewPolicy);
      if (rulesAdded === existing && uncited.length > 0) {
        // The file cites rules somewhere this run cannot extend — in prose, a
        // numbered list, an indented bullet. Name the missing masters instead
        // of restating existing citations. Review guidance can still be added.
        error(
          `  WARNING: ${formatReportPath(target)} cites rule masters, but not as a ` +
            `bullet list this run can add a line to, so add ${quoteList(uncited)} to it by hand.`,
        );
      }
      if (merged === existing) {
        skipped.push(target);
        continue;
      }
      const refusal = await refuseUnsafeEntryPointRewrite(target, existing, destRoot);
      if (refusal !== null) {
        // No pending note here: this branch reads the uncited masters off the
        // shipped template rather than off the copy report, so the next run
        // finds them again and tries once more.
        error(`  WARNING: ${formatReportPath(target)} was left unchanged. ${refusal}`);
        skipped.push(target);
        continue;
      }
      if (dryRun) {
        info(`  would update: ${formatReportPath(target)} (agent instructions)`);
      } else {
        const wrote = await replaceEntryPointFile(target, merged, destRoot, existing);
        if (wrote !== null) {
          error(`  WARNING: ${formatReportPath(target)} was left unchanged. ${wrote}`);
          skipped.push(target);
          continue;
        }
        pending[name] = [];
        info(`  updated: ${formatReportPath(target)} (agent instructions; existing content kept)`);
      }
      copied.push(target);
      continue;
    }

    // The append lands on the same file the edit above would have, so it takes
    // the same refusals: a link here writes through to whatever it points at.
    const appendRefusal = await refuseUnsafeEntryPointRewrite(target, existing, destRoot);
    if (appendRefusal !== null) {
      error(`  WARNING: ${formatReportPath(target)} was left unchanged. ${appendRefusal}`);
      skipped.push(target);
      continue;
    }

    if (dryRun) {
      info(`  would update: ${formatReportPath(target)} (append .agents/rules section)`);
      copied.push(target);
      continue;
    }

    // Keep every project byte; add only the separator the new section needs.
    const end = /\r\n|\n/.exec(existing)?.[0] ?? "\n";
    const separator =
      existing.length === 0 || existing.endsWith(`${end}${end}`)
        ? ""
        : existing.endsWith(end)
          ? end
          : `${end}${end}`;
    const wrote = await replaceEntryPointFile(
      target,
      addEntryPointDirectives(`${existing}${separator}${section}${end}`, template, hasReviewPolicy),
      destRoot,
      existing,
    );
    if (wrote !== null) {
      error(`  WARNING: ${formatReportPath(target)} was left unchanged. ${wrote}`);
      skipped.push(target);
      continue;
    }
    pending[name] = [];
    info(
      `  updated: ${formatReportPath(target)} (appended .agents/rules section; existing content kept)`,
    );
    copied.push(target);
  }

  // A dry run records nothing: every change above is to this run's copy alone.
  if (!dryRun) await writePendingCitations(rulesDir, pending);
  return { copied, skipped };
}

/**
 * The ceiling on the Copilot instruction file this run reads.
 *
 * Generated whole by this CLI, the file is a few kilobytes; a project that has
 * grown it past this is one whose bullet is better added by hand than buffered
 * and decoded in full for one line.
 */
const COPILOT_INSTRUCTIONS_MAX_BYTES = 512 * 1024;

/** The Copilot instruction file, as the record of owed citations names it. */
const COPILOT_INSTRUCTIONS_ENTRY = ".github/copilot-instructions.md";

/**
 * Keeps the rule list in an existing `.github/copilot-instructions.md` current.
 *
 * That file is generated whole and then skipped, so without this a rule the run
 * shipped, or a summary the template rewords, reached Codex and Claude Code and
 * not the third agent this repository says loads it. It carries no managed
 * markers — the whole file is qfai's — so a new bullet goes after the last rule
 * bullet in it, a superseded one is replaced where it stands, and the same
 * refusals apply as to the two entry points.
 */
/**
 * Names the rules this run left deleted, and how to take one back.
 *
 * Silence would read as "every shipped rule is installed", which is the state
 * the exclusion exists because the run is not in. The way back is the record
 * itself rather than a flag: the entry is what says the run wrote the file, so
 * removing it puts the master in the same position as one shipped today, and a
 * second way to say that is a second thing to keep in step.
 */
function reportRemovedRuleMasters(removed: readonly string[]): void {
  if (removed.length === 0) return;
  const named = removed.map((name) => `${AGENTS_RULES_DIR_CITATION}/${name}`).join(", ");
  info(
    `  kept deleted: ${named} (an earlier run wrote them and this project removed them; ` +
      `delete the entry from ${AGENTS_RULES_DIR_CITATION}/${RULE_LOCK_BASENAME} to take one back)`,
  );
}

/**
 * Names the masters whose summary this run left as it stands, with why.
 *
 * Silence here reads as "the summaries are current", which is the state this
 * withholding exists because the run could not reach.
 */
function reportWithheldSummaries(target: string, withheld: readonly string[]): void {
  if (withheld.length === 0) return;
  info(
    `  NOTE: ${formatReportPath(target)} keeps its summary of ${withheld.join(", ")} ` +
      `(the master here is not this release's, so the bullet describes the file beside it)`,
  );
}

async function updateCopilotRuleList(
  rootAssets: string,
  destRoot: string,
  dryRun: boolean,
  owed: readonly string[],
  installed: ReadonlySet<string>,
  report: { copied: string[]; skipped: string[] },
  pending: PendingCitations,
): Promise<void> {
  const target = path.join(destRoot, ".github", "copilot-instructions.md");
  const read = await readCopilotInstructions(target, owed, report);
  if (read.state !== "read") {
    // Absent: the wrapper sync writes it whole later in this run, citing every
    // master. Unreadable: what it owes stays owed, and a master the project has
    // since removed drops out with the rest of what is no longer owed.
    pending[COPILOT_INSTRUCTIONS_ENTRY] = read.state === "absent" ? [] : [...owed];
    return;
  }
  const existing = read.text;

  const template = await readTextFileIfPresent(path.join(rootAssets, "AGENTS.md"));
  const section = template === null ? null : extractManagedRulesSection(template);
  if (section === null) return;

  const shown = new Set(citedRuleMastersOutsideCode(existing));
  const uncited = owed.filter((master) => !shown.has(master));
  const refreshed = refreshSupersededRuleBulletsInList(existing, section, installed);
  reportWithheldSummaries(target, refreshed.withheld);
  const merged = addRuleCitationsToList(refreshed.text, section, uncited);
  if (merged === existing) {
    if (uncited.length === 0) pending[COPILOT_INSTRUCTIONS_ENTRY] = [];
    if (uncited.length > 0) {
      // A project that wrote its own Copilot instructions: no generated heading
      // and no rule bullet, so there is no list to add a line to. The wrapper
      // sync skips an existing file, so nothing else will carry these — saying
      // so is the difference between a rule the project can connect and one it
      // never hears about.
      error(
        `  WARNING: ${formatReportPath(target)} was left unchanged. It carries no rule list this run can ` +
          `add a line to, so add ${quoteList(uncited)} to it by hand.`,
      );
    }
    report.skipped.push(target);
    return;
  }
  const update = {
    ...describeRuleListUpdate(
      merged !== refreshed.text,
      { review: false, entry: false },
      refreshed.refreshed,
    ),
    pending: uncited,
  };
  const outcome = await writeRuleListUpdate(target, existing, merged, update, destRoot, dryRun);
  if (outcome === "refused") {
    pending[COPILOT_INSTRUCTIONS_ENTRY] = uncited;
    report.skipped.push(target);
  } else {
    if (outcome === "written") pending[COPILOT_INSTRUCTIONS_ENTRY] = [];
    report.copied.push(target);
  }
}

/** An existing Copilot instruction file as this run finds it. */
type CopilotInstructions =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
  | { readonly state: "read"; readonly text: string };

/**
 * The text of an existing Copilot instruction file, or why there is none this
 * run reads.
 *
 * Absent — and only absent — is not a failure: `syncIntegrationWrappers` writes
 * the file whole later in this run, from the same source.
 *
 * One open, one descriptor, a ceiling on the read. The file belongs to the
 * adopter: a FIFO blocks until a writer closes it, a device never ends, and an
 * ordinary file of any size would be buffered and decoded whole for one line.
 *
 * A file this run cannot read is reported only when it owes a citation, because
 * nothing else carries that citation into it. Without one, the only question is
 * whether a summary in it is out of date, and it may well not be: a warning on
 * every run about a file that needs nothing hides the warnings that matter.
 */
async function readCopilotInstructions(
  target: string,
  owed: readonly string[],
  report: { skipped: string[] },
): Promise<CopilotInstructions> {
  const present = await lstat(target).then(
    () => true,
    (cause: unknown) => !isEnoent(cause),
  );
  if (!present) return { state: "absent" };

  const bytes = await readBoundedRegularFile(target, COPILOT_INSTRUCTIONS_MAX_BYTES);
  if (bytes !== undefined) return { state: "read", text: bytes.toString("utf-8") };
  if (owed.length > 0) {
    error(
      `  WARNING: ${formatReportPath(target)} was left unchanged. It is not an ordinary file this run can ` +
        `read, or it is larger than ${String(COPILOT_INSTRUCTIONS_MAX_BYTES)} bytes.${pendingNote(owed)}`,
    );
    report.skipped.push(target);
  }
  return { state: "unreadable" };
}

/** An update to a rule list, worded for each place the run reports it. */
type RuleListUpdate = {
  /** What a dry run says it would do. */
  readonly planned: string;
  /** What the run says it did. */
  readonly done: string;
  /** What a refusal leaves to the operator, as a sentence opening. */
  readonly byHand: string;
};

/**
 * The wording for an update that cites newly shipped masters, refreshes
 * superseded summaries, or both.
 *
 * The report names every edit the write makes, so the "nothing else changed" it
 * closes with stays true.
 */
function describeRuleListUpdate(
  cited: boolean,
  directives: { review: boolean; entry: boolean },
  refreshed: readonly string[],
): RuleListUpdate {
  const planned: string[] = [];
  const done: string[] = [];
  const byHand: string[] = [];
  if (cited) {
    planned.push("cite the newly shipped rule masters");
    done.push("cited the newly shipped rule masters");
    byHand.push("add the rule citations");
  }
  for (const [added, name] of [
    [directives.entry, "entry"],
    [directives.review, "review"],
  ] as const) {
    if (!added) continue;
    planned.push(`add the ${name} directive`);
    done.push(`added the ${name} directive`);
    byHand.push(`add the ${name} directive`);
  }
  if (refreshed.length > 0) {
    const summaries = `${refreshed.length === 1 ? "summary" : "summaries"} of ${quoteList(refreshed)}`;
    planned.push(`refresh the unedited ${summaries}`);
    done.push(`refreshed the unedited ${summaries}`);
    byHand.push(`refresh the ${summaries}`);
  }
  const clause = byHand.join(" and ");
  return {
    planned: planned.join("; "),
    done: done.join("; "),
    byHand: `${clause.charAt(0).toUpperCase()}${clause.slice(1)}`,
  };
}

/** How a rule-list write ended: on disk, only reported on a dry run, or refused. */
type RuleListWrite = "written" | "planned" | "refused";

/**
 * Writes an updated rule list through the refusals every entry-point rewrite
 * takes, and reports the outcome.
 *
 * `pending` names the citations a refusal leaves owed, for the refusal to say
 * they are kept; the caller records them for a later run. A superseded summary
 * is not among them: a later run finds it again.
 *
 * Returns whether the file was written, would be on a dry run, or was refused.
 */
async function writeRuleListUpdate(
  target: string,
  existing: string,
  merged: string,
  update: RuleListUpdate & { readonly pending: readonly string[] },
  destRoot: string,
  dryRun: boolean,
): Promise<RuleListWrite> {
  const refusal = await refuseUnsafeEntryPointRewrite(target, existing, destRoot, update.byHand);
  if (refusal !== null) {
    error(
      `  WARNING: ${formatReportPath(target)} was left unchanged. ${refusal}${pendingNote(update.pending)}`,
    );
    return "refused";
  }
  if (dryRun) {
    info(`  would update: ${formatReportPath(target)} (${update.planned})`);
    return "planned";
  }
  const wrote = await replaceEntryPointFile(target, merged, destRoot, existing);
  if (wrote !== null) {
    error(
      `  WARNING: ${formatReportPath(target)} was left unchanged. ${wrote}${pendingNote(update.pending)}`,
    );
    return "refused";
  }
  info(`  updated: ${formatReportPath(target)} (${update.done}; nothing else changed)`);
  return "written";
}

/** A list of paths as the messages write them. */
function quoteList(paths: readonly string[]): string {
  return paths.map((entry) => "`" + entry + "`").join(", ");
}

/**
 * What a refused rewrite leaves owed, appended to the refusal.
 *
 * A master this run copied is one no later copy offers again: the file is on
 * disk, so the next copy skips it. The run records the masters it could not
 * cite instead, and a later run cites them once the file can be rewritten,
 * which is what the note tells the reader to expect.
 */
function pendingNote(masters: readonly string[]): string {
  if (masters.length === 0) return "";
  return ` The citations of ${quoteList(masters)} are kept, and a later run adds them once the file can be rewritten.`;
}
/**
 * The name shape `replaceEntryPointFile` stages under.
 *
 * The prefix, the identifiers `randomUUID` writes — version 4, variant `8` to
 * `b` — and the suffix. A looser pattern matches names the writer could never
 * have produced, and this loop deletes what it matches.
 */
const ENTRY_POINT_STAGING =
  /^\.qfai-entry-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/;

/** How long a staging file must have sat still before a run reclaims it. */
const ENTRY_POINT_STAGING_STALE_MS = 60 * 60 * 1000;

/**
 * Removes staging files an interrupted run left beside an entry point.
 *
 * The writer below stages next to its target so the rename is atomic, and
 * clears the staging file when the write itself fails. A process killed between
 * the write and the rename never reaches that, and what it leaves behind is a
 * full copy of the project's instructions sitting untracked in the repository
 * root.
 *
 * Two things bound what it removes. The name has to be one the writer could
 * have produced, and the file has to have sat still long enough that no run is
 * using it: a second init started a moment ago stages under the same shape, and
 * deleting its file makes its rename fail and loses the citation it was
 * writing. A file that will not delete is not worth stopping an init over.
 */
async function reclaimEntryPointStaging(destRoot: string): Promise<void> {
  for (const dir of [destRoot, path.join(destRoot, ".github")]) {
    // The rewrite refuses a linked path component and so does this. A linked
    // `.github` would have the loop reading and deleting inside whatever it
    // points at, which is a directory this project does not own.
    if ((await firstLinkedComponent(dir, destRoot)) !== null) continue;
    const entries = await readdir(dir).catch(() => []);
    for (const entry of entries) {
      if (!ENTRY_POINT_STAGING.test(entry)) continue;
      const staging = path.join(dir, entry);
      const written = await lstat(staging).catch(() => null);
      if (written === null || !written.isFile()) continue;
      if (Date.now() - written.mtimeMs < ENTRY_POINT_STAGING_STALE_MS) continue;
      await rm(staging, { force: true }).catch(() => {
        // Left for the next run to try again; it is not this run's to report.
      });
    }
  }
}

/**
 * Writes one host's reminder hooks: Claude Code's `.claude/settings.json` or
 * Codex's `.codex/hooks.json`, as `relativePath` names.
 *
 * The template does not sit under `root/`, and cannot: everything the root copy
 * writes into `.claude/` or `.codex/` is a wrapper another step owns, and the
 * assets guardrail keeps both directories out of the root template so the two
 * never compete for them. These are read directly, beside
 * `.github/instructions/`.
 *
 * So both cases are handled here rather than one here and one in the copy. A
 * project without the file gets the whole template. One that has its own
 * gets the hook groups it lacks, appended after whatever it already declares,
 * and each group an earlier release wrote is replaced where it stands. A group
 * the project edited is kept and named in the output.
 *
 * Every refusal is reported rather than silently absorbed, and none of them ends
 * the run. A reminder is worth less than the rest of what `qfai init` writes, so
 * a settings file this cannot read or cannot understand is left exactly as it
 * is, the operator is told which entries to add by hand, and init carries on.
 */
async function ensureReminderHooks(
  assetsRoot: string,
  destRoot: string,
  relativePath: string,
  dryRun: boolean,
): Promise<{ copied: string[]; skipped: string[] }> {
  const segments = relativePath.split("/");
  const target = path.join(destRoot, ...segments);
  // Messages below name the constant relative path, never `target`. An absolute
  // path carries the destination directory's own name, which on an untrusted
  // repository can hold a newline or an ANSI escape and forge this report's
  // headings. `report()` prints the absolute paths, through `formatReportPath`.
  const shown = relativePath;

  const template = await readSettingsText(path.join(assetsRoot, ...segments));
  if (template.kind !== "text") {
    const why =
      template.kind === "absent"
        ? "the shipped hook template is missing from this install"
        : `the shipped hook template could not be read (${template.reason})`;
    error(
      `  WARNING: ${shown} was left unchanged: ${why}, so the reminder hooks are ` +
        `not wired up.`,
    );
    return { copied: [], skipped: [target] };
  }

  // A symbolic link anywhere on the path, the file itself included and dangling
  // or not, would carry this read and write out of the project: a checked-in
  // `.codex -> ~/.codex` is enough to rewrite the user's own hook file.
  if ((await findUnsafeHostFileComponent(destRoot, segments)) !== undefined) {
    error(
      `  WARNING: ${shown} was left unchanged: it, or a directory above it, is a symbolic link ` +
        `or not a directory, so the reminder hooks are not wired up.`,
    );
    return { copied: [], skipped: [target] };
  }

  const existing = await readSettingsText(target);
  if (existing.kind === "unreadable") {
    error(
      `  WARNING: ${shown} was left unchanged (${existing.reason}). Copy the \`hooks\` entries from ` +
        `the shipped template by hand to enable the reminder hooks.`,
    );
    return { copied: [], skipped: [target] };
  }
  if (existing.kind === "absent") {
    // Booked into `copied` and nothing more: the create-only root copy announces
    // every other seeded file the same way, through the run report alone.
    if (!dryRun) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, template.text, "utf-8");
    }
    return { copied: [target], skipped: [] };
  }

  const merged = mergeDocumentationClarityHooks(existing.text, template.text);
  if (merged.outcome === "unreadable") {
    error(
      `  WARNING: ${shown} was left unchanged (${merged.reason}). Copy the \`hooks\` entries from ` +
        `the shipped template by hand to enable the reminder hooks.`,
    );
    return { copied: [], skipped: [target] };
  }
  // Every run, so an edited reminder is never mistaken for one this release wrote.
  for (const group of merged.edited) {
    info(`  kept: ${shown} hook group ${group} (edited here)`);
  }
  if (merged.outcome === "already-present") {
    return { copied: [], skipped: [target] };
  }

  const events = merged.events.join(", ");
  if (dryRun) {
    info(`  would update: ${shown} (reminder hooks: ${events})`);
    return { copied: [target], skipped: [] };
  }
  await writeFile(target, serializeClaudeSettings(merged.settings), "utf-8");
  info(`  updated: ${shown} (reminder hooks: ${events}; existing settings kept)`);
  return { copied: [target], skipped: [] };
}

/**
 * What reading a settings file produced: its text, nothing there, or a fault.
 *
 * `readTextFileIfPresent` collapses the last two into a throw, which is right
 * for a file init must have and wrong for this one. A settings file a
 * permission or a file type keeps this from reading is a file to leave alone
 * and report — not a reason to abandon the rest of an init run.
 */
type SettingsRead =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable"; readonly reason: string };

/**
 * The component that keeps a file init writes into a host directory, such as
 * a hook file or `.github/copilot-instructions.md`, from being read or
 * written: a directory on its path that is a symbolic link or not a directory,
 * or the file itself when it is a symbolic link, whether its target exists or
 * not. `undefined` when the path is safe.
 */
async function findUnsafeHostFileComponent(
  destRoot: string,
  segments: readonly string[],
): Promise<UnsafeComponent | undefined> {
  const parent = segments.slice(0, -1).join("/");
  const unsafeParent =
    parent === "" ? undefined : await findUnsafeWrapperComponent(destRoot, parent);
  if (unsafeParent !== undefined) {
    return unsafeParent;
  }
  const leaf = await safeLstat(path.join(destRoot, ...segments));
  return leaf?.isSymbolicLink() === true
    ? { relativePath: segments.join("/"), symlink: true }
    : undefined;
}

async function readSettingsText(target: string): Promise<SettingsRead> {
  try {
    return { kind: "text", text: await readFile(target, "utf-8") };
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return { kind: "absent" };
    }
    const code = hasErrnoCode(err) ? err.code : "read failed";
    return { kind: "unreadable", reason: code };
  }
}

/**
 * Absolute paths as report-ready relative ones: deduplicated and sorted.
 *
 * `collectTemplateFiles()` accumulates `readdir()` results, whose order no
 * filesystem guarantees, so two runs over the same tree could list the same
 * write set in different orders — leaving a `--dry-run` preview that cannot be
 * diffed against another checkout and snapshots that churn with no change in
 * content. Sorting the relative form rather than the absolute one keeps the
 * order the reader sees the order that is sorted.
 *
 * The relative form comes from `toRelativePath()` rather than `path.relative()`
 * so a Windows run reports `.qfai/assistant/...` and not
 * `.qfai\\assistant\\...`: the report is copied into issues and diffed between
 * checkouts, so one separator on every platform is the only comparable form.
 */
function toReportPaths(paths: string[], baseDir: string): string[] {
  return [...new Set(paths.map((absolute) => toRelativePath(baseDir, absolute)))].sort();
}

/**
 * The skip set with everything the run wrote taken out of it.
 *
 * De-duplicating each list on its own only settles repeats *within* a list; the
 * two lists can still name the same path. On a real `--upgrade-assistant-tree`
 * run the migration writes its destination and books it into `copied`, and the
 * template copy that follows finds that destination present and books the same
 * path into `skipped` — so one path was reported as both written and skipped,
 * and the skip count (the number shown when `--verbose` is off, and therefore
 * the only thing most operators see) was too high by one per migrated file.
 *
 * A write beats a skip: some producer did act on the path, so the categories
 * are resolved in the writer's favour rather than reported twice. `written` is
 * already relative, deduplicated and sorted, so the survivors keep their order.
 */
function excludeWritten(skippedPaths: string[], writtenPaths: string[]): string[] {
  const written = new Set(writtenPaths);
  return skippedPaths.filter((relative) => !written.has(relative));
}

function listReportPaths(relativePaths: string[]): void {
  for (const relative of relativePaths) {
    info(`    - ${formatReportPath(relative)}`);
  }
}

/**
 * The run report. The `copied` side is the one worth detailing.
 *
 * `--dry-run` exists to answer "what will this touch?", so `copied` is listed
 * in full like `removed`, and the heading changes with dryRun. `skipped`, in
 * contrast, is the "nothing to do here" case: a no-op rerun on an initialized
 * directory puts every shipped asset there. By default it is folded into a
 * count, and the list sits behind `--verbose`.
 *
 * The headings are `written` / `would write` because `copied` is not only newly
 * created files. Regenerating skills/agents with `--force` and appending the
 * managed block to `.gitignore` update existing files, and calling them
 * `created` would make a dry-run preview show a destructive overwrite as a new
 * file.
 *
 * Each list is deduplicated and then sorted before it is listed
 * (`toReportPaths`). For example, under `--upgrade-assistant-tree --dry-run`
 * the migration suppresses its writes but still pushes its destination onto
 * `copied`, and because that destination does not exist yet, the following
 * template copy pushes the same path onto `copied` too. Listing the duplicate
 * would make the count differ from a real run. The order comes from
 * `readdir()`, which no file system guarantees, so without sorting the same set
 * of writes could be listed in a different order and a preview could not be
 * diffed against one from another checkout.
 *
 * Deduplicating within a list does not remove duplicates across categories.
 * In a real `--upgrade-assistant-tree` run the migration writes its destination
 * and pushes it onto `copied`, and the following template copy treats that
 * destination as existing and pushes it onto `skipped`, so the same path shows
 * up under both written and skipped and inflates the skipped count. A written
 * path is not a skip, so `excludeWritten` removes it from skipped.
 *
 * These three lists cover only paths under `baseDir`. A change outside the
 * working tree (`core.symlinks` in `configureGitSymlinks`) does not belong
 * here, so that write discloses itself.
 */
function report(
  copied: string[],
  skipped: string[],
  removed: string[],
  dryRun: boolean,
  label: string,
  baseDir: string,
  verbose: boolean,
): void {
  const writtenPaths = toReportPaths(copied, baseDir);
  const skippedPaths = excludeWritten(toReportPaths(skipped, baseDir), writtenPaths);
  const removedPaths = toReportPaths(removed, baseDir);

  // Always name the destination. A relative path would be "." on a bare run
  // and disclose nothing, so unlike the root= of `doctor` this prints an
  // absolute path.
  // Escaped like every path below it. `--dir` is operator-supplied and echoed
  // verbatim here, so a destination carrying a newline or an ANSI sequence could
  // forge report lines in the very report the escaping exists to make trustworthy.
  info(`qfai ${label}: ${dryRun ? "dry-run" : "done"} (dest=${formatReportPath(baseDir)})`);
  if (writtenPaths.length > 0) {
    info(`  ${dryRun ? "would write" : "written"}: ${writtenPaths.length}`);
    info(dryRun ? "  would write paths:" : "  written paths:");
    listReportPaths(writtenPaths);
  }
  if (skippedPaths.length > 0) {
    info(`  skipped: ${skippedPaths.length}`);
    if (verbose) {
      info("  skipped paths:");
      listReportPaths(skippedPaths);
    } else {
      info("  (re-run with --verbose to list the skipped paths)");
    }
  }
  if (removedPaths.length > 0) {
    info(
      `  ${dryRun ? "would remove legacy files" : "removed legacy files"}: ${removedPaths.length}`,
    );
    info(dryRun ? "  would remove paths:" : "  removed paths:");
    listReportPaths(removedPaths);
  }
}

/** The migration skill's name in earlier 2.0 releases. */
const RETIRED_MIGRATION_SKILL = "qfai-migration-spec-to-story";

/**
 * Moves the retired migration skill's directory into the skill archive.
 *
 * Nothing records what the release that shipped it wrote, so a copy the
 * project edited cannot be told from an untouched one. Moving it whole keeps
 * either, and leaves nothing under the skill tree that validate would report.
 */
async function archiveRetiredMigrationSkill(destRoot: string, dryRun: boolean): Promise<string[]> {
  const source = path.join(destRoot, ".qfai", "assistant", "skill", RETIRED_MIGRATION_SKILL);
  const target = path.join(destRoot, SKILL_ARCHIVE_DIR, RETIRED_MIGRATION_SKILL);
  const sourceStats = await lstat(source).catch(() => null);
  if (sourceStats?.isDirectory() !== true) return [];
  const shown = (entry: string) => formatReportPath(toRelativePath(destRoot, entry));
  if (
    (await firstLinkedComponent(source, destRoot)) !== null ||
    (await firstLinkedComponent(path.dirname(target), destRoot)) !== null
  ) {
    return [
      `NOTE: ${shown(source)}, a retired skill, was left in place because its path or the archive's passes through a symbolic link. Move it out of the skill tree by hand.`,
    ];
  }
  if (await pathExists(target)) {
    return [
      `NOTE: ${shown(source)}, a retired skill, was left in place because ${shown(target)} already exists. Keep the copy you need and delete the other.`,
    ];
  }
  if (!dryRun) {
    await mkdir(path.dirname(target), { recursive: true });
    await rename(source, target);
  }
  return [
    `  ${dryRun ? "would move" : "moved"} retired skill: ${shown(source)} → ${shown(target)}`,
  ];
}

async function pruneLegacySkillFiles(destRoot: string, dryRun: boolean): Promise<string[]> {
  const roots = [
    path.join(destRoot, ".qfai", "assistant", "skill"),
    path.join(destRoot, ".qfai", "assistant", "skills"),
  ];

  const legacyFiles: string[] = [];
  for (const root of roots) {
    if ((await firstLinkedComponent(root, destRoot)) !== null) continue;
    const found = await collectLegacyWorkflowFiles(root);
    legacyFiles.push(...found);
  }

  if (!dryRun) {
    for (const file of legacyFiles) {
      await rm(file, { force: true });
    }
  }

  return legacyFiles;
}

async function collectLegacyWorkflowFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectLegacyWorkflowFiles(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name === "10_workflow.md") {
      files.push(fullPath);
    }
  }

  return files;
}

/** Detects any path entry including broken symlinks (lstat-based). */
async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return false;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Git config
// ---------------------------------------------------------------------------

/**
 * Resolves the `.git/config` this init would configure, or null outside a
 * repository. `git rev-parse` resolves upward from `cwd`, so `--dir subdir`
 * inside an existing repository configures that repository rather than
 * `subdir`; naming the resolved file in the report makes that visible.
 *
 * The common git dir is what matters, not the per-worktree one: inside a
 * linked worktree the per-worktree git dir is `.git/worktrees/<name>`, which
 * holds no `config` file at all, while the local-scope write lands in the
 * common `.git/config`. Every fallback therefore stays on `--git-common-dir`
 * until the option itself runs out: git old enough to lack it is also old
 * enough to lack linked worktrees, so `--git-dir` is the common dir there.
 * All three forms may answer relative to `destRoot`, so resolve the answer.
 */
async function resolveGitConfigPath(probeDir: string): Promise<string | null> {
  const gitDir =
    (await runGitRevParse("git rev-parse --path-format=absolute --git-common-dir", probeDir)) ??
    (await runGitRevParse("git rev-parse --git-common-dir", probeDir)) ??
    (await runGitRevParse("git rev-parse --git-dir", probeDir));
  return gitDir === null ? null : path.join(path.resolve(probeDir, gitDir), "config");
}

/** Runs one `git rev-parse` form, answering null when it fails or is empty. */
async function runGitRevParse(command: string, probeDir: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(command, { cwd: probeDir, env: gitChildEnv() });
    const resolved = stdout.trim();
    return resolved === "" ? null : resolved;
  } catch {
    // Not a git repository, or a git too old for this rev-parse form.
    return null;
  }
}

/**
 * The environment the git children run in, with `GIT_CONFIG` removed.
 *
 * `GIT_CONFIG` is a historical alias for `--file`: when it is set, `git
 * config` counts it as a config-file selection, so every `--local` form here
 * dies with `error: only one config file at a time` (exit 129). The read
 * swallows that failure, but the write is the one change init makes outside
 * the working tree and the setting is what lets git expand the rules symlinks
 * on Windows — it must not be defeated by an ambient variable aimed at some
 * unrelated file. Dropping the variable pins every child to the repository
 * config that `--local` names.
 */
function gitChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GIT_CONFIG;
  return env;
}

/**
 * The directory the git probes run in: `destRoot` when it exists, otherwise
 * its nearest existing ancestor, or null when even that is unreachable.
 *
 * `--dir` may name a directory that does not exist yet. The real run creates
 * it during the template copy, which runs before this step, so the probes see
 * the enclosing repository and the write lands there. A `--dry-run` creates
 * nothing, and spawning a child in a missing `cwd` fails with ENOENT, so the
 * preview would stay silent about a write the real run performs. Walking up
 * finds the same repository, because creating a plain directory never starts
 * a new one.
 */
async function nearestExistingDir(destRoot: string): Promise<string | null> {
  let current = path.resolve(destRoot);
  for (;;) {
    try {
      if ((await stat(current)).isDirectory()) {
        return current;
      }
    } catch {
      // Missing (ENOENT), shadowed by a file (ENOTDIR), or unreadable — none
      // of which init can fix here. Keep walking; the loop ends at the root.
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Reads `core.symlinks` at one scope, answering false when it is unset.
 *
 * Both scopes matter. `--local` is the scope the write targets: an unscoped
 * read also sees global and system config, so a `true` inherited from there
 * would suppress the local pin and leave the repository dependent on a
 * setting that can be removed outside it. The unscoped read is the effective
 * value, which `--local` alone cannot predict — in a linked worktree with
 * `extensions.worktreeConfig=true`, `config.worktree` outranks the common
 * `.git/config`, so a local `true` can still resolve to `false`.
 *
 * `--bool` canonicalises the stored spelling, so the values git itself
 * accepts as true (`yes`, `on`, `1`, a valueless key) are recognised instead
 * of being rewritten as if they were unset.
 */
async function gitSymlinksEnabled(
  probeDir: string,
  scope: "local" | "effective",
): Promise<boolean> {
  const command =
    scope === "local"
      ? "git config --local --bool --get core.symlinks"
      : "git config --bool --get core.symlinks";
  try {
    const { stdout } = await execAsync(command, { cwd: probeDir, env: gitChildEnv() });
    return stdout.trim() === "true";
  } catch {
    // Exit 1 = unset. Any other failure is treated the same: write and let the
    // write's own error reporting speak.
    return false;
  }
}

/** Disclosed when the local pin is in place but something outranks it. */
const WORKTREE_OVERRIDE_NOTE =
  "  warning: the effective value of core.symlinks is still false (a worktree-scope override). " +
  "To clear it, run `git config --worktree core.symlinks true` in the linked worktree.";

/**
 * Configures `core.symlinks`, the one change init makes outside the working
 * tree, and returns the report lines that disclose it. Both modes speak: a
 * dry-run that stayed silent about `.git/config` understated the real run, and
 * a real run that stayed silent left the setting unattributable afterwards.
 */
async function configureGitSymlinks(destRoot: string, dryRun: boolean): Promise<string[]> {
  const probeDir = await nearestExistingDir(destRoot);
  if (probeDir === null) {
    return [];
  }

  const configPath = await resolveGitConfigPath(probeDir);
  if (configPath === null) {
    return [];
  }

  if (await gitSymlinksEnabled(probeDir, "local")) {
    const lines = [`  git config: core.symlinks already true (${configPath}) — left untouched`];
    if (!(await gitSymlinksEnabled(probeDir, "effective"))) {
      lines.push(WORKTREE_OVERRIDE_NOTE);
    }
    return lines;
  }

  if (dryRun) {
    return [`  would set: git config --local core.symlinks true (${configPath})`];
  }

  try {
    await execAsync("git config --local core.symlinks true", {
      cwd: probeDir,
      env: gitChildEnv(),
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "Failed to set git config --local core.symlinks true.",
        "Run the following manually:",
        "  git config --local core.symlinks true",
        `Cause: ${detail}`,
      ].join("\n"),
      { cause: err },
    );
  }

  const lines = [`  git config: core.symlinks=true (${configPath})`];
  if (!(await gitSymlinksEnabled(probeDir, "effective"))) {
    // The write landed in the common config but does not govern: only a
    // higher-precedence scope can do that, and per-worktree config is the one
    // git offers. Say so rather than reporting an enablement that is not one.
    lines.push(WORKTREE_OVERRIDE_NOTE);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Symlink-based integration sync
// ---------------------------------------------------------------------------

type SyncResult = {
  copied: string[];
  skipped: string[];
  removed: string[];
};

async function syncIntegrationWrappers(
  assistantAssetsDir: string,
  destRoot: string,
  options: WrapperSyncOptions,
): Promise<SyncResult> {
  const skills = await collectCanonicalSkillIds(assistantAssetsDir);
  const agents = await collectCanonicalAgentNames(assistantAssetsDir);

  const copied: string[] = [];
  const skipped: string[] = [];

  // Step 1: Prune deprecated wrappers (commands, prompts, old non-symlink dirs)
  const removed = options.force
    ? await pruneStaleQfaiWrappers(destRoot, skills, agents, options.dryRun)
    : [];

  // Step 2: Write copilot-instructions.md as regular file (with updated references)
  const copilotDest = path.join(destRoot, ".github", "copilot-instructions.md");
  const copilotExists = await exists(copilotDest);
  const keepCopilot = copilotExists && !options.force;
  const copilotUnsafe = keepCopilot
    ? undefined
    : await findUnsafeHostFileComponent(destRoot, COPILOT_INSTRUCTIONS_ENTRY.split("/"));
  if (keepCopilot) {
    skipped.push(copilotDest);
  } else if (copilotUnsafe !== undefined) {
    info(describeSkippedPath(COPILOT_INSTRUCTIONS_ENTRY, copilotUnsafe));
    skipped.push(copilotDest);
  } else {
    copied.push(copilotDest);
    if (!options.dryRun) {
      const existingCopilot = copilotExists ? await readTextFileIfPresent(copilotDest) : null;
      const generated = buildCopilotInstructions();
      const contents =
        existingCopilot === null || options.installedRuleMasters === undefined
          ? generated
          : keepSummariesOfKeptMasters(generated, existingCopilot, options.installedRuleMasters);
      await mkdir(path.dirname(copilotDest), { recursive: true });
      await writeFile(copilotDest, contents, "utf-8");
    }
  }

  // Step 3: Distribute Copilot review instructions (create-only, `--force` refreshes).
  //
  // These two files are qfai-authored review guidance shipped from `assets/`, not
  // project content — the same category as `copilot-instructions.md` just above and
  // as the `STANDARD_ASSET_PATHS` trees. Skipping them unconditionally meant a
  // correction to the shipped template reached new projects and nobody else, with no
  // command that would update an installed repository and no signal that it was
  // running stale guidance. `--force` is the supported refresh path.
  const instructionsFiles = ["code-review.instructions.md", "principles.instructions.md"] as const;
  // Resolved ONCE, not per file: the answer is a property of the project, and asking twice
  // reads the same manifests twice on a path that already touches the disk plenty.
  const projectLanguages = await detectProjectLanguages(destRoot);
  // Reclaim staging files an abnormally-terminated earlier run left here. A
  // crash skips `replaceWithRegularFile`'s `finally`, and every run stages under
  // a fresh name, so without this the orphans only accumulate in a tracked
  // directory. Not under `--dry-run`, which promises to change nothing.
  const instructionsDir = path.join(destRoot, ".github", "instructions");
  if (!options.dryRun) {
    await sweepStagedFiles(destRoot, instructionsDir);
  }

  for (const fileName of instructionsFiles) {
    const dest = path.join(instructionsDir, fileName);
    const alreadyExists = await pathExists(dest);
    // An overwrite is only ours to perform when the entry it lands on lives
    // inside the project. `pathExists` is lstat-based, so a leaf symlink is
    // handled below by replacing the entry — but an **ancestor** symlink
    // (`.github` or `.github/instructions` pointing at a shared directory)
    // makes `dest` resolve to somebody else's file that lstat reports as an
    // ordinary one. Without `--force` that file is skipped as pre-existing, and
    // refusing here keeps it so under `--force`. Creation is not
    // gated: writing a file where none existed destroys nothing, and gating
    // it would stop init from provisioning a deliberately shared directory.
    const escapesProject =
      alreadyExists && options.force && (await resolvesOutsideProject(destRoot, dest));
    // What `--force` may replace is stated as an ALLOWLIST, not as a list of
    // things to refuse. The contract is "update an existing instructions file
    // or the symlink entry standing in for one", and only a regular file and a
    // symlink are that. Everything else `lstat` can report is user data this
    // command was never asked to destroy: a real directory holds actual files
    // (a symlink to one reports as a link, not a directory), and a FIFO, a
    // socket or a device node is replaced outright by the `rename` below.
    // Without `--force` each of them is kept as pre-existing, and a refusal
    // list would have to name every one of them to keep it so. Declining
    // leaves the operator to resolve it.
    // `undefined` covers both "not looked at" (no `--force`, or nothing there)
    // and an `lstat` that failed after `pathExists` saw the entry — a vanished
    // entry makes this a creation, which destroys nothing.
    const existingKind = alreadyExists && options.force ? await safeLstat(dest) : undefined;
    const isReplaceableEntry =
      existingKind === undefined || existingKind.isFile() || existingKind.isSymbolicLink();
    const refuseOverwrite = escapesProject || !isReplaceableEntry;
    if (alreadyExists && (!options.force || refuseOverwrite)) {
      if (escapesProject) {
        info(
          `  skipped: ${dest} resolves outside the project (not overwritten, even with --force). ` +
            `Edit it at the link target to update it.`,
        );
      } else if (existingKind?.isDirectory() === true) {
        info(
          `  skipped: ${dest} is a directory (not deleted, even with --force). ` +
            `Move its contents aside, delete the directory, then re-run.`,
        );
      } else if (!isReplaceableEntry) {
        info(
          `  skipped: ${dest} is neither a regular file nor a symlink ` +
            `(not replaced, even with --force). Move that entry aside, then re-run.`,
        );
      }
      skipped.push(dest);
    } else {
      copied.push(dest);
      if (!options.dryRun) {
        await mkdir(path.dirname(dest), { recursive: true });
        const templateSrc = path.join(getInitAssetsDir(), ".github", "instructions", fileName);
        let content: string;
        try {
          // The shipped template carries `<!-- qfai:language-rules -->`; what lands in the
          // project must not. Filled with the rules for this project's language, or with the
          // slot removed when there are none.
          content = fillLanguageRules(
            await readFile(templateSrc, "utf-8"),
            fileName,
            projectLanguages,
          );
        } catch (err: unknown) {
          const code =
            typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
          const detail = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Failed to read the instructions template: ${templateSrc}` +
              ` (${code ?? detail}). Check that the package is installed correctly.`,
            { cause: err },
          );
        }
        await replaceWithRegularFile(dest, content);
      }
    }
  }

  // Step 4: Create skill directory symlinks
  const skillResult = await createSkillSymlinks(destRoot, skills, options);
  copied.push(...skillResult.copied);
  skipped.push(...skillResult.skipped);

  // Step 5: Create agent file symlinks
  const agentResult = await createAgentSymlinks(destRoot, agents, options);
  copied.push(...agentResult.copied);
  skipped.push(...agentResult.skipped);

  // Step 6: Generate Codex agent profiles (.codex/agents/<name>.toml)
  const codexResult = await createCodexAgentTomls(assistantAssetsDir, destRoot, agents, options);
  copied.push(...codexResult.copied);
  skipped.push(...codexResult.skipped);
  removed.push(...codexResult.removed);

  return { copied, skipped, removed };
}

async function createSkillSymlinks(
  destRoot: string,
  skills: string[],
  options: WrapperSyncOptions,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const integDir of SKILL_INTEGRATION_DIRS) {
    if (await skipsLinkedHostDir(destRoot, integDir)) {
      continue;
    }
    for (const skillId of skills) {
      const linkPath = path.join(destRoot, integDir, skillId);
      const target = path.relative(
        path.join(destRoot, integDir),
        path.join(destRoot, ".qfai", "assistant", "skill", skillId),
      );
      const legacyTarget = path.relative(
        path.join(destRoot, integDir),
        path.join(destRoot, ".qfai", "assistant", "skills", skillId),
      );
      const result = await ensureSymlink(linkPath, target, "dir", { ...options, legacyTarget });
      if (result === "created") {
        copied.push(linkPath);
      } else {
        skipped.push(linkPath);
      }
    }
  }

  return { copied, skipped };
}

async function createAgentSymlinks(
  destRoot: string,
  agents: string[],
  options: WrapperSyncOptions,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const { dir, suffix } of AGENT_INTEGRATION_CONFIGS) {
    if (await skipsLinkedHostDir(destRoot, dir)) {
      continue;
    }
    for (const agentName of agents) {
      const linkPath = path.join(destRoot, dir, `${agentName}${suffix}`);
      const target = path.relative(
        path.join(destRoot, dir),
        path.join(destRoot, ".qfai", "assistant", "agent", `${agentName}.md`),
      );
      const legacyTarget = path.relative(
        path.join(destRoot, dir),
        path.join(destRoot, ".qfai", "assistant", "agents", `${agentName}.md`),
      );
      const result = await ensureSymlink(linkPath, target, "file", { ...options, legacyTarget });
      if (result === "created") {
        copied.push(linkPath);
      } else {
        skipped.push(linkPath);
      }
    }
  }

  return { copied, skipped };
}

/**
 * Whether init writes nothing into one host directory because a directory on
 * its path is a symlink, a junction or not a directory. `mkdir`, `symlink` and
 * `writeFile` follow a linked parent, so a checked-in `.codex -> ~/.codex`
 * would have init create `skills/` there. The skip is reported and the run
 * carries on.
 */
async function skipsLinkedHostDir(destRoot: string, relativeDir: string): Promise<boolean> {
  const unsafeComponent = await findUnsafeWrapperComponent(destRoot, relativeDir);
  if (unsafeComponent === undefined) {
    return false;
  }
  info(describeSkippedPath(relativeDir, unsafeComponent));
  return true;
}

/**
 * The report line for a path init skipped. It says only what this step left
 * alone, because another step may still write elsewhere under the same link.
 */
function describeSkippedPath(skipped: string, unsafe: UnsafeComponent): string {
  const kind = unsafe.symlink ? "a symlink" : "not a directory";
  const where =
    unsafe.relativePath === skipped
      ? `${skipped} is ${kind}`
      : `${skipped} is under ${unsafe.relativePath}, which is ${kind}`;
  return `  skip: ${where}, so nothing is written there`;
}

/**
 * Writes `.codex/agents/<name>.toml`, one Codex profile per canonical agent.
 *
 * Unlike the other two agent wrappers this one cannot be a symlink — Codex
 * wants the whole body escaped into a `developer_instructions` string — so it
 * is a snapshot, and a snapshot needs a regeneration trigger. It gets the same
 * one `assistant/agent/**` has: create-only on a plain run, rewritten under
 * `--force`. Without it a correction to an agent definition reached Claude and
 * Copilot the moment it landed (they follow the symlink) and never reached
 * Codex at all.
 */
async function createCodexAgentTomls(
  assistantAssetsDir: string,
  destRoot: string,
  agents: string[],
  options: WrapperSyncOptions,
): Promise<{ copied: string[]; skipped: string[]; removed: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];

  const roster = await collectCodexAgentRoster(destRoot, agents);
  if (roster.length === 0) {
    return { copied, skipped, removed };
  }

  const wrapperDir = path.join(destRoot, ...CODEX_AGENT_WRAPPER_DIR.split("/"));
  if (await skipsLinkedHostDir(destRoot, CODEX_AGENT_WRAPPER_DIR)) {
    return { copied, skipped, removed };
  }

  for (const agentName of roster) {
    const destination = path.join(wrapperDir, `${agentName}${CODEX_AGENT_WRAPPER_SUFFIX}`);
    const destinationStats = await safeLstat(destination);
    const existing = destinationStats !== undefined;
    if (existing && !options.force) {
      skipped.push(destination);
      continue;
    }
    const occupant = describeUnwritableDestination(destinationStats);
    if (occupant !== undefined) {
      info(`  skip: ${destination} (${occupant})`);
      skipped.push(destination);
      continue;
    }

    const plan = await planCodexAgentProfile(assistantAssetsDir, destRoot, agentName, options);
    if (plan.status === "unavailable") {
      info(`  skip: ${destination} (${plan.reason})`);
      // `--force` means "make the wrappers match the canonical agents". A
      // profile we cannot regenerate is no evidence the old one is still
      // right: a stale `worker` TOML keeps exactly the write access the
      // classification guard below just refused to grant, and Codex keeps
      // loading it. So drop it rather than leave it unexplained.
      if (existing && options.force) {
        removed.push(destination);
        if (!options.dryRun) {
          await rm(destination, { recursive: true, force: true });
        }
      }
      continue;
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(destination), { recursive: true });
      // `writeFile` follows a symlink and truncates whatever it points at, so a
      // `.codex/agents/<name>.toml` committed as a link would turn the
      // documented `--force` refresh into an overwrite of an arbitrary file,
      // this repository or not. The wrapper is generator output: drop the link.
      await removeSymlinkAt(destination);
      if (!(await writeGeneratedProfile(destination, plan.toml))) {
        // The `lstat` above already refused everything that is not a regular
        // file; this is the same refusal for an entry that arrived after it.
        info(`  skip: ${destination} (${NON_REGULAR_DESTINATION})`);
        skipped.push(destination);
        continue;
      }
    }
    copied.push(destination);
  }

  if (options.force) {
    removed.push(...(await pruneOrphanCodexProfiles(wrapperDir, new Set(roster), options.dryRun)));
  }

  return { copied, skipped, removed };
}

/**
 * A path component init must not write through, relative to the project, and
 * whether it is a symlink (a junction included) or not a directory.
 */
type UnsafeComponent = { readonly relativePath: string; readonly symlink: boolean };

/**
 * The first component of `relativeDir` under `destRoot` that must not be
 * written through, or `undefined` when the whole chain is safe.
 *
 * `.codex/agents` is a path an untrusted repository controls, and a directory
 * component of it can be a symlink out of the tree — a checked-in
 * `.codex/agents -> /home/user/.config` is enough. `mkdir` follows it,
 * `writeFile` follows it, and `removeSymlinkAt` cannot see it: that guard
 * looks at the leaf `<name>.toml` only. A plain `qfai init` would then write
 * every profile into that external directory and `--force` would let
 * {@link pruneOrphanCodexProfiles} delete files there. So every component is
 * `lstat`-ed before anything is written or removed, and one link anywhere in
 * the chain skips the step whole rather than writing part of it somewhere
 * unexpected.
 *
 * A component that does not exist yet ends the walk: `mkdir` creates real
 * directories, and nothing below an absent parent can exist either.
 *
 * The answer names the component by its path relative to `destRoot`. An
 * absolute path carries the destination directory's own name, which on an
 * untrusted repository can hold a newline or an ANSI escape.
 */
async function findUnsafeWrapperComponent(
  destRoot: string,
  relativeDir: string,
): Promise<UnsafeComponent | undefined> {
  const segments = relativeDir.split("/");
  for (let depth = 1; depth <= segments.length; depth += 1) {
    const relativePath = segments.slice(0, depth).join("/");
    const stats = await safeLstat(path.join(destRoot, ...segments.slice(0, depth)));
    if (stats === undefined) {
      return undefined;
    }
    if (stats.isSymbolicLink()) {
      return { relativePath, symlink: true };
    }
    if (!stats.isDirectory()) {
      return { relativePath, symlink: false };
    }
  }
  return undefined;
}

/**
 * Deletes the generated profiles of agents that left the roster.
 *
 * The loop above only ever visits agents that still exist, so deleting an agent
 * from `assistant/agent/` left its TOML untouched — and a
 * Codex profile is a self-contained snapshot, not a symlink that goes dangling
 * with its referent. Codex alone kept loading a retired agent, write access
 * included. Scoped to `--force`, which is already the mode that rewrites this
 * tree, and to files carrying the generator's own shape so a project's
 * hand-written Codex profile survives.
 */
async function pruneOrphanCodexProfiles(
  wrapperDir: string,
  roster: Set<string>,
  dryRun: boolean,
): Promise<string[]> {
  const removed: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(wrapperDir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return removed;
    }
    throw err;
  }
  for (const entry of entries) {
    if (entry.isDirectory() || !entry.name.endsWith(CODEX_AGENT_WRAPPER_SUFFIX)) {
      continue;
    }
    const agentName = entry.name.slice(0, -CODEX_AGENT_WRAPPER_SUFFIX.length);
    if (roster.has(agentName)) {
      continue;
    }
    const target = path.join(wrapperDir, entry.name);
    const read = await readBoundedTextFile(target);
    if (read.status !== "ok" || !isGeneratedCodexAgentToml(read.content, agentName)) {
      continue;
    }
    removed.push(target);
    if (!dryRun) {
      await rm(target, { force: true });
    }
  }
  return removed;
}

type CodexAgentProfilePlan =
  { status: "render"; toml: string } | { status: "unavailable"; reason: string };

/** Renders one profile, or says why the agent cannot get one. */
async function planCodexAgentProfile(
  assistantAssetsDir: string,
  destRoot: string,
  agentName: string,
  options: WrapperSyncOptions,
): Promise<CodexAgentProfilePlan> {
  const markdown = await readCanonicalAgentMarkdown(
    assistantAssetsDir,
    destRoot,
    agentName,
    options,
  );
  if (markdown.status === "rejected") {
    return { status: "unavailable", reason: markdown.reason };
  }
  if (markdown.status === "absent") {
    return { status: "unavailable", reason: "canonical markdown not found" };
  }

  const kind = parseAgentCardKind(markdown.content, agentName);
  if (kind === null) {
    return { status: "unavailable", reason: `agent card has no valid kind for ${agentName}` };
  }

  const rendered = renderCodexAgentToml(markdown.content, kind, agentName);
  if (!rendered.ok) {
    return { status: "unavailable", reason: rendered.error };
  }
  return { status: "render", toml: rendered.toml };
}

/**
 * Every agent that deserves a Codex profile: the shipped roster plus whatever
 * the project added under `.qfai/assistant/agent/`.
 *
 * A project may declare its own agent with a canonical Markdown card, and
 * `--force` preserves the extra file rather than pruning it. Enumerating the
 * shipped assets alone left that agent with Claude and Copilot wrappers and no
 * Codex profile, which is the same one-integration-behind split this whole
 * step exists to close.
 */
async function collectCodexAgentRoster(destRoot: string, shipped: string[]): Promise<string[]> {
  const roster = new Set(shipped);
  const projectAgentsDir = path.join(destRoot, ".qfai", "assistant", "agent");
  let entries: Dirent[];
  try {
    entries = await readdir(projectAgentsDir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return [...roster].sort();
    }
    throw err;
  }
  for (const entry of entries) {
    // `isFile()` is false for the symlinked agent docs some layouts leave here,
    // so accept anything that is not a directory and reads as an agent doc.
    if (entry.isDirectory() || !entry.name.endsWith(".md") || entry.name === "README.md") {
      continue;
    }
    roster.add(entry.name.slice(0, -".md".length));
  }
  return [...roster].sort();
}

/**
 * Drops `target` when it is a symlink, leaving its referent untouched — `rm`
 * unlinks the entry, it does not follow it.
 */
async function removeSymlinkAt(target: string): Promise<void> {
  const stats = await safeLstat(target);
  if (stats?.isSymbolicLink() === true) {
    await rm(target, { force: true });
  }
}

const NON_REGULAR_DESTINATION =
  "a non-regular entry (FIFO / socket / device) is in the way, so nothing can be generated here";

/**
 * Why this destination cannot take generator output, or `undefined`.
 *
 * Absent is fine — the write creates it. A regular file is fine — it is the
 * profile being refreshed. A symlink is fine — {@link removeSymlinkAt} drops
 * the link, and the write then creates a real file beside it rather than
 * through it.
 *
 * Nothing else is. A directory failed the write `EISDIR` and aborted the run
 * with every earlier agent's profile already rewritten; a **FIFO** is worse
 * still, because `writeFile` on one blocks until a reader appears and `qfai
 * init --force` simply stops, with no diagnostic and no exit. A socket or a
 * device node fails mid-run the way the directory did. None of them is
 * generator output, so each is refused rather than replaced — a refusal costs
 * one profile, and going ahead costs the run.
 */
function describeUnwritableDestination(stats: Stats | undefined): string | undefined {
  if (stats === undefined || stats.isFile() || stats.isSymbolicLink()) {
    return undefined;
  }
  return stats.isDirectory()
    ? "a directory is in the way, so nothing can be generated here"
    : NON_REGULAR_DESTINATION;
}

/**
 * Write the profile, refusing anything that is not a regular file.
 *
 * The `lstat` before the write answers for the entry that was there then; this
 * answers for the one the write actually lands on. `O_NOFOLLOW` refuses a
 * symlink that arrived in between (`ELOOP`), `O_NONBLOCK` turns opening a FIFO
 * with no reader into `ENXIO` instead of a hang, and the `fstat` on the open
 * handle refuses a FIFO that *does* have a reader, a socket, or a device before
 * a byte is written. Returns `false` when it refuses.
 */
async function writeGeneratedProfile(destination: string, content: string): Promise<boolean> {
  const flags =
    constants.O_WRONLY |
    constants.O_CREAT |
    constants.O_TRUNC |
    (typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0) |
    (typeof constants.O_NONBLOCK === "number" ? constants.O_NONBLOCK : 0);
  let handle: FileHandle | undefined;
  try {
    handle = await open(destination, flags, 0o644);
    if (!(await handle.stat()).isFile()) {
      return false;
    }
    await handle.writeFile(content, "utf-8");
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException | null)?.code;
    // The three the guards above produce. Anything else is a real failure.
    if (code === "ELOOP" || code === "ENXIO" || code === "EISDIR") {
      return false;
    }
    throw err;
  } finally {
    await handle?.close();
  }
}

/**
 * The canonical body to snapshot, from the project's copy or the shipped asset.
 *
 * The project's copy wins on a plain run — it is what the two symlink wrappers
 * resolve to. Under `--force` the asset wins instead, because `--force` has
 * already overwritten that copy with the asset (`STANDARD_ASSET_PATHS` includes
 * `assistant/agent`) — except under `--dry-run`, where the copy is only
 * announced. Reading the destination there made the preview describe a project
 * state that the real run replaces one step earlier: a stale agent document
 * missing its `## Mission` heading had `--force --dry-run` announce the removal
 * of a profile the real `--force` regenerates.
 */
async function readCanonicalAgentMarkdown(
  assistantAssetsDir: string,
  destRoot: string,
  agentName: string,
  options: WrapperSyncOptions,
): Promise<BoundedRead> {
  const projectCopy = path.join(destRoot, ".qfai", "assistant", "agent", `${agentName}.md`);
  const shippedAsset = path.join(assistantAssetsDir, "agent", `${agentName}.md`);
  const candidates = options.force ? [shippedAsset, projectCopy] : [projectCopy, shippedAsset];
  for (const candidate of candidates) {
    const read = await readBoundedTextFile(candidate);
    if (read.status !== "absent") {
      return read;
    }
  }
  return { status: "absent" };
}

type BoundedRead =
  { status: "ok"; content: string } | { status: "absent" } | { status: "rejected"; reason: string };

/**
 * A canonical agent document is a few kilobytes of markdown; a catalog is
 * smaller still. The ceiling is generous enough that no honest input meets it
 * and small enough that a hostile one cannot exhaust memory.
 */
const MAX_CANONICAL_INPUT_BYTES = 4 * 1024 * 1024;

/** Read granularity. One chunk, reused nowhere, so the peak stays the total. */
const CANONICAL_READ_CHUNK_BYTES = 64 * 1024;

/** `O_NONBLOCK` keeps `open` off a FIFO's blocking path; Windows has neither. */
const NONBLOCKING_READ_FLAGS =
  process.platform === "win32" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NONBLOCK;

/**
 * Reads a regular file of bounded size, or says why it would not.
 *
 * Both inputs this reads are named by an untrusted repository — the roster
 * accepts whatever `.qfai/assistant/agent/` holds, symlinks included — so a
 * plain `readFile` was a hang or an OOM away: pointed at a FIFO it waits for a
 * writer that never comes, pointed at `/dev/zero` it reads until the heap is
 * gone. The file type is checked against the *opened* handle, so swapping the
 * path after the check does not get past it.
 *
 * The ceiling is applied to the bytes actually read, not to the size `fstat`
 * reports. A reported size is a claim, and on Linux a procfs file
 * (`/proc/self/pagemap`, say) is a regular file that claims 0 and then yields
 * as much as it is asked for — so a symlink pointing there passed both checks
 * and `readFile` consumed memory to the same effect as `/dev/zero`. Reading in
 * chunks and stopping one byte past the ceiling makes the bound the one thing
 * the file cannot lie about.
 *
 * `absent` for a missing file (a dangling symlink included); every other I/O
 * failure propagates.
 */
async function readBoundedTextFile(filePath: string): Promise<BoundedRead> {
  let handle: FileHandle;
  try {
    handle = await open(filePath, NONBLOCKING_READ_FLAGS);
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return { status: "absent" };
    }
    // A directory, a symlink cycle or a device with no reader is the same
    // answer as a special file: not something to snapshot. Anything else
    // (EACCES, EIO, ...) is the caller's problem, not a classification.
    if (hasErrnoCode(err) && UNREADABLE_OPEN_CODES.has(err.code)) {
      return {
        status: "rejected",
        reason: `${filePath} cannot be opened as a regular file (${err.code})`,
      };
    }
    throw err;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      return { status: "rejected", reason: `${filePath} is not a regular file` };
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(CANONICAL_READ_CHUNK_BYTES);
      const { bytesRead } = await handle.read(chunk, 0, CANONICAL_READ_CHUNK_BYTES, total);
      if (bytesRead === 0) {
        break;
      }
      total += bytesRead;
      if (total > MAX_CANONICAL_INPUT_BYTES) {
        return {
          status: "rejected",
          reason: `${filePath} exceeds the ${MAX_CANONICAL_INPUT_BYTES} byte ceiling`,
        };
      }
      chunks.push(chunk.subarray(0, bytesRead));
    }
    return { status: "ok", content: Buffer.concat(chunks, total).toString("utf-8") };
  } finally {
    await handle.close();
  }
}

const UNREADABLE_OPEN_CODES = new Set(["EISDIR", "ENOTDIR", "ELOOP", "ENXIO"]);

/**
 * True when `target`'s **containing directory** resolves outside `destRoot`.
 *
 * `lstat` answers about the last path component only, so it cannot see an
 * ancestor symlink: with `.github/instructions` pointing at a shared
 * directory, `dest` is a perfectly ordinary file — one that belongs to
 * whatever the link points at, not to this project. Both sides are
 * `realpath`ed so a project reached through a symlink (`/tmp` on macOS, a
 * junctioned checkout on Windows) is not mistaken for an escape.
 *
 * The leaf is deliberately not resolved: a symlink at `dest` itself is
 * replaced as an entry by {@link replaceWithRegularFile}, which never writes
 * through it, so it is not an escape.
 *
 * A `realpath` failure answers `true`. Not being able to prove the path stays
 * inside the project is not a licence to overwrite it.
 */
async function resolvesOutsideProject(destRoot: string, target: string): Promise<boolean> {
  let rootReal: string;
  let parentReal: string;
  try {
    rootReal = await realpath(destRoot);
    parentReal = await realpath(path.dirname(target));
  } catch {
    return true;
  }
  const relative = path.relative(rootReal, parentReal);
  // Compare whole path segments. A prefix test on `".."` also matches a
  // sibling directory whose name merely begins with two dots (`..rules`), and
  // that one is inside the project: the escape is the `..` *segment*, not the
  // characters. Getting this wrong skipped a legitimate refresh in silence.
  const escapes = relative === ".." || relative.startsWith(`..${path.sep}`);
  return escapes || path.isAbsolute(relative);
}

/** Marks a {@link replaceWithRegularFile} staging file. */
const STAGING_INFIX = ".qfai-init-";

/** The sibling path {@link replaceWithRegularFile} stages `dest` at. */
function stagingPathFor(dest: string): string {
  return `${dest}${STAGING_INFIX}${process.pid.toString(36)}-${Date.now().toString(36)}`;
}

/**
 * True for a basename {@link stagingPathFor} could have produced: a destination
 * name, the infix, then the base-36 pid and timestamp.
 *
 * Read back through the same constant the writer uses, so the sweep cannot end
 * up looking for a shape nothing writes — which would leave it passing while
 * reclaiming nothing.
 */
function isStagingName(name: string): boolean {
  const at = name.lastIndexOf(STAGING_INFIX);
  if (at <= 0) return false;
  return /^[0-9a-z]+-[0-9a-z]+$/.test(name.slice(at + STAGING_INFIX.length));
}

/**
 * Remove staging files an earlier run left behind in `dir`.
 *
 * {@link replaceWithRegularFile} deletes its own staging file on every path
 * that does not consume it — but `finally` is a JavaScript construct, and
 * SIGINT, SIGKILL, a crashed process or a power loss ends the run without
 * running one. The partial `.qfai-init-*` then stays in `.github/instructions/`,
 * which is tracked, and because each run stages under a fresh `pid`-timestamp
 * name nothing would ever reclaim it: repeated failures accumulate orphans
 * until one is committed by accident.
 *
 * Sweeping at the start of the run is what makes those names reclaimable, and
 * it is why staging can stay a **sibling** of its destination. `rename` is
 * atomic only within one filesystem, so staging under a project-root `tmp/`
 * would raise `EXDEV` wherever the two sit on different mounts — and the
 * symlink retry in `replaceWithRegularFile` removes `dest` before its second
 * `rename`, so that failure would destroy the very file the staging order
 * exists to protect. A same-directory stage plus a sweep keeps the atomic
 * replace and still leaves nothing behind.
 *
 * Only regular files whose name has the staging shape are removed, and only
 * where the entry resolves inside the project: an orphan of ours is ours to
 * reclaim, anything else in that directory is not.
 */
async function sweepStagedFiles(destRoot: string, dir: string): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // absent or unreadable — no orphan of ours is reachable there
  }
  for (const entry of entries) {
    if (!isStagingName(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if ((await safeLstat(full))?.isFile() !== true) continue;
    if (await resolvesOutsideProject(destRoot, full)) continue;
    // A leftover we cannot delete is not a reason to fail the whole init; the
    // next run tries again, and nothing downstream depends on it being gone.
    await rm(full, { force: true }).catch(() => undefined);
  }
}

/**
 * Write `content` at `dest` as a regular file, replacing whatever entry is
 * already there.
 *
 * Written to a sibling temp path and `rename`d into place, for two reasons.
 * `rename` acts on the entry rather than following it, so a symlink at `dest`
 * is replaced instead of having its target rewritten — the file a link out of
 * the project points at is one this command was never asked to touch. And the
 * content exists in full before the entry is touched, so an `ENOSPC`, an ACL
 * change or a transient I/O fault mid-write leaves the original in place; the
 * earlier remove-then-write order made those failures destroy the existing
 * entry with nothing to put back.
 *
 * The staged file is removed on every path that does not consume it, the
 * initial write included: a `writeFile` that fails after committing some bytes
 * still leaves a partial `.qfai-init-*` in a tracked directory, and one more
 * on every retry.
 *
 * **Only a regular file or a symlink is replaced.** The caller allowlists those
 * two before staging anything; this stays a second line. `rename` cannot
 * replace a real directory anyway, and the recovery below is for a *symlink* —
 * including a symlink to a directory, which `lstat` reports as a link. What
 * `rename` *would* silently take is a FIFO, a socket or a device node, so the
 * allowlist is what keeps those entries intact.
 */
async function replaceWithRegularFile(dest: string, content: string): Promise<void> {
  const tempPath = stagingPathFor(dest);
  let consumed = false;
  try {
    await writeFile(tempPath, content, "utf-8");
    try {
      await rename(tempPath, dest);
      consumed = true;
    } catch (err: unknown) {
      const existing = await safeLstat(dest);
      if (!existing?.isSymbolicLink()) {
        throw err;
      }
      // Unlinking a symlink removes the link, never its target, and `rm`
      // without `recursive` cannot take a populated directory even if the
      // check above were ever wrong. The content is already on disk, so the
      // retry is a metadata operation.
      await rm(dest, { force: true });
      await rename(tempPath, dest);
      consumed = true;
    }
  } finally {
    if (!consumed) {
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }
}

// ---------------------------------------------------------------------------
// Prune deprecated wrappers
// ---------------------------------------------------------------------------

/**
 * Basenames (the stem, without the extension) of the wrappers qfai has
 * actually written into `.claude/commands/` and `.github/prompts/`.
 *
 * Writing to these two directories ended with the move to symlinks, and init
 * never writes there now, so a name outside this closed set was certainly put
 * there by the project. Deleting by the open glob `qfai-*` removed
 * project-specific slash commands such as `.claude/commands/qfai-release.md`
 * on every `--force`.
 *
 * The converse does not hold (being in the set does not mean qfai wrote it),
 * so whether to delete is decided by {@link isInitWrittenWrapper}, which also
 * reads the body.
 */
const LEGACY_WRAPPER_STEMS: ReadonlySet<string> = new Set([
  "qfai-atdd",
  "qfai-configure",
  "qfai-discuss",
  "qfai-discussion",
  "qfai-implement",
  "qfai-pr",
  "qfai-prototyping",
  "qfai-require",
  "qfai-scenario-test",
  "qfai-sdd",
  // These were on the roster while SDD was split into three skills (before the
  // recut), so the generator of that time wrote both a command and a prompt
  // wrapper for them.
  "qfai-sdd-planning",
  "qfai-sdd-refinement",
  "qfai-spec",
  "qfai-tdd-green",
  "qfai-tdd-red",
  "qfai-tdd-refactor",
  "qfai-unit-test",
  "qfai-verify",
]);

/**
 * Whether the name is one qfai has written a wrapper under in the past.
 *
 * It depends on the name alone, so it can answer against a `readdir` snapshot,
 * which is all the `predicate` of {@link pruneMatchingEntries} can see. It does
 * not decide ownership: it only narrows the candidates, and whether to delete
 * is decided by {@link isInitWrittenWrapper}, which reads the body.
 */
function isLegacyWrapperName(name: string, suffix: string): boolean {
  if (!name.endsWith(suffix)) {
    return false;
  }
  return LEGACY_WRAPPER_STEMS.has(name.slice(0, -suffix.length));
}

/**
 * Whether the body proves that init wrote this wrapper.
 *
 * A stem shows only that qfai used the name at some point. Deleting by name
 * alone would lose user content, whether the project wrote its own
 * `.claude/commands/qfai-spec.md` or replaced an old wrapper with its own
 * text. Every wrapper qfai has shipped, in every generation, has a delegation
 * line pointing to "the canonical doc with the same stem"
 * ({@link DELEGATION_LINES}). That line is the evidence the file is generated,
 * and a file without it is left alone even when the stem matches.
 *
 * The check is an **exact match per line**. Taking the canonical path
 * appearing anywhere in the body as evidence would make a project's own
 * command of the same name look generated, and `--force` would delete it,
 * merely because its explanation, a negation or a code example mentions that
 * path. In a generated wrapper the delegation line is the whole line, so
 * there is no reason to allow a partial match.
 *
 * At most {@link WRAPPER_EVIDENCE_MAX_BYTES} of the body are read. Shipped
 * wrappers of every generation are under 1 KB, but what an ordinary file of
 * the same name is, is not ours to choose: if a huge log or a FIFO sits at
 * `qfai-spec.md`, expanding all of it into a string just to decide whether to
 * delete it could stop the whole init with an out-of-memory error. Anything
 * over the limit is kept as unable to prove ownership.
 *
 * This is passed as the `confirm` of {@link pruneMatchingEntries}, so the file
 * to read (`target`) and the name the stem comes from (`name`) are received
 * separately: once moved aside for quarantine, `target` carries the quarantine
 * name, and taking the stem from its basename would not give the original
 * wrapper name. For the same reason the check is asked twice, before and after
 * the move aside: if the file the name points to has been swapped, the second
 * answer falls to "cannot prove" and the file is restored.
 */
async function isInitWrittenWrapper(
  target: string,
  name: string,
  suffix: string,
  delegations: DelegationForms,
): Promise<boolean> {
  if (!isLegacyWrapperName(name, suffix)) {
    return false;
  }
  const stem = name.slice(0, -suffix.length);

  const body = await readWrapperEvidence(target);
  if (body === null) {
    return false;
  }

  return hasDelegationLine(body, delegations(stem));
}

/**
 * Whether any line of the body matches a delegation line for the stem
 * **byte for byte**.
 *
 * Comparing after trimming would ignore indentation, and a command of the
 * project's own that merely writes `    @.qfai/assistant/prompt/qfai-spec.md`
 * as a Markdown code example would be mistaken for a generated file and
 * deleted. In a shipped wrapper the delegation line always starts at column 0,
 * so there is no reason to allow surrounding whitespace. Only the CRLF `\r`
 * is dropped by the split.
 *
 * Lines inside a fenced code block are ignored too. Even unindented, a line
 * inside ``` is a quotation, and a project's own command that merely copied
 * the contents of an old wrapper into its doc used to be deleted as generated.
 * The wrappers qfai shipped never put the delegation line inside a fence.
 */
function hasDelegationLine(body: string, forms: readonly string[]): boolean {
  const delegations = new Set(forms);
  let open: { marker: string; length: number } | null = null;
  for (const line of body.split(/\r?\n/)) {
    const fence = FENCE_RE.exec(line);
    if (fence !== null) {
      const run = fence[1] ?? "";
      const marker = run[0] ?? "";
      const tail = fence[2] ?? "";
      if (open === null) {
        open = { marker, length: run.length };
        continue;
      }
      // CommonMark: a fence closes on the same character as the opener, at
      // least as long, on a line with only whitespace after the marker run.
      // Checking only the character and length treated a line with an info
      // string (such as a ```js written inside a ```md block, which is content
      // and not a closing fence) as the close, and then counted the quoted
      // line after it as a real delegation line.
      if (marker === open.marker && run.length >= open.length && FENCE_CLOSE_TAIL_RE.test(tail)) {
        open = null;
      }
      continue;
    }
    if (open === null && delegations.has(line)) {
      return true;
    }
  }
  return false;
}

/** A Markdown code fence line (``` or ~~~, indented 0-3 spaces, info string allowed). */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** What may follow the marker run of a closing fence: whitespace only in CommonMark. */
const FENCE_CLOSE_TAIL_RE = /^[ \t]*$/;

/** Every delegation-line form shipped on a surface for the given stem. */
type DelegationForms = (stem: string) => readonly string[];

/**
 * The delegation lines that have shipped; the form differs per surface.
 *
 * A Claude slash command uses `@<path>`; a Copilot prompt and the `SKILL.md`
 * of a skill wrapper use a bullet `- <path>`. Accepting both on every surface
 * would make even a form qfai never wrote in that place evidence of
 * ownership, and a command of the project's own that merely lists references
 * as `-.qfai/...` would be deleted.
 *
 * The canonical location moved from `assistant/prompts/<stem>.md` to
 * `assistant/skills/<stem>/SKILL.md`, and a project may still hold wrappers
 * of either generation for commands and prompts. Skill wrappers were first
 * shipped after the move, so they have a single form.
 */
const CLAUDE_COMMAND_DELEGATIONS: DelegationForms = (stem) => [
  `@.qfai/assistant/prompts/${stem}.md`,
  `@.qfai/assistant/skills/${stem}/SKILL.md`,
  `@.qfai/assistant/prompt/${stem}.md`,
  `@.qfai/assistant/skill/${stem}/SKILL.md`,
];

const GITHUB_PROMPT_DELEGATIONS: DelegationForms = (stem) => [
  `- .qfai/assistant/prompts/${stem}.md`,
  `- .qfai/assistant/skills/${stem}/SKILL.md`,
  `- .qfai/assistant/prompt/${stem}.md`,
  `- .qfai/assistant/skill/${stem}/SKILL.md`,
];

const SKILL_DOC_DELEGATIONS: DelegationForms = (id) => [
  `- .qfai/assistant/skills/${id}/SKILL.md`,
  `- .qfai/assistant/skill/${id}/SKILL.md`,
];

/**
 * The limit on how much of a wrapper body is read to decide ownership.
 *
 * Shipped `.claude/commands/*.md` wrappers are under 400 bytes and even a
 * skill wrapper's `SKILL.md` is under 1 KB, so 4 KB, the same limit the nearby
 * flattened-link check ({@link isFlattenedLink}) and the repair-sidecar
 * restore use, holds every generation whole.
 */
const WRAPPER_EVIDENCE_MAX_BYTES = 4096;

/**
 * The body read with a limit for the ownership check; `null` when it cannot be
 * read or exceeds the limit.
 *
 * As with `readPinnedRegularFile`, the limit applies to the inode actually
 * read, not the one lstat saw. Every failure here resolves to "cannot prove
 * qfai wrote it": pruning deletes, so keeping the file is the safe side when
 * the answer is unknown.
 */
async function readWrapperEvidence(filePath: string): Promise<string | null> {
  try {
    return await readPinnedRegularFile(filePath, WRAPPER_EVIDENCE_MAX_BYTES);
  } catch {
    return null;
  }
}

/**
 * Skill ids that once shipped and have left the current roster.
 *
 * init places wrappers only for skills on the shipped roster, so an entry
 * whose name is neither shipped nor retired is not something init generated.
 * A project is allowed to have its own `.qfai/assistant/skill/my-skill/` (see
 * `canonicalSkillIds` in `integrationSurface.ts`), and symlinking it from
 * `.claude/skills/my-skill` is legitimate, so an entry must not be deleted
 * just because its link target is inside the canonical tree.
 */
const RETIRED_SKILL_IDS: ReadonlySet<string> = new Set([
  "qfai-discuss",
  "qfai-migration-spec-to-story",
  "qfai-pr",
  "qfai-prototyping-full-harness",
  "qfai-require",
  "qfai-scenario-test",
  "qfai-sdd-planning",
  "qfai-sdd-refinement",
  "qfai-spec",
  "qfai-tdd-green",
  "qfai-tdd-red",
  "qfai-tdd-refactor",
  "qfai-unit-test",
]);

/**
 * Whether the entry is a skill symlink init created, judged by the link
 * target, not the name.
 *
 * A name is not evidence of ownership. `qfai-` is not a reserved prefix, and
 * the canonical roster itself includes a skill without that prefix,
 * `web-research`. Judging by name deleted a project's own
 * `.claude/skills/qfai-deploy` whole on `--force`. init creates only symlinks
 * that resolve into the canonical tree, so this is a necessary condition but
 * not a sufficient one; the caller combines it with {@link RETIRED_SKILL_IDS}.
 *
 * The target must be the **same-named child** of the canonical tree. init
 * always creates `<id> ->.qfai/assistant/skill/<id>`, and an alias such as
 * `qfai-spec ->.../skills/my-skill` was made by the project itself, so it must
 * not be deleted just because it points into the canonical tree.
 */
async function linksIntoCanonicalSkill(
  entryPath: string,
  canonicalSkill: string,
): Promise<boolean> {
  let target: string;
  try {
    target = await readlink(entryPath);
  } catch {
    // Anything unreadable cannot be proven to be qfai's, so keep it.
    return false;
  }
  return path.resolve(path.dirname(entryPath), target) === path.resolve(canonicalSkill);
}

/**
 * Whether the entry is a skill wrapper init placed. There are three forms.
 *
 * 1. **symlink**: the form init has created since the recut. Judged by the
 *    link target ({@link linksIntoCanonicalSkills}).
 * 2. **real directory**: before the recut, init distributed directories such
 *    as `.codex/skills/<id>/SKILL.md`. Looking only at symlinks would let a
 *    retired wrapper (such as `qfai-spec/`) left in a project that upgraded
 *    straight from a pre-recut release slip past the prune: its name is not on
 *    the current roster, so {@link ensureSymlink} does not overwrite it either,
 *    and after `--force` the retired instructions would still be loadable by
 *    the assistant. Ownership is decided by the same criterion as the
 *    `.claude/commands/` wrappers ({@link isInitWrittenWrapper}): every
 *    `SKILL.md` that was distributed has a delegation line to the canonical
 *    doc of the same id. A directory without it was made by the project, so
 *    it is left alone even if its name collides with a retired id.
 * 3. **flattened symlink**: in a checkout with `core.symlinks = false` a
 *    symlink becomes a regular file whose content is the target string. It is
 *    the same form the nearby {@link isFlattenedLink} handles, and it is
 *    generated by init too. Treating every regular file as not generated
 *    would leave the retired wrapper in place in such a checkout.
 *
 * The remaining regular files are repair sidecars
 * (`qfai-atdd.qfai-repair-1234`), whose names do not match a retired id, so
 * they never reach here. The prune runs before the repair, so deleting one
 * would lose the only copy a previous failed repair left behind.
 */
async function classifyInitWrittenSkillWrapper(
  entry: Dirent,
  entryPath: string,
  canonicalSkillsDirs: readonly string[],
): Promise<"link" | "directory" | null> {
  const canonicalSkills = canonicalSkillsDirs.map((dir) => path.join(dir, entry.name));
  if (entry.isSymbolicLink()) {
    for (const canonicalSkill of canonicalSkills) {
      if (await linksIntoCanonicalSkill(entryPath, canonicalSkill)) return "link";
    }
    return null;
  }
  if (entry.isDirectory()) {
    const doc = await readWrapperEvidence(path.join(entryPath, "SKILL.md"));
    return doc !== null && hasDelegationLine(doc, SKILL_DOC_DELEGATIONS(entry.name))
      ? "directory"
      : null;
  }
  if (!entry.isFile()) {
    return null;
  }
  // A flattened link is exactly what git expanded the link target to, and
  // nothing else. Compare byte for byte, as the nearby {@link isFlattenedLink}
  // does; treating "the content resolves to somewhere inside the canonical
  // tree" as enough would also delete a hand-written file made by
  // `echo '../../.qfai/assistant/skill/qfai-spec' >.claude/skills/qfai-spec`
  // and alternate spellings containing `//` or `./`.
  try {
    for (const canonicalSkill of canonicalSkills) {
      const expected = path.relative(path.dirname(entryPath), canonicalSkill);
      if (await isFlattenedLink(entryPath, expected)) return "link";
    }
    return null;
  } catch {
    // Anything unreadable cannot be proven to be qfai's, so keep it.
    // Throwing here would abort the whole init in the middle of the prune.
    return null;
  }
}

/**
 * Removes the wrapper entries QFAI itself installed and no longer ships.
 *
 * ONE ownership rule, stated where the retired-workflow prune states it: a name
 * selects candidates, and never authorises a delete. The `qfai-` prefix is a
 * reservation notice, so a prefix predicate is forbidden here too — an adopter's
 * own `.claude/commands/qfai-release.md`, `.claude/skills/qfai-deploy/` or
 * `.github/prompts/qfai-ship.prompt.md` must survive `--force`, and each of those
 * was being deleted by one.
 *
 * What differs between the two prunes is only the EVIDENCE, because the surfaces
 * carry different receipts. A shipped workflow has a provenance entry, so its
 * evidence is the recorded digest. These wrappers predate that record and have no
 * entry, so the evidence is in the file: every generation QFAI shipped delegates
 * to the canonical doc of the same stem on a line of its own, and a file without
 * that line is the adopter's whatever its name. Both prunes ask their question
 * through {@link pruneMatchingEntries}, and therefore ask it twice — once against
 * the name, once against the object after it has been moved aside.
 *
 * The two prunes stay in separate directories on purpose. `.github/workflows/` is
 * adopter CI: nothing here enumerates it, and the shipped workflows it holds are
 * created rather than overwritten, so `--force` never rewrites a lane an adopter
 * is running.
 */
async function pruneStaleQfaiWrappers(
  destRoot: string,
  canonicalSkills: string[],
  canonicalAgents: string[],
  dryRun: boolean,
): Promise<string[]> {
  const canonical = new Set(canonicalSkills);
  const removed: string[] = [];

  // 1. Remove the .claude/commands/*.md wrappers qfai itself once wrote.
  // Name in `predicate`, ownership in `confirm` — the same split the retired-workflow
  // prune uses, and for the same reason: `predicate` only ever sees the `readdir`
  // snapshot, so a test that reads the file belongs where it is asked again after the
  // entry has been moved aside. A project file that takes the name between the snapshot
  // and the delete carries no delegation line, so the second question refuses it.
  // Neither directory is enumerated through a link, for the reason the agent prune gives.
  if (await isSymlinkFreeDirectory(destRoot, ".claude/commands")) {
    await pruneMatchingEntries(
      path.join(destRoot, ".claude", "commands"),
      (entry) => entry.isFile() && isLegacyWrapperName(entry.name, ".md"),
      removed,
      dryRun,
      (target, name) => isInitWrittenWrapper(target, name, ".md", CLAUDE_COMMAND_DELEGATIONS),
    );
  }

  // 2. Remove the .github/prompts/*.prompt.md wrappers qfai itself once wrote
  if (await isSymlinkFreeDirectory(destRoot, ".github/prompts")) {
    await pruneMatchingEntries(
      path.join(destRoot, ".github", "prompts"),
      (entry) => entry.isFile() && isLegacyWrapperName(entry.name, ".prompt.md"),
      removed,
      dryRun,
      (target, name) => isInitWrittenWrapper(target, name, ".prompt.md", GITHUB_PROMPT_DELEGATIONS),
    );
  }

  // 3. Remove the skill symlinks init installed for skills no longer shipped
  const canonicalSkillsDirs = [
    path.join(destRoot, ".qfai", "assistant", "skill"),
    path.join(destRoot, ".qfai", "assistant", "skills"),
  ];
  for (const integDir of SKILL_INTEGRATION_DIRS) {
    const fullDir = path.join(destRoot, integDir);
    if (!(await isSymlinkFreeDirectory(destRoot, integDir))) {
      continue;
    }
    const entries = await readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (canonical.has(entry.name)) {
        continue;
      }
      // A name that is neither shipped nor retired is not a skill init placed
      // a wrapper for; the project provided it, so keep it.
      if (!RETIRED_SKILL_IDS.has(entry.name)) {
        continue;
      }
      const entryPath = path.join(fullDir, entry.name);
      const kind = await classifyInitWrittenSkillWrapper(entry, entryPath, canonicalSkillsDirs);
      if (kind === null) {
        continue;
      }

      if (kind === "link") {
        removed.push(entryPath);
        if (!dryRun) {
          await rm(entryPath, { recursive: true, force: true });
        }
        continue;
      }

      // For the directory form, only `SKILL.md` was proven to be ours. The
      // project may have added its own references or notes there, and deleting
      // the directory recursively would lose them. Delete only the generated
      // file, and remove the shell only when it is left empty.
      const doc = path.join(entryPath, "SKILL.md");
      removed.push(doc);
      if (!dryRun) {
        await rm(doc, { force: true });
        await removeIfEmpty(entryPath);
      }
    }
  }

  // 4. Remove agent wrappers that name an agent this version no longer ships.
  await pruneStaleAgentWrappers(destRoot, canonicalAgents, removed, dryRun);

  return removed;
}

/**
 * Agent wrappers whose target names a canonical agent the shipped roster no
 * longer contains.
 *
 * Matched by the **resolved target**, not by the entry name: agent wrappers
 * carry a different suffix per integration directory (`.md` vs `.agent.md`),
 * so a name test cannot tell a retired wrapper from a file somebody wrote. The
 * target is the thing
 * init actually writes, and it is the same predicate `QFAI-LINK-001` reports on
 * — so detection and repair stay in agreement by construction.
 *
 * The canonical `.qfai/assistant/agent/*.md` behind a retired wrapper is
 * deliberately **not** deleted. That tree is create-only and a project may add
 * agents of its own to it; removing a file there would destroy content init
 * never wrote. `QFAI-LINK-001` says so in its remedy.
 */
async function pruneStaleAgentWrappers(
  destRoot: string,
  canonicalAgents: string[],
  removed: string[],
  dryRun: boolean,
): Promise<void> {
  const shipped = new Set(canonicalAgents.map((name) => `${name}.md`));
  const agentsDirs = [
    path.join(destRoot, ".qfai", "assistant", "agent"),
    path.join(destRoot, ".qfai", "assistant", "agents"),
  ];

  for (const { dir } of AGENT_INTEGRATION_CONFIGS) {
    const fullDir = path.join(destRoot, dir);
    if (!(await isSymlinkFreeDirectory(destRoot, dir))) {
      continue;
    }
    const entries = await readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      // A `.qfai-repair-<n>` file holds the content a failed repair preserved,
      // and is sometimes the only copy of it left. The skill-wrapper prune
      // reaches the same conclusion through `RETIRED_SKILL_IDS` — no sidecar
      // name is a retired skill id — but this prune matches on the resolved
      // target, and a sidecar holding a retired wrapper's flattened bytes
      // resolves to exactly the agent being pruned. It needs the name test.
      if (SIDECAR_RE.test(entry.name)) {
        continue;
      }
      const entryPath = path.join(fullDir, entry.name);
      const target = await agentWrapperTarget(entryPath, entry);
      if (target === null) {
        continue;
      }
      const resolved = path.resolve(fullDir, target);
      // Only an entry init itself could have written: a direct child of the
      // canonical agents directory. Anything pointing elsewhere is somebody
      // else's link, and anything pointing deeper is not a wrapper shape init
      // produces.
      if (!agentsDirs.includes(path.dirname(resolved)) || shipped.has(path.basename(resolved))) {
        continue;
      }
      // A **regular** file is a wrapper only when it holds the exact bytes init
      // writes for that target — `path.relative` from this directory, nothing
      // else. Resolving the content and comparing the destination accepted
      // `../../.qfai/assistant/agent/./retired.md`, and an absolute path to
      // the same file, as things init had written; neither is a byte sequence
      // it produces, and `--force` deleted a one-line file somebody wrote by
      // hand. `isFlattenedLink` already keeps those non-canonical spellings on
      // the preserve side, and this is a delete, so it holds the same line. A
      // symlink is left to the resolved-target test: its content is the link,
      // not a document, and `ensureSymlink` normalises it the same way.
      if (!entry.isSymbolicLink() && !isGeneratedWrapperTarget(target, fullDir, resolved)) {
        continue;
      }
      if (dryRun) {
        removed.push(entryPath);
        continue;
      }
      if (await removeJudgedAgentWrapper(entryPath, target)) {
        removed.push(entryPath);
      }
    }
  }
}

/**
 * True when `dir` is a real directory under `root` reached without crossing a
 * symlink.
 *
 * `readdir` follows a link. A `.claude/agents` — or any ancestor of it —
 * pointing at a tree outside the project therefore lists somebody else's
 * entries, while the target of an entry found there is resolved against the
 * **lexical** in-project path: a link or a one-line file living in that
 * external directory reads as a retired wrapper, and the delete that follows
 * destroys data the project never owned. `retiredWrappers` refuses to
 * enumerate a damaged directory for exactly this reason, and prune — which
 * deletes rather than reports — has to refuse too.
 *
 * An `lstat` that cannot answer counts as "do not enumerate": for a step whose
 * action is a delete, refusing is the safe direction to be wrong in. Only the
 * components **below** `root` are examined, because a project legitimately
 * sits behind a symlinked parent (`/tmp` on macOS is one).
 */
async function isSymlinkFreeDirectory(root: string, dir: string): Promise<boolean> {
  let current = root;
  for (const segment of dir.split("/")) {
    current = path.join(current, segment);
    const stats = await safeLstat(current);
    if (stats === undefined || !stats.isDirectory()) {
      return false;
    }
  }
  return true;
}

/**
 * Delete a wrapper this prune has judged, claiming its pathname first.
 *
 * Reading the target and deleting by pathname are two operations, and between
 * them another process — an editor, a second agent, a concurrent
 * `qfai init --force` — can leave a different file, or a whole directory, at
 * the same path. A delete on the strength of the earlier read then destroyed
 * content nothing had examined. `rename` is atomic against the pathname, so
 * afterwards this process holds the very entry it is about to remove: it
 * re-derives the target from what actually moved, and anything that is no
 * longer the wrapper it judged goes straight back. Same claim-then-verify
 * shape as `recreateFlattenedLink`, and the sidecar it claims carries
 * the one name prune leaves alone.
 *
 * Returns whether the wrapper was removed.
 */
async function removeJudgedAgentWrapper(entryPath: string, target: string): Promise<boolean> {
  const sidecar = await claimSidecar(entryPath);
  try {
    await rename(entryPath, sidecar);
  } catch (renameErr: unknown) {
    // Nothing moved, so the claim is a stray empty file — and it is one prune
    // deliberately leaves alone, while a later attempt sidesteps it with a
    // numbered name. Absence is a race with something else removing the
    // wrapper: there is nothing left to prune.
    await rm(sidecar, { force: true }).catch(() => undefined);
    if (isEnoent(renameErr)) {
      return false;
    }
    throw renameErr;
  }
  // What actually moved, not what `readdir` reported a moment ago. A probe that
  // cannot answer is not a licence to delete: the entry goes back, `validate`
  // reports it again, and the operator still has the file.
  const moved = await safeLstat(sidecar);
  const movedTarget =
    moved === undefined ? null : await agentWrapperTarget(sidecar, moved).catch(() => null);
  if (movedTarget !== target) {
    try {
      await restoreSidecar(sidecar, entryPath);
    } catch (restoreErr: unknown) {
      throw new Error(
        [
          `Aborted the retired-wrapper deletion but could not put the moved file back: ${entryPath}`,
          `Cause: ${describeError(restoreErr)}`,
          `The original file is at: ${sidecar}`,
        ].join("\n"),
        { cause: restoreErr },
      );
    }
    info(`  note: ${entryPath} changed after it was checked, so it was not deleted`);
    return false;
  }
  // A symlink or a small regular file — that is all the check above accepts —
  // so `recursive` would only widen this to a directory it never judged.
  await rm(sidecar, { force: true });
  return true;
}

/**
 * Whether `target` is the byte sequence init writes for a wrapper in
 * `wrapperDir` pointing at `resolved`.
 *
 * `createAgentSymlinks` builds every agent target with `path.relative`, so that
 * is the only spelling a flattened wrapper can legitimately hold. Comparing
 * resolved destinations instead accepted every other spelling of the same file
 * — a redundant `./`, a doubled separator, an absolute path — and none of those
 * are bytes init produced. Separator-insensitive on Windows only, for the same
 * reason {@link toComparableTarget} is.
 */
function isGeneratedWrapperTarget(target: string, wrapperDir: string, resolved: string): boolean {
  return toComparableTarget(target) === toComparableTarget(path.relative(wrapperDir, resolved));
}

/**
 * The path an agent wrapper points at, in either form a checkout can leave it
 * in, or `null` when the entry is not a wrapper.
 *
 * A flattened wrapper — the regular file a `core.symlinks false` checkout
 * writes, holding the target bytes — has to answer too, or a retired wrapper
 * survives the prune on exactly the platform where flattening is the default.
 * A file holding anything else (an agent document a project wrote by hand) is
 * not a wrapper and is preserved: the content has to be a single-line relative
 * path landing on a canonical agent for this to remove it.
 *
 * Takes whatever already carries the entry's kind — the `Dirent` from the
 * listing, or the `Stats` of the inode that was claimed for deletion — so the
 * second read judges the thing that moved rather than a pathname.
 */
async function agentWrapperTarget(
  entryPath: string,
  entry: Pick<Dirent, "isSymbolicLink" | "isFile">,
): Promise<string | null> {
  if (entry.isSymbolicLink()) {
    try {
      return await readlink(entryPath);
    } catch (err: unknown) {
      // Absence is a race with something else removing the entry — there is
      // nothing left to prune. Any other fault means the target could not be
      // read, and answering "not a wrapper" would silently keep it.
      if (isEnoent(err)) {
        return null;
      }
      throw err;
    }
  }
  if (!entry.isFile()) {
    return null;
  }
  const content = await readPinnedRegularFile(entryPath, 4096).catch((err: unknown) => {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  });
  // **No whitespace anywhere**, the same test `wrapperTarget` applies in the
  // validator. Git writes the target for mode `120000` verbatim, with no
  // trailing newline and none of the padding an editor or a shell `echo`
  // leaves behind — so a project's own one-line note ending in a space or a
  // tab is not a flattened wrapper. Refusing only `\r` and `\n` accepted
  // `../../.qfai/assistant/agent/custom.md ` as one, and `--force` deleted a
  // file init had never written.
  if (content === null || content.length === 0 || /\s/.test(content)) {
    return null;
  }
  return content;
}

/**
 * Remove the directory if it is empty; do nothing if anything remains.
 *
 * `ENOTEMPTY` / `EEXIST` mean project files remain. That is a normal outcome,
 * not a failure.
 */
async function removeIfEmpty(dir: string): Promise<void> {
  try {
    await rmdir(dir);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENOTEMPTY" || code === "EEXIST" || code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/**
 * The shipped and retired workflow name sets, re-exported.
 *
 * They moved to `shared/shippedWorkflowNames.ts` because `core/`'s doctor reader needs the same
 * answer and may not import from `cli/`. Without that move, the packaged-tree precondition would
 * call a gutted directory healthy, since that reader would not know what this package ships. The
 * re-export keeps this module's public surface exactly as it was.
 */
export { RETIRED_WORKFLOW_NAMES, SHIPPED_WORKFLOW_NAMES };

/**
 * Pure copy-set construction for the shipped workflow names: a name is in
 * the copy set unless its pre-run state is declined (record entry present
 * AND file absent on disk — the adopter deliberately removed it, and the
 * file is never recreated). Absent (never-installed) names stay in, and
 * adopter-owned names (present on disk without an entry) stay in as well:
 * their on-disk protection is the create-only skip, not this exclusion.
 */
export function resolveWorkflowCopySet(
  shippedNames: ReadonlySet<string>,
  record: InstallProvenanceRecord,
  presentOnDisk: ReadonlySet<string>,
): Set<string> {
  const copySet = new Set<string>();
  for (const name of shippedNames) {
    const declined = record.workflows[name] !== undefined && !presentOnDisk.has(name);
    if (!declined) {
      copySet.add(name);
    }
  }
  return copySet;
}

/**
 * Pre-copy snapshot of the shipped-workflow provenance state: the record
 * as it stood before this run, the shipped names that were absent (no
 * record entry AND no file on disk), and the shipped names present on
 * disk. This single snapshot feeds BOTH decisions — the copy-set
 * exclusion (declined names are dropped before the copy) and the record
 * write (only pre-run-absent names may gain an entry afterwards; a name
 * with an existing entry keeps it untouched, and an adopter-authored
 * file stays unrecorded because the create-only copy skips it).
 */
type ShippedWorkflowPreInitState = {
  record: InstallProvenanceRecord;
  absentNames: string[];
  presentOnDisk: Set<string>;
};

/**
 * The path components between the adopter's root and the shipped workflows, outermost first.
 */
const WORKFLOW_DIR_SEGMENTS: readonly string[] = [".github", "workflows"];

/**
 * Whether every existing component of `<destRoot>/.github/workflows` is a real directory.
 *
 * A component that is not there yet passes: the copy creates it, and a directory this run
 * created is not a link to somewhere else. A component that IS there and is a symlink — or is
 * not a directory at all — fails, because every write through it lands wherever it points,
 * and `path.resolve` cannot tell that from a write into the tree.
 *
 * `lstat`, so the link itself is inspected rather than its target.
 */
async function workflowAncestorsAreRealDirectories(destRoot: string): Promise<boolean> {
  return (await workflowAncestorIdentity(destRoot)) !== undefined;
}

/**
 * Is this copy destination a file written into the shipped workflows directory?
 *
 * `copyTemplateTree` reports ABSOLUTE destinations, so the question is asked of paths rather
 * than of leading path segments. The first version did the
 * latter: it split `/tmp/repo/.github/workflows/qfai-tests.yml` and took the first two segments
 * — `/tmp` — so the filter that was supposed to drop every written workflow after a detected
 * directory swap dropped none of them, and `recordInstalledWorkflows` recorded provenance for a
 * file that is not where the record says it is. The next run reads that name as `declined` and
 * never writes it again, so the swap costs the adopter the workflow permanently.
 *
 * A predicate rather than an inline lambda so a test can hand it absolute paths, which is what
 * the defect was made of; a source-level reading of the lambda would have accepted the broken
 * one just as readily.
 *
 * @param destination absolute path a copy wrote
 * @param destRoot the project root the copy targeted
 * @returns whether the destination is directly inside `<destRoot>/.github/workflows`
 */
export function isWorkflowDestination(destination: string, destRoot: string): boolean {
  const workflowsDir = path.resolve(path.join(destRoot, ".github", "workflows"));
  return path.resolve(path.dirname(destination)) === workflowsDir;
}
/**
 * The identity of each ancestor of the shipped workflows directory, or `undefined` if any of
 * them is not a real directory this command may write through.
 *
 * The ancestor CHECK ran once, before a copy that performs many
 * asynchronous filesystem operations, and nothing held the answer still afterwards. A
 * concurrent process that swaps `.github` or `.github/workflows` for a link between the check
 * and a write has the shipped workflow created outside the repository — `COPYFILE_EXCL`
 * refuses an existing destination and follows a linked PARENT without complaint. The
 * re-check further down stops the provenance record; it does not unwrite the file.
 *
 * So the identity is captured here and compared after the copy. Node has no `openat`, so what
 * this buys is what the artifact writers document: a swap becomes a detected swap with the
 * files it produced removed, rather than a silent write into somebody else's tree.
 *
 * An ABSENT ancestor is `null` rather than a failure: `init` creates the directory it is
 * about to fill, and absence before the copy is the ordinary first-run state. What must not
 * change is a directory that existed into a different one.
 */
export async function workflowAncestorIdentity(
  destRoot: string,
): Promise<Array<{ dev: number; ino: number } | null> | undefined> {
  const identities: Array<{ dev: number; ino: number } | null> = [];
  let current = destRoot;
  for (const segment of WORKFLOW_DIR_SEGMENTS) {
    current = path.join(current, segment);
    const inspected = await lstat(current).catch(() => undefined);
    if (inspected === undefined) {
      identities.push(null);
      continue;
    }
    if (inspected.isSymbolicLink() || !inspected.isDirectory()) {
      return undefined;
    }
    identities.push({ dev: inspected.dev, ino: inspected.ino });
  }
  return identities;
}

/**
 * Whether every ancestor that EXISTED before the copy is still the same directory.
 *
 * One that was absent and has since been created is the copy's own work. One that changed
 * identity is the swap this comparison exists to catch.
 */
export async function settleWorkflowAncestors(
  destRoot: string,
  before: Array<{ dev: number; ino: number } | null>,
): Promise<Array<{ dev: number; ino: number } | null> | undefined> {
  const after = await workflowAncestorIdentity(destRoot);
  if (after === undefined) return undefined;
  const settled: Array<{ dev: number; ino: number } | null> = [];
  for (const [index, identity] of before.entries()) {
    const observed = after[index] ?? null;
    if (identity === null) {
      // A component with no identity to compare against is a REFUSAL, not an observation.
      //
      // made this branch stop returning `true`. Settling on the post-copy
      // reading was not enough either: that reading says
      // nothing about WHICH directory the copy wrote into, so a substitute put there by another
      // process was pinned just as readily as the real one.
      //
      // The caller creates the workflow directory before the copy and reads its identity from
      // the directory it made, so on every path that writes a workflow there is nothing absent
      // here to begin with. Reaching this branch means a component vanished between that read
      // and this one, which is exactly the event the comparison exists to catch.
      return undefined;
    }
    if (observed === null || observed.dev !== identity.dev || observed.ino !== identity.ino) {
      return undefined;
    }
    settled.push(identity);
  }
  return settled;
}

/**
 * Are the workflow directory's ancestors still the ones this run settled on?
 *
 * Asked again at the moment of RECORDING, because that is the moment the claim is made. An
 * entry is a claim of ownership over a file at a path, and it outlives the run: recording
 * nothing is recoverable, recording a file that is not there is not.
 *
 * Exact equality, `null` included. A component that was absent when the identity settled and
 * exists now was created by something other than this copy, which is the same event as a swap.
 *
 * @param destRoot the project root
 * @param expected the identity settled after the copy
 * @returns whether every component is still exactly what it was
 */
async function workflowAncestorsMatch(
  destRoot: string,
  expected: Array<{ dev: number; ino: number } | null>,
): Promise<boolean> {
  const now = await workflowAncestorIdentity(destRoot);
  if (now === undefined) return false;
  return expected.every((identity, index) => {
    const observed = now[index] ?? null;
    if (identity === null || observed === null) return identity === observed;
    return observed.dev === identity.dev && observed.ino === identity.ino;
  });
}

async function captureShippedWorkflowPreInitState(
  destRoot: string,
): Promise<ShippedWorkflowPreInitState> {
  const record = await readInstallProvenance(destRoot);
  const absentNames: string[] = [];
  const presentOnDisk = new Set<string>();
  for (const name of SHIPPED_WORKFLOW_NAMES) {
    const onDisk = await exists(path.join(destRoot, ".github", "workflows", name));
    if (onDisk) {
      presentOnDisk.add(name);
    }
    if (record.workflows[name] === undefined && !onDisk) {
      absentNames.push(name);
    }
  }
  return { record, absentNames, presentOnDisk };
}

/**
 * The retired names this run may remove: the file on disk carries a
 * provenance entry AND still holds exactly the bytes QFAI recorded writing.
 *
 * Both conjuncts protect an adopter file from a name-set membership test:
 * no entry means the adopter authored the file themselves (the
 * `adopter-owned` row, never pruned), and a digest that no longer matches
 * means they edited what QFAI wrote (the `modified` row, never pruned).
 * A name that fails either test is left on disk untouched — a stale file is
 * recoverable, a deleted one is not.
 *
 * The recorded digest is returned with each name, not just the name: the prune re-asks the
 * content question against it immediately before deleting, because a decision made here and
 * acted on later is a decision about a file that may since have been replaced.
 */
async function resolvePrunableRetiredWorkflows(
  destRoot: string,
  record: InstallProvenanceRecord,
): Promise<Map<string, string>> {
  const prunable = new Map<string, string>();
  for (const name of RETIRED_WORKFLOW_NAMES) {
    const entry = record.workflows[name];
    if (entry === undefined) {
      continue;
    }
    // Bounded, regular-file-only, one descriptor. This path is adopter-controlled, and an
    // unbounded read of it hands a FIFO, a device or a multi-gigabyte file the ability to hang
    // `qfai init` or exhaust its memory — on a file the command was only deciding whether to
    // delete. Every refusal leaves the name un-pruned.
    const workflowPath = path.join(destRoot, ".github", "workflows", name);
    if ((await digestWorkflowFile(workflowPath)) === entry.sha256) {
      prunable.set(name, entry.sha256);
    }
  }
  return prunable;
}

/**
 * Read ceiling for one workflow file in an adopter tree. A shipped workflow is a few kilobytes;
 * anything past this is not one, and reading it is the exhaustion the bounded reader stops.
 */
const MAX_WORKFLOW_BYTES = 1_048_576;

/** The sha256 of a workflow file, or `undefined` for anything the bounded reader refuses. */
async function digestWorkflowFile(filePath: string): Promise<string | undefined> {
  const bytes = await readBoundedRegularFile(filePath, MAX_WORKFLOW_BYTES);
  return bytes === undefined ? undefined : createHash("sha256").update(bytes).digest("hex");
}

/**
 * Records provenance entries for the shipped workflow files this run
 * actually wrote: a name qualifies only when its pre-run state was absent
 * AND the copy primitive reported writing it, and each entry's sha256
 * digests the bytes just written. The record file is untouched when nothing
 * new was written (idempotent re-runs, declined names) and on --dry-run.
 *
 * `copiedPaths` is the copy primitive's own `copied` list, and it is the
 * ONLY evidence of a write accepted here. Reading the destination back is
 * not evidence: a create-only copy skips a path that appeared between the
 * pre-run snapshot and the copy (another process, or a dangling symlink the
 * snapshot saw as absent and whose target a later copy filled in), and the
 * read-back would then claim QFAI wrote a file it never touched — which
 * makes doctor report drift on an adopter-owned file forever.
 */
async function recordInstalledWorkflows(
  destRoot: string,
  sourceRoot: string,
  preInit: ShippedWorkflowPreInitState,
  copiedPaths: readonly string[],
  toolVersion: string,
  dryRun: boolean,
  settled: Array<{ dev: number; ino: number } | null> | undefined,
): Promise<void> {
  if (dryRun) {
    return;
  }
  if (settled === undefined) {
    return; // the copy did not settle on an identity, so there is nothing to claim ownership of
  }
  // The identity this run settled on, not merely `a real directory`.
  // The check below asks whether the ancestors are real directories, which every swapped-in
  // real directory also satisfies.
  if (!(await workflowAncestorsMatch(destRoot, settled))) {
    return;
  }
  // Asked again, here, and not only before the copy. The check that
  // refuses a linked parent runs before `copyTemplateTree`, and a link created between the
  // two would still have the copy report paths that resolve lexically into the tree. An entry
  // is a claim of OWNERSHIP, and it is the claim that outlives the run — recording nothing is
  // recoverable, recording a file outside the repository is not.
  if (!(await workflowAncestorsAreRealDirectories(destRoot))) {
    return;
  }
  const workflowsDir = path.join(destRoot, ".github", "workflows");
  const copiedNames = new Set(
    copiedPaths
      .filter((copied) => path.dirname(path.resolve(copied)) === path.resolve(workflowsDir))
      .map((copied) => path.basename(copied)),
  );
  const installedAt = new Date().toISOString();
  const added: Record<string, WorkflowProvenanceEntry> = {};
  for (const name of preInit.absentNames) {
    if (!copiedNames.has(name)) {
      continue; // the copy skipped it: a skipped file produces no entry
    }
    // Digested from the SOURCE the copy read, not from the destination re-read. The copy is
    // byte-for-byte, so the two agree at the instant of the write — and only then. Re-reading
    // the destination records whatever the file holds NOW, which is a different question: an
    // adopter or a concurrent process that rewrites the file between the copy and the read
    // gets their own content stamped as the bytes QFAI installed. Drift detection would then
    // be permanently blind to that edit, and the prune above would consider the file QFAI's to
    // delete.
    const sourceBytes = await readBoundedRegularFile(
      path.join(sourceRoot, ".github", "workflows", name),
      MAX_WORKFLOW_BYTES,
    );
    if (sourceBytes === undefined) {
      continue; // no source bytes to attest to, so no entry
    }
    added[name] = createWorkflowProvenanceEntry(sourceBytes, toolVersion, installedAt);
  }
  const addedNames = Object.keys(added);
  if (addedNames.length === 0) {
    return;
  }
  try {
    // Merged onto the record as it is on disk, under the lock — never onto `preInit.record`.
    // That snapshot was taken before the copy, and in a tree where a second `qfai init` is
    // running (a monorepo bootstrap, a CI matrix sharing a checkout, two terminals) writing it
    // back deletes every entry the other run recorded in between. Those files stay on disk with
    // no entry, which the next run reads as `adopter-owned`: never recorded again, and invisible
    // to drift detection from then on.
    await updateInstallProvenance(destRoot, (current) => ({
      ...current,
      workflows: { ...current.workflows, ...added },
    }));
  } catch (error) {
    // The file and its provenance entry land TOGETHER or neither lands. The
    // record write can still fail after the copy succeeded — `.qfai` is a
    // regular file, the directory is read-only, the disk is full — and a
    // workflow left on disk with no entry is read on the next run as
    // `adopter-owned`: the create-only copy skips it, nothing ever records it,
    // and doctor's drift check and the declined state are both lost for that
    // name permanently. Removing what this run created returns the tree to
    // `absent`, the one state a re-run repairs.
    //
    // Only the names in `added` are removed, and every one of them was absent
    // before this run AND reported written by the copy primitive, so nothing
    // here can delete a file the adopter owned. Removal failures are swallowed:
    // the original error is the one worth reporting, and a stale file is a
    // smaller loss than a masked cause.
    //
    // Through `pruneMatchingEntries` and not a direct `rm`: the shipped-workflows
    // contract keeps ONE removal primitive for QFAI-owned entries in an adopter
    // tree, and a second call site is the parallel implementation it forbids.
    // And only while they still hold the bytes this run wrote. `addedNames` is a name set, and
    // the failing record write is exactly the moment another process may have replaced one of
    // those files — rolling back on the name alone would delete their content to undo our own
    // write. The digest is the one this run attested to, so a file that no longer matches it is
    // not this run's to remove.
    const rolledBack: string[] = [];
    await pruneMatchingEntries(
      workflowsDir,
      (entry) => entry.isFile() && addedNames.includes(entry.name),
      rolledBack,
      false,
      async (target, name) => (await digestWorkflowFile(target)) === added[name]?.sha256,
    ).catch(() => undefined);
    throw error;
  }
}

/**
 * The only removal primitive for QFAI-owned entries in an adopter tree:
 * removes the direct entries of `dir` that match `predicate`, appending
 * each removed path to `removed`. Exported for reuse — the
 * shipped-workflows contract forbids parallel removal implementations.
 *
 * `confirm` is the ownership question, and it is asked TWICE: once against the path as the
 * snapshot named it, and once against the object after it has been moved aside. `predicate`
 * can only ever see the `readdir` snapshot, so a name selects candidates and never authorises
 * a delete: every caller here decides ownership by CONTENT. What counts as the content differs
 * by surface — a shipped workflow still holds the bytes QFAI recorded writing, and a legacy
 * command or prompt wrapper, which predates that record, still carries the delegation line
 * every generation of it was shipped with — but the shape of the question does not. A caller
 * with no content test passes `undefined` and gets the snapshot behaviour. `confirm` receives
 * the path to READ and, separately, the entry's original name, because after the move the two
 * differ and a caller resolving its evidence by basename would be resolving it against the
 * quarantine name.
 *
 * Why the move at all: checking a pathname, re-checking it and then
 * deleting it are three operations on a NAME, and between any two of them the adopter can put
 * their own file there: the digest that was verified and the bytes that are deleted are then
 * different objects, and the deleted one is theirs. Renaming the entry to a name nothing else
 * holds collapses the three into one object — everything after the rename acts on what was
 * moved, whatever later takes the vacated name.
 *
 * `commit` is what makes the removal a UNIT with whatever else has to happen for it. Deleting
 * the files and removing their provenance entries as two separate steps would let a
 * read-only `.qfai`, a full disk, or a lock it could not take interrupt between them —
 * leaving files gone and entries standing, which the next run reads as names the adopter
 * deliberately removed, and never installs again. It runs while the entries are still in
 * quarantine, so a failure puts them back rather than leaving the tree half-changed. It is
 * called only when there is something to commit, and never on a dry run.
 *
 * The removal is deliberately NOT recursive. Every predicate here requires `isFile()`, so a
 * directory reaching the `rm` can only be one swapped in after the snapshot — and recursing
 * into it would delete a tree on the strength of a name. Refusing is the conservative
 * direction: a stale entry is recoverable, a deleted tree is not.
 */
export async function pruneMatchingEntries(
  dir: string,
  predicate: (entry: Dirent) => boolean,
  removed: string[],
  dryRun: boolean,
  confirm?: (target: string, name: string) => Promise<boolean>,
  commit?: (removedPaths: readonly string[]) => Promise<void>,
): Promise<void> {
  if (!(await exists(dir))) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const held: QuarantinedEntry[] = [];
  const pruned: string[] = [];
  // Entries this run moved aside and could not put back. Restoring by
  // `rename` would silently replace whatever took the name meanwhile, so the restore refuses
  // instead — and a refusal nobody hears is a file that has quietly moved. The run stops
  // naming them, because they are recoverable and only while somebody knows where they are.
  const stranded: string[] = [];
  try {
    for (const entry of entries) {
      if (!predicate(entry)) {
        continue;
      }
      const target = path.join(dir, entry.name);
      if (confirm !== undefined && !(await confirm(target, entry.name))) {
        continue; // still QFAI's name, no longer QFAI's bytes
      }
      // Re-checked against the path as it is NOW, not as `readdir` reported it. Every predicate
      // here requires `isFile()`, but that is a fact about the snapshot: a directory swapped in
      // after it — by the adopter, or by a concurrent run — still carries a matching name, and a
      // recursive delete would take the whole tree on the strength of it. `lstat`, so a symlink is
      // refused rather than followed, and the `rm` below is deliberately not recursive: two
      // independent reasons a swapped directory survives.
      const atDeletion = await lstat(target).catch(() => undefined);
      if (atDeletion === undefined || atDeletion.isSymbolicLink() || !atDeletion.isFile()) {
        continue;
      }
      if (dryRun) {
        pruned.push(target);
        continue;
      }
      const moved = await quarantineEntry(target);
      if (moved === undefined) {
        continue; // could not take it aside; a file left alone is the conservative outcome
      }
      // The question re-asked against the OBJECT rather than the name. Everything before the
      // rename described a path; this describes what was moved, and it is what gets deleted.
      if (confirm !== undefined && !(await confirm(moved.quarantinePath, entry.name))) {
        if (!(await restoreQuarantined(moved))) {
          stranded.push(moved.quarantinePath);
        }
        continue;
      }
      held.push(moved);
      pruned.push(target);
    }
    if (commit !== undefined && !dryRun && pruned.length > 0) {
      await commit(pruned);
    }
  } catch (error) {
    for (const moved of held) {
      await restoreQuarantined(moved);
    }
    throw error;
  }
  removed.push(...pruned);
  for (const moved of held) {
    await rm(moved.quarantineDir, { recursive: true, force: true }).catch(() => undefined);
  }
  if (stranded.length > 0) {
    throw new Error(
      "qfai: these files were moved aside and could not be put back, because something else " +
        "took their names in the interval and replacing it would have destroyed it. They are " +
        `intact where they are:\n${stranded.map((at) => `  ${at}`).join("\n")}`,
    );
  }
}

/** A file moved aside into a directory nothing else holds, pending its delete or its restore. */
type QuarantinedEntry = {
  /** Where it was, and where a restore puts it back. */
  originalPath: string;
  /** The private directory holding it — what a discard removes. */
  quarantineDir: string;
  /** Where it is now — the object every step after the move acts on. */
  quarantinePath: string;
};

/** How many times a colliding quarantine name is retried before the entry is left alone. */
const QUARANTINE_ATTEMPTS = 8;

/**
 * Moves `target` into a private DIRECTORY in the same parent, or answers `undefined`.
 *
 * A directory, not a claimed filename. Claiming a random name with `wx`, closing the handle,
 * and then renaming onto it would leave a window between the close and the rename in which
 * anything that can write the adopter's tree could replace the claim, and `rename` would
 * silently destroy the replacement. A claim is exclusive only at the moment of the claim, not
 * at the moment of use — a directory stays exclusive for the whole interval instead.
 *
 * `mkdir` without `recursive` fails with `EEXIST` when the name is taken, so the directory is one
 * this process created. The move then targets a path INSIDE it — a path that did not exist a
 * moment ago and whose parent nothing else knows the name of — so there is nothing there for the
 * rename to overwrite.
 *
 * Same parent directory, because a rename across filesystems is not one operation, and the whole
 * point of the move is that it is one.
 *
 * @param target the file to move aside
 * @returns the entry, or `undefined` when it could not be moved
 */
async function quarantineEntry(target: string): Promise<QuarantinedEntry | undefined> {
  const dir = path.dirname(target);
  const base = path.basename(target);
  for (let attempt = 0; attempt < QUARANTINE_ATTEMPTS; attempt += 1) {
    const quarantineDir = path.join(dir, `.${base}.qfai-prune-${randomBytes(12).toString("hex")}`);
    try {
      // Deliberately not `{ recursive: true }`: that succeeds on an existing directory, which is
      // exactly the case this has to refuse.
      await mkdir(quarantineDir);
    } catch {
      continue; // the name is taken: try another rather than move into somebody else's directory
    }
    const quarantinePath = path.join(quarantineDir, base);
    try {
      await rename(target, quarantinePath);
      return { originalPath: target, quarantineDir, quarantinePath };
    } catch {
      await rm(quarantineDir, { recursive: true, force: true }).catch(() => undefined);
      return undefined; // the entry is gone or unmovable; either way it is not ours to delete
    }
  }
  return undefined;
}

/**
 * Puts a quarantined entry back, or leaves it quarantined — but never overwrites.
 *
 * `link` is the whole mechanism: it FAILS when the destination exists, where `rename` would
 * silently replace it. The name was vacated by this function's own move, so a file standing there
 * now is one somebody else wrote in the interval, and it is theirs.
 *
 * There is no fallback for filesystems without hard links. An `exists` check followed by a plain
 * `rename` would not be one: a check is not a guarantee, and between the two a concurrent `init`
 * or the adopter could create the file that the rename then destroys. `rename` cannot be made to
 * refuse an occupied destination, so when the destination cannot be proven free, the entry stays
 * in quarantine and the caller reports it.
 * A file left in a `.qfai-prune-*` directory is recoverable; one silently replaced is not.
 *
 * @param entry the quarantined file
 * @returns whether it was put back
 */
async function restoreQuarantined(entry: QuarantinedEntry): Promise<boolean> {
  try {
    await link(entry.quarantinePath, entry.originalPath);
    await rm(entry.quarantineDir, { recursive: true, force: true }).catch(() => undefined);
    return true;
  } catch {
    // `EEXIST` means the name is somebody else's now; anything else means this filesystem cannot
    // give the guarantee. Both leave the file where it is, which is the only outcome that
    // destroys nothing.
    return false;
  }
}

// ---------------------------------------------------------------------------
// copilot-instructions builder (regular file)
// ---------------------------------------------------------------------------

function buildCopilotInstructions(): string {
  return [
    "# QFAI repository instructions (Copilot)",
    "",
    "This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.",
    "",
    "## Golden rules",
    "",
    "- Read `REVIEW.md` before reviewing a pull request when that file exists in this repository, from the branch the pull request targets and not from its head: a contributor can change that file in the head, and a reviewer reading it there takes its policy from the work under review. Read it before writing the PR description as well.",
    "- Always match the user's language in your outputs.",
    "- Treat `.qfai/` as the canonical source of truth for the QFAI workflow:",
    "  - Skills (SSOT): `.qfai/assistant/skill/`",
    "  - Shared rules: `.qfai/assistant/rule/`",
    "  - Skills: `.qfai/assistant/skill/`",
    "  - Agents: `.qfai/assistant/agent/`",
    "  - Prompts: `.qfai/assistant/prompt/`",
    "- The legacy `.qfai/assistant/steering/` and `.qfai/assistant/instructions/` layout is past its compatibility window.",
    "  `qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error.",
    "  Run `qfai init --upgrade-assistant-tree` to migrate it.",
    "- When asked to perform QFAI workflow tasks, prefer using the QFAI skill symlinks in `.github/skills/`.",
    "  - These symlinks resolve to `.qfai/assistant/skill/<skill-name>/`.",
    "- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.",
    "- Keep changes minimal and targeted. Update tests and docs when behavior changes.",
    "",
    "## Cross-AI rules (master)",
    "",
    "The authoritative rule set shared across all AI coding agents (Claude",
    "Code / Codex / Copilot) lives under `.agents/rules/`, seeded by",
    "`qfai init`. Tool-specific instruction files reference these masters;",
    "the `.agents/rules/` files are SSOT.",
    "",
    "Key rules to follow:",
    "",
    "- `.agents/rules/temporary-files.md` — temporary files MUST go under `tmp/`.",
    "- `.agents/rules/root-additions-policy.md` — never add root-level files/dirs without explicit user approval.",
    "- `.agents/rules/distributed-surface.md` — keep internal identifiers and version markers out of published files.",
    "- `.agents/rules/version-discipline.md` — never choose a release version number on your own; the user decides.",
    "- `.agents/rules/documentation-clarity.md` — plain, minimal writing in pull requests, issues, comments and Markdown; no local identifiers, no account of how the work went.",
    "- `.agents/rules/minimal-implementation.md` — the order to try solutions in once a behaviour is agreed; mark a deliberate shortcut with its ceiling and the condition that lifts it.",
    "- `.agents/rules/interface-clarity.md` — what may appear on a screen or in terminal output; text explaining how to work a control is a defect report against that control.",
    "- `.agents/rules/grilling.md` — interview the decision tree before a design is fixed; outside the discussion stage agents grill each other, and only a critical decision reaches the user.",
    "- `.agents/rules/user-questions.md` — every question arrives in the shape its answer has: a choice where the candidates can be listed, a plain request where they cannot; the fallback keeps the same parts; a turn that waits on the user ends with a question listing the next actions.",
    "- `.agents/rules/api-budget.md` — ask git before REST and REST before GraphQL; one call for the whole set; the allowance belongs to the account and every session draws on it at once.",
    "- `.agents/rules/document-schema.md` — every spec-tree document conforms to its closed schema: start from its template, write no history, and never opt out.",
    "",
  ].join("\n");
}

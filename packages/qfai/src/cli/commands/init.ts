import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import type { Dirent, Stats } from "node:fs";
import {
  access,
  chmod,
  lstat,
  mkdir,
  link,
  open,
  readdir,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

import { copyTemplatePaths, copyTemplateTree } from "../lib/fs.js";
import { getInitAssetsDir } from "../lib/assets.js";
import { error, info } from "../lib/logger.js";
import { SUNSETS, deprecationSeverity } from "../../core/sunset.js";
import { isEnoent } from "../../core/fs/errno.js";
import {
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_LEGACY_LINES,
  RETIRED_LINE_SUCCESSORS,
  negationsOutrankLaterIgnores,
} from "../../core/gitignore.js";
import {
  ASSISTANT_LAYERS,
  HANDOFF_REQUIRED_SECTIONS,
  WORKLOG_ENTRY_KINDS,
  joinAssistantLayer,
  joinLegacyAssistantInstructions,
  joinLegacyAssistantSteering,
  joinMigrationMemo,
  joinProjectSteering,
  legacyAssistantSteeringSunsetLabel,
  type AssistantLayer,
} from "../../core/paths/assistantPaths.js";
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

const execAsync = promisify(execCb);

/**
 * Standard assets `--force` regenerates: the trees qfai owns end to end and
 * whose direct editing is already discouraged.
 *
 * `assistant/skills` alone was not enough. Every other `.qfai/**` path is
 * copied create-only, so a correction to an agent definition reached new
 * projects and nobody else — an installed repository kept the old reviewer
 * instructions with no command that would update them, and no signal that it
 * had not. `agents/` is generated in exactly the sense `skills/` is:
 * `qfai doctor`'s `skills.integrity` and the shipped README both say a project
 * edits them at its own risk.
 *
 * **`assistant/manifest/` is excluded in full, including `agent-catalog.yml`.**
 * `qfai-configure` is the shipped, user-facing entrypoint for editing those
 * declarative manifests — its own `project_memory` names the agent-catalog /
 * agent-routing / review-profiles SSOTs together — so a project that adjusted
 * its agent taxonomy through the supported path would have had that adjustment
 * replaced by the template on the next `--force`. Nothing migrates it back:
 * `--upgrade-assistant-tree` deliberately does not walk `manifest/`, because
 * that layer's path is the same before and after the recut.
 *
 * The cost is that `agent-catalog.yml#developer_instructions` can drift from
 * `assistant/agents/*.md` in an installed project. That is the lesser failure:
 * drift is visible and repairable, a silently overwritten taxonomy is neither.
 *
 * `specs/`, `contracts/`, `steering/` and everything else stay create-only for
 * the same reason: they hold project content.
 */
const STANDARD_ASSET_PATHS: readonly string[] = ["assistant/skills", "assistant/agents"];

export type InitOptions = {
  dir: string;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
  upgradeAssistantTree?: boolean;
  /**
   * Overrides the running tool version for the deprecation-severity decision.
   * Tests need it to exercise both sides of a sunset; without it the only
   * observable behaviour is whatever side the shipped version happens to sit
   * on, which is how the sunset line below went a whole window unverified.
   */
  toolVersionOverride?: string;
};

export async function runInit(options: InitOptions): Promise<void> {
  const toolVersion = options.toolVersionOverride ?? (await resolveToolVersion());
  const assetsRoot = getInitAssetsDir();
  const rootAssets = path.join(assetsRoot, "root");
  const qfaiAssets = path.join(assetsRoot, ".qfai");
  const assistantAssets = path.join(qfaiAssets, "assistant");

  const destRoot = path.resolve(options.dir);
  const destQfai = path.join(destRoot, ".qfai");

  if (options.force) {
    info(
      "NOTE: --force regenerates .qfai/assistant/skills/**, assistant/agents/** and the symlink assets (.agents/.claude/.github/.codex), and removes the legacy 10_workflow.md and the old wrappers (specs/contracts/steering and assistant/manifest/** are not overwritten — the manifest is user configuration edited by `qfai-configure`).",
    );
  }

  // If --upgrade-assistant-tree is supplied, run the migration FIRST.
  // This relocates user-edited content from the legacy pre-recut
  // surfaces (instructions/, steering/, manifest/) into the new 4-layer
  // tree BEFORE copyTemplateTree fills the same destinations from the
  // asset defaults. The subsequent copyTemplateTree uses
  // conflictPolicy: "skip", so migrated user edits are preserved.
  const upgradeResult = options.upgradeAssistantTree
    ? await runUpgradeAssistantTree(destRoot, options.dryRun, toolVersion)
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
  // not one this tree owns. Review finding [35]: `copyFile` — `COPYFILE_EXCL` included —
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
  // Review finding [123]: they used to ride along in the root copy, and the record followed it.
  // A permission, I/O or disk error anywhere else in that copy — `DESIGN.md`, `qfai.config.yaml`,
  // any of it — throws out of `copyTemplateTree` before the record runs, and the workflows are
  // already on disk. An unrecorded shipped workflow reads as `adopter-owned` on every later run:
  // never recorded again, invisible to doctor's drift detection, and outside the retired prune.
  // The comment below the record already said nothing unrelated may run in between; the copy
  // itself was the unrelated thing.
  //
  // Rolling back on failure was the alternative and is the wrong one here for the reason the swap
  // branch gives: this command does not delete what it cannot verify it owns.
  const workflowCopyPaths = [...SHIPPED_WORKFLOW_NAMES]
    .filter((name) => workflowsDirIsOwn && workflowCopySet.has(name))
    .map((name) => path.join(".github", "workflows", name));

  // The workflow directory is CREATED here, before the copy, so its identity is one this run
  // established rather than one it found afterwards.
  //
  // Review finding [129]. When a component did not exist before the copy there was nothing to
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

  // The ancestors are still the directories that were inspected. Review finding [109]: the
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
  // Review finding [139], and a regression the previous round introduced: on a fresh clone
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

  // root/ と .qfai/ は create-only（既存は skip）
  // STANDARD_ASSET_PATHS のみ --force で上書きする
  //
  // Every shipped workflow name is excluded here, whatever this run decided about it: the ones
  // it writes were written above, and the ones it declined must not arrive by another route.
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    protect: ["DESIGN.md"],
    exclude: [...SHIPPED_WORKFLOW_NAMES].map((name) => path.join(".github", "workflows", name)),
  });
  // …and the summary counts them together, as one copy, which is what an operator sees.
  rootResult.copied = [...workflowResult.copied, ...rootResult.copied];
  rootResult.skipped = [...workflowResult.skipped, ...rootResult.skipped];
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    exclude: [...STANDARD_ASSET_PATHS],
  });
  const skillsResult = await copyTemplatePaths(qfaiAssets, destQfai, [...STANDARD_ASSET_PATHS], {
    force: options.force,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
  });

  // git config core.symlinks true（symlink 生成の前提条件）
  await configureGitSymlinks(destRoot, options.dryRun);

  // symlink ベースの統合生成（旧ラッパー prune + symlink 作成 + README/copilot-instructions 生成）
  const wrappersResult = await syncIntegrationWrappers(assistantAssets, destRoot, {
    force: options.force,
    dryRun: options.dryRun,
  });
  const gitignoreResult = await ensureRootGitignoreEntries(destRoot, options.dryRun);
  const legacyEvidenceIgnoreResult = await ensureLegacyEvidenceIgnoreNegations(
    destRoot,
    options.dryRun,
  );
  const removedLegacySkills = options.force
    ? await pruneLegacySkillFiles(destRoot, options.dryRun)
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
  // The SAME boundary the copy is held to, and for a worse reason. Review finding [68]:
  // `workflowsDirIsOwn` excluded the copy and nothing else, so a `.github/workflows` that is a
  // link to a shared directory or another repository was still ENUMERATED here — and a
  // retired workflow on the far side whose bytes match a recorded digest was quarantined and
  // deleted. The run that refused to write through the link would delete through it.
  //
  // Empty rather than skipped-with-a-message: the message is already emitted where the copy
  // is excluded, and one refusal reported once is what an operator needs.
  const removedRetiredWorkflows: string[] = [];
  // A detected swap stops the prune as well as the record. Review finding [113]:
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
    // Review finding [30]. The primitive asks it a second time after moving the entry aside,
    // which is why the digest is looked up by the entry's own NAME rather than by the basename
    // of the path being read — after the move those are different strings.
    async (target, name) => (await digestWorkflowFile(target)) === prunableRetiredNames.get(name),
    // The entry goes with the file, in the same success unit. A pruned workflow whose provenance
    // entry survives is read by the NEXT run as a name QFAI installed and the adopter deleted —
    // the `declined` row — so the copy skips it forever. Retiring a workflow would silently
    // poison the name against whatever ships under it later. Review finding [20].
    //
    // Review finding [34]: this ran AFTER the delete, as a separate step. A read-only `.qfai`, a
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

  const removed = [...removedLegacySkills, ...wrappersResult.removed, ...removedRetiredWorkflows];

  // 4-layer assistant-tree seed + project-root steering surface seed.
  // These run AFTER copyTemplateTree so they can detect when the
  // asset templates already populated a layer (they fill in only
  // missing .gitkeep / README placeholders).
  const assistantTreeResult = await seedAssistantLayers(destRoot, options.dryRun);
  const projectSteeringResult = await seedProjectSteering(destRoot, options.dryRun);

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

  report(
    [
      ...rootResult.copied,
      ...qfaiResult.copied,
      ...skillsResult.copied,
      ...wrappersResult.copied,
      ...gitignoreResult.copied,
      ...legacyEvidenceIgnoreResult.copied,
      ...assistantTreeResult.copied,
      ...projectSteeringResult.copied,
      ...upgradeResult.copied,
    ],
    [
      ...rootResult.skipped,
      ...qfaiResult.skipped,
      ...skillsResult.skipped,
      ...wrappersResult.skipped,
      ...gitignoreResult.skipped,
      ...legacyEvidenceIgnoreResult.skipped,
      ...assistantTreeResult.skipped,
      ...projectSteeringResult.skipped,
      ...upgradeResult.skipped,
    ],
    [...removed, ...upgradeResult.removed],
    options.dryRun,
    "init",
    destRoot,
  );

  for (const note of upgradeResult.preservedNotes) {
    info(note);
  }

  // Legacy steering/ sunset warning (D-DEPRECATED-PATH). Emitted AFTER
  // the report summary so the warning stays at the bottom of the
  // terminal output and is not buried by the skipped-paths list (PR
  // #209 review NIT). Skip when the user is currently running
  // --upgrade-assistant-tree (the helper will move the directory
  // itself); skip on dry-run; skip when no legacy dir exists.
  if (!options.upgradeAssistantTree && !options.dryRun) {
    await emitLegacyAssistantSteeringSunset(destRoot, toolVersion);
  }
}

// ---------------------------------------------------------------------------
// 4-layer assistant-tree seed + project-root steering surface seed
// ---------------------------------------------------------------------------

async function seedAssistantLayers(
  destRoot: string,
  dryRun: boolean,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const layer of ASSISTANT_LAYERS) {
    const layerDir = joinAssistantLayer(destRoot, layer);
    const gitkeep = path.join(layerDir, ".gitkeep");
    if (await pathExists(gitkeep)) {
      skipped.push(gitkeep);
      continue;
    }
    copied.push(gitkeep);
    if (!dryRun) {
      await mkdir(layerDir, { recursive: true });
      await writeFile(gitkeep, assistantLayerGitkeepBody(layer), "utf-8");
    }
  }

  return { copied, skipped };
}

function assistantLayerGitkeepBody(layer: AssistantLayer): string {
  const purposes: Record<AssistantLayer, string> = {
    constitution:
      "Foundational normative rules (constitution, drift-protocol, distributed-surface, quality).",
    manifest: "Declarative manifests (agent-catalog.yml, agent-routing.yml, review-profiles.yml).",
    catalog:
      "Reference catalogs (test-layers.md, review-gate.rules.yml, spec_required_files.json).",
    process: "Workflow / process docs and migration memos (process/migrations/*).",
  };
  return [
    `# .qfai/assistant/${layer}/`,
    "",
    purposes[layer],
    "",
    "Seeded by qfai init (4-layer assistant-tree recut, CHG-003).",
    "",
  ].join("\n");
}

function buildProjectSteeringReadmeBody(): string {
  // Kind enum is sourced from the SSOT in assistantPaths.ts so a contract
  // change automatically updates the README without manual sync.
  const kindLines = WORKLOG_ENTRY_KINDS.map((k) => `- \`${k}\``);
  return [
    "# .qfai/steering/ — AI work-log surface",
    "",
    "This directory is the project-local work-log surface for AI coding",
    "agents. Each entry is a small markdown file with YAML frontmatter",
    "(`id`, `kind`, `status`, `created`, `updated`, `scope`, `blocking`,",
    "`promote-to`, `links`). See the canonical schema at",
    "`.qfai/assistant/catalog/worklog-entry.schema.md`.",
    "",
    "## Filename-id invariant (contract)",
    "",
    "Every entry file `.qfai/steering/<id>.md` MUST have a frontmatter",
    "`id:` that exactly matches the filename stem. The validator emits",
    "`W-WORKLOG-SCHEMA` when they diverge.",
    "",
    "## Running validation",
    "",
    "```sh",
    "qfai validate --profile sdd --fail-on error",
    "```",
    "",
    "Validators that scan this surface: `W-WORKLOG-SCHEMA`,",
    "`W-WORKLOG-BROKEN-LINK`, `W-WORKLOG-STALE`, `W-PENDING-PROMOTION`,",
    "`R-HANDOFF-INCOMPLETE`.",
    "",
    "## Allowed `kind` values",
    "",
    "See `.qfai/assistant/catalog/worklog-entry.schema.md#kind-enum-req-0004` for the",
    "authoritative list and per-kind write trigger. The enum is:",
    "",
    ...kindLines,
    "",
    "## Templates",
    "",
    "See `_templates/entry.md` for the canonical entry shape.",
    "",
  ].join("\n");
}

function buildProjectSteeringEntryTemplate(): string {
  // Section headings are sourced from HANDOFF_REQUIRED_SECTIONS (SSOT)
  // so the template cannot drift from the validator.
  const handoffBodyLines = HANDOFF_REQUIRED_SECTIONS.flatMap((heading) => [
    heading,
    "",
    "(Mandatory for kind: handoff. See contract for guidance.)",
    "",
  ]);
  return [
    "---",
    "id: 2026-MM-DD-kebab-case-id   # required; kebab-case ASCII; matches filename stem",
    "status: active                 # required; enum: active | handoff | archived",
    "kind: decision                 # required; see .qfai/assistant/catalog/worklog-entry.schema.md",
    "created: YYYY-MM-DD            # required; ISO-8601 date",
    "updated: YYYY-MM-DD            # required; ISO-8601 date; >= created",
    'scope: global                  # required; "global" or "spec-NNNN"',
    "blocking: false                # required; boolean",
    'promote-to: null               # required; "spec-NNNN/07_Decisions.md" or null',
    "links: []                      # required; array (may be empty)",
    "---",
    "",
    "# Title of the entry",
    "",
    "## Context",
    "",
    "What triggered this entry? Reference any spec, contract, or external",
    "input that informs the entry.",
    "",
    "<!-- For `kind: handoff` entries, the 5 sections below are MANDATORY -->",
    "<!-- (Reviewer Gate emits R-HANDOFF-INCOMPLETE on missing sections). -->",
    "",
    ...handoffBodyLines,
  ].join("\n");
}

async function seedProjectSteering(
  destRoot: string,
  dryRun: boolean,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  const targets: Array<{ rel: string[]; body: string }> = [
    { rel: ["README.md"], body: buildProjectSteeringReadmeBody() },
    { rel: [".gitkeep"], body: "" },
    { rel: ["_templates", "entry.md"], body: buildProjectSteeringEntryTemplate() },
  ];

  for (const target of targets) {
    const fullPath = joinProjectSteering(destRoot, ...target.rel);
    if (await pathExists(fullPath)) {
      skipped.push(fullPath);
      continue;
    }
    copied.push(fullPath);
    if (!dryRun) {
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, target.body, "utf-8");
    }
  }

  return { copied, skipped };
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

async function runUpgradeAssistantTree(
  destRoot: string,
  dryRun: boolean,
  version: string,
): Promise<UpgradeResult> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  const preservedNotes: string[] = [];

  // Per .qfai/contracts/cli/qfai-init.md#--upgrade-assistant-tree, the
  // relocation covers 3 pre-recut surfaces: instructions/, steering/,
  // and manifest/. Each is walked independently and routed into the new
  // 4-layer tree via the classifier; the classifier is name-driven so
  // it works regardless of which legacy surface a file lived in.
  // Pre-recut legacy surfaces that the migration helper walks. The
  // pre-recut `manifest/` layer is intentionally NOT included here:
  // its path is identical to the canonical post-recut manifest/ layer,
  // so walking it would mis-label freshly-seeded canonical files as
  // "pre-recut surfaces" in the migration memo and emit spurious
  // W-USER-EDIT-PRESERVED notes for normal post-init files.
  const legacySurfaces: Array<{ name: "steering" | "instructions"; dir: string }> = [
    { name: "steering", dir: joinLegacyAssistantSteering(destRoot) },
    { name: "instructions", dir: joinLegacyAssistantInstructions(destRoot) },
  ];
  const surfaceExistence = await Promise.all(legacySurfaces.map((s) => pathExists(s.dir)));
  const anyLegacyExists = surfaceExistence.some(Boolean);
  // Detected surfaces list — passed to buildMigrationMemo so the memo's
  // Status block reflects all 3 pre-recut surfaces (steering /
  // instructions / manifest), not just steering[0].
  const detectedSurfaces = legacySurfaces
    .filter((_, i) => surfaceExistence[i] === true)
    .map((s) => s.name);

  // Migration memo is always emitted by --upgrade-assistant-tree (REQ-0021).
  const memoPath = joinMigrationMemo(destRoot, version);
  if (await pathExists(memoPath)) {
    // Memo is commit-immutable per OC-53 — do not touch.
    skipped.push(memoPath);
  } else {
    copied.push(memoPath);
    if (!dryRun) {
      await mkdir(path.dirname(memoPath), { recursive: true });
      await writeFile(memoPath, buildMigrationMemo(version, detectedSurfaces), "utf-8");
    }
  }

  if (!anyLegacyExists) {
    // Already-upgraded project: emit info-only note so the operator
    // sees the migration helper ran (REQ-0020 + W-USER-EDIT-PRESERVED).
    preservedNotes.push(
      "  W-USER-EDIT-PRESERVED: no pre-recut surfaces (.qfai/assistant/{steering,instructions,manifest}/) found; no migration was needed.",
    );
    return { copied, skipped, removed, preservedNotes };
  }

  // Walk every legacy surface and re-locate each file into the new
  // 4-layer tree based on the name-driven classifier. User edits are
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
      // Same-layer self-copy guard: if the target layer is identical to
      // the surface we are already in (e.g. legacy manifest/agent-routing.yml
      // → new manifest/agent-routing.yml), the file is already at the
      // canonical location. Skip without W-USER-EDIT-PRESERVED noise.
      // Same-layer self-copy guard. Currently legacySurfaces only contains
      // pre-recut surfaces (steering, instructions) so this comparison
      // never matches a canonical layer, but the guard is preserved
      // defensively for future expansions.
      if ((target.layer as string) === surface.name) continue;
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

function classifyLegacySteeringEntry(relPath: string): { layer: AssistantLayer; subpath: string } {
  const normalized = relPath.replace(/\\/g, "/").toLowerCase();
  const posix = relPath.replace(/\\/g, "/");
  // Exact-basename routing (stem without extension) so user docs whose
  // names happen to contain `agent-routing` or `review-gate` etc.
  // (e.g. `agent-routing-notes.md`) are NOT misrouted to the canonical
  // layer.
  const stem = (normalized.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
  // review-gate is a reference rules catalog (not a routing manifest) — keep
  // it in catalog/ so loaders that expect catalog placement find it.
  // spec_required_files is a filename-list registry — also catalog.
  const CATALOG_BASENAMES = new Set([
    "test-layers",
    "review-gate.rules",
    "review-gate",
    "spec_required_files",
  ]);
  if (CATALOG_BASENAMES.has(stem)) {
    return { layer: "catalog", subpath: posix };
  }
  const MANIFEST_BASENAMES = new Set(["agent-catalog", "agent-routing", "review-profiles"]);
  if (MANIFEST_BASENAMES.has(stem)) {
    return { layer: "manifest", subpath: posix };
  }
  // Constitution — normative invariants (drift-protocol, constitution,
  // quality, distributed-surface, workflow, agent-selection, change-
  // classification, requirements-decomposition, communication, thinking,
  // shared-skill-*-baseline). Migrated from legacy instructions/ surface.
  // Match on exact basename stem (file without extension) so short
  // tokens like "quality" / "workflow" / "thinking" / "communication"
  // do NOT substring-match unrelated user-named files. `stem` is
  // already computed above for the catalog/manifest checks; reuse it
  // for the constitution check too (one canonical extraction point).
  const CONSTITUTION_BASENAMES = new Set([
    "constitution",
    "drift-protocol",
    "quality",
    "distributed-surface",
    "workflow",
    "agent-selection",
    "change-classification",
    "requirements-decomposition",
    "communication",
    "thinking",
    "shared-skill-delegation-baseline",
    "shared-skill-operating-baseline",
  ]);
  if (CONSTITUTION_BASENAMES.has(stem)) {
    return { layer: "constitution", subpath: posix };
  }
  // Process layer routing — matched on top-level path segment only.
  // Recognized top-level inputs:
  //   - `process/...` (canonical post-recut path; strip the leading
  //     `process/` so it lands at `.qfai/assistant/process/...`
  //     rather than double-nesting)
  //   - `migrations/...` (legacy convention where the migration memos
  //     lived directly under the steering surface; preserved as-is so
  //     it lands at `.qfai/assistant/process/migrations/...`)
  // Non-top-level `migrations` segments (e.g. `foo/migrations/bar.md`)
  // are NOT routed here — they fall through to the default catalog
  // layer so user docs are not pulled out from under their intended
  // location.
  const segments = normalized.split("/");
  const isTopProcess = segments[0] === "process";
  const isTopMigrations = segments[0] === "migrations";
  if (isTopProcess || isTopMigrations) {
    const subpath = isTopProcess ? posix.slice("process/".length) : posix;
    return { layer: "process", subpath };
  }
  // Default: catalog (reference docs).
  return { layer: "catalog", subpath: posix };
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

function buildMigrationMemo(version: string, detectedSurfaces: readonly string[]): string {
  const stamp = new Date().toISOString();
  const sunset = legacyAssistantSteeringSunsetLabel();
  const surfacesLine =
    detectedSurfaces.length > 0
      ? `- Detected pre-recut surfaces: ${detectedSurfaces.map((s) => `\`.qfai/assistant/${s}/\``).join(", ")} — files copied into the new 4-layer tree.`
      : "- No pre-recut surfaces (`.qfai/assistant/{steering,instructions,manifest}/`) found — fresh layout adopted.";
  return [
    `# qfai assistant-layer recut migration (v${version})`,
    "",
    `- Generated: ${stamp}`,
    `- Source layout: .qfai/assistant/{steering, instructions, manifest}/ (pre-recut)`,
    `- Target layout: .qfai/assistant/{constitution, manifest, catalog, process}/`,
    "",
    "## Status",
    "",
    surfacesLine,
    "",
    "## Layer mapping",
    "",
    "| Layer        | Purpose                                                                   |",
    "| ------------ | ------------------------------------------------------------------------- |",
    "| constitution | Foundational normative rules (constitution, drift-protocol, quality).      |",
    "| manifest     | Declarative manifests (agent-catalog, agent-routing, review-profiles).    |",
    "| catalog      | Reference catalogs (test-layers, review-gate rules, spec_required_files). |",
    "| process      | Workflow / process docs and migration memos.                               |",
    "",
    "## Compatibility window",
    "",
    // Branch on the running version: the memo is commit-immutable (OC-53), so a
    // sentence that is false when written stays false forever.
    ...(deprecationSeverity(version, SUNSETS.legacyAssistantSteering) === "error"
      ? [
          `Legacy \`.qfai/assistant/{steering,instructions}/\` reached their sunset in v${sunset}`,
          `and are no longer inside the compatibility window; sunset: v${sunset}`,
          "(D-DEPRECATED-PATH, error). Remove them once this migration is verified.",
        ]
      : [
          `Legacy \`.qfai/assistant/{steering,instructions}/\` are read-compatible for the current`,
          `minor release window only; sunset: v${sunset} (D-DEPRECATED-PATH).`,
        ]),
    "",
    "## Provenance",
    "",
    "This memo is generated by `qfai init --upgrade-assistant-tree` and is",
    "commit-immutable — once committed, do not edit. Subsequent runs of",
    "the helper detect this file and skip rewrite.",
    "",
  ].join("\n");
}

/**
 * Report a legacy pre-recut tree, at the severity the running version implies.
 *
 * The headline used to be one unconditional sentence — "read-compatible for the
 * current minor release only" — printed with no version input at all. At and
 * past the sunset that is simply false, and `qfai validate` was already calling
 * the same layout an error in the same repository, so the two commands
 * contradicted each other. The wording now matches `assistantTreeMigration`, and
 * post-sunset the line goes to stderr.
 *
 * The exit code deliberately does not change: `init` is what a bootstrap script
 * runs, and `validate` is the surface the contract charges with failing the
 * build. Both surfaces of the tree (steering/ AND instructions/) are reported,
 * matching the validator's symmetry.
 */
async function emitLegacyAssistantSteeringSunset(
  destRoot: string,
  toolVersion: string,
): Promise<void> {
  const sunset = legacyAssistantSteeringSunsetLabel();
  const detected: string[] = [];
  if (await pathExists(joinLegacyAssistantSteering(destRoot))) detected.push("steering");
  if (await pathExists(joinLegacyAssistantInstructions(destRoot))) detected.push("instructions");
  if (detected.length === 0) return;
  const surfaces = detected.map((s) => `.qfai/assistant/${s}/`).join(" + ");
  const severity = deprecationSeverity(toolVersion, SUNSETS.legacyAssistantSteering);
  const headline =
    severity === "error"
      ? `${surfaces} past the announced sunset (v${sunset}).`
      : `${surfaces} read-compatible for the current minor release only.`;
  // One template for both branches: splitting it would let the `sunset: v…`
  // suffix drift out of one of them, and that suffix is the operator's only
  // pointer to when this started applying.
  const line = `  D-DEPRECATED-PATH: ${headline} sunset: v${sunset}. Run \`qfai init --upgrade-assistant-tree\` to migrate.`;
  if (severity === "error") {
    error(line);
  } else {
    info(line);
  }
}

// ---------------------------------------------------------------------------
// Root .gitignore — QFAI managed block
// ---------------------------------------------------------------------------

/**
 * Rewrite the managed `.gitignore` block, adding any governance negation it is
 * missing.
 *
 * Exported because the legacy-review-pack migration needs it: it writes a
 * governance record under `.qfai/review/`, and an existing repository still
 * carries the older block whose `.qfai/review/*` would ignore it.
 */
export async function ensureRootGitignoreEntries(
  destRoot: string,
  dryRun: boolean,
  // Where the two progress lines go. `qfai init` writes them to stdout; a
  // caller emitting JSON there collects them instead, because a stray line
  // before the document makes it unparseable.
  report: (line: string) => void = info,
): Promise<{ copied: string[]; skipped: string[] }> {
  const gitignorePath = path.join(destRoot, ".gitignore");

  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf-8");
  } catch (err: unknown) {
    if (!isEnoent(err)) {
      throw err;
    }
    // File does not exist yet — will create
  }

  // The governance negations are checked here but deliberately NOT in
  // `QFAI_GITIGNORE_RECOMMENDED_ENTRIES`: a project that removed them must not
  // start failing validation, yet a project that never had them must still
  // receive them on the next `qfai init`. Without this term the early return
  // fires for every pre-existing managed block and the negations only ever
  // reach fresh inits.
  //
  // Presence alone is not enough — git applies the LAST matching pattern, so a
  // negation with any matching ignore line below it is inert and the decision
  // records stay ignored.
  //
  // The order check reads the **whole file**, not the managed block. A project
  // that appended its own `.qfai/evidence/*.md` after the block wins under
  // git's last-match rule, and a block-scoped check called the negation
  // effective while `git check-ignore -v` named the project's line. The repair
  // path was already right — `removeManagedBlock` strips the block and the
  // rebuilt one is appended last, so it lands below the project's rule — but
  // the early return fired first and it never ran.
  //
  // Required entries are matched only against the managed block: a project that
  // deliberately removed, say, `.qfai/evidence/*` to track its own audit trail
  // must not have that choice silently undone by the next `qfai init`.
  const managedBlock = extractManagedBlock(existing);
  const existingLines = existing.split("\n").map((line) => line.trimEnd());
  if (
    existing.includes(QFAI_GITIGNORE_MARKER) &&
    QFAI_GITIGNORE_GOVERNANCE_NEGATIONS.every((entry) => managedBlock.includes(entry)) &&
    negationsOutrankLaterIgnores(existingLines, QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) &&
    QFAI_GITIGNORE_LEGACY_LINES.every((entry) => !existing.includes(entry))
  ) {
    return { copied: [], skipped: [gitignorePath] };
  }

  // Strip existing managed QFAI block (known block lines only; stop at unknown lines; loop for duplicates)
  const stripped = existing.includes(QFAI_GITIGNORE_MARKER)
    ? removeManagedBlock(existing)
    : existing;

  if (dryRun) {
    report(`  would update: .gitignore (append QFAI entries)`);
    return { copied: [gitignorePath], skipped: [] };
  }

  const separator = stripped.length > 0 && !stripped.endsWith("\n") ? "\n\n" : "\n";
  const block = rebuildManagedBlock(managedBlock);
  const content = stripped.length > 0 ? stripped + separator + block : block;
  await writeFile(gitignorePath, content, "utf-8");
  report("  updated: .gitignore (appended QFAI entries)");
  return { copied: [gitignorePath], skipped: [] };
}

/**
 * The managed block to write, preserving whatever ignore lines the project's
 * existing block already had.
 *
 * Writing `QFAI_GITIGNORE_BLOCK` wholesale was a silent regression for the one
 * case the freshness check exists to protect. A project that deliberately
 * removed, say, `.qfai/evidence/*` from the block to track its own audit trail
 * fails the `every(...)` check the moment a NEW governance negation ships —
 * the block is then stripped and the canonical list written back, resurrecting
 * the ignore line the user deleted and re-hiding every evidence file from that
 * release on.
 *
 * So an existing block keeps its own ignore lines and only gains the governance
 * negations it is missing (appended last, because git applies the last matching
 * pattern). A project with no managed block still gets the full canonical one.
 */
function rebuildManagedBlock(existingBlock: string): string {
  if (existingBlock.length === 0) {
    return QFAI_GITIGNORE_BLOCK;
  }
  const legacy = new Set<string>(QFAI_GITIGNORE_LEGACY_LINES);
  const negations = new Set<string>(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS);
  const lines = existingBlock.split("\n").map((line) => line.trimEnd());
  const present = new Set(lines);

  // The retired lines are dropped and the governance negations appended, both
  // unconditionally. What is *kept* is the project's own ignore set.
  //
  // An earlier attempt migrated a legacy-shaped block wholesale, on the theory
  // that a missing ignore there is age rather than a choice. That is not safe:
  // a project can carry a retired line *and* have deleted `.qfai/evidence/*` to
  // track its audit trail, and the wholesale rewrite resurrects the deletion —
  // the very regression this function exists to stop. Age and intent cannot be
  // told apart from the file, so the conservative reading wins in both cases:
  // never re-add an ignore line the block does not have.
  //
  // The cost is that a project on an old block does not pick up a newly shipped
  // *recommended* ignore. `QFAI-REVIEW-008` reports that at `info`, and the
  // consequence is generated files showing in `git status` — noisy. Silently
  // re-hiding an audit trail the project chose to track is not noisy, which is
  // why it is the side to err on.
  const kept = lines.filter(
    (line) => line !== QFAI_GITIGNORE_MARKER && !negations.has(line) && !legacy.has(line),
  );
  // The one exception: a retired line that was *renamed* rather than dropped.
  // Stripping `.qfai/discussion/discussion-*/` without adding its successor
  // would leave the project with no discussion ignore at all — a removal it
  // never asked for, which is the same harm from the other direction.
  const renamed = Object.entries(RETIRED_LINE_SUCCESSORS)
    .filter(([retired, successor]) => present.has(retired) && !present.has(successor))
    .map(([, successor]) => successor);

  return [QFAI_GITIGNORE_MARKER, ...kept, ...renamed, ...QFAI_GITIGNORE_GOVERNANCE_NEGATIONS]
    .filter((line, index, all) => line.length > 0 || all[index - 1]?.length !== 0)
    .join("\n");
}

/**
 * Leaf negations for the governance records, as a legacy
 * `.qfai/evidence/.gitignore` needs them.
 *
 * Earlier `qfai init` versions wrote a per-directory ignore file whose first
 * line is `*`. Git applies the deepest matching file, so that `*` wins over
 * every root-level negation: `change-request-*.md`, `decision-*.md`,
 * `decisions/**` and the Coverage Depth Matrix all stay ignored in a project
 * that still has it, however correct the managed block is. The file is not
 * removed — a project may want the rest of its behaviour — but the governance
 * records are re-included inside it.
 */
const LEGACY_EVIDENCE_IGNORE_NEGATIONS: readonly string[] = [
  "!change-request-*.md",
  "!decision-*.md",
  "!coverage-depth-*.md",
  "!decisions/",
  "!decisions/**",
];

async function ensureLegacyEvidenceIgnoreNegations(
  destRoot: string,
  dryRun: boolean,
): Promise<{ copied: string[]; skipped: string[] }> {
  const target = path.join(destRoot, ".qfai", "evidence", ".gitignore");
  let existing: string;
  try {
    existing = await readFile(target, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) {
      // No legacy file: the root managed block is already authoritative.
      return { copied: [], skipped: [] };
    }
    throw err;
  }

  const lines = existing.split("\n").map((line) => line.trimEnd());
  // Presence is not enough: git applies the **last** matching pattern, so a
  // negation sitting above a broad re-ignore (`*`, or a later
  // `coverage-depth-*` rule) is inert while a `lines.includes` check reads it
  // as satisfied. `git check-ignore -v` still names the broad rule, and the
  // governance record this migration promises to track stays untracked.
  //
  // A negation counts only when no ignore line below it can match the same
  // path. Anything else is re-appended, which puts it last and therefore wins.
  //
  // Real glob semantics, not a prefix comparison. A prefix test cannot see
  // that a later `*.md` or a double-star `/*.md` matches
  // `coverage-depth-*.md`, `decision-*.md` and `change-request-*.md`, so it
  // called those negations effective and left the records ignored.
  const missing = LEGACY_EVIDENCE_IGNORE_NEGATIONS.filter(
    (entry) => !negationsOutrankLaterIgnores(lines, [entry]),
  );
  if (missing.length === 0) {
    return { copied: [], skipped: [target] };
  }
  if (dryRun) {
    info(`  would update: ${target} (re-include governance records)`);
    return { copied: [target], skipped: [] };
  }

  const separator = existing.endsWith("\n") ? "" : "\n";
  await writeFile(target, `${existing}${separator}${missing.join("\n")}\n`, "utf-8");
  info(`  updated: ${target} (re-include governance records)`);
  return { copied: [target], skipped: [] };
}

/**
 * The QFAI managed block, or `""` when the marker is absent.
 *
 * Freshness is judged against the block this writer owns, not the whole file:
 * a project that deliberately deleted an ignore line to track its own audit
 * trail keeps that choice, and a line the user re-added elsewhere does not
 * make a stale managed block look current.
 *
 * **Every block, not the first.** A past duplicate-append bug left some
 * projects with two managed blocks, and `removeManagedBlock` strips all of
 * them. Reading only the first meant an ignore line that lived exclusively in
 * a later block — `.qfai/state.json`, say — was deleted with that block and
 * never rebuilt, exposing local run state to the next commit. The blocks are
 * merged in document order: the first block's ordering is preserved (which is
 * what `negationsOutrankLaterIgnores` and the last-pattern-wins semantics
 * depend on) and any line only a later block carries is appended.
 */
function extractManagedBlock(content: string): string {
  const lines = content.split("\n");
  const knownLines = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);

  const merged: string[] = [];
  const seen = new Set<string>();
  let cursor = 0;
  while (cursor < lines.length) {
    const startIdx = lines.findIndex(
      (line, index) => index >= cursor && line.includes(QFAI_GITIGNORE_MARKER),
    );
    if (startIdx === -1) break;
    let endIdx = startIdx + 1;
    while (endIdx < lines.length && knownLines.has(lines[endIdx] ?? "")) {
      endIdx += 1;
    }
    for (const line of lines.slice(startIdx, endIdx)) {
      // The marker itself is deduplicated with everything else, so a merged
      // block carries exactly one.
      if (seen.has(line)) continue;
      seen.add(line);
      merged.push(line);
    }
    cursor = endIdx;
  }
  return merged.join("\n");
}

/** Remove all QFAI managed blocks (known block lines only; stops at unknown lines). */
function removeManagedBlock(content: string): string {
  const lines = content.split("\n");

  // Known lines: current block + legacy lines from previous versions
  const knownLines = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);

  // Loop to handle multiple managed blocks (e.g. from past duplicates)
  while (true) {
    const startIdx = lines.findIndex((line) => line.includes(QFAI_GITIGNORE_MARKER));
    if (startIdx === -1) break;

    let endIdx = startIdx + 1; // marker is always consumed

    // Consume contiguous lines that belong to any known block line (order-independent)
    while (endIdx < lines.length && knownLines.has(lines[endIdx] ?? "")) {
      endIdx++;
    }

    // Also remove one trailing blank line if present
    if (endIdx < lines.length) {
      const line = lines[endIdx];
      if (line !== undefined && line.trim() === "") {
        endIdx++;
      }
    }

    lines.splice(startIdx, endIdx - startIdx);
  }

  // Remove trailing blank lines left from removal
  while (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last === undefined || last.trim() !== "") break;
    lines.pop();
  }
  return lines.length > 0 ? lines.join("\n") + "\n" : "";
}

function report(
  copied: string[],
  skipped: string[],
  removed: string[],
  dryRun: boolean,
  label: string,
  baseDir: string,
): void {
  info(`qfai ${label}: ${dryRun ? "dry-run" : "done"}`);
  if (copied.length > 0) {
    info(`  created: ${copied.length}`);
  }
  if (skipped.length > 0) {
    info(`  skipped: ${skipped.length}`);
    info("  skipped paths:");
    for (const skippedPath of skipped) {
      const relative = path.relative(baseDir, skippedPath);
      info(`    - ${relative}`);
    }
  }
  if (removed.length > 0) {
    info(`  ${dryRun ? "would remove legacy files" : "removed legacy files"}: ${removed.length}`);
    info(dryRun ? "  would remove paths:" : "  removed paths:");
    for (const removedPath of removed) {
      const relative = path.relative(baseDir, removedPath);
      info(`    - ${relative}`);
    }
  }
}

async function pruneLegacySkillFiles(destRoot: string, dryRun: boolean): Promise<string[]> {
  const roots = [path.join(destRoot, ".qfai", "assistant", "skills")];

  const legacyFiles: string[] = [];
  for (const root of roots) {
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

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
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

async function configureGitSymlinks(destRoot: string, dryRun: boolean): Promise<void> {
  try {
    await execAsync("git rev-parse --git-dir", { cwd: destRoot });
  } catch {
    // Not a git repository — skip
    return;
  }

  if (dryRun) {
    return;
  }

  try {
    await execAsync("git config core.symlinks true", { cwd: destRoot });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "Failed to set git config core.symlinks true.",
        "Run the following manually:",
        "  git config core.symlinks true",
        `Cause: ${detail}`,
      ].join("\n"),
    );
  }
}

// ---------------------------------------------------------------------------
// Symlink-based integration sync
// ---------------------------------------------------------------------------

export const SKILL_INTEGRATION_DIRS = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
];

export const AGENT_INTEGRATION_CONFIGS: Array<{ dir: string; suffix: string }> = [
  { dir: ".claude/agents", suffix: ".md" },
  { dir: ".github/agents", suffix: ".agent.md" },
];

type WrapperSyncOptions = {
  force: boolean;
  dryRun: boolean;
};

type WrapperEntry = {
  relativePath: string;
  body: string;
};

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
    ? await pruneStaleQfaiWrappers(destRoot, skills, options.dryRun)
    : [];

  // Step 2: Write README files as regular files
  const readmeEntries = buildReadmeEntries();
  for (const entry of readmeEntries) {
    const destination = path.join(destRoot, ...entry.relativePath.split("/"));
    const alreadyExists = await exists(destination);
    if (alreadyExists && !options.force) {
      skipped.push(destination);
      continue;
    }

    copied.push(destination);
    if (!options.dryRun) {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, entry.body, "utf-8");
    }
  }

  // Step 3: Write copilot-instructions.md as regular file (with updated references)
  const copilotDest = path.join(destRoot, ".github", "copilot-instructions.md");
  const copilotExists = await exists(copilotDest);
  if (copilotExists && !options.force) {
    skipped.push(copilotDest);
  } else {
    copied.push(copilotDest);
    if (!options.dryRun) {
      await mkdir(path.dirname(copilotDest), { recursive: true });
      await writeFile(copilotDest, buildCopilotInstructions(), "utf-8");
    }
  }

  // Step 3.5: Distribute Copilot review instructions (create-only, force-disabled)
  const instructionsFiles = ["code-review.instructions.md", "principles.instructions.md"];
  for (const fileName of instructionsFiles) {
    const dest = path.join(destRoot, ".github", "instructions", fileName);
    const alreadyExists = await pathExists(dest);
    if (alreadyExists) {
      skipped.push(dest);
    } else {
      copied.push(dest);
      if (!options.dryRun) {
        await mkdir(path.dirname(dest), { recursive: true });
        const templateSrc = path.join(getInitAssetsDir(), ".github", "instructions", fileName);
        let content: string;
        try {
          content = await readFile(templateSrc, "utf-8");
        } catch (err: unknown) {
          const code =
            typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
          const detail = err instanceof Error ? err.message : String(err);
          throw new Error(
            `Failed to read the instructions template: ${templateSrc}` +
              ` (${code ?? detail}). Check that the package is installed correctly.`,
          );
        }
        await writeFile(dest, content, "utf-8");
      }
    }
  }

  // Step 4: Create skill directory symlinks
  const skillResult = await createSkillSymlinks(destRoot, skills, options);
  copied.push(...skillResult.copied);
  skipped.push(...skillResult.skipped);

  // Step 5: Create agent file symlinks (excluding README.md)
  const agentResult = await createAgentSymlinks(destRoot, agents, options);
  copied.push(...agentResult.copied);
  skipped.push(...agentResult.skipped);

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
    for (const skillId of skills) {
      const linkPath = path.join(destRoot, integDir, skillId);
      const target = path.relative(
        path.join(destRoot, integDir),
        path.join(destRoot, ".qfai", "assistant", "skills", skillId),
      );

      const result = await ensureSymlink(linkPath, target, "dir", options);
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
    // Write README as regular file (already handled in syncIntegrationWrappers)

    for (const agentName of agents) {
      const linkPath = path.join(destRoot, dir, `${agentName}${suffix}`);
      const target = path.relative(
        path.join(destRoot, dir),
        path.join(destRoot, ".qfai", "assistant", "agents", `${agentName}.md`),
      );

      const result = await ensureSymlink(linkPath, target, "file", options);
      if (result === "created") {
        copied.push(linkPath);
      } else {
        skipped.push(linkPath);
      }
    }
  }

  return { copied, skipped };
}

async function ensureSymlink(
  linkPath: string,
  target: string,
  type: "dir" | "file",
  options: WrapperSyncOptions,
): Promise<"created" | "skipped"> {
  const linkStat = await safeLstat(linkPath);

  if (linkStat !== undefined) {
    if (linkStat.isSymbolicLink()) {
      const currentTarget = await readlink(linkPath);
      const isValid = path.normalize(currentTarget) === path.normalize(target);

      if (isValid && !options.force) {
        return "skipped";
      }
      // Broken or --force → remove and recreate
      if (!options.dryRun) {
        await rm(linkPath, { recursive: true, force: true });
      }
    } else if (await isFlattenedLink(linkPath, target, linkStat)) {
      // A regular file whose entire content is the link target: the signature
      // of a checkout that flattened the symlink because `core.symlinks` was
      // false — the Windows default, and not carried by a clone
      // (`configureGitSymlinks` writes it repo-locally, and `.git/config` is
      // not cloned). Returning "skipped" made `qfai init` — the one command
      // that could repair it — report the broken entry in a reassuring list of
      // preserved paths and change nothing, so recovery required knowing to
      // pass `--force`, which nothing told the operator.
      //
      // Auto-repair is scoped to exactly this signature. A file whose content
      // is anything else is a file somebody wrote, and `--force` remains the
      // documented way to overwrite one.
      if (!options.dryRun) {
        // Recreate under a rollback, because the removal and the recreate can
        // fail independently: `symlink` raises EPERM on Windows without
        // Developer Mode, and a repair that had already deleted the file left
        // the wrapper *missing* — worse than the flattened state it started
        // from, and invisible afterwards because `QFAI-LINK-001` treats an
        // absent wrapper as one that was never created.
        return await recreateFlattenedLink(linkPath, target, type);
      }
      // The removal and the `symlink` are both suppressed under `--dry-run`;
      // saying "repaired" there reported a repair that did not happen, to the
      // one invocation whose whole purpose is to preview.
      info(`  would repair: ${linkPath} is a flattened symlink`);
      return "created";
    } else {
      // Regular file or directory with content of its own — a customised agent
      // wrapper, or a generated link replaced by a real directory. Preserve it
      // unless `--force`.
      if (!options.force) {
        return "skipped";
      }
      if (!options.dryRun) {
        await rm(linkPath, { recursive: true, force: true });
      }
    }
  }

  if (!options.dryRun) {
    await mkdir(path.dirname(linkPath), { recursive: true });
    try {
      await symlink(target, linkPath, type);
    } catch (err: unknown) {
      if (isEpermOnWindows(err)) {
        throw new Error(
          [
            "Failed to create a symlink (EPERM).",
            "On Windows, Developer Mode has to be enabled:",
            "  Settings > System > For developers > Developer Mode: ON",
            "Details: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
          ].join("\n"),
        );
      }
      throw err;
    }
  }

  return "created";
}

/**
 * Replaces a flattened link with the real symlink, restoring the file if the
 * symlink cannot be created.
 *
 * Without the rollback the failure mode is strictly worse than the state being
 * repaired: EPERM on Windows without Developer Mode leaves the wrapper absent,
 * and an absent wrapper is the one state `QFAI-LINK-001` deliberately treats as
 * benign — the project that predates a newly shipped skill looks the same. The
 * flattened file at least announced itself.
 */
/**
 * A sidecar path this call owns, created empty and exclusively.
 *
 * The name has to be unique against every other repair, including an earlier
 * one in this same process that failed and left its file behind. `wx` is what
 * makes the claim and the test one operation; the counter only has to produce
 * candidates, not guarantee anything by itself.
 */
/** Names {@link claimSidecar} produces, so prune leaves them alone. */
const SIDECAR_RE = /\.qfai-repair-\d+(?:-\d+)?$/;

/**
 * How much of a sidecar the copy fallback will hold in memory.
 *
 * The same ceiling the flattened-link probe vets against, so an entry that
 * probe refused is refused here too rather than read whole.
 */
const SIDECAR_COPY_MAX_BYTES = 4096;

async function claimSidecar(linkPath: string): Promise<string> {
  const base = `${linkPath}.qfai-repair-${String(process.pid)}`;
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${String(attempt)}`;
    try {
      await writeFile(candidate, "", { flag: "wx" });
      return candidate;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException | null)?.code !== "EEXIST") throw err;
    }
  }
  throw new Error(
    `Cannot reserve a sidecar path for the repair: ${base} and every numbered candidate already exists. Check for .qfai-repair-* files left behind by an earlier repair and move them aside.`,
  );
}

/**
 * Put the sidecar back at `linkPath`, refusing a path somebody else has taken.
 *
 * `link` is the primitive that refuses: `EEXIST` rather than replacing, and it
 * restores the same inode. Where the filesystem has no hard links an exclusive
 * `wx` write makes the same promise, reading the sidecar back as **bytes**:
 * the file may not be UTF-8, and a round trip through a string would replace
 * what it cannot decode. The sidecar survives until one of them has succeeded,
 * so the content is never only in flight.
 */
async function restoreSidecar(sidecar: string, linkPath: string): Promise<void> {
  try {
    await link(sidecar, linkPath);
  } catch (linkErr: unknown) {
    const code = (linkErr as NodeJS.ErrnoException | null)?.code;
    if (code === "EEXIST") throw linkErr;
    // `EPERM` / `ENOSYS` / `EXDEV`: no hard links here, not an occupied path.
    // Bytes, not a string. Decoding as UTF-8 and writing back replaces every
    // invalid sequence with U+FFFD, and the sidecar is removed straight after —
    // so a repair that exists to protect a concurrent write would have
    // corrupted the file it was protecting, irreversibly.
    //
    // And bounded, on the same ceiling the caller vets against. This path also
    // runs when the bounded probe **refused** the entry — an oversized file
    // another process left at the pathname — and reading it whole into memory
    // to copy it back was exactly the exhaustion the probe exists to avoid.
    // Nothing is lost by refusing: the content is in the sidecar, and the
    // message says where.
    // Pinned to one handle, like every other read of this file. A ceiling
    // checked by `stat` and a read taken by pathname are two operations on two
    // possibly different inodes, so a sidecar replaced or grown between them
    // was read unbounded anyway — the very exhaustion the ceiling is for, with
    // the wrapper's pathname still empty.
    const original = await readPinnedRegularFileBytes(sidecar, SIDECAR_COPY_MAX_BYTES);
    if (original === null) {
      throw new Error(
        [
          `Cannot restore the sidecar file (its kind changed, or it exceeds the ${String(SIDECAR_COPY_MAX_BYTES)} byte ceiling): ${linkPath}`,
          `This filesystem cannot create hard links, so the content copy is capped at that ceiling.`,
          `The original file is here: ${sidecar}`,
        ].join("\n"),
        { cause: linkErr },
      );
    }
    await writeFile(linkPath, original.content, { flag: "wx" });
    // Bytes are not the whole file. `writeFile` makes a **new** inode with the
    // umask and the parent's defaults, so a `0600` file another process left
    // here came back `0644` and readable by everyone, or lost its executable
    // bit — and the sidecar that still carried the metadata was removed
    // straight after. The hard-link path above keeps the mode by construction;
    // this one has to put it back.
    //
    // A restore that could not carry the mode is **not** a restore: the sidecar
    // stays and the failure is reported, because a file whose permissions are
    // now wrong is worse than one the operator is told where to find.
    try {
      await chmod(linkPath, original.mode);
    } catch (modeErr: unknown) {
      // Take the destination back out. This fallback created it exclusively, so
      // it is ours to remove — and leaving it is the harm the mode was being
      // restored to prevent: a `0600` file put back as `0644` is readable by
      // everyone, and reporting that while leaving it there fixes nothing. The
      // sidecar keeps the content and the permissions.
      const removeErr = await rm(linkPath, { force: true }).then(
        () => null,
        (err: unknown) => err,
      );
      throw new Error(
        [
          `Rolled the restore back because the sidecar file's permissions could not be restored: ${linkPath}`,
          `Cause: ${describeError(modeErr)}`,
          ...(removeErr === null
            ? []
            : [
                `Could not remove the restore destination that had already been created (its permissions differ from the original): ${describeError(removeErr)}`,
              ]),
          `The original file, permissions included, is here: ${sidecar}`,
        ].join("\n"),
        { cause: modeErr },
      );
    }
  }
  await rm(sidecar, { recursive: true, force: true });
}

async function recreateFlattenedLink(
  linkPath: string,
  target: string,
  type: "dir" | "file",
): Promise<"created" | "skipped"> {
  // Move aside first, then verify what was moved. Reading and then deleting by
  // pathname are two operations, and between them another process can replace
  // the file — so the delete destroyed content the check never saw, without
  // `--force`. `rename` is atomic against the pathname, and afterwards this
  // process holds the very bytes it is about to judge: if they are not the
  // flattened signature, the file goes straight back and nothing was ours to
  // remove. Nothing is deleted until the symlink is in place.
  // Claimed exclusively, then renamed onto the claim. A PID alone is not a
  // unique name: a second `runInit` in the same process — or a later one after
  // PID reuse — would rename straight over a sidecar an earlier failed repair
  // had left behind, and the success path removes the sidecar, so the message
  // that said the content was preserved would be describing a file that is
  // gone. `wx` refuses a name that is taken, so the loop finds one that is not.
  const sidecar = await claimSidecar(linkPath);
  try {
    await rename(linkPath, sidecar);
  } catch (renameErr: unknown) {
    // Nothing has moved, so the claim is a stray empty file — and it is one
    // prune deliberately leaves alone, while the next attempt sidesteps it with
    // a numbered name. Repeated failures would pile them up to the 1000-name
    // ceiling and refuse every later repair.
    await rm(sidecar, { force: true }).catch(() => undefined);
    throw renameErr;
  }
  // What was actually moved, not what the caller saw a moment ago. Between
  // `isFlattenedLink` and the rename another process can leave a huge file or a
  // FIFO at the path, and the caller's 4096-byte check protected an inode that
  // is no longer there.
  //
  // One `open`, `fstat` on that handle, a bounded read from it. Checking the
  // entry with `lstat` and then reading it by pathname were two operations on
  // two possibly different inodes: another process replacing the sidecar in
  // between, or growing it through an fd it held from before the rename, left
  // the read unbounded — memory exhausted, or blocked for ever on a FIFO —
  // with the original already moved aside and the pathname empty.
  //
  // Inside the rollback, because by now the wrapper *has* moved: a permission
  // change or a transient `EIO` here left the pathname empty and the original
  // in the sidecar, with nothing said about either — worse than the flattened
  // state the repair started from.
  //
  // Both early returns put the file back the same way the rollback does.
  // `rename` overwrites, so a path another process re-created while this one
  // was reading would have been destroyed by the very restore that exists to
  // leave it alone — the atomic claim belongs on every restore, not only the
  // one after a failed `symlink`.
  const original = await readPinnedRegularFile(sidecar, 4096).catch(async (readErr: unknown) => {
    // A failed restore here is not a detail to swallow. The wrapper is gone
    // from its pathname and lives in the sidecar, and re-throwing the read
    // error alone told the operator neither of those — so the original looked
    // simply lost. Same shape as the rollback below: what happened, and where
    // the content is.
    const restoreErr = await restoreSidecar(sidecar, linkPath).then(
      () => null,
      (err: unknown) => err,
    );
    if (restoreErr === null) throw readErr;
    throw new Error(
      [
        `Failed to repair the flattened symlink: ${linkPath}`,
        `Failed to read the sidecar file: ${describeError(readErr)}`,
        `The restore failed as well: ${describeError(restoreErr)}`,
        `The original file is here: ${sidecar}`,
      ].join("\n"),
      { cause: readErr },
    );
  });
  // `null` is the kind or the ceiling failing on the inode actually opened —
  // the same answer the caller's own check gave, taken again on what moved.
  if (original === null || toComparableTarget(original) !== toComparableTarget(target)) {
    await restoreSidecar(sidecar, linkPath);
    return "skipped";
  }
  try {
    await mkdir(path.dirname(linkPath), { recursive: true });
    await symlink(target, linkPath, type);
  } catch (err: unknown) {
    // The restore can fail on its own — a disk error, a permission change, a
    // transient I/O fault — and swallowing that reported a restore that did not
    // happen, on the one path where the operator has to know the file is gone.
    // Its outcome decides what the message says, and the content goes into the
    // message when it could not be written back.
    // Put it back by claiming the path atomically, not by checking that it is
    // free and then taking it. `rename` overwrites, and between a check and a
    // rename another process can create its own file here — an `EEXIST` from
    // `symlink` says one already did. A restore that destroys somebody else's
    // file is worse than no restore.
    //
    // `link` is the primitive that refuses: it fails with `EEXIST` rather than
    // replacing, and it puts back the same inode the sidecar holds. Where the
    // filesystem has no hard links, an exclusive `wx` write is the same promise
    // by different means. Either way the sidecar stays until one of them has
    // succeeded, so the content is never only in flight.
    let restoreError: unknown;
    try {
      await restoreSidecar(sidecar, linkPath);
    } catch (restoreErr: unknown) {
      restoreError = restoreErr;
    }
    const occupied = (restoreError as NodeJS.ErrnoException | null)?.code === "EEXIST";
    // Two different failures, and the operator acts on them differently: the
    // path is occupied by a file this process must not touch, or the rename
    // failed for its own reason. Either way the content is on disk, in the
    // sidecar — a path is more use than a copy pasted into an error message.
    const restored =
      restoreError === undefined
        ? "The original file was restored."
        : [
            occupied
              ? `${linkPath} holds a file created by another process, so it was not restored (an overwrite is avoided).`
              : `Restoring the original file failed as well: ${describeError(restoreError)}`,
            `The original content is kept here: ${sidecar}`,
            "Content:",
            original,
          ].join("\n");
    if (isEpermOnWindows(err)) {
      throw new Error(
        [
          `Failed to repair the flattened symlink (EPERM): ${linkPath}`,
          restored,
          "On Windows, Developer Mode has to be enabled:",
          "  Settings > System > For developers > Developer Mode: ON",
          "Details: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
        ].join("\n"),
      );
    }
    if (restoreError !== undefined) {
      throw new Error(
        [`Failed to repair the flattened symlink: ${linkPath}`, restored].join("\n"),
        { cause: err },
      );
    }
    throw err;
  }
  // Outside the try: the symlink is in place, so this is cleanup, and a failure
  // here — an ACL, an antivirus hold, a transient I/O error — is not the repair
  // failing. Inside it, the rollback ran against a path the new symlink already
  // occupies, so the restore raised `EEXIST` and `init` reported a repair that
  // had in fact succeeded, blaming Developer Mode on Windows.
  // Re-read before deleting, on the same terms. The handle that vetted the
  // content was closed when the read returned, and a process holding this inode
  // from before the rename can append in the window that follows — so a delete
  // on the strength of the earlier read discarded bytes nothing had seen, and
  // the symlink now standing in its place means they cannot be recovered.
  // Anything but the same target still there is left where it is, and named.
  const stillOurs = await readPinnedRegularFile(sidecar, 4096).catch(() => null);
  if (stillOurs === null || toComparableTarget(stillOurs) !== toComparableTarget(target)) {
    info(
      `  note: the repair succeeded, but the sidecar file was left in place because its content changed since it was inspected: ${sidecar}`,
    );
    info(`  repaired: ${linkPath} was a flattened symlink (recreating)`);
    return "created";
  }
  try {
    await rm(sidecar, { recursive: true, force: true });
  } catch (cleanupErr: unknown) {
    info(
      `  note: the repair succeeded, but the sidecar file could not be removed: ${sidecar} (${describeError(cleanupErr)})`,
    );
  }
  info(`  repaired: ${linkPath} was a flattened symlink (recreating)`);
  return "created";
}

/**
 * True when `linkPath` is a regular file whose whole content is `target`.
 *
 * That is what `git checkout` writes in place of a symlink when
 * `core.symlinks` is false: the link target, verbatim, with no trailing
 * newline. Bounded by a size check first so a large user file is never read,
 * and compared through `path.normalize` so a separator difference does not
 * make a flattened link look like user content.
 *
 * **Byte-exact.** `trim()` widened the match past the signature — a wrapper
 * somebody manages by hand, written by an editor or `echo` that appends a
 * newline, read as flattened and was deleted without `--force` — and
 * `path.normalize` widened it the same way for a different input:
 * `../../.qfai//assistant/x` and `../../.qfai/assistant/./x` are not the bytes
 * git writes, but normalize to them. The only difference this tolerates is the
 * path separator, and **only on Windows**, because git writes `/` and the
 * target is built with `path.relative`, which yields `\\` there. Everything
 * else takes the preserve path, which is the safe direction to be wrong in.
 */
/**
 * Separator-insensitive on Windows, byte-exact everywhere else — see
 * {@link isFlattenedLink}.
 *
 * On POSIX a backslash is an ordinary character in a filename, and folding it
 * made a hand-maintained `..\\..\\.qfai\\assistant\\skills\\...` — a regular
 * file nobody asked init to own — compare equal to the
 * `../../.qfai/assistant/...` git actually writes, so it was deleted without
 * `--force`. The tolerance exists for one platform; it applies there only.
 */
function toComparableTarget(value: string): string {
  return process.platform === "win32" ? value.split("\\").join("/") : value;
}

async function isFlattenedLink(linkPath: string, target: string, known?: Stats): Promise<boolean> {
  // The caller has already `lstat`ed this path, and re-probing it opened a hole
  // the rest of this function had been closed against: `safeLstat` turns a
  // transient `EIO` or an `EACCES` into `undefined`, which reads as "somebody
  // else's file", so init left a flattened wrapper in the reassuring `skipped`
  // list. Pass the `Stats` it already holds.
  const stats = known ?? (await safeLstat(linkPath));
  if (stats === undefined || !stats.isFile()) {
    return false;
  }
  // A read failure is not "somebody else's file". `lstat` already succeeded,
  // so the file is there; an ACL or a transient I/O fault means the signature
  // could not be checked, and answering `false` put the path in the reassuring
  // `skipped` list while leaving a flattened wrapper in place — `QFAI-LINK-001`
  // then keeps failing with nothing the operator can act on. Absence stays
  // `false`: that is a race with something else removing it.
  //
  // The ceiling is applied to the entry that is **read**, not to the one
  // `lstat` saw. Between them another process can leave a huge file or a FIFO
  // at the path, and a bound checked on the old inode did not bind the new one
  // — the read then exhausted memory or never returned. One `open`, `fstat` on
  // that handle, a bounded read from it.
  try {
    const content = await readPinnedRegularFile(linkPath, 4096);
    return content !== null && toComparableTarget(content) === toComparableTarget(target);
  } catch (error: unknown) {
    // Absence stays `false`: that is a race with something else removing it,
    // not a statement about what the entry holds.
    if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * The bytes of a regular file no larger than `maxBytes`, read from the inode
 * the size was measured on, or `null` when the entry is not one.
 *
 * **The ceiling binds the entry that is read**, not the one a previous
 * `lstat` saw. Those are two pathname operations, and between them another
 * process can replace the path with a huge file or a FIFO — a bound checked on
 * the old inode does not bind the new one, and the read then exhausted memory
 * or never returned. One `open`, `fstat` on that handle, a bounded read from
 * it.
 *
 * A read fault is thrown rather than answered `null`: an ACL or a transient
 * `EIO` says the content could not be checked, and reporting that as "not a
 * bounded regular file" is a decision nobody made.
 */
async function readPinnedRegularFile(filePath: string, maxBytes: number): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile() || pinned.size > maxBytes) {
      return null;
    }
    // Read to the end, not once: `read` may return fewer bytes than asked for,
    // and the unfilled tail stayed NUL — a correct flattened wrapper then
    // failed its own signature comparison and was left in place.
    //
    // And to `maxBytes + 1`, not to the size just measured. Another process
    // holding this inode from before the rename can append after the `fstat`,
    // and stopping at the old size read a **prefix** — which still matched the
    // target, so the repair went ahead and the cleanup deleted the sidecar with
    // the appended bytes in it. One byte past the ceiling is what distinguishes
    // "this is the whole file" from "this is as much as I asked for".
    const buffer = Buffer.alloc(maxBytes + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    if (filled > maxBytes) return null;
    return buffer.subarray(0, filled).toString("utf-8");
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    // `ENXIO` is what `O_NONBLOCK` returns for a FIFO with no writer, in place
    // of blocking. Neither it nor a directory is a bounded regular file, and
    // `open` is simply where that shows up instead of `fstat`.
    if (code === "ENXIO" || code === "EISDIR") return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * The same read, returning the bytes.
 *
 * The restore copy writes back what it read, and decoding as UTF-8 first
 * replaces every invalid sequence with U+FFFD — irreversibly, since the sidecar
 * is removed straight after.
 */
async function readPinnedRegularFileBytes(
  filePath: string,
  maxBytes: number,
): Promise<{ content: Buffer; mode: number } | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile() || pinned.size > maxBytes) return null;
    const buffer = Buffer.alloc(maxBytes + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    if (filled > maxBytes) return null;
    // The mode comes from this `fstat`, not from a separate `stat` on the
    // pathname. Two operations could land on two inodes: content read from a
    // replacement that somebody made `0600` for a reason, restored under the
    // `0644` the old entry carried, and readable by everyone.
    return { content: Buffer.from(buffer.subarray(0, filled)), mode: pinned.mode & 0o7777 };
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENXIO" || code === "EISDIR") return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * Read-only, non-blocking where the platform defines it.
 *
 * Opening a FIFO for reading blocks until a writer appears, and the point of a
 * size check is not to be at the mercy of what is at the path. Windows has no
 * `O_NONBLOCK`, and no FIFOs in this sense either.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

/** Message text for an unknown thrown value, without `[object Object]`. */
function describeError(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

function isEpermOnWindows(err: unknown): boolean {
  return (
    process.platform === "win32" &&
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "EPERM"
  );
}

async function safeLstat(target: string): Promise<Stats | undefined> {
  try {
    return await lstat(target);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Canonical skill / agent collection
// ---------------------------------------------------------------------------

async function collectCanonicalSkillIds(assistantAssetsDir: string): Promise<string[]> {
  const skillsDir = path.join(assistantAssetsDir, "skills");
  if (!(await exists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDoc = path.join(skillsDir, entry.name, "SKILL.md");
    if (await exists(skillDoc)) {
      skills.push(entry.name);
    }
  }

  return skills.sort();
}

async function collectCanonicalAgentNames(assistantAssetsDir: string): Promise<string[]> {
  const agentsDir = path.join(assistantAssetsDir, "agents");
  if (!(await exists(agentsDir))) {
    return [];
  }

  const entries = await readdir(agentsDir, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name === "README.md") {
      continue;
    }
    names.push(entry.name.slice(0, -".md".length));
  }

  return names.sort();
}

// ---------------------------------------------------------------------------
// Prune deprecated wrappers
// ---------------------------------------------------------------------------

async function pruneStaleQfaiWrappers(
  destRoot: string,
  canonicalSkills: string[],
  dryRun: boolean,
): Promise<string[]> {
  const canonical = new Set(canonicalSkills);
  const removed: string[] = [];

  // 1. Remove ALL .claude/commands/qfai-*.md (deprecated category)
  await pruneMatchingEntries(
    path.join(destRoot, ".claude", "commands"),
    (entry) => entry.isFile() && entry.name.startsWith("qfai-") && entry.name.endsWith(".md"),
    removed,
    dryRun,
  );

  // 2. Remove ALL .github/prompts/qfai-*.prompt.md (deprecated category)
  await pruneMatchingEntries(
    path.join(destRoot, ".github", "prompts"),
    (entry) =>
      entry.isFile() && entry.name.startsWith("qfai-") && entry.name.endsWith(".prompt.md"),
    removed,
    dryRun,
  );

  // 3. Remove stale or non-symlink qfai-* entries in skill integration dirs
  for (const integDir of SKILL_INTEGRATION_DIRS) {
    const fullDir = path.join(destRoot, integDir);
    if (!(await exists(fullDir))) {
      continue;
    }
    const entries = await readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.name.startsWith("qfai-")) {
        continue;
      }
      // A repair sidecar is not a stale wrapper. It is named after the wrapper
      // it holds — `qfai-atdd.qfai-repair-1234` — so it matches this prefix,
      // and prune runs before the repair does: a `--force` re-run would delete
      // the very file an earlier failed repair preserved, which is the one
      // case the sidecar exists for.
      if (SIDECAR_RE.test(entry.name)) {
        continue;
      }
      const entryPath = path.join(fullDir, entry.name);
      const isStale = !canonical.has(entry.name);
      const isNonSymlink = !entry.isSymbolicLink();

      if (isStale || isNonSymlink) {
        removed.push(entryPath);
        if (!dryRun) {
          await rm(entryPath, { recursive: true, force: true });
        }
      }
    }
  }

  // 4. Agent symlinks: NOT auto-pruned.
  // Agent symlinks use different suffixes per integration dir (.md vs .agent.md),
  // so stale agent symlinks (agents removed from canonical) are not auto-detected.
  // ensureSymlink --force recreates existing entries but does not remove orphaned ones.
  // Manual removal is required when a canonical agent is deleted.

  return removed;
}

/**
 * The shipped and retired workflow name sets, re-exported.
 *
 * They moved to `shared/shippedWorkflowNames.ts` because `core/`'s doctor reader needs the same
 * answer and may not import from `cli/`: review finding [86] found the packaged-tree
 * precondition calling a gutted directory healthy, and the fix is for that reader to know what
 * this package ships. The re-export keeps this module's public surface exactly as it was.
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
 * than of leading path segments. Review finding [114] measured the first version doing the
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
 * Review finding [109]: the ancestor CHECK ran once, before a copy that performs many
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
      // Review finding [121] made this branch stop returning `true`, and review finding [129]
      // showed that settling on the post-copy reading was not enough either: that reading says
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
    // delete. Every refusal leaves the name un-pruned. Review finding [05].
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
  // The identity this run settled on, not merely `a real directory`. Review finding [121]:
  // the check below asks whether the ancestors are real directories, which every swapped-in
  // real directory also satisfies.
  if (!(await workflowAncestorsMatch(destRoot, settled))) {
    return;
  }
  // Asked again, here, and not only before the copy. Review finding [35]: the check that
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
    // delete. Review finding [07].
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
    // to drift detection from then on. Review finding [03].
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
    // not this run's to remove. Review finding [06].
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
 * can only ever see the `readdir` snapshot, and every caller here decides ownership by
 * CONTENT — the file still holds the bytes QFAI recorded writing. A caller with no content
 * test passes `undefined` and gets the snapshot behaviour. `confirm` receives the path to
 * READ and, separately, the entry's original name, because after the move the two differ and
 * a caller looking its digest up by basename would be looking up the quarantine name.
 *
 * Why the move at all — review finding [33]. Checking a pathname, re-checking it and then
 * deleting it are three operations on a NAME, and between any two of them the adopter can put
 * their own file there: the digest that was verified and the bytes that are deleted are then
 * different objects, and the deleted one is theirs. Renaming the entry to a name nothing else
 * holds collapses the three into one object — everything after the rename acts on what was
 * moved, whatever later takes the vacated name.
 *
 * `commit` is what makes the removal a UNIT with whatever else has to happen for it. Review
 * finding [34]: the retired-workflow caller deleted the files and then removed their provenance
 * entries in a second step, so a read-only `.qfai`, a full disk or a lock it could not take left
 * the files gone and the entries standing — which the next run reads as names the adopter
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
  // Entries this run moved aside and could not put back. Review finding [138]: restoring by
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
      // independent reasons a swapped directory survives. Review finding [30].
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
 * A directory, not a claimed filename, and that is review finding [136]. The previous version
 * claimed a random name with `wx`, closed the handle, and then renamed onto it — so between the
 * close and the rename anything that can write the adopter's tree could replace the claim, and
 * `rename` would silently destroy the replacement. The comment above it said the claim made the
 * name exclusive; it made it exclusive at the moment of the claim and not at the moment of use.
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
 * Review finding [138]: there used to be a fallback for filesystems without hard links — an
 * `exists` check and then a plain `rename`. A check is not a guarantee, and between the two a
 * concurrent `init` or the adopter could create the file that the rename then destroyed. There is
 * no way to make `rename` refuse an occupied destination, so the fallback is gone: when the
 * destination cannot be proven free, the entry stays in quarantine and the caller reports it.
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
// README / copilot-instructions builders (regular files)
// ---------------------------------------------------------------------------

function buildReadmeEntries(): WrapperEntry[] {
  return [
    {
      relativePath: ".agents/README.md",
      body: buildAgentsReadme(),
    },
    {
      relativePath: ".codex/README.md",
      body: buildCodexReadme(),
    },
    {
      relativePath: ".claude/agents/README.md",
      body: buildClaudeAgentsReadme(),
    },
    {
      relativePath: ".github/agents/README.md",
      body: buildGithubAgentsReadme(),
    },
  ];
}

function buildCodexReadme(): string {
  return [
    "# QFAI Codex skills",
    "",
    "This directory provides Codex skill symlinks for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "Skill symlinks point to QFAI's canonical skill documents under:",
    "",
    "- .qfai/assistant/skills/",
    "",
    "These canonical skill documents are the SSOT.",
    "Tool integrations must reference `.qfai/assistant/skills/`.",
    "",
    "## Usage",
    "",
    "In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.",
    "All outputs must match the user's language.",
    "",
    "## Cross-AI rules (master)",
    "",
    "The authoritative rule set shared across all AI coding agents (Claude",
    "Code / Codex / Copilot) lives under `.agents/rules/`. These files are",
    "SSOT; tool-specific mirrors reference them.",
    "",
    "Key rules:",
    "",
    "- `.agents/rules/temporary-files.md` — temporary files MUST go under `tmp/`.",
    "- `.agents/rules/root-additions-policy.md` — never add root-level files/dirs without explicit user approval.",
    "- `.agents/rules/distributed-surface.md` — no internal QFAI IDs or version markers in shipped files.",
    "- `.agents/rules/version-discipline.md` — branch name pins `packages/qfai/package.json#version`; never select version numbers independently.",
    "",
  ].join("\n");
}

function buildAgentsReadme(): string {
  return [
    "# QFAI Agents skills",
    "",
    "This directory provides Agents/Codex-compatible skill symlinks for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "Skill symlinks point to QFAI's canonical skill documents under:",
    "",
    "- .qfai/assistant/skills/",
    "",
    "These canonical skill documents are the SSOT.",
    "",
  ].join("\n");
}

function buildClaudeAgentsReadme(): string {
  return [
    "# QFAI Claude agents",
    "",
    "This directory provides Claude Code agent symlinks for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "Agent symlinks point to:",
    "",
    "- .qfai/assistant/agents/",
    "",
    "The canonical role cards live in `.qfai/assistant/agents/**`.",
    "",
  ].join("\n");
}

function buildGithubAgentsReadme(): string {
  return [
    "# QFAI GitHub agents",
    "",
    "This directory provides GitHub Copilot custom agent symlinks for QFAI.",
    "",
    "## Canonical entrypoint",
    "",
    "Agent symlinks point to:",
    "",
    "- .qfai/assistant/agents/",
    "",
    "The canonical role cards live in `.qfai/assistant/agents/**`.",
    "",
  ].join("\n");
}

function buildCopilotInstructions(): string {
  return [
    "# QFAI repository instructions (Copilot)",
    "",
    "This repository uses QFAI (Quality-First AI) to improve the quality and consistency of AI-assisted development.",
    "",
    "## Golden rules",
    "",
    "- Always match the user's language in your outputs.",
    "- Treat `.qfai/` as the canonical source of truth for the QFAI workflow:",
    "  - Skills (SSOT): `.qfai/assistant/skills/`",
    "  - Foundational rules: `.qfai/assistant/constitution/` (post-recut)",
    "  - Declarative manifests: `.qfai/assistant/manifest/`",
    "  - Reference catalogs: `.qfai/assistant/catalog/`",
    "  - Process / migration memos: `.qfai/assistant/process/`",
    "  - AI work-log surface (per-project): `.qfai/steering/` (entry frontmatter schema: `.qfai/assistant/catalog/worklog-entry.schema.md`)",
    "- Legacy `.qfai/assistant/steering/` is read-compatible only during",
    "  the deprecation window (`D-DEPRECATED-PATH` warning fires when it",
    "  is detected). Run `qfai init --upgrade-assistant-tree` to migrate.",
    "- When asked to perform QFAI workflow tasks, prefer using the QFAI skill symlinks in `.github/skills/`.",
    "  - These symlinks resolve to `.qfai/assistant/skills/<skill-name>/`.",
    "- Do not invent repository structure, tools, or frameworks. Inspect the repo first and align with what is already used.",
    "- Keep changes minimal and targeted. Update tests and docs when behavior changes.",
    "",
    "## Cross-AI rules (master)",
    "",
    "The authoritative rule set shared across all AI coding agents (Claude",
    "Code / Codex / Copilot) lives under `.agents/rules/`. Tool-specific",
    "mirrors (`.claude/rules/`, etc.) reference these masters; the",
    "`.agents/rules/` files are SSOT.",
    "",
    "Key rules to follow:",
    "",
    "- `.agents/rules/temporary-files.md` — temporary files MUST go under `tmp/`.",
    "- `.agents/rules/root-additions-policy.md` — never add root-level files/dirs without explicit user approval.",
    "- `.agents/rules/distributed-surface.md` — no internal QFAI IDs or version markers in shipped files.",
    "- `.agents/rules/version-discipline.md` — branch name pins `packages/qfai/package.json#version`; never select version numbers independently.",
    "",
  ].join("\n");
}

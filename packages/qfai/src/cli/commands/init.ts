import path from "node:path";
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
      "NOTE: --force は .qfai/assistant/skills/** と assistant/agents/**、symlink assets（.agents/.claude/.github/.codex）を再生成し、legacy 10_workflow.md と旧ラッパーを削除します（specs/contracts/steering および assistant/manifest/** は上書きしません — manifest は `qfai-configure` が編集するユーザ設定です）。",
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

  // root/ と .qfai/ は create-only（既存は skip）
  // STANDARD_ASSET_PATHS のみ --force で上書きする
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    protect: ["DESIGN.md"],
  });
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
  const removed = [...removedLegacySkills, ...wrappersResult.removed];

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
    info("Copilot コードレビュー用 instructions を作成しました。");
    info("有効化: PR コメントで '@github-copilot review' を実行するか、");
    info("GitHub Actions ワークフローで自動レビューを設定してください。");
    info("参考: https://docs.github.com/en/copilot/using-github-copilot/code-review");
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
        "git config core.symlinks true の設定に失敗しました。",
        "手動で以下を実行してください:",
        "  git config core.symlinks true",
        `原因: ${detail}`,
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
            `instructions テンプレートの読み込みに失敗しました: ${templateSrc}` +
              ` (${code ?? detail})。パッケージが正しくインストールされているか確認してください。`,
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
            "symlink の作成に失敗しました (EPERM)。",
            "Windows では Developer Mode を有効にする必要があります:",
            "  設定 > システム > 開発者向け > 開発者モード を ON",
            "詳細: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
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
    `修復用の退避先を確保できません: ${base} と連番の候補がすべて既存です。前回の修復が残した .qfai-repair-* を確認して退避してください。`,
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
          `退避したファイルを復元できません（種別が変わったか、上限 ${String(SIDECAR_COPY_MAX_BYTES)} bytes を超えています）: ${linkPath}`,
          `このファイルシステムでは hard link を作成できず、内容のコピーはその上限までに制限しています。`,
          `元のファイルは次の場所にあります: ${sidecar}`,
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
          `退避したファイルのパーミッションを復元できなかったため、復元を取り消しました: ${linkPath}`,
          `原因: ${describeError(modeErr)}`,
          ...(removeErr === null
            ? []
            : [
                `作成済みの復元先を削除できませんでした（権限が元と異なります）: ${describeError(removeErr)}`,
              ]),
          `元のファイル（パーミッションを含む）は次の場所にあります: ${sidecar}`,
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
        `平坦化された symlink の修復に失敗しました: ${linkPath}`,
        `退避したファイルの読み取りに失敗しました: ${describeError(readErr)}`,
        `復元にも失敗しました: ${describeError(restoreErr)}`,
        `元のファイルは次の場所にあります: ${sidecar}`,
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
        ? "元のファイルは復元しました。"
        : [
            occupied
              ? `${linkPath} には別プロセスが作成したファイルが存在するため、復元しませんでした（上書きを避けています）。`
              : `元のファイルの復元にも失敗しました: ${describeError(restoreError)}`,
            `元の内容は次の場所に退避してあります: ${sidecar}`,
            "内容:",
            original,
          ].join("\n");
    if (isEpermOnWindows(err)) {
      throw new Error(
        [
          `平坦化された symlink の修復に失敗しました (EPERM): ${linkPath}`,
          restored,
          "Windows では Developer Mode を有効にする必要があります:",
          "  設定 > システム > 開発者向け > 開発者モード を ON",
          "詳細: https://learn.microsoft.com/windows/apps/get-started/enable-your-device-for-development",
        ].join("\n"),
      );
    }
    if (restoreError !== undefined) {
      throw new Error(
        [`平坦化された symlink の修復に失敗しました: ${linkPath}`, restored].join("\n"),
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
      `  note: 修復は成功しましたが、退避ファイルの内容が検査時から変わっていたため削除していません: ${sidecar}`,
    );
    info(`  repaired: ${linkPath} was a flattened symlink (recreating)`);
    return "created";
  }
  try {
    await rm(sidecar, { recursive: true, force: true });
  } catch (cleanupErr: unknown) {
    info(
      `  note: 修復は成功しましたが退避ファイルを削除できませんでした: ${sidecar} (${describeError(cleanupErr)})`,
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

/**
 * `.claude/commands/` と `.github/prompts/` に qfai が実際に書いたことのある
 * wrapper の basename (拡張子を除いた stem)。
 *
 * この 2 ディレクトリへの書き込みは symlink 方式への移行時に廃止され、以降
 * init は一切書き込まない — つまり今そこにあるものは、この閉じた集合に載って
 * いる名前を除いてすべてプロジェクトが自分で置いたものである。`qfai-*` という
 * 開いた glob で消していたため、`.claude/commands/qfai-release.md` のような
 * プロジェクト固有の slash command が `--force` のたびに消えていた。
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
  "qfai-spec",
  "qfai-tdd-green",
  "qfai-tdd-red",
  "qfai-tdd-refactor",
  "qfai-unit-test",
  "qfai-verify",
]);

/**
 * その wrapper を init が書いたと本文が証明するか。
 *
 * stem は「過去に qfai がその名前を使った」ことしか示さない。プロジェクトが
 * 自分で `.claude/commands/qfai-spec.md` を書いた場合も、旧 wrapper を自前の
 * 内容に差し替えた場合も、名前だけで消せばユーザのコンテンツを失う。qfai が
 * 配ってきた wrapper は例外なく「同じ stem の canonical doc」への参照を本文に
 * 持つ (`@.qfai/assistant/prompts/<stem>.md` あるいは
 * `.qfai/assistant/skills/<stem>/SKILL.md`) — 出荷された全世代の wrapper が
 * そうなっている。この参照が生成物である証拠であり、これを持たないファイルは
 * stem が一致しても触らない。
 */
async function isInitWrittenWrapper(dir: string, name: string, suffix: string): Promise<boolean> {
  if (!name.endsWith(suffix)) {
    return false;
  }
  const stem = name.slice(0, -suffix.length);
  if (!LEGACY_WRAPPER_STEMS.has(stem)) {
    return false;
  }

  let body: string;
  try {
    body = await readFile(path.join(dir, name), "utf-8");
  } catch {
    // 読めないものは「qfai が書いたと証明できないもの」であり、保存側に倒す。
    return false;
  }

  return (
    body.includes(`.qfai/assistant/prompts/${stem}.md`) ||
    body.includes(`.qfai/assistant/skills/${stem}/SKILL.md`)
  );
}

/**
 * かつて出荷され、いまの roster から外れた skill id。
 *
 * init が wrapper symlink を張るのは出荷 roster の skill だけなので、
 * 「出荷中」でも「引退済み」でもない名前のリンクは init の生成物ではない。
 * プロジェクトが自前の `.qfai/assistant/skills/my-skill/` を持つことは
 * 許可されており (`integrationSurface.ts` の `canonicalSkillIds` 参照)、
 * それを `.claude/skills/my-skill` から symlink するのは正当な運用なので、
 * リンク先が canonical tree 内であることだけを根拠に消してはいけない。
 */
const RETIRED_SKILL_IDS: ReadonlySet<string> = new Set([
  "qfai-discuss",
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
 * その entry が init の張った skill symlink か — 名前ではなくリンク先で判定する。
 *
 * 所有権の証拠は名前ではない。`qfai-` は予約された prefix ではなく、canonical
 * roster 自身が `web-research` という prefix を持たない skill を含む。名前で
 * 判定していたため、プロジェクトが自分で用意した `.claude/skills/qfai-deploy`
 * が `--force` でディレクトリごと消えていた。init が張るのは canonical tree へ
 * 解決される symlink だけなので、これは必要条件 — ただし十分条件ではないため、
 * 呼び出し側で {@link RETIRED_SKILL_IDS} と併せて判定する。
 */
async function linksIntoCanonicalSkills(
  entryPath: string,
  canonicalSkillsDir: string,
): Promise<boolean> {
  let target: string;
  try {
    target = await readlink(entryPath);
  } catch {
    // 読めないものは「qfai のものだと証明できないもの」であり、保存側に倒す。
    return false;
  }
  const resolved = path.resolve(path.dirname(entryPath), target);
  const rel = path.relative(canonicalSkillsDir, resolved);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function pruneStaleQfaiWrappers(
  destRoot: string,
  canonicalSkills: string[],
  dryRun: boolean,
): Promise<string[]> {
  const canonical = new Set(canonicalSkills);
  const removed: string[] = [];

  // 1. Remove the .claude/commands/*.md wrappers qfai itself once wrote
  await pruneMatchingEntries(
    path.join(destRoot, ".claude", "commands"),
    async (entry, dir) => entry.isFile() && (await isInitWrittenWrapper(dir, entry.name, ".md")),
    removed,
    dryRun,
  );

  // 2. Remove the .github/prompts/*.prompt.md wrappers qfai itself once wrote
  await pruneMatchingEntries(
    path.join(destRoot, ".github", "prompts"),
    async (entry, dir) =>
      entry.isFile() && (await isInitWrittenWrapper(dir, entry.name, ".prompt.md")),
    removed,
    dryRun,
  );

  // 3. Remove stale skill symlinks — entries whose target proves init wrote them
  const canonicalSkillsDir = path.join(destRoot, ".qfai", "assistant", "skills");
  for (const integDir of SKILL_INTEGRATION_DIRS) {
    const fullDir = path.join(destRoot, integDir);
    if (!(await exists(fullDir))) {
      continue;
    }
    const entries = await readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      // 修復 sidecar (`qfai-atdd.qfai-repair-1234`) は通常ファイルなので、
      // symlink 限定の判定に切り替えた時点で対象外になる。prune は repair より
      // 先に走るため、これを消すと前回の失敗した修復が残した唯一の控えを
      // 失うことになる。
      if (!entry.isSymbolicLink()) {
        continue;
      }
      if (canonical.has(entry.name)) {
        continue;
      }
      // 出荷中でも引退済みでもない名前は init が wrapper を張った skill では
      // ない — プロジェクトが自前の canonical skill へ張ったリンクなので残す。
      if (!RETIRED_SKILL_IDS.has(entry.name)) {
        continue;
      }
      const entryPath = path.join(fullDir, entry.name);
      if (!(await linksIntoCanonicalSkills(entryPath, canonicalSkillsDir))) {
        continue;
      }

      removed.push(entryPath);
      if (!dryRun) {
        await rm(entryPath, { recursive: true, force: true });
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

async function pruneMatchingEntries(
  dir: string,
  predicate: (entry: Dirent, dir: string) => Promise<boolean>,
  removed: string[],
  dryRun: boolean,
): Promise<void> {
  if (!(await exists(dir))) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!(await predicate(entry, dir))) {
      continue;
    }
    const target = path.join(dir, entry.name);
    removed.push(target);
    if (!dryRun) {
      await rm(target, { recursive: true, force: true });
    }
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

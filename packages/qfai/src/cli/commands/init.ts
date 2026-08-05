import path from "node:path";
import type { Dirent, Stats } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
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
      "NOTE: --force は .qfai/assistant/skills/** と symlink assets（.agents/.claude/.github/.codex）を再生成し、legacy 10_workflow.md と旧ラッパーを削除します（specs/contracts 等は上書きしません）。",
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
  // assistant/skills のみ --force で上書きする
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
    exclude: ["assistant/skills"],
  });
  const skillsResult = await copyTemplatePaths(qfaiAssets, destQfai, ["assistant/skills"], {
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
  const removedLegacySkills = options.force
    ? await pruneLegacySkillFiles(destRoot, options.dryRun)
    : [];

  // Retired shipped workflows: prune by retired-name-set membership ONLY.
  // The adopter's `.github/workflows/` directory is adopter-authored; the
  // `qfai-` filename prefix is a reservation notice, never a deletion
  // selector, so a prefix predicate is forbidden here (shipped-workflows
  // contract) — an adopter-created `qfai-*.yml` must stay untouched.
  const removedRetiredWorkflows: string[] = [];
  await pruneMatchingEntries(
    path.join(destRoot, ".github", "workflows"),
    (entry) => entry.isFile() && RETIRED_WORKFLOW_NAMES.has(entry.name),
    removedRetiredWorkflows,
    options.dryRun,
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

async function ensureRootGitignoreEntries(
  destRoot: string,
  dryRun: boolean,
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
  // negation hand-placed above `.qfai/evidence/*` is inert and the decision
  // records stay ignored. `governanceNegationsEffective` re-checks the order.
  //
  // Required entries are matched only against the managed block: a project that
  // deliberately removed, say, `.qfai/evidence/*` to track its own audit trail
  // must not have that choice silently undone by the next `qfai init`.
  const managedBlock = extractManagedBlock(existing);
  if (
    existing.includes(QFAI_GITIGNORE_MARKER) &&
    QFAI_GITIGNORE_GOVERNANCE_NEGATIONS.every((entry) => managedBlock.includes(entry)) &&
    governanceNegationsEffective(managedBlock) &&
    QFAI_GITIGNORE_LEGACY_LINES.every((entry) => !existing.includes(entry))
  ) {
    return { copied: [], skipped: [gitignorePath] };
  }

  // Strip existing managed QFAI block (known block lines only; stop at unknown lines; loop for duplicates)
  const stripped = existing.includes(QFAI_GITIGNORE_MARKER)
    ? removeManagedBlock(existing)
    : existing;

  if (dryRun) {
    info(`  would update: .gitignore (append QFAI entries)`);
    return { copied: [gitignorePath], skipped: [] };
  }

  const separator = stripped.length > 0 && !stripped.endsWith("\n") ? "\n\n" : "\n";
  const content =
    stripped.length > 0 ? stripped + separator + QFAI_GITIGNORE_BLOCK : QFAI_GITIGNORE_BLOCK;
  await writeFile(gitignorePath, content, "utf-8");
  info("  updated: .gitignore (appended QFAI entries)");
  return { copied: [gitignorePath], skipped: [] };
}

/**
 * The contiguous QFAI managed block, or `""` when the marker is absent.
 *
 * Freshness is judged against the block this writer owns, not the whole file:
 * a project that deliberately deleted an ignore line to track its own audit
 * trail keeps that choice, and a line the user re-added elsewhere does not
 * make a stale managed block look current.
 */
function extractManagedBlock(content: string): string {
  const lines = content.split("\n");
  const startIdx = lines.findIndex((line) => line.includes(QFAI_GITIGNORE_MARKER));
  if (startIdx === -1) {
    return "";
  }
  const knownLines = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);
  let endIdx = startIdx + 1;
  while (endIdx < lines.length && knownLines.has(lines[endIdx] ?? "")) {
    endIdx += 1;
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

/**
 * True when every governance negation appears AFTER the ignore line it undoes.
 *
 * Git applies the last matching pattern, so `!.qfai/evidence/decisions/` placed
 * above `.qfai/evidence/*` re-ignores the directory and the decision records
 * stay untracked while the file looks correct to a presence-only check.
 */
function governanceNegationsEffective(block: string): boolean {
  const lines = block.split("\n");
  for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
    const negationIdx = lines.indexOf(negation);
    if (negationIdx === -1) {
      return false;
    }
    // The ignore line this negation undoes, e.g. `.qfai/evidence/*`.
    const target = negation.replace(/^!/, "").replace(/\/(\*\*)?$/, "");
    const ignoreIdx = lines.findIndex(
      (line) =>
        !line.startsWith("!") && line.endsWith("/*") && target.startsWith(line.slice(0, -2)),
    );
    if (ignoreIdx !== -1 && ignoreIdx > negationIdx) {
      return false;
    }
  }
  return true;
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

const SKILL_INTEGRATION_DIRS = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
];

const AGENT_INTEGRATION_CONFIGS: Array<{ dir: string; suffix: string }> = [
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
    } else {
      // Regular file/dir exists
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
 * Names the current package version ships into the adopter's
 * `.github/workflows/` directory (the shipped-workflows contract's write
 * set). This is the in-binary name list: it is never computed by globbing
 * the asset tree at runtime or the adopter's disk, and the shipped-asset
 * shape gate keeps it equal to the packaged workflow assets.
 */
export const SHIPPED_WORKFLOW_NAMES: ReadonlySet<string> = new Set<string>(["qfai-validate.yml"]);

/**
 * Names a previous package version shipped into the adopter's
 * `.github/workflows/` directory that the current version no longer ships
 * (the shipped-workflows contract's prune set). A name moves here in the
 * same change that stops shipping it; a name in neither the shipped nor
 * the retired list is not QFAI's. Never computed by globbing the
 * adopter's disk. Currently empty: no shipped workflow has been retired.
 */
export const RETIRED_WORKFLOW_NAMES: ReadonlySet<string> = new Set<string>();

/**
 * The only removal primitive for QFAI-owned entries in an adopter tree:
 * removes the direct entries of `dir` that match `predicate`, appending
 * each removed path to `removed`. Exported for reuse — the
 * shipped-workflows contract forbids parallel removal implementations.
 */
export async function pruneMatchingEntries(
  dir: string,
  predicate: (entry: Dirent) => boolean,
  removed: string[],
  dryRun: boolean,
): Promise<void> {
  if (!(await exists(dir))) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!predicate(entry)) {
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

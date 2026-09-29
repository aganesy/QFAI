import { lstat, mkdir, readdir, readlink, realpath, rename, stat } from "node:fs/promises";
import path from "node:path";

import { collectTemplateFiles, copyTemplatePaths } from "../../core/fs/templateCopy.js";
import { AGENT_ENTRY_POINT_FILES } from "../../core/agentEntryPoints.js";
import { hashAssistantAssetFile } from "../../core/assistantAssetProvenance.js";
import { isEnoent } from "../../core/fs/errno.js";
import { planEntryDirective } from "../../core/init/entryDirective.js";
import {
  collectCanonicalSkillIds,
  SKILL_ARCHIVE_DIR,
  SKILL_INTEGRATION_DIRS,
} from "../../core/init/integrationDirs.js";
import { createSkillLink } from "../../core/init/managedLink.js";
import {
  CODEX_HOOKS_TRUST_NOTE,
  keptHookGroupNote,
  planReminderHooks,
  reminderHooksUpdateDetail,
  writeReminderHooks,
} from "../../core/init/reminderHooks.js";
import {
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
} from "../../core/claudeCodeHooks.js";
import { describeError, findUnsafeHostFileComponent } from "../../core/init/fsGuards.js";
import {
  AGENTS_RULES_DIR,
  keptDeletedRuleMastersNote,
  keptRuleMasterNote,
  planRuleMasterUpdates,
  readRuleLock,
  REMINDERS_BASENAME,
  RULE_LOCK_BASENAME,
  type RuleMasterPlan,
  UNEDITED_RULE_MASTER,
  writeRuleLock,
} from "../../core/ruleMasterUpdates.js";
import { replaceGovernedAsset } from "../../core/init/governedWrite.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import type { MigrationContext, MigrationOperation, MigrationStep, StepPlan } from "./harness.js";
import { step10 } from "./step10UpdateGitignore.js";

/** The package's `.qfai/` template, which init copies the skills from. */
export function packageQfaiAssets(): string {
  return path.join(getInitAssetsDir(), ".qfai");
}

export async function shippedSkillIds(): Promise<string[]> {
  return collectCanonicalSkillIds(path.join(packageQfaiAssets(), "assistant"));
}

/** The two assistant layers step 11 installs: the skills, and the steps they run. */
type Layer = "skill" | "step";

/** Where a step directory that was replaced is kept whole, beside the skill archive. */
export const STEP_ARCHIVE_DIR = path.join(path.dirname(SKILL_ARCHIVE_DIR), "step");

/** Each step the package ships: a directory under `assistant/step/` holding a `STEP.md`. */
export async function shippedStepIds(): Promise<string[]> {
  const dir = path.join(packageQfaiAssets(), "assistant", "step");
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: unknown) => {
    if (isEnoent(error)) return [];
    throw error;
  });
  const ids: string[] = [];
  for (const entry of entries.filter((each) => each.isDirectory())) {
    const doc = await stat(path.join(dir, entry.name, "STEP.md")).catch(() => null);
    if (doc?.isFile() === true) ids.push(entry.name);
  }
  return ids.sort();
}

function layerDir(context: MigrationContext, layer: Layer, id: string): string {
  return path.join(context.root, ".qfai", "assistant", layer, id);
}

function archiveDir(context: MigrationContext, layer: Layer, id: string): string {
  return path.join(context.root, layer === "skill" ? SKILL_ARCHIVE_DIR : STEP_ARCHIVE_DIR, id);
}

function projectPath(context: MigrationContext, absolute: string): string {
  return path.relative(context.root, absolute).split(path.sep).join("/");
}

/**
 * Each regular file under `dir`, by its path relative to `dir`, with its hash
 * ignoring line endings as init compares a skill. Any other entry hashes to
 * `null` and so never equals a file. `null` when `dir` is absent.
 */
async function treeHashes(dir: string): Promise<Map<string, string | null> | null> {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true });
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
  const hashes = new Map<string, string | null>();
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const file = path.join(entry.parentPath, entry.name);
    hashes.set(path.relative(dir, file), await hashAssistantAssetFile(file));
  }
  return hashes;
}

/** Whether every file of `part` is in `whole` with the same content. */
function containedIn(
  part: ReadonlyMap<string, string | null>,
  whole: ReadonlyMap<string, string | null>,
): boolean {
  return [...part].every(([file, hash]) => hash !== null && whole.get(file) === hash);
}

function sameTree(
  left: ReadonlyMap<string, string | null>,
  right: ReadonlyMap<string, string | null>,
): boolean {
  return left.size === right.size && containedIn(left, right);
}

async function packageHashes(layer: Layer, id: string): Promise<Map<string, string | null>> {
  const dir = path.join(packageQfaiAssets(), "assistant", layer, id);
  const hashes = new Map<string, string | null>();
  for (const file of await collectTemplateFiles(dir)) {
    hashes.set(
      path.relative(dir, file),
      await hashAssistantAssetFile(file, { allowSymlink: true }),
    );
  }
  return hashes;
}

function installOperation(
  context: MigrationContext,
  layer: Layer,
  id: string,
  files: readonly string[],
): MigrationOperation | null {
  const dir = layerDir(context, layer, id);
  const targets = files.map((file) => projectPath(context, path.join(dir, file)));
  const first = targets[0];
  if (first === undefined) return null;
  return {
    kind: "delegate",
    target: first,
    targets,
    description: "install from the package",
    apply: async () => {
      // Create-only, so a file that appeared since the plan is kept and the
      // count below reports the run as incomplete.
      const result = await copyTemplatePaths(
        packageQfaiAssets(),
        path.join(context.root, ".qfai"),
        [path.join("assistant", layer, id)],
        { force: false, dryRun: false, conflictPolicy: "skip" },
      );
      const written = new Set(result.copied.map((file) => projectPath(context, file)));
      const missing = targets.filter((target) => !written.has(target));
      if (missing.length > 0) {
        throw new Error(`The ${layer} installation did not complete: ${missing.join(", ")}`);
      }
    },
  };
}

function archiveOperation(context: MigrationContext, layer: Layer, id: string): MigrationOperation {
  const source = layerDir(context, layer, id);
  const archive = archiveDir(context, layer, id);
  return {
    kind: "delegate",
    target: projectPath(context, source),
    targets: [projectPath(context, source), projectPath(context, archive)],
    description: "archive the project's copy",
    apply: async () => {
      await mkdir(path.dirname(archive), { recursive: true });
      // SIMPLIFIED: a rename, so the skill tree and the archive share a volume.
      // Lift when: a project keeps `.qfai/evidence/` on another volume, which
      // fails here with EXDEV and changes nothing.
      await rename(source, archive);
    },
  };
}

/**
 * What bringing one shipped skill or step up to the package's copy takes. A
 * copy that differs is archived whole first. Where the archive already exists,
 * the directory is either the remainder of an interrupted install, which is
 * finished, or a second project copy, which is left for a person.
 */
async function planLayerEntry(
  context: MigrationContext,
  layer: Layer,
  id: string,
  plan: StepPlan,
): Promise<void> {
  const dir = layerDir(context, layer, id);
  const archive = archiveDir(context, layer, id);
  const shipped = await packageHashes(layer, id);
  const current = await treeHashes(dir);
  if (current !== null && sameTree(current, shipped)) return;
  const archived = await treeHashes(archive);
  if (current !== null && archived !== null && !containedIn(current, shipped)) {
    const reason = sameTree(current, archived)
      ? `the archive already holds this copy; delete the ${layer} directory and run step 11 again`
      : "the archive already holds a different copy; keep the one you need, delete the other and run step 11 again";
    plan.forAPerson?.push(
      `${projectPath(context, dir)} and ${projectPath(context, archive)}: ${reason}`,
    );
    return;
  }
  const resume = current !== null && archived !== null;
  if (current !== null && !resume) plan.operations.push(archiveOperation(context, layer, id));
  const files = [...shipped.keys()].filter((file) => !resume || !current.has(file)).sort();
  const install = installOperation(context, layer, id, files);
  if (install !== null) plan.operations.push(install);
}

/** Whether `linkPath` is a link that reaches `skillDir`, spelled either way. */
export async function linksToSkill(linkPath: string, skillDir: string): Promise<boolean> {
  const stats = await lstat(linkPath).catch(() => null);
  if (stats?.isSymbolicLink() !== true) return false;
  const named = path.resolve(path.dirname(linkPath), await readlink(linkPath));
  if (named === skillDir) return true;
  const [reached, expected] = await Promise.all([
    realpath(linkPath).catch(() => null),
    realpath(skillDir).catch(() => undefined),
  ]);
  return reached === expected;
}

async function occupantReason(linkPath: string): Promise<string> {
  const stats = await lstat(linkPath);
  if (stats.isSymbolicLink()) {
    return `a link to ${await readlink(linkPath)}, not to the shipped skill, holds the path`;
  }
  if (stats.isDirectory()) return "a directory the project wrote holds the path";
  if (stats.isFile()) return "a file holds the path";
  return "a special file holds the path";
}

async function linkedParent(context: MigrationContext, dir: string): Promise<string | null> {
  let walked = context.root;
  for (const segment of path.relative(context.root, dir).split(path.sep)) {
    walked = path.join(walked, segment);
    if ((await lstat(walked).catch(() => null))?.isSymbolicLink() === true) return walked;
  }
  return null;
}

async function planLinks(context: MigrationContext, ids: readonly string[], plan: StepPlan) {
  for (const dir of SKILL_INTEGRATION_DIRS) {
    const parent = await linkedParent(context, path.join(context.root, dir));
    for (const id of ids) {
      const linkPath = path.join(context.root, dir, id);
      const shown = projectPath(context, linkPath);
      const skillDir = path.join(context.root, ".qfai", "assistant", "skill", id);
      if (await linksToSkill(linkPath, skillDir)) continue;
      const occupied = await lstat(linkPath).then(
        () => true,
        (error: unknown) => {
          if (isEnoent(error)) return false;
          throw error;
        },
      );
      if (occupied) {
        plan.forAPerson?.push(`${shown}: ${await occupantReason(linkPath)}`);
      } else if (parent !== null) {
        const via = projectPath(context, parent);
        plan.forAPerson?.push(`${shown}: ${via} is a symbolic link, so the link is not written`);
      } else {
        plan.operations.push({
          kind: "delegate",
          target: shown,
          description: "link the shipped skill",
          apply: () => createSkillLink(context.root, dir, id),
        });
      }
    }
  }
}

async function planEntryPoints(context: MigrationContext, plan: StepPlan): Promise<void> {
  for (const name of AGENT_ENTRY_POINT_FILES) {
    const entry = await planEntryDirective(context.root, name);
    if (entry.kind === "current") continue;
    if (entry.kind === "refused") {
      plan.forAPerson?.push(`${name}: the entry directive was not added. ${entry.reason}`);
      continue;
    }
    plan.operations.push({
      kind: "delegate",
      target: name,
      description:
        entry.kind === "create"
          ? "write from the package's seed, which opens with the entry directive"
          : "prepend the entry directive",
      apply: entry.apply,
    });
  }
}

/**
 * The reminder hooks `qfai init` installs, through the same merge: a missing
 * hook file is written from the package's template, and one the project has
 * gains the groups it lacks. A group the project edited is kept and named, and
 * a file the merge refuses is left for a person.
 */
async function planReminderHookFiles(context: MigrationContext, plan: StepPlan): Promise<void> {
  for (const relativePath of [CLAUDE_SETTINGS_RELATIVE_PATH, CODEX_HOOKS_RELATIVE_PATH]) {
    const hooks = await planReminderHooks(getInitAssetsDir(), context.root, relativePath);
    if (hooks.kind === "refused") {
      plan.forAPerson?.push(hooks.message);
      continue;
    }
    if (hooks.kind !== "create") {
      for (const group of hooks.edited) {
        plan.reminderHooks?.push(keptHookGroupNote(relativePath, group));
      }
    }
    if (hooks.kind === "current") continue;
    plan.operations.push({
      kind: "delegate",
      target: relativePath,
      description:
        hooks.kind === "create"
          ? "write from the package's hook template"
          : `update (${reminderHooksUpdateDetail(hooks.events)}; existing settings kept)`,
      apply: () => writeReminderHooks(hooks),
    });
    if (relativePath === CODEX_HOOKS_RELATIVE_PATH) {
      plan.reminderHooks?.push(CODEX_HOOKS_TRUST_NOTE);
    }
  }
}

async function recordReminderText(projectDir: string, hash: string): Promise<void> {
  await writeRuleLock(projectDir, {
    ...(await readRuleLock(projectDir)),
    [REMINDERS_BASENAME]: hash,
  });
}

/**
 * The text the reminder hooks print, brought to this release the way `qfai
 * init` brings a shipped rule master: through the record of what an earlier
 * run wrote. A file that still holds the recorded text is replaced, an absent
 * one is written, and one the project edited or removed is kept and named.
 */
async function planReminderText(context: MigrationContext, plan: StepPlan): Promise<void> {
  const shown = `${AGENTS_RULES_DIR}/${REMINDERS_BASENAME}`;
  const lockShown = `${AGENTS_RULES_DIR}/${RULE_LOCK_BASENAME}`;
  for (const relative of [shown, lockShown]) {
    if ((await findUnsafeHostFileComponent(context.root, relative.split("/"))) !== undefined) {
      plan.forAPerson?.push(
        `${relative} was left unchanged: it, or a directory above it, is a symbolic link or not a directory, so the reminder text is not refreshed.`,
      );
      return;
    }
  }
  const shippedDir = path.join(getInitAssetsDir(), "root", ...AGENTS_RULES_DIR.split("/"));
  const projectDir = path.join(context.root, ...AGENTS_RULES_DIR.split("/"));
  let plans: RuleMasterPlan[];
  try {
    plans = await planRuleMasterUpdates(shippedDir, projectDir);
  } catch (error) {
    plan.forAPerson?.push(
      `${shown}: rule masters were not checked for updates (${describeError(error)})`,
    );
    return;
  }
  const reminder = plans.find((entry) => entry.name === REMINDERS_BASENAME);
  if (reminder === undefined) return;
  switch (reminder.verdict) {
    case "keep":
      plan.reminderHooks?.push(keptRuleMasterNote(shown));
      return;
    case "removed":
      plan.reminderHooks?.push(keptDeletedRuleMastersNote([shown], lockShown));
      return;
    case "current":
      if (reminder.recordedHash === reminder.shippedHash) return;
      plan.operations.push({
        kind: "delegate",
        target: lockShown,
        description: "record the shipped reminder text",
        apply: () => recordReminderText(projectDir, reminder.shippedHash),
      });
      return;
    case "written":
    case "update": {
      const create = reminder.verdict === "written";
      const description = create ? "write from the package" : `update (${UNEDITED_RULE_MASTER})`;
      plan.operations.push({
        kind: "delegate",
        target: shown,
        targets: [shown, lockShown],
        description,
        report: [`${shown}: ${description}`, `${lockShown}: record the shipped reminder text`],
        apply: async () => {
          const outcome = await replaceGovernedAsset(
            path.join(shippedDir, REMINDERS_BASENAME),
            path.join(projectDir, REMINDERS_BASENAME),
            reminder.currentHash ?? undefined,
            create ? "create-only" : "replace",
          );
          if (outcome === "target-changed") {
            throw new Error(`${shown} changed while step 11 was deciding; run step 11 again`);
          }
          await recordReminderText(projectDir, reminder.shippedHash);
        },
      });
    }
  }
}

export const step11: MigrationStep = {
  number: 11,
  writeSet: [
    "skills",
    "skill-archive",
    "steps",
    "step-archive",
    "skill-links",
    "entry-points",
    "gitignore",
    "gitignore-staging",
    "reminder-hooks",
  ],
  sections: ["Reminder hooks", "For a person"],
  async plan(context) {
    const plan: StepPlan = { operations: [], forAPerson: [], reminderHooks: [] };
    const ids = await shippedSkillIds();
    for (const id of ids) await planLayerEntry(context, "skill", id, plan);
    for (const id of await shippedStepIds()) await planLayerEntry(context, "step", id, plan);
    await planLinks(context, ids, plan);
    await planEntryPoints(context, plan);
    await planReminderHookFiles(context, plan);
    await planReminderText(context, plan);
    const gitignore = await step10.plan(context);
    plan.operations.push(...gitignore.operations);
    plan.forAPerson?.push(...(gitignore.forAPerson ?? []));
    return plan;
  },
};

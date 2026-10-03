import { constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";

import { collectTemplateFiles, copyTemplatePaths } from "../../core/fs/templateCopy.js";
import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import {
  collectCanonicalSkillIds,
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
import { findUnsafeHostFileComponent } from "../../core/init/fsGuards.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import { normalizeNewlines } from "../../shared/text.js";
import type { MigrationContext, MigrationOperation, MigrationStep, StepPlan } from "./harness.js";
import { step10 } from "./step10UpdateGitignore.js";

const AGENTS_RULES_DIR = ".agents/rules";
const REMINDERS_BASENAME = "reminders.json";

/** The largest file step 11 reads to compare; a larger one compares as different. */
const MAX_COMPARED_BYTES = 4 * 1024 * 1024;

/**
 * A regular file's text with CRLF folded to LF, or `null` when nothing comparable is there:
 * absent, a link (unless `followLink`, as the package's own tree may hold one), not a regular
 * file, or past the ceiling. The file is opened once, non-blocking where the platform has it, and
 * the handle that is inspected is the one read, never more than the ceiling. Any other fault
 * propagates.
 */
async function comparableText(
  file: string,
  options: { followLink?: boolean } = {},
): Promise<string | null> {
  if (options.followLink !== true) {
    const entry = await lstat(file).catch((error: unknown) => {
      if (isEnoent(error)) return null;
      throw error;
    });
    if (entry === null || !entry.isFile()) return null;
  }
  // Windows defines neither flag; the `lstat` above is the link guard there.
  const nonBlocking = typeof constants.O_NONBLOCK === "number" ? constants.O_NONBLOCK : 0;
  const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  const flags = constants.O_RDONLY | nonBlocking | (options.followLink === true ? 0 : noFollow);
  let handle;
  try {
    handle = await open(file, flags);
  } catch (error) {
    if (isEnoent(error) || (hasErrnoCode(error) && error.code === "ELOOP")) return null;
    throw error;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_COMPARED_BYTES) return null;
    const buffer = Buffer.alloc(stats.size + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, null);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    // A file that grew past its size since the handle was inspected is not compared.
    if (filled > stats.size) return null;
    return normalizeNewlines(buffer.subarray(0, filled).toString("utf8"));
  } finally {
    await handle.close();
  }
}

/** The package's `.qfai/` template, which init copies the skills from. */
export function packageQfaiAssets(): string {
  return path.join(getInitAssetsDir(), ".qfai");
}

export async function shippedSkillIds(): Promise<string[]> {
  return collectCanonicalSkillIds(path.join(packageQfaiAssets(), "assistant"));
}

/** The two assistant layers step 11 installs: the skills, and the steps they run. */
type Layer = "skill" | "step";

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

function projectPath(context: MigrationContext, absolute: string): string {
  return path.relative(context.root, absolute).split(path.sep).join("/");
}

/** A file to compare, and whether a link at its path is followed. */
type ComparedFile = { readonly file: string; readonly followLink: boolean };

/**
 * Each entry under `dir` other than a directory, by its path relative to `dir`.
 * `null` when `dir` is absent. Only the paths are held: the content is read a
 * pair at a time when compared, so memory does not grow with the tree.
 */
async function treeFiles(dir: string): Promise<Map<string, ComparedFile> | null> {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true, withFileTypes: true });
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
  const files = new Map<string, ComparedFile>();
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const file = path.join(entry.parentPath, entry.name);
    files.set(path.relative(dir, file), { file, followLink: false });
  }
  return files;
}

/** Whether every file of `part` is in `whole` with the same content, line endings aside. */
async function containedIn(
  part: ReadonlyMap<string, ComparedFile>,
  whole: ReadonlyMap<string, ComparedFile>,
): Promise<boolean> {
  for (const [relative, mine] of part) {
    const theirs = whole.get(relative);
    if (theirs === undefined) return false;
    const text = await comparableText(mine.file, { followLink: mine.followLink });
    if (text === null) return false;
    if (text !== (await comparableText(theirs.file, { followLink: theirs.followLink }))) {
      return false;
    }
  }
  return true;
}

async function sameTree(
  left: ReadonlyMap<string, ComparedFile>,
  right: ReadonlyMap<string, ComparedFile>,
): Promise<boolean> {
  return left.size === right.size && (await containedIn(left, right));
}

async function packageFiles(layer: Layer, id: string): Promise<Map<string, ComparedFile>> {
  const dir = path.join(packageQfaiAssets(), "assistant", layer, id);
  const files = new Map<string, ComparedFile>();
  for (const file of await collectTemplateFiles(dir)) {
    files.set(path.relative(dir, file), { file, followLink: true });
  }
  return files;
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

function removeOperation(context: MigrationContext, layer: Layer, id: string): MigrationOperation {
  const dir = layerDir(context, layer, id);
  return {
    kind: "delegate",
    target: projectPath(context, dir),
    description: "delete the project's copy",
    apply: () => rm(dir, { recursive: true }),
  };
}

/**
 * What bringing one shipped skill or step up to the package's copy takes. A
 * copy that differs is deleted whole, then installed from the package.
 */
async function planLayerEntry(
  context: MigrationContext,
  layer: Layer,
  id: string,
  plan: StepPlan,
): Promise<void> {
  const shipped = await packageFiles(layer, id);
  const current = await treeFiles(layerDir(context, layer, id));
  if (current !== null && (await sameTree(current, shipped))) return;
  if (current !== null) plan.operations.push(removeOperation(context, layer, id));
  const install = installOperation(context, layer, id, [...shipped.keys()].sort());
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
          : `update (${reminderHooksUpdateDetail(hooks.events, hooks.permissionsAdded)}; existing settings kept)`,
      apply: () => writeReminderHooks(hooks),
    });
    if (relativePath === CODEX_HOOKS_RELATIVE_PATH) {
      plan.reminderHooks?.push(CODEX_HOOKS_TRUST_NOTE);
    }
  }
}

/**
 * The text the reminder hooks print, brought to this release the way
 * `qfai init --force` brings a shipped rule master: an absent file is written
 * and any other is replaced with the shipped text.
 */
async function planReminderText(context: MigrationContext, plan: StepPlan): Promise<void> {
  const shown = `${AGENTS_RULES_DIR}/${REMINDERS_BASENAME}`;
  if ((await findUnsafeHostFileComponent(context.root, shown.split("/"))) !== undefined) {
    plan.forAPerson?.push(
      `${shown} was left unchanged: it, or a directory above it, is a symbolic link or not a directory, so the reminder text is not refreshed.`,
    );
    return;
  }
  const shipped = path.join(
    getInitAssetsDir(),
    "root",
    ...AGENTS_RULES_DIR.split("/"),
    REMINDERS_BASENAME,
  );
  const target = path.join(context.root, ...shown.split("/"));
  const entry = await lstat(target).catch((error: unknown) => {
    if (isEnoent(error)) return null;
    throw error;
  });
  if (entry !== null && !entry.isFile()) {
    plan.forAPerson?.push(
      `${shown} was left unchanged: it is not a regular file, so the reminder text is not refreshed.`,
    );
    return;
  }
  if (
    entry !== null &&
    (await comparableText(target)) === normalizeNewlines(await readFile(shipped, "utf8"))
  ) {
    return;
  }
  const description = entry === null ? "write from the package" : "replace with the package's text";
  plan.reminderHooks?.push(`${shown}: ${description}`);
  plan.operations.push({
    kind: "delegate",
    target: shown,
    description,
    apply: async () => {
      await mkdir(path.dirname(target), { recursive: true });
      // Replaced as an entry, so a hard link's other names keep their content.
      await rm(target, { force: true });
      await copyFile(shipped, target);
    },
  });
}

export const step11: MigrationStep = {
  number: 11,
  writeSet: ["skills", "steps", "skill-links", "gitignore", "reminder-hooks"],
  sections: ["Reminder hooks", "For a person"],
  async plan(context) {
    const plan: StepPlan = { operations: [], forAPerson: [], reminderHooks: [] };
    const ids = await shippedSkillIds();
    for (const id of ids) await planLayerEntry(context, "skill", id, plan);
    for (const id of await shippedStepIds()) await planLayerEntry(context, "step", id, plan);
    await planLinks(context, ids, plan);
    await planReminderHookFiles(context, plan);
    await planReminderText(context, plan);
    const gitignore = await step10.plan(context);
    plan.operations.push(...gitignore.operations);
    plan.forAPerson?.push(...(gitignore.forAPerson ?? []));
    return plan;
  },
};

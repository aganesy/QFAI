import { lstat, mkdir, readdir, readlink, realpath, rename } from "node:fs/promises";
import path from "node:path";

import {
  collectCanonicalSkillIds,
  createSkillLink,
  planEntryDirective,
  SKILL_ARCHIVE_DIR,
  SKILL_INTEGRATION_DIRS,
} from "../../cli/commands/init.js";
import { collectTemplateFiles, copyTemplatePaths } from "../../cli/lib/fs.js";
import { AGENT_ENTRY_POINT_FILES } from "../../core/agentEntryPoints.js";
import { hashAssistantAssetFile } from "../../core/assistantAssetProvenance.js";
import { isEnoent } from "../../core/fs/errno.js";
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

async function packageHashes(id: string): Promise<Map<string, string | null>> {
  const dir = path.join(packageQfaiAssets(), "assistant", "skill", id);
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
  id: string,
  files: readonly string[],
): MigrationOperation | null {
  const skillDir = path.join(context.root, ".qfai", "assistant", "skill", id);
  const targets = files.map((file) => projectPath(context, path.join(skillDir, file)));
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
        [path.join("assistant", "skill", id)],
        { force: false, dryRun: false, conflictPolicy: "skip" },
      );
      const written = new Set(result.copied.map((file) => projectPath(context, file)));
      const missing = targets.filter((target) => !written.has(target));
      if (missing.length > 0) {
        throw new Error(`Skill installation did not complete: ${missing.join(", ")}`);
      }
    },
  };
}

function archiveOperation(context: MigrationContext, id: string): MigrationOperation {
  const source = path.join(context.root, ".qfai", "assistant", "skill", id);
  const archive = path.join(context.root, SKILL_ARCHIVE_DIR, id);
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
 * What bringing one shipped skill up to the package's copy takes. A copy that
 * differs is archived whole first. Where the archive already exists, the
 * directory is either the remainder of an interrupted install, which is
 * finished, or a second project copy, which is left for a person.
 */
async function planSkill(context: MigrationContext, id: string, plan: StepPlan): Promise<void> {
  const skillDir = path.join(context.root, ".qfai", "assistant", "skill", id);
  const archive = path.join(context.root, SKILL_ARCHIVE_DIR, id);
  const shipped = await packageHashes(id);
  const current = await treeHashes(skillDir);
  if (current !== null && sameTree(current, shipped)) return;
  const archived = await treeHashes(archive);
  if (current !== null && archived !== null && !containedIn(current, shipped)) {
    const reason = sameTree(current, archived)
      ? "the archive already holds this copy; delete the skill directory and run step 11 again"
      : "the archive already holds a different copy; keep the one you need, delete the other and run step 11 again";
    plan.forAPerson?.push(
      `${projectPath(context, skillDir)} and ${projectPath(context, archive)}: ${reason}`,
    );
    return;
  }
  const resume = current !== null && archived !== null;
  if (current !== null && !resume) plan.operations.push(archiveOperation(context, id));
  const files = [...shipped.keys()].filter((file) => !resume || !current.has(file)).sort();
  const install = installOperation(context, id, files);
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

export const step11: MigrationStep = {
  number: 11,
  writeSet: [
    "skills",
    "skill-archive",
    "skill-links",
    "entry-points",
    "gitignore",
    "gitignore-staging",
  ],
  sections: ["For a person"],
  async plan(context) {
    const plan: StepPlan = { operations: [], forAPerson: [] };
    const ids = await shippedSkillIds();
    for (const id of ids) await planSkill(context, id, plan);
    await planLinks(context, ids, plan);
    await planEntryPoints(context, plan);
    const gitignore = await step10.plan(context);
    plan.operations.push(...gitignore.operations);
    plan.forAPerson?.push(...(gitignore.forAPerson ?? []));
    return plan;
  },
};

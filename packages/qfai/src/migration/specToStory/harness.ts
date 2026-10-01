import {
  chmod,
  cp,
  lstat,
  mkdir,
  readFile,
  readlink,
  readdir,
  rename,
  rm,
  rmdir,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { SKILL_ARCHIVE_DIR, SKILL_INTEGRATION_DIRS } from "../../core/init/integrationDirs.js";
import {
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
} from "../../core/claudeCodeHooks.js";
import {
  AGENTS_RULES_DIR,
  REMINDERS_BASENAME,
  RULE_LOCK_BASENAME,
} from "../../core/ruleMasterUpdates.js";
import {
  loadConfig,
  resolvePath,
  WORKFLOW_MODE_MESSAGE,
  type QfaiConfig,
} from "../../core/config.js";
import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { ID_MAP_PATH, IdMapInputError, readIdMap } from "./idMap.js";
import { captureOutput, writeReportFile } from "./reportFile.js";
import { shouldRenameSource, STEP01_RENAMES } from "./step01RenameDirectories.js";

export type MigrationStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type WriteSetArea =
  | "qfai"
  | "specs"
  | "contracts"
  | "config"
  | "gitignore"
  | "gitignore-staging"
  | "evidence-gitignore"
  | "links"
  | "test-annotations"
  | "skills"
  | "skill-archive"
  | "steps"
  | "step-archive"
  | "skill-links"
  | "reminder-hooks";
export type ReportSection =
  "Cases to examples" | "Git index" | "For a person" | "Annotations kept" | "Reminder hooks";

export type MigrationContext = {
  root: string;
  specsDir: string;
  contractsDir: string;
  config: QfaiConfig;
};

export type MigrationOperation =
  | {
      kind: "write";
      target: string;
      content: string;
      /** Report lines printed after the write's own line. */
      notes?: readonly string[];
    }
  | { kind: "move"; source: string; target: string; resume?: boolean }
  | { kind: "remove"; target: string; description: string }
  | { kind: "remove-empty-directory"; target: string }
  | { kind: "cleanup-stage"; target: string; source: string; destination: string }
  | { kind: "cleanup-write-stage"; target: string; destination: string }
  | {
      kind: "delegate";
      target: string;
      targets?: readonly string[];
      description: string;
      /** Report lines printed in place of one line per target. */
      report?: readonly string[];
      apply: () => Promise<void>;
    };

/** What a step does to the git index, reported apart from its file operations. */
export type GitIndexPlan =
  | { kind: "not-a-repository" }
  | { kind: "nothing-tracked" }
  | { kind: "untrack"; count: number; apply: () => void };

export type StepPlan = {
  operations: MigrationOperation[];
  annotationTargets?: string[];
  forAPerson?: string[];
  /**
   * The items of `forAPerson` that only pair an old ID with its new one. When set,
   * the section prints under `Content` and `Identifiers` headings: these items
   * under the second, every other item under the first.
   */
  forAPersonIdentifiers?: string[];
  casesToExamples?: string[];
  annotationsKept?: string[];
  reminderHooks?: string[];
  gitIndex?: GitIndexPlan;
};

export type MigrationStep = {
  number: MigrationStepNumber;
  writeSet: readonly WriteSetArea[];
  sections?: readonly ReportSection[];
  plan(context: MigrationContext): Promise<StepPlan>;
};

export type MigrationIo = {
  cwd: string;
  stdout: { write(value: string): unknown };
  stderr: { write(value: string): unknown };
};

type OutputIo = Pick<MigrationIo, "stdout" | "stderr">;

class MigrationRefusal extends Error {}
export class MigrationInputError extends Error {}

const HOST_LINKS = [
  ".claude/skills",
  ".agents/skills",
  ".codex/skills",
  ".github/skills",
  ".claude/agents",
  ".github/agents",
] as const;

/** The hook files step 11 writes, and the message file and record the hooks read. */
const REMINDER_FILES = [
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
  `${AGENTS_RULES_DIR}/${REMINDERS_BASENAME}`,
  `${AGENTS_RULES_DIR}/${RULE_LOCK_BASENAME}`,
];

const GITIGNORE_STAGE_NAME =
  /^\.gitignore-([1-9]\d*)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/;

type MoveStage = { directory: string; payload: string; marker: string };
type StageOwner = { step: MigrationStepNumber; source: string; target: string };
type WriteStageOwner = { kind: "write"; step: MigrationStepNumber; target: string };

function stageRoot(context: MigrationContext, target: string): string {
  const qfai = path.join(context.root, ".qfai");
  if (inside(qfai, target)) {
    return path.join(qfai, "evidence", "migration-spec-to-story", "staging");
  }
  if (inside(context.contractsDir, target)) {
    return path.join(context.contractsDir, ".qfai-migration-staging");
  }
  if (inside(context.specsDir, target)) {
    return path.join(context.specsDir, ".qfai-migration-staging");
  }
  throw new MigrationRefusal(`No migration staging root for ${target}`);
}

function writeStageRoot(context: MigrationContext, owner: WriteStageOwner): string {
  const target = owner.target;
  if (target === path.join(context.root, "qfai.config.yaml")) {
    return path.join(context.root, ".qfai", "evidence", "migration-spec-to-story", "staging");
  }
  const testsDir = resolvePath(context.root, context.config, "testsDir");
  if (inside(testsDir, target)) return path.join(testsDir, ".qfai-migration-staging");
  if (owner.step === 8 && inside(context.root, target)) {
    return path.join(context.root, ".qfai", "evidence", "migration-spec-to-story", "staging");
  }
  return stageRoot(context, target);
}

export function writeStage(context: MigrationContext, owner: WriteStageOwner): MoveStage {
  const key = createHash("sha256")
    .update(`write\0${owner.step}\0${owner.target}`)
    .digest("hex")
    .slice(0, 24);
  const directory = path.join(writeStageRoot(context, owner), key);
  return {
    directory,
    payload: path.join(directory, "payload"),
    marker: path.join(directory, "owner.json"),
  };
}

export function moveStage(context: MigrationContext, owner: StageOwner): MoveStage {
  const key = createHash("sha256")
    .update(`${owner.step}\0${owner.source}\0${owner.target}`)
    .digest("hex")
    .slice(0, 24);
  const directory = path.join(stageRoot(context, owner.target), key);
  return {
    directory,
    payload: path.join(directory, "payload"),
    marker: path.join(directory, "owner.json"),
  };
}

function errno(error: unknown, code: string): boolean {
  return hasErrnoCode(error) && error.code === code;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (hasErrnoCode(error)) return error.code;
  return "Unknown migration error";
}

function isInputFailure(error: unknown): boolean {
  return (
    error instanceof MigrationRefusal ||
    error instanceof MigrationInputError ||
    error instanceof IdMapInputError ||
    hasErrnoCode(error)
  );
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (isEnoent(error)) return false;
    throw error;
  }
}

async function sameEntry(source: string, target: string): Promise<boolean> {
  if (!(await pathExists(source)) || !(await pathExists(target))) return false;
  const sourceStats = await lstat(source);
  const targetStats = await lstat(target);
  if (sourceStats.isSymbolicLink() || targetStats.isSymbolicLink()) {
    return (
      sourceStats.isSymbolicLink() &&
      targetStats.isSymbolicLink() &&
      (await readlink(source)) === (await readlink(target))
    );
  }
  if (sourceStats.isFile() || targetStats.isFile()) {
    return (
      sourceStats.isFile() &&
      targetStats.isFile() &&
      (await readFile(source)).equals(await readFile(target))
    );
  }
  if (!sourceStats.isDirectory() || !targetStats.isDirectory()) return false;
  const sourceNames = (await readdir(source)).sort();
  const targetNames = (await readdir(target)).sort();
  if (
    sourceNames.length !== targetNames.length ||
    sourceNames.some((name, index) => name !== targetNames[index])
  )
    return false;
  for (const name of sourceNames) {
    if (!(await sameEntry(path.join(source, name), path.join(target, name)))) return false;
  }
  return true;
}

async function partialCopyOf(source: string, partial: string): Promise<boolean> {
  if (!(await pathExists(partial))) return true;
  if (!(await pathExists(source))) return false;
  const sourceStats = await lstat(source);
  const partialStats = await lstat(partial);
  if (sourceStats.isSymbolicLink() || partialStats.isSymbolicLink()) {
    return (
      sourceStats.isSymbolicLink() &&
      partialStats.isSymbolicLink() &&
      (await readlink(source)) === (await readlink(partial))
    );
  }
  if (sourceStats.isFile() || partialStats.isFile()) {
    if (!sourceStats.isFile() || !partialStats.isFile()) return false;
    const sourceBytes = await readFile(source);
    const partialBytes = await readFile(partial);
    return (
      partialBytes.length <= sourceBytes.length &&
      sourceBytes.subarray(0, partialBytes.length).equals(partialBytes)
    );
  }
  if (!sourceStats.isDirectory() || !partialStats.isDirectory()) return false;
  const sourceNames = new Set(await readdir(source));
  for (const name of await readdir(partial)) {
    if (
      !sourceNames.has(name) ||
      !(await partialCopyOf(path.join(source, name), path.join(partial, name)))
    )
      return false;
  }
  return true;
}

async function readAnyStageOwner(stage: MoveStage): Promise<StageOwner | WriteStageOwner | null> {
  try {
    if ((await lstat(stage.directory)).isSymbolicLink()) {
      throw new MigrationRefusal(
        `Migration staging directory is a symbolic link: ${stage.directory}`,
      );
    }
    if ((await lstat(stage.marker)).isSymbolicLink()) {
      throw new MigrationRefusal(`Migration staging marker is a symbolic link: ${stage.marker}`);
    }
    const value: unknown = JSON.parse(await readFile(stage.marker, "utf8"));
    if (
      value !== null &&
      typeof value === "object" &&
      "kind" in value &&
      value.kind === "write" &&
      "step" in value &&
      isMigrationStepNumber(value.step) &&
      "target" in value &&
      typeof value.target === "string"
    ) {
      return { kind: "write", step: value.step, target: value.target };
    }
    if (
      value !== null &&
      typeof value === "object" &&
      "step" in value &&
      isMigrationStepNumber(value.step) &&
      "source" in value &&
      typeof value.source === "string" &&
      "target" in value &&
      typeof value.target === "string"
    ) {
      return { step: value.step, source: value.source, target: value.target };
    }
  } catch (error) {
    if (isEnoent(error)) return null;
  }
  throw new MigrationRefusal(`Invalid migration staging marker: ${stage.marker}`);
}

async function readStageOwner(stage: MoveStage): Promise<StageOwner | null> {
  const owner = await readAnyStageOwner(stage);
  if (owner === null) return null;
  if ("kind" in owner)
    throw new MigrationRefusal(`Expected a move staging marker: ${stage.marker}`);
  return owner;
}

async function readWriteStageOwner(stage: MoveStage): Promise<WriteStageOwner | null> {
  const owner = await readAnyStageOwner(stage);
  if (owner === null) return null;
  if (!("kind" in owner)) {
    throw new MigrationRefusal(`Expected a write staging marker: ${stage.marker}`);
  }
  return owner;
}

async function ensureStage(context: MigrationContext, owner: StageOwner): Promise<MoveStage> {
  const stage = moveStage(context, owner);
  await mkdir(stage.directory, { recursive: true });
  await assertNoSymlinkParents(stage.payload, context);
  const existing = await readStageOwner(stage);
  if (existing === null) {
    if ((await readdir(stage.directory)).length > 0) {
      throw new MigrationRefusal(`Unowned migration staging directory: ${stage.directory}`);
    }
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`, { flag: "wx" });
  } else if (
    existing.step !== owner.step ||
    existing.source !== owner.source ||
    existing.target !== owner.target
  ) {
    throw new MigrationRefusal(`Migration staging owner changed: ${stage.directory}`);
  }
  return stage;
}

async function cleanupStage(stage: MoveStage, owner: StageOwner): Promise<void> {
  const existing = await readStageOwner(stage);
  if (
    existing === null ||
    existing.step !== owner.step ||
    existing.source !== owner.source ||
    existing.target !== owner.target
  ) {
    throw new MigrationRefusal(`Migration staging owner changed: ${stage.directory}`);
  }
  if ((await readdir(stage.directory)).some((name) => name !== "owner.json")) {
    throw new MigrationRefusal(
      `Migration staging directory has unexpected content: ${stage.directory}`,
    );
  }
  await unlink(stage.marker);
  await rmdir(stage.directory);
  const root = path.dirname(stage.directory);
  if ((await readdir(root)).length === 0) await rmdir(root);
}

async function cleanupWriteStage(stage: MoveStage, owner: WriteStageOwner): Promise<void> {
  const existing = await readWriteStageOwner(stage);
  if (existing === null || existing.step !== owner.step || existing.target !== owner.target) {
    throw new MigrationRefusal(`Migration write staging owner changed: ${stage.directory}`);
  }
  const names = await readdir(stage.directory);
  if (names.some((name) => name !== "owner.json" && name !== "payload")) {
    throw new MigrationRefusal(
      `Migration write staging has unexpected content: ${stage.directory}`,
    );
  }
  if (names.includes("payload")) {
    if (!(await lstat(stage.payload)).isFile()) {
      throw new MigrationRefusal(`Migration write staging payload is not a file: ${stage.payload}`);
    }
    await unlink(stage.payload);
  }
  await unlink(stage.marker);
  await rmdir(stage.directory);
  const root = path.dirname(stage.directory);
  if ((await readdir(root)).length === 0) await rmdir(root);
}

async function writeAtomically(
  context: MigrationContext,
  step: MigrationStepNumber,
  target: string,
  content: string,
): Promise<void> {
  const owner: WriteStageOwner = { kind: "write", step, target };
  const stage = writeStage(context, owner);
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(stage.directory, { recursive: true });
  await assertNoSymlinkParents(target, context);
  await assertNoSymlinkParents(stage.payload, context);
  const existing = await readWriteStageOwner(stage);
  if (existing !== null || (await readdir(stage.directory)).length > 0) {
    throw new MigrationRefusal(`Migration write staging already exists: ${stage.directory}`);
  }
  await writeFile(stage.marker, `${JSON.stringify(owner)}\n`, { flag: "wx" });
  await writeFile(stage.payload, content, { encoding: "utf8", flag: "wx" });
  if (await pathExists(target)) {
    const original = await lstat(target);
    if (!original.isFile()) {
      throw new MigrationRefusal(`Migration write target is not a file: ${target}`);
    }
    await chmod(stage.payload, original.mode);
    await utimes(stage.payload, original.atime, original.mtime);
  }
  await rename(stage.payload, target);
  await cleanupWriteStage(stage, owner);
}

async function removeCopiedSource(source: string, target: string): Promise<void> {
  if (!(await sameEntry(source, target))) {
    throw new Error(`Copied migration source differs from destination: ${source}`);
  }
  const stats = await lstat(source);
  if (stats.isDirectory()) await rm(source, { recursive: true });
  else await unlink(source);
}

export async function moveAcrossDevices(
  context: MigrationContext,
  step: MigrationStepNumber,
  source: string,
  target: string,
): Promise<void> {
  const owner = { step, source, target };
  const stage = await ensureStage(context, owner);
  if (!(await partialCopyOf(source, stage.payload))) {
    throw new Error(`Migration staging copy differs from source: ${stage.payload}`);
  }
  if (!(await sameEntry(source, stage.payload))) {
    await cp(source, stage.payload, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
      dereference: false,
      verbatimSymlinks: true,
    });
  }
  if (!(await sameEntry(source, stage.payload))) {
    throw new Error(`Migration staging copy could not be verified: ${stage.payload}`);
  }
  if (await pathExists(target)) throw new Error(`Migration destination appeared: ${target}`);
  await rename(stage.payload, target);
  await removeCopiedSource(source, target);
  await cleanupStage(stage, owner);
}

function inside(area: string, target: string): boolean {
  const relative = path.relative(area, target);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function absolutePath(root: string, relative: string): string {
  if (!relative || path.isAbsolute(relative) || relative.includes("\0")) {
    throw new MigrationRefusal(`Invalid migration path: ${relative}`);
  }
  return path.resolve(root, relative);
}

function permitted(area: WriteSetArea, target: string, context: MigrationContext): boolean {
  const root = context.root;
  switch (area) {
    case "qfai":
      return inside(path.join(root, ".qfai"), target);
    case "specs":
      return inside(context.specsDir, target);
    case "contracts":
      return inside(context.contractsDir, target);
    case "config":
      return target === path.join(root, "qfai.config.yaml");
    case "gitignore":
      return target === path.join(root, ".gitignore");
    case "evidence-gitignore":
      return target === path.join(root, ".qfai", "evidence", ".gitignore");
    case "gitignore-staging": {
      if (path.dirname(target) !== path.join(root, ".qfai", "report")) return false;
      const name = path.basename(target).replace(/\.owner$/, "");
      const match = GITIGNORE_STAGE_NAME.exec(name);
      return match !== null && Number.isSafeInteger(Number(match[1]));
    }
    case "links":
      return HOST_LINKS.some((link) => inside(path.join(root, link), target));
    case "test-annotations":
      return inside(resolvePath(root, context.config, "testsDir"), target);
    case "skills": {
      const skills = path.join(root, ".qfai", "assistant", "skill");
      return target !== skills && inside(skills, target);
    }
    case "skill-archive":
      return inside(path.join(root, SKILL_ARCHIVE_DIR), target);
    case "steps": {
      const steps = path.join(root, ".qfai", "assistant", "step");
      return target !== steps && inside(steps, target);
    }
    case "step-archive":
      return inside(path.join(root, path.dirname(SKILL_ARCHIVE_DIR), "step"), target);
    case "skill-links":
      return SKILL_INTEGRATION_DIRS.some((link) => inside(path.join(root, link), target));
    case "reminder-hooks":
      return REMINDER_FILES.some((file) => target === path.join(root, ...file.split("/")));
  }
}

function assertAllowed(
  relative: string,
  context: MigrationContext,
  step: MigrationStep,
  annotationTargets: ReadonlySet<string>,
): string {
  const target = absolutePath(context.root, relative);
  if (
    !step.writeSet.some((area) =>
      area === "test-annotations"
        ? annotationTargets.has(target)
        : permitted(area, target, context),
    )
  ) {
    throw new MigrationRefusal(
      `Step ${step.number} cannot write ${relative}: outside its write set.`,
    );
  }
  return target;
}

function knownStageRoots(context: MigrationContext): Set<string> {
  return new Set([
    path.join(context.root, ".qfai", "evidence", "migration-spec-to-story", "staging"),
    path.join(context.specsDir, ".qfai-migration-staging"),
    path.join(context.contractsDir, ".qfai-migration-staging"),
    path.join(resolvePath(context.root, context.config, "testsDir"), ".qfai-migration-staging"),
  ]);
}

export async function staleStageOperations(
  context: MigrationContext,
  step: MigrationStepNumber,
): Promise<MigrationOperation[]> {
  const roots = knownStageRoots(context);
  const operations: MigrationOperation[] = [];
  for (const root of roots) {
    const names = await readdir(root).catch((error: unknown) => {
      if (isEnoent(error)) return [] as string[];
      throw error;
    });
    for (const name of names) {
      if (!/^[a-f0-9]{24}$/.test(name)) continue;
      const directory = path.join(root, name);
      const stage = {
        directory,
        payload: path.join(directory, "payload"),
        marker: path.join(directory, "owner.json"),
      };
      const owner = await readAnyStageOwner(stage);
      if (owner === null) {
        if ((await readdir(directory)).length === 0) {
          operations.push({
            kind: "remove-empty-directory",
            target: path.relative(context.root, directory).replace(/\\/g, "/"),
          });
        } else {
          throw new MigrationRefusal(`Unowned migration staging directory: ${directory}`);
        }
        continue;
      }
      if (owner.step !== step) {
        throw new MigrationRefusal(`Resume step ${owner.step} before step ${step}: ${directory}`);
      }
      if ("kind" in owner) {
        if (writeStage(context, owner).directory !== directory) {
          throw new MigrationRefusal(
            `Migration write staging path does not match its owner: ${directory}`,
          );
        }
        operations.push({
          kind: "cleanup-write-stage",
          target: path.relative(context.root, directory).replace(/\\/g, "/"),
          destination: path.relative(context.root, owner.target).replace(/\\/g, "/"),
        });
        continue;
      }
      if (moveStage(context, owner).directory !== directory) {
        throw new MigrationRefusal(`Migration staging path does not match its owner: ${directory}`);
      }
      if (!(await pathExists(owner.target))) {
        if (!(await pathExists(owner.source))) {
          throw new MigrationRefusal(
            `Migration staging source and destination are missing: ${directory}`,
          );
        }
        continue;
      }
      if (await pathExists(stage.payload)) {
        throw new MigrationRefusal(
          `Migration staging copy remains beside its destination: ${directory}`,
        );
      }
      if (await pathExists(owner.source)) {
        operations.push({
          kind: "move",
          source: path.relative(context.root, owner.source).replace(/\\/g, "/"),
          target: path.relative(context.root, owner.target).replace(/\\/g, "/"),
          resume: true,
        });
      }
      operations.push({
        kind: "cleanup-stage",
        target: path.relative(context.root, directory).replace(/\\/g, "/"),
        source: path.relative(context.root, owner.source).replace(/\\/g, "/"),
        destination: path.relative(context.root, owner.target).replace(/\\/g, "/"),
      });
    }
  }
  return operations;
}

/**
 * Refuses a target reached through a symbolic link below the project root.
 * The root and the directories above it are the operator's choice, so a
 * project opened through a link or a junction is not refused for it.
 */
async function assertNoSymlinkParents(target: string, context: MigrationContext): Promise<void> {
  const start = inside(context.root, target) ? context.root : path.parse(target).root;
  const relative = path.relative(start, path.dirname(target));
  let current = start;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) {
        throw new MigrationRefusal(`Migration path crosses a symbolic link: ${current}`);
      }
    } catch (error) {
      if (isEnoent(error)) return;
      throw error;
    }
  }
}

async function assertAnnotationOnly(target: string, content: string): Promise<void> {
  let original: string;
  try {
    original = await readFile(target, "utf8");
  } catch (error) {
    if (isEnoent(error)) throw new MigrationRefusal(`Annotation target does not exist: ${target}`);
    throw error;
  }
  const oldLines = original.split("\n");
  const newLines = content.split("\n");
  if (oldLines.length !== newLines.length) {
    throw new MigrationRefusal(`Annotation rewrite changes line count: ${target}`);
  }
  for (let index = 0; index < oldLines.length; index += 1) {
    if (oldLines[index] === newLines[index]) continue;
    const annotation = /\bQFAI:[A-Za-z0-9:-]+/g;
    if (
      !oldLines[index]?.includes("QFAI:") ||
      !newLines[index]?.includes("QFAI:") ||
      oldLines[index]?.replace(annotation, "") !== newLines[index]?.replace(annotation, "")
    ) {
      throw new MigrationRefusal(
        `Annotation rewrite changes a non-annotation line: ${target}:${index + 1}`,
      );
    }
  }
}

async function preflight(
  step: MigrationStep,
  context: MigrationContext,
  plan: StepPlan,
): Promise<MigrationOperation[]> {
  const effective: MigrationOperation[] = [];
  const touched = new Set<string>();
  const cleanedWriteStages = new Set<string>();
  const annotationTargets = new Set<string>();
  for (const relative of plan.annotationTargets ?? []) {
    const target = absolutePath(context.root, relative);
    if (!inside(context.root, target)) {
      throw new MigrationRefusal(`Annotation target is outside the project: ${relative}`);
    }
    annotationTargets.add(target);
  }
  const allowed = (relative: string) => assertAllowed(relative, context, step, annotationTargets);
  for (const operation of plan.operations) {
    if (operation.kind === "delegate") {
      const targets = operation.targets ?? [operation.target];
      if (targets.length === 0 || targets[0] !== operation.target) {
        throw new MigrationRefusal(`Step ${step.number} has an invalid delegated target list.`);
      }
      for (const relative of targets) {
        const delegatedTarget = allowed(relative);
        await assertNoSymlinkParents(delegatedTarget, context);
        if (
          permitted("gitignore", delegatedTarget, context) ||
          permitted("gitignore-staging", delegatedTarget, context)
        ) {
          if (
            (await pathExists(delegatedTarget)) &&
            (await lstat(delegatedTarget)).isSymbolicLink()
          ) {
            throw new MigrationRefusal(`Migration would follow a symbolic link: ${relative}`);
          }
        }
        if (touched.has(delegatedTarget)) {
          throw new MigrationRefusal(`Step ${step.number} plans the same path twice: ${relative}`);
        }
        touched.add(delegatedTarget);
      }
      effective.push(operation);
      continue;
    }
    if (operation.kind === "remove-empty-directory") {
      const stageDirectory = absolutePath(context.root, operation.target);
      if (
        /^[a-f0-9]{24}$/.test(path.basename(stageDirectory)) &&
        knownStageRoots(context).has(path.dirname(stageDirectory))
      ) {
        await assertNoSymlinkParents(stageDirectory, context);
        const stats = await lstat(stageDirectory);
        if (
          !stats.isDirectory() ||
          stats.isSymbolicLink() ||
          (await readdir(stageDirectory)).length > 0
        ) {
          throw new MigrationRefusal(
            `Migration staging directory is not empty: ${operation.target}`,
          );
        }
        if (touched.has(stageDirectory)) {
          throw new MigrationRefusal(
            `Step ${step.number} plans the same path twice: ${operation.target}`,
          );
        }
        touched.add(stageDirectory);
        effective.push(operation);
        continue;
      }
    }
    if (operation.kind === "cleanup-write-stage") {
      const destination = allowed(operation.destination);
      const owner: WriteStageOwner = { kind: "write", step: step.number, target: destination };
      const stage = writeStage(context, owner);
      const stageTarget = absolutePath(context.root, operation.target);
      if (stage.directory !== stageTarget || touched.has(stageTarget)) {
        throw new MigrationRefusal(
          `Migration write staging cleanup is unsafe: ${operation.target}`,
        );
      }
      touched.add(stageTarget);
      await assertNoSymlinkParents(stage.marker, context);
      const existing = await readWriteStageOwner(stage);
      if (existing?.step !== owner.step || existing.target !== owner.target) {
        throw new MigrationRefusal(`Migration write staging owner changed: ${stage.directory}`);
      }
      cleanedWriteStages.add(stage.directory);
      effective.push(operation);
      continue;
    }
    const target = allowed(operation.target);
    if (touched.has(target))
      throw new MigrationRefusal(
        `Step ${step.number} plans the same path twice: ${operation.target}`,
      );
    touched.add(target);
    await assertNoSymlinkParents(target, context);
    if (operation.kind === "write") {
      const stage = writeStage(context, { kind: "write", step: step.number, target });
      await assertNoSymlinkParents(stage.payload, context);
      if ((await pathExists(stage.directory)) && !cleanedWriteStages.has(stage.directory)) {
        throw new MigrationRefusal(`Migration write staging already exists: ${stage.directory}`);
      }
      if (await pathExists(target)) {
        const targetStats = await lstat(target);
        if (targetStats.isSymbolicLink()) {
          throw new MigrationRefusal(`Migration would follow a symbolic link: ${operation.target}`);
        }
        if (!targetStats.isFile()) {
          throw new MigrationRefusal(`Migration write target is not a file: ${operation.target}`);
        }
      }
      if (
        step.writeSet.includes("test-annotations") &&
        annotationTargets.has(target) &&
        !step.writeSet.some(
          (area) => area !== "test-annotations" && permitted(area, target, context),
        )
      ) {
        await assertAnnotationOnly(target, operation.content);
      }
      const prior = await readFile(target, "utf8").catch((error: unknown) => {
        if (isEnoent(error)) return null;
        throw error;
      });
      if (prior !== operation.content) effective.push(operation);
      continue;
    }
    if (operation.kind === "move") {
      const source = allowed(operation.source);
      await assertNoSymlinkParents(source, context);
      if (source === target || touched.has(source)) {
        throw new MigrationRefusal(
          `Step ${step.number} plans a conflicting move: ${operation.source}`,
        );
      }
      touched.add(source);
      if (!(await pathExists(source)))
        throw new MigrationRefusal(`Migration source is missing: ${operation.source}`);
      const owner = { step: step.number, source, target };
      const stage = moveStage(context, owner);
      allowed(path.relative(context.root, stage.directory));
      await assertNoSymlinkParents(stage.payload, context);
      if ((await pathExists(stage.directory)) && (await lstat(stage.directory)).isSymbolicLink()) {
        throw new MigrationRefusal(
          `Migration staging directory is a symbolic link: ${stage.directory}`,
        );
      }
      if (await pathExists(target)) {
        const stagedOwner = await readStageOwner(stage);
        if (
          stagedOwner?.step === owner.step &&
          stagedOwner.source === source &&
          stagedOwner.target === target &&
          !(await pathExists(stage.payload)) &&
          (await sameEntry(source, target))
        ) {
          effective.push({ ...operation, resume: true });
          continue;
        }
        throw new MigrationRefusal(`Migration destination exists: ${operation.target}`);
      }
      if (await pathExists(stage.directory)) {
        const stagedOwner = await readStageOwner(stage);
        if (
          stagedOwner?.step !== owner.step ||
          stagedOwner.source !== source ||
          stagedOwner.target !== target ||
          !(await partialCopyOf(source, stage.payload))
        ) {
          throw new MigrationRefusal(
            `Migration staging copy cannot be resumed: ${stage.directory}`,
          );
        }
      }
      effective.push(operation);
      continue;
    }
    if (operation.kind === "cleanup-stage") {
      const owner = {
        step: step.number,
        source: absolutePath(context.root, operation.source),
        target: absolutePath(context.root, operation.destination),
      };
      const stage = moveStage(context, owner);
      if (
        stage.directory !== target ||
        !(await pathExists(owner.target)) ||
        (await pathExists(stage.payload))
      ) {
        throw new MigrationRefusal(`Migration staging cleanup is unsafe: ${operation.target}`);
      }
      if (await pathExists(target)) effective.push(operation);
      continue;
    }
    if (await pathExists(target)) effective.push(operation);
  }
  return effective;
}

async function applyOperation(
  operation: MigrationOperation,
  context: MigrationContext,
  step: MigrationStepNumber,
): Promise<void> {
  const target = absolutePath(context.root, operation.target);
  switch (operation.kind) {
    case "write":
      await writeAtomically(context, step, target, operation.content);
      return;
    case "move":
      {
        const source = absolutePath(context.root, operation.source);
        if (operation.resume) {
          await removeCopiedSource(source, target);
          return;
        }
        await mkdir(path.dirname(target), { recursive: true });
        if (await pathExists(target)) throw new Error(`Migration destination appeared: ${target}`);
        try {
          await rename(source, target);
        } catch (error) {
          if (!errno(error, "EXDEV")) throw error;
          await moveAcrossDevices(context, step, source, target);
        }
      }
      return;
    case "remove":
      await unlink(target);
      return;
    case "remove-empty-directory":
      if ((await readdir(target)).length !== 0) {
        throw new Error(`Directory is not empty after planned moves: ${operation.target}`);
      }
      await rmdir(target);
      return;
    case "cleanup-stage":
      {
        const owner = {
          step,
          source: absolutePath(context.root, operation.source),
          target: absolutePath(context.root, operation.destination),
        };
        await cleanupStage(moveStage(context, owner), owner);
      }
      return;
    case "cleanup-write-stage":
      {
        const owner: WriteStageOwner = {
          kind: "write",
          step,
          target: absolutePath(context.root, operation.destination),
        };
        await cleanupWriteStage(writeStage(context, owner), owner);
      }
      return;
    case "delegate":
      await operation.apply();
  }
}

function operationLine(operation: MigrationOperation): string {
  switch (operation.kind) {
    case "write":
      return `${operation.target}: write`;
    case "move":
      return operation.resume
        ? `${operation.source}: remove after verified move`
        : `${operation.source} → ${operation.target}: move`;
    case "remove":
      return `${operation.target}: ${operation.description}`;
    case "remove-empty-directory":
      return `${operation.target}: remove empty directory`;
    case "cleanup-stage":
      return `${operation.target}: remove completed staging directory`;
    case "cleanup-write-stage":
      return `${operation.target}: remove interrupted write staging directory`;
    case "delegate":
      return `${operation.target}: ${operation.description}`;
  }
}

function operationLines(operation: MigrationOperation): string[] {
  if (operation.kind === "delegate") {
    if (operation.report !== undefined) return [...operation.report];
    return (operation.targets ?? [operation.target]).map(
      (target) => `${target}: ${operation.description}`,
    );
  }
  return [operationLine(operation), ...(operation.kind === "write" ? (operation.notes ?? []) : [])];
}

function reportSection(name: string, entries: readonly string[]): string {
  return `## ${name}\n${entries.length === 0 ? "none" : entries.map((entry) => `- ${entry}`).join("\n")}\n`;
}

function pathCount(count: number): string {
  return count === 1 ? "1 path" : `${count} paths`;
}

function gitIndexLines(plan: GitIndexPlan | undefined, dryRun: boolean): string[] {
  switch (plan?.kind) {
    case undefined:
      return [];
    case "not-a-repository":
      return ["the project is not a git repository, so the index is unchanged"];
    case "nothing-tracked":
      return ["the git index tracks nothing under `.qfai/evidence/`, so it is unchanged"];
    case "untrack":
      return [
        dryRun
          ? `${pathCount(plan.count)} under \`.qfai/evidence/\` would leave the git index`
          : `${pathCount(plan.count)} under \`.qfai/evidence/\` left the git index; the files stay on disk`,
      ];
  }
}

function sectionItems(section: ReportSection, plan: StepPlan, dryRun: boolean): string[] {
  switch (section) {
    case "For a person":
      return plan.forAPerson ?? [];
    case "Cases to examples":
      return plan.casesToExamples ?? [];
    case "Git index":
      return gitIndexLines(plan.gitIndex, dryRun);
    case "Annotations kept":
      return plan.annotationsKept ?? [];
    case "Reminder hooks":
      return plan.reminderHooks ?? [];
  }
}

function groupedReportSection(items: readonly string[], identifiers: readonly string[]): string {
  const paired = new Set(identifiers);
  const groups: [string, string[]][] = [
    ["Content", items.filter((item) => !paired.has(item))],
    ["Identifiers", items.filter((item) => paired.has(item))],
  ];
  const printed = groups
    .filter(([, entries]) => entries.length > 0)
    .map(
      ([heading, entries]) =>
        `### ${heading}\n${entries.map((entry) => `- ${entry}`).join("\n")}\n`,
    );
  return `## For a person\n${printed.length === 0 ? "none\n" : printed.join("\n")}`;
}

function renderReport(
  step: MigrationStep,
  plan: StepPlan,
  operations: readonly MigrationOperation[],
  dryRun: boolean,
): string {
  let report = reportSection("Operations", operations.flatMap(operationLines));
  for (const section of step.sections ?? []) {
    const items = sectionItems(section, plan, dryRun);
    report += `\n${
      section === "For a person" && plan.forAPersonIdentifiers !== undefined
        ? groupedReportSection(items, plan.forAPersonIdentifiers)
        : reportSection(section, items)
    }`;
  }
  return report;
}

export async function executePlannedStep(
  step: MigrationStep,
  context: MigrationContext,
  dryRun: boolean,
  io: OutputIo,
): Promise<0 | 2 | 3> {
  let prepared: { plan: StepPlan; operations: MigrationOperation[] };
  try {
    prepared = await prepareStep(step, context);
  } catch (error) {
    if (!isInputFailure(error)) throw error;
    io.stderr.write(`${errorMessage(error)}\n`);
    return 2;
  }
  if (!dryRun) {
    await applyOperations(prepared.operations, context, step.number);
    if (prepared.plan.gitIndex?.kind === "untrack") prepared.plan.gitIndex.apply();
  }
  io.stdout.write(`${renderReport(step, prepared.plan, prepared.operations, dryRun)}\n`);
  return (prepared.plan.forAPerson?.length ?? 0) > 0 ? 3 : 0;
}

async function prepareStep(
  step: MigrationStep,
  context: MigrationContext,
): Promise<{ plan: StepPlan; operations: MigrationOperation[] }> {
  const plan = await step.plan(context);
  return { plan, operations: await preflight(step, context, plan) };
}

async function applyOperations(
  operations: readonly MigrationOperation[],
  context: MigrationContext,
  step: MigrationStepNumber,
): Promise<void> {
  for (const operation of operations) await applyOperation(operation, context, step);
}

export function isMigrationStepNumber(value: unknown): value is MigrationStepNumber {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 12;
}

async function loadStep(number: MigrationStepNumber): Promise<MigrationStep> {
  switch (number) {
    case 1:
      return (await import("./step01RenameDirectories.js")).step01;
    case 2:
      return (await import("./step02MergeTables.js")).step02;
    case 3:
      return (await import("./step03MoveCatalog.js")).step03;
    case 4:
      return (await import("./step04RenumberIds.js")).step04;
    case 5:
      return (await import("./step05CasesToExamples.js")).step05;
    case 6:
      return (await import("./step06DeriveAcRefs.js")).step06;
    case 7:
      return (await import("./step07RulesToContracts.js")).step07;
    case 8:
      return (await import("./step08RewriteAnnotations.js")).step08;
    case 9:
      return (await import("./step09RepointLinks.js")).step09;
    case 10:
      return (await import("./step10UpdateGitignore.js")).step10;
    case 11:
      return (await import("./step11InstallEntry.js")).step11;
    case 12:
      return (await import("./step12CheckEntry.js")).step12;
  }
}

/** Whether a source of step 1's rename map is still in place, so step 1 has not run. */
async function hasPendingRename(context: MigrationContext): Promise<boolean> {
  for (const [source] of STEP01_RENAMES) {
    if (
      (await shouldRenameSource(context, source)) &&
      (await pathExists(path.join(context.root, source)))
    ) {
      return true;
    }
  }
  return false;
}

/** Whether the spec directory still holds a spec pack or the old policy directory. */
async function hasSpecPackEntries(context: MigrationContext): Promise<boolean> {
  const entries = await readdir(context.specsDir).catch((error: unknown) => {
    if (isEnoent(error)) return [] as string[];
    throw error;
  });
  return entries.some((entry) => entry === "_policies" || /^spec-\d{4}$/.test(entry));
}

async function hasLegacyEntries(context: MigrationContext): Promise<boolean> {
  if (await pathExists(path.join(context.root, ID_MAP_PATH))) return true;
  if (await hasPendingRename(context)) return true;
  return await hasSpecPackEntries(context);
}

const ALREADY_DONE =
  "Already done: an earlier run migrated this project, and steps 1 to 10 have nothing left to do.";

/**
 * Whether an earlier run finished steps 1 to 10 on this tree, so that running
 * them again would only repeat what they already reported.
 *
 * The ID map cannot say so alone: it is what keeps a migration in progress on
 * the step path once step 4 has moved the spec packs. So the tree also has to
 * hold no old layout, and none of the ten steps may have an operation, a git
 * index change, staging to clear, or an item for a person or an annotation to
 * report. A 1.x project has no ID map, and a migration stopped part way has a
 * step with work or a report left, so neither reads as finished.
 *
 * Steps 4 and 7 are not planned here. They place the spec packs' content, and
 * with the ID map written and no pack left they have none to place. Their plans
 * read `plan.yaml` as well, which an old copy of the skill may have written
 * again after the migration; asking them would let that file decide whether a
 * finished project reads as finished. Their staging is still checked.
 *
 * `current` is planned first, because a migration in progress most often
 * has work left for the step being run.
 */
async function migrationFinished(
  context: MigrationContext,
  current: MigrationStepNumber,
): Promise<boolean> {
  if (!(await pathExists(path.join(context.root, ID_MAP_PATH)))) return false;
  if ((await hasPendingRename(context)) || (await hasSpecPackEntries(context))) return false;
  const others = CONTENT_STEPS.filter((number) => number !== current);
  for (const number of [current, ...others]) {
    if ((await staleStageOperations(context, number)).length > 0) return false;
    if (PACK_PLACING_STEPS.has(number)) continue;
    let prepared: { plan: StepPlan; operations: MigrationOperation[] };
    try {
      prepared = await prepareStep(await loadStep(number), context);
    } catch (error) {
      if (isInputFailure(error)) return false;
      throw error;
    }
    const { plan, operations } = prepared;
    if (operations.length > 0 || plan.gitIndex?.kind === "untrack") return false;
    if ((plan.annotationsKept?.length ?? 0) > 0) return false;
    if ((plan.forAPerson?.length ?? 0) > 0) return false;
  }
  return true;
}

/** The steps that place the spec packs' content by `plan.yaml`. */
const PACK_PLACING_STEPS: ReadonlySet<MigrationStepNumber> = new Set([4, 7]);

/** The steps that move a project's content, before the free-text entry. */
const CONTENT_STEPS: readonly MigrationStepNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export async function runStep(step: unknown, argv: unknown, io: MigrationIo): Promise<0 | 2 | 3> {
  if (!isMigrationStepNumber(step)) {
    io.stderr.write("Step must be an integer from 1 to 12.\n");
    return 2;
  }
  if (!Array.isArray(argv) || !argv.every((arg) => typeof arg === "string")) {
    io.stderr.write("Arguments must be an array of strings.\n");
    return 2;
  }
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== "--dry-run")) {
    const invalid = argv.find((arg, index) => arg !== "--dry-run" || index > 0) ?? argv[0];
    io.stderr.write(`Invalid argument ${JSON.stringify(invalid)}. Only --dry-run is accepted.\n`);
    return 2;
  }
  const root = path.resolve(io.cwd);
  let configExists: boolean;
  try {
    configExists = await pathExists(path.join(root, "qfai.config.yaml"));
  } catch (error) {
    if (!hasErrnoCode(error)) throw error;
    io.stderr.write(`Cannot inspect qfai.config.yaml: ${errorMessage(error)}\n`);
    return 2;
  }
  if (!configExists) {
    io.stderr.write("Run the migration from a project root containing qfai.config.yaml.\n");
    return 2;
  }
  const dryRun = argv.length === 1;
  const captured = captureOutput(io);
  const code = await runConfiguredStep(step, dryRun, root, captured.io);
  const refusal = await writeReportFile(
    root,
    step,
    dryRun,
    { stdout: captured.stdout(), stderr: captured.stderr() },
    code,
  );
  if (refusal !== null) io.stderr.write(refusal);
  return code;
}

/** The config keys `loadConfig` reports as retired, which steps 1 to 3 migrate. */
const RETIRED_CONFIG_KEYS = [
  "prototyping.primarySpecId",
  "validation.traceability.scMustHaveTest",
  "validation.traceability.unknownContractIdSeverity",
] as const;

function holdsRetiredKey(issue: { message: string }): boolean {
  return RETIRED_CONFIG_KEYS.some((key) => issue.message.startsWith(`${key} is retired`));
}

/**
 * The text that refuses the run because of the config, or null when the run may
 * go on. Steps 1 to 3 run past the retired keys they migrate; steps 11 and 12
 * report an invalid workflow mode as one of their checks.
 */
function configRefusal(
  step: MigrationStepNumber,
  issues: readonly { message: string }[],
): string | null {
  const blocking = issues.filter(
    (issue) =>
      !(step <= 3 && holdsRetiredKey(issue)) &&
      !((step === 11 || step === 12) && issue.message === WORKFLOW_MODE_MESSAGE),
  );
  if (blocking.length === 0) return null;
  const sentence = blocking.every(holdsRetiredKey)
    ? `qfai.config.yaml still holds a retired key. Steps 1 and 3 remove or replace it; step ${step} runs once it is gone.`
    : "Cannot read or parse qfai.config.yaml.";
  return `${[sentence, ...issues.map((issue) => issue.message)].join("\n")}\n`;
}

async function runConfiguredStep(
  step: MigrationStepNumber,
  dryRun: boolean,
  root: string,
  io: OutputIo,
): Promise<0 | 2 | 3> {
  const loaded = await loadConfig(root);
  const refusal = configRefusal(step, loaded.issues);
  if (refusal !== null) {
    io.stderr.write(refusal);
    return 2;
  }
  const context: MigrationContext = {
    root,
    config: loaded.config,
    specsDir: resolvePath(root, loaded.config, "specsDir"),
    contractsDir: resolvePath(root, loaded.config, "contractsDir"),
  };
  if (step === 11 || step === 12) return await runEntryStep(step, context, dryRun, io);
  let selected: MigrationStep;
  let staleStages: MigrationOperation[];
  try {
    const map = await readIdMap(root);
    staleStages = await staleStageOperations(context, step);
    if (await migrationFinished(context, step)) {
      const done = renderReport(await loadStep(step), { operations: [] }, [], dryRun);
      io.stdout.write(`${done}\n${ALREADY_DONE}\n`);
      return 0;
    }
    // Step 3 replaces a retired config key, so a project that still holds one is not done with it.
    const retiredConfigWork = step === 3 && loaded.issues.some(holdsRetiredKey);
    if (
      step !== 1 &&
      !retiredConfigWork &&
      !(await hasLegacyEntries(context)) &&
      staleStages.length === 0
    ) {
      const selected = await loadStep(step);
      if (step === 9) {
        // Step 1 moved the directories the host links pointed at, so an old
        // link outlives every other trace of the old layout.
        const plan = await selected.plan(context);
        if (plan.operations.length > 0 || (plan.forAPerson?.length ?? 0) > 0) {
          const linkStep: MigrationStep = { ...selected, plan: () => Promise.resolve(plan) };
          return await executePlannedStep(linkStep, context, dryRun, io);
        }
      }
      if (step === 10) {
        // A tree already on the story layout keeps its managed block unless
        // staging needs reclaiming, and still keeps its evidence local.
        const { planStep10 } = await import("./step10UpdateGitignore.js");
        const plan = await planStep10(context, false);
        const localStep: MigrationStep = { ...selected, plan: () => Promise.resolve(plan) };
        return await executePlannedStep(localStep, context, dryRun, io);
      }
      io.stdout.write(`${renderReport(selected, { operations: [] }, [], false)}\n`);
      return 0;
    }
    if (step >= 2 && (await hasPendingRename(context))) {
      io.stderr.write(`Run step 1 before step ${step}.\n`);
      return 2;
    }
    if (step >= 3 && step <= 8) {
      const { pendingMergeInput } = await import("./step02MergeTables.js");
      const pending = await pendingMergeInput(context);
      if (pending !== null) {
        io.stderr.write(`Run step 2 before step ${step}: ${pending} is not merged yet.\n`);
        return 2;
      }
    }
    if (step >= 5 && step <= 8 && map === null) {
      io.stderr.write(`Run step 4 before step ${step}.\n`);
      return 2;
    }
    selected = await loadStep(step);
  } catch (error) {
    if (
      error instanceof MigrationRefusal ||
      error instanceof MigrationInputError ||
      error instanceof IdMapInputError ||
      hasErrnoCode(error)
    ) {
      io.stderr.write(`${errorMessage(error)}\n`);
      return 2;
    }
    throw error;
  }
  const moveRecovery = staleStages.some(
    (operation) => operation.kind === "move" && operation.resume,
  );
  if (moveRecovery) {
    const recoveryStep: MigrationStep = {
      ...selected,
      plan: () => Promise.resolve({ operations: staleStages }),
    };
    let recovery: { plan: StepPlan; operations: MigrationOperation[] };
    try {
      recovery = await prepareStep(recoveryStep, context);
    } catch (error) {
      if (!isInputFailure(error)) throw error;
      io.stderr.write(`${errorMessage(error)}\n`);
      return 2;
    }
    if (dryRun) {
      const resumedSources = new Set(
        staleStages.flatMap((operation) =>
          operation.kind === "move" && operation.resume ? [operation.source] : [],
        ),
      );
      const projected: MigrationStep = {
        ...selected,
        async plan(currentContext) {
          const plan = await selected.plan(currentContext);
          return {
            ...plan,
            operations: [
              ...staleStages,
              ...plan.operations.filter(
                (operation) =>
                  !(
                    (operation.kind === "move" && resumedSources.has(operation.source)) ||
                    (operation.kind === "remove" && resumedSources.has(operation.target))
                  ),
              ),
            ],
          };
        },
      };
      return await executePlannedStep(projected, context, true, io);
    }
    await applyOperations(recovery.operations, context, step);
    let remainder: { plan: StepPlan; operations: MigrationOperation[] };
    try {
      remainder = await prepareStep(selected, context);
    } catch (error) {
      if (!isInputFailure(error)) throw error;
      io.stderr.write(`${errorMessage(error)}\n`);
      return 2;
    }
    await applyOperations(remainder.operations, context, step);
    io.stdout.write(
      `${renderReport(selected, remainder.plan, [...recovery.operations, ...remainder.operations], false)}\n`,
    );
    return (remainder.plan.forAPerson?.length ?? 0) > 0 ? 3 : 0;
  }
  const withRecovery: MigrationStep = {
    ...selected,
    async plan(currentContext) {
      const plan = await selected.plan(currentContext);
      return { ...plan, operations: [...staleStages, ...plan.operations] };
    },
  };
  return await executePlannedStep(withRecovery, context, dryRun, io);
}

/**
 * Steps 11 and 12 compare the project with the installed package rather than
 * with the old layout, so only step 1's output gates them: no ID map, plan or
 * earlier staging is read.
 */
async function runEntryStep(
  step: 11 | 12,
  context: MigrationContext,
  dryRun: boolean,
  io: OutputIo,
): Promise<0 | 2 | 3> {
  try {
    if (await hasPendingRename(context)) {
      io.stderr.write(`Run step 1 before step ${step}.\n`);
      return 2;
    }
  } catch (error) {
    if (!isInputFailure(error)) throw error;
    io.stderr.write(`${errorMessage(error)}\n`);
    return 2;
  }
  return await executePlannedStep(await loadStep(step), context, dryRun, io);
}

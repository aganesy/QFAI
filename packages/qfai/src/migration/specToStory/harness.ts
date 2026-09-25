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

import { loadConfig, resolvePath, type QfaiConfig } from "../../core/config.js";
import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { ID_MAP_PATH, IdMapInputError, readIdMap } from "./idMap.js";
import { shouldRenameSource, STEP01_RENAMES } from "./step01RenameDirectories.js";

export type MigrationStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type WriteSetArea =
  | "qfai"
  | "specs"
  | "contracts"
  | "config"
  | "gitignore"
  | "gitignore-staging"
  | "links"
  | "test-annotations";
export type ReportSection = "Cases to examples" | "For a person" | "Annotations kept";

export type MigrationContext = {
  root: string;
  specsDir: string;
  contractsDir: string;
  config: QfaiConfig;
};

export type MigrationOperation =
  | { kind: "write"; target: string; content: string }
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
      apply: () => Promise<void>;
    };

export type StepPlan = {
  operations: MigrationOperation[];
  annotationTargets?: string[];
  forAPerson?: string[];
  casesToExamples?: string[];
  annotationsKept?: string[];
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
    return (operation.targets ?? [operation.target]).map(
      (target) => `${target}: ${operation.description}`,
    );
  }
  return [operationLine(operation)];
}

function reportSection(name: string, entries: readonly string[]): string {
  return `## ${name}\n${entries.length === 0 ? "none" : entries.map((entry) => `- ${entry}`).join("\n")}\n`;
}

function renderReport(
  step: MigrationStep,
  plan: StepPlan,
  operations: readonly MigrationOperation[],
): string {
  let report = reportSection("Operations", operations.flatMap(operationLines));
  for (const section of step.sections ?? []) {
    const items =
      section === "For a person"
        ? (plan.forAPerson ?? [])
        : section === "Cases to examples"
          ? (plan.casesToExamples ?? [])
          : (plan.annotationsKept ?? []);
    report += `\n${reportSection(section, items)}`;
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
  }
  io.stdout.write(`${renderReport(step, prepared.plan, prepared.operations)}\n`);
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
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 10;
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
  }
}

async function hasLegacyEntries(context: MigrationContext): Promise<boolean> {
  if (await pathExists(path.join(context.root, ID_MAP_PATH))) return true;
  for (const [source] of STEP01_RENAMES) {
    if (
      (await shouldRenameSource(context, source)) &&
      (await pathExists(path.join(context.root, source)))
    ) {
      return true;
    }
  }
  const entries = await readdir(context.specsDir).catch((error: unknown) => {
    if (isEnoent(error)) return [] as string[];
    throw error;
  });
  return entries.some((entry) => entry === "_policies" || /^spec-\d{4}$/.test(entry));
}

export async function runStep(step: unknown, argv: unknown, io: MigrationIo): Promise<0 | 2 | 3> {
  if (!isMigrationStepNumber(step)) {
    io.stderr.write("Step must be an integer from 1 to 10.\n");
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
  const loaded = await loadConfig(root);
  if (loaded.issues.length > 0) {
    io.stderr.write("Cannot read or parse qfai.config.yaml.\n");
    return 2;
  }
  const context: MigrationContext = {
    root,
    config: loaded.config,
    specsDir: resolvePath(root, loaded.config, "specsDir"),
    contractsDir: resolvePath(root, loaded.config, "contractsDir"),
  };
  let selected: MigrationStep;
  let staleStages: MigrationOperation[];
  try {
    const map = await readIdMap(root);
    staleStages = await staleStageOperations(context, step);
    if (!(await hasLegacyEntries(context)) && staleStages.length === 0) {
      const selected = await loadStep(step);
      if (step === 9) {
        // Step 1 moved the directories the host links pointed at, so an old
        // link outlives every other trace of the old layout.
        const plan = await selected.plan(context);
        if (plan.operations.length > 0) {
          const linkStep: MigrationStep = { ...selected, plan: () => Promise.resolve(plan) };
          return await executePlannedStep(linkStep, context, argv.length === 1, io);
        }
      }
      if (step === 10) {
        const plan = await selected.plan(context);
        const hasStaging = plan.operations.some(
          (operation) =>
            operation.kind === "delegate" &&
            operation.targets?.some((target) => target !== ".gitignore"),
        );
        if (hasStaging || (plan.forAPerson?.length ?? 0) > 0) {
          const cleanupStep: MigrationStep = {
            ...selected,
            plan: () => Promise.resolve(hasStaging ? plan : { ...plan, operations: [] }),
          };
          return await executePlannedStep(cleanupStep, context, argv.length === 1, io);
        }
      }
      io.stdout.write(`${renderReport(selected, { operations: [] }, [])}\n`);
      return 0;
    }
    if (step >= 2) {
      for (const [source] of STEP01_RENAMES) {
        if (
          (await shouldRenameSource(context, source)) &&
          (await pathExists(path.join(root, source)))
        ) {
          io.stderr.write(`Run step 1 before step ${step}.\n`);
          return 2;
        }
      }
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
  const dryRun = argv.length === 1;
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
      `${renderReport(selected, remainder.plan, [...recovery.operations, ...remainder.operations])}\n`,
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

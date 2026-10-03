import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { SKILL_INTEGRATION_DIRS } from "../../core/init/integrationDirs.js";
import {
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
} from "../../core/claudeCodeHooks.js";
import { AGENTS_RULES_DIR, REMINDERS_BASENAME } from "../../core/ruleMasterUpdates.js";
import {
  loadConfig,
  resolvePath,
  WORKFLOW_MODE_MESSAGE,
  type QfaiConfig,
} from "../../core/config.js";
import { hasErrnoCode, isEnoent } from "../../core/fs/errno.js";
import { ID_MAP_PATH, IdMapInputError, MIGRATION_STATE_DIR, readIdMap } from "./idMap.js";
import { shouldRenameSource, STEP01_RENAMES } from "./step01RenameDirectories.js";

export type MigrationStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type WriteSetArea =
  | "qfai"
  | "specs"
  | "contracts"
  | "config"
  | "gitignore"
  | "links"
  | "test-annotations"
  | "skills"
  | "steps"
  | "skill-links"
  | "reminder-hooks"
  | "migration-state";
export type ReportSection =
  "Cases to examples" | "Files scanned" | "For a person" | "Annotations kept" | "Reminder hooks";

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
  | { kind: "move"; source: string; target: string }
  /** Deletes a file, or a directory with everything in it. */
  | { kind: "remove"; target: string; description: string }
  | { kind: "remove-empty-directory"; target: string }
  | {
      kind: "delegate";
      target: string;
      targets?: readonly string[];
      description: string;
      /** Report lines printed in place of one line per target. */
      report?: readonly string[];
      apply: () => Promise<void>;
    };

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
  filesScanned?: string[];
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

/** The hook files step 11 writes, and the message file the hooks read. */
const REMINDER_FILES = [
  CLAUDE_SETTINGS_RELATIVE_PATH,
  CODEX_HOOKS_RELATIVE_PATH,
  `${AGENTS_RULES_DIR}/${REMINDERS_BASENAME}`,
];

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
      return (
        inside(path.join(root, ".qfai"), target) &&
        !inside(path.join(root, ".qfai", "evidence"), target)
      );
    case "specs":
      return inside(context.specsDir, target);
    case "contracts":
      return inside(context.contractsDir, target);
    case "config":
      return target === path.join(root, "qfai.config.yaml");
    case "gitignore":
      return target === path.join(root, ".gitignore");
    case "links":
      return HOST_LINKS.some((link) => inside(path.join(root, link), target));
    case "test-annotations":
      return inside(resolvePath(root, context.config, "testsDir"), target);
    case "skills": {
      const skills = path.join(root, ".qfai", "assistant", "skill");
      return target !== skills && inside(skills, target);
    }
    case "steps": {
      const steps = path.join(root, ".qfai", "assistant", "step");
      return target !== steps && inside(steps, target);
    }
    case "skill-links":
      return SKILL_INTEGRATION_DIRS.some((link) => inside(path.join(root, link), target));
    case "reminder-hooks":
      return REMINDER_FILES.some((file) => target === path.join(root, ...file.split("/")));
    case "migration-state":
      return inside(path.join(root, ...MIGRATION_STATE_DIR.split("/")), target);
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
        if (permitted("gitignore", delegatedTarget, context)) {
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
    const target = allowed(operation.target);
    if (touched.has(target))
      throw new MigrationRefusal(
        `Step ${step.number} plans the same path twice: ${operation.target}`,
      );
    touched.add(target);
    await assertNoSymlinkParents(target, context);
    if (operation.kind === "write") {
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
      if (await pathExists(target)) {
        throw new MigrationRefusal(`Migration destination exists: ${operation.target}`);
      }
      effective.push(operation);
      continue;
    }
    if (await pathExists(target)) effective.push(operation);
  }
  return effective;
}

async function applyOperation(
  operation: MigrationOperation,
  context: MigrationContext,
): Promise<void> {
  const target = absolutePath(context.root, operation.target);
  switch (operation.kind) {
    case "write":
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, operation.content, "utf8");
      return;
    case "move":
      {
        const source = absolutePath(context.root, operation.source);
        await mkdir(path.dirname(target), { recursive: true });
        try {
          await rename(source, target);
        } catch (error) {
          if (!(hasErrnoCode(error) && error.code === "EXDEV")) throw error;
          await cp(source, target, {
            recursive: true,
            preserveTimestamps: true,
            verbatimSymlinks: true,
          });
          await rm(source, { recursive: true });
        }
      }
      return;
    case "remove":
      await rm(target, { recursive: true });
      return;
    case "remove-empty-directory":
      if ((await readdir(target)).length !== 0) {
        throw new Error(`Directory is not empty after planned moves: ${operation.target}`);
      }
      await rmdir(target);
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
      return `${operation.source} → ${operation.target}: move`;
    case "remove":
      return `${operation.target}: ${operation.description}`;
    case "remove-empty-directory":
      return `${operation.target}: remove empty directory`;
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

function sectionItems(section: ReportSection, plan: StepPlan): string[] {
  switch (section) {
    case "For a person":
      return plan.forAPerson ?? [];
    case "Cases to examples":
      return plan.casesToExamples ?? [];
    case "Annotations kept":
      return plan.annotationsKept ?? [];
    case "Reminder hooks":
      return plan.reminderHooks ?? [];
    case "Files scanned":
      return plan.filesScanned ?? [];
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
): string {
  let report = reportSection("Operations", operations.flatMap(operationLines));
  for (const section of step.sections ?? []) {
    const items = sectionItems(section, plan);
    report += `\n${
      section === "For a person" && plan.forAPersonIdentifiers !== undefined
        ? groupedReportSection(items, plan.forAPersonIdentifiers)
        : reportSection(section, items)
    }`;
  }
  return report;
}

/** What a tree shows of the old layout, as the first line of steps 1 to 10 says it. */
type LayoutVerdict = "none" | "found" | "migrated";

/**
 * The steps that plan their own work on a tree with no other trace of the old
 * layout: step 1 renames directories, step 9 repoints host links and step 10
 * resets the managed `.gitignore` block.
 */
const OWN_WORK_STEPS: ReadonlySet<MigrationStepNumber> = new Set([1, 9, 10]);

/** Whether a step has an operation, an annotation to keep or an item for a person. */
function planHasWork(plan: StepPlan, operations: readonly MigrationOperation[]): boolean {
  return (
    operations.length > 0 ||
    (plan.annotationsKept?.length ?? 0) > 0 ||
    (plan.forAPerson?.length ?? 0) > 0
  );
}

/** A directory as the report names it: from the project root, with `/`, never an absolute path. */
function projectRelative(root: string, target: string, configured: string): string {
  const relative = path.relative(root, target);
  if (path.isAbsolute(relative)) return configured;
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

/** The resolved specs directory and the `paths.specsDir` value, as the verdict and closing lines name them. */
function specsDirNames(context: MigrationContext): string {
  const configured = context.config.paths.specsDir;
  const resolved = projectRelative(context.root, context.specsDir, configured);
  const value = projectRelative(context.root, path.resolve(context.root, configured), configured);
  return `${resolved} (paths.specsDir=${value})`;
}

function verdictLine(layout: LayoutVerdict, context: MigrationContext): string {
  if (layout === "migrated") return "already migrated (id-map.json present)";
  if (layout === "found") return "1.x layout found, migrating";
  return `no 1.x layout found under ${specsDirNames(context)}`;
}

/** Step 10's closing line. A migrated project gets the already-done line instead, printed by the caller. */
function closingLine(
  step: MigrationStepNumber,
  layout: LayoutVerdict,
  context: MigrationContext,
): string | null {
  if (step !== 10 || layout === "migrated") return null;
  if (layout === "found") return "Summary: a 1.x layout was found, so the steps are migrating it.";
  return `Summary: no 1.x layout was found under ${specsDirNames(context)}. Check that this is where the specs live.`;
}

/**
 * The text a step prints. Steps 1 to 10 pass a layout verdict and print it as
 * the first line, with step 10's closing line last; steps 11 and 12 pass none.
 */
function renderOutput(
  step: MigrationStep,
  plan: StepPlan,
  operations: readonly MigrationOperation[],
  layout: LayoutVerdict | null,
  context: MigrationContext,
): string {
  const report = renderReport(step, plan, operations);
  if (layout === null) return `${report}\n`;
  const closing = closingLine(step.number, layout, context);
  return `${verdictLine(layout, context)}\n\n${report}\n${closing === null ? "" : `${closing}\n`}`;
}

/**
 * Plans, applies and prints one step. `layoutTrace` is whether the tree shows a
 * trace of the old layout besides the step's own work; steps 1 to 10 pass it
 * and print a verdict line, and a caller that passes nothing prints none.
 */
export async function executePlannedStep(
  step: MigrationStep,
  context: MigrationContext,
  dryRun: boolean,
  io: OutputIo,
  layoutTrace?: boolean,
): Promise<0 | 2 | 3> {
  let prepared: { plan: StepPlan; operations: MigrationOperation[] };
  try {
    prepared = await prepareStep(step, context);
  } catch (error) {
    if (!isInputFailure(error)) throw error;
    io.stderr.write(`${errorMessage(error)}\n`);
    return 2;
  }
  const { plan, operations } = prepared;
  const found =
    layoutTrace === true || (OWN_WORK_STEPS.has(step.number) && planHasWork(plan, operations));
  const layout = layoutTrace === undefined ? null : found ? "found" : "none";
  if (!dryRun) await applyOperations(operations, context);
  io.stdout.write(renderOutput(step, plan, operations, layout, context));
  return (plan.forAPerson?.length ?? 0) > 0 ? 3 : 0;
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
): Promise<void> {
  for (const operation of operations) await applyOperation(operation, context);
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
 * hold no old layout, and none of the ten steps may have an operation, an item
 * for a person or an annotation to report. A 1.x project has no ID map, and a migration stopped part way has a
 * step with work or a report left, so neither reads as finished.
 *
 * Steps 4 and 7 are not planned here. They place the spec packs' content, and
 * with the ID map written and no pack left they have none to place. Their plans
 * read `plan.yaml` as well, which an old copy of the skill may have written
 * again after the migration; asking them would let that file decide whether a
 * finished project reads as finished.
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
    if (PACK_PLACING_STEPS.has(number)) continue;
    let prepared: { plan: StepPlan; operations: MigrationOperation[] };
    try {
      prepared = await prepareStep(await loadStep(number), context);
    } catch (error) {
      if (isInputFailure(error)) return false;
      throw error;
    }
    if (planHasWork(prepared.plan, prepared.operations)) return false;
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
  return await runConfiguredStep(step, argv.length === 1, root, io);
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
  let layoutTrace: boolean;
  try {
    const map = await readIdMap(root);
    if (await migrationFinished(context, step)) {
      const done = renderOutput(await loadStep(step), { operations: [] }, [], "migrated", context);
      io.stdout.write(`${done}${ALREADY_DONE}\n`);
      return 0;
    }
    // The verdict is taken here, from the tree as the step finds it, before any write.
    const retiredKey = loaded.issues.some(holdsRetiredKey);
    const legacy = await hasLegacyEntries(context);
    layoutTrace = retiredKey || legacy;
    // Step 3 replaces a retired config key, so a project that still holds one is not done with it.
    const retiredConfigWork = step === 3 && retiredKey;
    if (step !== 1 && !retiredConfigWork && !legacy) {
      return await runWithoutLayout(step, context, dryRun, io, layoutTrace);
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
  return await executePlannedStep(selected, context, dryRun, io, layoutTrace);
}

/**
 * A tree with no trace of the old layout. Step 9 still plans its own work, so
 * it says what it found from that work.
 */
async function runWithoutLayout(
  step: MigrationStepNumber,
  context: MigrationContext,
  dryRun: boolean,
  io: OutputIo,
  layoutTrace: boolean,
): Promise<0 | 2 | 3> {
  const selected = await loadStep(step);
  if (step === 9) {
    // Step 1 moved the directories the host links pointed at, so an old
    // link outlives every other trace of the old layout.
    const plan = await selected.plan(context);
    if (plan.operations.length > 0 || (plan.forAPerson?.length ?? 0) > 0) {
      const linkStep: MigrationStep = { ...selected, plan: () => Promise.resolve(plan) };
      return await executePlannedStep(linkStep, context, dryRun, io, layoutTrace);
    }
  }
  const layout = layoutTrace ? "found" : "none";
  io.stdout.write(renderOutput(selected, { operations: [] }, [], layout, context));
  return 0;
}

/**
 * Steps 11 and 12 compare the project with the installed package rather than
 * with the old layout, so only step 1's output gates them: no ID map or plan
 * is read.
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

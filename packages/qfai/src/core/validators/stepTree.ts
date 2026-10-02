import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { skillFrontmatterMapping } from "../agentFrontmatter.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import { assistantLayerDir, joinAssistantLayer } from "../paths/assistantPaths.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/** Where a project's steps live, relative to its root. */
export const STEP_DIR_REL = assistantLayerDir("step");

/** The entry file of one step, relative to the project root. */
export function stepFileRel(name: string): string {
  return `${STEP_DIR_REL}/${name}/STEP.md`;
}

const CODE = "QFAI-SKILLS-016";
const COMMON_OWNER = "common";
const COMMON_PREFIX = "common-";

/** One directory under the step layer, and what its `STEP.md` declares. */
type StepDir = {
  dir: string;
  /** Undefined when the directory holds no readable `STEP.md`. */
  frontmatter: Record<string, unknown> | undefined;
  hasDoc: boolean;
};

/**
 * A skill that runs steps: the names its `steps:` lists, the common steps its
 * own body runs in `requires:`, and the roles it declares.
 */
type Parent = { name: string; rel: string; steps: unknown[]; requires: unknown; roles: unknown };

type Tree = {
  steps: StepDir[];
  installed: Set<string>;
  parents: Map<string, Parent>;
  planSteps: Map<string, string>;
};

/**
 * The step layer is self-consistent: every step is a `STEP.md` named after its
 * directory, owned by a parent that lists it or by `common`, reached by a
 * parent's `steps:` or `requires:`, a plan or a step's `requires`, and every
 * name any of those uses is installed. Nothing under the layer is a
 * `SKILL.md`, which a host would load as a skill of its own.
 */
export async function validateStepTree(root: string, config: QfaiConfig): Promise<Issue[]> {
  const stepsDir = joinAssistantLayer(root, "step");
  const skillsDir = resolvePath(root, config, "skillsDir");
  const [steps, skillDirs] = await Promise.all([readStepDirs(stepsDir), readDirs(skillsDir)]);
  const parents = await readParents(root, skillsDir, skillDirs);
  if (steps === undefined && parents.size === 0) return [];
  const present = steps ?? [];
  const tree: Tree = {
    steps: present,
    installed: new Set(present.filter((step) => step.hasDoc).map((step) => step.dir)),
    parents,
    planSteps: await readPlanSteps(),
  };
  return [
    ...(await skillDocsUnderSteps(stepsDir)),
    ...present.flatMap((step) => stepDocIssues(step, tree)),
    ...referenceIssues(tree),
    ...[...parents.values()].flatMap((parent) =>
      requiresListIssues(parent.rel, parent.requires, tree),
    ),
    ...orphanIssues(tree),
    ...parentRolesIssues(tree),
  ];
}

function finding(message: string, file: string, rule: string): Issue {
  return issue(CODE, message, "error", file, `stepTree.${rule}`);
}

async function readDirs(dir: string): Promise<Dirent[] | undefined> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return undefined;
  }
}

async function readText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return undefined;
  }
}

async function readStepDirs(stepsDir: string): Promise<StepDir[] | undefined> {
  const entries = await readDirs(stepsDir);
  if (entries === undefined) return undefined;
  const dirs = entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name);
  return Promise.all(
    dirs.sort().map(async (dir) => {
      const text = await readText(path.join(stepsDir, dir, "STEP.md"));
      return {
        dir,
        hasDoc: text !== undefined,
        frontmatter: text === undefined ? undefined : skillFrontmatterMapping(text),
      };
    }),
  );
}

async function readParents(
  root: string,
  skillsDir: string,
  entries: Dirent[] | undefined,
): Promise<Map<string, Parent>> {
  const parents = new Map<string, Parent>();
  for (const entry of entries ?? []) {
    if (!entry.isDirectory()) continue;
    const doc = path.join(skillsDir, entry.name, "SKILL.md");
    const text = await readText(doc);
    if (text === undefined) continue;
    const mapping = skillFrontmatterMapping(text);
    const steps = mapping?.steps;
    if (Array.isArray(steps)) {
      const rel = path.relative(root, doc).replace(/\\/g, "/");
      parents.set(entry.name, {
        name: entry.name,
        rel,
        steps,
        requires: mapping?.requires ?? [],
        roles: mapping?.roles,
      });
    }
  }
  return parents;
}

/** Every step name the package's workflow plans use, with the plan file that uses it first. */
async function readPlanSteps(): Promise<Map<string, string>> {
  const plansDir = path.resolve(getInitAssetsDir(), "..", "defaults", "workflows");
  const used = new Map<string, string>();
  const files = (await readDirs(plansDir)) ?? [];
  for (const file of files.filter((entry) => entry.name.endsWith(".yml")).map((e) => e.name)) {
    const text = await readText(path.join(plansDir, file));
    for (const name of planStepNames(text)) {
      if (!used.has(name)) used.set(name, `assets/defaults/workflows/${file}`);
    }
  }
  return used;
}

function planStepNames(text: string | undefined): string[] {
  let parsed: unknown;
  try {
    parsed = text === undefined ? undefined : parseYaml(text);
  } catch {
    return [];
  }
  const stages: unknown = isRecord(parsed) ? parsed.stages : undefined;
  if (!Array.isArray(stages)) return [];
  return stages.flatMap((stage: unknown): string[] => {
    const steps: unknown = isRecord(stage) ? stage.steps : undefined;
    if (!Array.isArray(steps)) return [];
    return steps.flatMap((entry: unknown) => {
      const name: unknown = isRecord(entry) ? entry.step : entry;
      return typeof name === "string" ? [name] : [];
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function skillDocsUnderSteps(stepsDir: string): Promise<Issue[]> {
  let found: string[];
  try {
    found = await readdir(stepsDir, { recursive: true });
  } catch {
    return [];
  }
  return found
    .filter((rel) => path.basename(rel) === "SKILL.md")
    .sort()
    .map((rel) => {
      const file = `${STEP_DIR_REL}/${rel.replace(/\\/g, "/")}`;
      return finding(
        `${file} is a SKILL.md under the step layer. A step's entry file is STEP.md; a SKILL.md there is loaded as a skill of its own.`,
        file,
        "skillDocUnderSteps",
      );
    });
}

/** The checks one step directory answers by itself and against its owner. */
function stepDocIssues(step: StepDir, tree: Tree): Issue[] {
  const file = stepFileRel(step.dir);
  if (!step.hasDoc) {
    return [
      finding(
        `${STEP_DIR_REL}/${step.dir}/ has no STEP.md.`,
        `${STEP_DIR_REL}/${step.dir}`,
        "missingStepDoc",
      ),
    ];
  }
  const fm = step.frontmatter ?? {};
  const issues: Issue[] = [];
  if (fm.name !== step.dir) {
    issues.push(
      finding(
        `${file} declares name ${JSON.stringify(fm.name)}; a step's name is its directory, "${step.dir}".`,
        file,
        "nameMismatch",
      ),
    );
  }
  return [...issues, ...ownerIssues(step, fm, tree), ...requiresIssues(step, fm, tree)];
}

function ownerIssues(step: StepDir, fm: Record<string, unknown>, tree: Tree): Issue[] {
  const file = stepFileRel(step.dir);
  const owner = fm.owner;
  if (owner === COMMON_OWNER) return [];
  const parent = typeof owner === "string" ? tree.parents.get(owner) : undefined;
  if (parent === undefined) {
    return [
      finding(
        `${file} declares owner ${JSON.stringify(owner)}, which is neither "${COMMON_OWNER}" nor an installed skill that lists steps.`,
        file,
        "unknownOwner",
      ),
    ];
  }
  if (parent.steps.includes(step.dir)) return [];
  return [
    finding(
      `${file} is owned by ${parent.name}, whose steps: in ${parent.rel} does not list "${step.dir}".`,
      file,
      "ownerOmitsStep",
    ),
  ];
}

function requiresIssues(step: StepDir, fm: Record<string, unknown>, tree: Tree): Issue[] {
  const file = stepFileRel(step.dir);
  const requires = fm.requires ?? [];
  if (step.dir.startsWith(COMMON_PREFIX) && Array.isArray(requires) && requires.length > 0) {
    return [
      finding(
        `${file} is a common step and requires ${JSON.stringify(requires)}; a common step requires nothing.`,
        file,
        "commonRequires",
      ),
    ];
  }
  return requiresListIssues(file, requires, tree);
}

/**
 * A step's `requires`, and a parent skill's, is a list of installed
 * `common-*` steps, which keeps every chain to one hop.
 */
function requiresListIssues(file: string, requires: unknown, tree: Tree): Issue[] {
  if (!Array.isArray(requires)) {
    return [finding(`${file} declares requires: that is not a list.`, file, "requiresShape")];
  }
  return requires.flatMap((name: unknown) => {
    if (typeof name !== "string" || !name.startsWith(COMMON_PREFIX)) {
      const message = `${file} requires ${JSON.stringify(name)}; only ${COMMON_PREFIX}* steps may be required.`;
      return [finding(message, file, "requiresNonCommon")];
    }
    if (tree.installed.has(name)) return [];
    const message = `${file} requires "${name}", which is not installed under ${STEP_DIR_REL}/.`;
    return [finding(message, file, "unknownStep")];
  });
}

/** Every step name a parent's `steps:` or a plan uses is installed. */
function referenceIssues(tree: Tree): Issue[] {
  const fromParents = [...tree.parents.values()].flatMap((parent) =>
    parent.steps
      .filter((name) => typeof name !== "string" || !tree.installed.has(name))
      .map((name) =>
        finding(
          `${parent.rel} lists step ${JSON.stringify(name)} in steps:, which is not installed under ${STEP_DIR_REL}/.`,
          parent.rel,
          "unknownStep",
        ),
      ),
  );
  const fromPlans = [...tree.planSteps]
    .filter(([name]) => !tree.installed.has(name))
    .map(([name, plan]) =>
      finding(
        `The workflow plan ${plan} uses step "${name}", which is not installed under ${STEP_DIR_REL}/. Run \`qfai init --force\` to install the steps this release ships.`,
        stepFileRel(name),
        "unknownStep",
      ),
    );
  return [...fromParents, ...fromPlans];
}

/**
 * A step no parent lists or requires, no plan uses and no other step requires
 * is dead weight.
 */
function orphanIssues(tree: Tree): Issue[] {
  const used = new Set<unknown>([
    ...[...tree.parents.values()].flatMap((parent) => parent.steps),
    ...tree.planSteps.keys(),
    ...[
      ...[...tree.parents.values()].map((parent) => parent.requires),
      ...tree.steps.map((step) => step.frontmatter?.requires),
    ].flatMap((requires: unknown): unknown[] => (Array.isArray(requires) ? requires : [])),
  ]);
  return tree.steps
    .filter((step) => step.hasDoc && !used.has(step.dir))
    .map((step) =>
      finding(
        `${stepFileRel(step.dir)} is used by no skill's steps: or requires:, no workflow plan and no step's requires:.`,
        stepFileRel(step.dir),
        "orphan",
      ),
    );
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * A skill invoked by name runs its steps and dispatches their agents, so its
 * `roles:` holds `orchestrator` and every role its listed steps declare.
 */
function parentRolesIssues(tree: Tree): Issue[] {
  const rolesOf = new Map(
    tree.steps.map((step) => [step.dir, stringList(step.frontmatter?.roles)] as const),
  );
  return [...tree.parents.values()].flatMap((parent) => {
    const declared = new Set(stringList(parent.roles));
    const needed = new Set([
      "orchestrator",
      ...stringList(parent.steps).flatMap((name) => rolesOf.get(name) ?? []),
    ]);
    const missing = [...needed].filter((role) => !declared.has(role)).sort();
    if (missing.length === 0) return [];
    return [
      finding(
        `${parent.rel} roles: omits ${missing.join(", ")}. A skill run by name dispatches the agents of every step it lists, so it declares orchestrator and each of their roles.`,
        parent.rel,
        "parentRolesMissing",
      ),
    ];
  });
}

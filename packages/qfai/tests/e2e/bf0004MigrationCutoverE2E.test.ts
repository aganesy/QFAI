// QFAI:BF-0004
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(packageRoot, "tests/fixtures/migration-spec-to-story/old-layout");
const convertibleCriteria = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const completeExamples = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/legacy-examples.md",
);
const completeCases = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/legacy-cases.md",
);
const completeContractIndex = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/legacy-contract-index.md",
);
const completeApi = path.join(packageRoot, "tests/fixtures/bf0004MigrationCutover/legacy-api.yaml");
const completeDb = path.join(packageRoot, "tests/fixtures/bf0004MigrationCutover/legacy-db.sql");
const migratedIntegration = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/order.integration.test.ts",
);
const migratedE2e = path.join(
  packageRoot,
  "tests/fixtures/bf0004MigrationCutover/order.e2e.test.ts",
);
const scripts = path.join(
  packageRoot,
  "assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/scripts",
);
const cli = path.join(packageRoot, "dist/cli/index.mjs");
const names = [
  "01-rename-directories.mjs",
  "02-merge-tables.mjs",
  "03-move-catalog.mjs",
  "04-renumber-ids.mjs",
  "05-cases-to-examples.mjs",
  "06-derive-ac-refs.mjs",
  "07-rules-to-contracts.mjs",
  "08-rewrite-annotations.mjs",
  "09-repoint-links.mjs",
  "10-update-gitignore.mjs",
] as const;
const tempRoots: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string };
type IdMap = {
  version: number;
  ids: Record<string, Record<string, string>>;
  placements: Record<string, Record<string, string>>;
};
type ValidationIssue = { code: string; severity: string; file?: string };
type Journey = {
  root: string;
  dry: Result[];
  real: Result[];
  dryUnchanged: boolean[];
  rerunUnchanged: boolean;
  map: IdMap;
  validation: Result;
  validationIssues: ValidationIssue[];
  tddValidation: Result;
  oldReader: Result;
};
type Failure = {
  result: Result;
  before: string;
  after: string;
  sourceBefore: string;
  sourceAfter: string;
};

function run(root: string, command: string, args: string[]): Result {
  const child = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 30_000 });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function step(root: string, number: number, args: string[] = []): Result {
  const name = names[number - 1];
  if (!name) throw new Error(`Unknown migration step ${number}`);
  return run(root, process.execPath, [path.join(scripts, name), ...args]);
}

function requireComplete(result: Result, stage: string): void {
  if (result.status !== 0 || forPerson(result.stdout).length > 0) {
    throw new Error(`${stage}: exit ${result.status}\n${result.stderr}\n${result.stdout}`);
  }
}

function operations(report: string): string[] {
  const section = /^## Operations\r?\n([\s\S]*?)(?=\r?\n## |$)/.exec(report)?.[1] ?? "";
  return section.split(/\r?\n/).filter((line) => line.trim() !== "" && line.trim() !== "none");
}

function forPerson(report: string): string[] {
  const section = /^## For a person\r?\n([\s\S]*?)(?=\r?\n## |$)/m.exec(report)?.[1] ?? "";
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && line !== "none");
}

async function hashTree(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const item = path.join(directory, name);
      const relative = path.relative(root, item).replace(/\\/g, "/");
      const stat = await lstat(item);
      hash.update(`${relative}\0${stat.mode}\0`);
      if (stat.isSymbolicLink()) {
        hash.update(`link\0${await readlink(item)}\0`);
      } else if (stat.isDirectory()) {
        hash.update("directory\0");
        await visit(item);
      } else {
        hash.update("file\0");
        hash.update(await readFile(item));
        hash.update("\0");
      }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0004-"));
  tempRoots.push(root);
  // The project has adopted current assistant assets and AC annotations before its legacy specs move.
  await cp(fixture, root, { recursive: true });
  const retiredPack = path.resolve(root, ".qfai/specs/spec-0002");
  if (!retiredPack.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error("Retired fixture pack escaped the temporary project");
  }
  await rm(retiredPack, { recursive: true });
  for (const [legacy, current] of [
    ["constitution", "rule"],
    ["skills", "skill"],
    ["agents", "agent"],
    ["prompts", "prompt"],
  ] as const) {
    const oldDir = path.resolve(root, ".qfai/assistant", legacy);
    if (!oldDir.startsWith(`${path.resolve(root)}${path.sep}`)) {
      throw new Error("Legacy assistant path escaped the temporary project");
    }
    await rm(oldDir, { recursive: true });
    await cp(
      path.join(packageRoot, "assets/init/.qfai/assistant", current),
      path.join(root, ".qfai/assistant", current),
      { recursive: true, force: true },
    );
  }
  await cp(convertibleCriteria, path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"));
  await cp(completeExamples, path.join(root, ".qfai/specs/spec-0001/05_Examples.md"));
  await cp(completeCases, path.join(root, ".qfai/specs/spec-0001/06_Test-Cases.md"));
  await cp(completeContractIndex, path.join(root, ".qfai/specs/_policies/05_Contracts.md"));
  await cp(completeApi, path.join(root, ".qfai/contracts/api/order.yaml"));
  await cp(completeDb, path.join(root, ".qfai/contracts/db/orders.sql"));
  const integrationTarget = path.join(root, "tests/integration/order.test.ts");
  await cp(migratedIntegration, integrationTarget);
  await writeFile(
    integrationTarget,
    (await readFile(integrationTarget, "utf8")).replaceAll("QFAI~", "QFAI:"),
  );
  await cp(migratedE2e, path.join(root, "tests/e2e/order.test.ts"));
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rename(
    path.join(root, ".qfai/assistant/skill-local.input"),
    path.join(root, ".qfai/assistant/skills.local"),
  );
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(
    packageRoot,
    path.join(root, "node_modules/qfai"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const initialized = run(root, "git", ["init", "-q"]);
  if (initialized.status !== 0) throw new Error(`git init: ${initialized.stderr}`);
  return root;
}

function prepareThrough(root: string, last: number): void {
  for (let number = 1; number <= last; number += 1) {
    requireComplete(step(root, number), `prepare step ${number}`);
  }
}

let journey: Journey;
let invalidPlan: Failure;
let unresolved: Failure;

beforeAll(async () => {
  const root = await project();
  const dry: Result[] = [];
  const real: Result[] = [];
  const dryUnchanged: boolean[] = [];
  for (let number = 1; number <= 10; number += 1) {
    const before = await hashTree(root);
    const preview = step(root, number, ["--dry-run"]);
    requireComplete(preview, `dry step ${number}`);
    dry.push(preview);
    dryUnchanged.push((await hashTree(root)) === before);
    const applied = step(root, number);
    requireComplete(applied, `real step ${number}`);
    real.push(applied);
  }
  const firstHash = await hashTree(root);
  for (let number = 1; number <= 10; number += 1) {
    requireComplete(step(root, number), `rerun step ${number}`);
  }
  const rerunUnchanged = (await hashTree(root)) === firstHash;
  const map = JSON.parse(
    await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
  ) as IdMap;
  const validation = run(root, process.execPath, [
    cli,
    "validate",
    "--root",
    root,
    "--fail-on",
    "error",
  ]);
  const validationReport = JSON.parse(
    await readFile(path.join(root, ".qfai/report/validate.json"), "utf8"),
  ) as { issues: ValidationIssue[] };
  const tddValidation = run(root, process.execPath, [
    cli,
    "validate",
    "--root",
    root,
    "--profile",
    "tdd",
    "--flow",
    "BF-0001",
    "--fail-on",
    "error",
  ]);
  const oldReader = run(root, process.execPath, [
    cli,
    "validate",
    "--root",
    root,
    "--spec",
    "spec-0001",
  ]);
  journey = {
    root,
    dry,
    real,
    dryUnchanged,
    rerunUnchanged,
    map,
    validation,
    validationIssues: validationReport.issues,
    tddValidation,
    oldReader,
  };

  const invalidRoot = await project();
  prepareThrough(invalidRoot, 3);
  const planPath = path.join(invalidRoot, ".qfai/evidence/migration-spec-to-story/plan.yaml");
  const originalPlan = await readFile(planPath, "utf8");
  const brokenPlan = originalPlan.replace(
    'from: "CHG-0001: Order flow"',
    'from: "Missing old flow"',
  );
  if (brokenPlan === originalPlan) throw new Error("Fixture has no named source flow");
  await writeFile(planPath, brokenPlan);
  const flowSource = path.join(invalidRoot, ".qfai/spec/_policies/04_Business-Flow.md");
  const flowBefore = await readFile(flowSource, "utf8");
  const invalidBefore = await hashTree(invalidRoot);
  const invalidResult = step(invalidRoot, 4);
  invalidPlan = {
    result: invalidResult,
    before: invalidBefore,
    after: await hashTree(invalidRoot),
    sourceBefore: flowBefore,
    sourceAfter: await readFile(flowSource, "utf8"),
  };

  const unresolvedRoot = await project();
  prepareThrough(unresolvedRoot, 3);
  const unresolvedPlan = path.join(
    unresolvedRoot,
    ".qfai/evidence/migration-spec-to-story/plan.yaml",
  );
  const originalRulePlan = await readFile(unresolvedPlan, "utf8");
  const missingContractPlan = originalRulePlan.replace(
    "contract: api/order.yaml",
    "contract: api/missing-order.yaml",
  );
  if (missingContractPlan === originalRulePlan) throw new Error("Fixture has no API rule owner");
  await writeFile(unresolvedPlan, missingContractPlan);
  prepareThrough(unresolvedRoot, 6);
  const ruleSource = path.join(unresolvedRoot, ".qfai/spec/spec-0001/04_Business-Rules.md");
  const ruleText = await readFile(ruleSource, "utf8");
  const unresolvedBefore = await hashTree(unresolvedRoot);
  const unresolvedResult = step(unresolvedRoot, 7);
  unresolved = {
    result: unresolvedResult,
    before: unresolvedBefore,
    after: await hashTree(unresolvedRoot),
    sourceBefore: ruleText,
    sourceAfter: await readFile(ruleSource, "utf8"),
  };
}, 420_000);

afterAll(async () => {
  for (const root of tempRoots) await removeTempTree(root);
});

// QFAI:BF-0004
describe("BF-0004 migration cutover", () => {
  it("previews and applies ten ordered steps, then reruns without changing a file", () => {
    expect(journey.dry).toHaveLength(10);
    expect(journey.real).toHaveLength(10);
    expect(journey.dryUnchanged).toEqual(Array(10).fill(true));
    expect(journey.real.every((result) => result.status === 0)).toBe(true);
    expect(journey.real.map((result) => forPerson(result.stdout))).toEqual(
      Array.from({ length: 10 }, () => []),
    );
    expect(journey.dry.map((result) => operations(result.stdout))).toEqual(
      journey.real.map((result) => operations(result.stdout)),
    );
    expect(journey.rerunUnchanged).toBe(true);
    expect(journey.map.version).toBe(1);
    expect(journey.map.ids["spec-0001"]).toMatchObject({
      "US-0001-0001": "US-0001-0001",
      "AC-0001-0001": "AC-0001-0001-01",
      "AC-0001-0002": "AC-0001-0001-02",
    });
    expect(journey.map.placements["spec-0001"]).toMatchObject({
      "US-0001-0001": "Place an order",
      "BR-0001-0001": "api/order.yaml",
    });
  });

  it("writes the mapped IDs into the selected story and example files", async () => {
    const ids = journey.map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const storyDir = path.join(
      journey.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001",
    );
    expect(await readFile(path.join(storyDir, "01_User-story.md"), "utf8")).toContain(
      ids["US-0001-0001"],
    );
    const criteria = await readFile(path.join(storyDir, "02_Acceptance-Criteria.md"), "utf8");
    expect(criteria).toContain(ids["AC-0001-0001"]);
    expect(criteria).toContain(ids["AC-0001-0002"]);
    const examples = await readFile(path.join(storyDir, "03_Example.md"), "utf8");
    expect(examples).toContain(ids["EX-0001-0001"]);
    expect(examples).toContain(ids["TC-0001-0003"]);
  });

  it("rewrites old test annotations and preserves the prepared acceptance obligations", async () => {
    const ids = journey.map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const integration = await readFile(
      path.join(journey.root, "tests/integration/order.test.ts"),
      "utf8",
    );
    const e2e = await readFile(path.join(journey.root, "tests/e2e/order.test.ts"), "utf8");
    expect(integration).toContain(`QFAI:${ids["AC-0001-0001"]}`);
    expect(integration).toContain(`QFAI:${ids["AC-0001-0002"]}`);
    for (const oldId of ["TC-0001-0001", "TC-0001-0002", "TC-0001-0003"]) {
      expect(integration).toContain(`QFAI:${ids[oldId]}`);
    }
    expect(e2e).toContain(["QFAI", "BF-0001"].join(":"));
    expect(journey.real[4]?.stdout).toContain("TC-0001-0003");
    expect(journey.real[7]?.stdout).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(journey.real[7]?.stdout).toContain("QFAI:CON-API-0001");
  });

  it("retires the old reader and leaves no story or contract migration errors", async () => {
    await expect(lstat(path.join(journey.root, ".qfai/specs"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      lstat(path.join(journey.root, ".qfai/spec/spec-0001/04_Business-Rules.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(
        path.join(
          journey.root,
          ".qfai/evidence/migration-spec-to-story/retired/spec-0001/04_Business-Rules.md",
        ),
        "utf8",
      ),
    ).toContain("A valid order receives a receipt.");
    expect(journey.oldReader.status).toBe(2);
    expect(`${journey.oldReader.stdout}\n${journey.oldReader.stderr}`).toContain("--flow BF-NNNN");
    for (const host of [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"]) {
      const wrapper = path.join(journey.root, host, "qfai-sdd");
      expect((await readlink(wrapper)).replace(/\\/g, "/")).toContain("assistant/skill/qfai-sdd");
      expect((await stat(wrapper)).isDirectory()).toBe(true);
    }
    expect([0, 1], journey.validation.stderr + journey.validation.stdout).toContain(
      journey.validation.status,
    );
    const migrationErrors = journey.validationIssues.filter(
      (issue) =>
        issue.severity === "error" &&
        /^(?:QFAI-STORY-|QFAI-CONTRACT-|QFAI-SPACK-|QFAI-FLOW-)/.test(issue.code),
    );
    expect(migrationErrors, journey.validation.stderr + journey.validation.stdout).toEqual([]);
    expect(
      journey.tddValidation.status,
      journey.tddValidation.stderr + journey.tddValidation.stdout,
    ).toBe(0);
  });

  it("refuses an invalid plan before writing and leaves its source intact", () => {
    expect(invalidPlan.result.status).toBe(2);
    expect(invalidPlan.result.stderr).toContain("plan.yaml");
    expect(invalidPlan.before).toBe(invalidPlan.after);
    expect(invalidPlan.sourceAfter).toBe(invalidPlan.sourceBefore);
    expect(invalidPlan.sourceAfter).toContain("CHG-0001: Order flow");
  });

  it("reports an unresolved rule with exit 3 and retains the old wording", () => {
    expect(unresolved.result.status).toBe(3);
    expect(unresolved.result.stdout).toContain("## For a person");
    expect(unresolved.result.stdout).toContain("BR-0001-0001");
    const oldRule = "| BR-0001-0001 | A valid order receives a receipt.       |";
    expect(unresolved.sourceBefore).toContain(oldRule);
    expect(unresolved.sourceAfter).toContain(oldRule);
  });
});

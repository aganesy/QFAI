import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = path.join(packageRoot, "tests/fixtures/migration-spec-to-story/old-layout");
const cutoverFixtures = path.join(packageRoot, "tests/fixtures/bf0004MigrationCutover");
const scriptRoot = path.join(
  packageRoot,
  "assets/init/.qfai/assistant/skill/qfai-migration-v1-to-v2/scripts",
);
const scriptNames = [
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
const temporaryRoots: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string };
type IdMap = { ids: Record<string, Record<string, string>> };

function run(root: string, command: string, args: string[]): Result {
  const child = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 30_000 });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function step(root: string, number: number, args: string[] = []): Result {
  const script = scriptNames[number - 1];
  if (!script) throw new Error(`Unknown migration step ${number}`);
  return run(root, process.execPath, [path.join(scriptRoot, script), ...args]);
}

async function text(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), "utf8");
}

async function migrationProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0004-outcomes-"));
  temporaryRoots.push(root);
  await cp(fixtureRoot, root, { recursive: true });
  const retiredPack = path.resolve(root, ".qfai/specs/spec-0002");
  if (!retiredPack.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error("Fixture pack escaped the temporary project");
  }
  await rm(retiredPack, { recursive: true });
  for (const [legacy, current] of [
    ["constitution", "rule"],
    ["skills", "skill"],
    ["agents", "agent"],
    ["prompts", "prompt"],
  ] as const) {
    const legacyDir = path.resolve(root, ".qfai/assistant", legacy);
    if (!legacyDir.startsWith(`${path.resolve(root)}${path.sep}`)) {
      throw new Error("Legacy assistant path escaped the temporary project");
    }
    await rm(legacyDir, { recursive: true });
    await cp(
      path.join(packageRoot, "assets/init/.qfai/assistant", current),
      path.join(root, ".qfai/assistant", current),
      { recursive: true },
    );
  }
  for (const [source, target] of [
    ["legacy-criteria.md", ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"],
    ["legacy-examples.md", ".qfai/specs/spec-0001/05_Examples.md"],
    ["legacy-cases.md", ".qfai/specs/spec-0001/06_Test-Cases.md"],
    ["legacy-contract-index.md", ".qfai/specs/_policies/05_Contracts.md"],
    ["legacy-api.yaml", ".qfai/contracts/api/order.yaml"],
    ["legacy-db.sql", ".qfai/contracts/db/orders.sql"],
  ] as const) {
    await cp(path.join(cutoverFixtures, source), path.join(root, target));
  }
  const examplesPath = path.join(root, ".qfai/specs/spec-0001/05_Examples.md");
  const examples = await readFile(examplesPath, "utf8");
  const citedTwice = examples.replace(
    "EX-0001-0003 | BR-0001-0001",
    "EX-0001-0003 | BR-0001-0001, BR-0001-0002",
  );
  if (citedTwice === examples) throw new Error("Fixture lacks the second rule citation");
  await writeFile(examplesPath, citedTwice);
  await cp(
    path.join(cutoverFixtures, "order.integration.test.ts"),
    path.join(root, "tests/integration/order.test.ts"),
  );
  await cp(
    path.join(cutoverFixtures, "order.e2e.test.ts"),
    path.join(root, "tests/e2e/order.test.ts"),
  );
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

function requireStep(result: Result, number: number): void {
  if (result.status !== 0 || /## For a person\r?\n(?!none(?:\r?\n|$))/.test(result.stdout)) {
    throw new Error(`Step ${number}: exit ${result.status}\n${result.stderr}\n${result.stdout}`);
  }
}

let root: string;
let map: IdMap;
let reports: Result[];

beforeAll(async () => {
  root = await migrationProject();
  reports = [];
  for (let number = 1; number <= 10; number += 1) {
    const result = step(root, number);
    requireStep(result, number);
    reports.push(result);
  }
  map = JSON.parse(await text(root, ".qfai/evidence/migration-spec-to-story/id-map.json")) as IdMap;
}, 300_000);

afterAll(async () => {
  for (const temporaryRoot of temporaryRoots) await removeTempTree(temporaryRoot);
});

describe("BF-0004 migration outcomes", () => {
  // QFAI:BF-0004
  it("writes mapped rules and their citing examples into YAML, SQL and Markdown contracts", async () => {
    const ids = map.ids["spec-0001"];
    if (!ids) throw new Error("Missing migrated spec-0001 ID map");
    const yaml = parse(await text(root, ".qfai/spec/03_contract/api/order.yaml")) as {
      "x-qfai-rules"?: Array<{ id: string; statement: string; examples: string[] }>;
    };
    expect(yaml["x-qfai-rules"]).toContainEqual({
      id: ids["BR-0001-0001"],
      statement: "A valid order receives a receipt.",
      examples: [ids["EX-0001-0001"], ids["EX-0001-0003"]],
    });
    const sql = await text(root, ".qfai/spec/03_contract/db/orders.sql");
    expect(sql).toContain(
      `-- Rule ${ids["BR-0001-0002"]}: An accepted order keeps its identifier.\n-- Examples: ${ids["EX-0001-0001"]}, ${ids["EX-0001-0003"]}`,
    );
    const markdown = await text(root, ".qfai/spec/03_contract/design/order.md");
    expect(markdown).toContain("## Rules\n\n| BR-ID | Statement | Examples |");
    expect(markdown).toContain(
      `| ${ids["BR-0001-0003"]} | An empty order has no receipt screen. | ${ids["EX-0001-0002"]} |`,
    );
  });

  // QFAI:BF-0004
  it("leaves an unmapped annotation byte-identical and reports its file and line", async () => {
    const relative = "tests/e2e/order.test.ts";
    const before = await text(root, relative);
    const input = `${before.trimEnd()}\n// QFAI:SPEC-0001:TC-9999-9999\n`;
    await writeFile(path.join(root, relative), input);
    const result = step(root, 8);
    expect(result.status).toBe(3);
    expect(result.stdout).toContain("## For a person");
    expect(result.stdout).toContain(
      `${relative}:3: QFAI:SPEC-0001:TC-9999-9999: no usable ID mapping`,
    );
    expect(await text(root, relative)).toBe(input);
  });

  // QFAI:BF-0004
  it("preserves user ignore lines and makes the decision directory visible to Git", async () => {
    const migrated = await text(root, ".gitignore");
    const marker = "# ── QFAI managed (generated by qfai init) ──";
    expect(migrated).toContain(marker);
    const rerun = step(root, 10);
    expect(rerun.status, rerun.stderr + rerun.stdout).toBe(0);
    expect(await text(root, ".gitignore")).toBe(migrated);
    expect(migrated).toContain("# Local notes stay ignored.\nscratch/");
    expect(migrated).toContain("!.qfai/evidence/decision/");
    expect(migrated).toContain("!.qfai/evidence/decision/**");
    expect(migrated).not.toContain("!.qfai/evidence/decisions/");
    const decision = ".qfai/evidence/decision/record.json";
    await mkdir(path.join(root, ".qfai/evidence/decision"), { recursive: true });
    await writeFile(path.join(root, decision), "{}\n");
    const ignored = run(root, "git", ["check-ignore", "-q", decision]);
    expect(ignored.status, ignored.stderr).toBe(1);
    expect(reports[9]?.status).toBe(0);
  });

  // QFAI:BF-0004
  it("ships the migration guide with the installed skill and the release choices", async () => {
    const skill = await text(root, ".qfai/assistant/skill/qfai-migration-v1-to-v2/SKILL.md");
    const guide = await text(
      root,
      ".qfai/assistant/skill/qfai-migration-v1-to-v2/references/migration-guide.md",
    );
    expect(skill).toContain("references/migration-guide.md");
    expect(guide).toContain("QFAI 2.0.0 introduces");
    expect(guide).toContain("QFAI 2.x does not read the old spec-pack layout");
    expect(guide).toContain("stay on a pinned 1.x release");
    expect(guide).toContain("To upgrade, migrate the project before using");
    expect(guide).not.toContain("v2.0.0");
  });
});

// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
// QFAI:BF-0004
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
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

import { ensureRootGitignoreEntries } from "../../src/cli/commands/init.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const FIXTURE = path.join(PACKAGE_ROOT, "tests/fixtures/migration-spec-to-story/old-layout");
const CONVERTIBLE_CRITERIA = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const SKILL_SCRIPTS = path.join(
  PACKAGE_ROOT,
  "assets/init/.qfai/assistant/skill/qfai-migration-v1-to-v2/scripts",
);
const CLI = path.join(PACKAGE_ROOT, "dist/cli/index.mjs");
const RESOLUTION = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/migration-spec-to-story/resolutions/case-only-rule.json",
);
const SCRIPT_NAMES = [
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
  "11-install-entry.mjs",
  "12-check-entry.mjs",
] as const;
const HOST_SKILL_DIRS = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];
const HOST_AGENT_DIRS = [".claude/agents", ".github/agents"];
const agentName = (dir: string) =>
  dir === ".github/agents" ? "orchestrator.agent.md" : "orchestrator.md";
const HOST_WRAPPERS = new Set([
  ...HOST_SKILL_DIRS.map((dir) => `${dir}/qfai-sdd`),
  ...HOST_AGENT_DIRS.map((dir) => `${dir}/${agentName(dir)}`),
]);
const temporary: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string; error?: Error | undefined };
type Journey = {
  root: string;
  beforeLinks: string;
  preview: Result[];
  applied: Result[];
  dryRunHashes: Array<[string, string]>;
  firstHash: string;
  secondHash: string;
  validation: Result;
};

function run(root: string, command: string, args: string[], env = process.env): Result {
  const child = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env,
  });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
    ...(child.error ? { error: child.error } : {}),
  };
}

function step(root: string, number: number, args: string[] = [], nodeArgs: string[] = []): Result {
  const script = SCRIPT_NAMES[number - 1];
  if (!script) throw new Error(`Unknown migration step: ${number}`);
  return run(root, process.execPath, [...nodeArgs, path.join(SKILL_SCRIPTS, script), ...args]);
}

async function fingerprint(
  root: string,
  excluded: ReadonlySet<string> = new Set(),
): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name);
      const relative = path.relative(root, file).replace(/\\/g, "/");
      if (excluded.has(relative)) continue;
      const stats = await lstat(file);
      hash.update(`${relative}\0${stats.mode}\0`);
      if (stats.isSymbolicLink()) {
        hash.update(`link\0${await readlink(file)}\0`);
      } else if (stats.isDirectory()) {
        hash.update("directory\0");
        await visit(file);
      } else {
        hash.update("file\0");
        hash.update(await readFile(file));
        hash.update("\0");
      }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

async function oldLink(root: string, relative: string, target: string, type: "dir" | "file") {
  const link = path.join(root, relative);
  await mkdir(path.dirname(link), { recursive: true });
  const destination = path.join(root, target);
  await symlink(path.relative(path.dirname(link), destination), link, type);
}

async function copyOldProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-e2e-"));
  temporary.push(root);
  await cp(FIXTURE, root, { recursive: true });
  await cp(
    CONVERTIBLE_CRITERIA,
    path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"),
  );
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rename(
    path.join(root, ".qfai/assistant/skill-local.input"),
    path.join(root, ".qfai/assistant/skills.local"),
  );
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(
    PACKAGE_ROOT,
    path.join(root, "node_modules/qfai"),
    process.platform === "win32" ? "junction" : "dir",
  );
  for (const dir of HOST_SKILL_DIRS) {
    const target =
      dir === ".github/skills"
        ? ".qfai/assistant/skill/qfai-sdd"
        : ".qfai/assistant/skills/qfai-sdd";
    await oldLink(root, `${dir}/qfai-sdd`, target, "dir");
  }
  for (const dir of HOST_AGENT_DIRS) {
    await oldLink(
      root,
      `${dir}/${agentName(dir)}`,
      ".qfai/assistant/agents/orchestrator.md",
      "file",
    );
  }
  const git = run(root, "git", ["init", "-q"]);
  if (git.status !== 0) throw new Error(`git init failed: ${git.stderr}`);
  return root;
}

async function cloneProject(source: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-copy-"));
  temporary.push(root);
  await cp(source, root, { recursive: true, verbatimSymlinks: true });
  return root;
}

async function textAt(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), "utf8");
}

function operations(report: string): string[] {
  const section = /^## Operations\r?\n([\s\S]*?)(?=\r?\n## |$)/.exec(report)?.[1] ?? "";
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && line !== "none");
}

function forAPerson(report: string): string[] {
  const section = /^## For a person\r?\n([\s\S]*?)(?=\r?\n## |$)/m.exec(report)?.[1] ?? "";
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && line !== "none");
}

async function applyPreparedResolution(root: string): Promise<void> {
  const resolution = JSON.parse(await readFile(RESOLUTION, "utf8")) as {
    contract: string;
    rule: string;
    example: string;
  };
  const target = path.join(root, ".qfai/spec/03_contract", resolution.contract);
  const parsed: unknown = parse(await readFile(target, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Prepared resolution cannot read ${resolution.contract}`);
  }
  const contract = parsed as Record<string, unknown>;
  const rules = contract["x-qfai-rules"];
  if (!Array.isArray(rules)) throw new Error("Migrated contract has no rules");
  const selected: unknown = rules.find(
    (entry: unknown) =>
      entry !== null && typeof entry === "object" && "id" in entry && entry.id === resolution.rule,
  );
  if (selected === null || typeof selected !== "object" || !("examples" in selected)) {
    throw new Error(`Migrated contract has no ${resolution.rule}`);
  }
  if (!Array.isArray(selected.examples)) throw new Error("Migrated rule has no examples");
  selected.examples.push(resolution.example);
  await writeFile(target, stringify(contract), "utf8");
}

/**
 * Step 7 leaves a retired pack's unplaced rules and examples in place and lists
 * them for a person. The guide has that person keep them until their content is
 * accounted for, and validation reports the old layout until the pack is gone.
 * Removing it only after each remaining file matches its archived copy models
 * that resolution without discarding anything.
 */
async function removeAccountedRetiredPack(root: string, id: string): Promise<void> {
  const pack = path.join(root, ".qfai/spec", id);
  const archive = path.join(root, ".qfai/evidence/migration-spec-to-story/retired", id);
  const remaining = await readdir(pack);
  if (remaining.length === 0) throw new Error(`${id} has no remaining file to account for`);
  for (const name of remaining) {
    const [left, archived] = await Promise.all([
      readFile(path.join(pack, name)),
      readFile(path.join(archive, name)),
    ]);
    if (!left.equals(archived)) throw new Error(`${id}/${name} differs from its archived copy`);
  }
  await rm(pack, { recursive: true });
}

async function noSpawnPreload(root: string, inspectFailure = false): Promise<string> {
  const file = path.join(root, "migration-preload.cjs");
  const fault = inspectFailure
    ? [
        'const fs = require("node:fs/promises");',
        "const originalLstat = fs.lstat;",
        "fs.lstat = async function (target, ...args) {",
        '  if (String(target).replace(/\\\\/g, "/").endsWith("/.claude/skills")) {',
        '    throw Object.assign(new Error("inspection refused"), { code: "EACCES" });',
        "  }",
        "  return originalLstat(target, ...args);",
        "};",
      ].join("\n")
    : "";
  await writeFile(
    file,
    [
      'const child = require("node:child_process");',
      'for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync"]) {',
      "  child[method] = () => { throw new Error(`Migration must not start ${method}`); };",
      "}",
      fault,
      'require("node:module").syncBuiltinESMExports();',
      "",
    ].join("\n"),
  );
  return file;
}

beforeAll(async () => {
  const root = await copyOldProject();
  let beforeLinks = "";
  const preview: Result[] = [];
  const applied: Result[] = [];
  const dryRunHashes: Array<[string, string]> = [];
  for (let number = 1; number <= 10; number += 1) {
    const before = await fingerprint(root);
    const dryRun = step(root, number, ["--dry-run"]);
    const after = await fingerprint(root);
    preview.push(dryRun);
    dryRunHashes.push([before, after]);
    if (dryRun.status === 2 || dryRun.status === null) {
      throw new Error(`Step ${number} dry run failed: ${dryRun.stderr}`);
    }
    const real = step(root, number);
    applied.push(real);
    if (real.status === 2 || real.status === null) {
      throw new Error(`Step ${number} failed: ${real.stderr}`);
    }
    if (number === 8) beforeLinks = await cloneProject(root);
  }
  const firstHash = await fingerprint(root);
  const remainingPacks = (await readdir(path.join(root, ".qfai/spec")))
    .filter((name) => /^spec-\d{4}$/.test(name))
    .sort();
  if (remainingPacks.join(",") !== "spec-0002") {
    throw new Error(`Expected only the retired pack before rerun: ${remainingPacks.join(",")}`);
  }
  for (let number = 1; number <= 10; number += 1) {
    const again = step(root, number);
    if (again.status === 2 || again.status === null) {
      throw new Error(`Step ${number} rerun failed: ${again.stderr}`);
    }
  }
  const secondHash = await fingerprint(root);
  await applyPreparedResolution(root);
  await removeAccountedRetiredPack(root, "spec-0002");
  const validation = run(root, process.execPath, [
    CLI,
    "validate",
    "--root",
    root,
    "--fail-on",
    "never",
  ]);
  if (validation.status !== 0) {
    throw new Error(`qfai validate did not finish: ${validation.stderr}\n${validation.stdout}`);
  }
  journey = {
    root,
    beforeLinks,
    preview,
    applied,
    dryRunHashes,
    firstHash,
    secondHash,
    validation,
  };
}, 300_000);

afterAll(async () => {
  for (const root of temporary) await removeTempTree(root);
});

let journey: Journey;

describe("spec-0018: one shipped-script migration journey", () => {
  it("previews every write and leaves a second pass byte-identical", async () => {
    expect(journey.dryRunHashes.every(([before, after]) => before === after)).toBe(true);
    expect(journey.preview.every((result) => result.stdout.includes("## Operations"))).toBe(true);
    expect(journey.applied.every((result) => result.status === 0 || result.status === 3)).toBe(
      true,
    );
    expect(journey.preview.map((result) => operations(result.stdout))).toEqual(
      journey.applied.map((result) => operations(result.stdout)),
    );
    expect(journey.secondHash).toBe(journey.firstHash);
    expect(await textAt(journey.root, "docs/notes.md")).toContain("unchanged during migration");
    expect(await textAt(journey.root, "src/index.ts")).toContain('projectOwned = "unchanged"');
  });

  it("moves owned directories and keeps the retired pack", async () => {
    expect(await textAt(journey.root, "qfai.config.yaml")).toContain("specsDir: .qfai/spec");
    expect(
      await textAt(
        journey.root,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0002/01_Spec.md",
      ),
    ).toContain("Status: superseded");
    expect(
      await textAt(journey.root, ".qfai/assistant/skill.local/order-review/SKILL.md"),
    ).toContain("receipt wording");
  });

  it("merges decisions and questions with their old origins", async () => {
    const decisions = await textAt(journey.root, ".qfai/spec/decisions.md");
    const questions = await textAt(journey.root, ".qfai/spec/open-questions.md");
    expect(decisions).toContain("spec-0002/01_Spec.md#spec-0002");
    expect(decisions).toContain("CR-0001.md#CR-0001");
    expect(questions).toContain("OQ-0001-0001");
  });

  it("merges policy and catalog facts and archives obsolete assistant directories", async () => {
    expect(await textAt(journey.root, ".qfai/spec/01_policy/objective.md")).toContain(
      "reliable receipt",
    );
    expect(await textAt(journey.root, ".qfai/spec/01_policy/initiative.md")).toContain(
      "first order flow",
    );
    await expect(
      lstat(path.join(journey.root, ".qfai/spec/01_policy/principle.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await textAt(
        journey.root,
        ".qfai/evidence/migration-spec-to-story/retired/_policies/11_Slice-Policy.md",
      ),
    ).toContain("one source for each order decision");
    expect(
      await textAt(
        journey.root,
        ".qfai/evidence/migration-spec-to-story/retired/assistant/process/review.md",
      ),
    ).toContain("Review Process");
  });

  it("uses the plan and ID map to build one flow with its old diagram", async () => {
    const map = await textAt(journey.root, ".qfai/evidence/migration-spec-to-story/id-map.json");
    const flow = await textAt(
      journey.root,
      ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md",
    );
    expect(map).toContain('"US-0001-0001": "US-0001-0001"');
    expect(flow).toContain("Start --> PlaceOrder --> Receipt");
    expect(
      await textAt(
        journey.root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
      ),
    ).toContain("Place an order");
  });

  it("keeps a case without an EX as a new example", async () => {
    const report = journey.applied[4]?.stdout ?? "";
    const examples = await textAt(
      journey.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
    );
    expect(report).toContain("## Cases to examples");
    expect(report).toContain("TC-0001-0003");
    expect(examples).toContain("Submit the same valid order twice");
    expect(examples).toContain("AC-0001-0001-01");
  });

  it("places each rule in the selected contract with its example", async () => {
    const api = await textAt(journey.root, ".qfai/spec/03_contract/api/order.yaml");
    const db = await textAt(journey.root, ".qfai/spec/03_contract/db/orders.sql");
    const design = await textAt(journey.root, ".qfai/spec/03_contract/design/order.md");
    expect(api).toContain("BR-0001");
    expect(api).toContain("EX-0001-0001-01");
    expect(db).toContain("BR-0002");
    expect(design).toContain("BR-0003");
  });

  it("rewrites mapped annotations while reporting an integration US and contract annotation", async () => {
    const e2e = await textAt(journey.root, "tests/e2e/order.test.ts");
    const integration = await textAt(journey.root, "tests/integration/order.test.ts");
    const report = journey.applied[7]?.stdout ?? "";
    expect(e2e).toContain(["QFAI", "BF-0001"].join(":"));
    expect(e2e).toContain(["QFAI", "EX-0001-0001-01"].join(":"));
    expect(integration).toContain(["QFAI", "EX-0001-0001-03"].join(":"));
    expect(integration).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(report).toContain("QFAI:CON-API-0001");
    expect(report).toContain("QFAI:SPEC-0001:US-0001-0001");
  });

  it("repoints the six host links and keeps decision evidence trackable", async () => {
    for (const dir of HOST_SKILL_DIRS) {
      expect(
        (await readlink(path.join(journey.root, dir, "qfai-sdd"))).replace(/\\/g, "/"),
      ).toContain("assistant/skill/qfai-sdd");
    }
    for (const dir of HOST_AGENT_DIRS) {
      expect(
        (await readlink(path.join(journey.root, dir, agentName(dir)))).replace(/\\/g, "/"),
      ).toContain("assistant/agent/orchestrator.md");
    }
    const ignore = await textAt(journey.root, ".gitignore");
    expect(ignore).toContain("# Local notes stay ignored.\nscratch/\n");
    expect(ignore).toContain("!.qfai/evidence/decision/");
    const expected = await cloneProject(journey.beforeLinks);
    await ensureRootGitignoreEntries(expected, false, () => {});
    expect(ignore).toBe(await textAt(expected, ".gitignore"));
    const record = ".qfai/evidence/decision/receipt.json";
    await mkdir(path.dirname(path.join(journey.root, record)), { recursive: true });
    await writeFile(path.join(journey.root, record), "{}\n");
    expect(run(journey.root, "git", ["check-ignore", "--quiet", record]).status).toBe(1);
  });

  it("limits link repair to managed wrappers and refuses an inspection failure", async () => {
    const normal = await cloneProject(journey.beforeLinks);
    const noSpawn = await noSpawnPreload(normal);
    const before = await fingerprint(normal, HOST_WRAPPERS);
    const repaired = step(normal, 9, [], ["--require", noSpawn]);
    // Every other shipped roster path is absent here. Step 9 repoints the
    // links it finds and leaves an absent path absent: nothing to report.
    expect(repaired.status, repaired.stderr).toBe(0);
    expect(forAPerson(repaired.stdout)).toEqual([]);
    expect(await fingerprint(normal, HOST_WRAPPERS)).toBe(before);
    for (const dir of HOST_SKILL_DIRS) {
      expect((await readlink(path.join(normal, dir, "qfai-sdd"))).replace(/\\/g, "/")).toContain(
        "assistant/skill/qfai-sdd",
      );
    }

    const occupied = await cloneProject(journey.beforeLinks);
    const occupiedPath = path.join(occupied, ".claude/skills/qfai-sdd");
    await unlink(occupiedPath);
    await writeFile(occupiedPath, "project-owned wrapper\n");
    const occupiedPreload = await noSpawnPreload(occupied);
    const declined = step(occupied, 9, [], ["--require", occupiedPreload]);
    expect(declined.status, declined.stderr).toBe(3);
    expect(declined.stdout).toContain("## For a person");
    expect(declined.stdout).toContain(".claude/skills/qfai-sdd");
    expect(await readFile(occupiedPath, "utf8")).toBe("project-owned wrapper\n");

    const unreadable = await cloneProject(journey.beforeLinks);
    const failingPreload = await noSpawnPreload(unreadable, true);
    const untouched = await fingerprint(unreadable);
    const refused = step(unreadable, 9, [], ["--require", failingPreload]);
    expect(refused.status).toBe(2);
    expect(refused.stderr).toMatch(/inspect|refus/i);
    expect(await fingerprint(unreadable)).toBe(untouched);
  });

  it("reports test obligations after a complete validation, with no layout or chain error", async () => {
    const raw = await textAt(journey.root, ".qfai/report/validate.json");
    const result = JSON.parse(raw) as {
      issues: Array<{ code: string; severity: string; refs?: string[] }>;
    };
    const structural = result.issues.filter(
      (issue) => /^QFAI-STORY-00[1-5]$/.test(issue.code) && issue.severity === "error",
    );
    expect(structural).toEqual([]);
    const uncovered = result.issues
      .filter((issue) => issue.code === "QFAI-STORY-006")
      .flatMap((issue) => issue.refs ?? [])
      .sort();
    // EX-0001-0001-01 is annotated only in an E2E test, which does not satisfy an
    // EX obligation.
    expect(uncovered).toEqual([
      "AC-0001-0001-01",
      "AC-0001-0001-02",
      "EX-0001-0001-01",
      "EX-0001-0001-02",
    ]);
  });
});

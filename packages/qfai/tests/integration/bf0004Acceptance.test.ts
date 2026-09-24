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
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = path.resolve(__dirname, "../..");
const fixtureRoot = path.join(packageRoot, "tests/fixtures/migration-spec-to-story/old-layout");
const completeRoot = path.join(packageRoot, "tests/fixtures/bf0004MigrationCutover");
const scriptRoot = path.join(
  packageRoot,
  "assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/scripts",
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
const temporary: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string };
type Journey = {
  root: string;
  dry: Result[];
  applied: Result[];
  dryUnchanged: boolean[];
  rerunUnchanged: boolean;
  map: { ids: Record<string, Record<string, string>> };
};

function run(root: string, command: string, args: string[]): Result {
  const child = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 30_000 });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function step(root: string, number: number, args: string[] = []): Result {
  const name = scriptNames[number - 1];
  if (!name) throw new Error("Unknown migration step " + number);
  return run(root, process.execPath, [path.join(scriptRoot, name), ...args]);
}

function section(report: string, name: string): string[] {
  const heading = "## " + name;
  const start = report.indexOf(heading + "\n");
  if (start < 0) return [];
  const body = report.slice(start + heading.length + 1).split(/\r?\n## /, 1)[0] ?? "";
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && line !== "none");
}

async function fingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name);
      const relative = path.relative(root, file).replace(/\\/g, "/");
      const stats = await lstat(file);
      hash.update(relative + "\0" + stats.mode + "\0");
      if (stats.isSymbolicLink()) {
        hash.update("link\0" + (await readlink(file)) + "\0");
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

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf4-ac-"));
  temporary.push(root);
  await cp(fixtureRoot, root, { recursive: true });
  await rm(path.join(root, ".qfai/specs/spec-0002"), { recursive: true });
  for (const [oldName, newName] of [
    ["constitution", "rule"],
    ["skills", "skill"],
    ["agents", "agent"],
    ["prompts", "prompt"],
  ] as const) {
    await rm(path.join(root, ".qfai/assistant", oldName), { recursive: true });
    await cp(
      path.join(packageRoot, "assets/init/.qfai/assistant", newName),
      path.join(root, ".qfai/assistant", newName),
      { recursive: true, force: true },
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
    await cp(path.join(completeRoot, source), path.join(root, target));
  }
  const integration = path.join(root, "tests/integration/order.test.ts");
  await cp(path.join(completeRoot, "order.integration.test.ts"), integration);
  await writeFile(integration, (await readFile(integration, "utf8")).replaceAll("QFAI~", "QFAI:"));
  await cp(
    path.join(completeRoot, "order.e2e.test.ts"),
    path.join(root, "tests/e2e/order.test.ts"),
  );
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rm(path.join(root, ".qfai/assistant/skills.local"), { recursive: true });
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
  if (initialized.status !== 0) throw new Error("git init: " + initialized.stderr);
  return root;
}

let journey: Journey;
beforeAll(async () => {
  const root = await project();
  const dry: Result[] = [];
  const applied: Result[] = [];
  const dryUnchanged: boolean[] = [];
  for (let number = 1; number <= 10; number += 1) {
    const before = await fingerprint(root);
    const preview = step(root, number, ["--dry-run"]);
    if (preview.status !== 0 || section(preview.stdout, "For a person").length > 0) {
      throw new Error("Dry step " + number + ": " + preview.stderr + preview.stdout);
    }
    dry.push(preview);
    dryUnchanged.push((await fingerprint(root)) === before);
    const real = step(root, number);
    if (real.status !== 0 || section(real.stdout, "For a person").length > 0) {
      throw new Error("Step " + number + ": " + real.stderr + real.stdout);
    }
    applied.push(real);
  }
  const beforeRerun = await fingerprint(root);
  for (let number = 1; number <= 10; number += 1) {
    const again = step(root, number);
    if (again.status !== 0) throw new Error("Rerun step " + number + ": " + again.stderr);
  }
  journey = {
    root,
    dry,
    applied,
    dryUnchanged,
    rerunUnchanged: (await fingerprint(root)) === beforeRerun,
    map: JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"],
  };
}, 420_000);

afterAll(async () => {
  for (const root of temporary) await removeTempTree(root);
});

describe("BF-0004 acceptance criteria", () => {
  // QFAI:AC-0004-0002-01
  it("reports one old-layout error under each validation profile", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf4-layout-"));
    temporary.push(root);
    await mkdir(path.join(root, ".qfai/spec/spec-0001"), { recursive: true });
    const config = structuredClone(defaultConfig);
    config.paths.specsDir = ".qfai/spec";
    config.paths.contractsDir = ".qfai/spec/03_contract";
    for (const profile of ["sdd", "atdd", "tdd", "verify", "full"] as const) {
      const result = await validateProject(
        root,
        { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
        { profile },
      );
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
      expect(result.issues[0]?.message).toContain(path.join(root, ".qfai/spec"));
      expect(result.issues[0]?.message).toContain("/qfai-migration-spec-to-story");
    }
  });

  // QFAI:AC-0004-0003-01
  it("rejects an invalid step argument without changing the project", async () => {
    const root = await project();
    const before = await fingerprint(root);
    const result = step(root, 1, ["--unknown"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/unknown|argument|usage/i);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0003-02
  it("refuses a dependent step before its input exists", async () => {
    const root = await project();
    const before = await fingerprint(root);
    const result = step(root, 5);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/step|prerequisite|missing/i);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0003-03
  it("previews the ordered operations without changing files", () => {
    expect(journey.dryUnchanged).toEqual(Array(10).fill(true));
    expect(journey.dry.map((result) => section(result.stdout, "Operations"))).toEqual(
      journey.applied.map((result) => section(result.stdout, "Operations")),
    );
  });

  // QFAI:AC-0004-0003-04
  it("repeats the complete migration without changing a file", () => {
    expect(journey.rerunUnchanged).toBe(true);
  });

  // QFAI:AC-0004-0003-06
  it("prints a Markdown report with no person action on completed steps", () => {
    expect(journey.applied).toHaveLength(10);
    for (const result of journey.applied) {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("## Operations");
      expect(section(result.stdout, "For a person")).toEqual([]);
    }
  });

  // QFAI:AC-0004-0003-07
  it("removes consumed old packs and keeps the retired rule source", async () => {
    await expect(lstat(path.join(journey.root, ".qfai/specs"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const archived = await readFile(
      path.join(
        journey.root,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/04_Business-Rules.md",
      ),
      "utf8",
    );
    expect(archived).toContain("A valid order receives a receipt.");
  });

  // QFAI:AC-0004-0004-01
  it("moves the configured spec and contract roots", async () => {
    const config = await readFile(path.join(journey.root, "qfai.config.yaml"), "utf8");
    expect(config).toContain("specsDir: .qfai/spec");
    expect(config).toContain("contractsDir: .qfai/spec/03_contract");
    expect(await lstat(path.join(journey.root, ".qfai/spec/03_contract/api"))).toBeDefined();
  });

  // QFAI:AC-0004-0004-02
  it("preserves the project-owned skill overlay under its singular name", async () => {
    expect(
      await readFile(
        path.join(journey.root, ".qfai/assistant/skill.local/order-review/SKILL.md"),
        "utf8",
      ),
    ).toContain("receipt wording");
    await expect(
      lstat(path.join(journey.root, ".qfai/assistant/skills.local")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // QFAI:AC-0004-0005-01
  it("merges old decisions with a new ID and a link to the old record", async () => {
    const decisions = await readFile(path.join(journey.root, ".qfai/spec/decisions.md"), "utf8");
    expect(decisions).toMatch(/\| DEC-\d{4} \|[^|]*CR-0001\.md#CR-0001/);
    expect(decisions).toMatch(/\| DEC-\d{4} \|[^|]*\| (?:DONE|TODO|DEFERRED) \|/);
  });

  // QFAI:AC-0004-0005-02
  it("moves old open questions into the shared question ledger", async () => {
    const questions = await readFile(
      path.join(journey.root, ".qfai/spec/open-questions.md"),
      "utf8",
    );
    expect(questions).toContain("OQ-0001-0001");
    expect(questions).toMatch(/\| OQ-\d{4} \|/);
  });

  // QFAI:AC-0004-0006-01
  it("moves policy facts once and archives the retired slice policy", async () => {
    expect(
      await readFile(path.join(journey.root, ".qfai/spec/01_policy/objective.md"), "utf8"),
    ).toContain("reliable receipt");
    const principle = await readFile(
      path.join(journey.root, ".qfai/spec/01_policy/principle.md"),
      "utf8",
    );
    expect(principle).toContain("one source for each order decision");
    const archived = await readFile(
      path.join(
        journey.root,
        ".qfai/evidence/migration-spec-to-story/retired/_policies/11_Slice-Policy.md",
      ),
      "utf8",
    );
    expect(archived).toContain("Slice");
    expect(principle).not.toContain(archived);
  });

  // QFAI:AC-0004-0007-01
  it("records new story, criterion and example IDs in the flow tree and ID map", async () => {
    const ids = journey.map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const flow = path.join(journey.root, ".qfai/spec/02_business-flow/business-flow-0001");
    expect(await readFile(path.join(flow, "business-flow.md"), "utf8")).toContain("BF-0001");
    expect(await readFile(path.join(flow, "user-stories.md"), "utf8")).toContain("US-0001-0001");
    const story = path.join(flow, "user-story-0001-0001");
    expect(await readFile(path.join(story, "01_User-story.md"), "utf8")).toContain(
      ids["US-0001-0001"],
    );
    expect(await readFile(path.join(story, "02_Acceptance-Criteria.md"), "utf8")).toContain(
      ids["AC-0001-0001"],
    );
    expect(await readFile(path.join(story, "03_Example.md"), "utf8")).toContain(
      ids["EX-0001-0001"],
    );
  });

  // QFAI:AC-0004-0008-01
  it("turns a case with no example into a mapped example", async () => {
    const ids = journey.map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const example = await readFile(
      path.join(
        journey.root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
      ),
      "utf8",
    );
    expect(example).toContain(ids["TC-0001-0003"]);
    expect(journey.applied[4]?.stdout).toContain("TC-0001-0003");
  });

  // QFAI:AC-0004-0010-01
  it("rewrites test-case and E2E story annotations to mapped IDs", async () => {
    const ids = journey.map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const integration = await readFile(
      path.join(journey.root, "tests/integration/order.test.ts"),
      "utf8",
    );
    const e2e = await readFile(path.join(journey.root, "tests/e2e/order.test.ts"), "utf8");
    expect(integration).toContain("QFAI:" + ids["TC-0001-0003"]);
    expect(e2e).toContain(["QFAI", "BF-0001"].join(":"));
  });

  // QFAI:AC-0004-0009-01
  it("places three rules in their selected API, DB and design contracts", async () => {
    const api = await readFile(
      path.join(journey.root, ".qfai/spec/03_contract/api/order.yaml"),
      "utf8",
    );
    const db = await readFile(
      path.join(journey.root, ".qfai/spec/03_contract/db/orders.sql"),
      "utf8",
    );
    const design = await readFile(
      path.join(journey.root, ".qfai/spec/03_contract/design/order.md"),
      "utf8",
    );
    expect(api).toContain("BR-0001");
    expect(api).toContain("EX-0001-0001-01");
    expect(db).toContain("BR-0002");
    expect(design).toContain("BR-0003");
  });

  // QFAI:AC-0004-0010-02
  it("keeps unrelated annotations and reports them for review", async () => {
    const integration = await readFile(
      path.join(journey.root, "tests/integration/order.test.ts"),
      "utf8",
    );
    const report = journey.applied[7]?.stdout ?? "";
    expect(integration).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(report).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(report).toContain("QFAI:CON-API-0001");
  });

  // QFAI:AC-0004-0011-01
  it("repoints each managed host skill wrapper to the singular directory", async () => {
    for (const host of [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"]) {
      const link = path.join(journey.root, host, "qfai-sdd");
      expect((await readlink(link)).replace(/\\/g, "/")).toContain("assistant/skill/qfai-sdd");
    }
  });

  // QFAI:AC-0004-0011-02
  it("keeps decision evidence visible to Git after the ignore update", async () => {
    const ignore = await readFile(path.join(journey.root, ".gitignore"), "utf8");
    expect(ignore).toContain("!.qfai/evidence/decision/");
    const record = ".qfai/evidence/decision/bf4-acceptance.json";
    await mkdir(path.dirname(path.join(journey.root, record)), { recursive: true });
    await writeFile(path.join(journey.root, record), "{}\n");
    expect(run(journey.root, "git", ["check-ignore", "--quiet", record]).status).toBe(1);
  });

  // QFAI:AC-0004-0012-02
  it("leaves no story or contract migration error in the migrated fixture", async () => {
    const result = await validateProject(journey.root);
    expect(
      result.issues.filter(
        (issue) =>
          issue.severity === "error" &&
          /^(QFAI-LAYOUT-|QFAI-STORY-|QFAI-CONTRACT-|QFAI-SPACK-|QFAI-FLOW-)/.test(issue.code),
      ),
    ).toEqual([]);
  });

  // QFAI:AC-0004-0012-03
  it("ships a guide that explains the 2.0.0 cutover and the pinned 1.x alternative", async () => {
    const guide = await readFile(
      path.join(
        packageRoot,
        "assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/references/migration-guide.md",
      ),
      "utf8",
    );
    expect(guide).toContain("2.0.0");
    expect(guide).toMatch(/2\.x[\s\S]*spec.pack/i);
    expect(guide).toMatch(/pinned 1\.x/i);
  });

  // QFAI:AC-0004-0001-01
  it("installs the migration skill and host links in a fresh project", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf4-init-"));
    temporary.push(root);
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const legacyRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-bf4-old-init-"));
    temporary.push(legacyRoot);
    await mkdir(path.join(legacyRoot, ".qfai/specs/spec-0001"), { recursive: true });
    await runInit({ dir: legacyRoot, force: false, dryRun: false, yes: true });
    for (const target of [root, legacyRoot]) {
      const skill = path.join(target, ".qfai/assistant/skill/qfai-migration-spec-to-story");
      expect(await readFile(path.join(skill, "SKILL.md"), "utf8")).toContain(
        "qfai-migration-spec-to-story",
      );
      expect((await readdir(path.join(skill, "scripts"))).length).toBe(10);
      for (const host of [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"]) {
        const link = path.join(target, host, "qfai-migration-spec-to-story");
        expect((await readlink(link)).replace(/\\/g, "/")).toContain(
          "assistant/skill/qfai-migration-spec-to-story",
        );
      }
    }
    expect(await lstat(path.join(legacyRoot, ".qfai/specs/spec-0001"))).toBeDefined();
  });
});

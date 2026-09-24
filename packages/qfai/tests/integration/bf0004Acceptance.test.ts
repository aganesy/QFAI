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
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { ensureRootGitignoreEntries, runInit } from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
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
const changedPathPatterns: readonly (readonly RegExp[])[] = [
  [
    /^\.qfai\/(?:specs|contracts)\//,
    /^\.qfai\/spec\/(?:_policies|spec-\d{4}|03_contract)\//,
    /^\.qfai\/(?:prototypes|prototype)\//,
    /^\.qfai\/assistant\/(?:skills(?:\.local)?|skill(?:\.local)?|agents|agent|prompts|prompt)\//,
    /^\.qfai\/evidence\/(?:decisions|decision)\//,
    /^\.qfai\/steering\/_templates?\//,
    /^\.qfai\/report\/specs?-coverage\//,
    /^\.qfai\/evidence\/migration-spec-to-story\/legacy\/(?:specs|contracts)\//,
    /^qfai\.config\.yaml$/,
  ],
  [
    /^\.qfai\/spec\/(?:decisions|open-questions)\.md$/,
    /^\.qfai\/spec\/(?:spec-\d{4}\/(?:07_Decisions|08_Open-questions|09_delta)|_policies\/(?:08_Decisions|09_Open-questions|10_delta))\.md$/,
    /^\.qfai\/decisions\//,
    /^\.qfai\/evidence\/migration-spec-to-story\/retired\/(?:spec-\d{4}|_policies|decisions)\//,
  ],
  [
    /^\.qfai\/spec\/(?:_policies|01_policy|03_contract)\//,
    /^\.qfai\/assistant\/(?:constitution|catalog|manifest|process|rule)\//,
    /^\.qfai\/evidence\/migration-spec-to-story\/retired\/(?:_policies|assistant)\//,
    /^qfai\.config\.yaml$/,
  ],
  [
    /^\.qfai\/spec\/(?:02_business-flow|spec-\d{4}|_policies|03_contract)\//,
    /^\.qfai\/evidence\/migration-spec-to-story\/(?:id-map\.json|retired\/)/,
    /^\.qfai\/worklog\//,
  ],
  [/^\.qfai\/spec\/02_business-flow\/business-flow-\d{4}\/user-story-\d{4}-\d{4}\/03_Example\.md$/],
  [
    /^\.qfai\/spec\/02_business-flow\/business-flow-\d{4}\/user-story-\d{4}-\d{4}\/02_Acceptance-Criteria\.md$/,
  ],
  [
    /^\.qfai\/spec\/(?:spec-\d{4}\/(?:01_Spec|04_Business-Rules)\.md|03_contract\/)/,
    /^\.qfai\/evidence\/migration-spec-to-story\/retired\/spec-\d{4}\/(?:01_Spec|04_Business-Rules)\.md$/,
  ],
  [/^tests\//],
  [/^\.(?:claude|agents|codex|github)\/(?:skills|agents)(?:\/|$)/],
  [/^\.gitignore$/, /^\.qfai\/report\/\.gitignore-[1-9]\d*-[0-9a-f-]+\.tmp(?:\.owner)?$/],
];
const temporary: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string };
type Journey = {
  root: string;
  dry: Result[];
  applied: Result[];
  dryUnchanged: boolean[];
  rerunUnchanged: boolean;
  changedPaths: string[][];
  operationPaths: string[][];
  map: { ids: Record<string, Record<string, string>> };
  afterStep7DirectoriesRemoved: boolean;
  idMapUnchangedOnRerun: boolean;
};

function run(root: string, command: string, args: string[]): Result {
  const child = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 30_000 });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function step(root: string, number: number, args: string[] = [], nodeArgs: string[] = []): Result {
  const name = scriptNames[number - 1];
  if (!name) throw new Error("Unknown migration step " + number);
  return run(root, process.execPath, [...nodeArgs, path.join(scriptRoot, name), ...args]);
}

function prepareThrough(root: string, last: number): void {
  for (let number = 1; number <= last; number += 1) {
    const result = step(root, number);
    if (result.status !== 0) {
      throw new Error("Prepare step " + number + ": " + result.stderr + result.stdout);
    }
  }
}

function prepareAllowingPerson(root: string, last: number): Result[] {
  const results: Result[] = [];
  for (let number = 1; number <= last; number += 1) {
    const result = step(root, number);
    if (result.status !== 0 && result.status !== 3) {
      throw new Error("Prepare step " + number + ": " + result.stderr + result.stdout);
    }
    results.push(result);
  }
  return results;
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

function pathsNamedByOperations(
  report: string,
  before: Map<string, string>,
  after: Map<string, string>,
): string[] {
  const snapshotPaths = [...new Set([...before.keys(), ...after.keys()])];
  const names = section(report, "Operations").flatMap((line) => {
    const description = line.replace(/^- /, "");
    if (description.endsWith(": remove empty directory")) return [];
    const pathText = description.split(": ")[0] ?? "";
    return pathText.split(" → ").flatMap((mentioned) => {
      const descendants = snapshotPaths.filter((name) => name.startsWith(`${mentioned}/`));
      return snapshotPaths.includes(mentioned) || descendants.length === 0
        ? [mentioned]
        : descendants;
    });
  });
  return [...new Set(names)].sort();
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

async function fileSnapshot(root: string): Promise<Map<string, string>> {
  const entries = new Map<string, string>();
  async function visit(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name);
      const relative = path.relative(root, file).replace(/\\/g, "/");
      const stats = await lstat(file);
      if (stats.isSymbolicLink()) {
        entries.set(relative, "link:" + (await readlink(file)));
      } else if (stats.isDirectory()) {
        await visit(file);
      } else {
        entries.set(
          relative,
          createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        );
      }
    }
  }
  await visit(root);
  return entries;
}

async function networkGuard(root: string): Promise<string> {
  const file = path.join(root, "migration-network-guard.cjs");
  await writeFile(
    file,
    [
      'const net = require("node:net");',
      'const http = require("node:http");',
      'const https = require("node:https");',
      'const dns = require("node:dns");',
      'const refuse = () => { throw new Error("migration opened a network connection"); };',
      "net.connect = refuse;",
      "net.createConnection = refuse;",
      "http.request = refuse;",
      "http.get = refuse;",
      "https.request = refuse;",
      "https.get = refuse;",
      "dns.lookup = refuse;",
      "globalThis.fetch = refuse;",
      'require("node:module").syncBuiltinESMExports();',
      "",
    ].join("\n"),
  );
  return file;
}

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf4-ac-"));
  temporary.push(root);
  await cp(fixtureRoot, root, { recursive: true });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "docs/notes.md"), "Project notes stay here.\n");
  await writeFile(path.join(root, "src/index.ts"), "export const original = true;\n");
  await writeFile(path.join(root, ".qfai/specs/spec-0001/10_Plan.md"), "# Original plan\n");
  await writeFile(
    path.join(root, ".qfai/specs/spec-0001/16_Traceability-ledger.md"),
    "# Original trace\n",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0001/tdd"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/specs/spec-0001/tdd/test-list.md"),
    "# Original test list\n",
  );
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
  await writeFile(
    integration,
    `${await readFile(integration, "utf8")}\nconst unchangedLine = true;\n`,
  );
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
  const preload = await networkGuard(root);
  const dry: Result[] = [];
  const applied: Result[] = [];
  const dryUnchanged: boolean[] = [];
  const changedPaths: string[][] = [];
  const operationPaths: string[][] = [];
  let afterStep7DirectoriesRemoved = false;
  for (let number = 1; number <= 10; number += 1) {
    const before = await fingerprint(root);
    const preview = step(root, number, ["--dry-run"], ["--require", preload]);
    if (preview.status !== 0 || section(preview.stdout, "For a person").length > 0) {
      throw new Error("Dry step " + number + ": " + preview.stderr + preview.stdout);
    }
    dry.push(preview);
    dryUnchanged.push((await fingerprint(root)) === before);
    const beforeFiles = await fileSnapshot(root);
    const real = step(root, number, [], ["--require", preload]);
    if (real.status !== 0 || section(real.stdout, "For a person").length > 0) {
      throw new Error("Step " + number + ": " + real.stderr + real.stdout);
    }
    applied.push(real);
    const afterFiles = await fileSnapshot(root);
    operationPaths.push(pathsNamedByOperations(real.stdout, beforeFiles, afterFiles));
    changedPaths.push(
      [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])]
        .filter((name) => beforeFiles.get(name) !== afterFiles.get(name))
        .sort(),
    );
    if (number === 7) {
      afterStep7DirectoriesRemoved = await Promise.all(
        [path.join(root, ".qfai/spec/spec-0001"), path.join(root, ".qfai/spec/_policies")].map(
          async (directory) => {
            try {
              await lstat(directory);
              return false;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
              throw error;
            }
          },
        ),
      ).then((results) => results.every(Boolean));
    }
  }
  const beforeRerun = await fingerprint(root);
  const mapBeforeRerun = await readFile(
    path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
  );
  for (let number = 1; number <= 10; number += 1) {
    const again = step(root, number, [], ["--require", preload]);
    if (again.status !== 0) throw new Error("Rerun step " + number + ": " + again.stderr);
  }
  journey = {
    root,
    dry,
    applied,
    dryUnchanged,
    rerunUnchanged: (await fingerprint(root)) === beforeRerun,
    changedPaths,
    operationPaths,
    afterStep7DirectoriesRemoved,
    idMapUnchangedOnRerun: (
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"))
    ).equals(mapBeforeRerun),
    map: JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"],
  };
}, 420_000);

afterAll(async () => {
  for (const root of temporary) await removeTempTree(root);
});

describe("BF-0004 acceptance criteria", () => {
  // QFAI:AC-0004-0001-02
  it("delegates link and gitignore writes to the init writers", async () => {
    const source = path.join(packageRoot, "src/migration/specToStory");
    const links = await readFile(path.join(source, "step09RepointLinks.ts"), "utf8");
    const ignore = await readFile(path.join(source, "step10UpdateGitignore.ts"), "utf8");
    expect(links).toContain(
      'import { repairIntegrationWrappers } from "../../cli/commands/init.js"',
    );
    expect(links).toContain("await repairIntegrationWrappers(");
    expect(ignore).toContain(
      'import { ensureRootGitignoreEntries } from "../../cli/commands/init.js"',
    );
    expect(ignore).toContain("await ensureRootGitignoreEntries(context.root, false");
    expect(links).not.toMatch(/\b(?:symlink|unlink|rm|writeFile)\s*\(/);
    expect(ignore).not.toMatch(/\b(?:writeFile|appendFile|rename)\s*\(/);
  });

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

  it("rejects each malformed migration plan before an ID map or tree write", async () => {
    // QFAI:EX-0004-0003-05
    const root = await project();
    prepareThrough(root, 3);
    const plan = path.join(root, ".qfai/evidence/migration-spec-to-story/plan.yaml");
    const valid = await readFile(plan, "utf8");
    const oldFlow = path.join(root, ".qfai/spec/_policies/04_Business-Flow.md");
    const oldFlowContent = await readFile(oldFlow, "utf8");
    const invalid: Array<{
      name: string;
      content: string;
      expected?: string;
      duplicateHeading?: boolean;
    }> = [
      { name: "unclosed YAML", content: "flows: [\nrules: []\n", expected: "flows: [" },
      { name: "unknown field", content: `${valid}unexpected: true\n`, expected: "unexpected" },
      { name: "duplicate YAML key", content: `${valid}rules: []\n`, expected: "rules" },
      {
        name: "duplicate story",
        content:
          "flows:\n  - title: F1\n    stories:\n      - id: US-0001-0001\n      - id: US-0001-0001\nrules: []\n",
        expected: "US-0001-0001",
      },
      {
        name: "duplicate criterion",
        content:
          "flows:\n  - title: F1\n    stories:\n      - id: US-0001-0001\n        criteria: [AC-0001-0001, AC-0001-0001]\nrules: []\n",
        expected: "AC-0001-0001",
      },
      {
        name: "duplicate rule",
        content: `${valid}  - id: BR-0001-0001\n    contract: api/order.yaml\n`,
        expected: "BR-0001-0001",
      },
      {
        name: "unknown story",
        content: "flows:\n  - title: F1\n    stories:\n      - id: US-9999-0001\nrules: []\n",
        expected: "US-9999-0001",
      },
      {
        name: "wrong-pack criterion",
        content:
          "flows:\n  - title: F1\n    stories:\n      - id: US-0001-0001\n        criteria: [AC-0002-0001]\nrules: []\n",
        expected: "AC-0002-0001",
      },
      {
        name: "unknown rule",
        content: `${valid}  - id: BR-9999-0001\n    contract: api/order.yaml\n`,
        expected: "BR-9999-0001",
      },
      {
        name: "missing flow selector",
        content:
          "flows:\n  - title: F1\n    from: 'CHG-9999: Missing'\n    stories:\n      - id: US-0001-0001\nrules: []\n",
        expected: "CHG-9999: Missing",
      },
      {
        name: "repeated flow selector",
        content: valid,
        duplicateHeading: true,
        expected: "CHG-0001: Order flow",
      },
      {
        name: "absolute contract",
        content: valid.replace("contract: api/order.yaml", "contract: /tmp/orders.yaml"),
        expected: "/tmp/orders.yaml",
      },
      {
        name: "traversing contract",
        content: valid.replace("contract: api/order.yaml", "contract: ../orders.yaml"),
        expected: "../orders.yaml",
      },
    ];
    for (const scenario of invalid) {
      await writeFile(plan, scenario.content);
      await writeFile(
        oldFlow,
        scenario.duplicateHeading
          ? `${oldFlowContent}\n## CHG-0001: Order flow\n\nDuplicate.\n`
          : oldFlowContent,
      );
      const before = await fingerprint(root);
      const result = step(root, 4);
      expect(result.status, scenario.name).toBe(2);
      expect(result.stderr, scenario.name).toContain("plan.yaml");
      if (scenario.expected) expect(result.stderr, scenario.name).toContain(scenario.expected);
      expect(await fingerprint(root), scenario.name).toBe(before);
      await expect(
        lstat(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
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
  // QFAI:EX-0004-0003-10
  // QFAI:EX-0004-0003-11
  it("previews the ordered operations without changing files", () => {
    expect(journey.dryUnchanged).toEqual(Array(10).fill(true));
    expect(journey.dry.map((result) => section(result.stdout, "Operations"))).toEqual(
      journey.applied.map((result) => section(result.stdout, "Operations")),
    );
    expect(journey.operationPaths).toEqual(journey.changedPaths);
  });

  // QFAI:AC-0004-0003-04
  // QFAI:EX-0004-0003-12
  // QFAI:EX-0004-0007-06
  it("repeats the complete migration without changing a file", () => {
    expect(journey.rerunUnchanged).toBe(true);
    expect(journey.idMapUnchangedOnRerun).toBe(true);
  });

  it("completes step 1 after half of the old spec entries were already moved", async () => {
    // QFAI:EX-0004-0003-13
    const uninterrupted = await project();
    const partial = await project();
    const source = path.join(partial, ".qfai/specs");
    const destination = path.join(partial, ".qfai/spec");
    expect((await readdir(source)).sort()).toEqual(["_policies", "spec-0001"]);
    await mkdir(destination, { recursive: true });
    await rename(path.join(source, "_policies"), path.join(destination, "_policies"));
    expect((await readdir(source)).sort()).toEqual(["spec-0001"]);
    expect((await readdir(destination)).sort()).toEqual(["_policies"]);
    expect(step(uninterrupted, 1).status).toBe(0);
    expect(step(partial, 1).status).toBe(0);
    expect(await fingerprint(partial)).toBe(await fingerprint(uninterrupted));
  });

  it("reports an empty step 1 rerun and creates only moved files without optional directories", async () => {
    // QFAI:EX-0004-0003-18
    const root = await project();
    await rm(path.join(root, ".qfai/assistant/skills.local"), { recursive: true });
    await expect(lstat(path.join(root, ".qfai/prototypes"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const before = await fileSnapshot(root);
    const result = step(root, 1);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^## Operations\n- /);
    const after = await fileSnapshot(root);
    const added = [...after.keys()].filter((name) => !before.has(name));
    expect(added.length).toBeGreaterThan(0);
    for (const name of added) {
      const oldName = name.startsWith(".qfai/spec/03_contract/")
        ? name.replace(".qfai/spec/03_contract/", ".qfai/contracts/")
        : name.replace(".qfai/spec/", ".qfai/specs/");
      expect(before.get(oldName), name).toBe(after.get(name));
    }
    const again = step(root, 1);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("## Operations\nnone\n");
    expect(await fileSnapshot(root)).toEqual(after);
  });

  // QFAI:AC-0004-0003-05
  // QFAI:EX-0004-0003-14
  // QFAI:EX-0004-0003-15
  it("keeps every step inside its write boundary without opening the network", async () => {
    expect(journey.changedPaths).toHaveLength(10);
    for (const [index, paths] of journey.changedPaths.entries()) {
      const number = index + 1;
      expect(journey.applied[index]?.status).toBe(0);
      for (const changed of paths) {
        const allowed = changedPathPatterns[index]?.some((pattern) => pattern.test(changed));
        expect(allowed, "Step " + number + " changed " + changed).toBe(true);
      }
    }
    expect(journey.changedPaths.flat().length).toBeGreaterThan(0);
    expect(await readFile(path.join(journey.root, "docs/notes.md"), "utf8")).toBe(
      "Project notes stay here.\n",
    );
    expect(await readFile(path.join(journey.root, "src/index.ts"), "utf8")).toBe(
      "export const original = true;\n",
    );
    expect(
      await readFile(path.join(journey.root, "tests/integration/order.test.ts"), "utf8"),
    ).toContain("const unchangedLine = true;\n");
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
  // QFAI:EX-0004-0003-20
  // QFAI:EX-0004-0003-22
  it("removes consumed old packs and keeps the retired rule source", async () => {
    expect(journey.afterStep7DirectoriesRemoved).toBe(true);
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
    for (const [name, content] of [
      ["10_Plan.md", "# Original plan\n"],
      ["16_Traceability-ledger.md", "# Original trace\n"],
      ["tdd/test-list.md", "# Original test list\n"],
    ] as const) {
      expect(
        await readFile(
          path.join(journey.root, ".qfai/evidence/migration-spec-to-story/retired/spec-0001", name),
          "utf8",
        ),
      ).toBe(content);
    }
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
    const row = decisions.split(/\r?\n/).find((line) => line.includes("CR-0001.md#CR-0001"));
    if (!row) throw new Error("Change-request decision row is absent");
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    expect(cells).toHaveLength(4);
    expect(cells[0]).toMatch(/^DEC-\d{4}$/);
    expect(cells[3]).toMatch(/^(?:TODO|DONE|DEFERRED|WIP)$/);
  });

  it("records a superseded pack as a completed decision without creating a flow", async () => {
    // QFAI:EX-0004-0005-05
    const root = await project();
    await cp(
      path.join(fixtureRoot, ".qfai/specs/spec-0002"),
      path.join(root, ".qfai/specs/spec-0002"),
      { recursive: true },
    );
    prepareThrough(root, 3);
    const decisions = await readFile(path.join(root, ".qfai/spec/decisions.md"), "utf8");
    const retiredRow = decisions
      .split(/\r?\n/)
      .find((line) => line.includes("spec-0002 is superseded by spec-0001"));
    expect(retiredRow).toContain("| DONE |");
    expect(step(root, 4).status).toBe(0);
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    expect(map.ids["spec-0002"]).toEqual({});
    await expect(
      lstat(path.join(root, ".qfai/spec/02_business-flow/business-flow-0002")),
    ).rejects.toMatchObject({ code: "ENOENT" });
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

  // QFAI:AC-0004-0006-02
  it("keeps only changed manifest routing entries as configuration overrides", async () => {
    const root = await project();
    const defaultsDir = path.resolve(getInitAssetsDir(), "..", "defaults");
    const defaults = parseYaml(
      await readFile(path.join(defaultsDir, "agent-routing.yml"), "utf8"),
    ) as { routing: Array<Record<string, unknown>> };
    const unchanged = defaults.routing[0];
    const original = defaults.routing[1];
    if (!unchanged || !original) throw new Error("Routing defaults need two entries");
    const changed = { ...original, review_profile: "migration-acceptance" };
    const manifest = path.join(root, ".qfai/assistant/manifest");
    await writeFile(
      path.join(manifest, "agent-routing.yml"),
      stringifyYaml({ routing: [unchanged, changed] }),
    );
    await writeFile(
      path.join(manifest, "review-profiles.yml"),
      await readFile(path.join(defaultsDir, "review-profiles.yml"), "utf8"),
    );
    prepareThrough(root, 3);
    const config = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8")) as {
      routing?: Array<Record<string, unknown>>;
      reviewProfiles?: Record<string, unknown>;
    };
    expect(config.routing).toEqual([changed]);
    expect(config.reviewProfiles).toBeUndefined();
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

  // QFAI:AC-0004-0007-02
  // QFAI:EX-0004-0007-07
  // QFAI:EX-0004-0007-09
  it("leaves an unplaced story in its old pack and lists it for a person", async () => {
    const root = await project();
    const source = path.join(root, ".qfai/specs/spec-0001/02_User-stories.md");
    await writeFile(
      source,
      (await readFile(source, "utf8")) +
        "\n## US-0001-0002: Unplaced order\n\nThis story has no destination flow.\n",
    );
    prepareThrough(root, 3);
    const result = step(root, 4);
    expect(result.status).toBe(3);
    expect(section(result.stdout, "For a person").join("\n")).toContain("US-0001-0002");
    expect(
      await readFile(path.join(root, ".qfai/spec/spec-0001/02_User-stories.md"), "utf8"),
    ).toContain("US-0001-0002");
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    expect(map.ids["spec-0001"]).not.toHaveProperty("US-0001-0002");
    const planPath = path.join(root, ".qfai/evidence/migration-spec-to-story/plan.yaml");
    const originalPlan = parseYaml(await readFile(planPath, "utf8")) as {
      flows: Array<{
        title: string;
        from?: string;
        stories: Array<{ id: string; criteria?: string[] }>;
      }>;
      rules: Array<{ id: string; contract: string }>;
    };
    const movedPlan = structuredClone(originalPlan);
    const firstFlow = movedPlan.flows[0];
    if (!firstFlow) throw new Error("Migration fixture has no first flow");
    const movedStory = firstFlow.stories.shift();
    if (!movedStory) throw new Error("Migration fixture has no mapped story");
    movedPlan.flows.push({ title: "Another flow", stories: [movedStory] });
    for (const [name, changedPlan, offender] of [
      ["moving a mapped story", movedPlan, "US-0001-0001"],
      [
        "placing an unplaced story",
        {
          ...originalPlan,
          flows: originalPlan.flows.map((flow, index) =>
            index === 0 ? { ...flow, stories: [...flow.stories, { id: "US-0001-0002" }] } : flow,
          ),
        },
        "US-0001-0002",
      ],
    ] as const) {
      await writeFile(planPath, stringifyYaml(changedPlan));
      const before = await fingerprint(root);
      const retry = step(root, 4);
      expect(retry.status, name).toBe(2);
      expect(retry.stderr, name).toContain(offender);
      expect(await fingerprint(root), name).toBe(before);
    }
  });

  it("places an ambiguous criterion explicitly and creates a template for a new flow", async () => {
    // QFAI:EX-0004-0007-01
    // QFAI:EX-0004-0007-08
    const root = await project();
    const stories = path.join(root, ".qfai/specs/spec-0001/02_User-stories.md");
    await writeFile(
      stories,
      `${await readFile(stories, "utf8")}\n## US-0001-0002: Track the receipt\n\nAs a buyer, I can track it.\n`,
    );
    const criteria = path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md");
    const legacyCriteria = await readFile(criteria, "utf8");
    await writeFile(
      criteria,
      legacyCriteria
        .replace("- Parent: US-0001-0001\n", "")
        .replace("- Parent: US-0001-0001\n", "- Parent: US-0001-0002\n"),
    );
    const planPath = path.join(root, ".qfai/evidence/migration-spec-to-story/plan.yaml");
    const plan = parseYaml(await readFile(planPath, "utf8")) as {
      flows: Array<{
        title: string;
        from?: string;
        stories: Array<{ id: string; criteria?: string[] }>;
      }>;
      rules: Array<{ id: string; contract: string }>;
    };
    const firstStory = plan.flows[0]?.stories[0];
    if (!firstStory || !plan.rules[0]) throw new Error("Migration fixture is incomplete");
    firstStory.criteria = ["AC-0001-0001"];
    plan.rules[0].contract = "api/orders.yaml";
    plan.flows.push({ title: "Track a receipt", stories: [{ id: "US-0001-0002" }] });
    await writeFile(planPath, stringifyYaml(plan));
    prepareThrough(root, 3);
    const result = step(root, 4);
    expect(result.status).toBe(3);
    expect(section(result.stdout, "For a person").join("\n")).toContain(
      "Track a receipt has no old flow diagram",
    );
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"] & { placements: Record<string, Record<string, string>> };
    expect(map.ids["spec-0001"]).toMatchObject({
      "US-0001-0001": "US-0001-0001",
      "US-0001-0002": "US-0002-0001",
      "AC-0001-0001": "AC-0001-0001-01",
      "AC-0001-0002": "AC-0002-0001-01",
      "BR-0001-0001": "BR-0001",
    });
    expect(map.placements["spec-0001"]).toMatchObject({
      "US-0001-0001": "Place an order",
      "US-0001-0002": "Track a receipt",
      "BR-0001-0001": "api/orders.yaml",
    });
    expect(
      await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
        ),
        "utf8",
      ),
    ).toContain("AC-0001-0001-01");
    expect(
      await readFile(
        path.join(
          root,
          ".qfai/spec/02_business-flow/business-flow-0002/user-story-0002-0001/02_Acceptance-Criteria.md",
        ),
        "utf8",
      ),
    ).toContain("AC-0002-0001-01");
    const secondFlow = await readFile(
      path.join(root, ".qfai/spec/02_business-flow/business-flow-0002/business-flow.md"),
      "utf8",
    );
    expect(secondFlow).toContain("Track a receipt");
    expect(secondFlow).toContain("flowchart");
  });

  it("places an example cited twice when both cases name the same criterion", async () => {
    // QFAI:EX-0004-0007-03
    const root = await project();
    const cases = path.join(root, ".qfai/specs/spec-0001/06_Test-Cases.md");
    await writeFile(
      cases,
      `${await readFile(cases, "utf8")}| TC-0001-0004 | AC-0001-0001 | EX-0001-0001 | Resubmit a valid order | Receipt has the order ID |\n`,
    );
    prepareThrough(root, 3);
    const result = step(root, 4);
    expect(result.status).toBe(0);
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    const exampleId = map.ids["spec-0001"]?.["EX-0001-0001"];
    expect(exampleId).toBe("EX-0001-0001-01");
    const target = await readFile(
      path.join(
        root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
      ),
      "utf8",
    );
    expect(target).toContain(`${exampleId} | AC-0001-0001-01`);
    expect(target).toContain("A valid order");
  });

  it("numbers flows and stories by plan order but criteria and examples by source order", async () => {
    // QFAI:EX-0004-0007-02
    const root = await project();
    const stories = path.join(root, ".qfai/specs/spec-0001/02_User-stories.md");
    await writeFile(
      stories,
      `${await readFile(stories, "utf8")}\n## US-0001-0002: Track a receipt\n\nAs a buyer, I track it.\n\n## US-0001-0003: View history\n\nAs a buyer, I view it.\n`,
    );
    const criteria = path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md");
    await writeFile(
      criteria,
      (await readFile(criteria, "utf8")).replaceAll(
        "- Parent: US-0001-0001",
        "- Parent: US-0001-0002",
      ),
    );
    const planPath = path.join(root, ".qfai/evidence/migration-spec-to-story/plan.yaml");
    const plan = parseYaml(await readFile(planPath, "utf8")) as {
      flows: Array<{
        title: string;
        from?: string;
        stories: Array<{ id: string; criteria?: string[] }>;
      }>;
      rules: Array<{ id: string; contract: string }>;
    };
    plan.flows = [
      {
        title: "F1",
        from: "CHG-0001: Order flow",
        stories: [
          { id: "US-0001-0002", criteria: ["AC-0001-0002", "AC-0001-0001"] },
          { id: "US-0001-0001" },
        ],
      },
      { title: "F2", stories: [{ id: "US-0001-0003" }] },
    ];
    plan.rules = plan.rules.slice(0, 2);
    await writeFile(planPath, stringifyYaml(plan));
    prepareThrough(root, 3);
    expect(step(root, 4).status).toBe(3);
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    const index = await readFile(
      path.join(root, ".qfai/spec/02_business-flow/business-flows.md"),
      "utf8",
    );
    expect(index).toContain("| BF-0001 | F1 |");
    expect(index).toContain("| BF-0002 | F2 |");
    expect(index.indexOf("| BF-0001 | F1 |")).toBeLessThan(index.indexOf("| BF-0002 | F2 |"));
    expect(map.ids["spec-0001"]).toMatchObject({
      "US-0001-0002": "US-0001-0001",
      "US-0001-0001": "US-0001-0002",
      "US-0001-0003": "US-0002-0001",
      "AC-0001-0001": "AC-0001-0001-01",
      "AC-0001-0002": "AC-0001-0001-02",
      "EX-0001-0001": "EX-0001-0001-01",
      "EX-0001-0002": "EX-0001-0001-02",
      "BR-0001-0001": "BR-0001",
      "BR-0001-0002": "BR-0002",
    });
  });

  // QFAI:AC-0004-0008-01
  it("turns a case with no example into a mapped example", async () => {
    const root = await project();
    const cases = path.join(root, ".qfai/specs/spec-0001/06_Test-Cases.md");
    const original = await readFile(cases, "utf8");
    const noExample = original.replace(
      /(\| TC-0001-0003 \| AC-0001-0001 \|) EX-0001-0003 /,
      "$1 — ",
    );
    expect(noExample).not.toBe(original);
    await writeFile(cases, noExample);
    prepareAllowingPerson(root, 4);
    const result = step(root, 5);
    expect(result.status).toBe(0);
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    const ids = map.ids["spec-0001"];
    if (!ids) throw new Error("ID map omitted spec-0001");
    const example = await readFile(
      path.join(
        root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
      ),
      "utf8",
    );
    expect(example).toContain(ids["TC-0001-0003"]);
    expect(section(result.stdout, "Cases to examples").join("\n")).toContain("TC-0001-0003");
  });

  // QFAI:AC-0004-0008-02
  it("accounts for case-only rows with no criterion or two criteria", async () => {
    const root = await project();
    const cases = path.join(root, ".qfai/specs/spec-0001/06_Test-Cases.md");
    await writeFile(
      cases,
      (await readFile(cases, "utf8")) +
        "| TC-0001-0004 | — | — | Missing AC | Review |\n" +
        "| TC-0001-0005 | AC-0001-0001, AC-0001-0002 | — | Two ACs | Review |\n",
    );
    prepareAllowingPerson(root, 4);
    const result = step(root, 5);
    const person = section(result.stdout, "For a person").join("\n");
    expect(result.status).toBe(3);
    expect(person).toContain("TC-0001-0004");
    expect(person).toContain("TC-0001-0005");
    expect(section(result.stdout, "Cases to examples")).toEqual([]);
  });

  // QFAI:AC-0004-0008-03
  // QFAI:EX-0004-0008-07
  // QFAI:EX-0004-0008-08
  // QFAI:EX-0004-0008-09
  it("derives one criterion and retains examples with none or two", async () => {
    const root = await project();
    const examples = path.join(root, ".qfai/specs/spec-0001/05_Examples.md");
    const cases = path.join(root, ".qfai/specs/spec-0001/06_Test-Cases.md");
    await writeFile(
      examples,
      (await readFile(examples, "utf8")) +
        "| EX-0001-0004 | BR-0001-0001 | No citing case | Review |\n" +
        "| EX-0001-0005 | BR-0001-0001 | Two citing criteria | Review |\n" +
        "| EX-0001-0006 | BR-0001-0001 | Citing case without AC | Review |\n",
    );
    await writeFile(
      cases,
      (await readFile(cases, "utf8")) +
        "| TC-0001-0004 | AC-0001-0001 | EX-0001-0005 | First criterion | Review |\n" +
        "| TC-0001-0005 | AC-0001-0002 | EX-0001-0005 | Second criterion | Review |\n" +
        "| TC-0001-0006 | — | EX-0001-0006 | No criterion | Review |\n",
    );
    const first = prepareAllowingPerson(root, 4);
    const unresolved = section(first[3]?.stdout ?? "", "For a person").join("\n");
    expect(first[3]?.status).toBe(3);
    expect(unresolved).toContain("EX-0001-0004");
    expect(unresolved).toContain("EX-0001-0005");
    expect(unresolved).toContain(
      "spec-0001/05_Examples.md: EX-0001-0006 has no single derived criterion",
    );
    const derived = step(root, 6);
    expect(derived.status).toBe(0);
    const mapped = await readFile(
      path.join(
        root,
        ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
      ),
      "utf8",
    );
    expect(mapped).toContain("EX-0001-0001-01 | AC-0001-0001-01");
    const retained = await readFile(path.join(root, ".qfai/spec/spec-0001/05_Examples.md"), "utf8");
    expect(retained).toContain("EX-0001-0004");
    expect(retained).toContain("EX-0001-0005");
    expect(retained).toContain("EX-0001-0006");
    expect(retained).not.toMatch(/EX-0001-0006\s*\|\s*AC-/);
    const map = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json"), "utf8"),
    ) as Journey["map"];
    expect(map.ids["spec-0001"]).not.toHaveProperty("EX-0001-0004");
    expect(map.ids["spec-0001"]).not.toHaveProperty("EX-0001-0005");
    expect(map.ids["spec-0001"]).not.toHaveProperty("EX-0001-0006");
    expect(mapped).not.toContain("No citing case");
    expect(mapped).not.toContain("Two citing criteria");
    expect(mapped).not.toContain("Citing case without AC");
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

  // QFAI:AC-0004-0009-02
  it("reports a rule whose destination contract is absent and retains its wording", async () => {
    const root = await project();
    const plan = path.join(root, ".qfai/evidence/migration-spec-to-story/plan.yaml");
    const original = await readFile(plan, "utf8");
    const modified = original.replace(
      "contract: api/order.yaml",
      "contract: api/missing-order.yaml",
    );
    expect(modified).not.toBe(original);
    await writeFile(plan, modified);
    prepareThrough(root, 6);
    const source = path.join(root, ".qfai/spec/spec-0001/04_Business-Rules.md");
    const before = await readFile(source, "utf8");
    const result = step(root, 7);
    expect(result.status).toBe(3);
    expect(section(result.stdout, "For a person").join("\n")).toContain("BR-0001-0001");
    const oldRule = "| BR-0001-0001 | A valid order receives a receipt.       |";
    expect(before).toContain(oldRule);
    expect(await readFile(source, "utf8")).toContain(oldRule);
    await expect(
      lstat(path.join(root, ".qfai/spec/03_contract/api/missing-order.yaml")),
    ).rejects.toMatchObject({ code: "ENOENT" });
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
  // QFAI:EX-0004-0011-02
  it("keeps decision evidence visible to Git after the ignore update", async () => {
    const ignore = await readFile(path.join(journey.root, ".gitignore"), "utf8");
    expect(ignore).toContain("!.qfai/evidence/decision/");
    expect(ignore).not.toContain("!.qfai/evidence/decisions/");
    expect(ignore).toContain("# Local notes stay ignored.\nscratch/");
    expect((await ensureRootGitignoreEntries(journey.root, true, () => {})).copied).toEqual([]);
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

  // QFAI:AC-0004-0012-01
  it("instructs the installed skill to plan, preview, retain reports and validate", async () => {
    const skill = await readFile(
      path.join(
        packageRoot,
        "assets/init/.qfai/assistant/skill/qfai-migration-spec-to-story/SKILL.md",
      ),
      "utf8",
    );
    const required = [
      "plan.yaml",
      "Run steps 1 to 3 in order",
      "run `--dry-run` first",
      "Keep the complete Markdown report and exit code",
      "Run steps 4 to 10 in order",
      "qfai validate",
      "there is nothing to",
    ];
    for (const phrase of required) expect(skill).toContain(phrase);
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

import { createHash } from "node:crypto";
import {
  chmod,
  cp,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  writeFile,
  mkdir,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { defaultConfig, loadConfig } from "../../../../src/core/config.js";
import { isRecord } from "../../../../src/core/workflow/parse.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
  type MigrationStep,
} from "../../../../src/migration/specToStory/harness.js";
import { ID_MAP_PATH } from "../../../../src/migration/specToStory/idMap.js";
import { step08 } from "../../../../src/migration/specToStory/step08RewriteAnnotations.js";

const FIXTURE = path.resolve(__dirname, "../../../fixtures/migration-spec-to-story/old-layout");
const CRITERIA = path.resolve(
  __dirname,
  "../../../fixtures/bf0004MigrationCutover/legacy-criteria.md",
);

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function context(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-harness-"));
  roots.push(root);
  await mkdir(path.join(root, ".qfai"));
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  config.paths.testsDir = "tests";
  return {
    root,
    specsDir: path.join(root, ".qfai", "spec"),
    contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
    config,
  };
}

function capture() {
  const output: string[] = [];
  const error: string[] = [];
  return {
    output,
    error,
    io: {
      stdout: { write: (value: string) => output.push(value) },
      stderr: { write: (value: string) => error.push(value) },
    },
  };
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

describe("migration harness", () => {
  it("rejects unknown arguments and a missing project config before reading the tree", async () => {
    const ctx = await context();
    const invalid = capture();
    expect(await runStep(1, ["--unknown"], { cwd: ctx.root, ...invalid.io })).toBe(2);
    expect(invalid.error.join("")).toContain("--dry-run");
    const missing = capture();
    expect(await runStep(1, [], { cwd: path.join(ctx.root, "missing"), ...missing.io })).toBe(2);
    expect(missing.error.join("")).toContain("qfai.config.yaml");
  });

  it("prints the same operation journal in dry and real runs without dry-run writes", async () => {
    const ctx = await context();
    const step: MigrationStep = {
      number: 2,
      writeSet: ["qfai"],
      sections: ["For a person"],
      plan: () =>
        Promise.resolve({
          operations: [
            { kind: "write", target: ".qfai/spec/decisions.md", content: "# Decisions\n" },
          ],
          forAPerson: [],
        }),
    };
    const dry = capture();
    expect(await executePlannedStep(step, ctx, true, dry.io)).toBe(0);
    await expect(readFile(path.join(ctx.root, ".qfai/spec/decisions.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const real = capture();
    expect(await executePlannedStep(step, ctx, false, real.io)).toBe(0);
    expect(real.output.join("")).toBe(dry.output.join(""));
    expect(await readFile(path.join(ctx.root, ".qfai/spec/decisions.md"), "utf8")).toBe(
      "# Decisions\n",
    );
    const repeated = capture();
    expect(await executePlannedStep(step, ctx, false, repeated.io)).toBe(0);
    expect(repeated.output.join("")).toContain("## Operations\nnone");
  });

  it("refuses an out-of-set operation before writing any planned file", async () => {
    const ctx = await context();
    const step: MigrationStep = {
      number: 2,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [
            { kind: "write", target: ".qfai/safe.md", content: "safe" },
            { kind: "write", target: "outside.md", content: "unsafe" },
          ],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    await expect(readFile(path.join(ctx.root, ".qfai/safe.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(captured.error.join("")).toContain("outside.md");
  });

  it("uses configured specification and contract directories as the exact external write roots", async () => {
    const ctx = await context();
    ctx.specsDir = path.join(ctx.root, "docs/spec");
    ctx.contractsDir = path.join(ctx.root, "docs/contracts");
    ctx.config.paths.specsDir = "docs/spec";
    ctx.config.paths.contractsDir = "docs/contracts";
    const allowed: MigrationStep = {
      number: 4,
      writeSet: ["specs", "contracts"],
      plan: () =>
        Promise.resolve({
          operations: [
            { kind: "write", target: "docs/spec/business-flows.md", content: "# Flows\n" },
            { kind: "write", target: "docs/contracts/contracts.md", content: "# Contracts\n" },
          ],
        }),
    };
    expect(await executePlannedStep(allowed, ctx, false, capture().io)).toBe(0);
    const disallowed: MigrationStep = {
      number: 4,
      writeSet: ["specs", "contracts"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: "docs/other.md", content: "no" }],
        }),
    };
    expect(await executePlannedStep(disallowed, ctx, false, capture().io)).toBe(2);
    await expect(readFile(path.join(ctx.root, "docs/other.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses an external configured directory reached through an ancestor link", async () => {
    const ctx = await context();
    const actual = path.join(ctx.root, "external-actual");
    await mkdir(actual);
    const linked = path.join(ctx.root, "external-link");
    await symlink(actual, linked, process.platform === "win32" ? "junction" : "dir");
    ctx.specsDir = path.join(linked, "spec");
    ctx.config.paths.specsDir = "external-link/spec";
    const step: MigrationStep = {
      number: 4,
      writeSet: ["specs"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: "external-link/spec/story.md", content: "story" }],
        }),
    };
    expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(2);
    await expect(readFile(path.join(actual, "spec/story.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("writes into a project whose root is reached through a link", async () => {
    const ctx = await context();
    const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-linked-root-"));
    roots.push(parent);
    const linked = path.join(parent, "project");
    await symlink(ctx.root, linked, process.platform === "win32" ? "junction" : "dir");
    const through: MigrationContext = {
      ...ctx,
      root: linked,
      specsDir: path.join(linked, ".qfai", "spec"),
      contractsDir: path.join(linked, ".qfai", "spec", "03_contract"),
    };
    const step: MigrationStep = {
      number: 4,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: ".qfai/note.md", content: "note\n" }],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, through, false, captured.io)).toBe(0);
    expect(captured.error).toEqual([]);
    expect(await readFile(path.join(ctx.root, ".qfai/note.md"), "utf8")).toBe("note\n");
  });

  it("refuses a write under .qfai/evidence/ although the step may write under .qfai/", async () => {
    // QFAI:EX-0004-0003-14
    const ctx = await context();
    const step: MigrationStep = {
      number: 4,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: ".qfai/evidence/note.md", content: "note\n" }],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    expect(captured.error.join("")).toContain("outside its write set");
    await expect(lstat(path.join(ctx.root, ".qfai/evidence"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses a write under .qfai/evidence/ reached through a configured directory", async () => {
    // QFAI:EX-0004-0003-14
    const ctx = await context();
    ctx.specsDir = path.join(ctx.root, ".qfai", "evidence", "spec");
    const step: MigrationStep = {
      number: 3,
      writeSet: ["specs"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "write", target: ".qfai/evidence/spec/note.md", content: "n\n" }],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    expect(captured.error.join("")).toContain("outside its write set");
    await expect(lstat(path.join(ctx.root, ".qfai/evidence"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses a move whose destination an earlier move of the same run created", async () => {
    const ctx = await context();
    await put(ctx.root, ".qfai/old/sub/a.md", "moved");
    await put(ctx.root, ".qfai/other.md", "other");
    const step: MigrationStep = {
      number: 1,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [
            { kind: "move", source: ".qfai/old", target: ".qfai/new" },
            { kind: "move", source: ".qfai/other.md", target: ".qfai/new/sub/a.md" },
          ],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    expect(captured.error.join("")).toContain("Migration destination exists: .qfai/new/sub/a.md");
    expect(await readFile(path.join(ctx.root, ".qfai/new/sub/a.md"), "utf8")).toBe("moved");
    expect(await readFile(path.join(ctx.root, ".qfai/other.md"), "utf8")).toBe("other");
  });

  it("refuses steps 3 to 8 until step 2 has merged its sources and retired packs", async () => {
    const ctx = await context();
    await put(
      ctx.root,
      "qfai.config.yaml",
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(ctx.root, ".qfai/spec/spec-0001/01_Spec.md", "# Spec\n\n- Status: active\n");
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/07_Decisions.md",
      "# Decisions\n\n## DR-0001: Keep orders\n\n- Status: accepted\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0002/01_Spec.md",
      "# Spec\n\n- Status: superseded\n- Superseded by: spec-0001\n",
    );
    for (const step of [3, 4, 7, 8]) {
      const refused = capture();
      expect(await runStep(step, ["--dry-run"], { cwd: ctx.root, ...refused.io })).toBe(2);
      expect(refused.error.join("")).toBe(
        `Run step 2 before step ${step}: .qfai/spec/spec-0001/07_Decisions.md is not merged yet.\n`,
      );
    }
    await rm(path.join(ctx.root, ".qfai/spec/spec-0001/07_Decisions.md"));
    const retired = capture();
    expect(await runStep(7, [], { cwd: ctx.root, ...retired.io })).toBe(2);
    expect(retired.error.join("")).toBe(
      "Run step 2 before step 7: .qfai/spec/spec-0002/01_Spec.md is not merged yet.\n",
    );
    expect(await lstat(path.join(ctx.root, ".qfai/spec/spec-0002/01_Spec.md"))).toBeTruthy();
    expect(await runStep(2, [], { cwd: ctx.root, ...capture().io })).toBe(0);
    const ordered = capture();
    expect(await runStep(7, [], { cwd: ctx.root, ...ordered.io })).toBe(2);
    expect(ordered.error.join("")).toBe("Run step 4 before step 7.\n");
  });

  it("refuses a move collision before any write", async () => {
    const ctx = await context();
    await writeFile(path.join(ctx.root, ".qfai", "source.md"), "source");
    await writeFile(path.join(ctx.root, ".qfai", "target.md"), "target");
    const step: MigrationStep = {
      number: 1,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [{ kind: "move", source: ".qfai/source.md", target: ".qfai/target.md" }],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    expect(await readFile(path.join(ctx.root, ".qfai", "source.md"), "utf8")).toBe("source");
    expect(await readFile(path.join(ctx.root, ".qfai", "target.md"), "utf8")).toBe("target");
  });

  it("allows only annotation tokens to change in a test file", async () => {
    const ctx = await context();
    const target = "tests/e2e/checkout.test.ts";
    await mkdir(path.join(ctx.root, "tests/e2e"), { recursive: true });
    const original = "// QFAI:SPEC-0001:US-0001-0001 checkout remains stable\n";
    await writeFile(path.join(ctx.root, target), original);
    const step: MigrationStep = {
      number: 8,
      writeSet: ["test-annotations"],
      plan: () =>
        Promise.resolve({
          annotationTargets: [target],
          operations: [
            {
              kind: "write",
              target,
              content: `// ${["QFAI", "BF-0001"].join(":")} checkout has changed\n`,
            },
          ],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(2);
    expect(await readFile(path.join(ctx.root, target), "utf8")).toBe(original);
  });

  it("preserves an executable test file's mode during an atomic annotation rewrite", async () => {
    const ctx = await context();
    const target = "tests/e2e/checkout.test.ts";
    await mkdir(path.join(ctx.root, "tests/e2e"), { recursive: true });
    await writeFile(path.join(ctx.root, target), "// QFAI:US-0001 old\n");
    await chmod(path.join(ctx.root, target), 0o755);
    const before = await lstat(path.join(ctx.root, target));
    const step: MigrationStep = {
      number: 8,
      writeSet: ["test-annotations"],
      plan: () =>
        Promise.resolve({
          annotationTargets: [target],
          operations: [{ kind: "write", target, content: "// QFAI:US-0002 old\n" }],
        }),
    };
    expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(0);
    const after = await lstat(path.join(ctx.root, target));
    expect(after.mode & 0o777).toBe(before.mode & 0o777);
    expect(await readFile(path.join(ctx.root, target), "utf8")).toBe("// QFAI:US-0002 old\n");
  });

  it("rewrites a configured package test selected outside paths.testsDir", async () => {
    const ctx = await context();
    ctx.config.validation.traceability.testFileGlobs = ["packages/qfai/tests/**/*.test.ts"];
    const target = "packages/qfai/tests/assets/actionPinBumpOwner.test.ts";
    await put(
      ctx.root,
      ID_MAP_PATH,
      JSON.stringify({
        version: 1,
        ids: { "spec-0001": { "TC-0001-0001": "EX-0001-0001-01" } },
        placements: {},
        retiredPacks: {},
      }),
    );
    await put(ctx.root, target, "// QFAI:SPEC-0001:TC-0001-0001\n");
    await mkdir(ctx.specsDir, { recursive: true });
    expect(await executePlannedStep(step08, ctx, false, capture().io)).toBe(0);
    expect(await readFile(path.join(ctx.root, target), "utf8")).toBe(
      `// ${["QFAI", "EX-0001-0001-01"].join(":")}\n`,
    );
  });

  it("refuses an unselected test and a path outside the project", async () => {
    const ctx = await context();
    const selected = "packages/qfai/tests/assets/actionPinBumpOwner.test.ts";
    const other = "packages/qfai/tests/assets/other.test.ts";
    await put(ctx.root, other, "// QFAI:SPEC-0001:TC-0001-0001\n");
    const outside = "../escaped.test.ts";
    for (const [target, annotationTargets] of [
      [other, [selected]],
      [outside, [outside]],
    ] as const) {
      const step: MigrationStep = {
        number: 8,
        writeSet: ["test-annotations"],
        plan: () =>
          Promise.resolve({
            annotationTargets: [...annotationTargets],
            operations: [
              {
                kind: "write" as const,
                target,
                content: `// ${["QFAI", "EX-0001-0001-01"].join(":")}\n`,
              },
            ],
          }),
      };
      expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(2);
    }
    expect(await readFile(path.join(ctx.root, other), "utf8")).toContain("SPEC-0001");
  });

  it("checks every delegated host-link target and applies the writer once", async () => {
    const ctx = await context();
    const targets = [".claude/skills/qfai-sdd", ".github/agents/backend-engineer.md"];
    let applications = 0;
    const step: MigrationStep = {
      number: 9,
      writeSet: ["links"],
      plan: () =>
        Promise.resolve({
          operations: [
            {
              kind: "delegate",
              target: targets[0] ?? "",
              targets,
              description: "repoint host integration link",
              apply: () => {
                applications += 1;
                return Promise.resolve();
              },
            },
          ],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(0);
    expect(applications).toBe(1);
    for (const target of targets) expect(captured.output.join("")).toContain(target);
    const invalid: MigrationStep = {
      ...step,
      plan: () =>
        Promise.resolve({
          operations: [
            {
              kind: "delegate",
              target: targets[0] ?? "",
              targets: [...targets, "src/index.ts"],
              description: "repoint host integration link",
              apply: () => {
                applications += 1;
                return Promise.resolve();
              },
            },
          ],
        }),
    };
    expect(await executePlannedStep(invalid, ctx, false, capture().io)).toBe(2);
    expect(applications).toBe(1);
  });

  it("returns 3 after applying a plan with unresolved items", async () => {
    const ctx = await context();
    const step: MigrationStep = {
      number: 5,
      writeSet: ["qfai"],
      sections: ["Cases to examples", "For a person"],
      plan: () =>
        Promise.resolve({
          operations: [],
          forAPerson: ["spec-0001/06_Test-Cases.md: multiple ACs"],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, ctx, false, captured.io)).toBe(3);
    expect(captured.output.join("")).toContain("## Cases to examples\nnone");
    expect(captured.output.join("")).toContain("## For a person\n- spec-0001/06_Test-Cases.md");
  });
});

type Run = { code: number; output: string; errors: string };

async function stepIn(root: string, step: number, args: string[] = []): Promise<Run> {
  const captured = capture();
  const code = await runStep(step, args, { cwd: root, ...captured.io });
  return { code, output: captured.output.join(""), errors: captured.error.join("") };
}

function section(report: string, name: string): string[] {
  const body = report.split(`## ${name}\n`)[1]?.split("\n## ")[0] ?? "";
  return body
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

/** What every file and link under `root` holds, `.git` left out. */
async function tree(root: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === ".git" || relative.startsWith(".git/")) {
      continue;
    }
    found.set(
      relative,
      entry.isSymbolicLink()
        ? `link:${await readlink(file)}`
        : createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
    );
  }
  return found;
}

/** A copy of the old-layout fixture, prepared as a 1.x project the steps start from. */
async function oldLayout(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-report-"));
  roots.push(root);
  await cp(FIXTURE, root, { recursive: true });
  await cp(CRITERIA, path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"));
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rename(
    path.join(root, ".qfai/assistant/skill-local.input"),
    path.join(root, ".qfai/assistant/skills.local"),
  );
  await writeFile(path.join(root, "AGENTS.md"), "# Our agents\n\nProject text.\n");
  await writeFile(path.join(root, "CLAUDE.md"), "# Our Claude\n\nProject text.\n");
  return root;
}

async function editConfig(root: string, edit: (config: Record<string, unknown>) => void) {
  const file = path.join(root, "qfai.config.yaml");
  const parsed: unknown = parseYaml(await readFile(file, "utf8"));
  const config = isRecord(parsed) ? parsed : {};
  edit(config);
  await writeFile(file, stringifyYaml(config));
}

function retiredKeys(config: Record<string, unknown>): void {
  const validation = isRecord(config.validation) ? config.validation : {};
  const traceability = isRecord(validation.traceability) ? validation.traceability : {};
  traceability.scMustHaveTest = true;
  traceability.unknownContractIdSeverity = "warning";
  validation.traceability = traceability;
  config.validation = validation;
}

describe("migration step: an invalid qfai.config.yaml", () => {
  // QFAI:EX-0004-0003-33
  it("prints the sentence naming the file and then each loader issue, and writes nothing", async () => {
    const root = await oldLayout();
    expect((await loadConfig(root)).issues).toEqual([]);
    await editConfig(root, (config) => {
      retiredKeys(config);
      const paths = isRecord(config.paths) ? config.paths : {};
      paths.testsDir = 5;
      config.paths = paths;
    });
    const issues = (await loadConfig(root)).issues.map((issue) => issue.message);
    expect(issues).toContain("paths.testsDir must be a string.");
    expect(
      issues.some((message) => message.includes("validation.traceability.scMustHaveTest")),
    ).toBe(true);
    const before = await tree(root);

    const result = await stepIn(root, 1);

    expect(result.code).toBe(2);
    expect(result.errors.trimEnd().split("\n")).toEqual([
      "Cannot read or parse qfai.config.yaml.",
      ...issues,
    ]);
    expect(result.output).toBe("");
    expect(await tree(root)).toEqual(before);
  });
});

describe("migration step 1: the retired traceability keys", () => {
  // QFAI:EX-0004-0004-06
  it("removes both keys, lists each, and leaves the other keys and a rerun alone", async () => {
    const root = await oldLayout();
    await editConfig(root, (config) => {
      retiredKeys(config);
      config.prototyping = { primarySpecId: "spec-0001" };
    });
    const messages = (await loadConfig(root)).issues.map((issue) => issue.message);
    expect(messages.filter((message) => message.includes("is retired"))).toHaveLength(3);
    const before = await tree(root);

    const dry = await stepIn(root, 1, ["--dry-run"]);
    expect(dry.code, dry.errors).toBe(0);
    expect(await tree(root)).toEqual(before);
    const operations = section(dry.output, "Operations");
    for (const key of ["scMustHaveTest", "unknownContractIdSeverity"]) {
      expect(
        operations.some((line) => line.includes(key)),
        `${key} in ${operations.join("|")}`,
      ).toBe(true);
    }

    const real = await stepIn(root, 1);
    expect(real.code, real.errors).toBe(0);
    expect(section(real.output, "Operations")).toEqual(operations);
    const config: unknown = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8"));
    expect(config).not.toHaveProperty(["validation", "traceability", "scMustHaveTest"]);
    expect(config).not.toHaveProperty(["validation", "traceability", "unknownContractIdSeverity"]);
    expect(config).toHaveProperty(["validation", "traceability", "testFileGlobs"]);
    expect(config).toHaveProperty(["prototyping", "primarySpecId"], "spec-0001");

    const again = await stepIn(root, 1);
    expect(again.code, again.errors).toBe(0);
    expect(again.output).toContain("## Operations\nnone\n");
  });

  // QFAI:EX-0004-0004-06
  it("removes a validation mapping the removal leaves empty, so the file raises no issue for either key", async () => {
    const { root } = await context();
    await put(
      root,
      "qfai.config.yaml",
      [
        "paths:",
        "  specsDir: .qfai/spec",
        "  contractsDir: .qfai/spec/03_contract",
        "validation:",
        "  traceability:",
        "    scMustHaveTest: true",
        "    unknownContractIdSeverity: warning",
        "",
      ].join("\n"),
    );
    expect((await loadConfig(root)).issues).toHaveLength(2);

    const result = await stepIn(root, 1);
    expect(result.code, result.errors).toBe(0);
    const config: unknown = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8"));
    expect(config).not.toHaveProperty("validation");
    expect((await loadConfig(root)).issues).toEqual([]);
  });
});

describe("migration step 3: a retired config key", () => {
  // QFAI:EX-0004-0003-34
  it("runs step 3 on a story-tree project that still holds a retired config key", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-retired-key-"));
    roots.push(root);
    await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\nprototyping:\n  primarySpecId: spec-0001\n  primaryUiContract: UI-0001\n",
    );

    const result = await stepIn(root, 3);

    expect(result.code, result.errors).not.toBe(2);
    expect(await readFile(path.join(root, "qfai.config.yaml"), "utf8")).not.toContain(
      "primarySpecId",
    );
  });
});

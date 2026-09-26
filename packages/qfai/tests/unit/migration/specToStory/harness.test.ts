import { chmod, lstat, mkdtemp, readFile, writeFile, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import {
  executePlannedStep,
  moveAcrossDevices,
  moveStage,
  runStep,
  staleStageOperations,
  writeStage,
  type MigrationContext,
  type MigrationStep,
} from "../../../../src/migration/specToStory/harness.js";
import { ID_MAP_PATH } from "../../../../src/migration/specToStory/idMap.js";
import { step08 } from "../../../../src/migration/specToStory/step08RewriteAnnotations.js";

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
          operations: [{ kind: "write", target: ".qfai/evidence/note.md", content: "note\n" }],
        }),
    };
    const captured = capture();
    expect(await executePlannedStep(step, through, false, captured.io)).toBe(0);
    expect(captured.error).toEqual([]);
    expect(await readFile(path.join(ctx.root, ".qfai/evidence/note.md"), "utf8")).toBe("note\n");
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

  it("keeps annotation staging inside the configured test root and recovers an empty stage", async () => {
    const ctx = await context();
    ctx.config.paths.testsDir = "external-tests";
    const target = path.join(ctx.root, "external-tests/example.test.ts");
    const stage = writeStage(ctx, { kind: "write", step: 8, target });
    expect(stage.directory).toContain(
      path.join(ctx.root, "external-tests/.qfai-migration-staging"),
    );
    await mkdir(stage.directory, { recursive: true });
    const recovery = await staleStageOperations(ctx, 8);
    expect(recovery.map((operation) => operation.kind)).toEqual(["remove-empty-directory"]);
    const step: MigrationStep = {
      number: 8,
      writeSet: ["test-annotations"],
      plan: () => Promise.resolve({ operations: recovery }),
    };
    expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(0);
    await expect(lstat(stage.directory)).rejects.toMatchObject({ code: "ENOENT" });
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

  it("allows only the exact managed .gitignore staging names in the report directory", async () => {
    const ctx = await context();
    const payload = ".qfai/report/.gitignore-123-550e8400-e29b-41d4-a716-446655440000.tmp";
    let applications = 0;
    const step: MigrationStep = {
      number: 10,
      writeSet: ["gitignore", "gitignore-staging"],
      plan: () =>
        Promise.resolve({
          operations: [
            {
              kind: "delegate",
              target: ".gitignore",
              targets: [".gitignore", payload, `${payload}.owner`],
              description: "update managed block and reclaim its stage",
              apply: () => {
                applications += 1;
                return Promise.resolve();
              },
            },
          ],
        }),
    };
    const result = capture();
    expect(await executePlannedStep(step, ctx, false, result.io)).toBe(0);
    expect(applications).toBe(1);
    expect(result.output.join("")).toContain(`${payload}.owner`);
    for (const invalid of [
      ".qfai/other/.gitignore-123-550e8400-e29b-41d4-a716-446655440000.tmp",
      ".qfai/report/.gitignore-0-550e8400-e29b-41d4-a716-446655440000.tmp",
      ".qfai/report/.gitignore-123-550e8400-e29b-11d4-a716-446655440000.tmp",
      `${payload}.owner.extra`,
    ]) {
      const rejected: MigrationStep = {
        ...step,
        plan: () =>
          Promise.resolve({
            operations: [
              {
                kind: "delegate",
                target: ".gitignore",
                targets: [".gitignore", invalid],
                description: "update managed block and reclaim its stage",
                apply: () => {
                  applications += 1;
                  return Promise.resolve();
                },
              },
            ],
          }),
      };
      expect(await executePlannedStep(rejected, ctx, false, capture().io)).toBe(2);
    }
    expect(applications).toBe(1);
  });

  it("resumes a partial cross-volume copy and removes the source only after verification", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai/source.txt");
    const target = path.join(ctx.root, ".qfai/target.txt");
    await writeFile(source, "complete source");
    const owner = { step: 1 as const, source, target };
    const stage = moveStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    await writeFile(stage.payload, "complete");

    await moveAcrossDevices(ctx, 1, source, target);

    expect(await readFile(target, "utf8")).toBe("complete source");
    await expect(readFile(source)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(stage.marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the source and a divergent staged copy for inspection", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai/source.txt");
    const target = path.join(ctx.root, ".qfai/target.txt");
    await writeFile(source, "complete source");
    const owner = { step: 1 as const, source, target };
    const stage = moveStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    await writeFile(stage.payload, "different data");

    await expect(moveAcrossDevices(ctx, 1, source, target)).rejects.toThrow("differs from source");
    expect(await readFile(source, "utf8")).toBe("complete source");
    expect(await readFile(stage.payload, "utf8")).toBe("different data");
    await expect(readFile(target)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("cleans a completed stage left by an interrupted move without touching the destination", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai/source.txt");
    const target = path.join(ctx.root, ".qfai/target.txt");
    await writeFile(source, "same content");
    await writeFile(target, "same content");
    const owner = { step: 1 as const, source, target };
    const stage = moveStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    const recovery = await staleStageOperations(ctx, 1);
    expect(recovery.map((operation) => operation.kind)).toEqual(["move", "cleanup-stage"]);
    const step: MigrationStep = {
      number: 1,
      writeSet: ["qfai"],
      plan: () => Promise.resolve({ operations: recovery }),
    };
    expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(0);
    expect(await readFile(target, "utf8")).toBe("same content");
    await expect(readFile(source)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(stage.marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("finishes a committed move and the remaining step work in one rerun", async () => {
    const ctx = await context();
    await writeFile(path.join(ctx.root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/specs\n");
    const source = path.join(ctx.root, ".qfai/specs/01_Spec.md");
    const target = path.join(ctx.root, ".qfai/spec/01_Spec.md");
    await mkdir(path.dirname(source), { recursive: true });
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(source, "# Specification\n");
    await writeFile(target, "# Specification\n");
    const owner = { step: 1 as const, source, target };
    const stage = moveStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    const dry = capture();
    expect(await runStep(1, ["--dry-run"], { cwd: ctx.root, ...dry.io })).toBe(0);
    expect(await readFile(source, "utf8")).toBe("# Specification\n");
    const captured = capture();
    expect(await runStep(1, [], { cwd: ctx.root, ...captured.io })).toBe(0);
    expect(captured.output.join("")).toBe(dry.output.join(""));
    await expect(readFile(source)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(target, "utf8")).toBe("# Specification\n");
    expect(await readFile(path.join(ctx.root, "qfai.config.yaml"), "utf8")).toContain(".qfai/spec");
    expect(captured.output.join("")).toContain("remove after verified move");
    expect(captured.output.join("")).toContain("qfai.config.yaml: write");
  });

  it("refuses recovery when a completed cross-volume destination differs from its source", async () => {
    const ctx = await context();
    const source = path.join(ctx.root, ".qfai/source.txt");
    const target = path.join(ctx.root, ".qfai/target.txt");
    await writeFile(source, "source data");
    await writeFile(target, "other data");
    const owner = { step: 1 as const, source, target };
    const stage = moveStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    const operations = await staleStageOperations(ctx, 1);
    const step: MigrationStep = {
      number: 1,
      writeSet: ["qfai"],
      plan: () => Promise.resolve({ operations }),
    };
    expect(await executePlannedStep(step, ctx, false, capture().io)).toBe(2);
    expect(await readFile(source, "utf8")).toBe("source data");
    expect(await readFile(target, "utf8")).toBe("other data");
    expect(await readFile(stage.marker, "utf8")).toContain("source.txt");
  });

  it("recovers an interrupted ID map write without corrupting the prior JSON", async () => {
    const ctx = await context();
    const target = path.join(ctx.root, ID_MAP_PATH);
    await mkdir(path.dirname(target), { recursive: true });
    const before = '{"version":1,"ids":{}}\n';
    const after = '{"version":1,"ids":{"spec-0001":{"US-1":"US-0001-0001"}}}\n';
    await writeFile(target, before);
    const owner = { kind: "write" as const, step: 4 as const, target };
    const stage = writeStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    await writeFile(stage.payload, '{"version":1,"ids":');
    const recovery = await staleStageOperations(ctx, 4);
    expect(recovery.map((operation) => operation.kind)).toEqual(["cleanup-write-stage"]);
    const recoveringStep: MigrationStep = {
      number: 4,
      writeSet: ["qfai"],
      plan: () =>
        Promise.resolve({
          operations: [...recovery, { kind: "write", target: ID_MAP_PATH, content: after }],
        }),
    };
    expect(await executePlannedStep(recoveringStep, ctx, false, capture().io)).toBe(0);
    expect(await readFile(target, "utf8")).toBe(after);
    await expect(readFile(stage.marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("completes step 4 in one rerun after its ID map temp file was interrupted", async () => {
    const ctx = await context();
    await put(
      ctx.root,
      "qfai.config.yaml",
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/01_Spec.md",
      "# Spec\n\n- Status: active\n\n## Scope\n\nSubmitting an order from a cart.\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/02_User-stories.md",
      "# Stories\n\n## US-0001-0001: Order\n\nOrder.\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/03_Acceptance-Criteria.md",
      "# Criteria\n\n```gherkin\n# AC-0001-0001\n# Parent: US-0001-0001\nScenario: Order\n  Given a cart\n  When an order is placed\n  Then the order is accepted\n```\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/04_Business-Rules.md",
      "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/05_Examples.md",
      "# Examples\n\n| EX-ID | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/spec-0001/06_Test-Cases.md",
      "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n",
    );
    await put(
      ctx.root,
      ".qfai/spec/_policies/04_Business-Flow.md",
      "# Business Flow\n\n```mermaid\nflowchart LR\n  A[Cart] --> B[Order]\n```\n",
    );
    await put(
      ctx.root,
      ".qfai/evidence/migration-spec-to-story/plan.yaml",
      "flows:\n  - title: Order flow\n    from: _policies/04_Business-Flow.md\n    stories:\n      - id: US-0001-0001\nrules:\n  - id: BR-0001-0001\n    contract: api/orders.yaml\n",
    );
    const owner = {
      kind: "write" as const,
      step: 4 as const,
      target: path.join(ctx.root, ID_MAP_PATH),
    };
    const stage = writeStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    await writeFile(stage.payload, '{"version":1,"ids":');
    const captured = capture();
    expect(await runStep(4, [], { cwd: ctx.root, ...captured.io })).toBe(0);
    expect(JSON.parse(await readFile(path.join(ctx.root, ID_MAP_PATH), "utf8"))).toMatchObject({
      version: 1,
      ids: { "spec-0001": { "US-0001-0001": "US-0001-0001" } },
    });
    await expect(readFile(stage.marker)).rejects.toMatchObject({ code: "ENOENT" });
    expect(captured.output.join("")).toContain("id-map.json: write");
  });

  it("cleans a committed contract write stage and leaves the completed contract unchanged", async () => {
    const ctx = await context();
    const target = path.join(ctx.contractsDir, "business-rules.yaml");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "rules:\n  - new\n");
    const owner = { kind: "write" as const, step: 7 as const, target };
    const stage = writeStage(ctx, owner);
    await mkdir(stage.directory, { recursive: true });
    await writeFile(stage.marker, `${JSON.stringify(owner)}\n`);
    const recovery = await staleStageOperations(ctx, 7);
    expect(recovery.map((operation) => operation.kind)).toEqual(["cleanup-write-stage"]);
    const recoveringStep: MigrationStep = {
      number: 7,
      writeSet: ["contracts"],
      plan: () => Promise.resolve({ operations: recovery }),
    };
    expect(await executePlannedStep(recoveringStep, ctx, false, capture().io)).toBe(0);
    expect(await readFile(target, "utf8")).toBe("rules:\n  - new\n");
    await expect(readFile(stage.marker)).rejects.toMatchObject({ code: "ENOENT" });
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

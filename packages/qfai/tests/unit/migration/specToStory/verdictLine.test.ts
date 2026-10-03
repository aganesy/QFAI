import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../../../src/cli/commands/init.js";
import { defaultConfig } from "../../../../src/core/config.js";
import { moveStage, runStep } from "../../../../src/migration/specToStory/harness.js";
import { captureStdout } from "../../../helpers/stdout.js";
import {
  isMigrationReportAncestor,
  isMigrationReportPath,
  migrationReportFiles,
  readMigrationReport,
} from "../../../helpers/migrationReport.js";

const FIXTURE = path.resolve(__dirname, "../../../fixtures/migration-spec-to-story/old-layout");
const FOUND = "1.x layout found, migrating";
const DONE = "already migrated (id-map.json present)";
const SUMMARY_FOUND = "Summary: a 1.x layout was found, so the steps are migrating it.";
const ALREADY_DONE =
  "Already done: an earlier run migrated this project, and steps 1 to 10 have nothing left to do.";
const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

type Run = { code: number; output: string; errors: string };

function verdictNone(specsDir: string, value = specsDir): string {
  return `no 1.x layout found under ${specsDir} (paths.specsDir=${value})`;
}

function summaryNone(specsDir: string, value = specsDir): string {
  return `Summary: no 1.x layout was found under ${specsDir} (paths.specsDir=${value}). Check that this is where the specs live.`;
}

async function scratch(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-verdict-"));
  roots.push(root);
  return root;
}

async function stepIn(root: string, step: number, args: string[] = []): Promise<Run> {
  let output = "";
  let errors = "";
  const code = await runStep(step, args, {
    cwd: root,
    stdout: { write: (value: string) => (output += value) },
    stderr: { write: (value: string) => (errors += value) },
  });
  return { code, output, errors };
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

/** A project on the story tree with no ID map, its specs under `specsDir`. */
async function storyTree(specsDir: string, contractsDir: string, config = ""): Promise<string> {
  const root = await scratch();
  await put(
    root,
    "qfai.config.yaml",
    `paths:\n  specsDir: ${specsDir}\n  contractsDir: ${contractsDir}\n${config}`,
  );
  await put(root, `${specsDir}/01_policy/objective.md`, "# Objective\n");
  await mkdir(path.join(root, ...contractsDir.split("/")), { recursive: true });
  return root;
}

async function oldLayout(): Promise<string> {
  const root = await scratch();
  await cp(FIXTURE, root, { recursive: true });
  return root;
}

/** What every file under `root` holds, the report files aside. */
async function treeHash(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const target = path.join(directory, entry.name);
      const relative = path.relative(root, target).replaceAll(path.sep, "/");
      if (isMigrationReportPath(relative)) continue;
      if (!isMigrationReportAncestor(relative)) hash.update(relative);
      if (entry.isDirectory()) await visit(target);
      else hash.update(await readFile(target));
    }
  }
  await visit(root);
  return hash.digest("hex");
}

function opening(output: string): string[] {
  return output.split(/\r?\n/).slice(0, 3);
}

function lastLine(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .at(-1);
}

function summaries(output: string): string[] {
  return output.split(/\r?\n/).filter((line) => line.startsWith("Summary"));
}

function operationsOf(output: string): string[] {
  const body = /^## Operations\r?\n([\s\S]*?)(?=\r?\n## |$)/m.exec(output)?.[1] ?? "";
  return body.split(/\r?\n/).filter((line) => line.trim() !== "");
}

describe("the verdict line of migration steps 1 to 10", () => {
  // QFAI:EX-0004-0003-40
  it("opens each step on a story tree with no ID map with the none line, and keeps it in the report", async () => {
    const root = await storyTree(".qfai/spec", ".qfai/spec/03_contract");
    const before = await treeHash(root);
    for (let step = 1; step <= 10; step += 1) {
      for (const [kind, args] of [
        ["dry-run", ["--dry-run"]],
        ["run", []],
      ] as const) {
        const label = `step ${step} ${kind}`;
        const result = await stepIn(root, step, [...args]);
        expect(result.code, `${label}: ${result.errors}`).toBe(0);
        expect(opening(result.output), label).toEqual([
          verdictNone(".qfai/spec"),
          "",
          "## Operations",
        ]);
        expect(operationsOf(result.output), label).toEqual(["none"]);
        expect(summaries(result.output), label).toEqual(
          step === 10 ? [summaryNone(".qfai/spec")] : [],
        );
        if (step === 10) expect(lastLine(result.output), label).toBe(summaryNone(".qfai/spec"));
        const [reportFile] = await migrationReportFiles(root, kind, step);
        const kept = await readMigrationReport(root, reportFile ?? "");
        expect(kept.split(/\r?\n/)[0], label).toBe(verdictNone(".qfai/spec"));
        expect(kept.startsWith(result.output), label).toBe(true);
      }
    }
    expect(await treeHash(root)).toBe(before);
  });

  // QFAI:EX-0004-0003-41
  it("names the configured specs directory and never a 1.x pack elsewhere in the project", async () => {
    const root = await storyTree("docs/specs", "docs/contracts");
    await put(root, "other/specs/spec-0001/01_Requirements.md", "# Requirements\n");
    const before = await treeHash(root);
    for (let step = 1; step <= 10; step += 1) {
      const result = await stepIn(root, step);
      const label = `step ${step}`;
      expect(result.code, `${label}: ${result.errors}`).toBe(0);
      expect(result.output.split(/\r?\n/)[0], label).toBe(verdictNone("docs/specs"));
      expect(result.output + result.errors, label).not.toContain("other/specs");
      expect(result.output, label).not.toContain(DONE);
      expect(result.output, label).not.toContain(FOUND);
      if (step === 10) expect(lastLine(result.output), label).toBe(summaryNone("docs/specs"));
    }
    expect(await treeHash(root)).toBe(before);
  });

  // QFAI:EX-0004-0003-42
  it("opens step 1 on the old layout with the found line, in a dry run, a real run and a rerun", async () => {
    const root = await oldLayout();
    const dry = await stepIn(root, 1, ["--dry-run"]);
    const first = await stepIn(root, 1);
    const again = await stepIn(root, 1);
    for (const result of [dry, first, again]) {
      expect(result.code, result.errors).toBe(0);
      expect(opening(result.output)).toEqual([FOUND, "", "## Operations"]);
      expect(result.output).not.toContain(ALREADY_DONE);
    }
    expect(operationsOf(again.output)).toEqual(["none"]);
  });

  // QFAI:EX-0004-0003-43
  it("opens a resumed step 1 with the found line and leaves the tree of an uninterrupted run", async () => {
    const uninterrupted = await oldLayout();
    const partial = await oldLayout();
    await mkdir(path.join(partial, ".qfai/spec"), { recursive: true });
    await rename(
      path.join(partial, ".qfai/specs/_policies"),
      path.join(partial, ".qfai/spec/_policies"),
    );
    expect((await stepIn(uninterrupted, 1)).code).toBe(0);
    const dry = await stepIn(partial, 1, ["--dry-run"]);
    const real = await stepIn(partial, 1);
    for (const result of [dry, real]) {
      expect(result.code, result.errors).toBe(0);
      expect(opening(result.output)).toEqual([FOUND, "", "## Operations"]);
    }
    expect(await treeHash(partial)).toBe(await treeHash(uninterrupted));
  });

  // QFAI:EX-0004-0003-43
  it("opens a step that resumes an interrupted move with the found line, in a dry run and a real run", async () => {
    for (const step of [1, 3] as const) {
      const root = await storyTree(".qfai/spec", ".qfai/spec/03_contract");
      const source = path.join(root, ".qfai", "spec", "moved.md");
      const target = path.join(root, ".qfai", "spec", "01_policy", "moved.md");
      await writeFile(source, "# Moved\n", "utf8");
      await writeFile(target, "# Moved\n", "utf8");
      const owner = { step, source, target };
      const stage = moveStage(
        {
          root,
          config: structuredClone(defaultConfig),
          specsDir: path.join(root, ".qfai", "spec"),
          contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
        },
        owner,
      );
      await mkdir(stage.directory, { recursive: true });
      await writeFile(stage.marker, `${JSON.stringify(owner)}\n`, "utf8");
      const dry = await stepIn(root, step, ["--dry-run"]);
      const real = await stepIn(root, step);
      for (const [kind, result] of [
        ["dry run", dry],
        ["real run", real],
      ] as const) {
        const label = `step ${step} ${kind}`;
        expect(result.code, `${label}: ${result.errors}`).toBe(0);
        expect(opening(result.output), label).toEqual([FOUND, "", "## Operations"]);
        expect(result.output, label).toContain("moved.md");
      }
      await expect(readFile(source)).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  // QFAI:EX-0004-0003-45
  it("reads a retired configuration key as a trace of the old layout in steps 1 to 3", async () => {
    const root = await storyTree(
      ".qfai/spec",
      ".qfai/spec/03_contract",
      "validation:\n  traceability:\n    scMustHaveTest: true\n",
    );
    for (const step of [1, 2, 3]) {
      const result = await stepIn(root, step, ["--dry-run"]);
      expect(result.code, `step ${step}: ${result.errors}`).toBe(0);
      expect(result.output.split(/\r?\n/)[0], `step ${step}`).toBe(FOUND);
    }
  });

  // QFAI:EX-0004-0003-45
  it("reads a host link that names the old directory as the work of step 9 and so as a trace", async () => {
    const root = await storyTree(".qfai/spec", ".qfai/spec/03_contract");
    await put(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md", "# Skill\n");
    const link = path.join(root, ".claude/skills/qfai-sdd");
    await mkdir(path.dirname(link), { recursive: true });
    await symlink(
      path.relative(path.dirname(link), path.join(root, ".qfai/assistant/skills/qfai-sdd")),
      link,
      process.platform === "win32" ? "junction" : "dir",
    );
    const result = await stepIn(root, 9, ["--dry-run"]);
    expect(result.code, result.errors).toBe(0);
    expect(opening(result.output)).toEqual([FOUND, "", "## Operations"]);
    expect(operationsOf(result.output)).toEqual([
      expect.stringContaining(".claude/skills/qfai-sdd"),
    ]);
    expect(summaries(result.output)).toEqual([]);
  });

  // QFAI:EX-0004-0003-46
  it("prints neither a verdict line nor a closing line when a step refuses with exit 2", async () => {
    const unmigrated = await oldLayout();
    for (const step of [2, 10]) {
      const result = await stepIn(unmigrated, step);
      expect(result.code, `step ${step}`).toBe(2);
      expect(result.output, `step ${step}`).toBe("");
      expect(result.errors, `step ${step}`).toContain("Run step 1");
    }
    const afterStep3 = await oldLayout();
    for (const step of [1, 2, 3]) expect((await stepIn(afterStep3, step)).code).not.toBe(2);
    const five = await stepIn(afterStep3, 5);
    expect(five.code).toBe(2);
    expect(five.output).toBe("");
    expect(five.errors).toContain("Run step 4");
  });

  // QFAI:EX-0004-0003-47
  it("prints no verdict line and no summary from steps 11 and 12", async () => {
    const root = await scratch();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    for (const step of [11, 12]) {
      for (const args of [["--dry-run"], []]) {
        const label = `step ${step} ${args.join(" ")}`.trimEnd();
        const result = await stepIn(root, step, args);
        expect([0, 3], `${label}: ${result.errors}`).toContain(result.code);
        expect(result.output.split(/\r?\n/)[0], label).toBe("## Operations");
        if (step === 12) expect(result.output, label).toContain("## Files scanned\n- ");
        expect(summaries(result.output), label).toEqual([]);
        for (const verdict of [FOUND, DONE, "no 1.x layout found"]) {
          expect(result.output, label).not.toContain(verdict);
        }
        const [reportFile] = (
          await migrationReportFiles(root, args.length > 0 ? "dry-run" : "run", step)
        ).slice(-1);
        const kept = await readMigrationReport(root, reportFile ?? "");
        expect(kept.split(/\r?\n/)[0], label).toBe("## Operations");
      }
    }
  }, 120_000);

  // QFAI:EX-0004-0003-48
  it("writes an absolute paths.specsDir relative to the project root and names no absolute path", async () => {
    const root = await scratch();
    const absolute = path.join(root, "docs", "specs");
    await put(
      root,
      "qfai.config.yaml",
      `paths:\n  specsDir: ${JSON.stringify(absolute)}\n  contractsDir: docs/contracts\n`,
    );
    await put(root, "docs/specs/01_policy/objective.md", "# Objective\n");
    await mkdir(path.join(root, "docs/contracts"), { recursive: true });
    const result = await stepIn(root, 1, ["--dry-run"]);
    expect(result.code, result.errors).toBe(0);
    expect(result.output.split(/\r?\n/)[0]).toBe(verdictNone("docs/specs"));
    expect(result.output).not.toContain(root);
    expect(result.output).not.toContain(root.replaceAll("\\", "/"));
  });

  // QFAI:EX-0004-0003-49
  it("prints a summary from step 10 only, and the found one while the layout is being migrated", async () => {
    const root = await oldLayout();
    for (const pass of [1, 2]) {
      for (let step = 1; step <= 9; step += 1) {
        const result = await stepIn(root, step);
        expect(result.code, `pass ${pass} step ${step}: ${result.errors}`).not.toBe(2);
        expect(summaries(result.output), `pass ${pass} step ${step}`).toEqual([]);
      }
    }
    const dry = await stepIn(root, 10, ["--dry-run"]);
    const real = await stepIn(root, 10);
    for (const result of [dry, real]) {
      expect(result.code, result.errors).toBe(0);
      expect(result.output.split(/\r?\n/)[0]).toBe(FOUND);
      expect(lastLine(result.output)).toBe(SUMMARY_FOUND);
    }
  }, 120_000);
});

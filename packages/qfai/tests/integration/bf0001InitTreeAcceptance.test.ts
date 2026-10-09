/**
 * Acceptance of what `qfai init` does with the assistant tree and the story tree: the project
 * overlay it leaves alone, the migration helper for the retired instructions layout, the error it
 * reports for that layout, and the story-tree seed.
 *
 * Every case runs the real command against a temporary project and reads what it left on disk.
 */
import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { run } from "../../src/cli/main.js";
import { loadConfig, resolvePath } from "../../src/core/config.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { pathExists } from "../helpers/pathExists.js";
import { isRecord, useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-bf1-init-tree-");
const execFileAsync = promisify(execFile);

const LEGACY_DIR = [".qfai", "assistant", "instructions"];
const LAYERS = ["rule", "skill", "agent", "prompt"];
const RETIRED_LAYERS = ["constitution", "manifest", "catalog", "process"];
const SEEDS = [
  "decisions.md",
  "open-questions.md",
  "01_policy/glossary.md",
  "01_policy/constraint.md",
  "02_business-flow/business-flows.md",
  "03_contract/contracts.md",
];

type CliResult = { stdout: string; stderr: string; exitCode: number };

/** Runs `qfai <args>` the way the binary does and reports both streams and the exit code. */
async function qfai(dir: string, ...args: string[]): Promise<CliResult> {
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    let stdout = "";
    const stderr = await captureStderr(async () => {
      stdout = await captureStdout(() => run(args, dir));
    });
    return { stdout, stderr, exitCode: Number(process.exitCode ?? 0) };
  } finally {
    process.exitCode = previous;
  }
}

function init(dir: string, ...flags: string[]): Promise<CliResult> {
  return qfai(dir, "init", "--dir", dir, "--yes", ...flags);
}

const posix = (value: string): string => value.replace(/\\/g, "/");

/** Every path under `root`, with `/` separators; a link is listed and not followed. */
async function listPaths(root: string, relative = ""): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(path.join(root, ...relative.split("/")), { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const child = relative === "" ? entry.name : `${relative}/${entry.name}`;
    found.push(child);
    if (entry.isDirectory()) found.push(...(await listPaths(root, child)));
  }
  return found.sort();
}

async function writeLegacy(dir: string, files: Record<string, string>): Promise<string> {
  const legacy = path.join(dir, ...LEGACY_DIR);
  await mkdir(legacy, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    await writeFile(path.join(legacy, name), text, "utf-8");
  }
  return legacy;
}

const rulePath = (dir: string, name: string): string =>
  path.join(dir, ".qfai", "assistant", "rule", name);

const seedPath = (dir: string, seed: string): string =>
  path.join(dir, ".qfai", "spec", ...seed.split("/"));

describe("BF-0001 assistant tree on init", () => {
  // QFAI:EX-0001-0034-02
  it("leaves a rule overlay byte-identical under --force and writes no other overlay", async () => {
    const dir = await newTempDir();
    await init(dir);
    const overlays = async (): Promise<string[]> =>
      (await readdir(path.dirname(rulePath(dir, "x")))).filter((name) =>
        name.endsWith(".local.md"),
      );
    expect(await pathExists(rulePath(dir, "drift-protocol.md"))).toBe(true);
    expect(await overlays()).toEqual([]);

    await writeFile(rulePath(dir, "drift-protocol.local.md"), "project policy\r\nkept\n", "utf-8");
    const forced = await init(dir, "--force");

    expect(forced.exitCode).toBe(0);
    expect(await readFile(rulePath(dir, "drift-protocol.local.md"), "utf-8")).toBe(
      "project policy\r\nkept\n",
    );
    expect(await overlays()).toEqual(["drift-protocol.local.md"]);
  });
});

describe("BF-0001 --upgrade-assistant-tree", () => {
  // QFAI:AC-0001-0035-01
  // QFAI:EX-0001-0035-01
  it("copies each relocation-table file into the four layers and changes nothing else", async () => {
    const dir = await newTempDir();
    const legacyFiles = {
      "constitution.md": "legacy constitution\n",
      "quality.md": "legacy quality\n",
      "requirements-decomposition.md": "legacy decomposition\n",
    };
    const legacy = await writeLegacy(dir, legacyFiles);

    const upgraded = await init(dir, "--upgrade-assistant-tree");

    expect(upgraded.exitCode).toBe(0);
    expect(await readFile(rulePath(dir, "constitution.md"), "utf-8")).toBe("legacy constitution\n");
    expect(await readFile(rulePath(dir, "quality.md"), "utf-8")).toBe("legacy quality\n");
    const decomposition = path.join(
      dir,
      ...".qfai/assistant/skill/qfai-sdd/references/requirements-decomposition.md".split("/"),
    );
    expect(await readFile(decomposition, "utf-8")).toBe("legacy decomposition\n");
    for (const [name, text] of Object.entries(legacyFiles)) {
      expect(await readFile(path.join(legacy, name), "utf-8")).toBe(text);
    }
    for (const layer of LAYERS) {
      expect((await lstat(path.join(dir, ".qfai", "assistant", layer))).isDirectory()).toBe(true);
    }
    for (const retired of RETIRED_LAYERS) {
      expect(await pathExists(path.join(dir, ".qfai", "assistant", retired))).toBe(false);
    }

    const plain = await newTempDir();
    await init(plain);
    const written = (await listPaths(dir)).filter(
      (entry) => !entry.startsWith(".qfai/assistant/instructions"),
    );
    expect(written).toEqual(await listPaths(plain));
  });

  // QFAI:AC-0001-0035-01
  // QFAI:EX-0001-0035-02
  it("copies neither the adopter-owned documents nor a file the table does not name", async () => {
    const dir = await newTempDir();
    const legacyFiles = {
      "product.md": "legacy product\n",
      "manifest.md": "legacy manifest\n",
      "tech.md": "legacy tech\n",
      "structure.md": "legacy structure\n",
      "unrecognised.md": "legacy unrecognised\n",
      "quality.md": "legacy quality\n",
    };
    const legacy = await writeLegacy(dir, legacyFiles);

    const upgraded = await init(dir, "--upgrade-assistant-tree");

    expect(upgraded.exitCode).toBe(0);
    for (const [name, text] of Object.entries(legacyFiles)) {
      expect(await readFile(path.join(legacy, name), "utf-8")).toBe(text);
    }
    const assistant = path.join(dir, ".qfai", "assistant");
    const bodies = new Set(Object.values(legacyFiles));
    const copies: string[] = [];
    for (const entry of await listPaths(assistant)) {
      if (entry.startsWith("instructions")) continue;
      const target = path.join(assistant, ...entry.split("/"));
      if (!(await lstat(target)).isFile()) continue;
      if (bodies.has(await readFile(target, "utf-8"))) copies.push(entry);
    }
    expect(copies).toEqual(["rule/quality.md"]);
    expect(upgraded.stdout).not.toContain("unrecognised.md");
    expect(upgraded.stderr).not.toContain("unrecognised.md");
  });

  // QFAI:AC-0001-0035-01
  // QFAI:EX-0001-0035-03
  it("reports a project already on the four layers as preserved, not as an error", async () => {
    const dir = await newTempDir();
    await init(dir);
    await writeFile(rulePath(dir, "quality.md"), "project quality\n", "utf-8");
    const before = await listPaths(dir);

    const upgraded = await init(dir, "--upgrade-assistant-tree");

    expect(upgraded.exitCode).toBe(0);
    expect(upgraded.stdout).toContain("W-USER-EDIT-PRESERVED");
    expect(upgraded.stderr).toBe("");
    expect(await readFile(rulePath(dir, "quality.md"), "utf-8")).toBe("project quality\n");
    expect(await listPaths(dir)).toEqual(before);
  });

  // QFAI:AC-0001-0035-02
  // QFAI:EX-0001-0035-04
  it("keeps an edited destination, keeps the legacy file and names the destination", async () => {
    const dir = await newTempDir();
    await init(dir);
    await writeFile(rulePath(dir, "quality.md"), "adopter edits\n", "utf-8");
    const legacy = await writeLegacy(dir, { "quality.md": "legacy quality\n" });

    const upgraded = await init(dir, "--upgrade-assistant-tree");

    expect(upgraded.exitCode).toBe(0);
    expect(await readFile(rulePath(dir, "quality.md"), "utf-8")).toBe("adopter edits\n");
    expect(await readFile(path.join(legacy, "quality.md"), "utf-8")).toBe("legacy quality\n");
    const notes = upgraded.stdout
      .split("\n")
      .filter((line) => line.includes("W-USER-EDIT-PRESERVED"));
    expect(notes.map(posix).some((line) => line.includes(".qfai/assistant/rule/quality.md"))).toBe(
      true,
    );
  });
});

describe("BF-0001 retired instructions layout", () => {
  // QFAI:AC-0001-0037-01
  // QFAI:EX-0001-0037-01
  it("keeps the legacy files and reports an error on stderr without stopping init", async () => {
    const dir = await newTempDir();
    const legacy = await writeLegacy(dir, {
      "quality.md": "legacy quality\n",
      "unrecognised.md": "legacy unrecognised\n",
    });

    const result = await init(dir);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("QFAI-DEPRECATED-001");
    expect(result.stdout).not.toContain("QFAI-DEPRECATED-001");
    expect(await readFile(path.join(legacy, "quality.md"), "utf-8")).toBe("legacy quality\n");
    expect(await readFile(path.join(legacy, "unrecognised.md"), "utf-8")).toBe(
      "legacy unrecognised\n",
    );
    expect((await readdir(legacy)).sort()).toEqual(["quality.md", "unrecognised.md"]);
    expect(await pathExists(seedPath(dir, "decisions.md"))).toBe(true);
    expect(result.stdout).toContain("qfai init: done");
  });

  // QFAI:AC-0001-0037-02
  // QFAI:EX-0001-0037-02
  it("names the sunset release and the migration command and no longer calls it read-compatible", async () => {
    const dir = await newTempDir();
    await writeLegacy(dir, { "quality.md": "legacy quality\n" });

    const { stderr } = await init(dir);

    const finding = stderr.split("\n").find((line) => line.includes("QFAI-DEPRECATED-001")) ?? "";
    expect(finding).toContain("past the announced sunset (v1.10.0)");
    expect(finding).toContain("`qfai init --upgrade-assistant-tree`");
    expect(finding).not.toMatch(/read-compatible/i);
  });
});

describe("BF-0001 story-tree seed", () => {
  // QFAI:AC-0001-0038-01
  it("seeds empty registers, the shared documents and the four contract directories", async () => {
    const dir = await newTempDir();

    const result = await init(dir);

    expect(result.exitCode).toBe(0);
    for (const register of ["decisions.md", "open-questions.md"]) {
      const rows = (await readFile(seedPath(dir, register), "utf-8"))
        .split("\n")
        .filter((line) => line.startsWith("|"));
      expect(rows, `${register} holds a header row and its rule line`).toHaveLength(2);
      expect(rows[1]).toMatch(/^\|(\s*:?-+:?\s*\|)+$/);
    }
    for (const seed of SEEDS) {
      expect((await lstat(seedPath(dir, seed))).isFile(), seed).toBe(true);
    }
    for (const kind of ["api", "db", "ui", "cli"]) {
      expect((await lstat(seedPath(dir, `03_contract/${kind}`))).isDirectory(), kind).toBe(true);
    }
    expect(await readdir(seedPath(dir, "02_business-flow"))).toEqual(["business-flows.md"]);
    expect(await pathExists(path.join(dir, ".qfai", "specs"))).toBe(false);
    expect(await pathExists(path.join(dir, ".qfai", "contracts"))).toBe(false);

    const checker = path.resolve(getInitAssetsDir(), "..", "scripts", "check-mdschema.mjs");
    const files = SEEDS.map((seed) => `.qfai/spec/${seed}`);
    const { stdout } = await execFileAsync(
      process.execPath,
      [checker, "--root", dir, "--scope", "files", ...files],
      { cwd: dir },
    );
    expect(stdout).toContain(`${SEEDS.length} file(s) conform`);

    const validated = await qfai(dir, "validate", "--root", dir, "--fail-on", "error");
    expect(validated.exitCode).toBe(0);
  });

  // QFAI:AC-0001-0038-02
  it("rewrites no existing seed on init or --force and writes only the deleted one", async () => {
    const dir = await newTempDir();
    await init(dir);
    const deleted = "03_contract/contracts.md";
    const edited = new Map<string, string>();
    for (const seed of SEEDS.filter((name) => name !== deleted)) {
      const text = `${await readFile(seedPath(dir, seed), "utf-8")}\nProject edit to ${seed}.\n`;
      await writeFile(seedPath(dir, seed), text, "utf-8");
      edited.set(seed, text);
    }

    for (const flags of [[], ["--force"]]) {
      await rm(seedPath(dir, deleted), { force: true });
      const result = await init(dir, ...flags);
      expect(result.exitCode).toBe(0);
      for (const [seed, text] of edited) {
        expect(await readFile(seedPath(dir, seed), "utf-8"), seed).toBe(text);
      }
      expect(await pathExists(seedPath(dir, deleted))).toBe(true);
    }
  });

  // QFAI:AC-0001-0038-03
  it("writes the story-tree paths and resolves an omitted key to the same path", async () => {
    const dir = await newTempDir();
    await init(dir);

    const written = await readFile(path.join(dir, "qfai.config.yaml"), "utf-8");
    expect(written).toContain("specsDir: .qfai/spec\n");
    expect(written).toContain("contractsDir: .qfai/spec/03_contract\n");
    const loaded = (await loadConfig(dir)).config;

    const bare = await newTempDir();
    await writeFile(path.join(bare, "qfai.config.yaml"), "validation:\n  failOn: error\n", "utf-8");
    const omitted = (await loadConfig(bare)).config;

    expect(resolvePath(dir, loaded, "specsDir")).toBe(path.join(dir, ".qfai", "spec"));
    expect(resolvePath(dir, loaded, "contractsDir")).toBe(
      path.join(dir, ".qfai", "spec", "03_contract"),
    );
    expect(resolvePath(bare, omitted, "specsDir")).toBe(path.join(bare, ".qfai", "spec"));
    expect(resolvePath(bare, omitted, "contractsDir")).toBe(
      path.join(bare, ".qfai", "spec", "03_contract"),
    );
  });

  // QFAI:AC-0001-0038-04
  it.each([
    ["a spec pack", ".qfai/specs/spec-0001", "spec-0001"],
    ["a policies directory", ".qfai/specs/_policies", "_policies"],
    ["a contracts directory", ".qfai/contracts", path.join(".qfai", "contracts")],
  ])("leaves the spec tree alone when it finds %s", async (_label, existing, named) => {
    const dir = await newTempDir();
    await mkdir(path.join(dir, ...existing.split("/")), { recursive: true });
    await writeFile(
      path.join(dir, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n",
      "utf-8",
    );

    const result = await init(dir);

    expect(result.exitCode).toBe(0);
    expect(await pathExists(path.join(dir, ".qfai", "spec"))).toBe(false);
    const skill = path.join(dir, ".qfai", "assistant", "skill", "qfai-migration-v1-to-v2");
    expect(await pathExists(path.join(skill, "SKILL.md"))).toBe(true);
    const hostLink = path.join(dir, ".claude", "skills", "qfai-migration-v1-to-v2");
    expect((await lstat(hostLink)).isSymbolicLink()).toBe(true);
    const lines = result.stdout
      .split("\n")
      .filter((line) => line.includes("migrate with /qfai-migration-v1-to-v2"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(named);

    const plain = await newTempDir();
    await init(plain);
    const ownTree = (entry: string): boolean =>
      entry.startsWith(".qfai/spec") || entry.startsWith(".qfai/contracts");
    const kept = (await listPaths(dir)).filter((entry) => !ownTree(entry));
    expect(kept).toEqual((await listPaths(plain)).filter((entry) => !ownTree(entry)));
  });

  // QFAI:AC-0001-0038-05
  // QFAI:EX-0001-0038-08
  it("seeds the policy and tech documents and none of the catalog documents", async () => {
    const dir = await newTempDir();

    await init(dir);

    for (const seed of [
      "01_policy/objective.md",
      "01_policy/initiative.md",
      "01_policy/principle.md",
      "03_contract/tech.md",
    ]) {
      expect((await lstat(seedPath(dir, seed))).isFile(), seed).toBe(true);
    }
    const catalog = path.join(dir, ".qfai", "assistant", "catalog");
    for (const name of ["product.md", "manifest.md", "tech.md", "structure.md"]) {
      expect(await pathExists(path.join(catalog, name)), name).toBe(false);
    }
    expect(await pathExists(catalog)).toBe(false);
  });
});

describe("BF-0001 unseeded assistant layer", () => {
  // QFAI:AC-0001-0046-02
  // QFAI:EX-0001-0046-02
  it("reports a layer that is not seeded as an info finding that fails no gate", async () => {
    const dir = await newTempDir();
    await init(dir);
    await rm(path.join(dir, ".qfai", "assistant", "prompt"), { recursive: true, force: true });

    const validated = await qfai(
      dir,
      "validate",
      "--root",
      dir,
      "--profile",
      "sdd",
      "--fail-on",
      "warning",
    );

    expect(validated.exitCode).toBe(0);
    const report: unknown = JSON.parse(
      await readFile(path.join(dir, ".qfai", "report", "validate.json"), "utf-8"),
    );
    if (!isRecord(report) || !isRecord(report.counts) || !Array.isArray(report.issues)) {
      throw new Error("validate.json has no counts and issues");
    }
    const counts = report.counts;
    expect(Number(counts.info)).toBeGreaterThanOrEqual(1);
    expect(counts.warning).toBe(0);
    expect(counts.error).toBe(0);
    const unseeded = report.issues.filter(
      (found) => isRecord(found) && found.code === "QFAI-ASSISTANT-002",
    );
    expect(unseeded).toHaveLength(1);
    expect(unseeded[0]).toMatchObject({
      severity: "info",
      file: ".qfai/assistant/prompt/",
    });
  });
});

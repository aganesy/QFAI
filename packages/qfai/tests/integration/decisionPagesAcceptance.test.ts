import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { readStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateStaleTerms } from "../../src/core/validators/staleTerms.js";
import { validateStoryTreeObligationsModel } from "../../src/core/validators/storyTreeObligations.js";
import { validateStoryTreeStructureModel } from "../../src/core/validators/storyTreeStructure.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";
import { executePlannedStep } from "../../src/migration/specToStory/harness.js";
import { step02 } from "../../src/migration/specToStory/step02MergeTables.js";
import { removeTempTree } from "../helpers/tempTree.js";

let root: string;
const specs = "docs/spec";
const ledger = `${specs}/decisions.md`;
const page = `${specs}/decisions/page-0001.md`;
const glossary = `${specs}/01_policy/glossary.md`;
const header = "# Decisions\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n";
const row = (id: string, content = "Choice", approach = "Keep"): string =>
  `| ${id} | ${content} | ${approach} |\n`;
const paged = (tail = ""): string =>
  header.replace("## Decisions", "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions") +
  tail;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function config() {
  const result = structuredClone(defaultConfig);
  result.paths.specsDir = specs;
  result.paths.contractsDir = `${specs}/03_contract`;
  result.baseBranch = "main";
  return result;
}

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text);
}

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function commit(message: string): void {
  git("add", ".");
  git("commit", "-m", message);
}

function gitRepo(): void {
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
  git("config", "core.autocrlf", "false");
}

async function migrate() {
  let output = "";
  let error = "";
  const code = await executePlannedStep(
    step02,
    {
      root,
      specsDir: path.join(root, specs),
      contractsDir: path.join(root, specs, "03_contract"),
      config: config(),
    },
    false,
    {
      stdout: {
        write: (text) => {
          output += text;
        },
      },
      stderr: {
        write: (text) => {
          error += text;
        },
      },
    },
  );
  return { code, output, error };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "qfai-decision-pages-"));
  await put(
    "qfai.config.yaml",
    `paths:\n  specsDir: ${specs}\n  contractsDir: ${specs}/03_contract\n`,
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  await removeTempTree(root);
});

describe("decision pages through supported consumers", () => {
  // QFAI:AC-0001-0053-09
  // QFAI:EX-0001-0053-25
  it("applies only the AC exception, resolves a cross-page Supersedes citation and excludes register stale terms", async () => {
    const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0053`;
    await put(`${specs}/02_business-flow/business-flow-0001/business-flow.md`, "# BF-0001: Flow\n");
    await put(`${story}/01_User-story.md`, "# US-0001-0053: Story\n");
    await put(
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0053-01\nScenario: First\nGiven a tree\n```\n",
    );
    await put(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0053-01 | AC-0001-0053-01 | in | out |\n",
    );
    await put(
      ledger,
      paged(row("DEC-20261105093000", "Current retiredword", "Supersedes DEC-0003")),
    );
    await put(page, header + row("DEC-0001", "Test exception: AC-0001-0053-01"));
    const second = `${specs}/decisions/page-0002.md`;
    await put(second, header + row("DEC-0003", "Rejected retiredword"));
    await put(
      ledger,
      (await fs.readFile(path.join(root, ledger), "utf8")).replace(
        "- decisions/page-0001.md",
        "- decisions/page-0001.md\n- decisions/page-0002.md",
      ),
    );
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows.map(({ id }) => id)).toEqual([
      "DEC-0001",
      "DEC-0003",
      "DEC-20261105093000",
    ]);
    const owed = (profile: "atdd" | "tdd") =>
      validateStoryTreeObligationsModel(tree, [], profile)
        .filter((finding) => finding.code === "QFAI-STORY-006")
        .flatMap((finding) => finding.refs ?? []);
    expect(owed("atdd")).toContain("BF-0001");
    expect(owed("atdd")).not.toContain("AC-0001-0053-01");
    expect(owed("tdd")).toContain("EX-0001-0053-01");
    expect(
      validateStoryTreeStructureModel(tree).filter(({ code }) => code === "QFAI-STORY-003"),
    ).toEqual([]);
    await put(glossary, "# Glossary\nretiredword\n");
    const staleConfig = config();
    staleConfig.validation.staleTerms = ["retiredword"];
    expect((await validateStaleTerms(root, staleConfig)).map((finding) => finding.file)).toEqual([
      glossary,
    ]);
  });

  // QFAI:EX-0001-0053-27
  it("retains an unreadable listed page failure without a partial exception set", async () => {
    await put(ledger, paged(row("DEC-0001", "Test exception: AC-0001-0053-01")));
    await put(page, header + row("DEC-0090"));
    const originalRead = fs.readFile;
    vi.spyOn(fs, "readFile").mockImplementation((...args: Parameters<typeof fs.readFile>) => {
      if (String(args[0]) === path.join(root, page))
        return Promise.reject(
          Object.assign(new Error("controlled page read denial"), { code: "EACCES" }),
        );
      return originalRead(...args);
    });
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows ?? []).toEqual([]);
    expect(JSON.stringify(tree)).toMatch(
      /page-0001.*(?:EACCES|denial|unreadable)|(?:EACCES|denial|unreadable).*page-0001/i,
    );
  });

  // QFAI:EX-0001-0053-29
  it("refuses a linked page component before reading its outside target", async () => {
    await put(ledger, paged());
    await put("outside/page-0001.md", header + row("DEC-0090"));
    await fs.symlink(
      path.join(root, "outside"),
      path.join(root, specs, "decisions"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const reads = vi.spyOn(fs, "readFile");
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows ?? []).toEqual([]);
    expect(JSON.stringify(tree)).toMatch(/link|symlink|junction/i);
    expect(reads.mock.calls.map((call) => String(call[0]))).not.toContain(path.join(root, page));
    expect(await fs.readFile(path.join(root, "outside/page-0001.md"), "utf8")).toBe(
      header + row("DEC-0090"),
    );
  });

  // QFAI:EX-0001-0011-17
  it("checks the root and direct page through one manifest entry each and their paired templates", async () => {
    const templates = path.join(
      packageRoot,
      "assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec",
    );
    await put(ledger, paged());
    await put(page, await fs.readFile(path.join(templates, "decisions/page-NNNN.md"), "utf8"));
    const legacy = await fs.readFile(path.join(templates, "decisions.md"), "utf8");
    const script = path.join(packageRoot, "assets/scripts/check-mdschema.mjs");
    const result = spawnSync(
      process.execPath,
      [script, "--root", root, "--scope", "files", ledger, page],
      {
        cwd: packageRoot,
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    await put(ledger, legacy);
    await fs.rm(path.join(root, page));
    const rootOnly = spawnSync(
      process.execPath,
      [script, "--root", root, "--scope", "files", ledger],
      {
        cwd: packageRoot,
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(rootOnly.status, rootOnly.stdout + rootOnly.stderr).toBe(0);
  });

  // QFAI:EX-0001-0011-18
  it("reports every physical document with extra sections, paragraph or table columns", async () => {
    const bad: [string, string][] = [
      [ledger, paged() + "\n## Extra\n"],
      [`${specs}/decisions/page-0001.md`, header + "\n## Extra\n"],
      [`${specs}/decisions/page-0002.md`, paged()],
      [`${specs}/decisions/page-0003.md`, header + "A paragraph\n"],
      [
        `${specs}/decisions/page-0004.md`,
        header
          .replace("| Approach |", "| Approach | Fourth |")
          .replace("| --- | --- | --- |", "| --- | --- | --- | --- |"),
      ],
      [
        `${specs}/decisions/page-0005.md`,
        header.replace("| ID | Content", "| stray |\n| ID | Content"),
      ],
    ];
    for (const [file, text] of bad) await put(file, text);
    const result = spawnSync(
      process.execPath,
      [
        path.join(packageRoot, "assets/scripts/check-mdschema.mjs"),
        "--root",
        root,
        "--scope",
        "files",
        ...bad.map(([file]) => file),
      ],
      {
        cwd: packageRoot,
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    // The schema sections name a file by its absolute path, with `\` between segments on Windows.
    const reported = (result.stdout + result.stderr).replaceAll(path.sep, "/");
    for (const [file] of bad) expect(reported).toContain(file);
  });

  // QFAI:AC-0001-0054-09
  // QFAI:EX-0001-0054-19
  it.each(["id", "content", "approach"])(
    "does not let a root change request excuse a page's %s rewrite",
    async (cell) => {
      gitRepo();
      const original = row("DEC-0001", "Original");
      await put(ledger, header + original);
      commit("base row");
      git("checkout", "-b", "topic");
      await put(ledger, paged(row("DEC-20261105093000", `Change request: ${ledger}`)));
      const rewritten =
        cell === "id"
          ? original.replace("DEC-0001", "DEC-20261105093001")
          : cell === "content"
            ? original.replace("Original", "Rewritten")
            : original.replace("Keep", "Rewritten approach");
      await put(page, header + rewritten);
      commit("root-only authority cannot repair page history");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings).toContainEqual(
        expect.objectContaining({ code: "QFAI-DRIFT-001", file: page }),
      );
      expect(findings).toContainEqual(
        expect.objectContaining({
          code: "QFAI-STORY-010",
          message: expect.stringMatching(new RegExp(`DEC-0001.*${cell}`, "i")),
        }),
      );
    },
  );

  // QFAI:EX-0001-0054-19
  it("reports an edit of the root's Decision pages list as an upstream edit of decisions.md", async () => {
    gitRepo();
    await put(ledger, paged());
    await put(page, header + row("DEC-0001"));
    commit("base list");
    git("checkout", "-b", "topic");
    const second = `${specs}/decisions/page-0002.md`;
    await put(
      ledger,
      paged().replace(
        "- decisions/page-0001.md",
        "- decisions/page-0001.md\n- decisions/page-0002.md",
      ),
    );
    await put(second, header + row("DEC-20261105093000"));
    commit("list a new page");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.filter(({ code }) => code === "QFAI-DRIFT-001").map(({ file }) => file),
    ).toEqual(expect.arrayContaining([ledger, second]));
    expect(findings.filter(({ code }) => code === "QFAI-STORY-010")).toEqual([]);
  });

  // QFAI:EX-0001-0054-20
  it.each([
    ["head", "missing"],
    ["base", "missing"],
    ["head", "malformed"],
    ["base", "malformed"],
  ])("reports the %s %s page instead of applying a missing-base exemption", async (side, fault) => {
    gitRepo();
    const malformed = "| DEC-0001 | Invalid | Keep | UNKNOWN |\n";
    await put(ledger, side === "base" ? paged() : header);
    if (side === "base" && fault === "malformed") await put(page, header + malformed);
    await put(glossary, "# Original\n");
    commit("base register");
    git("checkout", "-b", "topic");
    await put(ledger, paged(row("DEC-20261105093000", `Change request: ${glossary}`)));
    if (side === "base") await put(page, header);
    if (side === "head" && fault === "malformed") await put(page, header + malformed);
    await put(glossary, "# Changed\n");
    commit("head register");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some(
        (finding) =>
          /page-0001/.test(JSON.stringify(finding)) &&
          /missing|read|absent|register|cells|invalid/i.test(finding.message),
      ),
    ).toBe(true);
  });

  // QFAI:EX-0004-0005-12
  it("reruns migration after the highest timestamp ID a page holds and reuses historical origins", async () => {
    const source = `${specs}/_policies/08_Decisions.md`;
    const historical = header + row("DEC-20261101090000", `${source}#DR-0001: First`);
    await put(ledger, paged());
    await put(page, historical);
    await put(
      source,
      "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n\n### DR-0002: Second\n\n- Status: accepted\n",
    );
    const result = await migrate();
    expect(result.code, result.error).toBe(0);
    expect(await fs.readFile(path.join(root, page), "utf8")).toBe(historical);
    const tree = await readStoryTreeModel(root, config());
    const ids = tree.decisions?.rows.map(({ id }) => id) ?? [];
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe("DEC-20261101090000");
    expect(ids[1] ?? "").toMatch(/^DEC-\d{14}$/u);
    expect((ids[1] ?? "") > "DEC-20261101090000").toBe(true);
    expect(
      tree.decisions?.rows.filter(({ content }) => content.includes("#DR-0001:")),
    ).toHaveLength(1);
    expect(tree.decisions?.rows.at(-1)?.content).toContain("#DR-0002: Second");
    const rootBeforeRerun = await fs.readFile(path.join(root, ledger));
    expect((await migrate()).code).toBe(0);
    expect(await fs.readFile(path.join(root, ledger))).toEqual(rootBeforeRerun);
    expect(await fs.readFile(path.join(root, page), "utf8")).toBe(historical);
  });

  // QFAI:EX-0004-0005-13
  it("stops migration before appending or consuming origins when a listed page is missing", async () => {
    const original = paged(row("DEC-0001"));
    const source = `${specs}/_policies/08_Decisions.md`;
    const rawSource = "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n";
    await put(ledger, original);
    await put(source, rawSource);
    const result = await migrate();
    expect(result.code).toBe(2);
    expect(result.error).toMatch(/page-0001/);
    expect(await fs.readFile(path.join(root, ledger), "utf8")).toBe(original);
    expect(await fs.readFile(path.join(root, source), "utf8")).toBe(rawSource);
  });
  // QFAI:EX-0004-0005-13
  it("retains an unreadable historical page and source origin without appending during migration", async () => {
    const original = paged(row("DEC-0001"));
    const historical = header + row("DEC-0090");
    const source = `${specs}/_policies/08_Decisions.md`;
    const rawSource = "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n";
    await put(ledger, original);
    await put(page, historical);
    await put(source, rawSource);
    const originalRead = fs.readFile;
    vi.spyOn(fs, "readFile").mockImplementation((...args: Parameters<typeof fs.readFile>) => {
      if (String(args[0]) === path.join(root, page))
        return Promise.reject(
          Object.assign(new Error("controlled migration page denial"), { code: "EACCES" }),
        );
      return originalRead(...args);
    });
    const result = await migrate();
    vi.restoreAllMocks();
    expect(result.code).toBe(2);
    expect(result.error).toMatch(/page-0001/);
    expect(result.error).toMatch(/EACCES|denial|read/i);
    expect(await fs.readFile(path.join(root, ledger), "utf8")).toBe(original);
    expect(await fs.readFile(path.join(root, page), "utf8")).toBe(historical);
    expect(await fs.readFile(path.join(root, source), "utf8")).toBe(rawSource);
  });
});

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import * as decisionRenumber from "../../src/core/storyTree/renumberDecision.js";
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
const header =
  "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
const row = (id: string, content = "Choice", status = "DONE", approach = "Keep"): string =>
  `| ${id} | ${content} | ${approach} | ${status} |\n`;
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
  it("applies only the DONE AC exception, resolves a cross-page successor and excludes register stale terms", async () => {
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
    await put(ledger, paged(row("DEC-0004", "Current retiredword")));
    await put(
      page,
      header +
        row("DEC-0001", "Test exception: AC-0001-0053-01") +
        row("DEC-0002", "Rejected retiredword", "SUPERSEDED (by DEC-0004)"),
    );
    const second = `${specs}/decisions/page-0002.md`;
    await put(second, header + row("DEC-0003", "Test exception: EX-0001-0053-01", "TODO"));
    await put(
      ledger,
      (await fs.readFile(path.join(root, ledger), "utf8")).replace(
        "- decisions/page-0001.md",
        "- decisions/page-0001.md\n- decisions/page-0002.md",
      ),
    );
    const tree = await readStoryTreeModel(root, config());
    const owed = (profile: "atdd" | "tdd") =>
      validateStoryTreeObligationsModel(tree, [], profile)
        .filter((finding) => finding.code === "QFAI-STORY-006")
        .flatMap((finding) => finding.refs ?? []);
    expect(owed("atdd")).toContain("BF-0001");
    expect(owed("atdd")).not.toContain("AC-0001-0053-01");
    expect(owed("tdd")).toContain("EX-0001-0053-01");
    expect(
      validateStoryTreeStructureModel(tree).filter((finding) =>
        finding.message.includes("superseded by"),
      ),
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
      [`${specs}/decisions/page-0004.md`, header.replace("| Status |", "| Status | Fifth |")],
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
    for (const [file] of bad) expect(result.stdout + result.stderr).toContain(file);
  });

  // QFAI:AC-0001-0054-09
  // QFAI:EX-0001-0054-17
  it.each(["DONE", "WIP", "WIP to DONE"])(
    "keeps inherited %s permission semantics across physical relocation",
    async (state) => {
      gitRepo();
      const beforeStatus = state === "DONE" ? "DONE" : "WIP";
      const request = row("DEC-0001", `Change request: ${glossary}`, beforeStatus);
      await put(ledger, header + request);
      await put(glossary, "# Original\n");
      commit("base request");
      git("checkout", "-b", "topic");
      await put(ledger, paged());
      await put(
        page,
        header + (state === "WIP to DONE" ? request.replace("| WIP |", "| DONE |") : request),
      );
      await put(glossary, "# Changed\n");
      commit("move inherited request and edit its exact path");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(
        findings.some((finding) => finding.code === "QFAI-DRIFT-001" && finding.file === glossary),
      ).toBe(state === "DONE");
      expect(findings.filter((finding) => finding.code === "QFAI-STORY-010")).toEqual([]);
    },
  );

  // QFAI:EX-0001-0054-17
  // QFAI:EX-0001-0054-19
  it.each(["root", "page"])(
    "exempts a CR Status-only update in the %s without granting broader paths",
    async (location) => {
      gitRepo();
      const request = row("DEC-0001", `Change request: ${glossary}`, "WIP");
      await put(ledger, location === "root" ? header + request : paged());
      if (location === "page") await put(page, header + request);
      commit("in-force request");
      git("checkout", "-b", "topic");
      const file = location === "root" ? ledger : page;
      await put(file, header + request.replace("| WIP |", "| DONE |"));
      commit("only the CR status changed");
      const findings = await validateStoryTreeDrift(root, config(), "drift");
      expect(findings.filter((finding) => finding.code === "QFAI-STORY-010")).toEqual([]);
      expect(findings.filter((finding) => finding.code === "QFAI-DRIFT-001")).toEqual([]);
    },
  );

  // QFAI:EX-0001-0054-18
  // QFAI:EX-0001-0008-28
  it.each(["root to page", "page to root"])(
    "rejects inherited renumber ownership after %s",
    async (direction) => {
      gitRepo();
      const inherited = row("DEC-0001");
      await put(ledger, direction === "root to page" ? header + inherited : paged());
      if (direction === "page to root") await put(page, header + inherited);
      commit("inherited decision");
      git("checkout", "-b", "topic");
      await put(ledger, direction === "root to page" ? paged() : header + inherited);
      if (direction === "root to page") await put(page, header + inherited);
      else await fs.rm(path.join(root, page));
      commit("different storage same inherited row");
      const candidates = direction === "root to page" ? [ledger, page] : [ledger];
      const before = await Promise.all(
        candidates.map((file) => fs.readFile(path.join(root, file))),
      );
      await expect(
        decisionRenumber.buildDecisionRenumberPlan({
          root,
          specsDir: specs,
          from: "DEC-0001",
          to: "DEC-0002",
          base: "main",
        }),
      ).rejects.toThrow(/inherited|ancestor|branch-added/i);
      expect(
        await Promise.all(candidates.map((file) => fs.readFile(path.join(root, file)))),
      ).toEqual(before);
    },
  );

  // QFAI:EX-0001-0054-19
  it.each(["id", "content", "approach"])(
    "does not let root-only authority cover a new page or excuse its %s rewrite",
    async (cell) => {
      gitRepo();
      const original = row("DEC-0001", "Original");
      await put(ledger, header + original);
      commit("base row");
      git("checkout", "-b", "topic");
      await put(ledger, paged(row("DEC-0002", `Change request: ${ledger}`, "WIP")));
      const rewritten =
        cell === "id"
          ? original.replace("DEC-0001", "DEC-0009")
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
          file: page,
          message: expect.stringMatching(new RegExp(`DEC-0001.*${cell}`, "i")),
        }),
      );
    },
  );

  // QFAI:EX-0001-0054-20
  it.each([
    ["head", "missing"],
    ["base", "missing"],
    ["head", "malformed"],
    ["base", "malformed"],
  ])("reports the %s %s page instead of applying a missing-base exemption", async (side, fault) => {
    gitRepo();
    await put(ledger, side === "base" ? paged() : header);
    if (side === "base" && fault === "malformed")
      await put(page, header + row("DEC-0001", "Invalid", "UNKNOWN"));
    await put(glossary, "# Original\n");
    commit("base register");
    git("checkout", "-b", "topic");
    await put(ledger, paged(row("DEC-0001", `Change request: ${glossary}`, "WIP")));
    if (side === "base") await put(page, header);
    if (side === "head" && fault === "malformed")
      await put(page, header + row("DEC-0001", "Invalid", "UNKNOWN"));
    await put(glossary, "# Changed\n");
    commit("head register");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some(
        (finding) =>
          /page-0001/.test(JSON.stringify(finding)) &&
          /missing|read|absent|register|Status|invalid/i.test(finding.message),
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0008-28
  it("refuses renumber preview before writing when an existing ancestor page is missing", async () => {
    gitRepo();
    await put(ledger, paged());
    commit("base names missing page");
    git("checkout", "-b", "topic");
    await put(page, header + row("DEC-0001"));
    commit("head cannot supply missing ancestor history");
    const before = await fs.readFile(path.join(root, ledger));
    await expect(
      decisionRenumber.buildDecisionRenumberPlan({
        root,
        specsDir: specs,
        from: "DEC-0001",
        to: "DEC-0002",
        base: "main",
      }),
    ).rejects.toThrow(/page-0001|register|missing|read/i);
    expect(await fs.readFile(path.join(root, ledger))).toEqual(before);
  });

  // QFAI:EX-0004-0005-12
  it("reruns migration above every page maximum, reuses historical origins and resolves a historical successor", async () => {
    const source = `${specs}/_policies/08_Decisions.md`;
    const historical =
      header +
      row("DEC-0007", `${source}#DR-0001: First`) +
      row("DEC-0090", "Retired number", "REJECTED");
    await put(ledger, paged());
    await put(page, historical);
    await put(
      source,
      "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n\n### DR-0002: Second\n\n- Status: superseded\n- Superseded by: DR-0001\n",
    );
    const result = await migrate();
    expect(result.code, result.error).toBe(0);
    expect(await fs.readFile(path.join(root, page), "utf8")).toBe(historical);
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows.map(({ id }) => id)).toEqual(["DEC-0007", "DEC-0090", "DEC-0091"]);
    expect(
      tree.decisions?.rows.filter(({ content }) => content.includes("#DR-0001:")),
    ).toHaveLength(1);
    expect(tree.decisions?.rows.at(-1)).toMatchObject({
      content: `${source}#DR-0002: Second`,
      status: "SUPERSEDED (by DEC-0007)",
    });
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

type PageReceipt = {
  root: string;
  specsDir: string;
  baseRef: string;
  sourceBaselineSha: string;
  headSha: string;
  baseSha: string;
  ancestorSha: string;
  requestId: string;
  requestFirstThreeCellsSha256: string;
  historicalSource: { commit: string; path: string; sha256: string };
  occurrences: {
    originalOrdinal: number;
    originalPath: string;
    originalLine: number;
    raw: Buffer;
    destinationPath: string;
    destinationLine: number;
  }[];
  files: { file: string; original: Buffer | null; replacement: Buffer }[];
};

const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

function receiptHash(receipt: PageReceipt): string {
  return sha256(
    JSON.stringify({
      root: receipt.root,
      specsDir: receipt.specsDir,
      baseRef: receipt.baseRef,
      sourceBaselineSha: receipt.sourceBaselineSha,
      headSha: receipt.headSha,
      baseSha: receipt.baseSha,
      ancestorSha: receipt.ancestorSha,
      requestId: receipt.requestId,
      requestFirstThreeCellsSha256: receipt.requestFirstThreeCellsSha256,
      historicalSource: {
        commit: receipt.historicalSource.commit,
        path: receipt.historicalSource.path,
        sha256: receipt.historicalSource.sha256,
      },
      occurrences: receipt.occurrences.map((item) => ({
        originalOrdinal: item.originalOrdinal,
        originalPath: item.originalPath,
        originalLine: item.originalLine,
        raw: item.raw.toString("base64"),
        destinationPath: item.destinationPath,
        destinationLine: item.destinationLine,
      })),
      files: receipt.files.map((file) => ({
        file: file.file,
        original: file.original === null ? null : file.original.toString("base64"),
        replacement: file.replacement.toString("base64"),
      })),
    }),
  );
}

function migrationEntry(name: string): (...args: unknown[]) => Promise<unknown> {
  const candidate: unknown = Reflect.get(decisionRenumber, name);
  if (typeof candidate !== "function")
    throw new Error(`Decision migration production entry ${name} is unavailable`);
  return async (...args: unknown[]): Promise<unknown> => candidate(...args);
}

async function physicalFixture(duplicates = false) {
  gitRepo();
  const destinations = [page, `${specs}/decisions/page-0002.md`, `${specs}/decisions/page-0003.md`];
  const rawRows = [
    row("DEC-0001", "Historical \\| literal"),
    row(duplicates ? "DEC-0001" : "DEC-0002", "Historical \\| literal"),
    row(duplicates ? "DEC-0001" : "DEC-0003", "Different", "REJECTED").replace(/\n$/, "\r\n"),
  ];
  const historical = Buffer.from(header + rawRows.join(""));
  await put(ledger, historical.toString());
  commit("fixed historical source");
  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  git("checkout", "-b", "topic");
  const requestContent = `Change request: ${[ledger, ...destinations].join(", ")}`;
  const requestApproach =
    "- Evidence: file:docs/source.md - Grounds: separately adopted exact receipt - Residual risk: no atomic power-loss guarantee - Rollback: restore only exact replacement bytes";
  const request = row("DEC-0004", requestContent, "WIP", requestApproach);
  const replacementRoot =
    header.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n- decisions/page-0002.md\n- decisions/page-0003.md\n\n## Decisions",
    ) + request;
  await put(ledger, historical.toString() + request);
  commit("source baseline with separate execution request");
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const receipt: PageReceipt = {
    root: path.resolve(root),
    specsDir: specs,
    baseRef: "main",
    sourceBaselineSha: headSha,
    headSha,
    baseSha,
    ancestorSha: baseSha,
    requestId: "DEC-0004",
    requestFirstThreeCellsSha256: sha256(
      JSON.stringify(["DEC-0004", requestContent, requestApproach]),
    ),
    historicalSource: { commit: baseSha, path: ledger, sha256: sha256(historical) },
    occurrences: rawRows.map((raw, index) => {
      const destinationPath = destinations[index];
      if (!destinationPath) throw new Error("fixture requires each destination");
      return {
        originalOrdinal: index + 1,
        originalPath: ledger,
        originalLine: index + 7,
        raw: Buffer.from(raw),
        destinationPath,
        destinationLine: 7,
      };
    }),
    files: [
      ...destinations.map((file, index) => {
        const raw = rawRows[index];
        if (raw === undefined) throw new Error("fixture requires each historical raw row");
        return { file, original: null, replacement: Buffer.from(header + raw) };
      }),
      {
        file: ledger,
        original: Buffer.from(historical.toString() + request),
        replacement: Buffer.from(replacementRoot),
      },
    ],
  };
  const digest = receiptHash(receipt);
  return { receipt, digest, request, destinations, replacementRoot };
}
async function buildPhysical(
  receipt: PageReceipt,
  digest = receiptHash(receipt),
): Promise<unknown> {
  return migrationEntry("buildDecisionPageMigrationPlan")({
    root,
    specsDir: specs,
    base: "main",
    receipt,
    adoptedReceiptSha256: digest,
  });
}

async function applyPhysical(
  plan: unknown,
  digest: string,
  io: {
    writeFile?: (file: string, contents: Buffer) => Promise<void>;
  } = {},
): Promise<unknown> {
  return migrationEntry("applyDecisionPageMigrationPlan")(plan, digest, io);
}

describe("separately adopted physical decision-page receipts", () => {
  // QFAI:AC-0001-0007-04
  // QFAI:EX-0001-0007-17
  it("relocates only adopted historical raw rows and retains the exact root request tail", async () => {
    const { receipt, digest, replacementRoot } = await physicalFixture();
    const plan = await buildPhysical(receipt, digest);
    await applyPhysical(plan, digest);
    for (const file of receipt.files)
      expect(await fs.readFile(path.join(root, file.file))).toEqual(file.replacement);
    expect(await fs.readFile(path.join(root, ledger))).toEqual(Buffer.from(replacementRoot));
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows.map(({ id }) => id)).toEqual([
      "DEC-0001",
      "DEC-0002",
      "DEC-0003",
      "DEC-0004",
    ]);
  });

  // QFAI:EX-0001-0007-18
  it("preserves identical and differing same-ID raw occurrences and keeps the duplicate error active", async () => {
    const { receipt, digest } = await physicalFixture(true);
    await applyPhysical(await buildPhysical(receipt, digest), digest);
    for (const file of receipt.files)
      expect(await fs.readFile(path.join(root, file.file))).toEqual(file.replacement);
    const tree = await readStoryTreeModel(root, config());
    expect(tree.decisions?.rows.filter(({ id }) => id === "DEC-0001")).toHaveLength(3);
    expect(tree).toMatchObject({
      decisionOccurrences: [
        ...receipt.occurrences.map((occurrence) => ({
          raw: occurrence.raw.toString(),
          origin: {
            path: occurrence.destinationPath,
            actualRow: occurrence.destinationLine,
            rawOrdinal: occurrence.originalOrdinal,
          },
        })),
        { row: { id: "DEC-0004" }, origin: { path: ledger, rawOrdinal: 4 } },
      ],
    });
    expect(validateStoryTreeStructureModel(tree)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        message: expect.stringMatching(/more than once|duplicate/i),
      }),
    );
  });

  // QFAI:EX-0001-0007-19
  it.each([
    "external adoption",
    "authority",
    "historical source",
    "digest",
    "ancestor",
    "occurrence",
  ])("refuses missing or invalid %s before writing", async (fault) => {
    const { receipt } = await physicalFixture();
    const original = await fs.readFile(path.join(root, ledger));
    if (fault === "authority") receipt.requestId = "DEC-9999";
    if (fault === "historical source") receipt.historicalSource.commit = "1".repeat(40);
    if (fault === "digest") receipt.historicalSource.sha256 = "0".repeat(64);
    if (fault === "ancestor") receipt.ancestorSha = receipt.headSha;
    if (fault === "occurrence") receipt.occurrences.pop();
    const adopted = fault === "external adoption" ? "" : receiptHash(receipt);
    migrationEntry("buildDecisionPageMigrationPlan");
    const writer = vi.spyOn(fs, "writeFile");
    await expect(buildPhysical(receipt, adopted)).rejects.toThrow();
    expect(writer).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, ledger))).toEqual(original);
    await expect(fs.lstat(path.join(root, page))).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0001-0007-20
  it.each(["HEAD", "base", "append", "Status", "ending", "plan context"])(
    "rejects a stale %s after receipt adoption",
    async (fault) => {
      const { receipt, digest } = await physicalFixture();
      const plan = await buildPhysical(receipt, digest);
      if (fault === "HEAD") git("commit", "--allow-empty", "-m", "HEAD advanced");
      if (fault === "base") git("update-ref", "refs/heads/main", "HEAD");
      if (fault === "plan context") {
        if (plan === null || typeof plan !== "object")
          throw new Error("fixture requires a production plan");
        Reflect.set(plan, "root", path.join(root, "other-project"));
      }
      const file = path.join(root, ledger);
      const old = await fs.readFile(file, "utf8");
      if (fault === "append") await fs.writeFile(file, old + row("DEC-0005", "Concurrent append"));
      if (fault === "Status") await fs.writeFile(file, old.replace("| WIP |", "| DONE |"));
      if (fault === "ending")
        await fs.writeFile(file, old.replace("# Decisions\n", "# Decisions\r\n"));
      const before = await fs.readFile(file);
      const writer = vi.fn(async (target: string, bytes: Buffer) => fs.writeFile(target, bytes));
      await expect(applyPhysical(plan, digest, { writeFile: writer })).rejects.toThrow();
      expect(writer).not.toHaveBeenCalled();
      expect(await fs.readFile(file)).toEqual(before);
      await expect(fs.lstat(path.join(root, page))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );

  // QFAI:EX-0001-0007-21
  it.each([
    "destination exists",
    "traversal",
    "incomplete replacement",
    "linked component",
    "missing source",
    "unreadable source",
  ])("refuses the whole plan for %s before its first write", async (fault) => {
    const { receipt } = await physicalFixture();
    const original = await fs.readFile(path.join(root, ledger));
    if (fault === "destination exists") await put(page, "Concurrent destination\n");
    if (fault === "missing source") await fs.unlink(path.join(root, ledger));
    if (fault === "traversal") {
      const destination = receipt.files[0];
      if (!destination) throw new Error("fixture requires its destination");
      destination.file = `${specs}/../outside.md`;
    }
    if (fault === "incomplete replacement") receipt.files.pop();
    if (fault === "linked component") {
      await fs.mkdir(path.join(root, "outside"));
      await fs.symlink(
        path.join(root, "outside"),
        path.join(root, specs, "decisions"),
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    if (fault === "unreadable source") {
      const originalRead = fs.readFile;
      vi.spyOn(fs, "readFile").mockImplementation((...args: Parameters<typeof fs.readFile>) => {
        if (String(args[0]) === path.join(root, ledger))
          return Promise.reject(
            Object.assign(new Error("controlled source read denial"), { code: "EACCES" }),
          );
        return originalRead(...args);
      });
    }
    const writer = vi.spyOn(fs, "writeFile");
    migrationEntry("buildDecisionPageMigrationPlan");
    await expect(buildPhysical(receipt)).rejects.toThrow();
    expect(writer).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    if (fault === "missing source")
      await expect(fs.lstat(path.join(root, ledger))).rejects.toMatchObject({ code: "ENOENT" });
    else expect(await fs.readFile(path.join(root, ledger))).toEqual(original);
    if (fault === "destination exists")
      expect(await fs.readFile(path.join(root, page), "utf8")).toBe("Concurrent destination\n");
  });

  // QFAI:EX-0001-0007-22
  it.each([false, true])(
    "retains a later write failure and preserves concurrent first-page bytes: %s",
    async (concurrent) => {
      const { receipt, digest } = await physicalFixture();
      const plan = await buildPhysical(receipt, digest);
      const rootBefore = await fs.readFile(path.join(root, ledger));
      const operator = Buffer.from("Concurrent actor owns these bytes\n");
      const writer = vi.fn(async (file: string, bytes: Buffer) => {
        if (file === path.join(root, specs, "decisions", "page-0002.md")) {
          if (concurrent) await fs.writeFile(path.join(root, page), operator);
          throw new Error("controlled second write denied");
        }
        await fs.writeFile(file, bytes);
      });
      const failure = applyPhysical(plan, digest, { writeFile: writer });
      await expect(failure).rejects.toThrow(/controlled second write denied/);
      expect(writer).toHaveBeenCalledTimes(2);
      await expect(
        fs.lstat(path.join(root, specs, "decisions", "page-0002.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        fs.lstat(path.join(root, specs, "decisions", "page-0003.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(await fs.readFile(path.join(root, ledger))).toEqual(rootBefore);
      if (concurrent) {
        await expect(failure).rejects.toThrow(/page-0001|unrestored/i);
        expect(await fs.readFile(path.join(root, page))).toEqual(operator);
      } else
        await expect(fs.lstat(path.join(root, page))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );
});

describe("decision relocation publication regressions", () => {
  // QFAI:EX-0001-0007-22
  it("preserves an identical competitor after the second exclusive create returns EEXIST", async () => {
    const { receipt, digest } = await physicalFixture();
    const plan = await buildPhysical(receipt, digest);
    const rootBefore = await fs.readFile(path.join(root, ledger));
    const second = receipt.files[1];
    if (!second) throw new Error("fixture requires the second historical page");
    const competingPath = path.join(root, second.file);
    const competingBytes = Buffer.from(second.replacement);
    const originalOpen = fs.open;
    let planted = false;
    const opens = vi
      .spyOn(fs, "open")
      .mockImplementation(async (...args: Parameters<typeof fs.open>) => {
        if (String(args[0]) === competingPath && args[1] === "wx") {
          await fs.writeFile(competingPath, competingBytes, { flag: "wx" });
          planted = true;
        }
        return originalOpen(...args);
      });
    await expect(applyPhysical(plan, digest)).rejects.toThrow(/EEXIST/);
    expect(planted).toBe(true);
    expect(
      opens.mock.calls.filter((call) => call[1] === "wx").map((call) => String(call[0])),
    ).toEqual([path.join(root, page), competingPath]);
    vi.restoreAllMocks();
    expect(await fs.readFile(competingPath)).toEqual(competingBytes);
    expect(await fs.readFile(path.join(root, ledger))).toEqual(rootBefore);
    await expect(fs.lstat(path.join(root, page))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.lstat(path.join(root, specs, "decisions", "page-0003.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0001-0007-22
  it("retains and reports unknown owned partial output after a later write hook fails", async () => {
    const { receipt, digest } = await physicalFixture();
    const plan = await buildPhysical(receipt, digest);
    const rootBefore = await fs.readFile(path.join(root, ledger));
    const second = receipt.files[1];
    if (!second) throw new Error("fixture requires the second historical page");
    const partialPath = path.join(root, second.file);
    const partialBytes = Buffer.from(second.replacement.subarray(0, 17));
    const writer = vi.fn(async (file: string, bytes: Buffer) => {
      if (file === partialPath) {
        await fs.writeFile(file, partialBytes);
        throw new Error("controlled unknown partial write failure");
      }
      await fs.writeFile(file, bytes);
    });
    const failure = applyPhysical(plan, digest, { writeFile: writer });
    await expect(failure).rejects.toThrow(/controlled unknown partial write failure/);
    await expect(failure).rejects.toThrow(/unrestored/i);
    await expect(failure).rejects.toThrow(/page-0002/);
    expect(writer).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(partialPath)).toEqual(partialBytes);
    expect(await fs.readFile(path.join(root, ledger))).toEqual(rootBefore);
    await expect(fs.lstat(path.join(root, page))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.lstat(path.join(root, specs, "decisions", "page-0003.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0001-0007-19
  it("rejects a request already DONE in the current base even when the common ancestor has no request", async () => {
    const { receipt } = await physicalFixture();
    const topicBytes = await fs.readFile(path.join(root, ledger));
    const ancestorWithoutRequest = receipt.ancestorSha;
    git("checkout", "main");
    await put(ledger, topicBytes.toString().replace("| WIP |", "| DONE |"));
    commit("base already completed the same immutable request");
    receipt.baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    git("checkout", "topic");
    expect(receipt.baseSha).not.toBe(ancestorWithoutRequest);
    expect(
      execFileSync("git", ["merge-base", "main", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    ).toBe(ancestorWithoutRequest);
    expect(
      execFileSync("git", ["show", `${ancestorWithoutRequest}:${ledger}`], {
        cwd: root,
        encoding: "utf8",
      }),
    ).not.toContain(receipt.requestId);
    migrationEntry("buildDecisionPageMigrationPlan");
    const writer = vi.spyOn(fs, "writeFile");
    await expect(buildPhysical(receipt, receiptHash(receipt))).rejects.toThrow(
      /base|DONE|authority|inherited/i,
    );
    expect(writer).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, ledger))).toEqual(topicBytes);
    for (const file of receipt.files.filter((entry) => entry.original === null))
      await expect(fs.lstat(path.join(root, file.file))).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0001-0007-20
  // QFAI:EX-0001-0007-22
  it.each([false, true])(
    "snapshots caller and hook Buffers across awaits and rollback while preserving concurrent bytes: %s",
    async (concurrent) => {
      const { receipt, digest } = await physicalFixture();
      const frozen = receipt.files.map((file) => ({
        file: file.file,
        original: file.original === null ? null : Buffer.from(file.original),
        replacement: Buffer.from(file.replacement),
      }));
      const originalRoot = frozen.find((file) => file.file === ledger)?.original;
      if (originalRoot === null || originalRoot === undefined)
        throw new Error("fixture requires an original root snapshot");
      const building = buildPhysical(receipt, digest);
      for (const file of receipt.files) {
        file.original?.fill(0);
        file.replacement.fill(0);
        file.file = "outside/caller-changed.md";
      }
      receipt.root = path.join(root, "caller-other-root");
      receipt.specsDir = "caller-other-specs";
      receipt.baseRef = "caller-other-base";
      const plan = await building;
      if (plan === null || typeof plan !== "object")
        throw new Error("fixture requires the production plan");
      const exposedReceipt: unknown = Reflect.get(plan, "receipt");
      if (exposedReceipt === null || typeof exposedReceipt !== "object")
        throw new Error("fixture requires the production receipt");
      const exposedFiles: unknown = Reflect.get(exposedReceipt, "files");
      if (!Array.isArray(exposedFiles))
        throw new Error("fixture requires the production replacement map");
      const operator = Buffer.from("Concurrent actor owns this first page\n");
      let rootFailed = false;
      const writer = vi.fn(async (file: string, bytes: Buffer) => {
        await fs.writeFile(file, bytes);
        bytes.fill(0);
        if (file === path.join(root, ledger) && !rootFailed) {
          rootFailed = true;
          if (concurrent) await fs.writeFile(path.join(root, page), operator);
          throw new Error("controlled failure after full root replacement");
        }
      });
      const failure = applyPhysical(plan, digest, { writeFile: writer });
      Reflect.set(plan, "root", path.join(root, "plan-other-root"));
      Reflect.set(plan, "specsDir", "plan-other-specs");
      Reflect.set(plan, "baseRef", "plan-other-base");
      Reflect.set(exposedReceipt, "root", path.join(root, "receipt-other-root"));
      for (const value of exposedFiles) {
        const file: unknown = value;
        if (file === null || typeof file !== "object")
          throw new Error("fixture requires each production file entry");
        for (const cell of ["original", "replacement"]) {
          const bytes: unknown = Reflect.get(file, cell);
          if (Buffer.isBuffer(bytes)) bytes.fill(0);
        }
        Reflect.set(file, "file", "outside/plan-changed.md");
      }
      await expect(failure).rejects.toThrow(/controlled failure after full root replacement/);
      expect(rootFailed).toBe(true);
      expect(writer.mock.calls.slice(0, 4).map((call) => call[0])).toEqual(
        frozen.map((file) => path.join(root, file.file)),
      );
      expect(
        writer.mock.calls.every((call) =>
          frozen.some((file) => call[0] === path.join(root, file.file)),
        ),
      ).toBe(true);
      expect(await fs.readFile(path.join(root, ledger))).toEqual(originalRoot);
      for (const file of frozen.filter((entry) => entry.original === null)) {
        if (concurrent && file.file === page) {
          expect(await fs.readFile(path.join(root, file.file))).toEqual(operator);
          await expect(failure).rejects.toThrow(/unrestored/i);
          await expect(failure).rejects.toThrow(/page-0001/);
        } else
          await expect(fs.lstat(path.join(root, file.file))).rejects.toMatchObject({
            code: "ENOENT",
          });
      }
      await expect(fs.lstat(path.join(root, "outside"))).rejects.toMatchObject({ code: "ENOENT" });
    },
  );
});

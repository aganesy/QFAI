/**
 * What the story tree's layout and the delivery workflow's definition promise, read from the
 * project `qfai init` writes and from the text the package ships.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig } from "../../src/core/config.js";
import { storyTreeMarkdownPatterns } from "../../src/core/storyTree/layout.js";
import type { Issue } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { validateAssistantTreeMigration } from "../../src/core/validators/assistantTreeMigration.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readDiscussionSkill } from "../helpers/discussionSteps.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";
import { documentsWithoutOneEntry, parseManifest } from "../../assets/scripts/check-mdschema.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");
const TEMPLATES = path.join(ASSISTANT, "skill", "qfai-sdd", "templates", "spec");
const MANIFEST = path.join(REPO_ROOT, "packages", "qfai", "assets", "mdschema", "manifest.yml");
const SPECS = ".qfai/spec";
const CONTRACTS = ".qfai/spec/03_contract";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layout-criteria-"));
  roots.push(root);
  return root;
}

/** A project as `qfai init` writes it. */
async function initializedRoot(): Promise<string> {
  const root = await newRoot();
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  return root;
}

async function put(root: string, file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function findings(root: string, prefix: string): Promise<Issue[]> {
  const result = await validateProject(root, await loadConfig(root), { profile: "sdd" });
  return result.issues.filter((found) => found.code.startsWith(prefix));
}

/** The document-schema findings against `tech.md`. */
async function techSchemaFindings(root: string): Promise<Issue[]> {
  return (await findings(root, "QFAI-DOCSCHEMA-")).filter((found) =>
    found.file?.endsWith("tech.md"),
  );
}

async function text(...segments: string[]): Promise<string> {
  return (await readFile(path.join(ASSISTANT, ...segments), "utf8")).replace(/\s+/g, " ");
}

/** The lines of the `## Stages (canonical)` list of the workflow rule, by their number. */
async function canonicalStages(): Promise<Map<number, string>> {
  const workflow = await readFile(path.join(ASSISTANT, "rule", "workflow.md"), "utf8");
  const section = workflow.split("## Stages (canonical)")[1]?.split("\nStage 3")[0] ?? "";
  return new Map(
    [...section.matchAll(/^(\d+)\. (.+)$/gm)].map((match) => [Number(match[1]), match[2] ?? ""]),
  );
}

describe("the traceability chain and the skill order", () => {
  // QFAI:AC-0001-0001-01
  it("defines the stages from discussion to verification with the output of each", async () => {
    const stages = await canonicalStages();
    expect([...stages.keys()]).toEqual([1, 2, 3, 4, 5, 6]);

    expect(stages.get(1)).toContain("Discussion (optional): clarify idea \u2192 requirement seed");
    expect(stages.get(2)).toContain("discussion pack in `.qfai/discussion/`");
    expect(stages.get(3)).toContain(
      "Specification (SDD): preflight, triage, policy, business flows, stories with AC and EX, and enforcing contracts",
    );
    const implementation = stages.get(5) ?? "";
    const outputs = [
      "writes the BF E2E test",
      "the AC integration tests with empty bodies",
      "implements one EX at a time through Red, Green, Refactor",
    ].map((phrase) => implementation.indexOf(phrase));
    expect(outputs.every((position) => position >= 0)).toBe(true);
    expect(outputs).toEqual([...outputs].sort((a, b) => a - b));
    expect(stages.get(6)).toContain("Verify: run quality gates and provide evidence");

    const discussion = await readDiscussionSkill(ASSISTANT);
    expect(discussion).toContain("nine-file discussion pack");
    expect(discussion).toContain("Capture scope, REQ, NFR");

    const constitution = (
      await readFile(path.join(ASSISTANT, "rule", "constitution.md"), "utf8")
    ).replace(/\s+/g, " ");
    const chain = [
      "from a business flow to its stories, acceptance criteria, examples, tests, code, and verification evidence",
      "`BF-*` requires a `QFAI:BF-NNNN` annotation in an E2E test",
      "`AC-*` requires a `QFAI:AC-NNNN-NNNN-NN` annotation in an integration or API test",
      "`EX-*` requires a `QFAI:EX-NNNN-NNNN-NN` annotation in a selected non-E2E test file",
    ];
    for (const phrase of chain) expect(constitution).toContain(phrase);
  });

  // QFAI:AC-0001-0003-01
  it("orders the skills configure, discussion, sdd, prototyping, implement, verify without a cycle", async () => {
    const order = [
      "qfai-configure",
      "qfai-discussion",
      "qfai-sdd",
      "qfai-prototyping",
      "qfai-implement",
      "qfai-verify",
    ];
    const skill = (name: string) => text("skill", name, "SKILL.md");
    const calls = (from: string): string[] =>
      [...from.matchAll(/`\/(qfai-[a-z]+)`/g)].map((match) => `${match[1]}`);

    const edges: [string, string][] = [];
    const successors = (name: string, ...following: string[]) => {
      for (const next of following) edges.push([name, next]);
    };
    const configure = await skill("qfai-configure");
    successors(
      "qfai-configure",
      ...calls(/Suggest next step: (`[^`]+`)/.exec(configure)?.[1] ?? ""),
    );
    const discussion = await skill("qfai-discussion");
    successors(
      "qfai-discussion",
      ...calls(/next actions, (`[^`]+`) recommended/.exec(discussion)?.[1] ?? ""),
    );
    const sdd = await skill("qfai-sdd");
    successors(
      "qfai-sdd",
      ...calls(
        /The next implementation route is (`[^`]+`); UI work may pass through (`[^`]+`)/
          .exec(sdd)
          ?.slice(1)
          .join(" ") ?? "",
      ),
    );
    const prototyping = await skill("qfai-prototyping");
    successors("qfai-prototyping", ...calls(/## Next - (`[^`]+`)/.exec(prototyping)?.[1] ?? ""));
    const implement = await skill("qfai-implement");
    successors(
      "qfai-implement",
      ...calls(/next actions, (`[^`]+`) recommended/.exec(implement)?.[1] ?? ""),
    );

    expect(edges).toEqual([
      ["qfai-configure", "qfai-discussion"],
      ["qfai-discussion", "qfai-sdd"],
      ["qfai-sdd", "qfai-implement"],
      ["qfai-sdd", "qfai-prototyping"],
      ["qfai-prototyping", "qfai-implement"],
      ["qfai-implement", "qfai-verify"],
    ]);
    for (const [from, to] of edges) {
      expect(order.indexOf(from), `${from} -> ${to}`).toBeLessThan(order.indexOf(to));
    }

    const stages = await canonicalStages();
    const labels = [1, 3, 4, 5, 6].map((number) => stages.get(number) ?? "");
    expect(labels[0]).toContain("Discussion (optional)");
    expect(labels[1]).toContain("Specification (SDD)");
    expect(labels[2]).toContain("Prototyping (optional)");
    expect(labels[3]).toContain("Implementation:");
    expect(labels[4]).toContain("Verify:");
    expect([...stages.values()].some((label) => label.includes("Configure"))).toBe(false);
  });
});

describe("the policy and contract layers of an initialized project", () => {
  const constraints = (technical: string, operational = "", business = ""): string => {
    const table = "| ID | Constraint | Rationale |\n| --- | --- | --- |\n";
    return `# Constraints\n\n## Technical Constraints\n\n${table}${technical}\n## Operational Constraints\n\n${table}${operational}\n## Business Constraints\n\n${table}${business}`;
  };

  // QFAI:AC-0001-0006-01
  it("holds five policy files, refuses a concrete definition in constraints and numbers each section from 01", async () => {
    const root = await initializedRoot();
    expect((await readdir(path.join(root, SPECS, "01_policy"))).sort()).toEqual([
      "constraint.md",
      "glossary.md",
      "initiative.md",
      "objective.md",
      "principle.md",
    ]);
    expect(await findings(root, "QFAI-DOCSCHEMA-")).toEqual([]);

    const guidance = await text("skill", "qfai-sdd", "references", "spec-traceability-rules.md");
    expect(guidance).toContain(
      "Criteria and intent, not definitions. A value set, a behaviour rule or a command belongs to the contract or tech.md that owns it, and policy links there. A business rule is a BR in a contract, never a policy line.",
    );

    const constraint = path.join(SPECS, "01_policy", "constraint.md");
    await put(
      root,
      constraint,
      constraints(
        "| TC-01 | Runs on Linux and Windows | Adopters use both |\n| TC-02 | Needs no network | Builds run offline |\n",
        "| OC-01 | Releases need a reviewer | A second pair of eyes |\n",
        "| BC-01 | Data stays in the region | A contract with customers |\n",
      ),
    );
    expect(await findings(root, "QFAI-DOCSCHEMA-")).toEqual([]);
    expect(await findings(root, "QFAI-STORY-012")).toEqual([]);

    const concrete: [string, string][] = [
      ["a file name in backticks", "Reads `src/config.ts` first"],
      ["a business rule ID", "Follows BR-0001-0001 exactly"],
      ["an example ID", "Is shown by EX-0001-0001-01"],
      ["an acceptance criterion ID", "Is judged by AC-0001-0001-01"],
      ["a contract ID", "Obeys CLI-0001 on every run"],
    ];
    for (const [label, wording] of concrete) {
      await put(root, constraint, constraints(`| TC-01 | ${wording} | Adopters use both |\n`));
      const reported = await findings(root, "QFAI-DOCSCHEMA-");
      expect(
        reported.map((found) => [found.code, found.file?.replace(/\\/g, "/")]),
        label,
      ).toEqual([["QFAI-DOCSCHEMA-001", `${SPECS}/01_policy/constraint.md`]]);
    }

    await put(
      root,
      constraint,
      constraints(
        "| TC-01 | Runs on Linux | Adopters use it |\n| TC-03 | Runs on Windows | Adopters use it |\n",
        "| OC-02 | Releases need a reviewer | A second pair of eyes |\n",
        "| TC-01 | Data stays in the region | A contract with customers |\n",
      ),
    );
    const misnumbered = await findings(root, "QFAI-STORY-012");
    expect(misnumbered.map((found) => [found.severity, found.refs])).toEqual([
      ["error", ["TC-03"]],
      ["error", ["OC-02"]],
      ["error", ["TC-01"]],
    ]);
  });

  // QFAI:AC-0001-0006-02
  it("holds the contract index and tech.md, lists every contract file and states the gate commands once", async () => {
    const root = await initializedRoot();
    const contracts = path.join(root, CONTRACTS);
    expect((await readdir(contracts)).sort()).toEqual([
      "api",
      "cli",
      "contracts.md",
      "db",
      "tech.md",
      "ui",
    ]);

    const files: [string, string][] = [
      ["api/api-0001-orders.yaml", "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.1.0\n"],
      [
        "db/db-0002-orders.sql",
        "-- QFAI-CONTRACT-ID: DB-0002\nCREATE TABLE orders (id INTEGER);\n",
      ],
      ["ui/ui-0003-orders.yaml", "# QFAI-CONTRACT-ID: UI-0003\nscreen: orders\n"],
      ["cli/cli-0004-orders.md", "# CLI-0004: Orders\n"],
    ];
    for (const [file, body] of files) await put(root, `${CONTRACTS}/${file}`, body);
    const unlisted = await findings(root, "QFAI-CONTRACT-034");
    expect(unlisted.map((found) => found.severity)).toEqual(["error", "error", "error", "error"]);
    expect(unlisted.flatMap((found) => found.refs ?? []).sort()).toEqual([
      "API-0001",
      "CLI-0004",
      "DB-0002",
      "UI-0003",
    ]);

    const index = [
      "# Contracts",
      "",
      "## Contract Index",
      "",
      "| ID | Title | File | Depends On | Reconciled With | Purpose |",
      "| --- | --- | --- | --- | --- | --- |",
      ...files.map(
        ([file], index) =>
          `| ${["API-0001", "DB-0002", "UI-0003", "CLI-0004"][index]} | Orders | ${CONTRACTS}/${file} | - | - | Orders |`,
      ),
      "",
    ].join("\n");
    await put(root, `${CONTRACTS}/contracts.md`, index);
    expect(await findings(root, "QFAI-CONTRACT-034")).toEqual([]);

    const commandRow = /^- (?:Install|Format|Test|Lint|Typecheck|Build|Skeleton|Validate): .+$/gm;
    const seeded = await readFile(path.join(contracts, "tech.md"), "utf8");
    const section =
      seeded.split(/^## /m).find((part) => part.startsWith("Standard commands (copy-paste)")) ?? "";
    expect((section.match(commandRow) ?? []).length).toBe(8);
    expect(seeded.replace(section, "").match(commandRow)).toBeNull();
    for (const file of await readdir(path.join(root, SPECS), { recursive: true })) {
      if (!file.endsWith(".md") || file.endsWith("tech.md")) continue;
      expect(await readFile(path.join(root, SPECS, file), "utf8"), file).not.toMatch(commandRow);
    }
    expect(await readFile(path.join(root, "qfai.config.yaml"), "utf8")).not.toMatch(commandRow);

    const tech = (body: string): string =>
      seeded.replace(/## Architecture[\s\S]*?(?=## Dependencies)/, `${body}\n`);
    const table = (rows: string): string =>
      `| Layer | Responsibility | Depends on |\n| --- | --- | --- |\n${rows}`;
    const diagram = "```mermaid\nflowchart TD\n  Cli --> Core\n```\n";
    await put(
      root,
      `${CONTRACTS}/tech.md`,
      tech(
        `## Architecture\n\n${diagram}\n${table("| Cli | Parses | Core |\n| Core | Validates | - |\n")}`,
      ),
    );
    expect(await techSchemaFindings(root)).toEqual([]);
    expect(await findings(root, "QFAI-STORY-013")).toEqual([]);

    await put(
      root,
      `${CONTRACTS}/tech.md`,
      tech(
        `## Architecture\n\n${diagram}\n${table("| Core | Validates | - |\n| Cli | Parses | Core |\n")}`,
      ),
    );
    expect((await findings(root, "QFAI-STORY-013")).map((found) => found.message)).toEqual([
      expect.stringContaining("Cli depends on Core, which is not in a row below it"),
    ]);

    await put(
      root,
      `${CONTRACTS}/tech.md`,
      tech(
        `## Architecture\n\n${table("| Cli | Parses | Core |\n| Core | Validates | - |\n")}\n${diagram}`,
      ),
    );
    expect((await techSchemaFindings(root)).map((found) => found.code)).toContain(
      "QFAI-DOCSCHEMA-001",
    );
  });
});

describe("records of triage, change requests and retired stories", () => {
  // QFAI:AC-0001-0007-03
  it("records them as decision rows and writes no decision directory or retired-story file", async () => {
    const root = await initializedRoot();
    const decisions = await readFile(path.join(root, SPECS, "decisions.md"), "utf8");
    expect(decisions).toMatch(/\| ID\s+\| Content\s+\| Approach\s+\| Status\s+\|/);
    const entries = (await readdir(root, { recursive: true })).map((entry) =>
      entry.split(path.sep).join("/"),
    );
    expect(entries.some((entry) => entry.startsWith(".qfai/decisions"))).toBe(false);
    expect(entries.some((entry) => entry.endsWith("01_Spec-retired.md"))).toBe(false);

    const step = await text("step", "sdd-triage", "STEP.md");
    expect(step).toContain(
      "Record in `<paths.specsDir>/decisions.md` only what the user decided: each change request the user approved or declined",
    );
    expect(step).toContain(
      "A change request Content begins `Change request:` and names the affected repository-relative paths; its Approach names the operation, the affected BF or US",
    );
    expect(step).toContain(
      "Do not write a second decision-record directory or a retired story file",
    );

    const triage = await text("skill", "qfai-sdd", "references", "sdd-triage.md");
    expect(triage).toContain(
      "A change request is a decision row whose Content begins Change request: and names the repository-relative paths it changes",
    );
    expect(triage).toContain(
      "Retiring a story removes its directory under the change request that names it, with no separate retired-story file.",
    );
    expect(triage).toContain(
      "Use the shared user-question protocol for CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE.",
    );
  });
});

describe("the document schema entries of the story tree", () => {
  /** The files of the template tree under the names a project gives them. */
  async function sampleFiles(): Promise<string[]> {
    const names = await readdir(TEMPLATES, { recursive: true, withFileTypes: true });
    return names
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path.relative(TEMPLATES, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
      )
      .sort();
  }

  // QFAI:AC-0001-0011-01
  it("gives each of the fifteen fixed files and the CLI contract one entry and one template", async () => {
    const manifest = await readFile(MANIFEST, "utf8");
    const entries: { id: string; schema: string; pattern: string }[] = parseManifest(manifest);
    const fixed = storyTreeMarkdownPatterns("docs/spec", "docs/contracts");
    expect(fixed).toHaveLength(15);
    expect(entries).toHaveLength(16);

    const templates = await sampleFiles();
    expect(templates).toHaveLength(16);
    const tree = templates.map((relative) => {
      const concrete = relative.replaceAll("NNNN", "0001");
      return relative.startsWith("03_contract/")
        ? `docs/contracts/${concrete.slice("03_contract/".length)}`
        : `docs/spec/${concrete}`;
    });
    expect(
      documentsWithoutOneEntry(manifest, [...tree, ...fixed, "docs/contracts/cli/other.md"], {
        specsDir: "docs/spec",
        contractsDir: "docs/contracts",
      }),
    ).toEqual([]);

    const paired = entries.map((entry) =>
      entry.pattern
        .replace("{specsDir}/", "")
        .replace("{contractsDir}/", "03_contract/")
        .replace("business-flow-*", "business-flow-NNNN")
        .replace("user-story-*", "user-story-NNNN-NNNN")
        .replace("cli/*.md", "cli/cli-NNNN-title.md"),
    );
    expect([...paired].sort()).toEqual(templates);
    for (const entry of entries) {
      const schema = path.join(REPO_ROOT, "packages", "qfai", "assets", "mdschema", entry.schema);
      expect((await readFile(schema, "utf8")).length, entry.schema).toBeGreaterThan(0);
    }

    const withoutOpenQuestions = manifest.replace(
      / {2}- id: story-open-questions\r?\n {4}schema: [^\r\n]+\r?\n {4}pattern: [^\r\n]+\r?\n/,
      "",
    );
    expect(
      documentsWithoutOneEntry(withoutOpenQuestions, tree, {
        specsDir: "docs/spec",
        contractsDir: "docs/contracts",
      }),
    ).toEqual(["docs/spec/open-questions.md"]);
  });

  // QFAI:AC-0001-0011-02
  it("passes the document-schema and Mermaid lanes on the sample tree built from the templates", async () => {
    const root = await newRoot();
    await put(
      root,
      "qfai.config.yaml",
      `paths:\n  specsDir: ${SPECS}\n  contractsDir: ${CONTRACTS}\n`,
    );
    for (const relative of await sampleFiles()) {
      await put(
        root,
        `${SPECS}/${relative.replaceAll("NNNN", "0001")}`,
        await readFile(path.join(TEMPLATES, relative), "utf8"),
      );
    }

    const lane = (script: string, args: string[]) => {
      const run = spawnSync(process.execPath, [path.join(REPO_ROOT, "scripts", script), ...args], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 120_000,
      });
      return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
    };
    const schema = lane("check-mdschema.mjs", ["--root", root, "--scope", "all"]);
    expect(schema.status, schema.stderr).toBe(0);
    expect(schema.stdout).toContain("16 file(s) conform");
    const mermaid = lane("check-mermaid.mjs", [root]);
    expect(mermaid.status, mermaid.stderr).toBe(0);
    expect(mermaid.stdout).toMatch(/\d+ diagram\(s\) parsed/);
  }, 240_000);
});

describe("the assistant tree", () => {
  // QFAI:AC-0001-0012-01
  it("has rule, skill, step, agent and prompt, plus skill.local where the project made one", async () => {
    const layers = ["agent", "prompt", "rule", "skill", "step"];
    const shipped = await readdir(ASSISTANT);
    expect(shipped.sort()).toEqual(layers);

    const root = await initializedRoot();
    const assistant = path.join(root, ".qfai", "assistant");
    expect((await readdir(assistant)).sort()).toEqual(layers);
    const { config } = await loadConfig(root);
    const named = async () =>
      (await validateAssistantTreeMigration(root, config))
        .filter((found) => found.code === "QFAI-ASSISTANT-001")
        .map((found) => found.file);
    expect(await named()).toEqual([]);

    await mkdir(path.join(assistant, "skill.local", "my-skill"), { recursive: true });
    expect((await readdir(assistant)).sort()).toEqual(
      [...layers.slice(0, 3), "skill", "skill.local", "step"].sort(),
    );
    expect(await named()).toEqual([]);

    for (const retired of ["constitution", "manifest", "catalog", "process"]) {
      await mkdir(path.join(assistant, retired), { recursive: true });
    }
    expect((await named()).sort()).toEqual([
      ".qfai/assistant/catalog/",
      ".qfai/assistant/constitution/",
      ".qfai/assistant/manifest/",
      ".qfai/assistant/process/",
    ]);
  });
});

describe("the handoff from discussion to SDD", () => {
  // QFAI:AC-0001-0017-01
  it("reads the selected pack as source material and states a discrepancy without rewriting the pack", async () => {
    const step = await text("step", "sdd-triage", "STEP.md");
    expect(step).toContain("Run `npx qfai sdd preflight` and use its `selectedInputPath`");
    expect(step).toContain(
      "Read the pack, its completed reviews, explicit user requirements, and the existing story tree. A discussion pack is provenance and design input, not a normative SSOT. Record a discrepancy in an SDD-owned row or the SDD report; do not edit the pack to clear this stage.",
    );

    const playbook = await text("skill", "qfai-sdd", "references", "sdd-execution-playbook.md");
    expect(playbook).toContain(
      "Read the selected pack, completed reviews that target it, explicit user requirements, and the existing story tree. A pack is reference and provenance material. Disposition its applicable review advice in the SDD report, a decision row, or an open question. A pack discrepancy does not itself block SDD.",
    );

    const skill = await text("skill", "qfai-sdd", "SKILL.md");
    expect(skill).toContain(
      "Report the source selected, BF and US IDs touched, decision and OQ IDs, contract files and index rows",
    );
    expect(skill).toContain("and remaining questions.");
  });
});

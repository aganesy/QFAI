/**
 * Integration: SDD Skill Spec-0013 TDD Backfill
 *
 * Validates that the /qfai-sdd skill (spec-0013) requirements are covered
 * by existing implementation: SKILL.md template and validator modules.
 *
 * TDD-0001 to TDD-0010 are Exception-pattern backfill (DR-0013-0001).
 */
// QFAI:SPEC-0013:TC-0013-0001
// QFAI:SPEC-0013:TC-0013-0002
// QFAI:SPEC-0013:TC-0013-0003
// QFAI:SPEC-0013:TC-0013-0004
// QFAI:SPEC-0013:TC-0013-0005
// QFAI:SPEC-0013:TC-0013-0006
// QFAI:SPEC-0013:TC-0013-0007
// QFAI:SPEC-0013:TC-0013-0008
// QFAI:SPEC-0013:TC-0013-0009
// QFAI:SPEC-0013:TC-0013-0010
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateSpecSplitByCapability } from "../../src/core/validators/specSplitByCapability.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
});

function contractConfig(): QfaiConfig {
  return {
    paths: { contractsDir: ".qfai/contracts", specsDir: ".qfai/specs" },
  } as unknown as QfaiConfig;
}

const SKILL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "SKILL.md",
);

const TEST_CASES_TEMPLATE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "templates",
  "specs",
  "spec",
  "06_Test-Cases.md",
);

// TC-0013-0001: Phase Order Enforcement
describe("TC-0013-0001: Phase Order Enforcement", () => {
  it("SKILL.md enforces Contracts-first -> Outline -> Slice -> Plan -> Delta", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/phase order/i);
    expect(content).toContain("Contracts-first");
    expect(content).toContain("Outline");
    expect(content).toContain("Slice");
    expect(content).toContain("Plan");
    expect(content).toContain("Delta");
  });
});

// TC-0013-0002: Contract Index Alignment
describe("TC-0013-0002: Contract Index Alignment", () => {
  it("SKILL.md requires Contract Index in _policies/05_Contracts.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Contract Index");
    expect(content).toContain("05_Contracts.md");
  });
});

// TC-0013-0003: Usable-Source Preflight Stop
describe("TC-0013-0003: Usable-Source Preflight Stop", () => {
  it("continues with a selected discussion pack even when it is incomplete", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-preflight-"));
    roots.push(root);
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260924000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "06_REQ.md"),
      "# Requirements\n\n- REQ-0001: Save a draft.\n",
    );

    const result = await runSddPreflight(root, defaultConfig, { packDir });
    expect(result.status).toBe("ready");
    expect(result.selectedInputPath).toBe(packDir);
    expect(result.packGaps.length).toBeGreaterThan(0);
  });

  it("stops when no usable discussion or import-lite source exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-preflight-"));
    roots.push(root);

    const result = await runSddPreflight(root, defaultConfig);
    expect(result.status).toBe("blocked");
    expect(result.selectedInputPath).toBeNull();
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});

// TC-0013-0004: Slice Gate US->AC->BR->EX->TC
describe("TC-0013-0004: Slice Gate US->AC->BR->EX->TC", () => {
  it("SKILL.md defines slice gate with required edges", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Ss]lice gate/);
  });
});

// TC-0013-0005: Plan After Slice Gate
describe("TC-0013-0005: Plan After Slice Gate", () => {
  it("SKILL.md requires plan after slice gate pass", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/slice.*plan|Plan.*finalize/i);
  });
});

// TC-0013-0006: Reference Direction Enforcement
describe("TC-0013-0006: Reference Direction Enforcement", () => {
  it("SKILL.md enforces reference direction rules", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Rr]eference direction/);
    expect(content).toMatch(/lower-to-upper/);
  });
});

// TC-0013-0007: Validate Gate error=0
describe("TC-0013-0007: Validate Gate error=0", () => {
  it("SKILL.md requires qfai validate --profile sdd --fail-on error", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qfai validate --profile sdd --fail-on error");
  });
});

// TC-0013-0008: Business Flow Mermaid
describe("TC-0013-0008: Business Flow Mermaid", () => {
  it("SKILL.md requires Mermaid in _policies/04_Business-Flow.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("04_Business-Flow.md");
    expect(content).toMatch(/[Mm]ermaid/);
  });
});

// TC-0013-0009: Delta Rejected Guardrails
describe("TC-0013-0009: Delta Rejected Guardrails", () => {
  it("SKILL.md defines Delta Rejected Guard", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Delta Rejected Guard");
    expect(content).toMatch(/rejected/i);
  });
});

// TC-0013-0010: Batch Mode Targets Every Capability
describe("TC-0013-0010: Batch Mode Targets Every Capability", () => {
  it("SKILL.md targets every capability when invoked with no argument", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("### No-argument batch delegation (MUST)");
    expect(content).toContain(
      "Without argument: target all capabilities in `_policies/03_Capabilities.md`",
    );
  });

  it("SKILL.md delegates the per-spec phase rather than running it once", async () => {
    // Targeting every capability and running one pass over them are different
    // things, and only the second is what the example describes.
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Delegate Slice in parallel per spec");
  });
});

/**
 * Writes a capability catalog and one spec directory per entry of `specs`.
 * Each spec's `01_Spec.md` names the capability it was created for, which is
 * how the tree records an assignment the catalog can then contradict.
 */
async function seedCapabilityTree(
  root: string,
  catalogRows: readonly string[],
  specs: ReadonlyArray<{ readonly specId: string; readonly capId: string }>,
): Promise<void> {
  const specsDir = path.join(root, ".qfai", "specs");
  await mkdir(path.join(specsDir, "_policies"), { recursive: true });
  await writeFile(
    path.join(specsDir, "_policies", "03_Capabilities.md"),
    ["# 03 Capabilities", "", "## CAP Catalog", "", ...catalogRows, ""].join("\n"),
  );
  for (const { specId, capId } of specs) {
    const specDir = path.join(specsDir, specId);
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), `# 01 Spec\n\n- Parent: ${capId}\n`);
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n");
    await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n");
  }
}

// TC-0013-0010: an assigned spec id keeps its capability, and reordering is a Change Request
describe("TC-0013-0010: Batch Mode Keeps The Capability Mapping", () => {
  const assigned = [
    { specId: "spec-0001", capId: "CAP-0001" },
    { specId: "spec-0002", capId: "CAP-0002" },
  ];
  const catalogs = {
    "declared, as assigned": [
      "| CAP ID | Spec | Statement |",
      "| --- | --- | --- |",
      "| CAP-0001 | spec-0001 | first |",
      "| CAP-0002 | spec-0002 | second |",
    ],
    "declared, with the Spec cells swapped": [
      "| CAP ID | Spec | Statement |",
      "| --- | --- | --- |",
      "| CAP-0001 | spec-0002 | first |",
      "| CAP-0002 | spec-0001 | second |",
    ],
    "by row order, as assigned": [
      "| CAP ID | Statement |",
      "| --- | --- |",
      "| CAP-0001 | first |",
      "| CAP-0002 | second |",
    ],
    "by row order, with the rows swapped": [
      "| CAP ID | Statement |",
      "| --- | --- |",
      "| CAP-0002 | second |",
      "| CAP-0001 | first |",
    ],
  };

  const splitFindings = async (catalogRows: readonly string[]) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-mapping-"));
    roots.push(root);
    await seedCapabilityTree(root, catalogRows, assigned);
    const issues = await validateSpecSplitByCapability(root, defaultConfig);
    return issues
      .filter((issue) => issue.code === "QFAI-SPLIT-105")
      .map((issue) => issue.refs ?? []);
  };

  it("reports a spec id the catalog moves to another capability", async () => {
    // The spec ids were assigned in the order shown, and each spec names its
    // capability. Moving an id, by its Spec cell or by reordering the rows,
    // pairs each spec with a capability it does not name.
    expect(await splitFindings(catalogs["declared, as assigned"])).toEqual([]);
    expect(await splitFindings(catalogs["by row order, as assigned"])).toEqual([]);

    expect(await splitFindings(catalogs["declared, with the Spec cells swapped"])).toEqual([
      ["spec-0002", "CAP-0001"],
      ["spec-0001", "CAP-0002"],
    ]);
    expect(await splitFindings(catalogs["by row order, with the rows swapped"])).toEqual([
      ["spec-0001", "CAP-0002"],
      ["spec-0002", "CAP-0001"],
    ]);
  });

  it("SKILL.md makes reordering the capability-to-spec mapping a Change Request", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    const start = content.indexOf("## Arguments and Target Selection (Mandatory)");
    expect(start).toBeGreaterThanOrEqual(0);
    const next = content.indexOf("\n## ", start + 1);
    const section = content.slice(start, next === -1 ? undefined : next);
    expect(section).toContain(
      "Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.",
    );
  });
});

// TC-0013-0011: Plan Finalized After A Slice Is Grounded
// QFAI:SPEC-0013:TC-0013-0011
describe("TC-0013-0011: Plan Finalized After A Slice Is Grounded", () => {
  it("SKILL.md puts Plan finalize behind a passing slice gate", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain(
      "Plan finalize MUST happen after at least one user-story slice is grounded",
    );
    expect(content).toMatch(/Phase 3: Plan finalize \(after at least one slice gate passes\)/);
  });

  it("SKILL.md keeps the plan in the spec's own file", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("10_Plan.md");
    expect(content, "a shared plan file is not where a plan goes").not.toContain("specs/plan.md");
  });
});

// TC-0013-0012: Contract Stub Is Parseable Or Declared `none`
// QFAI:SPEC-0013:TC-0013-0012
describe("TC-0013-0012: Contract Stub Is Parseable Or Declared `none`", () => {
  async function findingsFor(apiContract: string): Promise<string[]> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0013-contract-"));
    roots.push(root);
    await mkdir(path.join(root, ".qfai", "contracts", "api"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "contracts", "api", "orders.yaml"),
      apiContract,
      "utf-8",
    );
    const issues = await validateContracts(root, contractConfig());
    return issues
      .filter((entry) => entry.file?.endsWith("orders.yaml") === true)
      .map((entry) => entry.code);
  }

  it("reports a stub that does not parse", async () => {
    const broken = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "openapi: 3.1.0",
      "paths:",
      "  /orders:",
      "   get: [unclosed",
      "",
    ].join("\n");
    expect(await findingsFor(broken)).toContain("QFAI-CONTRACT-021");
  });

  it("reports a stub that parses but declares no API", async () => {
    // Parsing is not the whole of validity: a YAML document with no `openapi`
    // key is a well-formed file that is not an API contract.
    const noApi = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "# QFAI-CONTRACT-DEPENDS-ON: -",
      "title: not an api contract",
      "",
    ].join("\n");
    expect(await findingsFor(noApi)).toContain("QFAI-CONTRACT-020");
  });

  it("SKILL.md admits `none` only with no contract impact and a reason", async () => {
    // The rule's second clause had no shipped text behind it, so a stub
    // declared `none` was bounded by nothing a reader could follow. An
    // undeclared `none` and one with no reason read identically later on.
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("`none` stands only where the change has no contract impact");
    expect(content).toMatch(/the reason is written beside it/);
  });

  it("leaves a parseable API stub alone", async () => {
    const good = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "# QFAI-CONTRACT-DEPENDS-ON: -",
      "openapi: 3.1.0",
      "info:",
      "  title: Orders",
      "  version: 1.0.0",
      "paths:",
      "  /orders:",
      "    get:",
      "      responses:",
      '        "200":',
      "          description: ok",
      "",
    ].join("\n");
    const codes = await findingsFor(good);
    expect(codes).not.toContain("QFAI-CONTRACT-021");
    expect(codes).not.toContain("QFAI-CONTRACT-020");
  });
});

// TC-0013-0013: Test Case Type Column Presence
// QFAI:SPEC-0013:TC-0013-0013
//
// The obligation is about the document SDD generates, and what this repository
// ships towards it is the template every generated pack starts from. So the
// assertions read the template: the column exists on the table authors fill,
// the four values it admits are each defined, and the sample rows demonstrate
// the pair EX-0013-0008 describes rather than a lone happy path.
//
// How much non-normal coverage a criterion owes is not asserted here. An
// approved change request narrows it from every criterion to every criterion
// that keeps a failure, and the template already reads the narrower way, so an
// assertion on the wider wording would pin the sentence that is on its way out.
describe("TC-0013-0013: Test Case Type Column Presence", () => {
  const TYPES = ["normal", "error", "boundary", "edge"];

  function firstTable(content: string): { headers: string[]; rows: Array<Map<string, string>> } {
    const cells = (line: string): string[] =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());

    const lines = content.split(/\r?\n/);
    const start = lines.findIndex((line) => /^\s*\|.*\|\s*$/.test(line));
    if (start < 0) throw new Error("the template carries no markdown table");

    const headers = cells(lines[start] ?? "");
    const rows: Array<Map<string, string>> = [];
    for (let index = start + 2; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (!/^\s*\|.*\|\s*$/.test(line)) break;
      const row = cells(line);
      rows.push(new Map(headers.map((header, column) => [header, row[column] ?? ""])));
    }
    return { headers, rows };
  }

  async function template(): Promise<string> {
    return await readFile(TEST_CASES_TEMPLATE_PATH, "utf-8");
  }

  it("the table authors fill carries a Type column", async () => {
    expect(firstTable(await template()).headers).toContain("Type");
  });

  it("each type the rule admits is defined in the template", async () => {
    const content = await template();
    for (const type of TYPES) {
      expect(content, `${type} is admitted but never defined`).toMatch(
        new RegExp("^- `" + type + "` — ", "m"),
      );
    }
  });

  it("no sample row declares a type the template does not define", async () => {
    const { rows } = firstTable(await template());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(TYPES, "a sample row demonstrates an undefined type").toContain(row.get("Type"));
    }
  });

  it("one criterion gets both a normal row and a non-normal one", async () => {
    // EX-0013-0008 is about a criterion with both a success and a failure
    // scenario, so a template whose sample rows are all `normal` would show an
    // author the shape the rule exists to rule out.
    const { rows } = firstTable(await template());
    const byCriterion = new Map<string, string[]>();
    for (const row of rows) {
      const criterion = row.get("AC-Refs") ?? "";
      byCriterion.set(criterion, [...(byCriterion.get(criterion) ?? []), row.get("Type") ?? ""]);
    }
    const paired = [...byCriterion.values()].filter(
      (types) => types.includes("normal") && types.some((type) => type !== "normal"),
    );
    expect(paired.length, "no criterion is shown with a non-normal case").toBeGreaterThan(0);
  });
});

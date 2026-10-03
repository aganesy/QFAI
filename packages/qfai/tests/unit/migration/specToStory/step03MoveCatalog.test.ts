import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { getInitAssetsDir } from "../../../../src/shared/assets.js";
import { defaultConfig, routingEntryName } from "../../../../src/core/config.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import {
  validateConstraintIds,
  validateTechArchitecture,
} from "../../../../src/core/validators/storyTreeStructure.js";
import { step03 } from "../../../../src/migration/specToStory/step03MoveCatalog.js";
import { legacyRoutingEntries } from "../../../helpers/legacyRouting.js";
import { defaultRoutingEntries } from "../../../helpers/shippedAssistant.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-migration-catalog-"));
  roots.push(root);
  const specsDir = path.join(root, ".qfai", "spec");
  const contractsDir = path.join(specsDir, "03_contract");
  await mkdir(contractsDir, { recursive: true });
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf8");
  return { root, specsDir, contractsDir, config: structuredClone(defaultConfig) };
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

/** The document schema checker's entry point, read from the package's `bin` field. */
function mdschemaCli(): string {
  const manifestPath = createRequire(import.meta.url).resolve("@jackchuka/mdschema/package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bin =
    typeof manifest === "object" && manifest !== null && "bin" in manifest
      ? manifest.bin
      : undefined;
  const entry =
    typeof bin === "string"
      ? bin
      : typeof bin === "object" && bin !== null && "mdschema" in bin
        ? bin.mdschema
        : undefined;
  if (typeof entry !== "string") throw new Error("@jackchuka/mdschema declares no bin entry");
  return path.resolve(path.dirname(manifestPath), entry);
}

/** What the shipped schema at `story/<schema>.mdschema.yml` says about one written document. */
function schemaCheck(schema: string, document: string): string {
  const schemaFile = path.resolve(
    getInitAssetsDir(),
    "..",
    "mdschema",
    "story",
    `${schema}.mdschema.yml`,
  );
  const result = spawnSync(
    process.execPath,
    [mdschemaCli(), "check", "--schema", schemaFile, document],
    {
      encoding: "utf8",
    },
  );
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/** What the shipped schema says about one written policy document. */
function conformance(specsDir: string, name: string): string {
  return schemaCheck(`01_policy/${name}`, path.join(specsDir, "01_policy", `${name}.md`));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `qfai.config.yaml` of a migrated project, as data. */
async function readConfig(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8"));
  return isRecord(parsed) ? parsed : {};
}

/** The text under `## For a person`, up to the next level-two heading; empty when there is none. */
function forAPerson(output: string): string {
  const start = output.indexOf("## For a person");
  if (start === -1) return "";
  const rest = output.slice(start + "## For a person".length);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

const defaultReviewProfilesFile = path.resolve(
  getInitAssetsDir(),
  "..",
  "defaults",
  "review-profiles.yml",
);

/** Writes the agent manifests of a project: its routing entries and its review profiles. */
async function putManifests(
  context: MigrationContext,
  routing: unknown[],
  reviewProfilesText?: string,
): Promise<void> {
  await put(context.root, ".qfai/assistant/manifest/agent-routing.yml", stringifyYaml({ routing }));
  await put(
    context.root,
    ".qfai/assistant/manifest/review-profiles.yml",
    reviewProfilesText ?? (await readFile(defaultReviewProfilesFile, "utf8")),
  );
}

/** The list item of `## For a person` that names `name`; empty when no item does. */
function itemNaming(person: string, name: string): string {
  return person.split(/\n(?=\s*[-*] )/).find((item) => item.includes(name)) ?? "";
}

function entryNamed(entries: Record<string, unknown>[], skill: string): Record<string, unknown> {
  const found = entries.find((entry) => entry.skill === skill);
  if (found === undefined) throw new Error(`no routing entry for ${skill}`);
  return found;
}

async function run(context: MigrationContext): Promise<{ code: number; output: string }> {
  let output = "";
  const code = await executePlannedStep(step03, context, false, {
    stdout: {
      write: (value) => {
        output += value;
      },
    },
    stderr: {
      write: (value) => {
        throw new Error(value);
      },
    },
  });
  return { code, output };
}

describe("migration catalog move", () => {
  it("reports a policy section with no place in the template and keeps the standard commands section", async () => {
    // QFAI:EX-0004-0006-02
    // QFAI:EX-0004-0006-04
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# Old\n\n## Out of scope\n\n- Shared item.\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/product.md",
      "# Product\n\n## Non-goals\n\n- Shared item.\n- Product item.\n\n## Pricing notes\n\nPrice marker.\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/tech.md",
      "# Tech\n\n## Standard commands (copy-paste)\n\n- Test: run test\n",
    );
    await put(
      context.root,
      ".qfai/spec/03_contract/tech.md",
      "# Technology\n\n## Standard commands (copy-paste)\n\n- Test: run test\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const objective = await readFile(
      path.join(context.specsDir, "01_policy", "objective.md"),
      "utf8",
    );
    expect(objective).toContain("## Non-goals\n\n- Shared item.\n- Product item.\n");
    expect(objective.match(/Shared item\./g)).toHaveLength(1);
    expect(objective).not.toContain("Price marker");
    expect(result.output).toContain(
      '.qfai/spec/01_policy/objective.md: rewrite "## Pricing notes" of .qfai/assistant/catalog/product.md by hand',
    );
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(tech).toContain("## Standard commands (copy-paste)\n\n- Test: run test");
    expect(tech.match(/- Test: run test/g)).toHaveLength(1);
  });

  it("writes every policy document in its template's shape from sections of the same kind", async () => {
    // QFAI:EX-0004-0006-09
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\n## Success criteria\n\n| Criterion | How it is measured |\n| --- | --- |\n| Orders are kept | A restart loses none |\n\n## Out of scope\n\n- Refunds.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/02_Initiative.md",
      "# 02 Initiative\n\n## Assumptions\n\n- One region.\n\n## Dependencies\n\n- The payment API.\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/product.md",
      "# Product\n\n## Milestones\n\n| Milestone | Description |\n| --- | --- |\n| First order | A buyer places one order. |\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/manifest.md",
      "# Manifest\n\n## Product / Mission\n\n- Summary: An order service.\n- Value: Buyers get receipts.\n\n## Axioms (Non-negotiable)\n\n- An order is never lost.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | An accepted request with a receipt. |\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      "# 07 Constraints\n\n## Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| TC-01 | Node 22 | Runtime |\n| BC-01 | EU data | Contract |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(0);
    const policy = (name: string): Promise<string> =>
      readFile(path.join(context.specsDir, "01_policy", name), "utf8");
    expect(await policy("objective.md")).toContain(
      "## Success criteria\n\n| Observable result | Measurement |\n| --- | --- |\n| Orders are kept | A restart loses none |\n\n## Non-goals\n\n- Refunds.\n",
    );
    expect(await policy("objective.md")).toContain("- Outcome: `<the change this project seeks>`");
    expect(await policy("initiative.md")).toContain(
      "## Assumptions\n\n- One region.\n\n## Dependencies\n\n- The payment API.\n\n## Milestones\n\n| Milestone | Description |\n| --- | --- |\n| First order | A buyer places one order. |\n",
    );
    expect(await policy("principle.md")).toContain(
      "## Product / Mission\n\n- Summary: An order service.\n- Value: Buyers get receipts.\n\n## Axioms (Non-negotiable)\n\n- An order is never lost.\n",
    );
    expect(await policy("glossary.md")).toBe(
      "# Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | An accepted request with a receipt. |\n",
    );
    expect(await policy("constraint.md")).toBe(
      "# Constraints\n\n## Technical Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| TC-01 | Node 22 | Runtime |\n\n## Operational Constraints\n\n| ID  | Constraint | Rationale |\n| --- | ---------- | --------- |\n\n## Business Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| BC-01 | EU data | Contract |\n",
    );
    for (const name of ["objective", "initiative", "principle", "glossary", "constraint"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
    expect(await validateConstraintIds(context.specsDir)).toEqual([]);
  });

  it("numbers each constraint section from 01 and names every ID it changed", async () => {
    // QFAI:EX-0004-0006-28
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      [
        "# 07 Constraints",
        "",
        "## Constraints",
        "",
        "| ID | Constraint | Rationale |",
        "| --- | --- | --- |",
        "| TC-02 | Runs on Linux | Adopters |",
        "| TC-05 | Runs on Windows | Adopters |",
        "| OC-03 | Releases are signed | Supply chain |",
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const target = ".qfai/spec/01_policy/constraint.md";
    for (const [section, before, after] of [
      ["Technical Constraints", "TC-02", "TC-01"],
      ["Technical Constraints", "TC-05", "TC-02"],
      ["Operational Constraints", "OC-03", "OC-01"],
    ]) {
      expect(result.output).toContain(
        `${target} ## ${section}: ${before} is now ${after}, its place in the table; update anything that cites ${before}`,
      );
    }
    const constraint = await readFile(
      path.join(context.specsDir, "01_policy", "constraint.md"),
      "utf8",
    );
    expect(constraint).toContain(
      "| TC-01 | Runs on Linux | Adopters |\n| TC-02 | Runs on Windows | Adopters |\n",
    );
    expect(constraint).toContain("| OC-01 | Releases are signed | Supply chain |\n");
    expect(conformance(context.specsDir, "constraint")).toContain("No violations");
    expect(await validateConstraintIds(context.specsDir)).toEqual([]);
  });

  it("drops the Impact column and sends a constraint that is not in plain words to a person", async () => {
    // QFAI:EX-0004-0006-27
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      [
        "# 07 Constraints",
        "",
        "## Constraints",
        "",
        "| ID | Constraint | Rationale | Impact |",
        "| --- | --- | --- | --- |",
        "| TC-01 | Runs on Linux | Adopters | CI |",
        "| TC-02 | Paths use `node:path` | Windows | Review |",
        "| OC-01 | BR-0003 holds on every release | Contract | Release |",
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const source = ".qfai/spec/_policies/07_Constraints.md";
    const target = ".qfai/spec/01_policy/constraint.md";
    expect(result.output).toContain(
      `${target}: move what the "Impact" column of "## Constraints" in ${source} states to the contract or tech.md that owns it, or drop it`,
    );
    expect(result.output).toContain(
      `${target} ## Technical Constraints: rewrite TC-02 of "## Constraints" in ${source} in plain words, with no file name, command or rule ID, by hand`,
    );
    expect(result.output).toContain(
      `${target} ## Operational Constraints: rewrite OC-01 of "## Constraints" in ${source} in plain words, with no file name, command or rule ID, by hand`,
    );
    const constraint = await readFile(
      path.join(context.specsDir, "01_policy", "constraint.md"),
      "utf8",
    );
    expect(constraint).toContain(
      "## Technical Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| TC-01 | Runs on Linux | Adopters |\n\n## Operational Constraints\n\n| ID  | Constraint | Rationale |\n| --- | ---------- | --------- |\n",
    );
    expect(conformance(context.specsDir, "constraint")).toContain("No violations");
    expect(await validateConstraintIds(context.specsDir)).toEqual([]);
  });

  it("routes the structure catalog to Skeleton lines, architecture layers and the UI paths key", async () => {
    // QFAI:EX-0004-0006-11
    // QFAI:EX-0004-0006-29
    const context = await fixture();
    await put(
      context.root,
      ".qfai/assistant/catalog/tech.md",
      "# Tech\n\n## Standard commands (copy-paste)\n\n- Test: `npm test`\n- Smoke: `api` -> `node scripts/smoke-api.mjs`\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/structure.md",
      [
        "# Structure",
        "",
        "## Key packages / entrypoints",
        "",
        "- CLI / service entry: `api` -> `US-0001-0001`",
        "- CLI / service entry: `worker` -> `US-0001-0002`",
        "- Core modules: `src/core`",
        "",
        "## Architecture",
        "",
        "| Layer | Responsibility | Depends on |",
        "| --- | --- | --- |",
        "| Shared | Small helpers | - |",
        "| CLI | Parses arguments and/or reads I/O | Shared |",
        "| Core | Lives in src/core/index.ts | - |",
        "",
        "## Architecture constraints",
        "",
        "| ID | Constraint | Rationale | Impact |",
        "| --- | --- | --- | --- |",
        "| TC-04 | src/core imports nothing from src/cli | One-way dependency | Review |",
        "|  | Names are kebab-case | Readability | Review |",
        "",
        "## UI surface paths (SSOT)",
        "",
        "ui_paths:",
        "",
        "- `src/ui/**`",
        "- `tests/e2e/**`",
        "",
        "## How to run locally",
        "",
        "Run the install command.",
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(tech).toContain("- Skeleton: `api` -> `node scripts/smoke-api.mjs`");
    expect(tech.match(/- Skeleton: /g)).toHaveLength(1);
    expect(tech).not.toContain("worker");
    expect(tech).toContain(
      '## Architecture\n\n```mermaid\nflowchart TD\n  L1["CLI"]\n  L2["Shared"]\n  L1 --> L2\n```\n\n| Layer | Responsibility | Depends on |\n| --- | --- | --- |\n| CLI | Parses arguments and/or reads I/O | Shared |\n| Shared | Small helpers | - |\n\n## Dependencies',
    );
    expect(await validateTechArchitecture(context.contractsDir)).toEqual([]);
    expect(tech).not.toContain("kebab-case");
    expect(schemaCheck("03_contract/tech", path.join(context.contractsDir, "tech.md"))).toContain(
      "No violations",
    );
    await expect(
      readFile(path.join(context.specsDir, "01_policy", "constraint.md"), "utf8"),
    ).rejects.toThrow();
    const config: unknown = parseYaml(
      await readFile(path.join(context.root, "qfai.config.yaml"), "utf8"),
    );
    expect(config).toMatchObject({ uiux: { surfacePaths: ["src/ui/**", "tests/e2e/**"] } });
    const source = ".qfai/assistant/catalog/structure.md";
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md: write a "- Skeleton: \`<entry>\` -> \`<command>\`" line for the entrypoint worker of "## Key packages / entrypoints" in ${source}, or drop it`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md: write a "- Skeleton: \`<entry>\` -> \`<command>\`" line for "Core modules: \`src/core\`" of "## Key packages / entrypoints" in ${source}, or drop it`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: rewrite the layer Core of "## Architecture" in ${source} without a path or file name by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: rewrite "## Architecture constraints" of ${source} by hand`,
    );
    expect(result.output).toContain(
      `${source}: "## How to run locally" has no place in the story tree; carry what it states by hand, or drop it`,
    );
  });

  it.each([
    [
      "layers that depend on each other",
      ["| CLI | Parses arguments | Core |", "| Core | Validates the tree | CLI |"],
      "since the layers CLI, Core depend on each other",
    ],
    [
      "a layer that depends on one with no row",
      ["| CLI | Parses arguments | Core, Shared |", "| Shared | Small helpers | - |"],
      "since the layer CLI depends on Core, which has no row",
    ],
  ])("leaves %s for a person to order", async (_label, rows, reason) => {
    // QFAI:EX-0004-0006-29
    const context = await fixture();
    await put(
      context.root,
      ".qfai/assistant/catalog/structure.md",
      [
        "# Structure",
        "",
        "## Architecture",
        "",
        "| Layer | Responsibility | Depends on |",
        "| --- | --- | --- |",
        ...rows,
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(tech).toContain("| <upper layer> |");
    expect(tech).not.toContain("Parses arguments");
    const source = ".qfai/assistant/catalog/structure.md";
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: order the layers of "## Architecture" in ${source} from the uppermost down by hand, ${reason}`,
    );
  });

  it("declares no UI surface when the structure catalog names none", async () => {
    // QFAI:EX-0004-0006-11
    const context = await fixture();
    await put(
      context.root,
      ".qfai/assistant/catalog/structure.md",
      "# Structure\n\n## UI surface paths (SSOT)\n\nui_paths:\n\n- `none`\n",
    );
    const result = await run(context);
    expect(result.code).toBe(0);
    const config: unknown = parseYaml(
      await readFile(path.join(context.root, "qfai.config.yaml"), "utf8"),
    );
    expect(config).toMatchObject({ uiux: { surfacePaths: [] } });
  });

  it("keeps the template's text where a section's content is of another kind", async () => {
    // QFAI:EX-0004-0006-10
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\nThe product-level why.\n\n## Objective\n\n- Buyers can order.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      "# 07 Constraints\n\n## Constraints\n\n| ID | Constraint | Kind | Source |\n| --- | --- | --- | --- |\n| CST-01 | No card data | regulatory | PCI |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md ## Objective: rewrite "## Objective" of .qfai/spec/_policies/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md: rewrite the text before the first section of .qfai/spec/_policies/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of .qfai/spec/_policies/07_Constraints.md by hand`,
    );
    const objective = await readFile(
      path.join(context.specsDir, "01_policy", "objective.md"),
      "utf8",
    );
    expect(objective).toContain("## Objective\n\n- Outcome: `<the change this project seeks>`");
    expect(objective).not.toContain("Buyers can order");
    expect(result.output).toContain(".qfai/spec/_policies/01_Objective.md: delete");
    await expect(
      readFile(path.join(context.specsDir, "_policies", "01_Objective.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    for (const name of ["objective", "constraint"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
  });

  it("moves an indented list and sends ragged, split and prefixed content to a person", async () => {
    // QFAI:EX-0004-0006-10
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "---\nowner: product\n---\n# 01 Objective\n\n## Out of scope\n\n  - Refunds.\n    Handled by support.\n  - Returns.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | A request |\n\n| Term | Definition |\n| --- | --- |\n| Receipt | Proof |\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      "# 07 Constraints\n\n## Constraints\n\n| ID | Constraint | Rationale | Impact |\n| --- | --- | --- | --- |\n| TC-01 | Node 22 | Runtime | Build | extra |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md: rewrite the text before the title of .qfai/spec/_policies/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/glossary.md ## Terms: rewrite "## Terms" of .qfai/spec/_policies/06_Glossary.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of .qfai/spec/_policies/07_Constraints.md by hand`,
    );
    expect(
      await readFile(path.join(context.specsDir, "01_policy", "objective.md"), "utf8"),
    ).toContain("## Non-goals\n\n- Refunds.\n  Handled by support.\n- Returns.\n");
    for (const name of ["objective", "glossary", "constraint"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
  });

  it("writes tech.md in its template's shape and its constraints to constraint.md", async () => {
    // QFAI:EX-0004-0006-17
    const context = await fixture();
    await put(
      context.root,
      ".qfai/assistant/catalog/tech.md",
      [
        "# Tech Steering",
        "",
        "## Runtime / platform",
        "",
        "- Language runtime: Node.js 22",
        "- OS assumptions: Linux",
        "",
        "## Package manager",
        "",
        "- pnpm 9",
        "",
        "## Dependencies (runtime)",
        "",
        "- `yaml`",
        "  - Parses the configuration.",
        "",
        "## Constraints",
        "",
        "| ID | Constraint | Rationale |",
        "| --- | --- | --- |",
        "| TC-01 | No native modules | Portable installs |",
        "",
        "## Standard commands (copy-paste)",
        "",
        "- Test: `pnpm test`",
        "- Smoke: `api` -> `pnpm smoke`",
        "- Build: pnpm build",
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(0);
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(tech).toContain(
      "| Component | Choice |\n| --- | --- |\n| Runtime | Node.js 22 |\n| Platform | Linux |\n",
    );
    expect(tech).toContain("| Package manager | pnpm 9 |\n");
    expect(tech).toContain("## Dependencies\n\n- `yaml`\n  - Parses the configuration.\n\n");
    expect(tech).toContain("- Test: `pnpm test`\n");
    expect(tech).toContain("- Skeleton: `api` -> `pnpm smoke`\n");
    expect(tech).toContain("- Build: `pnpm build`\n");
    expect(tech).toContain("- Install: `<install command>`\n");
    expect(tech).not.toContain("Smoke");
    expect(tech.indexOf("## Stack")).toBeLessThan(tech.indexOf("## Architecture"));
    expect(tech.indexOf("## Architecture")).toBeLessThan(tech.indexOf("## Dependencies"));
    expect(tech.indexOf("## Dependencies")).toBeLessThan(
      tech.indexOf("## Standard commands (copy-paste)"),
    );
    expect(tech).toContain("| <upper layer> |");
    expect(schemaCheck("03_contract/tech", path.join(context.contractsDir, "tech.md"))).toContain(
      "No violations",
    );
    const constraint = await readFile(
      path.join(context.specsDir, "01_policy", "constraint.md"),
      "utf8",
    );
    expect(constraint).toContain("| TC-01 | No native modules | Portable installs |\n");
    expect(conformance(context.specsDir, "constraint")).toContain("No violations");
    expect(await validateConstraintIds(context.specsDir)).toEqual([]);
  });

  it("sends the technology content tech.md cannot take to a person", async () => {
    // QFAI:EX-0004-0006-18
    const context = await fixture();
    await put(
      context.root,
      ".qfai/assistant/catalog/tech.md",
      [
        "# Tech Steering",
        "",
        "> Replace placeholder text.",
        "",
        "## Frontend",
        "",
        "Leave this out for a project with no user interface.",
        "",
        "- CSS framework: Tailwind",
        "",
        "## Dependencies (runtime)",
        "",
        "- yaml for the configuration",
        "",
        "## Constraints",
        "",
        "- No native modules.",
        "",
        "## Standard commands (copy-paste)",
        "",
        "This section is the single home for gate commands.",
        "",
        "- Test: `pnpm test`",
        "- Smoke: one line per entrypoint",
        "  named in the structure file.",
        "",
      ].join("\n"),
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const source = ".qfai/assistant/catalog/tech.md";
    const tech = ".qfai/spec/03_contract/tech.md";
    for (const line of [
      `${tech}: rewrite the text before the first section of ${source} by hand`,
      `${tech} ## Stack: rewrite "## Frontend" of ${source} by hand`,
      `${tech} ## Dependencies: rewrite "## Dependencies (runtime)" of ${source} by hand`,
      `.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of ${source} by hand`,
      `${tech} ## Standard commands (copy-paste): rewrite the part of "## Standard commands (copy-paste)" of ${source} that is not a list of labelled commands by hand`,
      `${tech} ## Standard commands (copy-paste): carry "- Smoke: one line per entrypoint" of "## Standard commands (copy-paste)" in ${source} by hand`,
    ]) {
      expect(result.output).toContain(line);
    }
    const written = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(written).toContain("- Test: `pnpm test`\n");
    for (const text of [
      "Replace placeholder",
      "Tailwind",
      "yaml for",
      "single home",
      "one line per",
    ]) {
      expect(written).not.toContain(text);
    }
    expect(
      await readFile(path.join(context.specsDir, "01_policy", "constraint.md"), "utf8"),
    ).not.toContain("No native modules");
    expect(schemaCheck("03_contract/tech", path.join(context.contractsDir, "tech.md"))).toContain(
      "No violations",
    );
  });

  it("keeps a short continuation and reports an unused column or a short row", async () => {
    // QFAI:EX-0004-0006-10
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\n## Out of scope\n\n   - Refunds.\n  Handled by support.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition | Owner |\n| --- | --- | --- |\n| Order | A request | |\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      "# 07 Constraints\n\n## Constraints\n\n| ID | Constraint | Rationale | Impact |\n| --- | --- | --- | --- |\n|| Node 22 | Runtime | Build |\n",
    );
    await put(
      context.root,
      ".qfai/assistant/catalog/product.md",
      "# Product\n\n## Non-goals\n\n   - Resale.\n- Rentals.\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const objective = await readFile(
      path.join(context.specsDir, "01_policy", "objective.md"),
      "utf8",
    );
    expect(objective).toContain("## Non-goals\n\n- Refunds.\n  Handled by support.\n");
    expect(objective).not.toContain("Rentals");
    expect(result.output).toContain(
      '.qfai/spec/01_policy/objective.md ## Non-goals: rewrite "## Non-goals" of .qfai/assistant/catalog/product.md by hand',
    );
    expect(conformance(context.specsDir, "objective")).toContain("No violations");
    expect(result.output).toContain(
      '.qfai/spec/01_policy/glossary.md ## Terms: carry the "Owner" column of "## Terms" in .qfai/spec/_policies/06_Glossary.md by hand',
    );
    expect(result.output).toContain(
      '.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of .qfai/spec/_policies/07_Constraints.md by hand',
    );
  });

  it("sends thematic breaks and HTML blocks to a person and names a section for old headings", async () => {
    // QFAI:EX-0004-0006-10
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\n## Outcome\n\nOrders can be placed.\n\n## Out of scope\n\n- Refunds.\n\n- - -\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/02_Initiative.md",
      "# 02 Initiative\n\n## Initiative\n\nShip the order flow.\n\n<!-- hidden -->\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const policies = ".qfai/spec/_policies";
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md ## Objective: rewrite "## Outcome" of ${policies}/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md ## Non-goals: rewrite "## Out of scope" of ${policies}/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/initiative.md ## Initiative: rewrite "## Initiative" of ${policies}/02_Initiative.md by hand`,
    );
    for (const name of ["objective", "initiative"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
  });

  it("sends tab-indented lists and tables with a short delimiter row to a person", async () => {
    // QFAI:EX-0004-0006-10
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\n## Out of scope\n\n- Parent\n\t- Child\n\t\t- Grandchild\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition |\n| --- |\n| Order | A request |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const policies = ".qfai/spec/_policies";
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md ## Non-goals: rewrite "## Out of scope" of ${policies}/01_Objective.md by hand`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/glossary.md ## Terms: rewrite "## Terms" of ${policies}/06_Glossary.md by hand`,
    );
  });

  it("moves a table written without its outer pipes and writes it with them", async () => {
    // QFAI:EX-0004-0006-19
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\nTerm | Definition\n--- | ---\nOrder | A request\n| Receipt | Proof of a \\| paid order\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/07_Constraints.md",
      "# 07 Constraints\n\n## Constraints\n\nID | Constraint | Rationale |\n--- | --- | --- |\nTC-01 | Node 22 | Runtime |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(0);
    const policy = (name: string): Promise<string> =>
      readFile(path.join(context.specsDir, "01_policy", name), "utf8");
    expect(await policy("glossary.md")).toBe(
      "# Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | A request |\n| Receipt | Proof of a \\| paid order |\n",
    );
    expect(await policy("constraint.md")).toContain(
      "## Technical Constraints\n\n| ID | Constraint | Rationale |\n| --- | --- | --- |\n| TC-01 | Node 22 | Runtime |\n",
    );
    for (const name of ["glossary", "constraint"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
    expect(await validateConstraintIds(context.specsDir)).toEqual([]);
  });

  it("sends a pipeless body that is not a table to a person", async () => {
    // QFAI:EX-0004-0006-19
    const context = await fixture();
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\nTerm | Definition\n--- | ---\nOrder | A request\n- Receipt | Proof\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    expect(result.output).toContain(
      '.qfai/spec/01_policy/glossary.md ## Terms: rewrite "## Terms" of .qfai/spec/_policies/06_Glossary.md by hand',
    );
  });

  it("deletes the legacy slice policy without restoring obsolete rules", async () => {
    // QFAI:EX-0004-0006-03
    // QFAI:EX-0004-0003-21
    const context = await fixture();
    const original =
      "# Slice\n\n## Principle (read first)\n\nOld CAP/spec rule.\n\n## Triage operations (8 kinds)\n\nOld TC rule.\n\n## Project choice\n\nSpecific.\n";
    await put(context.root, ".qfai/spec/_policies/11_Slice-Policy.md", original);
    const first = await run(context);
    expect(first.code).toBe(0);
    expect(first.output).toContain(".qfai/spec/_policies/11_Slice-Policy.md: delete");
    await expect(
      readFile(path.join(context.specsDir, "_policies", "11_Slice-Policy.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(path.join(context.specsDir, "01_policy", "principle.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("keeps a source whose destination exists and differs, and deletes the others", async () => {
    const context = await fixture();
    const existing = "# Objective\n\nWritten by the project.\n";
    await put(context.root, ".qfai/spec/01_policy/objective.md", existing);
    await put(
      context.root,
      ".qfai/spec/_policies/01_Objective.md",
      "# 01 Objective\n\n## Objective\n\n- Buyers can order.\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/06_Glossary.md",
      "# 06 Glossary\n\n## Terms\n\n| Term | Definition |\n| --- | --- |\n| Order | A request |\n",
    );
    const result = await run(context);
    expect(result.code).toBe(3);
    const source = ".qfai/spec/_policies/01_Objective.md";
    expect(forAPerson(result.output)).toContain(
      `${source}: kept, since .qfai/spec/01_policy/objective.md was not written; delete it once what it states is carried by hand`,
    );
    expect(result.output).not.toContain(`- ${source}: delete`);
    expect(await readFile(path.join(context.root, source), "utf8")).toContain("Buyers can order");
    expect(await readFile(path.join(context.specsDir, "01_policy", "objective.md"), "utf8")).toBe(
      existing,
    );
    expect(result.output).toContain("- .qfai/spec/_policies/06_Glossary.md: delete");
    expect(result.output).not.toContain(".qfai/spec/_policies: remove empty directory");
  });

  it("leaves the policy directory for step 4 while capability and flow sources remain", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/spec/_policies/01_Objective.md", "# Objective\n");
    await put(context.root, ".qfai/spec/_policies/03_Capabilities.md", "# Capabilities\n");
    await put(context.root, ".qfai/spec/_policies/04_Business-Flow.md", "# Flow\n");

    const first = await run(context);
    expect(first.code).toBe(0);
    expect(first.output).not.toContain(".qfai/spec/_policies: remove empty directory");
    expect(
      await readFile(path.join(context.specsDir, "_policies", "03_Capabilities.md"), "utf8"),
    ).toBe("# Capabilities\n");
    expect(
      await readFile(path.join(context.specsDir, "_policies", "04_Business-Flow.md"), "utf8"),
    ).toBe("# Flow\n");
    await expect(
      readFile(path.join(context.specsDir, "_policies", "01_Objective.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("deletes abolished directories and moves only overlays with a rule master", async () => {
    // QFAI:EX-0004-0006-06
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/drift-protocol.md", "# Rule\n");
    await put(context.root, ".qfai/assistant/constitution/drift-protocol.local.md", "local rule\n");
    await put(context.root, ".qfai/assistant/catalog/house-notes.local.md", "local notes\n");
    await put(context.root, ".qfai/assistant/process/unused.md", "process\n");
    const first = await run(context);
    expect(first.code).toBe(3);
    expect(forAPerson(first.output)).toContain(
      ".qfai/assistant/catalog/house-notes.local.md: no rule master house-notes.md exists",
    );
    expect(
      await readFile(
        path.join(context.root, ".qfai/assistant/rule/drift-protocol.local.md"),
        "utf8",
      ),
    ).toBe("local rule\n");
    for (const removed of [
      ".qfai/assistant/catalog/house-notes.local.md",
      ".qfai/assistant/process/unused.md",
    ]) {
      expect(first.output).toContain(`${removed}: delete`);
      await expect(readFile(path.join(context.root, removed))).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  it("leaves an overlay whose rule overlay already exists where it is", async () => {
    // QFAI:EX-0004-0006-07
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/house.md", "# House\n");
    await put(context.root, ".qfai/assistant/rule/house.local.md", "current overlay\n");
    await put(context.root, ".qfai/assistant/constitution/house.local.md", "legacy overlay\r\n");
    const result = await run(context);
    expect(result.code).toBe(3);
    expect(forAPerson(result.output)).toContain(
      ".qfai/assistant/constitution/house.local.md: .qfai/assistant/rule/house.local.md already exists",
    );
    expect(
      await readFile(path.join(context.root, ".qfai/assistant/rule/house.local.md"), "utf8"),
    ).toBe("current overlay\n");
    expect(
      await readFile(
        path.join(context.root, ".qfai/assistant/constitution/house.local.md"),
        "utf8",
      ),
    ).toBe("legacy overlay\r\n");
  });

  it("writes nothing and lists both overlays when constitution and catalog share one name", async () => {
    // QFAI:EX-0004-0006-08
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/house.md", "# House\n");
    await put(context.root, ".qfai/assistant/constitution/house.local.md", "constitution\n");
    await put(context.root, ".qfai/assistant/catalog/house.local.md", "catalog\n");
    await put(context.root, ".qfai/spec/_policies/01_Objective.md", "# Objective\n\nShip.\n");
    const tree = async (): Promise<Map<string, string>> => {
      const files = new Map<string, string>();
      for (const entry of await readdir(context.root, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const file = path.join(entry.parentPath, entry.name);
        files.set(path.relative(context.root, file), await readFile(file, "utf8"));
      }
      return files;
    };
    const before = await tree();
    const result = await run(context);
    expect(result.code).toBe(3);
    const person = result.output.slice(result.output.indexOf("## For a person"));
    expect(person).toContain(".qfai/assistant/constitution/house.local.md");
    expect(person).toContain(".qfai/assistant/catalog/house.local.md");
    expect(await tree()).toEqual(before);
  });

  it("deletes unconsumed files from all four retired assistant directories", async () => {
    // QFAI:EX-0004-0003-24
    const context = await fixture();
    for (const directory of ["constitution", "catalog", "manifest", "process"]) {
      await put(context.root, `.qfai/assistant/${directory}/unconsumed.md`, `${directory}\r\n`);
    }
    const result = await run(context);
    expect(result.code).toBe(0);
    for (const directory of ["constitution", "catalog", "manifest", "process"]) {
      expect(result.output).toContain(`.qfai/assistant/${directory}/unconsumed.md: delete`);
      await expect(
        readFile(path.join(context.root, `.qfai/assistant/${directory}/unconsumed.md`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        readdir(path.join(context.root, `.qfai/assistant/${directory}`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("writes only manifest entries that differ from built-in defaults", async () => {
    // QFAI:EX-0004-0006-05
    const context = await fixture();
    const defaults = { routing: await defaultRoutingEntries() };
    const unchanged = defaults.routing[0];
    const base = defaults.routing[1];
    if (unchanged === undefined || base === undefined)
      throw new Error("fewer than two default routing entries");
    const changed = { ...base, review_profile: "migration-test" };
    const changedName = routingEntryName(base);
    const unchangedName = routingEntryName(unchanged);
    if (changedName === undefined || unchangedName === undefined)
      throw new Error("a default routing entry has no name");
    // Premise: the two names are distinct and neither holds the other, and no 1.x manifest entry
    // carries the changed entry's name. A change to the installed defaults that breaks this needs
    // other entries chosen here.
    expect(changedName.includes(unchangedName) || unchangedName.includes(changedName)).toBe(false);
    const legacy = await legacyRoutingEntries();
    expect(legacy.some((entry) => routingEntryName(entry) === changedName)).toBe(false);
    await putManifests(context, [unchanged, changed]);
    const result = await run(context);
    const config = await readConfig(context.root);
    expect(config.routing).toEqual([changed]);
    expect(config.reviewProfiles).toBeUndefined();
    const person = forAPerson(result.output);
    const item = itemNaming(person, changedName);
    expect(item).toMatch(/1\.x/);
    expect(item).toMatch(/hides/i);
    expect(item).toMatch(/roles/i);
    expect(person).not.toContain(unchangedName);
    expect(result.code).toBe(3);
  });

  it("carries an entry equal to the 1.x entry of the same skill, and one changed from both", async () => {
    // QFAI:EX-0004-0006-34
    const context = await fixture();
    const legacy = await legacyRoutingEntries();
    const defaults = await defaultRoutingEntries();
    const unmodified = entryNamed(legacy, "qfai-sdd");
    const changed = { ...entryNamed(legacy, "qfai-verify"), review_profile: "migration-test" };
    // Premise: neither entry equals an installed default.
    expect(defaults.some((entry) => isDeepStrictEqual(entry, unmodified))).toBe(false);
    expect(defaults.some((entry) => isDeepStrictEqual(entry, changed))).toBe(false);
    await putManifests(context, [unmodified, changed]);
    const result = await run(context);
    const config = await readConfig(context.root);
    expect(config.routing).toEqual([unmodified, changed]);
    const person = forAPerson(result.output);
    for (const name of ["qfai-sdd", "qfai-verify"]) {
      const item = itemNaming(person, name);
      expect(item).toMatch(/1\.x/);
      expect(item).toMatch(/hides/i);
      expect(item).toMatch(/roles/i);
    }
    expect(result.code).toBe(3);
  });

  it("carries an entry whose content equals a 1.x entry but whose name differs", async () => {
    // QFAI:EX-0004-0006-34
    const context = await fixture();
    const legacy = await legacyRoutingEntries();
    const defaults = await defaultRoutingEntries();
    const renamed = { ...entryNamed(legacy, "qfai-sdd"), skill: "house-sdd" };
    // Premise: the new name belongs to no 1.x entry and no installed default.
    expect(legacy.some((entry) => routingEntryName(entry) === "house-sdd")).toBe(false);
    expect(defaults.some((entry) => routingEntryName(entry) === "house-sdd")).toBe(false);
    await putManifests(context, [renamed]);
    const result = await run(context);
    const config = await readConfig(context.root);
    const written: unknown[] = Array.isArray(config.routing) ? config.routing : [];
    expect(written).toEqual([renamed]);
    const item = itemNaming(forAPerson(result.output), "house-sdd");
    expect(item).toMatch(/1\.x/);
    expect(item).toMatch(/hides/i);
    expect(item).toMatch(/roles/i);
    // No installed entry has this name, so deleting it would not switch to an installed one.
    expect(item).not.toMatch(/to use the installed one/);
    expect(item).toMatch(/no installed entry has this name/);
    expect(result.code).toBe(3);
  });

  it("writes an override for each entry of an unedited 1.x manifest that differs from the default", async () => {
    // QFAI:EX-0004-0006-34
    const context = await fixture();
    const legacy = await legacyRoutingEntries();
    const defaults = await defaultRoutingEntries();
    const differing = legacy.filter(
      (entry) => !defaults.some((candidate) => isDeepStrictEqual(candidate, entry)),
    );
    // Premise: the manifest holds an entry equal to an installed default and one that differs.
    expect(differing.length).toBeGreaterThan(0);
    expect(differing.length).toBeLessThan(legacy.length);
    await putManifests(context, legacy);
    const result = await run(context);
    const config = await readConfig(context.root);
    expect(config.routing).toEqual(differing);
    const person = forAPerson(result.output);
    for (const entry of differing) expect(person).toContain(String(entry.skill));
    expect(result.code).toBe(3);
  });

  it("writes a changed review profile and leaves it out of the routing warning", async () => {
    // QFAI:EX-0004-0006-05
    const context = await fixture();
    const defaultProfiles: unknown = parseYaml(await readFile(defaultReviewProfilesFile, "utf8"));
    const profiles =
      isRecord(defaultProfiles) && isRecord(defaultProfiles.profiles)
        ? defaultProfiles.profiles
        : {};
    const [profileName] = Object.keys(profiles);
    if (profileName === undefined) throw new Error("the default review profiles are empty");
    const original = profiles[profileName];
    const edited = { ...(isRecord(original) ? original : {}), migrationTest: true };
    await putManifests(
      context,
      [(await defaultRoutingEntries())[0]],
      stringifyYaml({ profiles: { ...profiles, [profileName]: edited } }),
    );
    const result = await run(context);
    const config = await readConfig(context.root);
    expect(config.reviewProfiles).toEqual({ [profileName]: edited });
    const routing: unknown = config.routing ?? [];
    expect(routing).toEqual([]);
    const person = forAPerson(result.output);
    expect(person).not.toMatch(/hides/i);
    expect(person).not.toMatch(/roles/i);
  });
});

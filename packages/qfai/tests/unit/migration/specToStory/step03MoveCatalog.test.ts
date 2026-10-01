import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { getInitAssetsDir } from "../../../../src/shared/assets.js";
import { defaultConfig } from "../../../../src/core/config.js";
import {
  executePlannedStep,
  type MigrationContext,
} from "../../../../src/migration/specToStory/harness.js";
import {
  validateConstraintIds,
  validateTechArchitecture,
} from "../../../../src/core/validators/storyTreeStructure.js";
import { step03 } from "../../../../src/migration/specToStory/step03MoveCatalog.js";
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
  // QFAI:EX-0004-0006-02
  // QFAI:EX-0004-0006-04
  it("reports a policy section with no place in the template and keeps the standard commands section", async () => {
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
      '.qfai/spec/01_policy/objective.md: rewrite "## Pricing notes" of .qfai/assistant/catalog/product.md by hand (kept at .qfai/evidence/migration-spec-to-story/retired/assistant/catalog/product.md)',
    );
    const tech = await readFile(path.join(context.contractsDir, "tech.md"), "utf8");
    expect(tech).toContain("## Standard commands (copy-paste)\n\n- Test: run test");
    expect(tech.match(/- Test: run test/g)).toHaveLength(1);
  });

  // QFAI:EX-0004-0006-09
  it("writes every policy document in its template's shape from sections of the same kind", async () => {
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

  // QFAI:EX-0004-0006-28
  it("numbers each constraint section from 01 and names every ID it changed", async () => {
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

  // QFAI:EX-0004-0006-27
  it("drops the Impact column and sends a constraint that is not in plain words to a person", async () => {
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
    const kept =
      "kept at .qfai/evidence/migration-spec-to-story/retired/_policies/07_Constraints.md";
    const target = ".qfai/spec/01_policy/constraint.md";
    expect(result.output).toContain(
      `${target}: move what the "Impact" column of "## Constraints" in ${source} states to the contract or tech.md that owns it, or drop it (${kept})`,
    );
    expect(result.output).toContain(
      `${target} ## Technical Constraints: rewrite TC-02 of "## Constraints" in ${source} in plain words, with no file name, command or rule ID, by hand (${kept})`,
    );
    expect(result.output).toContain(
      `${target} ## Operational Constraints: rewrite OC-01 of "## Constraints" in ${source} in plain words, with no file name, command or rule ID, by hand (${kept})`,
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

  // QFAI:EX-0004-0006-11
  // QFAI:EX-0004-0006-29
  it("routes the structure catalog to Skeleton lines, architecture layers and the UI paths key", async () => {
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
    const kept =
      "kept at .qfai/evidence/migration-spec-to-story/retired/assistant/catalog/structure.md";
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md: write a "- Skeleton: \`<entry>\` -> \`<command>\`" line for the entrypoint worker of "## Key packages / entrypoints" in ${source}, or drop it (${kept})`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md: write a "- Skeleton: \`<entry>\` -> \`<command>\`" line for "Core modules: \`src/core\`" of "## Key packages / entrypoints" in ${source}, or drop it (${kept})`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: rewrite the layer Core of "## Architecture" in ${source} without a path or file name by hand (${kept})`,
    );
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: rewrite "## Architecture constraints" of ${source} by hand (${kept})`,
    );
    expect(result.output).toContain(
      `${source}: "## How to run locally" has no place in the story tree; carry what it states by hand, or drop it (${kept})`,
    );
  });

  // QFAI:EX-0004-0006-29
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
    const kept =
      "kept at .qfai/evidence/migration-spec-to-story/retired/assistant/catalog/structure.md";
    expect(result.output).toContain(
      `.qfai/spec/03_contract/tech.md ## Architecture: order the layers of "## Architecture" in ${source} from the uppermost down by hand, ${reason} (${kept})`,
    );
  });

  // QFAI:EX-0004-0006-11
  it("declares no UI surface when the structure catalog names none", async () => {
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

  // QFAI:EX-0004-0006-10
  it("keeps the template's text where a section's content is of another kind", async () => {
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
    const retired = ".qfai/evidence/migration-spec-to-story/retired/_policies";
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md ## Objective: rewrite "## Objective" of .qfai/spec/_policies/01_Objective.md by hand (kept at ${retired}/01_Objective.md)`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md: rewrite the text before the first section of .qfai/spec/_policies/01_Objective.md by hand (kept at ${retired}/01_Objective.md)`,
    );
    expect(result.output).toContain(
      `.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of .qfai/spec/_policies/07_Constraints.md by hand (kept at ${retired}/07_Constraints.md)`,
    );
    const objective = await readFile(
      path.join(context.specsDir, "01_policy", "objective.md"),
      "utf8",
    );
    expect(objective).toContain("## Objective\n\n- Outcome: `<the change this project seeks>`");
    expect(objective).not.toContain("Buyers can order");
    expect(await readFile(path.join(context.root, retired, "01_Objective.md"), "utf8")).toContain(
      "- Buyers can order.",
    );
    for (const name of ["objective", "constraint"]) {
      expect(conformance(context.specsDir, name), name).toContain("No violations");
    }
  });

  // QFAI:EX-0004-0006-10
  it("moves an indented list and sends ragged, split and prefixed content to a person", async () => {
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
    const retired = ".qfai/evidence/migration-spec-to-story/retired/_policies";
    expect(result.output).toContain(
      `.qfai/spec/01_policy/objective.md: rewrite the text before the title of .qfai/spec/_policies/01_Objective.md by hand (kept at ${retired}/01_Objective.md)`,
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

  // QFAI:EX-0004-0006-17
  it("writes tech.md in its template's shape and its constraints to constraint.md", async () => {
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

  // QFAI:EX-0004-0006-18
  it("sends the technology content tech.md cannot take to a person", async () => {
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
    const archive = ".qfai/evidence/migration-spec-to-story/retired/assistant/catalog/tech.md";
    const tech = ".qfai/spec/03_contract/tech.md";
    for (const line of [
      `${tech}: rewrite the text before the first section of ${source} by hand (kept at ${archive})`,
      `${tech} ## Stack: rewrite "## Frontend" of ${source} by hand (kept at ${archive})`,
      `${tech} ## Dependencies: rewrite "## Dependencies (runtime)" of ${source} by hand (kept at ${archive})`,
      `.qfai/spec/01_policy/constraint.md: rewrite "## Constraints" of ${source} by hand (kept at ${archive})`,
      `${tech} ## Standard commands (copy-paste): rewrite the part of "## Standard commands (copy-paste)" of ${source} that is not a list of labelled commands by hand (kept at ${archive})`,
      `${tech} ## Standard commands (copy-paste): carry "- Smoke: one line per entrypoint" of "## Standard commands (copy-paste)" in ${source} by hand (kept at ${archive})`,
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

  // QFAI:EX-0004-0006-10
  it("keeps a short continuation and reports an unused column or a short row", async () => {
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

  // QFAI:EX-0004-0006-10
  it("sends thematic breaks and HTML blocks to a person and names a section for old headings", async () => {
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

  // QFAI:EX-0004-0006-10
  it("sends tab-indented lists and tables with a short delimiter row to a person", async () => {
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

  // QFAI:EX-0004-0006-19
  it("moves a table written without its outer pipes and writes it with them", async () => {
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

  // QFAI:EX-0004-0006-19
  it("sends a pipeless body that is not a table to a person", async () => {
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

  // QFAI:EX-0004-0003-21
  // QFAI:EX-0004-0006-03
  it("archives the full legacy slice policy without restoring obsolete rules", async () => {
    const context = await fixture();
    const original =
      "# Slice\n\n## Principle (read first)\n\nOld CAP/spec rule.\n\n## Triage operations (8 kinds)\n\nOld TC rule.\n\n## Project choice\n\nSpecific.\n";
    await put(context.root, ".qfai/spec/_policies/11_Slice-Policy.md", original);
    const first = await run(context);
    expect(first.code).toBe(0);
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/_policies/11_Slice-Policy.md",
        ),
        "utf8",
      ),
    ).toBe(original);
    await expect(
      readFile(path.join(context.specsDir, "01_policy", "principle.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
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
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/_policies/01_Objective.md",
        ),
        "utf8",
      ),
    ).toBe("# Objective\n");

    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  // QFAI:EX-0004-0006-06
  it("archives abolished directories and moves only overlays with a rule master", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/drift-protocol.md", "# Rule\n");
    await put(context.root, ".qfai/assistant/constitution/drift-protocol.local.md", "local rule\n");
    await put(context.root, ".qfai/assistant/catalog/house-notes.local.md", "local notes\n");
    await put(context.root, ".qfai/assistant/process/unused.md", "process\n");
    const first = await run(context);
    expect(first.code).toBe(3);
    expect(first.output).toContain("house-notes.local.md");
    expect(first.output).toContain("no rule master or the overlay destination exists");
    expect(
      await readFile(
        path.join(context.root, ".qfai/assistant/rule/drift-protocol.local.md"),
        "utf8",
      ),
    ).toBe("local rule\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/assistant/catalog/house-notes.local.md",
        ),
        "utf8",
      ),
    ).toBe("local notes\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/assistant/process/unused.md",
        ),
        "utf8",
      ),
    ).toBe("process\n");
    const second = await run(context);
    expect(second.code).toBe(0);
    expect(second.output).toContain("## Operations\nnone");
  });

  // QFAI:EX-0004-0006-07
  it("archives an overlay whose rule overlay already exists and leaves that overlay alone", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/assistant/rule/house.md", "# House\n");
    await put(context.root, ".qfai/assistant/rule/house.local.md", "current overlay\n");
    await put(context.root, ".qfai/assistant/constitution/house.local.md", "legacy overlay\r\n");
    const result = await run(context);
    expect(result.code).toBe(3);
    expect(result.output).toContain(
      ".qfai/assistant/constitution/house.local.md: no rule master or the overlay destination exists",
    );
    expect(
      await readFile(path.join(context.root, ".qfai/assistant/rule/house.local.md"), "utf8"),
    ).toBe("current overlay\n");
    expect(
      await readFile(
        path.join(
          context.root,
          ".qfai/evidence/migration-spec-to-story/retired/assistant/constitution/house.local.md",
        ),
        "utf8",
      ),
    ).toBe("legacy overlay\r\n");
    await expect(
      readFile(path.join(context.root, ".qfai/assistant/constitution/house.local.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  // QFAI:EX-0004-0006-08
  it("writes nothing and lists both overlays when constitution and catalog share one name", async () => {
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

  // QFAI:EX-0004-0003-24
  it("archives unconsumed files from all four retired assistant directories", async () => {
    const context = await fixture();
    for (const directory of ["constitution", "catalog", "manifest", "process"]) {
      await put(context.root, `.qfai/assistant/${directory}/unconsumed.md`, `${directory}\r\n`);
    }
    const result = await run(context);
    expect(result.code).toBe(0);
    for (const directory of ["constitution", "catalog", "manifest", "process"]) {
      expect(
        await readFile(
          path.join(
            context.root,
            `.qfai/evidence/migration-spec-to-story/retired/assistant/${directory}/unconsumed.md`,
          ),
          "utf8",
        ),
      ).toBe(`${directory}\r\n`);
      await expect(
        readFile(path.join(context.root, `.qfai/assistant/${directory}/unconsumed.md`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await expect(
        readdir(path.join(context.root, `.qfai/assistant/${directory}`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("keeps both files when an archive destination already exists", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/assistant/process/unused.md", "new source\n");
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/retired/assistant/process/unused.md",
      "older archive\n",
    );
    await run(context);
    const archive = path.join(
      context.root,
      ".qfai/evidence/migration-spec-to-story/retired/assistant/process",
    );
    expect(await readFile(path.join(archive, "unused.md"), "utf8")).toBe("older archive\n");
    expect(await readFile(path.join(archive, "unused.md-1"), "utf8")).toBe("new source\n");
  });

  // QFAI:EX-0004-0006-05
  it("writes only manifest entries that differ from built-in defaults", async () => {
    const context = await fixture();
    const defaultsDir = path.resolve(getInitAssetsDir(), "..", "defaults");
    const defaults = { routing: await defaultRoutingEntries() };
    expect(defaults.routing.length).toBeGreaterThanOrEqual(2);
    const unchanged = defaults.routing[0];
    const changed = { ...defaults.routing[1], review_profile: "migration-test" };
    await put(
      context.root,
      ".qfai/assistant/manifest/agent-routing.yml",
      stringifyYaml({ routing: [unchanged, changed] }),
    );
    await put(
      context.root,
      ".qfai/assistant/manifest/review-profiles.yml",
      await readFile(path.join(defaultsDir, "review-profiles.yml"), "utf8"),
    );
    await run(context);
    const config = parseYaml(
      await readFile(path.join(context.root, "qfai.config.yaml"), "utf8"),
    ) as {
      routing?: Array<Record<string, unknown>>;
      reviewProfiles?: Record<string, unknown>;
    };
    expect(config.routing).toEqual([changed]);
    expect(config.reviewProfiles).toBeUndefined();
  });
});

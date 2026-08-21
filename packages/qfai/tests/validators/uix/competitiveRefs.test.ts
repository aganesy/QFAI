import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../../src/core/config.js";
import { runCanonicalUixValidators } from "../../../src/core/validators/uix/canonical.js";
import { validateCompetitiveReferences } from "../../../src/core/validators/uix/competitiveRefs.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-competitive-refs-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function classificationBlock(uiBearing: boolean): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    `- ui_bearing: ${uiBearing ? "true" : "false"}`,
    `- primary_surface: ${uiBearing ? "web" : "non-ui"}`,
    "- secondary_surfaces:",
    `- classification_rationale: ${uiBearing ? "Screen-based workflow." : "CLI-only workflow."}`,
    "",
  ].join("\n");
}

async function createPack(root: string, uiBearing: boolean): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    `# Spec\n\n- surface: ${uiBearing ? "web" : "non-ui"}\n`,
    "utf-8",
  );
  await writeFile(path.join(root, "01_Context.md"), classificationBlock(uiBearing), "utf-8");
}

function referenceBlock(name: string, overrides: Record<string, string> = {}): string {
  const fields: Record<string, string> = {
    reference: `https://example.com/${name}`,
    adopted_points: "Progressive disclosure layout adopted for the pack browser.",
    rejected_points: "Modal-heavy workflow rejected; it hides the validation state.",
    local_translation: "Translated to a status-first detail pane for validate results.",
    ...overrides,
  };
  return [
    `### Reference: ${name}`,
    "",
    ...Object.entries(fields).map(([key, value]) => `- ${key}: ${value}`),
    "",
  ].join("\n");
}

function sourcesWithRegistry(body: string[]): string {
  return [
    "# 04 Sources",
    "",
    "## Source Registry",
    "",
    "## Competitive Reference Registry",
    "",
    ...body,
    "## Traceability",
    "",
  ].join("\n");
}

function withUiux(overrides: NonNullable<QfaiConfig["uiux"]>): QfaiConfig {
  return { ...defaultConfig, uiux: { ...defaultConfig.uiux, ...overrides } };
}

describe("validateCompetitiveReferences", () => {
  it("passes when three complete references are registered", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("fails when fewer than the default minimum of three references are registered", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([referenceBlock("Linear"), referenceBlock("Stripe")]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const shortfall = issues.filter((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN");
    expect(shortfall).toHaveLength(1);
    expect(shortfall[0]?.severity).toBe("error");
    expect(shortfall[0]?.message).toContain("2");
    expect(shortfall[0]?.message).toContain("3");
    expect(shortfall[0]?.file).toBe("04_Sources.md");
  });

  it("fails when the registry section is absent entirely", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), "# 04 Sources\n\n## Traceability\n", "utf-8");

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("fails when 04_Sources.md is missing", async () => {
    const root = await newTempDir();
    await createPack(root, true);

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("flags a reference whose mandatory field is empty or a placeholder", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        referenceBlock("Vercel", { rejected_points: "TBD" }),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.severity).toBe("error");
    expect(incomplete[0]?.message).toContain("rejected_points");
    // The placeholder entry does not count toward the minimum either.
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("counts references written as a markdown table", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "| SRC-ID | Competitor | adopted_points | rejected_points | local_translation |",
        "| --- | --- | --- | --- | --- |",
        "| SRC-0008 | Linear | Editorial split hero | Dark-mode-first default | Amber pill CTA in nav-right |",
        "| SRC-0009 | Stripe | Sidebar + content pane | Card-heavy marketing | Sidebar for 15-file pack browsing |",
        "| SRC-0010 | Vercel | Status-first density | Modal-heavy workflows | Status-first validation report |",
        "",
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("honours uiux.competitive_refs_min when it raises the bound", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 5 }));
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("honours uiux.competitive_refs_min: 0 as an opt-out of the count gate", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), "# 04 Sources\n", "utf-8");

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 0 }));
    expect(issues).toEqual([]);
  });

  it("stays silent for non-UI-bearing packs", async () => {
    const root = await newTempDir();
    await createPack(root, false);

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });
});

describe("uiux.competitive_refs_min reaches the canonical UIX run", () => {
  it("fires the registry gate through runCanonicalUixValidators", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([referenceBlock("Linear")]),
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toContain("UIX-VAL-COMPETITIVE-REFS-MIN");
  });

  it("suppresses the registry gate when the knob is lowered to 0", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([referenceBlock("Linear")]),
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, withUiux({ competitive_refs_min: 0 }));
    expect(issues.map((issue) => issue.code)).not.toContain("UIX-VAL-COMPETITIVE-REFS-MIN");
  });
});

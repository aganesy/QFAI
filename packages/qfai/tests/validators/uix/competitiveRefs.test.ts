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

function sourcesWithRegistry(
  body: string[],
  heading = "## Competitive Reference Registry",
): string {
  return [
    "# 04 Sources",
    "",
    "## Source Registry",
    "",
    heading,
    "",
    ...body,
    "## Traceability",
    "",
  ].join("\n");
}

const TABLE_HEADER = [
  "| SRC-ID | Competitor | adopted_points | rejected_points | local_translation |",
  "| --- | --- | --- | --- | --- |",
];

const TABLE_ROWS = [
  "| SRC-0008 | Linear | Editorial split hero | Dark-mode-first default | Amber pill CTA in nav-right |",
  "| SRC-0009 | Stripe | Sidebar + content pane | Card-heavy marketing | Sidebar for 15-file pack browsing |",
  "| SRC-0010 | Vercel | Status-first density | Modal-heavy workflows | Status-first validation report |",
];

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

  it("accepts a decorated registry heading published packs already use", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry(
        [...TABLE_HEADER, ...TABLE_ROWS, ""],
        "## Competitive Reference Registry (UI-bearing packs)",
      ),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("ignores metadata H3 headings that sit beside a registry table", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        ...TABLE_HEADER,
        ...TABLE_ROWS,
        "",
        "### Field Definitions",
        "",
        "- **adopted_points**: What is adopted from the reference.",
        "",
        "### Validation Rules",
        "",
        "- Placeholder values are rejected.",
        "",
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("ignores a metadata table that follows the registry table", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        ...TABLE_HEADER,
        ...TABLE_ROWS,
        "",
        "### Field Definitions",
        "",
        "| Field | Meaning |",
        "| --- | --- |",
        "| adopted_points | What is adopted from the reference. |",
        "| rejected_points | What is deliberately not adopted. |",
        "",
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("counts table rows and reference blocks together", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([...TABLE_HEADER, ...TABLE_ROWS, "", referenceBlock("Notion")]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 4 }));
    expect(issues).toEqual([]);
  });

  it("rejects a mandatory value whose placeholder carries Markdown decoration", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear", { adopted_points: "`TBD`" }),
        referenceBlock("Stripe", { rejected_points: "**TODO**" }),
        referenceBlock("Vercel", { local_translation: "*[How adopted points were adapted]*" }),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(3);
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("ends the registry at an indented following heading", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Competitive Reference Registry",
        "",
        "  ## Appendix",
        "",
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["UIX-VAL-COMPETITIVE-REFS-MIN"]);
    expect(issues[0]?.message).toContain("found 0");
  });

  it("rejects the bracketed placeholders shipped by the authoring template", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("[Product/Service Name 1]", {
          adopted_points: "[What was adopted from this reference and why]",
          rejected_points: "[What was not adopted and why]",
          local_translation: "[How adopted points were adapted for this project]",
        }),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.message).toContain("adopted_points");
    expect(issues.some((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN")).toBe(true);
  });

  it("keeps completeness checks enabled when the minimum is zero", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([referenceBlock("Linear", { local_translation: "TBD" })]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 0 }));
    expect(issues.map((issue) => issue.code)).toEqual(["UIX-VAL-COMPETITIVE-REF-INCOMPLETE"]);
    expect(issues[0]?.message).toContain("local_translation");
  });

  it("un-escapes pipes instead of shifting the mandatory columns", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        ...TABLE_HEADER,
        "| SRC-0008 | Linear | Editorial split \\| offset hero | Dark-mode-first default | |",
        ...TABLE_ROWS.slice(1),
        "",
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.message).toContain("local_translation");
  });

  it("reads a mandatory field whose value is an indented block", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    const blockShaped = [
      "### Reference: Linear",
      "",
      "- reference: https://example.com/linear",
      "- adopted_points:",
      "  - Progressive disclosure layout for the pack browser.",
      "  - Single-CTA dominance in the hero.",
      "- rejected_points: Modal-heavy workflow rejected.",
      "- local_translation: Status-first detail pane for validate results.",
      "",
    ].join("\n");
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([blockShaped, referenceBlock("Stripe"), referenceBlock("Vercel")]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("still rejects an indented block that holds only template placeholders", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    const placeholderBlock = [
      "### Reference: Linear",
      "",
      "- reference: https://example.com/linear",
      "- adopted_points:",
      "  - [What was adopted from this reference and why]",
      "- rejected_points: Modal-heavy workflow rejected.",
      "- local_translation: Status-first detail pane for validate results.",
      "",
    ].join("\n");
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([placeholderBlock, referenceBlock("Stripe"), referenceBlock("Vercel")]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.message).toContain("adopted_points");
  });

  it("does not accept a near-miss column in place of a mandatory one", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "| SRC-ID | Competitor | not_adopted_points | rejected_points | local_translation |",
        "| --- | --- | --- | --- | --- |",
        ...TABLE_ROWS,
        "",
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const shortfall = issues.filter((issue) => issue.code === "UIX-VAL-COMPETITIVE-REFS-MIN");
    expect(shortfall).toHaveLength(1);
    expect(shortfall[0]?.message).toContain("found 0");
  });

  it("ignores references that only exist in a fenced sample or an HTML comment", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "Copy the shape below for each reference:",
        "",
        "```markdown",
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        "```",
        "",
        "<!--",
        referenceBlock("Vercel"),
        "-->",
        "",
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["UIX-VAL-COMPETITIVE-REFS-MIN"]);
    expect(issues[0]?.message).toContain("found 0");
  });

  it("stays silent for non-UI-bearing packs", async () => {
    const root = await newTempDir();
    await createPack(root, false);

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  // Round: the four registry-parsing / config findings raised after the merge.

  it("picks the registry itself, not an explanatory section named after it", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    // Authoring guidance routinely sits ahead of the registry. The prefix match
    // selected `## Competitive Reference Registry Expectations`, ended the
    // section at the next H2, and reported `found 0` over a complete registry.
    await writeFile(
      path.join(root, "04_Sources.md"),
      [
        "# 04 Sources",
        "",
        "## Competitive Reference Registry Expectations",
        "",
        "Register at least three references, each with all three mandatory fields.",
        "",
        "## Competitive Reference Registry (UI-bearing packs)",
        "",
        referenceBlock("Linear"),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
        "## Traceability",
        "",
      ].join("\n"),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("rejects a placeholder that carries punctuation or a note", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear", {
          adopted_points: "TBD.",
          rejected_points: "TODO: fill this",
          local_translation: "N/A (pending)",
        }),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, defaultConfig);
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.message).toContain("adopted_points");
    expect(incomplete[0]?.message).toContain("rejected_points");
    expect(incomplete[0]?.message).toContain("local_translation");
    expect(issues.map((issue) => issue.code)).toContain("UIX-VAL-COMPETITIVE-REFS-MIN");
  });

  // The over-correction pin: a populated value may legitimately OPEN with a
  // placeholder word. Only a punctuation-introduced suffix makes it one.
  it("keeps prose that merely opens with a placeholder word populated", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        referenceBlock("Linear", {
          adopted_points: "None of the competitors ship this, so the split hero is ours.",
        }),
        referenceBlock("Stripe"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  it("does not read a mandatory field nested under another field as the reference's own", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    // Two malformed shapes at once: all three keys buried under `- notes:`, and
    // the three chained so each empty parent could be "populated" by its
    // child's label. Both used to count as complete references.
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        [
          "### Reference: Linear",
          "",
          "- reference: https://example.com/linear",
          "- notes:",
          "  - adopted_points: Editorial split hero.",
          "  - rejected_points: Dark-mode-first default.",
          "  - local_translation: Amber pill CTA in nav-right.",
          "",
        ].join("\n"),
        [
          "### Reference: Stripe",
          "",
          "- reference: https://example.com/stripe",
          "- adopted_points:",
          "  - rejected_points:",
          "    - local_translation:",
          "",
        ].join("\n"),
        referenceBlock("Vercel"),
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 0 }));
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(2);
    for (const issue of incomplete) {
      for (const field of ["adopted_points", "rejected_points", "local_translation"]) {
        expect(issue.message).toContain(field);
      }
    }
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

  // CommonMark accepts up to three leading spaces before a heading, and the H2
  // matcher already did. Anchoring the block split at column 0 left an indented
  // pack as one unsplit chunk whose first line is not a `### Reference:`, so
  // every complete reference in it went uncounted.
  it("parses reference blocks whose headings carry CommonMark indentation", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "The registry follows.",
        "",
        ...["Linear", "Stripe", "Vercel"].map((name) =>
          referenceBlock(name)
            .split("\n")
            .map((line) => (line.length > 0 ? `   ${line}` : line))
            .join("\n"),
        ),
      ]),
      "utf-8",
    );

    await expect(validateCompetitiveReferences(root, defaultConfig)).resolves.toEqual([]);
  });

  // Discarding the whole table when one mandatory column is absent meant its
  // registered rows drew no completeness finding — invisibly, wherever the
  // count gate was already satisfied or switched off.
  it("still reports the rows of a registry table that renamed a mandatory column", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "| SRC-ID | Competitor | not_adopted_points | rejected_points | local_translation |",
        "| --- | --- | --- | --- | --- |",
        ...TABLE_ROWS,
        "",
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 0 }));
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(TABLE_ROWS.length);
    for (const issue of incomplete) {
      expect(issue.message).toContain("adopted_points");
    }
    // The renamed column is the only one missing; the other two still resolve.
    expect(incomplete[0]?.message).not.toContain("rejected_points");
  });

  // The discriminator is "carries at least one mandatory column". A table with
  // none of them is documentation, and reading its rows as references was the
  // regression the whole-header requirement was originally added to stop.
  it("still ignores a metadata table when a mandatory column is renamed above it", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(
      path.join(root, "04_Sources.md"),
      sourcesWithRegistry([
        "| SRC-ID | Competitor | not_adopted_points | rejected_points | local_translation |",
        "| --- | --- | --- | --- | --- |",
        ...TABLE_ROWS,
        "",
        "### Field Definitions",
        "",
        "| Field | Meaning |",
        "| --- | --- |",
        "| adopted_points | What is adopted from the reference. |",
        "",
      ]),
      "utf-8",
    );

    const issues = await validateCompetitiveReferences(root, withUiux({ competitive_refs_min: 0 }));
    const incomplete = issues.filter(
      (issue) => issue.code === "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
    );
    expect(incomplete).toHaveLength(TABLE_ROWS.length);
    for (const issue of incomplete) {
      expect(issue.message).not.toContain("What is adopted");
    }
  });
});

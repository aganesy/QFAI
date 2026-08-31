import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";

const TRIAGE_SECTION = [
  "## Triage",
  "",
  "| Source   | Subject          | Existing Spec | Operation | Sub-op | Approved By | Rationale                        |",
  "| -------- | ---------------- | ------------- | --------- | ------ | ----------- | -------------------------------- |",
  "| REQ-0042 | rename the token | spec-0007     | UPDATE    | MODIFY | -           | AC-0007-0004 references the term |",
  "| REQ-0042 | rename the token | spec-0009     | UPDATE    | REMOVE | user@host   | BR-0009-0002 obsoleted by rename |",
];

async function withPolicies(
  delta: string,
  assertion: (issues: Awaited<ReturnType<typeof validateLayeredTraceability>>) => void,
  extraPolicyFiles: Record<string, string> = {},
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-policies-triage-"));
  try {
    const specsDir = path.join(root, ".qfai", "specs");
    const policiesDir = path.join(specsDir, "_policies");
    const specDir = path.join(specsDir, "spec-0001");
    await mkdir(policiesDir, { recursive: true });
    await mkdir(specDir, { recursive: true });

    // Minimal layered spec so the validator has an entry to walk.
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n- Parent: CAP-0001\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# 03 AC\n", "utf-8");
    await writeFile(
      path.join(policiesDir, "03_Capabilities.md"),
      "# Capabilities\n\n## CAP-0001\n",
      "utf-8",
    );
    await writeFile(path.join(policiesDir, "10_delta.md"), delta, "utf-8");
    for (const [fileName, content] of Object.entries(extraPolicyFiles)) {
      await writeFile(path.join(policiesDir, fileName), content, "utf-8");
    }

    assertion(await validateLayeredTraceability(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const policyScopeFindings = (
  issues: Awaited<ReturnType<typeof validateLayeredTraceability>>,
): string[] =>
  issues
    .filter(
      (entry) => entry.code === "QFAI-LAYER-100" || entry.code === "TRACE_SHARED_SCOPE_VIOLATION",
    )
    .flatMap((entry) => entry.refs ?? []);

describe("_policies scope bans carve out the mandated Triage table", () => {
  it("does not fire on IDs cited inside the ## Triage section", async () => {
    await withPolicies(["# 10 Delta", "", ...TRIAGE_SECTION, ""].join("\n"), (issues) => {
      expect(policyScopeFindings(issues)).toEqual([]);
    });
  });

  it("still fires on a lower-layer ID outside the Triage section", async () => {
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, "", "## Notes", "", "Owns AC-0007-0004.", ""].join(
        "\n",
      ),
      (issues) => {
        expect(policyScopeFindings(issues)).toContain("AC-0007-0004");
      },
    );
  });

  it("reports the full composite ID, not a truncated prefix", async () => {
    await withPolicies(
      ["# 10 Delta", "", "## Notes", "", "Owns BR-0009-0002.", ""].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("BR-0009-0002");
        expect(refs).not.toContain("BR-0009");
      },
    );
  });

  it("resumes scanning after the Triage section ends", async () => {
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, "", "## Impact", "", "TC-0003-0001 changes.", ""].join(
        "\n",
      ),
      (issues) => {
        expect(policyScopeFindings(issues)).toContain("TC-0003-0001");
      },
    );
  });

  it("does not exempt a ## Triage heading in another _policies file", async () => {
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, ""].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("AC-0001-0009");
        expect(refs).toContain("BR-0001-0003");
      },
      {
        "11_Slice-Policy.md": [
          "# Slice Policy",
          "",
          "## Triage",
          "",
          "Owns AC-0001-0009.",
          "",
        ].join("\n"),
        "01_Objective.md": ["# Objective", "", "## Triage", "", "Owns BR-0001-0003.", ""].join(
          "\n",
        ),
      },
    );
  });

  it("exempts every canonical `## Triage` section, not just the first", async () => {
    // A re-run appends a second `## Triage` rather than extending the first
    // table; `validateTriageSection` reads both, so both must be exempt or
    // the two rules are jointly unsatisfiable for the appended one.
    await withPolicies(
      ["# 10 Delta", "", ...TRIAGE_SECTION, "", ...TRIAGE_SECTION, ""].join("\n"),
      (issues) => {
        expect(policyScopeFindings(issues)).toEqual([]);
      },
    );
  });

  it("only exempts the canonical `## Triage` H2, not near-miss headings", async () => {
    const row = "| REQ-0042 | x | spec-0007 | UPDATE | MODIFY | - | AC-0007-0004 renamed |";
    const table = [
      "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
      "| -------- | ------- | ------------- | --------- | ------ | ----------- | --------- |",
      row,
    ];
    for (const heading of ["# Triage", "### Triage", "## Triage notes"]) {
      await withPolicies(["# 10 Delta", "", heading, "", ...table, ""].join("\n"), (issues) => {
        expect(policyScopeFindings(issues)).toContain("AC-0007-0004");
      });
    }
  });

  it("exempts only rows of a parsed table, not a stray pipe-prefixed line", async () => {
    // `parseAllMarkdownTables` does not read a lone pipe line as a table, so no
    // Triage validator inspects it; blanking it here would hide the edge from
    // the only checks that cover it.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        ...TRIAGE_SECTION,
        "",
        "| - Parent: US-0001-0001 |",
        "",
        "| AC-0001-0001 | orphan header without separator |",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("US-0001-0001");
        expect(refs).toContain("AC-0001-0001");
        // The mandated table's own citations stay exempt.
        expect(refs).not.toContain("AC-0007-0004");
        expect(refs).not.toContain("BR-0009-0002");
      },
    );
  });

  it("exempts a table whose separator omits the trailing pipe", async () => {
    // `isTableSeparator` accepts `| --- | ---`, so the Triage validators DO
    // parse this table and require its `Existing Spec` cell — a stricter local
    // regex left it unmasked and raised QFAI-LAYER-100 on the required cell.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        "## Triage",
        "",
        "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale",
        "| -------- | ------- | ------------- | --------- | ------ | ----------- | ---------",
        "| REQ-0042 | rename  | spec-0007     | UPDATE    | MODIFY | -           | AC-0007-0004 renamed",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).not.toContain("spec-0007");
        expect(refs).not.toContain("AC-0007-0004");
      },
    );
  });

  it("does not mask a column the Triage validators never inspect", async () => {
    // `validateTriageSection` only checks for MISSING required columns, so an
    // extra `Parent` column is accepted — and blanking the whole row hid the
    // ownership edge it carries from every check that covers it.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        "## Triage",
        "",
        "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale | Parent       |",
        "| -------- | ------- | ------------- | --------- | ------ | ----------- | --------- | ------------ |",
        "| REQ-0042 | rename  | spec-0007     | UPDATE    | MODIFY | -           | see below | US-0001-0001 |",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("US-0001-0001");
        // The canonical columns are still exempt.
        expect(refs).not.toContain("spec-0007");
      },
    );
  });

  it("does not exempt a second table under ## Triage that is not the mandated one", async () => {
    // The carve-out keyed on "is a table inside `## Triage`", so an author
    // could add a table reusing one or two canonical column names and park
    // prohibited IDs in those cells — the mask blanked them and the ban never
    // saw them. Exemption now requires the full canonical column set.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        ...TRIAGE_SECTION,
        "",
        "| Existing Spec | Rationale                        |",
        "| ------------- | -------------------------------- |",
        "| spec-0003     | AC-0003-0001 owns this behaviour |",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        // The decoy table earns no exemption. (`spec-NNNN` is not asserted:
        // the v1421 ban pattern covers US/AC/BR/EX/TC only.)
        expect(refs).toContain("AC-0003-0001");
        // The mandated table above it is unaffected.
        expect(refs).not.toContain("AC-0007-0004");
      },
    );
  });

  it("keeps the exemption when the mandated columns are reordered", async () => {
    // `validateTriageSection` resolves every column by name, so a reordered
    // table is still the mandated one and must keep the carve-out.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        "## Triage",
        "",
        "| Operation | Sub-op | Source   | Subject | Existing Spec | Approved By | Rationale                        |",
        "| --------- | ------ | -------- | ------- | ------------- | ----------- | -------------------------------- |",
        "| UPDATE    | MODIFY | REQ-0042 | rename  | spec-0007     | -           | AC-0007-0004 references the term |",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).not.toContain("AC-0007-0004");
      },
    );
  });

  it("does not open a section for a `## Triage` example inside a fenced block", async () => {
    // The heading scan ran on raw text, so a format example in a fence opened a
    // section no Triage validator reads — and the carve-out then blanked the
    // prohibited IDs of the next seven-column table.
    await withPolicies(
      [
        "# 10 Delta",
        "",
        ...TRIAGE_SECTION,
        "",
        "## Notes",
        "",
        "追記するときの書式:",
        "",
        "```markdown",
        "## Triage",
        "",
        "| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
        "| ------ | ------- | ------------- | --------- | ------ | ----------- | --------- |",
        "```",
        "",
        "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale            |",
        "| -------- | ------- | ------------- | --------- | ------ | ----------- | -------------------- |",
        "| REQ-0043 | rename  | spec-0008     | UPDATE    | MODIFY | -           | AC-0008-0004 renamed |",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        // The table after the fence sits in no Triage section at all.
        expect(refs).toContain("AC-0008-0004");
        // The real section above keeps its exemption.
        expect(refs).not.toContain("AC-0007-0004");
      },
    );
  });

  it("does not open a section for a `## Triage` example inside an HTML comment", async () => {
    await withPolicies(
      [
        "# 10 Delta",
        "",
        ...TRIAGE_SECTION,
        "",
        "## Notes",
        "",
        "<!--",
        "## Triage",
        "(過去の草案。復活させる場合は上の表に追記する)",
        "-->",
        "",
        "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale            |",
        "| -------- | ------- | ------------- | --------- | ------ | ----------- | -------------------- |",
        "| REQ-0043 | rename  | spec-0008     | UPDATE    | MODIFY | -           | AC-0008-0004 renamed |",
        "",
      ].join("\n"),
      (issues) => {
        expect(policyScopeFindings(issues)).toContain("AC-0008-0004");
      },
    );
  });

  it("exempts only table rows, never definitions or ownership edges inside Triage", async () => {
    await withPolicies(
      [
        "# 10 Delta",
        "",
        ...TRIAGE_SECTION,
        "",
        "### AC-0001-0001",
        "",
        "- Parent: US-0001-0001",
        "",
      ].join("\n"),
      (issues) => {
        const refs = policyScopeFindings(issues);
        expect(refs).toContain("AC-0001-0001");
        expect(refs).toContain("US-0001-0001");
        // The mandated table's own citations stay exempt.
        expect(refs).not.toContain("AC-0007-0004");
        expect(refs).not.toContain("BR-0009-0002");
      },
    );
  });
});

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayeredTraceability } from "../../src/core/validators/layeredTraceability.js";
import { validateOrphanProhibition } from "../../src/core/validators/orphanProhibition.js";
import { validateSpecSplitByCapability } from "../../src/core/validators/specSplitByCapability.js";

describe("v1.4.36 layered validators", () => {
  it("passes spec split by capability when CAP count and spec count match", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores CAP mentions in prose outside the CAP Catalog table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
        prose: "- 運用健全性は CAP-0003 が所有する（参考記述）。",
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores CAP mentions in the Notes cell of the CAP Catalog table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
        notes: { "CAP-0001": "CAP-0003 と併せて読むこと" },
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores a table that sits outside the CAP Catalog section", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], {
        trailingSection: [
          "## Related capabilities (reference)",
          "",
          "| CAP ID   | Owner |",
          "| -------- | ----- |",
          "| CAP-9999 | ops   |",
        ],
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores an illustrative CAP Catalog heading inside a fenced sample", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
        preamble: [
          "旧フォーマットの例:",
          "",
          "```markdown",
          "## CAP Catalog",
          "",
          "| CAP ID | Statement |",
          "| ------ | --------- |",
          "| CAP-0001 | example |",
          "```",
        ],
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores an illustrative CAP Catalog heading inside an HTML comment", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
        preamble: [
          "<!--",
          "## CAP Catalog",
          "",
          "| CAP ID | Statement |",
          "| ------ | --------- |",
          "| CAP-0001 | example |",
          "-->",
        ],
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores a fenced CAP mention in the whole-file fallback", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "- CAP-0001: capability",
          "",
          "## Example",
          "",
          "```markdown",
          "- CAP-0009: 追加するときはこの形式で書く",
          "```",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Over-correction pin: masking must not blank or truncate the real catalog
  // when the document illustrates its own format after it.
  it("still reads the real catalog when a fenced sample follows it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], {
        trailingSection: [
          "## Example",
          "",
          "```markdown",
          "| CAP ID | Statement |",
          "| ------ | --------- |",
          "| CAP-0009 | example |",
          "```",
        ],
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps column positions when an earlier cell holds an escaped pipe", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"]);
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "## CAP Catalog",
          "",
          "| Statement           | CAP ID   | Notes |",
          "| ------------------- | -------- | ----- |",
          "| grep foo \\| wc -l  | CAP-0001 | note  |",
          "| plain statement     | CAP-0002 | note  |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("falls back to whole-file CAP order when the catalog has no table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      const capabilitiesPath = path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md");
      await writeFile(
        capabilitiesPath,
        ["# 03 Capabilities", "", "- CAP-0001: capability", ""].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails spec split when CAP count and spec count mismatch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-SPLIT-102")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails layered traceability when Parent is missing or down-ref exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const acPath = path.join(root, ".qfai", "specs", "spec-0001", "03_Acceptance-Criteria.md");
      await writeFile(
        acPath,
        ["# 03 Acceptance Criteria", "", "## AC-0001: title", "- Notes: no parent", ""].join("\n"),
        "utf-8",
      );
      const usPath = path.join(root, ".qfai", "specs", "spec-0001", "02_User-stories.md");
      await writeFile(
        usPath,
        [
          "# 02 User Stories",
          "",
          "## US-0001: title",
          "- Parent: CAP-0001",
          "- Notes: AC-0001 should not appear here.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateLayeredTraceability(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-LAYER-102")).toBe(true);
      expect(issues.some((issue) => issue.code === "TRACE_DOWNSTREAM_REF")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails orphan prohibition when TC points to unknown EX", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const tcPath = path.join(root, ".qfai", "specs", "spec-0001", "06_Test-Cases.md");
      await writeFile(
        tcPath,
        ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-9999", ""].join("\n"),
        "utf-8",
      );

      const issues = await validateOrphanProhibition(root, defaultConfig);
      expect(issues.some((issue) => issue.code === "QFAI-ORPHAN-109")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedPolicies(
  root: string,
  capIds: string[],
  options: {
    prose?: string;
    preamble?: string[];
    notes?: Record<string, string>;
    trailingSection?: string[];
  } = {},
): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });

  const capLines = capIds
    .map((capId) => `| ${capId} | capability | metric | ${options.notes?.[capId] ?? "note"} |`)
    .join("\n");
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    [
      "# 03 Capabilities",
      "",
      ...(options.prose ? [options.prose, ""] : []),
      ...(options.preamble ? [...options.preamble, ""] : []),
      "## CAP Catalog",
      "",
      "| CAP ID | Statement | Success metrics | Notes |",
      "| ------ | --------- | --------------- | ----- |",
      capLines,
      "",
      ...(options.trailingSection ?? []),
      "",
    ].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(policiesDir, "01_Objective.md"),
    "# 01 Objective\n\n- objective\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "02_Initiative.md"),
    "# 02 Initiative\n\n- initiative\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "04_Business-Flow.md"),
    "# 04 Business Flow\n\n```mermaid\nflowchart TD\n  A --> B\n```\n",
    "utf-8",
  );
  await writeFile(
    path.join(policiesDir, "11_Slice-Policy.md"),
    "# 11 Slice Policy\n\n- structural: 1 pack-type = 1 spec\n",
    "utf-8",
  );
}

async function seedSpec(root: string, specNumber: string, capId: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await writeFile(
    path.join(specDir, "01_Spec.md"),
    [`# 01 Spec`, ``, `- Spec: spec-${specNumber}`, `- Parent: ${capId}`, ``].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User Stories", "", "## US-0001: title", `- Parent: ${capId}`, ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "03_Acceptance-criteria.md"),
    ["# 03 Acceptance Criteria", "", "## AC-0001: title", "- Parent: US-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "04_Business-Rules.md"),
    ["# 04 Business Rules", "", "## BR-0001: title", "- Parent: AC-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "05_Examples.md"),
    [
      "# 05 Examples",
      "",
      "## EX-0001: title",
      "- Parent: BR-0001",
      "- Given: precondition",
      "- When: action",
      "- Then: result",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test Cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(specDir, "07_Decisions.md"), "# 07 Decisions\n", "utf-8");
  await writeFile(path.join(specDir, "08_Open-questions.md"), "# 08 Open Questions\n", "utf-8");
  await writeFile(path.join(specDir, "09_delta.md"), "# Delta\n", "utf-8");
  await writeFile(path.join(specDir, "10_Plan.md"), "# Plan\n", "utf-8");
}

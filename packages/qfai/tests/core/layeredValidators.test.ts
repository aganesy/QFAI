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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, {
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, {
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], undefined, {
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, {
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, {
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], undefined, {
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

  it("accepts an ID gap left by an approved DELETE when the catalog declares the mapping", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // spec-0002 was deleted with its capability; 11_Slice-Policy.md forbids
      // renumbering spec-0003, so the surviving directories keep their IDs.
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports a spec directory the declared mapping does not name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      expect(codes).toContain("QFAI-SPLIT-103");
      expect(codes).toContain("QFAI-SPLIT-104");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("compares the declared pair, not the positional one, for the CAP back-reference", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0009");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const parentIssue = issues.find((issue) => issue.code === "QFAI-SPLIT-105");
      expect(parentIssue?.refs).toEqual(["spec-0003", "CAP-0003"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a CAP row that declares no spec directory of its own", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001", null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports two CAP rows that declare the same spec directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001", "spec-0001"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["spec-0001 (CAP-0001, CAP-0002)"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats an all-blank Spec column as a declared mapping, not as a legacy catalog", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The column exists, so the catalog opted into the declared mapping; the
      // sequential directories must not smuggle the positional derivation back.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], [null, null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001", "CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not synthesise a positional directory for a blank Spec cell", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", null]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      // Only the missing declaration is reported: no 103 for a phantom
      // spec-0002, and no 104 for the directory the blank row still owns.
      expect(codes).toEqual(["QFAI-SPLIT-106"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a CAP that occupies more than one catalog row", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0001"], ["spec-0001", "spec-0001"]);
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a repeated CAP row even when the second row names another spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0001"], ["spec-0001", "spec-0002"]);
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping.map((issue) => issue.refs)).toEqual([["CAP-0001"]]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a Spec cell that declares more than one directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // Taking only the first match would let `spec-0001 / spec-0002` pass as
      // long as spec-0001 exists, even though a row declares exactly one.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001 / spec-0002", "spec-0002"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-106"]);
      expect(issues[0]?.refs).toEqual(["CAP-0001"]);
      expect(issues[0]?.message).toContain("複数の spec ディレクトリ");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stops at the end of the catalog table instead of reading a later one", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // A change-log table that reuses the same column positions, inside the
      // catalog's own section, must not be folded in as a second catalog row
      // for CAP-0001.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["spec-0001", "spec-0002"], {
        trailingMarkdown: [
          "| CAP ID | Spec | Change |",
          "| --- | --- | --- |",
          "| CAP-0001 | spec-0002 | moved before the split |",
          "",
        ].join("\n"),
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads the table under the CAP Catalog heading, not an earlier one", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // A migration table placed above the catalog declares a complete, valid
      // mapping while the catalog itself leaves every Spec cell blank. Taking
      // the first table with both headers would let that blank catalog pass.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], [null, null], {
        leadingMarkdown: [
          "## Migration record",
          "",
          "| CAP ID | Spec | Note |",
          "| --- | --- | --- |",
          "| CAP-0001 | spec-0001 | migrated |",
          "| CAP-0002 | spec-0002 | migrated |",
          "",
        ].join("\n"),
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001", "CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reads a catalog written without the CAP Catalog heading", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"], ["spec-0001", "spec-0003"], {
        heading: false,
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats an escaped pipe in a Spec cell as text, not as a column boundary", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // `owner \| spec-0001` is one GFM cell declaring one directory. Splitting
      // on every `|` would shift the columns and drop the id, so the row would
      // draw a bogus QFAI-SPLIT-106.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], ["owner \\| spec-0001", "spec-0002"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats a markdown link in a Spec cell as one declaration, not two", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // `[spec-0001](../spec-0001)` names the id twice — label and target — and
      // `[Spec-0002](../spec-0002)` a third way, with different case. Counting
      // raw matches would call each cell ambiguous and stop the final gate on a
      // QFAI-SPLIT-106 that no legal edit clears.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002"],
        ["[spec-0001](../spec-0001)", "[Spec-0002](../spec-0002)"],
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores a commented-out catalog table above the live one", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The retired mapping is inside an HTML comment directly under the
      // heading. Reading raw markdown adopts it as the catalog, and the live
      // table's all-blank Spec column then passes unreported.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], [null, null], {
        sectionPreamble: [
          "<!--",
          "| CAP ID | Spec | Note |",
          "| --- | --- | --- |",
          "| CAP-0001 | spec-0001 | before the migration |",
          "| CAP-0002 | spec-0002 | before the migration |",
          "-->",
          "",
        ].join("\n"),
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001", "CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores a fenced catalog example above the live table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The catalog document illustrates its own format; the sample must not
      // outrank the table it illustrates.
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], [null, null], {
        sectionPreamble: [
          "```markdown",
          "| CAP ID | Spec | Note |",
          "| --- | --- | --- |",
          "| CAP-0001 | spec-0001 | example |",
          "| CAP-0002 | spec-0002 | example |",
          "```",
          "",
        ].join("\n"),
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mapping = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mapping).toHaveLength(1);
      expect(mapping[0]?.refs).toEqual(["CAP-0001", "CAP-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not demand a catalog row for a CAP named only inside a comment", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The CAP roll-call and the declared mapping must read the same masked
      // document. Masking only the table would leave the commented CAP in the
      // roll-call and demand a row the live catalog rightly does not carry.
      await seedPolicies(root, ["CAP-0001"], ["spec-0001"], {
        sectionPreamble: "<!-- CAP-0002 was retired by an approved DELETE -->\n",
      });
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the positional derivation when the catalog declares no Spec column", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0003"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const codes = issues.map((issue) => issue.code);
      expect(codes).toContain("QFAI-SPLIT-103");
      expect(codes).toContain("QFAI-SPLIT-104");
      expect(codes).not.toContain("QFAI-SPLIT-106");
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

interface SeedPoliciesOptions {
  /** Markdown emitted before the `## CAP Catalog` heading. */
  readonly leadingMarkdown?: string;
  /** Markdown emitted inside the catalog section, above the catalog table. */
  readonly sectionPreamble?: string;
  /** Markdown appended after the catalog table. */
  readonly trailingMarkdown?: string;
  /** Set to `false` for a legacy catalog written without the heading. */
  readonly heading?: boolean;
  /** Markdown emitted before the heading, ahead of `preamble`. */
  readonly prose?: string;
  /** Further lines emitted before the heading. */
  readonly preamble?: string[];
  /** Per-CAP `Notes` cell content, keyed by CAP id. */
  readonly notes?: Record<string, string>;
  /** Lines appended after the catalog table, ahead of `trailingMarkdown`. */
  readonly trailingSection?: string[];
}

/**
 * Seeds `_policies`. Pass `declaredSpecIds` to emit the `Spec` column that
 * declares the CAP -> spec directory mapping; `null` leaves a row's cell empty.
 * Omit it to get the legacy catalog with no `Spec` column at all.
 */
async function seedPolicies(
  root: string,
  capIds: string[],
  declaredSpecIds?: (string | null)[],
  options: SeedPoliciesOptions = {},
): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });

  const header = declaredSpecIds
    ? ["| CAP ID | Spec | Statement | Success metrics | Notes |", "| --- | --- | --- | --- | --- |"]
    : [
        "| CAP ID | Statement | Success metrics | Notes |",
        "| ------ | --------- | --------------- | ----- |",
      ];
  const capLines = capIds
    .map((capId, index) =>
      declaredSpecIds
        ? `| ${capId} | ${declaredSpecIds[index] ?? ""} | capability | metric | ${options.notes?.[capId] ?? "note"} |`
        : `| ${capId} | capability | metric | ${options.notes?.[capId] ?? "note"} |`,
    )
    .join("\n");
  const heading = options.heading === false ? [] : ["## CAP Catalog", ""];
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    [
      "# 03 Capabilities",
      "",
      ...(options.prose ? [options.prose, ""] : []),
      ...(options.preamble ? [...options.preamble, ""] : []),
      options.leadingMarkdown ?? "",
      ...heading,
      options.sectionPreamble ?? "",
      ...header,
      capLines,
      "",
      ...(options.trailingSection ?? []),
      options.trailingMarkdown ?? "",
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

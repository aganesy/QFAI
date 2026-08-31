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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, undefined, {
        leader: ["- 運用健全性は CAP-0003 が所有する（参考記述）。", ""],
        catalogHeading: true,
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
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        undefined,
        { "CAP-0001": "CAP-0003 と併せて読むこと" },
        { catalogHeading: true },
      );
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], undefined, undefined, {
        catalogHeading: true,
        trailer: [
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, undefined, {
        catalogHeading: true,
        leader: [
          "旧フォーマットの例:",
          "",
          "```markdown",
          "## CAP Catalog",
          "",
          "| CAP ID | Statement |",
          "| ------ | --------- |",
          "| CAP-0001 | example |",
          "```",
          "",
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], undefined, undefined, {
        catalogHeading: true,
        leader: [
          "<!--",
          "## CAP Catalog",
          "",
          "| CAP ID | Statement |",
          "| ------ | --------- |",
          "| CAP-0001 | example |",
          "-->",
          "",
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
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], undefined, undefined, {
        catalogHeading: true,
        trailer: [
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

  it("passes spec split when the declared Spec column matches row position", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001", "CAP-0002"], {
        "CAP-0001": "spec-0001",
        "CAP-0002": "spec-0002",
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports the moved CAP rows instead of spec-level errors when a row is inserted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // CAP-0009 was inserted between CAP-0001 and CAP-0002, so row position now
      // derives spec-0002 for CAP-0009 and spec-0003 for CAP-0002 while the
      // declared column still carries what the author wrote.
      await seedPolicies(root, ["CAP-0001", "CAP-0009", "CAP-0002"], {
        "CAP-0001": "spec-0001",
        "CAP-0009": "spec-0009",
        "CAP-0002": "spec-0002",
      });
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mismatches = issues.filter((issue) => issue.code === "QFAI-SPLIT-106");
      expect(mismatches.map((issue) => issue.refs?.[0])).toEqual(["CAP-0009", "CAP-0002"]);
      expect(mismatches[0]?.file).toBe(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
      );
      expect(mismatches[0]?.refs).toEqual(["CAP-0009", "spec-0009", "spec-0002"]);
      expect(
        issues.some((issue) =>
          ["QFAI-SPLIT-103", "QFAI-SPLIT-104", "QFAI-SPLIT-105"].includes(issue.code),
        ),
      ).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps reporting spec damage that a moved row does not explain", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // CAP-0009 inserted after CAP-0001 moves CAP-0009 / CAP-0002 off their
      // declared spec. CAP-0001 and CAP-0004 did not move, so the broken Parent
      // in spec-0001 and the missing spec-0004 are independent damage.
      await seedPolicies(root, ["CAP-0001", "CAP-0009", "CAP-0002", "CAP-0004"], {
        "CAP-0001": "spec-0001",
        "CAP-0009": "spec-0009",
        "CAP-0002": "spec-0002",
        "CAP-0004": "spec-0004",
      });
      await seedSpec(root, "0001", "CAP-0007");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const byCode = (code: string) => issues.filter((issue) => issue.code === code);

      expect(byCode("QFAI-SPLIT-106").map((issue) => issue.refs?.[0])).toEqual([
        "CAP-0009",
        "CAP-0002",
      ]);
      expect(byCode("QFAI-SPLIT-103")[0]?.refs).toEqual(["spec-0004"]);
      expect(byCode("QFAI-SPLIT-105").map((issue) => issue.refs)).toEqual([
        ["spec-0001", "CAP-0001"],
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires every CAP row to declare a well-formed spec once the Spec column exists", async () => {
    const cases: Array<{ cell: string; declared: string }> = [
      { cell: "", declared: "(未宣言)" },
      { cell: "spec-123", declared: "spec-123" },
    ];
    for (const { cell, declared } of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
      try {
        await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
          "CAP-0001": "spec-0001",
          "CAP-0002": "spec-0002",
          "CAP-0003": cell,
        });
        await seedSpec(root, "0001", "CAP-0001");
        await seedSpec(root, "0002", "CAP-0002");
        await seedSpec(root, "0003", "CAP-0003");

        const issues = await validateSpecSplitByCapability(root, defaultConfig);
        expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-106"]);
        expect(issues[0]?.refs).toEqual(["CAP-0003", declared, "spec-0003"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("ignores a fenced sample of the catalogue table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002", "CAP-0003": "spec-0003" },
        undefined,
        {
          trailer: [
            "## How to fill this in",
            "",
            "```markdown",
            "| CAP ID | Statement | Success metrics | Notes | Spec |",
            "| ------ | --------- | --------------- | ----- | ---- |",
            "| CAP-0002 | <what> | <metric> | <note> | spec-9999 |",
            "```",
          ],
        },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("checks the exact Spec column, not a Previous Spec column beside it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // `Previous Spec` carries the row position, so a loose header match would
      // read it, pass the wrong canonical value and mis-blame the right one.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-9999" },
        undefined,
        { previousSpecColumn: true },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-106"]);
      expect(issues[0]?.refs).toEqual(["CAP-0002", "spec-9999", "spec-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a CAP ID repeated on two catalogue rows", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // Row order is the mapping, so the repeat claims two spec directories at
      // once. Both exist and both cite the CAP, so nothing but 107 fires.
      await seedPolicies(root, ["CAP-0001", "CAP-0001"]);
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-107"]);
      expect(issues[0]?.refs).toEqual(["CAP-0001"]);
      expect(issues[0]?.file).toBe(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a catalogue row whose CAP cell names several IDs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The row claims one position for two capabilities. It is left out of the
      // numbering, so every other check balances and only 108 reports it.
      await seedPolicies(root, ["CAP-0001"], undefined, undefined, {
        trailer: ["| CAP-0002 / CAP-0003 | capability | metric | note |"],
        trailerJoinsTable: true,
      });
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-108"]);
      expect(issues[0]?.refs).toEqual(["CAP-0002", "CAP-0003"]);
      expect(issues[0]?.file).toBe(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads only the table inside the CAP Catalog section", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // A retired-ID table before the catalogue and a published-history table
      // after it both carry a `CAP ID` header; counting either would add rows
      // and shift every row position below.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002" },
        undefined,
        {
          catalogHeading: true,
          leader: [
            "## Retired IDs",
            "",
            "| CAP ID   | Reason    |",
            "| -------- | --------- |",
            "| CAP-0007 | withdrawn |",
          ],
          trailer: [
            "## Published history",
            "",
            "| CAP ID   | Reason    |",
            "| -------- | --------- |",
            "| CAP-0008 | published |",
          ],
        },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves the CAP Catalog heading whole, not as a substring", async () => {
    // `## CAP Catalog Format` above the real heading claimed the window, which
    // then ended at the real heading — a window with no table in it, which fell
    // through to the document-wide scan, so the catalogue's own wrong `Spec`
    // value went unreported.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-9999" },
        undefined,
        {
          catalogHeading: true,
          leader: ["## CAP Catalog Format", "", "One row per capability.", ""],
        },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mismatches = issues.filter((item) => item.code === "QFAI-SPLIT-106");
      expect(mismatches).toHaveLength(1);
      expect(mismatches[0]?.refs).toContain("spec-9999");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prefers an exact CAP ID header over a companion column", async () => {
    // A blank `Previous CAP ID` column ahead of the real one produced zero
    // rows, and the fallback then validated a catalogue whose `Spec` cells were
    // never read.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"], { "CAP-0001": "spec-0001" }, undefined, {
        catalogHeading: true,
      });
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "## CAP Catalog",
          "",
          "| Previous CAP ID | CAP ID   | Statement  | Spec      |",
          "| --------------- | -------- | ---------- | --------- |",
          "|                 | CAP-0001 | capability | spec-9999 |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      const mismatches = issues.filter((item) => item.code === "QFAI-SPLIT-106");
      expect(mismatches).toHaveLength(1);
      expect(mismatches[0]?.refs).toContain("spec-9999");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("treats a confirmed but empty catalogue as empty, not as absent", async () => {
    // A CAP quoted in a history table stood in for the empty catalogue, so
    // QFAI-SPLIT-101 never fired on a catalogue that lists nothing.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"], undefined, undefined, { catalogHeading: true });
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "## CAP Catalog",
          "",
          "| CAP ID | Statement | Success metrics | Notes |",
          "| ------ | --------- | --------------- | ----- |",
          "",
          "## Retired IDs",
          "",
          "| CAP ID   | Reason    |",
          "| -------- | --------- |",
          "| CAP-0001 | withdrawn |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((item) => item.code)).toContain("QFAI-SPLIT-101");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("numbers rows by catalogue position, not by a CAP quoted in an earlier cell", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // CAP-0001's Notes points at CAP-0003, which a document-wide first-
      // appearance scan would number second and re-point spec-0002/spec-0003.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002", "CAP-0003": "spec-0003" },
        { "CAP-0001": "see CAP-0003" },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("checks a row whose CAP ID is written with Markdown decoration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002", "CAP-0003": "spec-9999" },
        undefined,
        { capCells: { "CAP-0002": "`CAP-0002`", "CAP-0003": "[CAP-0003](./cap.md)" } },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-106"]);
      expect(issues[0]?.refs).toEqual(["CAP-0003", "spec-9999", "spec-0003"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports a broken Parent when the row declares no spec position", async () => {
    const cases: Array<{ cell: string; declared: string }> = [
      { cell: "", declared: "(未宣言)" },
      { cell: "spec-123", declared: "spec-123" },
    ];
    for (const { cell, declared } of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
      try {
        // A blank or malformed cell claims no other row, so it is no evidence
        // the row moved and the broken Parent below it stays independent damage.
        await seedPolicies(root, ["CAP-0001", "CAP-0002", "CAP-0003"], {
          "CAP-0001": "spec-0001",
          "CAP-0002": "spec-0002",
          "CAP-0003": cell,
        });
        await seedSpec(root, "0001", "CAP-0001");
        await seedSpec(root, "0002", "CAP-0002");
        await seedSpec(root, "0003", "CAP-0007");

        const issues = await validateSpecSplitByCapability(root, defaultConfig);
        expect(issues.map((issue) => issue.code)).toEqual(["QFAI-SPLIT-106", "QFAI-SPLIT-105"]);
        expect(issues[0]?.refs).toEqual(["CAP-0003", declared, "spec-0003"]);
        expect(issues[1]?.refs).toEqual(["spec-0003", "CAP-0003"]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("reads the Spec column past an escaped pipe in an earlier cell", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002" },
        { "CAP-0002": "either \\| or" },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a catalogue that spells one canonical column name twice", async () => {
    const cases: Array<{ header: string; separator: string; row: string; duplicate: string }> = [
      {
        header: "| CAP ID   | Statement  | Spec      | Spec      |",
        separator: "| -------- | ---------- | --------- | --------- |",
        row: "| CAP-0001 | capability | spec-0001 | spec-9999 |",
        duplicate: "Spec",
      },
      {
        header: "| CAP ID   | CAP ID     | Statement  | Spec      |",
        separator: "| -------- | ---------- | ---------- | --------- |",
        row: "| CAP-0001 | CAP-0001   | capability | spec-9999 |",
        duplicate: "CAP ID",
      },
    ];
    for (const { header, separator, row, duplicate } of cases) {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
      try {
        // Resolving the exact match with `findIndex` took whichever column came
        // first, so the second one was never read and the catalogue passed on
        // the value it liked. Neither column may stand in for the other.
        await seedPolicies(root, ["CAP-0001"], undefined, undefined, { catalogHeading: true });
        await writeFile(
          path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
          ["# 03 Capabilities", "", "## CAP Catalog", "", header, separator, row, ""].join("\n"),
          "utf-8",
        );
        await seedSpec(root, "0001", "CAP-0001");

        const issues = await validateSpecSplitByCapability(root, defaultConfig);
        const duplicates = issues.filter((item) => item.code === "QFAI-SPLIT-109");
        expect(duplicates).toHaveLength(1);
        expect(duplicates[0]?.refs).toEqual([duplicate]);
        expect(duplicates[0]?.file).toBe(
          path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        );
        // The ambiguous column resolves to none, so no row is validated against
        // an arbitrary one of the two.
        expect(issues.some((item) => item.code === "QFAI-SPLIT-106")).toBe(false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("keeps resolving a canonical column that is spelled once", async () => {
    // Over-correction pin for the duplicate-header rejection above: one exact
    // `Spec` beside a loose companion still resolves and still validates.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      await seedPolicies(root, ["CAP-0001"], undefined, undefined, { catalogHeading: true });
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "## CAP Catalog",
          "",
          "| CAP ID   | Previous Spec | Statement  | Spec      |",
          "| -------- | ------------- | ---------- | --------- |",
          "| CAP-0001 | spec-0004     | capability | spec-0001 |",
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

  it("reports every ambiguous row even when no row survives the numbering", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // A catalogue made only of multi-ID rows numbers nothing, and returning
      // on that first reduced the whole diagnosis to a bare "no CAP ID found"
      // — the rows that caused it went unreported.
      await seedPolicies(root, ["CAP-0002"], undefined, undefined, { catalogHeading: true });
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "## CAP Catalog",
          "",
          "| CAP ID              | Statement  |",
          "| ------------------- | ---------- |",
          "| CAP-0002 / CAP-0003 | capability |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((item) => item.code)).toEqual(["QFAI-SPLIT-108", "QFAI-SPLIT-101"]);
      expect(issues[0]?.refs).toEqual(["CAP-0002", "CAP-0003"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps an approved DELETE's numbering gap when the row stays as a tombstone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // The slice policy leaves the number of a DELETEd spec unused, but row
      // position is the mapping: keeping a plain row demanded a directory that
      // is gone (103) and inflated the count (102), while dropping the row
      // renumbered every capability below it. A tombstone holds the position.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002", "CAP-0003": "spec-0003" },
        undefined,
        { capCells: { "CAP-0002": "CAP-0002 (deleted)" } },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still reports a spec directory that outlived its tombstone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // Over-correction pin: a tombstone excuses the gap, not a directory the
      // DELETE was supposed to remove.
      await seedPolicies(
        root,
        ["CAP-0001", "CAP-0002", "CAP-0003"],
        { "CAP-0001": "spec-0001", "CAP-0002": "spec-0002", "CAP-0003": "spec-0003" },
        undefined,
        { capCells: { "CAP-0002": "CAP-0002 (deleted)" } },
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0002", "CAP-0002");
      await seedSpec(root, "0003", "CAP-0003");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((item) => item.code)).toEqual(["QFAI-SPLIT-102", "QFAI-SPLIT-104"]);
      expect(issues[1]?.refs).toEqual(["spec-0002"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a capability that reuses a retired CAP ID", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layered-"));
    try {
      // Over-correction pin: a tombstone is kept out of the live count, so the
      // duplicate check has to keep reading it or a retired ID could be handed
      // to a new capability without a word.
      await seedPolicies(root, ["CAP-0001"]);
      await writeFile(
        path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
        [
          "# 03 Capabilities",
          "",
          "| CAP ID              | Statement  | Spec      |",
          "| ------------------- | ---------- | --------- |",
          "| CAP-0001            | capability | spec-0001 |",
          "| CAP-0002 (deleted)  | capability | spec-0002 |",
          "| CAP-0002            | capability | spec-0003 |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedSpec(root, "0001", "CAP-0001");
      await seedSpec(root, "0003", "CAP-0002");

      const issues = await validateSpecSplitByCapability(root, defaultConfig);
      expect(issues.map((item) => item.code)).toEqual(["QFAI-SPLIT-107"]);
      expect(issues[0]?.refs).toEqual(["CAP-0002"]);
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
  declaredSpecs?: Record<string, string>,
  notes?: Record<string, string>,
  extras?: {
    capCells?: Record<string, string>;
    /** Lines emitted between the document title and the catalogue table. */
    leader?: string[];
    /** Lines emitted after the catalogue table. */
    trailer?: string[];
    /** Append the trailer straight onto the catalogue table, with no blank line. */
    trailerJoinsTable?: boolean;
    /** Add a `Previous Spec` column carrying the row position before `Spec`. */
    previousSpecColumn?: boolean;
    catalogHeading?: boolean;
  },
): Promise<void> {
  const policiesDir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(policiesDir, { recursive: true });

  const withSpecColumn = declaredSpecs !== undefined;
  const withPreviousSpec = extras?.previousSpecColumn === true;
  const capLines = capIds
    .map((capId, index) => {
      const specCell = declaredSpecs ? ` ${declaredSpecs[capId] ?? ""} |` : "";
      const previousCell = withPreviousSpec ? ` spec-${String(index + 1).padStart(4, "0")} |` : "";
      const note = notes?.[capId] ?? "note";
      const capCell = extras?.capCells?.[capId] ?? capId;
      return `| ${capCell} | capability | metric | ${note} |${previousCell}${specCell}`;
    })
    .join("\n");
  await writeFile(
    path.join(policiesDir, "03_Capabilities.md"),
    [
      "# 03 Capabilities",
      "",
      ...(extras?.leader ?? []),
      ...(extras?.catalogHeading ? ["", "## CAP Catalog", ""] : []),
      `| CAP ID | Statement | Success metrics | Notes |${withPreviousSpec ? " Previous Spec |" : ""}${
        withSpecColumn ? " Spec |" : ""
      }`,
      `| ------ | --------- | --------------- | ----- |${withPreviousSpec ? " ------------- |" : ""}${
        withSpecColumn ? " ---- |" : ""
      }`,
      capLines,
      ...(extras?.trailerJoinsTable ? (extras.trailer ?? []) : []),
      "",
      ...(extras?.trailerJoinsTable ? [] : (extras?.trailer ?? [])),
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

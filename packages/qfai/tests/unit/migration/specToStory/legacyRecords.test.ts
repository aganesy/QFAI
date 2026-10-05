import { describe, expect, it } from "vitest";

import { MigrationInputError } from "../../../../src/migration/specToStory/harness.js";
import {
  parseLegacyRecords,
  retiredLegacyStatus,
  withoutLegacyRecords,
} from "../../../../src/migration/specToStory/legacyRecords.js";

describe("legacy migration records", () => {
  it("reads heading examples, cases and rules without losing their source text", () => {
    const example = parseLegacyRecords(
      "# Examples\n\n## EX-0011-0001: Normal cycle\n\n- BR-Ref: BR-0011-0003\n- Given an item\n- When it runs\n- Then it passes\n",
      "EX",
      "05_Examples.md",
    )[0];
    expect(example?.cells).toMatchObject({
      "EX-ID": "EX-0011-0001",
      "BR-Ref": "BR-0011-0003",
      Input: "Given an item\nWhen it runs",
      Expected: "Then it passes",
    });
    expect(example?.source).toMatchObject({ kind: "heading", startLine: 3 });

    const testCase = parseLegacyRecords(
      "# Cases\n\n## TC-0011-0001: Normal cycle\n\n- EX-Ref: EX-0011-0001\n- AC-Refs: AC-0011-0001\n- Verify completion.\n",
      "TC",
      "06_Test-Cases.md",
    )[0];
    expect(testCase?.cells).toMatchObject({
      "TC-ID": "TC-0011-0001",
      "EX-Ref": "EX-0011-0001",
      "AC-Refs": "AC-0011-0001",
      Steps: "Normal cycle\n\n- Verify completion.",
    });

    const rule = parseLegacyRecords(
      "# Rules\n\n## BR-0011-0003: Test first\n\n- AC-Refs: AC-0011-0001\n- A failing test MUST be written first.\n",
      "BR",
      "04_Business-Rules.md",
    )[0];
    expect(rule?.cells.Rule).toContain("A failing test MUST be written first.");
    expect(rule?.cells.Rule).toContain("Test first");
  });

  it("ends a section's Rule value at the next reference or status field", () => {
    const rule = parseLegacyRecords(
      "# Rules\n\n## BR-0011-0004: Totals\n\n- Rule: An order total MUST\n  include tax.\nStatus: Approved\nContract-Refs: API-0001\n",
      "BR",
      "04_Business-Rules.md",
    )[0];
    expect(rule?.cells.Rule).toBe("An order total MUST include tax.");
    expect(rule?.cells.Status).toBe("Approved");
  });

  it("finds a table's rows when an earlier line holds the same cells without being a table", () => {
    const records = parseLegacyRecords(
      "# Rules\n\n| BR ID | Rule |\n\n| BR ID | Rule |\n| --- | --- |\n| BR-0011-0007 | Tax is added. |\n",
      "BR",
      "04_Business-Rules.md",
    );
    expect(records.map((record) => record.id)).toEqual(["BR-0011-0007"]);
    expect(records[0]?.source.startLine).toBe(7);
  });

  it("names the real table's header line for an unknown header after a look-alike line", () => {
    expect(() =>
      parseLegacyRecords(
        "# Rules\n\n| Rule No | Rule |\n\n| Rule No | Rule |\n| --- | --- |\n| BR-0011-0008 | Tax is added. |\n",
        "BR",
        "04_Business-Rules.md",
      ),
    ).toThrow("04_Business-Rules.md:5:");
  });

  it("ends the run when a table row and a heading hold different Rule values", () => {
    const markdown = (headingRule: string) =>
      `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0011-0010 | Tax is added. |\n\n## BR-0011-0010: Totals\n\n- Rule: ${headingRule}\n`;
    expect(() =>
      parseLegacyRecords(markdown("Tax is removed."), "BR", "04_Business-Rules.md"),
    ).toThrow(/BR-0011-0010 holds a different Rule in its table row and in its heading section/);
    const equal = parseLegacyRecords(markdown("Tax is  added"), "BR", "04_Business-Rules.md");
    expect(equal.map((record) => record.id)).toEqual(["BR-0011-0010"]);
    // Ordinary words count: "given" is not a Gherkin keyword in a rule.
    expect(() =>
      parseLegacyRecords(
        "# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0011-0011 | Orders are given refunds. |\n\n## BR-0011-0011: Refunds\n\n- Rule: Orders are refunds.\n",
        "BR",
        "04_Business-Rules.md",
      ),
    ).toThrow(/holds a different Rule/);
  });

  it("tells rules apart by an operator, a sign or a unit", () => {
    const markdown = (tableRule: string, headingRule: string) =>
      `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0011-0013 | ${tableRule} |\n\n## BR-0011-0013: Totals\n\n- Rule: ${headingRule}\n`;
    for (const [tableRule, headingRule] of [
      ["The total is < 10", "The total is > 10"],
      ["The fee is -5%", "The fee is 5%"],
      ["The fee is 5%", "The fee is 5 USD"],
    ] as const) {
      expect(() =>
        parseLegacyRecords(markdown(tableRule, headingRule), "BR", "04_Business-Rules.md"),
      ).toThrow(/holds a different Rule/);
    }
    expect(
      parseLegacyRecords(markdown("The fee is **5%**.", "The fee  is 5%"), "BR", "r.md"),
    ).toHaveLength(1);
  });

  it("compares Rule values written in a script other than Latin", () => {
    // Greek letters, built from code points: two different rules that share no Latin letter.
    const table = String.fromCodePoint(0x3b1, 0x3b2, 0x3b3, 0x20, 0x3b4, 0x3b5);
    const heading = String.fromCodePoint(0x3b6, 0x3b7, 0x3b8, 0x20, 0x3b9, 0x3ba);
    const markdown = (headingRule: string) =>
      `# Rules\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0011-0012 | ${table} |\n\n## BR-0011-0012: Totals\n\n- Rule: ${headingRule}\n`;
    expect(() => parseLegacyRecords(markdown(heading), "BR", "04_Business-Rules.md")).toThrow(
      /holds a different Rule/,
    );
    expect(parseLegacyRecords(markdown(table), "BR", "04_Business-Rules.md")).toHaveLength(1);
  });

  it("keeps the bold inside a section's Rule value", () => {
    const rule = parseLegacyRecords(
      "# Rules\n\n## BR-0011-0009: Audit\n\n- **Rule**: Orders are **audited**,\n  and **kept**.\n",
      "BR",
      "04_Business-Rules.md",
    )[0];
    expect(rule?.cells.Rule).toBe("Orders are **audited**, and **kept**.");
  });

  it("reads a table whose BR ID column is not the first", () => {
    const records = parseLegacyRecords(
      "# Rules\n\n| Description | BR ID | Rule |\n| --- | --- | --- |\n| Totals | BR-0011-0006 | Tax is added. |\n",
      "BR",
      "04_Business-Rules.md",
    );
    expect(records.map((record) => record.id)).toEqual(["BR-0011-0006"]);
    expect(records[0]?.source.startLine).toBe(5);
    expect(records[0]?.cells.Rule).toBe("Tax is added.");
  });

  it("ends a section's Rule value at a plain Contracts, Notes or NFRs field", () => {
    const rule = parseLegacyRecords(
      "# Rules\n\n## BR-0011-0005: Totals\n\n- Rule: An order total MUST\n  include tax.\nContracts: API-0001\nNotes: Rounded per line.\nNFRs: Under 50 ms.\n",
      "BR",
      "04_Business-Rules.md",
    )[0];
    expect(rule?.cells.Rule).toBe("An order total MUST include tax.");
  });

  it("reads every table and heading in a mixed file, merging matching TC detail", () => {
    const records = parseLegacyRecords(
      "# Cases\n\n| TC-ID | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0003-0001 | AC-0003-0001 | EX-0003-0001 | Short | Pass |\n| TC-0003-0002 | AC-0003-0002 | EX-0003-0002 | Other | Pass |\n\n## TC-0003-0001: Detail\n\n**EX Refs:** EX-0003-0001\n**AC Refs:** AC-0003-0001\n- Verify the exact behavior.\n",
      "TC",
      "06_Test-Cases.md",
    );
    expect(records.map((record) => record.id)).toEqual(["TC-0003-0001", "TC-0003-0002"]);
    expect(records[0]?.cells.Steps).toContain("Verify the exact behavior.");
    expect(records[0]?.source.kind).toBe("table+heading");
  });

  it("normalizes the legacy Given / Input example column", () => {
    const source =
      "| EX-ID | BR-Ref | Given / Input | Expected |\n| --- | --- | --- | --- |\n| EX-0002-0001 | BR-0002-0001 | A request arrives | It succeeds |\n";
    const records = parseLegacyRecords(source, "EX", "spec-0002/05_Examples.md");
    expect(records[0]?.cells.Input).toBe("A request arrives");
    expect(records[0]?.cells.Expected).toBe("It succeeds");
  });

  it("retains a heading record's retirement status", () => {
    const records = parseLegacyRecords(
      "## EX-0012-0002: Old screenshot\n\n- Status: superseded by EX-0012-0030\n- BR-Ref: BR-0012-0002\n- Given a screen\n- Then a screenshot exists\n",
      "EX",
      "spec-0012/05_Examples.md",
    );
    expect(records[0]?.cells.Status).toBe("superseded by EX-0012-0030");
    expect(retiredLegacyStatus(records[0]?.cells.Status ?? "")).toBe(true);
  });

  it("fails closed on conflicting TC detail, duplicate IDs and malformed record IDs", () => {
    expect(() =>
      parseLegacyRecords(
        "| TC-ID | AC-Refs | EX-Ref |\n| --- | --- | --- |\n| TC-0003-0001 | AC-0003-0001 | EX-0003-0001 |\n\n## TC-0003-0001\n\n- EX-Ref: EX-0003-0002\n- AC-Refs: AC-0003-0001\n",
        "TC",
        "06_Test-Cases.md",
      ),
    ).toThrow(MigrationInputError);
    expect(() =>
      parseLegacyRecords(
        "## EX-0003-0001\n\n- Then first\n\n## EX-0003-0001\n\n- Then second\n",
        "EX",
        "05_Examples.md",
      ),
    ).toThrow(/duplicate EX-0003-0001/);
    expect(() =>
      parseLegacyRecords(
        "| BR-ID | Rule |\n| --- | --- |\n| BR-0003-bad | Invalid |\n",
        "BR",
        "04_Business-Rules.md",
      ),
    ).toThrow(/invalid BR ID/);
  });

  it("reads an index table row and a heading section of one ID as one record, for every kind", () => {
    const example =
      "# Examples\n\n| EX-ID | BR-Ref |\n| --- | --- |\n| EX-0001-0001 | BR-0001-0003 |\n\n## EX-0001-0001: Order accepted\n\n- Given one item\n- Then the order is accepted\n";
    const readExample = () => parseLegacyRecords(example, "EX", "05_Examples.md");
    expect(readExample).not.toThrow();
    const [record, ...others] = readExample();
    expect(others).toEqual([]);
    expect(record?.cells).toMatchObject({
      "EX-ID": "EX-0001-0001",
      "BR-Ref": "BR-0001-0003",
      Input: "Given one item",
      Expected: "Then the order is accepted",
    });

    const rule =
      "# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n\n## BR-0001-0001: Orders have an item\n\n- Status: active\n- Orders have an item.\n";
    const readRule = () => parseLegacyRecords(rule, "BR", "04_Business-Rules.md");
    expect(readRule).not.toThrow();
    const [ruleRecord, ...otherRules] = readRule();
    expect(otherRules).toEqual([]);
    expect(ruleRecord?.cells.Status).toBe("active");
    expect(ruleRecord?.cells.Rule).toContain("Orders have an item");
  });

  it("names both locations when the two forms of one ID disagree on a field", () => {
    const cases = [
      {
        kind: "EX" as const,
        file: "05_Examples.md",
        text: "# Examples\n\n| EX-ID | AC-Ref |\n| --- | --- |\n| EX-0001-0001 | AC-0001-0001 |\n\n## EX-0001-0001: Order accepted\n\n- AC-Ref: AC-0001-0002\n- Given one item\n- Then accepted\n",
      },
      {
        kind: "BR" as const,
        file: "04_Business-Rules.md",
        text: "# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n\n## BR-0001-0001: Orders have an item\n\n- Status: draft\n- Orders have an item.\n",
      },
      {
        kind: "TC" as const,
        file: "06_Test-Cases.md",
        text: "# Cases\n\n| TC-ID | AC-Refs |\n| --- | --- |\n| TC-0001-0001 | AC-0001-0001 |\n\n## TC-0001-0001: Submit\n\n- AC-Refs: AC-0001-0002\n- Verify submission.\n",
      },
    ];
    for (const { kind, file, text } of cases) {
      let message = "";
      try {
        parseLegacyRecords(text, kind, file);
      } catch (error) {
        expect(error).toBeInstanceOf(MigrationInputError);
        message = error instanceof Error ? error.message : "";
      }
      expect(message, kind).toContain(`${file}:5`);
      expect(message, kind).toMatch(new RegExp(`${file.replace(".", "\\.")}:(?:7|8|9|10)\\b`));
      expect(message, kind).toContain("index table row, a heading section or both");
      expect(message, kind).toContain("equal values");
    }
  });

  it("refuses an example whose table row and heading section hold different steps", () => {
    const text = (input: string): string =>
      `# Examples\n\n| EX-ID | Input | Expected |\n| --- | --- | --- |\n| EX-0001-0001 | ${input} | accepted |\n\n## EX-0001-0001: Order accepted\n\n- Given one item\n- Then accepted\n`;
    expect(() => parseLegacyRecords(text("two items"), "EX", "05_Examples.md")).toThrow(
      /different Input/,
    );
    expect(() => parseLegacyRecords(text("one item"), "EX", "05_Examples.md")).not.toThrow();
  });

  it("refuses a rule whose table row and heading section name different contracts", () => {
    const text = (heading: string): string =>
      `# Rules\n\n| BR-ID | Contract-Refs |\n| --- | --- |\n| BR-0001-0001 | CON-UI-0001 |\n\n## BR-0001-0001: Orders have an item\n\n- Contract-Refs: ${heading}\n- Orders have an item.\n`;
    expect(() => parseLegacyRecords(text("CON-UI-0002"), "BR", "04_Business-Rules.md")).toThrow(
      /different Contract-Refs/,
    );
    expect(() =>
      parseLegacyRecords(text("CON-UI-0001"), "BR", "04_Business-Rules.md"),
    ).not.toThrow();
  });

  it("reads a heading-form rule's Contract-Refs as a field, not as statement text", () => {
    const [record] = parseLegacyRecords(
      "## BR-0001-0001: Orders have an item\n\n- Contract-Refs: CON-UI-0008\n- Orders have an item.\n",
      "BR",
      "04_Business-Rules.md",
    );
    expect(record?.cells["Contract-Refs"]).toBe("CON-UI-0008");
    expect(record?.cells.Rule).not.toContain("CON-UI-0008");
  });

  it("removes a record's own table row and heading section and keeps the lines between them", () => {
    const source =
      "# Rules\n\n| BR-ID | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n| BR-0001-0002 | active |\n\n## BR-0001-0001: First\n\n- Status: active\n- First.\n\n## BR-0001-0002: Second\n\n- Status: active\n- Second.\n";
    const records = () => parseLegacyRecords(source, "BR", "04_Business-Rules.md");
    expect(records).not.toThrow();
    const remaining = withoutLegacyRecords(source, records(), new Set(["BR-0001-0001"]));
    expect(remaining.split("\n").filter((line) => line.trim() !== "")).toEqual([
      "# Rules",
      "| BR-ID | Status |",
      "| --- | --- |",
      "| BR-0001-0002 | active |",
      "## BR-0001-0002: Second",
      "- Status: active",
      "- Second.",
    ]);
  });

  it("removes only placed heading and table records while leaving the unresolved source intact", () => {
    const source =
      "# Examples\n\n## EX-0001-0001\n\n- Given first\n- Then done\n\n## EX-0001-0002\n\n- Given unresolved\n- Then review\n";
    const records = parseLegacyRecords(source, "EX", "05_Examples.md");
    const remaining = withoutLegacyRecords(source, records, new Set(["EX-0001-0001"]));
    expect(remaining).not.toContain("EX-0001-0001");
    expect(remaining).toContain("EX-0001-0002");
    expect(source).toContain("EX-0001-0001");
  });
});

describe("legacy migration records, ID headers written with a space", () => {
  const tables = [
    {
      kind: "BR" as const,
      file: "04_Business-Rules.md",
      text: (header: string) =>
        `# Rules\n\n| ${header} | Rule | Status |\n| --- | --- | --- |\n| BR-0001-0001 | Orders have an item. | active |\n| BR-0001-0002 | Orders may be free. | draft |\n`,
      canonical: "BR-ID",
      spaced: "BR ID",
      unknown: "Rule No",
    },
    {
      kind: "EX" as const,
      file: "05_Examples.md",
      text: (header: string) =>
        `# Examples\n\n| ${header} | BR-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001 | BR-0001-0001 | one item | accepted |\n`,
      canonical: "EX-ID",
      spaced: "EX ID",
      unknown: "Example No",
    },
    {
      kind: "TC" as const,
      file: "06_Test-Cases.md",
      text: (header: string) =>
        `# Cases\n\n| ${header} | AC-Refs | EX-Ref | Steps | Expected |\n| --- | --- | --- | --- | --- |\n| TC-0001-0001 | AC-0001-0001 | EX-0001-0001 | submit | accepted |\n`,
      canonical: "TC-ID",
      spaced: "TC ID",
      unknown: "Case No",
    },
  ];

  // QFAI:EX-0004-0007-37
  it("reads a spaced ID header as the hyphen header", () => {
    for (const { kind, file, text, canonical, spaced } of tables) {
      const hyphen = parseLegacyRecords(text(canonical), kind, file);
      expect(hyphen.length, kind).toBeGreaterThan(0);
      const read = parseLegacyRecords(text(spaced), kind, file);
      expect(read, kind).toEqual(hyphen);
    }
  });

  // QFAI:EX-0004-0007-37
  it("reads a spaced ID header beside a heading section of the same ID as one record", () => {
    const read = (header: string) =>
      parseLegacyRecords(
        `# Rules\n\n| ${header} | Status |\n| --- | --- |\n| BR-0001-0001 | active |\n\n## BR-0001-0001: Orders have an item\n\n- Status: active\n- Orders have an item.\n`,
        "BR",
        "04_Business-Rules.md",
      );
    const hyphen = read("BR-ID");
    expect(hyphen).toHaveLength(1);
    expect(read("BR ID")).toEqual(hyphen);
  });

  // QFAI:EX-0004-0007-38
  it("refuses a table holding only IDs of the file's kind under an unknown header, naming the file and the header line", () => {
    for (const { kind, file, text, canonical, unknown } of tables) {
      expect(() => parseLegacyRecords(text(canonical), kind, file), kind).not.toThrow();
      let error: unknown;
      try {
        parseLegacyRecords(text(unknown), kind, file);
      } catch (caught) {
        error = caught;
      }
      expect(error, kind).toBeInstanceOf(MigrationInputError);
      expect(error instanceof Error ? error.message : "", kind).toContain(`${file}:3`);
    }
  });

  // QFAI:EX-0004-0007-38
  it("names the line of the header when an earlier table of the file is an ordinary one", () => {
    expect(() =>
      parseLegacyRecords(
        "# Rules\n\n| Area | Owner |\n| --- | --- |\n| Orders | Ann |\n\n| Rule No | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n",
        "BR",
        "04_Business-Rules.md",
      ),
    ).toThrow(/04_Business-Rules\.md:7\b/);
  });

  it("refuses no table whose first column holds other text or IDs of another kind", () => {
    expect(
      parseLegacyRecords(
        "# Rules\n\n| Area | Owner |\n| --- | --- |\n| Orders | Ann |\n| Payments | Bo |\n\n| BR-ID | Rule |\n| --- | --- |\n| BR-0001-0001 | Orders have an item. |\n",
        "BR",
        "04_Business-Rules.md",
      ).map((record) => record.id),
    ).toEqual(["BR-0001-0001"]);
    expect(
      parseLegacyRecords(
        "# Examples\n\n| Rule | Note |\n| --- | --- |\n| BR-0001-0001 | covered below |\n",
        "EX",
        "05_Examples.md",
      ),
    ).toEqual([]);
    expect(
      parseLegacyRecords(
        "# Rules\n\n| Rule | Owner |\n| --- | --- |\n| BR-0001-0001 and BR-0001-0002 | Ann |\n",
        "BR",
        "04_Business-Rules.md",
      ),
    ).toEqual([]);
  });
});

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
      Steps: "Verify completion.",
    });

    const rule = parseLegacyRecords(
      "# Rules\n\n## BR-0011-0003: Test first\n\n- AC-Refs: AC-0011-0001\n- A failing test MUST be written first.\n",
      "BR",
      "04_Business-Rules.md",
    )[0];
    expect(rule?.cells.Rule).toContain("A failing test MUST be written first.");
    expect(rule?.cells.Rule).toContain("Test first");
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

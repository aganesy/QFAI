import { describe, expect, it } from "vitest";

import { parseAdr } from "../../src/core/parse/adr.js";
import { parseGherkinFeature } from "../../src/core/parse/gherkin.js";
import { parseSpec } from "../../src/core/parse/spec.js";

describe("parseSpec", () => {
  it("collects H2 sections and BR formats", () => {
    const text = [
      "# SPEC-0001: Sample",
      "",
      "## 背景",
      "",
      "- note",
      "",
      "## 業務ルール",
      "",
      "- [BR-0001][P1] first",
      "- [BR-0002] second",
      "- [BR-0003][P9] third",
      "",
    ].join("\n");

    const parsed = parseSpec(text, "spec.md");

    expect(parsed.specId).toBe("SPEC-0001");
    expect(parsed.sections.has("背景")).toBe(true);
    expect(parsed.sections.has("業務ルール")).toBe(true);
    expect(parsed.brs.map((br) => br.id)).toEqual(["BR-0001"]);
    expect(parsed.brs[0]?.line).toBe(9);
    expect(parsed.brsWithoutPriority.map((br) => br.id)).toEqual(["BR-0002"]);
    expect(parsed.brsWithInvalidPriority.map((br) => br.id)).toEqual([
      "BR-0003",
    ]);
  });
});

describe("parseGherkinFeature", () => {
  it("extracts tags per scenario", () => {
    const text = [
      "@SPEC-0001",
      "Feature: Sample flow",
      "  @SC-0001 @BR-0001",
      "  Scenario: First",
      "    Given ...",
      "",
      "  @SC-0002 @BR-0002",
      "  Scenario: Second",
      "    Given ...",
      "",
    ].join("\n");

    const parsed = parseGherkinFeature(text, "scenario.md");

    expect(parsed.featurePresent).toBe(true);
    expect(parsed.scenarios).toHaveLength(2);
    expect(parsed.scenarios[0]?.tags).toEqual([
      "SPEC-0001",
      "SC-0001",
      "BR-0001",
    ]);
    expect(parsed.scenarios[1]?.tags).toEqual([
      "SPEC-0001",
      "SC-0002",
      "BR-0002",
    ]);
  });
});

describe("parseAdr", () => {
  it("extracts required fields", () => {
    const text = [
      "# ADR-0001: Sample",
      "",
      "- Status: Accepted",
      "- Context: Background",
      "- Decision: Use option A",
      "- Consequences: Follow-up needed",
      "- Related: SPEC-0001",
      "",
    ].join("\n");

    const parsed = parseAdr(text, "ADR-0001.md");

    expect(parsed.adrId).toBe("ADR-0001");
    expect(parsed.fields.status).toBe("Accepted");
    expect(parsed.fields.context).toBe("Background");
    expect(parsed.fields.decision).toBe("Use option A");
    expect(parsed.fields.consequences).toBe("Follow-up needed");
    expect(parsed.fields.related).toBe("SPEC-0001");
  });
});

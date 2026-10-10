import { describe, expect, it } from "vitest";

import { parseAdr } from "../../src/core/parse/adr.js";

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

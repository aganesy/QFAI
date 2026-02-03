import { describe, expect, it } from "vitest";

import { parseTraceabilityMatrixStatus } from "../../src/core/traceabilityMatrix.js";

describe("parseTraceabilityMatrixStatus", () => {
  it("collects invalid status values", () => {
    const result = parseTraceabilityMatrixStatus(
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | SC-0001-0001 | unknown |",
        "",
      ].join("\n"),
    );

    expect(result.hasStatusColumn).toBe(true);
    expect(result.invalidStatusValues).toEqual(["unknown"]);
  });

  it("treats missing status column as implemented", () => {
    const result = parseTraceabilityMatrixStatus(
      [
        "# Traceability Matrix",
        "",
        "| BR | SC |",
        "| --- | --- |",
        "| BR-0001-0001 | SC-0001-0001 |",
        "",
      ].join("\n"),
    );

    expect(result.hasStatusColumn).toBe(false);
    expect(result.invalidStatusValues).toEqual([]);
    expect(result.statusBySc.get("SC-0001-0001")).toBe("implemented");
  });

  it("parses multiple SC ids with mixed-case status", () => {
    const result = parseTraceabilityMatrixStatus(
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status",
        "| --- | --- | ---",
        "| BR-0001-0001 | SC-0001-0001 SC-0001-0002 | PlAnNeD",
        "",
      ].join("\n"),
    );

    expect(result.hasStatusColumn).toBe(true);
    expect(result.statusBySc.get("SC-0001-0001")).toBe("planned");
    expect(result.statusBySc.get("SC-0001-0002")).toBe("planned");
  });

  it("treats empty status cells as implemented", () => {
    const result = parseTraceabilityMatrixStatus(
      [
        "# Traceability Matrix",
        "",
        "| BR | SC | Status |",
        "| --- | --- | --- |",
        "| BR-0001-0001 | SC-0001-0001 |  |",
        "",
      ].join("\n"),
    );

    expect(result.hasStatusColumn).toBe(true);
    expect(result.statusBySc.get("SC-0001-0001")).toBe("implemented");
  });
});

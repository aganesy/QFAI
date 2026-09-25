/**
 * Integration: verify.json keeps its fields and values.
 *
 * Reads the shipped `qfai-verify/references/verify-output-contract.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0040
import { describe, expect, it } from "vitest";

import { readShipped } from "../../../helpers/shippedAssistant.js";

/** The backticked first cell of every body row of the first table whose header opens with `first`. */
function firstColumn(text: string, first: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex(
    (line, i) => line.startsWith(`| ${first}`) && /^\|\s*-+/.test(lines[i + 1] ?? ""),
  );
  if (start === -1) return [];
  const body: string[] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    body.push(/^\|\s*`([^`]+)`/.exec(line)?.[1] ?? line);
  }
  return body;
}

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0040 (TDD-0045): verify.json keeps its fields and values", async () => {
    const text = await readShipped("skills/qfai-verify/references/verify-output-contract.md");
    expect(firstColumn(text, "Field")).toEqual([
      "status",
      "scope",
      "specId",
      "recordedAt",
      "summary",
      "gates",
    ]);
    // The field table's own `status` row: the prose after it also names a value it rules out.
    const statusLine = text.split("\n").find((line) => line.startsWith("| `status`")) ?? "";
    expect([...new Set([...statusLine.matchAll(/"([A-Z]+)"/g)].map((m) => m[1]))]).toEqual([
      "PASS",
      "FAIL",
    ]);
    expect(firstColumn(text, "`scope`")).toEqual(["prototyping", "atdd", "full"]);
    expect(text).not.toMatch(/outcome|testObservation/);
  });
});

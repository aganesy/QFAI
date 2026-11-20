/**
 * What the Skeleton smoke accepts as the initialization surface having answered.
 *
 * The script's observable result is the number of paths the dry-run plan names.
 * It used to accept the `would write:` label with no number after it and then
 * print a successful run that planned `0` paths, a count the surface never
 * produced. The cases pin that a numeric count is part of the success
 * predicate, and that a refusal carries the stdout it judged.
 */
import { describe, expect, it } from "vitest";

import { judgeSurface } from "../../../../scripts/smoke-qfai-cli.mjs";

const PLAN = [
  "qfai init (dry run)",
  "  would write: 42",
  "  would write paths:",
  "    qfai.config.yaml",
];

describe("the skeleton smoke's success predicate", () => {
  it("reports the count the plan names", () => {
    const verdict = judgeSurface(PLAN.join("\n"));

    expect(verdict.ok).toBe(true);
    expect(verdict.message).toContain("planned 42 path(s)");
  });

  it("refuses a plan whose label carries no number, with the stdout it read", () => {
    const output = ["  would write:", "  would write paths:", "    qfai.config.yaml"].join("\n");

    const verdict = judgeSurface(output);

    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("would write: <count>");
    expect(verdict.message).toContain(output);
  });

  it("refuses output that names no configuration file", () => {
    const output = "  would write: 3\n";

    const verdict = judgeSurface(output);

    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("qfai.config.yaml");
    expect(verdict.message).toContain(output);
  });
});

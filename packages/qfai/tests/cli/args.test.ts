import { describe, expect, it } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";

describe("parseArgs", () => {
  it("does not skip other options when --prompt has no value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["analyze", "--prompt", "--list"], cwd);
    expect(parsed.options.analyzeList).toBe(true);
    expect(parsed.options.analyzePrompt).toBeUndefined();
  });

  it("does not skip other options when --format has no value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--format", "--strict"], cwd);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.validateFormat).toBe("text");
  });

  it("sets validateFormat when --format has an explicit value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      ["validate", "--format", "github", "--strict"],
      cwd,
    );
    expect(parsed.options.help).toBe(false);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.validateFormat).toBe("github");
  });

  it("does not consume other options as a value for --out", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--out", "--format", "json"], cwd);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.reportFormat).toBe("json");
  });
});

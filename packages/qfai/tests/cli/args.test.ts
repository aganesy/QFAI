import { describe, expect, it } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";

describe("parseArgs", () => {
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
    const parsed = parseArgs(["validate", "--format", "github", "--strict"], cwd);
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

  it("parses --base-url for report", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      ["report", "--base-url", "https://example.com/", "--format", "md"],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.reportBaseUrl).toBe("https://example.com/");
    expect(parsed.options.reportFormat).toBe("md");
  });

  it("requires a value for --base-url", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--base-url", "--format", "md"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses guardrails options", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      [
        "guardrails",
        "extract",
        "--path",
        "18_delta.md",
        "--path",
        "more",
        "--max",
        "12",
        "--keyword",
        "layout",
      ],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.guardrailsAction).toBe("extract");
    expect(parsed.options.guardrailsPaths).toEqual(["18_delta.md", "more"]);
    expect(parsed.options.guardrailsMax).toBe(12);
    expect(parsed.options.guardrailsKeyword).toBe("layout");
  });

  it("parses --profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "atdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("atdd");
  });

  it("allows --out for prototyping preflight only", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "preflight", "--out", "tmp/out.json"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.doctorOut).toBe("tmp/out.json");
  });

  it("parses a strict integer --cycle for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "3"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("iterate");
    expect(parsed.options.prototypingCycle).toBe(3);
  });

  it("rejects a partial numeric --cycle value for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "3abc"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.prototypingCycle).toBeUndefined();
  });

  it("rejects a fractional --cycle value for prototyping iterate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "1.5"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.prototypingCycle).toBeUndefined();
  });

  // v2.0 (spec-0017 P3/P14): the v1.x round-* / --candidates / --survivors
  // arg surface was removed; the iterate command takes only --cycle and
  // --target-url. No equivalent --out / --format rejection tests are needed
  // because the new CLI surface does not accept those flags for `iterate`.

  it("rejects unsupported --format values for prototyping preflight", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["prototyping", "preflight", "--format", "github"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses sdd profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "sdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("sdd");
  });

  it("marks invalid --profile value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "unknown"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("marks removed --phase option as invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--phase", "atdd"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("marks guardrails without action as invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["guardrails", "--path", "18_delta.md"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.invalidExitCode).toBe(2);
  });
});

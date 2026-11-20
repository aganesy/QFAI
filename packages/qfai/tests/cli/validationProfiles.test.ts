import { afterEach, describe, expect, it, vi } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";
import { run } from "../../src/cli/main.js";
import {
  isValidationProfile,
  VALIDATION_PROFILE_CHOICES,
  VALIDATION_PROFILES,
} from "../../src/core/validationProfiles.js";

async function captureHelp(): Promise<string> {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(["--help"], process.cwd());
  } finally {
    process.exitCode = previousExitCode;
  }
  return chunks.join("");
}

describe("validation profiles come from one list", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("names the profiles in the order the parser's refusal already used", () => {
    expect(VALIDATION_PROFILE_CHOICES).toBe(
      "discussion|sdd|prototyping|atdd|tdd|verify|full|saas-package|drift",
    );
  });

  it("accepts every listed profile on validate and report", () => {
    for (const command of ["validate", "report"]) {
      for (const profile of VALIDATION_PROFILES) {
        const parsed = parseArgs([command, "--profile", profile], process.cwd());
        expect(parsed.invalid).toBe(false);
        expect(parsed.options.profile).toBe(profile);
      }
    }
  });

  it("refuses an unlisted profile and names the listed ones", () => {
    const parsed = parseArgs(["validate", "--profile", "bogus"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.invalidReason).toContain(VALIDATION_PROFILE_CHOICES);
    expect(isValidationProfile("bogus")).toBe(false);
    expect(isValidationProfile(undefined)).toBe(false);
  });

  it("lists the same profiles in the help", async () => {
    const help = await captureHelp();
    expect(help).toContain(
      `--profile <${VALIDATION_PROFILE_CHOICES}>  validate/report: select the validation profile`,
    );
  });
});

/**
 * A narrow profile in CI is reported, not blocked (#397).
 *
 * `buildCiProfileIssue` returned a hard `error` for any profile outside
 * `{full, verify, tdd, sdd}` whenever `CI=true`, and `runValidate`
 * short-circuited: zero validators ran and the command exited non-zero.
 * `qfai-atdd`, `qfai-discussion` and `qfai-prototyping` each name one of the
 * rejected profiles as their **only** completion gate, with no CI-legal
 * fallback documented — so all three became uncompletable the moment they ran
 * anywhere that exports `CI=true`.
 *
 * The operator-facing strings also named three profiles while the allowlist
 * held four.
 */
import { describe, expect, it } from "vitest";

import { buildCiProfileIssue, isCiEnvironment } from "../../src/core/phasePolicy.js";

const CI_ENV = { CI: "true" } as NodeJS.ProcessEnv;
const LOCAL_ENV = {} as NodeJS.ProcessEnv;

describe("isCiEnvironment", () => {
  it("recognises both signals", () => {
    expect(isCiEnvironment({ CI: "true" } as NodeJS.ProcessEnv)).toBe(true);
    expect(isCiEnvironment({ GITHUB_ACTIONS: "true" } as NodeJS.ProcessEnv)).toBe(true);
    expect(isCiEnvironment(LOCAL_ENV)).toBe(false);
  });

  // `CI` is truthy-by-presence by convention (Vercel exports `CI=1`,
  // `ci-info` treats any non-empty non-"false" value as CI), so an exact
  // `=== "true"` comparison reads a real CI shell as local.
  it("treats any truthy CI value as CI", () => {
    for (const value of ["1", "yes", "TRUE", "on"]) {
      expect(isCiEnvironment({ CI: value } as NodeJS.ProcessEnv), value).toBe(true);
    }
  });

  it("keeps the explicit opt-out spellings local", () => {
    for (const value of ["", "false", "FALSE", "0", "  false  "]) {
      expect(isCiEnvironment({ CI: value } as NodeJS.ProcessEnv), JSON.stringify(value)).toBe(
        false,
      );
    }
  });
});

describe("buildCiProfileIssue", () => {
  it("is silent for the full-scan profiles", () => {
    for (const profile of ["full", "verify", "tdd", "sdd"] as const) {
      expect(buildCiProfileIssue(profile, CI_ENV), profile).toBeNull();
    }
  });

  it("is silent when no profile was requested", () => {
    expect(buildCiProfileIssue(undefined, CI_ENV)).toBeNull();
  });

  it("is silent outside CI", () => {
    expect(buildCiProfileIssue("atdd", LOCAL_ENV)).toBeNull();
  });

  for (const profile of ["atdd", "discussion", "prototyping"] as const) {
    it(`reports \`${profile}\` at warning, not error`, () => {
      const found = buildCiProfileIssue(profile, CI_ENV);

      expect(found?.code).toBe("QFAI-VALIDATE-017");
      // The severity is the whole fix: an `error` replaced the entire run, and
      // this is the only gate the corresponding skill defines.
      expect(found?.severity).toBe("warning");
      expect(found?.message).toContain(profile);
    });
  }

  it("names every allowed profile in both operator-facing strings", () => {
    // They enumerated three while the code allowed four; generating them from
    // the allowlist is what stops that recurring.
    const found = buildCiProfileIssue("atdd", CI_ENV);

    for (const profile of ["full", "verify", "tdd", "sdd"]) {
      expect(found?.message, `message: ${profile}`).toContain(profile);
      expect(found?.suggested_action, `suggested_action: ${profile}`).toContain(profile);
    }
  });

  it("says the stage run is valid and what completion still needs", () => {
    const found = buildCiProfileIssue("prototyping", CI_ENV);

    expect(found?.message).toContain("stage gate としては有効");
    expect(found?.suggested_action).toContain("full-scan");
  });
});

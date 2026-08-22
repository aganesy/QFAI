import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

const CANONICAL_REL = ".qfai/report/validate.json";

type Finding = { code: string; severity: string; message: string };

/** Profiles that emit a partial-profile notice, i.e. everything but `full` / `verify`. */
const PARTIAL_PROFILES = [
  "discussion",
  "sdd",
  "prototyping",
  "atdd",
  "tdd",
  "saas-package",
] as const;

async function findings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

/** A minimal spec pack: enough for the spec-pack and contract gates to speak. */
async function seedSpec(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
  await writeFile(
    path.join(specDir, "02_User-stories.md"),
    ["# 02 User stories", "", "## US-0001: title", "- Parent: CAP-0001", ""].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(specDir, "06_Test-Cases.md"),
    ["# 06 Test cases", "", "## TC-0001: title", "- Parent: EX-0001", ""].join("\n"),
    "utf-8",
  );
  // `validateSddDesignContractReadiness` only speaks when a root DESIGN.md
  // exists, and the unreplaced `qfai init` seed is what QFAI-DCON-034 names.
  await writeFile(
    path.join(root, "DESIGN.md"),
    ["# DESIGN", "", "Brand: qfai", "", "## Tone", "", "qfai sample brand.", ""].join("\n"),
    "utf-8",
  );
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-coverage-"));
  try {
    await seedSpec(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Runs `task` with CI detection forced off.
 *
 * `discussion`, `prototyping`, `atdd` and `saas-package` are not in
 * `CI_ALLOWED_PROFILES`; under a real CI environment the guard adds its own
 * finding and muddies what this suite reads.
 */
async function withoutCiEnv(task: () => Promise<void>): Promise<void> {
  const previousCi = process.env.CI;
  const previousGha = process.env.GITHUB_ACTIONS;
  const restore = (key: "CI" | "GITHUB_ACTIONS", value: string | undefined): void => {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- literal union key
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };
  restore("CI", undefined);
  restore("GITHUB_ACTIONS", undefined);
  try {
    await task();
  } finally {
    restore("CI", previousCi);
    restore("GITHUB_ACTIONS", previousGha);
  }
}

/** The families listed in a `QFAI-PROFILE-001` message, as written. */
function listedFamilies(message: string): string[] {
  const start = message.indexOf("NOT evaluated in this run: ");
  const end = message.indexOf(". A PASS here");
  if (start < 0 || end < 0) return [];
  return message
    .slice(start + "NOT evaluated in this run: ".length, end)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** `PREFIX-*` matches by prefix; anything else is an exact finding code. */
function familyMatches(family: string, code: string): boolean {
  return family.endsWith("*") ? code.startsWith(family.slice(0, -1)) : code === family;
}

async function noticeFor(root: string, profile: string): Promise<Finding | undefined> {
  await runValidate({ root, strict: false, profile });
  return (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
}

describe("QFAI-PROFILE-001 never names a family the same run emitted", () => {
  for (const profile of PARTIAL_PROFILES) {
    it(`--profile ${profile} does not contradict its own findings`, async () => {
      await withoutCiEnv(async () => {
        await withProject(async (root) => {
          await runValidate({ root, strict: false, profile });
          const all = await findings(root);
          const notice = all.find((entry) => entry.code === "QFAI-PROFILE-001");
          expect(notice).toBeDefined();
          const families = listedFamilies(notice?.message ?? "");
          expect(families.length).toBeGreaterThan(0);

          const contradictions = all
            .filter((entry) => entry.code !== "QFAI-PROFILE-001")
            .flatMap((entry) =>
              families
                .filter((family) => familyMatches(family, entry.code))
                .map((family) => `${entry.code} matched "${family}"`),
            );
          expect(contradictions).toEqual([]);
        });
      });
    });
  }
});

describe("GATE_GROUP_FAMILIES files each family under the group that runs it", () => {
  it("does not call QFAI-CONTRACT-* unevaluated under --profile tdd", async () => {
    // `runTddValidators` calls `validateContracts`.
    await withProject(async (root) => {
      const notice = await noticeFor(root, "tdd");
      expect(notice?.message).not.toContain("QFAI-CONTRACT-*");
      expect(notice?.message).not.toContain("QFAI-TRACE-*");
    });
  });

  it("does not call QFAI-DCON-* unevaluated under --profile sdd", async () => {
    // `runSddValidators` calls `validateSddDesignContractReadiness`.
    await withProject(async (root) => {
      const notice = await noticeFor(root, "sdd");
      expect(notice?.message).not.toContain("QFAI-DCON-*");
    });
  });

  it("splits the reviewer-gate codes across the profiles that run each detector", async () => {
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const sdd = await noticeFor(root, "sdd");
        // `detectMockHrefDrift` / `validateDesignMdPatchZone` are prototyping-
        // only, so the sdd profile must not claim to have covered them.
        expect(sdd?.message).toContain("R-MOCK-HREF-DRIFT");
        expect(sdd?.message).toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
        expect(sdd?.message).not.toContain("R-CERTIFY-VERIFY-CIRCULAR");

        const prototyping = await noticeFor(root, "prototyping");
        expect(prototyping?.message).not.toContain("R-MOCK-HREF-DRIFT");
        expect(prototyping?.message).not.toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
        expect(prototyping?.message).toContain("R-CERTIFY-VERIFY-CIRCULAR");
      });
    });
  });

  it("keeps the sdd-only contract-reference gate out of the shared contracts group", async () => {
    // `runTddValidators` calls `validateContracts`, but `QFAI-CONTRACT-030`
    // comes from `validateContractReferences`, which only sdd runs.
    await withProject(async (root) => {
      const tdd = await noticeFor(root, "tdd");
      expect(tdd?.message).toContain("QFAI-CONTRACT-030");
      expect(tdd?.message).not.toContain("QFAI-CONTRACT-010");

      const sdd = await noticeFor(root, "sdd");
      expect(sdd?.message).not.toContain("QFAI-CONTRACT-030");
    });
  });

  it("keeps the tdd-only traceability-integrity codes out of the shared group", async () => {
    // `validateTraceability` (QFAI-TRACE-1xx) is shared; `QFAI-TRACE-001/002`
    // come from `validateTraceabilityIntegrity`, which only tdd runs.
    await withProject(async (root) => {
      const sdd = await noticeFor(root, "sdd");
      expect(sdd?.message).toContain("QFAI-TRACE-001");
      expect(sdd?.message).toContain("QFAI-TRACE-002");
      expect(sdd?.message).not.toContain("QFAI-TRACE-1*");

      const tdd = await noticeFor(root, "tdd");
      expect(tdd?.message).not.toContain("QFAI-TRACE-001");
      expect(tdd?.message).not.toContain("QFAI-TRACE-1*");
    });
  });

  it("splits QFAI-DCON-* by the stage that emits each code", async () => {
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const sdd = await noticeFor(root, "sdd");
        // Prototyping-only emitters: required design contracts and the
        // design-system / prototype-handoff mirrors.
        expect(sdd?.message).toContain("QFAI-DCON-001");
        expect(sdd?.message).toContain("QFAI-DCON-005");
        // sdd runs the shared root-DESIGN.md gates and its own DCON-019.
        expect(sdd?.message).not.toContain("QFAI-DCON-034");
        expect(sdd?.message).not.toContain("QFAI-DCON-019");

        const prototyping = await noticeFor(root, "prototyping");
        expect(prototyping?.message).toContain("QFAI-DCON-019");
        expect(prototyping?.message).not.toContain("QFAI-DCON-001");
        expect(prototyping?.message).not.toContain("QFAI-DCON-034");
      });
    });
  });

  it("never names TDDLIST-NNN, which is a waiver rule id and not a finding code", async () => {
    // `TDDLIST-001`..`TDDLIST-006` are waiver ids for the `TDDLIST_*` findings,
    // so listing them as an unevaluated hard-gate family names nothing real.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        for (const profile of PARTIAL_PROFILES) {
          const notice = await noticeFor(root, profile);
          expect(notice?.message ?? "").not.toMatch(/TDDLIST-\d/);
          expect(notice?.message ?? "").not.toContain("TDDLIST-*");
        }
      });
    });
  });

  it("names the spec-pack families --profile tdd skips", async () => {
    // `runSddValidators` owns these and `runTddValidators` calls none of them.
    await withProject(async (root) => {
      const notice = await noticeFor(root, "tdd");
      for (const family of [
        "QFAI-TABLE-*",
        "QFAI-DENSITY-*",
        "QFAI-SPLIT-*",
        "QFAI-STATUSLEAK-*",
        "QFAI-TRIAGE-*",
        "QFAI-STATUS-*",
        "QFAI-AC-*",
        "QFAI-EX-*",
        "QFAI-TC-*",
        "QFAI-LEDGER-*",
        "W-WORKLOG-*",
        "W-PENDING-PROMOTION",
      ]) {
        expect(notice?.message).toContain(family);
      }
    });
  });
});

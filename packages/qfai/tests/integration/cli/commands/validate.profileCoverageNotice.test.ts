import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import { QFAI_GITIGNORE_BLOCK } from "../../../../src/core/gitignore.js";
import { PACKAGE_SELF_GOVERNANCE_FAMILIES } from "../../../../src/core/validators/packageSelfGovernance.js";
import type { ValidationProfile } from "../../../../src/core/types.js";

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

/**
 * Every profile, as a record so the compiler enumerates them.
 *
 * A list written out by hand is the same convention the differential below
 * exists to remove: a profile added to `ValidationProfile` would simply not be
 * measured. A `Record<ValidationProfile, true>` does not type-check until the
 * new profile is a key here, so the omission is a build error rather than a
 * quietly narrower suite.
 */
const EVERY_PROFILE: Record<ValidationProfile, true> = {
  discussion: true,
  sdd: true,
  prototyping: true,
  atdd: true,
  tdd: true,
  verify: true,
  full: true,
  "saas-package": true,
};

const ALL_PROFILES: readonly ValidationProfile[] = Object.keys(EVERY_PROFILE).filter(
  (key): key is ValidationProfile => key in EVERY_PROFILE,
);

/** The half of `validate.json` this suite reads. */
type Report = { issues: Finding[]; profileValidatorsRan?: boolean };

function isReport(value: unknown): value is Report {
  if (typeof value !== "object" || value === null || !("issues" in value)) return false;
  return Array.isArray(value.issues);
}

async function reportBody(root: string): Promise<Report> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8"));
  if (!isReport(parsed)) {
    throw new Error(`${CANONICAL_REL} is not a validation report`);
  }
  return parsed;
}

async function findings(root: string): Promise<Finding[]> {
  return (await reportBody(root)).issues;
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
 * The same project plus one review pack whose `summary.json` is not JSON.
 *
 * `validateReviewArtifacts` is the sole emitter of `QFAI-REVIEW-*`, so a tree
 * that gives it something to complain about turns "does this profile run that
 * validator?" into an observation. The plain `withProject` tree has no review
 * pack at all, which is why the contradiction suite above never reached this
 * family: with nothing to report, listing it as unevaluated contradicts
 * nothing.
 */
async function withBrokenReviewPack(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-coverage-review-"));
  try {
    await seedSpec(root);
    // The managed block keeps the advisory `QFAI-REVIEW-008` (no recommended
    // ignore) out of the measurement, so what the differential reads is the
    // malformed pack rather than the fixture's own housekeeping.
    await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
    const packDir = path.join(root, ".qfai", "review", "review-20260401000000000");
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "review_request.md"), "# Review Request\n", "utf-8");
    await writeFile(path.join(packDir, "R01_completion-reviewer.md"), "# R01\n", "utf-8");
    await writeFile(path.join(packDir, "summary.json"), "{ not json", "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * The same project with its skills directory replaced by a regular file.
 *
 * That is the one shape a later `readdir` cannot survive, so
 * `runProfileValidators` returns the integration-surface findings alone and
 * runs none of the profile's own validators.
 */
async function withUnwalkableSurface(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-profile-coverage-surface-"));
  try {
    await seedSpec(root);
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "assistant", "skills"), "not a directory\n", "utf-8");
    // Enough of a surface that `qfai init` counts as having run here.
    await writeFile(
      path.join(root, ".qfai", "assistant", "README.md"),
      [
        "# QFAI assistant tree",
        "",
        "## Canonical entrypoint",
        "",
        "- .qfai/assistant/skills/",
        "",
      ].join("\n"),
      "utf-8",
    );
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
/**
 * Whether one table entry covers one emitted code.
 *
 * A table entry may carry an annotation after its pattern —
 * `TDDLIST_* (execution state)` names the glob and says what it holds — so only
 * the first whitespace-delimited token is the pattern. Reading the whole entry
 * made an annotated glob match nothing, which turned the contradiction check
 * below into a silent pass for every code that entry covers.
 */
function familyMatches(family: string, code: string): boolean {
  const pattern = family.split(/\s+/u)[0] ?? family;
  return pattern.endsWith("*") ? code.startsWith(pattern.slice(0, -1)) : code === pattern;
}

async function noticeFor(root: string, profile: ValidationProfile): Promise<Finding | undefined> {
  await runValidate({ root, strict: false, profile });
  return (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
}

describe("the review-artifacts group is measured against what each profile emits", () => {
  // `GATE_GROUP_FAMILIES["review-artifacts"]` is claimed by `discussion` and by
  // `sdd`, and that claim rests on two call sites in `core/validate.ts` that
  // agree with it only by convention: `runDiscussionValidators` calls
  // `validateReviewArtifacts` unconditionally, and `runSddValidators` calls it
  // under an `includeReviewArtifacts` parameter that defaults to `true` and
  // that the `sdd` dispatch happens not to pass — while `runFullValidators`
  // passes `false` so the family is reported once. Flip that default, or hand
  // the `sdd` case a sixth positional argument, and the notice keeps promising
  // a gate the run no longer evaluates.
  //
  // So measure it instead of restating it. `validateReviewArtifacts` is the
  // sole emitter of `QFAI-REVIEW-*` (`core/validators/reviewArtifacts.ts`), so
  // on a tree with a malformed pack "the profile ran it" is observable, and the
  // notice has to agree with that observation in BOTH directions: a profile
  // that reports the family must not list it as unevaluated, and a profile that
  // reports nothing must name it. Either call site changing, or the group table
  // changing, fails this.
  for (const profile of ALL_PROFILES) {
    it(`--profile ${profile}: the notice agrees with whether the run reports QFAI-REVIEW-*`, async () => {
      await withoutCiEnv(async () => {
        await withBrokenReviewPack(async (root) => {
          await runValidate({ root, strict: false, profile });
          const all = await findings(root);
          const reported = all
            .map((entry) => entry.code)
            .filter((code) => code.startsWith("QFAI-REVIEW-"));
          const notice = all.find((entry) => entry.code === "QFAI-PROFILE-001");
          expect(notice, "every profile writes a coverage notice").toBeDefined();
          const namedAsUnevaluated = (notice?.message ?? "").includes("QFAI-REVIEW-*");

          expect(
            namedAsUnevaluated,
            reported.length > 0
              ? `this run reported ${reported.join(", ")}, so the notice must not call ` +
                  "QFAI-REVIEW-* unevaluated"
              : "this run reported no QFAI-REVIEW-* finding on a malformed pack, so the notice " +
                  "must name the family as unevaluated",
          ).toBe(reported.length === 0);
        });
      });
    });
  }
});

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

describe("a detector whose inputs are absent is reported, whatever the profile", () => {
  // `runPackageSelfGovernanceValidators` reads qfai's OWN package sources, so
  // in a consuming repo — which is what every fixture here is — both detectors
  // are structurally unevaluated however clean the project is.
  //
  // They belong to no other profile, and a full scan wires the same detectors
  // against the same absent inputs, so neither "run --profile X" nor "run the
  // full profile" is the remedy. That is why they are a third axis rather than
  // part of either list.
  it("names them for --profile full, which otherwise claims complete coverage", async () => {
    await withProject(async (root) => {
      const notice = await noticeFor(root, "full");

      expect(notice?.message).toContain("evaluated every gate a full scan covers");
      expect(notice?.message).toContain("Wired in but not evaluable in this tree");
      for (const family of PACKAGE_SELF_GOVERNANCE_FAMILIES) {
        expect(notice?.message, `${family} was dropped from the full-profile notice`).toContain(
          family,
        );
      }
    });
  });

  it("keeps them out of the run-the-full-profile list on a partial profile", async () => {
    // The other half: on a partial profile the same codes must not be folded
    // into "Hard gates NOT evaluated in this run", because that list's remedy
    // is a full scan and a full scan cannot evaluate them either.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const notice = await noticeFor(root, "sdd");
        const message = notice?.message ?? "";
        const skipped = message.slice(
          message.indexOf("Hard gates NOT evaluated in this run:"),
          message.indexOf("A PASS here is not full-scan coverage"),
        );

        expect(skipped, "the skip-list is missing from the notice").not.toBe("");
        for (const family of PACKAGE_SELF_GOVERNANCE_FAMILIES) {
          expect(skipped, `${family} is in the run-the-full-profile list`).not.toContain(family);
          expect(message, `${family} is missing from the notice entirely`).toContain(family);
        }
      });
    });
  });
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

  it("splits the reviewer-gate codes across the profiles that emit each one", async () => {
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const sdd = await noticeFor(root, "sdd");
        // `detectMockHrefDrift` / `validateDesignMdPatchZone` are prototyping-
        // only detectors, but `validateReviewerJustification` — which sdd runs
        // — re-issues their codes, so sdd must not list them as unevaluated.
        expect(sdd?.message).not.toContain("R-MOCK-HREF-DRIFT");
        expect(sdd?.message).not.toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
        expect(sdd?.message).not.toContain("R-CERTIFY-VERIFY-CIRCULAR");

        const prototyping = await noticeFor(root, "prototyping");
        expect(prototyping?.message).not.toContain("R-MOCK-HREF-DRIFT");
        expect(prototyping?.message).not.toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
        expect(prototyping?.message).toContain("R-CERTIFY-VERIFY-CIRCULAR");

        // Neither detector nor either profile runs these two, and only
        // `validateReviewerJustification` can re-issue them inside `validate`.
        expect(sdd?.message).not.toContain("R-PACK-LOCATION-DRIFT");
        expect(sdd?.message).not.toContain("R-EXPLORATION-CERTIFY-ATTEMPT");
        expect(prototyping?.message).toContain("R-PACK-LOCATION-DRIFT");
        expect(prototyping?.message).toContain("R-EXPLORATION-CERTIFY-ATTEMPT");
      });
    });
  });

  it("does not list a reviewer code the sdd run re-issued from a review report", async () => {
    // `validateReviewerJustification` reports an empty `justification:` under
    // the original finding code, so an sdd run can emit a prototyping-detector
    // code. Listing it as unevaluated in the same artifact contradicts it.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const reviewDir = path.join(root, ".qfai", "review", "review-20260101-000000");
        await mkdir(reviewDir, { recursive: true });
        await writeFile(
          path.join(reviewDir, "report.json"),
          JSON.stringify({
            findings: [
              { code: "R-MOCK-HREF-DRIFT", justification: "" },
              { code: "R-PACK-LOCATION-DRIFT", justification: "   " },
            ],
          }),
          "utf-8",
        );

        await runValidate({ root, strict: false, profile: "sdd" });
        const all = await findings(root);
        const emitted = all.map((entry) => entry.code);
        expect(emitted).toContain("R-MOCK-HREF-DRIFT");
        expect(emitted).toContain("R-PACK-LOCATION-DRIFT");

        const notice = all.find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(notice?.message).not.toContain("R-MOCK-HREF-DRIFT");
        expect(notice?.message).not.toContain("R-PACK-LOCATION-DRIFT");
      });
    });
  });

  it("points stage-only gates at their own profile, not at a full scan", async () => {
    // `runFullValidators` disables `QFAI-DCON-019` and the upstream guard, so
    // "run the full profile" is advice that cannot deliver either gate.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const prototyping = await noticeFor(root, "prototyping");
        expect(prototyping?.message).toContain("QFAI-DCON-019 (`--profile sdd`)");
        expect(prototyping?.message).toContain("QFAI-DRIFT-* (`--profile tdd`)");
        // Not folded into the "run full" list.
        expect(listedFamilies(prototyping?.message ?? "")).not.toContain("QFAI-DCON-019");
        expect(listedFamilies(prototyping?.message ?? "")).not.toContain("QFAI-DRIFT-*");

        // Each owner evaluates its own, so neither names it at all.
        const sdd = await noticeFor(root, "sdd");
        expect(sdd?.message).not.toContain("QFAI-DCON-019");
        const tdd = await noticeFor(root, "tdd");
        expect(tdd?.message).not.toContain("QFAI-DRIFT-*");
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
    // `validateTraceability` (QFAI-TRACE-1xx) is shared. So is one half of
    // `validateTraceabilityIntegrity`: `runSddValidators` calls it with
    // `includeImplementationDiff: false`, so `--profile sdd` hears
    // `QFAI-TRACE-002` about the ledger it writes, and not `QFAI-TRACE-001` /
    // `-003`, which read a diff that is untouched by design at that gate.
    await withProject(async (root) => {
      const sdd = await noticeFor(root, "sdd");
      expect(sdd?.message).toContain("QFAI-TRACE-001");
      expect(sdd?.message).toContain("QFAI-TRACE-003");
      expect(sdd?.message).not.toContain("QFAI-TRACE-002");
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
          // A BARE `TDDLIST-` glob only. `QFAI-TDDLIST-*` is the canonical
          // spelling of the execution-state family and is a real finding code
          // prefix, so a plain substring test rejects the entry the table is
          // supposed to carry.
          expect(notice?.message ?? "").not.toMatch(/(?<!QFAI-)TDDLIST-\*/);
        }
      });
    });
  });

  it("keeps the code-reference TRACE gates out of the shared traceability group", async () => {
    // `runSddValidators` calls `validateTraceability` with the default
    // `includeCodeReferences: false`, so the same validator run under `sdd`
    // evaluates neither `QFAI-TRACE-117` nor `QFAI-TRACE-124` — a `tdd` or
    // `full` run can fail on a gate the `sdd` notice claimed as covered.
    await withProject(async (root) => {
      const sdd = await noticeFor(root, "sdd");
      expect(sdd?.message).toContain("QFAI-TRACE-117");
      expect(sdd?.message).toContain("QFAI-TRACE-124");
      // The structural codes stay shared — sdd runs those.
      expect(sdd?.message).not.toContain("QFAI-TRACE-118");
      expect(sdd?.message).not.toContain("QFAI-TRACE-1*");

      // `runTddValidators` passes `includeCodeReferences: true`.
      const tdd = await noticeFor(root, "tdd");
      expect(tdd?.message).not.toContain("QFAI-TRACE-117");
      expect(tdd?.message).not.toContain("QFAI-TRACE-124");
    });
  });

  it("points the SaaS-only hard gates at --profile saas-package", async () => {
    // `runSaasPackageProfile` is composed by that profile alone, so a full scan
    // cannot deliver either gate and must say which profile can.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const full = await noticeFor(root, "full");
        expect(full?.message).toContain(
          "D-SAAS-PACKAGE-ATTESTATION-MISSING (`--profile saas-package`)",
        );
        expect(full?.message).toContain("D-SAAS-PACKAGE-HANDOFF-SCHEMA (`--profile saas-package`)");
        // Not folded into the "run full" list: a full scan never runs them.
        expect(listedFamilies(full?.message ?? "")).not.toContain(
          "D-SAAS-PACKAGE-ATTESTATION-MISSING",
        );

        // The owner emits one of them on this fixture (no attestation file) and
        // must not list its own gates as unevaluated.
        await runValidate({ root, strict: false, profile: "saas-package" });
        const all = await findings(root);
        expect(all.map((entry) => entry.code)).toContain("D-SAAS-PACKAGE-ATTESTATION-MISSING");
        const saas = all.find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(saas?.message).not.toContain("D-SAAS-PACKAGE-ATTESTATION-MISSING");
        expect(saas?.message).not.toContain("D-SAAS-PACKAGE-HANDOFF-SCHEMA");
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

describe("the notice describes the run, not the requested profile's table", () => {
  // POSIX only: the scenario is the ENOTDIR shape, and Windows folds that
  // errno into ENOENT, which reads as absence.
  it.skipIf(process.platform === "win32")(
    "does not claim full-scan coverage when the run stopped at the integration surface",
    async () => {
      // `runProfileValidators` returns `surface.issues` alone when a path the
      // profile's own validators walk cannot be walked, so `full` ran no
      // validator at all — and printed "evaluated every gate a full scan
      // covers" next to the `QFAI-LINK-001` that says why it did not.
      await withoutCiEnv(async () => {
        await withUnwalkableSurface(async (root) => {
          await runValidate({ root, strict: false, profile: "full" });
          const body = await reportBody(root);
          const codes = body.issues.map((entry) => entry.code);
          expect(codes).toContain("QFAI-LINK-001");
          expect(body.profileValidatorsRan).toBe(false);

          const notice = body.issues.find((entry) => entry.code === "QFAI-PROFILE-001");
          expect(notice?.message).not.toContain("evaluated every gate a full scan covers");
          expect(notice?.message).toContain("evaluated NO hard gate in this run");
          expect(notice?.message).toContain("QFAI-LINK-001");
        });
      });
    },
  );

  it.skipIf(process.platform === "win32")(
    "does not name only the other profiles' gates when a partial profile stopped",
    async () => {
      // `sdd` walks the configured skills directory too, so the same damage
      // stops it — and the ordinary wording implies its own gates were observed.
      await withoutCiEnv(async () => {
        await withUnwalkableSurface(async (root) => {
          const notice = await noticeFor(root, "sdd");
          expect(notice?.message).toContain("evaluated NO hard gate in this run");
          expect(listedFamilies(notice?.message ?? "")).toEqual([]);
        });
      });
    },
  );

  it("still reports full-scan coverage on a run that reached its validators", async () => {
    // Over-correction pin: the abort branch must not swallow the ordinary
    // wording for a healthy run.
    await withoutCiEnv(async () => {
      await withProject(async (root) => {
        const notice = await noticeFor(root, "full");
        expect(notice?.message).toContain("evaluated every gate a full scan covers");
        expect(notice?.message).not.toContain("evaluated NO hard gate");
        expect((await reportBody(root)).profileValidatorsRan).toBe(true);

        const sdd = await noticeFor(root, "sdd");
        expect(sdd?.message).toContain("is a partial profile");
        expect(listedFamilies(sdd?.message ?? "").length).toBeGreaterThan(0);
      });
    });
  });
});

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";
import {
  SAAS_PACKAGE_SKIPPED_GATES,
  SAAS_PACKAGE_SKIPPED_GATE_FAMILIES,
  saasPackageSkippedGateFamilies,
} from "../../../../src/core/saasPackage/skippedGates.js";

const CANONICAL_REL = ".qfai/report/validate.json";

type Finding = { code: string; severity: string; message: string };

async function findings(root: string): Promise<Finding[]> {
  const body = JSON.parse(await readFile(path.join(root, CANONICAL_REL), "utf-8")) as {
    issues: Finding[];
  };
  return body.issues;
}

/** A spec with a US and a TC, and no test tree at all. */
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
}

/**
 * Adds a layered ledger linking a BR to an implementation file that is not in
 * any diff — the state `/qfai-sdd` leaves behind before `/qfai-implement` runs.
 */
async function seedLedger(root: string): Promise<void> {
  await writeFile(
    path.join(root, ".qfai", "specs", "spec-0001", "16_Traceability-ledger.md"),
    [
      "# 16 Traceability Ledger",
      "",
      "| BR/AC | Implementation File | Test File |",
      "| --- | --- | --- |",
      "| BR-0001-0001 | src/core/someModule.ts | tests/core/someModule.test.ts |",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-profile-"));
  try {
    await seedSpec(root);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * Runs `task` with CI detection forced on or off.
 *
 * `discussion`, `prototyping`, `atdd` and `saas-package` are not in
 * `CI_ALLOWED_PROFILES`, so under the real CI environment the guard short-
 * circuits the run and the partial-profile notice is replaced by the
 * blocked-run notice. Tests that mean one or the other must say which.
 */
async function withCiEnv(inCi: boolean, task: () => Promise<void>): Promise<void> {
  // `isCiEnvironment` reads exactly these two.
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
  restore("CI", inCi ? "true" : undefined);
  restore("GITHUB_ACTIONS", inCi ? "true" : undefined);
  try {
    await task();
  } finally {
    restore("CI", previousCi);
    restore("GITHUB_ACTIONS", previousGha);
  }
}

describe("--profile tdd can observe the ATDD routing gates", () => {
  it("raises QFAI-ATDD-111/112 under the tdd profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const codes = (await findings(root)).map((entry) => entry.code);
      expect(codes).toContain("QFAI-ATDD-111");
      expect(codes).toContain("QFAI-ATDD-112");
    });
  });

  it("carries the atdd profile's own findings all the way into validate.json", async () => {
    // Being *called* is not the user-visible contract. `runAtddValidators`
    // could await every validator and still drop the results before the
    // report is written, leaving `QFAI-ATDD-*` as absent from validate.json as
    // the retired QFAI-ATDD-001 was — which is what the reachability meta-test
    // in tests/unit/validators-are-wired.test.ts cannot see. Pin one finding
    // per ATDD validator reached from `--profile atdd` in the emitted report.
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "atdd" });
        const codes = (await findings(root)).map((entry) => entry.code);
        expect(codes).toContain("QFAI-ATDD-111");
        expect(codes).toContain("QFAI-ATDD-112");
      });
    });
  });

  it("does not double-report the ATDD gates under the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const atdd111 = (await findings(root)).filter((entry) => entry.code === "QFAI-ATDD-111");
      expect(atdd111).toHaveLength(1);
    });
  });

  it("names the hard gates a partial profile did not evaluate", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
      expect(notice?.severity).toBe("info");
      expect(notice?.message).toContain('profile="tdd" is a partial profile');
      expect(notice?.message).toContain("QFAI-COV-*");
      expect(notice?.message).toContain("not full-scan coverage");
      // The gates this PR added must not be listed as unevaluated.
      expect(notice?.message).not.toContain("QFAI-ATDD-*");
    });
  });

  it("names every group --profile tdd skips, not only the headline three", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false, profile: "tdd" });
      const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
      // `runTddValidators` calls none of repository hygiene, skills integrity,
      // assistant assets, the discussion validators, review artifacts or the
      // prototyping-skill gate, so each family must appear.
      for (const family of [
        "QFAI-HYG-*",
        "QFAI-SKILLS-*",
        "QFAI-ASSETS-*",
        "QFAI-DPACK-*",
        "QFAI-RESEARCH-*",
        "QFAI-REVIEW-*",
        "UIX-VAL-SKILL-*",
        "QFAI-PROT-*",
        "D-SCAFFOLD-PLACEHOLDER",
      ]) {
        expect(notice?.message).toContain(family);
      }
      // What tdd does run must stay off the list.
      expect(notice?.message).not.toContain("TDDLIST_*");
    });
  });

  it("names the discussion profile's own group as evaluated and the rest as not", async () => {
    // `discussion` is not CI-allowed, so this must run outside CI detection or
    // the guard replaces the notice with the blocked-run message.
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "discussion" });
        const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(notice?.message).toContain('profile="discussion" is a partial profile');
        expect(notice?.message).toContain("QFAI-HYG-*");
        expect(notice?.message).toContain("TDDLIST_*");
        expect(notice?.message).not.toContain("QFAI-DPACK-*");
      });
    });
  });

  it("runs the narrow profile in CI and reports it (#397)", async () => {
    await withCiEnv(true, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "atdd" });
        const all = await findings(root);

        // The CI notice is still emitted — an accidental narrowing stays
        // visible — but the profile's own validators ran, so the ordinary
        // partial-profile wording is now the accurate one.
        expect(all.map((entry) => entry.code)).toContain("QFAI-VALIDATE-017");
        expect(all.find((entry) => entry.code === "QFAI-VALIDATE-017")?.severity).toBe("warning");

        const notice = all.find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(notice?.message).toContain('profile="atdd" is a partial profile');
        expect(notice?.message).not.toContain("was blocked by the CI profile guard");
        expect(notice?.message).not.toContain("NO hard gate was evaluated");
      });
    });
  });

  it("emits no partial-profile notice for the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const codes = (await findings(root)).map((entry) => entry.code);
      expect(codes).not.toContain("QFAI-PROFILE-001");
    });
  });

  it("lists every family the saas-package skip-set actually skips", async () => {
    // Same reason as the discussion case: `saas-package` is not CI-allowed.
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "saas-package" });
        const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(notice?.message).toContain('profile="saas-package" is a partial profile');
        // `runSaasPackageProfile` skips validateAtddCodeTraceability, so a
        // reader of validate-saas-package.json must not be told otherwise.
        for (const family of saasPackageSkippedGateFamilies()) {
          expect(notice?.message).toContain(family);
        }
        expect(notice?.message).toContain("QFAI-ATDD-*");
      });
    });
  });

  it("keeps the notice families in step with the skip-set SSOT", () => {
    // Every skipped gate must map to at least one code family, or the notice
    // silently under-reports what was not evaluated.
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      expect(SAAS_PACKAGE_SKIPPED_GATE_FAMILIES[gate] ?? []).not.toHaveLength(0);
    }
  });
});

// #536: `/qfai-sdd` owns `16_Traceability-ledger.md` but `--profile sdd` — the
// gate that skill stops on — never ran the validator that asks for it.
describe("--profile sdd owns the traceability-ledger gate", () => {
  it("raises QFAI-TRACE-002 for a ledger-less spec under the sdd profile", async () => {
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "sdd" });
        const codes = (await findings(root)).map((entry) => entry.code);
        expect(codes).toContain("QFAI-TRACE-002");
      });
    });
  });

  it("does not double-report the ledger gate under the full profile", async () => {
    await withProject(async (root) => {
      await runValidate({ root, strict: false });
      const trace002 = (await findings(root)).filter((entry) => entry.code === "QFAI-TRACE-002");
      expect(trace002).toHaveLength(1);
    });
  });

  it("keeps the ledger gate off the unevaluated list for sdd", async () => {
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "sdd" });
        const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
        expect(notice?.message).not.toContain("QFAI-TRACE-002");
        // But the implementation-drift half is genuinely not evaluated by sdd,
        // so the notice must keep saying so.
        expect(notice?.message).toContain("QFAI-TRACE-001");
        // The TDD-list gates are still not part of what sdd evaluates.
        expect(notice?.message).toContain("TDDLIST_*");
      });
    });
  });

  // PR #856 review: `/qfai-sdd` updates BR/AC and the ledger and hands the
  // implementation to `/qfai-implement`, so the linked code is untouched by
  // design at this gate. Raising the history-based QFAI-TRACE-001 here would
  // fail the mandatory `--profile sdd --fail-on error` run on the normal flow.
  it("never raises QFAI-TRACE-001 under the sdd profile", async () => {
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await seedLedger(root);
        await runValidate({ root, strict: false, profile: "sdd" });
        const codes = (await findings(root)).map((entry) => entry.code);
        expect(codes).not.toContain("QFAI-TRACE-001");
        expect(codes).not.toContain("QFAI-TRACE-003");
      });
    });
  });

  it("keeps the ledger gate on the unevaluated list for tdd's own drift half", async () => {
    await withCiEnv(false, async () => {
      await withProject(async (root) => {
        await runValidate({ root, strict: false, profile: "tdd" });
        const notice = (await findings(root)).find((entry) => entry.code === "QFAI-PROFILE-001");
        // tdd runs both halves.
        expect(notice?.message).not.toContain("QFAI-TRACE-001");
        expect(notice?.message).not.toContain("QFAI-TRACE-002");
      });
    });
  });
});

/**
 * Unit: saas-package profile DCON-005 attestation gate
 * (TC-0004-0068 / TDD-0048).
 *
 * - Given a repo where the prototyping-profile findings PASS (no
 *   error-severity issues), but `.qfai/contracts/design/design-system.yaml`
 *   is REMOVED, the saas-package profile MUST fail and the failure
 *   message MUST name the absent attestation.
 * - When the attestation is present, the saas-package profile emits
 *   the standard `D-SAAS-PACKAGE-VERIFY-SKIPPED` info findings and
 *   does NOT contribute an attestation-missing error.
 *
 * Exercises `runSaasPackageProfile` directly (unit-level) without
 * shelling out to the CLI.
 */
// QFAI:SPEC-0004:TC-0004-0068

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { runSaasPackageProfile } from "../../../../src/core/saasPackage/profile.js";
import { SAAS_PACKAGE_SKIPPED_GATES } from "../../../../src/core/saasPackage/skippedGates.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-saas-attest-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seedAttestation(): Promise<void> {
  const dir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "design-system.yaml"),
    ["surfaces: []", "tokens: {}", ""].join("\n"),
    "utf-8",
  );
}

describe("TC-0004-0068: saas-package profile rejects missing DCON-005 attestation", () => {
  it("fails (error severity) when .qfai/contracts/design/design-system.yaml is absent — failure names the attestation", async () => {
    // No attestation seeded. Prototyping issues are passed as an empty
    // list (clean prototyping pipeline) so the only failure source is
    // the attestation gate.
    const issues = await runSaasPackageProfile(root, defaultConfig, []);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    const attestationError = errors.find((i) =>
      (i.message ?? "").includes("design-system.yaml"),
    );
    expect(
      attestationError,
      "expected an error finding that names the absent design-system.yaml attestation",
    ).toBeDefined();
    expect(attestationError?.message ?? "").toContain(
      ".qfai/contracts/design/design-system.yaml",
    );
  });

  it("does NOT emit the attestation-missing finding when the file is present", async () => {
    await seedAttestation();
    const issues = await runSaasPackageProfile(root, defaultConfig, []);
    const attestationError = issues.find(
      (i) => i.severity === "error" && (i.message ?? "").includes("design-system.yaml"),
    );
    expect(attestationError).toBeUndefined();
  });

  it("always surfaces one D-SAAS-PACKAGE-VERIFY-SKIPPED (info) finding per skipped gate", async () => {
    await seedAttestation();
    const issues = await runSaasPackageProfile(root, defaultConfig, []);
    const skips = issues.filter((i) => i.code === "D-SAAS-PACKAGE-VERIFY-SKIPPED");
    expect(skips.length).toBe(SAAS_PACKAGE_SKIPPED_GATES.length);
    expect(skips.every((i) => i.severity === "info")).toBe(true);
    // Each skipped gate name surfaces in exactly one finding.
    for (const gate of SAAS_PACKAGE_SKIPPED_GATES) {
      const named = skips.find((i) => i.message.includes(gate));
      expect(named, `expected a skip finding naming "${gate}"`).toBeDefined();
    }
  });

  it("propagates prototyping-profile issues unchanged into the saas-package result", async () => {
    await seedAttestation();
    const prototypingIssues = [
      {
        code: "QFAI-FAKE-001",
        severity: "warning" as const,
        category: "canonical" as const,
        message: "synthetic prototyping warning",
      },
    ];
    const issues = await runSaasPackageProfile(root, defaultConfig, prototypingIssues);
    const carried = issues.find((i) => i.code === "QFAI-FAKE-001");
    expect(carried).toBeDefined();
    expect(carried?.severity).toBe("warning");
  });
});

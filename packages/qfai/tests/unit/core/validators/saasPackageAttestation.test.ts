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
    const attestationError = errors.find((i) => (i.message ?? "").includes("design-system.yaml"));
    expect(
      attestationError,
      "expected an error finding that names the absent design-system.yaml attestation",
    ).toBeDefined();
    expect(attestationError?.message ?? "").toContain(".qfai/contracts/design/design-system.yaml");
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

  // Pin the outside-root absolute-path fallback for the rel display.
  // When `config.paths.contractsDir` is an absolute path that resolves
  // OUTSIDE `root`, the `D-SAAS-PACKAGE-ATTESTATION-MISSING` message
  // must name the resolved absolute path (forward-slash normalized)
  // rather than the prior `..`-stripped dangling string that pointed
  // at a non-existent middle-of-tree location. This guards against a
  // regression that re-introduces the `replace(/^(\.\.\/)+/, "")`
  // cleanup that mangled the rel when `path.relative(root, abs)` had
  // to traverse upward.
  it("names the absolute resolved path when contractsDir is configured outside root", async () => {
    // Outside-root contractsDir: place it as a sibling of `root`.
    const outsideContracts = await mkdtemp(path.join(os.tmpdir(), "qfai-saas-outside-"));
    try {
      // Do NOT seed the attestation under outsideContracts — we want
      // the missing-attestation branch to fire so we can assert the
      // message text.
      const customConfig = {
        ...defaultConfig,
        paths: { ...defaultConfig.paths, contractsDir: outsideContracts },
      };
      const issues = await runSaasPackageProfile(root, customConfig, []);
      const attestationError = issues.find(
        (i) => i.severity === "error" && i.code === "D-SAAS-PACKAGE-ATTESTATION-MISSING",
      );
      expect(attestationError).toBeDefined();
      const expectedAbs = path
        .join(outsideContracts, "design", "design-system.yaml")
        .replace(/\\/g, "/");
      // Primary assertion: the message MUST name the navigable
      // resolved absolute path (forward-slash normalized). This alone
      // catches a regression to the `..`-stripped form, because
      // re-introducing the `replace(/^(\.\.\/)+/, "")` cleanup would
      // emit `<outsideName>/design/design-system.yaml` (the absolute
      // path's last directory + leaf, missing the project anchor)
      // rather than the resolved absolute path, so the
      // `toContain(expectedAbs)` check fails.
      expect(attestationError?.message ?? "").toContain(expectedAbs);
      // Secondary regression guard: directly assert the resolved
      // absolute path is NOT relativized into a middle-of-tree
      // string. The buggy `..`-stripped form would emit
      // `<outsideName>/design/design-system.yaml` (no project anchor,
      // no `os.tmpdir()` prefix); the fixed form keeps the full
      // absolute path. Check the message does NOT contain the
      // expectation-without-tmpdir-prefix shape that the old cleanup
      // produced.
      const outsideName = path.basename(outsideContracts);
      const buggyRel = `${outsideName}/design/design-system.yaml`;
      // The bare relative shape (without the os.tmpdir() prefix)
      // would surface only under the old cleanup; the absolute form
      // contains it as a suffix but also has the full path prefix,
      // so we check for "absent: <bareRel>" (the operator-facing
      // anchor where the old form would emerge).
      expect(attestationError?.message ?? "").not.toMatch(
        new RegExp(`absent:\\s+${buggyRel.replace(/[.]/g, "\\.")}\\.`),
      );
    } finally {
      await rm(outsideContracts, { recursive: true, force: true });
    }
  });
});

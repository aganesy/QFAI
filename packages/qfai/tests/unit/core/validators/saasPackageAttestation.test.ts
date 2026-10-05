/**
 * Unit: saas-package profile design-system attestation gate
 * (TC-0004-0068 / TDD-0048).
 *
 * - Given a repo where the prototyping-profile findings PASS (no
 *   error-severity issues), but root `DESIGN.md` is absent or does not
 *   parse, the saas-package profile MUST fail and the failure message
 *   MUST name the attestation.
 * - When the attestation parses, the saas-package profile emits
 *   the standard `D-SAAS-PACKAGE-VERIFY-SKIPPED` info findings and
 *   does NOT contribute an attestation-missing error.
 *
 * Exercises `runSaasPackageProfile` directly (unit-level) without
 * shelling out to the CLI.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runSaasPackageProfile } from "../../../../src/core/saasPackage/profile.js";
import {
  SAAS_PACKAGE_SKIPPED_GATES,
  saasPackageSkippedGateFamilies,
} from "../../../../src/core/saasPackage/skippedGates.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-saas-attest-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary: "#1F2937"',
  '    secondary: "#6366F1"',
  '    accent: "#D97706"',
  '    surface: "#FFFFFF"',
  '    surface_muted: "#F3F4F6"',
  '    text: "#111827"',
  '    text_muted: "#6B7280"',
  '    danger: "#DC2626"',
  '    warning: "#F59E0B"',
  '    success: "#10B981"',
  '    border: "#E5E7EB"',
  '    overlay: "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans: "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm: "0.25rem"',
  '    md: "0.5rem"',
  '    lg: "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

async function seedAttestation(): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
}

const HANDOFF_DIR = [".qfai", "prototype", "final"] as const;

/** Writes the prototyping handoff record the saas-package profile reads. */
async function seedHandoff(body: string): Promise<void> {
  await mkdir(path.join(root, ...HANDOFF_DIR), { recursive: true });
  await writeFile(path.join(root, ...HANDOFF_DIR, "handoff.json"), body, "utf-8");
}

const CONFORMING_HANDOFF = JSON.stringify({
  finalArtifact: ".qfai/prototype/final/index.html",
  procurement: { procured: [], authored: [], "drawn-from-project": [] },
  implementationNotes: "The confirmed prototype.",
});

describe("TC-0004-0068: saas-package profile rejects a missing design-system attestation", () => {
  it("names current story-tree stage gates in its skip notice", () => {
    expect(SAAS_PACKAGE_SKIPPED_GATES).toEqual([
      "validateStoryTreeObligations",
      "validateTestTodoStubs",
      "validateStoryTreeDrift",
    ]);
    expect(saasPackageSkippedGateFamilies()).toEqual([
      "QFAI-STORY-006",
      "QFAI-STORY-007",
      "QFAI-STORY-008",
      "QFAI-STORY-009",
      "QFAI-STORY-014",
      "QFAI-SCAN-002",
      "QFAI-TEST-*",
      "QFAI-DRIFT-001",
      "QFAI-STORY-010",
    ]);
  });
  // QFAI:EX-0001-0049-01
  it("fails (error severity) when root DESIGN.md is absent — failure names the attestation", async () => {
    // No attestation seeded. Prototyping issues are passed as an empty
    // list (clean prototyping pipeline) so the only failure source is
    // the attestation gate.
    await seedHandoff(CONFORMING_HANDOFF);
    const issues = await runSaasPackageProfile(root, []);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.map((i) => [i.code, i.file, i.message])).toEqual([
      [
        "D-SAAS-PACKAGE-ATTESTATION-MISSING",
        "DESIGN.md",
        "Design-system attestation DESIGN.md is absent. The saas-package profile requires this attestation to PASS.",
      ],
    ]);
  });

  // QFAI:EX-0001-0049-01
  it("fails when root DESIGN.md does not parse", async () => {
    await writeFile(path.join(root, "DESIGN.md"), "no front matter here\n", "utf-8");
    const issues = await runSaasPackageProfile(root, []);
    const attestationError = issues.find((i) => i.code === "D-SAAS-PACKAGE-ATTESTATION-MISSING");
    expect(attestationError?.severity).toBe("error");
    expect(attestationError?.message).toContain("DESIGN.md does not parse as DESIGN.md");
  });

  it("does NOT emit the attestation-missing finding when root DESIGN.md parses", async () => {
    await seedAttestation();
    await seedHandoff(CONFORMING_HANDOFF);
    const issues = await runSaasPackageProfile(root, []);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("always surfaces one D-SAAS-PACKAGE-VERIFY-SKIPPED (info) finding per skipped gate", async () => {
    await seedAttestation();
    const issues = await runSaasPackageProfile(root, []);
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
    const issues = await runSaasPackageProfile(root, prototypingIssues);
    const carried = issues.find((i) => i.code === "QFAI-FAKE-001");
    expect(carried).toBeDefined();
    expect(carried?.severity).toBe("warning");
  });

  // QFAI:EX-0001-0049-01
  it("does not pass when the prototyping-profile validate fails", async () => {
    await seedAttestation();
    const prototypingIssues = [
      {
        code: "QFAI-FAKE-002",
        severity: "error" as const,
        category: "canonical" as const,
        message: "synthetic prototyping failure",
      },
    ];
    const issues = await runSaasPackageProfile(root, prototypingIssues);
    expect(issues.find((i) => i.code === "QFAI-FAKE-002")?.severity).toBe("error");
  });

  // QFAI:EX-0001-0049-01
  it("does not pass with a malformed CLI-HANDOFF handoff", async () => {
    await seedAttestation();
    await seedHandoff("just a string\n");
    const issues = await runSaasPackageProfile(root, []);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "D-SAAS-PACKAGE-HANDOFF-SCHEMA",
          severity: "error",
          file: ".qfai/prototype/final/handoff.json",
        }),
      ]),
    );
  });

  // QFAI:EX-0001-0049-01
  it("does not pass with a handoff written as YAML rather than JSON", async () => {
    await seedAttestation();
    await seedHandoff("finalArtifact: .qfai/prototype/final/index.html\n");
    const issues = await runSaasPackageProfile(root, []);
    const rejected = issues.find((i) => i.code === "D-SAAS-PACKAGE-HANDOFF-SCHEMA");
    expect(rejected?.severity).toBe("error");
    expect(rejected?.file).toBe(".qfai/prototype/final/handoff.json");
  });

  // QFAI:EX-0001-0049-01
  it("does not pass without the prototyping handoff record, and names the file", async () => {
    await seedAttestation();
    const issues = await runSaasPackageProfile(root, []);
    const missing = issues.find((i) => i.code === "D-SAAS-PACKAGE-HANDOFF-SCHEMA");
    expect(missing?.severity).toBe("error");
    expect(missing?.file).toBe(".qfai/prototype/final/handoff.json");
  });

  it("reads no handoff file other than the prototyping record", async () => {
    await seedAttestation();
    await seedHandoff(CONFORMING_HANDOFF);
    await writeFile(path.join(root, ".qfai", "handoff.yaml"), "just a string\n", "utf-8");
    const issues = await runSaasPackageProfile(root, []);
    expect(issues.filter((i) => i.code === "D-SAAS-PACKAGE-HANDOFF-SCHEMA")).toEqual([]);
  });
});

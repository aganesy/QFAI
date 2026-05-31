/**
 * Unit: `auditProfile.ts` band warning + closed-schema reject
 * (TC-0004-0070 / TDD-0050).
 *
 * - A UI contract with 9 `primary_tasks` entries must trigger
 *   `QFAI-AUD-020` (severity warning) naming the `3..7` recommended
 *   count band.
 * - A structured primary_task missing the `acceptance` key must be
 *   rejected by the closed-schema validator (`QFAI-AUD-021`,
 *   severity error).
 */
// QFAI:SPEC-0004:TC-0004-0070

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import {
  PRIMARY_TASKS_BAND_LABEL,
  PRIMARY_TASKS_BAND_MAX,
  PRIMARY_TASKS_BAND_MIN,
  runAuditProfile,
} from "../../../../src/core/validators/auditProfile.js";

let root: string;

async function seedConfig(): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/report",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "uiux:",
      "  audit:",
      "    enabled: true",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function writeUiContract(filename: string, body: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, filename), body, "utf-8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-audit-profile-band-"));
  await seedConfig();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0004-0070: QFAI-AUD-020 band 3..7 warn + missing acceptance reject (error/boundary)", () => {
  it("9 primary_tasks fires QFAI-AUD-020 (warning) naming the 3..7 band", async () => {
    const tasks = Array.from({ length: 9 }, (_, i) => `      - task_${i + 1}`).join("\n");
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      tasks,
      "",
    ].join("\n");
    await writeUiContract("over-band.yaml", ui);

    const issues = await runAuditProfile(root, defaultConfig);
    const band = issues.find((i) => i.code === "QFAI-AUD-020");
    expect(band, "expected QFAI-AUD-020 finding for 9 tasks").toBeDefined();
    expect(band?.severity).toBe("warning");
    expect(band?.message ?? "").toMatch(/3\.\.7|3 to 7/);
    // The shipped band label constant is sourced from the production
    // module so any band drift surfaces here as a failing assertion.
    expect(PRIMARY_TASKS_BAND_LABEL).toBe(
      `${PRIMARY_TASKS_BAND_MIN}..${PRIMARY_TASKS_BAND_MAX}`,
    );
    expect(band?.message ?? "").toContain(PRIMARY_TASKS_BAND_LABEL);
  });

  it("structured primary_task missing 'acceptance' is rejected (QFAI-AUD-021 error)", async () => {
    const ui = [
      "screens:",
      "  - id: orders",
      "    title: Orders",
      "    route: /orders",
      "    primary_tasks:",
      "      - id: view-orders",
      "        label: View orders",
      "        acceptance: orders table renders within budget",
      "      - id: refund-order",
      "        label: Refund an order",
      "      - id: open-detail",
      "        label: Open order detail",
      "        acceptance: detail drawer opens on row click",
      "",
    ].join("\n");
    await writeUiContract("missing-acceptance.yaml", ui);

    const issues = await runAuditProfile(root, defaultConfig);
    const shape = issues.find((i) => i.code === "QFAI-AUD-021");
    expect(shape, "expected QFAI-AUD-021 finding for missing acceptance").toBeDefined();
    expect(shape?.severity).toBe("error");
    expect(shape?.message ?? "").toMatch(/acceptance/);
    expect(shape?.message ?? "").toMatch(/refund-order/);
  });

  it("count exactly 3 (lower inclusive bound) does NOT trigger QFAI-AUD-020", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - View orders",
      "      - Refund an order",
      "      - Open order detail",
      "",
    ].join("\n");
    await writeUiContract("in-band.yaml", ui);

    const issues = await runAuditProfile(root, defaultConfig);
    expect(issues.find((i) => i.code === "QFAI-AUD-020")).toBeUndefined();
  });
});

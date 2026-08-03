/**
 * Integration tests for spec-0013 CHG-005 TC-0013-0026 / TC-0013-0027.
 *
 * Verifies that the QFAI-AUD-001 aligned validate lane fires (and stays
 * silent) per the spec contract:
 *   - empty `primary_tasks: []` -> severity=error finding naming the
 *     offending file path, screen id, and rule token.
 *   - non-empty `primary_tasks` -> zero QFAI-AUD-001 error findings.
 *   - slot-absent (legacy) UI contracts -> QFAI-AUD-001 at severity=info
 *     under a one-minor-release deprecation window (sunset: qfai 1.10.0);
 *     non-blocking so legacy contracts can migrate without a hard break.
 */
// QFAI:SPEC-0013:TC-0013-0026
// QFAI:SPEC-0013:TC-0013-0027

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDesignAudit } from "../../src/core/validators/designAudit.js";

type WorkspaceSeed = {
  uiContract: string;
};

async function withWorkspace(
  seed: WorkspaceSeed,
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-aud001-lane-"));
  try {
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
        "    maxPrimaryCtas: 1",
        "",
      ].join("\n"),
      "utf-8",
    );
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(path.join(uiDir, "sample.yaml"), seed.uiContract, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function uiContractWithEmptyPrimaryTasks(): string {
  return [
    "screens:",
    "  - id: order_create",
    "    title: Create Order",
    "    route: /orders/new",
    "    primary_tasks: []",
    "",
  ].join("\n");
}

function uiContractWithPopulatedPrimaryTasks(): string {
  return [
    "screens:",
    "  - id: order_create",
    "    title: Create Order",
    "    route: /orders/new",
    "    primary_tasks:",
    "      - create_order",
    "",
  ].join("\n");
}

function uiContractWithoutPrimaryTasksKey(): string {
  return [
    "screens:",
    "  - id: order_create",
    "    title: Create Order",
    "    route: /orders/new",
    "",
  ].join("\n");
}

describe("TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty", () => {
  it("returns a severity=error finding naming file path, screen id, and rule token", async () => {
    await withWorkspace({ uiContract: uiContractWithEmptyPrimaryTasks() }, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);

      const audit001 = issues.filter((issue) => issue.code === "QFAI-AUD-001");
      expect(audit001.length).toBeGreaterThan(0);

      const blocker = audit001.find((issue) => issue.severity === "error");
      expect(blocker, "expected at least one severity=error QFAI-AUD-001 issue").toBeDefined();

      // The user-facing message body must name all three elements so that
      // the orchestrator surface (which presents `message` first, not the
      // separate `code` / `file` fields) is self-describing.
      const message = blocker?.message ?? "";

      // 1. File path: contract path appears in the message.
      expect(message).toMatch(/\.qfai\/contracts\/ui\/sample\.yaml/);
      // 2. Screen id: order_create appears in the message.
      expect(message).toMatch(/order_create/);
      // 3. Rule token: QFAI-AUD-001 appears in the message.
      expect(message).toMatch(/QFAI-AUD-001/);
    });
  });
});

describe("TC-0013-0027: QFAI-AUD-001 aligned lane passes when primary_tasks is non-empty", () => {
  it("returns zero QFAI-AUD-001 error issues when every screen has >=1 primary_task", async () => {
    await withWorkspace({ uiContract: uiContractWithPopulatedPrimaryTasks() }, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const audit001Errors = issues.filter(
        (issue) => issue.code === "QFAI-AUD-001" && issue.severity === "error",
      );
      expect(audit001Errors).toEqual([]);
    });
  });

  // 2-stage emission: legacy UI contracts that pre-date the primary_tasks
  // slot (key-absent) emit QFAI-AUD-001 at severity=info under a one-minor
  // release deprecation window (sunset: qfai 1.10.0). Key-empty (slot
  // authored but `primary_tasks: []`) remains severity=error.
  it("legacy slot-less contracts emit QFAI-AUD-001 at severity=error (past sunset)", async () => {
    await withWorkspace({ uiContract: uiContractWithoutPrimaryTasksKey() }, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const audit001 = issues.filter((issue) => issue.code === "QFAI-AUD-001");
      expect(audit001.length).toBeGreaterThan(0);

      // The window closed at `SUNSETS.legacyPrimaryTasksSlot`. Key-absent was
      // `info` while it was open; past the sunset it blocks, which is what the
      // message promised all along.
      expect(audit001.filter((issue) => issue.severity === "info")).toEqual([]);

      const blocked = audit001.find((issue) => issue.severity === "error");
      expect(blocked, "expected severity=error QFAI-AUD-001 for legacy contract").toBeDefined();
      const message = blocked?.message ?? "";
      expect(message).toMatch(/legacy/i);
      expect(message).toMatch(/1\.10\.0/);
    });
  });

  it("authored-but-empty primary_tasks remains severity=error (intentional violation)", async () => {
    await withWorkspace({ uiContract: uiContractWithEmptyPrimaryTasks() }, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const audit001Errors = issues.filter(
        (issue) => issue.code === "QFAI-AUD-001" && issue.severity === "error",
      );
      expect(audit001Errors.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Integration tests for spec-0013 CHG-005 TC-0013-0026 / TC-0013-0027.
 *
 * Verifies that the QFAI-AUD-001 aligned validate lane fires (and stays
 * silent) per the spec contract:
 *   - empty `primary_tasks: []` -> severity=error finding naming the
 *     offending file path, screen id, and rule token.
 *   - non-empty `primary_tasks` -> zero QFAI-AUD-001 error findings.
 *   - slot-absent (legacy) UI contracts -> deprecation-window semantics;
 *     boundary case is documented as a TODO referencing the spec-0013
 *     CHG-005 deferral (see Notes below).
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
    await withWorkspace(
      { uiContract: uiContractWithEmptyPrimaryTasks() },
      async (root) => {
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
      },
    );
  });
});

describe("TC-0013-0027: QFAI-AUD-001 aligned lane passes when primary_tasks is non-empty", () => {
  it("returns zero QFAI-AUD-001 error issues when every screen has >=1 primary_task", async () => {
    await withWorkspace(
      { uiContract: uiContractWithPopulatedPrimaryTasks() },
      async (root) => {
        const issues = await validateDesignAudit(root, defaultConfig);
        const audit001Errors = issues.filter(
          (issue) => issue.code === "QFAI-AUD-001" && issue.severity === "error",
        );
        expect(audit001Errors).toEqual([]);
      },
    );
  });

  // Deprecation-window boundary: legacy UI contracts that pre-date the
  // primary_tasks slot do NOT carry the key. The current QFAI-AUD-001
  // semantics treat key-absent identically to key-empty (both length === 0).
  // CHG-005 keeps the strict semantics intentionally — the slot ships in the
  // SDD template (TC-0013-0025) so authoring drift is corrected at the
  // template layer, and the lane stays a single rule.
  //
  // TODO(spec-0013/CHG-005): if a softer deprecation downgrade is desired
  // (severity=info on key-absent vs severity=error on key-empty), revisit
  // designAudit.ts under a new DR. For now we assert the current
  // contract: key-absent legacy fixtures still surface QFAI-AUD-001 at
  // error severity so the orchestrator does not silently regress.
  it("legacy slot-less contracts surface QFAI-AUD-001 under current strict semantics", async () => {
    await withWorkspace(
      { uiContract: uiContractWithoutPrimaryTasksKey() },
      async (root) => {
        const issues = await validateDesignAudit(root, defaultConfig);
        const audit001Errors = issues.filter(
          (issue) => issue.code === "QFAI-AUD-001" && issue.severity === "error",
        );
        // Strict semantics: key-absent === key-empty under current rule
        // body. Documented here so a future deprecation-window downgrade
        // (info vs error) lands with an explicit test flip + DR.
        expect(audit001Errors.length).toBeGreaterThan(0);
      },
    );
  });
});

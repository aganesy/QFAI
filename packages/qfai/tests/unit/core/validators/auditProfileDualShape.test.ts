/**
 * Unit: `auditProfile.ts` task shape (TC-0004-0069 / TDD-0049).
 *
 * - `auditProfile.ts` re-exports the audit lane entrypoints from
 *   `designAudit.ts`. A UI contract whose `primary_tasks` entries are
 *   structured `{id, label, acceptance}` mappings passes: no
 *   `QFAI-AUD-021` shape findings, no `QFAI-AUD-020` ceiling findings,
 *   no `QFAI-AUD-001` empty findings. A sibling contract whose entries
 *   are plain strings is rejected with one `QFAI-AUD-021` per entry.
 *
 * - Verifies the auditProfile surface delegates to the shared
 *   designAudit lane.
 */
// QFAI:EX-0001-0052-01

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import {
  runAuditProfile,
  validateDesignAudit,
} from "../../../../src/core/validators/auditProfile.js";

let root: string;

async function seedConfig(): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/spec/03_contract",
      "  specsDir: .qfai/spec",
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
  const uiDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, filename), body, "utf-8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-audit-profile-dual-"));
  await seedConfig();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0004-0069: auditProfile accepts only structured primary_tasks", () => {
  it("rejects plain string primary_tasks, one QFAI-AUD-021 per entry", async () => {
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
    await writeUiContract("legacy.yaml", ui);

    const issues = await runAuditProfile(root, defaultConfig);
    expect(issues.filter((i) => i.code === "QFAI-AUD-021")).toHaveLength(3);
    expect(issues.find((i) => i.code === "QFAI-AUD-001")?.severity).toBe("error");
  });

  it("structured {id,label,acceptance} primary_tasks (closed schema) pass", async () => {
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
      "        acceptance: refund confirmation toast appears",
      "      - id: open-detail",
      "        label: Open order detail",
      "        acceptance: detail drawer opens on row click",
      "",
    ].join("\n");
    await writeUiContract("structured.yaml", ui);

    const issues = await runAuditProfile(root, defaultConfig);
    expect(issues.find((i) => i.code === "QFAI-AUD-021")).toBeUndefined();
    expect(issues.find((i) => i.code === "QFAI-AUD-020")).toBeUndefined();
    expect(issues.find((i) => i.code === "QFAI-AUD-001")).toBeUndefined();
  });

  it("rejects the string-only sibling and passes the structured one", async () => {
    await writeUiContract(
      "legacy.yaml",
      [
        "screens:",
        "  - id: dashboard",
        "    title: Dashboard",
        "    route: /dashboard",
        "    primary_tasks:",
        "      - View orders",
        "      - Refund an order",
        "      - Open order detail",
        "",
      ].join("\n"),
    );
    await writeUiContract(
      "structured.yaml",
      [
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
        "        acceptance: refund confirmation toast appears",
        "      - id: open-detail",
        "        label: Open order detail",
        "        acceptance: detail drawer opens on row click",
        "",
      ].join("\n"),
    );

    const issues = await runAuditProfile(root, defaultConfig);
    const shape = issues.filter((i) => i.code === "QFAI-AUD-021");
    expect(shape).toHaveLength(3);
    expect(shape.every((i) => i.file?.includes("legacy.yaml"))).toBe(true);
    expect(issues.filter((i) => i.file?.includes("structured.yaml"))).toEqual([]);
  });

  it("auditProfile.runAuditProfile delegates to validateDesignAudit (same observable behavior)", async () => {
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
    await writeUiContract("legacy.yaml", ui);

    const viaWrapper = await runAuditProfile(root, defaultConfig);
    const viaDirect = await validateDesignAudit(root, defaultConfig);
    expect(viaWrapper.map((i) => i.code).sort()).toEqual(viaDirect.map((i) => i.code).sort());
  });
});

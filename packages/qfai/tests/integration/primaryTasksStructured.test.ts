/**
 * TC-0013-0034 / TC-0013-0035 — structured primary_tasks shape
 * `{id, label, acceptance}` all-required, closed schema (DR-0013-0004,
 * cites _policies DR-0268).
 *
 * - TC-0013-0034 (normal): string-only items continue to pass
 *   (legacy); a complete structured `{id, label, acceptance}` item
 *   also passes.
 * - TC-0013-0035 (error): a structured item missing any of
 *   `id` / `label` / `acceptance`, or carrying extra keys, is
 *   rejected by the audit lane.
 */
// QFAI:SPEC-0013:TC-0013-0034
// QFAI:SPEC-0013:TC-0013-0035

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDesignAudit } from "../../src/core/validators/designAudit.js";

async function withWorkspace(uiContract: string, task: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-aud021-shape-"));
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
        "",
      ].join("\n"),
      "utf-8",
    );
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(path.join(uiDir, "sample.yaml"), uiContract, "utf-8");
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("TC-0013-0034: structured primary_tasks accepted", () => {
  it("string-only items pass (legacy shape, three string entries — within band)", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - Review pending orders",
      "      - Mark order shipped",
      "      - Inspect order details",
      "",
    ].join("\n");
    await withWorkspace(ui, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
      const band = issues.find((issue) => issue.code === "QFAI-AUD-020");
      const empty = issues.find((issue) => issue.code === "QFAI-AUD-001");
      expect(shape).toBeUndefined();
      expect(band).toBeUndefined();
      expect(empty).toBeUndefined();
    });
  });

  it("complete structured {id,label,acceptance} items pass", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - id: t1",
      "        label: Review pending orders",
      "        acceptance: at-least-one pending row visible",
      "      - id: t2",
      "        label: Mark order shipped",
      "        acceptance: order status flips to shipped",
      "      - id: t3",
      "        label: Inspect order details",
      "        acceptance: detail drawer renders the order",
      "",
    ].join("\n");
    await withWorkspace(ui, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
      const band = issues.find((issue) => issue.code === "QFAI-AUD-020");
      const empty = issues.find((issue) => issue.code === "QFAI-AUD-001");
      expect(shape).toBeUndefined();
      expect(band).toBeUndefined();
      expect(empty).toBeUndefined();
    });
  });
});

describe("TC-0013-0035: incomplete / open structured primary_tasks rejected", () => {
  it("rejects a structured item missing 'acceptance'", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - id: t1",
      "        label: Review pending orders",
      "        acceptance: at-least-one pending row visible",
      "      - id: t2",
      "        label: Mark order shipped",
      "      - id: t3",
      "        label: Inspect order details",
      "        acceptance: detail drawer renders the order",
      "",
    ].join("\n");
    await withWorkspace(ui, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
      expect(shape, "expected QFAI-AUD-021 for missing acceptance").toBeDefined();
      expect(shape?.severity).toBe("error");
      expect(shape?.message ?? "").toMatch(/acceptance/);
      expect(shape?.message ?? "").toMatch(/t2/);
    });
  });

  it("rejects a structured item missing 'id'", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - id: t1",
      "        label: Review pending orders",
      "        acceptance: at-least-one pending row visible",
      "      - label: Untagged action",
      "        acceptance: still required",
      "      - id: t3",
      "        label: Inspect order details",
      "        acceptance: detail drawer renders the order",
      "",
    ].join("\n");
    await withWorkspace(ui, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
      expect(shape, "expected QFAI-AUD-021 for missing id").toBeDefined();
      expect(shape?.message ?? "").toMatch(/\bid\b/);
    });
  });

  it("rejects a structured item carrying an extra key (closed schema)", async () => {
    const ui = [
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
      "    primary_tasks:",
      "      - id: t1",
      "        label: Review pending orders",
      "        acceptance: at-least-one pending row visible",
      "      - id: t2",
      "        label: Mark order shipped",
      "        acceptance: order status flips to shipped",
      "        priority: high",
      "      - id: t3",
      "        label: Inspect order details",
      "        acceptance: detail drawer renders the order",
      "",
    ].join("\n");
    await withWorkspace(ui, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const shape = issues.find((issue) => issue.code === "QFAI-AUD-021");
      expect(shape, "expected QFAI-AUD-021 for extra key").toBeDefined();
      expect(shape?.message ?? "").toMatch(/priority/);
      expect(shape?.message ?? "").toMatch(/t2/);
    });
  });
});

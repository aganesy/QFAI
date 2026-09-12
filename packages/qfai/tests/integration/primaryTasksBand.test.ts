/**
 * TC-0013-0032 / TC-0013-0033 — the primary_tasks ceiling of 7
 * (DR-0013-0003 / cites _policies DR-0267).
 *
 * - TC-0013-0032 (normal): the ceiling is documented in the shipped UI
 *   contract template comments AND in `references/ui-contract-guide.md`,
 *   and the `QFAI-AUD-020` warning text names it.
 * - TC-0013-0033 (boundary): a screen declaring more than 7
 *   `primary_tasks` triggers `QFAI-AUD-020`; 1 through 7 do not.
 *
 * There is no lower bound. A screen that does one thing is the shape the
 * ceiling protects, so it passes like any other count under it.
 */
// QFAI:SPEC-0013:TC-0013-0032
// QFAI:SPEC-0013:TC-0013-0033

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { extractUiScreens } from "../../src/core/contracts/screenContracts.js";
import { PRIMARY_TASKS_MAX, validateDesignAudit } from "../../src/core/validators/designAudit.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(TEST_DIR, "..", "..");
const TEMPLATE_PATH = path.resolve(
  PKG_ROOT,
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "templates",
  "contracts",
  "ui-contract.sample.yaml",
);
const GUIDE_PATH = path.resolve(
  PKG_ROOT,
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-sdd",
  "references",
  "ui-contract-guide.md",
);

async function withWorkspace(uiContract: string, task: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-aud020-band-"));
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

function uiContractWithPrimaryTaskCount(count: number): string {
  const items = Array.from({ length: count }, (_, idx) => `      - task_${idx + 1}`);
  return [
    "screens:",
    "  - id: dashboard",
    "    title: Dashboard",
    "    route: /dashboard",
    "    primary_tasks:",
    ...items,
    "",
  ].join("\n");
}

describe("TC-0013-0032: the primary_tasks ceiling is documented and named in the warning", () => {
  it("the shipped UI contract template documents the ceiling in its comments", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf-8");
    expect(template).toMatch(/at most 7/);
  });

  it("references/ui-contract-guide.md documents the ceiling", async () => {
    const guide = await readFile(GUIDE_PATH, "utf-8");
    expect(guide).toMatch(/at most 7/);
    // And says there is no floor, which is the half a reader reaching for
    // a count would otherwise have to infer from the table.
    expect(guide).toMatch(/no lower bound/i);
  });

  it("the QFAI-AUD-020 warning message names the ceiling", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(9), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
      expect(warning, "expected a QFAI-AUD-020 finding").toBeDefined();
      expect(warning?.severity).toBe("warning");
      expect(warning?.message ?? "").toMatch(/at most 7/);
    });
  });
});

describe("TC-0013-0033: primary_tasks above 7 warns; 1 through 7 do not", () => {
  // The case the rule exists to protect, and the one it used to report.
  // A screen that does one thing was told its focus was weak, and the
  // guidance was to bring the count up — that is, to add tasks to it.
  it("count == 1 emits nothing", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(1), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      expect(issues.filter((issue) => issue.code === "QFAI-AUD-020")).toEqual([]);
    });
  });

  it("count == 8 (over the ceiling) emits QFAI-AUD-020", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(8), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
      expect(warning, "expected QFAI-AUD-020 for count=8").toBeDefined();
    });
  });

  it("counts 1 through 7 do not emit QFAI-AUD-020", async () => {
    for (const count of [1, 2, 3, 5, 7]) {
      await withWorkspace(uiContractWithPrimaryTaskCount(count), async (root) => {
        const issues = await validateDesignAudit(root, defaultConfig);
        const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
        expect(warning, `expected no QFAI-AUD-020 for count=${count}`).toBeUndefined();
      });
    }
  });
});

describe("the shipped ui-contract.sample.yaml sits under its own ceiling", () => {
  it("copied verbatim into .qfai/contracts/ui, the sample emits no QFAI-AUD-020", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf-8");
    await withWorkspace(template, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const banded = issues.filter((issue) => issue.code === "QFAI-AUD-020");
      expect(banded.map((issue) => issue.message)).toEqual([]);
    });
  });

  it("the sample demonstrates the structured {id, label, acceptance} shape cleanly", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf-8");
    const parsed: unknown = parseYaml(template);
    const screens = extractUiScreens(parsed);

    expect(screens.length).toBeGreaterThan(0);
    for (const screen of screens) {
      expect(screen.primaryTaskShapeFindings).toEqual([]);
      expect(screen.primaryTasks.length).toBeGreaterThan(0);
      expect(screen.primaryTasks.length).toBeLessThanOrEqual(PRIMARY_TASKS_MAX);
    }

    await withWorkspace(template, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      expect(issues.filter((issue) => issue.code === "QFAI-AUD-021")).toEqual([]);
    });
  });
});

/**
 * TC-0013-0032 / TC-0013-0033 — primary_tasks recommended band 3..7
 * (DR-0013-0003 / cites _policies DR-0267).
 *
 * - TC-0013-0032 (normal): the band is documented in the shipped UI
 *   contract template comments AND in `references/ui-contract-guide.md`,
 *   and the `QFAI-AUD-020` warning text names the band.
 * - TC-0013-0033 (boundary): a screen declaring fewer than 3 or more
 *   than 7 `primary_tasks` triggers `QFAI-AUD-020`; counts 3, 5, 7
 *   (inclusive bounds) do not.
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
import {
  PRIMARY_TASKS_BAND_MAX,
  PRIMARY_TASKS_BAND_MIN,
  validateDesignAudit,
} from "../../src/core/validators/designAudit.js";

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

describe("TC-0013-0032: primary_tasks band 3..7 documented and named in warning", () => {
  it("the shipped UI contract template documents the 3..7 band in its comments", async () => {
    const template = await readFile(TEMPLATE_PATH, "utf-8");
    expect(template).toMatch(/3\.\.7|3 to 7/);
  });

  it("references/ui-contract-guide.md documents the 3..7 band", async () => {
    const guide = await readFile(GUIDE_PATH, "utf-8");
    expect(guide).toMatch(/3\.\.7|3 to 7/);
  });

  it("the QFAI-AUD-020 warning message names the band 3..7", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(9), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
      expect(warning, "expected a QFAI-AUD-020 finding").toBeDefined();
      expect(warning?.severity).toBe("warning");
      expect(warning?.message ?? "").toMatch(/3\.\.7|3 to 7/);
    });
  });
});

describe("TC-0013-0033: primary_tasks below 3 / above 7 warns; 3, 5, 7 do not", () => {
  it("count == 2 (below band) emits QFAI-AUD-020", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(2), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
      expect(warning, "expected QFAI-AUD-020 for count=2").toBeDefined();
      expect(warning?.severity).toBe("warning");
    });
  });

  it("count == 8 (above band) emits QFAI-AUD-020", async () => {
    await withWorkspace(uiContractWithPrimaryTaskCount(8), async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
      expect(warning, "expected QFAI-AUD-020 for count=8").toBeDefined();
    });
  });

  it("counts 3, 5, 7 (inclusive) do not emit QFAI-AUD-020", async () => {
    for (const count of [3, 5, 7]) {
      await withWorkspace(uiContractWithPrimaryTaskCount(count), async (root) => {
        const issues = await validateDesignAudit(root, defaultConfig);
        const warning = issues.find((issue) => issue.code === "QFAI-AUD-020");
        expect(warning, `expected no QFAI-AUD-020 for count=${count}`).toBeUndefined();
      });
    }
  });
});

describe("the shipped ui-contract.sample.yaml sits inside its own 3..7 band", () => {
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
      expect(screen.primaryTasks.length).toBeGreaterThanOrEqual(PRIMARY_TASKS_BAND_MIN);
      expect(screen.primaryTasks.length).toBeLessThanOrEqual(PRIMARY_TASKS_BAND_MAX);
    }

    await withWorkspace(template, async (root) => {
      const issues = await validateDesignAudit(root, defaultConfig);
      expect(issues.filter((issue) => issue.code === "QFAI-AUD-021")).toEqual([]);
    });
  });
});

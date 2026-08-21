// The shipped assistant assets carry a hard line ceiling. The number used to
// live only in `tests/helpers/skillBudget.ts`, which is not published, so a
// `qfai init` project had neither the number nor a tool that knew it. These
// cases pin the runtime owner of the ceiling and the `assets.lineBudget`
// doctor check that exposes it.

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../../../src/core/doctor.js";
import {
  ASSISTANT_ASSET_MAX_LINES,
  LINE_BUDGET_EXEMPT,
  checkAssistantAssetLineBudget,
  countLines,
} from "../../../../src/core/doctor/assetLineBudget.js";

async function withTempRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-asset-budget-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeAsset(root: string, relPath: string, lines: number): Promise<void> {
  const abs = path.join(root, ".qfai", "assistant", relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(
    abs,
    Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n"),
    "utf-8",
  );
}

describe("countLines", () => {
  it("counts with split(/\\r?\\n/) so blank and CRLF lines are not discounted", () => {
    expect(countLines("a\nb\nc")).toBe(3);
    expect(countLines("a\r\nb\r\nc")).toBe(3);
    // A trailing newline yields a final empty element — the same arithmetic the
    // asset test uses, so both agree on a file that ends with a newline.
    expect(countLines("a\n\n\n")).toBe(4);
  });
});

describe("checkAssistantAssetLineBudget", () => {
  it("exposes the ceiling as a runtime constant", () => {
    expect(ASSISTANT_ASSET_MAX_LINES).toBe(500);
  });

  it("reports a file over the ceiling with its measured line count", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 3);
      await writeAsset(root, "catalog/test-layers.md", 10);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("over_budget");
      expect(report.maxLines).toBe(ASSISTANT_ASSET_MAX_LINES);
      expect(report.scanned).toBe(2);
      expect(report.oversized).toEqual([
        { path: "assistant/skills/qfai-demo/SKILL.md", lines: ASSISTANT_ASSET_MAX_LINES + 3 },
      ]);
    });
  });

  it("passes when every asset is at or under the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "constitution/baseline.md", ASSISTANT_ASSET_MAX_LINES);
      await writeAsset(root, "manifest/skills.yml", 12);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("ok");
      expect(report.oversized).toEqual([]);
      expect(report.scanned).toBe(2);
    });
  });

  it("ignores files whose extension is not a shipped asset extension", async () => {
    await withTempRoot(async (root) => {
      const abs = path.join(root, ".qfai", "assistant", "catalog", "notes.txt");
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, "x\n".repeat(ASSISTANT_ASSET_MAX_LINES + 50), "utf-8");

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.scanned).toBe(0);
      expect(report.status).toBe("ok");
    });
  });

  it("honours the exemption list instead of reporting a generated file", async () => {
    await withTempRoot(async (root) => {
      const exemptRel = [...LINE_BUDGET_EXEMPT.keys()][0];
      expect(exemptRel).toBeDefined();
      const withinAssistant = exemptRel?.replace(/^assistant\//, "") ?? "";
      await writeAsset(root, withinAssistant, ASSISTANT_ASSET_MAX_LINES + 40);

      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("ok");
      expect(report.oversized).toEqual([]);
      expect(report.exempt).toEqual([exemptRel]);
    });
  });

  it("skips cleanly when the assistant tree has not been created", async () => {
    await withTempRoot(async (root) => {
      const report = await checkAssistantAssetLineBudget(root);

      expect(report.status).toBe("skipped_missing_assistant");
      expect(report.scanned).toBe(0);
    });
  });
});

describe("doctor assets.lineBudget check", () => {
  it("warns with the ceiling and the offending files in details", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES + 1);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check).toBeDefined();
      expect(check?.severity).toBe("warning");
      expect(check?.message).toContain(String(ASSISTANT_ASSET_MAX_LINES));
      expect(check?.details?.["oversized"]).toEqual([
        { path: "assistant/skills/qfai-demo/SKILL.md", lines: ASSISTANT_ASSET_MAX_LINES + 1 },
      ]);
    });
  });

  it("is ok when the assistant tree is inside the ceiling", async () => {
    await withTempRoot(async (root) => {
      await writeAsset(root, "skills/qfai-demo/SKILL.md", ASSISTANT_ASSET_MAX_LINES);

      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "assets.lineBudget");

      expect(check?.severity).toBe("ok");
    });
  });
});

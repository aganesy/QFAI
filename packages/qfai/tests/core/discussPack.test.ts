import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateDiscussPack } from "../../src/core/validators/discussPack.js";

const REQUIRED_FILES = [
  "01_Context.md",
  "02_Hearing.md",
  "03_Config-Hearing.md",
  "04_Deep-Dive.md",
  "05_OQ-Register.md",
  "06_OQ-Resolution-Log.md",
  "07_Deferred.md",
  "08_Review-Request.md",
  "09_delta.md",
] as const;

describe("validateDiscussPack", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-discuss-pack-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function seedDiscussPack(
    root: string,
    packName = "discuss-20260218093015999",
    overrides: Partial<Record<(typeof REQUIRED_FILES)[number], string>> = {},
  ): Promise<string> {
    const packDir = path.join(root, ".qfai", "discuss", packName);
    await mkdir(packDir, { recursive: true });
    for (const fileName of REQUIRED_FILES) {
      const content = overrides[fileName] ?? defaultFileContent(fileName);
      await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
    }
    return packDir;
  }

  it("passes when latest discuss pack has open=0 and deferred metadata is complete", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root);
      const issues = await validateDiscussPack(root);
      expect(issues).toEqual([]);
    });
  });

  it("fails when latest discuss pack is missing required files", async () => {
    await withTempRoot(async (root) => {
      const packDir = await seedDiscussPack(root);
      await rm(path.join(packDir, "08_Review-Request.md"), { force: true });

      const issues = await validateDiscussPack(root);
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-024")).toBe(true);
    });
  });

  it("fails when OQ register still has Disposition=open", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root, "discuss-20260218100101001", {
        "05_OQ-Register.md": [
          "# 05 OQ Register",
          "",
          "| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Next-Decision-Point | Evidence |",
          "| ----- | ----- | ---- | ----------- | ----- | --------- | ------- | ------------------- | -------- |",
          "| OQ-0001 | unresolved item | discuss | open | user | TBD | Option A / Option B (recommended: A) | before require | Conversation log |",
          "",
        ].join("\n"),
      });

      const issues = await validateDiscussPack(root);
      const openIssue = issues.find((entry) => entry.code === "QFAI-DISCUSS-025");
      expect(openIssue?.severity).toBe("error");
      expect(openIssue?.refs).toContain("OQ-0001");
    });
  });

  it("fails when deferred metadata is incomplete", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root, "discuss-20260218100202002", {
        "07_Deferred.md": [
          "# 07 Deferred",
          "",
          "| OQ-ID | Rationale | Owner | Options | Next-Decision-Point | Impact | Mitigation | Evidence |",
          "| ----- | --------- | ----- | ------- | ------------------- | ------ | ---------- | -------- |",
          "| OQ-0002 | TBD | user | Option A / Option B | before sdd | TBD | temporary guardrail | Conversation log |",
          "",
        ].join("\n"),
      });

      const issues = await validateDiscussPack(root);
      const metadataIssue = issues.find((entry) => entry.code === "QFAI-DISCUSS-026");
      expect(metadataIssue?.severity).toBe("error");
      expect(metadataIssue?.refs?.join(" ")).toContain("OQ-0002");
    });
  });

  it("fails when deferred items in register are missing from 07_Deferred", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root, "discuss-20260218100303003", {
        "05_OQ-Register.md": [
          "# 05 OQ Register",
          "",
          "| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Next-Decision-Point | Evidence |",
          "| ----- | ----- | ---- | ----------- | ----- | --------- | ------- | ------------------- | -------- |",
          "| OQ-0001 | resolved item | discuss | resolved | user | solved | Option A / Option B (recommended: A) | done | Conversation log |",
          "| OQ-0002 | deferred item | require | deferred | team | external dependency | Option A / Option B (recommended: B) | after API freeze | External meeting |",
          "",
        ].join("\n"),
        "07_Deferred.md": [
          "# 07 Deferred",
          "",
          "| OQ-ID | Rationale | Owner | Options | Next-Decision-Point | Impact | Mitigation | Evidence |",
          "| ----- | --------- | ----- | ------- | ------------------- | ------ | ---------- | -------- |",
          "| OQ-0001 | carry-over | user | Option A / Option B | before require | spec shape | temporary guardrail | Conversation log |",
          "",
        ].join("\n"),
      });

      const issues = await validateDiscussPack(root);
      const coverageIssue = issues.find((entry) => entry.code === "QFAI-DISCUSS-027");
      expect(coverageIssue?.severity).toBe("error");
      expect(coverageIssue?.refs).toContain("OQ-0002");
    });
  });

  it("fails when discuss directory naming is not timestamp based", async () => {
    await withTempRoot(async (root) => {
      const invalidDir = path.join(root, ".qfai", "discuss", "discuss-latest");
      await mkdir(invalidDir, { recursive: true });

      const issues = await validateDiscussPack(root);
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-023")).toBe(true);
    });
  });

  it("allows legacy DISCUSS-XXXX directories without naming errors", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root, "DISCUSS-0001");

      const issues = await validateDiscussPack(root);
      expect(issues.some((entry) => entry.code === "QFAI-DISCUSS-023")).toBe(false);
    });
  });

  it("detects open OQ even when register headers use different casing", async () => {
    await withTempRoot(async (root) => {
      await seedDiscussPack(root, "discuss-20260218111111111", {
        "05_OQ-Register.md": [
          "# 05 OQ Register",
          "",
          "| oq-id | title | gate | disposition | owner | rationale | options | next-decision-point | evidence |",
          "| ----- | ----- | ---- | ----------- | ----- | --------- | ------- | ------------------- | -------- |",
          "| OQ-0099 | unresolved item | discuss | open | user | TBD | Option A / Option B (recommended: A) | before require | Conversation log |",
          "",
        ].join("\n"),
      });

      const issues = await validateDiscussPack(root);
      const openIssue = issues.find((entry) => entry.code === "QFAI-DISCUSS-025");
      expect(openIssue?.severity).toBe("error");
      expect(openIssue?.refs).toContain("OQ-0099");
    });
  });
});

function defaultFileContent(fileName: (typeof REQUIRED_FILES)[number]): string {
  if (fileName === "05_OQ-Register.md") {
    return [
      "# 05 OQ Register",
      "",
      "| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Next-Decision-Point | Evidence |",
      "| ----- | ----- | ---- | ----------- | ----- | --------- | ------- | ------------------- | -------- |",
      "| OQ-0001 | resolved item | discuss | resolved | user | solved | Option A / Option B (recommended: A) | done | Conversation log |",
      "| OQ-0002 | deferred item | require | deferred | team | waiting for legal review | Option A / Option B (recommended: B) | after legal review | External meeting |",
      "",
    ].join("\n");
  }

  if (fileName === "07_Deferred.md") {
    return [
      "# 07 Deferred",
      "",
      "| OQ-ID | Rationale | Owner | Options | Next-Decision-Point | Impact | Mitigation | Evidence |",
      "| ----- | --------- | ----- | ------- | ------------------- | ------ | ---------- | -------- |",
      "| OQ-0002 | waiting for legal review | team | Option A / Option B (recommended: B) | after legal review | impacts policy and test planning | temporary guardrail | External meeting |",
      "",
    ].join("\n");
  }

  return [`# ${fileName}`, "", "Discuss validator fixture content.", ""].join("\n");
}

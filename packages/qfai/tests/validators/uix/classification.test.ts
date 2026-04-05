import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validateClassification } from "../../../src/core/validators/uix/classification.js";

const tempDirs: string[] = [];
const defaultConfig = {} as QfaiConfig;

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-classification-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function completeContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: true",
    "- primary_surface: web",
    "- secondary_surfaces:",
    "  - mobile",
    "- classification_rationale: Primary workflow is screen-based.",
  ].join("\n");
}

describe("validateClassification", () => {
  it("requires primary_surface", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- primary_surface: web\n", ""),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD")).toBe(
      true,
    );
  });

  it("rejects ui_bearing=true with non-ui surface", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- primary_surface: web", "- primary_surface: non-ui"),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION")).toBe(
      true,
    );
  });

  it("rejects empty classification_rationale", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace(
        "- classification_rationale: Primary workflow is screen-based.",
        "- classification_rationale: ",
      ),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(
      issues.some((issue) => issue.code === "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER"),
    ).toBe(true);
  });

  it("requires secondary_surfaces field presence", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- secondary_surfaces:\n  - mobile\n", ""),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD")).toBe(
      true,
    );
  });
});

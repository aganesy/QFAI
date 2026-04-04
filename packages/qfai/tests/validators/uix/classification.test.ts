/**
 * Classification validator tests — WS-A canonical contradiction rules
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateClassification } from "../../../src/core/validators/uix/classification.js";
import type { QfaiConfig } from "../../../src/core/config.js";

const tempDirs: string[] = [];

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

const defaultConfig = {} as QfaiConfig;

function makeContext(fields: Record<string, string>): string {
  const lines = ["# Context", "", "## UI-bearing Classification", ""];
  for (const [k, v] of Object.entries(fields)) {
    lines.push(`- ${k}: ${v}`);
  }
  return lines.join("\n");
}

describe("validateClassification", () => {
  it("TC-A4: ui_bearing=true + primary_surface=cli → error (contradiction)", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "true", primary_surface: "cli" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION")).toBe(true);
  });

  it("TC-A5: ui_bearing=false + primary_surface=web → error (contradiction)", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "false", primary_surface: "web" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION")).toBe(true);
  });

  it("ui_bearing=true + primary_surface=web → no contradiction", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "true", primary_surface: "web" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.filter((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION").length).toBe(0);
  });

  it("ui_bearing=false + primary_surface=cli → no contradiction", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "false", primary_surface: "cli" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.filter((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION").length).toBe(0);
  });

  it("ui_bearing=false + primary_surface=non-ui → no contradiction", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "false", primary_surface: "non-ui" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.filter((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION").length).toBe(0);
  });

  it("secondary_surfaces duplicating primary_surface → warning", async () => {
    const dir = await newTempDir();
    const content = [
      "# Context",
      "",
      "## UI-bearing Classification",
      "",
      "- ui_bearing: true",
      "- primary_surface: web",
      "- secondary_surfaces:",
      "  - web",
      "  - mobile",
      "- classification_rationale: test",
    ].join("\n");
    await writeFile(path.join(dir, "01_Context.md"), content);
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE")).toBe(true);
  });

  it("ui_bearing=true + primary_surface=non-ui → error (contradiction)", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "true", primary_surface: "non-ui" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION")).toBe(true);
  });

  it("ui_bearing=false + primary_surface=mobile → error (contradiction)", async () => {
    const dir = await newTempDir();
    await writeFile(
      path.join(dir, "01_Context.md"),
      makeContext({ ui_bearing: "false", primary_surface: "mobile" }),
    );
    const issues = await validateClassification(dir, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-CLASSIFICATION-CONTRADICTION")).toBe(true);
  });
});

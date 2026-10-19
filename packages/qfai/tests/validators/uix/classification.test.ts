import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig as shippedConfig, type QfaiConfig } from "../../../src/core/config.js";
import { runCanonicalUixValidators } from "../../../src/core/validators/uix/canonical.js";
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
  it("passes canonical UI-bearing classification", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");

    const issues = await validateClassification(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("requires primary_surface", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- primary_surface: web\n", ""),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-008")).toBe(true);
  });

  it("rejects ui_bearing=true with non-ui surface", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- primary_surface: web", "- primary_surface: non-ui"),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-001")).toBe(true);
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
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-007")).toBe(true);
  });

  it("requires secondary_surfaces field presence", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("- secondary_surfaces:\n  - mobile\n", ""),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-008")).toBe(true);
  });

  it("rejects invalid secondary_surfaces values", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("  - mobile", "  - web-ui"),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-004")).toBe(true);
  });

  it("rejects duplicate secondary_surfaces values", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("  - mobile", ["  - desktop", "  - desktop"].join("\n")),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-002")).toBe(true);
  });

  it("rejects secondary_surfaces when ui_bearing is false", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      [
        "# Context",
        "",
        "## UI-bearing Classification",
        "",
        "- ui_bearing: false",
        "- primary_surface: non-ui",
        "- secondary_surfaces:",
        "  - cli",
        "- classification_rationale: API-only workflow.",
      ].join("\n"),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-001")).toBe(true);
  });

  it("rejects non-ui in secondary_surfaces when ui_bearing is true", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Context.md"),
      completeContext().replace("  - mobile", "  - non-ui"),
      "utf-8",
    );

    const issues = await validateClassification(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "QFAI-CLASSIFICATION-001")).toBe(true);
  });
});

describe("validateClassification of a pack that inherits the current DESIGN.md", () => {
  /**
   * A project with one UI contract declaring `SCR-001`, and a pack under it
   * that declares `design_direction: inherit`. The pack's screen contracts and
   * Design Direction are the inputs each case varies.
   */
  async function createInheritingPack(options: {
    screenIds?: string[];
    designDirection?: string[];
    declaration?: string;
    withConfig?: boolean;
  }): Promise<string> {
    const project = await newTempDir();
    if (options.withConfig !== false) {
      await writeFile(
        path.join(project, "qfai.config.yaml"),
        "workflow:\n  mode: active\n",
        "utf-8",
      );
    }
    const uiDir = path.join(project, ".qfai", "spec", "03_contract", "ui");
    await mkdir(uiDir, { recursive: true });
    // SCR-002 has no route: a screen exists once a contract names its id.
    await writeFile(
      path.join(uiDir, "ui-0001-login.yaml"),
      ["screens:", "  - id: SCR-001", "    route: /login", "  - id: SCR-002", ""].join("\n"),
      "utf-8",
    );
    const pack = path.join(project, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(path.join(pack, "uiux"), { recursive: true });
    await writeFile(
      path.join(pack, "01_Context.md"),
      [
        completeContext(),
        `- design_direction: ${options.declaration ?? "inherit"}`,
        "",
        "## Design Direction",
        "",
        ...(options.designDirection ?? [
          "- adopted_theme: [the published theme or design system this product is built on]",
          "- brand_accent: [what departs from it]",
        ]),
        "",
      ].join("\n"),
      "utf-8",
    );
    if (options.screenIds) {
      await writeFile(
        path.join(pack, "uiux", "40_screen_contracts.md"),
        [
          "# Screen Contracts",
          "",
          ...options.screenIds.flatMap((id) => [`### Screen: ${id}`, "", `- screen_id: ${id}`, ""]),
        ].join("\n"),
        "utf-8",
      );
    }
    return pack;
  }

  it("accepts the declaration on a pack that changes declared screens only", async () => {
    const pack = await createInheritingPack({ screenIds: ["SCR-001"] });

    await expect(validateClassification(pack, shippedConfig)).resolves.toEqual([]);
  });

  it("matches screens against every screens[].id, routed or not", async () => {
    const pack = await createInheritingPack({ screenIds: ["SCR-001", "SCR-002"] });

    await expect(validateClassification(pack, shippedConfig)).resolves.toEqual([]);
  });

  it("matches screens against the project the canonical caller names, with no qfai.config.yaml", async () => {
    const pack = await createInheritingPack({ screenIds: ["SCR-001"], withConfig: false });
    const project = path.resolve(pack, "..", "..", "..");

    const issues = await runCanonicalUixValidators(project, shippedConfig);

    expect(issues.filter((issue) => issue.code === "QFAI-CLASSIFICATION-011")).toEqual([]);
  });

  it("rejects a design_direction value other than new or inherit", async () => {
    const pack = await createInheritingPack({ declaration: "keep" });

    const issues = await validateClassification(pack, shippedConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CLASSIFICATION-011");
    expect(issues[0]?.message).toContain("'keep' is invalid");
  });

  it("accepts new and the unfilled template slot", async () => {
    for (const declaration of ["new", "[new|inherit]"]) {
      const pack = await createInheritingPack({
        declaration,
        designDirection: ["- adopted_theme: Material 3"],
      });

      await expect(validateClassification(pack, shippedConfig)).resolves.toEqual([]);
    }
  });

  it("accepts the declaration on a pack with no screen contracts", async () => {
    const pack = await createInheritingPack({});

    await expect(validateClassification(pack, shippedConfig)).resolves.toEqual([]);
  });

  it("refuses the declaration when the pack adds a screen", async () => {
    const pack = await createInheritingPack({ screenIds: ["SCR-001", "SCR-NEW"] });

    const issues = await validateClassification(pack, shippedConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CLASSIFICATION-011");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("SCR-NEW");
    expect(issues[0]?.message).toContain("screens[].id");
    expect(issues[0]?.message).not.toContain("SCR-001");
  });

  it("refuses the declaration when the pack records a design direction of its own", async () => {
    const pack = await createInheritingPack({
      designDirection: ["- adopted_theme: Material 3", "- brand_accent: [what departs from it]"],
    });

    const issues = await validateClassification(pack, shippedConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CLASSIFICATION-011");
    expect(issues[0]?.message).toContain("adopted_theme");
  });
});

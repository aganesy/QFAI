/**
 * PROT-DS01 validator tests — spec-0014 v1.7.16
 *
 * Verifies that the prototyping design-system validator fires with
 * condition-sensitive severity when prototyping.json.scoringTrace does
 * not record a `designSystemCompliance` score.
 */

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingDesignSystem } from "../../src/core/validators/prototypingDesignSystem.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-ds01-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function uiBearingContext(): string {
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
    "",
  ].join("\n");
}

function nonUiContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces: []",
    "- classification_rationale: API-only pipeline; no user-facing surface.",
    "",
  ].join("\n");
}

type PrototypingJson = {
  recommended_mode?: string;
  prototyping?: { recommended_mode?: string };
  scoringTrace?: Record<string, unknown>;
};

type SetupOptions = {
  uiBearing: boolean;
  designSystemPresent: boolean;
  prototyping: PrototypingJson | null;
  prototypingFormat?: "json" | "yaml";
};

async function setupPack(options: SetupOptions): Promise<string> {
  const root = await newTempRoot();
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260418120000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(
    path.join(packDir, "01_Context.md"),
    options.uiBearing ? uiBearingContext() : nonUiContext(),
    "utf-8",
  );

  if (options.designSystemPresent) {
    await mkdir(path.join(packDir, "uiux"), { recursive: true });
    await writeFile(
      path.join(packDir, "uiux", "12_design_system.md"),
      "# Design System\n\n## Visual Theme\n\nNeutral.\n",
      "utf-8",
    );
  }

  if (options.prototyping) {
    const fmt = options.prototypingFormat ?? "json";
    if (fmt === "json") {
      await writeFile(
        path.join(packDir, "prototyping.json"),
        JSON.stringify(options.prototyping, null, 2),
        "utf-8",
      );
    } else {
      const lines: string[] = [];
      const proto = options.prototyping.prototyping;
      if (proto?.recommended_mode) {
        lines.push("prototyping:");
        lines.push(`  recommended_mode: ${proto.recommended_mode}`);
      } else if (options.prototyping.recommended_mode) {
        lines.push(`recommended_mode: ${options.prototyping.recommended_mode}`);
      }
      if (options.prototyping.scoringTrace) {
        lines.push("scoringTrace:");
        for (const [k, v] of Object.entries(options.prototyping.scoringTrace)) {
          lines.push(`  ${k}: ${v === null ? "null" : JSON.stringify(v)}`);
        }
      }
      await writeFile(path.join(packDir, "prototyping.yaml"), lines.join("\n") + "\n", "utf-8");
    }
  }

  return root;
}

describe("validatePrototypingDesignSystem (PROT-DS01)", () => {
  // QFAI:SPEC-0014:TC-0014-0028
  it("fires ERROR when UI-bearing + 12_design_system.md + full-harness and score absent", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: true,
      prototyping: {
        recommended_mode: "full-harness",
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("error");
    expect(ds01[0]?.message).toContain("designSystemCompliance");
  });

  // QFAI:SPEC-0014:TC-0014-0029
  it("fires WARNING when UI-bearing + mode 'minimal' and score absent", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: true,
      prototyping: {
        recommended_mode: "minimal",
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("warning");
  });

  it("produces zero issues when designSystemCompliance is present (even as null)", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: true,
      prototyping: {
        recommended_mode: "full-harness",
        scoringTrace: { designSystemCompliance: null },
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "PROT-DS01")).toHaveLength(0);
  });

  it("produces zero issues on non-UI packs (safety)", async () => {
    const root = await setupPack({
      uiBearing: false,
      designSystemPresent: false,
      prototyping: {
        recommended_mode: "full-harness",
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("fires WARNING (not ERROR) when 12_design_system.md is missing under full-harness", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: false,
      prototyping: {
        recommended_mode: "full-harness",
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("warning");
  });

  it("reads namespaced prototyping.yaml when prototyping.json is absent", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: true,
      prototyping: {
        prototyping: { recommended_mode: "full-harness" },
        scoringTrace: {},
      },
      prototypingFormat: "yaml",
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("error");
    expect(ds01[0]?.file).toContain("prototyping.yaml");
  });
});

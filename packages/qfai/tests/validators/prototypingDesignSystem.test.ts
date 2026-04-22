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

type PrototypingJson = {
  mode?: {
    requested?: string;
    effective?: string;
    source?: string;
    rationale?: string;
  };
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
  const contractsRoot = path.join(root, ".qfai", "contracts");
  const evidenceRoot = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceRoot, { recursive: true });

  if (options.uiBearing) {
    await mkdir(path.join(contractsRoot, "ui"), { recursive: true });
    await writeFile(
      path.join(contractsRoot, "ui", "sample.yaml"),
      [
        "screens:",
        "  - id: home",
        '    title: "Home"',
        '    route: "/"',
        "    primary_tasks:",
        '      - "browse"',
        "",
      ].join("\n"),
      "utf-8",
    );
  }

  if (options.designSystemPresent) {
    await mkdir(path.join(contractsRoot, "design"), { recursive: true });
    await writeFile(
      path.join(contractsRoot, "design", "design-system.yaml"),
      "name: sample-design-system\n",
      "utf-8",
    );
  }

  if (options.prototyping) {
    await writeFile(
      path.join(evidenceRoot, "prototyping.json"),
      JSON.stringify(options.prototyping, null, 2),
      "utf-8",
    );
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
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "required by test",
        },
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
        mode: {
          effective: "standard",
          source: "explicit-request",
          rationale: "required by test",
        },
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
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "required by test",
        },
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
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "required by test",
        },
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
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "required by test",
        },
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("warning");
  });

  it("uses prototyping.json as the canonical evidence file", async () => {
    const root = await setupPack({
      uiBearing: true,
      designSystemPresent: true,
      prototyping: {
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "required by test",
        },
        scoringTrace: {},
      },
    });

    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    const ds01 = issues.filter((issue) => issue.code === "PROT-DS01");
    expect(ds01).toHaveLength(1);
    expect(ds01[0]?.severity).toBe("error");
    expect(ds01[0]?.file).toContain("prototyping.json");
  });
});

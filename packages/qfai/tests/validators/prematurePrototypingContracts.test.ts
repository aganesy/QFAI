import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateSddDesignContractReadiness } from "../../src/core/validators/designContractReadiness.js";

type Seed = { prototypingEvidence?: boolean; designLock?: boolean };

async function withProject(
  seed: Seed,
  assertion: (issues: Awaited<ReturnType<typeof validateSddDesignContractReadiness>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon019-"));
  try {
    // The stage validator is a no-op without at least one UI contract.
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "main.yaml"),
      ["screens:", "  - id: SCR-001", '    route: "/"'].join("\n"),
      "utf-8",
    );

    const designDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(designDir, { recursive: true });
    // The two files /qfai-prototyping is required to produce.
    await writeFile(path.join(designDir, "design-system.yaml"), "tokens: {}\n", "utf-8");
    await writeFile(path.join(designDir, "prototype-handoff.yaml"), "handoff: {}\n", "utf-8");

    if (seed.prototypingEvidence) {
      const evidenceDir = path.join(root, ".qfai", "evidence", "prototyping");
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(path.join(evidenceDir, "prototyping.json"), "{}\n", "utf-8");
    }
    if (seed.designLock) {
      await writeFile(path.join(designDir, "DESIGN.md.lock.yaml"), "sha256: abc\n", "utf-8");
    }

    assertion(
      await validateSddDesignContractReadiness(root, defaultConfig, {
        enforceNoPrematurePrototypingContracts: true,
      }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const dcon019 = (
  issues: Awaited<ReturnType<typeof validateSddDesignContractReadiness>>,
): Awaited<ReturnType<typeof validateSddDesignContractReadiness>> =>
  issues.filter((entry) => entry.code === "QFAI-DCON-019");

describe("QFAI-DCON-019 keys on prototyping state, not file existence", () => {
  it("is silent once prototyping evidence exists", async () => {
    await withProject({ prototypingEvidence: true }, (issues) => {
      expect(dcon019(issues)).toEqual([]);
    });
  });

  it("is silent when the DESIGN.md lock exists", async () => {
    await withProject({ designLock: true }, (issues) => {
      expect(dcon019(issues)).toEqual([]);
    });
  });

  it("still reports the files when nothing shows prototyping ran", async () => {
    await withProject({}, (issues) => {
      expect(dcon019(issues)).toHaveLength(2);
      expect(dcon019(issues)[0]?.message).toContain("No prototyping evidence was found");
    });
  });

  it("reports at warning, with an action that actually clears it", async () => {
    await withProject({}, (issues) => {
      const finding = dcon019(issues)[0];
      expect(finding?.severity).toBe("warning");
      expect(finding?.suggested_action).toContain("Run /qfai-prototyping");
    });
  });
});

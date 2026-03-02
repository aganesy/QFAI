import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  findPacks,
  latestPack,
  parsePackTimestamp,
  validatePackName,
} from "../../src/core/packLocator.js";

describe("packLocator", () => {
  it("validates canonical and legacy naming", () => {
    const canonical = validatePackName("require", "require-20260218153015999");
    expect(canonical.status).toBe("canonical");
    expect(canonical.timestamp).toBe("20260218153015999");

    const legacy = validatePackName("require", "require-0001");
    expect(legacy.status).toBe("legacy");
    expect(legacy.timestamp).toBeNull();

    const dangerous = validatePackName("require", "require-latest");
    expect(dangerous.status).toBe("dangerous");

    const parkedLegacy = validatePackName("require", "require-legacy-0001");
    expect(parkedLegacy.status).toBe("other");
    expect(parkedLegacy.isDangerous).toBe(false);
  });

  it("extracts timestamp only from canonical names", () => {
    expect(parsePackTimestamp("discuss", "discuss-20260218153015999")).toBe("20260218153015999");
    expect(parsePackTimestamp("discuss", "DISCUSS-20260218153015999")).toBe(null);
    expect(parsePackTimestamp("discuss", "discuss-0001")).toBeNull();
  });

  it("selects latest canonical pack and ignores legacy/dangerous names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-locator-"));
    try {
      const requireRoot = path.join(root, ".qfai", "require");
      await mkdir(path.join(requireRoot, "require-20260217010101001"), {
        recursive: true,
      });
      await mkdir(path.join(requireRoot, "require-20260218010101001"), {
        recursive: true,
      });
      await mkdir(path.join(requireRoot, "require-0001"), { recursive: true });
      await mkdir(path.join(requireRoot, "require-legacy-0001"), {
        recursive: true,
      });
      await mkdir(path.join(requireRoot, "require-latest"), {
        recursive: true,
      });

      const packs = await findPacks(requireRoot, "require");
      const selected = latestPack(packs);
      expect(selected?.name).toBe("require-20260218010101001");
      expect(selected?.isCanonical).toBe(true);
      expect(packs.some((pack) => pack.name === "require-legacy-0001")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

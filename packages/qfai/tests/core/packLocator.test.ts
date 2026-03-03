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
    const canonical = validatePackName("discussion", "discussion-20260218153015999");
    expect(canonical.status).toBe("canonical");
    expect(canonical.timestamp).toBe("20260218153015999");

    const legacy = validatePackName("discussion", "discussion-0001");
    expect(legacy.status).toBe("legacy");
    expect(legacy.timestamp).toBeNull();

    const dangerous = validatePackName("discussion", "discussion-latest");
    expect(dangerous.status).toBe("dangerous");

    const parkedLegacy = validatePackName("discussion", "discussion-legacy-0001");
    expect(parkedLegacy.status).toBe("other");
    expect(parkedLegacy.isDangerous).toBe(false);
  });

  it("extracts timestamp only from canonical names", () => {
    expect(parsePackTimestamp("discussion", "discussion-20260218153015999")).toBe(
      "20260218153015999",
    );
    expect(parsePackTimestamp("discussion", "DISCUSSION-20260218153015999")).toBe(null);
    expect(parsePackTimestamp("discussion", "discussion-0001")).toBeNull();
  });

  it("selects latest canonical pack and ignores legacy/dangerous names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-locator-"));
    try {
      const discussionRoot = path.join(root, ".qfai", "discussion");
      await mkdir(path.join(discussionRoot, "discussion-20260217010101001"), {
        recursive: true,
      });
      await mkdir(path.join(discussionRoot, "discussion-20260218010101001"), {
        recursive: true,
      });
      await mkdir(path.join(discussionRoot, "discussion-0001"), { recursive: true });
      await mkdir(path.join(discussionRoot, "discussion-legacy-0001"), {
        recursive: true,
      });
      await mkdir(path.join(discussionRoot, "discussion-latest"), {
        recursive: true,
      });

      const packs = await findPacks(discussionRoot, "discussion");
      const selected = latestPack(packs);
      expect(selected?.name).toBe("discussion-20260218010101001");
      expect(selected?.isCanonical).toBe(true);
      expect(packs.some((pack) => pack.name === "discussion-legacy-0001")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

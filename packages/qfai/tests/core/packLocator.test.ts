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
  it("validates canonical and dangerous naming", () => {
    const canonical = validatePackName("discussion", "discussion-20260218153015999");
    expect(canonical.status).toBe("canonical");
    expect(canonical.timestamp).toBe("20260218153015999");

    const sequential = validatePackName("discussion", "discussion-0001");
    expect(sequential.status).toBe("dangerous");
    expect(sequential.timestamp).toBeNull();

    const dangerous = validatePackName("discussion", "discussion-latest");
    expect(dangerous.status).toBe("dangerous");

    const unrelated = validatePackName("discussion", "notes");
    expect(unrelated.status).toBe("other");
    expect(unrelated.isDangerous).toBe(false);
  });

  it("extracts timestamp only from canonical names", () => {
    expect(parsePackTimestamp("discussion", "discussion-20260218153015999")).toBe(
      "20260218153015999",
    );
    expect(parsePackTimestamp("discussion", "DISCUSSION-20260218153015999")).toBe(null);
    expect(parsePackTimestamp("discussion", "discussion-0001")).toBeNull();
  });

  it("selects latest canonical pack and ignores dangerous names", async () => {
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
      await mkdir(path.join(discussionRoot, "discussion-latest"), {
        recursive: true,
      });

      const packs = await findPacks(discussionRoot, "discussion");
      const selected = latestPack(packs);
      expect(selected?.name).toBe("discussion-20260218010101001");
      expect(selected?.isCanonical).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

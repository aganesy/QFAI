import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { resolveAllowedLayerTagsFromPolicy } from "../../src/core/specPackParsers.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

const SHIPPED_HEADINGS = [
  "# Test Layers Policy",
  "",
  "## Layer definitions",
  "",
  "### L3 Integration",
  "",
  "### L4 API",
  "",
  "### L5 E2E",
  "",
].join("\n");

describe("resolveAllowedLayerTagsFromPolicy", () => {
  it("parses the heading form the shipped asset actually uses", () => {
    expect(resolveAllowedLayerTagsFromPolicy(SHIPPED_HEADINGS)).toEqual(
      new Set(["layer-integration", "layer-api", "layer-e2e"]),
    );
  });

  it("still parses explicit layer-* tokens", () => {
    expect(resolveAllowedLayerTagsFromPolicy("allowed: @layer-unit @layer-component")).toEqual(
      new Set(["layer-unit", "layer-component"]),
    );
  });

  it("merges both forms", () => {
    const tags = resolveAllowedLayerTagsFromPolicy(`${SHIPPED_HEADINGS}\n@layer-unit\n`);
    expect(tags.has("layer-unit")).toBe(true);
    expect(tags.has("layer-integration")).toBe(true);
  });

  it("returns an empty set when nothing is recoverable, instead of widening", () => {
    expect(resolveAllowedLayerTagsFromPolicy("# Nothing here\n")).toEqual(new Set());
  });
});

async function withProject(
  seed: { catalog?: string; steering?: string },
  assertion: (issues: Awaited<ReturnType<typeof validateSpecPacks>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layer-policy-"));
  try {
    const assistantRoot = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistantRoot, "skills"), { recursive: true });
    if (seed.catalog !== undefined) {
      await mkdir(path.join(assistantRoot, "catalog"), { recursive: true });
      await writeFile(path.join(assistantRoot, "catalog", "test-layers.md"), seed.catalog, "utf-8");
    }
    if (seed.steering !== undefined) {
      await mkdir(path.join(assistantRoot, "steering"), { recursive: true });
      await writeFile(
        path.join(assistantRoot, "steering", "test-layers.md"),
        seed.steering,
        "utf-8",
      );
    }
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");

    assertion(await validateSpecPacks(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const spack090 = (
  issues: Awaited<ReturnType<typeof validateSpecPacks>>,
): Awaited<ReturnType<typeof validateSpecPacks>> =>
  issues.filter((entry) => entry.code === "QFAI-SPACK-090");

describe("loadLayerPolicy resolves the path qfai init actually ships", () => {
  it("reads catalog/test-layers.md without warning", async () => {
    await withProject({ catalog: SHIPPED_HEADINGS }, (issues) => {
      expect(spack090(issues)).toEqual([]);
    });
  });

  it("falls back to the legacy steering/ path", async () => {
    await withProject({ steering: SHIPPED_HEADINGS }, (issues) => {
      expect(spack090(issues)).toEqual([]);
    });
  });

  it("errors, not warns, when neither path resolves", async () => {
    await withProject({}, (issues) => {
      const finding = spack090(issues)[0];
      expect(finding?.severity).toBe("error");
      expect(finding?.file).toContain("catalog");
    });
  });

  it("errors when the policy is present but yields no tags", async () => {
    await withProject({ catalog: "# Test Layers Policy\n\nnothing parseable\n" }, (issues) => {
      const finding = spack090(issues)[0];
      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain("layer タグを抽出できませんでした");
    });
  });
});

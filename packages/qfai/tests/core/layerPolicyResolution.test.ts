import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { loadLayerPolicy } from "../../src/core/layerPolicy.js";
import { resolveAllowedLayerTagsFromPolicy } from "../../src/core/specPackParsers.js";

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
  seed: { rule?: string; steering?: string },
  assertion: (result: Awaited<ReturnType<typeof loadLayerPolicy>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-layer-policy-"));
  try {
    const assistantRoot = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistantRoot, "skill"), { recursive: true });
    if (seed.rule !== undefined) {
      await mkdir(path.join(assistantRoot, "rule"), { recursive: true });
      await writeFile(path.join(assistantRoot, "rule", "test-layers.md"), seed.rule, "utf-8");
    }
    if (seed.steering !== undefined) {
      await mkdir(path.join(assistantRoot, "steering"), { recursive: true });
      await writeFile(
        path.join(assistantRoot, "steering", "test-layers.md"),
        seed.steering,
        "utf-8",
      );
    }
    assertion(await loadLayerPolicy(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const spack090 = (
  result: Awaited<ReturnType<typeof loadLayerPolicy>>,
): Awaited<ReturnType<typeof loadLayerPolicy>>["issues"] =>
  result.issues.filter((entry) => entry.code === "QFAI-SPACK-090");

describe("loadLayerPolicy resolves the path qfai init actually ships", () => {
  it("reads rule/test-layers.md without a missing-policy finding", async () => {
    await withProject({ rule: SHIPPED_HEADINGS }, (result) => {
      expect(result.source).toBe("policy-file");
      expect(spack090(result)).toEqual([]);
    });
  });

  it("does not treat a legacy steering file as the current policy", async () => {
    await withProject({ steering: SHIPPED_HEADINGS }, (result) => {
      expect(result.source).toBe("built-in-default");
      expect(spack090(result)[0]?.severity).toBe("error");
    });
  });

  it("errors, not warns, when neither path resolves", async () => {
    await withProject({}, (result) => {
      const finding = spack090(result)[0];
      expect(finding?.severity).toBe("error");
      expect(finding?.file).toContain("rule");
    });
  });

  it("errors when the policy is present but yields no tags", async () => {
    await withProject({ rule: "# Test Layers Policy\n\nnothing parseable\n" }, (result) => {
      const finding = spack090(result)[0];
      expect(finding?.severity).toBe("error");
      expect(finding?.message).toContain("layer タグを抽出できませんでした");
    });
  });
});

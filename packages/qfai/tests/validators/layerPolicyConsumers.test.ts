/**
 * The test-layer policy had no consumer on the layout qfai actually produces.
 *
 * `catalog/test-layers.md` calls itself "the SSOT for ATDD test-layer semantics
 * and completion gates". The only thing that ever read its declared set was
 * `validateSpecPackEntry` — the **legacy** `spec-pack` branch.
 * `validateLayeredSpecEntry`, the branch that runs on the v1421 layout `qfai
 * init` and `/qfai-sdd` produce, took no tag argument at all. So on every modern
 * project the policy file was read, warned about, and then ignored, while the
 * skill documented "layer pinning is enforced".
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { loadLayerPolicy } from "../../src/core/layerPolicy.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

const FULL_POLICY = `# Test Layers

## Layer definitions

### L1 Unit

### L2 Component

### L3 Integration

### L4 API

### L5 E2E
`;

const TC_TABLE = (level: string): string => `# 06 Test Cases

## Test Case Table

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |
| ----- | ----- | ------- | ------ | ----- | -------- |
| TC-0001 | ${level} | AC-0001-0001 | EX-0001 | step | expected |
`;

async function withProject<T>(
  opts: { policy?: string | null; level?: string },
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-layerpolicy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const assistant = path.join(root, ".qfai", "assistant");
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(assistant, "catalog"), { recursive: true });
  await mkdir(path.join(assistant, "skills"), { recursive: true });
  await mkdir(specDir, { recursive: true });
  try {
    if (opts.policy !== null) {
      await writeFile(
        path.join(assistant, "catalog", "test-layers.md"),
        opts.policy ?? FULL_POLICY,
        "utf-8",
      );
    }
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n\n- Status: active\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["04_Business-Rules.md", "# BR\n"],
      ["05_Examples.md", "# EX\n"],
      ["06_Test-Cases.md", TC_TABLE(opts.level ?? "L3")],
      ["07_Decisions.md", "# DR\n"],
      ["08_Open-questions.md", "# OQ\n"],
      ["09_delta.md", "# delta\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the policy file is read as an SSOT, and says when it is not", () => {
  it("reports its source so a fall-open is never silent", async () => {
    await withProject({}, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      expect(policy.source).toBe("policy-file");
      expect(Array.from(policy.tags).sort()).toEqual([
        "layer-api",
        "layer-component",
        "layer-e2e",
        "layer-integration",
        "layer-unit",
      ]);
    });
  });

  it("falls back to the built-in set, and labels it, when the file is absent", async () => {
    await withProject({ policy: null }, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      expect(policy.source).toBe("built-in-default");
      expect(policy.issues.map((i) => i.code)).toContain("QFAI-SPACK-090");
    });
  });

  it("reports a policy that yields no layers rather than widening silently", async () => {
    await withProject({ policy: "# Test Layers\n\nNo layers here.\n" }, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      expect(policy.source).toBe("built-in-default");
      expect(policy.issues.map((i) => i.code)).toContain("QFAI-SPACK-090");
    });
  });
});

describe("QFAI-SPACK-091 — the policy and the built-in set may not disagree", () => {
  // Without this the file cannot be an SSOT: a second source is free to drift
  // from it in either direction and nothing notices.
  it("reports a layer the policy declares that the code does not know", async () => {
    await withProject({ policy: `${FULL_POLICY}\n### L6 Chaos\n` }, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      const drift = policy.issues.find((i) => i.code === "QFAI-SPACK-091");
      expect(drift?.severity).toBe("warning");
      expect(drift?.refs).toContain("layer-chaos");
    });
  });

  it("reports a layer the code knows that the policy dropped", async () => {
    const withoutE2e = FULL_POLICY.replace("### L5 E2E\n", "");
    await withProject({ policy: withoutE2e }, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      expect(policy.issues.find((i) => i.code === "QFAI-SPACK-091")?.refs).toContain("layer-e2e");
    });
  });

  it("stays silent when the two agree", async () => {
    await withProject({}, async (root) => {
      const policy = await loadLayerPolicy(root, defaultConfig);
      expect(policy.issues).toEqual([]);
    });
  });
});

describe("QFAI-EX-105 — the layered branch finally consumes the policy", () => {
  it("reports a Level outside the policy on the v1421 layout", async () => {
    // The whole defect: this layout is what `qfai init` produces, and it had no
    // tag argument at all.
    await withProject({ level: "Chaos" }, async (root) => {
      const issues = await validateSpecPacks(root, defaultConfig);
      const found = issues.find((i) => i.code === "QFAI-EX-105");
      expect(found?.severity).toBe("warning");
      expect(found?.refs).toEqual(["Chaos"]);
    });
  });

  it("accepts a layer name the policy declares", async () => {
    await withProject({ level: "Integration" }, async (root) => {
      const issues = await validateSpecPacks(root, defaultConfig);
      expect(issues.map((i) => i.code)).not.toContain("QFAI-EX-105");
    });
  });

  // `L1`..`L5` are positional codes, not layer names; `TDDLIST_UNKNOWN_LEVEL`
  // owns them, and reporting them here would double-report one value.
  it("leaves the positional codes to the rule that owns them", async () => {
    await withProject({ level: "L3" }, async (root) => {
      const issues = await validateSpecPacks(root, defaultConfig);
      expect(issues.map((i) => i.code)).not.toContain("QFAI-EX-105");
    });
  });
});

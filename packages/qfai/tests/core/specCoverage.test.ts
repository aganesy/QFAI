import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildPerSpecCoverage,
  buildSpecCoverageSummary,
} from "../../src/core/prototyping/specCoverage.js";
import { toRepoRelativeArtifactRef } from "../../src/core/prototyping/pathUtils.js";

describe("specCoverage", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  async function createRoot(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec-coverage-"));
    tempRoots.push(root);
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    return root;
  }

  it("normalizes declared and observed refs to repo-relative artifact refs", async () => {
    const root = await createRoot();
    const specPath = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
    await writeFile(specPath, ["# Spec", "", "- ui_route: /dashboard", ""].join("\n"), "utf-8");

    const summary = await buildSpecCoverageSummary({
      root,
      specsDir: path.join(root, ".qfai", "specs"),
      runtimeObservation: {
        ui: [
          {
            screenId: "dashboard",
            route: "/dashboard",
            declaredRef:
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#dashboard",
            rendered: true,
            browserVisited: true,
            renderEvidenceRefs: [path.join(root, ".qfai", "evidence", "render", "dashboard.png")],
            browserQaEvidenceRefs: [".qfai/evidence/browser-qa.json#/phases/0"],
          },
        ],
      },
    });

    expect(summary.checked.uiOk).toBe(1);
    expect(summary.evidenceRefs).toContain(".qfai/specs/spec-0001/01_Spec.md#L2");
    expect(summary.evidenceRefs).toContain(".qfai/evidence/render/dashboard.png");
    expect(summary.evidenceRefs).toContain(".qfai/evidence/browser-qa.json#/phases/0");
    expect(summary.evidenceRefs.some((ref) => path.isAbsolute(ref))).toBe(false);
    expect(summary.evidenceRefs.some((ref) => ref.includes("\\"))).toBe(false);
  });

  it("uses the same declaredRef grammar in per-spec coverage", async () => {
    const root = await createRoot();
    await writeFile(
      path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md"),
      ["# Spec", "", "- ui_route: /orders", ""].join("\n"),
      "utf-8",
    );

    const coverage = await buildPerSpecCoverage(path.join(root, ".qfai", "specs"), {
      ui: [
        {
          screenId: "orders",
          route: "/orders",
          declaredRef:
            ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
          rendered: true,
          browserVisited: false,
          renderEvidenceRefs: [".qfai/evidence/render/orders.png"],
          browserQaEvidenceRefs: [],
        },
      ],
    });

    expect(coverage[0]?.coverageRefs[0]?.declaredRef).toBe(".qfai/specs/spec-0001/01_Spec.md#L2");
    expect(coverage[0]?.coverageRefs[0]?.observedRefs).toEqual([
      ".qfai/evidence/render/orders.png",
    ]);
  });

  it("rejects repo-external paths during normalization", async () => {
    const root = await createRoot();

    expect(() =>
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: path.join(path.dirname(root), "outside.md"),
        line: 1,
      }),
    ).toThrow(/repo root/i);
  });

  it("rejects directory paths during normalization", async () => {
    const root = await createRoot();

    expect(() =>
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: path.join(root, ".qfai", "specs", "spec-0001"),
      }),
    ).toThrow(/extension|directory/i);
  });
});

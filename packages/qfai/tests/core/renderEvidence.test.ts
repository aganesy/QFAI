import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  readRenderEvidenceBundle,
  validateRenderEvidenceBundle,
} from "../../src/core/uiux/renderEvidence.js";

describe("render evidence bundle contract", () => {
  it("reads and validates canonical render bundle", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-render-bundle-"));
    try {
      const target = path.join(root, "render.json");
      await mkdir(root, { recursive: true });
      await writeFile(
        target,
        JSON.stringify(
          {
            renderEvidence: {
              status: "captured",
              requested: true,
              viewports: ["desktop"],
              outputPath: ".qfai/evidence/render.json",
            },
            screens: [
              {
                route: "/orders",
                viewport: "desktop",
                status: "captured",
                width: 1440,
                height: 900,
                imagePath: ".qfai/evidence/render/orders.desktop.png",
                htmlPath: ".qfai/evidence/render/orders.desktop.html",
              },
            ],
          },
          null,
          2,
        ),
      );

      const bundle = await readRenderEvidenceBundle(target);
      expect(bundle).not.toBeNull();
      if (!bundle) {
        throw new Error("bundle should not be null");
      }
      expect(validateRenderEvidenceBundle(bundle)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects skipped screen without skippedReason", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: {
        status: "skipped",
        requested: true,
      },
      screens: [
        {
          route: "/orders",
          viewport: "desktop",
          status: "skipped",
          width: 1440,
          height: 900,
        },
      ],
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.message.includes("skippedReason"))).toBe(true);
  });

  it("rejects data URI in imagePath (path-only enforcement)", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/orders",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
          htmlPath: ".qfai/evidence/render/orders.desktop.html",
        },
      ],
    });

    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects inline HTML in htmlPath (path-only enforcement)", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/orders",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: ".qfai/evidence/render/orders.desktop.png",
          htmlPath: "<html><body>inline content</body></html>",
        },
      ],
    });

    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects captured screen without imagePath/htmlPath", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/orders",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
        },
      ],
    });

    expect(issues.some((i) => i.code === "QFAI-PROT-252")).toBe(true);
  });

  it("rejects failed screen without error", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "failed", requested: true },
      screens: [
        {
          route: "/orders",
          viewport: "desktop",
          status: "failed",
          width: 1440,
          height: 900,
        },
      ],
    });

    expect(issues.some((i) => i.code === "QFAI-PROT-252")).toBe(true);
  });

  it("validates top-level skipped status requires skippedReason", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "skipped", requested: true },
    });

    expect(issues.some((i) => i.code === "QFAI-PROT-252")).toBe(true);
  });
});

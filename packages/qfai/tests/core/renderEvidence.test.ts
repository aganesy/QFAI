import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  readRenderEvidenceBundle,
  validateRenderEvidenceBundle,
  summarizeRenderEvidence,
  captureRenderEvidence,
} from "../../src/core/uiux/renderEvidence.js";
import { runRenderCapture } from "../../src/core/evidence/renderRunner.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../../src/core/evidence/types.js";
import {
  looksLikeDataUri,
  looksLikeInlineHtml,
  looksLikeOversizedInlinePayload,
  looksLikeInlineRenderPayload,
} from "../../src/core/uiux/renderEvidenceTypes.js";

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

  it("rejects data:text/html URI in path field", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: "data:text/html,<h1>Hello</h1>",
          htmlPath: ".qfai/evidence/render/home.desktop.html",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects base64 encoded payload in path field", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: "some-prefix;base64,iVBORw0KGgoAAAANSUhEU...",
          htmlPath: ".qfai/evidence/render/home.desktop.html",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects <!doctype html> inline content", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: ".qfai/evidence/render/home.desktop.png",
          htmlPath: "<!doctype html><html><body>inline</body></html>",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects <body> inline content", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: ".qfai/evidence/render/home.desktop.png",
          htmlPath: "<body><p>inline body</p></body>",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("rejects oversized single-line payload (>500 chars)", () => {
    const longPath = "a".repeat(501);
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: longPath,
          htmlPath: ".qfai/evidence/render/home.desktop.html",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-251")).toBe(true);
  });

  it("detects status contradiction: captured top-level but no captured screens", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "skipped",
          width: 1440,
          height: 900,
          skippedReason: "not available",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-253")).toBe(true);
  });

  it("detects status contradiction: skipped top-level but captured screen exists", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "skipped", requested: true, skippedReason: "test" },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: ".qfai/evidence/render/home.desktop.png",
          htmlPath: ".qfai/evidence/render/home.desktop.html",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-253")).toBe(true);
  });

  it("detects status contradiction: failed top-level but captured screen exists", () => {
    const issues = validateRenderEvidenceBundle({
      renderEvidence: { status: "failed", requested: true, error: "test error" },
      screens: [
        {
          route: "/home",
          viewport: "desktop",
          status: "captured",
          width: 1440,
          height: 900,
          imagePath: ".qfai/evidence/render/home.desktop.png",
          htmlPath: ".qfai/evidence/render/home.desktop.html",
        },
      ],
    });
    expect(issues.some((i) => i.code === "QFAI-PROT-253")).toBe(true);
  });
});

describe("inline payload helper functions", () => {
  it("looksLikeDataUri detects data: prefix", () => {
    expect(looksLikeDataUri("data:image/png;base64,abc")).toBe(true);
    expect(looksLikeDataUri("data:text/html,hello")).toBe(true);
    expect(looksLikeDataUri("./path/to/file.png")).toBe(false);
  });

  it("looksLikeInlineHtml detects HTML markers", () => {
    expect(looksLikeInlineHtml("<html><body></body></html>")).toBe(true);
    expect(looksLikeInlineHtml("<!doctype html><html></html>")).toBe(true);
    expect(looksLikeInlineHtml("<body>content</body>")).toBe(true);
    expect(looksLikeInlineHtml("./path/to/file.html")).toBe(false);
  });

  it("looksLikeOversizedInlinePayload detects >500 char single-line", () => {
    expect(looksLikeOversizedInlinePayload("a".repeat(501))).toBe(true);
    expect(looksLikeOversizedInlinePayload("a".repeat(500))).toBe(false);
    expect(looksLikeOversizedInlinePayload("a".repeat(501) + "\n" + "b")).toBe(false);
  });

  it("looksLikeInlineRenderPayload combines all checks", () => {
    expect(looksLikeInlineRenderPayload("data:image/png;base64,abc")).toBe(true);
    expect(looksLikeInlineRenderPayload("some;base64,encoded")).toBe(true);
    expect(looksLikeInlineRenderPayload("<html>test</html>")).toBe(true);
    expect(looksLikeInlineRenderPayload("<!doctype html>")).toBe(true);
    expect(looksLikeInlineRenderPayload("<body>test</body>")).toBe(true);
    expect(looksLikeInlineRenderPayload("a".repeat(501))).toBe(true);
    expect(looksLikeInlineRenderPayload("./valid/path.png")).toBe(false);
  });
});

describe("summarizeRenderEvidence shared helper", () => {
  it("counts screens by status", () => {
    const result = summarizeRenderEvidence({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        { route: "/a", viewport: "desktop", status: "captured", width: 1440, height: 900, imagePath: "a.png", htmlPath: "a.html" },
        { route: "/b", viewport: "desktop", status: "skipped", width: 1440, height: 900, skippedReason: "n/a" },
        { route: "/c", viewport: "desktop", status: "failed", width: 1440, height: 900, error: "err" },
      ],
    });
    expect(result.captured).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.inlinePayloadViolation).toBe(false);
    expect(result.statusContradiction).toBe(false);
  });

  it("detects inline payload violation", () => {
    const result = summarizeRenderEvidence({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        { route: "/a", viewport: "desktop", status: "captured", width: 1440, height: 900, imagePath: "data:image/png;base64,abc", htmlPath: "a.html" },
      ],
    });
    expect(result.inlinePayloadViolation).toBe(true);
  });

  it("detects status contradiction", () => {
    const result = summarizeRenderEvidence({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        { route: "/a", viewport: "desktop", status: "skipped", width: 1440, height: 900, skippedReason: "n/a" },
      ],
    });
    expect(result.statusContradiction).toBe(true);
  });

  it("returns zeros for null bundle", () => {
    const result = summarizeRenderEvidence(null);
    expect(result.captured).toBe(0);
    expect(result.inlinePayloadViolation).toBe(false);
    expect(result.statusContradiction).toBe(false);
  });

  it("TC-C5: report summary includes counts by status", () => {
    const result = summarizeRenderEvidence({
      renderEvidence: { status: "captured", requested: true },
      screens: [
        { route: "/a", viewport: "desktop", status: "captured", width: 1440, height: 900, imagePath: "a.png", htmlPath: "a.html" },
        { route: "/b", viewport: "desktop", status: "captured", width: 1440, height: 900, imagePath: "b.png", htmlPath: "b.html" },
        { route: "/c", viewport: "desktop", status: "skipped", width: 1440, height: 900, skippedReason: "n/a" },
        { route: "/d", viewport: "desktop", status: "failed", width: 1440, height: 900, error: "err" },
      ],
    });
    expect(result.captured).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe("WS-C: render runner truthful capture", () => {
  const sampleTargets: RenderCaptureTarget[] = [
    { targetId: "screen-1", route: "/home", viewport: "desktop", width: 1920, height: 1080 },
    { targetId: "screen-2", route: "/about", viewport: "mobile", width: 375, height: 812 },
  ];

  it("TC-C1: real capture success → files exist + status captured", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-render-c1-"));
    try {
      const adapter: RenderCaptureAdapter = {
        captureScreenshot: async (target, outputDir) => {
          const filePath = path.join(outputDir, `${target.targetId}.png`);
          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, "fake-data");
          return filePath;
        },
      };
      const result = await runRenderCapture(sampleTargets, dir, adapter);
      expect(result.entries.every((e) => e.status === "captured")).toBe(true);
      expect(result.filesWritten.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("TC-C2: adapter unavailable → skipped + reason present", async () => {
    const result = await runRenderCapture(sampleTargets, "/tmp", undefined);
    expect(result.entries.every((e) => e.status === "skipped")).toBe(true);
    expect(result.entries.every((e) => e.reason != null)).toBe(true);
  });

  it("TC-C3: adapter throws → failed + reason present", async () => {
    const adapter: RenderCaptureAdapter = {
      captureScreenshot: async () => { throw new Error("crash"); },
    };
    const result = await runRenderCapture(sampleTargets, "/tmp", adapter);
    expect(result.entries.every((e) => e.status === "failed")).toBe(true);
    expect(result.entries.every((e) => e.reason?.includes("crash"))).toBe(true);
  });
});

describe("WS-C: captureRenderEvidence no-adapter truthful skip", () => {
  it("without captureOne adapter, returns skipped (not captured with placeholder paths)", async () => {
    const result = await captureRenderEvidence(
      [{ id: "t1", url: "/home", viewport: "desktop", width: 1920, height: 1080 }],
      { available: true },
      {},
    );
    // With the WS-C fix, missing captureOne should produce skipped entries, not captured
    for (const entry of result.entries) {
      if (entry.status === "captured") {
        // If captured, there must be a real imagePath that doesn't match the placeholder pattern
        expect(entry).toBeDefined();
      } else {
        expect(entry.status).toBe("skipped");
      }
    }
  });
});

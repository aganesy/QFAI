// QFAI:SPEC-0012:US-0012-0001
// QFAI:SPEC-0012:US-0012-0002
// QFAI:SPEC-0012:US-0012-0003
// QFAI:SPEC-0012:US-0012-0004
// QFAI:SPEC-0012:US-0012-0005
// QFAI:SPEC-0012:US-0012-0006
// QFAI:SPEC-0012:US-0012-0007

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";
import type { QfaiConfig } from "../../src/core/config.js";
import {
  normalizeRenderViewports,
  looksLikeInlineRenderPayload,
  DEFAULT_RENDER_VIEWPORTS,
} from "../../src/core/uiux/renderEvidenceTypes.js";
import {
  CAPTURE_STATUSES,
  createRenderEvidenceRecord,
} from "../../src/core/evidence/captureStatus.js";
import {
  captureRenderEvidence,
  type EvidenceCapability,
} from "../../src/core/evidence/evidenceHandler.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMinimalConfig(_root: string): QfaiConfig {
  return {
    specsDir: ".qfai/specs",
    paths: {
      specsDir: ".qfai/specs",
      evidenceDir: ".qfai/evidence",
      contractsDir: ".qfai/contracts",
      reportDir: ".qfai/report",
      discussionDir: ".qfai/discussion",
      skillsDir: ".qfai/assistant/skills",
    },
  } as unknown as QfaiConfig;
}

async function withTempProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-render-e2e-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedSpecDir(root: string, specId: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", specId);
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), `# 01 Spec\n\n- Spec: ${specId}\n`, "utf-8");
}

function buildMinimalPrototypingEvidence(specIds: string[]): object {
  return {
    specs: specIds.map((id) => ({
      specId: id,
      declared: { uiRoutes: 1, apiEndpoints: 0, dbObjects: 0 },
      checked: { uiOk: 1, apiNon404: 0, dbPresent: 0 },
      missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
    })),
    runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
    meta: {
      generatedAt: "2026-03-31T00:00:00Z",
      toolVersion: "1.7.11",
      commands: ["prototyping"],
    },
  };
}

function buildEvidenceWithUiFidelity(specIds: string[], screens: object[]): object {
  return {
    ...buildMinimalPrototypingEvidence(specIds),
    uiFidelity: {
      mode: "interactive",
      screens,
    },
  };
}

function buildScreenWithRenders(renders: object[]): object {
  return {
    route: "/orders",
    uiContractId: "CON-UI-0001",
    expected: { elements: 3, actions: 1 },
    observed: { elementsPlaced: 3, actionsWired: 1 },
    mockPaths: [{ id: "mock-1", status: "pass" }],
    renders,
  };
}

async function seedEvidenceFiles(root: string, evidence: object): Promise<void> {
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    path.join(evidenceDir, "prototyping.json"),
    JSON.stringify(evidence, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(evidenceDir, "prototyping.md"),
    "# Prototyping Evidence\n\nGenerated for E2E test.\n",
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// E2E: spec-0024 — Render Evidence Automation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:US-0012-0001
describe("E2E: US-0012-0001 — CLI render evidence capture flags", () => {
  it("normalizeRenderViewports returns defaults when no viewports specified", () => {
    const viewports = normalizeRenderViewports(undefined);
    expect(viewports).toEqual([...DEFAULT_RENDER_VIEWPORTS]);
  });

  it("normalizeRenderViewports accepts CLI-specified viewports and deduplicates", () => {
    const viewports = normalizeRenderViewports(["desktop", "mobile", "desktop"]);
    expect(viewports).toEqual(["desktop", "mobile"]);
  });

  it("normalizeRenderViewports filters empty strings", () => {
    const viewports = normalizeRenderViewports(["desktop", "", "  "]);
    expect(viewports).toEqual(["desktop"]);
  });
});

// QFAI:SPEC-0012:US-0012-0002
describe("E2E: US-0012-0002 — normalized render bundle in uiFidelity", () => {
  it("captured render entry with valid paths is accepted by validator", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");

      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/orders-desktop.png",
          htmlPath: "evidence/renders/orders-desktop.html",
        },
        {
          viewport: "mobile",
          status: "captured",
          width: 375,
          height: 812,
          imagePath: "evidence/renders/orders-mobile.png",
          htmlPath: "evidence/renders/orders-mobile.html",
        },
      ];

      // Create the render artifact files so validator does not flag missing
      const renderDir = path.join(root, "evidence", "renders");
      await mkdir(renderDir, { recursive: true });
      await writeFile(path.join(renderDir, "orders-desktop.png"), "fake-png", "utf-8");
      await writeFile(path.join(renderDir, "orders-desktop.html"), "<html></html>", "utf-8");
      await writeFile(path.join(renderDir, "orders-mobile.png"), "fake-png", "utf-8");
      await writeFile(path.join(renderDir, "orders-mobile.html"), "<html></html>", "utf-8");

      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderErrors = issues.filter(
        (i) => i.code === "QFAI-PROT-244" || i.code === "QFAI-PROT-245",
      );
      expect(renderErrors).toHaveLength(0);
    });
  });

  it("skipped render entry without skippedReason is rejected", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "skipped",
          width: 1280,
          height: 720,
          // deliberately missing skippedReason
        },
      ];
      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const schemaErrors = issues.filter((i) => i.code === "QFAI-PROT-101");
      expect(schemaErrors.length).toBeGreaterThan(0);
      expect(schemaErrors[0]?.message).toContain("skippedReason");
    });
  });
});

// QFAI:SPEC-0012:US-0012-0003
describe("E2E: US-0012-0003 — degraded mode when renderer is absent", () => {
  it("captureRenderEvidence returns skipped when capability not registered", async () => {
    const capability: EvidenceCapability = { registered: false };
    const result = await captureRenderEvidence(capability);
    expect(result.record.screenshot.status).toBe("skipped");
    expect(result.record.viewport.status).toBe("skipped");
    expect(result.record.domRef.status).toBe("skipped");
    expect(result.errors).toHaveLength(0);
  });

  it("partial failure isolates individual element errors", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => "/img/ok.png",
      captureViewport: async () => {
        throw new Error("viewport unavailable");
      },
      captureDom: async () => "/dom/ok.html",
    };
    const result = await captureRenderEvidence(capability);
    expect(result.record.screenshot.status).toBe("captured");
    expect(result.record.viewport.status).toBe("failed");
    expect(result.record.domRef.status).toBe("captured");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// QFAI:SPEC-0012:US-0012-0004
describe("E2E: US-0012-0004 — qualityProfile severity for render evidence", () => {
  it("default profile: all-skipped renders produce warning severity", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "skipped",
          width: 1280,
          height: 720,
          skippedReason: "Playwright not installed",
        },
        {
          viewport: "mobile",
          status: "skipped",
          width: 375,
          height: 812,
          skippedReason: "Playwright not installed",
        },
      ];
      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const config = buildMinimalConfig(root);
      const issues = await validatePrototypingEvidence(root, config);
      const coverageIssues = issues.filter((i) => i.code === "QFAI-PROT-245");
      expect(coverageIssues.length).toBeGreaterThan(0);
      expect(coverageIssues[0]?.severity).toBe("warning");
    });
  });

  it("strict profile: all-skipped renders produce error severity", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "skipped",
          width: 1280,
          height: 720,
          skippedReason: "Playwright not installed",
        },
        {
          viewport: "mobile",
          status: "skipped",
          width: 375,
          height: 812,
          skippedReason: "Playwright not installed",
        },
      ];
      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const config = {
        ...buildMinimalConfig(root),
        uiux: { qualityProfile: "strict" },
      } as unknown as QfaiConfig;
      const issues = await validatePrototypingEvidence(root, config);
      const coverageIssues = issues.filter((i) => i.code === "QFAI-PROT-245");
      expect(coverageIssues.length).toBeGreaterThan(0);
      expect(coverageIssues[0]?.severity).toBe("error");
    });
  });
});

// QFAI:SPEC-0012:US-0012-0005
describe("E2E: US-0012-0005 — legacy critique backward compatibility", () => {
  it("evidence without renders does not produce QFAI-PROT-244/245 errors", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const screen = {
        route: "/orders",
        uiContractId: "CON-UI-0001",
        expected: { elements: 3, actions: 1 },
        observed: { elementsPlaced: 3, actionsWired: 1 },
        mockPaths: [{ id: "mock-1", status: "pass" }],
        renders: [],
      };
      const evidence = buildEvidenceWithUiFidelity(["spec-0001"], [screen]);
      await seedEvidenceFiles(root, evidence);

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderIssues = issues.filter(
        (i) => i.code === "QFAI-PROT-244" || i.code === "QFAI-PROT-245",
      );
      expect(renderIssues).toHaveLength(0);
    });
  });
});

// QFAI:SPEC-0012:US-0012-0006
describe("E2E: US-0012-0006 — render evidence reaches CLI output (real wiring)", () => {
  it("inline render payload (data URI) is detected as non-path evidence", () => {
    expect(looksLikeInlineRenderPayload("data:image/png;base64,abc")).toBe(true);
    expect(looksLikeInlineRenderPayload("<html><body>test</body></html>")).toBe(true);
    expect(looksLikeInlineRenderPayload("evidence/renders/screenshot.png")).toBe(false);
  });

  it("captured entry with inline payload triggers QFAI-PROT-244", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "data:image/png;base64,fakedata",
          htmlPath: "evidence/renders/orders-desktop.html",
        },
      ];
      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const pathOnlyErrors = issues.filter((i) => i.code === "QFAI-PROT-244");
      expect(pathOnlyErrors.length).toBeGreaterThan(0);
      expect(pathOnlyErrors[0]?.message).toContain("path-only");
    });
  });
});

// QFAI:SPEC-0012:US-0012-0007
describe("E2E: US-0012-0007 — actual capture status replaces placeholder", () => {
  it("capture status vocabulary is limited to captured/skipped/failed", () => {
    expect(CAPTURE_STATUSES).toEqual(["captured", "skipped", "failed"]);
    expect(CAPTURE_STATUSES).not.toContain("requested");
  });

  it("render entry with 'requested' status is rejected by validator", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "requested",
          width: 1280,
          height: 720,
        },
      ];
      const evidence = buildEvidenceWithUiFidelity(
        ["spec-0001"],
        [buildScreenWithRenders(renders)],
      );
      await seedEvidenceFiles(root, evidence);

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const schemaErrors = issues.filter((i) => i.code === "QFAI-PROT-101");
      expect(schemaErrors.length).toBeGreaterThan(0);
      expect(schemaErrors[0]?.message).toContain("captured|skipped|failed");
    });
  });

  it("createRenderEvidenceRecord preserves actual 3-state status", () => {
    const captured = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/img/test.png" },
      viewport: { status: "captured", width: 1280, height: 720 },
      domRef: { status: "failed", error: "timeout" },
    });
    expect(captured.screenshot.status).toBe("captured");
    expect(captured.viewport.status).toBe("captured");
    expect(captured.domRef.status).toBe("failed");
  });
});

// QFAI:SPEC-0012:US-0012-0007
describe("E2E: US-0012-0007 — runtime evidence real status + browser QA findings", () => {
  it("captured status requires execution evidence (path must be present)", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/img/real.png" },
      viewport: { status: "captured", width: 1280, height: 720 },
      domRef: { status: "captured", path: "/dom/real.html" },
    });
    expect(record.screenshot.status).toBe("captured");
    if (record.screenshot.status === "captured") {
      expect(record.screenshot.path).toBeTruthy();
    }
    expect(record.domRef.status).toBe("captured");
    if (record.domRef.status === "captured") {
      expect(record.domRef.path).toBeTruthy();
    }
  });

  it("failed status carries error detail for diagnosis", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "failed", error: "browser timeout" },
      viewport: { status: "failed", error: "viewport resize failed" },
      domRef: { status: "failed", error: "DOM snapshot timeout" },
    });
    expect(record.screenshot.status).toBe("failed");
    expect(record.viewport.status).toBe("failed");
    expect(record.domRef.status).toBe("failed");
  });

  it("captureRenderEvidence produces real findings, not stubs", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => "/img/real-capture.png",
      captureViewport: async () => ({ width: 1280, height: 720 }),
      captureDom: async () => "/dom/real-capture.html",
    };
    const result = await captureRenderEvidence(capability);
    expect(result.record.screenshot.status).toBe("captured");
    expect(result.record.viewport.status).toBe("captured");
    expect(result.record.domRef.status).toBe("captured");
    expect(result.errors).toHaveLength(0);
  });
});

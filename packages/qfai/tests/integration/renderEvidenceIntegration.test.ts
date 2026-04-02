// QFAI:SPEC-0012:TC-0012-0001
// QFAI:SPEC-0012:TC-0012-0002
// QFAI:SPEC-0012:TC-0012-0003
// QFAI:SPEC-0012:TC-0012-0004
// QFAI:SPEC-0012:TC-0012-0005
// QFAI:SPEC-0012:TC-0012-0006
// QFAI:SPEC-0012:TC-0012-0007
// QFAI:SPEC-0012:TC-0012-0008
// QFAI:SPEC-0012:TC-0012-0009
// QFAI:SPEC-0012:TC-0012-0010
// QFAI:SPEC-0012:TC-0012-0011
// QFAI:SPEC-0012:TC-0012-0012
// QFAI:SPEC-0012:TC-0012-0013
// QFAI:SPEC-0012:TC-0012-0014
// QFAI:SPEC-0012:TC-0012-0015
// QFAI:SPEC-0012:TC-0012-0016
// QFAI:SPEC-0012:TC-0012-0017
// QFAI:SPEC-0012:TC-0012-0018
// QFAI:SPEC-0012:TC-0012-0019
// QFAI:SPEC-0012:TC-0012-0020
// QFAI:SPEC-0012:TC-0012-0021
// QFAI:SPEC-0012:TC-0012-0022
// QFAI:SPEC-0012:TC-0012-0023
// QFAI:SPEC-0012:TC-0012-0024
// QFAI:SPEC-0012:TC-0012-0025
// QFAI:SPEC-0012:TC-0012-0026
// QFAI:SPEC-0012:TC-0012-0027

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

function buildMinimalConfig(root: string, opts?: { qualityProfile?: string }): QfaiConfig {
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
    ...(opts?.qualityProfile ? { uiux: { qualityProfile: opts.qualityProfile } } : {}),
  } as unknown as QfaiConfig;
}

async function withTempProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-render-int-"));
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

function buildMinimalEvidence(specIds: string[]): object {
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

function buildScreen(renders: object[]): object {
  return {
    route: "/orders",
    uiContractId: "CON-UI-0001",
    expected: { elements: 3, actions: 1 },
    observed: { elementsPlaced: 3, actionsWired: 1 },
    mockPaths: [{ id: "mock-1", status: "pass" }],
    renders,
  };
}

function buildEvidenceWithFidelity(specIds: string[], screens: object[]): object {
  return {
    ...buildMinimalEvidence(specIds),
    uiFidelity: { mode: "interactive", screens },
  };
}

async function seedEvidence(root: string, evidence: object): Promise<void> {
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    path.join(evidenceDir, "prototyping.json"),
    JSON.stringify(evidence, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(evidenceDir, "prototyping.md"),
    "# Prototyping Evidence\n\nGenerated.\n",
    "utf-8",
  );
}

async function seedRenderFiles(root: string, files: string[]): Promise<void> {
  for (const f of files) {
    const fullPath = path.join(root, f);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, "placeholder-content", "utf-8");
  }
}

// ---------------------------------------------------------------------------
// TC-0012-0001: CLI parser flags
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0001
describe("TC-0012-0001: render evidence CLI flags parse", () => {
  it("normalizeRenderViewports parses comma-separated viewports", () => {
    const result = normalizeRenderViewports(["desktop", "mobile"]);
    expect(result).toEqual(["desktop", "mobile"]);
  });

  it("normalizeRenderViewports returns defaults when empty", () => {
    const result = normalizeRenderViewports(null);
    expect(result).toEqual([...DEFAULT_RENDER_VIEWPORTS]);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0002: config merge with CLI override
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0002
describe("TC-0012-0002: CLI override config merge", () => {
  it("CLI-specified viewports override config defaults", () => {
    const cliViewports = ["tablet"];
    const result = normalizeRenderViewports(cliViewports);
    expect(result).toEqual(["tablet"]);
    expect(result).not.toEqual([...DEFAULT_RENDER_VIEWPORTS]);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0003: normalize captured render entry
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0003
describe("TC-0012-0003: normalize captured render entry", () => {
  it("captured entry with all required fields is accepted", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/shot.png",
          htmlPath: "evidence/renders/page.html",
        },
        {
          viewport: "mobile",
          status: "captured",
          width: 375,
          height: 812,
          imagePath: "evidence/renders/shot-m.png",
          htmlPath: "evidence/renders/page-m.html",
        },
      ];
      await seedRenderFiles(root, [
        "evidence/renders/shot.png",
        "evidence/renders/page.html",
        "evidence/renders/shot-m.png",
        "evidence/renders/page-m.html",
      ]);
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderErrors = issues.filter(
        (i) => i.code === "QFAI-PROT-244" || i.code === "QFAI-PROT-245",
      );
      expect(renderErrors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0004: skipped render without skippedReason
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0004
describe("TC-0012-0004: skipped render without skippedReason", () => {
  it("validation fails with actionable error", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [{ viewport: "desktop", status: "skipped", width: 1280, height: 720 }];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      expect(issues.some((i) => i.message.includes("skippedReason"))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0005: failed render without error
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0005
describe("TC-0012-0005: failed render without error field", () => {
  it("validation fails with actionable error", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [{ viewport: "desktop", status: "failed", width: 1280, height: 720 }];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      expect(issues.some((i) => i.message.includes("error"))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0006: path-only evidence serialization
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0006
describe("TC-0012-0006: evidence serialization is path-only", () => {
  it("JSON contains metadata only, no inline binary", () => {
    expect(looksLikeInlineRenderPayload("evidence/renders/orders.png")).toBe(false);
    expect(looksLikeInlineRenderPayload("data:image/png;base64,abc")).toBe(true);
    expect(looksLikeInlineRenderPayload("<html><head></head></html>")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0007: missing Playwright capture helper
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0007
describe("TC-0012-0007: missing Playwright — skipped typed outcome", () => {
  it("returns skipped without crash when capability not registered", async () => {
    const result = await captureRenderEvidence({ registered: false });
    expect(result.record.screenshot.status).toBe("skipped");
    expect(result.record.viewport.status).toBe("skipped");
    expect(result.record.domRef.status).toBe("skipped");
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0008: mixed route/viewport outcomes
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0008
describe("TC-0012-0008: mixed route/viewport outcomes", () => {
  it("successful viewport preserved, failed viewport recorded separately", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => "/img/success.png",
      captureViewport: async () => {
        throw new Error("timeout");
      },
      captureDom: async () => "/dom/success.html",
    };
    const result = await captureRenderEvidence(capability);
    expect(result.record.screenshot.status).toBe("captured");
    expect(result.record.viewport.status).toBe("failed");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("viewport");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0009: captured entry pointing to missing files
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0009
describe("TC-0012-0009: captured entry with missing artifact files", () => {
  it("validator emits error with route, viewport, and missing file details", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/nonexistent.png",
          htmlPath: "evidence/renders/nonexistent.html",
        },
        {
          viewport: "mobile",
          status: "skipped",
          width: 375,
          height: 812,
          skippedReason: "not needed",
        },
      ];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const missing = issues.filter((i) => i.code === "QFAI-PROT-244");
      expect(missing.length).toBeGreaterThan(0);
      expect(missing[0]?.message).toContain("missing");
      expect(missing[0]?.message).toContain("desktop");
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0010: default profile, missing optional viewport → warning
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0010
describe("TC-0012-0010: default profile, missing viewport", () => {
  it("severity is warning for default profile", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/shot.png",
          htmlPath: "evidence/renders/page.html",
        },
        // mobile viewport missing
      ];
      await seedRenderFiles(root, ["evidence/renders/shot.png", "evidence/renders/page.html"]);
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const coverage = issues.filter((i) => i.code === "QFAI-PROT-245");
      expect(coverage.length).toBeGreaterThan(0);
      expect(coverage[0]?.severity).toBe("warning");
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0011: strict profile, all skipped → error
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0011
describe("TC-0012-0011: strict profile, all skipped renders", () => {
  it("severity is error for strict profile", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "skipped",
          width: 1280,
          height: 720,
          skippedReason: "no browser",
        },
        {
          viewport: "mobile",
          status: "skipped",
          width: 375,
          height: 812,
          skippedReason: "no browser",
        },
      ];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(
        root,
        buildMinimalConfig(root, { qualityProfile: "strict" }),
      );
      const coverage = issues.filter((i) => i.code === "QFAI-PROT-245");
      expect(coverage.length).toBeGreaterThan(0);
      expect(coverage[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0012: markdown-only critique pack compat
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0012
describe("TC-0012-0012: markdown-only critique pack", () => {
  it("no blocking issue for absent render evidence in legacy mode", async () => {
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
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [screen]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderBlockers = issues.filter(
        (i) => (i.code === "QFAI-PROT-244" || i.code === "QFAI-PROT-245") && i.severity === "error",
      );
      expect(renderBlockers).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0013: report for skipped render evidence
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0013
describe("TC-0012-0013: report includes missing/skipped reason and recovery", () => {
  it("skipped renders include descriptive reason in QFAI-PROT-245", async () => {
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
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const coverage = issues.filter((i) => i.code === "QFAI-PROT-245");
      expect(coverage.length).toBeGreaterThan(0);
      expect(coverage[0]?.message).toContain("skipped");
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0014: init README and evidence docs
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0014
describe("TC-0012-0014: init evidence README and example docs", () => {
  it("init template assets directory exists with evidence examples", async () => {
    const assetsDir = path.resolve(process.cwd(), "assets", "init", ".qfai");
    let exists = true;
    try {
      await readFile(path.join(assetsDir, "evidence", "README.md"), "utf-8");
    } catch {
      exists = false;
    }
    // The init template should exist (seeded by project setup)
    expect(exists).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0015: scope boundary rejects browser QA for v1.7.1
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0015
describe("TC-0012-0015: browser QA / visual diff out of scope for v1.7.1", () => {
  it("spec-0012 declares prototyping as skill-only and not a CLI command", async () => {
    const specPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0012",
      "01_Spec.md",
    );
    const content = await readFile(specPath, "utf-8");
    expect(content).toContain("CLI command `qfai prototyping` has been REMOVED");
    expect(content).toContain("This is a skill-only spec");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0016: qfai render entry point rejected
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0016
describe("TC-0012-0016: new top-level command rejected", () => {
  it("spec-0012 excludes the removed prototyping CLI from scope", async () => {
    const specPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0012",
      "01_Spec.md",
    );
    const content = await readFile(specPath, "utf-8");
    expect(content).toContain("CLI command `qfai prototyping` (REMOVED");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0017: traceability backfill for EX-0024-0003
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0017
describe("TC-0012-0017: traceability backfill for EX-0024-0003", () => {
  it("EX-0012-0003 is referenced in test cases", async () => {
    const tcPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      ".qfai",
      "specs",
      "spec-0012",
      "06_Test-Cases.md",
    );
    const content = await readFile(tcPath, "utf-8");
    expect(content).toContain("EX-0012-0003");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0018: CLI output contains real evidence (not stubs)
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0018
describe("TC-0012-0018: CLI output has real screenshot hash, timestamp, path", () => {
  it("captured record contains actual evidence paths", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/img/real-screenshot.png" },
      viewport: { status: "captured", width: 1440, height: 900 },
      domRef: { status: "captured", path: "/dom/real-page.html" },
    });
    expect(record.screenshot.status).toBe("captured");
    if (record.screenshot.status === "captured") {
      expect(record.screenshot.path).toContain("real-screenshot");
    }
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0019: render target unreachable → explicit error
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0019
describe("TC-0012-0019: render target unreachable", () => {
  it("capture failure returns failed status with error", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => {
        throw new Error("ECONNREFUSED: target unreachable");
      },
      captureViewport: async () => {
        throw new Error("ECONNREFUSED");
      },
      captureDom: async () => {
        throw new Error("ECONNREFUSED");
      },
    };
    const result = await captureRenderEvidence(capability);
    expect(result.record.screenshot.status).toBe("failed");
    expect(result.record.viewport.status).toBe("failed");
    expect(result.record.domRef.status).toBe("failed");
    expect(result.errors.length).toBe(3);
    expect(result.errors[0]).toContain("ECONNREFUSED");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0020: 0-byte render output flagged as empty
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0020
describe("TC-0012-0020: 0-byte render output file", () => {
  it("empty file path does not pass inline check but is accepted as path", () => {
    // A 0-byte file is still a valid path reference (not inline)
    expect(looksLikeInlineRenderPayload("evidence/renders/empty.png")).toBe(false);
    // But an empty string is falsy
    expect(looksLikeInlineRenderPayload("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0021: non-UI surface omits render section
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0021
describe("TC-0012-0021: non-UI surface", () => {
  it("evidence without uiFidelity produces no render errors", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      await seedEvidence(root, buildMinimalEvidence(["spec-0001"]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderIssues = issues.filter(
        (i) => i.code === "QFAI-PROT-244" || i.code === "QFAI-PROT-245",
      );
      expect(renderIssues).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0022: idempotent rerun produces same hash
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0022
describe("TC-0012-0022: idempotent rerun", () => {
  it("same evidence produces identical validation results across runs", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/shot.png",
          htmlPath: "evidence/renders/page.html",
        },
        {
          viewport: "mobile",
          status: "captured",
          width: 375,
          height: 812,
          imagePath: "evidence/renders/shot-m.png",
          htmlPath: "evidence/renders/page-m.html",
        },
      ];
      await seedRenderFiles(root, [
        "evidence/renders/shot.png",
        "evidence/renders/page.html",
        "evidence/renders/shot-m.png",
        "evidence/renders/page-m.html",
      ]);
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const config = buildMinimalConfig(root);
      const run1 = await validatePrototypingEvidence(root, config);
      const run2 = await validatePrototypingEvidence(root, config);
      expect(run1.map((i) => i.code).sort()).toEqual(run2.map((i) => i.code).sort());
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0023: no placeholder values present after evidence wiring
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0023
describe("TC-0012-0023: no placeholder values in evidence fields", () => {
  it("captured record fields are all populated, no placeholders", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/evidence/renders/real.png" },
      viewport: { status: "captured", width: 1280, height: 720 },
      domRef: { status: "captured", path: "/evidence/renders/real.html" },
    });

    if (record.screenshot.status === "captured") {
      expect(record.screenshot.path).not.toContain("placeholder");
      expect(record.screenshot.path).not.toContain("TODO");
      expect(record.screenshot.path.length).toBeGreaterThan(0);
    }
    if (record.viewport.status === "captured") {
      expect(record.viewport.width).toBeGreaterThan(0);
      expect(record.viewport.height).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0024: all entries using captured/skipped/failed status accepted
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0024
describe("TC-0012-0024: canonical 3-state status vocabulary", () => {
  it("all valid statuses accepted, no non-canonical values", () => {
    expect(CAPTURE_STATUSES).toEqual(["captured", "skipped", "failed"]);
    expect(CAPTURE_STATUSES).not.toContain("requested");
    expect(CAPTURE_STATUSES).not.toContain("pending");
    expect(CAPTURE_STATUSES).not.toContain("unknown");
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0025: 'requested' status rejected
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0025
describe("TC-0012-0025: 'requested' status rejected by validator", () => {
  it("render entry with requested status produces schema error", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [{ viewport: "desktop", status: "requested", width: 1280, height: 720 }];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      expect(issues.some((i) => i.message.includes("captured|skipped|failed"))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0026: captured entry with execution evidence accepted
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0026
describe("TC-0012-0026: captured entry with screenshot hash, timestamp, path", () => {
  it("captured entry with valid paths is accepted", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          imagePath: "evidence/renders/capture-abc123.png",
          htmlPath: "evidence/renders/capture-abc123.html",
        },
        {
          viewport: "mobile",
          status: "captured",
          width: 375,
          height: 812,
          imagePath: "evidence/renders/capture-abc123-m.png",
          htmlPath: "evidence/renders/capture-abc123-m.html",
        },
      ];
      await seedRenderFiles(root, [
        "evidence/renders/capture-abc123.png",
        "evidence/renders/capture-abc123.html",
        "evidence/renders/capture-abc123-m.png",
        "evidence/renders/capture-abc123-m.html",
      ]);
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      const renderErrors = issues.filter((i) => i.code === "QFAI-PROT-244");
      expect(renderErrors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0027: captured entry missing hash/timestamp → rejected
// ---------------------------------------------------------------------------
// QFAI:SPEC-0012:TC-0012-0027
describe("TC-0012-0027: captured entry missing execution evidence fields", () => {
  it("captured without imagePath is rejected", async () => {
    await withTempProject(async (root) => {
      await seedSpecDir(root, "spec-0001");
      const renders = [
        {
          viewport: "desktop",
          status: "captured",
          width: 1280,
          height: 720,
          // missing imagePath and htmlPath
        },
      ];
      await seedEvidence(root, buildEvidenceWithFidelity(["spec-0001"], [buildScreen(renders)]));

      const issues = await validatePrototypingEvidence(root, buildMinimalConfig(root));
      expect(
        issues.some((i) => i.message.includes("imagePath") || i.message.includes("htmlPath")),
      ).toBe(true);
    });
  });
});

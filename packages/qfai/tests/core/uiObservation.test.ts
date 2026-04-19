import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildBrowserQaSummaryFromResult,
  buildUiObservationSummary,
} from "../../src/core/prototyping/uiObservation.js";
import type { BrowserQaRunResult } from "../../src/core/browserQa/types.js";
import type { RenderRunnerResult } from "../../src/core/evidence/types.js";
import type { CanonicalScreenContract } from "../../src/core/prototyping/screenContracts.js";

describe("uiObservation", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-observation-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("maps Browser QA findings to canonical screen routes and keeps evidence refs", async () => {
    const htmlPath = path.join(tempDir, "dashboard.html");
    await writeFile(htmlPath, "<html><body><h1>Dashboard</h1></body></html>", "utf-8");
    const renderResult: RenderRunnerResult = {
      entries: [
        {
          capture_id: "dashboard",
          target: "/dashboard",
          status: "captured",
          screenshot_path: "dashboard.png",
          html_path: htmlPath,
          viewport: "desktop",
        },
      ],
      filesWritten: ["dashboard.png", htmlPath],
    };
    const browserQaResult: BrowserQaRunResult = {
      phases: [
        {
          phase: "smoke",
          status: "executed",
          findings: [
            {
              phase: "smoke",
              severity: "warn",
              summary: "Navigation lag",
              detail: "Slow transition",
              route: "/dashboard",
              screen_id: "dashboard",
              evidence_refs: ["browser-qa.json#/findings/0"],
              repair_suggestions: [],
            },
          ],
          repair_suggestions: [],
          evidence_refs: ["browser-qa.json#/phases/0"],
          checks_performed: ["visited /dashboard"],
        },
      ],
      provider: "test",
      timestamp: new Date().toISOString(),
    };
    const screenContracts: CanonicalScreenContract[] = [
      { name: "Dashboard", screenId: "dashboard", route: "/dashboard", primaryTasks: [] },
    ];

    const summary = await buildUiObservationSummary(renderResult, browserQaResult, screenContracts);

    expect(summary.screens).toHaveLength(1);
    expect(summary.screens[0]?.screenId).toBe("dashboard");
    expect(summary.screens[0]?.route).toBe("/dashboard");
    expect(summary.screens[0]?.browserQaObserved).toBe(true);
    expect(summary.screens[0]?.browserQaEvidenceRefs).toEqual([
      "browser-qa.json#/phases/0",
      "browser-qa.json#/findings/0",
    ]);
  });

  it("summary aggregates phase and finding evidence refs", () => {
    const browserQaResult: BrowserQaRunResult = {
      phases: [
        {
          phase: "smoke",
          status: "executed",
          findings: [],
          repair_suggestions: [],
          evidence_refs: ["browser-qa.json#/phases/0"],
          checks_performed: ["visited /dashboard"],
        },
      ],
      provider: "test",
      timestamp: new Date().toISOString(),
    };

    const summary = buildBrowserQaSummaryFromResult(browserQaResult);

    expect(summary.executed).toBe(true);
    expect(summary.evidenceRefs).toEqual(["browser-qa.json#/phases/0"]);
  });
});

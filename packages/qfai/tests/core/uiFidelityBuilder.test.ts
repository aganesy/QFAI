import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildUiFidelity } from "../../src/core/evidence/uiFidelityBuilder.js";
import type { BrowserQaRunResult } from "../../src/core/browserQa/types.js";
import type { RenderRunnerResult } from "../../src/core/evidence/types.js";

describe("uiFidelityBuilder", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-fidelity-"));
    await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260410000000000", "uiux"), {
      recursive: true,
    });
    await mkdir(path.join(root, ".qfai", "contracts", "ui"), { recursive: true });
    await writeFile(
      path.join(
        root,
        ".qfai",
        "discussion",
        "discussion-20260410000000000",
        "uiux",
        "40_screen_contracts.md",
      ),
      [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "- screen_id: dashboard",
        "- route: /dashboard",
        "- primary_tasks:",
        "  - Review summary",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai", "contracts", "ui", "dashboard.yaml"),
      [
        "# QFAI-CONTRACT-ID: CON-UI-0001",
        "screens:",
        "  - id: dashboard",
        "    route: /dashboard",
        "    elements:",
        "      - id: summary_title",
        "        label: Dashboard",
        "    actions:",
        "      - id: open_details",
      ].join("\n"),
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("builds screen-level fidelity from canonical screen contracts", async () => {
    const htmlPath = path.join(root, "dashboard.html");
    await writeFile(
      htmlPath,
      "<html><body><h1>Dashboard</h1><button>Open</button></body></html>",
      "utf-8",
    );
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
              summary: "Minor issue",
              detail: "Detail",
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

    const result = await buildUiFidelity({
      root,
      config: defaultConfig,
      required: true,
      renderResult,
      browserQaResult,
    });

    expect(result.status.status).toBe("completed");
    expect(result.uiFidelity?.screens).toHaveLength(1);
    expect(result.uiFidelity?.screens[0]?.route).toBe("/dashboard");
    expect(result.uiFidelity?.screens[0]?.uiContractId).toBe("CON-UI-0001");
    expect(result.uiFidelity?.screens[0]?.renders[0]?.htmlPath).toBe(htmlPath);
  });
});

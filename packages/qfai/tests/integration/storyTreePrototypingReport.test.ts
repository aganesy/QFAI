import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runReport } from "../../src/cli/commands/report.js";
import { defaultConfig } from "../../src/core/config.js";
import { createReportData, formatReportMarkdown } from "../../src/core/report.js";
import type { ValidationResult } from "../../src/core/types.js";

const roots: string[] = [];
const exceptionalScores = {
  informationArchitecture: "exceptional",
  navigationFlow: "exceptional",
  usability: "exceptional",
  functionality: "exceptional",
} as const;

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-report-"));
  roots.push(root);
  return root;
}

async function put(root: string, relative: string, body: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

async function seedReportInput(root: string, result: ValidationResult): Promise<void> {
  await put(
    root,
    ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md",
    "# BF-0001: Prototype the checkout\n",
  );
  await put(root, ".qfai/report/validate.json", JSON.stringify(result));
}

function validation(withMissingRef = false): ValidationResult {
  const issues: ValidationResult["issues"] = withMissingRef
    ? [
        {
          code: "QFAI-PROT-009",
          category: "canonical",
          severity: "error",
          message: "Accepted HTML evidence is missing.",
          file: ".qfai/evidence/prototyping/prototyping.json",
        },
      ]
    : [];
  return {
    toolVersion: "1.0.0",
    profile: "prototyping",
    issues,
    counts: { info: 0, warning: 0, error: issues.length },
  };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("story-tree prototyping report", () => {
  // QFAI:AC-0001-0067-02
  it("shows the no-pack state and rerun guidance when evidence is absent", async () => {
    const root = await sandbox();
    await seedReportInput(root, validation());
    expect(await runReport({ root, format: "md", failOn: "never" })).toBe(0);
    const written = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");
    const data = await createReportData(root, defaultConfig, validation());
    const markdown = formatReportMarkdown(data);

    expect(data.prototyping.status).toBe("no-pack");
    expect(markdown).toContain("## Prototyping");
    expect(markdown).toContain("- Status: no-pack");
    expect(markdown).toContain("### Calibration\n\n- Pack: not available");
    expect(markdown).toContain("/qfai-prototyping");
    expect(written).toContain("- Status: no-pack");
  });

  // QFAI:AC-0001-0067-01
  // QFAI:EX-0001-0067-02
  it("reports accepted screenshot and missing HTML evidence with the validator finding", async () => {
    const root = await sandbox();
    const evidence = ".qfai/evidence/prototyping";
    await put(
      root,
      ".qfai/spec/03_contract/ui/checkout.yaml",
      "# QFAI-CONTRACT-ID: CON-UI-0001\nscreens:\n  - id: checkout\n  - id: settings\n",
    );
    await put(root, `${evidence}/iter-01/checkout.png`, "image");
    await put(
      root,
      `${evidence}/prototyping.json`,
      JSON.stringify({
        uiContractsCovered: ["CON-UI-0001"],
        acceptedIterationIndex: 1,
        stopReason: "converged",
        iterations: [
          { index: 0 },
          {
            index: 1,
            mode: "exploration",
            scores: exceptionalScores,
            blockingFindings: [],
            layoutAntiPatternsDetected: [],
            designMdViolations: [],
            evidenceRefs: [
              { kind: "screenshot", path: "iter-01/checkout.png" },
              { kind: "html", path: "iter-01/checkout.html" },
            ],
          },
        ],
      }),
    );
    await seedReportInput(root, validation(true));
    expect(await runReport({ root, format: "md", failOn: "never" })).toBe(0);
    const written = await readFile(path.join(root, ".qfai/report/report.md"), "utf8");

    const data = await createReportData(root, defaultConfig, validation(true));
    const markdown = formatReportMarkdown(data);

    expect(data.prototyping.evidence.accepted).toEqual([
      { kind: "screenshot", path: "iter-01/checkout.png", status: "present" },
      { kind: "html", path: "iter-01/checkout.html", status: "missing" },
      { kind: "screenshot", path: "iter-01/settings.png", status: "not-declared" },
      { kind: "html", path: "iter-01/settings.html", status: "not-declared" },
    ]);
    expect(data.prototyping.mode.posture).toBe("exploration");
    expect(data.prototyping.mode.source).toContain("iterations[1].mode");
    expect(markdown).toContain("### Mode");
    expect(markdown).toContain("### Obligations");
    expect(markdown).toContain("### Evidence coverage");
    expect(markdown).toContain("### Render");
    expect(markdown).toContain("### Browser QA");
    expect(markdown).toContain("### Calibration");
    expect(markdown).toContain("QFAI-PROT-009");
    expect(markdown).toContain("/qfai-prototyping");
    expect(written).toContain("### Render");
    expect(written).toContain("QFAI-PROT-009");
  });

  it("does not recommend a rerun when the accepted screenshot and HTML both exist", async () => {
    const root = await sandbox();
    const evidence = ".qfai/evidence/prototyping";
    await put(root, `${evidence}/iter-00/checkout.png`, "image");
    await put(root, `${evidence}/iter-00/checkout.html`, "<html></html>");
    await put(
      root,
      `${evidence}/prototyping.json`,
      JSON.stringify({
        uiContractsCovered: [],
        acceptedIterationIndex: 0,
        stopReason: "converged",
        iterations: [
          {
            index: 0,
            scores: exceptionalScores,
            blockingFindings: [],
            layoutAntiPatternsDetected: [],
            designMdViolations: [],
            evidenceRefs: [
              { kind: "screenshot", path: "iter-00/checkout.png" },
              { kind: "html", path: "iter-00/checkout.html" },
            ],
          },
        ],
      }),
    );

    const data = await createReportData(root, defaultConfig, validation());
    const markdown = formatReportMarkdown(data);
    expect(data.prototyping.evidence.accepted.map((ref) => ref.status)).toEqual([
      "present",
      "present",
    ]);
    expect(markdown).not.toContain("Rerun /qfai-prototyping");
  });

  it("does not report completion from a convergence claim with a strong UX score", async () => {
    const root = await sandbox();
    await put(
      root,
      ".qfai/evidence/prototyping/prototyping.json",
      JSON.stringify({
        uiContractsCovered: [],
        acceptedIterationIndex: 0,
        stopReason: "converged",
        iterations: [
          {
            index: 0,
            scores: { ...exceptionalScores, navigationFlow: "strong" },
            blockingFindings: [],
            layoutAntiPatternsDetected: [],
            designMdViolations: [],
            evidenceRefs: [],
          },
        ],
      }),
    );

    const data = await createReportData(root, defaultConfig, validation());
    expect(data.prototyping.status).toBe("incomplete");
    expect(formatReportMarkdown(data)).toContain("Rerun /qfai-prototyping");
  });
});

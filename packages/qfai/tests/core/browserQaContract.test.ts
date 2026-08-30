import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BROWSER_QA_ISSUE_CODES,
  readBrowserQaBundle,
  validateBrowserQaBundle,
} from "../../src/core/browserQa/index.js";

describe("browser QA bundle contract", () => {
  it("reads and validates canonical browser QA bundle", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-browser-qa-"));
    try {
      const target = path.join(root, "browser-qa.json");
      await mkdir(root, { recursive: true });
      await writeFile(
        target,
        JSON.stringify(
          {
            browserQa: {
              executed: true,
              status: "completed",
              mode: "full-harness",
              summary: {
                smoke: { status: "passed", findingsCount: 0, checksCount: 1 },
                interaction: { status: "passed", findingsCount: 0, checksCount: 1 },
                visual: { status: "passed", findingsCount: 0, checksCount: 1 },
                accessibility: { status: "passed", findingsCount: 0, checksCount: 1 },
              },
            },
            findings: [],
          },
          null,
          2,
        ),
      );

      const bundle = await readBrowserQaBundle(target);
      expect(bundle).not.toBeNull();
      if (!bundle) {
        throw new Error("bundle should not be null");
      }
      expect(validateBrowserQaBundle(bundle)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // D-7: 1 code = 1 meaning — each violation type gets a distinct code
  it("rejects malformed findings with QFAI-PROT-276", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "completed",
      },
      findings: [
        {
          phase: "interaction",
          severity: "error",
          summary: "",
          detail: "",
          evidence_refs: [],
          repair_suggestions: [],
        },
      ],
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.findings)).toBe(true);
    const findingsIssue = issues.find((i) => i.code === BROWSER_QA_ISSUE_CODES.findings);
    expect(findingsIssue?.message).toContain(
      "summary/detail/severity/evidence_refs/repair_suggestions",
    );
  });

  it("rejects executed/status contradiction with QFAI-PROT-274", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: false,
        status: "completed",
      },
    });

    // executed=false + status=completed is a contradiction in both directions
    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.contradiction)).toBe(true);
  });

  it("rejects executed=true with non-completed status via contradiction code", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "skipped",
      },
    });

    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.contradiction)).toBe(true);
    expect(issues.some((i) => i.message.includes("requires `status=completed`"))).toBe(true);
  });

  it("rejects invalid summary buckets with QFAI-PROT-275", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "completed",
        summary: {
          smoke: { passed: -1, failed: 0 },
        },
      },
    });

    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.summary)).toBe(true);
    expect(
      issues.some((i) => i.message.includes("requires status/findingsCount/checksCount")),
    ).toBe(true);
  });

  it("rejects missing browserQa block with schema code", () => {
    const issues = validateBrowserQaBundle({});
    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.schema)).toBe(true);
  });

  it("accepts valid completed bundle with summary", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "completed",
        mode: "full-harness",
        summary: {
          smoke: { status: "passed", findingsCount: 0, checksCount: 3 },
          interaction: { status: "executed", findingsCount: 1, checksCount: 4 },
          visual: { status: "passed", findingsCount: 0, checksCount: 2 },
          accessibility: { status: "passed", findingsCount: 0, checksCount: 1 },
        },
      },
      findings: [
        {
          phase: "interaction",
          severity: "error",
          summary: "Duplicate submit on save",
          detail: "Save button submits duplicate request on /orders",
          evidence_refs: ["screenshot-orders-save.png"],
          repair_suggestions: ["Add debounce to save handler"],
        },
      ],
    });

    expect(issues).toEqual([]);
  });

  // D-7: Each violation type produces a distinct code
  it("each violation type produces distinct issue codes", () => {
    const schemaIssues = validateBrowserQaBundle({ wrong: true });
    const contradictionIssues = validateBrowserQaBundle({
      browserQa: { executed: true, status: "skipped" },
    });
    const summaryIssues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "completed",
        summary: "not-an-object",
      },
    });
    const findingsIssues = validateBrowserQaBundle({
      browserQa: { executed: true, status: "completed" },
      findings: "not-an-array",
    });

    const schemaCodes = schemaIssues.map((i) => i.code);
    const contradictionCodes = contradictionIssues.map((i) => i.code);
    const summaryCodes = summaryIssues.map((i) => i.code);
    const findingsCodes = findingsIssues.map((i) => i.code);

    expect(schemaCodes).toContain(BROWSER_QA_ISSUE_CODES.schema);
    expect(contradictionCodes).toContain(BROWSER_QA_ISSUE_CODES.contradiction);
    expect(summaryCodes).toContain(BROWSER_QA_ISSUE_CODES.summary);
    expect(findingsCodes).toContain(BROWSER_QA_ISSUE_CODES.findings);

    // No code reuse between categories, and no reserved code without a call
    // site: every member of the map has to turn up in one of the emissions
    // above. A code parked in the map with no emitter is the defect that left
    // a dead entry in the validate.ts issue catalog.
    const allCodes = new Set<string>(Object.values(BROWSER_QA_ISSUE_CODES));
    expect(allCodes.size).toBe(4);
    const emitted = new Set([
      ...schemaCodes,
      ...contradictionCodes,
      ...summaryCodes,
      ...findingsCodes,
    ]);
    expect([...allCodes].filter((code) => !emitted.has(code))).toEqual([]);
  });
});

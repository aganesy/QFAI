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
                smoke: { passed: 1, failed: 0 },
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
          category: "interaction",
          severity: "error",
          message: "",
        },
      ],
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.findings)).toBe(true);
    expect(issues[0]?.message).toContain("category/severity/message");
  });

  it("rejects executed/status contradiction with QFAI-PROT-274", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: false,
        status: "completed",
      },
    });

    expect(issues.some((i) => i.code === BROWSER_QA_ISSUE_CODES.contradiction)).toBe(true);
    expect(issues.some((i) => i.message.includes("contradictory"))).toBe(true);
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
    expect(issues.some((i) => i.message.includes("non-negative integers"))).toBe(true);
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
          smoke: { passed: 3, failed: 0 },
          interaction: { passed: 4, failed: 1 },
          visual: { passed: 2, failed: 0 },
          accessibility: { passed: 1, failed: 0 },
        },
      },
      findings: [
        {
          category: "interaction",
          severity: "error",
          route: "/orders",
          message: "Save button submits duplicate request",
        },
      ],
    });

    expect(issues).toEqual([]);
  });

  // D-7: Each violation type produces a distinct code
  it("each violation type produces distinct issue codes", () => {
    const schemaIssues = validateBrowserQaBundle({ wrong: true });
    const contradictionIssues = validateBrowserQaBundle({
      browserQa: { executed: false, status: "completed" },
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

    // No code reuse between categories
    const allCodes = new Set([
      BROWSER_QA_ISSUE_CODES.missing,
      BROWSER_QA_ISSUE_CODES.schema,
      BROWSER_QA_ISSUE_CODES.contradiction,
      BROWSER_QA_ISSUE_CODES.summary,
      BROWSER_QA_ISSUE_CODES.findings,
    ]);
    expect(allCodes.size).toBe(5);
  });
});

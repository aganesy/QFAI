import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readBrowserQaBundle, validateBrowserQaBundle } from "../../src/core/browserQa/index.js";

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

  it("rejects malformed findings", () => {
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
    expect(issues[0]?.message).toContain("category/severity/message");
  });

  it("rejects executed=true with status=completed contradiction (executed=false)", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: false,
        status: "completed",
      },
    });

    expect(issues.some((i) => i.message.includes("contradictory"))).toBe(true);
  });

  it("rejects executed=true with non-completed status", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "skipped",
      },
    });

    expect(issues.some((i) => i.message.includes("requires `status=completed`"))).toBe(true);
  });

  it("validates summary bucket counts are non-negative integers", () => {
    const issues = validateBrowserQaBundle({
      browserQa: {
        executed: true,
        status: "completed",
        summary: {
          smoke: { passed: -1, failed: 0 },
        },
      },
    });

    expect(issues.some((i) => i.message.includes("non-negative integers"))).toBe(true);
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
});

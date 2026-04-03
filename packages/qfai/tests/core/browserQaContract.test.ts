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
});

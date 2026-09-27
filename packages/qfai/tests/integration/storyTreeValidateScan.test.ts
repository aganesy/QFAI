import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateStoryTreeObligations } from "../../src/core/validators/storyTreeObligations.js";

describe("story-tree test scan", () => {
  it("fails closed when a configured test glob cannot be scanned", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-scan-"));
    try {
      const config = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            testFileGlobs: [`tests/${String.fromCharCode(0)}/*.ts`],
          },
        },
      };
      const model = buildStoryTreeModel(new Map());
      const findings = await validateStoryTreeObligations(root, config, "atdd", model);

      expect(findings.map((finding) => finding.code)).toEqual(["QFAI-SCAN-002"]);
      expect(findings[0]?.severity).toBe("error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

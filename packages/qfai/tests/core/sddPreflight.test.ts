import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

describe("runSddPreflight", () => {
  it("uses latest requirement index when available", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const requireDir = path.join(
        root,
        ".qfai",
        "require",
        "require-20260216010102003",
      );
      await mkdir(requireDir, { recursive: true });
      await writeFile(
        path.join(requireDir, "02_requirement-index.md"),
        [
          "# 02 Requirement Index",
          "",
          "| REQ-ID | Statement | Priority | Source refs | Notes |",
          "| ------ | --------- | -------- | ----------- | ----- |",
          "| REQ-0001 | sample 1 | P1 | SRC-0001 | note |",
          "| REQ-0002 | sample 2 | P2 | SRC-0002 | note |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig, {
        now: new Date("2026-02-16T00:00:00.000Z"),
      });

      expect(result.source).toBe("require-index");
      expect(result.importedReqCount).toBe(2);
      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Selected source: require-index");
      expect(summary).toContain("Imported REQ count: 2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("bootstraps import-lite evidence when indexed inputs are missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const result = await runSddPreflight(root, defaultConfig, {
        minimumInput: {
          urls: ["https://example.com/requirements"],
          excerpt: "User asked to start from external requirement docs.",
        },
        assumptions: ["Actor mapping is not finalized."],
        now: new Date("2026-02-16T01:02:03.004Z"),
      });

      expect(result.source).toBe("import-lite-bootstrap");
      expect(result.importLiteEvidencePath).toBeDefined();
      const evidencePath = result.importLiteEvidencePath;
      if (!evidencePath) {
        throw new Error("importLiteEvidencePath is missing");
      }

      const evidence = await readFile(evidencePath, "utf-8");
      expect(evidence).toContain("entrypoint: import-lite");
      expect(evidence).toContain("https://example.com/requirements");

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Selected source: import-lite-evidence");
      expect(summary).toContain("Actor mapping is not finalized.");
      expect(summary).toContain("review-exempt");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

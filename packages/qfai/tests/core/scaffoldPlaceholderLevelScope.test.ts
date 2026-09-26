import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildSkeleton } from "../../src/core/atdd/scaffold.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  scaffoldPlaceholderReportedFilter,
  validateScaffoldPlaceholder,
} from "../../src/core/validators/scaffoldPlaceholder.js";
import { validateTestTodoStubs } from "../../src/core/validators/testTodoStubs.js";

describe("scaffold placeholders and the stub gate", () => {
  it("reports AC and BF placeholders and retires the TC level exclusion", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-placeholder-"));
    try {
      const ac = { kind: "AC" as const, id: "AC-0001-0001-01", storyId: "US-0001-0001" };
      const bf = { kind: "BF" as const, id: "BF-0001" };
      const acFile = path.join(root, "tests", "integration", ac.storyId, `${ac.id}.test.ts`);
      const bfFile = path.join(root, "tests", "e2e", `${bf.id}.test.ts`);
      await mkdir(path.dirname(acFile), { recursive: true });
      await mkdir(path.dirname(bfFile), { recursive: true });
      await writeFile(acFile, buildSkeleton(ac));
      await writeFile(bfFile, buildSkeleton(bf));
      const issues = await validateScaffoldPlaceholder(root, defaultConfig);
      expect(issues.map((entry) => entry.refs).flat()).toEqual(
        expect.arrayContaining([ac.id, bf.id]),
      );
      const stubIssues = await validateTestTodoStubs(root, defaultConfig, {
        globs: ["tests/{integration,e2e}/**/*.test.ts"],
        placeholderReported: scaffoldPlaceholderReportedFilter(root, defaultConfig),
      });
      expect(stubIssues.filter((entry) => entry.code === "QFAI-TEST-003")).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

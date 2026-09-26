import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSkeleton, type ScaffoldTarget } from "../../../../src/core/atdd/scaffold.js";
import { readValidateCycles } from "../../../../src/core/atdd/scaffoldEscalation.js";
import { defaultConfig } from "../../../../src/core/config.js";
import { resolveFlowScope } from "../../../../src/core/flowScope.js";
import type { StoryTreeModel } from "../../../../src/core/storyTree/tree.js";
import {
  scaffoldPlaceholderReportedFilter,
  scaffoldPlaceholderReportsBody,
  scaffoldPlaceholderScanDirs,
  validateScaffoldPlaceholder,
} from "../../../../src/core/validators/scaffoldPlaceholder.js";

let root: string;
const bf: ScaffoldTarget = { kind: "BF", id: "BF-0008" };
const ac: ScaffoldTarget = { kind: "AC", id: "AC-0008-0007-01", storyId: "US-0008-0007" };

async function seed(
  target: ScaffoldTarget,
  kind = target.kind === "BF" ? "e2e" : "integration",
): Promise<string> {
  const directory = path.join(
    root,
    "tests",
    kind,
    ...(target.kind === "AC" ? [target.storyId] : []),
  );
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${target.id}.test.ts`);
  await writeFile(file, buildSkeleton(target));
  return file;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-placeholder-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("story-tree scaffold placeholders", () => {
  it("scans integration, API and E2E homes, with no retired atdd home", () => {
    expect(scaffoldPlaceholderScanDirs("tests")).toEqual([
      path.join("tests", "integration"),
      path.join("tests", "api"),
      path.join("tests", "e2e"),
    ]);
  });

  it("reports AC and BF placeholders but not completed files", async () => {
    const acFile = await seed(ac);
    await seed(bf);
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues).toHaveLength(2);
    expect(issues.map((entry) => entry.refs).flat()).toEqual(
      expect.arrayContaining([ac.id, bf.id]),
    );
    expect(
      issues.every(
        (entry) => entry.code === "D-SCAFFOLD-PLACEHOLDER" && entry.severity === "warning",
      ),
    ).toBe(true);
    expect(issues.some((entry) => entry.code === "D-SCAFFOLD-FOREIGN-HOME")).toBe(false);
    await writeFile(acFile, `// QFAI:${ac.id}\nit("works", () => {});`);
    const next = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(next).toHaveLength(1);
    expect(next[0]?.refs).toEqual([bf.id]);
    expect(await readValidateCycles(root, ac.id)).toBe(0);
  });

  it("escalates only after the configured number of validate cycles", async () => {
    await seed(ac);
    expect((await validateScaffoldPlaceholder(root, defaultConfig))[0]?.severity).toBe("warning");
    expect((await validateScaffoldPlaceholder(root, defaultConfig))[0]?.severity).toBe("warning");
    expect((await validateScaffoldPlaceholder(root, defaultConfig))[0]?.severity).toBe("error");
    expect(await readValidateCycles(root, ac.id)).toBe(3);
  });

  it("tracks multiple files with the same AC only once per pass", async () => {
    await seed(ac);
    const second = path.join(root, "tests", "api", `${ac.id}.test.ts`);
    await mkdir(path.dirname(second), { recursive: true });
    await writeFile(second, buildSkeleton(ac));
    expect(await validateScaffoldPlaceholder(root, defaultConfig)).toHaveLength(2);
    expect(await readValidateCycles(root, ac.id)).toBe(1);
  });

  it("scopes findings and counters to selected flows", async () => {
    await seed(ac);
    await seed(bf);
    const model = {
      flows: [{ id: bf.id, file: "", directory: "" }],
      stories: [{ id: ac.storyId, flowId: bf.id, file: "", directory: "" }],
      acceptanceCriteria: [{ id: ac.id, storyId: ac.storyId, file: "" }],
      examples: [],
      rules: [],
      ruleRefs: [],
      declarations: [],
      decisions: null,
      decisionFile: null,
      openQuestions: null,
      openQuestionsFile: null,
      contractFiles: [],
      additionalContractFiles: [],
      errors: [],
    } satisfies StoryTreeModel;
    const scope = resolveFlowScope([bf.id], model);
    const issues = await validateScaffoldPlaceholder(root, defaultConfig, { flowScope: scope });
    expect(issues).toHaveLength(2);
    const emptyScope = resolveFlowScope([], model);
    expect(
      await validateScaffoldPlaceholder(root, defaultConfig, { flowScope: emptyScope }),
    ).toEqual([]);
    expect(await readValidateCycles(root, ac.id)).toBe(1);
  });

  it("hands the stub gate only files the placeholder validator actually scans", async () => {
    const file = await seed(ac);
    const body = await readFile(file, "utf8");
    const filter = scaffoldPlaceholderReportedFilter(root, defaultConfig);
    expect(scaffoldPlaceholderReportsBody(body)).toBe(true);
    expect(filter(path.relative(root, file), body)).toBe(true);
    expect(filter("tests/atdd/AC-0008-0007-01.test.ts", body)).toBe(false);
    expect(filter("tests/integration/.hidden/AC-0008-0007-01.test.ts", body)).toBe(false);
    expect(filter("tests/integration/US-0008-0007/AC-0008-0007-01.ts", body)).toBe(false);
    expect(scaffoldPlaceholderReportsBody(`// QFAI:${ac.id}\nit("works", () => {});`)).toBe(false);
  });
});

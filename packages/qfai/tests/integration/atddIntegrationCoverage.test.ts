/**
 * An acceptance criterion no integration or API test exercises gets one: the ATDD scaffold writes
 * the test home the validator counts, and the managed ignore block it asserts is what `qfai init`
 * writes.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { runInit } from "../../src/cli/commands/init.js";
import { QFAI_GITIGNORE_MARKER } from "../../src/core/gitignore.js";
import { validateProject } from "../../src/core/validate.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];
const storyId = "US-0001-0033";
const acId = "AC-0001-0033-01";

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-integration-"));
  roots.push(root);
  return root;
}

/** A story tree whose one AC has no test, with the default test layout selected. */
async function projectWithUncoveredAc(): Promise<string> {
  const root = await newRoot();
  const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
  const story = path.join(flow, "user-story-0001-0033");
  await mkdir(story, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), "# BF-0001: Setup\n");
  await writeFile(path.join(story, "01_User-story.md"), `# ${storyId}: Managed ignore block\n`);
  await writeFile(
    path.join(story, "02_Acceptance-Criteria.md"),
    `# Acceptance Criteria\n\n\`\`\`gherkin\n# ${acId}\nScenario: init writes the managed ignore block\n  Given a project\n\`\`\`\n`,
  );
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    ["validation:", "  traceability:", "    testFileGlobs:", "      - tests/**/*.test.ts", ""].join(
      "\n",
    ),
  );
  return root;
}

async function missingAcCoverage(root: string): Promise<boolean> {
  const result = await validateProject(root, undefined, { profile: "atdd" });
  return result.issues.some(
    (found) => found.code === "QFAI-STORY-006" && found.refs?.includes(acId),
  );
}

describe("ATDD integration coverage for an uncovered AC", () => {
  // QFAI:EX-0001-0070-01
  it("adds an integration test carrying the AC annotation, and init writes the block that test asserts", async () => {
    const root = await projectWithUncoveredAc();
    expect(await missingAcCoverage(root)).toBe(true);

    const code = await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} });
    expect(code).toBe(0);
    const added = path.join("tests", "integration", storyId, `${acId}.test.ts`);
    expect(await readFile(path.join(root, added), "utf-8")).toContain(`QFAI:${acId}`);
    expect(await missingAcCoverage(root)).toBe(false);

    const project = await newRoot();
    await captureStdout(() => runInit({ dir: project, force: false, dryRun: false, yes: true }));
    const gitignore = await readFile(path.join(project, ".gitignore"), "utf-8");
    expect(gitignore.split("\n")).toContain(QFAI_GITIGNORE_MARKER);
  });
});

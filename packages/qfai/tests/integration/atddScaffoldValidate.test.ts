import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { validateProject } from "../../src/core/validate.js";

const roots: string[] = [];
const flowId = "BF-0008";
const storyId = "US-0008-0007";
const acId = "AC-0008-0007-01";
const acTest = path.join("tests", "integration", storyId, `${acId}.test.ts`);

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-e2e-"));
  roots.push(root);
  const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0008");
  const story = path.join(flow, "user-story-0008-0007");
  await mkdir(story, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), `# ${flowId}: Checkout\n`);
  await writeFile(path.join(story, "01_User-story.md"), `# ${storyId}: Checkout\n`);
  await writeFile(
    path.join(story, "02_Acceptance-Criteria.md"),
    `# Acceptance Criteria\n\n\`\`\`gherkin\n# ${acId}\nScenario: completes checkout\n  Given a cart\n\`\`\`\n`,
  );
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    ["validation:", "  traceability:", "    testFileGlobs:", "      - tests/**/*.test.ts", ""].join(
      "\n",
    ),
  );
  return root;
}

/** The codes `qfai validate --profile atdd` raises against the AC test. */
async function findingsOnAcTest(root: string): Promise<string[]> {
  const result = await validateProject(root, undefined, { profile: "atdd" });
  const file = acTest.split(path.sep).join("/");
  return result.issues
    .filter((issue) => issue.file?.split(path.sep).join("/").endsWith(file))
    .map((issue) => issue.code);
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("ATDD scaffold output under validate", () => {
  it("emits the AC and BF test homes and annotations", async () => {
    const root = await project();
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await readFile(path.join(root, acTest), "utf8")).toContain(`QFAI:${acId}`);
    expect(await readFile(path.join(root, "tests", "e2e", `${flowId}.test.ts`), "utf8")).toContain(
      `QFAI:${flowId}`,
    );
  });

  // QFAI:AC-0001-0073-05
  // QFAI:EX-0001-0073-02
  it("raises no finding for an empty scaffolded test, however often validate runs", async () => {
    const root = await project();
    await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} });

    for (let run = 0; run < 3; run += 1) {
      expect(await findingsOnAcTest(root)).toEqual([]);
    }
  });

  // QFAI:AC-0001-0073-05
  // QFAI:EX-0001-0073-07
  it("reports a scaffolded test changed to skip, then to todo", async () => {
    const root = await project();
    await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} });
    const file = path.join(root, acTest);
    const scaffolded = await readFile(file, "utf8");

    await writeFile(file, scaffolded.replace(/\bit\(/, "it.skip("));
    expect(await findingsOnAcTest(root)).toEqual(["QFAI-TEST-003"]);

    await writeFile(file, scaffolded.replace(/\bit\((".*?"), \(\) => \{\}\);/, "it.todo($1);"));
    expect(await findingsOnAcTest(root)).toEqual(["QFAI-TEST-001"]);
  });
});

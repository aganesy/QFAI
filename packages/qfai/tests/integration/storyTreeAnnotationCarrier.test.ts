import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateStoryTreeObligations } from "../../src/core/validators/storyTreeObligations.js";

const flow = "BF-0099";
const criterion = "AC-0099-0001-01";
const story = "spec/02_business-flow/business-flow-0099/user-story-0099-0001";
const model = buildStoryTreeModel(
  new Map([
    ["spec/02_business-flow/business-flow-0099/business-flow.md", `# ${flow}: Sample\n`],
    [`${story}/01_User-story.md`, "# US-0099-0001: Sample\n"],
    [`${story}/02_Acceptance-Criteria.md`, `\`\`\`gherkin\n# ${criterion}\n\`\`\`\n`],
    [
      `${story}/03_Example.md`,
      `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0099-0001-01 | ${criterion} | in | out |\n`,
    ],
  ]),
);
const config = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*.test.ts"],
    },
  },
};

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function missing(files: Record<string, string>): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-carrier-"));
  roots.push(root);
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
  const findings = await validateStoryTreeObligations(root, config, "atdd", model);
  return findings
    .filter((finding) => finding.code === "QFAI-STORY-006")
    .flatMap((finding) => finding.refs ?? []);
}

const mark = (id: string) => `// ${["QFAI", id].join(":")}\n`;
const testOf = (id: string) => `${mark(id)}it("${id}", () => {});\n`;

describe("an annotation in a file the test globs do not select", () => {
  // QFAI:EX-0001-0056-11
  it("leaves the BF owed until a selected E2E test carries it", async () => {
    expect(await missing({ "tests/e2e/coverage.md": mark(flow) })).toContain(flow);
    expect(await missing({ "tests/e2e/flow.test.ts": testOf(flow) })).not.toContain(flow);
  });

  // QFAI:EX-0001-0056-12
  it("leaves the AC owed until a selected integration test carries it", async () => {
    const carrier = await missing({ "tests/integration/coverage.md": mark(criterion) });
    const selected = await missing({ "tests/integration/criterion.test.ts": testOf(criterion) });
    expect(carrier).toContain(criterion);
    expect(selected).not.toContain(criterion);
  });
});

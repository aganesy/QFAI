import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";

const roots: string[] = [];
const flowId = "BF-0008";
const storyId = "US-0008-0007";
const acId = "AC-0008-0007-01";

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
  return root;
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("ATDD scaffold story-tree end to end", () => {
  it("emits the AC and BF test homes and annotations", async () => {
    const root = await project();
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(
      await readFile(path.join(root, "tests", "integration", storyId, `${acId}.test.ts`), "utf8"),
    ).toContain(`QFAI:${acId}`);
    expect(await readFile(path.join(root, "tests", "e2e", `${flowId}.test.ts`), "utf8")).toContain(
      `QFAI:${flowId}`,
    );
    expect(
      (await validateScaffoldPlaceholder(root, defaultConfig))
        .map((finding) => finding.refs)
        .flat(),
    ).toEqual(expect.arrayContaining([acId, flowId]));
  });

  it("preserves edited assertions and escalates only the remaining placeholder", async () => {
    const root = await project();
    await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} });
    await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} });
    const acFile = path.join(root, "tests", "integration", storyId, `${acId}.test.ts`);
    const completed = `// QFAI:${acId}\nit("checks", () => { expect(true).toBe(true); });\n`;
    await writeFile(acFile, completed);
    await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} });
    expect(await readFile(acFile, "utf8")).toBe(completed);
    expect((await validateScaffoldPlaceholder(root, defaultConfig))[0]?.severity).toBe("warning");
    expect((await validateScaffoldPlaceholder(root, defaultConfig))[0]?.severity).toBe("warning");
    const final = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(final).toHaveLength(1);
    expect(final[0]?.severity).toBe("error");
    expect(final[0]?.refs).toEqual([flowId]);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistant = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

async function read(relative: string): Promise<string> {
  return await readFile(path.join(assistant, relative), "utf8");
}

// `.qfai/report/validate.json` is only the default location of an unscoped
// run's shared result: the project configures it, a profiled run also writes a
// `-<profile>` sibling, a `--flow` run writes a scoped file instead, and the
// shared file holds whichever unscoped run finished last. A reader told to open
// that one fixed path can read another run's result.
describe("readers of a validation result read the one the current command wrote", () => {
  it("the verify gate reads its own profile's result and reports that profile", async () => {
    const gate = await read("step/verify-qfai-gate/STEP.md");
    const reads = gate.slice(gate.indexOf("## Reads"), gate.indexOf("## Writes"));
    expect(reads).not.toContain("`.qfai/report/validate.json`");
    expect(reads).toContain("output.validateJsonPath");
    expect(reads).toContain("-<profile>");
    expect(reads).toContain("`generatedAt`");
    expect(gate).toContain("npx qfai report --profile <profile>");
    expect(gate).not.toContain("Run `npx qfai report` when");
  });

  it("the schema names the configured path and the file each scope writes", async () => {
    const schema = await read("skill/qfai-verify/references/validate-json-schema.md");
    const intro = schema.slice(0, schema.indexOf("## Top level"));
    expect(intro).toContain("output.validateJsonPath");
    expect(intro).toContain("-<profile>");
    expect(intro).toContain(".flow-");
    expect(intro).toContain("`generatedAt`");
  });

  it("configure inspects the result of the validate run it just made", async () => {
    const configure = await read("skill/qfai-configure/SKILL.md");
    expect(configure).not.toContain("inspect `.qfai/report/validate.json#issues`");
    expect(configure).toContain("output.validateJsonPath");
  });
});

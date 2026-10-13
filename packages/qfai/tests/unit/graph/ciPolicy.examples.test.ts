import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { parse } from "yaml";
import { getInitAssetsDir } from "../../../src/shared/assets.js";

interface Workflow {
  jobs: Record<
    string,
    { steps?: { run?: string; uses?: string; with?: Record<string, unknown> }[] }
  >;
}

// QFAI:EX-0001-0236-18
// Mutation: packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml `# Emits the layers whose opt-in test script (test:unit,` -> `graphify extract .` fails "keeps ordinary source-change CI without mandatory graph generation or artifact attachments"
it("keeps ordinary source-change CI without mandatory graph generation or artifact attachments", async () => {
  const workflows: Record<string, Workflow> = {};
  for (const name of ["qfai-tests.yml", "qfai-validate.yml", "qfai-docs.yml"]) {
    const workflow: Workflow = parse(
      await readFile(path.join(getInitAssetsDir(), "root", ".github", "workflows", name), "utf8"),
    );
    workflows[name] = workflow;
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
    expect(
      steps.some((step) =>
        /(?:graphify\s+extract|codegraph\s+(?:init|index|sync)|graph:prepare)/i.test(
          step.run ?? "",
        ),
      ),
    ).toBe(false);
    expect(
      steps.some(
        (step) =>
          step.uses?.startsWith("actions/upload-artifact@") &&
          /(?:graphify|codegraph|\.qfai\/tools)/i.test(JSON.stringify(step.with ?? {})),
      ),
    ).toBe(false);
  }
  expect(Object.keys(workflows["qfai-tests.yml"]?.jobs ?? {})).toContain("verdict");
  expect(
    Object.values(workflows["qfai-validate.yml"]?.jobs ?? {})
      .flatMap((job) => job.steps ?? [])
      .some((step) => /qfai validate/.test(step.run ?? "")),
  ).toBe(true);
});

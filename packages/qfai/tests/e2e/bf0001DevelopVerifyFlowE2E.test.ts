// QFAI:BF-0001
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

const flowId = "BF-0001";
const storyId = "US-0001-0001";
const criterionId = "AC-0001-0001-01";
const exampleId = "EX-0001-0001-01";
const roots: string[] = [];
const execFileAsync = promisify(execFile);

type ValidationFinding = { code: string; refs?: string[] };

async function put(root: string, relative: string, content: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function readFlowFindings(root: string): Promise<ValidationFinding[]> {
  const body = await readFile(path.join(root, ".qfai/report/validate.flow-0001.json"), "utf8");
  const result = JSON.parse(body) as { issues: ValidationFinding[] };
  return result.issues;
}

function hasFinding(findings: readonly ValidationFinding[], code: string, id: string): boolean {
  return findings.some((finding) => finding.code === code && finding.refs?.includes(id));
}

async function runFixtureTests(root: string, files: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--test", ...files.map((file) => path.join(root, file))],
    { cwd: root },
  );
  return stdout;
}

async function reportAfterPassingTests(
  root: string,
  files: readonly string[],
): Promise<{
  testExitCode: number;
  validationExitCode: number | null;
  reportExitCode: number | null;
  testOutput?: string;
}> {
  let testOutput: string;
  try {
    testOutput = await runFixtureTests(root, files);
  } catch (error) {
    if ((error as { code?: unknown }).code !== 1) throw error;
    return { testExitCode: 1, validationExitCode: null, reportExitCode: null };
  }
  for (const profile of ["sdd", "atdd", "tdd", "full"] as const) {
    const validationExitCode = await runValidate({
      root,
      strict: false,
      profile,
      failOn: "error",
      flowIds: [flowId],
    });
    if (validationExitCode !== 0) {
      return { testExitCode: 0, validationExitCode, reportExitCode: null, testOutput };
    }
  }
  // Reuse the full-profile validation artifact produced above.
  const reportExitCode = await runReport({
    root,
    format: "json",
    failOn: "error",
    profile: "full",
    flowIds: [flowId],
  });
  return { testExitCode: 0, validationExitCode: 0, reportExitCode, testOutput };
}

const DISCUSSION_FILES = [
  "01_Context.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "11_OQ-Register.md",
] as const;

const DISCUSSION_BODY =
  "Buyers select cart items and check out; the checkout total is the sum of the selected item prices. Payment settlement is outside this discussion.\n";

function discussionFile(name: (typeof DISCUSSION_FILES)[number]): string {
  const heading = `# ${name.slice(3, -3).replace(/-/g, " ")}\n\n`;
  switch (name) {
    case "01_Context.md":
      return `${heading}## UI-bearing Classification\n\n- ui_bearing: false\n- primary_surface: non-ui\n- secondary_surfaces: []\n- classification_rationale: The checkout total is computed by a module with no screen.\n\n## Goal and Completion Criteria\n\n- Goal: ${DISCUSSION_BODY}\n## Inception Deck\n\n${DISCUSSION_BODY}`;
    case "09_Constraints.md":
      return `${heading}${DISCUSSION_BODY}${["Security Policy", "Compliance Policy", "Development Policy", "Operational Policy"].map((section) => `\n## ${section}\n\nNone.\n`).join("")}`;
    case "03_Story-Workshop.md":
      return `${heading}${DISCUSSION_BODY}\n\`\`\`mermaid\nflowchart TD\n  Select[Select items] --> Total[See the total]\n\`\`\`\n`;
    case "04_Sources.md":
      return `${heading}## Source Registry\n\n| SRC-ID | Title | Type | URL / Path | Retrieved | Notes |\n| --- | --- | --- | --- | --- | --- |\n| SRC-0001 | Checkout requirements | primary | docs/checkout.md | 2026-01-01 | Owner request |\n\n## Research Summary\n\n\`\`\`yaml\nresearch_summary:\n  sources:\n    - id: SRC-0001\n      title: Checkout requirements\n      url: https://example.com/checkout\n      published: 2026-01-01\n  best_practices:\n    - id: BP-0001\n      category: arithmetic\n      title: Sum the selected prices once\n      description: Add item prices without rounding each step.\n      source_id: SRC-0001\n  anti_patterns:\n    - id: AP-0001\n      category: arithmetic\n      title: Seeding a sum with a nonzero value\n      description: A nonzero seed shifts every total.\n      source_id: SRC-0001\n  reflection:\n    - source_id: SRC-0001\n      finding: The total is a plain sum of the selected prices.\n      action: apply\n      reason: It is the whole of the requirement.\n\`\`\`\n`;
    default:
      return `${heading}${DISCUSSION_BODY}`;
  }
}

/**
 * The inputs BF-0001 has before SDD authors the story tree: the discussion that
 * led to it, and the technology contract the full profile reads for unfilled
 * placeholders.
 */
async function seedProjectInputs(root: string): Promise<void> {
  for (const name of DISCUSSION_FILES) {
    await put(root, `.qfai/discussion/discussion-20260101000000000/${name}`, discussionFile(name));
  }
  await put(
    root,
    ".qfai/spec/03_contract/tech.md",
    "# Technology\n\n## Runtime / platform\n\n- Runtime: `Node.js 20`\n- Platform: `Linux, macOS and Windows`\n\n## Stack\n\n| Component | Choice |\n| --------- | ------ |\n| Test runner | node:test |\n\n## Dependencies\n\n- Runtime dependency: `none; the checkout module uses the standard library`\n\n## Standard commands (copy-paste)\n\n- Install: `npm install`\n- Format: `npm run format:check`\n- Test: `node --test tests`\n- Lint: `npm run lint`\n- Typecheck: `npm run typecheck`\n- Build: `npm run build`\n- Skeleton: `node src/checkout.mjs`\n- Validate: `npx qfai validate`\n",
  );
}

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0001-"));
  roots.push(root);
  await runInit({ dir: root, force: false, dryRun: false, yes: true });
  const configFile = path.join(root, "qfai.config.yaml");
  const config = await readFile(configFile, "utf8");
  expect(config).toContain("testFileGlobs: []");
  await writeFile(
    configFile,
    config.replace("testFileGlobs: []", 'testFileGlobs: ["tests/**/*.test.mjs"]'),
    "utf8",
  );
  return root;
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("BF-0001 develop and verify a QFAI project", () => {
  it("returns findings to their owners, then carries the same flow through acceptance, implementation and report", async () => {
    const root = await project();
    const spec = ".qfai/spec";
    const flow = `${spec}/02_business-flow/business-flow-0001`;
    const story = `${flow}/user-story-0001-0001`;
    const question = `${spec}/open-questions.md`;

    await seedProjectInputs(root);
    await put(
      root,
      `${spec}/01_policy/objective.md`,
      "# Objective\n\n## Objective\n\n- Outcome: Buyers can complete checkout.\n- Evidence: Project need recorded by the owner.\n\n## Users\n\n- Primary user: Buyer completing a purchase.\n\n## Success criteria\n\n- Measure: A cart total is correct for every selected item.\n\n## Non-goals\n\n- Outside this initiative: Payment settlement.\n",
    );
    await put(
      root,
      `${flow}/business-flow.md`,
      `# ${flowId}: Complete checkout\n\n## Purpose\n\nA buyer completes checkout.\n\n## Flow\n\nNot drawn yet.\n`,
    );
    await put(
      root,
      `${spec}/02_business-flow/business-flows.md`,
      `# Business Flows\n\n## Flows\n\n| BF-ID | Flow | Path |\n| --- | --- | --- |\n| ${flowId} | Complete checkout | \`business-flow-0001/\` |\n`,
    );
    await put(
      root,
      `${flow}/user-stories.md`,
      `# User Stories\n\n## Stories\n\n| US-ID | Story | Path |\n| --- | --- | --- |\n| ${storyId} | Checkout a cart | \`user-story-0001-0001/\` |\n`,
    );
    await put(
      root,
      `${story}/01_User-story.md`,
      `# ${storyId}: Checkout a cart\n\n## User Story\n\nAs a buyer, I want the cart total, so that I pay the right amount.\n`,
    );
    await put(
      root,
      `${story}/02_Acceptance-Criteria.md`,
      `# Acceptance Criteria\n\n## Criteria\n\n\`\`\`gherkin\nFeature: Checkout a cart\n  # ${criterionId}\n  Scenario: total selected items\n    Given a cart with two items\n    When the buyer checks out\n    Then the total is the sum of both prices\n\`\`\`\n`,
    );
    await put(
      root,
      `${story}/03_Example.md`,
      `# Examples\n\n## Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| ${exampleId} | ${criterionId} | 20 and 30 | 50 |\n`,
    );
    await put(
      root,
      `${spec}/03_contract/cli/cli-0001-checkout.md`,
      `# CLI-0001: Checkout\n\n## Ownership boundary\n\nThis contract decides how a cart total is calculated.\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | The total is the sum of item prices. | ${exampleId} |\n`,
    );
    await put(
      root,
      `${spec}/03_contract/contracts.md`,
      "# Contracts\n\n## Contract Index\n\n| ID | Title | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- |\n| CLI-0001 | Checkout | cli/cli-0001-checkout.md | - | - | Calculate the cart total. |\n",
    );
    await put(
      root,
      question,
      "# Open Questions\n\n## Open Questions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Unadjudicated: does checkout need a UI? | Decide before implementation. | TODO |\n",
    );

    expect(
      await runValidate({
        root,
        strict: false,
        profile: "sdd",
        failOn: "error",
        flowIds: [flowId],
      }),
    ).toBe(1);
    const blocked = await readFlowFindings(root);
    expect(hasFinding(blocked, "QFAI-STORY-011", flowId)).toBe(true);
    expect(hasFinding(blocked, "QFAI-SPACK-102", "OQ-0001")).toBe(true);

    await put(
      root,
      `${flow}/business-flow.md`,
      `# ${flowId}: Complete checkout\n\n## Purpose\n\nA buyer completes checkout.\n\n## Flow\n\n\`\`\`mermaid\nflowchart TD\n  Need[Buyer needs a total] --> Story[Define checkout and its contract]\n  Story --> Verify[Verify acceptance and implementation]\n\`\`\`\n`,
    );
    await put(
      root,
      question,
      "# Open Questions\n\n## Open Questions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Checkout needs no UI in this slice. | Use the CLI contract. | DONE |\n",
    );
    await runValidate({ root, strict: false, profile: "sdd", failOn: "never", flowIds: [flowId] });
    const repaired = await readFlowFindings(root);
    expect(hasFinding(repaired, "QFAI-STORY-011", flowId)).toBe(false);
    expect(hasFinding(repaired, "QFAI-SPACK-102", "OQ-0001")).toBe(false);

    await runValidate({ root, strict: false, profile: "atdd", failOn: "never", flowIds: [flowId] });
    const missingAcceptance = await readFlowFindings(root);
    expect(hasFinding(missingAcceptance, "QFAI-STORY-006", flowId)).toBe(true);
    expect(hasFinding(missingAcceptance, "QFAI-STORY-006", criterionId)).toBe(true);
    expect(await runAtddScaffold({ root, storyId, write: () => {}, writeErr: () => {} })).toBe(0);
    expect(await runAtddScaffold({ root, flowId, write: () => {}, writeErr: () => {} })).toBe(0);
    await runValidate({ root, strict: false, profile: "atdd", failOn: "never", flowIds: [flowId] });
    const scaffolded = await readFlowFindings(root);
    expect(hasFinding(scaffolded, "QFAI-STORY-006", flowId)).toBe(false);
    expect(hasFinding(scaffolded, "QFAI-STORY-006", criterionId)).toBe(false);
    expect(scaffolded.some((finding) => finding.code.startsWith("QFAI-TEST-"))).toBe(false);

    await put(
      root,
      "src/checkout.mjs",
      "export const checkoutTotal = (prices) => prices.reduce((sum, price) => sum + price, 1);\n",
    );
    await put(
      root,
      `tests/integration/${storyId}/${criterionId}.test.mjs`,
      `// QFAI:${criterionId}\nimport assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { checkoutTotal } from "../../../src/checkout.mjs";\ntest("totals selected items", () => { assert.equal(checkoutTotal([20, 30]), 50); });\n`,
    );
    await put(
      root,
      `tests/e2e/${flowId}.test.mjs`,
      `// QFAI:${flowId}\nimport assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { checkoutTotal } from "../../src/checkout.mjs";\ntest("completes checkout", () => { assert.equal(checkoutTotal([20, 30]), 50); });\n`,
    );
    await runValidate({ root, strict: false, profile: "atdd", failOn: "never", flowIds: [flowId] });
    const accepted = await readFlowFindings(root);
    expect(hasFinding(accepted, "QFAI-STORY-006", flowId)).toBe(false);
    expect(hasFinding(accepted, "QFAI-STORY-006", criterionId)).toBe(false);
    const acceptanceFiles = [
      `tests/integration/${storyId}/${criterionId}.test.mjs`,
      `tests/e2e/${flowId}.test.mjs`,
    ];
    expect(await reportAfterPassingTests(root, acceptanceFiles)).toEqual({
      testExitCode: 1,
      validationExitCode: null,
      reportExitCode: null,
    });
    await expect(
      access(path.join(root, ".qfai/report/report.flow-0001.json")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });

    expect(
      await runValidate({
        root,
        strict: false,
        profile: "tdd",
        failOn: "error",
        flowIds: [flowId],
      }),
    ).toBe(1);
    expect(hasFinding(await readFlowFindings(root), "QFAI-STORY-006", exampleId)).toBe(true);
    await put(
      root,
      `tests/unit/${exampleId}.test.mjs`,
      `import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { checkoutTotal } from "../../src/checkout.mjs";\n// QFAI:${exampleId}\ntest("adds both prices", () => { assert.equal(checkoutTotal([20, 30]), 50); });\n`,
    );
    await runValidate({ root, strict: false, profile: "tdd", failOn: "never", flowIds: [flowId] });
    expect(hasFinding(await readFlowFindings(root), "QFAI-STORY-006", exampleId)).toBe(false);
    const allTests = [...acceptanceFiles, `tests/unit/${exampleId}.test.mjs`];
    expect(await reportAfterPassingTests(root, allTests)).toEqual({
      testExitCode: 1,
      validationExitCode: null,
      reportExitCode: null,
    });
    await expect(
      access(path.join(root, ".qfai/report/report.flow-0001.json")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });

    await put(
      root,
      "src/checkout.mjs",
      "export const checkoutTotal = (prices) => prices.reduce((sum, price) => sum + price, 0);\n",
    );
    const verified = await reportAfterPassingTests(root, allTests);
    expect(verified.testExitCode).toBe(0);
    expect(verified.testOutput).toMatch(/^(?:#|ℹ)\s+pass 3\b/m);
    expect(verified.validationExitCode).toBe(0);
    expect(verified.reportExitCode).toBe(0);
    const report = await readFile(path.join(root, ".qfai/report/report.flow-0001.json"), "utf8");
    const reportData = JSON.parse(report) as { summary: { counts: { error: number } } };
    expect(reportData.summary.counts.error).toBe(0);
    expect(report).toContain(flowId);
    expect(report).toContain(criterionId);
    expect(report).toContain(exampleId);
    const graph = JSON.parse(
      await readFile(
        path.join(root, ".qfai/report/business-flow-0001/traceability-graph.json"),
        "utf8",
      ),
    ) as { nodes: Array<{ id: string }> };
    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([flowId, storyId, criterionId, exampleId, "BR-0001-0001"]),
    );
  });
});

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const spec = ".qfai/spec";
const flowDir = `${spec}/02_business-flow/business-flow-0001`;
const storyDir = `${flowDir}/user-story-0001-0001`;
const flowFile = `${flowDir}/business-flow.md`;
const criteriaFile = `${storyDir}/02_Acceptance-Criteria.md`;
const examplesFile = `${storyDir}/03_Example.md`;

const annotation = (id: string) => ["QFAI", id].join(":");
const mark = (id: string) => `// ${annotation(id)}\n`;
const testOf = (...ids: string[]) =>
  `${ids.map(mark).join("")}it("covers ${ids.join(" ")}", () => {});\n`;

/** Counts a Markdown table row under the decisions heading the tree reads. */
function decisions(...rows: string[]): string {
  return ["| ID | Content | Approach | Status |", "| --- | --- | --- | --- |", ...rows, ""].join(
    "\n",
  );
}

/**
 * A story tree with one flow and one story holding two criteria, each with one
 * example, plus the given extra files, in a project whose test globs select
 * every `*.test.ts` file under `tests/`.
 */
async function project(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-test-obligations-"));
  roots.push(root);
  const files: Record<string, string> = {
    "qfai.config.yaml": [
      "paths:",
      "  specsDir: .qfai/spec",
      "  contractsDir: .qfai/spec/03_contract",
      "validation:",
      "  traceability:",
      "    testFileGlobs:",
      '      - "tests/**/*.test.ts"',
      "",
    ].join("\n"),
    [flowFile]: "# BF-0001: Flow\n",
    [`${storyDir}/01_User-story.md`]: "# US-0001-0001: Story\n",
    [criteriaFile]: [
      "```gherkin",
      "# AC-0001-0001-01",
      "Scenario: First",
      "  Given a project",
      "```",
      "",
      "```gherkin",
      "# AC-0001-0001-02",
      "Scenario: Second",
      "  Given a project",
      "```",
      "",
    ].join("\n"),
    [examplesFile]: [
      "| EX-ID | AC-Ref | Input | Expected |",
      "| --- | --- | --- | --- |",
      "| EX-0001-0001-01 | AC-0001-0001-01 | in | out |",
      "| EX-0001-0001-02 | AC-0001-0001-02 | in | out |",
      "",
    ].join("\n"),
    ...extra,
  };
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");
  }
  return root;
}

async function findings(root: string, profile: ValidationProfile, code: string): Promise<Issue[]> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues
    .filter((finding) => finding.code === code)
    .map((finding) => ({
      ...finding,
      ...(finding.file ? { file: finding.file.replaceAll("\\", "/") } : {}),
    }));
}

async function owed(root: string, profile: ValidationProfile): Promise<string[]> {
  const missing = await findings(root, profile, "QFAI-STORY-006");
  return missing.flatMap((finding) => finding.refs ?? []);
}

describe("layer-specific test obligations", () => {
  // QFAI:AC-0001-0056-01
  // QFAI:EX-0001-0056-01
  it("reports a business flow that only a non-E2E test annotates", async () => {
    const outside = await project({ "tests/integration/flow.test.ts": testOf("BF-0001") });
    expect(await findings(outside, "atdd", "QFAI-STORY-006")).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: expect.stringContaining(flowFile),
        refs: ["BF-0001"],
      }),
    );

    const inside = await project({ "tests/e2e/flow.test.ts": testOf("BF-0001") });
    expect(await owed(inside, "atdd")).not.toContain("BF-0001");
  });

  // QFAI:AC-0001-0056-02
  // QFAI:EX-0001-0056-02
  it("reports a criterion that only a non-integration, non-API test annotates", async () => {
    const root = await project({
      "tests/e2e/criterion.test.ts": testOf("AC-0001-0001-01"),
      "tests/api/criterion.test.ts": testOf("AC-0001-0001-02"),
    });
    const missing = await findings(root, "atdd", "QFAI-STORY-006");
    expect(missing).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: expect.stringContaining(criteriaFile),
        refs: ["AC-0001-0001-01"],
      }),
    );
    expect(missing.flatMap((finding) => finding.refs ?? [])).not.toContain("AC-0001-0001-02");
  });

  // QFAI:AC-0001-0056-03
  // QFAI:EX-0001-0056-03
  // QFAI:EX-0001-0056-14
  it("counts an example only for an annotation directly before a test declaration", async () => {
    const root = await project({
      "tests/unit/header.test.ts": `${mark("EX-0001-0001-01")}import { it } from "vitest";\nit("header", () => {});\n`,
      "tests/unit/body.test.ts": `it("body", () => {\n  ${mark("EX-0001-0001-01")}});\n`,
    });
    expect(await findings(root, "tdd", "QFAI-STORY-006")).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: expect.stringContaining(examplesFile),
        refs: ["EX-0001-0001-01"],
      }),
    );

    const covered = await project({
      "tests/unit/header.test.ts": `${mark("EX-0001-0001-01")}import { it } from "vitest";\nit("header", () => {});\n`,
      "tests/unit/direct.test.ts": `${mark("EX-0001-0001-01")}\n// context\nit("direct", () => {});\n`,
    });
    expect(await owed(covered, "tdd")).not.toContain("EX-0001-0001-01");
    expect(await owed(covered, "tdd")).toContain("EX-0001-0001-02");
  });

  // QFAI:AC-0001-0056-04
  // QFAI:EX-0001-0056-04
  it("names the file and annotation of a trace mark placed in the wrong layer", async () => {
    const root = await project({
      "tests/integration/flow.test.ts": testOf("BF-0001"),
      "tests/unit/criterion.test.ts": testOf("AC-0001-0001-01"),
    });
    const misplaced = await findings(root, "atdd", "QFAI-STORY-007");
    expect(misplaced).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: expect.stringContaining("tests/integration/flow.test.ts"),
        message: expect.stringContaining(annotation("BF-0001")),
      }),
    );
    expect(misplaced).toContainEqual(
      expect.objectContaining({
        severity: "error",
        file: expect.stringContaining("tests/unit/criterion.test.ts"),
        message: expect.stringContaining(annotation("AC-0001-0001-01")),
      }),
    );
  });

  // QFAI:AC-0001-0056-05
  // QFAI:EX-0001-0056-05
  it.each(["atdd", "tdd"] as const)(
    "names the file and ID of an annotation the tree does not define under %s",
    async (profile) => {
      const root = await project({
        "tests/e2e/unknown-flow.test.ts": testOf("BF-9999"),
        "tests/unit/unknown-example.test.ts": testOf("EX-0001-0001-99"),
      });
      const undefinedIds = await findings(root, profile, "QFAI-STORY-008");
      expect(undefinedIds).toContainEqual(
        expect.objectContaining({
          severity: "error",
          file: expect.stringContaining("tests/e2e/unknown-flow.test.ts"),
          refs: ["BF-9999"],
        }),
      );
      expect(undefinedIds).toContainEqual(
        expect.objectContaining({
          severity: "error",
          file: expect.stringContaining("tests/unit/unknown-example.test.ts"),
          refs: ["EX-0001-0001-99"],
        }),
      );
    },
  );

  // QFAI:AC-0001-0056-06
  // QFAI:EX-0001-0056-06
  it("exempts only the named item while the test exception is DONE", async () => {
    const decisionsFile = `${spec}/decisions.md`;
    const done = await project({
      [decisionsFile]: decisions(
        "| DEC-0001 | Test exception: BF-0001 | No E2E environment | DONE |",
      ),
    });
    expect(await findings(done, "atdd", "QFAI-STORY-009")).toContainEqual(
      expect.objectContaining({ severity: "info", refs: ["BF-0001", "DEC-0001"] }),
    );
    const doneOwed = await owed(done, "atdd");
    expect(doneOwed).not.toContain("BF-0001");
    expect(doneOwed).toEqual(expect.arrayContaining(["AC-0001-0001-01", "AC-0001-0001-02"]));

    const wip = await project({
      [decisionsFile]: decisions(
        "| DEC-0001 | Test exception: BF-0001 | No E2E environment | WIP |",
      ),
    });
    expect(await owed(wip, "atdd")).toContain("BF-0001");
    expect(await findings(wip, "atdd", "QFAI-STORY-009")).toEqual([]);

    const criterion = await project({
      [decisionsFile]: decisions(
        "| DEC-0001 | Test exception: AC-0001-0001-01 | No API environment | DONE |",
      ),
    });
    expect(await owed(criterion, "atdd")).not.toContain("AC-0001-0001-01");
    expect(await owed(criterion, "tdd")).toContain("EX-0001-0001-01");
  });

  // QFAI:AC-0001-0056-06
  // QFAI:EX-0001-0056-07
  it("exempts nothing for a test exception naming an ID the tree does not define", async () => {
    const root = await project({
      [`${spec}/decisions.md`]: decisions(
        "| DEC-0001 | Test exception: EX-0001-0001-01, EX-0001-0001-03 | No test yet | DONE |",
      ),
    });
    const result = await validateProject(root, undefined, { profile: "tdd" });
    expect(await owed(root, "tdd")).toEqual(["EX-0001-0001-02"]);
    expect(await findings(root, "tdd", "QFAI-STORY-009")).toEqual([
      expect.objectContaining({ severity: "info", refs: ["EX-0001-0001-01", "DEC-0001"] }),
    ]);
    expect(
      result.issues.some(
        (finding) =>
          finding.message.includes("EX-0001-0001-03") || finding.refs?.includes("EX-0001-0001-03"),
      ),
    ).toBe(false);
  });

  // QFAI:AC-0001-0071-05
  it.each(["atdd", "tdd"] as const)(
    "names an undeclared annotation with its file and says nothing of a declared one under %s",
    async (profile) => {
      const root = await project({
        "tests/integration/undeclared.test.ts": testOf("AC-0001-0001-99"),
        "tests/unit/declared.test.ts": testOf("EX-0001-0001-01"),
      });
      const undeclared = await findings(root, profile, "QFAI-STORY-008");
      expect(undeclared.map((finding) => [finding.severity, finding.refs])).toEqual([
        ["error", ["AC-0001-0001-99"]],
      ]);
      expect(undeclared[0]?.file).toContain("tests/integration/undeclared.test.ts");
      expect(undeclared[0]?.message).toContain("AC-0001-0001-99");
    },
  );

  // QFAI:AC-0001-0091-04
  // QFAI:EX-0001-0091-04
  it("selects an unannotated example again while the exception naming it is WIP or TODO", async () => {
    const withStatuses = (first: string, second: string) =>
      project({
        [`${spec}/decisions.md`]: decisions(
          `| DEC-0001 | Test exception: EX-0001-0001-01 | No test yet | ${first} |`,
          `| DEC-0002 | Test exception: EX-0001-0001-02 | No test yet | ${second} |`,
        ),
      });

    const mixed = await withStatuses("DONE", "WIP");
    expect(await owed(mixed, "tdd")).toEqual(["EX-0001-0001-02"]);
    expect((await findings(mixed, "tdd", "QFAI-STORY-009")).map((finding) => finding.refs)).toEqual(
      [["EX-0001-0001-01", "DEC-0001"]],
    );

    const open = await withStatuses("TODO", "WIP");
    expect(await owed(open, "tdd")).toEqual(["EX-0001-0001-01", "EX-0001-0001-02"]);
    expect(await findings(open, "tdd", "QFAI-STORY-009")).toEqual([]);
  });

  // QFAI:EX-0001-0091-05
  it("leaves the lowest unannotated example next once the one before it has a test", async () => {
    const third = [
      "| EX-ID | AC-Ref | Input | Expected |",
      "| --- | --- | --- | --- |",
      "| EX-0001-0001-01 | AC-0001-0001-01 | in | out |",
      "| EX-0001-0001-02 | AC-0001-0001-01 | in | out |",
      "| EX-0001-0001-03 | AC-0001-0001-02 | in | out |",
      "",
    ].join("\n");
    const root = await project({
      [examplesFile]: third,
      "tests/unit/first.test.ts": testOf("EX-0001-0001-01"),
    });
    expect(await owed(root, "tdd")).toEqual(["EX-0001-0001-02", "EX-0001-0001-03"]);
  });
});

describe.each([
  "DONE",
  "TODO",
  "WIP",
  "REJECTED",
  "SUPERSEDED (by DEC-0002)",
  "PARTLY SUPERSEDED (by DEC-0002)",
] as const)("whole validation of test exceptions at %s", (status) => {
  // QFAI:AC-0001-0056-06
  // QFAI:EX-0001-0056-06
  // QFAI:EX-0001-0056-07
  it.each([
    ["BF-0001", "atdd"],
    ["AC-0001-0001-01", "atdd"],
    ["EX-0001-0001-01", "tdd"],
  ] as const)("only DONE exempts %s under %s", async (id, profile) => {
    const approach =
      "- Evidence: none — isolated fixture - Grounds: no test environment - Residual risk: coverage remains unverified - Rollback: restore the obligation";
    const root = await project({
      [`${spec}/decisions.md`]: decisions(
        `| DEC-0001 | Test exception: ${id} | ${approach} | ${status} |`,
        `| DEC-0002 | Successor decision | ${approach} | DONE |`,
      ),
    });
    const missing = await owed(root, profile);
    expect(missing.includes(id)).toBe(status !== "DONE");
    expect(await findings(root, profile, "QFAI-STORY-009")).toEqual(
      status === "DONE"
        ? [expect.objectContaining({ severity: "info", refs: [id, "DEC-0001"] })]
        : [],
    );
    if (id === "BF-0001") {
      expect(missing).toEqual(expect.arrayContaining(["AC-0001-0001-01", "AC-0001-0001-02"]));
    }
    if (id !== "EX-0001-0001-01") {
      expect(await owed(root, "tdd")).toEqual(
        expect.arrayContaining(["EX-0001-0001-01", "EX-0001-0001-02"]),
      );
    }
    if (id === "EX-0001-0001-01") expect(missing).toContain("EX-0001-0001-02");
    expect(await findings(root, profile, "QFAI-STORY-003")).toEqual([]);
  });
});

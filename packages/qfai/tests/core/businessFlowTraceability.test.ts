/**
 * The edge from a story to the flow that realizes it.
 *
 * `_policies/04_Business-Flow.md` ships as the SSOT for the end-to-end flow and
 * was read by nothing, so the E2E obligation was keyed on `US-*` alone and the
 * E2E grain was the story grain. These cases cover the three parts that changed
 * that: flows have ids, a story cites them, and a test may annotate one.
 *
 * The direction is not a preference and is asserted as such below. A flow
 * listing its stories would be `_policies/**` owning a lower-layer item, which
 * `spec-traceability-rules.md` forbids, so `US-* -> BF-*` is the only edge
 * there is — and the obligation therefore cannot move off `US-*`.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseFlowDefinitions,
  parseStoryFlowRefs,
  parseTestFlowRefs,
} from "../../src/core/businessFlow.js";
import { defaultConfig } from "../../src/core/config.js";
import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { validateBusinessFlowTraceability } from "../../src/core/validators/businessFlowTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

describe("parseFlowDefinitions", () => {
  it("reads an id that opens a list item or a heading", () => {
    const { definitions, duplicateIds } = parseFlowDefinitions(
      ["## BF-0001: main", "", "- BF-0002: the alternate", "* BF-0003: the exception", ""].join(
        "\n",
      ),
    );

    expect(definitions.map((entry) => entry.id)).toEqual(["BF-0001", "BF-0002", "BF-0003"]);
    expect(duplicateIds).toEqual([]);
  });

  it("does not read an id written mid-sentence as a second declaration", () => {
    // The document is prose with diagrams. A flow named in the Notes section is
    // a citation of one declared above, and counting those would report a
    // duplicate for every flow the document explains.
    const { definitions, duplicateIds } = parseFlowDefinitions(
      ["- BF-0001: main", "", "The retry path rejoins BF-0001 after the timeout.", ""].join("\n"),
    );

    expect(definitions).toHaveLength(1);
    expect(duplicateIds).toEqual([]);
  });

  it("does not read an id inside a fenced diagram", () => {
    const { definitions } = parseFlowDefinitions(
      ["```mermaid", "flowchart TD", "  BF-0001 --> BF-0002", "```", "", "- BF-0001: main"].join(
        "\n",
      ),
    );

    expect(definitions.map((entry) => entry.id)).toEqual(["BF-0001"]);
  });

  it("reports an id declared twice and points at the repeat", () => {
    const { definitions, duplicateIds } = parseFlowDefinitions(
      ["- BF-0001: main", "- BF-0002: alternate", "- BF-0001: main again"].join("\n"),
    );

    expect(duplicateIds).toEqual(["BF-0001"]);
    expect(
      definitions.filter((entry) => entry.id === "BF-0001").map((entry) => entry.line),
    ).toEqual([1, 3]);
  });
});

describe("parseStoryFlowRefs", () => {
  it("attributes a Flow line to the story block it sits in", () => {
    const refs = parseStoryFlowRefs(
      [
        "# 02 User Stories",
        "",
        "## US-0001: first",
        "- Parent: CAP-0001",
        "- Flow: BF-0001, BF-0002",
        "",
        "## US-0002: second",
        "- Flow: BF-0002",
      ].join("\n"),
      "0007",
      "02_User-stories.md",
    );

    expect(refs.map((ref) => `${ref.usId}->${ref.flowId}`)).toEqual([
      "US-0001->BF-0001",
      "US-0001->BF-0002",
      "US-0002->BF-0002",
    ]);
    expect(refs[0]?.specId).toBe("0007");
  });

  it("ignores a Flow line written above every story", () => {
    // The same rule `- x-qfai-status: planned` follows: a meta line belongs to
    // the block it is written in, so one above the first heading would
    // otherwise speak for the whole file.
    const refs = parseStoryFlowRefs(
      ["# 02 User Stories", "- Flow: BF-0001", "", "## US-0001: first", "- Parent: CAP-0001"].join(
        "\n",
      ),
      "0001",
      "02_User-stories.md",
    );

    expect(refs).toEqual([]);
  });
});

describe("parseTestFlowRefs", () => {
  it("reads the annotation form and deduplicates it", () => {
    expect(parseTestFlowRefs("/* QFAI:BF-0002 */\n// QFAI:BF-0001\n// QFAI:BF-0001")).toEqual([
      "BF-0001",
      "BF-0002",
    ]);
  });

  it("does not read a bare id as an annotation", () => {
    // `BF-0001` appears in prose all over a spec set. Only the annotation form
    // claims coverage.
    expect(parseTestFlowRefs("// covers BF-0001")).toEqual([]);
  });
});

describe("validateBusinessFlowTraceability", () => {
  it("says nothing about a spec set that declares no flows", async () => {
    await withProject(async (root) => {
      await seedStory(root, "0001", "US-0001", []);

      expect(await validateBusinessFlowTraceability(root, defaultConfig)).toEqual([]);
    });
  });

  it("reports a citation the flow document does not declare", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0009"]);

      const issues = await validateBusinessFlowTraceability(root, defaultConfig);
      const finding = issues.find((entry) => entry.code === "QFAI-BFLOW-005");

      expect(finding).toBeDefined();
      expect(finding?.message).toContain("US-0001");
      expect(finding?.message).toContain("BF-0009");
      expect(finding?.refs).toContain("SPEC-0001:US-0001");
    });
  });

  it("says nothing when the citation resolves", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001", "BF-0002"]);
      await seedStory(root, "0001", "US-0001", ["BF-0002"]);

      expect(await validateBusinessFlowTraceability(root, defaultConfig)).toEqual([]);
    });
  });

  it("reports a flow declared twice", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001", "BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"]);

      const issues = await validateBusinessFlowTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-BFLOW-006")).toBe(true);
    });
  });
});

describe("a flow annotation answers the stories that name the flow", () => {
  it("covers every story naming the flow with one E2E test", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"], ["US-0002"]);
      await seedE2eTest(root, "flow.test.ts", "/* QFAI:BF-0001 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(result.missing.us).toEqual([]);

      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-ATDD-111")).toBe(false);
    });
  });

  it("leaves a story that names no flow owing its own reference", async () => {
    // The obligation cannot move onto the flow, so it does not move off the
    // story either. A setting or a report legitimately has no flow.
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"], ["US-0002"], { unflowed: ["US-0002"] });
      await seedE2eTest(root, "flow.test.ts", "/* QFAI:BF-0001 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(result.missing.us).toEqual(["SPEC-0001:US-0002"]);
    });
  });

  it("credits nothing for a flow the document does not declare", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"]);
      await seedE2eTest(root, "flow.test.ts", "/* QFAI:BF-0009 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      // Not silence: the obligation the annotation was meant to answer is still
      // reported, naming the story rather than the token.
      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
    });
  });

  it("counts a flow annotation only under the e2e root", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"]);
      await seedTest(root, "integration", "flow.test.ts", "/* QFAI:BF-0001 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(result.missing.us).toEqual(["SPEC-0001:US-0001"]);
    });
  });

  it("still accepts the story annotation, so an existing tree is unchanged", async () => {
    await withProject(async (root) => {
      await seedFlows(root, ["BF-0001"]);
      await seedStory(root, "0001", "US-0001", ["BF-0001"]);
      await seedE2eTest(root, "story.test.ts", "/* QFAI:SPEC-0001:US-0001 */");

      const result = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(result.missing.us).toEqual([]);
    });
  });
});

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bflow-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedFlows(root: string, ids: string[]): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", "_policies");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "04_Business-Flow.md"),
    [
      "# 04 Business Flow",
      "",
      "## Flow Overview",
      "",
      ...ids.map((id) => `- ${id}: a flow`),
      "",
    ].join("\n"),
    "utf-8",
  );
}

/**
 * One spec with `usId` (citing `flows`) plus any `extra` stories.
 *
 * `unflowed` names the stories that get no `- Flow:` line, which is how a case
 * asks for a story on the story-grain obligation beside one on the flow grain.
 */
async function seedStory(
  root: string,
  specNumber: string,
  usId: string,
  flows: string[],
  extra: string[] = [],
  options: { unflowed?: string[] } = {},
): Promise<void> {
  const dir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Spec.md"), "# 01 Spec\n", "utf-8");

  const unflowed = new Set(options.unflowed ?? []);
  const block = (id: string): string[] => [
    `## ${id}: title`,
    "- Parent: CAP-0001",
    ...(flows.length > 0 && !unflowed.has(id) ? [`- Flow: ${flows.join(", ")}`] : []),
    "",
  ];

  await writeFile(
    path.join(dir, "02_User-stories.md"),
    ["# 02 User stories", "", ...block(usId), ...extra.flatMap(block)].join("\n"),
    "utf-8",
  );
  await writeFile(path.join(dir, "06_Test-Cases.md"), "# 06 Test cases\n", "utf-8");
}

async function seedE2eTest(root: string, fileName: string, body: string): Promise<void> {
  await seedTest(root, "e2e", fileName, body);
}

async function seedTest(
  root: string,
  kind: "e2e" | "api" | "integration",
  fileName: string,
  body: string,
): Promise<void> {
  const dir = path.join(root, "tests", kind);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, fileName),
    [body, "describe('sample', () => {", "  it('works', () => {});", "});", ""].join("\n"),
    "utf-8",
  );
}

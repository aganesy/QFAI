// QFAI:AC-0001-0194-05
// QFAI:EX-0001-0194-15

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020";
import { afterEach, expect, it } from "vitest";

import { SIGNALS, type RoutingReading } from "../../../src/core/workflow/extraction.js";
import { extractionFaults } from "../../../src/core/workflow/extractionShape.js";
import { planOf } from "../../../src/core/workflow/plan.js";
import { parsePlan } from "../../../src/core/workflow/plans.js";
import { WORKFLOW_ROUTES } from "../../../src/core/workflow/routes.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { extraction, extractionFor, ROUTED_ROUTES } from "../../helpers/workflowExtraction.js";
import { minimalProject, removeProjects } from "./workflowProject.js";

afterEach(removeProjects);

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-46
it("Procedure is an intent in each reading and never an added qualifier or field", async () => {
  const validate = await loadValidator();
  const procedure = { ...extraction({ artifacts: ["docs"] }), intent: "procedure" };
  const reading = { intent: "procedure", entryFlags: [], qualifiers: [], signals: [] };
  const samples = [
    procedure,
    { ...extraction({ confidence: "low", artifacts: ["docs"] }), alternatives: [reading] },
    { ...procedure, qualifiers: ["procedure"] },
    {
      ...extraction({ confidence: "low" }),
      alternatives: [{ ...reading, qualifiers: ["procedure"] }],
    },
    { ...procedure, procedure: true },
    { ...procedure, intent: "procedure-execute" },
  ];
  expect(
    samples.map((sample) => [validate(EXTRACTION, sample), extractionFaults(sample).length === 0]),
  ).toEqual([
    [true, true],
    [true, true],
    [false, false],
    [false, false],
    [false, false],
    [false, false],
  ]);
});

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const schemaDir = path.join(packageRoot, "assets", "schemas", "workflow");
const planDoc = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-run",
  "references",
  "plan.md",
);

const EXTRACTION = "urn:qfai:workflow:extraction";
const PLAN = "urn:qfai:workflow:plan";

async function schemaFiles(): Promise<string[]> {
  return (await readdir(schemaDir)).filter((file) => file.endsWith(".schema.json")).sort();
}

async function loadValidator() {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  for (const file of await schemaFiles()) {
    ajv.addSchema(JSON.parse(await readFile(path.join(schemaDir, file), "utf8")));
  }
  return (ref: string, value: unknown) => ajv.validate(ref, value);
}

// Each JSON example in the qfai-run plan reference, under the heading it sits beneath.
async function referenceExamples(): Promise<{ heading: string; value: unknown }[]> {
  const text = await readFile(planDoc, "utf8");
  const examples: { heading: string; value: unknown }[] = [];
  let heading = "";
  for (const block of text.split(/^```/m)) {
    const title = [...block.matchAll(/^## (.+)$/gm)].at(-1)?.[1];
    if (title) heading = title;
    if (block.startsWith("json\n")) examples.push({ heading, value: JSON.parse(block.slice(5)) });
  }
  return examples;
}

it("The two shipped schemas carry an unversioned URN and no private marker", async () => {
  const files = await schemaFiles();
  const headers = [];
  for (const file of files) {
    const text = await readFile(path.join(schemaDir, file), "utf8");
    const schema: unknown = JSON.parse(text);
    headers.push([
      Reflect.get(Object(schema), "$id"),
      Reflect.get(Object(schema), "$schema"),
      /schemaVersion|commandId|"contract"\s*:|\bv\d+\.\d+/.test(text),
    ]);
  }

  expect(headers).toEqual([
    [EXTRACTION, "https://json-schema.org/draft/2020-12/schema", false],
    [PLAN, "https://json-schema.org/draft/2020-12/schema", false],
  ]);
});

it("Every example in the qfai-run plan reference validates against its schema", async () => {
  const validate = await loadValidator();
  const examples = await referenceExamples();
  const verdicts = examples.map(({ heading, value }) => [
    heading,
    validate(heading === "Extraction" ? EXTRACTION : PLAN, value),
  ]);

  expect({
    headings: [...new Set(examples.map((example) => example.heading))],
    failing: verdicts.filter(([, valid]) => !valid),
  }).toEqual({
    headings: ["Extraction", "Plan", "Candidates", "Refusal"],
    failing: [],
  });
});

// QFAI:AC-0001-0211-02
// QFAI:EX-0001-0211-47

// QFAI:AC-0001-0211-01
it("The extraction schema and the parser accept and refuse the same extractions", async () => {
  const validate = await loadValidator();
  const reading: RoutingReading = { intent: "design", entryFlags: [], qualifiers: [], signals: [] };
  const samples = [
    extraction(),
    extraction({ intent: null }),
    extraction({ confidence: "low", alternatives: [{ ...reading, intent: "design" }] }),
    { ...extraction(), intent: "bug" },
    { ...extraction(), entryFlags: ["urgent"] },
    { ...extraction(), confidence: 0.9 },
    { ...extraction(), alternatives: [reading] },
    { ...extraction(), confidence: "low" },
    { ...extraction(), route: "add-feature" },
  ];

  expect(samples.map((sample) => validate(EXTRACTION, sample))).toEqual(
    samples.map((sample) => extractionFaults(sample).length === 0),
  );
  const cleanupReading = { ...reading, intent: "order", qualifiers: ["owned-temporary-cleanup"] };
  const mainCleanup = {
    ...extraction({ intent: "order", artifacts: [] }),
    qualifiers: ["owned-temporary-cleanup"],
  };
  const alternativeCleanup = {
    ...extraction({ confidence: "low", artifacts: [] }),
    alternatives: [cleanupReading],
  };
  const cleanupSamples = [
    mainCleanup,
    alternativeCleanup,
    { ...mainCleanup, intent: "feature" },
    { ...alternativeCleanup, alternatives: [{ ...cleanupReading, intent: "feature" }] },
    { ...mainCleanup, artifacts: ["code"] },
    { ...alternativeCleanup, artifacts: ["docs"] },
  ];
  expect(
    cleanupSamples.map((sample) => [
      validate(EXTRACTION, sample),
      extractionFaults(sample).length === 0,
    ]),
  ).toEqual([
    [true, true],
    [true, true],
    [false, false],
    [false, false],
    [false, false],
    [false, false],
  ]);

  const schema: {
    properties: { signals: { items: { enum: string[] } } };
    $defs: { reading: { properties: { signals: { items: { enum: string[] } } } } };
  } = JSON.parse(await readFile(path.join(schemaDir, "extraction.schema.json"), "utf8"));
  expect([
    schema.properties.signals.items.enum,
    schema.$defs.reading.properties.signals.items.enum,
  ]).toEqual([SIGNALS, SIGNALS]);

  for (const signal of SIGNALS) {
    const primary = extraction({ signals: [signal] });
    const alternative = extraction({
      confidence: "low",
      alternatives: [{ ...reading, signals: [signal] }],
    });
    expect(
      [
        validate(EXTRACTION, primary),
        extractionFaults(primary),
        validate(EXTRACTION, alternative),
        extractionFaults(alternative),
      ],
      `registered signal ${signal} is valid in each reading`,
    ).toEqual([true, [], true, []]);
  }

  for (const { sample, field } of [
    { sample: { ...extraction(), signals: ["unregistered-signal"] }, field: "signals[0]" },
    {
      sample: {
        ...extraction({ confidence: "low" }),
        alternatives: [{ ...reading, signals: ["unregistered-signal"] }],
      },
      field: "alternatives[0].signals[0]",
    },
  ]) {
    expect([validate(EXTRACTION, sample), extractionFaults(sample)], field).toEqual([
      false,
      [field],
    ]);
  }
});

// QFAI:EX-0001-0211-55
it("The extraction schema and the parser hold meaning-preserving to a stale record or an order that names artifacts", async () => {
  const validate = await loadValidator();
  const preserving = {
    ...extraction({ intent: "stale-record", artifacts: ["spec"] }),
    qualifiers: ["meaning-preserving"],
  };
  const preservingReading = {
    intent: "order",
    entryFlags: [],
    qualifiers: ["meaning-preserving"],
    signals: [],
  };
  const alternative = {
    ...extraction({ intent: "stale-record", confidence: "low", artifacts: ["spec"] }),
    alternatives: [preservingReading],
  };
  const samples = [
    preserving,
    { ...preserving, intent: "order" },
    alternative,
    { ...preserving, intent: "docs" },
    { ...preserving, artifacts: [] },
    { ...alternative, alternatives: [{ ...preservingReading, intent: "refactor" }] },
    { ...alternative, artifacts: [] },
  ];
  expect(samples.map((sample) => [validate(EXTRACTION, sample), extractionFaults(sample)])).toEqual(
    [
      [true, []],
      [true, []],
      [true, []],
      [false, ["intent"]],
      [false, ["artifacts"]],
      [false, ["alternatives[0].intent"]],
      [false, ["artifacts"]],
    ],
  );
});

it("The plan of every route validates against the plan schema", async () => {
  const validate = await loadValidator();
  const root = await minimalProject();
  const failing: string[] = [];
  for (const route of WORKFLOW_ROUTES) {
    const document = await planOf(root, { route });
    if (!document.ok || !validate(PLAN, document)) failing.push(route);
  }

  expect(failing).toEqual([]);
});

// QFAI:EX-0001-0229-01
// QFAI:EX-0001-0229-09
it("A plan from an extraction and its candidates validate with their scopes", async () => {
  const validate = await loadValidator();
  const root = await minimalProject();
  const reading = { entryFlags: [], qualifiers: [], signals: [] };
  const documents = await Promise.all([
    planOf(root, {
      extraction: extraction({ qualifiers: ["visual-open"], artifacts: ["spec", "ui"] }),
    }),
    planOf(root, {
      extraction: extraction({
        confidence: "low",
        alternatives: [{ ...reading, intent: "design" }],
      }),
    }),
  ]);

  expect(
    documents.map((document) => [
      Object.hasOwn(document, "scopes") || Object.hasOwn(document, "candidates"),
      validate(PLAN, document),
    ]),
  ).toEqual([
    [true, true],
    [true, true],
  ]);
});

// QFAI:EX-0001-0229-01
it("The plan schema refuses scopes whose recommendation is not the narrowest alone", async () => {
  const validate = await loadValidator();
  const root = await minimalProject();
  const document = await planOf(root, {
    extraction: extraction({ qualifiers: ["visual-open"], artifacts: ["spec", "ui"] }),
  });
  const scopes = Reflect.get(Object(document), "scopes");
  const list = Array.isArray(scopes) ? scopes : [];
  const flipped = list.map((each, index) => ({ ...each, recommended: index === 1 }));
  const twice = list.map((each) => ({ ...each, recommended: true }));

  expect([
    validate(PLAN, document),
    validate(PLAN, { ...document, scopes: flipped }),
    validate(PLAN, { ...document, scopes: twice }),
  ]).toEqual([true, false, false]);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-46
it("Only documentation kind may own the procedure step", () => {
  const text = [
    "route: write-procedure",
    "family: change",
    "stages:",
    "  - id: documentation",
    "    kind: documentation",
    "    steps: [implement-procedure]",
    "  - id: note",
    "    kind: verify",
    "    steps: [{ step: verify-change-note, passThrough: true }]",
    "    after: [documentation]",
    "    review: code",
    "  - id: verify",
    "    kind: verify",
    "    steps: [verify-qfai-gate, verify-repo-gate, verify-commit]",
    "    after: [note]",
    "decisionPoints: []",
    "branchPoints: []",
    "",
  ].join("\n");
  const loaded = parsePlan(text, "write-procedure");
  expect(loaded.ok).toBe(true);
  const mismatched = parsePlan(
    text.replace("kind: documentation", "kind: implement"),
    "write-procedure",
  );
  expect(mismatched.ok).toBe(false);
  if (mismatched.ok) throw new Error("The procedure step accepted implementation kind.");
  expect(mismatched.refusals).toContainEqual({
    route: "write-procedure",
    reason: "kind-mismatch",
    subject: "documentation",
  });
});

// QFAI:EX-0001-0222-19
it("The extraction schema and the parser accept and refuse the same flows", async () => {
  const validate = await loadValidator();
  const lists: unknown[] = [
    ["BF-0001"],
    ["BF-0003", "BF-0001"],
    [],
    ["BF-0001", "BF-0001"],
    ["flow-1"],
    ["BF-001"],
    [1],
    "BF-0001",
  ];
  const samples = lists.map((flows) => ({ ...extraction(), flows }));

  expect(samples.map((sample) => [validate(EXTRACTION, sample), extractionFaults(sample)])).toEqual(
    [
      [true, []],
      [true, []],
      [false, ["flows"]],
      [false, ["flows"]],
      [false, ["flows[0]"]],
      [false, ["flows[0]"]],
      [false, ["flows[0]"]],
      [false, ["flows"]],
    ],
  );
});

// QFAI:EX-0001-0222-18
it("Every routed plan gives work orders to its implement stages alone and otherwise stays the same", async () => {
  const validate = await loadValidator();
  const root = await minimalProject();
  const drop = (key: string, value: unknown) => (key === "workOrders" ? undefined : value);
  const expected = JSON.stringify([{ target: "BF-0001" }, { target: "BF-0002" }]);
  const faults: string[] = [];
  let expanded = 0;
  for (const route of ROUTED_ROUTES) {
    const document = await planOf(root, {
      extraction: extractionFor(route, { flows: ["BF-0002", "BF-0001"] }),
    });
    const plain = await planOf(root, { extraction: extractionFor(route) });
    if (JSON.stringify(document, drop) !== JSON.stringify(plain)) faults.push(`${route}: changed`);
    if (!validate(PLAN, document)) faults.push(`${route}: invalid`);
    const stages = "stages" in document ? document.stages : [];
    for (const stage of stages) {
      const orders = stage.workOrders === undefined ? undefined : JSON.stringify(stage.workOrders);
      if (orders !== (stage.kind === "implement" ? expected : undefined)) {
        faults.push(`${route}: ${stage.id}`);
      }
      if (orders !== undefined) expanded += 1;
    }
  }

  expect({ faults, expanded: expanded > 0 }).toEqual({ faults: [], expanded: true });
});

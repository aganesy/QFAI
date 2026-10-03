// QFAI:AC-0001-0194-05
// QFAI:EX-0001-0194-15

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020";
import { afterEach, expect, it } from "vitest";

import { extractionFaults } from "../../../src/core/workflow/extractionShape.js";
import { planOf } from "../../../src/core/workflow/plan.js";
import { WORKFLOW_ROUTES } from "../../../src/core/workflow/routes.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { minimalProject, removeProjects } from "./workflowProject.js";

afterEach(removeProjects);

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

it("The extraction schema and the parser accept and refuse the same extractions", async () => {
  const validate = await loadValidator();
  const reading = { intent: "design", entryFlags: [], qualifiers: [], signals: [] };
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

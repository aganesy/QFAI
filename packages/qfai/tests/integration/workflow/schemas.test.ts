// QFAI:AC-0001-0201-05
// QFAI:EX-0001-0201-19

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020";
import { expect, it } from "vitest";

import {
  parseMeasurement,
  parseQuestionInput,
  parseRouteReferences,
  stageResultRefusals,
} from "../../../src/core/workflow/parse.js";
import { stageResultVariants } from "./stageResultVariants.js";
import { workOrderDocument } from "../../../src/core/workflow/decide.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const schemaDir = path.join(packageRoot, "assets", "schemas", "workflow");
const payloadsDoc = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-run",
  "references",
  "payloads.md",
);

// Strict, with formats left to the parser, which owns timestamp checks.
async function loadValidator() {
  const ajv = new Ajv2020({ strict: true, validateFormats: false, allErrors: true });
  const files = (await readdir(schemaDir)).filter((file) => file.endsWith(".schema.json"));
  for (const file of files)
    ajv.addSchema(JSON.parse(await readFile(path.join(schemaDir, file), "utf8")));
  for (const file of files) ajv.getSchema(`urn:qfai:workflow:${file.replace(".schema.json", "")}`);
  return (ref: string, payload: unknown) => ajv.validate(ref, payload);
}

// Each JSON example in the qfai-run payload reference, under the heading it sits beneath.
async function payloadExamples(): Promise<{ heading: string; payload: unknown }[]> {
  const text = await readFile(payloadsDoc, "utf8");
  const examples: { heading: string; payload: unknown }[] = [];
  let heading = "";
  for (const block of text.split(/^```/m)) {
    const title = [...block.matchAll(/^## (.+)$/gm)].at(-1)?.[1];
    if (title) heading = title;
    if (block.startsWith("json\n")) examples.push({ heading, payload: JSON.parse(block.slice(5)) });
  }
  return examples;
}

function routingResult(examples: { heading: string; payload: unknown }[]) {
  const found = examples.find((example) => example.heading === "Routing result")?.payload;
  if (typeof found !== "object" || found === null || !("proposal" in found)) {
    throw new Error("The payload reference carries no routing result example.");
  }
  return { result: found, proposal: found.proposal };
}

const PROPOSAL = "urn:qfai:workflow:route-proposal";
const QUESTION = `${PROPOSAL}#/$defs/question`;
const RESULT = "urn:qfai:workflow:stage-result";
const MEASUREMENT = `${RESULT}#/properties/measurement`;
const WORK_ORDER = "urn:qfai:workflow:work-order";

const measurement = {
  inputTokens: 1200,
  outputTokens: 300,
  cachedTokens: null,
  subAgentTokens: 4000,
  toolDefinitionBytes: null,
  referenceBytesRead: 5120,
  wallClockMs: 61000,
  questionsPut: 0,
  reworkCount: 0,
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A proposal with one reference entry replaced, for the reference shape cases.
function withReference(proposal: unknown, field: string, entry: unknown) {
  return { ...(typeof proposal === "object" ? proposal : {}), [field]: [entry] };
}

it("Validate every payload example and fixture with the parser and with the five schemas", async () => {
  const validate = await loadValidator();
  const examples = await payloadExamples();
  const { result, proposal } = routingResult(examples);
  const question = examples.find((example) => example.heading === "Question input")?.payload;
  const cases: { name: string; schema: string; payload: unknown; parser: boolean }[] = [
    ...stageResultVariants(result).map(({ name, payload }) => ({
      name,
      schema: RESULT,
      payload,
      parser: isRecordLike(payload) && stageResultRefusals(payload).length === 0,
    })),
    {
      name: "proposal",
      schema: PROPOSAL,
      payload: proposal,
      parser: parseRouteReferences(proposal).ok,
    },
    {
      name: "question",
      schema: QUESTION,
      payload: question,
      parser: parseQuestionInput(question) !== undefined,
    },
    {
      name: "measurement",
      schema: MEASUREMENT,
      payload: measurement,
      parser: parseMeasurement(measurement).ok,
    },
  ];
  const shapeCases: [string, string, unknown][] = [
    ["legacy string", "expectedBehaviorRefs", "BF-0002"],
    ["unknown kind", "expectedBehaviorRefs", { kind: "ticket", ref: "T-1" }],
    [
      "observed kind in the normative array",
      "expectedBehaviorRefs",
      { kind: "evidence", ref: "a.log" },
    ],
    ["normative kind in the observed array", "observedRefs", { kind: "flow-id", ref: "BF-0002" }],
    ["empty ref", "observedRefs", { kind: "path", ref: "" }],
    ["missing ref", "observedRefs", { kind: "path" }],
  ];
  for (const [name, field, entry] of shapeCases) {
    const payload = withReference(proposal, field, entry);
    cases.push({ name, schema: PROPOSAL, payload, parser: parseRouteReferences(payload).ok });
  }
  const unmeasured = { ...measurement, wallClockMs: undefined };
  cases.push({
    name: "measurement missing a field",
    schema: MEASUREMENT,
    payload: JSON.parse(JSON.stringify(unmeasured)),
    parser: parseMeasurement(JSON.parse(JSON.stringify(unmeasured))).ok,
  });

  const disagreements = cases
    .filter((entry) => validate(entry.schema, entry.payload) !== entry.parser)
    .map((entry) => entry.name);

  expect({
    examples: examples.map((example) => example.heading),
    accepted: cases.filter((entry) => entry.parser).map((entry) => entry.name),
    disagreements,
  }).toEqual({
    examples: ["Start input", "Routing result", "Question input", "Decision input"],
    accepted: [
      "routing result",
      "stage result with a flowless debt",
      "stage result measured with nulls",
      "proposal",
      "question",
      "measurement",
    ],
    disagreements: [],
  });
});

it("A planted payload with an unknown key", async () => {
  const validate = await loadValidator();
  const { proposal } = routingResult(await payloadExamples());
  const reference = withReference(proposal, "observedRefs", {
    kind: "path",
    ref: "src/checkout/total.ts",
    note: "added by hand",
  });
  const extraMeasure = { ...measurement, gpuSeconds: 3 };

  expect({
    reference: [parseRouteReferences(reference).ok, validate(PROPOSAL, reference)],
    measurement: [parseMeasurement(extraMeasure).ok, validate(MEASUREMENT, extraMeasure)],
  }).toEqual({ reference: [false, false], measurement: [false, false] });
});

it("A work order carries a target unless it binds no flow and no new story", async () => {
  const validate = await loadValidator();
  const order = (stageKind: string, target?: { kind: "flow"; flowId: string }) =>
    workOrderDocument("run-20260925000000000", 3, {
      workOrderId: `work-order-${stageKind}-1`,
      stageInstanceId: stageKind,
      attempt: 1,
      stageKind,
      executor: { skill: "qfai-run" },
      operation: stageKind,
      ...(target ? { target } : {}),
    });
  const flow = { kind: "flow" as const, flowId: "BF-0001" };

  expect({
    route: validate(WORK_ORDER, order("route")),
    discussion: validate(WORK_ORDER, order("discussion")),
    maintenance: validate(WORK_ORDER, order("maintenance")),
    verify: validate(WORK_ORDER, order("verify")),
    implementWithTarget: validate(WORK_ORDER, order("implement", flow)),
    implementWithout: validate(WORK_ORDER, order("implement")),
    maintenanceWithTarget: validate(WORK_ORDER, order("maintenance", flow)),
    verifyWithTarget: validate(WORK_ORDER, order("verify", flow)),
  }).toEqual({
    route: true,
    discussion: true,
    maintenance: true,
    verify: true,
    implementWithTarget: true,
    implementWithout: false,
    maintenanceWithTarget: false,
    verifyWithTarget: false,
  });
});

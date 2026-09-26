// The shapes of the payloads `accept` takes, held field for field to the shipped JSON Schemas in
// `assets/schemas/workflow/`: every required field present, every field of its type, and no key
// a schema does not declare. What a payload means is the decision function's to judge.

type Shape =
  | { kind: "string"; minLength?: number; pattern?: RegExp }
  | { kind: "integer"; minimum: number }
  | { kind: "number" }
  | { kind: "null" }
  | { kind: "enum"; values: readonly (string | null)[] }
  | { kind: "array"; items: Shape; minItems?: number }
  | { kind: "boolean" }
  | {
      kind: "object";
      fields: Record<string, Shape>;
      required: readonly string[];
      // A rule over the whole object that the field shapes cannot state.
      holds?: (value: Record<string, unknown>) => boolean;
    }
  | { kind: "anyOf"; options: readonly Shape[] };

const text: Shape = { kind: "string", minLength: 1 };
const anyText: Shape = { kind: "string" };
const nullable = (shape: Shape): Shape => ({ kind: "anyOf", options: [shape, { kind: "null" }] });
const list = (items: Shape, minItems?: number): Shape => ({
  kind: "array",
  items,
  ...(minItems !== undefined ? { minItems } : {}),
});
const oneOf = (...values: (string | null)[]): Shape => ({ kind: "enum", values });
const object = (
  fields: Record<string, Shape>,
  required: readonly string[] = [],
  holds?: (value: Record<string, unknown>) => boolean,
): Shape => ({ kind: "object", fields, required, ...(holds ? { holds } : {}) });
const everyField = (fields: Record<string, Shape>): Shape => object(fields, Object.keys(fields));

const FLOW_ID: Shape = { kind: "string", pattern: /^BF-\d{4}$/ };
const EFFECT = oneOf("proceed", "replan", "stop");

// A question input. A fact question carries no recommendation.
const QUESTION = object(
  {
    kind: oneOf("decision", "fact"),
    text,
    options: list(everyField({ optionId: text, label: text, description: text, effect: EFFECT })),
    selection: everyField({
      min: { kind: "integer", minimum: 1 },
      max: { kind: "integer", minimum: 1 },
    }),
    recommendation: text,
    effect: EFFECT,
  },
  ["kind", "text"],
  (value) => value.kind !== "fact" || value.recommendation === undefined,
);

const reference = (...kinds: string[]) => everyField({ kind: oneOf(...kinds), ref: text });

export const DECISION_INPUT = object({
  questionId: text,
  answer: object({ optionIds: list(text), value: anyText }),
  answeredBy: text,
  expectedSequence: { kind: "integer", minimum: 0 },
  stop: { kind: "boolean" },
});

export const ROUTE_PROPOSAL = object(
  {
    requestKind: oneOf(
      "change",
      "read_only",
      "plan_only",
      "verify_only",
      "resume",
      "cancel",
      "explicit_stage",
    ),
    candidateRoute: oneOf("direct", "bugfix", "bounded-change", "feature", "discovery", null),
    goal: text,
    expectedBehaviorRefs: list(reference("request", "flow-id", "contract-id", "path")),
    observedRefs: list(reference("path", "evidence")),
    affectedFlowIds: list(FLOW_ID),
    riskSignals: list(
      oneOf(
        "data-loss",
        "breaking-public-contract",
        "authorization-loosened",
        "authorization-restored",
        "secret-egress",
        "production-effect",
        "requirement-dropped",
        "out-of-scope-work",
      ),
    ),
    unresolvedQuestions: list(QUESTION),
    newStories: list(
      everyField({
        goal: text,
        covers: list(anyText),
        excludes: list(anyText),
        evidence: list(text, 1),
        flowId: nullable(FLOW_ID),
      }),
    ),
    proposedWriteScope: list(text),
    protectedTargets: list(text),
    requiredStages: list(text),
    rationale: text,
    confidence: { kind: "number" },
  },
  [
    "requestKind",
    "candidateRoute",
    "goal",
    "expectedBehaviorRefs",
    "observedRefs",
    "affectedFlowIds",
    "riskSignals",
    "unresolvedQuestions",
    "newStories",
    "proposedWriteScope",
    "protectedTargets",
    "requiredStages",
    "rationale",
  ],
);

const FILE_REF = everyField({ path: text, digest: text });
const CITED = everyField({ ids: list(text), digest: text });
const MEASURED = nullable({ kind: "number" });

export const STAGE_RESULT = object(
  {
    resultId: { kind: "string", pattern: /^[A-Za-z0-9._-]{1,64}$/ },
    workOrderId: text,
    stageInstanceId: text,
    attempt: { kind: "integer", minimum: 1 },
    expectedSequence: { kind: "integer", minimum: 0 },
    outcome: oneOf(
      "accepted",
      "accepted_with_debt",
      "needs_repair",
      "awaiting_input",
      "blocked",
      "unrun",
    ),
    testObservation: oneOf("pass", "expected_red", "fail", "unrun", "not_applicable"),
    actor: everyField({ agentInstance: text }),
    changedFiles: list(FILE_REF),
    artifactRefs: list(FILE_REF),
    gateResults: list(everyField({ gateId: text, verdict: text })),
    reviewResults: list(
      everyField({ role: text, agentInstance: text, verdict: text, reportRef: text }),
    ),
    debts: list(
      everyField({
        findingCode: text,
        path: text,
        cause: text,
        owningFlow: nullable(text),
        detectingCommand: text,
        resolvingOwner: text,
        blockingExtent: text,
      }),
    ),
    questions: list(QUESTION),
    notRun: {
      kind: "anyOf",
      options: [
        everyField({ kind: oneOf("not_applicable"), reason: text }),
        everyField({ kind: oneOf("reused"), receiptRef: text }),
      ],
    },
    red: everyField({
      testId: text,
      failureKind: oneOf("assertion", "collection", "import", "startup", "timeout"),
    }),
    seam: everyField({ targetTestId: text, observation: text }),
    seamRequest: everyField({ targetTestId: text }),
    testFix: everyField({ citedBefore: CITED, citedAfter: CITED, reviewRef: text, rerunRef: text }),
    regressionFix: everyField({ testId: text, rerunRef: text, reviewRef: text }),
    diagnosis: everyField({
      verdict: oneOf("missing-test", "defective-test", "regression", "expectation-differs"),
      reproductionRef: text,
      matchedIds: list({
        kind: "string",
        pattern: /^(BF-\d{4}|AC-\d{4}-\d{4}-\d{2}|EX-\d{4}-\d{4}-\d{2})$/,
      }),
    }),
    bindings: list(
      everyField({
        slotId: text,
        flowId: FLOW_ID,
        storyIds: list({ kind: "string", pattern: /^US-\d{4}-\d{4}$/ }),
      }),
    ),
    delegation: everyField({
      status: oneOf("saturated", "unavailable"),
      attempt: { kind: "integer", minimum: 1 },
    }),
    measurement: everyField({
      inputTokens: MEASURED,
      outputTokens: MEASURED,
      cachedTokens: MEASURED,
      subAgentTokens: MEASURED,
      toolDefinitionBytes: MEASURED,
      referenceBytesRead: MEASURED,
      wallClockMs: MEASURED,
      questionsPut: MEASURED,
      reworkCount: MEASURED,
    }),
    proposal: ROUTE_PROPOSAL,
  },
  [
    "resultId",
    "workOrderId",
    "stageInstanceId",
    "attempt",
    "expectedSequence",
    "outcome",
    "testObservation",
    "actor",
  ],
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The subject of each place `value` departs from `shape`, as a dotted path from `at`.
export function shapeFaults(value: unknown, shape: Shape, at: string): string[] {
  switch (shape.kind) {
    case "string":
      return typeof value === "string" &&
        value.length >= (shape.minLength ?? 0) &&
        (!shape.pattern || shape.pattern.test(value))
        ? []
        : [at];
    case "integer":
      return Number.isInteger(value) && typeof value === "number" && value >= shape.minimum
        ? []
        : [at];
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? [] : [at];
    case "null":
      return value === null ? [] : [at];
    case "boolean":
      return typeof value === "boolean" ? [] : [at];
    case "enum":
      return shape.values.some((allowed) => allowed === value) ? [] : [at];
    case "anyOf":
      return shape.options.some((option) => shapeFaults(value, option, at).length === 0)
        ? []
        : [at];
    case "array":
      return arrayFaults(value, shape, at);
    case "object":
      return objectFaults(value, shape, at);
  }
}

function arrayFaults(value: unknown, shape: { items: Shape; minItems?: number }, at: string) {
  if (!Array.isArray(value) || value.length < (shape.minItems ?? 0)) return [at];
  return value.flatMap((item: unknown, index) => shapeFaults(item, shape.items, `${at}[${index}]`));
}

function objectFaults(
  value: unknown,
  shape: Extract<Shape, { kind: "object" }>,
  at: string,
): string[] {
  if (!isPlainObject(value)) return [at];
  if (shape.holds && !shape.holds(value)) return [at];
  const within = (name: string) => (at ? `${at}.${name}` : name);
  const missing = shape.required.filter((name) => value[name] === undefined).map(within);
  const unknown = Object.keys(value)
    .filter((name) => !Object.hasOwn(shape.fields, name))
    .map(within);
  const wrong = Object.entries(value).flatMap(([name, field]) => {
    const fieldShape = shape.fields[name];
    return fieldShape && field !== undefined ? shapeFaults(field, fieldShape, within(name)) : [];
  });
  return [...missing, ...unknown, ...wrong];
}

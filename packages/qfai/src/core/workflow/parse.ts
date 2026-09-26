import { DECISION_INPUT, shapeFaults, STAGE_RESULT } from "./payloadShapes.js";
import type { InputRefusal } from "./types.js";

export type NormativeReferenceKind = "request" | "flow-id" | "contract-id" | "path";
export type ObservedReferenceKind = "path" | "evidence";

export interface RouteReference<Kind extends string> {
  kind: Kind;
  ref: string;
}

export type ParsedRouteReferences =
  | {
      ok: true;
      expectedBehaviorRefs: RouteReference<NormativeReferenceKind>[];
      observedRefs: RouteReference<ObservedReferenceKind>[];
    }
  | {
      ok: false;
      error: {
        code: "invalid-input";
        message: string;
        reasons: { reason: "schema"; subject: string }[];
      };
    };

const NORMATIVE_KINDS: readonly NormativeReferenceKind[] = [
  "request",
  "flow-id",
  "contract-id",
  "path",
];
const OBSERVED_KINDS: readonly ObservedReferenceKind[] = ["path", "evidence"];

function isReference<Kind extends string>(
  entry: unknown,
  kinds: readonly Kind[],
): entry is RouteReference<Kind> {
  if (typeof entry !== "object" || entry === null || Object.keys(entry).length !== 2) return false;
  if (!("kind" in entry) || !("ref" in entry)) return false;
  const { kind, ref } = entry;
  return kinds.some((allowed) => allowed === kind) && typeof ref === "string" && ref.length > 0;
}

function parseField<Kind extends string>(
  proposal: unknown,
  name: string,
  kinds: readonly Kind[],
): { references: RouteReference<Kind>[]; invalid: string[] } {
  const value: unknown =
    typeof proposal === "object" && proposal !== null ? Reflect.get(proposal, name) : undefined;
  if (!Array.isArray(value)) return { references: [], invalid: [name] };
  const references: RouteReference<Kind>[] = [];
  const invalid: string[] = [];
  value.forEach((entry: unknown, index) => {
    if (isReference(entry, kinds)) references.push(entry);
    else invalid.push(`${name}[${index}]`);
  });
  return { references, invalid };
}

// SIMPLIFIED: checks the entry shape and the closed kinds, not the syntax of a path ref.
// Lift when: the glob and root-escape rules for path and evidence refs get a test case.
export function parseRouteReferences(proposal: unknown): ParsedRouteReferences {
  const normative = parseField(proposal, "expectedBehaviorRefs", NORMATIVE_KINDS);
  const observed = parseField(proposal, "observedRefs", OBSERVED_KINDS);
  const invalid = [...normative.invalid, ...observed.invalid];
  if (invalid.length > 0) {
    return {
      ok: false,
      error: {
        code: "invalid-input",
        message: "A route reference is not a { kind, ref } entry of an allowed kind.",
        reasons: invalid.map((subject) => ({ reason: "schema", subject })),
      },
    };
  }
  return {
    ok: true,
    expectedBehaviorRefs: normative.references,
    observedRefs: observed.references,
  };
}

export type QuestionEffect = "proceed" | "replan" | "stop";

export interface QuestionOption {
  optionId: string;
  label: string;
  description: string;
  effect: QuestionEffect;
}

export interface DecisionQuestionInput {
  kind: "decision";
  text: string;
  options: QuestionOption[];
  selection: { min: number; max: number };
  recommendation?: string;
}

// A fact is asked as a value: it offers no options and carries no recommendation.
export interface FactQuestionInput {
  kind: "fact";
  text: string;
  options: QuestionOption[];
  effect: QuestionEffect;
}

function isEffect(value: unknown): value is QuestionEffect {
  return value === "proceed" || value === "replan" || value === "stop";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOption(value: unknown): QuestionOption | undefined {
  if (!isRecord(value)) return undefined;
  const { optionId, label, description, effect } = value;
  if (typeof optionId !== "string" || !optionId || typeof label !== "string" || !label) {
    return undefined;
  }
  if (typeof description !== "string" || !description) return undefined;
  if (!isEffect(effect)) return undefined;
  return { optionId, label, description, effect };
}

// SIMPLIFIED: a fact question is read as a value request; a fact offering candidates is not read.
// Lift when: a routing or stage result asks for a fact whose candidates can be listed.
function parseFactQuestion(value: Record<string, unknown>): FactQuestionInput | undefined {
  const { text, effect } = value;
  if (typeof text !== "string" || !text.trim() || !isEffect(effect)) return undefined;
  if (value.options !== undefined || value.recommendation !== undefined) return undefined;
  return { kind: "fact", text, options: [], effect };
}

export function parseQuestionInput(
  value: unknown,
): DecisionQuestionInput | FactQuestionInput | undefined {
  if (isRecord(value) && value.kind === "fact") return parseFactQuestion(value);
  return parseDecisionQuestion(value);
}

function parseDecisionQuestion(value: unknown): DecisionQuestionInput | undefined {
  if (!isRecord(value) || value.kind !== "decision") return undefined;
  const { text, options, selection, recommendation } = value;
  if (typeof text !== "string" || !text.trim() || !Array.isArray(options)) return undefined;
  const parsed = options.flatMap((option: unknown) => parseOption(option) ?? []);
  if (parsed.length === 0 || parsed.length !== options.length || !isRecord(selection)) {
    return undefined;
  }
  const { min, max } = selection;
  if (!Number.isInteger(min) || !Number.isInteger(max)) return undefined;
  if (typeof min !== "number" || typeof max !== "number" || min < 1 || max < min) return undefined;
  if (max > parsed.length) return undefined;
  if (
    recommendation !== undefined &&
    !parsed.some((option) => option.optionId === recommendation)
  ) {
    return undefined;
  }
  return {
    kind: "decision",
    text,
    options: parsed,
    selection: { min, max },
    ...(typeof recommendation === "string" ? { recommendation } : {}),
  };
}

// Each field is a number, or `null` where the host exposes nothing; never `0` in its place.
const MEASUREMENT_FIELDS = [
  "inputTokens",
  "outputTokens",
  "cachedTokens",
  "subAgentTokens",
  "toolDefinitionBytes",
  "referenceBytesRead",
  "wallClockMs",
  "questionsPut",
  "reworkCount",
] as const;

export type WorkflowMeasurement = Record<(typeof MEASUREMENT_FIELDS)[number], number | null>;

export type ParsedMeasurement =
  { ok: true; measurement: WorkflowMeasurement } | { ok: false; subjects: string[] };

function isMeasured(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function measurementSubjects(value: Record<string, unknown>): string[] {
  const known: readonly string[] = MEASUREMENT_FIELDS;
  return [
    ...MEASUREMENT_FIELDS.filter(
      (field) => !Object.hasOwn(value, field) || !isMeasured(value[field]),
    ),
    ...Object.keys(value).filter((key) => !known.includes(key)),
  ].map((field) => `measurement.${field}`);
}

function isMeasurement(value: unknown): value is WorkflowMeasurement {
  return isRecord(value) && measurementSubjects(value).length === 0;
}

/** Requires every field and no other, each a number or `null`, and keeps the values as submitted. */
export function parseMeasurement(value: unknown): ParsedMeasurement {
  if (isMeasurement(value)) return { ok: true, measurement: value };
  return { ok: false, subjects: isRecord(value) ? measurementSubjects(value) : ["measurement"] };
}

type SchemaReason = { reason: "schema"; subject: string };

// The fields named here, each of the type given, and nothing the input cannot carry.
function fieldRefusals(
  value: Record<string, unknown>,
  fields: Record<string, "string" | "number" | "boolean" | "object">,
  required: readonly string[],
  closed: boolean,
): SchemaReason[] {
  const wrong = Object.entries(fields).filter(([name, type]) => {
    const field = value[name];
    if (field === undefined) return required.includes(name);
    return type === "object" ? !isRecord(field) : typeof field !== type;
  });
  const unknown = closed ? Object.keys(value).filter((name) => !(name in fields)) : [];
  return [...wrong.map(([name]) => name), ...unknown].map((subject) => ({
    reason: "schema",
    subject,
  }));
}

const AUTHORIZATION_KINDS: unknown[] = ["request_scope", "human_decision", "project_policy"];

// Only the core records an authorization. One a payload carries is refused, and one of a kind
// the core never records, such as one derived from a mode or a confidence value, says so.
export function carriedAuthorization(payload: { approved?: unknown; authorization?: unknown }) {
  const refusals: InputRefusal[] = [];
  const { approved, authorization } = payload;
  if (approved !== undefined) refusals.push({ reason: "schema", subject: "approved" });
  if (authorization !== undefined) {
    const kind = isRecord(authorization) ? authorization.kind : undefined;
    const reason = AUTHORIZATION_KINDS.includes(kind) ? "schema" : "authorization-kind";
    refusals.push({ reason, subject: "authorization" });
  }
  return refusals;
}

const schemaFaults = (subjects: readonly string[]): SchemaReason[] =>
  subjects.map((subject) => ({ reason: "schema", subject: subject || "payload" }));

// A stage result is closed and complete: every field the stage-result schema requires, each of
// its shape, and no key it does not declare. An authorization it tries to carry is named apart.
export function stageResultRefusals(value: Record<string, unknown>): InputRefusal[] {
  const { approved: _approved, authorization: _authorization, ...rest } = value;
  return [...carriedAuthorization(value), ...schemaFaults(shapeFaults(rest, STAGE_RESULT, ""))];
}

// A decision input holds its own fields, each of its shape, and no other.
export function decisionInputRefusals(value: Record<string, unknown>): SchemaReason[] {
  return schemaFaults(shapeFaults(value, DECISION_INPUT, ""));
}

const START_FIELDS = { request: "object", completionTarget: "string", harness: "object" } as const;

// A start input's own fields; a field it may not carry is the decision function's refusal.
export function startInputRefusals(value: Record<string, unknown>): SchemaReason[] {
  return fieldRefusals(value, START_FIELDS, ["request", "harness"], false);
}

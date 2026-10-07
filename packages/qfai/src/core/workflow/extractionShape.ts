// The shape of the extraction `plan` reads, held field for field to the shipped JSON Schema in
// `assets/schemas/workflow/extraction.schema.json`: every required field present, every field of
// its type, and no key the schema does not declare.

import {
  alternativesFit,
  ARTIFACTS,
  CONFIDENCES,
  ENTRY_FLAGS,
  INTENTS,
  QUALIFIERS,
  RISKS,
  SIGNALS,
  type WorkflowExtraction,
} from "./extraction.js";
import { isRecord } from "./parse.js";

type Shape =
  | { kind: "enum"; values: readonly (string | null)[] }
  | { kind: "array"; items: Shape }
  | {
      kind: "object";
      fields: Record<string, Shape>;
      required: readonly string[];
      // A rule over the whole object that the field shapes cannot state, the field a failure
      // names, and what the failure says.
      holds?: (value: Record<string, unknown>) => boolean;
      holdsField?: string;
      holdsCause?: string;
    };

// A place that departs from the shape. The cause starts with how: `missing` for a required field
// that is absent, `unknown` for a key the shape does not declare, `wrong-type` for a value of
// another type, `wrong-value` for a value outside its vocabulary and `invalid` for a rule over
// the whole object.
export interface ShapeFault {
  subject: string;
  cause: string;
}

const list = (items: Shape): Shape => ({ kind: "array", items });
const oneOf = (...values: (string | null)[]): Shape => ({ kind: "enum", values });

// One reading of the request, each field from its closed vocabulary.
const READING_FIELDS = {
  intent: oneOf(...INTENTS, null),
  entryFlags: list(oneOf(...ENTRY_FLAGS)),
  qualifiers: list(oneOf(...QUALIFIERS)),
  signals: list(oneOf(...SIGNALS)),
};

// The facts the decision rules read. Alternatives are required at `low`, allowed at `medium`
// and refused at `high`.
const EXTRACTION: Shape = {
  kind: "object",
  fields: {
    ...READING_FIELDS,
    risks: list(oneOf(...RISKS)),
    artifacts: list(oneOf(...ARTIFACTS)),
    confidence: oneOf(...CONFIDENCES),
    alternatives: list({
      kind: "object",
      fields: READING_FIELDS,
      required: Object.keys(READING_FIELDS),
    }),
  },
  required: [...Object.keys(READING_FIELDS), "risks", "artifacts", "confidence"],
  holds: (value) => alternativesFit(value.confidence, value.alternatives),
  holdsField: "alternatives",
  holdsCause:
    "alternatives are required at confidence low, allowed at medium and refused at high, and hold one or two readings",
};

// Each place `value` departs from the extraction's shape, none for an extraction.
export function extractionFaultsOf(value: unknown): ShapeFault[] {
  return shapeFaults(value, EXTRACTION, "");
}

// The subject of each of those places.
export function extractionFaults(value: unknown): string[] {
  return extractionFaultsOf(value).map((fault) => fault.subject);
}

export function isExtraction(value: unknown): value is WorkflowExtraction {
  return extractionFaultsOf(value).length === 0;
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

// The received side of a `wrong-value` cause: a string or a number as written, any other value
// by its type.
function receivedOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? JSON.stringify(value)
    : typeOf(value);
}

// Each place `value` departs from `shape`, its subject a dotted path from `at`.
function shapeFaults(value: unknown, shape: Shape, at: string): ShapeFault[] {
  switch (shape.kind) {
    case "enum": {
      if (shape.values.some((allowed) => allowed === value)) return [];
      const expected = shape.values.map(String).join(", ");
      const cause = `wrong-value: expected one of ${expected}, received ${receivedOf(value)}`;
      return [{ subject: at, cause }];
    }
    case "array":
      if (!Array.isArray(value)) {
        return [{ subject: at, cause: `wrong-type: expected array, received ${typeOf(value)}` }];
      }
      return value.flatMap((item: unknown, index) =>
        shapeFaults(item, shape.items, `${at}[${index}]`),
      );
    case "object":
      return objectFaults(value, shape, at);
  }
}

function objectFaults(
  value: unknown,
  shape: Extract<Shape, { kind: "object" }>,
  at: string,
): ShapeFault[] {
  if (!isRecord(value)) {
    const cause = `wrong-type: expected object, received ${typeOf(value)}`;
    return [{ subject: at || "extraction", cause }];
  }
  const within = (name: string) => (at ? `${at}.${name}` : name || 'extraction[""]');
  const missing = shape.required
    .filter((name) => value[name] === undefined)
    .map((name) => ({ subject: within(name), cause: `missing: ${name} is required` }));
  const unknown = Object.keys(value)
    .filter((name) => !Object.hasOwn(shape.fields, name))
    .map((name) => ({ subject: within(name), cause: `unknown: ${name} is not a field here` }));
  const wrong = Object.entries(value).flatMap(([name, field]) => {
    const fieldShape = shape.fields[name];
    return fieldShape && field !== undefined ? shapeFaults(field, fieldShape, within(name)) : [];
  });
  // A field already refused for its own shape gets no second fault for the rule over it.
  const ruleSubject = shape.holdsField ? within(shape.holdsField) : at;
  const ruleCause = `invalid: ${shape.holdsCause ?? "the rule over the object does not hold"}`;
  const broken = shape.holds && !shape.holds(value);
  const rule =
    broken && !wrong.some((fault) => fault.subject === ruleSubject)
      ? [{ subject: ruleSubject, cause: ruleCause }]
      : [];
  return [...rule, ...missing, ...unknown, ...wrong];
}

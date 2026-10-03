// The shape of the extraction `plan` reads, held field for field to the shipped JSON Schema in
// `assets/schemas/workflow/extraction.schema.json`: every required field present, every field of
// its type, and no key the schema does not declare.

import {
  alternativesFit,
  ARTIFACTS,
  CONFIDENCES,
  ENTRY_FLAGS,
  GATES,
  INTENTS,
  QUALIFIERS,
  RISKS,
  SIGNALS,
  type WorkflowExtraction,
} from "./extraction.js";

type Shape =
  | { kind: "enum"; values: readonly (string | null)[] }
  | { kind: "array"; items: Shape }
  | {
      kind: "object";
      fields: Record<string, Shape>;
      required: readonly string[];
      // A rule over the whole object that the field shapes cannot state, and the field a
      // failure names.
      holds?: (value: Record<string, unknown>) => boolean;
      holdsField?: string;
    };

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
    gate: oneOf(...GATES),
    artifacts: list(oneOf(...ARTIFACTS)),
    confidence: oneOf(...CONFIDENCES),
    alternatives: list({
      kind: "object",
      fields: READING_FIELDS,
      required: Object.keys(READING_FIELDS),
    }),
  },
  required: [...Object.keys(READING_FIELDS), "risks", "gate", "artifacts", "confidence"],
  holds: (value) => alternativesFit(value.confidence, value.alternatives),
  holdsField: "alternatives",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The fields of `value` that depart from the extraction's shape, none for an extraction.
export function extractionFaults(value: unknown): string[] {
  return shapeFaults(value, EXTRACTION, "");
}

export function isExtraction(value: unknown): value is WorkflowExtraction {
  return extractionFaults(value).length === 0;
}

// The subject of each place `value` departs from `shape`, as a dotted path from `at`.
function shapeFaults(value: unknown, shape: Shape, at: string): string[] {
  switch (shape.kind) {
    case "enum":
      return shape.values.some((allowed) => allowed === value) ? [] : [at];
    case "array":
      if (!Array.isArray(value)) return [at];
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
): string[] {
  if (!isPlainObject(value)) return [at || "extraction"];
  const within = (name: string) => (at ? `${at}.${name}` : name);
  if (shape.holds && !shape.holds(value)) return [shape.holdsField ? within(shape.holdsField) : at];
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

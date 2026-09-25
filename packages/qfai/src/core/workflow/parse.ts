export type NormativeReferenceKind = "request" | "spec-id" | "contract-id" | "path";
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
  "spec-id",
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

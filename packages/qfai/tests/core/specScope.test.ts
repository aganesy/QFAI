import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildSpecScope,
  isFindingInSpecScope,
  isPathInSpecScope,
  isSpecInScope,
  normalizeSpecId,
  owningSpecNumber,
  resolveSpecScope,
} from "../../src/core/specScope.js";

const root = path.resolve("/repo");
const specsRoot = path.join(root, ".qfai", "specs");
const roots = { root, specsRoot };
const testsRoot = path.join(root, "tests");
/** The same roots, plus the test tree a scoped run also attributes from. */
const withTests = { root, specsRoot, testsRoot };

describe("normalizeSpecId", () => {
  it("accepts the shapes the CLI and the spec directories use", () => {
    expect(normalizeSpecId("3")).toBe("0003");
    expect(normalizeSpecId("0003")).toBe("0003");
    expect(normalizeSpecId("spec-0003")).toBe("0003");
    expect(normalizeSpecId("SPEC_3")).toBe("0003");
    expect(normalizeSpecId("  0003  ")).toBe("0003");
  });

  it("rejects values that carry no resolvable number", () => {
    expect(normalizeSpecId("")).toBeNull();
    expect(normalizeSpecId("spec")).toBeNull();
    expect(normalizeSpecId("00031")).toBeNull();
    expect(normalizeSpecId("policies")).toBeNull();
  });
});

describe("resolveSpecScope", () => {
  it("reports unusable values instead of dropping them", () => {
    // `--spec nope` silently collapsing to "no scoping" would validate the whole
    // repo and exit 0 without ever looking at what the operator asked for.
    expect(resolveSpecScope(["nope"])).toEqual({ scope: new Set(), invalid: ["nope"] });
    const mixed = resolveSpecScope(["0003", "nope"]);
    expect(Array.from(mixed.scope ?? [])).toEqual(["0003"]);
    expect(mixed.invalid).toEqual(["nope"]);
  });

  it("returns no scope at all when --spec was not passed", () => {
    expect(resolveSpecScope(undefined)).toEqual({ scope: undefined, invalid: [] });
    expect(resolveSpecScope([])).toEqual({ scope: undefined, invalid: [] });
  });
});

describe("buildSpecScope", () => {
  it("returns undefined when no --spec was passed", () => {
    expect(buildSpecScope(undefined)).toBeUndefined();
    expect(buildSpecScope([])).toBeUndefined();
  });

  it("normalizes and de-duplicates every value", () => {
    const scope = buildSpecScope(["3", "spec-0003", "0004"]);
    expect(scope && Array.from(scope).sort()).toEqual(["0003", "0004"]);
  });

  it("returns undefined rather than an empty scope when every value is unusable", () => {
    // An empty scope would silently validate nothing; no scope validates everything.
    expect(buildSpecScope(["nonsense"])).toBeUndefined();
  });
});

describe("isSpecInScope", () => {
  it("includes everything when there is no scope", () => {
    expect(isSpecInScope("0009", undefined)).toBe(true);
  });

  it("includes only the named specs", () => {
    const scope = buildSpecScope(["0003"]);
    expect(isSpecInScope("0003", scope)).toBe(true);
    expect(isSpecInScope("0004", scope)).toBe(false);
  });
});

describe("owningSpecNumber", () => {
  it("resolves the owning spec of a spec-pack file", () => {
    expect(owningSpecNumber(path.join(specsRoot, "spec-0003", "04_Business-Rules.md"), roots)).toBe(
      "0003",
    );
  });

  it("resolves a repo-relative finding path, not only an absolute one", () => {
    // `surfaceTypeDrift` emits `.qfai/specs/spec-0004/01_Spec.md`; comparing
    // that with an absolute specsRoot yields `..` and used to read as
    // repo-level, leaking a sibling's warning into a scoped --strict run.
    expect(owningSpecNumber(".qfai/specs/spec-0004/01_Spec.md", roots)).toBe("0004");
    expect(owningSpecNumber(path.join(".qfai", "specs", "spec-0004", "01_Spec.md"), roots)).toBe(
      "0004",
    );
  });

  it("returns null for shared and out-of-tree paths", () => {
    expect(owningSpecNumber(path.join(specsRoot, "_policies", "10_delta.md"), roots)).toBeNull();
    expect(owningSpecNumber(path.join(root, "qfai.config.yaml"), roots)).toBeNull();
    expect(owningSpecNumber(specsRoot, roots)).toBeNull();
    expect(owningSpecNumber("qfai.config.yaml", roots)).toBeNull();
  });

  it("resolves the owning spec of a file in the canonical test layout", () => {
    // `<testsDir>/<layer>/spec-NNNN/**` is owned by that spec whatever its
    // annotation says. The rule was applied to a broken reference and not to
    // the file itself, so a scoped run dropped a sibling's dangling reference
    // and kept a sibling's stub.
    expect(
      owningSpecNumber(path.join(testsRoot, "e2e", "spec-0002", "checkout.test.ts"), withTests),
    ).toBe("0002");
    expect(owningSpecNumber("tests/integration/spec-0007/api.test.ts", withTests)).toBe("0007");
  });

  it("owns nothing in the test tree when no tests root is given", () => {
    // The roots carry `testsRoot` only where a run attributes from it, so a
    // caller asking about spec-pack paths alone gets the answer it always got.
    expect(
      owningSpecNumber(path.join(testsRoot, "e2e", "spec-0002", "checkout.test.ts"), roots),
    ).toBeNull();
  });

  it("reads only the layout, not a spec-shaped name deeper in the tree", () => {
    // The layout is one layer directory then the spec directory. A `spec-NNNN`
    // segment below that is a name inside somebody's fixture tree, and reading
    // it as an owner would hide a finding from the run that owns the file.
    expect(
      owningSpecNumber(path.join(testsRoot, "e2e", "checkout", "spec-0002", "case.ts"), withTests),
    ).toBeNull();
    // Directly under the tests root there is no layer, so there is no layout.
    expect(owningSpecNumber(path.join(testsRoot, "spec-0002.test.ts"), withTests)).toBeNull();
  });

  it("keeps a test file with no spec directory unattributable", () => {
    // A file in neither shape reaches every run, the way an unattributable
    // finding always has: dropping it from every scoped run would hide it.
    expect(owningSpecNumber(path.join(testsRoot, "e2e", "checkout.test.ts"), withTests)).toBeNull();
  });
});

describe("isPathInSpecScope", () => {
  const scope = buildSpecScope(["0003"]);

  it("keeps findings owned by an in-scope spec", () => {
    expect(
      isPathInSpecScope(path.join(specsRoot, "spec-0003", "06_Test-Cases.md"), roots, scope),
    ).toBe(true);
  });

  it("drops findings owned by a sibling spec", () => {
    expect(
      isPathInSpecScope(path.join(specsRoot, "spec-0004", "06_Test-Cases.md"), roots, scope),
    ).toBe(false);
    expect(isPathInSpecScope(".qfai/specs/spec-0004/01_Spec.md", roots, scope)).toBe(false);
  });

  it("always keeps repo-level findings, including _policies and fileless issues", () => {
    expect(
      isPathInSpecScope(path.join(specsRoot, "_policies", "03_Capabilities.md"), roots, scope),
    ).toBe(true);
    expect(isPathInSpecScope(path.join(root, "qfai.config.yaml"), roots, scope)).toBe(true);
    expect(isPathInSpecScope(undefined, roots, scope)).toBe(true);
  });
});

describe("isFindingInSpecScope", () => {
  const scope = buildSpecScope(["0004"]);

  it("keeps a multi-file finding whose representative path is a sibling", () => {
    // QFAI-ID-001 reports against the lexicographically first definer, so a
    // duplicate shared with spec-0003 would otherwise hide spec-0004's own
    // violation from a run scoped to spec-0004.
    const finding = {
      file: path.join(specsRoot, "spec-0003", "06_Test-Cases.md"),
      relatedFiles: [path.join(specsRoot, "spec-0004", "06_Test-Cases.md")],
    };
    expect(isFindingInSpecScope(finding, roots, scope)).toBe(true);
  });

  it("still drops a finding when no implicated file is in scope", () => {
    const finding = {
      file: path.join(specsRoot, "spec-0003", "06_Test-Cases.md"),
      relatedFiles: [path.join(specsRoot, "spec-0005", "06_Test-Cases.md")],
    };
    expect(isFindingInSpecScope(finding, roots, scope)).toBe(false);
  });

  it("keeps fileless findings and behaves like isPathInSpecScope otherwise", () => {
    expect(isFindingInSpecScope({}, roots, scope)).toBe(true);
    expect(
      isFindingInSpecScope(
        { file: path.join(specsRoot, "spec-0004", "01_Spec.md") },
        roots,
        undefined,
      ),
    ).toBe(true);
  });
});

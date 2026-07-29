import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const validatorsRoot = path.resolve(process.cwd(), "src", "core", "validators");

/**
 * Rule codes already emitted from more than one module when this guard was
 * introduced, pinned to the exact set of files allowed to emit them. They are
 * pre-existing collisions, not permission to add more — each needs its own
 * split, tracked separately from #241.
 *
 * The value is the whole allowed owner set, not just the code: a third module
 * re-using the code, or a partial split that drops one owner, both change the
 * set and fail here. Waiving by code alone would let the collision keep
 * growing unnoticed.
 */
const KNOWN_COLLISIONS = new Map<string, readonly string[]>([
  ["QFAI-BFLOW-003", ["businessFlow.ts", "mermaidEnforcement.ts"]],
]);

/**
 * `issue()` call sites whose first argument is computed at runtime (a
 * parameter, or a value picked from a local table), so no static scan can
 * attribute the code. Pinned by file + identifier: a NEW dynamic site fails
 * this test, forcing the author to emit a literal or a module-level constant
 * the ownership scan can see, or to justify the addition here.
 */
const DYNAMIC_CODE_SITES = new Map<string, ReadonlyMap<string, number>>([
  ["agentDefinition.ts", new Map([["code", 1]])],
  ["designAudit.ts", new Map([["finding", 1]])],
  ["designFidelity.ts", new Map([["issueCode", 1]])],
  ["layerCoverage.ts", new Map([["group", 1]])],
  ["orphanProhibition.ts", new Map([["input", 3]])],
  ["requirementsContext.ts", new Map([["code", 1]])],
  ["reviewerJustification.ts", new Map([["code", 1]])],
]);

/** `const NAME = "CODE";` / `export const NAME: string = "CODE";` */
const CONST_DECL =
  /(?:^|\n)[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=\n]+)?=[ \t]*"([^"\n]+)"/g;

/**
 * First argument of an `issue(...)` call: a string literal or a bare
 * identifier, skipping any leading comment. The `function` lookbehind drops
 * the helper's own declaration in `utils.ts`.
 */
const ISSUE_FIRST_ARG =
  /(?<!function\s)\bissue\(\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*("[^"\n]*"|[A-Za-z_$][\w$]*)/g;

/**
 * `code: "..."` / `code: CONST` on an object literal that is (or becomes) an
 * `Issue`. Several validators build the object directly instead of calling
 * `issue()` — `skillsIntegrity.ts`, `uix/designSystemPresence.ts`,
 * `justificationCatalog.ts` — and a scan that only follows `issue()` records no
 * owner for those codes at all, so re-using one from a second module would
 * never reach two owners.
 */
const OBJECT_LITERAL_CODE = /(?:^|[\s,{(])code:\s*("[^"\n]*"|[A-Za-z_$][\w$]*)/g;

/**
 * Modules that *declare* codes without emitting findings.
 * `justificationCatalog.ts` is a registry of every `R-*` code and its
 * justification contract, so counting it as an owner would make every
 * catalogued code look like a collision with its real emitter.
 */
const DECLARATION_ONLY_MODULES = new Set(["justificationCatalog.ts"]);

/** `code: string` in a type declaration is a field type, not a rule code. */
const TYPE_ANNOTATIONS = new Set(["string", "number", "boolean", "unknown", "any"]);

/** Shape of a rule code, used to ignore non-code first arguments. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

type Scan = {
  /** rule code -> validator files that emit it. */
  owners: Map<string, Set<string>>;
  /**
   * validator file -> `identifier x N` for each unresolved code expression.
   * The count is pinned as well as the identifier: `orphanProhibition.ts` has
   * three sites all named `input`, so an identifier-only set would not notice a
   * fourth.
   */
  dynamic: Map<string, Map<string, number>>;
};

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Resolves each `issue()` call's rule code to its owning module, following
 * module-level `const` indirection.
 *
 * A literal-only scan misses the `const FINDING_CODE = "..."` form that
 * `skillManifestDrift.ts` and `handoffSchemaDrift.ts` use, so those codes were
 * invisible to the ownership check and a second module could have re-used one
 * without this guard noticing.
 */
async function scanValidators(): Promise<Scan> {
  const files = await collectTsFiles(validatorsRoot);
  expect(files.length).toBeGreaterThan(0);

  const owners = new Map<string, Set<string>>();
  const dynamic = new Map<string, Map<string, number>>();

  for (const file of files) {
    const source = await readFile(file, "utf-8");
    const relative = path.relative(validatorsRoot, file).replace(/\\/g, "/");

    const constants = new Map<string, string>();
    for (const match of source.matchAll(CONST_DECL)) {
      const name = match[1];
      const value = match[2];
      if (name !== undefined && value !== undefined) {
        constants.set(name, value);
      }
    }

    if (DECLARATION_ONLY_MODULES.has(relative)) {
      continue;
    }

    const tokens = [...source.matchAll(ISSUE_FIRST_ARG), ...source.matchAll(OBJECT_LITERAL_CODE)]
      .map((match) => match[1])
      .filter((token): token is string => token !== undefined);

    for (const token of tokens) {
      if (TYPE_ANNOTATIONS.has(token)) {
        continue;
      }
      const resolved = token.startsWith('"') ? token.slice(1, -1) : constants.get(token);
      if (resolved === undefined) {
        const site = dynamic.get(relative) ?? new Map<string, number>();
        site.set(token, (site.get(token) ?? 0) + 1);
        dynamic.set(relative, site);
        continue;
      }
      if (!RULE_CODE.test(resolved)) {
        continue;
      }
      const set = owners.get(resolved) ?? new Set<string>();
      set.add(relative);
      owners.set(resolved, set);
    }
  }

  return { owners, dynamic };
}

const sorted = (values: Iterable<string>): string[] => Array.from(values).sort();

/** `file: ident x N, ident x N` — the count pins the number of call sites. */
const describeSites = (sites: Map<string, ReadonlyMap<string, number>>): string[] =>
  sorted(sites.keys()).map((file) => {
    const counts = sites.get(file) ?? new Map<string, number>();
    const parts = sorted(counts.keys()).map((ident) => `${ident} x ${counts.get(ident) ?? 0}`);
    return `${file}: ${parts.join(", ")}`;
  });

describe("validator rule codes are owned by exactly one module", () => {
  it("resolves codes passed through a module-level constant, not only literals", async () => {
    const { owners } = await scanValidators();
    expect(sorted(owners.get("R-SKILL-MANIFEST-DRIFT") ?? [])).toEqual(["skillManifestDrift.ts"]);
    expect(sorted(owners.get("R-HANDOFF-SCHEMA-DRIFT") ?? [])).toEqual(["handoffSchemaDrift.ts"]);
  });

  it("records codes built as an object literal, not only `issue()` calls", async () => {
    const { owners } = await scanValidators();
    // Neither of these modules calls `issue()`; both return the `Issue` object
    // directly, so a call-site-only scan gave them no owner at all.
    expect(sorted(owners.get("QFAI-SKILLS-001") ?? [])).toEqual(["skillsIntegrity.ts"]);
    expect(sorted(owners.get("UIX-VAL-DS01") ?? [])).toEqual(["uix/designSystemPresence.ts"]);
  });

  it("has no unaccounted-for dynamic code argument", async () => {
    const { dynamic } = await scanValidators();
    expect(
      describeSites(dynamic),
      "a computed rule code is invisible to the ownership scan; emit a literal or a module-level constant, or pin the new site in DYNAMIC_CODE_SITES with a reason",
    ).toEqual(describeSites(DYNAMIC_CODE_SITES));
  });

  it("no rule code is emitted from two different validator files", async () => {
    const { owners } = await scanValidators();

    // Sanity: the scan must actually find codes, or the assertion is vacuous.
    expect(owners.size).toBeGreaterThan(100);

    const collisions = Array.from(owners)
      .filter(([code, files]) => files.size > 1 && !KNOWN_COLLISIONS.has(code))
      .map(([code, files]) => `${code} -> ${sorted(files).join(", ")}`)
      .sort();

    expect(
      collisions,
      "a rule code is the public contract of `qfai validate`; sharing one across unrelated checks makes findings impossible to grep, filter or waive apart",
    ).toEqual([]);
  });

  it("pins the owner set of every known collision, so it can neither grow nor drift", async () => {
    const { owners } = await scanValidators();
    for (const [code, allowed] of KNOWN_COLLISIONS) {
      expect(
        sorted(owners.get(code) ?? []),
        `${code} is a waived pre-existing collision; its owner set is frozen until the split lands`,
      ).toEqual(sorted(allowed));
    }
  });

  it("the screen-id casing check and specsCovered linkage no longer share a code", async () => {
    const casing = await readFile(path.join(validatorsRoot, "prototypingEvidence.ts"), "utf-8");
    const linkage = await readFile(
      path.join(validatorsRoot, "prototyping", "specIdLinkage.ts"),
      "utf-8",
    );

    expect(casing).toContain('"QFAI-PROT-010"');
    expect(linkage).toContain('"QFAI-PROT-008"');
    expect(linkage).not.toContain('"QFAI-PROT-010"');
  });
});

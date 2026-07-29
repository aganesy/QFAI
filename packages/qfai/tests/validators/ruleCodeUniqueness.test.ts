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
const DYNAMIC_CODE_SITES = new Map<string, readonly string[]>([
  ["agentDefinition.ts", ["code"]],
  ["designAudit.ts", ["finding"]],
  ["designFidelity.ts", ["issueCode"]],
  ["layerCoverage.ts", ["group"]],
  ["orphanProhibition.ts", ["input"]],
  ["requirementsContext.ts", ["code"]],
  ["reviewerJustification.ts", ["code"]],
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

/** Shape of a rule code, used to ignore non-code first arguments. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

type Scan = {
  /** rule code -> validator files that emit it. */
  owners: Map<string, Set<string>>;
  /** validator file -> first-argument identifiers that could not be resolved. */
  dynamic: Map<string, Set<string>>;
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
  const dynamic = new Map<string, Set<string>>();

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

    for (const match of source.matchAll(ISSUE_FIRST_ARG)) {
      const token = match[1];
      if (token === undefined) {
        continue;
      }
      const resolved = token.startsWith('"') ? token.slice(1, -1) : constants.get(token);
      if (resolved === undefined) {
        const site = dynamic.get(relative) ?? new Set<string>();
        site.add(token);
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

const describeSites = (sites: Map<string, readonly string[] | Set<string>>): string[] =>
  sorted(sites.keys()).map((file) => `${file}: ${sorted(sites.get(file) ?? []).join(", ")}`);

describe("validator rule codes are owned by exactly one module", () => {
  it("resolves codes passed through a module-level constant, not only literals", async () => {
    const { owners } = await scanValidators();
    expect(sorted(owners.get("R-SKILL-MANIFEST-DRIFT") ?? [])).toEqual(["skillManifestDrift.ts"]);
    expect(sorted(owners.get("R-HANDOFF-SCHEMA-DRIFT") ?? [])).toEqual(["handoffSchemaDrift.ts"]);
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

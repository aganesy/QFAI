import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root resolves `src/core` to a path that does not exist, and the walk
// below would then scan nothing and pass vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const coreRoot = path.join(packageRoot, "src", "core");

/**
 * Every module whose findings `validateProject` merges into its result, not
 * just `validators/`:
 *
 * - `config.ts` — the `configIssues` prepended to the findings list;
 * - `validators/**` — the profile validators;
 * - `saasPackage/**` — `runSaasPackageProfile`'s `D-SAAS-PACKAGE-*` findings;
 * - `waivers.ts` — `applyWaivers`' `QFAI-WAIVER-*` findings.
 *
 * A scan limited to `validators/` passes while a validator and one of the
 * others share a code — exactly the case a consumer cannot grep, filter or
 * waive apart.
 */
const SCAN_ROOTS = ["config.ts", "saasPackage", "validators", "waivers.ts"] as const;

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
 *
 * Now empty: the last entry, `QFAI-BFLOW-003`, was shared by the unwired
 * `validators/businessFlow.ts` and `validators/mermaidEnforcement.ts`, and the
 * dead module has been deleted. A new entry here needs its own justification.
 */
const KNOWN_COLLISIONS = new Map<string, readonly string[]>([]);

/**
 * `issue()` call sites whose first argument is computed at runtime (a
 * parameter, a property read, or a value picked from a local table), so no
 * static scan can attribute the code. Pinned by file + expression + count: a
 * NEW dynamic site fails this test, forcing the author to emit a literal or a
 * module-level constant the ownership scan can see, or to justify the addition
 * here.
 */
const DYNAMIC_CODE_SITES = new Map<string, ReadonlyMap<string, number>>([
  ["validators/agentDefinition.ts", new Map([["code", 1]])],
  ["validators/designAudit.ts", new Map([["finding.ruleId", 1]])],
  ["validators/designFidelity.ts", new Map([["issueCode", 1]])],
  ["validators/layerCoverage.ts", new Map([["group.code", 1]])],
  [
    "validators/orphanProhibition.ts",
    new Map([
      ["input.missingCode", 1],
      ["input.unknownCode", 2],
    ]),
  ],
  // Two, not one. The second site is the workflow-set ingestion branch: it emits the
  // finding's own code at `info` while that code's catalog registration is deferred,
  // and the code it emits is the same `code` local the rejection site below uses. The
  // two codes it can reach are declared in `justificationCatalog.ts` — which this scan
  // reads as their owner — rather than restated here.
  ["validators/reviewerJustification.ts", new Map([["code", 2]])],
]);

/**
 * Rule codes that were published, then retired together with the validator
 * that emitted them. Their modules are now `@deprecated` stubs returning `[]`
 * (`requirePack.ts` set the precedent), so the ownership scan finds no owner
 * for them and nothing else stops a future rule from taking a number back.
 *
 * Announced publicly before retirement, so re-using a number would make two
 * different checks share one public code across versions — the same failure
 * the collision guard below exists to prevent, only spread over time.
 */
const RETIRED_CODES: readonly string[] = [
  // validators/requireIndex.ts — the `02_requirement-index.md` input is gone.
  "QFAI-REQINDEX-001",
  "QFAI-REQINDEX-002",
  // validators/requirementsContext.ts — glossary / actors / business-flows /
  // require.md inputs are gone.
  "QFAI-REQCTX-000",
  "QFAI-REQCTX-001",
  "QFAI-REQCTX-002",
  "QFAI-REQCTX-003",
  "QFAI-REQCTX-004",
  "QFAI-REQCTX-010",
  "QFAI-REQCTX-020",
  "QFAI-REQCTX-021",
];

/**
 * The rule codes each dynamic site can actually reach — every rule-code-shaped
 * string literal in that module.
 *
 * Pinning the expression alone was not enough: the codes behind it stayed
 * invisible to the ownership scan, so a second module could take one over and
 * still look like its sole owner. Freezing the reachable set means adding a
 * code behind a dynamic expression, or moving one out of its module, has to be
 * declared here. Where the codes ARE statically resolvable they are resolved
 * instead — `designAudit.ts` declares them as `ruleId: "QFAI-AUD-..."` object
 * literals, so they appear in `owners` too and a second emitter collides.
 */
const DYNAMIC_SITE_CODES = new Map<string, readonly string[]>([
  [
    "validators/agentDefinition.ts",
    [
      "QFAI-AGENT-001",
      "QFAI-AGENT-002",
      "QFAI-AGENT-003",
      "QFAI-AGENT-004",
      "QFAI-AGENT-005",
      "QFAI-AGENT-006",
      "QFAI-AGENT-007",
      "QFAI-AGENT-008",
      "QFAI-AGENT-009",
      "QFAI-AGENT-010",
      "QFAI-AGENT-011",
      "QFAI-AGENT-012",
      "QFAI-AGENT-013",
      "QFAI-AGENT-014",
    ],
  ],
  ["validators/designAudit.ts", ["QFAI-AUD-001", "QFAI-AUD-004", "QFAI-AUD-020", "QFAI-AUD-021"]],
  [
    "validators/designFidelity.ts",
    [
      "QFAI-FID-001",
      "QFAI-FID-002",
      "QFAI-FID-003",
      "QFAI-FID-004",
      "QFAI-FID-005",
      "QFAI-FID-006",
      "QFAI-FID-007",
      "QFAI-FID-008",
      "QFAI-FID-009",
      "QFAI-FID-010",
      "QFAI-FID-011",
    ],
  ],
  [
    "validators/layerCoverage.ts",
    [
      "QFAI-COV-101",
      "QFAI-COV-102",
      "QFAI-COV-103",
      "QFAI-COV-104",
      "QFAI-COV-201",
      "QFAI-COV-202",
      "QFAI-COV-203",
      "QFAI-COV-204",
      "QFAI-COV-205",
      "QFAI-COV-206",
      "QFAI-COV-207",
      "QFAI-COV-901",
      "QFAI-PLAN-001",
      "QFAI-PLAN-002",
      "QFAI-PLAN-003",
      "QFAI-PLAN-004",
      "QFAI-PLAN-005",
    ],
  ],
  [
    "validators/orphanProhibition.ts",
    [
      "QFAI-ORPHAN-100",
      "QFAI-ORPHAN-101",
      "QFAI-ORPHAN-102",
      "QFAI-ORPHAN-103",
      "QFAI-ORPHAN-104",
      "QFAI-ORPHAN-105",
      "QFAI-ORPHAN-106",
      "QFAI-ORPHAN-107",
      "QFAI-ORPHAN-108",
      "QFAI-ORPHAN-109",
    ],
  ],
  [
    // Deliberately re-emits the finding's own code so the justification gap is
    // reported under the code it applies to; those codes belong to
    // `reviewerGate.ts` / `worklogSurface.ts`, which own them as literals.
    "validators/reviewerJustification.ts",
    [
      "R-CERTIFY-VERIFY-CIRCULAR",
      "R-HANDOFF-INCOMPLETE",
      "R-PROMPT-SCANNER-DRIFT",
      "R-REJECTED-READOPT",
      "R-WORKLOG-DRIFT",
    ],
  ],
]);

/** `const NAME = "CODE";` / `export const NAME: string = "CODE";` */
const CONST_DECL =
  /(?:^|\n)[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=\n]+)?=[ \t]*"([^"\n]+)"/g;

/**
 * First argument of an `issue(...)` call: a string literal, a bare identifier
 * or a property read, skipping any leading comment. The `function` lookbehind
 * drops the helper's own declaration in `utils.ts`; the trailing `,` is what
 * makes this a call carrying at least the `(code, message)` pair, so the word
 * "issue(s)" inside a message string is not mistaken for one.
 */
// The leading `(?<![.\w$])` rejects a member call: `\bissue(` alone matches the
// tail of `helper.issue(...)`, which is a different function and would be
// attributed to this one. `(?<!function\s)` still drops the helper's own
// declaration in `utils.ts`.
const ISSUE_FIRST_ARG =
  /(?<!function\s)(?<![.\w$])issue\(\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*("[^"\n]*"|[A-Za-z_$][\w$.]*)\s*,/g;

/**
 * A CONDITIONAL first argument: `issue(cond ? "A" : "B", …)`.
 *
 * The literal-or-identifier pattern above cannot see this. Its identifier
 * alternative matches `cond` and then demands a comma, which is not there — so
 * the call site produced no match at all, and both codes behind it went
 * unattributed and unchecked. `validators/reviewArtifacts.ts` emits
 * `QFAI-REVIEW-007` / `QFAI-REVIEW-009` exactly this way, twice.
 *
 * Nothing is currently hidden by it, and that is luck rather than design: both
 * codes are baseline, and both also appear as literal first arguments
 * elsewhere in the same file. #1062's point is the structure — a NEW hard
 * error emitted through a ternary would be registered nowhere and owned by
 * nothing, having followed the house style.
 *
 * Both branches are captured. Either can be the code that reaches users, so
 * attributing one and dropping the other would trade a blind spot for a
 * half-blind one.
 */
const ISSUE_TERNARY_FIRST_ARG =
  /(?<!function\s)(?<![.\w$])issue\(\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*[A-Za-z_$][\w$.]*\s*\?\s*("[^"\n]*"|[A-Za-z_$][\w$.]*)\s*:\s*("[^"\n]*"|[A-Za-z_$][\w$.]*)\s*,/g;

/**
 * `code: "..."` / `ruleId: "..."` / `code: CONST` on an object literal that is
 * (or becomes) an `Issue`. Several validators build the object directly instead
 * of calling `issue()` — `skillsIntegrity.ts`, `uix/designSystemPresence.ts`,
 * `justificationCatalog.ts` — and a scan that only follows `issue()` records no
 * owner for those codes at all. `ruleId` is the same declaration on
 * `designAudit.ts`'s `DesignFinding`, whose codes reach `issue()` only through
 * `findingToIssue(finding)`.
 *
 * The trailing lookahead rejects a property read (`code: item.code`), which
 * copies an existing finding's code rather than declaring one.
 */
const OBJECT_LITERAL_CODE =
  /(?:^|[\s,{(])(?:code|ruleId):\s*("[^"\n]*"|[A-Za-z_$][\w$.]*)(?![\w$.])/g;

/** Any double-quoted string, used to harvest a dynamic site's reachable codes. */
const STRING_LITERAL = /"([^"\n]+)"/g;

/**
 * Modules that *declare* codes without emitting findings.
 * `justificationCatalog.ts` is a registry of every `R-*` code and its
 * justification contract, so counting it as an owner would make every
 * catalogued code look like a collision with its real emitter.
 */
const DECLARATION_ONLY_MODULES = new Set(["validators/justificationCatalog.ts"]);

/** `code: string` in a type declaration is a field type, not a rule code. */
const TYPE_ANNOTATIONS = new Set(["string", "number", "boolean", "unknown", "any"]);

/** Shape of a rule code, used to ignore non-code first arguments. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

type Scan = {
  /** rule code -> modules that emit it. */
  owners: Map<string, Set<string>>;
  /**
   * module -> `expression x N` for each unresolved code expression.
   * The count is pinned as well as the expression: `orphanProhibition.ts` has
   * two sites named `input.unknownCode`, so an expression-only set would not
   * notice a third.
   */
  dynamic: Map<string, Map<string, number>>;
  /** module with a dynamic site -> every rule-code literal it contains. */
  dynamicCodes: Map<string, string[]>;
};

async function walkTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      // Declaration files emit nothing. Scanning them can only add type-only
      // constructs to the "dynamic site" set, which is noise in a guard whose
      // whole output is a list of real emit sites.
      files.push(full);
    }
  }
  return files;
}

async function collectScanFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const entry of SCAN_ROOTS) {
    const full = path.join(coreRoot, entry);
    files.push(...(entry.endsWith(".ts") ? [full] : await walkTsFiles(full)));
  }
  return files;
}

/**
 * Resolves each finding's rule code to its owning module, following
 * module-level `const` indirection.
 *
 * A literal-only scan misses the `const FINDING_CODE = "..."` form that
 * `skillManifestDrift.ts` and `handoffSchemaDrift.ts` use, so those codes were
 * invisible to the ownership check and a second module could have re-used one
 * without this guard noticing.
 */
/**
 * Blank out comments, preserving offsets and line structure.
 *
 * `DYNAMIC_SITE_CODES` pins the rule codes a dynamic module can emit, and the
 * harvest that fills it reads string literals out of the raw source. Without
 * this, a code named in a comment — the usual way these modules document what
 * they emit — joined the pinned set, so editing a comment changed the guard's
 * expected value and the guard failed for no behavioural reason.
 *
 * Replacing rather than deleting keeps every other regex in this file matching
 * the same text at the same place. Not a parser: it tracks string and template
 * literals so a `//` inside a string is not mistaken for a comment, which is
 * the only ambiguity that matters here.
 */
function stripComments(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    const ch = source[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      out += source.slice(i, j);
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

async function scanIssueSources(): Promise<Scan> {
  const files = await collectScanFiles();
  expect(files.length).toBeGreaterThan(0);

  const owners = new Map<string, Set<string>>();
  const dynamic = new Map<string, Map<string, number>>();
  const dynamicCodes = new Map<string, string[]>();

  for (const file of files) {
    const source = stripComments(await readFile(file, "utf-8"));
    const relative = path.relative(coreRoot, file).replace(/\\/g, "/");

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

    const tokens = [
      ...[...source.matchAll(ISSUE_FIRST_ARG)].map((match) => match[1]),
      // Both branches, so a conditional emission attributes an owner to each
      // code it can reach rather than to neither.
      ...[...source.matchAll(ISSUE_TERNARY_FIRST_ARG)].flatMap((match) => [match[1], match[2]]),
      ...[...source.matchAll(OBJECT_LITERAL_CODE)].map((match) => match[1]),
    ].filter((token): token is string => token !== undefined);

    const unresolved = new Map<string, number>();
    for (const token of tokens) {
      if (TYPE_ANNOTATIONS.has(token)) {
        continue;
      }
      const resolved = token.startsWith('"') ? token.slice(1, -1) : constants.get(token);
      if (resolved === undefined) {
        unresolved.set(token, (unresolved.get(token) ?? 0) + 1);
        continue;
      }
      if (!RULE_CODE.test(resolved)) {
        continue;
      }
      const set = owners.get(resolved) ?? new Set<string>();
      set.add(relative);
      owners.set(resolved, set);
    }

    if (unresolved.size > 0) {
      dynamic.set(relative, unresolved);
      const codes = new Set<string>();
      for (const match of source.matchAll(STRING_LITERAL)) {
        const value = match[1];
        if (value !== undefined && RULE_CODE.test(value)) {
          codes.add(value);
        }
      }
      dynamicCodes.set(relative, Array.from(codes).sort());
    }
  }

  return { owners, dynamic, dynamicCodes };
}

const sorted = (values: Iterable<string>): string[] => Array.from(values).sort();

/** `file: expr x N, expr x N` — the count pins the number of call sites. */
const describeSites = (sites: Map<string, ReadonlyMap<string, number>>): string[] =>
  sorted(sites.keys()).map((file) => {
    const counts = sites.get(file) ?? new Map<string, number>();
    const parts = sorted(counts.keys()).map((ident) => `${ident} x ${counts.get(ident) ?? 0}`);
    return `${file}: ${parts.join(", ")}`;
  });

/** `file: CODE, CODE` — the reachable code set behind a dynamic expression. */
const describeCodes = (codes: Map<string, readonly string[]>): string[] =>
  sorted(codes.keys()).map((file) => `${file}: ${sorted(codes.get(file) ?? []).join(", ")}`);

describe("validate rule codes are owned by exactly one module", () => {
  it("resolves codes passed through a module-level constant, not only literals", async () => {
    const { owners } = await scanIssueSources();
    expect(sorted(owners.get("R-SKILL-MANIFEST-DRIFT") ?? [])).toEqual([
      "validators/skillManifestDrift.ts",
    ]);
    expect(sorted(owners.get("R-HANDOFF-SCHEMA-DRIFT") ?? [])).toEqual([
      "validators/handoffSchemaDrift.ts",
    ]);
  });

  it("records codes built as an object literal, not only `issue()` calls", async () => {
    const { owners } = await scanIssueSources();
    // Neither of these modules calls `issue()`; both return the `Issue` object
    // directly, so a call-site-only scan gave them no owner at all.
    expect(sorted(owners.get("QFAI-SKILLS-001") ?? [])).toEqual(["validators/skillsIntegrity.ts"]);
    expect(sorted(owners.get("UIX-VAL-DS01") ?? [])).toEqual([
      "validators/uix/designSystemPresence.ts",
    ]);
  });

  it("covers the Issue sources outside `validators/` that validate also returns", async () => {
    const { owners } = await scanIssueSources();
    // `applyWaivers` and `runSaasPackageProfile` findings reach the same result
    // array, so their codes live in the same namespace.
    expect(sorted(owners.get("QFAI-WAIVER-001") ?? [])).toEqual(["waivers.ts"]);
    expect(sorted(owners.get("D-SAAS-PACKAGE-VERIFY-SKIPPED") ?? [])).toEqual([
      "saasPackage/profile.ts",
    ]);
  });

  it("resolves a `ruleId` declaration to the module that owns it", async () => {
    const { owners } = await scanIssueSources();
    // `findingToIssue` passes `finding.ruleId` to `issue()`, so reading `code:`
    // alone left every QFAI-AUD-* code with no owner — another validator could
    // have taken one over and still looked like its only owner.
    expect(sorted(owners.get("QFAI-AUD-001") ?? [])).toEqual(["validators/designAudit.ts"]);
    expect(sorted(owners.get("QFAI-AUD-021") ?? [])).toEqual(["validators/designAudit.ts"]);
  });

  it("has no unaccounted-for dynamic code argument", async () => {
    const { dynamic } = await scanIssueSources();
    expect(
      describeSites(dynamic),
      "a computed rule code is invisible to the ownership scan; emit a literal or a module-level constant, or pin the new site in DYNAMIC_CODE_SITES with a reason",
    ).toEqual(describeSites(DYNAMIC_CODE_SITES));
  });

  it("pins the codes reachable behind every allowed dynamic expression", async () => {
    const { dynamicCodes } = await scanIssueSources();
    expect(
      describeCodes(dynamicCodes),
      "the codes behind a dynamic expression are invisible to the ownership scan; adding one, or moving one out of its module, must be declared in DYNAMIC_SITE_CODES",
    ).toEqual(describeCodes(DYNAMIC_SITE_CODES));
  });

  it("no rule code is emitted from two different modules", async () => {
    const { owners } = await scanIssueSources();

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
    const { owners } = await scanIssueSources();
    for (const [code, allowed] of KNOWN_COLLISIONS) {
      expect(
        sorted(owners.get(code) ?? []),
        `${code} is a waived pre-existing collision; its owner set is frozen until the split lands`,
      ).toEqual(sorted(allowed));
    }
  });

  it("no live module re-uses a retired rule code", async () => {
    const { owners, dynamicCodes } = await scanIssueSources();

    const reachable = new Set<string>();
    for (const codes of dynamicCodes.values()) {
      for (const code of codes) {
        reachable.add(code);
      }
    }

    const reused = RETIRED_CODES.filter(
      (code) => (owners.get(code)?.size ?? 0) > 0 || reachable.has(code),
    ).sort();

    expect(
      reused,
      "these codes were published and then retired with their validator; taking a number back makes one public code mean two different checks across versions — pick an unused number instead",
    ).toEqual([]);
  });

  it("the screen-id casing check and specsCovered linkage no longer share a code", async () => {
    const casing = await readFile(
      path.join(coreRoot, "validators", "prototypingEvidence.ts"),
      "utf-8",
    );
    const linkage = await readFile(
      path.join(coreRoot, "validators", "prototyping", "specIdLinkage.ts"),
      "utf-8",
    );

    expect(casing).toContain('"QFAI-PROT-010"');
    expect(linkage).toContain('"QFAI-PROT-008"');
    expect(linkage).not.toContain('"QFAI-PROT-010"');
  });
});

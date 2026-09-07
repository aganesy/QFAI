/**
 * Meta-test: every leaf key of `defaultConfig.validation` must be read
 * somewhere under `src/` outside `core/config.ts`.
 *
 * `config.ts` declaring, defaulting and parsing a key proves nothing about the
 * key doing anything. `validation.traceability.brMustHaveSc`,
 * `scNoTestSeverity` and `orphanContractsPolicy` each had all three and no
 * consumer at all, so the shipped `qfai.config.yaml` advertised gates the code
 * never ran — `scNoTestSeverity: error` next to a finding hard-coded to
 * `"warning"`. Adding a validation knob without wiring it to a finding MUST
 * fail here.
 *
 * Same shape as `validators-are-wired.test.ts`: a reachability check with an
 * explicit, documented allowlist rather than a type-level one. Reachability is
 * measured on the TypeScript AST rather than on source text, and only *read*
 * accesses count. The parser rules out comments, quoted strings and
 * template-literal prose for free; requiring the whole config path from
 * `validation` down (`…validation.traceability.scMustHaveTest`) rules out a
 * same-named local and any other object that happens to own a matching
 * property; and the read/write split rules out code that merely stores into the
 * key — `config.validation.traceability.newKey = false` writes a value nothing
 * ever consults, which is the shipped-but-inert defect restated, not a cure for
 * it.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "../../src");
const CONFIG_TS = path.resolve(SRC_ROOT, "core/config.ts");

/**
 * Keys known to have no consumer, each with the issue that resolves it. This
 * list MUST NOT grow without an issue reference: a new entry means a new knob
 * that lies to the operator.
 *
 * Keyed by the FULL config path, not the bare key name: `specSections` exists
 * under `validation.require` today, and a future `validation.traceability.
 * specSections` must not inherit this exemption just by sharing a name.
 *
 * - `validation.testStrategy.requireLayerTags` / `requireSizeTags` — no
 *   validator reads them (#408).
 * - `validation.require.specSections` — parsed and shipped but no section
 *   requirement is enforced from it; same class as #408 and left to that
 *   thread rather than fixed here.
 */
const KNOWN_UNWIRED: ReadonlyMap<string, string> = new Map([
  ["validation.testStrategy.requireLayerTags", "#408"],
  ["validation.testStrategy.requireSizeTags", "#408"],
  ["validation.require.specSections", "#408 (same class: shipped-but-inert config surface)"],
]);

type LeafKey = {
  /** Bare key name, e.g. `scMustHaveTest`. */
  readonly key: string;
  /** Owning object key, e.g. `traceability`; `validation` for a direct child. */
  readonly parent: string;
  /** Full dotted path from the root, e.g. `validation.traceability.scMustHaveTest`. */
  readonly path: string;
};

/** Leaf keys of a nested plain-object tree, in declaration order. */
function collectLeafKeys(value: unknown, prefix: string, acc: LeafKey[] = []): LeafKey[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return acc;
  }
  const parent = prefix.slice(prefix.lastIndexOf(".") + 1);
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "object" && child !== null && !Array.isArray(child)) {
      collectLeafKeys(child, `${prefix}.${key}`, acc);
    } else {
      acc.push({ key, parent, path: `${prefix}.${key}` });
    }
  }
  return acc;
}

/**
 * The whole dotted access chain ending at `node`, walked back to its root:
 * `config.validation.traceability.scMustHaveTest`, not just the last two
 * segments. Truncating to `<parent>.<key>` would let an unrelated object that
 * happens to own a same-named property — `uiModel.traceability.scMustHaveTest`
 * — stand in for the config read.
 *
 * `undefined` when `node` is not a named access at all. A chain whose root is
 * not a plain name (a call result, `this`, an `await`) simply starts at the
 * first named segment; it can then only match a config path that is fully
 * spelled out from there.
 */
function accessChain(node: ts.Node): string | undefined {
  const named =
    ts.isPropertyAccessExpression(node) ||
    (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression));
  if (!named) {
    return undefined;
  }
  const segments: string[] = [];
  let current: ts.Node = node;
  for (;;) {
    if (ts.isPropertyAccessExpression(current)) {
      segments.unshift(current.name.text);
      current = current.expression;
    } else if (
      ts.isElementAccessExpression(current) &&
      ts.isStringLiteralLike(current.argumentExpression)
    ) {
      segments.unshift(current.argumentExpression.text);
      current = current.expression;
    } else if (ts.isNonNullExpression(current) || ts.isParenthesizedExpression(current)) {
      current = current.expression;
    } else {
      if (ts.isIdentifier(current)) {
        segments.unshift(current.text);
      }
      break;
    }
  }
  return segments.join(".");
}

/** The 16 assignment operators sit contiguously in `SyntaxKind`, `??=` included. */
function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

/**
 * True when `node` is written rather than read: the target of an assignment
 * (`=` and every compound form, including through a destructuring pattern such
 * as `[cfg.a.b] = xs` or `({ k: cfg.a.b } = o)`), the operand of `++` / `--`,
 * the argument of `delete`, or the initializer a `for…of` / `for…in` assigns
 * each iteration into.
 *
 * `x += 1` and `x++` do load the old value, but a knob that is only accumulated
 * into is still a knob no validator consults, so they are classed as writes —
 * counting them would leave exactly the hole this split closes.
 */
function isWriteTarget(node: ts.Node): boolean {
  let current: ts.Node = node;
  let parent: ts.Node | undefined = current.parent;
  while (parent !== undefined) {
    if (ts.isBinaryExpression(parent)) {
      return parent.left === current && isAssignmentOperator(parent.operatorToken.kind);
    }
    if (ts.isPostfixUnaryExpression(parent) || ts.isPrefixUnaryExpression(parent)) {
      return (
        parent.operand === current &&
        (parent.operator === ts.SyntaxKind.PlusPlusToken ||
          parent.operator === ts.SyntaxKind.MinusMinusToken)
      );
    }
    if (ts.isDeleteExpression(parent)) {
      return parent.expression === current;
    }
    if (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) {
      return parent.initializer === current;
    }
    // A destructuring target is wrapped in literals and spreads before the `=`
    // is reached, so climb through those; the assignment check above then sees
    // the outermost pattern. On the right-hand side the same climb ends at a
    // non-assignment parent and the access stays a read.
    const climbable =
      ts.isArrayLiteralExpression(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      ts.isSpreadElement(parent) ||
      ts.isSpreadAssignment(parent) ||
      (ts.isPropertyAssignment(parent) && parent.initializer === current);
    if (!climbable) {
      return false;
    }
    current = parent;
    parent = parent.parent;
  }
  return false;
}

/** Every dotted access chain this source READS. */
function collectReadChains(source: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    "scan.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const chains = new Set<string>();
  const visit = (node: ts.Node): void => {
    const chain = accessChain(node);
    if (chain !== undefined && !isWriteTarget(node)) {
      chains.add(chain);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return chains;
}

/**
 * True when one of `chains` reaches `configPath` — the full path from
 * `validation` down. The root object holding the config differs by call site
 * (`config`, `configResult.config`, …) so the path is matched as a suffix, but
 * every segment of it must be present: `uiModel.traceability.scMustHaveTest`
 * does not reach `validation.traceability.scMustHaveTest`.
 */
function readsConfigPath(chains: ReadonlySet<string>, configPath: string): boolean {
  for (const chain of chains) {
    if (chain === configPath || chain.endsWith(`.${configPath}`)) {
      return true;
    }
  }
  return false;
}

/** `readsConfigPath` over a single source, for the decoy cases below. */
function readsPath(source: string, configPath: string): boolean {
  return readsConfigPath(collectReadChains(source), configPath);
}

async function collectTsFiles(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTsFiles(full, acc);
    } else if (entry.name.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("validation config keys are wired", () => {
  it("reads every validation leaf key somewhere outside core/config.ts", async () => {
    const files = (await collectTsFiles(SRC_ROOT)).filter(
      (file) => path.resolve(file) !== CONFIG_TS,
    );
    const sources = await Promise.all(files.map((file) => readFile(file, "utf-8")));
    const candidates = collectLeafKeys(defaultConfig.validation, "validation").filter(
      (leaf) => !KNOWN_UNWIRED.has(leaf.path),
    );
    // Parsing the whole tree costs ~3x a text scan, so skip the files that
    // cannot possibly matter: a source that never spells a key name — in code,
    // a string or a comment — cannot contain a read of one.
    const names = Array.from(new Set(candidates.map((leaf) => leaf.key)));
    const chains = new Set<string>();
    for (const source of sources) {
      if (!names.some((name) => source.includes(name))) {
        continue;
      }
      for (const chain of collectReadChains(source)) {
        chains.add(chain);
      }
    }

    const unwired = candidates
      .filter((leaf) => !readsConfigPath(chains, leaf.path))
      .map((leaf) => leaf.path);

    expect(
      unwired,
      `validation config keys with no consumer under src/: ${unwired.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the retired traceability keys out of the config surface", () => {
    const traceabilityKeys = Object.keys(defaultConfig.validation.traceability);
    expect(traceabilityKeys).not.toContain("brMustHaveSc");
    expect(traceabilityKeys).not.toContain("scNoTestSeverity");
    expect(traceabilityKeys).not.toContain("orphanContractsPolicy");
  });

  it("does not accept a bare key name in prose, a string or a same-named local", () => {
    const decoys = [
      "// validation の enabled をいつか読む",
      "/* enabled */",
      'issues.push({ rule: "validation.enabled" });',
      "const enabled = options.enabled;",
      "function read() { return other.enabled; }",
    ].join("\n");

    expect(readsPath(decoys, "validation.enabled")).toBe(false);
    expect(readsPath("if (config.validation.enabled) { stop(); }", "validation.enabled")).toBe(
      true,
    );
  });

  it("keeps code that lives next to comments and strings", () => {
    const prose = [
      "// config.validation.traceability.scMustHaveTest はコメント",
      'const label = "validation.traceability.scMustHaveTest";',
    ].join("\n");
    const withCode = [prose, "const on = config.validation.traceability.scMustHaveTest;"].join(
      "\n",
    );
    const key = "validation.traceability.scMustHaveTest";

    expect(readsPath(prose, key)).toBe(false);
    expect(readsPath(withCode, key)).toBe(true);
  });

  it("matches the config path from its root, not just the last two segments", () => {
    // An unrelated object owning a same-named property must not stand in for
    // the config: only a chain that spells out `validation.traceability` counts.
    const key = "validation.traceability.newKey";

    expect(readsPath("const on = uiModel.traceability.newKey;", key)).toBe(false);
    expect(readsPath("const on = other.validation.newKey;", key)).toBe(false);
    expect(readsPath("const on = configResult.config.validation.traceability.newKey;", key)).toBe(
      true,
    );
  });

  it("does not let the unwired allowlist grow silently", () => {
    expect(Array.from(KNOWN_UNWIRED.keys()).sort()).toEqual([
      "validation.require.specSections",
      "validation.testStrategy.requireLayerTags",
      "validation.testStrategy.requireSizeTags",
    ]);
  });

  it("exempts an allowlisted key only under the path it was allowlisted for", () => {
    // `specSections` is exempt under `validation.require`. A same-named key
    // added under another parent is a NEW inert knob and must still be checked.
    const leaves = collectLeafKeys(
      { require: { specSections: [] }, traceability: { specSections: [] } },
      "validation",
    );

    expect(leaves.map((leaf) => leaf.path)).toEqual([
      "validation.require.specSections",
      "validation.traceability.specSections",
    ]);
    expect(leaves.filter((leaf) => !KNOWN_UNWIRED.has(leaf.path)).map((leaf) => leaf.path)).toEqual(
      ["validation.traceability.specSections"],
    );
  });

  it("does not accept a config path spelled out in a template literal", () => {
    // A deprecation message naming a key reads exactly like a property access
    // once the backticks are ignored, so the raw text must never count.
    const message = [
      "const message = `validation.traceability.newKey は廃止されました`;",
      "const nested = `${label}: `.concat(`.traceability.newKey`);",
    ].join("\n");
    const key = "validation.traceability.newKey";

    expect(readsPath(message, key)).toBe(false);
    expect(
      readsPath("const m = `見つかりません: ${config.validation.traceability.newKey}`;", key),
    ).toBe(true);
  });

  it("does not accept a write-only access as a consumer", () => {
    // Storing into a key is the shipped-but-inert defect restated: the value is
    // set and never consulted, so none of these may make `newKey` look wired.
    // The last four write through a pattern or a loop head, where the assignment
    // is several nodes above the access.
    const key = "validation.traceability.newKey";
    const writes = [
      "config.validation.traceability.newKey = false;",
      "config.validation.traceability.newKey ??= true;",
      "config.validation.traceability.newKey += 1;",
      "config.validation.traceability.newKey++;",
      "--config.validation.traceability.newKey;",
      "delete config.validation.traceability.newKey;",
      "[config.validation.traceability.newKey] = values;",
      "({ k: config.validation.traceability.newKey } = source);",
      "[...config.validation.traceability.newKey] = values;",
      "for (config.validation.traceability.newKey of values) { stop(); }",
      "for (config.validation.traceability.newKey in source) { stop(); }",
    ];

    for (const write of writes) {
      expect(readsPath(write, key), write).toBe(false);
    }
  });

  it("still counts the reads the write-only exclusion must not swallow", () => {
    // The same literals and loop heads on the reading side: an array literal or
    // an object literal is only a write target when an assignment is above it.
    const key = "validation.traceability.newKey";
    const reads = [
      "if (config.validation.traceability.newKey) { stop(); }",
      "const on = config.validation.traceability.newKey;",
      "seen = config.validation.traceability.newKey;",
      "report(config.validation.traceability.newKey);",
      'const on = config.validation.traceability["newKey"];',
      "const on = config.validation.traceability?.newKey;",
      "const xs = [config.validation.traceability.newKey];",
      "report({ k: config.validation.traceability.newKey });",
      "for (const x of config.validation.traceability.newKey) { stop(); }",
    ];

    for (const read of reads) {
      expect(readsPath(read, key), read).toBe(true);
    }

    // Writing *through* an object still reads that object: assigning to
    // `…traceability.newKey` is a read of `validation.traceability`.
    expect(
      readsPath("config.validation.traceability.newKey = false;", "validation.traceability"),
    ).toBe(true);
  });
});

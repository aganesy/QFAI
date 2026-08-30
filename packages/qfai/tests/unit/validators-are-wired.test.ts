/**
 * Meta-test: every prototyping validator function with `Issue[]` return must
 * be referenced from the validate.ts symbol graph (validate.ts itself, OR a
 * module imported by validate.ts).
 *
 * This catches the "validator written but never invoked" failure mode that
 * allowed `validateExecutionPlan` and `validateDelegationMap` to lurk as dead
 * code in v1.8.3 (RR §8.6). Adding a new prototyping validator without
 * dispatching it from runPrototypingValidators MUST fail this test in CI.
 *
 * Implementation strategy:
 *   1. Walk every TS file under src/core/validators/prototyping/
 *   2. Extract every `export function validate*(`
 *   3. Collect the names `validate.ts` actually **calls**, off its AST.
 *   4. Assert each validator is one of them, OR is on the documented
 *      PENDING_WIRING allowlist (existing dead code that requires a
 *      follow-up wiring effort).
 *
 * Step 3 used to build a "reachable text" blob — validate.ts plus every file
 * it imports, plus the files those re-export — and ask whether the name
 * appeared anywhere in it. That is not a wiring check: the barrel re-exports
 * every prototyping validator, so the 2-hop walk pulled in each validator's
 * own implementation file, where its own `export function` line made the name
 * "reachable" from its own declaration. Every validator passed by existing.
 * `validateDelegationMapIssues` was the proof — re-exported, never imported by
 * `validate.ts`, never called, so an invalid delegation map raised no
 * `QFAI-PROT-311` — and this guard called it wired.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTOTYPING_VALIDATORS_DIR = path.resolve(__dirname, "../../src/core/validators/prototyping");
const VALIDATORS_INDEX = path.resolve(__dirname, "../../src/core/validators/index.ts");
const VALIDATE_TS = path.resolve(__dirname, "../../src/core/validate.ts");
const SRC_ROOT = path.resolve(__dirname, "../../src");

const PUBLIC_VALIDATOR_RE = /^export\s+(?:async\s+)?function\s+(validate\w+)\s*\(/gm;

/**
 * Legacy custom-Issue-returning functions kept for backward compatibility
 * (will be deleted in Phase 7). Their *Issues replacement is the wiring path.
 */
const DEPRECATED_LEGACY_VALIDATORS = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

/**
 * Validators known to be dead code awaiting wiring. This set is empty: the
 * unwired validators the Phase 2 meta-test discovered were subsequently
 * deleted rather than adapted, so no name is left to track here. Every
 * prototyping validator that survives is dispatched from
 * runPrototypingValidators.
 *
 * This list MUST shrink over time and MUST never grow without explicit
 * justification. The sentinel `expect(PENDING_WIRING.size).toBe(0)` keeps
 * accidental regressions visible.
 */
const PENDING_WIRING: ReadonlySet<string> = new Set<string>();

/**
 * Validator names this guard mentions on purpose even though `src/` does not
 * declare them: they identify the dead-code regression this meta-test was
 * written to prevent, and both functions have since been deleted.
 */
const HISTORICAL_REFERENCES: ReadonlySet<string> = new Set<string>([
  "validateExecutionPlan",
  "validateDelegationMap",
]);

const COMMENT_LINE_RE = /^\s*(?:\/\/|\/\*|\*)/;
const VALIDATOR_MENTION_RE = /validate[A-Z]\w*/g;
const VALIDATOR_DECLARATION_RE = /(?:function|const|let)\s+(validate\w+)\s*[(=]/g;

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    if (name.endsWith(".d.ts")) continue;
    const full = path.join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await listTsFiles(full)));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

async function collectPublicValidators(
  dir: string,
): Promise<Array<{ name: string; file: string }>> {
  const files = await listTsFiles(dir);
  const out: Array<{ name: string; file: string }> = [];
  for (const file of files) {
    const body = await readFile(file, "utf-8");
    PUBLIC_VALIDATOR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PUBLIC_VALIDATOR_RE.exec(body)) !== null) {
      const name = match[1];
      if (!DEPRECATED_LEGACY_VALIDATORS.has(name)) {
        out.push({ name, file });
      }
    }
  }
  return out;
}

/**
 * Every function `validate.ts` calls by name.
 *
 * A call, not a mention: an `import` of the name and a comment naming it both
 * leave the validator unrun, and the text-reachability check this replaced
 * counted both. Read off the AST so a rename or a re-format cannot make a
 * dispatched validator look undispatched, or the reverse.
 */
async function collectDispatchedNames(): Promise<Set<string>> {
  const source = ts.createSourceFile(
    VALIDATE_TS,
    await readFile(VALIDATE_TS, "utf-8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
  const called = new Set<string>();
  const walk = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee)) {
        called.add(callee.text);
      } else if (ts.isPropertyAccessExpression(callee)) {
        // `mod.someValidator(…)` — a dynamic import's namespace, which
        // `runPrototypingValidators` uses for the mode reader.
        called.add(callee.name.text);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return called;
}

/** Every function name called anywhere inside one module. */
async function collectCallsIn(file: string): Promise<Set<string>> {
  const source = ts.createSourceFile(
    file,
    await readFile(file, "utf-8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
  const called = new Set<string>();
  const walk = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      called.add(node.expression.text);
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return called;
}

/**
 * Whether this validator runs: `validate.ts` calls it, or a sibling in the
 * same module that `validate.ts` does call calls it.
 *
 * The second branch is one hop and stays inside the module, which is how
 * `validateDelegationMapIssues` is reached — it takes the parsed map rather
 * than the project, so the dispatched `validatePrototypingDelegationMap`
 * reads the map and hands it over. A re-export satisfies neither branch: a
 * barrel calls nothing.
 */
async function isDispatched(
  name: string,
  file: string,
  dispatched: ReadonlySet<string>,
  publicNames: ReadonlySet<string>,
): Promise<boolean> {
  if (dispatched.has(name)) return true;
  const moduleHasEntryPoint = [...publicNames].some((sibling) => dispatched.has(sibling));
  if (!moduleHasEntryPoint) return false;
  return (await collectCallsIn(file)).has(name);
}

/** Every `validate*` function name declared anywhere under src/. */
async function collectDeclaredValidatorNames(): Promise<Set<string>> {
  const files = await listTsFiles(SRC_ROOT);
  const declared = new Set<string>();
  for (const file of files) {
    const body = await readFile(file, "utf-8");
    VALIDATOR_DECLARATION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VALIDATOR_DECLARATION_RE.exec(body)) !== null) {
      declared.add(match[1]);
    }
  }
  return declared;
}

/** Every `validate*` name this guard names in one of its own comments. */
function collectDocumentedValidatorNames(guardSource: string): Set<string> {
  const documented = new Set<string>();
  for (const line of guardSource.split(/\r?\n/)) {
    if (!COMMENT_LINE_RE.test(line)) continue;
    VALIDATOR_MENTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VALIDATOR_MENTION_RE.exec(line)) !== null) {
      documented.add(match[0]);
    }
  }
  return documented;
}

describe("meta-test: prototyping validators are wired into the pipeline", () => {
  it("every public Issue[]-returning validator under validators/prototyping/ is reachable from validate.ts", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const dispatched = await collectDispatchedNames();

    expect(validators.length, "expected at least one public validator").toBeGreaterThan(0);
    expect(dispatched.size, "expected validate.ts to call something").toBeGreaterThan(0);

    const perFile = new Map<string, Set<string>>();
    for (const { name, file } of validators) {
      const names = perFile.get(file) ?? new Set<string>();
      names.add(name);
      perFile.set(file, names);
    }

    const unwired: Array<{ name: string; file: string }> = [];
    for (const { name, file } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!(await isDispatched(name, file, dispatched, perFile.get(file) ?? new Set()))) {
        unwired.push({ name, file });
      }
    }

    if (unwired.length > 0) {
      const lines = unwired
        .map((u) => `  - ${u.name} (${path.relative(process.cwd(), u.file)})`)
        .join("\n");
      throw new Error(
        `The following prototyping validators are exported but never called by validate.ts:\n${lines}\n\n` +
          "Dispatch the validator from runPrototypingValidators in src/core/validate.ts before " +
          "merging. Re-exporting it from validators/index.ts is not dispatch. This guard exists " +
          "to prevent the v1.8.3 dead-code-validator regression (RR §8.6).",
      );
    }
  });

  it("validators/index.ts re-exports every public prototyping validator (excluding pending-wiring)", async () => {
    const validators = await collectPublicValidators(PROTOTYPING_VALIDATORS_DIR);
    const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");

    const missingExports: string[] = [];
    for (const { name } of validators) {
      if (PENDING_WIRING.has(name)) continue;
      if (!indexBody.includes(name)) {
        missingExports.push(name);
      }
    }

    expect(
      missingExports,
      `validators/index.ts must re-export every public prototyping validator. Missing: ${missingExports.join(", ")}`,
    ).toEqual([]);
  });

  it("the delegation map is judged on a real run (QFAI-PROT-311)", async () => {
    // The case that proved text-reachability was not a wiring check.
    // `validateDelegationMapIssues` takes the map, not the project, so nothing
    // could call it once the extractor was deleted — it is dispatched through
    // `validatePrototypingDelegationMap`, which reads the map itself.
    const dispatched = await collectDispatchedNames();
    expect(
      dispatched.has("validatePrototypingDelegationMap"),
      "validate.ts must call validatePrototypingDelegationMap",
    ).toBe(true);

    // And the dispatched form must actually reach the judgement.
    const module = await readFile(
      path.resolve(__dirname, "../../src/core/validators/prototyping/delegationMap.ts"),
      "utf-8",
    );
    expect(module).toContain("return validateDelegationMapIssues(");
  });

  it("does not count a re-export as dispatch", async () => {
    // The regression this guard now closes: the barrel re-exports every
    // prototyping validator, so a check that read the imported files' text
    // found each declaration and called it reachable. Naming is not calling.
    const indexBody = await readFile(VALIDATORS_INDEX, "utf-8");
    const dispatched = await collectDispatchedNames();
    expect(indexBody).toContain("validateDelegationMapIssues");
    expect(dispatched.has("validateDelegationMapIssues")).toBe(false);
  });

  it("PENDING_WIRING list does not grow silently (target: stay at 0)", () => {
    // Tripwire: if a contributor adds to PENDING_WIRING without justification,
    // this assertion documents the current count and forces a deliberate
    // update when changing it. The list MUST shrink, not grow.
    //
    // v1.8.4 Phase 3: PENDING_WIRING is empty. Every prototyping validator
    // is now reachable from runPrototypingValidators. NEW dead-code
    // validators cannot enter the codebase silently.
    expect(PENDING_WIRING.size).toBe(0);
  });

  it("documents only validators that src/ actually declares", async () => {
    // The guard tells the next contributor how to wire a validator. If its
    // own prose names functions that no longer exist, the instructions send
    // that contributor after a mechanism no file implements — the same
    // dead-surface defect the guard was built to catch.
    const guardSource = await readFile(__filename, "utf-8");
    const documented = collectDocumentedValidatorNames(guardSource);
    const declared = await collectDeclaredValidatorNames();

    const phantom = [...documented]
      .filter((name) => !declared.has(name) && !HISTORICAL_REFERENCES.has(name))
      .sort();

    expect(
      phantom,
      "these validators are named in this guard's comments but declared nowhere in src/: " +
        `${phantom.join(", ")}. Rewrite the prose to name a mechanism that exists, or add the ` +
        "name to HISTORICAL_REFERENCES if it is deliberately cited as a past regression.",
    ).toEqual([]);
  });
});

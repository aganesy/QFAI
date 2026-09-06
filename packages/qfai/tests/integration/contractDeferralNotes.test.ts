import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * CLI contracts must not use a release version as their tracking mechanism.
 *
 * A note of the shape "NOT YET IMPLEMENTED in vX.Y.Z — scheduled for vA.B.C+"
 * expires silently: the only way to notice the deadline arrived is to diff the
 * contract against `packages/qfai/package.json#version`. `qfai-init.md` carried
 * two such notes (`--allow-dirty`, exit 65) whose target version shipped with
 * neither behaviour implemented. Either a contract describes what the code does
 * today, or it points at a tracking issue — never at a version number.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");
const CONTRACTS_DIR = path.join(ROOT, ".qfai", "contracts");

/** A note that defers behaviour rather than describing today's. */
const DEFERRAL_RE = /NOT YET IMPLEMENTED|scheduled for\b/i;

/** The thing that must not be the tracking mechanism. */
const VERSION_PIN_RE = /\bv\d+\.\d+\.\d+/i;

/** A tracking issue, which is what a deferral is allowed to point at instead. */
const TRACKING_ISSUE_RE = /(?:#\d+|issues\/\d+)/;

/**
 * Whether one line defers behaviour to a **version number**.
 *
 * `NOT YET IMPLEMENTED` alone is not the defect. The defect is using a release
 * as the tracking mechanism, because nothing notices when that release ships:
 * `--allow-dirty` and exit 65 were both promised "in v1.10.0" and both arrived
 * with the version and without the behaviour. A deferral that names an issue
 * has an owner and a place to be closed, so it is allowed — rejecting it too
 * would ban the very form this file's own docstring recommends.
 */
function isVersionPinnedDeferral(line: string): boolean {
  if (!DEFERRAL_RE.test(line)) return false;
  if (!VERSION_PIN_RE.test(line)) return false;
  return !TRACKING_ISSUE_RE.test(line);
}

async function collectFiles(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(full);
    }
  }
  return files;
}

describe("CLI contracts do not defer behaviour to a version number", () => {
  it("no contract carries a version-pinned deferral note", async () => {
    const files = await collectFiles(CONTRACTS_DIR, ".md");
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (isVersionPinnedDeferral(line)) {
          offenders.push(`${path.relative(ROOT, file).replace(/\\/g, "/")}:${index + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("rejects a version pin and accepts a deferral that names its owner", () => {
    // The two notes this guard was written for.
    expect(
      isVersionPinnedDeferral(
        "**`--allow-dirty` NOT YET IMPLEMENTED in v1.9.0** — scheduled for v1.10.0+.",
      ),
    ).toBe(true);
    expect(isVersionPinnedDeferral("Reserved; scheduled for v1.11.0.")).toBe(true);

    // A deferral with an owner and a place to be closed is the form this file
    // recommends, and must not be banned along with the version pins.
    expect(isVersionPinnedDeferral("NOT YET IMPLEMENTED — tracked by #123.")).toBe(false);
    expect(
      isVersionPinnedDeferral("NOT YET IMPLEMENTED — tracked by #123, targeting v1.11.0."),
    ).toBe(false);

    // A version mentioned by a line that defers nothing is not a deferral.
    expect(isVersionPinnedDeferral("The recut landed in v1.10.0.")).toBe(false);
  });
});

describe("qfai-init.md matches what --upgrade-assistant-tree actually does", () => {
  const contractPath = path.join(CONTRACTS_DIR, "cli", "qfai-init.md");
  const initSourcePath = path.join(ROOT, "packages", "qfai", "src", "cli", "commands", "init.ts");

  it("documents that the helper does not inspect the working tree, and no --allow-dirty exists", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");
    const args = await readFile(
      path.join(ROOT, "packages", "qfai", "src", "cli", "lib", "args.ts"),
      "utf-8",
    );

    // The contract must state the absence plainly, not promise a future flag.
    expect(contract).toMatch(/Working tree state is NOT inspected/);
    expect(contract).not.toMatch(/`--allow-dirty` is supplied/);

    // …and the source must actually still lack the flag and the probe. If
    // either is implemented, the contract above is the thing to update.
    expect(source).not.toMatch(/allowDirty|allow-dirty/);
    expect(source).not.toMatch(/status\s+--porcelain/);
    expect(args).not.toMatch(/allowDirty|allow-dirty/);
  });

  it("documents the catalog fallback instead of an unreachable exit 65", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    // The `--upgrade-assistant-tree` exit-code table must not promise a code
    // the helper cannot emit.
    const additional = contract.split("Exit codes (additional):")[1] ?? "";
    expect(additional).not.toMatch(/^\|\s*65\s*\|/m);
    expect(additional).toMatch(/catalog/);

    // The fallback the contract now documents is the classifier's last
    // statement; covered behaviourally by tests/cli/init.test.ts
    // ("leaves non-top-level migrations segments in catalog/").
    expect(source).toMatch(/return \{ layer: "catalog", subpath: posix \};/);
  });

  // The `catalog/` fallback only reaches files the helper actually walks, and
  // the pre-recut `manifest/` surface is deliberately not one of them (its path
  // is unchanged by the recut). A contract that promises "any legacy path" is
  // wrong for exactly the surface whose rationale it quotes.
  it("scopes the relocation to the surfaces runUpgradeAssistantTree walks", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`\.qfai\/assistant\/manifest\/\*` is \*\*not\*\* walked/);
    expect(source).toMatch(
      /const legacySurfaces: Array<\{ name: "steering" \| "instructions"; dir: string \}>/,
    );
  });

  // `report` now names every written path, so the contract may say so — but it
  // still must not call that list a "copied-path list", and it must not sell it
  // as the rollback set: the enumeration carries no Git status, so rollback
  // still goes through `git status`.
  it("describes the written-path list the run prints, and still routes rollback through git status", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).not.toMatch(/copied-path list/);
    // `--untracked-files=all` is required: the default `normal` mode collapses
    // a wholly-new directory into one `?? dir/` entry, which names no file.
    expect(contract).toMatch(/git status --short --untracked-files=all \.qfai\/assistant\//);
    expect(contract).not.toMatch(/git status --short \.qfai\/assistant\//);
    // …and the listing covers the whole invocation, because the init flow that
    // follows seeds into the same layers. The contract must not sell it as the
    // migration step's own rollback set.
    expect(contract).toMatch(/never the enclosing directory/);

    // The count and the enumeration the contract paragraph above names. Pinned
    // together so the contract cannot keep describing a shape `report` dropped.
    expect(source).toMatch(
      /info\(`\s+\$\{dryRun \? "would write" : "written"\}: \$\{writtenPaths\.length\}`\)/,
    );
    expect(source).toMatch(/info\(dryRun \? " {2}would write paths:" : " {2}written paths:"\)/);
    expect(source).not.toMatch(/copied paths:/);
    expect(contract).toMatch(/`written: N`/);
  });

  // `--upgrade-assistant-tree` falls through into the ordinary init flow, which
  // rewrites the managed `.gitignore` block in place and (with `--force`, which
  // is not rejected alongside it) regenerates and deletes files. The contract
  // must scope "additive" to the migration step rather than to the invocation.
  it("separates the additive migration step from the init flow that follows it", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`ensureRootGitignoreEntries`/);
    expect(contract).toMatch(/`--force` is not rejected alongside `--upgrade-assistant-tree`/);

    // The non-additive step the contract now names really is on this path.
    expect(source).toMatch(/await ensureRootGitignoreEntries\(destRoot, options\.dryRun\)/);
  });
});

/**
 * A finding code documented with no emitter is the same failure mode as a
 * version-pinned deferral: the contract promises behaviour, nothing produces
 * it, and no mechanism notices. `E-WORKLOG-SECRET` sat in the delta table as a
 * security hard block that no validator raises, so the table is now checked
 * against the source that would have to emit each code.
 *
 * "Appears under src/" would not have caught it: a bare substring search is
 * satisfied by a JSDoc line, a prose comment, or a dead constant. The check
 * below instead demands a *reachable emission*: the code must reach a finding
 * constructor (or a CLI note the command prints), inside a module the runner
 * actually invokes. Pasting `E-WORKLOG-SECRET` into a comment or an unused
 * table no longer satisfies it.
 */

const SRC_DIR = path.join(ROOT, "packages", "qfai", "src");

/** The shipped `Issue` factory, seeded so the scan is never silently empty. */
const SHARED_ISSUE_FACTORY = "issue";

/** How a code reaches a finding, for the failure message. */
type EmissionShape = "issue-argument" | "issue-literal" | "gate-set" | "cli-note";

interface ModuleSource {
  readonly rel: string;
  readonly file: ts.SourceFile;
}

async function parseSourceModules(): Promise<ModuleSource[]> {
  const files = await collectFiles(SRC_DIR, ".ts");
  return Promise.all(
    files.map(async (file) => ({
      rel: path.relative(SRC_DIR, file).replace(/\\/g, "/"),
      file: ts.createSourceFile(
        file,
        await readFile(file, "utf-8"),
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
      ),
    })),
  );
}

function forEachNode(root: ts.Node, visit: (node: ts.Node) => void): void {
  const walk = (node: ts.Node): void => {
    visit(node);
    ts.forEachChild(node, walk);
  };
  walk(root);
}

/**
 * Every function that turns a code into an `Issue`: the shared helper plus each
 * local factory taking the code as its first parameter. Discovered rather than
 * listed, so a new one is covered the day it is written.
 */
function collectIssueFactories(modules: readonly ModuleSource[]): Set<string> {
  const factories = new Set<string>([SHARED_ISSUE_FACTORY]);
  for (const { file } of modules) {
    forEachNode(file, (node) => {
      if (!ts.isFunctionDeclaration(node) || node.name === undefined) return;
      if (node.type === undefined || !/\bIssue\b/.test(node.type.getText(file))) return;
      if (node.parameters[0]?.name.getText(file) !== "code") return;
      factories.add(node.name.text);
    });
  }
  return factories;
}

/** `const NAME = "value"` bindings in one module, for resolving an identifier. */
function stringConstants(module: ModuleSource): Map<string, string> {
  const constants = new Map<string, string>();
  forEachNode(module.file, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return;
    const initializer = node.initializer;
    if (initializer !== undefined && ts.isStringLiteral(initializer)) {
      constants.set(node.name.text, initializer.text);
    }
  });
  return constants;
}

/** Does this expression evaluate to `code`, directly or through a constant? */
function resolvesToCode(
  expression: ts.Expression | undefined,
  code: string,
  constants: ReadonlyMap<string, string>,
): boolean {
  if (expression === undefined) return false;
  if (ts.isStringLiteral(expression)) return expression.text === code;
  if (ts.isIdentifier(expression)) return constants.get(expression.text) === code;
  if (ts.isConditionalExpression(expression)) {
    return (
      resolvesToCode(expression.whenTrue, code, constants) ||
      resolvesToCode(expression.whenFalse, code, constants)
    );
  }
  return false;
}

/**
 * Shape 1 — the code is the first argument of a finding factory, or the `code`
 * of an object literal that is `Issue`-shaped.
 *
 * `severity` is what makes the second half a finding rather than metadata:
 * `Issue.severity` is required, so `{ code: "X" }` on its own is a note to
 * nobody. Dropping that qualifier is how a dead `const planned = { code: … }`
 * used to read as an emitter.
 */
function emitsDirectly(
  module: ModuleSource,
  code: string,
  factories: ReadonlySet<string>,
  constants: ReadonlyMap<string, string>,
): EmissionShape | null {
  let shape: EmissionShape | null = null;
  forEachNode(module.file, (node) => {
    if (shape !== null) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (
        factories.has(node.expression.text) &&
        resolvesToCode(node.arguments[0], code, constants)
      ) {
        shape = "issue-argument";
      }
      return;
    }
    if (!ts.isObjectLiteralExpression(node)) return;
    const named = (key: string): ts.PropertyAssignment | undefined =>
      node.properties.find(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) && property.name.getText(module.file) === key,
      );
    const codeProperty = named("code");
    if (codeProperty === undefined || named("severity") === undefined) return;
    if (resolvesToCode(codeProperty.initializer, code, constants)) shape = "issue-literal";
  });
  return shape;
}

/**
 * Shape 2 — the code is a member of a gate the module tests findings against.
 *
 * `reviewerJustification.ts` reads codes off a review report and raises the
 * ones on `ADVISORY_FAILING_CODES`, so the literal is the gate rather than the
 * source. It counts only when that same binding is actually asked
 * (`NAME.has(x)` / `NAME.includes(x)`) **and** the module hands a non-literal
 * to a factory — an array nobody consults proves nothing, which is exactly how
 * a dead constant used to pass.
 */
function emitsThroughGate(
  module: ModuleSource,
  code: string,
  factories: ReadonlySet<string>,
): EmissionShape | null {
  const gates = new Set<string>();
  let variableEmission = false;
  forEachNode(module.file, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (holdsCode(node.initializer, code, module.file)) gates.add(node.name.text);
      return;
    }
    if (!ts.isCallExpression(node)) return;
    if (ts.isIdentifier(node.expression) && factories.has(node.expression.text)) {
      const first = node.arguments[0];
      if (first !== undefined && ts.isIdentifier(first)) variableEmission = true;
      return;
    }
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    const member = node.expression.name.text;
    if (member !== "has" && member !== "includes") return;
    const target = node.expression.expression;
    if (ts.isIdentifier(target) && gates.has(target.text)) gates.add(`asked:${target.text}`);
  });
  const asked = [...gates].some((name) => name.startsWith("asked:"));
  return asked && variableEmission ? "gate-set" : null;
}

/** Is `code` a literal element of this array / `new Set([...])` initializer? */
function holdsCode(
  initializer: ts.Expression | undefined,
  code: string,
  file: ts.SourceFile,
): boolean {
  if (initializer === undefined) return false;
  const elements = ts.isArrayLiteralExpression(initializer)
    ? initializer.elements
    : ts.isNewExpression(initializer) &&
        /^(?:Set|Map)$/.test(initializer.expression.getText(file)) &&
        initializer.arguments?.[0] !== undefined &&
        ts.isArrayLiteralExpression(initializer.arguments[0])
      ? initializer.arguments[0].elements
      : undefined;
  if (elements === undefined) return false;
  return elements.some((element) => ts.isStringLiteral(element) && element.text === code);
}

/**
 * Shape 3 — a note a CLI command prints. It is not an `Issue`, but the contract
 * documents it as a code the operator sees, so the string carrying it has to be
 * an argument to a printer or an element of a list that is printed.
 */
function emitsAsCliNote(module: ModuleSource, code: string): EmissionShape | null {
  const printers = new Set(["info", "warn", "error", "log", "push"]);
  let shape: EmissionShape | null = null;
  forEachNode(module.file, (node) => {
    if (shape !== null || !ts.isCallExpression(node)) return;
    const callee = node.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : "";
    if (!printers.has(name)) return;
    for (const argument of node.arguments) {
      if (carriesCode(argument, code)) shape = "cli-note";
    }
  });
  return shape;
}

/** Does this argument carry `code` inside a string it will print? */
function carriesCode(node: ts.Node, code: string): boolean {
  let found = false;
  forEachNode(node, (inner) => {
    if (found) return;
    if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) {
      found = inner.text.includes(code);
    } else if (ts.isTemplateExpression(inner)) {
      found =
        inner.head.text.includes(code) ||
        inner.templateSpans.some((span) => span.literal.text.includes(code));
    }
  });
  return found;
}

describe("qfai-validate.md documents only finding codes the source can emit", () => {
  it("every code in the delta table is emitted by a module the runner invokes", async () => {
    const contract = await readFile(path.join(CONTRACTS_DIR, "cli", "qfai-validate.md"), "utf-8");
    const section = contract.split("## New finding codes (this delta)")[1] ?? "";
    const table = section.split(/^## /m)[0] ?? "";

    const codes = [...table.matchAll(/^\|\s*`([A-Z]-[A-Z0-9-]+)`/gm)]
      .map((match) => match[1] ?? "")
      .filter((code) => code.length > 0);
    expect(codes.length).toBeGreaterThan(5);

    const modules = await parseSourceModules();
    const factories = collectIssueFactories(modules);
    expect(factories.size).toBeGreaterThan(1);

    const runner = modules.find((module) => module.rel === "core/validate.ts");
    const cliEntry = modules.find((module) => module.rel === "cli/main.ts");
    expect(runner).toBeDefined();
    expect(cliEntry).toBeDefined();
    const runnerText = runner?.file.getFullText() ?? "";
    const cliEntryText = cliEntry?.file.getFullText() ?? "";

    /** A validator module counts only if `core/validate.ts` calls one of its exports. */
    const runnerInvokes = (module: ModuleSource): boolean => {
      if (module.rel === "core/validate.ts") return true;
      let called = false;
      forEachNode(module.file, (node) => {
        if (called) return;
        if (!ts.isFunctionDeclaration(node) || node.name === undefined) return;
        const exported = ts
          .getModifiers(node)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
        if (exported === true && runnerText.includes(`${node.name.text}(root`)) called = true;
      });
      return called;
    };

    /** A CLI module counts only if `cli/main.ts` imports it. */
    const cliDispatches = (module: ModuleSource): boolean => {
      if (!module.rel.startsWith("cli/commands/")) return false;
      const specifier = `./${module.rel.slice("cli/".length).replace(/\.ts$/, ".js")}`;
      return cliEntryText.includes(specifier);
    };

    const emitters = new Map<string, string[]>();
    for (const code of codes) {
      const found: string[] = [];
      for (const module of modules) {
        const constants = stringConstants(module);
        const reachable =
          emitsDirectly(module, code, factories, constants) ??
          emitsThroughGate(module, code, factories);
        if (reachable !== null && runnerInvokes(module)) {
          found.push(`${module.rel} (${reachable})`);
          continue;
        }
        if (cliDispatches(module) && emitsAsCliNote(module, code) !== null) {
          found.push(`${module.rel} (cli-note)`);
        }
      }
      emitters.set(code, found);
    }

    const orphans = codes.filter((code) => (emitters.get(code) ?? []).length === 0);
    expect(orphans).toEqual([]);
  });

  it("rejects a mention that never reaches a finding", async () => {
    // The three ways `E-WORKLOG-SECRET` could be smuggled back in. Each is
    // parsed the way the check parses `src/`, so a regression to a substring
    // scan fails here rather than in six months.
    const modules = await parseSourceModules();
    const factories = collectIssueFactories(modules);
    const probe = (source: string): ModuleSource => ({
      rel: "core/validators/probe.ts",
      file: ts.createSourceFile("probe.ts", source, ts.ScriptTarget.Latest, true),
    });

    const inComment = probe("// E-WORKLOG-SECRET is planned.\n/** E-WORKLOG-SECRET */\n");
    expect(emitsDirectly(inComment, "E-WORKLOG-SECRET", factories, new Map())).toBeNull();

    // The reviewer's case: a `code:` field on something that is not an Issue.
    const metadataOnly = probe('const planned = { code: "E-WORKLOG-SECRET" };\nvoid planned;\n');
    expect(emitsDirectly(metadataOnly, "E-WORKLOG-SECRET", factories, new Map())).toBeNull();

    // A dead table in a module that does emit findings from a variable.
    const deadTable = probe(
      [
        'const PLANNED = ["E-WORKLOG-SECRET"];',
        'const GATE = new Set(["R-WORKLOG-DRIFT"]);',
        "for (const code of codes) {",
        "  if (!GATE.has(code)) continue;",
        '  issue(code, "msg", "error");',
        "}",
        "void PLANNED;",
      ].join("\n"),
    );
    expect(emitsThroughGate(deadTable, "E-WORKLOG-SECRET", factories)).toBeNull();
    // The gate that *is* consulted still counts.
    expect(emitsThroughGate(deadTable, "R-WORKLOG-DRIFT", factories)).toBe("gate-set");

    // And the shapes that must keep passing.
    const real = probe('issue("W-SKILL-PROJECT-MEMORY", "msg", "warning");');
    expect(emitsDirectly(real, "W-SKILL-PROJECT-MEMORY", factories, new Map())).toBe(
      "issue-argument",
    );
    const shaped = probe('const f = { code: "W-WORKLOG-STALE", severity: "warning" };\nvoid f;\n');
    expect(emitsDirectly(shaped, "W-WORKLOG-STALE", factories, new Map())).toBe("issue-literal");
  });
});

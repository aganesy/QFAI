import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import type { Issue } from "../../src/core/types.js";
import {
  EVIDENCE_MUTATION_PAIRS,
  detectEvidenceMutationUnlogged,
} from "../../src/core/validators/evidenceMutationUnlogged.js";
import { detectHandoffSchemaDrift } from "../../src/core/validators/handoffSchemaDrift.js";
import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../src/core/validators/handoffSchemaPairs.js";
import { JUSTIFICATION_CATALOG } from "../../src/core/validators/justificationCatalog.js";
import {
  MOCK_HREF_PAIRS,
  MOCK_HREF_TEMPLATE_REL,
  MOCK_HREF_VALIDATOR_REL,
} from "../../src/core/validators/mockHrefPairs.js";
import { detectMockHrefDrift } from "../../src/core/validators/reviewerGate.js";
import { detectSkillManifestDrift } from "../../src/core/validators/skillManifestDrift.js";
import { SKILL_MANIFEST_PAIRS } from "../../src/core/validators/skillManifestPairs.js";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root would resolve `src/` to a path that does not exist and the walk
// below would scan nothing, passing vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcRoot = path.join(packageRoot, "src");
// The pinned pair paths (`packages/qfai/**`) are resolved from here.
const repoRoot = path.resolve(packageRoot, "..", "..");

/**
 * A synthetic source tree, keyed by the repo-relative path each file
 * occupies, whose contents make the owning detector raise its code.
 */
type DriftFixture = ReadonlyMap<string, string>;

/**
 * How far a catalog code's AUTOMATIC detection actually reaches.
 *
 * `consumer` — the detector ships in `dist` and reads consumer-owned paths,
 *   so the owning command really can raise it in a consuming project.
 * `repo-source` — the detector ships, but it resolves `packages/qfai/**`
 *   paths under the validated root, so it returns an empty result in a
 *   consumer install that has no package source.
 * `repo-script` — no detector ships at all; only this repository's lint lane
 *   (an unpublished `scripts/` entry) raises it.
 *
 * Independent of scope, every code still reaches a consuming project's
 * `qfai validate` output through the reviewer-justification ingestion path
 * (`reviewerJustification.ts`) when a Reviewer subagent hand-reports it with
 * an empty `justification:`. The scope is about detection, not about the
 * justification contract — which is why the disclosure text says so.
 *
 * `repo-source` and `repo-script` are both PROVEN at runtime below, not
 * asserted from a path string: the detector is run against a consumer-shaped
 * root, and the script is executed and its stderr read.
 */
type LimitedScopeDeclaration =
  | {
      readonly scope: "repo-source";
      /** Module that pins the `packages/qfai/**` paths the detector resolves. */
      readonly gate: string;
      /** The shipped detector itself — run, not grepped. */
      readonly detect: (root: string) => Promise<readonly Issue[]>;
      /** Tree that makes `detect` fire when planted at the paths the gate pins. */
      readonly driftFixture: () => Promise<DriftFixture>;
      readonly descriptionMarkers: readonly RegExp[];
    }
  | {
      readonly scope: "repo-script";
      /** Unpublished script that raises the code. */
      readonly emitter: string;
      /** Argv that must drive the script to write the code to stderr. */
      readonly driftArgs: readonly string[];
      /** Argv on a compliant input, which must stay silent and exit 0. */
      readonly cleanArgs: readonly string[];
      readonly descriptionMarkers: readonly RegExp[];
    };

const REPO_SOURCE_MARKERS: readonly RegExp[] = [
  /Scope: repo-source/,
  /empty result in a consuming project's install/,
];

/** Placeholder body for the side of a pair that must NOT carry its token. */
const NO_TOKEN = "// drift fixture: the paired token is deliberately absent here.\n";

async function handoffDriftFixture(): Promise<DriftFixture> {
  // The schema side must still declare the token the detector keys on, and
  // that token is module-private — so plant the real schema source rather
  // than re-encoding its name here.
  const schema = await readFile(path.join(repoRoot, HANDOFF_SCHEMA_REL), "utf8");
  const files = new Map<string, string>([[HANDOFF_SCHEMA_REL, schema]]);
  for (const pair of HANDOFF_WRITER_PAIRS) files.set(pair.writerRel, NO_TOKEN);
  return files;
}

function skillManifestDriftFixture(): Promise<DriftFixture> {
  const files = new Map<string, string>();
  for (const pair of SKILL_MANIFEST_PAIRS) {
    files.set(pair.probeImplRel, `export const PROBE = "${pair.probeToken}";\n`);
    files.set(pair.schemaRel, NO_TOKEN);
  }
  return Promise.resolve(files);
}

function mockHrefDriftFixture(): Promise<DriftFixture> {
  const drifted = MOCK_HREF_PAIRS.flatMap((pair) => pair.templateDriftTokens).join("\n");
  return Promise.resolve(
    new Map<string, string>([
      [MOCK_HREF_TEMPLATE_REL, `${drifted}\n`],
      [MOCK_HREF_VALIDATOR_REL, NO_TOKEN],
    ]),
  );
}

function evidenceMutationDriftFixture(): Promise<DriftFixture> {
  const files = new Map<string, string>();
  for (const pair of EVIDENCE_MUTATION_PAIRS) {
    const previous = files.get(pair.sourceRel) ?? NO_TOKEN;
    files.set(pair.sourceRel, `${previous}${pair.mutationTokens.join("\n")}\n`);
  }
  return Promise.resolve(files);
}

/**
 * Catalog codes whose detection does NOT reach a consuming project.
 *
 * The catalog itself compiles into `dist` and reaches consumers, so an entry
 * here MUST say so in its `description` — otherwise the catalog advertises a
 * rule the consumer never gets. `descriptionMarkers` pins that disclosure.
 *
 * This map is a declaration, not permission to add more: a NEW catalog code
 * with no shipped emitter fails the consumer-scope test until it is either
 * given one or listed here with the matching description text. Widening a
 * code's reach means deleting its entry here — the consumer-scope test then
 * requires its description to drop the scope note.
 */
const LIMITED_SCOPE: ReadonlyMap<string, LimitedScopeDeclaration> = new Map<
  string,
  LimitedScopeDeclaration
>([
  [
    "R-HANDOFF-SCHEMA-DRIFT",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "handoffSchemaPairs.ts"),
      detect: detectHandoffSchemaDrift,
      driftFixture: handoffDriftFixture,
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-EVIDENCE-MUTATION-UNLOGGED",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "evidenceMutationUnlogged.ts"),
      detect: detectEvidenceMutationUnlogged,
      driftFixture: evidenceMutationDriftFixture,
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-SKILL-MANIFEST-DRIFT",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "skillManifestPairs.ts"),
      detect: detectSkillManifestDrift,
      driftFixture: skillManifestDriftFixture,
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-MOCK-HREF-DRIFT",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "mockHrefPairs.ts"),
      detect: detectMockHrefDrift,
      driftFixture: mockHrefDriftFixture,
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-PACK-LOCATION-DRIFT",
    {
      scope: "repo-script",
      emitter: path.join("scripts", "check-pack-locations.mjs"),
      driftArgs: ["--changed", "docs/review-2026-01-01/PLAN.md"],
      cleanArgs: ["--changed", ".qfai/review/review-2026-01-01/PLAN.md"],
      descriptionMarkers: [
        /Scope: repo-script/,
        /no detector for this code ships in the published package/,
        /ci:lint/,
        /does not auto-detect pack-location drift/,
      ],
    },
  ],
]);

function walk(root: ts.Node, visit: (node: ts.Node) => void): void {
  const step = (node: ts.Node): void => {
    visit(node);
    ts.forEachChild(node, step);
  };
  step(root);
}

/** Peel `(x)`, `x as const` and `x satisfies T` down to the real expression. */
function unwrap(node: ts.Node): ts.Node {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** The literal text of a plain string expression, or `undefined`. */
function staticStringValue(node: ts.Node): string | undefined {
  const inner = unwrap(node);
  if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return inner.text;
  return undefined;
}

/** `issue(…)` and `helpers.issue(…)` — the callee shapes `src/` uses. */
function isIssueCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return expression.text === "issue";
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text === "issue";
  return false;
}

/**
 * Every finding code `source` really constructs an `Issue` for, either
 * literally (`issue("CODE", …)`) or through a single-file constant binding
 * (`const FINDING_CODE = "CODE"` … `issue(FINDING_CODE, …)`) — the two shapes
 * every catalog emitter in `src/` uses today.
 *
 * Parsed, not pattern-matched. Text matching cannot tell a call from the same
 * characters quoted inside a string: stripping comments still leaves literal
 * bodies intact, so deleting the real emission and leaving an explanatory
 * `const example = 'issue("CODE", message)'` (or a `--help` line spelling the
 * call out) behind would keep a regex probe green and hide the regression this
 * suite exists to catch. The parser sees a StringLiteral there and no
 * CallExpression, so lexical context is decided by the grammar rather than
 * re-implemented here — and comments and dead constants drop out for free.
 *
 * Returns the whole set rather than answering one code at a time so a file is
 * parsed once for all eight catalog codes, not once per code.
 */
export function emittedIssueCodes(source: string): Set<string> {
  const parsed = ts.createSourceFile(
    "emitter-probe.ts",
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    ts.ScriptKind.TS,
  );

  // Two passes so a constant declared after its use still binds.
  const stringConstants = new Map<string, string>();
  walk(parsed, (node) => {
    if (!ts.isVariableDeclaration(node)) return;
    if (!ts.isIdentifier(node.name)) return;
    if (node.initializer === undefined) return;
    const value = staticStringValue(node.initializer);
    if (value !== undefined) stringConstants.set(node.name.text, value);
  });

  const codes = new Set<string>();
  walk(parsed, (node) => {
    if (!ts.isCallExpression(node)) return;
    if (!isIssueCallee(node.expression)) return;
    const first = node.arguments[0];
    if (first === undefined) return;
    const literal = staticStringValue(first);
    if (literal !== undefined) {
      codes.add(literal);
      return;
    }
    const arg = unwrap(first);
    if (!ts.isIdentifier(arg)) return;
    const bound = stringConstants.get(arg.text);
    if (bound !== undefined) codes.add(bound);
  });
  return codes;
}

/** Single-code view of {@link emittedIssueCodes}. */
export function emitsIssueCode(source: string, code: string): boolean {
  return emittedIssueCodes(source).has(code);
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * code -> package-relative files under `src/` that construct an `Issue` for it.
 *
 * Built once and shared: parsing the whole of `src/` per catalog code would
 * repeat the same work eight times over, and every test below asks about a
 * different code from the same unchanged tree.
 */
let srcEmitterIndex: Promise<ReadonlyMap<string, readonly string[]>> | undefined;

function buildSrcEmitterIndex(): Promise<ReadonlyMap<string, readonly string[]>> {
  return (async (): Promise<ReadonlyMap<string, readonly string[]>> => {
    const index = new Map<string, string[]>();
    for (const file of await collectTsFiles(srcRoot)) {
      const rel = path.relative(packageRoot, file);
      for (const code of emittedIssueCodes(await readFile(file, "utf8"))) {
        const hits = index.get(code);
        if (hits === undefined) index.set(code, [rel]);
        else hits.push(rel);
      }
    }
    return index;
  })();
}

/** Files under `src/` that really construct an `Issue` carrying `code`. */
async function emittersFor(code: string): Promise<readonly string[]> {
  srcEmitterIndex ??= buildSrcEmitterIndex();
  const index = await srcEmitterIndex;
  return index.get(code) ?? [];
}

const PACKAGE_PREFIX = "packages/qfai/";
const ASSET_PREFIX = "assets/init/";

/**
 * Every place the same file would live in a consuming project: the
 * package-relative path (a consumer's own tree), the installed copy under
 * `node_modules/qfai/`, and — for template assets — the `.qfai/` tree that
 * `qfai init` writes. A detector that grew ANY consumer-owned branch finds
 * its pair here and fires, which is what the reach probe below asserts on.
 */
function consumerShapedPaths(rel: string): string[] {
  const posix = rel.split(path.sep).join("/");
  if (!posix.startsWith(PACKAGE_PREFIX)) return [posix];
  const rest = posix.slice(PACKAGE_PREFIX.length);
  const out = [rest, `node_modules/qfai/${rest}`];
  if (rest.startsWith(ASSET_PREFIX)) out.push(rest.slice(ASSET_PREFIX.length));
  return out;
}

/**
 * Scratch trees go under the repository-root `tmp/`, not `os.tmpdir()`:
 * `tmp/` is the sole sanctioned staging area in this repository
 * (`.agents/rules/temporary-files.md`), and deleting the tree afterwards does
 * not license writing it somewhere the rule forbids in the first place. The
 * directory is git-ignored and absent from a fresh clone, so create it first.
 */
async function makeScratchDir(prefix: string): Promise<string> {
  const scratchRoot = path.join(repoRoot, "tmp");
  await mkdir(scratchRoot, { recursive: true });
  return mkdtemp(path.join(scratchRoot, prefix));
}

async function writeTree(root: string, files: Iterable<readonly [string, string]>): Promise<void> {
  for (const [rel, content] of files) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
}

type ScriptRun = { readonly exitCode: number; readonly stderr: string };

/** Run an unpublished repo script and capture what it really wrote to stderr. */
function runScript(scriptAbs: string, args: readonly string[]): Promise<ScriptRun> {
  return new Promise<ScriptRun>((resolve, reject) => {
    execFile(
      process.execPath,
      [scriptAbs, ...args],
      { cwd: packageRoot, encoding: "utf8" },
      (error, _stdout, stderr) => {
        if (error === null) {
          resolve({ exitCode: 0, stderr });
          return;
        }
        // A non-zero exit is the expected outcome for the drift case, so it
        // resolves; a spawn failure (no `code`) is a real error.
        if (typeof error.code === "number") {
          resolve({ exitCode: error.code, stderr });
          return;
        }
        reject(error);
      },
    );
  });
}

describe("justification catalog: every code ships with its emitter, or says it does not", () => {
  it("counts real issue() call-sites, not comments or dead constants", () => {
    const code = "R-PACK-LOCATION-DRIFT";
    expect(emitsIssueCode(`// mentions ${code} in a comment; the operator's note.\n`, code)).toBe(
      false,
    );
    expect(emitsIssueCode(`/**\n * ${code} is documented here.\n */\n`, code)).toBe(false);
    expect(emitsIssueCode(`const UNUSED = "${code}";\n`, code)).toBe(false);
    expect(emitsIssueCode(`issues.push(issue("${code}", msg, "error"));\n`, code)).toBe(true);
    expect(
      emitsIssueCode(
        `const FINDING_CODE = "${code}";\nissues.push(issue(FINDING_CODE, msg));\n`,
        code,
      ),
    ).toBe(true);
  });

  it("does not count call syntax that only appears inside a string literal", () => {
    const code = "R-PACK-LOCATION-DRIFT";
    // The emission is gone; only prose that quotes the call is left. A text
    // probe reads these as call sites, so the regression would hide here.
    expect(emitsIssueCode(`const example = 'issue("${code}", message)';\n`, code)).toBe(false);
    expect(emitsIssueCode(`const help = \`  issue("${code}", msg)\`;\n`, code)).toBe(false);
    expect(
      emitsIssueCode(
        `const FINDING_CODE = "${code}";\nconst h = "issue(FINDING_CODE, msg)";\n`,
        code,
      ),
    ).toBe(false);
    expect(emitsIssueCode(`log("emits issue(\\"${code}\\", msg) when drifted");\n`, code)).toBe(
      false,
    );
  });

  it("still counts a real call whose message text also quotes the code", () => {
    // Over-correction pin: every emitter in `src/` builds its message from the
    // code as well (``${FINDING_CODE}: …``), and a multi-line argument list is
    // the prevailing shape. Neither may be read as "inside a string".
    const code = "R-PACK-LOCATION-DRIFT";
    expect(
      emitsIssueCode(
        `const FINDING_CODE = "${code}";\n` +
          "const message = `${FINDING_CODE}: pack directory is out of place.`;\n" +
          'issues.push(issue(FINDING_CODE, message, "error", rel, "reviewerGate.packLocation"));\n',
        code,
      ),
    ).toBe(true);
    expect(
      emitsIssueCode(
        `issues.push(\n  issue(\n    "${code}",\n    message,\n    "error",\n  ),\n);\n`,
        code,
      ),
    ).toBe(true);
  });

  it("stages its scratch trees under the repository-root tmp/", async () => {
    const dir = await makeScratchDir("qfai-scope-scratch-pin-");
    try {
      const relative = path.relative(path.join(repoRoot, "tmp"), dir);
      expect(relative).not.toBe("");
      expect(relative.startsWith("..")).toBe(false);
      expect(path.isAbsolute(relative)).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not publish `scripts/` — repo-script emitters cannot reach a consumer", async () => {
    const raw = await readFile(path.join(packageRoot, "package.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const files =
      typeof parsed === "object" && parsed !== null && "files" in parsed ? parsed.files : undefined;
    expect(Array.isArray(files)).toBe(true);
    const entries = Array.isArray(files) ? files : [];
    for (const entry of entries) {
      expect(typeof entry).toBe("string");
      expect(String(entry).replace(/^\.\//, "").split("/")[0]).not.toBe("scripts");
    }
  });

  it("every consumer-scope code has a shipped emitter and claims no limited scope", async () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      if (LIMITED_SCOPE.has(entry.code)) continue;
      const hits = await emittersFor(entry.code);
      expect(hits, `${entry.code} has no issue() emitter under src/`).not.toHaveLength(0);
      expect(
        entry.description,
        `${entry.code} reaches consumers — drop the scope note from its description`,
      ).not.toMatch(/Scope: repo-(source|script)/);
    }
  });

  it("every limited-scope code discloses that scope in the shipped description", () => {
    for (const [code, declared] of LIMITED_SCOPE) {
      const entry = JUSTIFICATION_CATALOG.find((e) => e.code === code);
      expect(entry, `${code} is declared limited-scope but is not a catalog code`).toBeDefined();
      const description = entry?.description ?? "";
      for (const marker of declared.descriptionMarkers) {
        expect(description, `${code} description must disclose ${String(marker)}`).toMatch(marker);
      }
    }
  });

  it("every repo-source detector fires on package source and stays silent on a consumer tree", async () => {
    for (const [code, declared] of LIMITED_SCOPE) {
      if (declared.scope !== "repo-source") continue;
      const hits = await emittersFor(code);
      expect(hits, `${code} lost its shipped emitter — reclassify it`).not.toHaveLength(0);

      const fixture = await declared.driftFixture();
      const root = await makeScratchDir("qfai-scope-reach-");
      try {
        // 1. Repo-shaped: the fixture must really drive the detector, or the
        //    consumer-shaped leg below would pass vacuously.
        const repoShaped = path.join(root, "repo");
        await writeTree(repoShaped, fixture);
        const repoIssues = await declared.detect(repoShaped);
        expect(
          repoIssues.map((found) => found.code),
          `the drift fixture no longer makes ${declared.gate} raise ${code}`,
        ).toContain(code);

        // 2. Consumer-shaped: the same contents, at every path a consuming
        //    project owns. Silence here is what "repo-source" claims.
        const consumerShaped = path.join(root, "consumer");
        const spread: [string, string][] = [];
        for (const [rel, content] of fixture) {
          for (const shaped of consumerShapedPaths(rel)) spread.push([shaped, content]);
        }
        await writeTree(consumerShaped, spread);
        const consumerIssues = await declared.detect(consumerShaped);
        expect(
          consumerIssues.map((found) => found.code),
          `${code} now fires on a consumer-shaped root — it reaches consumers, so reclassify it and drop the scope note from its description`,
        ).toHaveLength(0);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("every repo-script code is really written to stderr by its script, and ships no emitter", async () => {
    for (const [code, declared] of LIMITED_SCOPE) {
      if (declared.scope !== "repo-script") continue;
      const scriptAbs = path.join(packageRoot, declared.emitter);

      // Execute the lane rather than grep it: a `${code}` left behind in
      // JSDoc or in `--help` prose must not keep this green once the real
      // finding stops being emitted.
      const drift = await runScript(scriptAbs, declared.driftArgs);
      expect(drift.stderr, `${declared.emitter} no longer writes ${code} to stderr`).toContain(
        code,
      );
      expect(drift.exitCode, `${declared.emitter} no longer fails the lane on ${code}`).not.toBe(0);

      const clean = await runScript(scriptAbs, declared.cleanArgs);
      expect(clean.stderr, `${declared.emitter} raises ${code} on a compliant path`).not.toContain(
        code,
      );
      expect(clean.exitCode, `${declared.emitter} fails the lane on a compliant path`).toBe(0);

      const hits = await emittersFor(code);
      expect(
        hits,
        `${code} now has a shipped emitter — reclassify it and drop the scope note from its description`,
      ).toHaveLength(0);
    }
  });
});

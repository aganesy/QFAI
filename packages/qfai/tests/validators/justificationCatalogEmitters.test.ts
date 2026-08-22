import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { JUSTIFICATION_CATALOG } from "../../src/core/validators/justificationCatalog.js";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root would resolve `src/` to a path that does not exist and the walk
// below would scan nothing, passing vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcRoot = path.join(packageRoot, "src");

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
 */
type LimitedScopeDeclaration =
  | {
      readonly scope: "repo-source";
      /** Module that pins the `packages/qfai/**` paths the detector resolves. */
      readonly gate: string;
      readonly descriptionMarkers: readonly RegExp[];
    }
  | {
      readonly scope: "repo-script";
      /** Unpublished script that raises the code. */
      readonly emitter: string;
      readonly descriptionMarkers: readonly RegExp[];
    };

const REPO_SOURCE_MARKERS: readonly RegExp[] = [
  /Scope: repo-source/,
  /empty result in a consuming project's install/,
];

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
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-EVIDENCE-MUTATION-UNLOGGED",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "evidenceMutationUnlogged.ts"),
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-SKILL-MANIFEST-DRIFT",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "skillManifestPairs.ts"),
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-MOCK-HREF-DRIFT",
    {
      scope: "repo-source",
      gate: path.join("src", "core", "validators", "mockHrefPairs.ts"),
      descriptionMarkers: REPO_SOURCE_MARKERS,
    },
  ],
  [
    "R-PACK-LOCATION-DRIFT",
    {
      scope: "repo-script",
      emitter: path.join("scripts", "check-pack-locations.mjs"),
      descriptionMarkers: [
        /Scope: repo-script/,
        /no detector for this code ships in the published package/,
        /ci:lint/,
        /does not auto-detect pack-location drift/,
      ],
    },
  ],
]);

/**
 * Drop `//` and block comments while preserving string / template literals.
 *
 * A bare `text.includes(code)` counts JSDoc, prose comments and dead constants
 * as emitters, so it would pass on a code that is merely *named* in `src/` and
 * would stay green after a real `issue()` call was deleted and its explanatory
 * comment left behind. Comments are skipped whole (from their opening `/`), so
 * an apostrophe inside prose never opens a spurious string.
 */
export function stripComments(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      out += ch;
      i += 1;
      while (i < source.length) {
        const inner = source[i];
        if (inner === "\\") {
          out += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += inner;
        i += 1;
        if (inner === ch) break;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `source` builds an `Issue` whose finding code is `code`, either
 * literally (`issue("CODE", …)`) or through a single-file constant binding
 * (`const FINDING_CODE = "CODE"` … `issue(FINDING_CODE, …)`) — the two shapes
 * every catalog emitter in `src/` uses today.
 */
export function emitsIssueCode(source: string, code: string): boolean {
  const text = stripComments(source);
  const quoted = `["']${escapeRegExp(code)}["']`;
  if (new RegExp(`\\bissue\\(\\s*${quoted}`).test(text)) return true;
  const bindings = text.matchAll(
    new RegExp(`\\bconst\\s+([A-Za-z_$][\\w$]*)[^=\\n]*=\\s*${quoted}`, "g"),
  );
  for (const binding of bindings) {
    const name = binding[1];
    if (name === undefined) continue;
    if (new RegExp(`\\bissue\\(\\s*${escapeRegExp(name)}\\b`).test(text)) return true;
  }
  return false;
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

/** Files under `src/` that really construct an `Issue` carrying `code`. */
async function emittersFor(code: string): Promise<string[]> {
  const files = await collectTsFiles(srcRoot);
  const hits: string[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (emitsIssueCode(text, code)) hits.push(path.relative(packageRoot, file));
  }
  return hits;
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

  it("every repo-source code is still gated on package source the consumer does not have", async () => {
    for (const [code, declared] of LIMITED_SCOPE) {
      if (declared.scope !== "repo-source") continue;
      const hits = await emittersFor(code);
      expect(hits, `${code} lost its shipped emitter — reclassify it`).not.toHaveLength(0);
      const gate = await readFile(path.join(packageRoot, declared.gate), "utf8");
      expect(
        stripComments(gate),
        `${declared.gate} no longer pins packages/qfai/** paths — ${code} may now reach consumers, so re-check its scope note`,
      ).toContain("packages/qfai/");
    }
  });

  it("every repo-script code still points at a script that emits it, and ships no emitter", async () => {
    for (const [code, declared] of LIMITED_SCOPE) {
      if (declared.scope !== "repo-script") continue;
      const script = await readFile(path.join(packageRoot, declared.emitter), "utf8");
      expect(script, `${declared.emitter} no longer emits ${code}`).toContain(code);
      const hits = await emittersFor(code);
      expect(
        hits,
        `${code} now has a shipped emitter — reclassify it and drop the scope note from its description`,
      ).toHaveLength(0);
    }
  });
});

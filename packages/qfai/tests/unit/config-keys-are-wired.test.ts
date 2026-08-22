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
 * Same shape as `validators-are-wired.test.ts`: a text-level reachability check
 * with an explicit, documented allowlist rather than a type-level one. Unlike a
 * bare substring scan, it matches the qualified property access the config path
 * implies (`.traceability.scMustHaveTest`) over sources with comments, quoted
 * strings and template-literal text blanked out, so a same-named local, an
 * unrelated option field, a diagnostic message or a sentence in a doc comment
 * cannot make an inert key look wired.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** Index just past the quoted literal opening at `start`. */
function skipQuoted(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote || ch === "\n") return i + 1;
    i += 1;
  }
  return i;
}

/**
 * A template literal's raw text is prose exactly like a quoted string — a
 * diagnostic message may spell out a whole config path — so it is dropped. Only
 * its `${...}` holes are code, and those are kept and stripped in turn.
 */
function readTemplate(source: string, start: number): { end: number; code: string } {
  let i = start + 1;
  let code = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") return { end: i + 1, code };
    if (ch === "$" && source[i + 1] === "{") {
      const hole = readTemplateHole(source, i + 2);
      code += ` ${stripCommentsAndStrings(hole.text)} `;
      i = hole.end;
      continue;
    }
    i += 1;
  }
  return { end: i, code };
}

/** Text of a `${...}` hole whose `${` ends at `start`, brace-matched. */
function readTemplateHole(source: string, start: number): { end: number; text: string } {
  let depth = 1;
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { end: i + 1, text: source.slice(start, i) };
    } else if (ch === '"' || ch === "'") {
      i = skipQuoted(source, i);
      continue;
    } else if (ch === "`") {
      i = readTemplate(source, i).end;
      continue;
    }
    i += 1;
  }
  return { end: i, text: source.slice(start) };
}

/**
 * Blank out line comments, block comments, quoted strings and template-literal
 * text so a key name mentioned in prose or in a diagnostic message cannot stand
 * in for a real read — a `` `${path} は廃止されました` `` message naming a config
 * path is not a consumer of it. A template's `${...}` holes are code and
 * survive.
 *
 * A `/` is only treated as a comment opener when the next character is `/` or
 * `*`, so division survives; a regex literal is copied verbatim like any other
 * operator run.
 */
function stripCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipQuoted(source, i);
      out += " ";
      continue;
    }
    if (ch === "`") {
      const template = readTemplate(source, i);
      out += ` ${template.code} `;
      i = template.end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * A key counts as read only when the source performs the qualified property
 * access the config path implies — `.traceability.scMustHaveTest`, not a bare
 * `scMustHaveTest` that could be an unrelated local, an option field of the
 * same name, or a word in a sentence.
 */
function qualifiedAccessPattern({ key, parent }: Pick<LeafKey, "key" | "parent">): RegExp {
  const escape = (part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.\\s*${escape(parent)}\\s*\\.\\s*${escape(key)}\\b`);
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
    const haystack = sources.map((source) => stripCommentsAndStrings(source)).join("\n");

    const unwired = collectLeafKeys(defaultConfig.validation, "validation")
      .filter((leaf) => !KNOWN_UNWIRED.has(leaf.path))
      .filter((leaf) => !qualifiedAccessPattern(leaf).test(haystack))
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
    const leaf = { key: "enabled", parent: "validation" } as const;
    const decoys = [
      "// validation の enabled をいつか読む",
      "/* enabled */",
      'issues.push({ rule: "validation.enabled" });',
      "const enabled = options.enabled;",
      "return other.enabled;",
    ].join("\n");

    expect(qualifiedAccessPattern(leaf).test(stripCommentsAndStrings(decoys))).toBe(false);
    expect(
      qualifiedAccessPattern(leaf).test(
        stripCommentsAndStrings("if (config.validation.enabled) return;"),
      ),
    ).toBe(true);
  });

  it("keeps code that lives next to comments and strings", () => {
    const source = [
      "// config.validation.traceability.scMustHaveTest はコメント",
      'const label = "validation.traceability.scMustHaveTest";',
      "const on = config.validation.traceability.scMustHaveTest;",
    ].join("\n");
    const stripped = stripCommentsAndStrings(source);

    expect(stripped).toContain("const on = config.validation.traceability.scMustHaveTest;");
    expect(stripped).not.toContain("はコメント");
    expect(stripped).not.toContain('"validation.traceability.scMustHaveTest"');
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
    // once the backticks are ignored, so the raw text must be dropped.
    const leaf = { key: "newKey", parent: "traceability", path: "validation.traceability.newKey" };
    const message = [
      "const message = `validation.traceability.newKey は廃止されました`;",
      "const nested = `${label}: `.concat(`.traceability.newKey`);",
    ].join("\n");

    expect(qualifiedAccessPattern(leaf).test(stripCommentsAndStrings(message))).toBe(false);
    expect(
      qualifiedAccessPattern(leaf).test(
        stripCommentsAndStrings(
          "const m = `見つかりません: ${config.validation.traceability.newKey}`;",
        ),
      ),
    ).toBe(true);
  });
});

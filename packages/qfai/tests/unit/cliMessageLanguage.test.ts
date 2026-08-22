/**
 * Meta-test: operator-facing CLI strings are written in one language.
 *
 * `cli-ux-guidelines.md` pins the *shape* of an error message
 * (`<CODE>: <message> [at <file>]`). Until its `## Message Language`
 * section existed, nothing pinned the language of `<message>`, and the
 * implementation split arbitrarily inside a single command's output:
 * `qfai doctor` emitted 16 English findings and 2 Japanese ones, and
 * `usage()` — the only documentation for `--strict`, `--clean`,
 * `--autoremediate`, `--target-url` and `--upgrade-scope` — was Japanese
 * while the CLI contracts describing the same flags were English.
 *
 * The rule is English for every operator-facing surface. This test holds
 * the surfaces that have been converted:
 *
 *   - every string emitted from `src/cli/**` (usage, error/warn/info,
 *     direct stdout writes)
 *   - the `title` / `message` / `details` of every `qfai doctor` check
 *
 * `src/core/validators/**` still carries un-migrated finding messages, so
 * it is held by a ratchet instead: every file's remaining Japanese lines are
 * baselined below, and anything above that ceiling — a new Japanese
 * `Issue.message`, or a new validator file carrying one — fails.
 *
 * Source *comments* are deliberately out of scope: they are not shipped to
 * an operator, and this repository keeps Japanese prose in them. They are
 * removed with the TypeScript scanner rather than by regex, so a comment
 * marker *inside* an operator-facing string literal cannot hide a violation.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const CLI_DIR = path.join(PACKAGE_ROOT, "src", "cli");
const VALIDATORS_DIR = path.join(PACKAGE_ROOT, "src", "core", "validators");
const DOCTOR_TS = path.join(PACKAGE_ROOT, "src", "core", "doctor.ts");
const GUIDELINES_MD = path.join(
  PACKAGE_ROOT,
  "assets",
  "init",
  ".qfai",
  "assistant",
  "catalog",
  "cli-ux-guidelines.md",
);

/** Hiragana, katakana, CJK ideographs, and CJK/fullwidth punctuation. */
const CJK_RE = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/;

/**
 * Ratchet ceiling for the staged `src/core/validators/**` migration:
 * path relative to `VALIDATORS_DIR` -> Japanese code lines still tolerated.
 *
 * Lower an entry (and drop it once it reaches zero) as messages are migrated;
 * never raise one. A file absent from this map must contain no Japanese at all.
 */
const VALIDATOR_JAPANESE_BASELINE: Readonly<Record<string, number>> = {
  "assistantAssets.ts": 5,
  "atddCodeTraceability.ts": 25,
  "atddLedger.ts": 1,
  "businessFlow.ts": 8,
  "configReferenceIntegrity.ts": 3,
  "contractConsistency.ts": 6,
  "contractReferences.ts": 2,
  "contracts.ts": 20,
  "densityHints.ts": 10,
  "discussMermaid.ts": 3,
  "discussionPack.ts": 20,
  "discussionVisuals.ts": 5,
  "htmlMockBlocks.ts": 2,
  "ids.ts": 1,
  "importLite.ts": 4,
  "integrationSurface.ts": 8,
  "layerCoverage.ts": 35,
  "layeredTraceability.ts": 11,
  "mermaidEnforcement.ts": 13,
  "mermaidFence.ts": 3,
  "navigationFlow.ts": 1,
  "orphanProhibition.ts": 6,
  "prototyping/completionCertificate.ts": 2,
  "prototyping/delegationMap.ts": 4,
  "repositoryHygiene.ts": 4,
  "requireIndex.ts": 6,
  "requirementsContext.ts": 36,
  "reviewArtifacts.ts": 37,
  "skill/prototypingSkill.ts": 12,
  "skill/sidecarFlowOrdering.ts": 1,
  "skillsIntegrity.ts": 7,
  "specPack.ts": 115,
  "specSplitByCapability.ts": 6,
  "statusInSpecs.ts": 3,
  "tddList.ts": 8,
  "testTodoStubs.ts": 2,
  "traceability.ts": 35,
};

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      out.push(...(await listSourceFiles(full)));
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Blank out comments so only code — string literals included — is scanned.
 *
 * The TypeScript scanner does the lexing, so `info("prefix // text")` and
 * `info("/* text *\/")` keep their operator-facing text: a comment marker that
 * happens to sit inside a string literal is not a comment. Replacing with
 * spaces rather than deleting keeps line numbers intact, so a failure report
 * points at the line the offending string is really on.
 */
function stripComments(source: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false);
  scanner.setText(source);
  const chars = source.split("");
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token !== ts.SyntaxKind.SingleLineCommentTrivia &&
      token !== ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      continue;
    }
    for (let index = scanner.getTokenStart(); index < scanner.getTokenEnd(); index += 1) {
      if (chars[index] !== "\n" && chars[index] !== "\r") {
        chars[index] = " ";
      }
    }
  }
  return chars.join("");
}

function findCjkLines(relPath: string, source: string): string[] {
  return stripComments(source)
    .split(/\r?\n/)
    .flatMap((line, index) =>
      CJK_RE.test(line) ? [`${relPath}:${index + 1}: ${line.trim()}`] : [],
    );
}

function relativeToPosix(from: string, file: string): string {
  return path.relative(from, file).split(path.sep).join("/");
}

describe("operator-facing CLI message language", () => {
  it("keeps every string emitted from src/cli in English", async () => {
    const files = await listSourceFiles(CLI_DIR);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      offenders.push(...findCjkLines(relativeToPosix(PACKAGE_ROOT, file), source));
    }

    expect(offenders).toEqual([]);
  });

  it("keeps every qfai doctor check message in English", async () => {
    const source = await readFile(DOCTOR_TS, "utf-8");
    expect(findCjkLines(relativeToPosix(PACKAGE_ROOT, DOCTOR_TS), source)).toEqual([]);
  });

  it("admits no new Japanese finding message under src/core/validators", async () => {
    const files = await listSourceFiles(VALIDATORS_DIR);
    expect(files.length).toBeGreaterThan(0);

    const regressions: string[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      const rel = relativeToPosix(VALIDATORS_DIR, file);
      seen.add(rel);
      const source = await readFile(file, "utf-8");
      const found = findCjkLines(rel, source).length;
      const allowed = VALIDATOR_JAPANESE_BASELINE[rel] ?? 0;
      if (found > allowed) {
        regressions.push(
          `${rel}: ${found} Japanese line(s), baseline allows ${allowed}. ` +
            "New finding messages must be English (cli-ux-guidelines.md, Message Language).",
        );
      }
    }

    const stale = Object.keys(VALIDATOR_JAPANESE_BASELINE).filter((rel) => !seen.has(rel));
    expect(stale, "baseline entries whose file no longer exists — drop them").toEqual([]);
    expect(regressions).toEqual([]);
  });

  it("does not mistake a comment marker inside a string for a comment", () => {
    const source = [
      'info("prefix // 日本語");',
      'info("/* 日本語 */");',
      "// 日本語のコメント",
    ].join("\n");

    expect(findCjkLines("sample.ts", source)).toEqual([
      'sample.ts:1: info("prefix // 日本語");',
      'sample.ts:2: info("/* 日本語 */");',
    ]);
  });

  it("states the rule in the shipped cli-ux-guidelines catalog entry", async () => {
    const guidelines = await readFile(GUIDELINES_MD, "utf-8");
    expect(guidelines).toContain("## Message Language");
    expect(guidelines).toContain("usage()");
    expect(guidelines).toContain("Issue.message");
  });
});

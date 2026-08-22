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
 * `Issue.message` is produced well beyond `src/core/validators/**` —
 * `src/core/config.ts` builds `QFAI_CONFIG_INVALID`, `src/core/waivers.ts`
 * and `src/core/report.ts` build their own — and those messages reach
 * stdout through `emitText` just like a validator's. So the ratchet below
 * covers the whole of `src/**`: every file's remaining Japanese lines are
 * baselined, and anything above that ceiling — a new Japanese
 * `Issue.message`, or a new file carrying one — fails. A file absent from
 * the baseline must contain no Japanese at all, which is what keeps the
 * already-converted `src/cli/**` and `src/core/doctor.ts` converted.
 *
 * Source *comments* are deliberately out of scope: they are not shipped to
 * an operator, and this repository keeps Japanese prose in them. They are
 * removed with the TypeScript scanner rather than by regex, so a comment
 * marker *inside* an operator-facing string literal — a plain one or a
 * template literal spanning an interpolation — cannot hide a violation.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SRC_DIR = path.join(PACKAGE_ROOT, "src");
const CLI_DIR = path.join(SRC_DIR, "cli");
const DOCTOR_TS = path.join(SRC_DIR, "core", "doctor.ts");
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
 * Ratchet ceiling for the staged message migration:
 * path relative to `SRC_DIR` -> Japanese code lines still tolerated.
 *
 * Lower an entry (and drop it once it reaches zero) as messages are migrated;
 * never raise one. A file absent from this map must contain no Japanese at all.
 */
const SRC_JAPANESE_BASELINE: Readonly<Record<string, number>> = {
  "core/atdd/scaffold.ts": 1,
  "core/atddTraceability.ts": 2,
  "core/config.ts": 53,
  "core/deltaV1.ts": 4,
  "core/layerPolicy.ts": 8,
  "core/phasePolicy.ts": 5,
  "core/preflight/sddPreflight.ts": 7,
  "core/prototyping/evaluatorReview.ts": 1,
  "core/prototyping/policy.ts": 4,
  "core/report.ts": 23,
  "core/specPackParsers.ts": 2,
  "core/specSummary.ts": 1,
  "core/validate.ts": 4,
  "core/validators/assistantAssets.ts": 5,
  "core/validators/atddCodeTraceability.ts": 34,
  "core/validators/atddLedger.ts": 1,
  "core/validators/businessFlow.ts": 8,
  "core/validators/configReferenceIntegrity.ts": 3,
  "core/validators/contractConsistency.ts": 6,
  "core/validators/contractReferences.ts": 2,
  "core/validators/contracts.ts": 20,
  "core/validators/densityHints.ts": 10,
  "core/validators/discussMermaid.ts": 3,
  "core/validators/discussionPack.ts": 20,
  "core/validators/discussionVisuals.ts": 5,
  "core/validators/htmlMockBlocks.ts": 2,
  "core/validators/ids.ts": 1,
  "core/validators/importLite.ts": 4,
  "core/validators/integrationSurface.ts": 11,
  "core/validators/layerCoverage.ts": 35,
  "core/validators/layeredTraceability.ts": 11,
  "core/validators/mermaidEnforcement.ts": 13,
  "core/validators/mermaidFence.ts": 3,
  "core/validators/navigationFlow.ts": 1,
  "core/validators/orphanProhibition.ts": 6,
  "core/validators/prototyping/completionCertificate.ts": 2,
  "core/validators/prototyping/delegationMap.ts": 4,
  "core/validators/repositoryHygiene.ts": 4,
  "core/validators/requireIndex.ts": 6,
  "core/validators/requirementsContext.ts": 36,
  "core/validators/reviewArtifacts.ts": 37,
  "core/validators/skill/prototypingSkill.ts": 12,
  "core/validators/skill/sidecarFlowOrdering.ts": 1,
  "core/validators/skillsIntegrity.ts": 7,
  "core/validators/specPack.ts": 120,
  "core/validators/specSplitByCapability.ts": 6,
  "core/validators/statusInSpecs.ts": 3,
  "core/validators/tddList.ts": 10,
  "core/validators/testTodoStubs.ts": 2,
  "core/validators/traceability.ts": 35,
  "core/waivers.ts": 27,
  "shared/assets.ts": 2,
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
 * happens to sit inside a string literal is not a comment.
 *
 * The scanner alone is not enough for template literals: after the expression
 * of a `${...}` substitution it resumes in ordinary-expression mode, so the
 * remainder of `` `prefix ${value} // text` `` lexes as a line comment unless
 * the closing `}` is re-scanned as a template continuation. `templateBraces`
 * records the brace depth each unfinished template was opened at, so the `}`
 * that closes a substitution is told apart from one closing a block or object
 * literal inside it, and only the former is re-scanned.
 *
 * Replacing comments with spaces rather than deleting them keeps line numbers
 * intact, so a failure report points at the line the offending string is
 * really on.
 */
function stripComments(source: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false);
  scanner.setText(source);
  const chars = source.split("");
  const templateBraces: number[] = [];
  let braceDepth = 0;
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.TemplateHead) {
      templateBraces.push(braceDepth);
    } else if (token === ts.SyntaxKind.OpenBraceToken) {
      braceDepth += 1;
    } else if (token === ts.SyntaxKind.CloseBraceToken) {
      if (templateBraces[templateBraces.length - 1] === braceDepth) {
        token = scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
        if (token === ts.SyntaxKind.TemplateTail) {
          templateBraces.pop();
        }
        continue;
      }
      braceDepth -= 1;
    } else if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      for (let index = scanner.getTokenStart(); index < scanner.getTokenEnd(); index += 1) {
        if (chars[index] !== "\n" && chars[index] !== "\r") {
          chars[index] = " ";
        }
      }
    }
    token = scanner.scan();
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

  it("admits no new Japanese message anywhere under src", async () => {
    const files = await listSourceFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);

    const regressions: string[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      const rel = relativeToPosix(SRC_DIR, file);
      seen.add(rel);
      const source = await readFile(file, "utf-8");
      const found = findCjkLines(rel, source).length;
      const allowed = SRC_JAPANESE_BASELINE[rel] ?? 0;
      if (found > allowed) {
        regressions.push(
          `${rel}: ${found} Japanese line(s), baseline allows ${allowed}. ` +
            "New operator-facing messages must be English (cli-ux-guidelines.md, Message Language).",
        );
      }
    }

    const stale = Object.keys(SRC_JAPANESE_BASELINE).filter((rel) => !seen.has(rel));
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

  it("does not mistake a comment marker after a template interpolation for a comment", () => {
    const source = [
      "info(`prefix ${value} // 日本語`);",
      "info(`prefix ${value} /* 日本語 */`);",
      "info(`outer ${obj.f({ k: `inner ${x} // 日本語` })} tail`);",
      "// 日本語のコメント",
    ].join("\n");

    expect(findCjkLines("sample.ts", source)).toEqual([
      "sample.ts:1: info(`prefix ${value} // 日本語`);",
      "sample.ts:2: info(`prefix ${value} /* 日本語 */`);",
      "sample.ts:3: info(`outer ${obj.f({ k: `inner ${x} // 日本語` })} tail`);",
    ]);
  });

  it("states the rule in the shipped cli-ux-guidelines catalog entry", async () => {
    const guidelines = await readFile(GUIDELINES_MD, "utf-8");
    expect(guidelines).toContain("## Message Language");
    expect(guidelines).toContain("usage()");
    expect(guidelines).toContain("Issue.message");
  });
});

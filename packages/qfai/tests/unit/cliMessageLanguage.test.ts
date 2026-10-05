/**
 * Meta-test: operator-facing strings are written in English.
 *
 * `.agents/rules/repository-language.md` says every string the qfai CLI prints
 * to an operator is English. The validate contract pins the *shape* of an error
 * message; this test pins its language, over the whole of `src/**`:
 *
 *   - every string emitted from `src/cli/**` (usage, error/warn/info, direct
 *     stdout writes)
 *   - the `title` / `message` / `details` of every `qfai doctor` check
 *   - every `Issue.message`, wherever it is built: `src/core/config.ts`,
 *     `src/core/waivers.ts`, `src/core/report.ts` and the validators all reach
 *     stdout through `emitText`
 *
 * Every file is held at zero Japanese lines. There is no allowlist.
 *
 * Source *comments* are out of scope: they are not shipped to an operator. They
 * are removed with the TypeScript scanner rather than by regex, so a comment
 * marker *inside* an operator-facing string literal — a plain one or a
 * template literal spanning an interpolation — cannot hide a violation, and
 * a backtick inside a regular expression literal does not turn the comments
 * that follow it into a template literal and hide *them*.
 *
 * Japanese samples below are written as \uXXXX escapes so this file holds no
 * Japanese text itself.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  findJapaneseLines,
  formatJapaneseLine,
  listSourceFiles,
  relativeToPosix,
  stripComments,
} from "../helpers/japaneseMessageScan.js";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SRC_DIR = path.join(PACKAGE_ROOT, "src");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const LANGUAGE_RULE_MD = path.join(REPO_ROOT, ".agents", "rules", "repository-language.md");
const VALIDATE_CONTRACT_MD = path.join(
  REPO_ROOT,
  ".qfai",
  "spec",
  "03_contract",
  "cli",
  "cli-0014-qfai-validate.md",
);

function reportJapaneseLines(relPath: string, source: string): string[] {
  return findJapaneseLines(source).map((found) => formatJapaneseLine(relPath, found));
}

async function readSources(files: readonly string[], from: string): Promise<[string, string][]> {
  return Promise.all(
    files.map(async (file): Promise<[string, string]> => [
      relativeToPosix(from, file),
      await readFile(file, "utf-8"),
    ]),
  );
}

/**
 * Every file under `src/`, read once for the whole file.
 *
 * Two cases below walk the same tree, and reading it twice doubles the I/O
 * this file's timeout is sized for. The promise is created on first use and
 * reused, so the second case gets the first one's result.
 */
let srcSourcesPromise: Promise<[string, string][]> | undefined;
function srcSources(): Promise<[string, string][]> {
  srcSourcesPromise ??= (async () => {
    const files = await listSourceFiles(SRC_DIR);
    if (files.length === 0) {
      throw new Error(`no sources found under ${SRC_DIR}`);
    }
    return readSources(files, SRC_DIR);
  })();
  return srcSourcesPromise;
}

// QFAI:EX-0001-0039-08
describe("operator-facing CLI message language", () => {
  it("keeps every operator-facing string under src in English", async () => {
    const offenders = (await srcSources()).flatMap(([rel, source]) =>
      reportJapaneseLines(rel, source),
    );

    expect(
      offenders,
      "Japanese operator-facing message. It must be English " +
        "(.agents/rules/repository-language.md, Operator-facing strings)",
    ).toEqual([]);
  });

  it("keeps the launcher out of a runtime message, and in the validate contract", async () => {
    // A running qfai does not know which entry point started it — an `npx`
    // prefix, a package script, or a global bin — so a message naming one
    // launcher is wrong for the other two. Shipped docs take the opposite
    // rule and `canonicalQfaiLauncher.test.ts` enforces it there.
    const spelling = parseContractRules(
      VALIDATE_CONTRACT_MD,
      await readFile(VALIDATE_CONTRACT_MD, "utf-8"),
    ).rules.find((rule) => rule.statement.includes("A runtime message spells a command"));
    expect(spelling, "the validate contract states the command spelling as a rule").toBeDefined();
    expect(spelling?.statement).toContain("`npx qfai <subcommand>`");
    expect(spelling?.statement).toContain("`qfai <subcommand>`");

    // Comments explain the implementation and are not read by an operator,
    // so they are removed first — with the same TypeScript scanner the
    // Japanese scan uses, for the reason this file's header gives. A
    // line-start test cannot do it: `emit(msg); // npx qfai validate` is a
    // comment on a code line, and would be reported as a runtime message.
    // Stripping replaces a comment with spaces, so the line numbers below
    // still point at the source.
    const offenders: string[] = [];
    for (const [rel, source] of await srcSources()) {
      // The scan is what costs; the strip is what costs most. A file whose
      // raw text has no `npx qfai ` anywhere cannot produce an offender
      // after the strip either, since stripping only removes text.
      if (!source.includes("npx qfai ")) {
        continue;
      }
      stripComments(source)
        .split(/\r?\n/)
        .forEach((line, index) => {
          // The generated-file header is documentation in the reader's tree,
          // so it takes the documentation rule. It survives the strip: it is
          // a `#` comment inside a TypeScript string, not a TypeScript one.
          if (!line.includes("npx qfai ") || line.includes("# Generated by")) {
            return;
          }
          offenders.push(`${rel}:${index + 1}`);
        });
    }

    expect(offenders, "runtime message naming a launcher").toEqual([]);
  });

  it("reports a Japanese message in the line it appears on", () => {
    // Positive control: a scan that always finds nothing would pass the case
    // above whatever the sources held.
    expect(
      reportJapaneseLines("core/sample.ts", 'error("\u65b0\u3057\u3044\u65e5\u672c\u8a9e");'),
    ).toEqual(['core/sample.ts:1: error("\u65b0\u3057\u3044\u65e5\u672c\u8a9e");']);
  });

  it("does not treat a Japanese input matcher as an operator message", () => {
    // \u7406\u7531 is the Japanese word for "reason".
    const source = ["const key = /(?:reason|\u7406\u7531):/;", 'error("\u65e5\u672c\u8a9e");'].join(
      "\n",
    );
    expect(findJapaneseLines(source)).toEqual([{ line: 2, text: 'error("\u65e5\u672c\u8a9e");' }]);
  });

  it("does not mistake a comment marker inside a string for a comment", () => {
    const source = [
      'info("prefix // \u65e5\u672c\u8a9e");',
      'info("/* \u65e5\u672c\u8a9e */");',
      "// \u65e5\u672c\u8a9e\u306e\u30b3\u30e1\u30f3\u30c8",
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      'sample.ts:1: info("prefix // \u65e5\u672c\u8a9e");',
      'sample.ts:2: info("/* \u65e5\u672c\u8a9e */");',
    ]);
  });

  it("does not mistake a comment marker after a template interpolation for a comment", () => {
    const source = [
      "info(`prefix ${value} // \u65e5\u672c\u8a9e`);",
      "info(`prefix ${value} /* \u65e5\u672c\u8a9e */`);",
      "info(`outer ${obj.f({ k: `inner ${x} // \u65e5\u672c\u8a9e` })} tail`);",
      "// \u65e5\u672c\u8a9e\u306e\u30b3\u30e1\u30f3\u30c8",
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      "sample.ts:1: info(`prefix ${value} // \u65e5\u672c\u8a9e`);",
      "sample.ts:2: info(`prefix ${value} /* \u65e5\u672c\u8a9e */`);",
      "sample.ts:3: info(`outer ${obj.f({ k: `inner ${x} // \u65e5\u672c\u8a9e` })} tail`);",
    ]);
  });

  it("does not mistake a backtick inside a regular expression for a template literal", () => {
    const source = [
      "const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;",
      "// \u65e5\u672c\u8a9e\u306e\u30b3\u30e1\u30f3\u30c8",
      'info("\u65e5\u672c\u8a9e\u306e\u30e1\u30c3\u30bb\u30fc\u30b8");',
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      'sample.ts:3: info("\u65e5\u672c\u8a9e\u306e\u30e1\u30c3\u30bb\u30fc\u30b8");',
    ]);
  });

  it("does not mistake a division slash for a regular expression", () => {
    const source = [
      "const ratio = (done + skipped) / total; // \u65e5\u672c\u8a9e\u306e\u30b3\u30e1\u30f3\u30c8",
      'info("\u65e5\u672c\u8a9e\u306e\u30e1\u30c3\u30bb\u30fc\u30b8");',
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      'sample.ts:2: info("\u65e5\u672c\u8a9e\u306e\u30e1\u30c3\u30bb\u30fc\u30b8");',
    ]);
  });

  it("states the rule in the repository-language rule", async () => {
    const rule = await readFile(LANGUAGE_RULE_MD, "utf-8");
    expect(rule).toContain("## Operator-facing strings");
    expect(rule).toContain("usage()");
    expect(rule).toContain("Issue.message");
  });
});

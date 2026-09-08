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
 * stdout through `emitText` just like a validator's. So the check below
 * covers the whole of `src/**`, matching every Japanese line against
 * `cliMessageLanguage.allowlist.ts`, which pins the messages the staged
 * migration has not reached yet *by their content*.
 *
 * Content, not a per-file line count: a ceiling of "n Japanese lines in
 * this file" is satisfied just as well by n *different* ones, so
 * translating a message would free a slot for a brand-new Japanese
 * message — the file total never moves and the ceiling never complains.
 * Matching content closes that: an unlisted Japanese line fails wherever
 * it appears, and a listed message that has been translated has to be
 * struck from the list rather than left as a reusable slot. A file absent
 * from the allowlist is held at zero, which is what keeps the already
 * converted `src/cli/**` and `src/core/doctor.ts` converted.
 *
 * Source *comments* are deliberately out of scope: they are not shipped to
 * an operator, and this repository keeps Japanese prose in them. They are
 * removed with the TypeScript scanner rather than by regex, so a comment
 * marker *inside* an operator-facing string literal — a plain one or a
 * template literal spanning an interpolation — cannot hide a violation, and
 * a backtick inside a regular expression literal does not turn the comments
 * that follow it into a template literal and hide *them*.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  diffAgainstAllowlist,
  findJapaneseLines,
  formatJapaneseLine,
  listSourceFiles,
  relativeToPosix,
  stripComments,
} from "../helpers/japaneseMessageScan.js";

import { SRC_JAPANESE_ALLOWLIST } from "./cliMessageLanguage.allowlist.js";

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

/** Scanning every file under `src/` costs seconds; 15s is not enough headroom. */
const SCAN_TIMEOUT_MS = 60_000;

function reportJapaneseLines(relPath: string, source: string): string[] {
  return findJapaneseLines(source).map((found) => formatJapaneseLine(relPath, found));
}

async function readSources(files: readonly string[], from: string): Promise<[string, string][]> {
  return Promise.all(
    files.map(
      async (file): Promise<[string, string]> => [
        relativeToPosix(from, file),
        await readFile(file, "utf-8"),
      ],
    ),
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

describe("operator-facing CLI message language", () => {
  it(
    "keeps every string emitted from src/cli in English",
    async () => {
      const files = await listSourceFiles(CLI_DIR);
      expect(files.length).toBeGreaterThan(0);

      const offenders = (await readSources(files, PACKAGE_ROOT)).flatMap(([rel, source]) =>
        reportJapaneseLines(rel, source),
      );

      expect(offenders).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it("keeps every qfai doctor check message in English", async () => {
    const source = await readFile(DOCTOR_TS, "utf-8");
    expect(reportJapaneseLines(relativeToPosix(PACKAGE_ROOT, DOCTOR_TS), source)).toEqual([]);
  });

  /**
   * What the allowlist is allowed to weigh. Translating a message lowers it;
   * only a merge taking the base's own entries raises it.
   *
   * Every other assertion here compares the list against the sources, so the
   * list is exact — but only in one direction. Adding an entry for a message
   * that is really in the tree satisfies all of them, and the lane goes green:
   * the guard then reads "no Japanese nobody bothered to list" rather than "no
   * new Japanese", which is a much weaker claim and the one the list exists to
   * avoid making.
   *
   * A merge absorbing the base's new messages is the case that legitimately
   * adds entries, and it still moves this number — which is the point. The
   * addition stops being an invisible edit inside a 700-line data file and
   * becomes a line a reviewer is asked about.
   */
  const ALLOWLISTED_MESSAGE_COUNT = 772;

  it("holds the allowlist to a count that only a reviewed change moves", () => {
    const counted = Object.values(SRC_JAPANESE_ALLOWLIST).reduce(
      (total, entries) => total + entries.length,
      0,
    );
    const rePin =
      "Run `node scripts/pin-cli-message-allowlist-count.mjs` and land it in the same commit. " +
      "If this branch changed no entry, the drift is inherited: a merge carries the entries of " +
      "both parents and neither parent's pin counted them together, so no branch owed this " +
      "re-pin. Run the same command and land it on its own — it is a re-measurement, not a " +
      "correction of your change.";
    expect(
      counted,
      counted > ALLOWLISTED_MESSAGE_COUNT
        ? `the allowlist grew. A new operator-facing message must be English (cli-ux-guidelines.md, Message Language); if a merge brought these in from the base, the addition is the base's to translate and this number rises so it is reviewed. ${rePin}`
        : `the allowlist shrank, so the migration's progress could otherwise be spent on a later addition. ${rePin}`,
    ).toBe(ALLOWLISTED_MESSAGE_COUNT);
  });

  it(
    "admits no Japanese message under src that the allowlist does not name",
    async () => {
      const added: string[] = [];
      const migrated: string[] = [];
      const seen = new Set<string>();
      for (const [rel, source] of await srcSources()) {
        seen.add(rel);
        const diff = diffAgainstAllowlist(
          rel,
          findJapaneseLines(source),
          SRC_JAPANESE_ALLOWLIST[rel] ?? [],
        );
        added.push(...diff.added);
        migrated.push(...diff.migrated);
      }

      const stale = Object.keys(SRC_JAPANESE_ALLOWLIST).filter((rel) => !seen.has(rel));
      expect(stale, "allowlist entries whose file no longer exists — drop them").toEqual([]);
      expect(
        added,
        "Japanese message the allowlist does not name. A new operator-facing message must be " +
          "English (cli-ux-guidelines.md, Message Language)",
      ).toEqual([]);
      expect(
        migrated,
        "allowlist entries whose message is gone — delete them, do not leave a reusable slot",
      ).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it(
    "keeps the launcher out of a runtime message, and in the guidelines",
    async () => {
      // A running qfai does not know which entry point started it — an `npx`
      // prefix, a package script, or a global bin — so a message naming one
      // launcher is wrong for the other two. Shipped docs take the opposite
      // rule and `canonicalQfaiLauncher.test.ts` enforces it there.
      const guidelines = await readFile(GUIDELINES_MD, "utf-8");
      expect(guidelines).toContain("## Command Invocation");
      expect(guidelines).toContain("`npx qfai <subcommand>`");
      expect(guidelines).toContain("`qfai <subcommand>`");

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
    },
    SCAN_TIMEOUT_MS,
  );

  it("reports a new Japanese message that replaces a translated one", () => {
    const found = findJapaneseLines('error("新しい日本語メッセージ");');

    const diff = diffAgainstAllowlist("core/sample.ts", found, ["古い日本語メッセージ"]);

    expect(diff.added).toEqual(['core/sample.ts:1: error("新しい日本語メッセージ");']);
    expect(diff.migrated).toEqual(["core/sample.ts: 古い日本語メッセージ"]);
  });

  it("reports an extra copy of a message the allowlist already names", () => {
    const found = findJapaneseLines(['error("同じ日本語");', 'warn("同じ日本語");'].join("\n"));

    const diff = diffAgainstAllowlist("core/sample.ts", found, ["同じ日本語"]);

    expect(diff.added).toEqual(['core/sample.ts:2: warn("同じ日本語");']);
    expect(diff.migrated).toEqual([]);
  });

  it("passes an un-migrated file through unchanged, whatever the code around it", () => {
    const found = findJapaneseLines('const renamed = error("残っている日本語");');

    const diff = diffAgainstAllowlist("core/sample.ts", found, ["残っている日本語"]);

    expect(diff).toEqual({ added: [], migrated: [] });
  });

  it("does not mistake a comment marker inside a string for a comment", () => {
    const source = [
      'info("prefix // 日本語");',
      'info("/* 日本語 */");',
      "// 日本語のコメント",
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
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

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      "sample.ts:1: info(`prefix ${value} // 日本語`);",
      "sample.ts:2: info(`prefix ${value} /* 日本語 */`);",
      "sample.ts:3: info(`outer ${obj.f({ k: `inner ${x} // 日本語` })} tail`);",
    ]);
  });

  it("does not mistake a backtick inside a regular expression for a template literal", () => {
    const source = [
      "const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;",
      "// 日本語のコメント",
      'info("日本語のメッセージ");',
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      'sample.ts:3: info("日本語のメッセージ");',
    ]);
  });

  it("does not mistake a division slash for a regular expression", () => {
    const source = [
      "const ratio = (done + skipped) / total; // 日本語のコメント",
      'info("日本語のメッセージ");',
    ].join("\n");

    expect(reportJapaneseLines("sample.ts", source)).toEqual([
      'sample.ts:2: info("日本語のメッセージ");',
    ]);
  });

  it("states the rule in the shipped cli-ux-guidelines catalog entry", async () => {
    const guidelines = await readFile(GUIDELINES_MD, "utf-8");
    expect(guidelines).toContain("## Message Language");
    expect(guidelines).toContain("usage()");
    expect(guidelines).toContain("Issue.message");
  });
});

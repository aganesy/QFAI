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
 * Source *comments* are deliberately out of scope: they are not shipped to
 * an operator, and this repository keeps Japanese prose in them.
 *
 * `src/core/validators/**` still carries un-migrated finding messages; the
 * guidelines record that as a known gap, so those paths are not scanned here.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const CLI_DIR = path.join(PACKAGE_ROOT, "src", "cli");
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
 * Replacing with spaces rather than deleting keeps line numbers intact, so a
 * failure report points at the line the offending string is really on.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, lead: string) =>
      lead.concat(" ".repeat(match.length - lead.length)),
    );
}

function findCjkLines(relPath: string, source: string): string[] {
  return stripComments(source)
    .split(/\r?\n/)
    .flatMap((line, index) =>
      CJK_RE.test(line) ? [`${relPath}:${index + 1}: ${line.trim()}`] : [],
    );
}

describe("operator-facing CLI message language", () => {
  it("keeps every string emitted from src/cli in English", async () => {
    const files = await listSourceFiles(CLI_DIR);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      offenders.push(...findCjkLines(path.relative(PACKAGE_ROOT, file), source));
    }

    expect(offenders).toEqual([]);
  });

  it("keeps every qfai doctor check message in English", async () => {
    const source = await readFile(DOCTOR_TS, "utf-8");
    expect(findCjkLines(path.relative(PACKAGE_ROOT, DOCTOR_TS), source)).toEqual([]);
  });

  it("states the rule in the shipped cli-ux-guidelines catalog entry", async () => {
    const guidelines = await readFile(GUIDELINES_MD, "utf-8");
    expect(guidelines).toContain("## Message Language");
    expect(guidelines).toContain("usage()");
    expect(guidelines).toContain("Issue.message");
  });
});

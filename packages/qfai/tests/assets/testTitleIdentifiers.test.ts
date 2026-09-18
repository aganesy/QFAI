/**
 * A test-case or story identifier a test's title or comment names is one a spec
 * declares.
 *
 * `QFAI-ATDD-101` and `-102` read the `QFAI:SPEC-NNNN:ID` annotation form in the
 * acceptance layers only. A bare `TC-NNNN-NNNN` in a `describe` title, or in a
 * comment above one, is read by nothing, so an identifier that names no
 * obligation reads as a reference to one, and a test case later given that
 * number inherits a citation it never had. This check holds every such
 * identifier in the package's tests to the specs that declare them.
 *
 * An identifier the same file also uses in code is fixture data, as in a test
 * of the identifier resolver itself, and is not a claim about this repository.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const testsRoot = path.join(repoRoot, "packages", "qfai", "tests");
const specsRoot = path.join(repoRoot, ".qfai", "specs");

const IDENTIFIER = /\b(?:US|TC)-\d{4}-\d{4}\b/g;
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
const TITLE_LINE = /^\s*(?:describe|it|test)(?:\.\w+)*\(\s*["'`]/;
const DECLARATION = /^(?:#{2,4}\s+|\|\s*)((?:US|TC)-\d{4}-\d{4})\b/gm;

async function declaredIdentifiers(): Promise<Set<string>> {
  const declared = new Set<string>();
  for (const entry of await readdir(specsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^spec-\d{4}$/.test(entry.name)) continue;
    for (const file of ["02_User-stories.md", "06_Test-Cases.md"]) {
      const text = await readFile(path.join(specsRoot, entry.name, file), "utf-8").catch(() => "");
      for (const match of text.matchAll(DECLARATION)) {
        if (match[1] !== undefined) declared.add(match[1]);
      }
    }
  }
  return declared;
}

async function testFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "fixtures" && entry.name !== "node_modules") {
        files.push(...(await testFiles(full)));
      }
    } else if (entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

/** `file:line id` for every title or comment identifier no spec declares. */
function undeclaredIn(file: string, text: string, declared: ReadonlySet<string>): string[] {
  const lines = text.split(/\r?\n/);
  const inCode = new Set(
    lines
      .filter((line) => !COMMENT_LINE.test(line) && !TITLE_LINE.test(line))
      .flatMap((line) => line.match(IDENTIFIER) ?? []),
  );
  const found: string[] = [];
  lines.forEach((line, index) => {
    if (!COMMENT_LINE.test(line) && !TITLE_LINE.test(line)) return;
    for (const id of line.match(IDENTIFIER) ?? []) {
      if (declared.has(id) || inCode.has(id)) continue;
      found.push(`${path.relative(repoRoot, file).replace(/\\/g, "/")}:${index + 1} ${id}`);
    }
  });
  return found;
}

describe("test titles and comments", () => {
  it("name only test cases and stories a spec declares", async () => {
    const declared = await declaredIdentifiers();
    const undeclared: string[] = [];
    for (const file of await testFiles(testsRoot)) {
      undeclared.push(...undeclaredIn(file, await readFile(file, "utf-8"), declared));
    }
    expect(
      undeclared,
      "a test names an identifier no spec declares. Name the obligation the test exercises, " +
        "or describe the behaviour without an identifier",
    ).toEqual([]);
  });

  it("reads an identifier the file also uses in code as fixture data", () => {
    const text = [
      "// TC-9999-0001 is the fixture's own id",
      'const declared = new Set(["TC-9999-0001"]);',
      'describe("TC-9999-0002: an undeclared title", () => {});',
    ].join("\n");
    expect(undeclaredIn(path.join(testsRoot, "x.test.ts"), text, new Set())).toEqual([
      "packages/qfai/tests/x.test.ts:3 TC-9999-0002",
    ]);
  });
});

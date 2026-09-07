/**
 * Spawn-based tests for `scripts/check-bidi.mjs`.
 *
 * The guard runs two scans over two file sets, and both halves are pinned
 * here:
 *   - bidi overrides and BOM, over an explicit six-document list;
 *   - NUL and C0 controls, over every path `git ls-files` reports.
 *
 * The second scan is the one with a story. `instructionLanguageRules.ts`
 * shipped with a NUL in place of a separator space, in a Map key AND in the
 * lookup that read it, so the two agreed and `tsc`, `eslint`, `prettier` and
 * the module's thirteen tests were all green. The fixture below reproduces
 * that exact shape rather than a lone stray byte, because a test that only
 * covers the stray byte would pass for a guard that decodes the file first —
 * and decoding is what hid it.
 *
 * Every control character here is written as an ESCAPE and joined in, never
 * typed into the source. A fixture that carried the literal byte would make
 * this file one of the guard's own findings, and would be as unreadable in a
 * diff as the defect it describes.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-bidi.mjs");

const NUL = "\u0000";
const FORM_FEED = "\u000c";
const DEL = "\u007f";
const RIGHT_TO_LEFT_OVERRIDE = "\u202e";
const BOM = "\ufeff";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(cwd: string): RunResult {
  const child = spawnSync("node", [SCRIPT], { cwd, encoding: "utf-8" });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A repository with tracked files, since the scan reads git's list. */
async function newRepo(files: Record<string, string | Buffer>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-check-bidi-"));
  tempDirs.push(dir);
  spawnSync("git", ["init", "--quiet"], { cwd: dir, encoding: "utf-8" });
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  spawnSync("git", ["add", "--all"], { cwd: dir, encoding: "utf-8" });
  return dir;
}

/** The shape the incident had: the separator is a NUL on BOTH sides. */
const SELF_CONSISTENT_NUL = [
  "const RULES = new Map([",
  `  ["code-review.instructions.md${NUL}typescript", "rule"],`,
  "]);",
  "export const rule = (file: string, language: string) =>",
  `  RULES.get(\`\${file}${NUL}\${language}\`);`,
  "",
].join("\n");

describe("check-bidi: NUL and C0 controls over the tracked tree", () => {
  it("passes a repository whose tracked files carry only TAB, LF and CR", async () => {
    const dir = await newRepo({
      "src/clean.ts": "const a = 1;\n\tconst b = 2;\r\n",
      "docs/notes.md": "# Notes\n\nA line.\n",
    });

    const result = runGuard(dir);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("rejects the self-consistent NUL that passed every other gate", async () => {
    const dir = await newRepo({ "src/instructionLanguageRules.ts": SELF_CONSISTENT_NUL });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    // Both occurrences, so a report cannot name one half of the pair and stop.
    const reported = result.stderr
      .split("\n")
      .filter((line) => line.includes("instructionLanguageRules.ts"));
    expect(reported).toHaveLength(2);
    expect(reported[0]).toContain("control character 0x00");
    // Line, then BYTES into that line. Not "column": the file is read as bytes
    // and a multi-byte character makes the two differ, so the word would be a
    // promise about an editor's cursor that the number does not keep.
    expect(reported[0]).toMatch(/line 2, byte \d+/);
    expect(reported[1]).toMatch(/line 5, byte \d+/);
  });

  it("rejects a C0 byte that is not TAB, LF or CR", async () => {
    const dir = await newRepo({ "docs/page.md": `# One${FORM_FEED}# Two\n` });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("control character 0x0c");
  });

  it("rejects DEL, which is invisible in a diff for the same reason", async () => {
    const dir = await newRepo({ "src/a.ts": `const a${DEL} = 1;\n` });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("control character 0x7f");
  });

  it("says what to do about it, not only where it is", async () => {
    const dir = await newRepo({ "src/a.ts": `const a${NUL}b = 1;\n` });

    const result = runGuard(dir);

    expect(result.stderr).toMatch(/invisible in a diff/);
    expect(result.stderr).toMatch(/two-character escape/);
  });

  it("does not read a file git is not tracking", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-check-bidi-"));
    tempDirs.push(dir);
    spawnSync("git", ["init", "--quiet"], { cwd: dir, encoding: "utf-8" });
    await writeFile(path.join(dir, "tracked.md"), "# Fine\n");
    spawnSync("git", ["add", "tracked.md"], { cwd: dir, encoding: "utf-8" });
    // Never added: a scratch file is not a surface this guard governs.
    await writeFile(path.join(dir, "scratch.ts"), `const a${NUL}b = 1;\n`);

    const result = runGuard(dir);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("reads a tracked file whose extension is not on the binary deny list", async () => {
    // The list is a DENY list on purpose: an unknown extension is scanned.
    const dir = await newRepo({ "data/table.parquetish": `id${NUL}name\n` });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("table.parquetish");
  });

  it("skips a tracked file whose extension is on the binary deny list", async () => {
    const dir = await newRepo({ "assets/logo.png": Buffer.from([0x89, 0x50, 0x00, 0x0b, 0x1a]) });

    const result = runGuard(dir);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("reports the count it scanned, so a scan of nothing cannot read as a pass", async () => {
    const dir = await newRepo({ "a.md": "# A\n", "b.md": "# B\n" });

    const result = runGuard(dir);

    expect(result.stdout).toContain("2 tracked paths");
  });

  it("caps the findings from one file and says how many it did not list", async () => {
    // A file that is binary in fact and not on the deny list holds a control
    // byte every few bytes. Listing each one buries every other finding in the
    // run; the count is what keeps the cap from hiding that there is more.
    const dense = Array.from({ length: 50 }, (_, index) => `line${index}${NUL}`).join("\n");
    const dir = await newRepo({ "data/dense.tbl": dense });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    // `control character 0x…` is a located finding; the truncation line and
    // the remedy sentence both carry the words and are not findings.
    const listed = result.stderr
      .split("\n")
      .filter((line) => line.includes("control character 0x"));
    expect(listed).toHaveLength(20);
    expect(result.stderr).toContain("30 more control characters not listed (cap 20 per file)");
    // The remedy still reaches the reader after a truncated list.
    expect(result.stderr).toMatch(/invisible in a diff/);
  });

  it("caps per file, so a second file is still reported", async () => {
    const dense = Array.from({ length: 30 }, (_, index) => `line${index}${NUL}`).join("\n");
    const dir = await newRepo({ "data/a.tbl": dense, "data/b.tbl": `only${NUL}one\n` });

    const result = runGuard(dir);

    expect(result.stderr).toContain("data/b.tbl");
    expect(result.stderr.split("\n").filter((line) => line.includes("data/b.tbl"))).toHaveLength(1);
  });

  it("counts a bare CR as a line break, so a CR-only file locates correctly", async () => {
    // CR is an ALLOWED byte, so a file that ends its lines with one is legal
    // input here. Counting only LF put every finding on `line 1` — the wrong
    // place, in the one situation where the reader cannot see the character
    // they are hunting for.
    const dir = await newRepo({ "src/old-mac.ts": `one\rtwo\rthree${NUL}\r` });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("control character 0x00 at line 3, byte 6");
  });

  it("counts a CRLF pair once, not twice", async () => {
    const dir = await newRepo({ "src/dos.ts": `one\r\ntwo\r\nthree${NUL}\r\n` });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("control character 0x00 at line 3, byte 6");
  });

  it("says the tracked-file scan was skipped, without diagnosing why", async () => {
    // No repository here, which is one of three ways the list goes missing —
    // no checkout, no git on PATH, output past maxBuffer. A message naming any
    // one of them would be wrong about the other two.
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-check-bidi-"));
    tempDirs.push(dir);
    await writeFile(path.join(dir, "loose.ts"), `const a${NUL}b = 1;\n`);

    const result = runGuard(dir);

    // Exit 0: a caller without a repository still works. The skip is on stderr
    // so a green lane cannot read as "checked and clean".
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("the tracked-file scan was SKIPPED");
    expect(result.stderr).toContain("NUL and C0 controls were not checked");
    expect(result.stderr).not.toContain("no git checkout");
    expect(result.stdout).not.toContain("tracked paths");
  });
});
describe("check-bidi: the bidi and BOM scan covers the tracked tree", () => {
  it("rejects a bidi override in a named consumer document", async () => {
    const dir = await newRepo({
      "README.md": `# Title\n\nplain ${RIGHT_TO_LEFT_OVERRIDE} reversed\n`,
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("README.md: bidi/control character U+202E");
  });

  it("rejects one in a file an AGENT reads and acts on", async () => {
    // The half that was unguarded, and the worse half: a reordered line in a
    // skill body is an instruction that reads one way and executes another.
    const dir = await newRepo({
      ".qfai/assistant/skills/qfai-demo/SKILL.md": `# demo\n\nrun ${RIGHT_TO_LEFT_OVERRIDE} it\n`,
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("SKILL.md: bidi/control character U+202E");
  });

  it("rejects a BOM anywhere in the tree, leading or not", async () => {
    const dir = await newRepo({
      "src/a.ts": `${BOM}const a = 1;\n`,
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    // Labelled `BOM`, not `bidi/control` — the script has always separated the
    // two, and the label is what a reader greps for.
    expect(result.stderr).toContain("src/a.ts: BOM character U+FEFF at index 0");
  });

  it("exempts a frozen review record, which quotes what it found", async () => {
    // A review pack's value is that it says what happened. The tree carries a
    // BOM inside captured terminal output there — the finding itself — and
    // editing it to satisfy a guard would falsify the record.
    const dir = await newRepo({
      ".qfai/review/review-20260822180000000/R03.md": `saw ${BOM}#!/bin/sh here\n`,
      ".qfai/review_archive/review-20260101000000000/R01.md": `and ${RIGHT_TO_LEFT_OVERRIDE} here\n`,
    });

    const result = runGuard(dir);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("does not exempt a frozen record from the CONTROL scan", async () => {
    // A NUL makes the record unreadable to every text tool, which is not a
    // thing any record is improved by. The exemption is about rendering only.
    const dir = await newRepo({
      ".qfai/review/review-20260822180000000/R03.md": `saw${NUL}this\n`,
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("control character 0x00");
  });

  it("does not exempt a path that merely starts like one", async () => {
    // Prefix matching on a directory boundary: `.qfai/reviewer-notes/` is not
    // `.qfai/review/`, and a guard that cannot tell them apart is one rename
    // away from exempting a tree nobody decided to exempt.
    const dir = await newRepo({
      ".qfai/reviewer-notes/R03.md": `saw ${RIGHT_TO_LEFT_OVERRIDE} here\n`,
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("bidi/control character U+202E");
  });
});

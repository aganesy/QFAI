/**
 * `scripts/lib/bounded-read.mjs` — the one reader the repository-root guards use.
 *
 * Three findings arrived on three separate readers before this module existed: the workflow files,
 * the required-status-context declaration, and the E2E annotation ledger. Each was a plain read
 * that followed a symlink, in a lane `ci:lint` requires — so a pull request could point one at
 * `/dev/zero` or at a FIFO and the required lane hung until the job timed out. A lane that can be
 * made to hang blocks nothing.
 *
 * Two things are checked here. The reader's own refusals, over the shapes a pull request can
 * actually plant; and the property the extraction exists for — that neither root guard kept a
 * private copy of the posture, because two copies is how the third finding happened.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readBoundedText } from "../../../../scripts/lib/bounded-read.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("readBoundedText", () => {
  it("reads a regular file inside the ceiling, which is the half a blanket refusal would break", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-bounded-"));
    try {
      const file = path.join(dir, "ordinary.yml");
      writeFileSync(file, "name: ordinary\n", "utf-8");
      expect(
        readBoundedText(file, 1024),
        "the control: every guard downstream depends on this answering",
      ).toBe("name: ordinary\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a file past the ceiling rather than reading it into memory", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-bounded-size-"));
    try {
      const file = path.join(dir, "huge.yml");
      writeFileSync(file, "x".repeat(4096), "utf-8");
      expect(readBoundedText(file, 4096), "at the ceiling is still readable").toHaveLength(4096);
      expect(readBoundedText(file, 4095), "one byte past it is not a file this reader opens").toBe(
        undefined,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a directory, by name and again on the descriptor", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-bounded-dir-"));
    try {
      mkdirSync(path.join(dir, "inner"));
      expect(readBoundedText(path.join(dir, "inner"), 1024)).toBe(undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    // And both arms, asserted on the SOURCE — because the behavioural half above cannot reach the
    // second one from here. Measured: with BOTH `isFile()` tests removed the row stayed green on
    // Windows, where `open` on a directory fails outright. On POSIX it SUCCEEDS — `open(dir,
    // O_RDONLY)` is legal and only `read` fails — so the descriptor test is the arm that refuses a
    // directory on the platform CI runs, and a plant removing it would be invisible to a row that
    // only calls the function on this machine.
    const source = readFileSync(path.join(REPO_ROOT, "scripts/lib/bounded-read.mjs"), "utf-8");
    expect(source, "the name must be refused before anything is opened").toMatch(
      /lstatSync[\s\S]{0,200}?!inspected\.isFile\(\)/,
    );
    expect(
      source,
      "and the DESCRIPTOR must decide again, or a path swapped after the lstat is read as a file",
    ).toMatch(/fstatSync\(fd\)[\s\S]{0,200}?!stats\.isFile\(\)/);
  });

  it("answers the same `undefined` for an absent path, so a caller has one branch to write", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-bounded-absent-"));
    try {
      expect(readBoundedText(path.join(dir, "nothing.yml"), 1024)).toBe(undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a link by name, without reading what it points at", () => {
    // The refusal the whole module exists for. `/dev/zero` does not exist on every platform this
    // suite runs on, so the target is an ordinary file with known content: if the reader followed
    // the link it would return that content, and the row would fail with something legible rather
    // than by timing out.
    const dir = mkdtempSync(path.join(tmpdir(), "qfai-bounded-link-"));
    try {
      const target = path.join(dir, "target.yml");
      writeFileSync(target, "name: target\n", "utf-8");
      const link = path.join(dir, "link.yml");
      try {
        symlinkSync(target, link, "file");
      } catch {
        // Windows without developer mode refuses symlink creation for an unprivileged process. The
        // reader is platform-independent; the FIXTURE is not, so the row skips rather than passing
        // for a reason that has nothing to do with the code.
        return;
      }
      expect(readBoundedText(target, 1024), "the premise: the target is readable").toBe(
        "name: target\n",
      );
      expect(
        readBoundedText(link, 1024),
        "a path a pull request can point anywhere is not a path this reader follows",
      ).toBe(undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("neither root guard keeps a private copy of the posture", () => {
  // Review finding [76] is the reason this row is here rather than a comment. The hygiene lane had
  // the reader as a private function and the ledger guard read its markdown with a plain
  // `readFile` — the same defect, in a lane just as required, reported separately because there was
  // nothing shared to have fixed once. A reader reintroduced locally would satisfy every
  // behavioural row above while putting the repository back where it started.
  for (const relative of [
    "scripts/check-workflow-hygiene.mjs",
    "scripts/check-atdd-annotation-ledger.mjs",
  ]) {
    it(`${relative} reads through the shared module`, () => {
      const source = readFileSync(path.join(REPO_ROOT, relative), "utf-8");
      expect(source, "the guard must import the shared reader").toContain(
        'from "./lib/bounded-read.mjs"',
      );
      expect(
        source,
        "and must not open and read a descriptor of its own — that is the copy this module replaced",
      ).not.toMatch(/readSync\(/);
      expect(source, "nor read a path whose bytes it has not bounded").not.toMatch(
        /readFileSync\(/,
      );
    });
  }
});

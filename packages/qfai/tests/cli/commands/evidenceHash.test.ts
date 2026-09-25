/**
 * `qfai evidence hash` prints the values the completion gate recomputes.
 *
 * The values themselves are pinned against the gate in
 * `tests/core/tddListEvidence.test.ts`, over an entry the gate accepts. These
 * cases pin the command around them: what it parses, what it prints, and that
 * a value it cannot compute leaves stdout empty and exits 2.
 */
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseArgs } from "../../../src/cli/lib/args.js";
import { EXIT_CODES } from "../../../src/cli/lib/exitCodes.js";
import { run } from "../../../src/cli/main.js";
import { captureStderr } from "../../helpers/stderr.js";
import { captureStdout } from "../../helpers/stdout.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const PACK = ".qfai/review/review-20260101000000000";
const EVIDENCE = ".qfai/evidence/implement-spec-0001.md";
const REVISION = "abc1230000000000000000000000000000000000";

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function write(root: string, relative: string, body: string): Promise<void> {
  const file = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf-8");
}

/** The command's stdout, stderr and exit code. */
async function hash(
  root: string,
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number | undefined }> {
  const previous = process.exitCode;
  process.exitCode = undefined;
  let stdout = "";
  let exitCode: number | undefined;
  try {
    const stderr = await captureStderr(async () => {
      stdout = await captureStdout(async () => {
        await run(["evidence", "hash", ...args, "--root", root], root);
      });
    });
    exitCode = typeof process.exitCode === "number" ? process.exitCode : undefined;
    return { stdout, stderr, exitCode };
  } finally {
    process.exitCode = previous;
  }
}

describe("qfai evidence hash: arguments", () => {
  it("reads the kind and every target before the options", () => {
    const parsed = parseArgs(
      ["evidence", "hash", "red-test", "tests/a.test.ts", "tests/b.test.ts", "--root", "."],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.evidenceHashKind).toBe("red-test");
    expect(parsed.options.evidenceTargets).toEqual(["tests/a.test.ts", "tests/b.test.ts"]);
  });

  for (const [argv, reason] of [
    [["evidence"], "Expected: hash"],
    [["evidence", "sum"], 'unknown subcommand "sum"'],
    [["evidence", "hash"], "name a kind"],
    [["evidence", "hash", "revision"], 'unknown kind "revision"'],
    [["evidence", "hash", "red-test"], "one or more manifest paths"],
    [["evidence", "hash", "review-pack"], "one review pack directory"],
    [["evidence", "hash", "checkpoint", `${EVIDENCE}#tdd-0001`, "extra"], "one <evidence-file>"],
    // A path after an option would otherwise be dropped, and the printed hash
    // would be over a shorter manifest than the one written.
    [["evidence", "hash", "red-test", "a.ts", "--root", ".", "b.ts"], "b.ts follows an option"],
    [["evidence", "hash", "review-pack", PACK, "--format", "json"], "--format is not valid"],
  ] as const) {
    it(`refuses ${argv.join(" ")}`, () => {
      const parsed = parseArgs([...argv], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.invalidExitCode).toBe(EXIT_CODES.inputError);
      expect(parsed.invalidReason).toContain(reason);
    });
  }

  it("lists the command in the help", async () => {
    const stdout = await captureStdout(async () => {
      await run(["--help"], process.cwd());
    });
    expect(stdout).toContain("evidence hash <kind> <target>...");
    expect(stdout).toContain("completion|parity|checkpoint <evidence-file>#<TDD-ID>");
  });
});

describe("qfai evidence hash: values", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "qfai-evidence-hash-"));
  });

  afterEach(async () => {
    await removeTempTree(root);
  });

  it("prints a review pack's seal: Markdown normalized, every other file raw, sorted by path", async () => {
    await write(root, `${PACK}/review_request.md`, "TDD-ID: TDD-0001  \r\n");
    await write(root, `${PACK}/summary.json`, '{"overall_status":"PASS"}  \n');
    const expected = digest(
      [
        `${PACK}/review_request.md\0${digest("TDD-ID: TDD-0001\n")}`,
        `${PACK}/summary.json\0${digest('{"overall_status":"PASS"}  \n')}`,
      ].join("\n"),
    );

    const result = await hash(root, "review-pack", PACK);

    expect(result.exitCode ?? EXIT_CODES.ok).toBe(EXIT_CODES.ok);
    expect(result.stdout).toBe(`${expected}\n`);
  });

  it("refuses a directory that is not a review pack, and prints nothing", async () => {
    await write(root, ".qfai/evidence/notes.md", "notes\n");

    const result = await hash(root, "review-pack", ".qfai/evidence");

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("is not a review pack");
  });

  it("prints a RED test hash over the manifest paths in the order given", async () => {
    await write(root, "tests/a.test.ts", "// a\n");
    await write(root, "tests/b.test.ts", "// b\n");
    const record = async (relative: string): Promise<string> => {
      const absolute = path.join(root, ...relative.split("/"));
      const mode = ((await lstat(absolute)).mode & 0o100) === 0 ? "100644" : "100755";
      return `${relative}\0file\0${mode}\0${digest(await readFile(absolute))}`;
    };
    const expected = digest(
      [await record("tests/a.test.ts"), await record("tests/b.test.ts")].join("\n"),
    );

    const result = await hash(root, "red-test", "tests/a.test.ts", "tests/b.test.ts");

    expect(result.stdout).toBe(`${expected}\n`);
  });

  it("refuses a manifest out of byte order rather than sorting it", async () => {
    await write(root, "tests/a.test.ts", "// a\n");
    await write(root, "tests/b.test.ts", "// b\n");

    const result = await hash(root, "red-test", "tests/b.test.ts", "tests/a.test.ts");

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("in byte order");
  });

  it("prints a checkpoint seal over the last round's Revision", async () => {
    await write(
      root,
      EVIDENCE,
      [
        "# Evidence",
        "",
        "### TDD-0001",
        "",
        `- Round 1: Revision: ${REVISION}`,
        "- Checkpoint verification command: npm test",
        "- Checkpoint verification result: PASS",
        "",
      ].join("\n"),
    );
    const expected = digest(
      `Revision: ${REVISION}\nCheckpoint verification command: npm test\nCheckpoint verification result: PASS\n`,
    );

    const result = await hash(root, "checkpoint", `${EVIDENCE}#tdd-0001`);

    expect(result.stdout).toBe(`${expected}\n`);
  });

  it("seals over Checkpoint verification revision where the entry records one", async () => {
    const checkpointRevision = "def4560000000000000000000000000000000000";
    await write(
      root,
      EVIDENCE,
      [
        "# Evidence",
        "",
        "### TDD-0001",
        "",
        `- Round 1: Revision: ${REVISION}`,
        "- Checkpoint verification command: npm test",
        "- Checkpoint verification result: PASS",
        `- Checkpoint verification revision: ${checkpointRevision}`,
        "",
      ].join("\n"),
    );
    const expected = digest(
      `Revision: ${checkpointRevision}\nCheckpoint verification command: npm test\nCheckpoint verification result: PASS\n`,
    );

    const result = await hash(root, "checkpoint", `${EVIDENCE}#TDD-0001`);

    expect(result.stdout).toBe(`${expected}\n`);
  });

  it("names the checkpoint fields an entry does not record", async () => {
    await write(root, EVIDENCE, `# Evidence\n\n### TDD-0001\n\n- Round 1: Revision: ${REVISION}\n`);

    const result = await hash(root, "checkpoint", `${EVIDENCE}#tdd-0001`);

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Checkpoint verification command");
    expect(result.stderr).toContain("Checkpoint verification result");
  });

  it("refuses a target that names no entry", async () => {
    const result = await hash(root, "completion", EVIDENCE);

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stderr).toContain("is not <evidence-file>#<TDD-ID>");
  });

  it("refuses an entry the evidence file does not have", async () => {
    await write(root, EVIDENCE, "# Evidence\n\n### TDD-0002\n");

    const result = await hash(root, "completion", `${EVIDENCE}#tdd-0001`);

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stderr).toContain("has no ### TDD-0001 heading");
  });

  it("refuses a completion subject whose ledger has no such row", async () => {
    await write(root, EVIDENCE, "# Evidence\n\n### TDD-0001\n\n- TDD-ID: TDD-0001\n");

    const result = await hash(root, "completion", `${EVIDENCE}#tdd-0001`);

    expect(result.exitCode).toBe(EXIT_CODES.inputError);
    expect(result.stderr).toContain("ledger has no TDD-0001 row");
  });
});

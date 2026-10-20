/**
 * `checkDocuments` runs the manifest's entries at the same time.
 *
 * `spawn` is replaced with a stand-in so a case can decide when each entry's
 * mdschema process finishes, or that it never starts. The output the stand-in
 * prints has mdschema's shape, so the findings travel through the real parser.
 * `vi.mock` is hoisted to module scope, so these cases live in their own file.
 */
import type * as ChildProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

type FakeSpawn = (command: string, args: string[], options: { cwd: string }) => unknown;

const control = vi.hoisted((): { spawn: FakeSpawn | null } => ({ spawn: null }));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof ChildProcess>("node:child_process");
  return {
    ...actual,
    spawn: (command: string, args: string[], options: { cwd: string }) =>
      control.spawn === null
        ? actual.spawn(command, args, options)
        : control.spawn(command, args, options),
  };
});

const { checkDocuments } = await import("../../assets/scripts/check-mdschema.mjs");

const DECISIONS =
  "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
const OPEN_QUESTIONS =
  "# Open Questions\n\n## Open Questions\n\n| ID | Question | Status |\n| --- | --- | --- |\n";

const roots: string[] = [];

afterEach(async () => {
  control.spawn = null;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** A tree holding the documents of two manifest entries, decisions first. */
async function twoEntryTree(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-concurrent-"));
  roots.push(root);
  await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
  await writeFile(path.join(root, ".qfai", "spec", "decisions.md"), DECISIONS, "utf-8");
  await writeFile(path.join(root, ".qfai", "spec", "open-questions.md"), OPEN_QUESTIONS, "utf-8");
  return root;
}

/** The schema file an mdschema command line names. */
function schemaOf(args: string[]): string {
  return path.basename(args[args.indexOf("--schema") + 1] ?? "");
}

/** A finished mdschema process that printed `output` and exited with `status`. */
function finishedChild(output: string, status: number, delayMs: number, onClose: () => void) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  // `close` follows the end of stdout, as it does for a real process.
  child.stdout.on("end", () => {
    onClose();
    child.emit("close", status);
  });
  setTimeout(() => {
    child.stderr.end();
    child.stdout.end(output);
  }, delayMs);
  return child;
}

describe("checking the manifest's entries at the same time", () => {
  it("reports the findings in manifest order when the first entry finishes last", async () => {
    const root = await twoEntryTree();
    const finished: string[] = [];
    control.spawn = (_command, args, options) => {
      const schema = schemaOf(args);
      const files = args.slice(args.indexOf("--schema") + 2);
      const output = files
        .map(
          (file) =>
            `${path.resolve(options.cwd, file)}\n  ✗ 3:1 [required] Finding from ${schema}\n`,
        )
        .join("");
      const delayMs = schema === "decisions.mdschema.yml" ? 100 : 0;
      return finishedChild(output, 1, delayMs, () => finished.push(schema));
    };

    const result = await checkDocuments(root);

    expect(finished).toEqual(["open-questions.mdschema.yml", "decisions.mdschema.yml"]);
    expect(result).toEqual({
      ok: true,
      checked: 2,
      violations: [
        {
          file: ".qfai/spec/decisions.md",
          line: 3,
          column: 1,
          rule: "required",
          message: "Finding from decisions.mdschema.yml",
        },
        {
          file: ".qfai/spec/open-questions.md",
          line: 3,
          column: 1,
          rule: "required",
          message: "Finding from open-questions.mdschema.yml",
        },
      ],
    });
  });

  it("reports a process that could not start as a check that did not run", async () => {
    const root = await twoEntryTree();
    control.spawn = () => {
      throw Object.assign(new Error("spawn ENAMETOOLONG"), { code: "ENAMETOOLONG" });
    };

    expect(await checkDocuments(root)).toEqual({
      ok: false,
      reason: expect.stringMatching(/^mdschema did not run: spawn ENAMETOOLONG/u),
    });
  });

  it("reports a process left without output streams as a check that did not run", async () => {
    const root = await twoEntryTree();
    control.spawn = () => {
      const child = Object.assign(new EventEmitter(), { stdout: null, stderr: null });
      setTimeout(() => child.emit("error", new Error("spawn EMFILE")), 0);
      return child;
    };

    expect(await checkDocuments(root)).toEqual({
      ok: false,
      reason: expect.stringMatching(/^mdschema did not run: spawn EMFILE/u),
    });
  });
});

/**
 * Integration: `qfai discussion` command. `discussion use <id>` writes
 * `.qfai/state.json#discussion.currentId`; `discussion list --active`
 * reads that value (NOT filesystem mtime). When the pointer is absent
 * and multiple candidate `discussion-*` dirs exist, `list --active`
 * exits non-zero naming the candidates and the recovery command.
 */
// QFAI:SPEC-0010:TC-0010-0012
// QFAI:SPEC-0010:TC-0010-0013

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runDiscussion } from "../../../../src/cli/commands/discussion.js";
import { readDiscussionCurrentId } from "../../../../src/core/state.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-discussion-cmd-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    write: (m: string) => out.push(m),
    writeErr: (m: string) => err.push(m),
  };
}

async function makePack(id: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "discussion", id), { recursive: true });
}

describe("TC-0010-0012: discussion use writes pointer; list --active reads it", () => {
  it("`discussion use <id>` sets state.json#discussion.currentId", async () => {
    await makePack("discussion-20260527075558258");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    expect(await readDiscussionCurrentId(root)).toBe("discussion-20260527075558258");
  });

  it("`discussion list --active --format json` prints the currentId read from state.json", async () => {
    await makePack("discussion-20260527075558258");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: () => {},
      writeErr: () => {},
    });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as { currentId?: string };
    expect(body.currentId).toBe("discussion-20260527075558258");
  });

  it("`discussion list --active` does NOT infer from mtime when the pointer is set", async () => {
    // Two packs exist; pointer explicitly names the OLDER one. mtime
    // inference would pick the newer dir, so a correct reader returns
    // the pointer value regardless of creation order.
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260527075558258");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260101000000000",
      write: () => {},
      writeErr: () => {},
    });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as { currentId?: string };
    expect(body.currentId).toBe("discussion-20260101000000000");
  });
});

describe("TC-0010-0013: ambiguous/absent pointer recovery error", () => {
  it("exits non-zero naming candidate dirs + recovery command when currentId absent with multiple candidates", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    await makePack("discussion-20260303000000000");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    const combined = cap.out.join("\n") + cap.err.join("\n");
    expect(combined).toMatch(/discussion-20260101000000000/);
    expect(combined).toMatch(/discussion-20260202000000000/);
    expect(combined).toMatch(/discussion-20260303000000000/);
    expect(combined).toMatch(/qfai discussion use <id>/);
  });

  it("exits non-zero when currentId resolves to a missing pack with multiple candidates", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260909000000000",
      write: () => {},
      writeErr: () => {},
    });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    const combined = cap.out.join("\n") + cap.err.join("\n");
    expect(combined).toMatch(/qfai discussion use <id>/);
  });
});

// Pin the path.resolve(...) (vs path.join) behaviour of
// resolveDiscussionRoot: an absolute `paths.discussionDir` in
// qfai.config.yaml must be honored verbatim instead of being
// concatenated under `<root>`. Pre-fix, an absolute config value was
// silently ignored (path.join treated `<root>` as the base); the
// discussionDir resolved to `<root>/<configured-abs-path>` which on
// Windows produced UNC-style nonsense and on POSIX simply re-anchored
// to the wrong tree. The fix migrated to path.resolve, which preserves
// absolute paths and only joins relative ones — this test pins that
// contract so a future regression to path.join is caught immediately.
describe("resolveDiscussionRoot honors absolute discussionDir verbatim", () => {
  it("`discussion list --active` reads packs from an absolute paths.discussionDir", async () => {
    const { writeFile } = await import("node:fs/promises");
    // Create a totally separate dir tree (NOT under `root`) and place
    // a single discussion-* candidate there. If resolveDiscussionRoot
    // regressed to path.join, the lookup would land under
    // `<root>/<absoluteDir>` and find no candidates → the test would
    // see the "no candidates" error path instead of the success path.
    const absoluteDir = await mkdtemp(path.join(os.tmpdir(), "qfai-disc-abs-"));
    try {
      await mkdir(path.join(absoluteDir, "discussion-20260530120000000"), {
        recursive: true,
      });
      // Write a qfai.config.yaml under `root` whose paths.discussionDir
      // is the ABSOLUTE path we just created — not a relative subpath.
      // The config loader normalizes via `loadConfig(root)` which is
      // what resolveDiscussionRoot consults.
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        `paths:\n  discussionDir: "${absoluteDir.replace(/\\/g, "\\\\")}"\n`,
        "utf-8",
      );
      const cap = capture();
      const code = await runDiscussion({
        root,
        action: "list",
        active: true,
        format: "text",
        write: cap.write,
        writeErr: cap.writeErr,
      });
      // The lone candidate at the absolute dir must be returned as the
      // de-facto active session via the stdout payload. The stderr
      // "(no pointer set; single candidate assumed ...)" hint is
      // emitted alongside but is not asserted here — the contract
      // under test is the verbatim absolute-path resolution.
      expect(code).toBe(0);
      expect(cap.out.join("\n")).toMatch(/discussion-20260530120000000/);
    } finally {
      await rm(absoluteDir, { recursive: true, force: true });
    }
  });
});

// Bare `qfai discussion list` used to be a hard error ("only --active
// is supported."), so the pack ids were reachable only as a side
// effect of the `list --active` ambiguity error — i.e. only while the
// operator was already stuck. Enumeration is now the unflagged
// behaviour of the verb, with the active pointer marked by `*`.
describe("bare `discussion list` enumerates packs", () => {
  it("prints every pack, marking the active pointer target", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260202000000000",
      write: () => {},
      writeErr: () => {},
    });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    expect(cap.out).toEqual(["  discussion-20260101000000000", "* discussion-20260202000000000"]);
    expect(cap.err).toEqual([]);
  });

  it("`--format json` reports { packs: [{ id, active }] }", async () => {
    await makePack("discussion-20260202000000000");
    await makePack("discussion-20260101000000000");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260101000000000",
      write: () => {},
      writeErr: () => {},
    });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as {
      packs?: { id: string; active: boolean }[];
    };
    expect(body.packs).toEqual([
      { id: "discussion-20260101000000000", active: true },
      { id: "discussion-20260202000000000", active: false },
    ]);
  });

  it("exits 0 with an empty list when no pack exists (nothing to list is not a failure)", async () => {
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as { packs?: unknown[] };
    expect(body.packs).toEqual([]);
    expect(cap.err).toEqual([]);
  });

  it("marks no pack active when the pointer is unset", async () => {
    await makePack("discussion-20260101000000000");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    expect(cap.out).toEqual(["  discussion-20260101000000000"]);
  });

  // A dir like `discussion-latest` is `dangerous` naming: QFAI-DPACK-005
  // demands a rename or a removal, and `discussion use <id>` cannot be
  // usefully pointed at it. Since this list exists to hand the operator
  // the arguments `discussion use` accepts, offering that name would be
  // offering an unusable choice.
  it("does not offer a non-canonical dir as a selectable pack", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-latest");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as { packs?: { id: string }[] };
    expect(body.packs).toEqual([{ id: "discussion-20260101000000000", active: false }]);
    // …but it is not silently dropped: stderr names it and the repair.
    expect(cap.err.join("\n")).toMatch(/discussion-latest/);
    expect(cap.err.join("\n")).toMatch(/QFAI-DPACK-005/);
  });

  // "The directory could not be read" and "the directory holds no packs"
  // are different facts. Collapsing the first into an exit-0 empty list
  // tells the operator their packs are gone when they are merely
  // unreachable, so a non-ENOENT failure has to surface.
  it("exits non-zero instead of printing an empty list when the root cannot be read", async () => {
    // A plain file where the discussion dir belongs reproduces a
    // non-ENOENT readdir failure (ENOTDIR) on every supported platform.
    const { writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "discussion"), "not a directory", "utf-8");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/cannot enumerate/);
  });

  // `loadConfig` degrades a broken qfai.config.yaml into defaultConfig +
  // issues. Dropping those issues would make the enumeration answer
  // "which packs exist?" from the DEFAULT `.qfai/discussion` while the
  // operator believes they are seeing the configured location — a wrong
  // candidate set handed back under exit 0. The listing must abort.
  it("exits non-zero naming the config problem instead of listing the default dir", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    // `paths.discussionDir` typed as a mapping, not a string: loadConfig
    // records the type error and falls back to `.qfai/discussion`.
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  discussionDir:\n    nested: true\n",
      "utf-8",
    );
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/qfai\.config\.yaml/);
    expect(cap.err.join("\n")).toMatch(/paths\.discussionDir/);
  });

  // …but only the keys the listing actually depends on. `loadConfig`
  // normalizes key by key, so a rejected `baseBranch` leaves
  // `paths.discussionDir` — and therefore the candidate set — completely
  // intact. Aborting on it would make an unrelated typo elsewhere in the
  // file break the one command an operator runs to find out what to type
  // next.
  it("still enumerates when the config error does not touch paths.discussionDir", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "baseBranch: 123\npaths:\n  discussionDir: .qfai/discussion\n",
      "utf-8",
    );
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const body = JSON.parse(cap.out.join("\n")) as { packs?: { id: string }[] };
    expect(body.packs).toEqual([{ id: "discussion-20260101000000000", active: false }]);
    // The unrelated problem is still reported — on stderr, so the JSON
    // view stays parseable — rather than silently swallowed.
    expect(cap.err.join("\n")).toMatch(/baseBranch/);
  });

  // An unparsable file is the other half of the same rule: nothing at all
  // was normalized, so `paths.discussionDir` is a guess.
  it("exits non-zero when the config file cannot be parsed at all", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    await writeFile(path.join(root, "qfai.config.yaml"), "paths: [unclosed\n", "utf-8");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/qfai\.config\.yaml/);
  });

  // `active` is asserted for every row of the payload. A state file the
  // command merely failed to read used to come back as `null` — the same
  // value an untouched repository yields — so every pack was published as
  // `active: false` under exit 0: an invented fact, and one a JSON
  // consumer has no way to question.
  it("exits non-zero instead of reporting every pack inactive when state.json is corrupt", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "state.json"), "{ not json", "utf-8");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/state\.json/);
  });

  it("exits non-zero when state.json holds a currentId of the wrong type", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "state.json"),
      `${JSON.stringify({ discussion: { currentId: 42 } })}\n`,
      "utf-8",
    );
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/currentId/);
  });

  // A directory where the state file belongs reproduces a present-but-
  // unreadable state file (EISDIR) without depending on chmod, which does
  // not restrain a root-owned test runner.
  it("exits non-zero when state.json exists but cannot be read", async () => {
    await makePack("discussion-20260101000000000");
    await mkdir(path.join(root, ".qfai", "state.json"), { recursive: true });
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "list",
      format: "json",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).not.toBe(0);
    expect(cap.out).toEqual([]);
    expect(cap.err.join("\n")).toMatch(/state\.json/);
  });

  // The determinate "no pointer" spellings must stay exit 0: an absent
  // file, and a state file that simply records nothing about discussions.
  it("keeps an absent or pointer-less state.json a determinate 'nothing active'", async () => {
    const { writeFile } = await import("node:fs/promises");
    await makePack("discussion-20260101000000000");
    const absent = capture();
    expect(
      await runDiscussion({
        root,
        action: "list",
        format: "json",
        write: absent.write,
        writeErr: absent.writeErr,
      }),
    ).toBe(0);

    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "state.json"),
      `${JSON.stringify({ other: { kept: true } })}\n`,
      "utf-8",
    );
    const empty = capture();
    expect(
      await runDiscussion({
        root,
        action: "list",
        format: "json",
        write: empty.write,
        writeErr: empty.writeErr,
      }),
    ).toBe(0);

    const expected = { packs: [{ id: "discussion-20260101000000000", active: false }] };
    expect(JSON.parse(absent.out.join("\n"))).toEqual(expected);
    expect(JSON.parse(empty.out.join("\n"))).toEqual(expected);
  });
});

// The tests above drive `runDiscussion` directly, which bypasses
// `main.ts#resolveRoot` — and that is exactly where the JSON view used
// to be corrupted: with no `qfai.config.yaml` above the cwd and no
// `--root`, the defaultConfig notice was written to stdout right before
// the payload, so stdout as a whole was not parseable JSON. This drives
// the real `run(...)` entry point to pin the separation.
describe("`discussion list --format json` keeps stdout parseable via the CLI entry point", () => {
  it("routes the defaultConfig notice to stderr, leaving stdout pure JSON", async () => {
    const { run } = await import("../../../../src/cli/main.js");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const originalOut = process.stdout.write.bind(process.stdout);
    const originalErr = process.stderr.write.bind(process.stderr);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    // Sandbox root: no qfai.config.yaml here or above (os.tmpdir()), so
    // `resolveRoot` takes the "defaultConfig" branch.
    await makePack("discussion-20260101000000000");
    try {
      process.stdout.write = (chunk: unknown): boolean => {
        stdout.push(String(chunk));
        return true;
      };
      process.stderr.write = (chunk: unknown): boolean => {
        stderr.push(String(chunk));
        return true;
      };
      await run(["discussion", "list", "--format", "json"], root);
    } finally {
      process.stdout.write = originalOut;
      process.stderr.write = originalErr;
      process.exitCode = previousExitCode;
    }
    expect(stderr.join("")).toMatch(/defaultConfig/);
    const body = JSON.parse(stdout.join("")) as { packs?: { id: string }[] };
    expect(body.packs).toEqual([{ id: "discussion-20260101000000000", active: false }]);
  });
});

describe("bare `discussion list` rejects an invalid --format at the CLI entry point", () => {
  // A typo'd `--format` value must not be absorbed by the bare-list
  // default (`format ?? "text"`) and reported as a successful listing.
  // `parseArgs` marks the run invalid AND forces `options.help`, so
  // `run()` returns usage + `invalidExitCode` before the `discussion`
  // switch arm is ever entered — `runDiscussion` never executes.
  it("rejects an unsupported --format value instead of listing under exit 0", async () => {
    const { run } = await import("../../../../src/cli/main.js");
    const stdout: string[] = [];
    const originalOut = process.stdout.write.bind(process.stdout);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    await makePack("discussion-20260101000000000");
    let exitCode: number | string | undefined;
    try {
      process.stdout.write = (chunk: unknown): boolean => {
        stdout.push(String(chunk));
        return true;
      };
      await run(["discussion", "list", "--format", "yaml"], root);
      exitCode = process.exitCode;
    } finally {
      process.stdout.write = originalOut;
      process.exitCode = previousExitCode;
    }
    // `invalidExitCode`, which the exit-code table in
    // `.qfai/contracts/cli/qfai-init.md` reserves as 2 for a malformed option
    // value. It was 1 when this case was written and moved upstream; the
    // assertion is on the same code path, not a new one.
    expect(exitCode).toBe(2);
    // Usage, not a pack listing.
    expect(stdout.join("")).not.toMatch(/discussion-20260101000000000/);
    expect(stdout.join("")).toMatch(/Commands:/);
  });
});

// `discussion use <id>` used to mutate `.qfai/state.json` while writing
// nothing to stdout or stderr, so a mistyped id was byte-for-byte
// indistinguishable from a correct one until a later `list --active`
// failed about `state.json` rather than about the command that wrote
// it. These tests pin the two pieces of feedback: an unconditional
// stdout confirmation naming file + key + value, and a stderr note when
// the (deliberately permissive) write records an id that matches no
// existing `discussion-*` dir.
describe("discussion use confirms the write and flags an unmatched id", () => {
  it("prints the file and key it wrote on stdout", async () => {
    await makePack("discussion-20260527075558258");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    expect(code).toBe(0);
    const out = cap.out.join("\n");
    expect(out).toMatch(/discussion\.currentId=discussion-20260527075558258/);
    expect(out).toMatch(/state\.json/);
    // A matching pack exists, so the unmatched-id note must stay silent.
    expect(cap.err.join("\n")).toBe("");
  });

  it("notes on stderr when the id matches no discussion-* dir, without failing the write", async () => {
    await makePack("discussion-20260527075558258");
    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "use",
      id: "not-even-a-discussion-id",
      write: cap.write,
      writeErr: cap.writeErr,
    });
    // Permissive by design: the pointer is still recorded and the exit
    // code stays 0 — only the evidence changes.
    expect(code).toBe(0);
    expect(await readDiscussionCurrentId(root)).toBe("not-even-a-discussion-id");
    expect(cap.out.join("\n")).toMatch(/discussion\.currentId=not-even-a-discussion-id/);
    const err = cap.err.join("\n");
    expect(err).toMatch(/not-even-a-discussion-id/);
    expect(err).toMatch(/does not match an existing discussion-\* dir/);
  });

  it("stays silent about a real id when the discussion root cannot be read", async () => {
    // `findPacks` answers [] for an unreadable root as well as an empty one,
    // so the note used to claim a pack it never saw does not exist. Staged as
    // a file where the directory belongs: readdir answers ENOTDIR, a
    // non-ENOENT failure on every platform and not defeated by running as
    // root.
    const discussionRoot = path.join(root, ".qfai", "discussion");
    await rm(discussionRoot, { recursive: true, force: true });
    await mkdir(path.dirname(discussionRoot), { recursive: true });
    await writeFile(discussionRoot, "not a directory\n", "utf-8");

    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: cap.write,
      writeErr: cap.writeErr,
    });

    // The write still succeeds — the note is best effort — but it must not
    // assert anything about packs it could not enumerate.
    expect(code).toBe(0);
    expect(await readDiscussionCurrentId(root)).toBe("discussion-20260527075558258");
    expect(cap.err.join("\n")).toBe("");
  });

  it("still notes an unmatched id when the discussion root is simply absent", async () => {
    // ENOENT is the one read failure that really does mean "no candidates".
    await rm(path.join(root, ".qfai", "discussion"), { recursive: true, force: true });

    const cap = capture();
    const code = await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: cap.write,
      writeErr: cap.writeErr,
    });

    expect(code).toBe(0);
    expect(cap.err.join("\n")).toMatch(/does not match an existing discussion-\* dir/);
  });
});

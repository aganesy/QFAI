/**
 * Integration: `qfai discussion` command. `discussion use <id>` writes
 * `.qfai/state.json#discussion.currentId`; `discussion list --active`
 * reads that value (NOT filesystem mtime). When the pointer is absent
 * and multiple candidate `discussion-*` dirs exist, `list --active`
 * exits non-zero naming the candidates and the recovery command.
 */
// QFAI:SPEC-0010:TC-0010-0012
// QFAI:SPEC-0010:TC-0010-0013

import { mkdir, mkdtemp, rm } from "node:fs/promises";
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

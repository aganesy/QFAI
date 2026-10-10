import type * as childProcess from "node:child_process";
import type * as crypto from "node:crypto";
import type * as fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emitText } from "../../../../src/cli/commands/validate.js";
import { shouldFail } from "../../../../src/cli/lib/failOn.js";
import { loadConfig } from "../../../../src/core/config.js";
import type { Issue, ValidationResult } from "../../../../src/core/types.js";
import { countIssues } from "../../../../src/core/validate.js";
import { validateForbiddenIdentifiers } from "../../../../src/core/validators/forbiddenIdentifiers.js";
import { captureStdout } from "../../../helpers/stdout.js";

const hooks = vi.hoisted(() => ({
  git: vi.fn(),
  lstat: vi.fn(),
  realpath: vi.fn(),
  open: vi.fn(),
  readFile: vi.fn(),
  fakeHash: false,
  hashes: 0,
  hashBytes: 0,
  seen: [] as string[],
}));

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof childProcess>("node:child_process");
  const { promisify } = await import("node:util");
  const execFile = Object.assign(
    () => {
      throw new Error("Use the promisified Git entry");
    },
    {
      [promisify.custom]: (...args: unknown[]) => hooks.git(...args),
    },
  );
  return { ...actual, execFile };
});
vi.mock("node:fs/promises", async () => ({
  ...(await vi.importActual<typeof fsPromises>("node:fs/promises")),
  lstat: (...args: unknown[]) => hooks.lstat(...args),
  realpath: (...args: unknown[]) => hooks.realpath(...args),
  open: (...args: unknown[]) => hooks.open(...args),
  readFile: (...args: unknown[]) => hooks.readFile(...args),
}));
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof crypto>("node:crypto");
  const unmatched = "0".repeat(64);
  return {
    ...actual,
    createHash: (algorithm: string) => ({
      update(input: Buffer) {
        hooks.hashes += 1;
        hooks.hashBytes += input.length;
        if (hooks.seen.length < 20) hooks.seen.push(input.toString("ascii"));
        return {
          digest: () =>
            hooks.fakeHash ? unmatched : actual.createHash(algorithm).update(input).digest("hex"),
        };
      },
    }),
  };
});

const nativeCrypto = await vi.importActual<typeof crypto>("node:crypto");
const root = path.resolve(os.tmpdir(), "qfai-forbidden-unit");
const candidate = "SYNTHETIC_DENY";
const unsafe = `unsafe-${candidate}-exception`;
const MiB = 1024 * 1024;
const policy = (text = candidate) => ({
  sha256: nativeCrypto.createHash("sha256").update(text).digest("hex"),
  byteLength: Buffer.byteLength(text),
});
const entry = policy();

interface FileFixture {
  body: Buffer;
  size: number;
  kind?: "file" | "directory" | "symlink";
  nlink?: number;
  inspected?: Record<string, number>;
  opened?: Record<string, number>;
  after?: Record<string, number>;
  readBytes?: number;
  chunk?: number;
  unreadable?: boolean;
}
const files = new Map<string, FileFixture>();
const closes: ReturnType<typeof vi.fn>[] = [];
let listing: Buffer;

function metadata(file: FileFixture, changes: Record<string, number> = {}) {
  return {
    dev: 3,
    ino: 42,
    mode: 0o100644,
    nlink: file.nlink ?? 1,
    size: file.size,
    mtimeMs: 100,
    ctimeMs: 100,
    birthtimeMs: 50,
    ...changes,
    isFile: () => (file.kind ?? "file") === "file",
    isDirectory: () => file.kind === "directory",
    isSymbolicLink: () => file.kind === "symlink",
  };
}
function record(name: string, mode = "100644", stage = "0"): Buffer {
  return Buffer.from(`${mode} ${"a".repeat(40)} ${stage}\t${name}\0`, "utf8");
}
function tracked(
  name: string,
  body: string | Buffer = "",
  options: Partial<FileFixture> = {},
): void {
  const bytes = typeof body === "string" ? Buffer.from(body) : body;
  files.set(path.join(root, name), {
    body: bytes,
    size: bytes.length,
    ...options,
  });
  listing = Buffer.concat([listing, record(name)]);
}
function findings(issues: Issue[], code: string): void {
  expect(issues.some((issue) => issue.code === code && issue.severity === "error")).toBe(true);
  for (const issue of issues) {
    expect(issue.file).toBeUndefined();
    expect(issue.refs).toBeUndefined();
    expect(issue).not.toHaveProperty("relatedFiles");
    expect(issue).not.toHaveProperty("loc");
    expect(JSON.stringify(issue)).not.toContain(candidate);
    expect(JSON.stringify(issue)).not.toContain(entry.sha256);
    expect(JSON.stringify(issue)).not.toContain(unsafe);
    expect(JSON.stringify(issue)).not.toContain(root);
  }
}
const scan = (entries = [entry]) => validateForbiddenIdentifiers(root, entries);

beforeEach(() => {
  files.clear();
  closes.length = 0;
  listing = Buffer.alloc(0);
  hooks.fakeHash = false;
  hooks.hashes = 0;
  hooks.hashBytes = 0;
  hooks.seen = [];
  for (const mock of [hooks.git, hooks.lstat, hooks.realpath, hooks.open, hooks.readFile])
    mock.mockReset();
  hooks.git.mockImplementation((_command: string, args: string[]) =>
    Promise.resolve({
      stdout: args.includes("--show-toplevel") ? Buffer.from(`${root}\n`) : listing,
      stderr: Buffer.alloc(0),
    }),
  );
  hooks.realpath.mockImplementation((target: string) => Promise.resolve(path.resolve(target)));
  hooks.lstat.mockImplementation((target: string) =>
    Promise.resolve().then(() => {
      const file = files.get(target);
      if (file) return metadata(file, file.inspected);
      if (
        target === root ||
        [...files.keys()].some((name) => name.startsWith(`${target}${path.sep}`))
      ) {
        return metadata({ body: Buffer.alloc(0), size: 0, kind: "directory" });
      }
      throw new Error(unsafe);
    }),
  );
  hooks.open.mockImplementation((target: string) =>
    Promise.resolve().then(() => {
      const file = files.get(target);
      if (!file || file.unreadable) throw new Error(unsafe);
      let position = 0;
      let stats = 0;
      const close = vi.fn(() => Promise.resolve());
      closes.push(close);
      return {
        stat: () => Promise.resolve(metadata(file, stats++ === 0 ? file.opened : file.after)),
        read: (buffer: Buffer, offset: number, length: number) =>
          Promise.resolve().then(() => {
            const amount = Math.min(
              length,
              Math.max(0, (file.readBytes ?? file.size) - position),
              file.chunk ?? length,
            );
            buffer.fill(0, offset, offset + amount);
            if (amount > 0 && position < file.body.length) {
              file.body.copy(buffer, offset, position, position + amount);
            }
            position += amount;
            return { bytesRead: amount, buffer };
          }),
        close,
      };
    }),
  );
  hooks.readFile.mockResolvedValue(
    JSON.stringify({ validation: { forbiddenIdentifiers: [entry] } }),
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("forbidden-identifier configuration", () => {
  // QFAI:EX-0001-0232-01
  it("preserves absence and explicit empty policy", async () => {
    for (const validation of [{}, { forbiddenIdentifiers: [] }]) {
      hooks.readFile.mockResolvedValue(JSON.stringify({ validation }));
      const loaded = await loadConfig(root);
      expect(loaded.issues).toEqual([]);
      expect(loaded.config.validation.forbiddenIdentifiers).toEqual(
        "forbiddenIdentifiers" in validation ? [] : undefined,
      );
    }
  });
  // QFAI:EX-0001-0232-02
  // QFAI:EX-0001-0232-03
  it("retains 64 unique entries, eight lengths, and both inclusive length endpoints", async () => {
    const accepted = Array.from({ length: 64 }, (_, index) => ({
      sha256: policy(`synthetic-${index}`).sha256,
      byteLength: [1, 2, 3, 4, 5, 6, 7, 128][index % 8],
    }));
    hooks.readFile.mockResolvedValue(
      JSON.stringify({ validation: { forbiddenIdentifiers: accepted } }),
    );
    const loaded = await loadConfig(root);
    expect(loaded.issues).toEqual([]);
    expect(loaded.config.validation.forbiddenIdentifiers).toEqual(accepted);
    tracked("!", "a");
    findings(await scan([policy("a")]), "QFAI-SECURITY-001");
    files.clear();
    listing = Buffer.alloc(0);
    tracked("!", "a".repeat(128));
    findings(await scan([policy("a".repeat(128))]), "QFAI-SECURITY-001");
  });
  it("allows one digest at distinct lengths because only the whole pair must be unique", async () => {
    const accepted = [
      { ...entry, byteLength: 1 },
      { ...entry, byteLength: 128 },
    ];
    hooks.readFile.mockResolvedValue(
      JSON.stringify({ validation: { forbiddenIdentifiers: accepted } }),
    );
    const loaded = await loadConfig(root);
    expect(loaded.issues).toEqual([]);
    expect(loaded.config.validation.forbiddenIdentifiers).toEqual(accepted);
  });
  // QFAI:EX-0001-0232-04
  // QFAI:EX-0001-0232-05
  // QFAI:EX-0001-0232-06
  // QFAI:EX-0001-0232-07
  // QFAI:EX-0001-0232-08
  // QFAI:EX-0001-0232-09
  // QFAI:EX-0001-0232-10
  it("rejects each invalid shape without retaining a partial list or exposing unsafe keys", async () => {
    const unique = (count: number) =>
      Array.from({ length: count }, (_, index) => policy(`synthetic-${index}`));
    for (const setting of [
      null,
      entry,
      [null],
      [candidate],
      [{ sha256: entry.sha256 }],
      [{ byteLength: entry.byteLength }],
      [{ ...entry, [unsafe]: candidate }],
      [{ ...entry, plaintext: candidate }],
      ...[
        entry.sha256.slice(1),
        `${entry.sha256}0`,
        entry.sha256.toUpperCase(),
        "g".repeat(64),
      ].map((sha256) => [{ ...entry, sha256 }]),
      ...[0, 129, 1.5, "1", null].map((byteLength) => [{ ...entry, byteLength }]),
      [entry, entry],
      unique(65),
      unique(9).map((item, index) => ({ ...item, byteLength: index + 1 })),
    ]) {
      hooks.readFile.mockResolvedValue(
        JSON.stringify({ validation: { forbiddenIdentifiers: setting } }),
      );
      const loaded = await loadConfig(root);
      expect(loaded.config.validation.forbiddenIdentifiers).toBeUndefined();
      const errors = loaded.issues.filter((issue) => issue.code === "QFAI-CFG-002");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((issue) => issue.severity === "error")).toBe(true);
      for (const text of [candidate, entry.sha256, unsafe])
        expect(JSON.stringify(errors)).not.toContain(text);
    }
  });
  // QFAI:EX-0001-0232-11
  // QFAI:EX-0001-0232-12
  it("keeps parse and read failures generic", async () => {
    hooks.readFile.mockResolvedValue(`validation: [\n${unsafe}\n`);
    const malformed = (await loadConfig(root)).issues;
    hooks.readFile.mockRejectedValue(new Error(unsafe));
    const unreadable = (await loadConfig(root)).issues;
    for (const issues of [malformed, unreadable]) {
      expect(
        issues.some((issue) => issue.code === "QFAI-CFG-002" && issue.severity === "error"),
      ).toBe(true);
      expect(JSON.stringify(issues)).not.toContain(unsafe);
      expect(JSON.stringify(issues)).not.toContain(candidate);
    }
  });
});

describe("ASCII windows and private findings", () => {
  // QFAI:EX-0001-0232-01
  it("does not touch Git, filesystem or hashes when disabled", async () => {
    expect(await validateForbiddenIdentifiers(root)).toEqual([]);
    expect(await scan([])).toEqual([]);
    for (const mock of [hooks.git, hooks.lstat, hooks.realpath, hooks.open])
      expect(mock).not.toHaveBeenCalled();
    expect(hooks.hashes).toBe(0);
  });
  // QFAI:EX-0001-0232-13
  it("finds start, middle and end windows even when descriptor reads split the candidate", async () => {
    for (const body of [`${candidate}suffix`, `prefix${candidate}suffix`, `prefix${candidate}`]) {
      files.clear();
      listing = Buffer.alloc(0);
      tracked("!", body, { chunk: 3 });
      findings(await scan(), "QFAI-SECURITY-001");
    }
  });
  // QFAI:EX-0001-0232-13
  it("includes letters, digits, underscore and hyphen in one matching ASCII span", async () => {
    tracked("!", "prefixA-z_09suffix", { chunk: 2 });
    findings(await scan([policy("A-z_09")]), "QFAI-SECURITY-001");
  });
  // QFAI:EX-0001-0232-14
  // QFAI:EX-0001-0232-15
  // QFAI:EX-0001-0232-37
  it("never crosses non-ASCII, punctuation, NUL or line-break boundaries", async () => {
    for (const body of [
      candidate.toLowerCase(),
      ...["\u00e9", ".", "\0", "\n"].map((separator) => `SYNTHETIC${separator}_DENY`),
    ]) {
      files.clear();
      listing = Buffer.alloc(0);
      tracked("!", body);
      expect(await scan()).toEqual([]);
    }
    files.clear();
    listing = Buffer.alloc(0);
    tracked("!", "synthetic-\u00e9");
    expect(await scan([policy("synthetic-\u00e9")])).toEqual([]);
  });
  // QFAI:EX-0001-0232-16
  it("hashes every window once per distinct length, independently of policy entry count", async () => {
    tracked("!", "ABC");
    const entries = [policy("AB"), policy("BC"), policy("ZZ"), policy("ABC")];
    findings(await scan(entries), "QFAI-SECURITY-001");
    expect(hooks.hashes).toBe(3);
    expect(hooks.hashBytes).toBe(7);
    expect(hooks.seen.slice().sort()).toEqual(["AB", "ABC", "BC"]);
  });
  // QFAI:EX-0001-0232-19
  // QFAI:EX-0001-0232-22
  it("preserves a newline-containing tracked name without echoing it", async () => {
    const name = `space\n${candidate}.txt`;
    tracked(name);
    const issues = await scan();
    findings(issues, "QFAI-SECURITY-001");
    expect(hooks.open).toHaveBeenCalledWith(path.join(root, name), expect.anything());
    expect(JSON.stringify(issues)).not.toContain(name);
  });
  // QFAI:EX-0001-0232-21
  // QFAI:EX-0001-0232-38
  it("keeps scanner issues private through the normal text, JSON and fail-on contract", async () => {
    tracked("safe.txt", candidate);
    const matched = await scan();
    findings(matched, "QFAI-SECURITY-001");
    files.clear();
    listing = record("missing.txt");
    const incomplete = await scan();
    findings(incomplete, "QFAI-SECURITY-002");
    for (const issues of [matched, incomplete]) {
      const result: ValidationResult = {
        toolVersion: "fixture",
        issues,
        counts: countIssues(issues),
      };
      expect(result.counts).toEqual({
        error: issues.length,
        warning: 0,
        info: 0,
      });
      expect(shouldFail(result, "error")).toBe(true);
      expect(shouldFail(result, "warning")).toBe(true);
      expect(shouldFail(result, "never")).toBe(false);
      const output = await captureStdout(() =>
        Promise.resolve().then(() => emitText(result, "error")),
      );
      for (const text of [candidate, entry.sha256, root, unsafe]) {
        expect(output).not.toContain(text);
        expect(JSON.stringify(result)).not.toContain(text);
      }
    }
  });
});

describe("incomplete coverage fails closed", () => {
  // QFAI:EX-0001-0232-23
  it("keeps missing Git, stderr and wrong-worktree errors generic", async () => {
    for (const failure of [
      () => Promise.reject(new Error(unsafe)),
      () =>
        Promise.resolve({
          stdout: Buffer.from(`${root}\n`),
          stderr: Buffer.from(unsafe),
        }),
      () =>
        Promise.resolve({
          stdout: Buffer.from(`${path.dirname(root)}\n`),
          stderr: Buffer.alloc(0),
        }),
    ]) {
      hooks.git.mockImplementation(failure);
      findings(await scan(), "QFAI-SECURITY-002");
      expect(hooks.open).not.toHaveBeenCalled();
    }
  });
  // QFAI:EX-0001-0232-23
  it("fails generic coverage when listing itself fails after worktree confirmation", async () => {
    hooks.git.mockImplementation((_command: string, args: string[]) => {
      if (args.includes("ls-files")) return Promise.reject(new Error(unsafe));
      return Promise.resolve({ stdout: Buffer.from(`${root}\n`), stderr: Buffer.alloc(0) });
    });
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.open).not.toHaveBeenCalled();
  });
  // QFAI:EX-0001-0232-23
  it("uses bounded NUL-framed listing with inherited Git overrides removed", async () => {
    vi.stubEnv("GIT_DIR", unsafe);
    vi.stubEnv("GIT_WORK_TREE", unsafe);
    expect(await scan()).toEqual([]);
    const call = hooks.git.mock.calls.find(
      (args) => Array.isArray(args[1]) && args[1].includes("ls-files"),
    );
    expect(call).toBeDefined();
    if (!call) throw new Error("Missing Git listing call");
    expect(call[1]).toEqual(expect.arrayContaining(["--cached", "--stage", "-z"]));
    expect(call[2]).toEqual(expect.objectContaining({ encoding: "buffer", maxBuffer: 64 * MiB }));
    const options = call[2] as { env: Record<string, string> };
    expect(Object.keys(options.env).some((key) => key.toUpperCase().startsWith("GIT_"))).toBe(
      false,
    );
  });
  // QFAI:EX-0001-0232-23
  it("rejects a root that is a symlink without invoking Git", async () => {
    hooks.lstat.mockResolvedValue(metadata({ body: Buffer.alloc(0), size: 0, kind: "symlink" }));
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.git).not.toHaveBeenCalled();
    expect(hooks.open).not.toHaveBeenCalled();
  });
  // QFAI:EX-0001-0232-23
  // QFAI:EX-0001-0232-24
  it("rejects truncated, malformed, non-UTF8 and duplicate listing records", async () => {
    const valid = record("safe.txt");
    for (const input of [
      valid.subarray(0, valid.length - 1),
      Buffer.from("not-a-stage-record\0"),
      Buffer.concat([Buffer.from(`100644 ${"a".repeat(40)} 0\t`), Buffer.from([0xff, 0])]),
      Buffer.concat([record("safe.txt"), record("safe.txt")]),
    ]) {
      listing = input;
      hooks.open.mockClear();
      const duplicate = input.equals(Buffer.concat([valid, valid]));
      if (duplicate) {
        tracked("safe.txt");
        listing = input;
      }
      findings(await scan(), "QFAI-SECURITY-002");
      expect(hooks.open).toHaveBeenCalledTimes(duplicate ? 1 : 0);
      files.clear();
    }
  });
  // QFAI:EX-0001-0232-24
  it("rejects absolute and traversal paths before touching an outside file", async () => {
    for (const name of [
      "../outside.txt",
      "nested/../../outside.txt",
      "/outside.txt",
      "C:/outside.txt",
      "nested//file",
      "nested/./file",
    ]) {
      listing = record(name);
      findings(await scan(), "QFAI-SECURITY-002");
      expect(hooks.open).not.toHaveBeenCalled();
    }
  });
  // QFAI:EX-0001-0232-25
  it("refuses symbolic-link parents and leaves without opening their targets", async () => {
    tracked("parent/file.txt");
    files.set(path.join(root, "parent"), {
      body: Buffer.alloc(0),
      size: 0,
      kind: "symlink",
    });
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.open).not.toHaveBeenCalled();
    files.clear();
    listing = Buffer.alloc(0);
    tracked("leaf.txt", "", { kind: "symlink" });
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.open).not.toHaveBeenCalled();
  });
  // QFAI:EX-0001-0232-26
  it("refuses hardlinks, gitlinks, nonregular entries and unresolved index stages", async () => {
    for (const options of [{ nlink: 2 }, { kind: "directory" as const }]) {
      files.clear();
      listing = Buffer.alloc(0);
      tracked("unsafe.txt", "", options);
      findings(await scan(), "QFAI-SECURITY-002");
      expect(hooks.open).not.toHaveBeenCalled();
    }
    for (const [mode, stage] of [
      ["160000", "0"],
      ["120000", "0"],
      ["100644", "1"],
      ["100644", "2"],
      ["100644", "3"],
    ]) {
      listing = record("unsafe.txt", mode, stage);
      findings(await scan(), "QFAI-SECURITY-002");
      expect(hooks.open).not.toHaveBeenCalled();
    }
  });
  // QFAI:EX-0001-0232-27
  it("reports missing and unreadable files without echoing their path or exception", async () => {
    listing = record(unsafe);
    findings(await scan(), "QFAI-SECURITY-002");
    files.clear();
    listing = Buffer.alloc(0);
    tracked(unsafe, "", { unreadable: true });
    findings(await scan(), "QFAI-SECURITY-002");
  });
  // QFAI:EX-0001-0232-28
  it("refuses descriptor identity and metadata changes before reading and still closes it", async () => {
    for (const changed of [
      { dev: 4 },
      { ino: 43 },
      { size: 2 },
      { mode: 0o100600 },
      { nlink: 2 },
      { mtimeMs: 101 },
      { ctimeMs: 101 },
      { birthtimeMs: 51 },
    ]) {
      files.clear();
      listing = Buffer.alloc(0);
      tracked("!", "a", { opened: changed });
      findings(await scan(), "QFAI-SECURITY-002");
      expect(closes.at(-1)).toHaveBeenCalledTimes(1);
    }
  });
  // QFAI:EX-0001-0232-28
  it("rejects post-read metadata changes and short or oversized reads", async () => {
    for (const options of [
      { after: { ino: 43 } },
      { after: { size: 2 } },
      { after: { mtimeMs: 101 } },
      { after: { ctimeMs: 101 } },
      { after: { mode: 0o100600 } },
      { readBytes: 0 },
      { readBytes: 2 },
    ]) {
      files.clear();
      listing = Buffer.alloc(0);
      tracked("!", "a", options);
      findings(await scan(), "QFAI-SECURITY-002");
      expect(closes.at(-1)).toHaveBeenCalledTimes(1);
    }
  });
  // QFAI:EX-0001-0232-28
  it("refuses an inconsistent bytesRead response and awaits descriptor cleanup", async () => {
    tracked("!", "a");
    for (const bytesRead of [-1, 1.5, 3]) {
      const close = vi.fn(() => Promise.resolve());
      const file = files.get(path.join(root, "!"));
      if (!file) throw new Error("Missing fixture");
      hooks.open.mockResolvedValue({
        stat: () => Promise.resolve(metadata(file)),
        read: () => Promise.resolve({ bytesRead }),
        close,
      });
      findings(await scan(), "QFAI-SECURITY-002");
      expect(close).toHaveBeenCalledTimes(1);
    }
  });
  // QFAI:EX-0001-0232-27
  // QFAI:EX-0001-0232-28
  it("keeps descriptor stat, read and close errors generic and attempts cleanup", async () => {
    tracked("!", "a");
    const file = files.get(path.join(root, "!"));
    if (!file) throw new Error("Missing fixture");
    for (const failure of ["stat", "read", "close"]) {
      let read = false;
      const close = vi.fn(() =>
        failure === "close" ? Promise.reject(new Error(unsafe)) : Promise.resolve(),
      );
      hooks.open.mockResolvedValue({
        stat: () => {
          if (failure === "stat") return Promise.reject(new Error(unsafe));
          return Promise.resolve(metadata(file));
        },
        read: (buffer: Buffer) =>
          Promise.resolve().then(() => {
            if (failure === "read") throw new Error(unsafe);
            if (read) return { bytesRead: 0 };
            read = true;
            buffer[0] = 97;
            return { bytesRead: 1 };
          }),
        close,
      });
      findings(await scan(), "QFAI-SECURITY-002");
      expect(close).toHaveBeenCalledTimes(1);
    }
  });
  // QFAI:EX-0001-0232-28
  it("detects a parent identity change after opening without claiming an atomic snapshot", async () => {
    tracked("parent/file.txt", "safe");
    const original = hooks.lstat.getMockImplementation();
    if (!original) throw new Error("Missing lstat fixture");
    let calls = 0;
    hooks.lstat.mockImplementation(async (target: string) => {
      const value = await original(target);
      return target === path.join(root, "parent") && ++calls > 1 ? { ...value, ino: 43 } : value;
    });
    findings(await scan(), "QFAI-SECURITY-002");
    expect(closes.at(-1)).toHaveBeenCalledTimes(1);
  });
  // QFAI:EX-0001-0232-21
  // QFAI:EX-0001-0232-27
  it("retains an observed match when a later tracked file cannot be covered", async () => {
    tracked("!", candidate);
    listing = Buffer.concat([listing, record("missing.txt")]);
    const issues = await scan();
    findings(issues, "QFAI-SECURITY-001");
    findings(issues, "QFAI-SECURITY-002");
  });
});

describe("inclusive capacity ceilings", () => {
  // Resource cases generate NUL reads and use a counter-only hash stub: no million-call spy history.
  // QFAI:EX-0001-0232-29
  it("allows exactly sixteen MiB per file and rejects one extra byte before opening", async () => {
    tracked("!", "", { size: 16 * MiB });
    expect(await scan()).toEqual([]);
    expect(closes.at(-1)).toHaveBeenCalledTimes(1);
    files.clear();
    listing = Buffer.alloc(0);
    hooks.open.mockClear();
    tracked("!", "", { size: 16 * MiB + 1 });
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.open).not.toHaveBeenCalled();
  });
  // QFAI:EX-0001-0232-30
  it("charges raw names and contents once at the inclusive sixty-four MiB tree limit", async () => {
    const names = ["!", "!!", "\u00e9!", "!!!!"];
    const nameBytes = names.reduce((total, name) => total + Buffer.byteLength(name), 0);
    for (const extra of [0, 1]) {
      files.clear();
      listing = Buffer.alloc(0);
      names.forEach((name, index) =>
        tracked(name, "", {
          size: 16 * MiB - (index === 3 ? nameBytes : 0) + (index === 3 ? extra : 0),
        }),
      );
      const issues = await scan([entry, policy("xx")]);
      if (extra === 0) expect(issues).toEqual([]);
      else findings(issues, "QFAI-SECURITY-002");
    }
  });
  // QFAI:EX-0001-0232-31
  it("allows one million windows and rejects the next without hashing it", async () => {
    hooks.fakeHash = true;
    for (const extra of [0, 1]) {
      files.clear();
      listing = Buffer.alloc(0);
      hooks.hashes = 0;
      tracked("A", Buffer.alloc(500_000 + extra, 97));
      const issues = await scan([policy("a"), policy("b"), policy("aa"), policy("bb")]);
      expect(hooks.hashes).toBe(1_000_000);
      if (extra === 0) expect(issues).toEqual([]);
      else findings(issues, "QFAI-SECURITY-002");
    }
  });
  // QFAI:EX-0001-0232-32
  it("allows sixty-four MiB of hash input and rejects the next window before hashing", async () => {
    hooks.fakeHash = true;
    const windows = (64 * MiB) / 128;
    for (const extra of [0, 1]) {
      files.clear();
      listing = Buffer.alloc(0);
      hooks.hashes = 0;
      hooks.hashBytes = 0;
      tracked("a".repeat(128), Buffer.alloc(windows + 126 + extra, 97));
      const issues = await scan([policy("a".repeat(128)), policy("b".repeat(128))]);
      expect(hooks.hashes).toBe(windows);
      expect(hooks.hashBytes).toBe(64 * MiB);
      if (extra === 0) expect(issues).toEqual([]);
      else findings(issues, "QFAI-SECURITY-002");
    }
  });
  // QFAI:EX-0001-0232-32
  it("shares the hash-input ceiling across distinct window lengths", async () => {
    hooks.fakeHash = true;
    const span = (64 * MiB + 64 * 63 + 128 * 127) / (64 + 128);
    for (const extra of [0, 1]) {
      files.clear();
      listing = Buffer.alloc(0);
      hooks.hashes = 0;
      hooks.hashBytes = 0;
      tracked("!", Buffer.alloc(span + extra, 97));
      const issues = await scan([policy("a".repeat(64)), policy("a".repeat(128))]);
      expect(hooks.hashBytes).toBe(64 * MiB);
      expect(hooks.hashes).toBe(span - 63 + span - 127);
      if (extra === 0) expect(issues).toEqual([]);
      else findings(issues, "QFAI-SECURITY-002");
    }
  });
  // QFAI:EX-0001-0232-31
  // QFAI:EX-0001-0232-32
  it("counts name and content windows once per distinct length rather than per digest", async () => {
    tracked("AAA", "BBB");
    hooks.fakeHash = true;
    expect(await scan([policy("AA"), policy("BB"), policy("ZZ"), policy("AAA")])).toEqual([]);
    expect(hooks.hashes).toBe(6);
    expect(hooks.hashBytes).toBe(14);
  });
  // QFAI:EX-0001-0232-33
  it("accepts exactly sixty-four MiB of framed listing and refuses a larger listing before opening", async () => {
    const name = " ".repeat(64 * MiB - record("").length);
    tracked(name);
    expect(listing.length).toBe(64 * MiB);
    expect(await scan()).toEqual([]);
    expect(closes.at(-1)).toHaveBeenCalledTimes(1);
    files.clear();
    hooks.open.mockClear();
    listing = Buffer.alloc(64 * MiB + 1);
    findings(await scan(), "QFAI-SECURITY-002");
    expect(hooks.open).not.toHaveBeenCalled();
  });
});

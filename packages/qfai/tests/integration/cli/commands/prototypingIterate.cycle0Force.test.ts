/**
 * `iterate --cycle 0 --force` destructive-rerun backup
 * (spec-0012 Phase 3 / REQ-0012-0067).
 *
 * Asserts:
 *   (a) Without `--force`: an existing iter-00 dir triggers exit 2
 *       with a recovery hint that names `--force` + the offending
 *       path.
 *   (b) With `--force`: iter-00 is RENAMED to
 *       `iter-00.backup-<ISO>` BEFORE clearEvidenceIterDirs runs;
 *       backup byte-equivalence is preserved.
 *   (c) The aggregate capture mirrors are moved aside on every cycle-0
 *       run, logged file by file, and put back when a later step of the
 *       same reset fails (REQ-0174).
 */

// QFAI:EX-0001-0140-01
// QFAI:EX-0001-0140-02

import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// The module is mocked below, and its TYPE comes from a namespace import:
// `consistent-type-imports` forbids the inline form.
import type * as FsPromises from "node:fs/promises";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

/**
 * Paths the file system refuses, in ways no test directory can be made to
 * refuse on every platform: a directory `readdir` cannot list, a file `stat`
 * cannot size, and a path `rename` cannot move.
 */
const fault = vi.hoisted(
  (): {
    unlistable: string | null;
    unstatable: string | null;
    unrenamable: string | null;
    unremovable: string | null;
    afterRename: ((from: string) => Promise<void>) | null;
  } => ({
    unlistable: null,
    unstatable: null,
    unrenamable: null,
    unremovable: null,
    afterRename: null,
  }),
);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  const refused = (target: string | null, candidate: unknown): boolean =>
    target !== null && path.resolve(String(candidate)) === target;
  return {
    ...actual,
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      if (refused(fault.unlistable, args[0])) {
        throw Object.assign(new Error("EACCES: permission denied, scandir"), { code: "EACCES" });
      }
      return actual.readdir(...args);
    },
    stat: async (...args: Parameters<typeof actual.stat>) => {
      if (refused(fault.unstatable, args[0])) {
        throw Object.assign(new Error("EACCES: permission denied, stat"), { code: "EACCES" });
      }
      return actual.stat(...args);
    },
    lstat: async (...args: Parameters<typeof actual.lstat>) => {
      if (refused(fault.unstatable, args[0])) {
        throw Object.assign(new Error("EACCES: permission denied, lstat"), { code: "EACCES" });
      }
      return actual.lstat(...args);
    },
    rm: async (...args: Parameters<typeof actual.rm>) => {
      if (refused(fault.unremovable, args[0])) {
        throw Object.assign(new Error("EBUSY: resource busy or locked, rm"), { code: "EBUSY" });
      }
      return actual.rm(...args);
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (refused(fault.unrenamable, args[0])) {
        throw Object.assign(new Error("EBUSY: resource busy or locked, rename"), {
          code: "EBUSY",
        });
      }
      const renamed = await actual.rename(...args);
      // What another process writing into the evidence root does between the
      // rename and the next read.
      await fault.afterRename?.(path.resolve(String(args[0])));
      return renamed;
    },
  };
});

const CERT_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand",
  "",
  "Calm.",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cycle0-force-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  fault.unlistable = null;
  fault.unstatable = null;
  fault.unrenamable = null;
  fault.unremovable = null;
  fault.afterRename = null;
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedProject(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), CERT_DESIGN_MD, "utf-8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

async function seedExistingIter00(root: string, contents: string): Promise<string> {
  const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
  await mkdir(iter00, { recursive: true });
  const markerPath = path.join(iter00, "prior-loop.marker");
  await writeFile(markerPath, contents, "utf-8");
  return markerPath;
}

function captureStdout(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

function captureStderr(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

describe("iterate --cycle 0 destructive-rerun gate", () => {
  it("refuses without --force when iter-00 already exists (exit 2 + recovery hint)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const stderr = captureStderr();
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
    const joined = stderr.join("");
    expect(joined).toMatch(/--force/);
    expect(joined).toMatch(/iter-00/);
  });

  it("backs up iter-00 to iter-00.backup-<ISO> with --force; backup is byte-equivalent", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const PRIOR_CONTENT = "byte-equivalent marker for the prior loop seed";
    await seedExistingIter00(root, PRIOR_CONTENT);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });
    expect(exit).toBe(0);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    const entries = await readdir(evidenceRoot);
    const backup = entries.find((e) => e.startsWith("iter-00.backup-"));
    expect(backup).toBeDefined();
    const backedUp = await readFile(
      path.join(evidenceRoot, backup as string, "prior-loop.marker"),
      "utf-8",
    );
    expect(backedUp).toBe(PRIOR_CONTENT);
    // The new iter-00 must also exist (cycle 0 re-seeded).
    expect(entries).toContain("iter-00");
  });

  it("backs up an iter-00 that is a regular file", async () => {
    // The rename takes the entry whole whatever it is. Walked as a directory
    // it raised ENOTDIR, and the reset stopped before the rename it had just
    // told the operator to run.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    const iter00 = path.join(evidenceRoot, "iter-00");
    await writeFile(iter00, "not a directory\n", "utf-8");
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      force: true,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(0);
    const backup = (await readdir(evidenceRoot)).find((entry) =>
      entry.startsWith("iter-00.backup-"),
    );
    expect(backup).toBeDefined();
    expect(await readFile(path.join(evidenceRoot, backup ?? ""), "utf-8")).toBe(
      "not a directory\n",
    );
  });

  it("moves aside an iter-00 link whose target is gone", async () => {
    // Read through the link, the entry is absent, the reset moves the aggregates
    // and then fails to create iter-00 over the link still sitting there. The
    // entry is what the reset moves, so the entry is what it reads.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    const gone = path.join(root, "gone-seed");
    await mkdir(gone, { recursive: true });
    try {
      await symlink(gone, path.join(evidenceRoot, "iter-00"), "junction");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    await rm(gone, { recursive: true, force: true });
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(0);
    const entries = await readdir(evidenceRoot);
    expect(entries.find((entry) => entry.startsWith("iter-00.backup-"))).toBeDefined();
    expect(entries).toContain("iter-00");
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8");
    expect(log).toContain('"path":".qfai/evidence/prototyping/iter-00"');
  });

  it("refuses without --force when iter-00 is a link whose target is gone", async () => {
    // The link is what a re-seed would overwrite, so it is what the gate reads.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    const gone = path.join(root, "gone-seed");
    await mkdir(gone, { recursive: true });
    try {
      await symlink(gone, path.join(evidenceRoot, "iter-00"), "junction");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    await rm(gone, { recursive: true, force: true });
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(stderr.join("")).toMatch(/--force/);
  });

  it("moves the captures a prior loop mirrored aside, with or without an iter-00 to back up", async () => {
    // The required-path check reads the aggregate directories first, so a
    // restarted loop left them passing it on the previous loop's captures.
    for (const force of [true, false]) {
      const root = await newTempDir();
      await seedProject(root);
      if (force) await seedExistingIter00(root, "prior loop seed");
      const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
      const captures = [
        { dir: "screenshots", file: "home.png" },
        { dir: "html", file: "home.html" },
      ];
      for (const { dir, file } of captures) {
        await mkdir(path.join(evidenceRoot, dir), { recursive: true });
        await writeFile(path.join(evidenceRoot, dir, file), `prior ${file}`, "utf-8");
      }

      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        force,
      });

      expect(exit).toBe(0);
      const entries = await readdir(evidenceRoot);
      expect(entries).not.toContain("screenshots");
      expect(entries).not.toContain("html");
      const backup = entries.find((entry) => entry.startsWith("aggregate.backup-"));
      expect(backup).toBeDefined();
      for (const { dir, file } of captures) {
        const moved = await readFile(path.join(evidenceRoot, backup ?? "", dir, file), "utf-8");
        expect(moved).toBe(`prior ${file}`);
      }
      if (force) {
        // One reset, one stamp.
        expect(entries).toContain(
          `iter-00.backup-${(backup ?? "").slice("aggregate.backup-".length)}`,
        );
      }
      const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8");
      expect(log).toContain(".qfai/evidence/prototyping/screenshots/home.png");
      expect(log).toContain(".qfai/evidence/prototyping/html/home.html");
    }
  });

  it("logs a link inside an aggregate directory it moves", async () => {
    // The link moves with its directory, so the log names it as it names a file.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    const outside = path.join(root, "outside.png");
    await writeFile(outside, "shared capture", "utf-8");
    try {
      await symlink(outside, path.join(evidenceRoot, "screenshots", "linked.png"));
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(0);
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8");
    expect(log).toContain(".qfai/evidence/prototyping/screenshots/linked.png");
  });

  it("logs an aggregate directory that is a link as the one entry it moves", async () => {
    // The move takes the link and leaves what it points at, so the log names the
    // link rather than files that stay where they are.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    const shared = path.join(root, "shared-captures");
    await mkdir(shared, { recursive: true });
    await writeFile(path.join(shared, "home.png"), "shared capture", "utf-8");
    await mkdir(evidenceRoot, { recursive: true });
    try {
      await symlink(shared, path.join(evidenceRoot, "screenshots"), "junction");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(0);
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8");
    expect(log).toContain('"path":".qfai/evidence/prototyping/screenshots"');
    expect(log).not.toContain("screenshots/home.png");
    expect(await readFile(path.join(shared, "home.png"), "utf-8")).toBe("shared capture");
  });

  it("moves aside an aggregate link whose target is gone", async () => {
    // Left in place, the link would expose the previous loop's captures again as
    // soon as its target came back.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    const gone = path.join(root, "gone-captures");
    await mkdir(gone, { recursive: true });
    try {
      await symlink(gone, path.join(evidenceRoot, "html"), "junction");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    await rm(gone, { recursive: true, force: true });
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(0);
    const entries = await readdir(evidenceRoot);
    expect(entries).not.toContain("html");
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8");
    expect(log).toContain('"path":".qfai/evidence/prototyping/html"');
  });

  it("takes the move entries back when the reset is undone", async () => {
    // A `move` line for a file that is back where it started claims a mutation
    // the tree does not hold.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    // Empty, so the clear logs no deletion of its own before it fails: entries
    // for files it did remove are true and stay, and the move entries are the
    // only ones this undo may take back.
    const stale = path.join(evidenceRoot, "iter-01");
    await mkdir(stale, { recursive: true });
    fault.unremovable = stale;
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    const log = path.join(evidenceRoot, "mutation-log.jsonl");
    const held = await readFile(log, "utf-8").catch(() => "");
    expect(held).not.toContain("screenshots/home.png");
  });

  it("refuses when a capture puts an aggregate directory back during the reset", async () => {
    // A reset that ends with the previous loop's mirror in place did nothing,
    // and the required-path check would read that capture as this loop's.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    // What a capture still running does: the directory is back the moment the
    // rename returns.
    fault.afterRename = async (from: string) => {
      if (from.endsWith("screenshots")) await mkdir(from, { recursive: true });
    };
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(stderr.join("")).toContain("came back while the reset ran");
  });

  it("refuses when a capture creates an aggregate directory this run found none to move", async () => {
    // The evidence root held no mirror when the reset started, so nothing was
    // moved aside. An overlapping capture creating one afterwards leaves the
    // canonical path holding the other run's evidence, which the required-path
    // check would read as this loop's.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "iter-00"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "iter-00", "old.review.json"), "{}", "utf-8");
    // What a capture still running does, once the only rename of this reset has
    // returned: the mirror appears at the canonical path.
    fault.afterRename = async (from: string) => {
      if (from.endsWith("iter-00")) await mkdir(path.join(evidenceRoot, "screenshots"));
    };
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      force: true,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(stderr.join("")).toContain("came back while the reset ran");
    // And the backup went home, so the reset left the tree as it found it.
    expect(await readdir(path.join(evidenceRoot, "iter-00"))).toContain("old.review.json");
  });

  it("puts the moves back when the evidence root cannot be re-read after them", async () => {
    // The check that reads the root once more can fail for a reason that is not
    // an absent directory. Thrown past the reset it left the moves made and
    // logged, with the previous loop's captures in a backup nothing would move
    // home.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    // Refused only once the move has been made, so the check is what meets it.
    fault.afterRename = async (from: string) => {
      if (from.endsWith("screenshots")) fault.unstatable = path.join(evidenceRoot, "screenshots");
    };
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(stderr.join("")).toContain("could not re-read the evidence root");
    fault.unstatable = null;
    expect(await readdir(path.join(evidenceRoot, "screenshots"))).toEqual(["home.png"]);
  });

  it("names the iteration directories it had already removed", async () => {
    // The reset puts its own moves back, and nothing puts a removal back, so a
    // clear that stopped part-way leaves a tree the message has to describe.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    for (const name of ["iter-01", "iter-02"]) {
      await mkdir(path.join(evidenceRoot, name), { recursive: true });
      await writeFile(path.join(evidenceRoot, name, "old.review.json"), "{}", "utf-8");
    }
    fault.unremovable = path.join(evidenceRoot, "iter-02");
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(stderr.join("")).toContain("iter-01 was removed before this failed");
  });

  it("puts back what the reset moved when clearing the iteration directories fails", async () => {
    // The moves stand until the whole reset does. A run that stopped here left
    // the previous loop's captures in a backup directory nothing would move
    // back, and the next run read a tree neither loop had written.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    const stale = path.join(evidenceRoot, "iter-01");
    await mkdir(stale, { recursive: true });
    await writeFile(path.join(stale, "old.review.json"), "{}", "utf-8");
    fault.unremovable = stale;
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior",
    );
    expect(
      (await readdir(evidenceRoot)).find((entry) => entry.startsWith("aggregate.backup-")),
    ).toBeUndefined();
  });

  it("keeps the deletion records a partly cleared directory wrote, and answers the moves", async () => {
    // Clearing records each removal before it makes it, so those records follow
    // the reset's move batch in the log. Cutting back to before the batch would
    // take them with it, and leaving the batch alone would claim moves the
    // rollback has already put back.
    const root = await newTempDir();
    await seedProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior", "utf-8");
    const stale = path.join(evidenceRoot, "iter-01");
    await mkdir(stale, { recursive: true });
    await writeFile(path.join(stale, "old.review.json"), "{}", "utf-8");
    fault.unremovable = stale;
    captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });

    expect(exit).toBe(2);
    const entries = (
      await readFile(path.join(root, ".qfai/evidence/prototyping/mutation-log.jsonl"), "utf-8")
    )
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as { path: string; action: string });
    // The removal it recorded is still there.
    expect(entries.some((entry) => entry.action === "delete")).toBe(true);
    // And the move is answered by the backup path leaving, which is what
    // putting the capture back did.
    expect(
      entries.some((entry) => entry.action === "move" && entry.path.includes("aggregate.backup-")),
    ).toBe(true);
  });

  it("puts back what the reset moved when a later move fails", async () => {
    // A failed reset that left `screenshots/` moved and `html/` in place would
    // hold half a loop's evidence in each place.
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    for (const { dir, file } of [
      { dir: "screenshots", file: "home.png" },
      { dir: "html", file: "home.html" },
    ]) {
      await mkdir(path.join(evidenceRoot, dir), { recursive: true });
      await writeFile(path.join(evidenceRoot, dir, file), `prior ${file}`, "utf-8");
    }
    // `screenshots/` moves first, and `html/` cannot be moved.
    fault.unrenamable = path.join(evidenceRoot, "html");
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior home.png",
    );
    expect(await readFile(path.join(evidenceRoot, "html", "home.html"), "utf-8")).toBe(
      "prior home.html",
    );
    expect(await readFile(path.join(evidenceRoot, "iter-00", "prior-loop.marker"), "utf-8")).toBe(
      "prior loop seed",
    );
    expect(stderr.join("")).toContain("back in place");
    const entries = await readdir(evidenceRoot);
    expect(entries.filter((entry) => entry.includes(".backup-"))).toEqual([]);
    // Nothing claims a move the reset put back.
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8").catch(
      () => "",
    );
    expect(log).not.toContain("screenshots/home.png");
  });

  it("refuses a backup directory another reset left at the same name", async () => {
    // Moved into it, the backup would hold two resets' evidence as one.
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior capture", "utf-8");
    const FIXED_ISO = "2026-01-01T00:00:00.000Z";
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(FIXED_ISO);
    const older = path.join(evidenceRoot, `aggregate.backup-${FIXED_ISO.replace(/[:.]/g, "-")}`);
    await mkdir(older, { recursive: true });
    await writeFile(path.join(older, "older-reset.marker"), "older", "utf-8");
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior capture",
    );
    expect(await readdir(older)).toEqual(["older-reset.marker"]);
    expect(await readFile(path.join(evidenceRoot, "iter-00", "prior-loop.marker"), "utf-8")).toBe(
      "prior loop seed",
    );
    expect(stderr.join("")).toContain("aggregate.backup-");
  });

  it("moves nothing when a file the reset would move cannot be sized for the log", async () => {
    // Moved anyway, the log would record a size the file never had.
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    const capture = path.join(evidenceRoot, "screenshots", "home.png");
    await writeFile(capture, "prior capture", "utf-8");
    fault.unstatable = capture;
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(capture, "utf-8")).toBe("prior capture");
    expect(await readFile(path.join(evidenceRoot, "iter-00", "prior-loop.marker"), "utf-8")).toBe(
      "prior loop seed",
    );
    const entries = await readdir(evidenceRoot);
    expect(entries.filter((entry) => entry.includes(".backup-"))).toEqual([]);
    expect(stderr.join("")).toContain("screenshots");
  });

  it("moves nothing when a tree the reset would move cannot be listed for the log", async () => {
    // Moved anyway, its files would be missing from the mutation log the reset
    // promises to write them to.
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    const nested = path.join(evidenceRoot, "screenshots", "nested");
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior capture", "utf-8");
    fault.unlistable = nested;
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior capture",
    );
    expect(await readFile(path.join(evidenceRoot, "iter-00", "prior-loop.marker"), "utf-8")).toBe(
      "prior loop seed",
    );
    const entries = await readdir(evidenceRoot);
    expect(entries.filter((entry) => entry.includes(".backup-"))).toEqual([]);
    expect(stderr.join("")).toContain("screenshots");
  });

  it("puts every move back when the mutation log cannot be written", async () => {
    // A reset that stood with its moves unlogged would break the log's promise
    // that each moved file is in it.
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior capture", "utf-8");
    // A directory where the log file goes refuses the append.
    await mkdir(path.join(evidenceRoot, "mutation-log.jsonl"), { recursive: true });
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior capture",
    );
    expect(await readFile(path.join(evidenceRoot, "iter-00", "prior-loop.marker"), "utf-8")).toBe(
      "prior loop seed",
    );
    const entries = await readdir(evidenceRoot);
    expect(entries.filter((entry) => entry.includes(".backup-"))).toEqual([]);
    expect(stderr.join("")).toContain("back in place");
  });

  it("puts the aggregate directories back when the iter-00 backup fails", async () => {
    const root = await newTempDir();
    await seedProject(root);
    await seedExistingIter00(root, "prior loop seed");
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "screenshots", "home.png"), "prior capture", "utf-8");
    // A non-empty directory already at the `iter-00` backup refuses that move.
    const FIXED_ISO = "2026-01-01T00:00:00.000Z";
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(FIXED_ISO);
    const collision = path.join(evidenceRoot, `iter-00.backup-${FIXED_ISO.replace(/[:.]/g, "-")}`);
    await mkdir(collision, { recursive: true });
    await writeFile(path.join(collision, "stop-rename.marker"), "x", "utf-8");
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });

    expect(exit).toBe(2);
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.png"), "utf-8")).toBe(
      "prior capture",
    );
    expect(stderr.join("")).toContain("back in place");
    const log = await readFile(path.join(evidenceRoot, "mutation-log.jsonl"), "utf-8").catch(
      () => "",
    );
    expect(log).not.toContain("screenshots/home.png");
  });

  it("previews the aggregate move under --dry-run and moves nothing", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const screenshots = path.join(root, ".qfai/evidence/prototyping/screenshots");
    await mkdir(screenshots, { recursive: true });
    await writeFile(path.join(screenshots, "home.png"), "prior capture", "utf-8");
    const stdout = captureStdout();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      dryRun: true,
    });

    expect(exit).toBe(0);
    expect(await readFile(path.join(screenshots, "home.png"), "utf-8")).toBe("prior capture");
    expect(stdout.join("")).toContain(
      "would MOVE .qfai/evidence/prototyping/screenshots into .qfai/evidence/prototyping/aggregate.backup-<ISO>",
    );
  });

  it("does NOT refuse when iter-00 does not exist (fresh project default path)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
  });

  // `--dry-run` is documented as "display only, make no changes". Without
  // threading it into this command as well as `init` and `doctor`, the
  // cycle-0 reset would perform for real under it — measured at 27 files and
  // 1,475,551 bytes relocated, with `mutation-log.jsonl` recording every
  // write as real.
  // The negative control for these three cases is the `--force` test above:
  // without `--dry-run` the same fixture DOES get backed up.
  it("--force --dry-run moves nothing and writes nothing (exit 0)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const PRIOR = "the prior loop, which a preview must not relocate";
    const markerPath = await seedExistingIter00(root, PRIOR);
    const stdout = captureStdout();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
      dryRun: true,
    });

    expect(exit).toBe(0);
    // The prior loop is where it was, byte for byte.
    expect(await readFile(markerPath, "utf-8")).toBe(PRIOR);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    const entries = await readdir(evidenceRoot);
    expect(entries.filter((e) => e.startsWith("iter-00.backup-"))).toEqual([]);
    // None of the three writes the real run makes happened.
    expect(entries).not.toContain("prototyping.json");
    expect(entries).not.toContain("mutation-log.jsonl");
    await expect(
      readFile(path.join(evidenceRoot, "iter-00/iterate-plan.json"), "utf-8"),
    ).rejects.toThrow();
    // And the preview says what it would have done.
    const joined = stdout.join("");
    expect(joined).toMatch(/--dry-run/);
    expect(joined).toMatch(/would MOVE/);
    expect(joined).toMatch(/wrote nothing/);
  });

  // A preview that exits 0 where the run it previews exits 2 is the same defect
  // in a new place, so the read-only refusal keeps its precedence.
  it("--dry-run without --force still refuses with exit 2, and still moves nothing", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const PRIOR = "prior loop seed";
    const markerPath = await seedExistingIter00(root, PRIOR);
    const stderr = captureStderr();

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      dryRun: true,
    });

    expect(exit).toBe(2);
    const joined = stderr.join("");
    expect(joined).toMatch(/--force/);
    expect(joined).toMatch(/iter-00/);
    expect(await readFile(markerPath, "utf-8")).toBe(PRIOR);
    const entries = await readdir(path.join(root, ".qfai/evidence/prototyping"));
    expect(entries.filter((e) => e.startsWith("iter-00.backup-"))).toEqual([]);
  });

  // The preview covers the cycle >= 1 path too, so cycle 0 is seeded for real
  // first — a cycle-1 run against a project with no seed refuses on the drift
  // gate, and a preview that reported 0 there would be describing a run that
  // exits 2.
  it("--cycle 1 --dry-run creates no iteration directory and leaves the state file", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const seeded = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(seeded).toBe(0);
    const protoJsonPath = path.join(root, ".qfai/evidence/prototyping/prototyping.json");
    const before = await readFile(protoJsonPath, "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
      dryRun: true,
    });

    expect(exit).toBe(0);
    await expect(readdir(path.join(root, ".qfai/evidence/prototyping/iter-01"))).rejects.toThrow();
    expect(await readFile(protoJsonPath, "utf-8")).toBe(before);
  });

  it("lets a later cycle run with the aggregate mirrors its own captures wrote", async () => {
    // Those directories are what a capturing loop writes on purpose from cycle
    // 1 onward. Read as an overlapping capture, they stopped every captured
    // loop at its second cycle.
    const root = await newTempDir();
    await seedProject(root);
    const seeded = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(seeded).toBe(0);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    for (const name of ["screenshots", "html"]) {
      await mkdir(path.join(evidenceRoot, name), { recursive: true });
      await writeFile(path.join(evidenceRoot, name, "home.txt"), "this loop", "utf-8");
    }

    const exit = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
      dryRun: true,
    });

    expect(exit).toBe(0);
    // And they are still there: no later cycle moves them aside.
    expect(await readFile(path.join(evidenceRoot, "screenshots", "home.txt"), "utf-8")).toBe(
      "this loop",
    );
  });

  // A cycle >= 1 run with nothing frozen refuses, and the preview reports that
  // refusal rather than exiting 0 past it.
  it("--cycle 1 --dry-run reports the same refusal as the real run", async () => {
    const root = await newTempDir();
    await seedProject(root);

    const dry = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
      dryRun: true,
    });
    const real = await runPrototypingIterate({
      root,
      cycle: 1,
      targetUrl: "http://localhost:5173",
    });

    expect(dry).toBe(real);
    expect(dry).toBe(2);
  });
});

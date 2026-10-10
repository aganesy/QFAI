/**
 * The root assistant tree is linked at the shipped assets, and the link check
 * is what keeps that true.
 *
 * It replaces a byte-mirror whose drift check had to be bidirectional. The
 * forward direction is gone by construction — a link cannot differ from what it
 * points at — but the reverse one still matters, and for the reason the mirror
 * recorded: a root-only `test-layers.md` under `.qfai/assistant/` made
 * `loadLayerPolicy` succeed in this tree and throw in every `qfai init`
 * project, so a consumer-only failure outlived a full minor release. This tree
 * is the only place the shipped assets are exercised end to end before release,
 * and a file the assets never had is invisible to every adopter.
 *
 * So the cases below are about the half a link does not solve: a path that
 * exists here and nowhere in the package.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync, statSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// tests/scripts/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "link-assistant-tree.mjs");
const ASSISTANT = path.join(repoRoot, ".qfai", "assistant");
const ASSETS = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant");
const fixtureRoots: string[] = [];
const fixtureHoldingDirs = new Set<string>();

afterEach(async () => {
  for (const holdingDir of fixtureHoldingDirs) {
    await rm(holdingDir, { recursive: true, force: true });
  }
  fixtureHoldingDirs.clear();
  for (const root of fixtureRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function makeIsolatedTree(): Promise<{ root: string; script: string; assistant: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assistant-links-"));
  fixtureRoots.push(root);
  const script = path.join(root, "scripts", "link-assistant-tree.mjs");
  const assistant = path.join(root, ".qfai", "assistant");
  const source = path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
  await mkdir(path.dirname(script), { recursive: true });
  await mkdir(path.join(source, "rule"), { recursive: true });
  await mkdir(assistant, { recursive: true });
  await cp(SCRIPT, script);
  await writeFile(path.join(source, "rule", "quality.md"), "# Quality\n", "utf-8");
  return { root, script, assistant };
}

function runIsolated(
  script: string,
  root: string,
  checkOnly: boolean,
  preload?: string,
): { status: number; output: string } {
  const args = [...(preload === undefined ? [] : ["--import", preload]), script];
  if (checkOnly) args.push("--check");
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf-8",
  });
  return { status: result.status ?? 1, output: (result.stdout ?? "") + (result.stderr ?? "") };
}

type LinkFault =
  "healthy" | "unfollowable" | "recreate-refused" | "foreign-before-move" | "foreign-after-move";

type LinkTrace = {
  attempts: { target: string; path: string; type: string | null }[];
  moves: { from: string; to: string }[];
};

/** Restricts a simulated filesystem failure to one path in one child process. */
async function faultPreload(
  root: string,
  entry: string,
  fault: LinkFault,
): Promise<{ preload: string; traceFile: string }> {
  const preload = path.join(root, "link-fault.mjs");
  const traceFile = path.join(root, "link-trace.json");
  const source = `
import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";

const entry = ${JSON.stringify(entry)};
const fault = ${JSON.stringify(fault)};
const traceFile = ${JSON.stringify(traceFile)};
const original = {
  stat: fs.statSync,
  symlink: fs.symlinkSync,
  rename: fs.renameSync,
  unlink: fs.unlinkSync,
  write: fs.writeFileSync,
};
const trace = { attempts: [], moves: [] };
let recreated = false;
let replaced = false;
const matches = (value) => path.resolve(String(value)) === path.resolve(entry);
const save = () => original.write(traceFile, JSON.stringify(trace));
const denied = () => Object.assign(new Error("fixture refuses this operation"), { code: "EPERM" });
save();

fs.statSync = (value, ...args) => {
  if (fault === "healthy" || !matches(value) || recreated) return original.stat(value, ...args);
  if (fault === "foreign-before-move" && !replaced) {
    original.unlink(entry);
    original.write(entry, "foreign before move\\n");
    replaced = true;
  }
  throw denied();
};
fs.symlinkSync = (target, destination, type) => {
  if (!matches(destination)) return original.symlink(target, destination, type);
  trace.attempts.push({ target: String(target), path: String(destination), type: type ?? null });
  save();
  if (fault === "recreate-refused") throw denied();
  original.symlink(target, destination, type);
  recreated = true;
};
fs.renameSync = (from, to) => {
  original.rename(from, to);
  if (!matches(from)) return;
  trace.moves.push({ from: String(from), to: String(to) });
  save();
  if (fault === "foreign-after-move") original.write(entry, "foreign after move\\n");
};
syncBuiltinESMExports();
`;
  await writeFile(preload, source, "utf-8");
  return { preload, traceFile };
}

async function linkTrace(traceFile: string, entry: string): Promise<LinkTrace> {
  const trace = JSON.parse(await readFile(traceFile, "utf-8")) as LinkTrace;
  const root = fixtureRoots.find(
    (candidate) => path.resolve(candidate) === path.dirname(traceFile),
  );
  if (root === undefined) throw new Error("the trace is not owned by a fixture");
  const relativeEntry = path.relative(root, entry);
  if (
    relativeEntry === "" ||
    relativeEntry === ".." ||
    relativeEntry.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeEntry)
  ) {
    throw new Error("the traced entry is outside its fixture");
  }
  for (const move of trace.moves) {
    const holdingDir = path.dirname(path.resolve(move.to));
    if (
      path.resolve(move.from) !== path.resolve(entry) ||
      path.basename(move.to) !== "entry" ||
      path.dirname(holdingDir) !== path.resolve(os.tmpdir()) ||
      !/^qfai-assistant-link-[A-Za-z0-9]{6}$/.test(path.basename(holdingDir))
    ) {
      throw new Error("the repair hold is outside its fixture's scratch paths");
    }
    const heldDirectory = lstatSync(holdingDir, { throwIfNoEntry: false });
    if (heldDirectory?.isDirectory() && !heldDirectory.isSymbolicLink()) {
      fixtureHoldingDirs.add(holdingDir);
    }
  }
  return trace;
}

/** A failed repair must retain the original at its path or in its reported hold. */
async function retainedLink(entry: string, target: string, trace: LinkTrace): Promise<void> {
  const locations = [entry, ...trace.moves.map((move) => move.to)];
  for (const location of locations) {
    if (lstatSync(location, { throwIfNoEntry: false })?.isSymbolicLink()) {
      expect(path.normalize(await readlink(location))).toBe(path.normalize(target));
      return;
    }
  }
  throw new Error("the original fixture link was neither restored nor retained");
}

function runCheck(): { status: number; output: string } {
  // Both streams: a problem goes to stderr, and the success path prints to stdout.
  const result = spawnSync("node", [SCRIPT, "--check"], { cwd: repoRoot, encoding: "utf-8" });
  return {
    status: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

/** Git commands stay inside the disposable repository that owns this fixture. */
function fixtureGit(root: string, args: string[]): void {
  if (!fixtureRoots.includes(root)) throw new Error("Git fixture root is not owned by this suite");
  const result = spawnSync("git", ["-c", "core.fsmonitor=false", ...args], {
    cwd: root,
    encoding: "utf-8",
  });
  expect(result.status, (result.stdout ?? "") + (result.stderr ?? "")).toBe(0);
}

function followsDirectory(entry: string): boolean {
  try {
    return statSync(entry).isDirectory();
  } catch {
    expect(process.platform).toBe("win32");
    return false;
  }
}

describe("link-assistant-tree --check", () => {
  // QFAI:EX-0002-0022-01
  it("keeps the singular assistant links and catalog absence on the SSOT gate path", async () => {
    const scripts = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(scripts.scripts["sync:ssot"]).toContain("link-assistant-tree.mjs");
    expect(scripts.scripts["ci:gate:ssot"]).toContain("pnpm sync:ssot");
    expect(scripts.scripts["ci:gate:ssot"]).toContain("git diff --exit-code .qfai/");
    expect(existsSync(path.join(ASSISTANT, "catalog"))).toBe(false);
    for (const layer of ["rule", "skill", "agent", "prompt"]) {
      const entry = path.join(ASSISTANT, layer);
      expect(lstatSync(entry).isSymbolicLink(), `${layer} must be a symlink`).toBe(true);
      expect(realpathSync(entry)).toBe(realpathSync(path.join(ASSETS, layer)));
    }
    const checked = runCheck();
    expect(checked.status, checked.output).toBe(0);
  });

  it("passes on the current tree", () => {
    const { status, output } = runCheck();

    expect(output).toContain("link(s) verified");
    expect(status).toBe(0);
  });

  it("links the layers the package owns end to end", () => {
    for (const layer of ["skill", "agent", "rule", "prompt"]) {
      const entry = path.join(ASSISTANT, layer);
      expect(lstatSync(entry).isSymbolicLink(), `${layer} must be a symlink`).toBe(true);
      expect(realpathSync(entry), `${layer} must resolve to the shipped assets`).toBe(
        realpathSync(path.join(ASSETS, layer)),
      );
    }
  });

  // QFAI:EX-0002-0021-06
  it("rejects a regular rule mirror where the shipped rule link belongs", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const created = runIsolated(script, root, false);
    expect(created.status, created.output).toBe(0);
    const rule = path.join(assistant, "rule");
    expect(lstatSync(rule).isSymbolicLink()).toBe(true);
    expect(runIsolated(script, root, true).status).toBe(0);

    await rm(rule);
    await mkdir(rule);
    await writeFile(path.join(rule, "quality.md"), "# Local copy\n", "utf-8");
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/rule");
    expect(checked.output).toContain("not a symlink to");
  });

  it("has no assistant catalog after project context moves to the spec tree", () => {
    expect(existsSync(path.join(ASSISTANT, "catalog"))).toBe(false);
  });

  it("reports a path that exists here and nowhere in the assets", async () => {
    // The branch, read from the script: an unaccounted path must reach
    // `problems`, which is what makes the check exit non-zero. Reporting
    // without failing is the defect the mirror's own history records.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("exists here and nowhere in the shipped assets");
    expect(source).toContain("Add it to the assets, delete it, or allow-list it");
  });

  it("ignores untracked regular scratch files", async () => {
    // A suite may leave an untracked file in the working tree. Such a file
    // does not change what this repository ships.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("git");
    expect(source).toContain("ls-files");
    expect(source).toContain("TRACKED !== null");
  });

  it("links the shipped tree of an isolated checkout", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(0);
    expect(lstatSync(path.join(assistant, "rule")).isSymbolicLink()).toBe(true);
  });

  // QFAI:EX-0002-0022-01
  it("follows the root mirror after a native Git worktree checkout and preserves its primary", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const source = path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
    await writeFile(path.join(source, "pointer.md"), "# Pointer\n", "utf-8");
    await writeFile(path.join(root, "sentinel.txt"), "project-owned bytes\n", "utf-8");
    fixtureGit(root, ["init", "--initial-branch=main"]);
    fixtureGit(root, ["config", "core.symlinks", "true"]);
    fixtureGit(root, ["config", "core.autocrlf", "false"]);
    expect(runIsolated(script, root, false).status).toBe(0);
    fixtureGit(root, ["add", "--force", "--", "scripts", "packages", ".qfai", "sentinel.txt"]);
    fixtureGit(root, [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=",
      "commit",
      "-m",
      "Fixture",
    ]);
    const original = await readFile(path.join(source, "rule", "quality.md"));
    const primaryTarget = await readlink(path.join(assistant, "rule"));
    const linked = path.join(root, "linked checkout");
    fixtureGit(root, ["worktree", "add", "--detach", linked, "HEAD"]);
    const linkedScript = path.join(linked, "scripts", "link-assistant-tree.mjs");
    const entry = path.join(linked, ".qfai", "assistant", "rule");
    const pointer = path.join(linked, ".qfai", "assistant", "pointer.md");
    const target = await readlink(entry);
    const pointerTarget = await readlink(pointer);
    expect(lstatSync(entry).isSymbolicLink()).toBe(true);
    expect(lstatSync(pointer).isSymbolicLink()).toBe(true);
    expect(statSync(pointer).isFile()).toBe(true);
    const followable = followsDirectory(entry);
    const beforeCheck = lstatSync(entry);

    const checked = runIsolated(linkedScript, linked, true);

    expect(checked.status, checked.output).toBe(followable ? 0 : 1);
    if (!followable) expect(checked.output).toContain(".qfai/assistant/rule");
    expect(await readlink(entry)).toBe(target);
    expect(lstatSync(entry).ctimeMs).toBe(beforeCheck.ctimeMs);
    const repaired = runIsolated(linkedScript, linked, false);
    expect(repaired.status, repaired.output).toBe(0);
    expect(repaired.output).toContain(`${followable ? 0 : 1} link(s) written`);
    expect(statSync(entry).isDirectory()).toBe(true);
    expect((await readFile(path.join(entry, "quality.md"))).equals(original)).toBe(true);
    expect(await readlink(entry)).toBe(target);
    expect(await readlink(pointer)).toBe(pointerTarget);
    expect(await readFile(pointer, "utf-8")).toBe("# Pointer\n");
    expect(runIsolated(linkedScript, linked, true).status).toBe(0);
    const repeated = runIsolated(linkedScript, linked, false);
    expect(repeated.status, repeated.output).toBe(0);
    expect(repeated.output).toContain("0 link(s) written");
    expect((await readFile(path.join(source, "rule", "quality.md"))).equals(original)).toBe(true);
    expect(await readlink(path.join(assistant, "rule"))).toBe(primaryTarget);
    expect(statSync(path.join(assistant, "rule")).isDirectory()).toBe(true);
    for (const checkout of [root, linked]) {
      expect(await readFile(path.join(checkout, "sentinel.txt"), "utf-8")).toBe(
        "project-owned bytes\n",
      );
    }
    fixtureGit(root, ["diff", "--exit-code", "--", "scripts", "packages", ".qfai", "sentinel.txt"]);
  });

  // QFAI:EX-0002-0022-01
  it("repairs a native file-type link to a directory when the OS cannot follow it", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const source = path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
    await writeFile(path.join(source, "pointer.md"), "# Pointer\n", "utf-8");
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const pointer = path.join(assistant, "pointer.md");
    const target = await readlink(entry);
    const pointerTarget = await readlink(pointer);
    const original = await readFile(path.join(source, "rule", "quality.md"));
    await rm(entry);
    await symlink(target, entry, "file");
    expect(lstatSync(entry).isSymbolicLink()).toBe(true);
    const followable = followsDirectory(entry);
    const beforeCheck = lstatSync(entry);

    const checked = runIsolated(script, root, true);

    expect(checked.status, checked.output).toBe(followable ? 0 : 1);
    if (!followable) expect(checked.output).toContain(".qfai/assistant/rule");
    expect(await readlink(entry)).toBe(target);
    expect(lstatSync(entry).ctimeMs).toBe(beforeCheck.ctimeMs);
    const repaired = runIsolated(script, root, false);
    expect(repaired.status, repaired.output).toBe(0);
    expect(repaired.output).toContain(`${followable ? 0 : 1} link(s) written`);
    expect(statSync(entry).isDirectory()).toBe(true);
    expect((await readFile(path.join(entry, "quality.md"))).equals(original)).toBe(true);
    expect((await readFile(path.join(source, "rule", "quality.md"))).equals(original)).toBe(true);
    expect(await readlink(entry)).toBe(target);
    expect(await readlink(pointer)).toBe(pointerTarget);
    expect(await readFile(pointer, "utf-8")).toBe("# Pointer\n");
    expect(runIsolated(script, root, true).status).toBe(0);
    const repeated = runIsolated(script, root, false);
    expect(repeated.status, repeated.output).toBe(0);
    expect(repeated.output).toContain("0 link(s) written");
  });

  // QFAI:EX-0002-0022-01
  it("rejects a correctly targeted directory link that cannot be followed without writing", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "unfollowable");

    const checked = runIsolated(script, root, true, preload);

    expect(checked.status, checked.output).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/rule");
    expect(await readlink(entry)).toBe(target);
    expect(await linkTrace(traceFile, entry)).toEqual({ attempts: [], moves: [] });
  });

  // QFAI:EX-0002-0022-01
  it("recreates only the unfollowable same-target directory link with the directory type", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "unfollowable");

    const repaired = runIsolated(script, root, false, preload);
    const trace = await linkTrace(traceFile, entry);

    expect(repaired.status, repaired.output).toBe(0);
    expect(repaired.output).toContain("1 link(s) written");
    expect(await readlink(entry)).toBe(target);
    expect(trace.attempts).toEqual([{ target, path: entry, type: "dir" }]);
    expect(trace.moves).toHaveLength(1);
    expect(await readFile(path.join(entry, "quality.md"), "utf-8")).toBe("# Quality\n");
    expect(runIsolated(script, root, true).status).toBe(0);
  });

  // QFAI:EX-0002-0022-01
  it("does not churn a healthy same-target link", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "healthy");

    const repeated = runIsolated(script, root, false, preload);

    expect(repeated.status, repeated.output).toBe(0);
    expect(repeated.output).toContain("0 link(s) written");
    expect(await readlink(entry)).toBe(target);
    expect(await linkTrace(traceFile, entry)).toEqual({ attempts: [], moves: [] });
    expect(runIsolated(script, root, true).status).toBe(0);
  });

  // QFAI:EX-0002-0022-01
  it("reports a file-link permission failure without recreating the file link", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const source = path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
    await writeFile(path.join(source, "pointer.md"), "# Pointer\n", "utf-8");
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "pointer.md");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "unfollowable");

    const refused = runIsolated(script, root, false, preload);

    expect(refused.status, refused.output).toBe(1);
    expect(refused.output).toContain(".qfai/assistant/pointer.md");
    expect(await readlink(entry)).toBe(target);
    expect(await linkTrace(traceFile, entry)).toEqual({ attempts: [], moves: [] });
  });

  // QFAI:EX-0002-0022-01
  it("retains the original and reports failure when directory-link recreation is refused", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "recreate-refused");

    const refused = runIsolated(script, root, false, preload);
    const trace = await linkTrace(traceFile, entry);

    expect(refused.status, refused.output).toBe(1);
    expect(trace.attempts.length).toBeGreaterThan(0);
    await retainedLink(entry, target, trace);
    for (const move of trace.moves) {
      if (lstatSync(move.to, { throwIfNoEntry: false }) !== undefined) {
        expect(refused.output).toContain(move.to);
      }
    }
  });

  // QFAI:EX-0002-0022-01
  it("preserves a foreign regular file that replaced the link after inspection", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const { preload, traceFile } = await faultPreload(root, entry, "foreign-before-move");

    const refused = runIsolated(script, root, false, preload);
    const trace = await linkTrace(traceFile, entry);

    expect(refused.status, refused.output).toBe(1);
    expect(trace.attempts).toEqual([]);
    const locations = [entry, ...trace.moves.map((move) => move.to)];
    const retained = locations.find(
      (location) => existsSync(location) && lstatSync(location).isFile(),
    );
    expect(retained).toBeDefined();
    if (retained === undefined) throw new Error("the concurrent fixture file was lost");
    expect(await readFile(retained, "utf-8")).toBe("foreign before move\n");
    if (retained !== entry) expect(refused.output).toContain(retained);
  });

  // QFAI:EX-0002-0022-01
  it("preserves an entry created while the original link is held", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const entry = path.join(assistant, "rule");
    const target = await readlink(entry);
    const { preload, traceFile } = await faultPreload(root, entry, "foreign-after-move");

    const refused = runIsolated(script, root, false, preload);
    const trace = await linkTrace(traceFile, entry);

    expect(refused.status, refused.output).toBe(1);
    expect(await readFile(entry, "utf-8")).toBe("foreign after move\n");
    expect(trace.moves).toHaveLength(1);
    await retainedLink(entry, target, trace);
    expect(refused.output).toContain(trace.moves[0]?.to);
  });

  // QFAI:EX-0002-0022-02
  it("reports a retired layer even when it is a symlink", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    await symlink(
      path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant", "rule"),
      path.join(assistant, "skills"),
      "dir",
    );
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/skills");
  });

  // QFAI:EX-0002-0022-02
  it("reports a retired real directory without deleting its contents", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const retired = path.join(assistant, "process");
    const memo = path.join(retired, "migrations", "memo.md");
    await mkdir(path.dirname(memo), { recursive: true });
    await writeFile(memo, "# Local\n", "utf-8");
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/process");
    expect(await readFile(memo, "utf-8")).toBe("# Local\n");
  });

  // QFAI:EX-0002-0022-02
  it("reports a root-only file the shipped assets never had", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    expect(runIsolated(script, root, true).status).toBe(0);

    const planted = path.join(assistant, "notes", "x.md");
    await mkdir(path.dirname(planted), { recursive: true });
    await writeFile(planted, "# Root only\n", "utf-8");
    const checked = runIsolated(script, root, true);
    expect(checked.status, checked.output).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/notes");
    expect(checked.output).toContain("exists here and nowhere in the shipped assets");
  });
});

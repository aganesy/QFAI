/**
 * Integration: `qfai handoff upgrade <legacy-file>` happy-path
 * (TC-0015-0030, AC-0015-0020).
 *
 * - emits a conforming `.qfai/handoff.yaml` at the canonical path
 * - recognized fields are mapped to schema-defined slots
 * - ALL original fields preserved under a `legacy:` key (no data loss)
 */
// QFAI:SPEC-0015:TC-0015-0030

import { execFileSync } from "node:child_process";
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runHandoffUpgrade } from "../../../../src/cli/commands/handoffUpgrade.js";
import { run } from "../../../../src/cli/main.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-upgrade-int-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/**
 * How the re-run hint is expected to render `value`. Mirrors the
 * command's own quoting rule: bare when every character is shell-inert,
 * otherwise double-quoted with `"`, `\`, `$` and a backtick escaped. A
 * backslash is NOT shell-inert — a POSIX shell eats an unquoted one —
 * so a Windows path renders quoted with doubled separators.
 */
function shellArg(value: string): string {
  return /^[A-Za-z0-9._:@/-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

const LEGACY_BODY = `# legacy session handoff
companyName: Acme
primarySpecId: spec-0012
startDate: 2026-05-27
unrecognizedField: legacy-only-data
customNotes: "remember to migrate"
`;

describe("TC-0015-0030: handoff upgrade emits conforming yaml + preserves originals", () => {
  it("maps recognized fields and preserves all originals under legacy:", async () => {
    await writeFile(path.join(root, "session-handoff.yaml"), LEGACY_BODY, "utf-8");
    const out: string[] = [];
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: (m) => out.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    expect(errs).toEqual([]);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots mapped.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    expect(body).toMatch(/startDate: "2026-05-27"/);
    // legacy: key carries the full original payload (lossless).
    expect(body).toMatch(/legacy:/);
    expect(body).toMatch(/unrecognizedField/);
    expect(body).toMatch(/customNotes/);
    // Success line printed.
    expect(out.join("\n")).toMatch(/handoff\.yaml/);
  });

  // Regression: nested YAML in the legacy body MUST be preserved under
  // `legacy:` — pre-fix the regex scanner silently dropped indented
  // values, violating AC-0015-0020.
  it("preserves nested YAML mappings (signature.by / signature.on) under legacy:", async () => {
    const nestedBody = [
      "# legacy with nested YAML",
      "companyName: Acme",
      "primarySpecId: spec-0012",
      "signature:",
      "  by: user-alpha",
      "  on: 2026-05-31T12:00:00Z",
      "metadata:",
      "  tags:",
      "    - migration",
      "    - second-wave",
      "  reviewer: reviewer-bravo",
      "",
    ].join("\n");
    await writeFile(path.join(root, "session-handoff.yaml"), nestedBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots mapped.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    // Nested signature.by / signature.on preserved under legacy:.
    expect(body).toMatch(/signature:/);
    expect(body).toMatch(/by: user-alpha/);
    expect(body).toMatch(/on: 2026-05-31T12:00:00Z/);
    // Nested list under metadata.tags preserved.
    expect(body).toMatch(/metadata:/);
    expect(body).toMatch(/tags:/);
    expect(body).toMatch(/- migration/);
    expect(body).toMatch(/- second-wave/);
    expect(body).toMatch(/reviewer: reviewer-bravo/);
  });

  // Regression: mixed scalar + nested keys must BOTH be preserved.
  it("preserves a mix of scalar and nested values under legacy:", async () => {
    const mixedBody = [
      "companyName: MixedCo",
      "customScalar: hello",
      "nestedBlock:",
      "  inner: value",
      "  innerNumber: 42",
      "",
    ].join("\n");
    await writeFile(path.join(root, "legacy.yaml"), mixedBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "MixedCo"/);
    expect(body).toMatch(/customScalar: hello/);
    expect(body).toMatch(/nestedBlock:/);
    expect(body).toMatch(/inner: value/);
    expect(body).toMatch(/innerNumber: 42/);
  });

  // Regression: malformed-but-non-empty legacy bodies (YAML parses to
  // a non-object: list, scalar, null) MUST still produce a parseable
  // canonical handoff.yaml with the raw legacy text preserved under
  // the `__legacy_raw__` sentinel so AC-0015-0020's "no data is lost"
  // contract holds even on shape mismatches.
  it("preserves raw legacy text under __legacy_raw__ when YAML yields a non-object payload", async () => {
    // A YAML sequence (top-level list) parses to an array — the
    // structured-object branch refuses it, so the stage-3 fallback
    // engages.
    const listBody = ["- item-one", "- item-two", "- item-three", ""].join("\n");
    await writeFile(path.join(root, "list-legacy.yaml"), listBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "list-legacy.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // The raw sentinel and the original bytes are both present.
    expect(body).toMatch(/legacy:/);
    expect(body).toMatch(/__legacy_raw__/);
    expect(body).toMatch(/item-one/);
    expect(body).toMatch(/item-two/);
    expect(body).toMatch(/item-three/);
    // The canonical handoff.yaml must itself be re-parseable as YAML
    // (the sentinel-bearing legacy block does not break the document).
    const { parse: parseYaml } = await import("yaml");
    const reparsed = parseYaml(body) as Record<string, unknown>;
    expect(reparsed).toBeTruthy();
    expect(reparsed.legacy).toBeTruthy();
  });

  it("upgrades a JSON-formatted legacy file equally", async () => {
    const jsonBody = JSON.stringify(
      {
        companyName: "JsonCo",
        primarySpecId: "spec-0099",
        customExtra: { nested: true },
      },
      null,
      2,
    );
    await writeFile(path.join(root, "legacy.json"), jsonBody, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.json",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "JsonCo"/);
    expect(body).toMatch(/primarySpecId: "spec-0099"/);
    // Nested original payload preserved under legacy:
    expect(body).toMatch(/customExtra/);
  });

  // Pin AC-0015-0020's "no data loss" contract for the YAML
  // nested-keys path. The previous YAML test only covered flat
  // scalar key=value pairs; the regex fallback at L70-83 would
  // silently drop nested values from a non-flat YAML legacy file.
  // M4 (commit 992f6a13) rewired parseLegacyBody to call
  // `yaml.parse(...)` BEFORE the regex fallback, so nested mapping
  // structures (`signature:\n  by: alice`, block scalars, etc.) now
  // round-trip via `yaml.stringify` in toYaml. This test seeds a
  // nested YAML legacy body and asserts the nested values land in
  // the emitted `legacy:` block — pin the contract against future
  // regression to a flat-only parser.
  it("preserves nested YAML legacy fields under legacy: (no data loss)", async () => {
    const nestedYaml = `# legacy session handoff with nested keys
companyName: Acme
primarySpecId: spec-0012
signature:
  by: alice
  on: 2026-05-27
metadata:
  reviewer: bob
  notes: |
    multi-line
    block scalar
    survives
`;
    await writeFile(path.join(root, "session-handoff.yaml"), nestedYaml, "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    // Canonical slots from the recognized fields.
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/primarySpecId: "spec-0012"/);
    // Nested mapping values must appear in the emitted legacy: block.
    // Pre-fix the column-0 regex scanner would drop these silently.
    expect(body).toMatch(/signature:/);
    expect(body).toMatch(/by: alice/);
    expect(body).toMatch(/on: 2026-05-27/);
    expect(body).toMatch(/metadata:/);
    expect(body).toMatch(/reviewer: bob/);
    // Block scalar content must round-trip — at least one
    // representative line from the multi-line body survives.
    expect(body).toMatch(/multi-line/);
    expect(body).toMatch(/block scalar/);
  });
});

/**
 * Overwrite guard: `.qfai/handoff.yaml` is a consumed SSOT (the
 * saas-package completion profile reads it by that exact path), so a
 * re-run — or a run pointed at a stale legacy file — must not silently
 * replace a hand-curated canonical file. Pre-fix the command staged a
 * `.tmp` sibling and renamed over the destination unconditionally,
 * reporting success with no backup and no prompt.
 */
describe("handoff upgrade overwrite guard (--force / --dry-run)", () => {
  const CURATED = [
    "companyName: Acme Corp",
    "primarySpecId: spec-0007",
    "signature: hand-edited-canonical-DO-NOT-LOSE",
    "notes: three weeks of hand curation live in this file",
    "",
  ].join("\n");

  async function seedCanonicalAndLegacy(): Promise<string> {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "handoff.yaml"), CURATED, "utf-8");
    await writeFile(
      path.join(root, "legacy-old.yml"),
      "companyName: Wrong Co\nprimarySpecId: spec-0001\n",
      "utf-8",
    );
    return path.join(root, ".qfai", "handoff.yaml");
  }

  it("refuses to overwrite an existing canonical handoff without --force", async () => {
    const destAbs = await seedCanonicalAndLegacy();
    const out: string[] = [];
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      write: (m) => out.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    // The curated file is byte-identical.
    await expect(readFile(destAbs, "utf-8")).resolves.toBe(CURATED);
    // The refusal names the existing path AND the recovery hint. The
    // hint carries the RESOLVED root: copied from another directory it
    // would otherwise resolve against the reader's cwd — a different
    // project's canonical handoff.
    const message = errs.join("\n");
    expect(message).toMatch(/\.qfai\/handoff\.yaml already exists/);
    expect(message).toMatch(/qfai handoff upgrade legacy-old\.yml --root \S+ --force/);
    expect(message).toContain(shellArg(root));
    // No staged remnant is left behind (the staging name carries per-run
    // entropy, so assert on the directory rather than one fixed name).
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
    expect(out).toEqual([]);
  });

  it("writes normally when no canonical handoff exists yet", async () => {
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "FreshCo"/);
  });

  it("with --force, backs the prior file up to <dest>.backup-<ISO> before overwriting", async () => {
    const destAbs = await seedCanonicalAndLegacy();
    const out: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: (m) => out.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    const body = await readFile(destAbs, "utf-8");
    expect(body).toMatch(/companyName: "Wrong Co"/);
    // The hand-curated bytes survive on disk, not only in git.
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
    const backupName = backups[0] ?? "";
    await expect(readFile(path.join(root, ".qfai", backupName), "utf-8")).resolves.toBe(CURATED);
    // The success line names the backup so the operator can find it.
    expect(out.join("\n")).toMatch(/backed up to \.qfai\/handoff\.yaml\.backup-/);
  });

  // A legacy filename carrying a literal backslash must not be emitted
  // bare: pasted into a POSIX shell the backslash is consumed as an
  // escape, so `legacy\-old.yml` would name `legacy-old.yml` — a
  // DIFFERENT file — and force-overwrite the canonical handoff from it.
  // Backslash is a path separator on Windows, so a filename can only
  // carry a literal one on POSIX — which is exactly where the unquoted
  // paste misfires.
  it.skipIf(process.platform === "win32")(
    "quotes a backslash in the --force re-run hint",
    async () => {
      await seedCanonicalAndLegacy();
      const legacyName = "legacy\\-old.yml";
      await writeFile(path.join(root, legacyName), "companyName: Wrong Co\n", "utf-8");
      const errs: string[] = [];
      const code = await runHandoffUpgrade({
        root,
        legacyFile: legacyName,
        write: () => undefined,
        writeErr: (m) => errs.push(m),
      });
      expect(code).toBe(1);
      const message = errs.join("\n");
      expect(message).toContain('"legacy\\\\-old.yml"');
      expect(message).not.toMatch(/upgrade legacy\\-old\.yml/);
    },
  );

  // An EXPLICIT `--root` reaches this command exactly as it was typed
  // (`main.ts`'s `resolveRoot` returns an explicit root unchanged), so a
  // relative one would survive into the copy-pasteable hint. Re-run from
  // a different working directory, `--root ../project` resolves onto
  // someone else's tree and `--force` overwrites a canonical handoff the
  // operator never named. The hint must carry an ABSOLUTE root.
  it("absolutizes a relative root in the --force re-run hint", async () => {
    await seedCanonicalAndLegacy();
    const relativeRoot = path.relative(process.cwd(), root);
    expect(path.isAbsolute(relativeRoot)).toBe(false);
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root: relativeRoot,
      legacyFile: "legacy-old.yml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    const message = errs.join("\n");
    expect(message).toContain(`--root ${shellArg(path.resolve(relativeRoot))}`);
    // Nothing relative is left in the hint to be re-resolved by whoever
    // pastes it.
    expect(message).not.toContain(`--root ${shellArg(relativeRoot)}`);
  });

  // `copyFile` follows a symlink, so backing a symlinked destination up
  // by copying preserves the TARGET's bytes as a plain file — and the
  // `rename` that follows replaces the link itself. Restoring that
  // backup could never restore the connection to the external handoff,
  // so the backup has to be the link.
  it("with --force, preserves a symlinked destination AS a symlink", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await mkdir(path.join(root, "external"), { recursive: true });
    const externalAbs = path.join(root, "external", "handoff.yaml");
    const external = "signature: lives-outside-the-repo\n";
    await writeFile(externalAbs, external, "utf-8");
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    await symlink(externalAbs, destAbs, "file");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    // The canonical path now holds the upgraded file, not a link.
    expect((await lstat(destAbs)).isSymbolicLink()).toBe(false);
    await expect(readFile(destAbs, "utf-8")).resolves.toMatch(/companyName: "Wrong Co"/);
    // The external file was never written through.
    await expect(readFile(externalAbs, "utf-8")).resolves.toBe(external);
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
    const backupAbs = path.join(root, ".qfai", backups[0] ?? "");
    expect((await lstat(backupAbs)).isSymbolicLink()).toBe(true);
    expect(await readlink(backupAbs)).toBe(externalAbs);
  });

  // A DANGLING link has no bytes to copy at all: pre-fix the copy failed
  // with ENOENT and the forced run proceeded with no backup, deleting
  // the operator's link outright.
  it("with --force, preserves a dangling symlink destination", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    const missingAbs = path.join(root, "external", "handoff.yaml");
    await symlink(missingAbs, destAbs, "file");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    const out: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: (m) => out.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toMatch(/backed up to/);
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
    const backupAbs = path.join(root, ".qfai", backups[0] ?? "");
    expect((await lstat(backupAbs)).isSymbolicLink()).toBe(true);
    expect(await readlink(backupAbs)).toBe(missingAbs);
  });

  // A directory entry that is neither a regular file nor a symlink
  // cannot be reproduced by a byte copy, so replacing it would be an
  // unbacked destruction. It used to be classified as a plain file and
  // handed to `copyFile`, which surfaced as a raw `EISDIR` from the
  // backup step rather than as a refusal naming what is in the way.
  it("with --force, refuses a directory destination instead of replacing it", async () => {
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    await mkdir(destAbs, { recursive: true });
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    expect(errs.join("\n")).toMatch(/is a directory; only a regular file or a symlink/);
    // The entry is untouched and nothing was staged beside it.
    expect((await lstat(destAbs)).isDirectory()).toBe(true);
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  // `copyFile` OPENS its source, and opening a FIFO blocks until some
  // other process opens the write end. With the canonical path a named
  // pipe and no writer around, a `--force` run therefore never returned
  // at all — no error, no exit code, a wedged CLI. Classifying the entry
  // first means the pipe is never opened.
  it.skipIf(process.platform === "win32")(
    "with --force, refuses a FIFO destination instead of opening it",
    async () => {
      await mkdir(path.join(root, ".qfai"), { recursive: true });
      const destAbs = path.join(root, ".qfai", "handoff.yaml");
      execFileSync("mkfifo", [destAbs]);
      await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
      const errs: string[] = [];
      const code = await runHandoffUpgrade({
        root,
        legacyFile: "legacy-old.yml",
        force: true,
        write: () => undefined,
        writeErr: (m) => errs.push(m),
      });
      expect(code).toBe(1);
      expect(errs.join("\n")).toMatch(/is a FIFO \(named pipe\)/);
      expect((await lstat(destAbs)).isFIFO()).toBe(true);
      expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
    },
    10000,
  );

  // A run that dies between the exclusive `link` and its cleanup leaves
  // the staging sibling behind as a HARD LINK to the canonical file.
  // With a fixed `<dest>.tmp` the next `--force` run truncated the
  // canonical bytes through that name before backing them up, so the
  // backup captured the NEW content and the curated file was gone from
  // both paths. The staging name must be reserved per run.
  it("does not write through a residual staging hard link under --force", async () => {
    const destAbs = await seedCanonicalAndLegacy();
    // The remnant a crashed pre-fix run would have left.
    const residual = `${destAbs}.tmp`;
    await link(destAbs, residual);
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      force: true,
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    // The backup holds the CURATED bytes, not the freshly written ones.
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
    await expect(readFile(path.join(root, ".qfai", backups[0] ?? ""), "utf-8")).resolves.toBe(
      CURATED,
    );
    // The remnant was left untouched rather than reused as staging.
    await expect(readFile(residual, "utf-8")).resolves.toBe(CURATED);
    await expect(readFile(destAbs, "utf-8")).resolves.toMatch(/companyName: "Wrong Co"/);
  });

  // A canonical handoff that is a symlink pointing at an external file
  // is still an entry the operator placed on purpose. `stat` follows
  // the link and reports ENOENT while the target is missing, which
  // would let a plain run replace the link and sever the connection —
  // the existence probe must use `lstat`.
  it("refuses a dangling symlink destination without --force", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    const destAbs = path.join(root, ".qfai", "handoff.yaml");
    await symlink(path.join(root, "external", "handoff.yaml"), destAbs, "file");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(1);
    expect(errs.join("\n")).toMatch(/\.qfai\/handoff\.yaml already exists/);
    // The link itself survives, still pointing at the external file.
    expect((await lstat(destAbs)).isSymbolicLink()).toBe(true);
    expect(await readlink(destAbs)).toBe(path.join(root, "external", "handoff.yaml"));
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  // Two `--force` runs landing in the same millisecond derive the same
  // `.backup-<ISO>` name. A plain rename/copy would let the second
  // destroy the first run's backup — the only on-disk copy of the
  // hand-curated file. The name must be reserved exclusively.
  it("reserves a distinct backup name when two --force runs share a timestamp", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));
    try {
      const destAbs = await seedCanonicalAndLegacy();
      const firstCode = await runHandoffUpgrade({
        root,
        legacyFile: "legacy-old.yml",
        force: true,
        write: () => undefined,
        writeErr: () => undefined,
      });
      expect(firstCode).toBe(0);
      const afterFirst = await readFile(destAbs, "utf-8");
      const secondCode = await runHandoffUpgrade({
        root,
        legacyFile: "legacy-old.yml",
        force: true,
        write: () => undefined,
        writeErr: () => undefined,
      });
      expect(secondCode).toBe(0);
      const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
        n.startsWith("handoff.yaml.backup-"),
      );
      // Same frozen clock, two backups — the second did not overwrite
      // the first.
      expect(backups).toHaveLength(2);
      const bodies = await Promise.all(
        backups.map((n) => readFile(path.join(root, ".qfai", n), "utf-8")),
      );
      expect(bodies).toContain(CURATED);
      expect(bodies).toContain(afterFirst);
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours --dry-run: nothing is written and the preview names the refusal", async () => {
    const destAbs = await seedCanonicalAndLegacy();
    const out: string[] = [];
    const errs: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy-old.yml",
      dryRun: true,
      write: (m) => out.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(code).toBe(0);
    expect(errs).toEqual([]);
    // Untouched — pre-fix `--dry-run` performed the very overwrite it
    // was invoked to prevent.
    await expect(readFile(destAbs, "utf-8")).resolves.toBe(CURATED);
    const preview = out.join("\n");
    expect(preview).toMatch(/no changes written/);
    expect(preview).toMatch(/destination:\s+\.qfai\/handoff\.yaml \(exists\)/);
    expect(preview).toMatch(/companyName/);
    expect(preview).toMatch(/would be REFUSED/);
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  it("honours --dry-run on a clean project without creating the destination", async () => {
    await writeFile(path.join(root, "legacy.yml"), "companyName: FreshCo\n", "utf-8");
    const out: string[] = [];
    const code = await runHandoffUpgrade({
      root,
      legacyFile: "legacy.yml",
      dryRun: true,
      write: (m) => out.push(m),
      writeErr: () => undefined,
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toMatch(/destination:\s+\.qfai\/handoff\.yaml \(new\)/);
    await expect(readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8")).rejects.toThrow();
  });
});

/**
 * The guard is only real if the CLI threads the flags. Pre-fix
 * `main.ts` constructed `runHandoffUpgrade({root, legacyFile})` and
 * dropped `--force` / `--dry-run` on the floor, so a command-level
 * test is what pins the regression.
 */
describe("qfai handoff upgrade CLI flag threading", () => {
  async function seed(): Promise<string> {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "handoff.yaml"), "signature: keep-me\n", "utf-8");
    await writeFile(path.join(root, "legacy-old.yml"), "companyName: Wrong Co\n", "utf-8");
    return path.join(root, ".qfai", "handoff.yaml");
  }

  async function runCli(argv: string[]): Promise<number | undefined> {
    const previous = process.exitCode;
    process.exitCode = undefined;
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      await run(argv, root);
      return process.exitCode;
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      process.exitCode = previous;
    }
  }

  it("exits 1 and preserves the canonical file when --force is absent", async () => {
    const destAbs = await seed();
    const code = await runCli(["handoff", "upgrade", "legacy-old.yml", "--root", root]);
    expect(code).toBe(1);
    await expect(readFile(destAbs, "utf-8")).resolves.toBe("signature: keep-me\n");
  });

  it("writes nothing under --dry-run even when --force is also given", async () => {
    const destAbs = await seed();
    const code = await runCli([
      "handoff",
      "upgrade",
      "legacy-old.yml",
      "--root",
      root,
      "--dry-run",
      "--force",
    ]);
    expect(code).toBe(0);
    await expect(readFile(destAbs, "utf-8")).resolves.toBe("signature: keep-me\n");
    expect(await readdir(path.join(root, ".qfai"))).toEqual(["handoff.yaml"]);
  });

  it("overwrites with a backup when --force is given", async () => {
    const destAbs = await seed();
    const code = await runCli(["handoff", "upgrade", "legacy-old.yml", "--root", root, "--force"]);
    expect(code).toBe(0);
    await expect(readFile(destAbs, "utf-8")).resolves.toMatch(/companyName: "Wrong Co"/);
    const backups = (await readdir(path.join(root, ".qfai"))).filter((n) =>
      n.startsWith("handoff.yaml.backup-"),
    );
    expect(backups).toHaveLength(1);
  });
});

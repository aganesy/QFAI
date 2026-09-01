import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { Dirent } from "node:fs";
import { lstat, open, readdir, rename, rm, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "./fs/errno.js";
import { SHIPPED_GOVERNED_ASSISTANT_FILES } from "./governedAssistantManifest.js";
import { escapeRegExp } from "./regex.js";

/**
 * Provenance record for the vendored halves of the assistant tree.
 *
 * qfai ships its normative rules as markdown copied into the project
 * (`constitution/`, `catalog/`) and the validators that implement them through
 * npm. The copy is create-only, so the two halves separate the moment either
 * side moves: an upgraded toolkit keeps reading whatever constitution the
 * project first initialised with, and a local edit to that constitution is
 * indistinguishable from shipped policy — downstream reasoning then cites the
 * fork as if it were the release.
 *
 * This module records what qfai actually wrote, per file, so both cases become
 * observable: a file that still matches its recorded hash is a stale copy the
 * toolkit may refresh, and a file that matches neither the record nor the
 * installed release is a local fork that needs a merge decision.
 *
 * `manifest/` is deliberately outside the record. `qfai-configure` is the
 * shipped entrypoint for editing those declarative files, so a project editing
 * them is using the supported path and must not be reported for it.
 */
export const ASSISTANT_ASSETS_LOCK_BASENAME = ".assets.lock.json";

/**
 * Assistant layers qfai owns end to end and can therefore vouch for.
 */
export const GOVERNED_ASSISTANT_LAYERS = ["constitution", "catalog"] as const;

export type GovernedAssistantLayer = (typeof GOVERNED_ASSISTANT_LAYERS)[number];

/**
 * Maps a POSIX path relative to `.qfai/assistant/` to the sha256 of the
 * content qfai wrote at that path.
 */
export type AssistantAssetsLock = {
  files: Record<string, string>;
};

/**
 * A project's legal way to extend qfai policy without editing a file qfai
 * owns: `<layer>/<name>.local.md` is never shipped, never recorded and never
 * reported. Extending the catalog in place is what produces an unmergeable
 * fork; an overlay beside it is additive and survives every upgrade.
 *
 * The extension is pinned to `md`, not left open. `catalog/` also ships
 * `review-gate.rules.yml` and `spec_required_files.json`, and a pattern that
 * accepted any extension read `review-gate.local.yml` as an overlay — so a
 * non-markdown normative file added beside them dropped out of the record
 * entirely and out of `QFAI-ASSETS-005` with it.
 */
const LOCAL_OVERLAY_PATTERN = /\.local\.md$/i;

export function isLocalAssistantOverlay(relativePath: string): boolean {
  return LOCAL_OVERLAY_PATTERN.test(path.posix.basename(toPosix(relativePath)));
}

/**
 * Prefix of the temporary file a governed write stages beside its target.
 *
 * Staging in the layer directory is what makes the write atomic — `rename`
 * within one directory either lands whole or leaves the old file untouched —
 * but it also puts a file qfai owns inside a scanned layer. The prefix is how
 * `collectGovernedAssistantFiles` recognises it as qfai's own scaffolding
 * rather than a normative file the project added.
 */
export const ASSISTANT_STAGING_PREFIX = ".qfai-staging-";

/**
 * Dotfiles inside a governed layer that are known housekeeping, not policy.
 *
 * Only these are skipped. Excluding every dotted name instead was a hole the
 * size of the check: `constitution/.policy.md` is as normative as its
 * undotted sibling, and a blanket `startsWith(".")` let one be added without
 * `QFAI-ASSETS-005` ever seeing it — the exact bypass this record exists to
 * close. `*.local.md` is the one sanctioned way to add a file here.
 */
const UNGOVERNED_MANAGEMENT_BASENAMES = new Set([
  ".gitkeep",
  ".gitignore",
  ".gitattributes",
  ".npmignore",
  ".DS_Store",
  ASSISTANT_ASSETS_LOCK_BASENAME,
]);

/**
 * The exact shape `replaceGovernedAsset` stages: the prefix, the v4 UUID that
 * makes it unique, and the `.tmp` suffix.
 *
 * Matching the prefix alone excluded any name that merely begins with it, so
 * `constitution/.qfai-staging-project-rule.md` was a normative file the record
 * never saw and `QFAI-ASSETS-005` never reported — an addition dressed as
 * qfai's own scaffolding. Only a name qfai could actually have produced is
 * treated as scaffolding.
 *
 * "Could actually have produced" includes the version and variant nibbles.
 * `randomUUID()` emits RFC 4122 version 4 exclusively, so the third group
 * always opens with `4` and the fourth with `8`, `9`, `a` or `b`. Accepting any
 * hex there let a name qfai can never generate —
 * `.qfai-staging-00000000-0000-0000-0000-000000000000.tmp`, the nil UUID — pass
 * as scaffolding, which is a permanent normative file that `QFAI-ASSETS-005`
 * would never see.
 */
const ASSISTANT_STAGING_BASENAME_PATTERN = new RegExp(
  `^${escapeRegExp(ASSISTANT_STAGING_PREFIX)}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.tmp$`,
  "i",
);

function isUngovernedManagementFile(basename: string): boolean {
  return (
    UNGOVERNED_MANAGEMENT_BASENAMES.has(basename) ||
    ASSISTANT_STAGING_BASENAME_PATTERN.test(basename)
  );
}

/**
 * True when `key` is a lock key qfai could itself have written: a governed
 * layer followed by one or more ordinary path segments, with no traversal.
 *
 * The lock is checked in with the project, so its keys are attacker- or
 * accident-supplied input, not qfai's own output. A key of
 * `../../package.json` joined against the assistant root resolves outside the
 * governed tree entirely, and `qfai init --force` retires — deletes — any
 * recorded path whose content still matches its recorded hash. Keys are
 * therefore validated at the parse boundary, so neither `init` nor `validate`
 * can be handed a path to act on that qfai does not own.
 *
 * Nesting is accepted because the governed layers are `constitution/**` and
 * `catalog/**`: a project that adds `constitution/custom/rule.md` is adding a
 * normative file, and a key shape that stopped at one level put that file
 * outside the record — and outside `QFAI-ASSETS-005` with it.
 */
export function isGovernedAssistantLockKey(key: string): boolean {
  const [layer, ...rest] = key.split("/");
  if (layer === undefined || rest.length === 0) {
    return false;
  }
  const layers: readonly string[] = GOVERNED_ASSISTANT_LAYERS;
  if (!layers.includes(layer)) {
    return false;
  }
  if (!rest.every(isGovernedPathSegment)) {
    return false;
  }
  // Inside the tree is not the same as owned by qfai. `collectGovernedAssistantFiles`
  // excludes `*.local.md` overlays and housekeeping dotfiles because they are the
  // project's, and a lock is project-supplied input — so a key naming one passed
  // every structural check, sat in `previous` without ever being in `shipped`, and
  // `qfai init --force` retired it: the sanctioned extension point, deleted as a
  // withdrawn qfai asset. Ownership is decided at the same boundary as containment.
  const basename = rest[rest.length - 1] ?? "";
  return !isUngovernedManagementFile(basename) && !isLocalAssistantOverlay(basename);
}

function isGovernedPathSegment(segment: string): boolean {
  if (segment.length === 0 || segment === "." || segment === "..") {
    return false;
  }
  // `\` is a separator on Windows, and `\0` truncates a path at the syscall
  // boundary on POSIX. Neither can appear in a name qfai ships.
  if (/[\\/\0]/.test(segment)) {
    return false;
  }
  // Windows strips trailing dots and whitespace from a path component, so
  // `test-layers.md.` opens the very file `test-layers.md` names while
  // recording under a key that is not the shipped one — which made the real
  // rule read as withdrawn and had `--force` delete it.
  return !/[.\s]$/u.test(segment);
}

/**
 * True when `key` is not a shipped path but folds onto one under the
 * case-insensitive comparison a default Windows or macOS filesystem applies.
 *
 * A lock is project-supplied, so a key of `catalog/TEST-LAYERS.MD` paired with
 * the real file's hash passes every structural check while being a different
 * key from the shipped `catalog/test-layers.md`. `retireWithdrawnGovernedAssets`
 * then reads it as a rule the release withdrew, finds the content still
 * matching, and `qfai init --force` deletes the shipped file the alias
 * actually named. Such a key is dropped rather than acted on — on every
 * platform, so a lock committed from Windows behaves the same on Linux.
 */
export function aliasesShippedGovernedAsset(
  key: string,
  shipped: Readonly<Record<string, string>>,
): boolean {
  if (Object.hasOwn(shipped, key)) {
    return false;
  }
  const folded = key.toLowerCase();
  return Object.keys(shipped).some((candidate) => candidate.toLowerCase() === folded);
}

/**
 * True when every directory below `projectRoot`, down to the parent of
 * `relative`, is a real directory in the project — never a symlink, junction or
 * other reparse point.
 *
 * Only the final entry of a governed path was checked before, so a checkout
 * that left `constitution/` or `catalog/` itself pointing at a directory
 * outside the repository put every write and every `--force` retire inside
 * that directory: `rename` replaces the entry it is given, but the entry was
 * already out of the tree. Each parent is therefore inspected with `lstat`,
 * which reports a link as a link instead of resolving through it.
 *
 * The walk starts at the **project** root, and `relative` is relative to it —
 * `.qfai/assistant/constitution/quality.md`, not `constitution/quality.md`.
 * Starting at the assistant root left the components above it unchecked, and
 * `lstat` only declines to resolve the *final* component: with `.qfai` a
 * symlink out of the repository, `lstat(.qfai/assistant)` resolved through it
 * and reported the external directory as real, which is the whole answer this
 * function exists to refuse.
 *
 * `projectRoot` itself is not inspected. It is the path the caller was pointed
 * at, so reaching it through a symlink is how the user addressed their own
 * project, not an escape from it.
 *
 * An absent directory answers true: `init` creates the governed layers itself,
 * and creating one is not a way out of the tree. A parent that cannot be
 * inspected at all answers false — what cannot be checked must not be written
 * into.
 */
export async function hasRealGovernedAssistantParents(
  projectRoot: string,
  relative: string,
): Promise<boolean> {
  const segments = relative.split("/");
  segments.pop();
  let current = projectRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!(await isRealDirectoryOrAbsent(current))) {
      return false;
    }
  }
  return true;
}

async function isRealDirectoryOrAbsent(target: string): Promise<boolean> {
  try {
    return (await lstat(target)).isDirectory();
  } catch (error: unknown) {
    return isEnoent(error);
  }
}

/**
 * Hash of one assistant asset.
 *
 * CRLF is normalised first: the same file checked out on Windows and on Linux
 * differs byte for byte through `core.autocrlf` alone, and a provenance record
 * that reports every Windows checkout as a local fork reports nothing at all.
 */
export function hashAssistantAssetText(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/**
 * Hash of the file at `filePath`, or `null` when no readable regular file is
 * there. Absence is a legitimate answer here — the caller compares three
 * possibly-missing hashes — so it is reported rather than thrown.
 *
 * The read is pinned to the inode that is opened, non-blocking where the
 * platform has it, and refused unless `fstat` on that handle says regular
 * file. A plain `readFile` on a governed path that a checkout left as a FIFO
 * blocks until a writer appears, which hung `qfai validate` and `qfai init`
 * with no diagnostic; a directory or a device node is not a governed asset
 * either.
 *
 * The final component is refused when it is a **symlink**, which is what makes
 * `missing` mean what it says. `open` and the handle's `stat` both resolve
 * through a link, so a governed filename pointing at a regular file outside the
 * repository hashed to that file's bytes: if they happened to be the shipped
 * bytes the validator reported `shipped`, `init` recorded provenance, and the
 * link stayed — the rule qfai vouched for then lived outside the checkout and
 * could change without the checkout differing at all. `O_NOFOLLOW` refuses it
 * at the syscall where the platform defines the flag, and an `lstat` on the
 * pathname is the portable backstop for the platforms that do not.
 *
 * `allowSymlink` exists for the **shipped** side only: `.qfai/assistant/**` in
 * the project is a checkout this record makes claims about, while the installed
 * package's own asset tree is whatever the package manager laid down, and a
 * store that materialises a file as a link there is not a governance fault.
 *
 * The content is hashed in fixed-size chunks rather than buffered whole.
 * Refusing special files caps nothing about a regular one, so a checkout that
 * left a multi-gigabyte file at a governed path made `qfai validate` and
 * `qfai init` allocate it as a single string and die of it. A size ceiling
 * would have answered `null` instead — reporting a real, readable file as
 * missing — so the read streams and the newline normalisation carries a
 * one-byte `\r` across the chunk boundary.
 */
export async function hashAssistantAssetFile(
  filePath: string,
  options: { allowSymlink?: boolean } = {},
): Promise<string | null> {
  const allowSymlink = options.allowSymlink === true;
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, allowSymlink ? OPEN_READ_FLAGS : OPEN_READ_NOFOLLOW_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile()) {
      return null;
    }
    if (!allowSymlink && (await lstat(filePath)).isSymbolicLink()) {
      // Only reachable where `O_NOFOLLOW` is not defined (Windows). The open
      // already succeeded, so this is a second look at the pathname rather than
      // at the handle — the narrow race it leaves is still strictly better than
      // treating every link as a regular file.
      return null;
    }
    return await hashHandleWithNormalisedNewlines(handle);
  } catch {
    return null;
  } finally {
    try {
      await handle?.close();
    } catch {
      // The hash is already decided; a close fault must not replace it.
    }
  }
}

const HASH_CHUNK_BYTES = 64 * 1024;
const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN_BYTES = Buffer.from([CARRIAGE_RETURN]);

/**
 * Streaming equivalent of `hashAssistantAssetText`: sha256 over the content
 * with every `\r\n` collapsed to `\n`.
 *
 * The two agree byte for byte on UTF-8 content, which is what these layers
 * hold — `\r` and `\n` cannot appear inside a multi-byte UTF-8 sequence, so
 * dropping the `\r` of a `\r\n` pair on the byte stream is the same edit the
 * string form makes. A `\r` that lands on the last byte of a chunk is held
 * back until the next chunk says whether an `\n` follows it.
 */
async function hashHandleWithNormalisedNewlines(handle: FileHandle): Promise<string> {
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
  let pendingCarriageReturn = false;
  for (;;) {
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
    if (bytesRead === 0) {
      break;
    }
    const chunk = buffer.subarray(0, bytesRead);
    if (pendingCarriageReturn) {
      pendingCarriageReturn = false;
      if (chunk[0] !== LINE_FEED) {
        digest.update(CARRIAGE_RETURN_BYTES);
      }
    }
    // A trailing `\r` is deferred: only the next chunk knows whether it opens
    // a `\r\n` pair or stands on its own.
    const end = chunk[bytesRead - 1] === CARRIAGE_RETURN ? bytesRead - 1 : bytesRead;
    pendingCarriageReturn = end !== bytesRead;
    let start = 0;
    for (
      let at = chunk.indexOf(CARRIAGE_RETURN);
      at !== -1 && at < end;
      at = chunk.indexOf(CARRIAGE_RETURN, at + 1)
    ) {
      if (chunk[at + 1] === LINE_FEED) {
        digest.update(chunk.subarray(start, at));
        start = at + 1;
      }
    }
    digest.update(chunk.subarray(start, end));
  }
  if (pendingCarriageReturn) {
    digest.update(CARRIAGE_RETURN_BYTES);
  }
  return digest.digest("hex");
}

/**
 * Read-only, non-blocking where the platform defines it. Opening a FIFO for
 * reading otherwise waits for a writer. Windows has neither `O_NONBLOCK` nor
 * FIFOs in this sense.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

/**
 * {@link OPEN_READ_FLAGS} plus a refusal to traverse a final-component symlink,
 * where the platform defines one. Windows has no `O_NOFOLLOW`, so the caller's
 * `lstat` backstop is what answers there.
 */
const OPEN_READ_NOFOLLOW_FLAGS =
  typeof constants.O_NOFOLLOW === "number"
    ? OPEN_READ_FLAGS | constants.O_NOFOLLOW
    : OPEN_READ_FLAGS;

/**
 * POSIX paths, relative to the assistant root, of every governed file under
 * `assistantRoot`. Overlays are excluded: they are project property.
 *
 * The walk descends: the governed layers are `constitution/**` and
 * `catalog/**`, so a project that puts a normative file in
 * `constitution/custom/rule.md` has added one. Skipping subdirectories left
 * that file out of the record and out of `QFAI-ASSETS-005` — a directory was
 * all it took to add an unreported rule beside the ones qfai owns.
 *
 * Only real directories are descended into. A symlinked directory is not part
 * of the governed tree, and following one would walk out of the project. That
 * holds for the layer roots themselves, which `readdir` resolved like any other
 * path: a checkout that left `constitution/` pointing outside the repository
 * had `qfai validate` walk and hash whatever was there, pass in silence if it
 * happened to match the release, and take as long as that tree was big. A layer
 * root that is not a real directory throws rather than reading — the caller
 * reports that the layers cannot be compared, which is the honest answer.
 *
 * This walks the **project's** tree only. What the release ships is
 * {@link SHIPPED_GOVERNED_ASSISTANT_FILES}, frozen at build time, because a walk
 * cannot tell a withdrawn rule from one an incomplete install dropped.
 */
export async function collectGovernedAssistantFiles(assistantRoot: string): Promise<string[]> {
  const found: string[] = [];
  for (const layer of GOVERNED_ASSISTANT_LAYERS) {
    await collectGovernedFilesUnder(path.join(assistantRoot, layer), layer, found, true);
  }
  return found;
}

async function collectGovernedFilesUnder(
  directory: string,
  prefix: string,
  found: string[],
  isLayerRoot = false,
): Promise<void> {
  // Nested entries were classified by `readdir` itself, which does not resolve
  // links — only a scan root arrives here unexamined.
  if (isLayerRoot && !(await isRealDirectoryOrAbsent(directory))) {
    throw new Error(
      `${directory} は実ディレクトリではないため、governed layer として走査できません（symlink / junction 等の可能性があります）。`,
    );
  }
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (isEnoent(error)) {
      // A project may legitimately not have a layer: one that never ran `init`,
      // or one still on the pre-recut layout. The validator decides what an
      // absent layer means from the provenance record; the walk only reports
      // what is there.
      return;
    }
    throw error;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await collectGovernedFilesUnder(path.join(directory, entry.name), relative, found);
      continue;
    }
    if (isUngovernedManagementFile(entry.name) || isLocalAssistantOverlay(entry.name)) {
      continue;
    }
    found.push(relative);
  }
}

/**
 * Governed-file hashes of the release currently installed.
 *
 * The set of paths comes from {@link SHIPPED_GOVERNED_ASSISTANT_FILES}, which is
 * frozen when the package is built and compiled into `dist/`, **not** from a
 * walk of the installed tree. Discovering it by walking could not distinguish
 * the two ways a path can be absent from `assets/`: a rule the release withdrew,
 * and a rule the install lost. Both simply failed to appear, and every entry the
 * lock holds that the shipped set omits is what `qfai init --force` retires —
 * deletes — so one missing file in an incomplete extraction took the project's
 * own healthy copy of that rule with it. Against the manifest the two are
 * different answers: a named path with no readable file is an incomplete
 * install and throws here, while a withdrawal is simply a path the manifest no
 * longer names.
 *
 * Fail-closed throughout: a shipped file whose content cannot be hashed throws
 * instead of narrowing the result, because an empty or partial shipped set is
 * not "this release ships less".
 *
 * Symlinks are permitted on this side alone. The project's `.qfai/assistant/**`
 * is a checkout whose governed paths must be real files; the installed package
 * is whatever the package manager materialised, and a store that links a file
 * into place there is not a governance fault.
 */
export async function buildShippedAssistantHashes(
  assistantAssetsRoot: string,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const relative of SHIPPED_GOVERNED_ASSISTANT_FILES) {
    const hash = await hashAssistantAssetFile(
      path.join(assistantAssetsRoot, ...relative.split("/")),
      { allowSymlink: true },
    );
    if (hash === null) {
      throw new Error(
        `qfai の配布アセット ${relative} を読み取れませんでした（インストールが不完全です）。`,
      );
    }
    hashes[relative] = hash;
  }
  return hashes;
}

export function assistantAssetsLockPath(assistantRoot: string): string {
  return path.join(assistantRoot, ASSISTANT_ASSETS_LOCK_BASENAME);
}

/**
 * The recorded provenance, or `null` when the project has none.
 *
 * A malformed or unreadable lock reads as `null` rather than throwing: every
 * project initialised before this record existed has no lock, and a project
 * that corrupted one is in the same position as a project that never had one.
 * Refusing to validate in either case would trade a warning for a crash.
 *
 * The read is the same pinned, non-blocking, regular-file-only read the
 * governed files themselves get. A plain `readFile` here waited for a writer
 * when the checkout left `.assets.lock.json` as a FIFO — or a symlink to one —
 * which hung `qfai init` and `qfai validate` outright, with no diagnostic and
 * no timeout. An oversized lock is refused for the same reason: this file is a
 * hash table qfai wrote, not arbitrary project input to buffer whole.
 */
export async function readAssistantAssetsLock(
  assistantRoot: string,
): Promise<AssistantAssetsLock | null> {
  const status = await readAssistantAssetsLockStatus(assistantRoot);
  return status.kind === "lock" ? status.lock : null;
}

/**
 * The same read, with "there is no record" told apart from "the record is there
 * and unusable".
 *
 * `readAssistantAssetsLock` folds both to `null`, which is right for `init` —
 * either way it has nothing to carry forward — and wrong for `validate`. A
 * migrated project whose lock became malformed reads as never-initialised, and
 * every absence the record would have made reportable goes quiet: the layer
 * check has no recorded layers, and the two existence probes are satisfied by
 * the legacy fallback. Deleting a whole governed layer was silent in exactly
 * that state. The caller reports the unusable record instead.
 */
export type AssistantAssetsLockStatus =
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable"; readonly reason: string }
  | { readonly kind: "lock"; readonly lock: AssistantAssetsLock };

export async function readAssistantAssetsLockStatus(
  assistantRoot: string,
): Promise<AssistantAssetsLockStatus> {
  let handle: FileHandle | undefined;
  let raw: string;
  try {
    handle = await open(assistantAssetsLockPath(assistantRoot), OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile()) {
      return { kind: "unreadable", reason: "通常ファイルではありません" };
    }
    if (pinned.size > MAX_ASSISTANT_ASSETS_LOCK_BYTES) {
      return { kind: "unreadable", reason: "上限サイズを超えています" };
    }
    raw = await handle.readFile("utf-8");
  } catch (error: unknown) {
    return isEnoent(error)
      ? { kind: "absent" }
      : { kind: "unreadable", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      await handle?.close();
    } catch {
      // The parse below owns the answer; a close fault must not replace it.
    }
  }
  let parsed: AssistantAssetsLock | null;
  try {
    parsed = parseAssistantAssetsLock(JSON.parse(raw));
  } catch {
    return { kind: "unreadable", reason: "JSON として読めません" };
  }
  return parsed === null
    ? { kind: "unreadable", reason: "provenance record の形をしていません" }
    : { kind: "lock", lock: parsed };
}

/**
 * Ceiling on `.assets.lock.json`. Two governed layers of markdown produce a
 * few kilobytes of sha256 entries; 4 MiB is orders of magnitude of headroom
 * and still refuses a file that is not this record at all.
 */
const MAX_ASSISTANT_ASSETS_LOCK_BYTES = 4 * 1024 * 1024;

function parseAssistantAssetsLock(value: unknown): AssistantAssetsLock | null {
  if (typeof value !== "object" || value === null || !("files" in value)) {
    return null;
  }
  const files = value.files;
  if (typeof files !== "object" || files === null || Array.isArray(files)) {
    return null;
  }
  const parsed: Record<string, string> = {};
  for (const [key, entry] of Object.entries(files)) {
    // Keys that qfai could not have written are dropped, not honoured: the
    // lock is project-supplied input and every consumer joins these keys onto
    // the assistant root before reading — or, under `--force`, deleting.
    if (typeof entry === "string" && isGovernedAssistantLockKey(key)) {
      parsed[key] = entry;
    }
  }
  return { files: parsed };
}

/**
 * Writes the record by creating a fresh file beside it and renaming over the
 * path.
 *
 * A plain `writeFile` follows a symlink: a checkout that leaves
 * `.assets.lock.json` pointing anywhere — a file outside the repository, or
 * another governed file inside it — had that target overwritten with lock JSON
 * by an ordinary `qfai init`, no `--force` needed. `rename` replaces the link
 * itself, and the temporary is created with `wx` so it can never land on
 * something already there either.
 */
export async function writeAssistantAssetsLock(
  assistantRoot: string,
  lock: AssistantAssetsLock,
): Promise<void> {
  const ordered: Record<string, string> = {};
  for (const key of Object.keys(lock.files).sort((a, b) => a.localeCompare(b))) {
    const value = lock.files[key];
    // Same gate as the read side: a record qfai writes may only name paths
    // qfai owns, so a key that survived from anywhere else cannot be laundered
    // into a well-formed lock by a round trip through `init`.
    if (value !== undefined && isGovernedAssistantLockKey(key)) {
      ordered[key] = value;
    }
  }
  const target = assistantAssetsLockPath(assistantRoot);
  const staging = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(staging, `${JSON.stringify({ files: ordered }, null, 2)}\n`, {
      encoding: "utf-8",
      flag: "wx",
    });
    await rename(staging, target);
  } catch (error: unknown) {
    await rm(staging, { force: true }).catch(() => {
      // Best effort: the write fault below is the one worth reporting.
    });
    throw error;
  }
}

/**
 * How one vendored governed file stands against the installed release.
 *
 * - `shipped` — byte-identical to what this release ships.
 * - `stale` — still the content qfai wrote, but an older release wrote it.
 *   Refreshable without a merge decision.
 * - `forked` — matches neither the record nor the release: someone edited it,
 *   or it was written by a release whose provenance was never recorded.
 * - `unshipped` — present in the project but absent from the release, and not
 *   an overlay.
 * - `missing` — shipped by the release, but no readable regular file is at
 *   that path in the project: deleted, or replaced by a directory or a special
 *   file. Deleting a governed rule was the one way to make it stop applying
 *   without anything saying so.
 */
export type AssistantAssetStatus = "shipped" | "stale" | "forked" | "unshipped" | "missing";

export function classifyAssistantAsset(
  currentHash: string | null,
  shippedHash: string | undefined,
  recordedHash: string | undefined,
): AssistantAssetStatus {
  if (shippedHash === undefined) {
    return "unshipped";
  }
  if (currentHash === null) {
    return "missing";
  }
  if (currentHash === shippedHash) {
    return "shipped";
  }
  if (recordedHash !== undefined && currentHash === recordedHash) {
    return "stale";
  }
  return "forked";
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

/**
 * `qfai design refreeze` — record an intended edit to `DESIGN.md` everywhere
 * its hash is kept.
 *
 * Three files carry the hash of the frozen `DESIGN.md`, and validation fails
 * until all three agree with the file:
 *
 * - the lock, `<contractsDir>/design/DESIGN.md.lock.yaml`, whose
 *   `designMdSha256` and `frozenAt` describe the freeze;
 * - the token mirror, `design-system.yaml`, a verbatim copy of `visual` that
 *   also records the hash;
 * - the handoff, `prototype-handoff.yaml`, which names the hash the prototype
 *   was built against.
 *
 * The mirror and the handoff exist only once prototyping has handed off, so a
 * missing one is skipped rather than created. The lock is not: the first freeze
 * belongs to the `/qfai-sdd` Phase 0 step, which also enumerates its
 * `schemaTokens`, so a project without a lock is refused.
 *
 * Every field this command does not own is kept as written, comments included.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { type Document, isMap, isNode, isScalar, parseDocument, Scalar } from "yaml";

import { loadConfig } from "../../core/config.js";
import {
  type DesignMd,
  hashDesignMd,
  isUnreplacedDesignMdSample,
  parseDesignMd,
} from "../../core/design/designMd.js";
import { EXIT_CODES } from "../lib/exitCodes.js";
import { error, info } from "../lib/logger.js";

export type DesignRefreezeOptions = {
  readonly root: string;
  /** Report the files that are out of date and write nothing. */
  readonly check: boolean;
  /** Clock for `frozenAt`; injectable so a test can pin it. */
  readonly now?: () => Date;
};

const PREFIX = "qfai design refreeze:";
const DESIGN_MD_REL = "DESIGN.md";
const SHA_KEY = "designMdSha256";

type YamlFile = { readonly rel: string; readonly abs: string; readonly doc: Document };

type ReadResult<T> = { readonly ok: T } | { readonly refusal: string };

/** One file this run would rewrite, and the fields that differ. */
type Update = {
  readonly file: YamlFile;
  readonly fields: readonly string[];
  readonly apply: () => void;
};

/**
 * Returns the process exit code: `0` when every file was updated or already
 * current, `1` when `--check` found a file out of date, `2` when an input is
 * missing or unusable.
 */
export async function runDesignRefreeze(options: DesignRefreezeOptions): Promise<number> {
  const source = await readDesignMd(options.root);
  if ("refusal" in source) {
    error(`${PREFIX} ${source.refusal}`);
    return EXIT_CODES.inputError;
  }
  const { text, design } = source.ok;
  const sha = hashDesignMd(text);

  const files = await readHashFiles(options.root);
  if ("refusal" in files) {
    error(`${PREFIX} ${files.refusal}`);
    return EXIT_CODES.inputError;
  }

  const frozenAt = formatFrozenAt((options.now ?? (() => new Date()))());
  const updates = planUpdates(files.ok, sha, design, frozenAt);
  if (updates.length === 0) {
    info(`${PREFIX} nothing to update; every file records the current DESIGN.md hash.`);
    return EXIT_CODES.ok;
  }

  if (options.check) {
    for (const update of updates) {
      info(`out of date: ${update.file.rel} (${update.fields.join(", ")})`);
    }
    info("Run `qfai design refreeze` to update them.");
    return EXIT_CODES.findings;
  }

  // The lock goes last. Every file is compared with DESIGN.md itself, not with
  // the lock, so a run that stops part-way is finished by running it again.
  for (const update of updates) {
    update.apply();
    await writeFile(update.file.abs, update.file.doc.toString(), "utf-8");
    info(`updated ${update.file.rel} (${update.fields.join(", ")})`);
  }
  return EXIT_CODES.ok;
}

async function readDesignMd(
  root: string,
): Promise<ReadResult<{ readonly text: string; readonly design: DesignMd }>> {
  const text = await readOptional(path.join(root, DESIGN_MD_REL));
  if (text === null) {
    return { refusal: `${DESIGN_MD_REL} not found at the project root.` };
  }
  if (isUnreplacedDesignMdSample(text)) {
    return {
      refusal: `${DESIGN_MD_REL} is still the qfai sample brand. Replace it with this product's brand before freezing it.`,
    };
  }
  const parsed = parseDesignMd(text);
  if ("error" in parsed) {
    const where = parsed.error.path.length > 0 ? `${parsed.error.path}: ` : "";
    return {
      refusal: `${DESIGN_MD_REL} does not parse (${where}${parsed.error.message}). Fix it before freezing it.`,
    };
  }
  return { ok: { text, design: parsed.data } };
}

type HashFiles = {
  readonly lock: YamlFile;
  readonly mirror: YamlFile | null;
  readonly handoff: YamlFile | null;
};

async function readHashFiles(root: string): Promise<ReadResult<HashFiles>> {
  const { config } = await loadConfig(root);
  const designDir = path.join(config.paths.contractsDir, "design");
  const lockRel = path.join(designDir, "DESIGN.md.lock.yaml");
  const lock = await readYamlFile(root, lockRel);
  const mirror = await readYamlFile(root, path.join(designDir, "design-system.yaml"));
  const handoff = await readYamlFile(root, path.join(designDir, "prototype-handoff.yaml"));
  for (const read of [lock, mirror, handoff]) {
    if (read.kind === "refused") return { refusal: read.refusal };
  }
  if (lock.kind !== "ok") {
    return {
      refusal: `${toPosix(lockRel)} not found. The first freeze is made by /qfai-sdd Phase 0; this command only re-freezes.`,
    };
  }
  return { ok: { lock: lock.file, mirror: fileOrNull(mirror), handoff: fileOrNull(handoff) } };
}

type YamlRead =
  | { readonly kind: "missing" }
  | { readonly kind: "refused"; readonly refusal: string }
  | { readonly kind: "ok"; readonly file: YamlFile };

function fileOrNull(read: YamlRead): YamlFile | null {
  return read.kind === "ok" ? read.file : null;
}

async function readYamlFile(root: string, rel: string): Promise<YamlRead> {
  const abs = path.join(root, rel);
  const text = await readOptional(abs);
  if (text === null) return { kind: "missing" };
  const doc = parseDocument(text);
  if (doc.errors.length > 0 || !isMap(doc.contents)) {
    return {
      kind: "refused",
      refusal: `${toPosix(rel)} is not a YAML mapping. Fix it before re-freezing.`,
    };
  }
  return { kind: "ok", file: { rel: toPosix(rel), abs, doc } };
}

async function readOptional(abs: string): Promise<string | null> {
  try {
    return await readFile(abs, "utf-8");
  } catch (thrown: unknown) {
    if (thrown instanceof Error && "code" in thrown && thrown.code === "ENOENT") return null;
    throw thrown;
  }
}

function planUpdates(files: HashFiles, sha: string, design: DesignMd, frozenAt: string): Update[] {
  const updates: Update[] = [];
  const { lock, mirror, handoff } = files;

  if (mirror !== null) {
    const mirrorUpdate = planMirrorUpdate(mirror, sha, design);
    if (mirrorUpdate !== null) updates.push(mirrorUpdate);
  }

  if (handoff !== null && !recordsSha(handoff, sha)) {
    updates.push({
      file: handoff,
      fields: [SHA_KEY],
      apply: () => setString(handoff.doc, SHA_KEY, sha),
    });
  }

  if (!recordsSha(lock, sha)) {
    updates.push({
      file: lock,
      fields: [SHA_KEY, "frozenAt"],
      apply: () => {
        setString(lock.doc, SHA_KEY, sha);
        setString(lock.doc, "frozenAt", frozenAt);
      },
    });
  }
  return updates;
}

function recordsSha(file: YamlFile, sha: string): boolean {
  return readString(file.doc, SHA_KEY)?.toLowerCase() === sha;
}

/**
 * The mirror's `visual` is replaced only where the mirror has one: a file in
 * the older checklist shape carries no token copy for this command to refresh.
 * Its hash is replaced only where it records one, for the same reason.
 */
function planMirrorUpdate(mirror: YamlFile, sha: string, design: DesignMd): Update | null {
  // A JSON round trip drops the optional keys the parser left undefined, so
  // the comparison and the written copy match what DESIGN.md authored.
  const visual: unknown = JSON.parse(JSON.stringify(design.visual));
  const fields: string[] = [];
  if (mirror.doc.has(SHA_KEY) && !recordsSha(mirror, sha)) fields.push(SHA_KEY);
  const current: unknown = mirror.doc.get("visual");
  if (isNode(current) && !isDeepStrictEqual(current.toJS(mirror.doc), visual)) {
    fields.push("visual");
  }
  if (fields.length === 0) return null;
  return {
    file: mirror,
    fields,
    apply: () => {
      if (fields.includes(SHA_KEY)) setString(mirror.doc, SHA_KEY, sha);
      if (fields.includes("visual")) mirror.doc.set("visual", mirror.doc.createNode(visual));
    },
  };
}

function readString(doc: Document, key: string): string | null {
  const value: unknown = doc.get(key);
  return typeof value === "string" ? value : null;
}

/** Keep the existing scalar node, and so its quoting, where there is one. */
function setString(doc: Document, key: string, value: string): void {
  const node: unknown = doc.get(key, true);
  if (isScalar(node)) {
    node.value = value;
    return;
  }
  const scalar = new Scalar(value);
  scalar.type = Scalar.QUOTE_DOUBLE;
  doc.set(key, scalar);
}

/** UTC, to the second — the form the lock template shows. */
function formatFrozenAt(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function toPosix(rel: string): string {
  return rel.split(path.sep).join("/");
}

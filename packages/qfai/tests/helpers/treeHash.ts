import { createHash, type Hash } from "node:crypto";
import { readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

/** One byte that says what an entry is, so a directory never encodes like an empty file. */
const ENTRY_TYPE = { directory: "d", file: "f", link: "l" } as const;

/** Feed `bytes` into the hash after its byte length, so no field can run into the next one. */
function field(hash: Hash, bytes: Buffer): void {
  const length = Buffer.alloc(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length);
  hash.update(bytes);
}

/**
 * A digest of every entry under `root`: its type, its path relative to `root` with `/` separators,
 * and for a file its bytes or for a link its target. Each path and each body goes in after its byte
 * length, so two different trees cannot feed the hash the same input.
 */
export async function treeHash(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      const relative = Buffer.from(path.relative(root, target).split(path.sep).join("/"), "utf8");
      if (entry.isDirectory()) {
        hash.update(ENTRY_TYPE.directory);
        field(hash, relative);
        await visit(target);
      } else if (entry.isSymbolicLink()) {
        hash.update(ENTRY_TYPE.link);
        field(hash, relative);
        field(hash, Buffer.from(await readlink(target), "utf8"));
      } else {
        hash.update(ENTRY_TYPE.file);
        field(hash, relative);
        field(hash, await readFile(target));
      }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

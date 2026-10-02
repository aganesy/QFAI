import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../shared/assets.js";

/** The package-relative directory the routing defaults live in. */
export const ROUTING_DEFAULTS_REL = "packages/qfai/assets/defaults/agent-routing";

/** One routing defaults file, unparsed, so each reader keeps its own error handling. */
export type RoutingDefaultsFile = {
  /** Path from the repository root, for findings and messages. */
  rel: string;
  text: string;
};

/** Absolute path of the directory the installed package keeps its routing defaults in. */
export function routingDefaultsDir(): string {
  return path.resolve(getInitAssetsDir(), "..", "defaults", "agent-routing");
}

/**
 * Every routing defaults file, in the order the set is read as one `routing:` list.
 *
 * Split by owner so that no file outgrows the asset line ceiling as steps are
 * added. Sorted by name rather than taken in listing order, which differs by
 * file system, so every reader sees the entries in the same order.
 */
export async function readRoutingDefaultsFiles(): Promise<RoutingDefaultsFile[]> {
  const dir = routingDefaultsDir();
  const names = (await readdir(dir)).filter((name) => name.endsWith(".yml")).sort();
  return Promise.all(
    names.map(async (name) => ({
      rel: `${ROUTING_DEFAULTS_REL}/${name}`,
      text: await readFile(path.join(dir, name), "utf-8"),
    })),
  );
}

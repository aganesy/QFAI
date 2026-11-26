import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Setup uses this before dependencies are installed. Each supported alternative
// includes its lower bound, so the least bound is also the union's lowest version.
const VERSION = /^(?:>=|\^)?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/u;

/** @param {string} range */
export function nodeEngineFloor(range) {
  const versions = range.split("||").map((alternative) => {
    const version = VERSION.exec(alternative.trim())?.[1];
    const [major, minor, patch] = version?.split(".").map(Number) ?? [];
    if (version === undefined || ![major, minor, patch].every(Number.isSafeInteger)) {
      throw new Error("engines.node must use X.Y.Z, >=X.Y.Z or ^X.Y.Z alternatives.");
    }
    return { version, major, minor, patch };
  });

  versions.sort((a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch);
  return versions[0].version;
}

/** @param {string} file */
function readEngineRange(file) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("The manifest must be readable JSON.");
  }
  const range = manifest?.engines?.node;
  if (typeof range !== "string") throw new Error("The manifest must declare engines.node.");
  return range;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[2];
    if (file === undefined) throw new Error("Pass a manifest path.");
    process.stdout.write(`${nodeEngineFloor(readEngineRange(file))}\n`);
  } catch (cause) {
    if (!(cause instanceof Error)) throw cause;
    console.error(`Cannot resolve the Node.js floor. ${cause.message}`);
    process.exitCode = 1;
  }
}

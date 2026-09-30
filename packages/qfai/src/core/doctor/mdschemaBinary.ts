import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getInitAssetsDir } from "../../shared/assets.js";

const CHECK_ID = "workflows.mdschemaBinary";
const TITLE = "Document-schema checker (@jackchuka/mdschema)";

/** How long the probe waits for `mdschema --help` before calling the binary unusable. */
const PROBE_TIMEOUT_MS = 15_000;

export type MdschemaBinaryCheck = {
  id: typeof CHECK_ID;
  severity: "ok" | "error";
  title: string;
  message: string;
  details: { reason?: string };
};

type MdschemaCommand = { command: string; args: string[] };
type FindCommand = (from: string) => unknown;

/**
 * The resolver the shipped checker script uses, so doctor asks for the binary
 * the lane and `qfai validate` would run rather than a path of its own.
 */
async function loadFindCommand(): Promise<FindCommand | string> {
  const file = path.join(getInitAssetsDir(), "..", "scripts", "check-mdschema.mjs");
  let loaded: unknown;
  try {
    loaded = await import(pathToFileURL(file).href);
  } catch (error) {
    return `the checker ${file} could not be loaded: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (typeof loaded === "object" && loaded !== null && "findMdschemaCommand" in loaded) {
    const find = loaded.findMdschemaCommand;
    if (typeof find === "function") {
      return (from): unknown => Reflect.apply(find, undefined, [from]);
    }
  }
  return `the checker ${file} exports no findMdschemaCommand function`;
}

function isCommand(value: unknown): value is MdschemaCommand {
  return (
    typeof value === "object" &&
    value !== null &&
    "command" in value &&
    typeof value.command === "string" &&
    "args" in value &&
    Array.isArray(value.args) &&
    value.args.every((arg) => typeof arg === "string")
  );
}

/** The first line the binary printed, or why it could not be started at all. */
function failureReason(result: ReturnType<typeof spawnSync>): string {
  if (result.error !== undefined) {
    return result.error.message;
  }
  const printed = `${String(result.stderr)}\n${String(result.stdout)}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
  return printed ?? `it exited with status ${String(result.status)}`;
}

function failure(reason: string, fix: string): MdschemaBinaryCheck {
  return {
    id: CHECK_ID,
    severity: "error",
    title: TITLE,
    message: `the mdschema binary does not run: ${reason}. ${fix}`,
    details: { reason },
  };
}

const INSTALL_FIX =
  "It arrives as an optional dependency of @jackchuka/mdschema, so install without omitting optional dependencies. " +
  "Where the platform package is missing, the package's install script downloads the binary instead: " +
  "approve it with `npm approve-scripts` for npm, or list @jackchuka/mdschema under `onlyBuiltDependencies` for pnpm.";

/**
 * Whether the document-schema checker's binary resolves and runs.
 *
 * The document-schema lane and `qfai validate` both run `mdschema`. A present
 * workflow file says nothing about whether the program behind it can start, so
 * this runs `mdschema --help`, which reads no document and changes nothing.
 */
export async function checkMdschemaBinary(root: string): Promise<MdschemaBinaryCheck> {
  const find = await loadFindCommand();
  if (typeof find === "string") {
    return failure(find, INSTALL_FIX);
  }
  const command = find(root);
  if (!isCommand(command)) {
    return failure(
      "no @jackchuka/mdschema installation was found",
      "qfai depends on it, so run your package manager's install",
    );
  }
  const result = spawnSync(command.command, [...command.args, "--help"], {
    encoding: "utf-8",
    timeout: PROBE_TIMEOUT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined || result.status !== 0) {
    return failure(failureReason(result), INSTALL_FIX);
  }
  return {
    id: CHECK_ID,
    severity: "ok",
    title: TITLE,
    message: "the mdschema binary resolves and runs",
    details: {},
  };
}

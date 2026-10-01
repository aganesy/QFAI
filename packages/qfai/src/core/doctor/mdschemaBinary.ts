import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getInitAssetsDir } from "../../shared/assets.js";

const CHECK_ID = "workflows.mdschemaBinary";
const TITLE = "Document-schema checker (@jackchuka/mdschema)";

/**
 * How long the probe waits for `mdschema --help` before it stops the binary and
 * calls it unusable. The stop is `SIGKILL`: a binary that ignores `SIGTERM`
 * would otherwise keep the probe waiting for ever.
 */
const PROBE_TIMEOUT_MS = 15_000;

export type MdschemaBinaryCheck = {
  id: typeof CHECK_ID;
  severity: "ok" | "error";
  title: string;
  message: string;
  details: { reason?: string };
};

type MdschemaCommand = { command: string; args: string[] };
type Finder = { find: (from: string) => unknown; from: string };

/**
 * The resolver the shipped checker script uses, with the directory it sits in.
 *
 * The search starts where the QFAI package sits rather than at the inspected
 * project's root: a checkout can track a `node_modules` of its own, and doctor
 * must not run what it finds there. With QFAI installed under the project, the
 * package's own dependency is found where the package manager placed it.
 */
async function loadFinder(): Promise<Finder | string> {
  let file = "the packaged checker";
  let loaded: unknown;
  try {
    file = path.join(getInitAssetsDir(), "..", "scripts", "check-mdschema.mjs");
    loaded = await import(pathToFileURL(file).href);
  } catch (error) {
    return `${file} could not be loaded: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (typeof loaded === "object" && loaded !== null && "findMdschemaCommand" in loaded) {
    const find = loaded.findMdschemaCommand;
    if (typeof find === "function") {
      return {
        find: (from): unknown => Reflect.apply(find, undefined, [from]),
        from: path.dirname(file),
      };
    }
  }
  return `${file} exports no findMdschemaCommand function`;
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

/** The first line the binary printed, or why it could not be started or kept running. */
function failureReason(result: ReturnType<typeof spawnSync>): string {
  if (result.error !== undefined) {
    return result.error.message;
  }
  const printed = `${String(result.stderr)}\n${String(result.stdout)}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
  if (printed !== undefined) {
    return printed;
  }
  return result.signal === null
    ? `it exited with status ${String(result.status)}`
    : `it was stopped by ${result.signal}`;
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
  "approve it with `npm approve-scripts` for npm 11.16 or later, or list @jackchuka/mdschema under `onlyBuiltDependencies` for pnpm.";

/**
 * Whether the document-schema checker's binary resolves and runs.
 *
 * `qfai validate` runs `mdschema`. A present workflow file says nothing about
 * whether the program behind it can start, so this runs `mdschema --help`,
 * which reads no document and changes nothing. The installation checked is the
 * one found from the QFAI package, not from the inspected project's root.
 */
export async function checkMdschemaBinary(
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<MdschemaBinaryCheck> {
  const finder = await loadFinder();
  if (typeof finder === "string") {
    return failure(finder, INSTALL_FIX);
  }
  const command = finder.find(finder.from);
  if (!isCommand(command)) {
    return failure("no @jackchuka/mdschema installation was found", INSTALL_FIX);
  }
  const result = spawnSync(command.command, [...command.args, "--help"], {
    encoding: "utf-8",
    timeout: timeoutMs,
    killSignal: "SIGKILL",
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

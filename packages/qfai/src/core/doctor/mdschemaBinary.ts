import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getInitAssetsDir } from "../../shared/assets.js";

const CHECK_ID = "workflows.mdschemaBinary";
const TITLE = "Document-schema checker (@jackchuka/mdschema)";

/**
 * How long the probe waits for `mdschema --help` before it stops the binary and
 * calls it unusable, and, separately, for the package's platform file to name
 * the binary it resolves. The stop is `SIGKILL`: a process that ignores
 * `SIGTERM` would otherwise keep the probe waiting for ever.
 */
const PROBE_TIMEOUT_MS = 15_000;

export type MdschemaBinaryCheck = {
  id: typeof CHECK_ID;
  severity: "ok" | "warning" | "error";
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
  "approve it with `npm approve-scripts` for npm 11.16 or later, or `pnpm approve-builds` for pnpm, " +
  "which records @jackchuka/mdschema under `allowBuilds` for pnpm 11 or later and `onlyBuiltDependencies` for pnpm 10.";

const DOWNLOAD_REASON = "the platform package is absent and the binary is the downloaded copy";

const DOWNLOAD_ONLY_MESSAGE =
  "the mdschema binary runs, but only from a copy the package's install script downloaded, because the platform package is not installed. " +
  "Install without omitting optional dependencies, so the platform package supplies the binary and the download is not needed.";

/**
 * The program a child Node process runs to ask the package's platform file
 * which binary it resolves. The file to load is its one argument; it prints the
 * path as JSON, or `null` when the file names none.
 */
const PROVENANCE_PROGRAM = [
  "const platform = require(process.argv[1]);",
  'const answer = platform !== null && typeof platform === "object" && typeof platform.getBinaryPath === "function" ? platform.getBinaryPath() : null;',
  'process.stdout.write(JSON.stringify(typeof answer === "string" ? answer : null));',
].join("\n");

/** The path the provenance program printed, or `null` when it printed none. */
function printedPath(stdout: string): string | null {
  try {
    const printed: unknown = JSON.parse(stdout);
    return typeof printed === "string" ? printed : null;
  } catch {
    return null;
  }
}

/**
 * Whether @jackchuka/mdschema resolves its binary to the copy under its own
 * `bin/` directory, which is where its install script downloads one, rather
 * than to the platform package. `entry` is the package's command file.
 *
 * The package's own `lib/platform.js` answers, so the result is the binary its
 * command file starts. That file is the package's code, so it runs in a child
 * Node process stopped at the same deadline as `mdschema --help`, never in
 * doctor's own process. A package without that file, or one whose file does
 * not answer before the deadline, gives no finding: the binary has already run.
 */
function runsFromDownload(entry: string, timeoutMs: number): boolean {
  let platformFile: string;
  try {
    platformFile = realpathSync(path.join(path.dirname(path.dirname(entry)), "lib", "platform.js"));
  } catch {
    return false;
  }
  const result = spawnSync(
    process.execPath,
    ["--input-type=commonjs", "--eval", PROVENANCE_PROGRAM, platformFile],
    {
      encoding: "utf-8",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  if (result.error !== undefined || result.status !== 0) {
    return false;
  }
  const binary = printedPath(result.stdout);
  return (
    binary !== null &&
    path.dirname(path.resolve(binary)) === path.resolve(path.dirname(platformFile), "..", "bin")
  );
}

/**
 * Whether the document-schema checker's binary resolves and runs.
 *
 * `qfai validate` runs `mdschema`. A present workflow file says nothing about
 * whether the program behind it can start, so this runs `mdschema --help`,
 * which reads no document and changes nothing. The installation checked is the
 * one found from the QFAI package, not from the inspected project's root. A
 * binary that runs only from the copy the package's install script downloaded
 * is a warning.
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
  const entry = command.args[0];
  if (entry !== undefined && runsFromDownload(entry, timeoutMs)) {
    return {
      id: CHECK_ID,
      severity: "warning",
      title: TITLE,
      message: DOWNLOAD_ONLY_MESSAGE,
      details: { reason: DOWNLOAD_REASON },
    };
  }
  return {
    id: CHECK_ID,
    severity: "ok",
    title: TITLE,
    message: "the mdschema binary resolves and runs",
    details: {},
  };
}

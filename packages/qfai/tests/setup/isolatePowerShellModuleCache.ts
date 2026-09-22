/**
 * Gives each worker process its own PowerShell module-analysis cache.
 *
 * PowerShell writes a binary cache of the module metadata it has analysed, at one path per
 * user, and it writes it on every start — `-NoProfile` does not turn it off. The two
 * projects that spawn a `pwsh` per case run their files in parallel, so a leg starts many
 * of those processes at once and they all write that one file. A reader that arrives while
 * a writer is part-way through gets a truncated record, and the assembly name it reads out
 * of one is not an assembly name:
 *
 * ```
 * Unhandled exception. System.IO.FileLoadException: The given assembly name was invalid.
 * ```
 *
 * The line names no file, no module and no script. It arrives on stderr before the script
 * runs, so whichever assertion reads the child's output is the one that reports it, and the
 * failure reads as a script that printed the wrong thing.
 *
 * Once the file is damaged it stays damaged for the rest of the job, so the leg does not
 * fail one case — it fails every case after the first bad write, whatever each asserts. A
 * rerun is green because the runner is new and the cache starts empty, which is also why
 * the failure looks like it belongs to the branch that happened to be building.
 *
 * ## Why the environment, rather than each spawn
 *
 * A spawned process inherits this process's environment, so setting the path here reaches
 * every `pwsh` a test file starts, including the ones inside helpers and the several call
 * sites that pass `process.env` through unchanged. The alternative is a list of spawn sites
 * nobody maintains.
 *
 * ## Why a path per worker, rather than no cache
 *
 * An unwritable path disables the cache, and PowerShell then re-analyses every module on
 * every start. That is the cost this suite can least afford: it starts a process per case.
 * A path per worker keeps the cache doing its job and leaves it with one writer, which is
 * the condition it was built for.
 *
 * The process id is what makes it unique. Under `pool: "forks"` with `isolate: true` a
 * worker is a process, so two workers cannot share an id, and a stale file from an earlier
 * run is overwritten by the next process to take that id rather than read as a foreign
 * cache — the format carries its own version and PowerShell rebuilds what it cannot read.
 *
 * An operator who set the variable already keeps it. Someone pointing the cache somewhere
 * on purpose is answering this question themselves.
 */
import os from "node:os";
import path from "node:path";

process.env["PSModuleAnalysisCachePath"] ??= path.join(
  os.tmpdir(),
  `qfai-ps-module-cache-${String(process.pid)}`,
);

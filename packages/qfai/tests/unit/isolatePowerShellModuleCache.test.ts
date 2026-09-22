// Proves two separate things about the setup file: that it computes a path no other
// worker writes, and that it is actually wired into the runner.
//
// The second is what a row about the path string cannot reach. The path could be
// perfect and `SETUP_FILES` not carry the file, and every row about its shape would
// still pass while the race stayed open.
//
// This file therefore never imports the setup module. A setup file's whole effect is a
// side effect at import, so importing it here would apply that effect and the wiring
// rows would pass whether or not the runner had loaded it.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CACHE_VARIABLE = "PSModuleAnalysisCachePath";

/** Whether a `pwsh` can be started here, which two projects of this suite require. */
function hasPwsh(): boolean {
  const probe = spawnSync("pwsh", ["-NoProfile", "-Command", "exit 0"], { stdio: "ignore" });
  return probe.error === undefined && probe.status === 0;
}

describe("the setup file, as the runner loads it", () => {
  it("declares a module-analysis cache path in this worker's environment", () => {
    // The one check a row about the string cannot make about itself: this reads the
    // variable back out of THIS process, which is only set if the setup file ran here.
    expect(
      process.env[CACHE_VARIABLE],
      "the setup file is not in effect here; `SETUP_FILES` is what wires it",
    ).toBeTypeOf("string");
  });

  it("names this process, so two workers cannot write one file", () => {
    // The whole fix is that the file has one writer. A path shared by two workers is
    // the default the suite is moving off, so a constant path here would be green and
    // would change nothing.
    const declared = process.env[CACHE_VARIABLE] ?? "";

    expect(path.basename(declared)).toContain(String(process.pid));
    expect(path.dirname(declared), "the cache belongs outside the repository").toBe(os.tmpdir());
  });
});

describe("the variable PowerShell reads", () => {
  it.skipIf(!hasPwsh())("puts a started pwsh's cache at the declared path", async () => {
    // The load-bearing fact the fix rests on: that this variable is the one PowerShell
    // relocates its cache by. A row asserting only that the suite sets some variable
    // would pass against a name PowerShell ignores, and the shared file would still
    // have every writer it has today.
    const declared = process.env[CACHE_VARIABLE] ?? "";

    // Importing a module is what makes PowerShell consult and then write the cache; a
    // bare `exit 0` can start and finish without touching it.
    const run = spawnSync(
      "pwsh",
      ["-NoProfile", "-Command", "Import-Module Microsoft.PowerShell.Management; exit 0"],
      { encoding: "utf-8" },
    );

    expect(run.error).toBeUndefined();
    expect(run.status, run.stderr).toBe(0);

    // Polled rather than read once. PowerShell saves the cache on a delayed
    // write, so a process that has exited may not have flushed it yet — and a
    // bare existence check would be the same race this whole file is about,
    // reproduced in the test for it.
    await expect.poll(() => existsSync(declared), { timeout: 15000, interval: 250 }).toBe(true);
  });
});

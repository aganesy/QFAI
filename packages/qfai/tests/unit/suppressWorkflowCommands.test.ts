// Proves the setup file actually filters, in the direction that matters and in
// the direction that must NOT be filtered.
//
// Run in a child process, deliberately: the wrapper is installed once per test
// FILE, and asserting on it from inside a file it already patched cannot tell
// "the filter works" from "the assertion was written against the patched
// function". A child runs the same setup fresh and reports what its stdout
// actually carried, which is the thing GitHub reads (#1160).

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const SETUP = path.resolve(here, "..", "setup", "suppressWorkflowCommands.ts");

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

/** Runs `body` in a child that has loaded the setup file, and returns its stdout. */
function stdoutOf(body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-annotation-"));
  dirs.push(dir);
  const script = path.join(dir, "probe.mjs");
  // The setup is TypeScript with no types in its runtime path, so it is loaded
  // through the same stripping Node applies to the CLI's own sources.
  // A file URL, not a path: on Windows `import("C:/…")` is read as a BARE
  // specifier and fails before the setup ever loads, which would make every row
  // here fail for a reason that has nothing to do with the filter.
  writeFileSync(
    script,
    [`await import(${JSON.stringify(pathToFileURL(SETUP).href)});`, body, ""].join("\n"),
    "utf-8",
  );
  return execFileSync(process.execPath, ["--experimental-strip-types", script], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

describe("the suite does not emit GitHub workflow commands (#1160)", () => {
  it("drops an annotation a fixture would have pointed at this repository", () => {
    const out = stdoutOf(
      `process.stdout.write("::error file=.qfai/specs/_policies/03_Capabilities.md::missing\\n");`,
    );
    expect(
      out,
      "a `::error` reaching the runner annotates THIS repository, whatever tree produced it",
    ).not.toContain("::error");
  });

  it("keeps ordinary output, including a line that merely contains `::`", () => {
    const out = stdoutOf(
      [
        `process.stdout.write("qfai validate summary: error=1 warning=5\\n");`,
        // Data, not a command: the name after `::` is not a workflow command
        // name, so dropping it would hide output a row asserts on.
        `process.stdout.write("expected ::ERROR file=x:: to be escaped\\n");`,
      ].join("\n"),
    );
    expect(out).toContain("qfai validate summary: error=1 warning=5");
    expect(out, "a `::` inside ordinary text is not a workflow command").toContain(
      "expected ::ERROR file=x:: to be escaped",
    );
  });

  it("keeps the ordinary half of a chunk that carries both", () => {
    const out = stdoutOf(`process.stdout.write("before\\n::warning::dropped\\nafter\\n");`);
    expect(out).toContain("before");
    expect(out).toContain("after");
    expect(out).not.toContain("::warning");
  });

  it("is installed in THIS process, which the child rows cannot show", () => {
    // The rows above prove the module filters. They cannot prove it is WIRED
    // into the runner: `setupFiles` could be misspelled, scoped to one project,
    // or replaced by vitest's own stdout capture, and every child row would
    // still pass. The wrapper stamps the function it installs, and this reads
    // the stamp from inside a real test — the one check the children cannot
    // make about themselves.
    const installed = (process.stdout.write as unknown as { qfaiSuppressor?: boolean })
      .qfaiSuppressor;
    expect(
      installed,
      "the setup file is not in effect here; `projectKnobs.setupFiles` is what wires it",
    ).toBe(true);
  });
});

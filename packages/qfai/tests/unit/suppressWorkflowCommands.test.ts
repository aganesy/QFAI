// Proves the setup file actually filters, in the direction that matters and in
// the direction that must NOT be filtered.
//
// Run in a child process, deliberately: the wrapper is installed once per test
// FILE, and asserting on it from inside a file it already patched cannot tell
// "the filter works" from "the assertion was written against the patched
// function". A child runs the same setup fresh and reports what its stdout
// actually carried, which is the thing GitHub reads (#1160).

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
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

/**
 * Runs `body` in a child that has loaded the setup file, and returns its stdout.
 *
 * The setup is TypeScript, and the child is plain `node`, so something has to remove the
 * annotations. That was `--experimental-strip-types`, and it is why the floor lane failed with
 * `status: 9`: the flag arrived in Node 22.6 and `engines.node` is `>=20.19.0`, so on the version
 * this package promises to support the child died on its command line before the setup ever
 * loaded. The rows were reporting the flag's availability, not the filter's behaviour.
 *
 * Gating them behind a version check was the other route and is worse: it would leave the floor —
 * the one lane that runs what the package actually promises — with the filter unexercised.
 *
 * So the stripping is done here, by the `typescript` this package already declares as a
 * devDependency. `transpileModule` removes annotations without type-checking, which is exactly
 * what the flag did; the transpiled module is written beside the probe and imported by a plain
 * relative specifier. That also retires the Windows note this function used to carry: a relative
 * specifier is never mistaken for a bare one, so `pathToFileURL` is no longer needed.
 */
function stdoutOf(body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "qfai-annotation-"));
  dirs.push(dir);

  // Read and transpiled rather than copied: the file under test is the one in `tests/setup/`,
  // and a hand-written second copy of its logic would be a probe derived from the subject.
  const stripped = ts.transpileModule(readFileSync(SETUP, "utf-8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: SETUP,
  });
  writeFileSync(path.join(dir, "setup.mjs"), stripped.outputText, "utf-8");

  const script = path.join(dir, "probe.mjs");
  writeFileSync(script, [`await import("./setup.mjs");`, body, ""].join("\n"), "utf-8");
  return execFileSync(process.execPath, [script], {
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

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SHIPPED_RULE = "packages/qfai/assets/init/root/.agents/rules/temporary-files.md";

/** Every text that says where a temporary file goes. This repository reads the shipped rule. */
const SOURCES = [SHIPPED_RULE, ".agents/rules/temporary-files.md"];

/** Collapses whitespace runs so a prose reflow is not a failure. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, rel), "utf-8"));

describe("toolchain output stays where the tooling writes it", () => {
  for (const source of SOURCES) {
    it(`${source}: leaves toolchain output out of tmp/`, async () => {
      const text = await read(source);
      expect(text).toContain("never redirect them to `tmp/`");
      // Wording that would put `dist/` under `tmp/` again.
      expect(text).not.toContain("intermediate build artifacts");
      expect(text).not.toContain("intermediate build output");
      expect(text).not.toContain("`tmp/build/`");
    });
  }

  it("the generated rule names the same toolchain output as the shipped rule", async () => {
    const article = await read(".agents/rules/temporary-files.md");
    const rule = await read(SHIPPED_RULE);
    for (const output of [
      "`dist/`",
      "`build/`",
      "`.next/`",
      "`target/`",
      "coverage reports",
      "package tarballs",
    ]) {
      expect(rule, output).toContain(output);
      expect(article, output).toContain(output);
    }
  });
});

describe("a scratch directory the host names", () => {
  it("takes precedence over tmp/, and an earlier session's files are untrusted", async () => {
    const rule = await read(SHIPPED_RULE);
    expect(rule).toContain("When the host names a scratch directory for the session, use it.");
    expect(rule).toContain("goes under `tmp/` whichever the host names");
    expect(rule).toContain("is untrusted input, not a cache");
    const article = await read(".qfai/assistant/rule/constitution.md");
    expect(article).toContain("When the host names a scratch directory for the session, use it.");
  });
});

describe("cleanup blocked by the host", () => {
  it("ships a bounded handoff without claiming blocked cleanup is complete", async () => {
    const text = await readFile(path.join(repoRoot, SHIPPED_RULE), "utf-8");
    const section = text
      .split(/^## /m)
      .find((candidate) => /^Cleanup blocked by the host\r?\n/u.test(candidate));
    expect(section, "the shipped rule needs a blocked-cleanup handoff section").toBeDefined();
    const receipt = flat(section ?? "");

    // This checks shipped guidance, not a removal or a host-policy decision.
    expect(receipt).toMatch(
      /host denies cleanup or a removal fails, stop that cleanup and report what remains/u,
    );
    expect(receipt).toMatch(/Authorization does not override the host's policy/u);
    expect(receipt).toMatch(
      /Do not retry through another shell, disable a guard or elevate privileges to bypass it/u,
    );

    expect(receipt).toMatch(/exact owned absolute targets within the authorized bounds/u);
    expect(receipt).toMatch(/Record the authority, when ownership and bounds were verified/u);
    expect(receipt).toMatch(/whether targets are ignored, untracked or tracked/u);
    expect(receipt).toMatch(/Note links or reparse points/u);
    expect(receipt).toMatch(/unverified state as unknown; give remaining bytes only if measured/u);

    expect(receipt).toMatch(
      /denial before execution from a started operation that failed or removed only part/u,
    );
    expect(receipt).toMatch(/observed error without secrets and name remaining owned paths/u);
    expect(receipt).toMatch(/If the phase or cause is unknown, say so rather than infer it/u);
    expect(receipt).toMatch(
      /secret-bearing plaintext was deleted, retained or could not be checked, without copying secrets into the report/u,
    );
    expect(receipt).toMatch(
      /Public screenshots and receipts also need ownership and scope checks before removal/u,
    );

    expect(receipt).toMatch(/manual steps only for the reviewed targets and platform/u);
    expect(receipt).toMatch(/when the human has authority to use the host's allowed method/u);
    expect(receipt).toMatch(/Manual execution is not automatically a permitted workaround/u);
    expect(receipt).toMatch(
      /If no allowed method is known, report that limit instead of inventing a command/u,
    );
    expect(receipt).toMatch(/Before any manual removal, resolve and check the target bounds/u);
    expect(receipt).toMatch(
      /inspect links or reparse points without following them outside those bounds/u,
    );
    expect(receipt).toMatch(
      /platform's native literal-path operations; in PowerShell use `-LiteralPath`/u,
    );
    expect(receipt).toMatch(/Never pass discovered paths to another shell for deletion/u);

    expect(receipt).toMatch(/After an allowed removal, verify that the owned targets are absent/u);
    expect(receipt).toMatch(
      /tracked files and the Git index are unchanged from the pre-removal state/u,
    );
    expect(receipt).toMatch(/Report partial results and any verification that could not be done/u);
    expect(receipt).toMatch(/Report product verification separately/u);
    expect(receipt).toMatch(
      /may pass while cleanup is pending, but the task is not fully complete until required cleanup is verified/u,
    );
    expect(receipt).toMatch(/A handoff alone does not complete cleanup/u);
  });
});

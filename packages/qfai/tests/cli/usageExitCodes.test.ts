import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES, formatExitCodesSection } from "../../src/cli/lib/exitCodes.js";
import { run } from "../../src/cli/main.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.resolve(here, "..", "..", "src", "cli", "commands");

function isExitCodeName(value: string): value is keyof typeof EXIT_CODES {
  return Object.prototype.hasOwnProperty.call(EXIT_CODES, value);
}

async function captureHelp(): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  });
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(["--help"], process.cwd());
  } finally {
    process.exitCode = previousExitCode;
    spy.mockRestore();
  }
  return chunks.join("");
}

describe("qfai --help exit-code section", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an Exit codes: block that names every code the CLI returns", async () => {
    const help = await captureHelp();

    expect(help).toContain("Exit codes:");
    for (const code of Object.values(EXIT_CODES)) {
      expect(help).toContain(`${code} =`);
    }
  });

  it("documents the per-command split rather than a single flat table", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toContain("validate / doctor");
    expect(section).toContain("guardrails");
    expect(section).toContain("prototyping iterate");
    expect(section).toContain("prototyping certify");
  });

  it("states why guardrails alone returns 2 for a usage error", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toMatch(/guardrails[\s\S]*使用法エラー/);
  });

  it("records the non-usage exit codes the other commands actually return", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // guardrails check reports 検査エラー with 1, not only 0 / 2.
    expect(section).toMatch(
      new RegExp(`guardrails[\\s\\S]*?${EXIT_CODES.findings} = check で検査エラー`),
    );
    // report / show-spec exit 2 on a missing or unreadable input file — the
    // catch-all "1 = 使用法エラー" row would misreport them.
    expect(section).toMatch(
      new RegExp(`report\\s+${EXIT_CODES.ok} = 成功, ${EXIT_CODES.inputError} =`),
    );
    expect(section).toMatch(
      new RegExp(`prototyping show-spec\\s+${EXIT_CODES.ok} = 成功, ${EXIT_CODES.inputError} =`),
    );
    expect(section).toContain("--check の証明書 digest・gate mismatch");
  });

  it("splits --check-convergence from the ordinary iterate row", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    expect(section).toContain("prototyping iterate --check-convergence");
    expect(section).toMatch(new RegExp(`--check-convergence[\\s\\S]*?${EXIT_CODES.ok} = 収束済み`));
  });

  it("does not advertise the reviewer hard-stop that no CLI path returns", async () => {
    const help = await captureHelp();
    const section = help.slice(help.indexOf("Exit codes:"));

    // `shouldStop()` never inspects review.json#sessionStatus, so 64 from
    // `prototyping iterate` is always convergence today.
    expect(section).not.toMatch(/hard-stop/i);
  });

  it("keeps the rendered section in sync with the EXIT_CODES constants", () => {
    const section = formatExitCodesSection();

    expect(section.startsWith("Exit codes:")).toBe(true);
    expect(section).toContain(`${EXIT_CODES.prototypingConverged} =`);
    expect(section).toContain(`${EXIT_CODES.prototypingBudgetExhausted} =`);
    expect(section).toContain(`${EXIT_CODES.prototypingLicenseFailure} =`);
  });

  it("routes every sysexits-range return in the prototyping commands through EXIT_CODES", async () => {
    const files = ["prototypingIterate.ts", "prototypingCertify.ts"];
    const sources = await Promise.all(
      files.map(async (file) => readFile(path.join(commandsDir, file), "utf-8")),
    );

    const literals: string[] = [];
    const viaConstant: string[] = [];
    sources.forEach((source, index) => {
      for (const match of source.matchAll(/\breturn\s+(\d{2,3})\s*;/g)) {
        if (Number.parseInt(match[1] ?? "", 10) >= 64) {
          literals.push(`${files[index] ?? ""}: return ${match[1] ?? ""};`);
        }
      }
      for (const match of source.matchAll(/\breturn\s+EXIT_CODES\.(\w+)\s*;/g)) {
        viaConstant.push(match[1] ?? "");
      }
    });

    // A new bare `return 64;` would document itself out of `--help`.
    expect(literals).toEqual([]);
    expect(viaConstant.length).toBeGreaterThan(0);
    const section = formatExitCodesSection();
    for (const name of viaConstant) {
      expect(isExitCodeName(name)).toBe(true);
      if (!isExitCodeName(name)) {
        continue;
      }
      expect(section).toContain(`${EXIT_CODES[name]} =`);
    }
  });
});

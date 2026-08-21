/**
 * Meta-test: every leaf key of `defaultConfig.validation` must be read
 * somewhere under `src/` outside `core/config.ts`.
 *
 * `config.ts` declaring, defaulting and parsing a key proves nothing about the
 * key doing anything. `validation.traceability.brMustHaveSc`,
 * `scNoTestSeverity` and `orphanContractsPolicy` each had all three and no
 * consumer at all, so the shipped `qfai.config.yaml` advertised gates the code
 * never ran — `scNoTestSeverity: error` next to a finding hard-coded to
 * `"warning"`. Adding a validation knob without wiring it to a finding MUST
 * fail here.
 *
 * Same shape as `validators-are-wired.test.ts`: a text-level reachability check
 * with an explicit, documented allowlist rather than a type-level one.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "../../src");
const CONFIG_TS = path.resolve(SRC_ROOT, "core/config.ts");

/**
 * Keys known to have no consumer, each with the issue that resolves it. This
 * list MUST NOT grow without an issue reference: a new entry means a new knob
 * that lies to the operator.
 *
 * - `requireLayerTags` / `requireSizeTags` — no validator reads them (#408).
 * - `specSections` — `validation.require.specSections` is parsed and shipped
 *   but no section requirement is enforced from it; same class as #408 and
 *   left to that thread rather than fixed here.
 */
const KNOWN_UNWIRED: ReadonlyMap<string, string> = new Map([
  ["requireLayerTags", "#408"],
  ["requireSizeTags", "#408"],
  ["specSections", "#408 (same class: shipped-but-inert config surface)"],
]);

/** Leaf key names of a nested plain-object tree, in declaration order. */
function collectLeafKeys(value: unknown, acc: string[] = []): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return acc;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "object" && child !== null && !Array.isArray(child)) {
      collectLeafKeys(child, acc);
    } else {
      acc.push(key);
    }
  }
  return acc;
}

async function collectTsFiles(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTsFiles(full, acc);
    } else if (entry.name.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("validation config keys are wired", () => {
  it("reads every validation leaf key somewhere outside core/config.ts", async () => {
    const files = (await collectTsFiles(SRC_ROOT)).filter(
      (file) => path.resolve(file) !== CONFIG_TS,
    );
    const sources = await Promise.all(files.map((file) => readFile(file, "utf-8")));
    const haystack = sources.join("\n");

    const unwired = collectLeafKeys(defaultConfig.validation).filter(
      (key) => !KNOWN_UNWIRED.has(key) && !haystack.includes(key),
    );

    expect(
      unwired,
      `validation config keys with no consumer under src/: ${unwired.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the retired traceability keys out of the config surface", () => {
    const traceabilityKeys = Object.keys(defaultConfig.validation.traceability);
    expect(traceabilityKeys).not.toContain("brMustHaveSc");
    expect(traceabilityKeys).not.toContain("scNoTestSeverity");
    expect(traceabilityKeys).not.toContain("orphanContractsPolicy");
  });

  it("does not let the unwired allowlist grow silently", () => {
    expect(Array.from(KNOWN_UNWIRED.keys()).sort()).toEqual([
      "requireLayerTags",
      "requireSizeTags",
      "specSections",
    ]);
  });
});

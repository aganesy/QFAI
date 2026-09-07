/**
 * The forecast that turns a promotion into a failure now rather than later.
 *
 * A rule inside a promotion window is reported at `warning` until the release
 * its pin names, and at `error` from then on, and the severity follows the
 * version of the tool that is running. `verify:pack` validates a fresh sandbox
 * with `--fail-on error`, so a window that closes over a finding that sandbox
 * produces turns that release's own gate red — and nothing observes the pin
 * before then.
 *
 * The forecast reads the findings a run already produced. It asks no version
 * question of its own: a `warning` whose code carries a promotion is inside an
 * open window by construction, because that is what `newRuleSeverity` returns
 * for it and the ledger guard requires every promoted code to take its severity
 * from there.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const mod = await import(
  path.join(repoRoot, "scripts", "promotion-preflight.mjs").replace(/\\/g, "/")
);
const { LEDGER_REL, findingsAwaitingPromotion, formatAwaitingPromotion, readRulePromotions } = mod;

const ledgerPath = path.join(repoRoot, LEDGER_REL);

describe("the promotion ledger, read as data", () => {
  it("reads every entry's code and promotion release", async () => {
    const entries = await readRulePromotions(ledgerPath);

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.key, JSON.stringify(entry)).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
      expect(entry.code, JSON.stringify(entry)).toMatch(/^(QFAI-[A-Z0-9-]+|[A-Z][A-Z0-9_]+)$/);
      expect(entry.promoteAt, JSON.stringify(entry)).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("stops rather than reporting nothing when the ledger is not there", async () => {
    // A silent empty read would make the forecast pass on every tree, which is
    // the one answer it must never give by accident.
    await expect(
      readRulePromotions(path.join(repoRoot, "scripts", "no-such-ledger.ts")),
    ).rejects.toThrow();
  });
});

describe("the findings a promotion will escalate", () => {
  const promotions = [
    { key: "steeringCatalogPlaceholders", code: "QFAI-ASSETS-003", promoteAt: "1.12.0" },
    { key: "deltaEntryUncounted", code: "QFAI-CTYPE-004", promoteAt: "1.12.0" },
  ];

  it("names a warning whose code carries a promotion", () => {
    const pending = findingsAwaitingPromotion(
      [{ severity: "warning", code: "QFAI-ASSETS-003", file: ".qfai/assistant/catalog/tech.md" }],
      promotions,
    );

    expect(pending).toEqual([
      {
        code: "QFAI-ASSETS-003",
        file: ".qfai/assistant/catalog/tech.md",
        promoteAt: "1.12.0",
        key: "steeringCatalogPlaceholders",
      },
    ]);
  });

  it("leaves a warning whose code carries none", () => {
    expect(
      findingsAwaitingPromotion([{ severity: "warning", code: "QFAI-OTHER-001" }], promotions),
    ).toEqual([]);
  });

  it("leaves a finding that is already an error", () => {
    // It fails the gate today and needs no forecast.
    expect(
      findingsAwaitingPromotion([{ severity: "error", code: "QFAI-ASSETS-003" }], promotions),
    ).toEqual([]);
  });

  it("leaves an info finding, which no promotion escalates", () => {
    expect(
      findingsAwaitingPromotion([{ severity: "info", code: "QFAI-ASSETS-003" }], promotions),
    ).toEqual([]);
  });

  it("gives a project-wide finding a file field anyway", () => {
    const [pending] = findingsAwaitingPromotion(
      [{ severity: "warning", code: "QFAI-CTYPE-004" }],
      promotions,
    );

    expect(pending?.file).toBe("-");
  });

  it("reports the code, the file and the release that ends the window", () => {
    const message = formatAwaitingPromotion(
      findingsAwaitingPromotion(
        [{ severity: "warning", code: "QFAI-ASSETS-003", file: "a.md" }],
        promotions,
      ),
    );

    expect(message).toContain(
      "QFAI-ASSETS-003 a.md — error from 1.12.0 (steeringCatalogPlaceholders)",
    );
  });
});

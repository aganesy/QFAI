import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateScreenIdCasing } from "../../../src/core/validators/prototypingEvidence.js";

async function withUiContract(
  ids: string[],
  assertion: (issues: Awaited<ReturnType<typeof validateScreenIdCasing>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-id-"));
  try {
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "main.yaml"),
      ["screens:", ...ids.flatMap((id) => [`  - id: ${id}`, '    route: "/"'])].join("\n"),
      "utf-8",
    );
    assertion(await validateScreenIdCasing(root, ".qfai/contracts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("validateScreenIdCasing accepts the shipped contract shape", () => {
  it("accepts SCR-001, the id 40_screen_contracts.md prescribes", async () => {
    await withUiContract(["SCR-001"], (issues) => {
      expect(issues).toEqual([]);
    });
  });

  it("accepts the other canonical prefixes and widths", async () => {
    await withUiContract(["SC-01", "SCRN-0012", "UI-9999"], (issues) => {
      expect(issues).toEqual([]);
    });
  });

  it("still accepts underscore casing", async () => {
    await withUiContract(["home_page", "settings2"], (issues) => {
      expect(issues).toEqual([]);
    });
  });

  it("still reports a free-form hyphenated slug, but only as a warning", async () => {
    await withUiContract(["home-page"], (issues) => {
      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-PROT-008");
      // No re-casing migration exists, so this must not block a project that
      // followed the shipped template.
      expect(issues[0]?.severity).toBe("warning");
    });
  });

  it("reports a lowercase canonical-looking id, which is not the shipped shape", async () => {
    await withUiContract(["scr-001"], (issues) => {
      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("warning");
    });
  });
});

// The acceptance set is derived from SAFE_SCREEN_ID_PATTERN minus the hyphen,
// so the two must stay in lockstep. Pinning the boundary keeps a later edit to
// either one from silently widening or narrowing this check.
describe("screen id acceptance boundary", () => {
  const accepted = ["SCR-001", "SCRN-0001", "home_page", "Main.Screen", "checkout2"];
  // `SCREEN-0001` is reported on purpose: the canonical prefix is 2-4 letters,
  // so a 6-letter prefix is not the contract form, and the hyphen then makes it
  // not a plain identifier either.
  const reported = ["SCREEN-0001", "home-page", "Main Screen", "a/b", "_leading", "-leading"];

  for (const id of accepted) {
    it(`accepts ${id}`, async () => {
      await withUiContract([id], (issues) => {
        expect(issues.filter((entry) => entry.code === "QFAI-PROT-008")).toEqual([]);
      });
    });
  }

  for (const id of reported) {
    it(`reports ${id}`, async () => {
      await withUiContract([id], (issues) => {
        expect(issues.some((entry) => entry.code === "QFAI-PROT-008")).toBe(true);
      });
    });
  }
});

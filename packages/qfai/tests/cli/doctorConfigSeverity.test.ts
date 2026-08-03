/**
 * `doctor` must not downgrade a config the loader rejected.
 *
 * `config.load` pinned every loader issue to `warning`, on the reasoning that
 * the config had been "normalized with defaults". That is true of a *warning* —
 * an unknown key, a value the loader can substitute — but not of an error. Once
 * `browserTool: "playwright-cli"` passed its sunset the loader started
 * reporting it at `error`, and `qfai doctor --fail-on error` still exited 0,
 * against `.qfai/contracts/cli/qfai-doctor.md`, which calls a current-minor
 * invalid value blocking.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { SUNSETS } from "../../src/core/sunset.js";

async function withConfig<T>(body: string, fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-config-"));
  try {
    await writeFile(path.join(root, "qfai.config.yaml"), body, "utf-8");
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const findCheck = (data: Awaited<ReturnType<typeof createDoctorData>>, id: string) =>
  data.checks.find((check) => check.id === id);

describe("doctor config.load severity", () => {
  it("reports error when the loader rejected a value", async () => {
    await withConfig(
      ["prototyping:", "  execution:", "    browserTool: playwright-cli", ""].join("\n"),
      async (root) => {
        const data = await createDoctorData({ startDir: root, rootExplicit: true });
        const check = findCheck(data, "config.load");

        expect(check, "expected a config.load check").toBeDefined();
        expect(check?.severity).toBe("error");
        // The message must say the issues need fixing, not that defaults were
        // applied — that phrasing is what made the fault look benign.
        expect(check?.message).toContain("must be fixed");
        expect(JSON.stringify(check?.details ?? {})).toContain(SUNSETS.playwrightCli);
      },
    );
  });

  it("reports error for any loader issue, because the loader has no warning tier", async () => {
    // `configIssue` builds every issue at `severity: "error"`, so there is no
    // benign class for `config.load` to preserve. The blanket downgrade to
    // `warning` was not conservatism about severity — it discarded the only
    // severity the loader emits.
    await withConfig(["paths:", "  specsDir: 42", ""].join("\n"), async (root) => {
      const data = await createDoctorData({ startDir: root, rootExplicit: true });
      const check = findCheck(data, "config.load");

      expect(check, "expected a config.load check").toBeDefined();
      expect(check?.severity).toBe("error");
    });
  });

  it("reports ok on a clean config", async () => {
    await withConfig(
      ["prototyping:", "  execution:", "    browserTool: playwright", ""].join("\n"),
      async (root) => {
        const data = await createDoctorData({ startDir: root, rootExplicit: true });
        expect(findCheck(data, "config.load")?.severity).toBe("ok");
      },
    );
  });
});

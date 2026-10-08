/**
 * An adopter's walk from a fresh `qfai init` to `qfai validate` over a UI
 * contract that states the text its screen shows.
 *
 * The contract starts from the template `qfai init` installs, as an adopter's
 * first one does, and the checks run through the command's own entry point.
 */
// QFAI:BF-0001

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { captureStdout } from "../helpers/stdout.js";

const INSTALLED_TEMPLATE = path.join(
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "contracts",
  "ui-contract.sample.yaml",
);
const CONTRACT = path.join(".qfai", "spec", "03_contract", "ui", "ui-0001-orders.yaml");

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-copy-e2e-"));
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** The installed template as a first contract: its own ID, written where contracts live. */
async function writeFirstContract(edit: (text: string) => string = (text) => text): Promise<void> {
  const template = await readFile(path.join(root, INSTALLED_TEMPLATE), "utf-8");
  const contract = edit(
    template.replace("UI-0003", "UI-0001").replace("BR-0003-NNNN", "BR-0001-0001"),
  );
  await mkdir(path.dirname(path.join(root, CONTRACT)), { recursive: true });
  await writeFile(path.join(root, CONTRACT), contract, "utf-8");
}

async function validateOutput(profile: "sdd" | "prototyping"): Promise<string> {
  return captureStdout(async () => {
    await runValidate({ root, strict: false, failOn: "never", profile });
  });
}

describe("an adopter writes a UI contract from the installed template", () => {
  it("passes the copy checks in the sdd and prototyping profiles", async () => {
    await writeFirstContract();
    for (const profile of ["sdd", "prototyping"] as const) {
      const out = await validateOutput(profile);
      expect(out, profile).not.toMatch(/QFAI-CONTRACT-04[345]/);
      expect(out, profile).not.toMatch(/QFAI-AUD-0(01|20|21)/);
    }
  });

  it("names the screen when supplements is left out", async () => {
    await writeFirstContract((text) => text.slice(0, text.indexOf("    supplements:")));
    for (const profile of ["sdd", "prototyping"] as const) {
      const out = await validateOutput(profile);
      expect(out, profile).toMatch(
        /\[error\] QFAI-CONTRACT-043 Screen `order_create` \(`screens\[0\]` in \.qfai\/spec\/03_contract\/ui\/ui-0001-orders\.yaml\): `supplements` is absent/,
      );
    }
  });

  it("accepts supplements: [] for a screen that shows nothing beyond its labels", async () => {
    await writeFirstContract((text) => {
      const kept = text.slice(0, text.indexOf("    structure"));
      return `${kept}    supplements: []\n`;
    });
    const out = await validateOutput("sdd");
    expect(out).not.toMatch(/QFAI-CONTRACT-04[345]/);
  });

  it("names a group member the screen does not declare", async () => {
    await writeFirstContract((text) =>
      text.replace("members: [customer_id_input]", "members: [customer_id]"),
    );
    const out = await validateOutput("sdd");
    expect(out).toMatch(
      /\[error\] QFAI-CONTRACT-044 .*Group `g_customer` lists the member `customer_id`/,
    );
  });

  it("warns when a supplement repeats the label it sits near", async () => {
    await writeFirstContract((text) => text.replace("text: Saved to Drafts", "text: Save draft"));
    const out = await validateOutput("sdd");
    expect(out).toMatch(/\[warning\] QFAI-CONTRACT-045 .*repeats the label of `save_draft`/);
  });
});

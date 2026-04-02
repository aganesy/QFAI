// QFAI:SPEC-0011:TC-0011-0001
// QFAI:SPEC-0011:TC-0011-0002
// QFAI:SPEC-0011:TC-0011-0003
// QFAI:SPEC-0011:TC-0011-0004
// QFAI:SPEC-0011:TC-0011-0005
// QFAI:SPEC-0011:TC-0011-0006
// QFAI:SPEC-0011:TC-0011-0007
// QFAI:SPEC-0011:TC-0011-0008

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isUiBearingSpec } from "../../src/core/validators/uixDetection.js";

async function withSpecDir(
  files: Record<string, string>,
  dirs: string[] = [],
  task: (specRoot: string) => Promise<void>,
): Promise<void> {
  const specRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-uix-detection-"));
  try {
    for (const dir of dirs) {
      await mkdir(path.join(specRoot, dir), { recursive: true });
    }
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(specRoot, name);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    }
    await task(specRoot);
  } finally {
    await rm(specRoot, { recursive: true, force: true });
  }
}

describe("canonical UIX detection integration", () => {
  it("TC-0011-0001: explicit surface web-ui is UI-bearing", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      expect(await isUiBearingSpec(specRoot)).toBe(true);
    });
  });

  it("TC-0011-0002: explicit non-ui overrides fallback HTML signals", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: non-ui\n",
        "03_Story-Workshop.md": "# Story\n\n<div>ui-looking but non-ui by declaration</div>\n",
      },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(false);
      },
    );
  });

  it("TC-0011-0003: Mermaid screen flow classifies as UI-bearing", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story Workshop",
          "",
          "```mermaid",
          "stateDiagram-v2",
          "  [*] --> LoginScreen",
          "  LoginScreen --> Dashboard",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(true);
      },
    );
  });

  it("TC-0011-0004: uiux directory marks the spec as UI-bearing", async () => {
    await withSpecDir({ "placeholder.md": "" }, ["uiux"], async (specRoot) => {
      expect(await isUiBearingSpec(specRoot)).toBe(true);
    });
  });

  it("TC-0011-0005: screen contract sidecar marks the spec as UI-bearing", async () => {
    await withSpecDir(
      {
        "uiux/40_contracts.md": [
          "# Screen Contracts",
          "",
          "### Screen: Login",
          "- screen_id: login",
          "- route: /login",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(true);
      },
    );
  });

  it("TC-0011-0006: style tag inside fenced code is ignored", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story",
          "",
          "```html",
          "<style>body { color: red; }</style>",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(false);
      },
    );
  });

  it("TC-0011-0007: div in inline code is ignored", async () => {
    await withSpecDir(
      { "03_Story-Workshop.md": "# Story\n\nUse `<div>` in docs only.\n" },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(false);
      },
    );
  });

  it("TC-0011-0008: generic flowchart without screen hints is non-UI", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story",
          "",
          "```mermaid",
          "flowchart TD",
          "  A[Start] --> B[Process]",
          "  B --> C[End]",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        expect(await isUiBearingSpec(specRoot)).toBe(false);
      },
    );
  });
});

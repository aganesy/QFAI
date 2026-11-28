import { describe, expect, it, vi } from "vitest";
import { stringify } from "yaml";

import { componentBriefLines } from "../../../src/core/uiux/catalogBrief.js";

vi.mock("yaml", { spy: true });

describe("catalogue brief scalar rendering", () => {
  // QFAI:EX-0001-0307-51
  it("renders repeated non-finite numbers without per-value YAML serialization", () => {
    const catalog = ".qfai/catalog/components.yaml";
    const spellings = [".inf", "-.inf", ".nan"];
    const values = [...Array.from({ length: 128 }, () => spellings).flat(), "null", "2.5", "false"];
    const list = values.join(", ");
    const source = [
      "components:",
      "  - name: Page",
      "    file: src/page.tsx",
      `    limits: [${list}]`,
    ];

    vi.mocked(stringify).mockClear();
    expect(componentBriefLines(source.join("\n"), catalog)).toEqual([
      `Components in ${catalog}:`,
      `- Page (src/page.tsx): limits: ${list}`,
    ]);
    expect(vi.mocked(stringify).mock.calls.length).toBeLessThanOrEqual(spellings.length);
  });
});

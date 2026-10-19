/**
 * The words a UI contract screen says it shows: `supplements` and `structure`.
 *
 * Each case writes a UI contract into a temporary project and runs the
 * validators the way `qfai validate` does, so the findings are the ones an
 * author sees: the code, the severity, and the file, screen and id they name.
 * The last cases pass a rendered-text file, as `qfai validate --rendered` does,
 * and compare what a screen showed with what its contract lists.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { stringify } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateUiRenderedCopy } from "../../src/core/validators/uiRenderedCopy.js";
import { validateUiScreenCopy } from "../../src/core/validators/uiScreenCopy.js";
import { captureStdout } from "../helpers/stdout.js";

type Mapping = Record<string, unknown>;

const FILE = ".qfai/spec/03_contract/ui/ui-0001-orders.yaml";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-screen-copy-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const SAVED: Mapping = {
  id: "sp_saved",
  near: "save_draft",
  when: "success",
  text: "Saved to Drafts",
  why: "After the click the user cannot see where the order went.",
};

/** A complete screen: every id the copy keys name is declared. */
function screen(overrides: Mapping = {}): Mapping {
  return {
    id: "order_create",
    title: "Create Order",
    route: "/orders/new",
    primary_tasks: [
      { id: "t1", label: "Submit a new order", acceptance: "the order appears in /orders" },
      {
        id: "t2",
        label: "Keep the order for later",
        acceptance: "the order is under /orders/drafts",
      },
    ],
    elements: [{ id: "customer_id_input", label: "Customer ID", type: "input" }],
    actions: [
      { id: "submit_order", label: "Submit order", kind: "submit", effect: "navigates to /orders" },
      { id: "save_draft", label: "Save draft", kind: "submit", effect: "stores the draft" },
    ],
    structure: [
      { id: "g_customer", heading: "Customer", tasks: ["t1"], members: ["customer_id_input"] },
      { id: "g_commit", tasks: ["t1", "t2"], members: ["submit_order", "save_draft"] },
    ],
    supplements: [SAVED],
    ...overrides,
  };
}

async function writeContract(screens: Mapping[]): Promise<void> {
  const file = path.join(root, FILE);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    `# QFAI-CONTRACT-ID: UI-0001\n${stringify({ "x-qfai-depends-on": [], screens })}`,
    "utf-8",
  );
}

/** A project `qfai validate` runs its profiles on: the story tree is what gates them. */
async function initProject(): Promise<void> {
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
}

async function copyFindings() {
  const issues = await validateUiScreenCopy(root, defaultConfig);
  return issues.filter((issue) => /^QFAI-CONTRACT-04[345]$/.test(issue.code));
}

// QFAI:AC-0001-0230-01
describe("a screen that states its supplements and structure", () => {
  // QFAI:EX-0001-0230-01
  it("raises no copy finding when every id it names is declared", async () => {
    await writeContract([screen()]);
    expect(await copyFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0230-02
  it("accepts supplements: [] with no structure for a screen that shows nothing beyond its labels", async () => {
    const bare = screen({ supplements: [] });
    delete bare["structure"];
    await writeContract([bare]);
    expect(await copyFindings()).toEqual([]);
  });

  it("does not require every element or action to be in a group", async () => {
    await writeContract([
      screen({
        structure: [{ id: "g_customer", tasks: ["t1"], members: ["customer_id_input"] }],
      }),
    ]);
    expect(await copyFindings()).toEqual([]);
  });

  it("runs in the sdd profile of qfai validate and stays silent for a complete screen", async () => {
    await initProject();
    await writeContract([screen()]);
    const out = await captureStdout(async () => {
      await runValidate({ root, strict: false, failOn: "never", profile: "sdd" });
    });
    expect(out).not.toMatch(/QFAI-CONTRACT-04[345]/);
  });
});

// QFAI:AC-0001-0230-02
describe("a missing or malformed definition", () => {
  // QFAI:EX-0001-0230-03
  it("names a screen with no supplements, with the file and the position", async () => {
    const missing = screen();
    delete missing["supplements"];
    await writeContract([missing]);
    const findings = await copyFindings();
    expect(findings.map((finding) => [finding.code, finding.severity])).toEqual([
      ["QFAI-CONTRACT-043", "error"],
    ]);
    const [finding] = findings;
    expect(finding?.file).toBe(FILE);
    expect(finding?.message).toContain("`order_create`");
    expect(finding?.message).toContain("`screens[0]`");
    expect(finding?.message).toContain("`supplements` is absent");
    expect(finding?.suggested_action).toContain("each text the screen shows");
    expect(finding?.suggested_action).toContain(
      "`supplements: []` only for a screen that shows no such text",
    );
    expect(finding?.suggested_action).toContain("references/ui-contract-guide.md");
  });

  // QFAI:EX-0001-0230-04
  it("names an extra key, a state outside the five and a structure with no group", async () => {
    const entry = SAVED;
    await writeContract([
      screen({
        supplements: [
          { ...entry, note: "x" },
          { ...entry, id: "sp_busy", when: "busy" },
        ],
        structure: [],
      }),
    ]);
    const messages = (await copyFindings()).map((finding) => finding.message);
    expect(messages).toHaveLength(3);
    expect(messages.some((message) => message.includes("carries `note`"))).toBe(true);
    expect(messages.some((message) => message.includes("`when` is `busy`"))).toBe(true);
    expect(messages.some((message) => message.includes("`structure` lists no group"))).toBe(true);
  });

  it("names an entry that is not a mapping, a missing key, an empty value and a repeated id", async () => {
    const entry = SAVED;
    const withoutWhy = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "why"));
    await writeContract([
      screen({
        supplements: ["just text", withoutWhy, { ...entry, text: "  " }, entry, entry],
      }),
    ]);
    const messages = (await copyFindings()).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("`supplements[0]` is not a mapping"))).toBe(
      true,
    );
    expect(messages.some((message) => message.includes("`supplements[1]`"))).toBe(true);
    expect(messages.some((message) => message.includes("`supplements[2]`"))).toBe(true);
    expect(messages.some((message) => message.includes("repeats the supplement `id`"))).toBe(true);
  });

  it("names a supplements or structure value that is not a list, and a group with a bad key set", async () => {
    await writeContract([
      screen({ supplements: "none", structure: "g" }),
      screen({
        id: "second",
        route: "/second",
        structure: [{ id: "g", tasks: [], members: ["customer_id_input"], extra: 1 }],
      }),
    ]);
    const messages = (await copyFindings()).map((finding) => finding.message);
    expect(messages.some((message) => message.includes("`supplements` is not a list"))).toBe(true);
    expect(messages.some((message) => message.includes("`structure` is not a list"))).toBe(true);
    expect(messages.some((message) => message.includes("`tasks`"))).toBe(true);
    expect(messages.some((message) => message.includes("carries `extra`"))).toBe(true);
  });

  it("is reported by the contract checks of sdd and by the prototyping profile", async () => {
    await initProject();
    const missing = screen();
    delete missing["supplements"];
    await writeContract([missing]);

    const contractIssues = await validateContracts(root, defaultConfig);
    expect(contractIssues.some((issue) => issue.code === "QFAI-CONTRACT-043")).toBe(true);

    for (const profile of ["sdd", "prototyping"] as const) {
      let exitCode = 0;
      const out = await captureStdout(async () => {
        exitCode = await runValidate({ root, strict: false, failOn: "error", profile });
      });
      expect(out, profile).toMatch(/\[error\] QFAI-CONTRACT-043 Screen `order_create`/);
      expect(exitCode, profile).not.toBe(0);
    }
  });
});

// QFAI:AC-0001-0230-03
describe("a reference to an id the screen does not declare", () => {
  // QFAI:EX-0001-0230-05
  it("names a member, a task and a near that no element, action, task or group declares", async () => {
    const entry = SAVED;
    await writeContract([
      screen({
        structure: [
          { id: "g_customer", tasks: ["t1"], members: ["customer_id_input", "nope"] },
          { id: "g_commit", tasks: ["t9"], members: ["submit_order", "save_draft"] },
        ],
        supplements: [{ ...entry, near: "ghost" }],
      }),
    ]);
    const findings = await copyFindings();
    expect(findings.every((finding) => finding.code === "QFAI-CONTRACT-044")).toBe(true);
    expect(findings.every((finding) => finding.severity === "error")).toBe(true);
    const messages = findings.map((finding) => finding.message);
    expect(messages).toHaveLength(3);
    expect(messages.some((message) => message.includes("`nope`"))).toBe(true);
    expect(messages.some((message) => message.includes("`t9`"))).toBe(true);
    expect(messages.some((message) => message.includes("`ghost`"))).toBe(true);
  });

  // QFAI:EX-0001-0230-06
  it("names an action that is a member of two groups", async () => {
    await writeContract([
      screen({
        structure: [
          { id: "g_one", tasks: ["t1"], members: ["customer_id_input", "save_draft"] },
          { id: "g_two", tasks: ["t2"], members: ["submit_order", "save_draft"] },
        ],
      }),
    ]);
    const findings = await copyFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("QFAI-CONTRACT-044");
    expect(findings[0]?.message).toContain("`save_draft`");
    expect(findings[0]?.message).toContain("`g_one`");
    expect(findings[0]?.message).toContain("`g_two`");
  });

  it("lets a supplement sit near a group", async () => {
    const entry = SAVED;
    await writeContract([
      screen({ supplements: [{ ...entry, near: "g_commit", text: "Drafts are kept 30 days." }] }),
    ]);
    expect(await copyFindings()).toEqual([]);
  });
});

// QFAI:AC-0001-0230-04
describe("a text shown twice by wording alone", () => {
  // QFAI:EX-0001-0230-07
  it("warns on a group heading equal to the title and a supplement equal to the label it sits near", async () => {
    const entry = SAVED;
    await writeContract([
      screen({
        structure: [
          {
            id: "g_customer",
            heading: "create order!",
            tasks: ["t1"],
            members: ["customer_id_input"],
          },
          { id: "g_commit", tasks: ["t1", "t2"], members: ["submit_order", "save_draft"] },
        ],
        supplements: [{ ...entry, text: "  SAVE   draft. " }],
      }),
    ]);
    const findings = await copyFindings();
    expect(findings.map((finding) => [finding.code, finding.severity])).toEqual([
      ["QFAI-CONTRACT-045", "warning"],
      ["QFAI-CONTRACT-045", "warning"],
    ]);
    expect(findings[0]?.message).toContain("repeats the screen `title`");
    expect(findings[1]?.message).toContain("repeats the label of `save_draft`");
  });

  it("warns on two supplements with the same text near the same target in the same state only", async () => {
    const entry = SAVED;
    await writeContract([
      screen({
        supplements: [
          entry,
          { ...entry, id: "sp_same" },
          { ...entry, id: "sp_other_state", when: "default" },
          { ...entry, id: "sp_other_target", near: "submit_order" },
        ],
      }),
    ]);
    const findings = await copyFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("`sp_same`");
  });

  // QFAI:EX-0001-0230-08
  it("raises nothing for a true disclosure with its reason, or for a field message", async () => {
    await writeContract([
      screen({
        elements: [
          {
            id: "customer_id_input",
            label: "Customer ID",
            type: "input",
            validations: ["must be non-empty"],
          },
        ],
        supplements: [
          {
            id: "sp_demo",
            near: "g_customer",
            when: "default",
            text: "Sample data. Nothing you enter is stored.",
            why: "The form looks real; without this the user may expect the order to exist afterwards.",
          },
        ],
      }),
    ]);
    expect(await copyFindings()).toEqual([]);
  });

  it("does not turn a warning into a failing exit under fail-on error", async () => {
    await initProject();
    await writeContract([screen({ title: "Customer" })]);
    const out = await captureStdout(async () => {
      await runValidate({ root, strict: false, failOn: "error", profile: "sdd" });
    });
    expect(out).toMatch(/\[warning\] QFAI-CONTRACT-045/);
    expect(out).not.toMatch(/\[error\] QFAI-CONTRACT-04[345]/);
  });
});

describe("which screens are read", () => {
  it("checks no entry that has no route, which the unread-entry check reports once", async () => {
    const noRoute = screen();
    delete noRoute["route"];
    delete noRoute["supplements"];
    await writeContract([noRoute]);
    expect(await copyFindings()).toEqual([]);
  });

  it("checks only the first entry for an id", async () => {
    const missing = screen();
    delete missing["supplements"];
    await writeContract([screen(), missing]);
    expect(await copyFindings()).toEqual([]);
  });
});

const DEMO: Mapping = {
  id: "sp_demo",
  near: "g_customer",
  when: "default",
  text: "Sample data. Nothing you enter is stored.",
  why: "The form looks real; without this the user may expect the order to exist afterwards.",
};

const RENDERED = "rendered.json";

/** The rendered-text file a caller's own browser run would write, at the project root. */
async function writeRendered(value: unknown): Promise<void> {
  await writeFile(path.join(root, RENDERED), JSON.stringify(value), "utf-8");
}

function rendered(texts: string[], overrides: Mapping = {}): Mapping {
  return { contract: "UI-0001", screen: "order_create", when: "default", texts, ...overrides };
}

async function renderedFindings(file = RENDERED) {
  const issues = await validateUiRenderedCopy(root, defaultConfig, file);
  return issues.filter((issue) => /^QFAI-CONTRACT-04[678]$/.test(issue.code));
}

// QFAI:AC-0001-0230-07
describe("rendered text compared with the screen's copy", () => {
  // QFAI:EX-0001-0230-13
  it("raises nothing when every rendered text is the title, a heading, a label or a supplement of that state", async () => {
    await writeContract([screen({ supplements: [SAVED, DEMO] })]);
    await writeRendered({
      screens: [
        rendered([
          "Create Order",
          "Customer",
          "Customer ID",
          "Submit order",
          "Save draft",
          "sample data.  nothing you enter is stored",
        ]),
        rendered(["Create Order", "Saved to Drafts"], { when: "success" }),
      ],
    });
    expect(await renderedFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0230-14
  it("names a rendered text the contract does not hold, and a supplement of that state the screen did not show", async () => {
    await writeContract([screen({ supplements: [SAVED, DEMO] })]);
    await writeRendered({ screens: [rendered(["Create Order", "Free shipping over $50"])] });
    const findings = await renderedFindings();
    expect(findings.map((finding) => [finding.code, finding.severity])).toEqual([
      ["QFAI-CONTRACT-047", "error"],
      ["QFAI-CONTRACT-048", "error"],
    ]);
    const [excess, unmet] = findings;
    expect(excess?.file).toBe(FILE);
    expect(excess?.message).toContain("`order_create`");
    expect(excess?.message).toContain("UI-0001");
    expect(excess?.message).toContain("`when: default`");
    expect(excess?.message).toContain('"Free shipping over $50"');
    expect(excess?.suggested_action).toContain("`supplements`");
    expect(unmet?.file).toBe(FILE);
    expect(unmet?.message).toContain("`sp_demo`");
    expect(unmet?.message).toContain('"Sample data. Nothing you enter is stored."');
  });

  // QFAI:EX-0001-0230-15
  it("names a file that cannot be read, and each entry out of shape", async () => {
    await writeContract([screen()]);
    const missing = await renderedFindings("absent.json");
    expect(missing.map((finding) => [finding.code, finding.severity])).toEqual([
      ["QFAI-CONTRACT-046", "error"],
    ]);
    expect(missing[0]?.message).toContain("absent.json");

    await writeRendered({
      screens: [
        rendered([], { contract: "UI-0009" }),
        rendered([], { screen: "nope" }),
        rendered([], { when: "busy" }),
        rendered([], { note: "x" }),
        rendered([1]),
        rendered(["Create Order"]),
        rendered(["Create Order"]),
      ],
    });
    const messages = (await renderedFindings()).map((finding) => {
      expect(finding.code).toBe("QFAI-CONTRACT-046");
      expect(finding.file).toBe(RENDERED);
      return finding.message;
    });
    expect(messages).toHaveLength(6);
    expect(messages.some((message) => message.includes("`UI-0009`"))).toBe(true);
    expect(messages.some((message) => message.includes("`nope`"))).toBe(true);
    expect(messages.some((message) => message.includes("`when` is `busy`"))).toBe(true);
    expect(messages.some((message) => message.includes("carries `note`"))).toBe(true);
    expect(messages.some((message) => message.includes("`screens[4]`"))).toBe(true);
    expect(messages.some((message) => message.includes("`screens[6]` repeats"))).toBe(true);

    await writeFile(path.join(root, RENDERED), "{ not json", "utf-8");
    expect((await renderedFindings()).map((finding) => finding.code)).toEqual([
      "QFAI-CONTRACT-046",
    ]);
  });

  // QFAI:EX-0001-0230-16
  it("compares only the screens and states the file has an entry for", async () => {
    await writeContract([
      screen({ supplements: [SAVED, DEMO] }),
      screen({ id: "second", route: "/second", supplements: [DEMO] }),
    ]);
    await writeRendered({
      screens: [rendered(["Create Order", "Sample data. Nothing you enter is stored."])],
    });
    expect(await renderedFindings()).toEqual([]);
  });

  it("runs from qfai validate when the file is passed, and fails the run on a difference", async () => {
    await initProject();
    await writeContract([screen({ supplements: [SAVED, DEMO] })]);
    await writeRendered({ screens: [rendered(["Create Order", "Free shipping over $50"])] });
    let code = 0;
    const out = await captureStdout(async () => {
      code = await runValidate({
        root,
        strict: false,
        failOn: "error",
        profile: "sdd",
        renderedPath: RENDERED,
      });
    });
    expect(out).toMatch(/\[error\] QFAI-CONTRACT-047/);
    expect(out).toMatch(/\[error\] QFAI-CONTRACT-048/);
    expect(code).toBe(1);

    const without = await captureStdout(async () => {
      await runValidate({ root, strict: false, failOn: "never", profile: "sdd" });
    });
    expect(without).not.toMatch(/QFAI-CONTRACT-04[678]/);
  });
});

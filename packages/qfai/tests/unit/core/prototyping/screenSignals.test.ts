/**
 * Unit: what a screen holds, counted.
 *
 * The counting half needs a DOM and the arithmetic half does not, so both are
 * exercised here: the DOM walk against documents that distinguish naming text
 * from explanatory text, and the ratios against the denominators that can be
 * zero.
 */
import { describe, expect, it } from "vitest";

import {
  buildScreenSignals,
  formatScreenSignals,
  formatScreenSignalsBlock,
  SCREEN_SIGNALS_HEADER,
} from "../../../../src/core/prototyping/screenSignals.js";
import { countScreenElements } from "../../../../src/core/uiux/htmlMockDom.js";

const ZERO = {
  interactiveControls: 0,
  words: 0,
  explanatoryWords: 0,
  maxDepth: 0,
  distinctElementTypes: 0,
  parseErrors: [] as string[],
};

describe("countScreenElements", () => {
  it("counts every element a user can operate", async () => {
    const counts = await countScreenElements(
      `<body>
         <button>Save</button>
         <a href="/next">Next</a>
         <input name="q">
         <select><option>One</option></select>
         <textarea></textarea>
         <div role="button">Custom</div>
         <span tabindex="0">Focusable</span>
       </body>`,
    );

    expect(counts.interactiveControls).toBe(7);
  });

  it("does not count a control the page has disabled", async () => {
    // A disabled control is not something the user can operate, so counting it
    // would inflate the denominator the prose ratio is measured against.
    const counts = await countScreenElements(
      `<body><button>Save</button><button disabled>Delete</button>
       <button aria-disabled="true">Archive</button></body>`,
    );

    expect(counts.interactiveControls).toBe(1);
  });

  it("separates the words that name something from the words that explain", async () => {
    const counts = await countScreenElements(
      `<body>
         <h1>Order</h1>
         <p>Use this page to record a new order.</p>
         <label>Customer name</label>
         <input name="customer">
         <span>Enter the customer's full legal name.</span>
         <button>Save order</button>
       </body>`,
    );

    // Explanatory: the introduction (8) and the hint under the field (6).
    expect(counts.explanatoryWords).toBe(14);
    // Everything: those 14 plus the heading (1), the label (2) and the button (2).
    expect(counts.words).toBe(19);
  });

  it("treats text inside a control as the control's name, however deeply nested", async () => {
    // A button holding markup still names itself. Counting its inner span as
    // prose would report a screen of plain buttons as full of explanation.
    const counts = await countScreenElements(
      `<body><button><span><em>Save</em> order</span></button></body>`,
    );

    expect(counts.explanatoryWords).toBe(0);
    expect(counts.words).toBe(2);
  });

  it("ignores text the browser never renders", async () => {
    const counts = await countScreenElements(
      `<html><head><title>Orders</title></head>
       <body><style>.a { color: red }</style>
       <script>const hidden = "one two three";</script>
       <p>Visible words here.</p></body></html>`,
    );

    expect(counts.words).toBe(3);
    expect(counts.explanatoryWords).toBe(3);
  });

  it("measures how deep the markup goes and how many kinds of element it uses", async () => {
    const counts = await countScreenElements(
      `<body><div><section><p><span>Deep</span></p></section></div><p>Shallow</p></body>`,
    );

    // body 0, div 1, section 2, p 3, span 4.
    expect(counts.maxDepth).toBe(4);
    expect(counts.distinctElementTypes).toBe(5);
  });

  it("reports zero counts for an empty document", async () => {
    const counts = await countScreenElements("");

    expect(counts).toMatchObject({ interactiveControls: 0, words: 0, maxDepth: 0 });
    expect(counts.parseErrors).toEqual([]);
  });
});

describe("buildScreenSignals", () => {
  it("divides the counts by what the contract declared", () => {
    const signals = buildScreenSignals(
      "scr_orders",
      { ...ZERO, interactiveControls: 12, words: 40, explanatoryWords: 30 },
      2,
    );

    expect(signals.controlsPerTask).toBe(6);
    expect(signals.explanatoryWordsPerControl).toBe(2.5);
  });

  it("reports an absent denominator as absent, not as zero", () => {
    // A screen declaring no task has no controls-per-task. Reporting 0 there
    // would read as "no controls", which is the opposite of what is known.
    const noTasks = buildScreenSignals("scr_a", { ...ZERO, interactiveControls: 4 }, 0);
    expect(noTasks.controlsPerTask).toBeNull();

    const noControls = buildScreenSignals("scr_b", { ...ZERO, explanatoryWords: 9 }, 1);
    expect(noControls.explanatoryWordsPerControl).toBeNull();
  });

  it("rounds a ratio to two places so it reads as a measurement", () => {
    const signals = buildScreenSignals("scr_a", { ...ZERO, interactiveControls: 3 }, 7);

    expect(signals.controlsPerTask).toBe(0.43);
  });
});

describe("formatScreenSignals", () => {
  it("states every count and both ratios on one line", () => {
    const line = formatScreenSignals(
      buildScreenSignals(
        "scr_orders",
        {
          ...ZERO,
          interactiveControls: 12,
          words: 40,
          explanatoryWords: 30,
          maxDepth: 6,
          distinctElementTypes: 9,
        },
        2,
      ),
    );

    expect(line).toBe(
      "scr_orders: 12 controls (6 per declared task), 30 explanatory of 40 words " +
        "(2.5 per control), depth 6, 9 element types",
    );
  });

  it("prints an absent denominator rather than a misleading number", () => {
    const line = formatScreenSignals(buildScreenSignals("scr_a", { ...ZERO }, 0));

    expect(line).toContain("(n/a per declared task)");
    expect(line).toContain("(n/a per control)");
  });

  it("heads the block so the numbers are attributable to the cycle that produced them", () => {
    const block = formatScreenSignalsBlock([
      buildScreenSignals("scr_a", { ...ZERO }, 1),
      buildScreenSignals("scr_b", { ...ZERO }, 1),
    ]);

    expect(block.split("\n")[0]).toBe(SCREEN_SIGNALS_HEADER);
    expect(block.split("\n")).toHaveLength(3);
  });
});

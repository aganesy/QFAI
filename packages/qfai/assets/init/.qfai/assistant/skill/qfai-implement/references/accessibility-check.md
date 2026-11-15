# Accessibility check: the spec template

`implement-scaffold` writes this spec under `<testsDir>/e2e/` in a project whose UI contracts declare
a screen with a web route. It is the layer `.qfai/assistant/rule/test-layers.md#l6-accessibility`
defines: axe through Playwright, limited to the WCAG 2.2 A and AA rules, on every route the UI
contracts declare, as each role that can reach it.

## Contents

- What the adopter fills in
- The spec
- The role fixture
- Waiving a violation

## What the adopter fills in

- `ROUTES_BY_ROLE`: one entry per role, with every route from the UI contracts that role can reach.
  A route with a parameter, such as `/orders/:id`, is written with a record the role's test data
  owns. A route a visitor reaches before signing in goes under the role `visitor`, which runs with
  no session.
- `WAIVED`: empty until a violation is waived, as § Waiving a violation says.
- The import of `test` and `expect`: the E2E layer's own fixture file, so the spec signs in as each
  role the way the journeys do.

`@axe-core/playwright` is the project's dev dependency. QFAI installs none and runs none itself.

## The spec

```ts
// <testsDir>/e2e/accessibility.spec.ts
import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures";

/** The axe tags of the WCAG 2.2 A and AA rules. */
const WCAG_22_A_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Every route the UI contracts declare, under each role that can reach it. */
const ROUTES_BY_ROLE: Readonly<Record<string, readonly string[]>> = {
  visitor: ["/"],
  member: ["/orders", "/orders/new"],
};

/** A violation that stays: the route, the axe rule ID and why. */
const WAIVED: readonly { route: string; rule: string; reason: string }[] = [];

function waived(route: string, rule: string): boolean {
  return WAIVED.some(
    (entry) => entry.route === route && entry.rule === rule && entry.reason.trim() !== "",
  );
}

for (const [role, routes] of Object.entries(ROUTES_BY_ROLE)) {
  test.describe(`accessibility as ${role}`, () => {
    test.use({ role });

    for (const route of routes) {
      test(`${route} has no WCAG 2.2 A or AA violation`, async ({ page }) => {
        await page.goto(route);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_A_AA).analyze();
        const open = violations
          .filter((violation) => !waived(route, violation.id))
          .map(
            (violation) =>
              `${route} as ${role}: ${violation.id} (${violation.impact ?? "unrated"}), ` +
              `${String(violation.nodes.length)} element(s): ${violation.help}`,
          );
        expect(open).toEqual([]);
      });
    }
  });
}
```

A failure lists each open violation by route, role and rule, with the number of elements axe found
and the rule's help text.

## The role fixture

The spec sets `role` with `test.use`. The E2E layer's fixture file picks the storage state by that
role and by the worker, as `.qfai/assistant/skill/qfai-implement/references/credential-reuse.md`
keys a session by the pair of worker index and actor.
Where the fixture file has no `role` option yet, add one:

```ts
// <testsDir>/e2e/fixtures.ts
import { test as base } from "@playwright/test";

export const test = base.extend<{ role: string }>({
  role: ["member", { option: true }],
  storageState: async ({ role }, use, testInfo) => {
    await use(
      role === "visitor"
        ? { cookies: [], origins: [] }
        : statePath(ownedSessionDirectory(), role, testInfo.parallelIndex),
    );
  },
});

export { expect } from "@playwright/test";
```

`statePath` and `ownedSessionDirectory` are the E2E layer's own helpers. The setup project signs one
account in per worker for each role the spec names.

## Waiving a violation

A violation that cannot be fixed now stays only as an entry in `WAIVED`:

```ts
const WAIVED = [
  {
    route: "/orders",
    rule: "color-contrast",
    reason: "the vendor date picker sets its own colours; replaced when the picker is",
  },
];
```

The entry names the route, the axe rule ID and the reason the violation stays. An entry with an
empty reason waives nothing, and the test still fails. The reason is read in review like any other
deliberate shortcut: it names what lifts the waiver.

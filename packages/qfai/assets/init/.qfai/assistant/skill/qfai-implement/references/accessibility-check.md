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

The spec sets `role` with `test.use`. Keep one session per worker index and role: two workers never
share an account, and two roles never share a session. A visitor signs in nowhere and runs with an
empty storage state, so it needs no account.

The setup project signs one account in per worker for each role the spec names other than
`visitor`, and saves its storage state under a path keyed by both. The path helper lives in its own module, so
the fixture file can import it without loading the setup test:

```ts
// <testsDir>/e2e/sessions.ts
import path from "node:path";

/** Every role the accessibility spec names that signs in. */
export const SIGNED_IN_ROLES = ["member"] as const;

export function statePath(directory: string, role: string, slot: number): string {
  return path.join(directory, `${role}-${String(slot)}.json`);
}
```

```ts
// <testsDir>/e2e/auth.setup.ts
import { chmod } from "node:fs/promises";
import { test as setup } from "@playwright/test";

import { SIGNED_IN_ROLES, statePath } from "./sessions";

setup("sign in one account per worker and role", async ({ browser }) => {
  const directory = ownedSessionDirectory();
  for (const role of SIGNED_IN_ROLES) {
    for (let slot = 0; slot < setup.info().config.workers; slot++) {
      const account = await createAccount(role, String(slot));
      await recordCreated(directory, account.id);
      const context = await browser.newContext();
      await signIn(await context.newPage(), account);
      await context.storageState({ path: statePath(directory, role, slot) });
      await chmod(statePath(directory, role, slot), 0o600);
      await context.close();
    }
  }
});
```

The fixture file picks the storage state by the role and the worker's parallel index:

```ts
// <testsDir>/e2e/fixtures.ts
import { test as base } from "@playwright/test";

import { statePath } from "./sessions";

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

`ownedSessionDirectory`, `createAccount`, `recordCreated` and `signIn` are the E2E layer's own
helpers; the teardown that deletes the run's accounts removes every role's states with them. Where
the E2E layer already keys its sessions by worker only, replace its `statePath` and setup loop with
these two rather than keeping both.

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

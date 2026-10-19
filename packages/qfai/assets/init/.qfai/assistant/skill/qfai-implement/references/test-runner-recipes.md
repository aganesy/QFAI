# Test runner recipes: session reuse, shared state, business time and CI

Optional recipes for Playwright and Vitest that put the worker session-reuse rules of
`implement-credentials` into runnable form, together with the shared-state, business-time and CI
patterns that make a parallel acceptance suite trustworthy. Copy what fits and adapt it. The rules
stay the obligation; a recipe is one way to meet them.

## Contents

- Status and what the adopter supplies
- Vitest: one session per pool slot and actor
- Playwright: one account and storage state per worker
- Business data each file owns
- Database hooks only where a group needs them
- Shared and exclusive access to a common database or server
- Deterministic business time
- Credential directory hygiene
- CI: auxiliary jobs inside the protected result
- Adoption checklist

## Status and what the adopter supplies

These recipes come from one adopter's working implementation, reduced to the parts that do not
depend on the application. QFAI's own suite signs nothing in and runs no browser, so nothing here
is executed in this repository: read each recipe as a pattern to adopt, then prove it in your own
suite with the adoption checklist at the end.

The application supplies four adapters. QFAI ships none of them, and no recipe below assumes how
they work inside:

| Adapter          | What it does                                                         |
| ---------------- | -------------------------------------------------------------------- |
| `createAccount`  | Creates a private account for one run, one worker slot and one actor |
| `issueSession`   | Signs that account in and returns the session the product accepts    |
| `signIn`         | Completes the same sign-in on a browser page, for Playwright         |
| `acceptsSession` | Asks the product whether a restored session is still valid           |
| `deleteAccount`  | Removes an account this run created, and nothing else                |

When a test needs a controlled business time, the application also supplies a clock adapter, as
the business time section describes.

## Vitest: one session per pool slot and actor

Vitest isolates each test file in its own module registry, so a module-level cache does not outlive
one file. A process ID or a per-file counter does not give a worker lifetime either. What survives
is the pool slot, `VITEST_POOL_ID`, a stable number per worker slot. Key the cache by the private
directory the run owns, the slot and the actor.

```ts
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type SessionOptions = {
  actor: string;
  create: () => Promise<string>;
  accepted: (session: string) => Promise<boolean>;
};

/** The run owns the directory; the pool slot survives isolated file registries. */
export async function workerSession({ actor, create, accepted }: SessionOptions): Promise<string> {
  const directory = process.env.TEST_SESSION_CACHE_DIR;
  if (!directory) return create();
  const worker = process.env.VITEST_POOL_ID;
  if (!worker || !/^\d+$/.test(worker)) throw new Error("A worker session requires VITEST_POOL_ID");
  const key = createHash("sha256").update(actor).digest("hex").slice(0, 20);
  const file = path.join(directory, `${worker}-${key}.json`);
  const record = (event: "issued" | "reused" | "refreshed") =>
    fs.appendFile(
      path.join(directory, `${worker}.events.jsonl`),
      `${JSON.stringify({ worker, actor: key, event })}\n`,
    );
  let session: string | undefined;
  try {
    const restored: unknown = JSON.parse(await fs.readFile(file, "utf8"));
    if (typeof restored === "string") session = restored;
  } catch (error) {
    const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
    if (!(error instanceof SyntaxError) && !missing) throw error;
  }
  if (session !== undefined && (await accepted(session))) {
    await record("reused");
    return session;
  }
  const event = session === undefined ? "issued" : "refreshed";
  session = await create();
  await fs.writeFile(file, JSON.stringify(session), { mode: 0o600 });
  await record(event);
  return session;
}
```

A file-local map validates each actor once per file registry, so a file does not ask the product
about the same session for every test:

```ts
const sessions = new Map<string, Promise<string>>();

export function sessionFor(actor: string): Promise<string> {
  let pending = sessions.get(actor);
  if (pending === undefined) {
    pending = workerSession({
      actor,
      create: async () => issueSession(await createAccount(actor)),
      accepted: acceptsSession,
    });
    sessions.set(actor, pending);
  }
  return pending;
}
```

Global setup creates a fresh private directory, sets `TEST_SESSION_CACHE_DIR` before the workers
start, and removes the directory in the teardown it returns, which runs after a failed run too:

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export default async function setup() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "session-cache-"));
  await fs.chmod(directory, 0o700);
  process.env.TEST_SESSION_CACHE_DIR = directory;
  return async () => {
    await deleteAccountsCreatedBy(directory);
    await fs.rm(directory, { recursive: true, force: true });
  };
}
```

Keep these behaviours when you adapt it:

- An explicit session, a bearer credential or an intentionally anonymous request bypasses the
  default fixture.
- A rejected cache is refreshed while the fixture is prepared. A product request that returns 401
  is never repeated automatically: that 401 is the result under test.
- A store error propagates. Only a missing file or an unreadable record means "no session"; an
  error reading the directory is not an invalid credential.
- Login, logout, expiry and password-change tests use their own subjects, never a pooled actor.

## Playwright: one account and storage state per worker

A setup project signs one account in per worker and saves its storage state; the test project
picks the state by the worker's parallel index; a teardown project deletes the accounts and their
states. The worker count is fixed in the configuration, so the setup and the run agree on it.

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  workers: 4,
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /auth\.teardown\.ts/ },
    { name: "e2e", dependencies: ["setup"], testIgnore: /auth\.(setup|teardown)\.ts/ },
  ],
});
```

```ts
// auth.setup.ts
import { test as setup } from "@playwright/test";

setup("sign in one account per worker", async ({ browser }) => {
  const directory = ownedSessionDirectory();
  for (let slot = 0; slot < setup.info().config.workers; slot++) {
    const account = await createAccount(`worker-${slot}`);
    const context = await browser.newContext();
    await signIn(await context.newPage(), account);
    await context.storageState({ path: statePath(directory, slot) });
    await context.close();
  }
});
```

```ts
// fixtures.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  storageState: async ({}, use, testInfo) => {
    await use(statePath(ownedSessionDirectory(), testInfo.parallelIndex));
  },
});
```

`ownedSessionDirectory()` returns the private directory the run created, and throws when that
directory is missing or not private; the credential directory section says what it checks. The
teardown project deletes each account the setup created and the storage state files. A test
whose subject is the session itself (login, logout, expiry, password change) starts from an empty
storage state with `test.use({ storageState: { cookies: [], origins: [] } })` and creates its own
subject. When the suite runs once per clock profile, each profile runs its own setup and teardown.

## Business data each file owns

Reusing an authenticated actor must not make one file depend on another file's business data.

- Each file prepares the minimum business data its tests read, in its own hooks.
- Identities are unique per creation: a real-millisecond timestamp plus a random suffix, such as
  `` `order-${Date.now()}-${randomUUID().slice(0, 8)}` ``. A fixed name collides across workers.
- Cleanup removes what the file created, and only that, including after a failed test.
- No file resets a mutable business seed. A reset in one worker deletes data another worker is
  asserting on.

## Database hooks only where a group needs them

When one file holds source-only cases and live cases, register the database preparation inside
the group that needs it, not at the top of the file:

```ts
describe("source contract", () => {
  it("parses the export format", () => {
    /* no database */
  });
});

describe("live store", () => {
  let owned: OwnedRows | undefined;
  beforeAll(async () => {
    owned = await createMinimumRows(requireDatabase());
  });
  afterAll(async () => {
    await owned?.remove();
  });
  it("persists an order", async () => {
    /* uses owned */
  });
});
```

A source-only CI selector then creates no business rows. `requireDatabase()` throws when the
database is not configured, so a selected live case fails without it rather than skipping.

## Shared and exclusive access to a common database or server

Four workers do not by themselves make concurrency safe. Admit files to a shared database or server
by declared access:

- **Shared**: the file reads and writes only data it owns. Shared files run in parallel, bounded by
  what the database and server can serve, measured, not by the CPU count.
- **Exclusive**: the file changes something global: a setting, a schema, a clock, a feature flag, a
  queue drained by everyone. An exclusive file runs alone.
- **Unknown**: a file that imports a helper whose effects you have not classified, or that mutates
  global state, is exclusive until shown otherwise.

The simplest bounded admission is two passes: the shared files with the measured worker count,
then the exclusive files with one worker, for example a Vitest project with
`fileParallelism: false`, or `npx playwright test --project=exclusive --workers=1`.

## Deterministic business time

A test that depends on the wall clock waits for a time of day or skips outside it. Control
business time instead:

- **Clock adapter.** The application reads business time through an adapter it supplies, with an
  explicit time zone and a fixed date and time per profile. Server-side decisions read the same
  adapter as the browser display; fixing only the browser leaves the server deciding on real time.
- **Production-safe boundary.** Test clock control is enabled only by start-up configuration of a
  non-production build or environment. No ordinary production request can enable it or set it,
  and a test proves that a production configuration ignores the control.
- **Independent cases per profile.** Each profile, such as inside and outside a business window,
  runs its own cases: before, inside and after the window, and holiday and boundary instants where
  the business has them. No case waits for real time and none skips on the time of day.
- **Workers.** A profile's clock is immutable while that profile is active. Workers sharing one
  server and database share its clock, so two profiles never run against one mutable clock at once:
  give each concurrently active profile its own server, or run the profiles one after another.
  Data stays owned per file, as above.
- **Reports.** CI shows that every profile ran: one report per profile, each with the actual worker
  count, the cases run, the skips and the flaky results.

```ts
// One definition read by the server start-up and by the browser context of each profile.
export const clockProfiles = {
  "in-window": { timeZone: "Asia/Tokyo", instant: "2030-01-15T10:30:00+09:00" },
  "out-of-window": { timeZone: "Asia/Tokyo", instant: "2030-01-15T22:30:00+09:00" },
} as const;
```

## Credential directory hygiene

- The run owns its session directory: it creates it fresh, outside the checked-out tree, and
  refuses a directory that already holds files it did not write.
- The directory is private (mode 700, files 600) and is removed by the teardown, which also runs
  after a failure.
- Artifact uploads exclude the directory. Keep only noncredential reuse metrics, such as the counts
  of issued, reused and refreshed sessions per slot, copied out before the teardown removes it.

## CI: auxiliary jobs inside the protected result

Independent auxiliary jobs, such as tooling checks or extra mutation probes, belong in the result
the branch protection requires. An aggregate job keeps the protected check name stable and fails
when any required job fails, is cancelled or is skipped when it should have run:

```yaml
tests-required:
  name: tests (required)
  needs: [changes, unit, tooling, behavioral-proofs]
  if: ${{ always() }}
  runs-on: ubuntu-latest
  timeout-minutes: 2
  permissions:
    contents: read
  steps:
    - name: required test verdict
      env:
        CHANGE_RESULT: ${{ needs.changes.result }}
        CODE_CHANGED: ${{ needs.changes.outputs.code }}
        UNIT_RESULT: ${{ needs.unit.result }}
        TOOLING_RESULT: ${{ needs.tooling.result }}
        PROOF_RESULT: ${{ needs.behavioral-proofs.result }}
      run: |
        set -euo pipefail
        [ "$CHANGE_RESULT" = success ] || { echo "Change detection: $CHANGE_RESULT"; exit 1; }
        expected=success
        if [ "$CODE_CHANGED" = false ]; then expected=skipped; fi
        for result in "$UNIT_RESULT" "$TOOLING_RESULT" "$PROOF_RESULT"; do
          [ "$result" = "$expected" ] || { echo "Lane returned $result, expected $expected"; exit 1; }
        done
```

The change-detection job and the lanes are the application's. Report ordinary test counts, extra
source-mutation probes and their counts separately; a probe count is not a test count.

## Adoption checklist

- Sign-ins per run equal workers times actors, plus the dedicated subjects, plus refreshes; the
  reuse metrics show it.
- A second file on the same slot and actor reuses the session; two slots or two actors never share
  one.
- A rejected session is refreshed once and rewritten; a store error fails the run.
- The source-only selector passes with no database configured and creates no rows; a live case
  fails without its database.
- Every file passes alone and in any order, with no seed reset.
- Exclusive files never overlap another file on the same database or server.
- Each clock profile's report shows its cases ran with zero skips; a production configuration
  ignores the test clock.
- The aggregate check fails when any required lane fails, is cancelled or is skipped unexpectedly.
- No artifact holds a session, a storage state or an account secret.
- Parallel workers are bounded by shared-state exclusion; measure before claiming a speedup.

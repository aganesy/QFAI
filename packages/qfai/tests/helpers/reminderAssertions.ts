/**
 * Assertions the hook suites share about reminder messages.
 *
 * Every hook entry reads its message from the reminder catalog at run time, and
 * a later call may print a short pointer in place of the full message. Each suite
 * checks those two contracts the same way, so a change to the reminder format or
 * the pointer contract lands here once and reaches every suite.
 */

import { expect } from "vitest";

/**
 * Asserts that `program` carries none of the catalog's message text.
 *
 * Checks each message's full `additionalContext` and its `briefContext`, both as
 * written and as escaped inside a JSON string, because an entry that embedded a
 * message would hold it in one of those two forms.
 */
export function expectNoEmbeddedReminderText(program: string, messages: unknown): void {
  if (typeof messages !== "object" || messages === null) throw new Error("no reminder catalog");
  for (const message of Object.values(messages)) {
    if (typeof message !== "object" || message === null) throw new Error("invalid reminder");
    const output: unknown = Reflect.get(message, "hookSpecificOutput");
    const full: unknown =
      typeof output === "object" && output !== null
        ? Reflect.get(output, "additionalContext")
        : undefined;
    for (const context of [full, Reflect.get(message, "briefContext")]) {
      if (typeof context !== "string") continue;
      expect(program).not.toContain(context);
      expect(program).not.toContain(JSON.stringify(context).slice(1, -1));
    }
  }
}

/**
 * Asserts that `context` is a pointer to `reference` rather than the full message.
 *
 * A pointer names its reference on one non-empty line that is shorter than the
 * full message. The `qfai-run` pointer also has to say how a new request, a
 * pending answer and the current step are handled, without naming run state.
 */
export function expectPointer(context: string, full: string, reference: string): void {
  expect(context).toContain(reference);
  expect(context.trim()).not.toBe("");
  expect(context).not.toMatch(/[\r\n\u2028\u2029]/);
  expect(context.length).toBeLessThan(full.length);
  if (reference === "qfai-run") {
    expect(context).toMatch(/\bnew requests?\b.*\bplan\b/i);
    expect(context).toMatch(
      /\b(?:requested|pending|waiting)\b.*\b(?:answers?|results?|repl(?:y|ies))\b/i,
    );
    expect(context).toMatch(/\b(?:current|same|waiting)\b.*\bstep\b/i);
    expect(context).not.toMatch(/\b(?:activeRun|turn_id)\b/);
  }
}

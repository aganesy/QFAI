import { setImmediate } from "node:timers/promises";

import { expect, it } from "vitest";

import { waitForCatalogueWriteHold } from "../helpers/catalogWriteHold.js";

// The rename signal settles on the next turn, so ignoring the writer fails promptly too.
it("reports the exit code and diagnostic when a catalogue writer exits before the held rename", async () => {
  await expect(
    waitForCatalogueWriteHold(setImmediate(), Promise.resolve(1), [
      "Could not write the catalogue.\n",
    ]),
  ).rejects.toMatchObject({
    message:
      "Catalogue writer exited with code 1 before reaching the held rename.\nCould not write the catalogue.",
  });
});

it("reports early writer success without an empty stderr line", async () => {
  await expect(
    waitForCatalogueWriteHold(setImmediate(), Promise.resolve(0), []),
  ).rejects.toMatchObject({
    message: "Catalogue writer exited with code 0 before reaching the held rename.",
  });
});

it("preserves an unexpected catalogue writer rejection before the held rename", async () => {
  const error = new Error("Catalogue writer rejected.");
  await expect(waitForCatalogueWriteHold(setImmediate(), Promise.reject(error), [])).rejects.toBe(
    error,
  );
});

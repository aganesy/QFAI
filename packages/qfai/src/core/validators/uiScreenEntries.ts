/**
 * A UI contract `screens[]` entry the product reads as no screen.
 *
 * Every consumer of UI contracts takes its screens from one reader, which keeps
 * the first entry for each `id` and drops an entry with no `id` or no `route`.
 * One reading is right, and what a dropped entry states is then checked by
 * nothing: an empty `primary_tasks` on it passes the audit lane and the
 * prototyping preflight, and a different route on it is prototyped and
 * certified as the entry it repeats. This names each such entry.
 */

import type { QfaiConfig } from "../config.js";
import { findUnreadUiScreenEntries, type UnreadScreenEntry } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export async function validateUiScreenEntries(root: string, config: QfaiConfig): Promise<Issue[]> {
  const unread = await findUnreadUiScreenEntries(root, config.paths.contractsDir);
  return unread.map((entry) =>
    issue(
      "QFAI-CONTRACT-042",
      describe(entry),
      "error",
      entry.file,
      "contracts.ui.screens",
      entry.screenId === undefined ? undefined : [entry.screenId],
      "canonical",
      remedy(entry),
    ),
  );
}

/** Where the entry is, as a reader of the file finds it. */
function locate(file: string, index: number | undefined): string {
  return index === undefined
    ? `\`screens\` in ${file}`
    : `\`screens[${String(index)}]\` in ${file}`;
}

function describe(entry: UnreadScreenEntry): string {
  const where = locate(entry.file, entry.index);
  const unchecked =
    "No screen is read from it, so the audit lane, the prototyping preflight and certification check nothing it states.";
  switch (entry.reason) {
    case "not-a-list":
      return `${where} is not a list. ${unchecked}`;
    case "not-a-mapping":
      return `${where} is not a mapping. ${unchecked}`;
    case "missing-id":
      return `${where} has no \`id\`. ${unchecked}`;
    case "missing-route":
      return entry.idShared === true
        ? `${where} (\`${entry.screenId ?? ""}\`) has no \`route\`, and another entry of this contract has its \`id\`. ${unchecked}`
        : `${where} (\`${entry.screenId ?? ""}\`) has no \`route\`. ${unchecked}`;
    case "repeated-id": {
      const first = entry.readInstead;
      const instead = first === undefined ? "an earlier entry" : locate(first.file, first.index);
      return `${where} repeats the \`id\` \`${entry.screenId ?? ""}\` of ${instead}. Only the first entry for an \`id\` is read, so nothing checks what this one states.`;
    }
    case "definition-shadowed": {
      const first = entry.readInstead;
      const other = first === undefined ? "another contract" : locate(first.file, first.index);
      const keys = listOf(entry.differingKeys ?? []);
      return `${where} states the \`id\` \`${entry.screenId ?? ""}\` with a different ${keys} from ${other}. Certification reads each spec's contract on its own, but the project-wide screen list, which the prototyping loop captures from and the design audit reads, keeps only the first entry for an \`id\`, so neither reads this entry's ${keys}.`;
    }
  }
}

/** Keys as a sentence lists them: `a`, `b` and `c`. */
function listOf(keys: readonly string[]): string {
  const quoted = keys.map((key) => `\`${key}\``);
  const last = quoted.pop() ?? "";
  return quoted.length === 0 ? last : `${quoted.join(", ")} and ${last}`;
}

function remedy(entry: UnreadScreenEntry): string {
  switch (entry.reason) {
    case "not-a-list":
      return "Write `screens` as a list with one entry per screen, each a mapping with at least an `id` and a `route`.";
    case "not-a-mapping":
      return "Write the entry as a mapping with at least an `id` and a `route`, or remove it.";
    case "missing-id":
      return "Give the entry an `id`, or remove it.";
    case "missing-route":
      // Given only a route, the entry would take the `id` from the entry read
      // today, or be the repeat itself.
      return entry.idShared === true
        ? "Give the entry a `route` and an `id` no other entry of this contract uses, or remove it."
        : "Give the entry a `route`, or remove it.";
    case "repeated-id":
      // Given only a new `id`, an entry with no route would still not be read.
      return entry.routeMissing === true
        ? "Give this entry a different `id` and a `route`, or remove it."
        : "Give one of the two entries a different `id`, or remove the one that should not be there.";
    case "definition-shadowed":
      return `Give one of the two screens a different \`id\`, or give both the same ${listOf(entry.differingKeys ?? [])}.`;
  }
}

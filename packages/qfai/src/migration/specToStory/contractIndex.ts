import { parseHeadings } from "../../core/parse/markdown.js";
import {
  escapeTableCell,
  maskNonSpecRegions,
  parseAllMarkdownTables,
} from "../../core/specPackParsers.js";
import { defaultTitle, OLD_CONTRACT_TOKEN, type IndexedContract } from "./contractIds.js";

export type ContractIndexInput = {
  /** The old `_policies/05_Contracts.md`. */
  source: string;
  sourcePath: string;
  /** Repository-relative path of the new `contracts.md`. */
  target: string;
  /** Repository-relative `paths.contractsDir`. */
  contractsDir: string;
  contracts: readonly IndexedContract[];
  oldIds: Readonly<Record<string, string>>;
};

type OldRow = { cells: Record<string, string> };

const NAME_COLUMNS = ["Entity", "Router", "Screen", "Title"];

function bare(cell: string | undefined): string {
  return (cell ?? "")
    .trim()
    .replace(/^[`*_]+|[`*_]+$/g, "")
    .trim();
}

function filled(cell: string | undefined): string {
  const value = bare(cell);
  return value === "-" || value === "—" ? "" : value;
}

/** The old index rows: every table under `## Contract Index` that names a file or a declared ID. */
function oldRows(body: string): OldRow[] {
  return parseAllMarkdownTables(maskNonSpecRegions(body))
    .filter((table) => table.headers.includes("File") || table.headers.includes("Declared ID"))
    .flatMap((table) =>
      table.rows.map((row) => ({
        cells: Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""])),
      })),
    );
}

/**
 * Whether the old index section says anything besides its tables: its
 * subsection headings, its `N items` counts and its comments are the old
 * template's, and carry nothing.
 */
function hasProse(body: string): boolean {
  return maskNonSpecRegions(body)
    .split("\n")
    .map((line) => line.trim())
    .some((line) => line !== "" && !/^(?:\||#{3,6}\s|\d+ items?$)/.test(line));
}

function rowFile(row: OldRow, contractsDir: string): string {
  const file = bare(row.cells.File).replace(/\\/g, "/").replace(/^\.\//, "");
  for (const prefix of [`${contractsDir}/`, ".qfai/contracts/"]) {
    if (file.startsWith(prefix)) return file.slice(prefix.length);
  }
  return file;
}

function matchRow(row: OldRow, input: ContractIndexInput): IndexedContract | undefined {
  const declared = bare(row.cells["Declared ID"]);
  const file = rowFile(row, input.contractsDir);
  return input.contracts.find(
    (contract) =>
      (declared !== "" && (contract.old === declared || contract.id === declared)) ||
      (file !== "" && (contract.oldPath === file || contract.path === file)),
  );
}

/** Old IDs in a `Reconciled With` cell, through the contract map. */
function reconciled(cell: string, input: ContractIndexInput, unmapped: Set<string>): string {
  const value = filled(cell);
  if (value === "") return "-";
  return value.replace(OLD_CONTRACT_TOKEN, (token) => {
    const next = input.oldIds[token];
    if (next === undefined) unmapped.add(token);
    return next ?? token;
  });
}

function indexRow(
  contract: IndexedContract,
  row: OldRow | undefined,
  input: ContractIndexInput,
  unmapped: Set<string>,
): string {
  const name = NAME_COLUMNS.map((column) => filled(row?.cells[column])).find(Boolean);
  const cells = [
    contract.id,
    contract.title || name || defaultTitle(contract.path),
    `\`${input.contractsDir}/${contract.path}\``,
    contract.dependsOn.length > 0 ? contract.dependsOn.join(", ") : "-",
    reconciled(row?.cells["Reconciled With"] ?? "", input, unmapped),
    filled(row?.cells.Purpose) || "-",
  ];
  return `| ${cells.map(escapeTableCell).join(" | ")} |`;
}

/**
 * `contracts.md` in the index shape: one `## Contract Index` table listing every
 * contract. The old index's other sections and the text before them are listed
 * for a person, as is a row that names no contract.
 */
export function renderContractIndex(input: ContractIndexInput): {
  content: string;
  forAPerson: string[];
} {
  const lines = input.source.split(/\r?\n/);
  const headings = parseHeadings(input.source);
  const sections = headings.filter((heading) => heading.level === 2);
  const forAPerson: string[] = [];
  const firstSection = sections[0]?.line ?? lines.length + 1;
  const preamble = lines
    .slice(0, firstSection - 1)
    .filter((line) => !/^#\s/.test(line))
    .join("\n")
    .trim();
  const hand = (what: string) => `${input.target}: rewrite ${what} by hand`;
  if (preamble !== "")
    forAPerson.push(hand(`the text before the first section of ${input.sourcePath}`));
  const rows: OldRow[] = [];
  for (const [index, section] of sections.entries()) {
    const body = lines
      .slice(section.line, (sections[index + 1]?.line ?? lines.length + 1) - 1)
      .join("\n");
    if (section.title !== "Contract Index") {
      forAPerson.push(hand(`"## ${section.title}" of ${input.sourcePath}`));
      continue;
    }
    rows.push(...oldRows(body));
    if (hasProse(body))
      forAPerson.push(
        hand(`the text of "## Contract Index" in ${input.sourcePath} outside its tables`),
      );
  }
  const byContract = new Map<IndexedContract, OldRow>();
  for (const row of rows) {
    const contract = matchRow(row, input);
    if (contract) byContract.set(contract, row);
    else if (Object.values(row.cells).some((cell) => filled(cell) !== ""))
      forAPerson.push(
        hand(
          `the row for ${filled(row.cells["Declared ID"]) || filled(row.cells.File) || "an unnamed contract"}, which names no contract file,`,
        ),
      );
  }
  const unmapped = new Set<string>();
  const table = input.contracts.map((contract) =>
    indexRow(contract, byContract.get(contract), input, unmapped),
  );
  for (const token of unmapped)
    forAPerson.push(`${input.target}: ${token} is declared by no contract, so it has no new ID`);
  const content = `# Contracts\n\n## Contract Index\n\n| ID | Title | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- |\n${table.map((row) => `${row}\n`).join("")}`;
  return { content, forAPerson };
}

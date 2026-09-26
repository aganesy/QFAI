/** Parse an explicit prototyping pin without normalising its identifier. */

export type ParsedPrimaryUiContract =
  { ok: true; uiContractId: string } | { ok: false; error: string };

export function parsePrimaryUiContract(input: unknown): ParsedPrimaryUiContract {
  if (typeof input === "string" && /^CON-UI-\d{4}$/.test(input)) {
    return { ok: true, uiContractId: input };
  }
  const received = String(input);
  return {
    ok: false,
    error: `primaryUiContract must be a full CON-UI-NNNN ID; received ${received}`,
  };
}

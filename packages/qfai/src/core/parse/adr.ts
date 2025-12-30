const ADR_ID_RE = /\bADR-\d{4}\b/;

export type ParsedAdr = {
  file: string;
  adrId?: string;
  fields: {
    status?: string;
    context?: string;
    decision?: string;
    consequences?: string;
    related?: string;
  };
};

function extractField(md: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*-\\s*${key}:\\s*(.+)\\s*$`, "m");
  return md.match(pattern)?.[1]?.trim();
}

export function parseAdr(md: string, file: string): ParsedAdr {
  const adrId = md.match(ADR_ID_RE)?.[0];
  const fields: ParsedAdr["fields"] = {};
  const status = extractField(md, "Status");
  const context = extractField(md, "Context");
  const decision = extractField(md, "Decision");
  const consequences = extractField(md, "Consequences");
  const related = extractField(md, "Related");

  if (status) fields.status = status;
  if (context) fields.context = context;
  if (decision) fields.decision = decision;
  if (consequences) fields.consequences = consequences;
  if (related) fields.related = related;

  const parsed: ParsedAdr = {
    file,
    fields,
  };
  if (adrId) {
    parsed.adrId = adrId;
  }

  return parsed;
}

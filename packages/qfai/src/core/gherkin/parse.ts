import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import * as Messages from "@cucumber/messages";

export type ParsedGherkin = {
  gherkinDocument: Messages.GherkinDocument | null;
  errors: string[];
};

export function parseGherkin(source: string, uri: string): ParsedGherkin {
  const errors: string[] = [];
  const uuidFn = Messages.IdGenerator.uuid();
  const builder = new AstBuilder(uuidFn);
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);

  try {
    const gherkinDocument = parser.parse(source);
    gherkinDocument.uri = uri;
    return { gherkinDocument, errors };
  } catch (error) {
    errors.push(formatError(error));
    return { gherkinDocument: null, errors };
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

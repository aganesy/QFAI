# Cross Flow Ownership

## When to check

Before changing a shared production module, test helper, fixture, contract, or package asset, search the story tree for other flows that cite or consume it. Include transitive readers where the changed output is a public or persisted contract. Record the exact paths and flow IDs in the current example evidence.

Do not use filename similarity as the only ownership signal. Follow imports, contract references, test fixtures, and call sites. A flow that merely happens to contain the same word is not a dependent flow.

## Revalidation

Run the changed example selector and the relevant tests of each dependent flow against the integrated tree. Run the scoped validation gate for each affected BF ID. Ask completion-reviewer to judge any changed obligation and implementation-reviewer to judge shared-code risk. A flow whose assertions or contract moved needs its own new evidence and review.

Where the edit changes an upstream rule or contract, use the drift protocol before implementation. This check authorizes inspection and revalidation; it does not authorize a downstream stage to rewrite the story tree.

# A project whose manifest predates this contract

`npx qfai init --force` regenerates `assistant/skills/**` and `assistant/agents/**`
but leaves `assistant/manifest/**` alone: those are the declarative files
`qfai-configure` owns, and overwriting a project's adjusted agent taxonomy is
the worse failure. So an existing project can take this skill's update without
taking the `red` phase the update relies on.

**Two files are stale, not one.** `agent-routing.yml` is the obvious one, and
`agent-catalog.yml` carries each role's `developer_instructions` — the reviewer's
own contract — which `constitution/agent-selection.md` treats as SSOT alongside
routing. An old catalog's `qa-gatekeeper` does not know that `Satisfied-by` takes
a path and symbol, that an ATDD row's evidence lives in `atdd-<spec-id>.md`, that
a RED-time Oracle proof is a plan, or that an item cycle is exempt from the
completion inputs — so it REVISEs correct handoffs, and routing it by hand does
not help.

The gate still applies, and the remedy is to bring both files forward:

1. **Run `/qfai-configure`.** It owns these manifests and reconciles a project's
   adjusted taxonomy with the shipped one, which is why `init --force` leaves
   them alone — overwriting an adjusted taxonomy is the worse failure.
2. **If that is not available**, copy the two files from the installed package
   (`node_modules/qfai/assets/init/.qfai/assistant/manifest/`) and re-apply the
   project's own additions on top. Diff before copying: what is being restored
   is the shipped roles' contracts, not the project's routing choices.
3. **Until either has run**, route `qa-gatekeeper` for the branch-1 rows by hand
   at P1b **and state in the evidence file that the catalog predates this
   contract**, so a REVISE that cites a rule the current contract does not have
   is read as the stale input it is rather than as a finding about the row.

A missing phase is a stale manifest, never the gate not applying — and the same
is true of the production owners `qfai-implement`'s red phase needs for step 3c.

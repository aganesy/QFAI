# Volume Policy

The per-item ceremony below is written for a ledger of tens of rows. At the
volume `/qfai-sdd` and `/qfai-atdd` routinely produce it is arithmetically
unfinishable, and an unfinishable process is abandoned wholesale — taking the
RED/GREEN evidence and drift discipline with it. Scale the ceremony instead.

## Risk tier (derive per row)

Derive the tier from the ledger row's `Layer` and what the item touches:

| Tier              | Row shape                                                                                          | Ceremony                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **T1 — standard** | Pure decision logic; unit/component layer; touches no infrastructure, no public API surface, no UI | RED/GREEN evidence in the ledger satisfies `qa-gatekeeper`; no live gatekeeper turn. Reviews are batched (below).               |
| **T2 — elevated** | Touches infrastructure, a public API surface, a contract (`CON-*`), or persisted schema            | Full per-item ceremony: live `qa-gatekeeper` RED and GREEN turns, per-item `completion-reviewer` and `implementation-reviewer`. |
| **T3 — surface**  | Changes UI behavior or rendered output                                                             | T2 plus `product-surface-reviewer`.                                                                                             |

Record the tier in the row's `Evidence` cell alongside the RED/GREEN commands.
A row with no recorded tier is treated as **T2**.

## Batched review

For T1 rows, run **one** `completion-reviewer` pass and **one**
`implementation-reviewer` pass per _coherent group_ — a set of items that share
a BR or an AC — instead of one pass per item. The group is the review unit:

- record the group's member `TDD-ID`s as a single block in the evidence file;
- a `REVISE` on the group blocks every member until it is resolved;
- a group must not mix tiers; a T2 or T3 row is always reviewed alone.

## Multi-spec queue

Auto-discovery may accept **several** specs and process them **one spec at a
time**, in the order the user confirms. This is a queue, not parallelism: the
one-spec-at-a-time and one-item-at-a-time constraints are unchanged. It removes
the "invoke the skill eight times by hand" tax without touching the parallelism
question.

## Cost visibility

Before starting, state the implied cost: rows × gate cycles at the derived
tiers. If the ledger exceeds ~50 rows, surface that number to the user before
processing begins, and offer T1 batching explicitly.

# 07 Constraints

Cross-spec constraints every spec inherits: what the solution may not do,
regardless of which capability is being built.

## Constraints

| ID     | Constraint                | Kind                                                       | Source                     |
| ------ | ------------------------- | ---------------------------------------------------------- | -------------------------- |
| CST-01 | `<what is not permitted>` | `regulatory` / `contractual` / `technical` / `operational` | `<who or what imposes it>` |

## Non-functional floors

| ID     | Dimension                                     | Floor              | How it is verified |
| ------ | --------------------------------------------- | ------------------ | ------------------ |
| NFR-01 | `availability` / `latency` / `security` / ... | `<measurable bar>` | `<gate or probe>`  |

## Authoring rules

- A constraint without a `Source` is a preference. Name who imposes it, so a
  future change knows whom to ask.
- A floor without a verification method is unenforceable — state the gate or the
  probe that would catch a breach.
- Constraints bind every spec. Something true of one capability only belongs in
  that spec's `01_Spec.md`, not here.

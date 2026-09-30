# US-0001-0167: Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` regression check

## User Story

As a QFAI maintainer, I want the Reviewer Gate to emit `R-CERTIFY-VERIFY-CIRCULAR` at severity info whenever a change reintroduces the cycle where certify reads validator output that requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase, while `qfai prototyping certify` itself refuses the wrong-phase verdict with exit 2, so that the certify path that completes at the prototyping phase cannot silently regress to the old circular contract.

# One-Touch measurement projection

Status: experimental read-only projection. Governor decisions remain governed only by the bound contract, observation, and policy. Measurement cannot entitle execution or apply an intervention.

Traffic Control accepts optional `programId` on a governed handoff, retains it in the contract binding and normalized observation, emits it on Governor decisions and chained decision records, and returns it on the audited build receipt. The value is part of canonical hashes whenever present. Tampering therefore invalidates the existing contract, history, or receipt checks.

## Existing-store map

- `authority.observed` and execution batches: project the bound `programId`; keep native build/task/attempt identifiers.
- normalized observations: expose `programId` beside existing failure, evidence, impact, attempt, and phase fields.
- Governor decisions: carry `programId` without changing action, rule, authority effect, approval requirement, or signals.
- decision history: hash `programId` as part of each new record; replay keeps the same correlation.
- retry, repair, reconsideration, and replan: classify for measurement from the existing decision action. `REQUEST_RECONSIDER` and `PROPOSE_REPLAN` remain proposal-only and approval-required.
- receipt: bind `programId` to the same handoff and audit it with the existing receipt digest.

Legacy records without the identifier remain valid and measurement-ineligible. Never backfill from timing or text similarity. No second event/history/evidence store is introduced.

Authority Delta is observational: `NONE` changes no envelope; `BOUNDED` stays inside preapproved scope and ceilings; `MATERIAL` changes objective, task/repository surface, provider mutation, proof obligation, ceiling, or approving authority. Unknown deltas fail closed for execution and remain undetermined for analytics.

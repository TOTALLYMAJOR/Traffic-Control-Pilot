# Capability / Functional Map

## Capability model

The product is complete only when the whole governed loop works. “Implemented”
below means present in this local reference repository, not installed in the
live ProofLoom or AgentFlow runtime.

| ID | Capability | User or system action enabled | Current state | Evidence / next boundary |
| --- | --- | --- | --- | --- |
| CAP-01 | Governed intent ingestion | Supply the existing ProofLoom governed handoff without translating it into a competing authority | **Implemented locally** | `bindContract` consumes `design-intelligence/governed-task-handoff@2.0.0` and rejects v1 |
| CAP-02 | Authority verification | Refuse proposed, mutated, stale, wrong-repository, or wrong-source authority | **Implemented locally** | Contract and Governor refusal tests |
| CAP-03 | Observation normalization | Convert ordered runtime facts into one provider-neutral execution observation | **Implemented locally** | `reduceExecutionEvents` and event-reduction tests |
| CAP-04 | Failure identity | Distinguish materially repeated deterministic failure from different or transient failures | **Implemented locally** | Stable failure fingerprint tests |
| CAP-05 | Evidence progress | Determine whether another attempt learned anything relevant | **Implemented locally** | Evidence delta, including evidence recorded after failure |
| CAP-06 | Impact control | Detect task ownership violations, broader affected paths, and active-task collisions | **Implemented locally** | Task-attributed ownership and impact-delta tests |
| CAP-07 | Deterministic governance | Produce one explainable decision from the same contract, observation, and policy version | **Implemented locally** | `governor.v1` determinism test |
| CAP-08 | Protective intervention contract | Continue, delegate retry, request bounded repair, block integration, pause, reconsider, or propose replan | **Implemented on the AgentFlow integration branch** | Coordinator gates and acknowledgements are locally tested; live-pilot evidence remains pending |
| CAP-09 | Immutable decision history | Persist hash-linked decisions and detect mutation or reordering | **Implemented locally** | Decision-history verification tests |
| CAP-10 | Historical replay | Evaluate recorded histories under an explicit installed policy version without mutation | **Implemented locally** | Replay and mutation-refusal tests |
| CAP-11 | Receipt creation and audit | Prove the exact governed task set, commits, changed-file ownership, validations, evidence, authority, and decision chain | **Implemented locally** | `agentflow/build-receipt@1.0.0` creation and adversarial audits |
| CAP-12 | Structural escalation | Route architecture-level failure through proposal-only Decision Intelligence and a superseding approved handoff | **Implemented locally in ProofLoom** | Proposal, approve, reject, revise, cancel, and immutable supersession records are tested; real review remains pending |
| CAP-13 | Operator inspectability | See source event, signal, rule, decision, intervention, and result | **Backend evidence implemented; UI pending** | Durable AgentFlow events exist; visual selection and rendered operator timeline remain pending |
| CAP-14 | Outcome audit | Attach later delivery and user outcomes to the exact governed run | **Specified** | Requires ProofLoom outcome-audit integration |
| CAP-15 | Reviewed learning | Turn reviewed outcomes into candidate policy or design learning without silent self-modification | **Specified** | No autonomous policy update is permitted |
| CAP-16 | Runtime portability | Use the same decision protocol through other execution adapters | **Conceptual** | Do not extract until the AgentFlow reference path is operational |

## Actor permissions

| Actor | May do | Must not do |
| --- | --- | --- |
| Repository / product authority | Approve or supersede governed intent | Rewrite historical approved artifacts in place |
| ProofLoom / Design Intelligence | Discover truth, define intent, proof, journeys, and audit outcomes | Execute autonomous coding merely because analysis recommends it |
| AgentFlow | Plan, schedule, retry, validate, integrate, and issue execution evidence | Treat a proposal as approved authority |
| Governor | Decide entitlement to continue and request bounded interventions | Rewrite intent, architecture, retry schedules, or execution state directly |
| Decision Intelligence | Compare structural alternatives and produce draft decisions | Approve its own recommendation |
| Operator / reviewer | Resolve approval and review gates | Claim production or outcome proof from a local receipt |

## Capability dependencies

```text
CAP-01 + CAP-02
      -> CAP-03
      -> CAP-04 + CAP-05 + CAP-06
      -> CAP-07
      -> CAP-08 + CAP-09
      -> CAP-10 + CAP-11 + CAP-13
      -> CAP-12 + CAP-14
      -> CAP-15
```

CAP-07 cannot be trusted without authority verification and normalized facts.
CAP-11 cannot claim completion without the decision trail and proof evidence.
CAP-15 cannot occur before an outcome is reviewed by the proper authority.

## Functional completeness rule

The local reference is protocol-complete for its synthetic acceptance slice.
The product is not operationally complete until CAP-01 through CAP-14 execute
through the native ProofLoom and AgentFlow path against a real consuming
repository. Runtime portability and policy learning remain later capabilities,
not prerequisites for the first live pilot.

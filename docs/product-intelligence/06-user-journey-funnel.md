# User Journey / Funnel Model

## Journey principle

Traffic Control Pilot has two valid value paths:

1. **verified completion**, when execution remains entitled to continue; and
2. **protective resolution**, when the correct outcome is to stop, repair,
   review, or supersede the strategy.

A funnel that counts only integrated builds would misclassify safety as
failure. Both paths begin with approved intent and must end with auditable
evidence and reviewed outcome.

## Primary actors

- **Repository owner / product authority:** approves intent and material change.
- **ProofLoom operator:** creates the governed handoff and audits the receipt.
- **AgentFlow operator:** starts and supervises execution.
- **Autonomous runtime:** performs bounded implementation work.
- **Governor:** evaluates entitlement to continue.
- **Decision reviewer:** resolves structural escalation.
- **Outcome reviewer:** adjudicates whether the disposition was correct.

## Canonical journey

| Stage | User-visible or system outcome | Entry evidence | Successful exit | Primary fallout |
| --- | --- | --- | --- | --- |
| J-01 Intent ready | Objective, tasks, ownership, dependencies, and proof obligations are explicit | Governed handoff created | Submitted for proper approval | Ambiguous intent or duplicate authority |
| J-02 Authority approved | Human or repository authority approves immutable intent | Approval identity and timestamp | Hash-bound approved handoff | Proposed artifact mistaken for approval |
| J-03 Contract verified | AgentFlow confirms schema, repository, commit, sources, task scope, and digest | `contract.verification_completed` | Immutable plan may be bound | Stale base, source drift, unsupported schema |
| J-04 Execution started | Operator can identify build, tasks, policy, and authority | `execution.started` | First bounded attempt starts | Missing correlation or silent manual translation |
| J-05 Execution observed | Changed files, validation, evidence, attempts, and impact are current | Runtime source events | Normalized observation produced | Missing task attribution or stale evidence |
| J-06 Entitlement decided | Operator can see signal, rule, action, and proof boundary | `governor.decision` | Continue or bounded intervention | Non-determinism, unexplained rule, delayed decision |
| J-07A Work progresses | Retry, repair, or continued work remains inside authority | Successful intervention or `CONTINUE` | Integration requested with required proof | Blind retry or expanding impact |
| J-07B Protection engages | Unsafe or no-progress work stops and reaches the right reviewer | Block, pause, reconsider, or replan | Safe resolution or approved superseding contract | Review dead end or self-authorized change |
| J-08 Integration gated | Only owned, validated, evidence-complete work can integrate | Integration request | Integration commit(s) recorded | Missing or contradicted proof, unauthorized files |
| J-09 Receipt audited | Exact contract, tasks, commits, validation, evidence, authority, and decisions reconcile | Build receipt issued | Audit passes or defect is contained | False completion claim or broken decision chain |
| J-10 Outcome reviewed | Disposition correctness and later outcome are recorded | `outcome.reviewed` | Learning candidate may be considered | No review, selective review, or outcome overclaim |

## Completion path funnel

```text
approved handoff
  -> verified ingestion
  -> execution started
  -> decision coverage complete
  -> integration requested
  -> integration completed
  -> receipt audit passed
  -> outcome reviewed
```

Report conversion and elapsed time for every transition. The `receipt audit
passed` stage proves only its declared execution/integration boundary.

## Protective path funnel

```text
unsafe or no-progress signal
  -> protective decision
  -> runtime intervention acknowledged
  -> mutation/integration contained
  -> reviewer disposition
  -> repair OR superseding approved contract OR cancellation
  -> outcome reviewed
```

For structural failure, the safe loop is:

```text
Governor concern
  -> Decision Intelligence proposal
  -> human/repository decision
  -> ProofLoom reconciliation
  -> new approved handoff
  -> AgentFlow replacement plan
```

The proposal is not a conversion until authority approves a superseding
contract.

## Funnel measures

| Transition | Measure | Diagnostic question |
| --- | --- | --- |
| J-02 -> J-03 | Native contract ingestion rate | Are valid contracts operationally consumable? |
| J-04 -> J-06 | Decision coverage and latency | Is every active run actually governed in time? |
| J-06 -> J-07A/B | Intervention acknowledgement rate | Did the runtime apply the decision? |
| J-07A -> J-08 | Excess attempts and evidence delta | Did work progress or merely repeat? |
| J-07B -> reviewer disposition | Time to protective resolution | Does safe stopping become operational paralysis? |
| J-08 -> J-09 | Receipt audit pass rate | Does completion evidence reconcile exactly? |
| J-09 -> J-10 | Review coverage | Can policy correctness be evaluated? |

## Journey failure taxonomy

- **Authority failure:** wrong approver, stale contract, changed source, or
  silent historical mutation.
- **Observability failure:** missing, duplicated, late, or unattributed facts.
- **Policy failure:** wrong rule, non-deterministic result, or unsafe precedence.
- **Runtime failure:** decision not acknowledged or intervention not applied.
- **Proof failure:** integration claimed without the required evidence.
- **Escalation failure:** structural concern has no bounded reviewer path.
- **Audit failure:** receipt cannot be reconciled to exact execution.
- **Outcome failure:** no review, biased review sample, or business claims beyond
  the evidence boundary.

## Current journey boundary

The local demo exercises J-02 through J-09 synthetically and shows both the
protective and completion paths. It does not prove native J-03/J-04 operation in
AgentFlow, a real reviewer journey, J-10 outcome review, or production funnel
performance.

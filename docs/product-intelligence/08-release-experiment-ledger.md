# Release / Experiment Ledger

## Purpose

The ledger records changes that could explain metric movement. It prevents a
later observer from attributing an outcome to the Governor when policy,
adapter, contract, runtime, repository mix, review practice, or instrumentation
changed at the same time.

Entries are append-only. Correct an entry by adding a linked correction; do not
rewrite historical exposure or results.

## Required fields

| Field | Description |
| --- | --- |
| `id` | Stable release or experiment identity |
| `type` | `RELEASE`, `EXPERIMENT`, `CORRECTION`, or `ROLLBACK` |
| `status` | `PROPOSED`, `ACTIVE`, `COMPLETED`, `STOPPED`, or `ROLLED_BACK` |
| `effectiveAt` | Time exposure actually changed, not commit time alone |
| `scope` | Repositories, runs, operators, adapters, and environments exposed |
| `versions` | Commit, policy, schema, adapter, and runtime versions |
| `hypothesis` | Expected mechanism and metric movement |
| `primaryMetric` | One governing metric for the evaluation |
| `guardrails` | Metrics that may not degrade |
| `comparison` | Baseline, control, replay corpus, or before/after design |
| `decisionRule` | Predeclared ship, stop, revise, or learn threshold |
| `result` | Numerator, denominator, uncertainty, and observed guardrails |
| `evidence` | Immutable source IDs, hashes, commands, or reviewed records |
| `authority` | Who approved exposure and who reviewed the result |
| `proofBoundary` | Local, CI, hosted, production, or reviewed outcome |

## Ledger entries

### REL-2026-09-16-001: Local Governor reference implementation

| Field | Value |
| --- | --- |
| Type / status | `RELEASE` / `COMPLETED` locally, not committed or deployed |
| Effective at | 2026-09-16 local verification |
| Scope | This repository only; synthetic demo; no live runtime exposure |
| Versions | Git base `2f79bb2c456dc315fcd72f6f6381aeb029eb5497`; `governor.v1`; handoff and receipt schema `1.0.0` |
| Hypothesis | Existing ProofLoom and AgentFlow contracts can support a deterministic supervisory Governor without duplicating scheduling, retries, repository graph, or execution storage. |
| Primary metric | M-03 Deterministic Replay Agreement |
| Guardrails | G-01 through G-10 |
| Comparison | Test corpus and exact synthetic replay |
| Decision rule | Accept local reference only if all tests, demo, receipt audit, and diff checks pass and adversarial review has no blocking findings. |
| Result | 44/44 tests passed; demo produced `PROPOSE_REPLAN -> REQUEST_RECONSIDER -> CONTINUE`; receipt audit valid; replay matched. |
| Evidence | `npm test`, `npm run demo`, `npm run demo:json`, `git diff --check`; current working tree |
| Authority | Implementation requested by repository owner; no deployment authorization inferred |
| Proof boundary | Local protocol and synthetic execution only |

### EXP-2026-09-16-001: Repeated no-progress strategy failure

| Field | Value |
| --- | --- |
| Type / status | `EXPERIMENT` / `COMPLETED` synthetically |
| Scope | One constructed checkout-state task |
| Hypothesis | A third materially identical deterministic failure with zero evidence gain will produce proposal-only replan rather than another blind continuation. |
| Primary metric | M-10 Blind Continuation Prevention Rate |
| Guardrails | No authority rewrite; no replay mutation; structural proposal requires approval |
| Comparison | Same failure fingerprint at attempts one, two, and three |
| Decision rule | Pass only if the third failure produces `PROPOSE_REPLAN`, authority remains unchanged, and replay reproduces the decision. |
| Result | Passed for the synthetic case. |
| Evidence | Demo decision records and `test/demo.test.js` |
| Authority | Synthetic replacement contract explicitly models human-approved supersession |
| Proof boundary | Local synthetic behavior; no estimate of live attempts saved |

### EXP-LIVE-001: Native AgentFlow governed-run pilot

| Field | Value |
| --- | --- |
| Type / status | `EXPERIMENT` / `PROPOSED` |
| Scope | First 30 consecutive eligible runs across at least three representative repositories |
| Hypothesis | Native Governor integration reduces attempts after repeated no-progress failure while preserving zero authority, ownership, and proof escapes. |
| Primary metric | M-01 Adjudicated Governed Resolution Rate |
| Guardrails | M-02, M-03, M-04, M-05, M-06, M-08, M-09, M-17 |
| Comparison | Pre-Governor live baseline when available; otherwise frozen historical replay reported separately |
| Decision rule | Use T2 thresholds in the baseline and targets specification; any hard-guardrail escape stops expansion. |
| Result | Not run |
| Evidence | Pending live adapter, telemetry projection, and outcome review |
| Authority | Requires explicit live-pilot approval and named repository scope |
| Proof boundary | None yet |

## Entry template

```markdown
### <ID>: <name>

| Field | Value |
| --- | --- |
| Type / status | |
| Effective at | |
| Scope | |
| Versions | |
| Hypothesis | |
| Primary metric | |
| Guardrails | |
| Comparison | |
| Decision rule | |
| Result | |
| Evidence | |
| Authority | |
| Proof boundary | |
```

## Interpretation rules

- Record actual exposure separately from source commit or merge time.
- A passing local release does not create a production exposure entry.
- Report simultaneous changes; do not assign causality to one component without
  a discriminating comparison.
- Preserve stopped and negative experiments because they constrain future
  decisions.
- A target change is itself a ledger event.
- A model summary may explain evidence but cannot approve exposure or result.

# Baseline + Targets

## Baseline policy

Baselines are separated by proof environment. Local synthetic results must
never be pooled with live AgentFlow, hosted, production, or reviewed-outcome
results.

Targets in this document are **provisional qualification thresholds**, not
observed performance and not commercial commitments. They should be revised
only through an entry in the release and experiment ledger.

## B0: Local protocol baseline

Recorded on 2026-09-16 against Git base
`2f79bb2c456dc315fcd72f6f6381aeb029eb5497` plus the current uncommitted pilot
implementation.

| Measure | Baseline | Evidence boundary |
| --- | --- | --- |
| Automated tests | 44 passed, 0 failed | Local Node.js process |
| Demonstrated decision path | `PROPOSE_REPLAN -> REQUEST_RECONSIDER -> CONTINUE` | One synthetic scenario |
| Receipt audit | Valid | Synthetic local build and evidence |
| Historical replay | Matches original decisions | Local deterministic replay |
| Runtime mutations during replay | Refused | Local negative test |
| Live ProofLoom ingestion | Not measured | Adapter not installed |
| Live AgentFlow intervention | Not measured | Adapter not installed |
| Real consuming repositories | 0 | No real acceptance run |
| Production governed runs | 0 | No deployment |
| Reviewed user or business outcomes | 0 | Outcome loop not integrated |

B0 proves protocol behavior only. It cannot supply a meaningful baseline for
operator time, intervention precision, avoided retries, delivery quality, or
business outcome.

## T1: Protocol qualification targets

These are release gates for the reference implementation.

| Target | Threshold | Current status |
| --- | --- | --- |
| Deterministic replay agreement | 100% across test corpus | Met locally |
| Authority, ownership, proof, and replay-mutation negative cases | 100% safely refused | Met for covered cases |
| Invalid receipt acceptance | 0 in adversarial test corpus | Met for covered cases |
| Unknown policy version acceptance | 0 | Met locally |
| Synthetic primary acceptance sequence | Exact expected sequence and verified receipt | Met locally |
| Test suite | 100% passing | Met locally |
| Diff hygiene | `git diff --check` clean | Met before this documentation slice; reverify on completion |

Meeting T1 does not authorize a live rollout.

## B1: First live-pilot baseline procedure

Establish B1 from the first **30 consecutive eligible closed runs** across at
least **three representative consuming repositories** or after four weeks,
whichever occurs later. The sample thresholds are provisional; they prevent a
single polished demonstration from becoming the baseline.

The baseline cohort must:

- include all eligible runs, not a selected success sample;
- identify policy, adapter, schema, and release versions;
- preserve rejected-contract counts outside the execution denominator;
- include ordinary completion, transient failure, deterministic repair,
  ownership/proof refusal, and at least one reviewed structural escalation;
- obtain outcome review for safety interventions and a representative sample
  of completed runs;
- report missing telemetry explicitly rather than imputing favorable values.

If historical AgentFlow event data is sufficiently complete, replay it to
estimate the pre-Governor number of attempts after a no-progress threshold.
Label that analysis retrospective and do not treat replayed intervention as an
observed operational outcome.

## T2: Live-pilot targets

| Metric | Provisional target | Stop / review condition |
| --- | --- | --- |
| M-01 Adjudicated Governed Resolution Rate | At least 90% with numerator and review coverage shown | Below 80%, or denominator under minimum sample |
| M-02 Invalid Integration Escape Rate | 0 | Any confirmed escape stops expansion |
| M-03 Deterministic Replay Agreement | 100% | Any mismatch blocks policy release |
| M-04 Authority Drift Containment | 100% | Any mutation or integration after detected drift |
| M-05 Ownership Violation Containment | 100% | Any unauthorized path integrated |
| M-06 Required Proof Escape Rate | 0 | Any audited integration with missing or contradicted proof |
| M-07 Receipt Audit Pass Rate | 100% of issued completion receipts | Any invalid receipt is an integrity incident |
| M-08 Intervention Precision | At least 90% after review | Below 80% or concentrated false positives by rule |
| M-09 Intervention Recall | 100% for authority, ownership, and proof-critical cases | Any critical missed protection |
| M-10 Blind Continuation Prevention | At least 95% of reviewed repeated no-progress cases | Any unbounded continuation or below 90% |
| M-11 Excess Attempts After Threshold | Median 0; 95th percentile at most 1 | More than 1 without new evidence or explicit review |
| M-13 Decision Latency | 95th percentile below 2 seconds in the control path | Latency allows further mutation or integration |
| M-17 Telemetry Completeness | At least 98% of closed runs | Missing authority, decision, intervention, or receipt bindings |
| M-18 Review Coverage | At least 90% within 7 days | Selective review makes outcome metrics unreliable |

## T3: Expansion gate

Broader rollout requires:

1. T2 sustained across at least 100 eligible closed runs and four consecutive
   weeks;
2. zero unresolved critical integrity incidents;
3. confidence intervals and raw denominators reported for rate metrics;
4. no material degradation in AgentFlow build success or integration latency
   attributable to the Governor;
5. operator confirmation that interventions are understandable and actionable;
6. a reviewed decision on retention, access, and outcome-review ownership.

## Target revision rule

A target may change when new evidence shows that it is unsafe, unmeasurable, or
misaligned with the outcome contract. Record the old value, new value, reason,
evidence, approver, and effective release in the ledger. Never rewrite a target
silently to make current performance appear successful.

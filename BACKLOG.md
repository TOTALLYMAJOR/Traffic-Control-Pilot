# Traffic Control Plane operationalization backlog

## Backlog Coverage

This backlog turns the locally verified Traffic Control Pilot into a native,
measurable ProofLoom / Design Intelligence and AgentFlow operating loop. It is
derived from the product outcome contract, capability map, instrumentation
specification, baselines, journey model, guardrails, and release ledger under
`docs/product-intelligence/`.

Completion means an approved governed handoff can enter AgentFlow without
manual translation, receive deterministic Governor decisions during execution,
produce durable interventions and telemetry, return an exact audited receipt to
ProofLoom, escalate structural failure without self-authorization, and produce
reviewed outcome evidence from a real consuming-repository pilot.

This file is a **human-readable planning projection**, not execution authority.
Cross-repository work requires an approved, hash-bound governed handoff for the
target repository and exact target-repository ownership verification before
dispatch. Paths below are proposed ownership boundaries and must be reconciled
with the live checkout when each handoff is approved.

## Priority and state

| Task | Priority | Target repository | State | Unlocks |
| --- | --- | --- | --- | --- |
| TCP-001 | P0 | Traffic-Control-Plane | Implemented and committed locally; publication pending | Stable integration baseline |
| TCP-002 | P0 | AgentFlow | Implemented; native observation proven in one bounded real-repository run | Native observations |
| TCP-003 | P0 | AgentFlow | Implemented; durable `CONTINUE` and `REQUEST_REPAIR` decisions proven locally | Live control decisions |
| TCP-004 | P0 | AgentFlow | Projection implemented and tested; live coverage pending | Trustworthy product metrics |
| TCP-005 | P1 | AgentFlow | Implemented with rendered desktop/mobile completed-work evidence; interaction-state acceptance remains | Operator supervision |
| TCP-006 | P0 | ProofLoom / Design Intelligence | Implemented; real completed receipt audited `PASS` locally | Audited completion loop |
| TCP-007 | P1 | Design Intelligence | Implemented and tested; real supersession pending | Governed structural escalation |
| TCP-008 | P0 | AgentFlow + consuming repositories | One bounded technical pilot passed; 30-run multi-repository acceptance remains | Real acceptance evidence |
| TCP-009 | P1 | ProofLoom / Design Intelligence | Depends on TCP-006 and TCP-008 | Reviewed outcomes and learning candidates |
| TCP-010 | P2 | Traffic-Control-Plane + AgentFlow + ProofLoom / Design Intelligence | Slices A-C stage from TCP-006; second-runtime qualification depends on TCP-008 | Harness Profile-governed runtime portability |

## TCP-001 - Publish the verified protocol and intelligence baseline

```yaml
epic_id: TCP-FOUNDATION
epic_title: Versioned control-plane foundation
epic_outcome: Every integration task binds to one recoverable, reviewed Traffic Control baseline.
target_repository: Traffic-Control-Plane
estimate_hours: 2
depends_on: []
owns:
  - traffic-control-plane/README.md
  - traffic-control-plane/BACKLOG.md
  - traffic-control-plane/package.json
  - traffic-control-plane/docs/protocol.md
  - traffic-control-plane/docs/product-intelligence
  - traffic-control-plane/src/cli.js
  - traffic-control-plane/src/contracts.js
  - traffic-control-plane/src/demo.js
  - traffic-control-plane/src/governor.js
  - traffic-control-plane/src/history.js
  - traffic-control-plane/src/integrity.js
  - traffic-control-plane/src/observations.js
  - traffic-control-plane/src/receipts.js
  - traffic-control-plane/test/contracts.test.js
  - traffic-control-plane/test/demo.test.js
  - traffic-control-plane/test/governor.test.js
  - traffic-control-plane/test/history.test.js
  - traffic-control-plane/test/observations.test.js
  - traffic-control-plane/test/receipts.test.js
validate:
  - npm test
  - npm run demo
  - npm run demo:json
  - git diff --check
produces:
  - name: traffic-control-reference-baseline
    type: git-commit
    version: 0.1.0
    path: .
```

Review the current local implementation and product-intelligence set, stage
only the intended repository files, commit them, push only with explicit owner
authorization, and verify the remote branch SHA. Preserve the distinction
between local, committed, pushed, deployed, and accepted states.

### Acceptance Criteria

- All 44 or more repository tests pass from the exact commit being published.
- The demo produces `PROPOSE_REPLAN -> REQUEST_RECONSIDER -> CONTINUE`, a valid
  receipt audit, and deterministic replay.
- The telemetry schema parses and every local Markdown link resolves.
- The commit contains only the intended Traffic Control baseline and backlog.
- When publication is authorized, the remote branch SHA equals the validated
  local commit; no deployment or live-integration claim is inferred.

## TCP-002 - Build the native AgentFlow observation adapter

```yaml
epic_id: TCP-AGENTFLOW
epic_title: Native governed execution supervision
epic_outcome: AgentFlow exposes authoritative execution facts to the Governor without duplicating runtime state.
target_repository: AgentFlow
estimate_hours: 8
depends_on:
  - TCP-001
owns:
  - agentflow/apps/server/src/integration/traffic-control.ts
  - agentflow/apps/server/test/traffic-control-observation.test.ts
validate:
  - npm test -- --run apps/server/test/traffic-control-observation.test.ts
  - npm run typecheck
consumes:
  - task: TCP-001
    artifact: traffic-control-reference-baseline
    version: 0.1.0
produces:
  - name: agentflow-observation-adapter
    type: provider-adapter
    version: 1.0.0
    path: apps/server/src/integration/traffic-control.ts
```

Project existing AgentFlow build, attempt, validation, changed-file,
repository-impact, collision, retry, and authority records into
`traffic-control/execution-observation@1`. Reuse the existing event repository,
knowledge graph, and retry classification. Do not add a second scheduler,
retry engine, graph, or execution database.

### Acceptance Criteria

- A verified approved handoff and AgentFlow event history produce the same
  normalized observation as the reference reducer fixtures.
- Multi-task changed files retain task identity; missing attribution fails
  closed rather than inheriting another task's ownership.
- Base commit, repository identity, handoff digest, approval provenance, and
  authority-source digests come from authoritative records.
- Missing or malformed authoritative facts produce a protective error and
  never synthetic values.
- Existing AgentFlow planning, retry, and build behavior is unchanged when the
  adapter is not enabled.

## TCP-003 - Persist decisions and apply bounded AgentFlow interventions

```yaml
epic_id: TCP-AGENTFLOW
epic_title: Native governed execution supervision
epic_outcome: AgentFlow exposes authoritative execution facts to the Governor without duplicating runtime state.
target_repository: AgentFlow
estimate_hours: 8
depends_on:
  - TCP-002
owns:
  - agentflow/apps/server/src/governor/control-service.ts
  - agentflow/apps/server/src/governor/runtime-adapter.ts
  - agentflow/apps/server/test/governor-control-service.test.ts
validate:
  - npm test -- --run apps/server/test/governor-control-service.test.ts
  - npm run typecheck
consumes:
  - task: TCP-002
    artifact: agentflow-observation-adapter
    version: 1.0.0
produces:
  - name: agentflow-governor-runtime
    type: control-service
    version: 1.0.0
    path: apps/server/src/governor/control-service.ts
```

Evaluate `governor.v1`, persist hash-linked decisions through AgentFlow's
durable event path, and translate decisions into the coordinator's existing
continue, retry, repair, block, pause, reconsider, replan, and cancel controls.
AgentFlow retains execution state and retry timing.

### Acceptance Criteria

- The same bound contract, normalized observation, and policy version produce
  byte-equivalent decision content.
- Authority drift, ownership violation, missing or contradicted proof, impact
  expansion, retry exhaustion, and unclassified failure fail closed.
- `DELEGATE_RETRY` invokes AgentFlow's existing retry policy without creating a
  second retry schedule.
- Structural decisions remain proposal-only and cannot mutate approved intent
  or authorize their own replacement contract.
- Replay persists no live event and invokes no runtime mutation.
- Every applied or refused intervention records the triggering decision hash
  and acknowledgement result.

## TCP-004 - Project governed-run telemetry and compute trustworthy metrics

```yaml
epic_id: TCP-MEASUREMENT
epic_title: Observable product outcomes
epic_outcome: Every success, failure, and protective decision can be measured from authoritative source records.
target_repository: AgentFlow
estimate_hours: 6
depends_on:
  - TCP-002
  - TCP-003
owns:
  - agentflow/apps/server/src/telemetry/traffic-control-projection.ts
  - agentflow/apps/server/test/traffic-control-telemetry.test.ts
validate:
  - npm test -- --run apps/server/test/traffic-control-telemetry.test.ts
  - npm run typecheck
consumes:
  - task: TCP-003
    artifact: agentflow-governor-runtime
    version: 1.0.0
produces:
  - name: governed-run-telemetry
    type: event-projection
    version: 1.0.0
    path: apps/server/src/telemetry/traffic-control-projection.ts
```

Project AgentFlow, Governor, and receipt facts into
`traffic-control/telemetry-event@1.0.0`. This is an idempotent analytics
projection, not a new execution authority. Implement the metric definitions in
`docs/product-intelligence/03-success-metric-specification.md` with explicit
environment, denominator, review-coverage, and proof-boundary fields.

### Acceptance Criteria

- Every event validates against the versioned telemetry schema and carries a
  stable source record identity, run sequence, handoff ID, and contract digest.
- Duplicate source facts do not double count; late events recompute affected
  aggregates without rewriting history.
- Local, CI, hosted, production, and reviewed-outcome populations cannot be
  combined accidentally.
- Missing telemetry makes the affected metric unavailable rather than
  imputing a favorable value.
- No source code, prompts, secrets, tokens, environment values, or unbounded
  raw logs enter product telemetry.

## TCP-005 - Add an inspectable Governor timeline to AgentFlow

```yaml
epic_id: TCP-OPERATOR
epic_title: Explainable execution supervision
epic_outcome: Operators can understand and safely act on every Governor disposition.
target_repository: AgentFlow
estimate_hours: 8
depends_on:
  - TCP-003
  - TCP-004
owns:
  - agentflow/apps/web/src/screens/GovernorRunScreen.tsx
  - agentflow/apps/web/src/components/GovernorDecisionTimeline.tsx
  - agentflow/apps/web/src/api/governor-types.ts
  - agentflow/apps/web/test/GovernorRunScreen.test.tsx
validate:
  - npm test -- --run apps/web/test/GovernorRunScreen.test.tsx
  - npm run typecheck
consumes:
  - task: TCP-003
    artifact: agentflow-governor-runtime
    version: 1.0.0
  - task: TCP-004
    artifact: governed-run-telemetry
    version: 1.0.0
```

Show the authoritative source event, normalized signal, matched rule, decision,
required approval, runtime intervention, acknowledgement, and result in the
existing AgentFlow operator experience.

### Acceptance Criteria

- Every decision view exposes policy version, contract digest, observation
  digest, rule, action, signals, proof boundary, and record-chain status.
- Blocks and pauses name the cause, current authority, and next permitted
  action without implying that the operator must approve an unsafe path.
- Proposal-only structural decisions are visually and behaviorally distinct
  from approved execution controls.
- Integrated, published, deployed, reviewed, and outcome-proven states are not
  conflated.
- Desktop and mobile views pass rendered, keyboard, overflow, loading, empty,
  error, and stale-data checks.

## TCP-006 - Complete the ProofLoom receipt and outcome-audit round trip

```yaml
epic_id: TCP-PROOFLOOM
epic_title: Exact completion and outcome proof
epic_outcome: ProofLoom can audit the exact execution authorized by its governed handoff.
target_repository: ProofLoom-Design-Intelligence
estimate_hours: 6
depends_on:
  - TCP-003
owns:
  - proofloom-design-intelligence/design_intelligence/traffic_control_audit.py
  - proofloom-design-intelligence/tests/test_traffic_control_audit.py
  - proofloom-design-intelligence/docs/TRAFFIC-CONTROL-AUDIT.md
validate:
  - python -m pytest tests/test_traffic_control_audit.py
consumes:
  - task: TCP-003
    artifact: agentflow-governor-runtime
    version: 1.0.0
produces:
  - name: proofloom-governed-run-audit
    type: audit-service
    version: 1.0.0
    path: design_intelligence/traffic_control_audit.py
```

Extend the existing AgentFlow receipt audit so ProofLoom verifies the exact
handoff, tasks, independent integration commits, changed-file ownership,
validation commands, evidence digests, authority observation, Governor decision
chain, and proof boundary.

### Acceptance Criteria

- A receipt cannot pass with missing tasks, substituted contracts, mismatched
  commits, unauthorized changed files, failed validation, missing evidence, or
  invalid Governor provenance.
- Receipt verification uses the existing `agentflow/build-receipt@1.0.0`
  document rather than introducing a competing completion authority.
- A passed audit records local execution/integration proof only unless separate
  hosted or outcome evidence exists.
- Mutation of a handoff, receipt, decision record, or evidence artifact is
  detected by its binding.
- Audit results are linkable to the governed run telemetry without making the
  telemetry projection authoritative.

## TCP-007 - Operationalize proposal-only structural escalation

```yaml
epic_id: TCP-ESCALATION
epic_title: Governed strategy replacement
epic_outcome: Structural failure reaches reviewed alternatives and a superseding authority without runtime self-authorization.
target_repository: ProofLoom-Design-Intelligence
estimate_hours: 8
depends_on:
  - TCP-003
  - TCP-006
owns:
  - proofloom-design-intelligence/design_intelligence/traffic_control_escalation.py
  - proofloom-design-intelligence/tests/test_traffic_control_escalation.py
  - proofloom-design-intelligence/docs/TRAFFIC-CONTROL-ESCALATION.md
validate:
  - python -m pytest tests/test_traffic_control_escalation.py
consumes:
  - task: TCP-006
    artifact: proofloom-governed-run-audit
    version: 1.0.0
produces:
  - name: structural-escalation-contract
    type: governed-proposal
    version: 1.0.0
    path: design_intelligence/traffic_control_escalation.py
```

Route a bounded structural concern and its evidence to Decision Intelligence,
produce comparable alternatives, require human or repository selection,
reconcile the selected change through ProofLoom, and issue a new approved
handoff that supersedes rather than mutates the prior one.

### Acceptance Criteria

- Decision Intelligence output remains advisory until an authorized approval
  record exists.
- The original handoff, plan, decisions, and receipt history remain immutable.
- The superseding handoff identifies its predecessor, changed authority, source
  evidence, new digest, and approval provenance.
- AgentFlow cannot resume structural work against the old handoff after
  supersession.
- Rejection, request-for-revision, cancellation, and approval paths are all
  durable and inspectable.

## TCP-008 - Prove the native loop in a real consuming-repository pilot

```yaml
epic_id: TCP-PILOT
epic_title: Live governed execution evidence
epic_outcome: The product outcome is measured from real governed runs rather than a synthetic demonstration.
target_repository: AgentFlow
estimate_hours: 12
depends_on:
  - TCP-004
  - TCP-005
  - TCP-006
  - TCP-007
owns:
  - agentflow/apps/server/test/traffic-control-live-pilot.test.ts
  - agentflow/tests/fixtures/traffic-control-pilot
  - agentflow/docs/audits/traffic-control-live-pilot.md
validate:
  - npm test -- --run apps/server/test/traffic-control-live-pilot.test.ts
  - npm run test:integration
  - npm run build
consumes:
  - task: TCP-004
    artifact: governed-run-telemetry
    version: 1.0.0
  - task: TCP-006
    artifact: proofloom-governed-run-audit
    version: 1.0.0
  - task: TCP-007
    artifact: structural-escalation-contract
    version: 1.0.0
produces:
  - name: live-pilot-evidence
    type: acceptance-evidence
    version: 1.0.0
    path: docs/audits/traffic-control-live-pilot.md
```

Run the primary acceptance scenario against a real, explicitly approved
consuming repository, then establish the first live baseline from 30
consecutive eligible closed runs across at least three representative
repositories or four weeks, whichever is later.

### Acceptance Criteria

- The real scenario covers approved handoff ingestion, immutable planning,
  execution, repeated no-progress failure, protective intervention, structural
  escalation, approved supersession, successful replacement execution, receipt
  audit, and outcome review.
- Every run reports numerator, denominator, environment, policy, adapter,
  schema, release exposure, telemetry coverage, and proof boundary.
- Invalid integration, authority, ownership, required-proof, replay, and
  structural self-authorization escapes remain zero.
- The pilot includes every eligible run rather than a selected success sample.
- Results are compared with the provisional T2 targets without rewriting the
  targets after observation.

## TCP-009 - Add reviewed outcome capture and learning candidates

```yaml
epic_id: TCP-LEARNING
epic_title: Evidence-bound improvement
epic_outcome: Later outcomes can improve future decisions without silently changing policy or authority.
target_repository: ProofLoom-Design-Intelligence
estimate_hours: 8
depends_on:
  - TCP-006
  - TCP-008
owns:
  - proofloom-design-intelligence/design_intelligence/traffic_control_outcomes.py
  - proofloom-design-intelligence/tests/test_traffic_control_outcomes.py
  - proofloom-design-intelligence/docs/TRAFFIC-CONTROL-OUTCOMES.md
validate:
  - python -m pytest tests/test_traffic_control_outcomes.py
consumes:
  - task: TCP-008
    artifact: live-pilot-evidence
    version: 1.0.0
produces:
  - name: reviewed-governor-learning-candidate
    type: reviewed-evidence
    version: 1.0.0
    path: design_intelligence/traffic_control_outcomes.py
```

Capture reviewer adjudication, operator override, later delivery evidence, and
known customer or business outcomes against the exact governed run. Generate
bounded learning candidates for review; never update Governor policy
autonomously.

### Acceptance Criteria

- Outcome review distinguishes policy conformance from adjudicated correctness
  and records the reviewer authority and review window.
- Local receipt, hosted behavior, customer acceptance, and business outcome
  remain separate evidence classes.
- Corrections append a new linked record and do not rewrite prior outcome
  history.
- Selective or insufficient review coverage is visible and prevents favorable
  primary-metric claims.
- A learning candidate names supporting and contradictory evidence, applicable
  policy versions, uncertainty, and the approval required for adoption.

## TCP-010 - Qualify Harness Profile-aware runtime portability

```yaml
epic_id: TCP-PORTABILITY
epic_title: Runtime-neutral governance protocol
epic_outcome: The deterministic Governor can supervise a runtime governed by an approved Proofloom Harness Profile without taking semantic-control or execution authority.
target_repository: Traffic-Control-Plane + AgentFlow + ProofLoom-Design-Intelligence
estimate_hours: 28
depends_on:
  - TCP-002
  - TCP-003
  - TCP-006
  - TCP-008
validate:
  - npm test
  - npm run demo
produces:
  - name: harness-profile-aware-runtime-contract
    type: cross-repository-protocol-contract
    version: 1.0.0
    path: docs/runtime-adapter-contract.md
```

Extend the existing portability task rather than introducing a second
portability framework. Proofloom remains authoritative for Harness Profile
semantics, evidence obligations, and acceptance. AgentFlow remains the
execution authority and source of runtime enforcement facts. Traffic Control
normalizes those facts, decides entitlement to continue, applies protective
interventions through the runtime port, and retains immutable replayable
decision history.

Do not copy the Harness Profile into a Traffic Control-owned schema. Bind an
immutable approved profile reference and digest into the governed handoff, then
evaluate only the small set of profile facts that can change entitlement to
continue. A profile change requires a newly approved handoff; drift cannot
self-authorize a replacement.

The four delivery slices below are the dispatchable tasks under TCP-010; the
epic is an aggregate and is not separately executable.

### Harness Profile signal disposition

| Candidate | Authoritative source | Existing observation | Governor need and decision | Remediation owner | Deterministic and replay requirement |
| --- | --- | --- | --- | --- | --- |
| Harness Profile digest mismatch | Proofloom-approved profile reference and digest, compared with the profile digest AgentFlow loaded | No profile field; analogous handoff drift is already authority-checked | **Add.** `PAUSE_FOR_REVIEW` before further execution or integration | Proofloom corrects or supersedes authority; AgentFlow reloads only after approval | Exact digest mismatch always pauses; replay uses the recorded approved and loaded digests |
| Unsupported profile version | Proofloom profile identity/version plus the runtime-port compatibility declaration | Unsupported Governor and handoff versions fail closed, but profile versions are absent | **Add.** `PAUSE_FOR_REVIEW`; never reinterpret through the latest profile | Proofloom selects a supported profile or the runtime-port owner adds reviewed support | Supported-version matrix is policy-versioned; unknown versions fail closed in live and replay modes |
| Profile drift | Same approved-versus-loaded digest evidence as digest mismatch | No separate field | **Do not add a second signal.** Treat drift as digest mismatch or approved handoff supersession | Proofloom owns supersession; AgentFlow must not hot-swap profiles | Mid-run digest change pauses; replay preserves both handoff histories without mutating either |
| Required runtime capability missing | Proofloom's required capability IDs and AgentFlow's authoritative capability attestation | No | **Add only for required capabilities.** `PAUSE_FOR_REVIEW` before dependent work starts | AgentFlow provides the capability; Proofloom may approve a different profile | Missing required capability pauses; optional capability absence has no Governor effect; replay uses captured attestations |
| Unauthorized write | AgentFlow changed-file records and task ownership in the approved handoff | Yes: `files.changed` -> `impactDelta.unexpectedChangedPaths` | **Reuse.** `BLOCK_INTEGRATION` through `ownership-violation` | AgentFlow repairs/reverts within existing authority; Proofloom approves any ownership change | Existing ownership fixtures remain canonical and replay to the same block |
| Denied external action | AgentFlow's runtime enforcement result, including action class and denial reason | Can be represented as failure/evidence, but not as a dedicated event | **Do not add as an automatic stop.** A successful denial proves the control held; unresolved work flows through existing repair, retry, no-progress, or pause rules | AgentFlow chooses an allowed execution path; Proofloom changes authority only through approval | Replaying the denial plus resulting failure/evidence must reproduce the existing decision path |
| Missing required approval | Proofloom profile approval gate plus repository/human approval record resolved by AgentFlow | Handoff approval exists; per-action approval does not | **Add.** `PAUSE_FOR_REVIEW` before the gated action | Human or repository authority through Proofloom | Missing, stale, wrong-scope, or wrong-action approval pauses; exact valid approval permits evaluation to continue in live and replay modes |
| Network-policy violation | AgentFlow network enforcement record evaluated against the bound profile rule ID | No dedicated signal | **Add.** `PAUSE_FOR_REVIEW`; a denied attempt remains evidence of enforcement, not permission to route around policy | AgentFlow investigates the attempted action; Proofloom owns any policy change | Allowed, denied, missing-policy, and mismatched-rule fixtures are deterministic; replay performs no network action |
| Required isolation unavailable | Proofloom required isolation capability and AgentFlow capability attestation | No | **Fold into required runtime capability missing.** `PAUSE_FOR_REVIEW` | AgentFlow/runtime operator | Isolation is tested as a required-capability fixture, not a parallel Governor rule |
| Evidence obligation unmet | Proofloom evidence obligations projected into the approved handoff | Yes: required evidence satisfied/contradictory sets | **Reuse.** `BLOCK_INTEGRATION` at the obligation's approved gate; add gate metadata only when the profile requires a pre-integration gate | AgentFlow produces evidence; Proofloom judges acceptance | Existing missing/contradicted evidence tests remain canonical; replay uses the recorded obligation and evidence snapshots |
| Execution budget exhausted | Proofloom hard budget definition plus AgentFlow's authoritative monotonic counter | Attempt budget exists; other hard budgets do not | **Add only for deterministic hard ceilings.** `PAUSE_FOR_REVIEW`; do not infer wall-clock, token, or cost usage | AgentFlow supplies counters; Proofloom approves any new budget | Exact boundary-minus-one and boundary fixtures; attempt budget keeps the existing rule; replay uses captured counters only |
| Trace/correlation discontinuity | AgentFlow event identities, build/task/attempt correlation, and ordered source sequence | Duplicate sequence fails closed; gaps and cross-run correlation breaks are not represented | **Add.** `PAUSE_FOR_REVIEW` because entitlement cannot be established from an incomplete chain | AgentFlow repairs the event projection; Traffic Control owns normalized continuity validation | Gap, duplicate, cross-build, and cross-task fixtures fail closed; replay rejects the same discontinuity without writes |

### TCP-010A - Bind existing Proofloom Harness Profile authority

```yaml
depends_on:
  - TCP-006
target_repository: ProofLoom-Design-Intelligence
observation_evidence_required:
  - Approved Harness Profile identity, schema version, semantic version, and canonical digest
  - Required runtime capabilities, action-approval gates, network/isolation rules, evidence obligations, and deterministic hard budgets
  - Governed handoff reference binding the exact approved profile
governor_decision_affected:
  - PAUSE_FOR_REVIEW when the profile binding is missing, unsupported, or mismatched
deterministic_acceptance_tests:
  - Profile mutation, substitution, unsupported version, and stale approval fail closed
  - A superseding profile produces a new approved handoff identity and digest
replay_tests:
  - The approved profile snapshot remains resolvable by identity, version, and digest
  - Legacy handoffs without a profile replay only under their legacy Governor policy and are never relabeled profile-governed
claim_boundary: Proves immutable Profile authority binding only; it does not prove runtime enforcement, execution success, or acceptance.
```

Consume Proofloom's existing Harness Profile authority and semantics. Do not
create a Traffic Control profile language, approval registry, or acceptance
authority.

### TCP-010B - Project authoritative Harness runtime facts from AgentFlow

```yaml
depends_on:
  - TCP-002
  - TCP-003
  - TCP-010A
target_repository: AgentFlow
observation_evidence_required:
  - Loaded profile identity/version/digest
  - Required-capability attestation from the executing runtime
  - Scoped action-approval resolution
  - Network-policy and isolation enforcement outcomes
  - Monotonic hard-budget counters
  - Build/task/attempt trace continuity and intervention acknowledgements
governor_decision_affected:
  - Supplies facts for CONTINUE, PAUSE_FOR_REVIEW, BLOCK_INTEGRATION, REQUEST_REPAIR, DELEGATE_RETRY, and proposal-only PROPOSE_REPLAN
deterministic_acceptance_tests:
  - Missing or malformed authoritative facts produce a protective error, never a synthetic favorable value
  - Denied actions are recorded without being treated as policy permission or automatic execution failure
  - AgentFlow remains the sole executor and retry scheduler
replay_tests:
  - Captured normalized facts replay without invoking AgentFlow, external actions, or intervention side effects
claim_boundary: Proves source projection and intervention acknowledgement only; it does not prove Profile semantics, policy correctness, or provider enforcement outside captured evidence.
```

Reuse TCP-002's observation adapter and TCP-003's control service. Do not add a
second event store, scheduler, retry engine, capability registry, or execution
database.

### TCP-010C - Add profile-aware deterministic policy and history

```yaml
depends_on:
  - TCP-010A
  - TCP-010B
target_repository: Traffic-Control-Plane
observation_evidence_required:
  - Normalized adopted signals from the disposition table
  - Immutable prior decisions and intervention acknowledgements
  - Explicit progress evidence, phase change, and failure fingerprints
governor_decision_affected:
  - CONTINUE
  - PAUSE_FOR_REVIEW
  - BLOCK_INTEGRATION
  - REQUEST_REPAIR
  - DELEGATE_RETRY
  - PROPOSE_REPLAN as PROPOSAL_ONLY
deterministic_acceptance_tests:
  - Identical handoff, profile binding, observation, history summary, and policy version produce byte-equivalent decisions
  - Unsupported profiles, missing required capabilities or approvals, network violations, exhausted hard budgets, and trace discontinuity fail closed
  - Existing ownership, evidence, retry-budget, and repeated-failure rules are reused without duplicate signals
  - An intervention-loop ceiling pauses after the versioned maximum consecutive applied interventions without positive evidence, phase progress, or resolved failure
  - A repeated decision/rule cycle with no progress is detected as oscillation and pauses; it cannot authorize replanning or structural change
replay_tests:
  - A new Governor policy version preserves governor.v1 unchanged
  - Replay selects the recorded Governor policy and compatible Profile version; unknown or unavailable combinations fail closed
  - Historical decisions bind profile identity/version/digest and intervention-history input, and replay produces no writes or runtime calls
  - Profile supersession replays as a new approved handoff rather than mutation of the prior history
claim_boundary: Proves deterministic local observation, decision, intervention guardrails, and replay only; it does not prove AgentFlow integration, provider behavior, deployment, or Proofloom acceptance.
```

Loop ceilings must be policy-versioned counts over immutable records, not
elapsed time. Existing repeated identical failures without evidence gain may
still produce `PROPOSE_REPLAN`, but it remains `PROPOSAL_ONLY` and requires
external approval. Oscillation or ceiling exhaustion produces
`PAUSE_FOR_REVIEW`; neither condition can select or authorize a new structure.

### TCP-010D - Qualify one additional execution runtime

```yaml
depends_on:
  - TCP-008
  - TCP-010C
target_repository: Traffic-Control-Plane + separately approved second execution runtime
observation_evidence_required:
  - Frozen cross-runtime event and Harness Profile corpus
  - Runtime capability and enforcement provenance
  - Equivalent intervention acknowledgements and immutable decision history
governor_decision_affected:
  - All decisions supported by the shared runtime port
deterministic_acceptance_tests:
  - AgentFlow passes its prior acceptance corpus unchanged
  - The second runtime produces byte-equivalent decisions for the frozen shared corpus
  - Unsupported facts, capabilities, profile versions, and actions fail closed
replay_tests:
  - AgentFlow and the second runtime replay the same normalized histories to equivalent decisions without side effects
  - Historical policy/profile compatibility failures are explicit and deterministic
claim_boundary: Proves protocol equivalence for the frozen qualified corpus only; it does not establish universal runtime portability, production readiness, or customer acceptance.
```

Use live AgentFlow evidence to identify the smallest stable adapter boundary,
then qualify one additional runtime against the same observation, decision,
intervention, replay, Profile, and proof invariants. Do not extract shared
infrastructure before the AgentFlow path demonstrates recurrence and stable
semantics.

### Acceptance Criteria

- Every adopted profile fact has one authoritative producer, one normalized
  representation, one deterministic rule, a remediation owner, and replay
  coverage; candidates marked reuse or fold do not create duplicate signals.
- Unsupported or unavailable Profile semantics fail closed. No runtime or
  Governor substitutes a newer Profile interpretation during replay.
- Intervention-loop and oscillation protection cannot mutate approved intent,
  select a replacement strategy, or make replanning/reconsideration
  self-authorizing.
- The adapter contract contains no AgentFlow-specific state assumption that is
  unnecessary to the Governor decision.
- AgentFlow remains the fully supported reference runtime and passes its prior
  acceptance corpus unchanged.
- The second adapter produces equivalent decisions for the shared frozen event
  corpus and fails closed for unsupported facts or actions.
- Provider telemetry gaps are reported as unknown; context pressure or other
  numerical risks are never manufactured from indirect signals.
- Portability does not introduce a second scheduler, retry platform, graph,
  execution database, or approval authority.

## Dependency graph

```text
TCP-001
   -> TCP-002
      -> TCP-003
         -> TCP-004
         -> TCP-005
         -> TCP-006
            -> TCP-007
            -> TCP-010A
   TCP-002 + TCP-003 + TCP-010A
      -> TCP-010B
         -> TCP-010C
   TCP-004 + TCP-005 + TCP-006 + TCP-007
      -> TCP-008
         -> TCP-009
   TCP-008 + TCP-010C
      -> TCP-010D
```

## Completion evidence

The 2026-09-17 QuoteFlow pilot is recorded in AgentFlow at
`docs/audits/traffic-control-live-pilot-2026-09-17.md`. Build
`build_a6141453-d900-46e9-802a-f0550f153819` recorded validation evidence,
Governor `CONTINUE`, integration commit
`f95b924fe434553caed2f227116c8f2203274699`, a completed receipt, and a
Proofloom audit result of `PASS`. Rendered desktop and 390px mobile evidence
also preserves the decision history after completion. This closes the bounded
technical proof only; it does not satisfy TCP-008's 30-run, three-repository,
four-week, supersession, outcome-review, or human-acceptance gates.

| Task | Current status | Required closeout evidence |
| --- | --- | --- |
| TCP-001 | Implemented; 48 tests and both demos pass locally; committed as `77e756c` | Only when authorized, matching remote SHA |
| TCP-002 | Native observation projector implemented, tested, and exercised by the QuoteFlow pilot | Broader representative-run coverage |
| TCP-003 | Decision service, durable records, runtime adapter, coordinator gates, active-attempt semantics, and governed recovery implemented | Repeated-failure and structural-decision coverage in the acceptance corpus |
| TCP-004 | Idempotent schema-bound projection and population-separated metric summary implemented | Persisted pilot telemetry and coverage report |
| TCP-005 | Existing AgentFlow experience extended; desktop and 390px completed-work decisions rendered | Keyboard, loading, error, stale-data, and human acceptance checks |
| TCP-006 | Exact ProofLoom receipt audit passed against a real completed AgentFlow receipt | Additional failure-path receipt audits in the acceptance corpus |
| TCP-007 | Proposal and durable resolution/supersession records implemented | Reviewed real supersession round trip |
| TCP-008 | One bounded real-repository technical pilot passed; not counted as the 30-run baseline | Frozen eligibility rule, consecutive-run report, raw denominators, three repositories, and four weeks |
| TCP-009 | Not started | Reviewed outcome and learning-candidate records |
| TCP-010 | Profile-aware portability decomposed; no Harness Profile integration is implemented by this backlog change | Approved Profile binding, authoritative AgentFlow facts, deterministic profile-aware policy/replay, loop-ceiling proof, and second-runtime equivalence evidence |

## Explicit exclusions

This backlog does not authorize deployment, production exposure, remote branch
deletion, autonomous policy self-modification, a new scheduler, a new retry
engine, a new repository graph, a new execution database, or a universal agent
framework. It also does not authorize Harness Profile mutation, hot-swapping,
or self-authorizing replan/reconsideration. Those remain outside scope unless
separately justified and approved.

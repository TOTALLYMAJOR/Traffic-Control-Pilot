# Begin: protocol parity before native supervision

Status: PREPARED_AWAITING_BEGIN
Prepared: 2026-09-18.
Scope: selected work instructions, not a runtime handoff or approval.

Read README.md, docs/protocol.md and BACKLOG.md. The shared continuation is docs/BEGIN-INTEGRATION.md in TOTALLYMAJOR/PROOFLOOM on codex/proofloom-trust-repair-20260917. Resolve the current shared directive and all local authorities before work. It does not transfer another repository's write authority here.

A later explicit operator `begin` starts this prepared continuation through native preflight and the first eligible authorized task. It is not a new CLI command, a scheduled/background job or an authenticated approval record. This document's examples do not dispatch anything.

## Current direction

Finish the existing governed design-to-execution loop. Proofloom owns design intent and outcome audit; AgentFlow owns execution, runtime records, retries and integration; Traffic Control Pilot evaluates entitlement to continue; DecisionIntelligence may propose structural alternatives only.

Do not create another executor, scheduler, retry engine, state database or authority format. Preserve versioned deterministic decisions, proposal-only structural reconsideration, immutable original handoffs and mutation-free replay.

## Compatibility work comes first

At the preparation reference 16e8f56441bcfc1b75778d550aed4a76e62bfdd2, src/contracts.js accepts native governed-task-handoff schema 1.0.0. Proofloom's selected trust-repair work line declares 2.0.0 with a current repository/authority snapshot. The two are not interchangeable. Inspect both current implementations before changing anything.

Before TCP-002/TCP-003 can enable live supervision:

- Bind the selected native v2 contract and canonicalization rules, including optional task-field normalization, using shared fixtures with exact source revisions.
- Preserve clean-base, repository identity, complete source-set, governance/snapshot digests, task semantics and proof requirements. Do not strip v2 fields to make a v1-only consumer accept them.
- Reject unsupported versions and invalid/stale authority rather than defaulting it. Historical v1 evidence may remain explicitly historical; it must not become a v2 execution fallback.
- Prove equal canonical payloads/digests across Proofloom, Traffic Control and AgentFlow, and prove rejection of tampering, missing fields and substituted repositories/tasks.
- Keep the previously published protocol baseline and evidence historical. If a new bounded local compatibility task is needed, add it through this repository's existing BACKLOG and native adoption path; do not silently rewrite the meaning or completion evidence of TCP-001.

This compatibility gate and native AgentFlow-v2 admission are explicit cross-repository prerequisites for the selected work. The older BACKLOG ordering alone must not authorize a v1 runtime against a v2 handoff. Bind the additional edge in the actual selected native plan before dispatch; never satisfy a dependency by prose or an arbitrary receipt string.

## Selected existing operationalization tasks

- TCP-002: an AgentFlow-owned observation adapter using native events, attempts, failures, validation, source identity, task-attributed changes and dependency evidence.
- TCP-003: AgentFlow-owned persistence/acknowledgement of Governor decisions and bounded mapping into existing coordinator controls.
- TCP-006: Proofloom-owned returned receipt audit closing the local loop.

BACKLOG.md remains the existing human-readable planning projection. Its cross-repository paths are not local write grants. Reconcile paths to the target repository root and adopt exact target-owned task packets before any cross-repository mutation. Retain the native dependency closure. Do not import the exported V7-EPI task pack or rename the export's v2 label into this protocol's schema version.

For the first ordinary successful local run, do not expand into TCP-005 dashboard work, TCP-007 structural-analysis UI, production measurement or a second execution framework. Select those later only when the existing milestone and authority require them.

## Begin procedure and validation

Inspect current branches, instructions, code, tests and local dirty state. Preserve unpublished work; do not reset, force-push or automatically merge. Use isolated execution through the existing authorized mechanism. Do not regenerate trusted approvals or verification records from model assertions.

Discovery and local compatibility work start in src/contracts.js, src/integrity.js, the existing receipt/observation/governor modules, docs/protocol.md and the matching existing test hierarchy. These are discovery locations, not a blanket write grant. Bind the exact files and operations in the native task before execution.

Run the declared focused checks and the repository commands `npm test`, `npm run demo` and `npm run demo:json` at the recorded revision. Preserve existing policy/replay invariants and add real cross-language/cross-repository contract tests. Do not report previous test counts as a new run or weaken protected tests merely to obtain a pass.

The initial acceptance boundary is a real local AgentFlow execution path, Governor observations/decisions and Proofloom receipt audit using a bounded temporary fixture. The synthetic demo alone does not meet it. The later QuoteFlow pilot retains its own consuming-repository authority and acceptance; no consumer writes, deployment, provider mutation, credentials or production outcomes are authorized here.

Stop with a precise owning repository and recovery action for missing native permission, unavailable runtime, unresolved contract semantics, scope expansion or failed proof. Do not restart a general architecture discussion or ask the operator to restate this selected direction.

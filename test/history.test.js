import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { bindContract } from "../src/contracts.js";
import { GOVERNOR_POLICY_V1 } from "../src/governor.js";
import {
  applyIntervention,
  appendDecisionRecord,
  createDecisionRecord,
  replayHistory,
  verifyDecisionHistory,
  verifyDecisionRecord,
} from "../src/history.js";

function contract() {
  return bindContract({
    schemaVersion: "2.0.0",
    kind: "design-intelligence/governed-task-handoff",
    handoffId: "handoff-history",
    createdAt: "2026-09-16T11:00:00.000Z",
    repository: {
      baseCommit: "a".repeat(40),
      snapshotSha256: "2".repeat(64),
      worktreeState: "clean",
      remote: "https://github.com/totallymajor/example.git",
    },
    objective: "Exercise deterministic historical policy replay",
    authority: {
      status: "APPROVED",
      approvedBy: "repository-owner",
      approvedAt: "2026-09-16T12:00:00.000Z",
      stateSha256: "3".repeat(64),
      governanceReportSha256: "4".repeat(64),
      sources: [{ path: "docs/intent.md", sha256: "1".repeat(64) }],
    },
    tasks: [
      {
        id: "REPLAY-001",
        title: "Replay history",
        description: "Evaluate historical execution without mutation.",
        estimateHours: 1,
        dependsOn: [],
        owns: ["src"],
        acceptanceCriteria: ["Replay is deterministic"],
        validate: ["npm test"],
      },
    ],
    proof: {
      requiredEvidence: ["unit-tests"],
      claimBoundary: "LOCAL_EXECUTION_AND_INTEGRATION",
    },
  });
}

function events(boundContract) {
  return [
    {
      sequence: 1,
      type: "authority.observed",
      authority: {
        handoffId: boundContract.binding.id,
        handoffSha256: boundContract.binding.sha256,
        repositoryId: boundContract.document.repository.remote,
        baseCommit: boundContract.document.repository.baseCommit,
        snapshotSha256: boundContract.document.repository.snapshotSha256,
        worktreeState: boundContract.document.repository.worktreeState,
        authorityStateSha256: boundContract.document.authority.stateSha256,
        governanceReportSha256:
          boundContract.document.authority.governanceReportSha256,
        authoritySources: boundContract.document.authority.sources,
        approvalAuthority: "HUMAN_OR_REPOSITORY",
      },
    },
    {
      sequence: 2,
      type: "execution.started",
      buildId: "build-history",
      maxAttempts: 2,
    },
  ];
}

test("decision records form a verifiable hash-bound JSONL chain", async () => {
  const directory = await mkdtemp(join(tmpdir(), "traffic-control-history-"));
  const historyPath = join(directory, "decisions.jsonl");
  const record = createDecisionRecord({
    decision: {
      policyVersion: "governor.v1",
      action: "CONTINUE",
      ruleId: "entitled-to-continue",
    },
    observationHash: "1".repeat(64),
    contractHash: "2".repeat(64),
    recordedAt: "2026-09-16T12:01:00.000Z",
  });

  const second = createDecisionRecord({
    decision: {
      policyVersion: "governor.v1",
      action: "PAUSE_FOR_REVIEW",
      ruleId: "authority-drift",
    },
    observationHash: "3".repeat(64),
    contractHash: "2".repeat(64),
    previousRecordHash: record.recordHash,
    recordedAt: "2026-09-16T12:02:00.000Z",
  });

  await appendDecisionRecord(historyPath, record);
  await appendDecisionRecord(historyPath, second);

  const lines = (await readFile(historyPath, "utf8")).trim().split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), record);
  assert.match(record.recordHash, /^[a-f0-9]{64}$/);
  assert.equal(verifyDecisionRecord(record), true);
  assert.equal(verifyDecisionHistory(lines.map((line) => JSON.parse(line))), true);

  assert.throws(
    () => verifyDecisionHistory([second, record]),
    /decision history chain is invalid/i,
  );
  const mutated = structuredClone(record);
  mutated.decision.action = "CANCEL";
  assert.throws(() => verifyDecisionRecord(mutated), /record hash is invalid/i);
});

test("historical replay is deterministic and does not write decision history", async () => {
  const boundContract = contract();
  const directory = await mkdtemp(join(tmpdir(), "traffic-control-replay-"));
  const forbiddenHistoryPath = join(directory, "must-not-exist.jsonl");

  const first = replayHistory({
    contract: boundContract,
    eventBatches: [events(boundContract)],
    policy: GOVERNOR_POLICY_V1,
  });
  const second = replayHistory({
    contract: boundContract,
    eventBatches: [events(boundContract)],
    policy: GOVERNOR_POLICY_V1,
  });

  assert.deepEqual(first, second);
  await assert.rejects(stat(forbiddenHistoryPath), { code: "ENOENT" });
});

test("replay mode refuses runtime intervention side effects", async () => {
  const directory = await mkdtemp(join(tmpdir(), "traffic-control-mutation-"));
  const mutationPath = join(directory, "runtime-mutated.txt");
  const adapter = {
    async continue() {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(mutationPath, "mutated", "utf8");
    },
  };

  await assert.rejects(
    applyIntervention(
      { action: "CONTINUE" },
      adapter,
      { mode: "REPLAY" },
    ),
    /replay cannot mutate live execution/i,
  );
  await assert.rejects(stat(mutationPath), { code: "ENOENT" });
});

test("structural interventions cannot self-authorize an authority change", async () => {
  const directory = await mkdtemp(join(tmpdir(), "traffic-control-authority-"));
  const mutationPath = join(directory, "authority-rewritten.txt");
  const adapter = {
    async requestReconsider() {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(mutationPath, "rewritten", "utf8");
    },
  };

  await assert.rejects(
    applyIntervention(
      {
        action: "REQUEST_RECONSIDER",
        authorityEffect: "AUTHORIZE_CHANGE",
      },
      adapter,
      { mode: "LIVE" },
    ),
    /proposal-only/i,
  );
  await assert.rejects(stat(mutationPath), { code: "ENOENT" });
});

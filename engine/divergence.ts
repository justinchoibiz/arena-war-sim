import type {
  DivergenceResult,
  DivergenceTraceInput,
  DivergenceUnitDiff,
  TickHashRecord,
  TickStateSnapshot,
  UnitStateSnapshot,
} from "./types";
import { serializeCanonicalSnapshot } from "./hash";

// UnitSnapshot[]를 id ASC로 정렬한다.
function sortSnapshotsById(
  units: readonly UnitStateSnapshot[]
): UnitStateSnapshot[] {
  return [...units].sort((a, b) => a.id.localeCompare(b.id));
}

// 정렬된 UnitSnapshot[]를 unitId -> snapshot 조회용 Map으로 변환한다.
function makeById(
  units: readonly UnitStateSnapshot[]
): Map<string, UnitStateSnapshot> {
  return new Map(sortSnapshotsById(units).map((u) => [u.id, u] as const));
}

// trace에서 index 위치의 TickSnapshot을 꺼낸다.
function getSnapshotAtIndex(
  trace: readonly TickHashRecord[],
  index: number
): TickStateSnapshot | null {
  if (index < 0 || index >= trace.length) return null;
  return trace[index].snapshot;
}

// 두 값이 다를 때만 before/after diff 객체에 해당 key를 기록한다.
function pushIfDifferent<T>(
  beforeObj: Record<string, unknown>,
  afterObj: Record<string, unknown>,
  key: string,
  beforeValue: T | undefined,
  afterValue: T | undefined
): void {
  const same = JSON.stringify(beforeValue) === JSON.stringify(afterValue);

  if (!same) {
    if (beforeValue !== undefined) beforeObj[key] = beforeValue;
    if (afterValue !== undefined) afterObj[key] = afterValue;
  }
}

// 특정 divergence tick에서 baseline/candidate current snapshot만 비교해 최소 unit diff 목록을 만든다.
function diffSnapshotsAtTick(
  baselineCurr: TickStateSnapshot | null,
  candidateCurr: TickStateSnapshot | null
): DivergenceUnitDiff[] {
  const baselineById = makeById(baselineCurr?.units ?? []);
  const candidateById = makeById(candidateCurr?.units ?? []);

  const idSet = new Set<string>([
    ...baselineById.keys(),
    ...candidateById.keys(),
  ]);

  const ids = Array.from(idSet).sort((a, b) => a.localeCompare(b));
  const diffs: DivergenceUnitDiff[] = [];

  for (const id of ids) {
    const beforeUnit = baselineById.get(id);
    const afterUnit = candidateById.get(id);

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    pushIfDifferent(before, after, "hp", beforeUnit?.hp, afterUnit?.hp);
    pushIfDifferent(
      before,
      after,
      "position",
      beforeUnit?.position,
      afterUnit?.position
    );
    pushIfDifferent(
      before,
      after,
      "targetId",
      beforeUnit?.targetId,
      afterUnit?.targetId
    );
    pushIfDifferent(
      before,
      after,
      "isActive",
      beforeUnit?.isActive,
      afterUnit?.isActive
    );

    if (Object.keys(before).length > 0 || Object.keys(after).length > 0) {
      diffs.push({
        id,
        before,
        after,
      });
    }
  }

  return diffs;
}

// 두 trace를 앞에서부터 비교해서 첫 tick/stateHash 불일치 index를 찾는다.
function findFirstMismatchIndex(
  baseline: readonly TickHashRecord[],
  candidate: readonly TickHashRecord[]
): number | null {
  const maxCommon = Math.min(baseline.length, candidate.length);

  for (let i = 0; i < maxCommon; i++) {
    if (baseline[i].tick !== candidate[i].tick) return i;
    if (baseline[i].stateHash !== candidate[i].stateHash) return i;
  }

  if (baseline.length !== candidate.length) {
    return maxCommon;
  }

  return null;
}

// 두 trace에서 첫 divergence tick과 해당 tick의 최소 unit diff를 계산한다.
export function detectFirstDivergence(
  input: DivergenceTraceInput
): DivergenceResult {
  const { baseline, candidate } = input;
  const mismatchIndex = findFirstMismatchIndex(baseline, candidate);

  if (mismatchIndex === null) {
    return {
      firstDivergenceTick: null,
      unitDiffs: [],
    };
  }

  const baselineCurr = getSnapshotAtIndex(baseline, mismatchIndex);
  const candidateCurr = getSnapshotAtIndex(candidate, mismatchIndex);

  const fallbackTick = mismatchIndex + 1;
  const firstDivergenceTick =
    baselineCurr?.tick ?? candidateCurr?.tick ?? fallbackTick;

  const unitDiffs = diffSnapshotsAtTick(baselineCurr, candidateCurr);

  return {
    firstDivergenceTick,
    unitDiffs,
  };
}

// 두 trace가 완전히 동일한지 divergence detector 결과로 빠르게 판정한다.
export function tracesAreEquivalent(
  input: DivergenceTraceInput
): boolean {
  return detectFirstDivergence(input).firstDivergenceTick === null;
}

// 첫 divergence tick의 canonical snapshot 문자열과 unit diff를 함께 반환한다.
export function explainTraceMismatch(
  input: DivergenceTraceInput
): {
  firstDivergenceTick: number | null;
  baselineCanonicalSnapshot: string | null;
  candidateCanonicalSnapshot: string | null;
  unitDiffs: DivergenceUnitDiff[];
} {
  const result = detectFirstDivergence(input);

  if (result.firstDivergenceTick === null) {
    return {
      firstDivergenceTick: null,
      baselineCanonicalSnapshot: null,
      candidateCanonicalSnapshot: null,
      unitDiffs: [],
    };
  }

  const baselineRecord =
    input.baseline.find((r) => r.tick === result.firstDivergenceTick) ?? null;
  const candidateRecord =
    input.candidate.find((r) => r.tick === result.firstDivergenceTick) ?? null;

  return {
    firstDivergenceTick: result.firstDivergenceTick,
    baselineCanonicalSnapshot: baselineRecord
      ? serializeCanonicalSnapshot(baselineRecord.snapshot)
      : null,
    candidateCanonicalSnapshot: candidateRecord
      ? serializeCanonicalSnapshot(candidateRecord.snapshot)
      : null,
    unitDiffs: result.unitDiffs,
  };
}
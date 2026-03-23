import { describe, expect, it } from "vitest";
import { simulateWithTrace } from "@engine/sim";
import { detectFirstDivergence } from "@engine/divergence";
import { hashTickStateSnapshot } from "@engine/hash";
import type { Scenario, SimTraceResult } from "@engine/types";

// 테스트용 최소 1v1 시나리오를 생성한다.
function makeScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_divergence_case",
    createdAt: "2026-03-23T00:00:00.000Z",
    settings: {
      dt: 0.1,
      seed: 1,
      targetingDefault: "NEAREST",
    },
    units: [
      {
        id: "A1",
        name: "Alpha",
        team: "A",
        level: 1,
        position: { x: 0, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 10,
        range: 10,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 10,
        isActive: false,
        damageFalloff: "INV_DISTANCE",
        k: 2,
        minDistance: 1,
      },
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 4, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 0,
        range: 10,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 0,
        activationRange: 10,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
  };
}

// SimTraceResult를 깊은 복사하여 독립적인 candidate를 만든다.
function cloneTraceResult(r: SimTraceResult): SimTraceResult {
  return {
    result: {
      ...r.result,
      survivorIds: [...r.result.survivorIds],
    },
    trace: r.trace.map((record) => ({
      tick: record.tick,
      stateHash: record.stateHash,
      snapshot: {
        tick: record.snapshot.tick,
        units: record.snapshot.units.map((u) => ({
          ...u,
          position: { ...u.position },
        })),
      },
    })),
  };
}

// 특정 tick index의 snapshot을 기준으로 stateHash를 재계산한다.
function rehashAt(result: SimTraceResult, index: number): void {
  const snapshot = result.trace[index].snapshot;
  result.trace[index].stateHash = hashTickStateSnapshot(snapshot);
}

describe("M2 divergence detector", () => {
  // hash만 손상된 경우에도 첫 mismatch tick을 정확히 찾는지 검증한다.
  it("bypass sort order/hash corruption still finds first divergent tick", () => {
    const baseline = simulateWithTrace(makeScenario());
    const candidate = cloneTraceResult(baseline);

    candidate.trace[0].stateHash = "deadbeef";

    const divergence = detectFirstDivergence({
      baseline: baseline.trace,
      candidate: candidate.trace,
    });

    expect(divergence.firstDivergenceTick).toBe(1);
  });

  // movement 변화가 있을 때 position diff가 정확히 잡히는지 검증한다.
  it("movement divergence includes position diff", () => {
    const baseline = simulateWithTrace(makeScenario());
    const candidate = cloneTraceResult(baseline);

    const a1 = candidate.trace[0].snapshot.units.find((u) => u.id === "A1");
    if (!a1) throw new Error("A1 missing in candidate trace");

    a1.position.x = 0.2;
    rehashAt(candidate, 0);

    const divergence = detectFirstDivergence({
      baseline: baseline.trace,
      candidate: candidate.trace,
    });

    expect(divergence.firstDivergenceTick).toBe(1);

    const a1Diff = divergence.unitDiffs.find((d) => d.id === "A1");
    expect(a1Diff).toBeDefined();
    expect(a1Diff!.before.position).toEqual({ x: 0.1, y: 0 });
    expect(a1Diff!.after.position).toEqual({ x: 0.2, y: 0 });
  });

  // activation 로직 변화가 있을 때 isActive diff가 잡히는지 검증한다.
  it("activation divergence includes isActive diff", () => {
    const baseline = simulateWithTrace(makeScenario());
    const candidate = cloneTraceResult(baseline);

    const a1 = candidate.trace[0].snapshot.units.find((u) => u.id === "A1");
    if (!a1) throw new Error("A1 missing in candidate trace");

    a1.isActive = false;
    rehashAt(candidate, 0);

    const divergence = detectFirstDivergence({
      baseline: baseline.trace,
      candidate: candidate.trace,
    });

    expect(divergence.firstDivergenceTick).toBe(1);

    const a1Diff = divergence.unitDiffs.find((d) => d.id === "A1");
    expect(a1Diff).toBeDefined();
    expect(a1Diff!.before.isActive).toBe(true);
    expect(a1Diff!.after.isActive).toBe(false);
  });

  // damage/falloff 변화가 있을 때 hp diff로 divergence가 드러나는지 검증한다.
  it("falloff divergence includes hp diff at the mismatched tick", () => {
    const baseline = simulateWithTrace(makeScenario());
    const candidate = cloneTraceResult(baseline);

    const b1Tick1 = candidate.trace[0].snapshot.units.find((u) => u.id === "B1");
    if (!b1Tick1) throw new Error("B1 missing in candidate trace");

    b1Tick1.hp = 98;
    rehashAt(candidate, 0);

    const divergence = detectFirstDivergence({
      baseline: baseline.trace,
      candidate: candidate.trace,
    });

    expect(divergence.firstDivergenceTick).toBe(1);

    const b1Diff = divergence.unitDiffs.find((d) => d.id === "B1");
    expect(b1Diff).toBeDefined();
    expect(b1Diff!.before.hp).toBe(97.436);
    expect(b1Diff!.after.hp).toBe(98);
  });
});
import { describe, expect, it } from "vitest";
import { simulate, simulateWithTrace } from "@engine/sim";
import type { Scenario } from "@engine/types";

function makeActivationScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_activation_boundary",
    createdAt: "2026-03-22T00:00:00.000Z",
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
        activationRange: 1,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 3, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 10,
        range: 10,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 1,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
  };
}

function makeInactiveNoAttackScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_inactive_no_attack",
    createdAt: "2026-03-22T00:00:00.000Z",
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
        range: 100,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 0,
        activationRange: 1,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 50, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 10,
        range: 100,
        attackIntervalSec: 0.5,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 0,
        activationRange: 1,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
  };
}

function firstActiveTickFor(trace: ReturnType<typeof simulateWithTrace>["trace"], unitId: string): number | null {
  for (const record of trace) {
    const unit = record.snapshot.units.find((u) => u.id === unitId);
    if (unit?.isActive === true) {
      return record.tick;
    }
  }
  return null;
}

function activationTraceFor(trace: ReturnType<typeof simulateWithTrace>["trace"], unitId: string) {
  return trace.map((t) => {
    const unit = t.snapshot.units.find((u) => u.id === unitId);
    return unit ? unit.isActive : null;
  });
}

describe("M2 activation / aggro gating", () => {
  it("first isActive=true tick matches boundary scenario expectation", () => {
    const { trace } = simulateWithTrace(makeActivationScenario());

    expect(firstActiveTickFor(trace, "A1")).toBe(10);
    expect(firstActiveTickFor(trace, "B1")).toBe(10);
  });

  it("repeated runs produce same activation tick", () => {
    const r1 = simulateWithTrace(makeActivationScenario());
    const r2 = simulateWithTrace(makeActivationScenario());

    expect(firstActiveTickFor(r1.trace, "A1")).toBe(firstActiveTickFor(r2.trace, "A1"));
    expect(firstActiveTickFor(r1.trace, "B1")).toBe(firstActiveTickFor(r2.trace, "B1"));
  });

  it("shuffled units preserve same activation trace", () => {
    const base = makeActivationScenario();
    const shuffled: Scenario = {
      ...base,
      units: [base.units[1], base.units[0]],
    };
  
    const r1 = simulateWithTrace(base);
    const r2 = simulateWithTrace(shuffled);
  
    expect(activationTraceFor(r1.trace, "A1")).toEqual(activationTraceFor(r2.trace, "A1"));
    expect(activationTraceFor(r1.trace, "B1")).toEqual(activationTraceFor(r2.trace, "B1"));
  });

  it("inactive units do not attack", () => {
    const result = simulate(makeInactiveNoAttackScenario());

    expect(result.attackCount).toBe(0);
    expect(result.winnerTeam).toBe("DRAW");
  });

  it("isActive is present in trace snapshot path", () => {
    const { trace } = simulateWithTrace(makeActivationScenario());

    expect(typeof trace[0].snapshot.units[0].isActive).toBe("boolean");
  });
});
import { describe, expect, it } from "vitest";
import { simulateWithTrace } from "@engine/sim";
import type { Scenario } from "@engine/types";

function makeBaseScenario(mode: "NONE" | "INV_DISTANCE"): Scenario {
  return {
    version: "0.1",
    name: `falloff_${mode}`,
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
        moveSpeed: 0,
        activationRange: 10,
        isActive: false,
        damageFalloff: mode,
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

describe("M2 damage falloff v0", () => {
  it("NONE path still behaves as expected", () => {
    const traced = simulateWithTrace(makeBaseScenario("NONE"));
  
    const tick1 = traced.trace[0];
    const b1 = tick1.snapshot.units.find((u) => u.id === "B1");
    expect(b1).toBeDefined();
  
    // distance = 4 but NONE path ignores falloff
    // baseDamage = 10 * 0.5 = 5
    // hp after first attack = 95
    expect(b1!.hp).toBe(95);
  
    expect(traced.result.winnerTeam).toBe("A");
    expect(traced.result.timeToFinishSec).toBe(9.6);
  });

  it("INV_DISTANCE golden distance / damage / HP-after matches expectation", () => {
    const traced = simulateWithTrace(makeBaseScenario("INV_DISTANCE"));

    const tick1 = traced.trace[0];
    const b1 = tick1.snapshot.units.find((u) => u.id === "B1");
    expect(b1).toBeDefined();

    // distance = 4.000
    // baseDamage = 10 * 0.5 = 5.000
    // effectiveDamage = 5 * (2 / 4) = 2.500
    // hp after first attack = 97.500
    expect(b1!.hp).toBe(97.5);
  });

  it("repeated runs keep identical falloff trace", () => {
    const s = makeBaseScenario("INV_DISTANCE");

    const r1 = simulateWithTrace(s);
    const r2 = simulateWithTrace(s);

    expect(r1.trace.map((t) => t.stateHash)).toEqual(
      r2.trace.map((t) => t.stateHash)
    );
  });

  it("shuffled input does not change tick hashes", () => {
    const base = makeBaseScenario("INV_DISTANCE");
    const shuffled: Scenario = {
      ...base,
      units: [base.units[1], base.units[0]],
    };

    const r1 = simulateWithTrace(base);
    const r2 = simulateWithTrace(shuffled);

    expect(r1.trace.map((t) => t.stateHash)).toEqual(
      r2.trace.map((t) => t.stateHash)
    );
  });
});
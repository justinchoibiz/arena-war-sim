import { describe, expect, it } from "vitest";
import { validateScenario } from "@engine/validate";
import { simulateWithTrace } from "@engine/sim";
import type { Scenario, TickStateSnapshot } from "@engine/types";

function makeMovementScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_movement_trace",
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
        dps: 1,
        range: 100,
        attackIntervalSec: 1,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 0,
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
        position: { x: 10, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 100,
        maxHp: 100,
        dps: 1,
        range: 100,
        attackIntervalSec: 1,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 0,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
  };
}

function makeOvershootScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_movement_overshoot",
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
        hp: 10,
        maxHp: 10,
        dps: 0.1,
        range: 100,
        attackIntervalSec: 1,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 0,
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
        position: { x: 0.05, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 10,
        maxHp: 10,
        dps: 0.1,
        range: 100,
        attackIntervalSec: 1,
        cooldownRemaining: 0,
        targetId: null,
        moveSpeed: 1,
        activationRange: 0,
        isActive: false,
        damageFalloff: "NONE",
        k: 1,
        minDistance: 1,
      },
    ],
  };
}

function getUnit(snapshot: TickStateSnapshot, id: string) {
  const unit = snapshot.units.find((u) => u.id === id);
  if (!unit) {
    throw new Error(`unit not found in snapshot: ${id}`);
  }
  return unit;
}

function extractPositionTrace(trace: { snapshot: TickStateSnapshot }[]) {
  return trace.map((record) =>
    record.snapshot.units.map((u) => ({
      id: u.id,
      x: u.position.x,
      y: u.position.y,
    }))
  );
}

describe("M2 movement v0", () => {
  it("movement determinism golden position matches expected tick positions", () => {
    const scenario = validateScenario(makeMovementScenario());
    const { trace } = simulateWithTrace(scenario);

    const tick1 = trace[0].snapshot;
    const tick2 = trace[1].snapshot;

    expect(getUnit(tick1, "A1").position).toEqual({ x: 0.1, y: 0 });
    expect(getUnit(tick1, "B1").position).toEqual({ x: 9.9, y: 0 });

    expect(getUnit(tick2, "A1").position).toEqual({ x: 0.2, y: 0 });
    expect(getUnit(tick2, "B1").position).toEqual({ x: 9.8, y: 0 });
  });

  it("overshoot clamps exactly to target start position", () => {
    const scenario = validateScenario(makeOvershootScenario());
    const { trace } = simulateWithTrace(scenario);

    const tick1 = trace[0].snapshot;

    expect(getUnit(tick1, "A1").position).toEqual({ x: 0.05, y: 0 });
    expect(getUnit(tick1, "B1").position).toEqual({ x: 0, y: 0 });
  });

  it("movement trace is invariant under shuffled input order", () => {
    const base = makeMovementScenario();
    const shuffled: Scenario = {
      ...base,
      units: [base.units[1], base.units[0]],
    };

    const baseValidated = validateScenario(base);
    const shuffledValidated = validateScenario(shuffled);

    const baseTrace = simulateWithTrace(baseValidated).trace;
    const shuffledTrace = simulateWithTrace(shuffledValidated).trace;

    expect(extractPositionTrace(baseTrace)).toEqual(
      extractPositionTrace(shuffledTrace)
    );
  });
});
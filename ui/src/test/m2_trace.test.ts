import { describe, expect, it } from "vitest";
import { runValidation, simulateWithTrace } from "@engine/sim";
import type { Scenario } from "@engine/types";

function makeTraceScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_trace_case",
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
        hp: 20,
        maxHp: 20,
        dps: 10,
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
      {
        id: "B1",
        name: "Bravo",
        team: "B",
        level: 1,
        position: { x: 4, y: 0 },
        targetingPolicy: "NEAREST",
        hp: 5,
        maxHp: 5,
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

describe("M2 tick trace emission", () => {
  it("same run inputs produce identical hash trace across 3 runs", () => {
    const scenario = makeTraceScenario();

    const r1 = runValidation(scenario);
    const r2 = runValidation(scenario);
    const r3 = runValidation(scenario);

    expect(r1.tickHashes).toEqual(r2.tickHashes);
    expect(r2.tickHashes).toEqual(r3.tickHashes);
  });

  it("trace length is stable across repeated runs", () => {
    const scenario = makeTraceScenario();

    const r1 = runValidation(scenario);
    const r2 = runValidation(scenario);

    expect(r1.traceLength).toBe(r2.traceLength);
    expect(r1.traceLength).toBeGreaterThan(0);
  });

  it("hash is emitted after deaths, not before", () => {
    const traced = simulateWithTrace(makeTraceScenario());

    expect(traced.trace.length).toBe(1);

    const tick1 = traced.trace[0];
    const survivorIds = tick1.snapshot.units.map((u) => u.id);

    expect(survivorIds).toEqual(["A1"]);
    expect(survivorIds.includes("B1")).toBe(false);
  });
});
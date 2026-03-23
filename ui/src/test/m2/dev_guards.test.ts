import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStepExecutionState,
  runStep,
  runValidation,
  simulate,
  simulateWithTrace,
} from "@engine/sim";
import type { Scenario } from "@engine/types";

function makeScenario(): Scenario {
  return {
    version: "0.1",
    name: "m2_dev_guards_case",
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

function installForbiddenApiGuards() {
  const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
    throw new Error("NONDETERMINISM_GUARD: Date.now is forbidden in engine path");
  });

  const mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
    throw new Error("NONDETERMINISM_GUARD: Math.random is forbidden in engine path");
  });

  return { dateNowSpy, mathRandomSpy };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).__WS_TEST_SENTINEL__;
});

describe("M2 dev-time nondeterminism guards", () => {
  it("engine runs without touching Date.now during simulate path", () => {
    const { dateNowSpy } = installForbiddenApiGuards();

    const result = simulate(makeScenario());

    expect(result.winnerTeam).toBe("A");
    expect(dateNowSpy).not.toHaveBeenCalled();
  });

  it("engine runs without touching Math.random during traced/validation path", () => {
    const { mathRandomSpy } = installForbiddenApiGuards();

    const traced = simulateWithTrace(makeScenario());
    const validation = runValidation(makeScenario());

    expect(traced.trace.length).toBeGreaterThan(0);
    expect(validation.traceLength).toBe(traced.trace.length);
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });

  it("step execution path also avoids forbidden nondeterministic APIs", () => {
    const { dateNowSpy, mathRandomSpy } = installForbiddenApiGuards();

    let state = createStepExecutionState(makeScenario());

    while (state.winner === null) {
      state = runStep(state, { emitTrace: true }).state;
    }

    expect(state.winner).toBe("A");
    expect(dateNowSpy).not.toHaveBeenCalled();
    expect(mathRandomSpy).not.toHaveBeenCalled();
  });

  it("engine path does not leak simple global mutation", () => {
    installForbiddenApiGuards();

    (globalThis as Record<string, unknown>).__WS_TEST_SENTINEL__ = "stable";

    simulate(makeScenario());
    simulateWithTrace(makeScenario());

    expect(
      (globalThis as Record<string, unknown>).__WS_TEST_SENTINEL__
    ).toBe("stable");
  });
});
import { describe, expect, it } from "vitest";
import {
  hashTickStateSnapshot,
  makeTickStateSnapshot,
  makeUnitStateSnapshot,
  serializeCanonicalSnapshot,
} from "@engine/hash";
import type { Unit } from "@engine/types";

function makeUnit(partial: Partial<Unit> & Pick<Unit, "id" | "team">): Unit {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    team: partial.team,
    level: partial.level ?? 1,
    position: partial.position ?? { x: 0, y: 0 },
    targetingPolicy: partial.targetingPolicy ?? "NEAREST",
    hp: partial.hp ?? 100,
    maxHp: partial.maxHp ?? 100,
    dps: partial.dps ?? 10,
    range: partial.range ?? 5,
    attackIntervalSec: partial.attackIntervalSec ?? 0.5,
    cooldownRemaining: partial.cooldownRemaining ?? 0,
    targetId: partial.targetId ?? null,
    moveSpeed: partial.moveSpeed ?? 1,
    activationRange: partial.activationRange ?? 3,
    isActive: partial.isActive ?? false,
    damageFalloff: partial.damageFalloff ?? "NONE",
    k: partial.k ?? 1,
    minDistance: partial.minDistance ?? 1,
  };
}

describe("M2 canonical snapshot and hash", () => {
  it("makeUnitStateSnapshot includes only the frozen hash boundary fields", () => {
    const unit = makeUnit({
      id: "A1",
      team: "A",
      position: { x: 1.23456, y: 7.89123 },
      hp: 99.9999,
      cooldownRemaining: 0.45678,
      isActive: true,
      damageFalloff: "INV_DISTANCE",
      k: 2.34567,
      minDistance: 1.23456,
      name: "ShouldNotBeHashed",
      level: 99,
      dps: 777,
      range: 999,
    });

    expect(makeUnitStateSnapshot(unit)).toEqual({
      id: "A1",
      team: "A",
      hp: 100,
      position: { x: 1.235, y: 7.891 },
      targetId: null,
      cooldownRemaining: 0.457,
      isActive: true,
      damageFalloff: "INV_DISTANCE",
      k: 2.346,
      minDistance: 1.235,
    });
  });

  it("snapshot serialization is stable regardless of input unit order", () => {
    const b = makeUnit({ id: "B1", team: "B" });
    const a = makeUnit({ id: "A1", team: "A" });

    const s1 = makeTickStateSnapshot(3, [b, a]);
    const s2 = makeTickStateSnapshot(3, [a, b]);

    expect(serializeCanonicalSnapshot(s1)).toBe(serializeCanonicalSnapshot(s2));
  });

  it("same snapshot produces same hash", () => {
    const a = makeUnit({ id: "A1", team: "A" });
    const b = makeUnit({ id: "B1", team: "B" });

    const snapshot = makeTickStateSnapshot(5, [a, b]);

    expect(hashTickStateSnapshot(snapshot)).toBe(hashTickStateSnapshot(snapshot));
  });

  it("changed position changes hash", () => {
    const a1 = makeUnit({ id: "A1", team: "A", position: { x: 0, y: 0 } });
    const a2 = makeUnit({ id: "A1", team: "A", position: { x: 1, y: 0 } });

    const h1 = hashTickStateSnapshot(makeTickStateSnapshot(1, [a1]));
    const h2 = hashTickStateSnapshot(makeTickStateSnapshot(1, [a2]));

    expect(h1).not.toBe(h2);
  });

  it("changed isActive changes hash", () => {
    const u1 = makeUnit({ id: "A1", team: "A", isActive: false });
    const u2 = makeUnit({ id: "A1", team: "A", isActive: true });

    const h1 = hashTickStateSnapshot(makeTickStateSnapshot(1, [u1]));
    const h2 = hashTickStateSnapshot(makeTickStateSnapshot(1, [u2]));

    expect(h1).not.toBe(h2);
  });

  it("changed falloff field changes hash", () => {
    const u1 = makeUnit({
      id: "A1",
      team: "A",
      damageFalloff: "NONE",
      k: 1,
      minDistance: 1,
    });

    const u2 = makeUnit({
      id: "A1",
      team: "A",
      damageFalloff: "INV_DISTANCE",
      k: 2,
      minDistance: 3,
    });

    const h1 = hashTickStateSnapshot(makeTickStateSnapshot(1, [u1]));
    const h2 = hashTickStateSnapshot(makeTickStateSnapshot(1, [u2]));

    expect(h1).not.toBe(h2);
  });

  it("scenario metadata is excluded from tick hash because only unit state snapshot is serialized", () => {
    const snapshot = makeTickStateSnapshot(2, [
      makeUnit({ id: "A1", team: "A" }),
    ]);

    const serialized = serializeCanonicalSnapshot(snapshot);

    expect(serialized.includes("createdAt")).toBe(false);
    expect(serialized.includes("name")).toBe(false);
    expect(serialized.includes("settings")).toBe(false);
  });
});
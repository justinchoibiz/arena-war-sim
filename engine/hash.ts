import type {
  TickStateSnapshot,
  Unit,
  UnitStateSnapshot,
} from "./types";
import { roundHalfUp, sortUnitsById } from "./determinism";

function requireFiniteNumber(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be finite number`);
  }
  return value;
}

function requireBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be boolean`);
  }
  return value;
}

function requireStringOrNull(name: string, value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${name} must be string|null`);
  }
  return value;
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function makeUnitStateSnapshot(unit: Unit): UnitStateSnapshot {
  const isActive = requireBoolean(`unit(${unit.id}).isActive`, unit.isActive);
  const damageFalloff = unit.damageFalloff;
  if (damageFalloff !== "NONE" && damageFalloff !== "INV_DISTANCE") {
    throw new Error(`unit(${unit.id}).damageFalloff must be "NONE" | "INV_DISTANCE"`);
  }

  return {
    id: unit.id,
    team: unit.team,
    hp: roundHalfUp(requireFiniteNumber(`unit(${unit.id}).hp`, unit.hp), 3),
    position: {
      x: roundHalfUp(
        requireFiniteNumber(`unit(${unit.id}).position.x`, unit.position?.x),
        3
      ),
      y: roundHalfUp(
        requireFiniteNumber(`unit(${unit.id}).position.y`, unit.position?.y),
        3
      ),
    },
    targetId: requireStringOrNull(`unit(${unit.id}).targetId`, unit.targetId),
    cooldownRemaining: roundHalfUp(
      requireFiniteNumber(
        `unit(${unit.id}).cooldownRemaining`,
        unit.cooldownRemaining
      ),
      3
    ),
    isActive,
    damageFalloff,
    k: roundHalfUp(requireFiniteNumber(`unit(${unit.id}).k`, unit.k), 3),
    minDistance: roundHalfUp(
      requireFiniteNumber(`unit(${unit.id}).minDistance`, unit.minDistance),
      3
    ),
  };
}

export function makeTickStateSnapshot(
  tick: number,
  units: readonly Unit[]
): TickStateSnapshot {
  if (!Number.isInteger(tick) || tick < 0) {
    throw new Error("tick must be integer >= 0");
  }

  const unitsSorted = sortUnitsById(units);
  const snapshots = unitsSorted.map(makeUnitStateSnapshot);

  return {
    tick,
    units: snapshots,
  };
}

function serializeUnitStateSnapshot(unit: UnitStateSnapshot): string {
  const targetIdPart = unit.targetId === null ? "null" : JSON.stringify(unit.targetId);

  return (
    "{"
    + `"cooldownRemaining":${unit.cooldownRemaining},`
    + `"damageFalloff":${JSON.stringify(unit.damageFalloff)},`
    + `"hp":${unit.hp},`
    + `"id":${JSON.stringify(unit.id)},`
    + `"isActive":${unit.isActive},`
    + `"k":${unit.k},`
    + `"minDistance":${unit.minDistance},`
    + `"position":{"x":${unit.position.x},"y":${unit.position.y}},`
    + `"targetId":${targetIdPart},`
    + `"team":${JSON.stringify(unit.team)}`
    + "}"
  );
}

export function serializeCanonicalSnapshot(
  snapshot: TickStateSnapshot
): string {
  if (!Number.isInteger(snapshot.tick) || snapshot.tick < 0) {
    throw new Error("snapshot.tick must be integer >= 0");
  }

  const unitsSorted = [...snapshot.units].sort((a, b) => a.id.localeCompare(b.id));
  const unitsSerialized = unitsSorted.map(serializeUnitStateSnapshot).join(",");

  return `{"tick":${snapshot.tick},"units":[${unitsSerialized}]}`;
}

export function hashTickStateSnapshot(
  snapshot: TickStateSnapshot
): string {
  return fnv1a32(serializeCanonicalSnapshot(snapshot));
}
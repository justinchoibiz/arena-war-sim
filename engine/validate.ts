// /engine/validate.ts
import type {
  Scenario,
  ScenarioVersion,
  FixedDt,
  TargetingPolicy,
  Team,
  Unit,
} from "./types";

function fail(msg: string): never {
  throw new Error(`SCENARIO_INVALID: ${msg}`);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && !Number.isNaN(x);
}

function isTeam(x: unknown): x is Team {
  return x === "A" || x === "B";
}

function isTargetingPolicy(x: unknown): x is TargetingPolicy {
  return x === "NEAREST";
}

function isFixedDt(x: unknown): x is FixedDt {
  return x === 0.1 || x === 0.2;
}

function isScenarioVersion(x: unknown): x is ScenarioVersion {
  return x === "0.1" || x === "0.2";
}

function readString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string") fail(`${key} must be string`);
  return v;
}

function readNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (!isFiniteNumber(v)) fail(`${key} must be finite number`);
  return v;
}

function readNullableString(
  obj: Record<string, unknown>,
  key: string
): string | null {
  const v = obj[key];
  if (v === null) return null;
  if (v === undefined) return null; // targetId optional 취급 (명시 없으면 null)
  if (typeof v !== "string") fail(`${key} must be string|null`);
  return v;
}

function readPosition(obj: Record<string, unknown>, key: string): { x: number; y: number } {
  const v = obj[key];
  if (!isObject(v)) fail(`${key} must be object {x,y}`);
  const x = v["x"];
  const y = v["y"];
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) fail(`${key}.x/y must be finite numbers`);
  return { x, y };
}

function readUnit(u: unknown, idx: number): Unit {
  if (!isObject(u)) fail(`units[${idx}] must be object`);

  const id = readString(u, "id");
  const name = readString(u, "name");

  const team = u["team"];
  if (!isTeam(team)) fail(`units[${idx}].team must be "A"|"B"`);

  const targetingPolicy = u["targetingPolicy"];
  if (!isTargetingPolicy(targetingPolicy)) {
    fail(`units[${idx}].targetingPolicy must be "NEAREST"`);
  }

  const level = readNumber(u, "level");
  const position = readPosition(u, "position");

  const hp = readNumber(u, "hp");
  const maxHp = readNumber(u, "maxHp");
  const dps = readNumber(u, "dps");
  const range = readNumber(u, "range");

  const attackIntervalSec = readNumber(u, "attackIntervalSec");
  const cooldownRemaining = readNumber(u, "cooldownRemaining");
  const targetId = readNullableString(u, "targetId");

  return {
    id,
    name,
    team,
    level,
    position,
    targetingPolicy,
    hp,
    maxHp,
    dps,
    range,
    attackIntervalSec,
    cooldownRemaining,
    targetId,
  };
}

export function validateScenario(s: unknown): Scenario {
  if (!isObject(s)) fail("root must be object");

  const versionRaw = s["version"];
  if (!isScenarioVersion(versionRaw)) fail(`version must be "0.1"|"0.2"`);

  if (versionRaw !== "0.1") fail(`version must be "0.1" (got ${versionRaw})`);

  const name = readString(s, "name");
  const createdAt = readString(s, "createdAt");

  const settingsRaw = s["settings"];
  if (!isObject(settingsRaw)) fail("settings must be object");

  const dtRaw = settingsRaw["dt"];
  if (!isFixedDt(dtRaw)) fail(`settings.dt must be 0.1 or 0.2`);

  const seed = settingsRaw["seed"];
  if (!isFiniteNumber(seed)) fail("settings.seed must be finite number");

  const targetingDefault = settingsRaw["targetingDefault"];
  if (!isTargetingPolicy(targetingDefault)) {
    fail(`settings.targetingDefault must be "NEAREST"`);
  }

  const unitsRaw = s["units"];
  if (!Array.isArray(unitsRaw)) fail("units must be array");

  const units = unitsRaw.map(readUnit);

  // ✅ Necessary: id uniqueness
  const seen = new Set<string>();
  for (const u of units) {
    if (seen.has(u.id)) fail(`duplicate units[].id: ${u.id}`);
    seen.add(u.id);
  }

  // Optional: inputEvents is only allowed to be unknown[] (undefined is OK if not provided)
  const inputEventsRaw = s["inputEvents"];
  let inputEvents: unknown[] | undefined = undefined;
  if (inputEventsRaw !== undefined) {
    if (!Array.isArray(inputEventsRaw)) fail("inputEvents must be array if provided");
    inputEvents = inputEventsRaw;
  }

  return {
    version: versionRaw,
    name,
    createdAt,
    settings: {
      dt: dtRaw,
      seed,
      targetingDefault,
    },
    units,
    inputEvents,
  };
}
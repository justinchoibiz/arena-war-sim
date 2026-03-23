import type { TickStateSnapshot, UnitStateSnapshot } from "@engine/types";

export interface ReplayBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function clampTickIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index > length - 1) return length - 1;
  return index;
}

export function formatHashCompact(hash: string | null | undefined): string {
  if (!hash) return "(none)";
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

export function getSnapshotUnitCount(snapshot: TickStateSnapshot | null): number {
  return snapshot?.units.length ?? 0;
}

export function computeReplayBounds(snapshot: TickStateSnapshot | null): ReplayBounds {
  if (!snapshot || snapshot.units.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const unit of snapshot.units) {
    minX = Math.min(minX, unit.position.x);
    minY = Math.min(minY, unit.position.y);
    maxX = Math.max(maxX, unit.position.x);
    maxY = Math.max(maxY, unit.position.y);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  const pad = 10;

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

export function getTeamColor(team: "A" | "B"): string {
  return team === "A" ? "#4ade80" : "#f87171";
}

export function getTeamLineColor(team: "A" | "B"): string {
  return team === "A" ? "rgba(74, 222, 128, 0.45)" : "rgba(248, 113, 113, 0.45)";
}

export function getHpRatio(unit: UnitStateSnapshot): number {
  const maxVisibleHp = 100;
  const ratio = unit.hp / maxVisibleHp;
  return Math.max(0, Math.min(1, ratio));
}
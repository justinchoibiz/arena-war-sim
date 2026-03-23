import type { CSSProperties } from "react";
import { motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import { Radar } from "lucide-react";
import type { TickStateSnapshot } from "@engine/types";
import {
  computeReplayBounds,
  formatHashCompact,
  getHpRatio,
  getTeamColor,
  getTeamLineColor,
} from "../../../entities/trace/lib/replayUtils";

export interface ReplayViewportProps {
  snapshot: TickStateSnapshot | null;
  stateHash?: string | null;
  width?: number;
  height?: number;
}

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 10,
};

const separatorStyle: CSSProperties = {
  height: 1,
  width: "100%",
  background: "rgba(255,255,255,0.06)",
};

export function ReplayViewport(props: ReplayViewportProps) {
  const width = props.width ?? 520;
  const height = props.height ?? 320;
  const snapshot = props.snapshot ?? null;
  const bounds = computeReplayBounds(snapshot);

  const sx = (x: number) =>
    ((x - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * width;

  const sy = (y: number) =>
    ((y - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * height;

  const byId = new Map((snapshot?.units ?? []).map((u) => [u.id, u] as const));

  return (
    <motion.section
      layout
      initial={{ opacity: 0.96 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      style={cardStyle}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            <Radar size={15} strokeWidth={2} />
            Replay Viewport
          </div>
          <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
            Current tick snapshot only
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--ws-text-soft)",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            maxWidth: "100%",
            overflowWrap: "anywhere",
            textAlign: "right",
          }}
        >
          {formatHashCompact(props.stateHash ?? null)}
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      {!snapshot ? (
        <div
          style={{
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 20,
            fontSize: 13,
            color: "var(--ws-text-soft)",
          }}
        >
          No replay snapshot available.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 10,
            background: "#11161f",
          }}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              borderRadius: 12,
              background:
                "radial-gradient(circle at top, rgba(120,140,180,0.08), transparent 35%), #11161f",
            }}
          >
            {(snapshot.units ?? []).map((unit) => {
              if (!unit.targetId) return null;
              const target = byId.get(unit.targetId);
              if (!target) return null;

              return (
                <line
                  key={`${unit.id}->${unit.targetId}`}
                  x1={sx(unit.position.x)}
                  y1={sy(unit.position.y)}
                  x2={sx(target.position.x)}
                  y2={sy(target.position.y)}
                  stroke={getTeamLineColor(unit.team)}
                  strokeWidth={1.5}
                />
              );
            })}

            {(snapshot.units ?? []).map((unit) => {
              const x = sx(unit.position.x);
              const y = sy(unit.position.y);
              const hpRatio = getHpRatio(unit);
              const teamColor = getTeamColor(unit.team);

              return (
                <g key={unit.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill={teamColor}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={1}
                  />

                  <rect
                    x={x - 16}
                    y={y - 16}
                    width={32}
                    height={4}
                    rx={2}
                    fill="rgba(255,255,255,0.12)"
                  />
                  <rect
                    x={x - 16}
                    y={y - 16}
                    width={32 * hpRatio}
                    height={4}
                    rx={2}
                    fill={teamColor}
                  />

                  <text
                    x={x + 9}
                    y={y + 4}
                    fontSize={11}
                    fill="rgba(255,255,255,0.9)"
                    style={{ pointerEvents: "none" }}
                  >
                    {unit.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </motion.section>
  );
}
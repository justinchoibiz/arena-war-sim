import type { CSSProperties } from "react";
import { motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import { Crosshair } from "lucide-react";
import type { Scenario } from "@engine/types";

function computeBounds(units: Scenario["units"]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const u of units) {
    minX = Math.min(minX, u.position.x);
    minY = Math.min(minY, u.position.y);
    maxX = Math.max(maxX, u.position.x);
    maxY = Math.max(maxY, u.position.y);
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

const cardStyle: CSSProperties = {
  border: "1px solid var(--ws-border)",
  background: "var(--ws-panel)",
  borderRadius: 24,
  boxShadow: "var(--ws-shadow-1)",
  padding: 16,
  display: "grid",
  gap: 14,
};

const separatorStyle: CSSProperties = {
  height: 1,
  width: "100%",
  background: "rgba(255,255,255,0.06)",
};

export function TargetLines(props: {
  scenario: Scenario;
  width?: number;
  height?: number;
}) {
  const width = props.width ?? 460;
  const height = props.height ?? 300;

  const units = props.scenario.units.slice().sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(units.map((u) => [u.id, u] as const));

  const { minX, minY, maxX, maxY } = computeBounds(units);

  const sx = (x: number) => ((x - minX) / (maxX - minX || 1)) * width;
  const sy = (y: number) => ((y - minY) / (maxY - minY || 1)) * height;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={cardStyle}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <Crosshair size={16} strokeWidth={2} />
          Target Lines
        </div>
        <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
          Static imported scenario view
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 20,
          padding: 10,
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            height: "auto",
            borderRadius: 16,
            background: "linear-gradient(180deg, #11161f 0%, #0d1219 100%)",
          }}
        >
          {units.map((u) => {
            if (!u.targetId) return null;
            const t = byId.get(u.targetId);
            if (!t) return null;

            return (
              <line
                key={`${u.id}->${u.targetId}`}
                x1={sx(u.position.x)}
                y1={sy(u.position.y)}
                x2={sx(t.position.x)}
                y2={sy(t.position.y)}
                stroke="rgba(123,167,255,0.82)"
                strokeWidth={2}
              />
            );
          })}

          {units.map((u) => (
            <g key={u.id}>
              <circle
                cx={sx(u.position.x)}
                cy={sy(u.position.y)}
                r={5}
                fill={u.team === "A" ? "#4ade80" : "#f87171"}
              />
              <text
                x={sx(u.position.x) + 8}
                y={sy(u.position.y) + 4}
                fontSize={11}
                fill="rgba(255,255,255,0.88)"
              >
                {u.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ fontSize: 12, color: "var(--ws-text-soft)", lineHeight: 1.5 }}>
        This remains a scenario-import view. It is not a replay viewer, timeline, or per-tick state browser.
      </div>
    </motion.section>
  );
}
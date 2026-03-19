import type { Scenario } from "@engine/types";

function computeBounds(units: Scenario["units"]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const u of units) {
    minX = Math.min(minX, u.position.x);
    minY = Math.min(minY, u.position.y);
    maxX = Math.max(maxX, u.position.x);
    maxY = Math.max(maxY, u.position.y);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  // pad to avoid zero range
  const pad = 10;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function TargetLines(props: { scenario: Scenario; width?: number; height?: number }) {
  const width = props.width ?? 420;
  const height = props.height ?? 260;

  const units = props.scenario.units.slice().sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(units.map((u) => [u.id, u] as const));

  const { minX, minY, maxX, maxY } = computeBounds(units);

  const sx = (x: number) => ((x - minX) / (maxX - minX || 1)) * width;
  const sy = (y: number) => ((y - minY) / (maxY - minY || 1)) * height;

  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Target Lines</h3>

      <svg width={width} height={height} style={{ background: "#111", borderRadius: 8 }}>
        {/* Lines */}
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
              stroke="#60a5fa"
              strokeWidth={2}
              opacity={0.9}
            />
          );
        })}

        {/* Nodes */}
        {units.map((u) => (
          <g key={u.id}>
            <circle cx={sx(u.position.x)} cy={sy(u.position.y)} r={5} fill={u.team === "A" ? "#34d399" : "#f87171"} />
            <text x={sx(u.position.x) + 7} y={sy(u.position.y) + 4} fontSize={11} fill="#e5e7eb">
              {u.id}
            </text>
          </g>
        ))}
      </svg>

      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
        Note: M1에서는 “결과 기반”이라 targetId는 Import된 scenario 값이 그대로 보입니다. (실시간 갱신은 M3)
      </div>
    </div>
  );
}
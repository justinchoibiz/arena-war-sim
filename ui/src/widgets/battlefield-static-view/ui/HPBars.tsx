import type { CSSProperties } from "react";
import { motion } from "motion/react";
import * as Separator from "@radix-ui/react-separator";
import { HeartPulse } from "lucide-react";
import type { Scenario } from "@engine/types";

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

const rowStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)",
  borderRadius: 18,
  padding: 12,
  display: "grid",
  gap: 10,
};

function teamAccent(team: "A" | "B") {
  return team === "A"
    ? {
        pillBg: "rgba(74,222,128,0.14)",
        pillFg: "rgb(198,248,214)",
        fill: "linear-gradient(90deg, rgba(74,222,128,0.90), rgba(38,194,108,0.88))",
      }
    : {
        pillBg: "rgba(248,113,113,0.14)",
        pillFg: "rgb(255,211,211)",
        fill: "linear-gradient(90deg, rgba(248,113,113,0.90), rgba(234,77,77,0.88))",
      };
}

export function HPBars(props: { scenario: Scenario }) {
  const units = props.scenario.units.slice().sort((a, b) => a.id.localeCompare(b.id));

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
          <HeartPulse size={16} strokeWidth={2} />
          HP Bars
        </div>
        <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
          Static imported scenario view
        </div>
      </div>

      <Separator.Root decorative orientation="horizontal" style={separatorStyle} />

      <div style={{ display: "grid", gap: 10 }}>
        {units.map((u) => {
          const pct = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
          const accent = teamAccent(u.team);

          return (
            <div key={u.id} style={rowStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      background: accent.pillBg,
                      color: accent.pillFg,
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {u.team}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{u.id}</span>
                  <span style={{ fontSize: 13, color: "var(--ws-text-soft)" }}>{u.name}</span>
                </div>

                <div style={{ fontSize: 12, color: "var(--ws-text-soft)" }}>
                  {u.hp.toFixed(3)} / {u.maxHp.toFixed(3)}
                </div>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 12,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: accent.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
import type { Scenario } from "@engine/types";

export function HPBars(props: { scenario: Scenario }) {
  const units = props.scenario.units.slice().sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>HP Bars</h3>

      <div style={{ display: "grid", gap: 10 }}>
        {units.map((u) => {
          const pct = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
          return (
            <div key={u.id} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <b>{u.id}</b> ({u.team}) {u.name}
                </span>
                <span style={{ opacity: 0.8 }}>
                  {u.hp} / {u.maxHp}
                </span>
              </div>
              <div style={{ height: 10, background: "#222", borderRadius: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct * 100}%`,
                    background: "#6ee7b7",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
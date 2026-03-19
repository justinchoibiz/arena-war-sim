import type { SimResult } from "@engine/types";

export function ResultPanel(props: { result: SimResult | null }) {
  const r = props.result;

  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Result</h3>

      {!r ? (
        <div style={{ opacity: 0.7 }}>No result yet. Click Start.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <b>winnerTeam</b>: {r.winnerTeam}
          </div>
          <div>
            <b>timeToFinishSec</b>: {r.timeToFinishSec.toFixed(3)}
          </div>
          <div>
            <b>attackCount</b>: {r.attackCount}
          </div>
          <div>
            <b>survivorIds</b>:{" "}
            <code>{r.survivorIds.join(", ") || "(none)"}</code>
          </div>
        </div>
      )}
    </div>
  );
}
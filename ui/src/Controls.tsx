export function Controls(props: {
  onStart: () => void;
  onReset: () => void;
  isStartDisabled?: boolean;
}) {
  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Controls</h3>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={props.onStart} disabled={props.isStartDisabled}>
          Start
        </button>

        <button onClick={props.onReset}>Reset</button>

        <button disabled title="Not supported in M1">
          Pause (M1 N/A)
        </button>
      </div>

      <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
        Policy: Start = validate → simulate → render result. Pause is intentionally disabled to avoid M3 scope creep.
      </div>
    </div>
  );
}
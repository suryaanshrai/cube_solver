/**
 * The HUD layer.
 *
 * None of this is functionally necessary — a chapter counter, a plate number, a hairline
 * rule. All of it signals that someone deliberate was here, and it costs almost nothing.
 * It stays under 11px, under 65% opacity, pinned to the frame, and it hides on small
 * screens where it would compete with content instead of framing it.
 */

export function Eyebrow({ index, children, className = "" }) {
  return (
    <p className={`chrome eyebrow ${className}`}>
      {index != null && <span className="eyebrow__index">{String(index).padStart(2, "0")}</span>}
      {children}
    </p>
  );
}

export function Button({ variant = "quiet", children, ...props }) {
  return (
    <button type="button" className={`btn btn--${variant}`} {...props}>
      {children}
    </button>
  );
}

/** Prev / next, sized for thumbs and labelled for screen readers. */
export function StepButton({ direction, disabled, onClick, label }) {
  return (
    <button
      type="button"
      className={`step-btn step-btn--${direction}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          d={direction === "next" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}

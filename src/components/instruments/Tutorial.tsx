import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * TutorialOverlay — a short, manually-triggered coach-mark tour shared by
 * Synth, DrumMachine, and Bassline. Each stop points at one already-existing
 * panel section via a `data-tutorial` attribute (rather than a dedicated
 * wrapper), so the highlighted rect always matches real layout — no new
 * markup needed beyond that one attribute per target.
 *
 * Rendered as a plain child of the instrument's own root element (not a
 * portal): every instrument's root already carries the shared skin's CSS
 * custom properties via `skinToCssVars` (see ./skins.ts), and none of their
 * ancestors use `transform`/`filter`/`contain`, so `position: fixed`
 * children here still anchor correctly to the viewport while inheriting the
 * right skin colors for free.
 *
 * The "spotlight" is four positioned scrim rectangles framing the target
 * rect (rather than a single dimmed overlay with a CSS mask), which keeps
 * the highlighted control itself genuinely clickable during the tour.
 */
export interface TutorialStep {
  /** CSS selector, resolved against `rootRef`'s subtree via querySelector. */
  target: string;
  title: string;
  body: string;
}

interface TutorialOverlayProps {
  rootRef: RefObject<HTMLElement | null>;
  steps: TutorialStep[];
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

export function TutorialOverlay({ rootRef, steps, stepIndex, onNext, onBack, onClose }: TutorialOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];

  // Recomputed on every step change and on resize/scroll — plain getBoundingClientRect
  // reads, cheap enough not to need throttling for a manually-paced tour.
  useLayoutEffect(() => {
    const update = () => {
      const el = rootRef.current?.querySelector(step.target) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const el = rootRef.current?.querySelector(step.target);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [rootRef, step.target]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onNext, onBack, onClose]);

  if (!rect) return null;

  const pad = 8;
  const hx = rect.left - pad;
  const hy = rect.top - pad;
  const hw = rect.width + pad * 2;
  const hh = rect.height + pad * 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const cardWidth = 280;
  const cardEstHeight = 160;
  const placeAbove = vh - (hy + hh) < cardEstHeight + 16 && hy > cardEstHeight + 16;
  const cardTop = placeAbove
    ? Math.max(12, hy - 12 - cardEstHeight)
    : Math.min(vh - cardEstHeight - 12, hy + hh + 12);
  const cardLeft = Math.min(Math.max(12, hx + hw / 2 - cardWidth / 2), vw - cardWidth - 12);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="tutorial-layer">
      <style>{`
        .tutorial-layer { position: fixed; inset: 0; pointer-events: none; z-index: 300; }
        .tutorial-scrim { position: fixed; background: rgba(0, 0, 0, 0.72); pointer-events: auto; }
        .tutorial-ring { position: fixed; pointer-events: none; border: 2px solid var(--accent2);
          border-radius: 10px; box-shadow: 0 0 16px var(--accent2-glow); transition: all 0.2s ease; }
        .tutorial-card { position: fixed; pointer-events: auto; background: var(--panel-2);
          border: 1px solid var(--accent2); border-radius: 10px; padding: 14px 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5); transition: all 0.2s ease;
          font-family: 'JetBrains Mono', 'Space Mono', monospace; color: var(--text); }
        .tutorial-title { font-size: 12px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--accent2); margin-bottom: 6px; }
        .tutorial-body { font-size: 11px; line-height: 1.55; color: var(--control-text); margin-bottom: 12px; }
        .tutorial-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .tutorial-progress { font-size: 10px; color: var(--label); white-space: nowrap; }
        .tutorial-actions { display: flex; gap: 6px; }
        .tutorial-btn { font-family: inherit; font-size: 9px; padding: 5px 10px; border-radius: 6px;
          cursor: pointer; letter-spacing: 0.05em; background: var(--control-bg);
          color: var(--control-text); border: 1px solid var(--border); }
        .tutorial-btn.primary { background: var(--accent2); color: var(--panel); border-color: var(--accent2); }
      `}</style>
      <div className="tutorial-scrim" style={{ top: 0, left: 0, width: vw, height: Math.max(0, hy) }} />
      <div
        className="tutorial-scrim"
        style={{ top: hy + hh, left: 0, width: vw, height: Math.max(0, vh - (hy + hh)) }}
      />
      <div className="tutorial-scrim" style={{ top: hy, left: 0, width: Math.max(0, hx), height: hh }} />
      <div
        className="tutorial-scrim"
        style={{ top: hy, left: hx + hw, width: Math.max(0, vw - (hx + hw)), height: hh }}
      />
      <div className="tutorial-ring" style={{ top: hy, left: hx, width: hw, height: hh }} />
      <div className="tutorial-card" style={{ top: cardTop, left: cardLeft, width: cardWidth }}>
        <div className="tutorial-title">{step.title}</div>
        <div className="tutorial-body">{step.body}</div>
        <div className="tutorial-footer">
          <span className="tutorial-progress">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="tutorial-actions">
            <button type="button" className="tutorial-btn" onClick={onClose}>
              skip
            </button>
            {!isFirst && (
              <button type="button" className="tutorial-btn" onClick={onBack}>
                back
              </button>
            )}
            <button type="button" className="tutorial-btn primary" onClick={onNext}>
              {isLast ? "done" : "next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

const MAX_TILT_DEG = 6;

/**
 * Subtle 3D tilt-toward-cursor effect for card-style elements. Attaches
 * native mousemove/mouseleave listeners to the returned ref's element and
 * mutates its style directly (rather than React state), so it can update
 * every mousemove without re-rendering. No-ops under
 * prefers-reduced-motion.
 *
 * Returns a plain ref (not bundled with the handlers in an object) — a
 * direct useRef pass-through is what plays nicely with the
 * react-hooks/refs lint rule.
 */
export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * MAX_TILT_DEG * 2;
      const rotateX = (0.5 - py) * MAX_TILT_DEG * 2;
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = "";
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return ref;
}

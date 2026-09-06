import { useCallback, useRef, type ReactNode } from "react";
import NightSky from "./NightSky";

const MAX_PARALLAX_PX = 16;

type NightSkyBannerProps = {
  children: ReactNode;
};

/** Shared dark, starry header banner (see NightSky) used by every top-level
 * page — keeps the "space" visual identity consistent across Home, Resume,
 * Apps, and About instead of confining it to just the name banner.
 *
 * Also drives NightSky's cursor parallax: mouse position over the banner is
 * written to CSS custom properties on this header element directly (not
 * React state), so the starfield can react on every mousemove without
 * re-rendering anything. NightSky reads `--sky-tilt-x`/`--sky-tilt-y` with a
 * 0px fallback, so it degrades gracefully if ever rendered without this
 * wrapper. */
function NightSkyBanner({ children }: NightSkyBannerProps) {
  const headerRef = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = headerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--sky-tilt-x", `${px * MAX_PARALLAX_PX}px`);
    el.style.setProperty("--sky-tilt-y", `${py * MAX_PARALLAX_PX}px`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = headerRef.current;
    if (!el) return;
    el.style.setProperty("--sky-tilt-x", "0px");
    el.style.setProperty("--sky-tilt-y", "0px");
  }, []);

  return (
    <header
      ref={headerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mb-10 overflow-hidden rounded-2xl px-6 py-10 shadow-xl shadow-indigo-950/20 ring-1 ring-white/10 print:rounded-none print:p-0 print:shadow-none print:ring-0 sm:px-10 sm:py-14"
    >
      <NightSky />
      <div className="relative">{children}</div>
    </header>
  );
}

export default NightSkyBanner;

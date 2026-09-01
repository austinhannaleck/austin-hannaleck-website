import { useMemo } from "react";

/**
 * Decorative astrophotography-style backdrop for Home's hero band. Pure
 * CSS/SVG, no image asset: a deep navy/indigo gradient (the site's own
 * indigo accent, just darkened) with a scattered, twinkling starfield and
 * a handful of staggered shooting stars. Star positions AND shooting-star
 * start point/angle/distance/timing are all generated once per mount from
 * a small seeded PRNG, so nothing reshuffles on every re-render, but it
 * still differs from one page load to the next — and critically, the
 * shooting stars no longer all share one fixed trajectory: each gets its
 * own random start position, direction, and streak length, so it doesn't
 * read as "the same comet from the same spot" every time it fires.
 *
 * `aria-hidden` + absolutely positioned behind `pointer-events-none` —
 * this is pure decoration, never in the tab order and never intercepts
 * clicks meant for the hero content stacked on top of it.
 */

interface Star {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface ShootingStar {
  /** Start position, as a percentage of the container. */
  xPercent: number;
  yPercent: number;
  /** End-of-streak offset in px — direction and distance both randomized
   * per star, rather than every shooting star travelling the same fixed
   * (240px, 130px) diagonal. */
  dx: number;
  dy: number;
  delay: number;
  duration: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeStars(count: number, rand: () => number): Star[] {
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: 0.6 + rand() * 1.8,
    delay: rand() * 6,
    duration: 2.5 + rand() * 3.5,
  }));
}

/** A shooting star's angle is randomized within a "still reads as a
 * shooting star" band (shallow-ish, travelling down-right) rather than
 * any angle at all, and its delay is spread across a wide window so a
 * handful of these looping independently don't end up synchronized. */
function makeShootingStars(count: number, rand: () => number): ShootingStar[] {
  return Array.from({ length: count }, () => {
    const angle = (20 + rand() * 40) * (Math.PI / 180);
    const distance = 160 + rand() * 220;
    return {
      xPercent: rand() * 70,
      yPercent: rand() * 35,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      delay: rand() * 14,
      duration: 7 + rand() * 6,
    };
  });
}

export default function NightSky() {
  const stars = useMemo(() => {
    const seed = Math.floor(Date.now() / 1000);
    return makeStars(90, seededRandom(seed));
  }, []);
  // Separate seeded stream (not reusing the stars' rand sequence) so
  // adding/removing stars later can't shift the shooting stars' own
  // randomization as a side effect.
  const shootingStars = useMemo(() => {
    const seed = Math.floor(Date.now() / 1000) * 31 + 17;
    return makeShootingStars(3, seededRandom(seed));
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] print:hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#211a4d_0%,_#0d0f2b_55%,_#05060f_100%)]" />
      <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />

      {stars.map((s, i) => (
        <span
          key={i}
          className="night-sky-star absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow: s.size > 1.8 ? "0 0 4px 1px rgba(255,255,255,0.55)" : "none",
            // `backwards` matters here: without it, a star with animation-delay
            // just sits at its default (fully opaque) state until the delay
            // elapses, then jumps straight to the 0% keyframe's dimmer
            // opacity — a sudden, staggered "debrightening" per star over the
            // first few seconds instead of a smooth twinkle from the start.
            animation: `night-sky-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite backwards`,
          }}
        />
      ))}

      {shootingStars.map((s, i) => (
        <span
          key={i}
          className="night-sky-shooting-star"
          style={{
            left: `${s.xPercent}%`,
            top: `${s.yPercent}%`,
            animationName: `night-sky-shoot-${i}`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes night-sky-twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        ${shootingStars
          .map(
            (s, i) => `
          @keyframes night-sky-shoot-${i} {
            0%, 6% { transform: translate(0, 0); opacity: 0; }
            8% { opacity: 1; }
            22%, 100% { transform: translate(${s.dx}px, ${s.dy}px); opacity: 0; }
          }
        `,
          )
          .join("\n")}
        .night-sky-shooting-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 999px;
          box-shadow: 0 0 6px 2px rgba(255,255,255,0.8);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          /* Same reasoning as the stars' backwards fill-mode above: without
             it, the dot sits fully visible at its start point for the whole
             delay instead of already being invisible (the streak's 0%
             opacity) until its turn to fire. */
          animation-fill-mode: backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .night-sky-star, .night-sky-shooting-star {
            animation: none !important;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

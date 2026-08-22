import { useEffect, useState } from "react";
import { GRID_SIZE, type PickupType, type PowerupType } from "./getTheBuggy/types";
import Banjo from "./getTheBuggy/Banjo";
import Broccoli from "./getTheBuggy/Broccoli";
import Bug from "./getTheBuggy/Bug";
import Carrot from "./getTheBuggy/Carrot";
import EatBurst from "./getTheBuggy/EatBurst";
import GoldenBug from "./getTheBuggy/GoldenBug";
import LeaderboardList from "./getTheBuggy/Leaderboard";
import Magnet from "./getTheBuggy/Magnet";
import Mint from "./getTheBuggy/Mint";
import Mushroom from "./getTheBuggy/Mushroom";
import PowerupGuide from "./getTheBuggy/PowerupGuide";
import {
  buildEntry,
  insertScore,
  loadLastName,
  loadLeaderboard,
  saveLastName,
  saveLeaderboard,
  type LeaderboardEntry,
} from "./getTheBuggy/leaderboardStorage";
import { useSnakeGame } from "./getTheBuggy/useSnakeGame";

const CELL_PERCENT = 100 / GRID_SIZE;

type Burst = { id: number; x: number; y: number };

const POWERUP_HUD = {
  broccoli: { icon: "🥦", label: "Invincible!" },
  carrot: { icon: "🥕", label: "Speed boost!" },
  mint: { icon: "🌿", label: "Slow-mo!" },
  magnet: { icon: "🧲", label: "Magnet!" },
};

// Applied once to a wrapper around the whole snake, not per-segment —
// each segment glowing independently meant a freshly-grown tail segment
// (a brand-new DOM node) started its CSS animation at 0% while the rest
// of the snake was already mid-cycle, so the new segment visibly flashed
// out of phase with the others. One shared animated element has no
// "when did this node mount" to desync from.
function glowClassFor(type: PowerupType | null): string {
  switch (type) {
    case "broccoli":
      return "buggy-invincible";
    case "carrot":
      return "buggy-glow-carrot";
    case "mint":
      return "buggy-glow-mint";
    case "magnet":
      return "buggy-glow-magnet";
    case null:
      return "";
  }
}

function PickupSprite({ type }: { type: PickupType }) {
  switch (type) {
    case "broccoli":
      return <Broccoli />;
    case "carrot":
      return <Carrot />;
    case "mint":
      return <Mint />;
    case "magnet":
      return <Magnet />;
    case "mushroom":
      return <Mushroom />;
    case "goldenBug":
      return <GoldenBug />;
  }
}

function GetTheBuggy() {
  const { gameState, togglePause, restart, tickIntervalMs, restartKey, hasStarted } = useSnakeGame();
  const { banjo, bug, pickup, direction, score, status, activePowerup } = gameState;

  const activePowerupType = activePowerup?.type ?? null;
  const powerupSecondsLeft = activePowerup
    ? Math.max(1, Math.ceil((activePowerup.ticksRemaining * tickIntervalMs) / 1000))
    : 0;

  // Segment slides are only for Banjo, who genuinely moves one cell per
  // tick — the bug teleports on catch, so it's rendered with no
  // transition at all (see below) rather than gliding across the board.
  // Kept just under the tick interval (not 100%) so there's a hair of
  // room before the next tick fires, avoiding an abrupt cut if a tick
  // lands slightly early.
  const moveTransitionMs = tickIntervalMs * 0.92;

  // Bursts spawn wherever Banjo's head is the tick the score ticks up —
  // that's exactly the cell the eaten bug was in. `score` only ever goes
  // up by 1 per catch (see nextState in useSnakeGame), so it doubles as
  // a unique id for the burst it triggers.
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [prevScore, setPrevScore] = useState(score);
  if (score !== prevScore) {
    setPrevScore(score);
    if (score > prevScore) {
      setBursts((prev) => [...prev, { id: score, x: banjo[0].x, y: banjo[0].y }]);
    }
  }

  // A run ends up "pending" on game over rather than being recorded
  // immediately, so the player can type a name for it first. `date`
  // doubles as an entry's id once committed, so it survives the
  // sort/truncate in `insertScore` and can still be found afterward to
  // highlight it.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [nameInput, setNameInput] = useState(() => loadLastName());
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [savedEntryDate, setSavedEntryDate] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (status === "gameover" && score > 0) {
      setPendingScore(score);
    }
  }

  // Sync to localStorage whenever these actually change.
  useEffect(() => {
    saveLeaderboard(leaderboard);
  }, [leaderboard]);
  useEffect(() => {
    saveLastName(nameInput);
  }, [nameInput]);

  const bestScore = leaderboard[0]?.score ?? 0;
  const isNewBest =
    (pendingScore !== null && pendingScore > bestScore) ||
    (savedEntryDate !== null && leaderboard[0]?.date === savedEntryDate);

  function saveScore() {
    if (pendingScore === null) return;
    const entry = buildEntry(pendingScore, nameInput);
    setLeaderboard((prev) => insertScore(prev, entry));
    setSavedEntryDate(entry.date);
    setPendingScore(null);
  }

  // A restart remounts the board (via `key={restartKey}` below) so Banjo
  // snaps back to the start instantly instead of sliding there — clear
  // out any burst still mid-animation along with it. A pending score
  // that was never explicitly saved is committed here (with whatever
  // name, if any, was typed) rather than silently lost.
  const [prevRestartKey, setPrevRestartKey] = useState(restartKey);
  if (restartKey !== prevRestartKey) {
    setPrevRestartKey(restartKey);
    setBursts([]);
    setSavedEntryDate(null);
    if (pendingScore !== null) {
      setLeaderboard((prev) => insertScore(prev, buildEntry(pendingScore, nameInput)));
    }
    setPendingScore(null);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-12 sm:px-10">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Get the Buggy
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Banjo's on the hunt</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Arrow keys or WASD to move · Space to pause · R to restart
        </p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 sm:hidden">
          Best played on desktop with a keyboard.
        </p>
      </header>

      <PowerupGuide />

      <div className="mt-6 mb-3 flex items-baseline gap-4 text-lg font-semibold">
        <span>Score: {score}</span>
        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">Best: {bestScore}</span>
        {activePowerupType && (
          <span className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
            {POWERUP_HUD[activePowerupType].icon} {POWERUP_HUD[activePowerupType].label} {powerupSecondsLeft}s
          </span>
        )}
      </div>

      <style>{`
        @keyframes buggy-invincible-glow {
          0% { filter: hue-rotate(0deg) saturate(1.7) brightness(1.1); }
          100% { filter: hue-rotate(360deg) saturate(1.7) brightness(1.1); }
        }
        @keyframes buggy-glow-carrot-pulse {
          0%, 100% { filter: sepia(1) saturate(4) hue-rotate(-15deg) brightness(1.1); }
          50% { filter: sepia(1) saturate(6) hue-rotate(-15deg) brightness(1.4); }
        }
        @keyframes buggy-glow-mint-pulse {
          0%, 100% { filter: sepia(1) saturate(3) hue-rotate(80deg) brightness(1.05); }
          50% { filter: sepia(1) saturate(4) hue-rotate(80deg) brightness(1.25); }
        }
        @keyframes buggy-glow-magnet-pulse {
          0%, 100% { filter: sepia(1) saturate(4) hue-rotate(200deg) brightness(1.05); }
          50% { filter: sepia(1) saturate(5) hue-rotate(200deg) brightness(1.3); }
        }
        .buggy-invincible { animation: buggy-invincible-glow 0.5s linear infinite; }
        .buggy-glow-carrot { animation: buggy-glow-carrot-pulse 0.25s ease-in-out infinite; }
        .buggy-glow-mint { animation: buggy-glow-mint-pulse 1.1s ease-in-out infinite; }
        .buggy-glow-magnet { animation: buggy-glow-magnet-pulse 0.6s ease-in-out infinite; }
      `}</style>

      <div
        key={restartKey}
        className="relative aspect-square w-full max-w-xl overflow-hidden rounded-xl border border-neutral-200 bg-emerald-50 dark:border-neutral-800 dark:bg-emerald-950/20"
      >
        <div className={`absolute inset-0 ${glowClassFor(activePowerupType)}`}>
          {banjo.map((segment, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: 0,
                top: 0,
                width: `${CELL_PERCENT}%`,
                height: `${CELL_PERCENT}%`,
                // `translate()` percentages resolve against the element's
                // own box, and each segment's box is exactly one grid
                // cell — so translate(100%, 100%) is "one cell over,"
                // same math as the old left/top percentages. Animating
                // transform instead of left/top keeps this off the layout
                // pipeline (compositor-only), which is what actually
                // makes the slide feel smooth instead of choppy.
                transform: `translate(${segment.x * 100}%, ${segment.y * 100}%)`,
                transitionProperty: "transform",
                transitionDuration: `${moveTransitionMs}ms`,
                transitionTimingFunction: "linear",
                willChange: "transform",
              }}
            >
              {/* Padding lives on this 100%-sized inner div, not the percentage-
                  sized outer one — a percentage `width` under 100% combined with
                  percentage `padding` on the same element inflates the box in
                  some browsers, so the two percentages are kept on separate elements. */}
              <div className="h-full w-full box-border p-[6%]">
                <Banjo segment={i === 0 ? "head" : "body"} direction={direction} turnDurationMs={moveTransitionMs} />
              </div>
            </div>
          ))}
        </div>

        {/* No transition here — the bug teleports to a new cell on each
            catch, it doesn't slide there like Banjo does. */}
        <div
          className="absolute"
          style={{
            left: `${bug.x * CELL_PERCENT}%`,
            top: `${bug.y * CELL_PERCENT}%`,
            width: `${CELL_PERCENT}%`,
            height: `${CELL_PERCENT}%`,
          }}
        >
          <div className="h-full w-full box-border p-[10%]">
            <Bug />
          </div>
        </div>

        {/* Also no transition — spawns and disappears at fixed cells,
            doesn't slide like Banjo. */}
        {pickup && (
          <div
            className="absolute"
            style={{
              left: `${pickup.position.x * CELL_PERCENT}%`,
              top: `${pickup.position.y * CELL_PERCENT}%`,
              width: `${CELL_PERCENT}%`,
              height: `${CELL_PERCENT}%`,
            }}
          >
            <div className="h-full w-full box-border p-[8%]">
              <PickupSprite type={pickup.type} />
            </div>
          </div>
        )}

        {bursts.map((burst) => (
          <div
            key={burst.id}
            className="absolute"
            style={{
              left: `${burst.x * CELL_PERCENT}%`,
              top: `${burst.y * CELL_PERCENT}%`,
              width: `${CELL_PERCENT}%`,
              height: `${CELL_PERCENT}%`,
            }}
          >
            <EatBurst onDone={() => setBursts((prev) => prev.filter((b) => b.id !== burst.id))} />
          </div>
        ))}

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm dark:bg-neutral-950/80">
            <p className="text-2xl font-semibold">
              {status === "paused" ? "Paused" : "Game Over"}
            </p>
            {status === "gameover" && (
              <p className="text-neutral-500 dark:text-neutral-400">Final score: {score}</p>
            )}
            {isNewBest && (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">New best!</p>
            )}
            {pendingScore !== null && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveScore();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  maxLength={20}
                  autoFocus
                  className="w-36 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Save score
                </button>
              </form>
            )}
            <div className="flex gap-2">
              {status === "paused" && (
                <button
                  type="button"
                  onClick={togglePause}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  {hasStarted ? "Resume" : "Start"}
                </button>
              )}
              <button
                type="button"
                onClick={restart}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-emerald-400 dark:border-neutral-700 dark:hover:border-emerald-700"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>

      <LeaderboardList entries={leaderboard} highlightDate={savedEntryDate} />
    </main>
  );
}

export default GetTheBuggy;

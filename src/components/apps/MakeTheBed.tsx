import { useState } from "react";
import { COLS, PLATFORM_WIDTH, SPAWN_GAP_ROWS, VIEW_ROWS, landingRowForStack } from "./makeTheBed/types";
import Bed from "./makeTheBed/Bed";
import Lily from "./makeTheBed/Lily";
import { loadBestScore, saveBestScore } from "./makeTheBed/bestScoreStorage";
import { useBedGame } from "./makeTheBed/useBedGame";

const COL_PERCENT = 100 / COLS;
const ROW_PERCENT = 100 / VIEW_ROWS;

function MakeTheBed() {
  const { gameState, togglePause, restart, tickIntervalMs, restartKey, hasStarted } = useBedGame();
  const { platformCol, facing, fallingBed, stack, status } = gameState;
  const score = stack.length;

  const [bestScore, setBestScore] = useState(() => loadBestScore());
  const [prevScore, setPrevScore] = useState(score);
  if (score !== prevScore) {
    setPrevScore(score);
    if (score > bestScore) {
      setBestScore(score);
      saveBestScore(score);
    }
  }

  // Camera keeps the row the next bed will land on (plus a fixed margin
  // for the incoming bed to fall through) pinned near the top of the
  // viewport once the tower grows past it — the platform and the base of
  // the tower scroll below the fold rather than the view ever "zooming
  // out" to fit an unbounded stack.
  const landingRow = landingRowForStack(stack.length);
  const cameraBaseRow = Math.max(0, landingRow + SPAWN_GAP_ROWS - VIEW_ROWS);

  function rowTopPercent(worldRow: number): number {
    const rowFromBottom = worldRow - cameraBaseRow;
    return 100 - (rowFromBottom + 1) * ROW_PERCENT;
  }

  const fallingBedWorldRow = landingRow + SPAWN_GAP_ROWS * (1 - fallingBed.fallProgress);

  // Kept just under the tick interval so a scroll/slide in progress has a
  // hair of room before the next tick fires, same rationale as Get the
  // Buggy's moveTransitionMs.
  const moveTransitionMs = tickIntervalMs * 0.92;

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-12 sm:px-10">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
          Make the Bed
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Lily's tower of beds</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          ←/→ or A/D to move · Space to pause · R to restart
        </p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 sm:hidden">
          Best played on desktop with a keyboard.
        </p>
      </header>

      <div className="mt-6 mb-3 flex items-baseline gap-4 text-lg font-semibold">
        <span>Score: {score}</span>
        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">Best: {bestScore}</span>
      </div>

      <div
        key={restartKey}
        className="relative aspect-[9/14] w-full max-w-xl overflow-hidden rounded-xl border border-neutral-200 bg-sky-50 dark:border-neutral-800 dark:bg-sky-950/20"
      >
        {stack.map((bed, i) => (
          <div
            key={i}
            className="absolute box-border p-[4%]"
            style={{
              left: `${bed.col * COL_PERCENT}%`,
              width: `${COL_PERCENT}%`,
              top: `${rowTopPercent(i + 1)}%`,
              height: `${ROW_PERCENT}%`,
              transitionProperty: "top",
              transitionDuration: `${moveTransitionMs}ms`,
              transitionTimingFunction: "linear",
            }}
          >
            <Bed color={bed.color} />
          </div>
        ))}

        <div
          className="absolute box-border p-[4%]"
          style={{
            left: `${fallingBed.col * COL_PERCENT}%`,
            width: `${COL_PERCENT}%`,
            top: `${rowTopPercent(fallingBedWorldRow)}%`,
            height: `${ROW_PERCENT}%`,
            transitionProperty: "top",
            transitionDuration: `${moveTransitionMs}ms`,
            transitionTimingFunction: "linear",
          }}
        >
          <Bed color={fallingBed.color} />
        </div>

        <div
          className="absolute box-border p-[3%]"
          style={{
            left: `${platformCol * COL_PERCENT}%`,
            width: `${COL_PERCENT * PLATFORM_WIDTH}%`,
            top: `${rowTopPercent(0)}%`,
            height: `${ROW_PERCENT}%`,
            transitionProperty: "left, top",
            transitionDuration: `${moveTransitionMs}ms`,
            transitionTimingFunction: "linear",
          }}
        >
          <Lily facing={facing} />
        </div>

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm dark:bg-neutral-950/80">
            <p className="text-2xl font-semibold">{status === "paused" ? "Paused" : "Game Over"}</p>
            {status === "gameover" && (
              <p className="text-neutral-500 dark:text-neutral-400">Final score: {score}</p>
            )}
            {status === "gameover" && score > 0 && score >= bestScore && (
              <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">New best!</p>
            )}
            <div className="flex gap-2">
              {status === "paused" && (
                <button
                  type="button"
                  onClick={togglePause}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  {hasStarted ? "Resume" : "Start"}
                </button>
              )}
              <button
                type="button"
                onClick={restart}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-sky-400 dark:border-neutral-700 dark:hover:border-sky-700"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default MakeTheBed;

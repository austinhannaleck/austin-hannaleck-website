import { useRef, useState } from "react";
import TouchControls from "./thornwood/ui/TouchControls";
import { useThornwood } from "./thornwood/useThornwood";

// A top-down action adventure in the spirit of A Link to the Past, drawn as
// 16-bit pixel art. This file is just the page around the game: the screen
// itself (HUD, dialog, menus and all) is drawn into the canvas by
// thornwood/render, the rules live in thornwood/engine, and
// useThornwood.ts runs the loop.

const CONTROLS = [
  ["Move", "Arrows / WASD"],
  ["Sword, talk, open", "Space"],
  ["Spin attack", "Hold Space, release"],
  ["Switcheroo", "Option (Alt) or Shift"],
  ["Map", "M"],
  ["Items and pause", "Esc / P"],
];

function Thornwood() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const game = useThornwood(canvasRef, frameRef);
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be refused (iframes, some mobile browsers); the game
      // works fine without it.
    }
    setFullscreen(Boolean(document.fullscreenElement));
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-10 sm:px-8">
      <header className="mb-5 w-full text-center">
        <p className="text-xs font-semibold tracking-widest text-teal-600 uppercase dark:text-teal-400">Thornwood</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">A tiny 16-bit adventure</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Explore a little overworld, meet the neighbors, and dive into Bramblekeep, a dungeon built around one very
          strange tool. Every sprite, tile, and note of music is made in code: no game engine, no image files, no
          audio files.
        </p>
      </header>

      <div
        ref={frameRef}
        className="flex w-full items-center justify-center rounded-xl bg-black shadow-xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => game.pointAt(e.clientX, e.clientY)}
          className="block touch-none select-none"
          style={{ imageRendering: "pixelated" }}
          aria-label="Thornwood game screen"
        />
      </div>

      {/* The menus are drawn inside the canvas; these mirror them for screen readers. */}
      <div className="sr-only" aria-live="polite">
        {game.view.menu && (
          <div>
            <p>
              {game.view.map
                ? `Map of ${game.view.map}`
                : game.view.status === "title"
                  ? "Thornwood title screen"
                  : `Game ${game.view.status}`}
            </p>
            {game.view.menu.map((item) => (
              <button key={item.action} type="button" onClick={() => game.runMenuAction(item.action)}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex w-full justify-end gap-2">
        <button
          type="button"
          onClick={game.toggleMute}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:border-teal-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-teal-700"
          aria-pressed={game.muted}
        >
          {game.muted ? "Sound off" : "Sound on"}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:border-teal-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-teal-700"
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <TouchControls
        onDirections={(dirs) => game.setTouchDirections(dirs)}
        onButton={(button, down) => game.setTouchButton(button, down)}
        onPause={game.togglePaused}
        onMap={game.toggleMap}
        hasTool={game.view.hasSwitcheroo}
      />

      <section className="mt-6 grid w-full max-w-3xl gap-4 text-sm sm:grid-cols-2 pointer-coarse:hidden">
        <dl className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          {CONTROLS.map(([action, keys]) => (
            <div key={action} className="flex justify-between gap-4 py-0.5">
              <dt className="text-neutral-500 dark:text-neutral-400">{action}</dt>
              <dd className="font-semibold">{keys}</dd>
            </div>
          ))}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            J and K work for the sword and Switcheroo too. Menus: arrows and Space (or Enter), or just click.
            Gamepads work too: A for the sword, X or B for the Switcheroo, Start to pause, Select for the map.
          </p>
        </dl>
        <div className="rounded-xl border border-neutral-200 p-4 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Tips</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Talk to everyone. Nana Shellby has something for you.</li>
            <li>A purple glow means the Switcheroo can swap with it.</li>
            <li>Some enemies are only soft from behind.</li>
            <li>Worn out? Go home and take a nap. Your bed is at Nana&apos;s.</li>
            <li>After Bramblekeep, head east. Something came down out there.</li>
            <li>Progress saves whenever you walk into a new room.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default Thornwood;

import type { ComponentType } from "react";
import Broccoli from "./Broccoli";
import Carrot from "./Carrot";
import GoldenBug from "./GoldenBug";
import Magnet from "./Magnet";
import Mint from "./Mint";
import Mushroom from "./Mushroom";
import type { PickupType } from "./types";

const POWERUP_ORDER: PickupType[] = ["broccoli", "carrot", "mint", "magnet", "mushroom", "goldenBug"];

const POWERUP_INFO: Record<PickupType, { name: string; description: string; Icon: ComponentType }> = {
  broccoli: {
    name: "Broccoli",
    description: "Invincible for 15s — pass through your own tail, and walls wrap around.",
    Icon: Broccoli,
  },
  carrot: {
    name: "Carrot",
    description: "Speed boost — locks in a fast, fixed pace for 8s no matter your score. Handle with care.",
    Icon: Carrot,
  },
  mint: {
    name: "Mint",
    description: "Slow-mo — eases the pace for 8s, a breather when things get hectic.",
    Icon: Mint,
  },
  magnet: {
    name: "Magnet",
    description: "Drags the current bug toward you every tick for 10s — easier catches.",
    Icon: Magnet,
  },
  mushroom: {
    name: "Mushroom",
    description: "Instantly shrinks your tail — handy if you've boxed yourself in.",
    Icon: Mushroom,
  },
  goldenBug: {
    name: "Golden bug",
    description: "Worth 4× a regular bug, but vanishes fast if you don't grab it.",
    Icon: GoldenBug,
  },
};

export default function PowerupGuide() {
  return (
    <details className="mt-6 w-full max-w-xl rounded-lg border border-neutral-200 dark:border-neutral-800">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        Power-ups guide
      </summary>
      <ul className="grid grid-cols-1 gap-4 border-t border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
        {POWERUP_ORDER.map((type) => {
          const { name, description, Icon } = POWERUP_INFO[type];
          return (
            <li key={type} className="flex items-start gap-3">
              <div className="h-8 w-8 flex-shrink-0">
                <Icon />
              </div>
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

import { useState } from "react";
import StudioExample from "./components/instruments/StudioExample";

type Tab = "home" | "instruments";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "instruments", label: "Instruments" },
];

function App() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <nav className="flex justify-center gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <main className="flex flex-col items-center justify-center py-24">
          <h1 className="text-4xl font-semibold">Austin Hannaleck</h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">Portfolio — under construction</p>
        </main>
      )}

      {tab === "instruments" && <StudioExample />}
    </div>
  );
}

export default App;

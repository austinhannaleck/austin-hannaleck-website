import { useState } from "react";
import Sidebar from "./components/Sidebar";
import StudioExample from "./components/instruments/StudioExample";

type Tab = "home" | "instruments";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "instruments", label: "Instruments" },
];

function App() {
  // Defaults to the Instruments tab when the URL carries a shared jam link
  // (see StudioExample.tsx's "share this jam" feature) — otherwise a
  // pasted link would land on Home, where StudioExample isn't even
  // mounted to read the `?jam=` param.
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).has("jam") ? "instruments" : "home",
  );
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        items={TABS}
        active={tab}
        onSelect={setTab}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <div className="flex-1 overflow-y-auto">
        {tab === "home" && (
          <main className="flex flex-col items-center justify-center py-24">
            <h1 className="text-4xl font-semibold">Austin Hannaleck</h1>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">Portfolio — under construction</p>
          </main>
        )}

        {tab === "instruments" && <StudioExample />}
      </div>
    </div>
  );
}

export default App;

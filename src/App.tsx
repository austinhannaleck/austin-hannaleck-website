import { useState, type ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Resume from "./components/Resume";
import Apps, { type AppId } from "./components/Apps";
import About from "./components/About";
import StudioExample from "./components/instruments/StudioExample";
import TechnicalDetails from "./components/instruments/TechnicalDetails";
import HiveMind from "./components/apps/HiveMind";
import GetTheBuggy from "./components/apps/GetTheBuggy";
import MakeTheBed from "./components/apps/MakeTheBed";

type Tab = "home" | "resume" | "apps" | "about";

function IconHome() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 9.5 12 2l9 7.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function IconResume() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function IconApps() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconAbout() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </svg>
  );
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "home", label: "Home", icon: <IconHome /> },
  { id: "resume", label: "Resume", icon: <IconResume /> },
  { id: "apps", label: "Apps", icon: <IconApps /> },
  { id: "about", label: "About", icon: <IconAbout /> },
];

function App() {
  // Defaults to the Apps tab, with Signal already open, when the URL
  // carries a shared jam link (see StudioExample.tsx's "share this jam"
  // feature) — otherwise a pasted link would land on Home, where
  // StudioExample isn't even mounted to read the `?jam=` param.
  const hasJamLink = new URLSearchParams(window.location.search).has("jam");
  const [tab, setTab] = useState<Tab>(hasJamLink ? "apps" : "home");
  const [activeApp, setActiveApp] = useState<AppId | null>(hasJamLink ? "signal" : null);
  const [collapsed, setCollapsed] = useState(false);
  // Scoped to the Signal app only — a separate, Tailwind-styled page (as
  // opposed to the instruments' own neon-skinned panels) covering
  // architecture/design decisions for an engineer or hiring-manager
  // audience, plus a link to the public repo. Reset alongside activeApp
  // so leaving Signal and reopening it always lands back on the studio.
  const [signalView, setSignalView] = useState<"studio" | "details">("studio");

  const openApp = (id: AppId) => {
    setTab("apps");
    setActiveApp(id);
    setSignalView("studio");
  };

  const goToApps = () => {
    setTab("apps");
    setActiveApp(null);
    setSignalView("studio");
  };

  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar
        items={TABS}
        active={tab}
        onSelect={(id) => {
          setTab(id);
          if (id === "apps") setActiveApp(null);
        }}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <div className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {tab === "home" && (
          <Home
            onOpenResume={() => setTab("resume")}
            onOpenApps={goToApps}
            onOpenAbout={() => setTab("about")}
          />
        )}

        {tab === "resume" && <Resume onOpenSignal={() => openApp("signal")} />}

        {tab === "apps" && activeApp === null && <Apps onOpenApp={openApp} />}

        {tab === "about" && <About />}

        {tab === "apps" && activeApp !== null && (
          <div className="flex min-h-screen flex-col">
            <div className="flex items-center justify-between px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setActiveApp(null);
                  setSignalView("studio");
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                ← Back to Apps
              </button>
              {activeApp === "signal" && signalView === "studio" && (
                <button
                  type="button"
                  onClick={() => setSignalView("details")}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Technical details →
                </button>
              )}
            </div>
            <div className="flex-1">
              {activeApp === "signal" && signalView === "studio" && <StudioExample />}
              {activeApp === "signal" && signalView === "details" && (
                <TechnicalDetails onBack={() => setSignalView("studio")} />
              )}
              {activeApp === "hivemind" && <HiveMind />}
              {activeApp === "buggy" && <GetTheBuggy />}
              {activeApp === "makethebed" && <MakeTheBed />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type NavItem<T extends string> = { id: T; label: string; icon: ReactNode };

type SidebarProps<T extends string> = {
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type IndicatorRect = { top: number; height: number };

function Sidebar<T extends string>({
  items,
  active,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: SidebarProps<T>) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);

  // Measures via getBoundingClientRect rather than offsetTop: each <li> is
  // itself a positioning context (for the collapsed-mode tooltip below), so
  // offsetTop/offsetParent would resolve to the li, not the list — always 0.
  useLayoutEffect(() => {
    const list = listRef.current;
    const activeEl = itemRefs.current.get(active);
    if (!list || !activeEl) return;
    const listRect = list.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setIndicator({ top: activeRect.top - listRect.top, height: activeRect.height });
  }, [active, collapsed, items]);

  return (
    <>
      {/* Desktop / tablet: collapsible left rail. Hidden below md, where the
          bottom tab bar (rendered below) takes over — there isn't enough
          horizontal room on a phone for a side column and content both. */}
      <nav
        className={`hidden h-screen flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 print:hidden md:flex dark:border-neutral-800 dark:bg-neutral-950 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="flex h-14 items-center justify-center border-b border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M11 17l-5-5 5-5" />
            <path d="M18 17l-5-5 5-5" />
          </svg>
        </button>

        <ul ref={listRef} className="relative flex flex-col gap-1 p-2">
          {indicator && (
            <div
              aria-hidden="true"
              className="absolute left-2 right-2 top-0 rounded-lg bg-indigo-600 transition-[transform,height] duration-200 ease-out"
              style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }}
            />
          )}
          {items.map((item) => (
            <li key={item.id} className="group relative">
              <button
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-describedby={collapsed ? `nav-tooltip-${item.id}` : undefined}
                className={`relative z-10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[transform,colors] duration-150 active:scale-95 ${
                  collapsed ? "justify-center" : "justify-start"
                } ${
                  active === item.id
                    ? "text-white"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>

              {collapsed && (
                <span
                  id={`nav-tooltip-${item.id}`}
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: fixed bottom tab bar, shown only below md. Every item is
          always icon+label (no collapse concept here — there's no spare
          width to reclaim by collapsing a bar that's already full-width). */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] print:hidden md:hidden dark:border-neutral-800 dark:bg-neutral-950"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-[transform,colors] duration-150 active:scale-95 ${
              active === item.id
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}

export default Sidebar;

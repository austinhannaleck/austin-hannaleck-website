type NavItem<T extends string> = { id: T; label: string };

type SidebarProps<T extends string> = {
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function Sidebar<T extends string>({
  items,
  active,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: SidebarProps<T>) {
  return (
    <nav
      className={`flex h-screen flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 dark:border-neutral-800 dark:bg-neutral-950 ${
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

      <ul className="flex flex-col gap-1 p-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : "justify-start"
              } ${
                active === item.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {collapsed ? item.label.charAt(0) : item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Sidebar;

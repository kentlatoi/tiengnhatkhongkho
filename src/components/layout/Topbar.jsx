import DarkModeToggle from '../ui/DarkModeToggle';

export default function Topbar({ onMenuClick, title }) {
  return (
    <header className="sticky top-0 z-20 glass border-b border-surface-200/50 dark:border-surface-700/50">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer">
            <span className="text-xl">☰</span>
          </button>
          {title && <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h2>}
        </div>
        <DarkModeToggle />
      </div>
    </header>
  );
}

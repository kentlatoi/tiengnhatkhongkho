import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

const modes = [
  { key: 'system', icon: '💻', label: 'Auto' },
  { key: 'light', icon: '☀️', label: 'Light' },
  { key: 'dark', icon: '🌙', label: 'Dark' },
];

export default function DarkModeToggle() {
  const { mode, setMode } = useTheme();
  const activeIdx = modes.findIndex(m => m.key === mode);

  return (
    <div className="relative flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-0.5 gap-0.5">
      {/* Animated pill background */}
      <motion.div
        className="absolute h-[calc(100%-4px)] rounded-lg bg-white dark:bg-surface-700 shadow-sm"
        style={{ width: `calc(${100/3}% - 2px)` }}
        animate={{ x: `calc(${activeIdx * 100}% + ${activeIdx * 2}px)` }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={`relative z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            mode === m.key
              ? 'text-surface-900 dark:text-white'
              : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
          }`}
          title={m.label}
        >
          <span className="text-sm">{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

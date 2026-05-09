export default function ProgressBar({ value = 0, max = 100, size = 'md', showLabel = true }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5';
  return (
    <div className="w-full">
      <div className={`w-full ${h} bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden`}>
        <div className={`${h} bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <p className="text-xs text-surface-500 mt-1">{pct}% hoàn thành</p>}
    </div>
  );
}

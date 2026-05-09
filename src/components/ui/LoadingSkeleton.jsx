import { motion } from 'framer-motion';

export function SkeletonLine({ width = '100%', height = '1rem', className = '' }) {
  return (
    <motion.div
      className={`rounded-lg bg-surface-200 dark:bg-surface-700 ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonLine width="3rem" height="3rem" className="rounded-xl !rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="60%" height="0.875rem" />
          <SkeletonLine width="40%" height="0.75rem" />
        </div>
      </div>
      <SkeletonLine width="100%" height="0.75rem" />
      <SkeletonLine width="80%" height="0.75rem" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="glass-card p-0 overflow-hidden">
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <SkeletonLine width="200px" height="1rem" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-surface-100 dark:border-surface-800">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} width={j === 0 ? '30%' : '20%'} height="0.75rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card', count = 3, ...props }) {
  if (type === 'table') return <SkeletonTable {...props} />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

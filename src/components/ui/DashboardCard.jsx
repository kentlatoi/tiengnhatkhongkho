import { motion } from 'framer-motion';

export default function DashboardCard({ icon, title, value, subtitle, color = 'primary', delay = 0 }) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    sakura: 'from-sakura-400 to-sakura-500',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    teal: 'from-teal-500 to-teal-600',
    indigo: 'from-indigo-500 to-indigo-600',
    rose: 'from-rose-500 to-rose-600',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card group cursor-pointer hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
          <p className="text-3xl font-bold mt-1 text-surface-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

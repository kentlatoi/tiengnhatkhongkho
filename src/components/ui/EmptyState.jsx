import { motion } from 'framer-motion';
export default function EmptyState({ icon = '📭', title, description }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h3 className="text-xl font-semibold text-surface-700 dark:text-surface-300 mb-2">{title}</h3>
      <p className="text-surface-500 dark:text-surface-400 max-w-md">{description}</p>
    </motion.div>
  );
}

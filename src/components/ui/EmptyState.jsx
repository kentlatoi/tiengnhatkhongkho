import { motion } from 'framer-motion';

export default function EmptyState({ icon = '📭', title, description }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center glass-card max-w-2xl mx-auto my-8 border-dashed border-2 border-surface-200 dark:border-surface-700 bg-white/40 dark:bg-surface-900/40"
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
        className="text-6xl mb-6 drop-shadow-md"
      >
        {icon}
      </motion.div>
      <h3 className="text-xl font-bold text-surface-800 dark:text-surface-200 mb-3">{title}</h3>
      <p className="text-surface-500 dark:text-surface-400 max-w-md leading-relaxed">{description}</p>
    </motion.div>
  );
}

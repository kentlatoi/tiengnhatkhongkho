import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full ${sizes[size]} bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
